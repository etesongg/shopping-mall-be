const Order = require("../models/Order");
const productController = require("../controllers/productController");
const { randomStringGenerator } = require("../utils/randomStringGenerator");

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

    await newOrder.save();
    res.status(200).json({ status: "success", orderNum: newOrder.orderNum });
  } catch (e) {
    return res.status(400).json({ status: "fail", message: e.message });
  }
};

module.exports = orderController;
