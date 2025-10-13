

//verifyCookie為讀取使用者的cookie使用者是否有提供合法的Token
const jwt = require('jsonwebtoken');

function verifycookie(req, res, next){
  const token = req.cookies.token; // ✅ 從 cookie 取出

  if (!token) {
    return res.status(401).json({ error: '未登入或 token 遺失' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    // console.log("看看user",req.user);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'token 無效或已過期' });
  }
};

module.exports = verifycookie;
