


// middlewares/upload.js
//此函式作用為上傳圖片至cloudinary雲端資料夾
const multer = require('multer');//引入multer套件
const { CloudinaryStorage } = require('multer-storage-cloudinary');//取出multer套件中的CloudinaryStorage類別
const cloudinary = require('../utils/cloudinary');//引入cloudinary的設定


const storage = new CloudinaryStorage({//建立新實體
  cloudinary,//帶入cloudinary中讀取.env檔案的設定
  params: {//上傳的規則設定，例如要上傳到哪個資料夾、限制格式、檔名、寬高等等
    folder: 'orderPreviewImg', // Cloudinary 上的資料夾
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

exports.orderPreviewImgUpload = multer({ storage });//建立一個上傳函式名為upload
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
  exports.orderPreviewImgChangeUpload = multer({ storage: changeStorage });
//覆蓋上傳