// db/db.js
const { Pool } = require('pg'); // 引入 pg 套件，並從中取出 Pool（連線池）功能
require('dotenv').config(); // 引入 dotenv 套件，讓我們可以讀取 .env 檔案中的環境變數

const pool = new Pool({ // 建立一個新的 Pool 實例，裡面傳入連線設定
user: process.env.DB_USER,
host: process.env.DB_HOST,
database: process.env.DB_DATABASE,
password: process.env.DB_PASSWORD,
port: process.env.DB_PORT,
});

module.exports = pool; // 將這個 pool 導出（export），讓其他檔案可以使用