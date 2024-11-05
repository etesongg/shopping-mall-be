const { populate } = require("dotenv");
const Order = require("../models/Order");
const productController = require("../controllers/productController");
const { randomStringGenerator } = require("../utils/randomStringGenerator");

const PAGE_SIZE = 5;
const orderController = {};

orderController.createOrder = async (req, res) => {
  try {
    // 프론트엔드에서 보낸 데이터 받아오기
    const { userId } = req;
    const { shipTo, contact, totalPrice, orderList } = req.body;
    // 재고 확인 및 업데이트
    const insufficientStockItems = await productController.checkItemListStock(
      orderList
    );

    // 만약에 재고가 충분하지 않는 아이템이 있었다면 에러를
    if (insufficientStockItems.length > 0) {
      const errorMessage = insufficientStockItems.reduce(
        (total, item) => (total += item.message),
        ""
      );
      throw new Error(errorMessage);
    }

    // order 만들기
    const newOrder = new Order({
      userId,
      totalPrice,
      shipTo,
      contact,
      items: orderList,
      orderNum: randomStringGenerator(),
    });

    await newOrder.save(); // order는 save후에 카트를 비워주기(스키마에서 처리해주기)
    res.status(200).json({ status: "success", orderNum: newOrder.orderNum });
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

module.exports = orderController;
