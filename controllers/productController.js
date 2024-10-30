const Product = require("../models/Product");

const PAGE_SIZE = 5;
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
    let response = { status: "success" };

    if (page) {
      query.skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE);
      const totalItemNum = await Product.countDocuments(cond); // count()는 결과의 갯수만 반환함
      const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
      response.totalPageNum = totalPageNum;
    }

    const productList = await query.exec(); // 선언과 실행 분리, 조건을 다 받고 한번에 실행하기 위해
    response.data = productList;
    res.status(200).json(response);
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};

productController.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
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

    const product = await Product.findByIdAndUpdate(
      { _id: productId },
      { sku, name, size, image, category, description, price, stock, status },
      { new: true } // 업데이트한 후 새로운 값을 반환받을 수 있음
    );

    if (!product) throw new Error("item doesn't exist");
    res.status(200).json({ status: "success", data: product });
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};

module.exports = productController;
