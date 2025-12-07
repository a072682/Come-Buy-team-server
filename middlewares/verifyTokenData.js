

//verifyTokenData為讀取使用者的token壽命並判斷是否續補
const jwt = require('jsonwebtoken');

const hours1MS = 60 * 60 * 1000;   // 60 分鐘
const min15MS = 15 * 60 * 1000; // 剩 < 15 分才續
const hours12Ms = 12 * 60 * 60 * 1000; // 絕對上限 12 小時

function verifyTokenData(req, res, next){

  //讀取token
  const tokenData = req.headers.authorization;
  //讀取token
  // 如果沒有token則回報錯誤
  if (!tokenData) {
    return res.status(401).json({ error: '未登入（無 token）' });
  }
  // 如果沒有token則回報錯誤

  //token來源會是帶有空白的一串英文字母
  //因此要進行過濾
  //過濾token
  const user_token = tokenData.split(" ")[1];
  //過濾token
  //如果格式錯誤則過濾失敗則回報錯誤
  if (!user_token) {
    return res.status(401).json({ error: '未登入（token 格式錯誤）' });
  }
  //如果格式錯誤則過濾失敗則回報錯誤


  try {
    // 驗證token
    const decoded = jwt.verify(user_token, process.env.JWT_SECRET);
    // 驗證token

    // 驗證過後放入req.user
    req.user = decoded;
    // 驗證過後放入req.user
    
    // 取得現在現在時間
    const nowTimeMs = Date.now();
    // 取得現在現在時間

    // 只要有設定jwt.sign(payload, secret, { expiresIn: 'xxx' })就會變成exp加入token
    // token的到期時間
    const tokenLiveTimeMs = decoded.exp * 1000;
    // 顯示token存活時間
    console.log(
        '到期時間(台北):',
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

        //把新的 token 放在回應的 HTTP Header 裡
        res.set("x-renewed-token", newToken);
        //把新的 token 放在回應的 HTTP Header 裡

        //把 newToken 暫存起來，讓後面的 API 可以使用
        req.newToken = newToken;
        //把 newToken 暫存起來，讓後面的 API 可以使用
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'token 無效或已過期' });
  }
};

module.exports = verifyTokenData;
