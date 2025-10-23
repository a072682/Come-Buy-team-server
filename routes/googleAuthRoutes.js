
//此函式為處理GOOGLE登入相關路由
const express = require('express');
const router = express.Router(); // 建立路由器
const passport = require('passport'); // 引入 passport 用來整合第三方登入如 Google、Facebook 等。
const jwt = require('jsonwebtoken'); // 用來產生 JWT Token


// 1️⃣ 使用者點擊「Google 登入」按鈕時，導向 Google 認證頁面
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'], // 請求使用者的公開資訊與 Email
}));
//當前端打 /google/google（假設你等下 index.js 在 /google），passport 會接手並立刻：
//把使用者到 Google 的同意頁（Scope 要求取用 profile 和 email）。

// 2️⃣ Google 成功驗證後回傳到這個路由（已設定在 Google Cloud Console 的 redirect URI）
router.get('/callback', passport.authenticate('google', { session: false }),
  (req, res) => {
    //session: false 代表 不用 Passport Session(本專題使用JWT驗證)
    //驗證回來的 code，換取使用者資料，並觸發 google.js 的 verify callback
    // 使用 passport 回傳的 req.user 產生 JWT Token


    const token = jwt.sign({
      userId: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      auth_provider:req.user.auth_provider
    }, process.env.JWT_SECRET,  { expiresIn: Math.floor(30 * 60 * 1000 / 1000) + 's' }); //過期時間"1800s"

    // 把 Token 寫入 Cookie，提供前端認證用
    res.cookie('token', token, {
      httpOnly: true,          // 只能被後端讀取，避免 XSS
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 30 * 60 * 1000, // 有效期：30分鐘
    });

    // 登入成功後導向前端指定頁面（也可以用 query string 傳資料）
    res.redirect('https://a072682.github.io/Come-Buy-team-work/#/'); // ✅ 可改成你的前端登入成功頁
  }
);

module.exports = router; // 匯出此路由模組
