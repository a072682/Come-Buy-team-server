// 對應 /messageController 的路由設定
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const verifyCookie = require('../middlewares/verifyCookieData');
//verifyCookie為讀取使用者的cookie使用者是否有提供合法的Token
const verifyTokenData = require('../middlewares/verifyTokenData');
//verifyTokenData為讀取使用者的token是否為合法的Token以及是否延續token
const adminVerifyCookieData = require('../middlewares/adminVerifyCookieData');
//adminVerifyCookieData為讀取管理者的cookie確認管理者是否有提供合法的Token
const adminVerifyTokenData = require('../middlewares/adminVerifyTokenData');
//adminVerifyTokenData為讀取管理者的token是否為合法的Token以及是否延續token
const allowRoles = require('../middlewares/allowRoles');
//引入allowRoles確認登入者的身分權限



//新增留言資料
router.post('/messageUpLoad', verifyTokenData,allowRoles('admin','user','vip','vendor'),
    messageController.userMessageUpLoad);


//管理員使用區

    //取得所有留言資料
    router.get('/getAllMessage', adminVerifyTokenData, allowRoles('admin'),
        messageController.getAllMessage);

    //取得今日所有留言資料
    router.get('/getToDayMessage', adminVerifyTokenData, allowRoles('admin'),
        messageController.getToDayMessage);

    //刪除指定留言資料
    router.delete('/deleteMessage/:id', adminVerifyTokenData, allowRoles('admin'),
        messageController.deleteMessage);

        
    
//管理員使用區

module.exports = router;