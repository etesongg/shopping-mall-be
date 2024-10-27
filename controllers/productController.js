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
    const product = await Product.find({});
    res.status(200).json({ status: "success", product });
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};

module.exports = productController;