// controllers/userProfileController.js
const pool = require('../db/db');
const Joi = require('joi');

/** 🔧 共用：把空字串轉成 null，避免 CHECK 失敗 */
const toNull = (v) => (v === '' || v === undefined ? null : v);

/** ✅ Joi 驗證：依你欄位做基本檢查（生日拆成三欄版本） */
const profileSchema = Joi.object({
    salutation: Joi.string().valid('先生', '女士').allow('', null),
    //稱謂
    avatar_url: Joi.string().allow('', null),
    avatar_id: Joi.string().allow('', null),
    google_avatar_url:Joi.string().allow('', null),

    last_name: Joi.string().allow('', null),
    first_name: Joi.string().allow('', null),

    birth_year: Joi.number().integer().min(1900).max(new Date().getFullYear()).allow(null, ''),
    birth_month: Joi.number().integer().min(1).max(12).allow(null, ''),
    birth_day: Joi.number().integer().min(1).max(31).allow(null, ''),

    phone: Joi.string().allow('', null),
    mobile: Joi.string().allow('', null),

    country_code: Joi.string().uppercase().length(2).allow('', null),
    postal_code: Joi.string().allow('', null),
    address_line: Joi.string().allow('', null),
});

/* 取得會員個人資料 */
exports.getUserProfile = async (req, res) => {
    //從token解析資料並放入req.user中再從user取出資料
    const userId = req.user.userId;
    //從token解析資料並放入req.user中再從user取出資料

    //檢查是否為管理員
    const username = req.user.username;
    if(username === "admin123"){
        return res.status(200).json({ message: '管理員帳戶無個人信息', });
    }
    //檢查是否為管理員

    try {
        //將users跟user_list跟user_profiles合併在一起查詢
        const getUserProfileRef = await pool.query(
        `SELECT     user_list_id,
                    salutation, 
                    last_name, 
                    first_name,
                    birth_year, 
                    birth_month, 
                    birth_day,
                    phone, mobile, 
                    country_code, 
                    postal_code, 
                    address_line,
                    avatar_url,
                    avatar_id,
                    google_avatar_url
        FROM user_profiles
        JOIN user_list ON user_profiles.user_list_id = user_list.id
        JOIN users ON user_list.user_id = users.id
        WHERE users.id = $1`,
        [userId]
        );
        //JOIN使用方法
            // FROM 本地資料表 
            // JOIN 目標資料表 ON 本地關聯欄位 = 目標關聯欄位;
        //JOIN使用方法
        // 如果沒有，回傳空結果也可以由前端顯示「尚未填寫」
        return res.json(
            {
                message: '會員個資已取得成功',
                userData: getUserProfileRef.rows[0],
            }
        );
    } catch (err) {
        console.error('會員個資已取得失敗:', err);
        return res.status(500).json({ error: '伺服器錯誤/會員個資已取得失敗' });
    }
};

