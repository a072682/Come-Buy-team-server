// 對應 /messageController 的路由設定
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const verifyCookie = require('../middlewares/verifyCookieData');//verifyCookie為讀取使用者的cookie使用者是否有提供合法的Token
const adminVerifyCookieData = require('../middlewares/adminVerifyCookieData');//adminVerifyCookieData為讀取管理者的cookie確認管理者是否有提供合法的Token
const allowRoles = require('../middlewares/allowRoles');//引入allowRoles確認登入者的身分權限



//新增留言資料
router.post('/messageUpLoad', verifyCookie,allowRoles('admin','user','vip','vendor'),messageController.userMessageUpLoad);


//管理員使用區

    //取得所有留言資料
    router.get('/getAllMessage', adminVerifyCookieData, allowRoles('admin'),messageController.getAllMessage);

    //取得今日所有留言資料
    router.get('/getToDayMessage', adminVerifyCookieData, allowRoles('admin'),messageController.getToDayMessage);
    
//管理員使用區

module.exports = router;