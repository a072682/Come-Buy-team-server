
const pool = require('../db/db');//取得後端資料庫連結
const cloudinary = require('../utils/cloudinary');//引入cloudinary的設定

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