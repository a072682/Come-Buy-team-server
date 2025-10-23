
//會員註冊 / 登入邏輯等函式

const pool = require('../db/db');
const bcrypt = require('bcrypt');//bcrypt 是一個加密套件，專門用來加密密碼
const jwt = require('jsonwebtoken');//jsonwebtoken是一個用來產生token和驗證的套件
const Joi = require('joi');
require('dotenv').config();


// Joi 驗證 schema
//Joi.object({...})定義規則
const userSchema = Joi.object({
    username: Joi.string().min(2).max(30).required(),
    //只要是進來的資料是username必須是字串(string)長度最少為2(min(2))最長為30(max(30))且為必填寫不可為空(required())
    email: Joi.string().email().required(),
    //只要是進來的資料是email必須是字串(string)符合email格式(email())且為必填寫不可為空(required())
    password: Joi.string().min(6).required(),
     //只要是進來的資料是password必須是字串(string)長度最少為6(min(6))且為必填寫不可為空(required())
});

// Joi 驗證 passWord
//Joi.object({...})定義規則
const passwordSchema = Joi.object({
    password: Joi.string().min(6).required(),
    newPassword: Joi.string().min(6).required(),
    //只要是進來的資料是password必須是字串(string)長度最少為6(min(6))且為必填寫不可為空(required())
});

// 把「空字串」或「只有空白的字串」視為沒有值（轉成 null）；其他類型保持原樣
const trimToNull = (data) => {
  if (data == null) return null;                  
  // 如果進來的資料為null則直接回覆null
  if (typeof data === 'string') {
  // 如果進來的資料類型是字串則運行以下內容
    const newData = data.trim();
    //對data去掉前後空白並將數值給予newData
    return newData === '' ? null : newData;                
    //如果newData是空字串("")則回覆null否則就原樣回覆
  }
  return data;                                    
  // 其他型別維持原樣（通常不會用到）
};

