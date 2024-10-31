const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const orderController = require("../controllers/order.Controller");

router.post("/", authController.authenticate, orderController.createOrder);

module.exports = router;
