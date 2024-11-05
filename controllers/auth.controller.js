const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

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

authController.loginWithGoogle = async (req, res) => {
  try {
    // 토큰 값을 읽어와서 유저정보를 뽑아내고(email 등
    const { token } = req.body;
    const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const { email, name } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      // 처음 로그인 시도한 유저면 유저정보 먼저 새로 생성하고 토큰값 주기
      const randomPassword = "" + Math.floor(Math.random() * 10000000);
      const salt = await bcrypt.genSalt(10);
      const newPassword = await bcrypt.hash(randomPassword, salt);
      user = new User({
        name,
        email,
        password: newPassword, // 구글로 로그인 하면 패스워드 필요 없음, 하지만 필수값이고 어렵게 만들어야 해커가 풀지 못함
      });
      await user.save();
    }
    // 토큰발행 리턴
    const sessionToken = await user.generateToken();
    res.status(200).json({ status: "success", user, token: sessionToken });
    // 이미 로그인 한 적이 있는 유저면 로그인 시키고 토큰값 주고
  } catch (e) {
    res.status(400).json({ ststus: "fail", message: e.message });
  }
};

module.exports = authController;