//會員用api

  //取得會員資料：
  exports.getCurrentUser = async (req, res) => {
    //從token解析資料並放入req.user中再從user取出資料
    const userId = req.user.userId;
    //從token解析資料並放入req.user中再從user取出資料
    try {
      const getCurrentUserRef = await pool.query('SELECT id, username, email, role FROM users WHERE id = $1', [userId]);
      res.json(getCurrentUserRef.rows[0]);
    } catch (err) {
      res.status(500).json({ error: '伺服器錯誤' });
    }
  };

  //新增會員
  exports.registerUser = async (req, res) => {
    //先進行解構
    const { username, email, password} = req.body;
    //role預設為user
    //auth_provider預設為"local"本地新增
    //avatar_url 和 avatar_public_id 預設為空

    //Joi 驗證
    //userSchema為剛剛建立的規則
    const { error } = userSchema.validate({ username, email, password });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const role = 'user';
    const provider = 'local';

    try {
      //檢查是否已註冊
      const existing = await pool.query(
        `SELECT id
        FROM users 
        WHERE username = $1
            OR email = $2
        `, 
        [username,email]
      );
      if (existing.rowCount !== 0) {
        return res.status(400).json({ error: '此用戶已註冊' });
      }
      console.log("測試資料",existing);
      //檢查是否已註冊

      //加密密碼
      const hashedPassword = await bcrypt.hash(password, 10);
      //bcrypt.hash(password, 10); 意思是將密碼加密為難度10的亂數密碼

      //寫入資料庫
      const result = await pool.query(
        ` 
          INSERT INTO users (username, email, password, role, auth_provider, created_at) 
          VALUES ($1, $2, $3, $4, $5, now()) 
          RETURNING id, username, email, role, created_at
        `,
        [username, email, hashedPassword, role, provider]
      );

      return res.status(201).json({
        message: '會員註冊成功', 
      });
    } catch (err) {
      console.error('註冊失敗', err);
      res.status(404).json({ error: '會員註冊失敗' });
    }
  };

  // 會員登入
  exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
      // 1. 查詢使用者是否存在
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: '帳號或密碼錯誤' });
      }

      const user = result.rows[0];

      // 2. 驗證密碼
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: '帳號或密碼錯誤' });
      }

      // 3. 產生 JWT token
      const token = jwt.sign(
        { // 你想放入 token 的資料
          userId: user.id,
          email: user.email,
          username: user.username,
          role:user.role,
          auth_provider:user.auth_provider,
          origIatMs: Date.now(),
        },
        process.env.JWT_SECRET, // 用來加密的密鑰（讀取.env中的JWT_SECRET）
        { expiresIn: Math.floor(30 * 60 * 1000 / 1000) + 's' } //過期時間"1800s"（可選）
      );

      res.cookie('token', token, {
        httpOnly: true,       // ✅ 只能被伺服器端讀取，無法用 JS 讀取，有效防範 XSS 攻擊
        secure: true,        // ✅ 若是 HTTPS，建議設為 true
        sameSite: 'none',      // ✅ 可選值：'strict'、'lax'、'none'，防範 CSRF 攻擊
        path: '/',            // 全站有效
        // maxAge: 30 * 60 * 1000, 
        // ✅ 設定 cookie 的存活時間，這裡是 30分鐘
        maxAge: 10 * 60 * 1000,
        //測試10分鐘
      });

      res.json({
        message: '登入成功',
        userData:{
          userId: user.id,
          email: user.email,
          username: user.username,
          role:user.role,
          auth_provider:user.auth_provider
        }
      });
    } catch (err) {
      console.error('登入錯誤:', err);
      res.status(500).json({ error: '伺服器錯誤' });
    }
  };

  //登入確認
  exports.logInCheck = (req, res) => {
    res.json(
      {  
        message: '確認成功',
        status: 
        { 
          userId: req.user.userId,
          email: req.user.email,
          username: req.user.username,
          role: req.user.role,
          auth_provider:req.user.auth_provider
        },
      }
    );
  };

  //更新會員資料：
  exports.userDataUpChange = async (req, res) => {
    //從token解析資料並放入req.user中再從user取出資料
    const userId = req.user.userId;
    //從token解析資料並放入req.user中再從user取出資料

    //從req.body解構資料
    const { username, email, password } = req.body;
    //從req.body解構資料

    // 先把可能為空的輸入轉成 null
    const newUsername = trimToNull(username);
    const newEmail    = trimToNull(email);
    const newPassword   = trimToNull(password);
    // 先把可能為空的輸入轉成 null

    //加密密碼
      const hashedPassword = newPassword? await bcrypt.hash(newPassword, 10) : null;
      //加密等級:10
    //加密密碼

    try {

      //會員資料更新
        const userDataUpChangeRef = await pool.query(
          `UPDATE users 
            SET username = COALESCE($1, username), 
                email = COALESCE($2, email), 
                password = COALESCE($3, password)
            WHERE id = $4 
            RETURNING id, username, email, role`,
          [newUsername, newEmail, hashedPassword, userId]
        );
        //NULLIF($1, '')：如果 $1 是空字串就變成 NULL
        //COALESCE(… , name)：如果前面是 NULL 就用原本的 name 值
      //會員資料更新

      res.json({
        message:"會員資料修改完成",
        userData: userDataUpChangeRef.rows[0],
      });
    } catch (err) {
      res.status(500).json({ error: '會員資料修改失敗' });
    }
  };

  //登出
  exports.logout = (req, res) => {
    res.clearCookie('token', {
      httpOnly: true,   // 與登入時一致
      secure: true,     // 與登入時一致
      sameSite: 'none', // 與登入時一致
      path: '/',        // 與登入時一致
    });
    res.json({ message: '登出成功' });
  };

  //會員密碼更新
  exports.userPasswordUpLoad = async (req, res) => {
      //從token解析資料並放入req.user中再從user取出資料
          const userId = req.user.userId;
      //從token解析資料並放入req.user中再從user取出資料

      //從前端取得使用者個人資料
      const 
      {  
          originPassWord,
          newPassWord,
      } = req.body;
      //從前端取得使用者個人資料
      
      //Joi 驗證
        const { error } = passwordSchema.validate({ password:originPassWord, newPassword:newPassWord });
        if (error) {
          return res.status(400).json({ error: error.details[0].message });
        }
      //Joi 驗證

      try {

        // 先從資料庫取出使用者密碼（加密過的）
          const userRes = await pool.query(
            `SELECT password FROM users WHERE id = $1`,
            [userId]
          );
          if (userRes.rowCount === 0) {
            return res.status(404).json({ error: "找不到使用者帳號" });
          }
        // 先從資料庫取出使用者密碼（加密過的）

        // 使用者密碼（加密過的）
          const originhashedPassword = userRes.rows[0].password;
        // 使用者密碼（加密過的）

        // 比對原密碼是否正確
          const isMatch = await bcrypt.compare(originPassWord, originhashedPassword);
          if (!isMatch) {
            return res.status(400).json({ error: "原密碼錯誤，請重新確認。" });
          }
        // 比對原密碼是否正確

        //對新密碼進行加密
          const newhashedPassword = await bcrypt.hash(newPassWord, 10);
          //bcrypt.hash(password, 10); 意思是將密碼加密為難度10的亂數密碼
        //對新密碼進行加密

        // 更新資料庫密碼
        await pool.query(
          `UPDATE users
          SET password = $1
          WHERE id = $2`,
          [newhashedPassword, userId]
        );

        return res.json({ 
          message: '密碼已修改完成', 
        });
      } catch (err) {
          console.error('密碼修改失敗:', err);
          return res.status(404).json({ error: '密碼修改失敗' });
      }
  };

  //會員登入次數統計
  exports.userLoginCounter = async (req, res) => {
      
    //從token解析資料並放入req.user中再從user取出資料
      const userId = req.user.userId;
      const username = req.user.username;
      const userRole = req.user.role;
    //從token解析資料並放入req.user中再從user取出資料

    try {

      // 計算台北當地今天（'YYYY-MM-DD'）
      const TaipeiLocalDate = `(now() AT TIME ZONE 'Asia/Taipei')::date`;
      // 算出台北當地今天（'YYYY-MM-DD'）

      await pool.query(
        `
        INSERT INTO daily_logins (user_id, username, role, local_date)
        VALUES ($1, $2, $3, ${TaipeiLocalDate})
        ON CONFLICT (user_id, local_date) DO NOTHING;
        `,
        [userId, username, userRole]
      );

      return res.json({ 
        message: '會員登入計數成功', 
      });
    } catch (err) {
        console.error('會員登入計數失敗:', err);
        return res.status(404).json({ error: '會員登入計數失敗' });
    }
  };


