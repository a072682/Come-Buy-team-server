// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const verifyCookie = require('../middlewares/verifyCookieData');//verifyCookie為讀取使用者的cookie使用者是否有提供合法的Token
const allowRoles = require('../middlewares/allowRoles');//引入allowRoles確認登入者的身分權限
const orderPreviewImgUpLoad = require('../orderPreviewImgUpLoad/orderPreviewImgUpLoad');
const orderPreviewImgUploadController = require('../controllers/orderPreviewImgUploadController');//將雲端網址傳送至前端



//訂單預覽圖片上傳
router.post('/upload', verifyCookie, allowRoles('admin','user','vip','vendor'), 
            orderPreviewImgUpLoad.orderPreviewImgUpload.single('image'), orderPreviewImgUploadController.uploadImage);

//訂單預覽圖片修改上傳
router.post('/changeUploadImages', verifyCookie, allowRoles('admin','user','vip','vendor'), 
            orderPreviewImgUpLoad.orderPreviewImgChangeUpload.single('image'), orderPreviewImgUploadController.changeFolderImages);

module.exports = router;