/*新建會員的個資*/
exports.createUserProfile = async (req, res) => {
    //先進行解構
    const { email } = req.body;
    //先進行解構

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
        avatar_id:null,
        google_avatar_url:null,
    }

    try {
        //先搜尋user看email存不存在
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        //先搜尋user看email存不存在

        //檢查email存不存在
        if( existing.rowCount <= 0 ){
            return res.status(404).json({
                message: '會員不存在個資無法建立',
            });
        }
        //檢查email存不存在

        //先搜尋user_list看id存不存在
        const listIdExist = await pool.query(
            'SELECT id FROM user_list WHERE user_id = $1', [existing.rows[0].id]
        );
        //先搜尋user_list看id存不存在

        if( listIdExist.rowCount > 0 ){
            return res.status(200).json({
                message: '會員個資已建立',
            });
        }else{
            // 如果不存在則新增如果存在則更新時間並回傳id
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
                RETURNING id,(xmax = 0) AS inserted;`,
                [existing.rows[0].id]
            );

            const listDataId = listData.rows[0].id;
            // 如果不存在則新增如果存在則更新時間並回傳id

            //插入新資料進user_profiles資料夾
            const userData = await pool.query(
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
                    defaultUserData.google_avatar_url
                ]
            );
            //插入新資料進user_profiles資料夾
            return res.status(201).json({ message: '用戶個人資料建立成功' });
            // userData: userData.rows[0]
        }
    } catch (err) {
        console.error('createMyProfile error:', err);
        return res.status(500).json({ error: '伺服器錯誤/用戶個人資料建立失敗' });
    }
};

/*修改會員的個資*/
exports.upUserProfile = async (req, res) => {
    //從token解析資料並放入req.user中再從user取出資料
        const userId = req.user.userId;
    //從token解析資料並放入req.user中再從user取出資料

    //從前端取得使用者個人資料
    const 
    {  
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
    } = req.body;
    //從前端取得使用者個人資料

    //將資料進行轉換
    const cleanedData = {
        salutation: toNull(salutation),
        last_name: toNull(last_name),
        first_name: toNull(first_name),
        birth_year: toNull(birth_year),
        birth_month: toNull(birth_month),
        birth_day: toNull(birth_day),
        phone: toNull(phone),
        mobile: toNull(mobile),
        country_code: toNull(country_code),
        postal_code: toNull(postal_code),
        address_line: toNull(address_line),
        avatar_url: toNull(avatar_url),
        avatar_id: toNull(avatar_id),
        google_avatar_url: toNull(google_avatar_url),
    };
    //將資料進行轉換

    //Joi 驗證
    //profileSchema為剛剛建立的規則
    const { error } = 
    profileSchema.validate(cleanedData);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    //Joi 驗證

    try {

        //更新user_list資料表中的時間
            await pool.query(
                `UPDATE public.user_list
                SET updated_at = NOW()
                WHERE user_id = $1`,
                [userId]
            );
        //更新user_list資料表中的時間

        //用userId在user_list資料表中取出id
            const user_list_id_Res = await pool.query(
            `SELECT id
            FROM user_list
            WHERE user_id = $1`,
            [userId]
            );
        //用userId在user_list資料表中取出id

        

        //檢查user_list對應的id是否存在
        if (user_list_id_Res.rowCount === 0) {
            return res.status(404).json({ error: '找不到user_list對應id' });
        }
        //檢查user_list對應的id是否存在

        //將對應的id確實的賦予user_list_id
        const user_list_id = user_list_id_Res.rows[0].id;
        //將對應的id確實的賦予user_list_id

        const userProfileData = await pool.query(
            `UPDATE public.user_profiles
             SET
                salutation        = COALESCE($2, salutation),
                last_name         = COALESCE($3, last_name),
                first_name        = COALESCE($4, first_name),
                birth_year        = COALESCE($5, birth_year),
                birth_month       = COALESCE($6, birth_month),
                birth_day         = COALESCE($7, birth_day),
                phone             = COALESCE($8, phone),
                mobile            = COALESCE($9, mobile),
                country_code      = COALESCE($10, country_code),
                postal_code       = COALESCE($11, postal_code),
                address_line      = COALESCE($12, address_line),
                avatar_url        = COALESCE($13, avatar_url),
                avatar_id         = COALESCE($14, avatar_id),
                google_avatar_url = COALESCE($15, google_avatar_url)
            WHERE user_list_id = $1
            RETURNING *`,
            [
                user_list_id, 
                cleanedData.salutation,
                cleanedData.last_name,
                cleanedData.first_name,
                cleanedData.birth_year,
                cleanedData.birth_month,
                cleanedData.birth_day,
                cleanedData.phone,
                cleanedData.mobile,
                cleanedData.country_code,
                cleanedData.postal_code,
                cleanedData.address_line,
                cleanedData.avatar_url,
                cleanedData.avatar_id,
                cleanedData.google_avatar_url
            ]
        );
        //ON CONFLICT (user_id)代表當 INSERT 新資料時，若 user_id 欄位值衝突
        //不要報錯，而是執行後面的 DO UPDATE
        //EXCLUDED 代表 這次嘗試 INSERT 的那筆資料
        return res.json({ message: '會員資料已更新', userProfileData: userProfileData.rows[0] });
    } catch (err) {
        console.error('upsertMyProfile error:', err);
        return res.status(500).json({ error: '伺服器錯誤' });
    }
};