//會員用api




//管理員用api

  //取得圓環圖表用資料：
  exports.getChartData = async (req, res) => {
    try {

      // 直接在 SQL 裡同時算三種角色
      // const { rows: [data01] } = await pool.query(`
      //   SELECT
      //     COUNT(*) FILTER (WHERE role = 'user')::int   AS user_cnt,
      //     COUNT(*) FILTER (WHERE role = 'vip')::int    AS vip_cnt,
      //     COUNT(*) FILTER (WHERE role = 'vendor')::int AS vendor_cnt
      //   FROM users;
      // `);
      //此為陣列解構範例

      const data = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE role = 'user')::int   AS user_data,
          COUNT(*) FILTER (WHERE role = 'vip')::int    AS vip_data,
          COUNT(*) FILTER (WHERE role = 'vendor')::int AS vendor_data
        FROM users;
      `);

      const userData =  data.rows[0].user_data;
      const vipData = data.rows[0].vip_data;
      const vendorData = data.rows[0].vendor_data;
      //COUNT作用是計算筆數
      //COUNT(*)：計數所有列（不管欄位是否為 NULL）
      //COUNT(col)：只計數 col 不是 NULL 的列。
      //FILTER (WHERE …):只把符合條件的列，丟給這個聚合函式
      //假設:COUNT(*) FILTER (WHERE role = 'user') = 「只數 role='user' 的列數」
      //可以一次 SELECT 出多個條件的計數，例如
      //COUNT(*) FILTER (WHERE role='user'), COUNT(*) FILTER (WHERE role='vip') ...
      //::int（型別轉換）
      //COUNT(*) 在 PostgreSQL 預設回傳 bigint(數字)
      //但Node.js中bigint會當作字串，避免兩者打架所以使用::int直接統一回覆為數字
      //AS user_cnt（欄位別名）前端拿回結果時就能用 row.user_cnt 讀取
      //{ rows: [data01] }代表陣列解構
      //使用方式如下:
      //{ XXX(陣列名稱): [A(第一筆數據),B(第二筆數據)] }
      //{ rows(陣列名稱): [data01(第一筆數據)] }
      res.json({
        message: '圓環圖資料取得成功',
        ChartData: [userData, vipData, vendorData],
      });
    } catch (err) {
      console.error("圓環圖資料取得失敗", err);
      res.status(500).json({ error: '圓環圖資料取得失敗' });
    }
  };

  //取得折線圖表用資料：
  exports.getLineChartData = async (req, res) => {
    try {
        const data = await pool.query(`
            SELECT
                to_char((now() AT TIME ZONE 'Asia/Taipei')::date - 0, 'YYYY-MM-DD') AS day01,
                to_char((now() AT TIME ZONE 'Asia/Taipei')::date - 1, 'YYYY-MM-DD') AS day02,
                to_char((now() AT TIME ZONE 'Asia/Taipei')::date - 2, 'YYYY-MM-DD') AS day03,
                to_char((now() AT TIME ZONE 'Asia/Taipei')::date - 3, 'YYYY-MM-DD') AS day04,
                to_char((now() AT TIME ZONE 'Asia/Taipei')::date - 4, 'YYYY-MM-DD') AS day05,

                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 0 AND role = 'user')::int AS userday01total,

                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 1 AND role = 'user')::int AS userday02total,

                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 2 AND role = 'user')::int AS userday03total,
                
                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 3 AND role = 'user')::int AS userday04total,

                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 4 AND role = 'user')::int AS userday05total,

                
                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 0 AND role = 'vip')::int AS vipday01total,

                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 1 AND role = 'vip')::int AS vipday02total,

                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 2 AND role = 'vip')::int AS vipday03total,
                
                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 3 AND role = 'vip')::int AS vipday04total,

                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 4 AND role = 'vip')::int AS vipday05total,


                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 0 AND role = 'vendor')::int AS vendorday01total,

                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 1 AND role = 'vendor')::int AS vendorday02total,

                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 2 AND role = 'vendor')::int AS vendorday03total,
                
                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 3 AND role = 'vendor')::int AS vendorday04total,

                COUNT(*) FILTER 
                  (WHERE (local_date AT TIME ZONE 'Asia/Taipei')::date = (NOW() AT TIME ZONE 'Asia/Taipei')::date - 4 AND role = 'vendor')::int AS vendorday05total
            FROM daily_logins
        `);

        const dayData = [data.rows[0].day05,data.rows[0].day04,data.rows[0].day03,data.rows[0].day02,data.rows[0].day01];
        const userTotalData = [data.rows[0].userday05total,data.rows[0].userday04total,data.rows[0].userday03total,data.rows[0].userday02total,data.rows[0].userday01total];
        const vipTotalData = [data.rows[0].vipday05total,data.rows[0].vipday04total,data.rows[0].vipday03total,data.rows[0].vipday02total,data.rows[0].vipday01total];
        const vendorTotalData = [data.rows[0].vendorday05total,data.rows[0].vendorday04total,data.rows[0].vendorday03total,data.rows[0].vendorday02total,data.rows[0].vendorday01total];

        res.json({
            message: '折線圖資料取得成功',
            ChartData: {
                dayData:dayData,
                userTotalData:userTotalData,
                vipTotalData:vipTotalData,
                vendorTotalData:vendorTotalData,
            },
        });
    } catch (err) {
      console.error("折線圖資料取得失敗", err);
      res.status(500).json({ error: '折線圖資料取得失敗' });
    }
  };

  //取得所有會員資料：
  exports.getAllUserData = async (req, res) => {
    try {
      const allUserData = await pool.query(
        `SELECT 
        id,
        username,
        email,
        role
        FROM users
        ORDER BY role ASC`
      );
      res.json({
        allUserData:allUserData.rows,
      });
    } catch (err) {
      console.error("取得所有會員資料失敗", err);
      res.status(404).json({ error: '所有會員資料取得失敗' });
    }
  };

  //搜尋會員資料：
  exports.searchUserData = async (req, res) => {

    //先進行解構
      const { email, username, role, } = req.body;
    //先進行解構

    //將資料轉換
    const cleanEmail = trimToNull(email);
    const cleanUsername = trimToNull(username);
    const cleanRole = trimToNull(role);
    //將資料轉換

    try {

      //檢查搜尋條件不可全為空
        if (!cleanEmail && !cleanUsername && !cleanRole) {
          return (res.status(400).json({ error: "至少提供一個搜尋條件" }));
        }
      //檢查搜尋條件不可全為空
      const searchUserData = await pool.query(
        `SELECT 
        id,
        username,
        email,
        role
        FROM users
        WHERE email ILIKE '%' || $1 || '%' 
        OR username ILIKE '%' || $2 || '%'
        OR role ILIKE '%' || $3 || '%'
        ORDER BY role ASC
        `,
        [cleanEmail, cleanUsername, cleanRole]
      );
      //ILIKE作用是不分大小寫的比對
      //'%abc%' 意思是只要包含 abc（任意位置）
      //但外部函數(如:$1)不可被%直接包覆
      //中間需要||分隔
      if(searchUserData.rowCount === 0){
        return (res.status(200).json({ 
          message: '並無符合條件會員資料',
          searchUserData:[],
        }));
      }
      return (
        res.json({
          searchUserData:searchUserData.rows,
        })
      );
    } catch (err) {
      console.error("搜尋會員資料失敗", err);
      return(
        res.status(500).json({ error: '搜尋會員資料失敗' })
      );
    }
  };

  //修改會員權限：
  exports.roleChange = async (req, res) => {

    //先進行解構
      const { id, email, username, role, } = req.body;
    //先進行解構

    //將資料轉換
      const cleanEmail = trimToNull(email);
      const cleanUsername = trimToNull(username);
      const cleanRole = trimToNull(role);
    //將資料轉換

    try {

      //檢查ID不可全為空
        if (!id) {
          return (res.status(400).json({ error: "請提供會員ID" }));
        }
      //檢查ID不可全為空
      
      //檢查搜尋條件不可全為空
        if (!cleanEmail || !cleanUsername || !cleanRole) {
          return (res.status(400).json({ error: "搜尋條件不可缺少" }));
        }
      //檢查搜尋條件不可全為空

      const roleData = await pool.query(
        `UPDATE users 
        SET role = $1
        WHERE id = $2 AND username = $3 AND email = $4
        RETURNING id, username, email, role`,
        [cleanRole, id, cleanUsername, cleanEmail]
      );
      
      if(roleData.rowCount === 0){
        return (res.status(400).json({ 
          message: '會員權限更新失敗',
        }));
      }

      return (
        res.json({
          message: '會員權限更新成功',
          userData:roleData.rows[0],
        })
      );
      
    } catch (err) {
      console.error("會員權限更新失敗", err);
      return(
        res.status(500).json({ error: '會員權限更新失敗' })
      );
    }
  };






//取得會員資料（支援分頁 + 關鍵字搜尋)(管理員)(待研究)
exports.getFilterUserDataNotUse = async (req, res) => {

  // 取得 URL 查詢參數中的 page（頁數），若沒傳則預設為 1
  const page = parseInt(req.query.page) || 1;

  // 取得 URL 查詢參數中的 limit（每頁筆數），若沒傳則預設為 10
  const limit = parseInt(req.query.limit) || 10;

  // 取得 URL 查詢參數中的 search（搜尋關鍵字），若沒傳則預設為空字串
  const search = req.query.search || '';

  // 計算 SQL 查詢的 offset（要跳過的資料數量）
  // 告訴資料庫要「跳過」前面幾筆資料
  // 例如：第 2 頁，每頁 10 筆，offset = (2 - 1) * 10 = 10
  // page：第幾頁（從 1 開始）
  // limit：每頁要顯示幾筆
  // offset：要略過的資料數
  const offset = (page - 1) * limit;

  try {
    // Step 1️⃣：計算符合搜尋條件的總筆數（用於分頁計算）
    // ILIKE 是 PostgreSQL 不分大小寫的 LIKE
    // `%${search}%` 表示模糊搜尋，前後加 % 代表包含關鍵字
    // COUNT(*)：統計符合條件的總筆數，不會回傳資料內容，只回傳數量。
    // ILIKE：PostgreSQL 的「不分大小寫」模糊比對（LIKE 是分大小寫）。
    // %abc% 表示「包含 abc 的任何字串」
    // 如果 search 是空字串 ''，實際參數會變成 '%%'，等於「全部都符合」，所以也能列出全部使用者。
    const countRes = await pool.query(
      'SELECT COUNT(*) FROM users WHERE name ILIKE $1 OR email ILIKE $1',
      [`%${search}%`]
    );
    //根據search回傳所有符合search內容的資料數量

    // 從查詢結果取出總筆數（PostgreSQL 回傳的是字串，要轉成數字
    //parseInt是把資料轉成數字
    //因為 SQL 裡我們寫的是 SELECT COUNT(*) ...，欄位名預設就是 count
    const total = parseInt(countRes.rows[0].count);
    //再由parseInt轉成數字型態

    // Step 2️⃣：查詢符合條件的會員資料（加上分頁限制）
    //SELECT id, name, email, role：只取需要的欄位，回傳比較輕量。
    //WHERE name ILIKE $1 OR email ILIKE $1：同樣沿用剛剛的搜尋條件。
    //ORDER BY id：非常重要！ 分頁一定要有固定排序，不然每次翻頁結果可能會亂跳。
    //LIMIT $2 OFFSET $3：分頁核心：$2 對應 limit（每頁幾筆）$3 對應 offset（要跳過幾筆
    // ORDER BY id 表示結果按照 id 欄位排序
    // --是SQL 註解
    // LIMIT：限制最多回傳幾筆資料。
    // OFFSET：要跳過前幾筆資料才開始回傳。
    const result = await pool.query(
      `SELECT id, name, email, role 
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1
       ORDER BY id -- 按照 id 排序（可改成 created_at DESC）
       LIMIT $2 OFFSET $3`, // 分頁用
      [`%${search}%`, limit, offset] // 對應上面 SQL 的 $1, $2, $3
    );
    //搜尋users資料表符合search的資料按照 id 欄位排序根據limit決定一個頁面要顯示幾筆資料，offset則決定跳過指定頁數前面多餘的資料

    // Step 3️⃣：回傳 JSON 給前端
    res.json({
      total,        // 總筆數
      page,         // 當前頁數
      limit,        // 每頁筆數
      users: result.rows // 會員資料陣列
    });

  } catch (err) {
    // 如果 SQL 或程式有錯誤，回傳 500（伺服器錯誤）
    console.error("會員查詢錯誤", err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
};

//修改會員資料(管理員用)：
exports.patchUserData = async (req, res) => {
  const { userId, username, email, role } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET username=$2, email=$3, role=$4 WHERE id=$1 RETURNING id, username, email, role, auth_provider, avatar_url',
      [userId, username, email, role]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到該用戶' });
    }

    res.json({
      message:"會員資料修改完成",
      user:result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') { // 23505 代表 unique_violation 嘗試插入或更新的值和別的數值重複了
      return res.status(409).json({ error: 'Email 已被使用' });
      // 409 Conflict：資料衝突（例如 email 已存在）
    }
    console.error('修改會員資料錯誤:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
};


//刪除會員資格(管理員用)：
exports.delUserData = async (req, res) => {
  const { user_id } = req.body;
  try {
    const search = await pool.query("SELECT id, username FROM users WHERE id = $1 ;",[user_id]);
    if (search.rows.length === 0) {
      return res.status(404).json({ error: '找不到該用戶' });
    }
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [user_id]
    );

    res.json({
      message:"刪除會員完成",
      userAllDataList:result.rows,
    });
  } catch (err) {
    console.error('刪除會員失敗:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
};

//管理員用api


