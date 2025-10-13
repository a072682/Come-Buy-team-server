// utils/cloudinary.js
//負責設定雲端連接設定
const cloudinary = require('cloudinary').v2;//.v2 是指 Cloudinary 套件提供的第二版 API
require('dotenv').config();//讀取.env資料

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
//將 Cloudinary 的帳號資料（如 cloud name、API key 等）設定進 cloudinary 套件內部，讓它能正確上傳/存取圖片。這是一個初始化設定。

module.exports = cloudinary;
