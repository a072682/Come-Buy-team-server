// 對應 /userController 的路由設定
const express = require('express');
const router = express.Router();
const verifyCookie = require('../middlewares/verifyCookieData');
//verifyCookie為讀取使用者的cookie使用者是否有提供合法的Token
const verifyTokenData = require('../middlewares/verifyTokenData');
//verifyTokenData為讀取使用者的token是否為合法的Token以及是否延續token
const userProfileController = require('../controllers/userProfileController');
const allowRoles = require('../middlewares/allowRoles');
//引入allowRoles確認登入者的身分權限




//新建會員個人資料資料表
router.post('/createUserProfile', userProfileController.createUserProfile);

//取得會員個人資料表
router.get('/getUserProfile', verifyTokenData, allowRoles('admin','user','vip','vendor'),userProfileController.getUserProfile);

//修改會員個人資料表
router.post('/upUserProfile', verifyTokenData, allowRoles('admin','user','vip','vendor'), userProfileController.upUserProfile);

module.exports = router;
