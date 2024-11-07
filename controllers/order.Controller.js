const { populate } = require("dotenv");
const Order = require("../models/Order");
const productController = require("../controllers/productController");
const { randomStringGenerator } = require("../utils/randomStringGenerator");

const PAGE_SIZE = 10;
const orderController = {};

orderController.createOrder = async (req, res) => {
  try {
    // 프론트엔드에서 보낸 데이터 받아오기
    const { userId } = req;
    const { shipTo, contact, totalPrice, orderList } = req.body;

    // 재고 확인
    const insufficientStockItems = await productController.checkItemListStock(
      orderList
    );

    // 재고가 부족한 아이템이 있을 경우 에러 처리
    if (insufficientStockItems.length > 0) {
      const errorMessage = insufficientStockItems.reduce(
        (total, item) => (total += item.message + "\n"),
        ""
      );
      throw new Error(errorMessage);
    }

    // 주문 생성
    const newOrder = new Order({
      userId,
      totalPrice,
      shipTo,
      contact,
      items: orderList,
      orderNum: randomStringGenerator(),
    });

    // 주문 저장
    await newOrder.save(); // order는 save후에 카트를 비워주기(스키마에서 처리해주기)

    // 모든 항목의 재고를 업데이트
    await productController.updateStock(orderList); // 재고 업데이트

    res.status(200).json({ status: "success", orderNum: newOrder.orderNum });
  } catch (e) {
    return res.status(400).json({ status: "fail", message: e.message });
  }
};

orderController.getOrder = async (req, res) => {
  try {
    const { userId } = req;
    const orderList = await Order.find({ userId })
      .select("+createdAt")
      .populate({
        path: "items",
        populate: {
          path: "productId",
          model: "Product",
          select: "image name",
        },
      })
      .sort({ _id: -1 })
      .lean(); // toJSON메서드에서 +createdAt를 삭제하고 있어 결과에 포함 안됨, Mongoose 문서 대신 일반 JavaScript 객체를 반환하므로 toJSON 메서드를 우회

    const totalItemNum = await Order.countDocuments({ userId });
    const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
    res.status(200).json({ status: "success", data: orderList, totalPageNum });
  } catch (e) {
    return res.status(400).json({ status: "fail", message: e.message });
  }
};

orderController.getOrderList = async (req, res) => {
  try {
    const { page, ordernum } = req.query;
    const cond = {
      ...(ordernum ? { orderNum: { $regex: ordernum, $options: "i" } } : {}),
    }; // 정규화, options insensitive(대소문자 구분x)
    let query = Order.find(cond)
      .sort({ _id: -1 })
      .populate("userId")
      .populate({
        path: "items",
        populate: {
          path: "productId",
          model: "Product",
        },
      });
    let response = { status: "success" };

    const totalItemNum = await Order.countDocuments(cond); // count()는 결과의 갯수만 반환함
    response.totalItemNum = totalItemNum; // totalItemNum 추가

    if (page) {
      query.skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE);
      const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
      response.totalPageNum = totalPageNum;
    }

    const orderList = await query.exec(); // 선언과 실행 분리, 조건을 다 받고 한번에 실행하기 위해

    // 상품 목록에 역순 rn 속성 추가
    const paginatedOrderList = orderList.map((order, index) => ({
      ...order.toObject(),
      rn: totalItemNum - ((page - 1) * PAGE_SIZE + index),
    }));

    response.data = paginatedOrderList;
    res.status(200).json(response);
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};

orderController.updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: status },
      { new: true }
    );

    if (!order) throw new Error("Can't find order");
    res.status(200).json({ status: "success", data: order });
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};

module.exports = orderController;
