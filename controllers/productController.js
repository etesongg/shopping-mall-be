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
    const cond = {
      ...(name ? { name: { $regex: name, $options: "i" } } : {}),
      isDeleted: false,
    }; // 정규화, options insensitive(대소문자 구분x)
    let query = Product.find(cond).sort({ _id: -1 });
    let response = { status: "success" };

    const totalItemNum = await Product.countDocuments(cond); // count()는 결과의 갯수만 반환함
    response.totalItemNum = totalItemNum; // totalItemNum 추가

    if (page) {
      query.skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE);
      const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
      response.totalPageNum = totalPageNum;
    }

    const productList = await query.exec(); // 선언과 실행 분리, 조건을 다 받고 한번에 실행하기 위해

    // 상품 목록에 역순 rn 속성 추가
    const paginatedProductList = productList.map((product, index) => ({
      ...product.toObject(),
      rn: totalItemNum - ((page - 1) * PAGE_SIZE + index),
    }));

    response.data = paginatedProductList;
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
      { new: true } // 업데이트한 후 업데이트된 값을 반환받기
    );

    if (!product) throw new Error("item doesn't exist");
    res.status(200).json({ status: "success", data: product });
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};

productController.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findByIdAndUpdate(
      productId,
      { isDeleted: true },
      { new: true }
    );
    if (!product) throw new Error("item doesn't exist");
    res.status(200).json({ status: "success", data: product });
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};

productController.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) throw new Error("no item found");
    res.status(200).json({ status: "success", data: product });
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};

productController.checkStock = async (item) => {
  // 내가 사려는 아이템 재고 정보들고오기
  const product = await Product.findById(item.productId);
  // 내가 사려는 아이템 qty, 재고 비교
  if (product.stock[item.size] < item.qty) {
    // 재고가 불충분하다면 메시지와 함께 데이터 반환
    return {
      isVerify: false,
      message: `${product.name}의 재고가 부족합니다.`,
    };
  }
  // 재고가 충분하다면 재고에서 -qty
  const newStock = { ...product.stock };
  newStock[item.size] -= item.qty;
  product.stock = newStock;

  await product.save();
  return { isVerify: true };
};

productController.checkItemListStock = async (itemList) => {
  const insufficientStockItems = []; // 재고가 불충분한 아이템을 저장한 리스트
  // 재고 확인
  await Promise.all(
    // 비동기 여러개를 한번에 처리
    itemList.map(async (item) => {
      const stockCheck = await productController.checkStock(item);
      if (!stockCheck.isVerify) {
        insufficientStockItems.push({ item, message: stockCheck.message });
      }
      return stockCheck;
    })
  );

  return insufficientStockItems;
};

module.exports = productController;
