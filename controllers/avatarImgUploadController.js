
const pool = require('../db/db');//取得後端資料庫連結
const cloudinary = require('../utils/cloudinary');//引入cloudinary的設定


//取得雲端的圖片
exports.getFolderImages = async (req, res) => {
    try {
        const folder = 'avatarImg';   // e.g. 'products' 指定的資料夾名稱
        const next   = req.query.next || undefined;      // 分頁游標 (optional)

        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: `${folder}/`,   // 指定資料夾
            max_results: 5,        // 每頁數量 (1~500) 每次呼叫 API 最多拿max_results數量的圖
            next_cursor: next,      // 下一頁游標
            // optional: resource_type: 'image',
            // optional: direction: 'desc',
        });
        //type: 'upload' 的意思是：我要列出用「一般上傳 (upload API)」方式上傳的資源。
        // upload → 你平常用 uploader.upload() 上傳的檔案（最常見）
        // authenticated → 受保護的檔案，需要簽名 URL 才能存取
        // private → 完全私有，不能公開 URL
        // facebook, twitter, youtube … → 表示來源是社群整合的檔案

        // 常用欄位精簡回傳
        //resources 為 Cloudinary 指定的名稱
        const items = result.resources.map(r => ({
            public_id:  r.public_id,          // 'products/xxxx'
            url:        r.secure_url,         // 圖片 HTTPS URL
            format:     r.format,
            bytes:      r.bytes,
            width:      r.width,
            height:     r.height,
            created_at: r.created_at,
        }));

        return res.json({
          items,
          next_cursor: result.next_cursor || null, // 前端可帶上 ?next=... 取下一頁
        });
    } catch (e) {
          return res.status(500).json({ ok:false, error: e.message });
    }
};
//取得雲端的圖片

//圖片上傳的函式
  //負責把上傳雲端後的圖片網址轉成url傳至前端
  exports.uploadImage = async (req, res) => {
    try {
      res.json(
        {
          message:"圖片上傳成功",
          url:req.file.path,
          filename: req.file.filename,
        }
      );
    } catch (error) {
      res.status(500).json({ error: '上傳失敗' });
    }
  };
//圖片上傳的函式

//修改雲端的圖片
  exports.changeFolderImages = async (req, res) => {
    try{
      res.json(
        {
          message:"圖片覆蓋成功",
          url:req.file.path,
          filename: req.file.filename,
        }
      );
    }catch(error){
      res.status(500).json({ error: '覆蓋失敗' });
    }
  }
//修改雲端的圖片

//刪除雲端的圖片
  exports.deleteImage = async (req, res) => {
      try {
        const { public_id } = req.params; // 或 req.params，看你設計

        if (!public_id) {
          return res.status(400).json({ ok: false, error: 'public_id 必填' });
        }

        const result = await cloudinary.uploader.destroy(public_id, {
          invalidate: true, // 刪除後清掉 CDN 快取
        });

        // result 可能是 { result: 'ok' } 或 { result: 'not found' }
        return res.json({
          ok: true,
          public_id,
          result: result.result,
        });
      } catch (error) {
        console.error('刪除失敗:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
  };
//刪除雲端的圖片


//負責把上傳雲端後的圖片網址轉成url傳至資料庫
exports.updateMyAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;//從前端取得userId
    //要是前端沒有攜帶圖片則顯示錯誤訊息
    if (!req.file) return res.status(400).json({ error: '請選擇圖片' });

    // CloudinaryStorage 會回傳這些
    // 新的頭像url
    const publicId = req.file.filename     // e.g. "avatars/abc123"
    const secureUrl = req.file.path;       // https://res.cloudinary.com/.../image/upload/...

    // 讀取當前的頭像ID資料
    const avatarIdData = await pool.query('SELECT avatar_public_id FROM users WHERE id=$1', [userId]);
    const oldavatarIdData = avatarIdData.rows[0]?.avatar_public_id;

    // 更新 DB
    const result = await pool.query(
      `UPDATE users
       SET avatar_url = $1, avatar_public_id = $2
       WHERE id = $3
       RETURNING id, username, email, role, avatar_url, avatar_public_id`,
      [secureUrl, publicId, userId]
    );

    // 刪舊圖（若存在且不同）
    if (oldavatarIdData && oldavatarIdData !== publicId) {
      try { await cloudinary.uploader.destroy(oldavatarIdData); 

      } catch (error) { /* 忽略失敗 */ 
        //失敗的話甚麼都不做單純顯示訊息
        console.warn('刪除舊頭像失敗：', oldavatarIdData, error.message);
      }
      //cloudinary.uploader.destroy(oldPublicId)是 官方的刪檔 API
      //參數：publicId（要含資料夾路徑，如 avatars/abc123）不能傳 URL；要傳 publicId 才刪得掉
      //回傳：類似 { result: 'ok' }、{ result: 'not found' }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '上傳失敗' });
  }
};
