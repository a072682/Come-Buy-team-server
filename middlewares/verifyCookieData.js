

//verifyCookie為讀取使用者的cookie使用者是否有提供合法的Token
const jwt = require('jsonwebtoken');

const ACCESS_TTL_MS = 60 * 60 * 1000;   // 60 分鐘
const RENEW_THRESHOLD_MS = 15 * 60 * 1000; // 剩 < 15 分才續
const ABSOLUTE_MAX_MS = 12 * 60 * 60 * 1000; // 絕對上限 12 小時
const testTiem = 10 * 60 * 1000; // 10分鐘
const testTiem2 = 5 * 60 * 1000; // 5分鐘

function verifycookie(req, res, next){
  // 讀取cookie 中的token
  const token = req.cookies.token;
  // 讀取cookie 中的token
  
  // 如果沒有token則回報錯誤
  if (!token) {
    return res.status(401).json({ error: '未登入或 token 遺失' });
  }
  // 如果沒有token則回報錯誤

  try {
    //驗證token，驗證過後放入req.user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    //驗證token，驗證過後放入req.user
    
    //取得現在現在時間
    const nowMs = Date.now();
    //取得現在現在時間

    //只要有設定jwt.sign(payload, secret, { expiresIn: 'xxx' })就會變成exp加入token
    //token的到期時間
    const expMs = decoded.exp * 1000;
    console.log(
      '到期時間(台北):',
      new Date(expMs).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
    );

    //token的剩餘時間
    const remaining = expMs - nowMs;
    const remainingSec = Math.max(0, Math.floor(remaining / 1000));
    const mm = Math.floor(remainingSec / 60);
    const ss = remainingSec % 60;
    console.log(`剩餘時間: ${mm}分 ${ss}秒（${remainingSec}s）`);

    // 絕對上限：首次登入時間（舊 token 可能沒有，就用現在兜住）
    //取得首次登入時間
    const origIatMs = decoded.origIatMs ?? nowMs;
    //取得登入總時常
    const ageMs = nowMs - origIatMs;
    //如果總時常大於12小時則回報錯誤
    if (ageMs > ABSOLUTE_MAX_MS) {
      return res.status(401).json({ error: '會話已達最長時數，請重新登入' });
    }

    // 只有在「快到期」才續期（節流）
    //如果剩餘時間小於15分鐘才進行延續
    //測試5分鐘
    if (remaining <= RENEW_THRESHOLD_MS) {
      console.log("時間不足15分鐘");
      // 1) 重簽一顆「再活 30 分鐘」的新 JWT（保留 origIatMs）
      const newToken = jwt.sign(
        {
          userId: decoded.userId,
          email: decoded.email,
          username: decoded.username,
          role: decoded.role,
          auth_provider: decoded.auth_provider,
          origIatMs, // 保留首次登入時間，別重置
        },
        process.env.JWT_SECRET,
        { expiresIn: Math.floor(ACCESS_TTL_MS / 1000) + 's' } 
        // 1800s
      );

      // 2) 用同名 cookie 寫回（覆蓋），讓 cookie 也再活 30 分鐘
      res.cookie('token', newToken, {
        httpOnly: true,
        secure: true,     // 本機 http 測試可暫時設 false；正式 https 要 true
        sameSite: 'none',  // 跨站才用 'none'（且需 secure:true）
        path: '/',
        maxAge: ACCESS_TTL_MS,
        // （可選）domain: '.yourdomain.com' 需要跨子網域時再加
      });
      console.log("token以延續");
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'token 無效或已過期' });
  }
};

module.exports = verifycookie;
