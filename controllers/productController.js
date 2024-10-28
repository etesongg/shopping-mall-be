const Product = require("../models/Product");

const productController = {};

productController.createProduct = async (req, res) => {
  try {
    const {
      sku,
      name,
      size,
      image,
      category,
      description,
      price,
      stock,
      status,
    } = req.body;
    const product = new Product({
      sku,
      name,
      size,
      image,
      category,
      description,
      price,
      stock,
      status,
    });
    await product.save();
    res.status(200).json({ status: "success", product });
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};

productController.getProducts = async (req, res) => {
  try {
    const { page, name } = req.query;
    const cond = name ? { name: { $regex: name, $options: "i" } } : {}; // 정규화, options insensitive(대소문자 구분x)
    let query = Product.find(cond);

    const productList = await query.exec(); // 선언과 실행 분리, 조건을 다 받고 한번에 실행하기 위해
    res.status(200).json({ status: "success", data: productList });
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};

module.exports = productController;
