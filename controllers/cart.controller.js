const { populate } = require("dotenv");
const Cart = require("../models/Cart");

const cartController = {};

cartController.addItemToCart = async (req, res) => {
  try {
    const { userId } = req;
    const { productId, size, qty } = req.body;
    // 유저를 가지고 카트 찾기
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      // 유저가 만든 카트가 없다, 만들어주기
      cart = new Cart({ userId });
      await cart.save();
    }
    // 이미 카트에 들어가 있는 아이템인가? productId, size 비교
    const existItem = cart.items.find(
      (item) => item.productId.equals(productId) && item.size === size // 모델만들때 type이 mongoose.ObjectId 이면 equals로 판단 string이면 === 로 판단
    );
    if (existItem) {
      // 그렇다면 에러(이미 아이템이 카트에 있습니다.)
      throw new Error("동일한 아이템이 카트에 있습니다.");
    }
    // 카트에 아이템 추가
    cart.items = [...cart.items, { productId, size, qty }];
    await cart.save();
    return res
      .status(200)
      .json({ status: "success", data: cart, cartItemQty: cart.items.length }); // 카드 안에 아이템의 갯수로 보내기
  } catch (e) {
    return res.status(400).json({ status: "fail", message: e.message });
  }
};

cartController.getCart = async (req, res) => {
  try {
    const { userId } = req;
    const cart = await Cart.findOne({ userId }).populate({
      // 데이터 포함해서 가져오기
      path: "items", // 카트에 담긴 아이템
      populate: {
        path: "productId", // productId 필드를 추가로 가져오기
        model: "Product", // 가져올 모델
      },
    });
    return res.status(200).json({ status: "success", data: cart.items });
  } catch (e) {
    return res.status(400).json({ status: "fail", message: e.message });
  }
};

cartController.deleteCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    const cart = await Cart.findOne({ userId });
    cart.items = cart.items.filter((item) => !item._id.equals(id));
    cart.save();
    return res
      .status(200)
      .json({ status: "success", cartItemQty: cart.items.length });
  } catch (e) {
    return res.status(400).json({ status: "fail", message: e.message });
  }
};

cartController.editCartItem = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { qty } = req.body;
    const cart = await Cart.findOne({ userId }).populate({
      path: "items",
      populate: {
        path: "productId",
        model: "Product",
      },
    });
    if (!cart) throw new Error("there is no cart for this user");
    const index = cart.items.findIndex((item) => item._id.equals(id)); // 조건에 맞으면 index를 없으면 -1 반환
    if (index === -1) throw new Error("can not find item");
    cart.items[index].qty = qty; // 업데이트
    await cart.save();
    return res.status(200).json({ status: "scueess", data: cart.items });
  } catch (e) {
    return res.status(400).json({ status: "fail", message: e.message });
  }
};

cartController.getCartQty = async (req, res) => {
  try {
    const { userId } = req;
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new Error("there is no cart!");
    return res.status(200).json({ status: "success", qty: cart.items.length });
  } catch (e) {
    return res.status(400).json({ status: "fail", message: e.message });
  }
};

module.exports = cartController;
