const express = require('express');// 載入 express 套件，建立後端伺服器框架
const app = express();//宣告express讓其可以使用app.get(), app.post()等指令
const pool = require('./db/db');// 載入我們自己寫的資料庫連線模組（也就是 db.js）
const cors = require('cors');//匯入中介層套件工具
const cookieParser = require('cookie-parser');//將 Cookie 字串轉換成token讓後端可以讀取
require('dotenv').config();// 載入 dotenv 以支援 .env 環境變數
require('./googleAuth/google');//引入登入google成功後運行的套件

const avatarImgUploadRoutes = require('./routes/avatarImgUploadRoutes'); //會員頭像圖片上傳用api
const userRoutes = require('./routes/userRoutes'); //會員相關用api
const userProfileRoutes = require('./routes/userProfileRoutes'); //會員個人檔案相關用api
const orderPreviewImgUploadRoutes = require('./routes/orderPreviewImgUploadRoutes'); //訂單預覽圖片上傳用api
const orderRoutes = require('./routes/orderRoutes'); //訂單相關用api
const messageRoutes = require('./routes/messageRoutes');//引入留言相關用Api
const googleAuthRoutes = require('./routes/googleAuthRoutes');//引入登入googleApi
const proxyRoutes = require('./routes/proxyRoutes');


app.use(express.json());// 解析 JSON 格式的 request body

app.use(cookieParser());// 將 Cookie 字串轉換成token讓後端可以讀取

//中介層設定
    app.use(cors({
        origin: [   'http://localhost:5173','http://localhost:5174',
                    'https://a072682.github.io',
                ],
        // 允許的前端來源     
        credentials: true,
        methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],// 可允許的方法
        allowedHeaders: ['Content-Type', 'Authorization'],// 可允許的自訂標頭
    }));

    //當前端有請求時請cors進行處理
    //origin(白名單)
    //credentials(是否允許攜帶cookie)
    app.options('*', cors({ origin: [ 'http://localhost:5173','http://localhost:5174','https://a072682.github.io'], 
                            credentials: true, }));
//中介層設定

// 新的 proxy 路由
app.use('/api', proxyRoutes);


//測試資料庫連線的路由
app.get('/test-db', async (req, res) => {
// 這個函式只會在使用者訪問 http://localhost:5100/test-db 時執行
try {
    const result = await pool.query('SELECT NOW()');
    // 用 pool 發送 SQL 指令：取得目前資料庫時間
    res.json({ message: '連線成功', time: result.rows[0] });
    // 回傳 JSON 結果給使用者
} catch (err) {
    console.error(err);
    res.status(500).send('連線失敗');
    // 若有錯誤，顯示在後端並告知前端
    //res表示伺服器要回傳給使用者的內容
    //.status(500)設定狀態碼為 500（伺服器錯誤）
    //傳送純文字 "連線失敗" 作為回應內容
}
});

app.use('/avatarImg', avatarImgUploadRoutes);//會員頭像圖片上傳api

app.use('/user', userRoutes);//會員相關api

app.use('/google', googleAuthRoutes);//google登入api 掛上路由（/auth/google 與 /auth/google/callback）

app.use('/userProfile', userProfileRoutes);//會員個人資料資料表相關api

app.use('/orderImg', orderPreviewImgUploadRoutes);//訂單預覽圖片上傳api

app.use('/order', orderRoutes);//訂單相關api

app.use('/message', messageRoutes);//留言相關api

//管理員用api

app.use('/admin', userRoutes);//管理員會員相關api

app.use('/adminOrder', orderRoutes);//管理員訂單相關api

app.use('/adminMessage', messageRoutes);//管理員訂單相關api

//管理員用api






// 啟動伺服器 
app.listen(process.env.PORT, () => {
    console.log(`伺服器啟動`);
});
