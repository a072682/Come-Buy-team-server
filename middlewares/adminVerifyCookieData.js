

//verifyCookie為讀取使用者的cookie使用者是否有提供合法的Token
const jwt = require('jsonwebtoken');

const hours1MS = 60 * 60 * 1000;   // 60 分鐘
const min15MS = 15 * 60 * 1000; // 剩 < 15 分才續
const hours12Ms = 12 * 60 * 60 * 1000; // 絕對上限 12 小時

function adminVerifyCookieData(req, res, next){
  // 讀取cookie 中的user_token admin_token user_token
  const admin_token = req.cookies.admin_token;
  // 讀取cookie 中的user_token
  
  // 如果沒有token則回報錯誤
  if (!admin_token) {
    return res.status(401).json({ error: '未登入或 token 遺失' });
  }
  // 如果沒有token則回報錯誤

  try {
    // 驗證token，
    const decoded = jwt.verify(admin_token, process.env.JWT_SECRET);
    // 驗證token

    //驗證過後放入req.user
    req.user = decoded;
    //驗證過後放入req.user

    // 取得現在現在時間
    const nowTimeMs = Date.now();
    // 取得現在現在時間

    // 只要有設定jwt.sign(payload, secret, { expiresIn: 'xxx' })就會變成exp加入token
    // token的到期時間
    const tokenLiveTimeMs = decoded.exp * 1000;
    // 顯示token存活時間
    console.log(
      '管理員登入到期時間(台北):',
      new Date(tokenLiveTimeMs).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
    );

    // token的剩餘時間
    // token的剩餘時間(ms)
    const lastTimeAllMs = tokenLiveTimeMs - nowTimeMs;
    // token的剩餘時間(總秒數)
    const lastTimeAllSec = Math.max(0, Math.floor(lastTimeAllMs / 1000));
    // token的剩餘時間(分)
    const lastTimeMin = Math.floor(lastTimeAllSec / 60);
    // token的剩餘時間(秒)
    const lastTimeSec = lastTimeAllSec % 60;
    console.log(`剩餘時間: ${lastTimeMin}分 ${lastTimeSec}秒（${lastTimeAllSec}s）`);

    // 絕對上限：首次登入時間（舊 token 可能沒有，就用現在兜住）
    // 取得首次登入時間
    const firstTimeLogInTime = decoded.origIatMs ?? nowTimeMs;
    // 取得登入總時常
    const loginAllTime = nowTimeMs - firstTimeLogInTime;
    // 如果總時常大於12小時則回報錯誤
    if (loginAllTime > hours12Ms) {
      return res.status(401).json({ error: '會話已達最長時數，請重新登入' });
    }

    // 只有在「快到期」才續期（節流）
    // 如果剩餘時間小於60分鐘才進行延續
    if (lastTimeAllMs <= hours1MS) {
      console.log("時間不足60分鐘");
      // 重簽一顆「再活 60 分鐘」的新 JWT（保留首次登入時間）
      const newToken = jwt.sign(
        {
          userId: decoded.userId,
          email: decoded.email,
          username: decoded.username,
          role: decoded.role,
          auth_provider: decoded.auth_provider,
          firstTimeLogInTime, // 保留首次登入時間，別重置
        },
        process.env.JWT_SECRET,
        { expiresIn: Math.floor(hours1MS / 1000) + 's' } 
        // 60*60s
      );

      // 用同名 cookie 寫回（覆蓋），讓 cookie 再活 60 分鐘
      // 名稱依據需求更改
      res.cookie('admin_token', newToken, {
        httpOnly: true,
        secure: true,     // 本機 http 測試可暫時設 false；正式 https 要 true
        sameSite: 'none',  // 跨站才用 'none'（且需 secure:true）
        path: '/',
        maxAge: hours1MS,
        // （可選）domain: '.yourdomain.com' 需要跨子網域時再加
      });
      console.log("管理員登入token以延續");
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: '管理員登入token 無效或已過期' });
  }
};

module.exports = adminVerifyCookieData;
