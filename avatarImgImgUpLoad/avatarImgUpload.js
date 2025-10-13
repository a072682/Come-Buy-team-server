



// middlewares/upload.js
//此函式作用為上傳圖片至cloudinary雲端資料夾
const multer = require('multer');//引入multer套件
const { CloudinaryStorage } = require('multer-storage-cloudinary');//取出multer套件中的CloudinaryStorage類別
const cloudinary = require('../utils/cloudinary');//引入cloudinary的設定


const storage = new CloudinaryStorage({//建立新實體
  cloudinary,//帶入cloudinary中讀取.env檔案的設定
  params: {//上傳的規則設定，例如要上傳到哪個資料夾、限制格式、檔名、寬高等等
    folder: 'avatarImg', // Cloudinary 上的資料夾
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

exports.upload = multer({ storage });//建立一個上傳函式名為upload
//上傳成功後會將結果放置req.file 此為CloudinaryStorage預設動作


//覆蓋上傳
  //req.body.public_id 指定目標
  const changeStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req/*, file*/) => {
      if (!req.body.public_id) throw new Error('缺少 public_id，無法執行覆蓋');
      return {
        public_id: req.body.public_id,    // ← 要覆蓋誰（含資料夾，例如 products/abc123）
        overwrite: true,                  // ← 允許覆蓋
        invalidate: true,                 // ← 讓 CDN 快取失效
        unique_filename: false,           // 讓隨機取名功能關閉
        allowed_formats: ['jpg','jpeg','png','webp'],
      };
    },
  });
  exports.changeUpload = multer({ storage: changeStorage });
//覆蓋上傳




// 此函式作用為描述「檔案要存哪裡、要怎麼存」的規則並設定上傳圖片至cloudinary雲端資料夾，本身不會觸發任何上傳動作
// 可控：限制圖片格式、固定上傳資料夾
const avatarsStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    // 可選：先天裁切（較少用；通常前端顯示時用轉換參數即可）
    // transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'auto' }],
  },
});

//建立規則群組
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
//Set為 JavaScript 內建的一種陣列，特點是值不能重複（重複插入會被忽略）
//檢查file.mimetype是否符合image/jpeg、image/png、image/webp這種形式

//此函式的作用為檔案上傳前先檢查格式和檔案大小
//Multer 才是「上傳程式」
exports.uploadAvatar = multer({
  storage: avatarsStorage,  // ← 要使用 storage不然會失效
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 上限
  },
  fileFilter: (req, file, cb) => {
    //fileFilter 是 Multer 的一個「選項名稱」（固定的）
    //multer({ fileFilter }) 裡提供一個函式，Multer 就會在每個檔案進入後端時先跑這個函式
    //函式固定格式是：(req, file, cb) => { ... }
    //req：這次請求物件
    //file：關於上傳檔案的資訊（如 file.mimetype、file.originalname）
    //cb：回呼函式，告訴 Multer「接受/拒絕/丟錯」
    if (!ALLOWED.has(file.mimetype)) return cb(null, false); // 如果檔案類型不是允許的，就拒絕它（false），但不要把它當成伺服器錯誤。
    //has為Set提供的內建方法用來檢查某個值是否存在
    //file.mimetype 是什麼
    //file.mimetype 這個屬性是瀏覽器在上傳檔案時送出的 MIME 類型，用來描述檔案格式
    // image/jpeg → JPG 圖片
    // image/png → PNG 圖片
    // image/webp → WebP 圖片
    // application/pdf → PDF 文件
    // video/mp4 → MP4 影片
    cb(null, true);// 接受檔案
    //cb只會在fileFilter內使用
    //cb 的用法 cb(條件為真時要傳的東西, 條件為假時要傳的東西);
    //true接受檔案 → 這個檔案會被存起來，並放到 req.file
    //false拒絕檔案 → 不會存檔，req.file 會是 undefined
  },
});

// module.exports = uploadAvatar;

// module.exports = {
//   upload,        // products 用
//   uploadAvatar,  // avatars 用
// };