// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const verifyCookie = require('../middlewares/verifyCookieData');
//verifyCookie為讀取使用者的cookie使用者是否有提供合法的Token
const verifyTokenData = require('../middlewares/verifyTokenData');
//verifyTokenData為讀取使用者的token是否為合法的Token以及是否延續token
const allowRoles = require('../middlewares/allowRoles');//引入allowRoles確認登入者的身分權限
const avatarImgUpload = require('../avatarImgImgUpLoad/avatarImgUpload');
const avatarImgUploadController = require('../controllers/avatarImgUploadController');//將雲端網址傳送至前端



//會員頭像圖片上傳
router.post('/upload', verifyTokenData, allowRoles('admin','user','vip','vendor'), 
    avatarImgUpload.upload.single('image'), avatarImgUploadController.uploadImage);

//會員頭像圖片修改上傳
router.post('/changeUploadImages', verifyTokenData, allowRoles('admin','user','vip','vendor'), 
    avatarImgUpload.changeUpload.single('image'), avatarImgUploadController.changeFolderImages);

module.exports = router;