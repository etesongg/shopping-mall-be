const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const authController = {};

authController.loginWithEmail = async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        // token
        const token = await user.generateToken();
        return res.status(200).json({ status: "success", user, token });
      }
    }
    throw new Error("invalid email or password");
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};
// 사용자 인증 처리
authController.authenticate = async (req, res, next) => {
  try {
    const tokenString = req.headers.authorization;
    if (!tokenString) throw new Error("Token not found");
    const token = tokenString.replace("Bearer ", "");
    jwt.verify(token, JWT_SECRET_KEY, (error, payload) => {
      if (error) throw new Error("invalid token");
      req.userId = payload._id; // 토큰을 만들때 id값으로 만들어서 verify 했을때도 id값이 나옴
    });
    next();
  } catch (e) {
    res.status(400).json({ status: "fail", message: e.message });
  }
};
// admin 권한 처리
authController.checkAdminPermission = async (req, res, next) => {
  try {
    // token에서 admin인지 확인 // 위에 authenticate로 만들어놓음, 그러므로 라우터로 미들웨어 추가
    const { userId } = req;
    const user = await User.findById(userId);
    if (user.level !== "admin") throw new Error("no permission");
    next();
  } catch (e) {
    res.status(400).json({ ststus: "fail", message: e.message });
  }
};

module.exports = authController;
