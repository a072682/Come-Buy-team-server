
//此函式是「OAuth 登入策略設定」，設定GOOGLE如何登入

const passport = require('passport'); // 引入 passport 主程式
const GoogleStrategy = require('passport-google-oauth20').Strategy; // 引入 Google OAuth 策略
const pool = require('../db/db'); // 引入資料庫連線物件

//建立預設資料
const defaultUserData = 
{
    salutation:null,
    last_name:null, 
    first_name:null, 
    birth_year:null, 
    birth_month:null, 
    birth_day:null,
    phone:null, 
    mobile:null, 
    country_code:null, 
    postal_code:null, 
    address_line:null,
    avatar_url:null,
    avatar_id:null
}

// 註冊 Google 登入策略
passport.use(//預設名稱為"google"如果想改名則
    //'google-login', // <-- 如果要自訂策略名稱
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,            // 從 .env 讀取 Google OAuth client ID
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,    // 從 .env 讀取 Google OAuth client secret
        callbackURL: process.env.GOOGLE_CALLBACK_URL,      // 登入成功後會 redirect 回來的網址
    },
    console.log('GOOGLE_CALLBACK_URL =', process.env.GOOGLE_CALLBACK_URL),
    //Google 驗證成功後，會「自動把使用者資訊打包成 profile 給你」，你就能從 profile 拿到：
    // profile.id → Google ID
    // profile.displayName → 使用者名稱
    // profile.emails → Email 陣列
    // profile.photos → 大頭照 URL

    // 驗證回傳的 profile 資料
    async (accessToken, refreshToken, profile, done) => {
        const email = profile.emails[0].value || null;     // 取出使用者 Email
        const googleId = profile.id;                       // 取出 Google ID
        const username = profile.displayName;              // 取出使用者名稱
        const photo = profile.photos?.[0]?.value || null;  // 取出使用者頭像

        // 調整尺寸函式（Google 通常給 s96-c，可替換成 s256-c 等）
        const normalizePhoto = (imgData) => {
        if (!imgData) return null;
        return imgData.replace(/s\d+-c/, 's256-c'); // 例如改成 256px
        };

        const googleAvatarUrl = normalizePhoto(photo); //使用者頭像進行轉換

        try {
            // 檢查是否已存在該用戶（依 google_id 查找）
            const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
            // 檢查是否已存在該用戶（依 google_id 查找）
            

            // 如果有查到資料(代表已登入過會員)
            if (result.rowCount > 0) {
                
                // 取得使用者id
                const userId = result.rows[0].id;
                // 取得使用者id

                //搜尋user_list確認id是否存在
                const listIdExist = await pool.query(
                    `SELECT id 
                    FROM user_list 
                    WHERE user_id = $1`, 
                    [userId]
                );
                //搜尋user_list確認id是否存在

                //宣告listId
                const listId = listIdExist.rows[0].id;
                //宣告listId
                
                //done(error, user)
                //error → 有錯誤時傳錯誤物件，沒有錯誤就傳 null
                //user → 驗證成功後的使用者資料物件（會變成 req.user）

                // 將Google頭像更新至user_items資料表
                const newUserData = await pool.query(
                `UPDATE user_profiles 
                SET google_avatar_url = $1 
                WHERE user_list_id = $2
                RETURNING *`,
                [googleAvatarUrl, listId]
                );

                return done(null, {
                    id: userId,
                    email: result.rows[0].email,
                    username: result.rows[0].username,
                    role:result.rows[0].role,
                    auth_provider:result.rows[0].auth_provider,
                }); // 已存在 → 傳回使用者資料
                

            } else if(result.rowCount === 0){
                // 新用戶 → 建立帳號

                //users資料表新增資料
                const userData = await pool.query(
                    `INSERT INTO 
                    public.users 
                    (   
                        username,
                        email,
                        google_id,
                        role,
                        auth_provider,
                        created_at
                    )
                    VALUES($1,$2,$3,'user','google',now())
                    RETURNING id, username, email, role, auth_provider`,
                    [username,email,googleId]
                );

                // 取得使用者id
                const userId = userData.rows[0].id;
                // 取得使用者id

                //先在user_list先新增資料
                const listData = await pool.query(
                    `INSERT INTO public.user_list 
                    (   
                        user_id,
                        created_at, 
                        updated_at
                    )
                    VALUES($1,now(), now())
                    ON CONFLICT (user_id) DO UPDATE
                        SET updated_at = EXCLUDED.updated_at
                    RETURNING id`,
                    [userId]
                );

                const listDataId = listData.rows[0].id;

                //插入新資料進user_profiles資料夾
                const newUserData = await pool.query(
                `INSERT INTO public.user_profiles
                    (
                    user_list_id, 
                    salutation, 
                    last_name, 
                    first_name, 
                    birth_year, 
                    birth_month, 
                    birth_day,
                    phone, 
                    mobile, 
                    country_code, 
                    postal_code, 
                    address_line,
                    avatar_url,
                    avatar_id,
                    google_avatar_url
                    )
                VALUES
                    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                    ON CONFLICT (user_list_id) DO UPDATE SET
                    salutation   = EXCLUDED.salutation,
                    last_name    = EXCLUDED.last_name,
                    first_name   = EXCLUDED.first_name,
                    birth_year   = EXCLUDED.birth_year,
                    birth_month  = EXCLUDED.birth_month,
                    birth_day    = EXCLUDED.birth_day,
                    phone        = EXCLUDED.phone,
                    mobile       = EXCLUDED.mobile,
                    country_code = EXCLUDED.country_code,
                    postal_code  = EXCLUDED.postal_code,
                    address_line = EXCLUDED.address_line,
                    avatar_url   = EXCLUDED.avatar_url,
                    avatar_id    = EXCLUDED.avatar_id,
                    google_avatar_url = EXCLUDED.google_avatar_url
                RETURNING *`,
                    [
                        listDataId, 
                        defaultUserData.salutation, 
                        defaultUserData.last_name, 
                        defaultUserData.first_name, 
                        defaultUserData.birth_year, 
                        defaultUserData.birth_month, 
                        defaultUserData.birth_day,
                        defaultUserData.phone, 
                        defaultUserData.mobile, 
                        defaultUserData.country_code, 
                        defaultUserData.postal_code, 
                        defaultUserData.address_line,
                        defaultUserData.avatar_url,
                        defaultUserData.avatar_id,
                        googleAvatarUrl
                    ]
                );

                return done(null, {
                    id: userData.rows[0].userId,
                    email: userData.rows[0].email,
                    username: userData.rows[0].username,
                    role:userData.rows[0].role,
                    auth_provider:userData.rows[0].auth_provider,
                }); // 傳回新建立的用戶
            }
        } catch (err) {
            return done(err, null); // 若有錯誤，傳回錯誤
        }
    })
);
// ✅ 若要使用 session 的話，需有序列化與反序列化（但使用 JWT 可不寫）
// passport.serializeUser((user, done) => done(null, user.id));
// passport.deserializeUser((id, done) => done(null, id));
//這是「session-based 認證」的設定：
//serializeUser	將登入成功後的 user 資料「存進 session」時，選擇只存 user.id。
//deserializeUser	使用者後續請求時，從 session 拿到 user.id，再查資料庫找回整個 user。
