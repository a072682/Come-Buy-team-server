// 對應 /orderController 的路由設定
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
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



//取得訂單資料
router.get('/getOrderData', verifyTokenData, allowRoles('admin','user','vip','vendor'),orderController.getOrder);

//新增訂單資料
router.post('/registerOrder', verifyTokenData,allowRoles('admin','user','vip','vendor'),orderController.registerOrder);

//刪除訂單資料
router.delete('/deleteOrder/:id', verifyTokenData,allowRoles('admin','user','vip','vendor'),orderController.deleteOrder);

//管理員使用區

    //取得所有訂單資料
    router.get('/getAllOrder', adminVerifyTokenData, allowRoles('admin'),orderController.getAllOrder);

    //刪除訂單資料
    router.delete('/deleteSingleOrder/:id', adminVerifyTokenData, allowRoles('admin'),orderController.deleteSingleOrder);

    //取得今日所有訂單資料
    router.get('/getToDayOrder', adminVerifyTokenData, allowRoles('admin'),orderController.getToDayOrder);

    //審核訂單資料
    router.post('/reviewOrder', adminVerifyTokenData, allowRoles('admin'),orderController.reviewOrder);
    
    //長條圖資料取得
    router.get('/getBarChartData',adminVerifyTokenData,allowRoles('admin'), orderController.getBarChartData);

    
//管理員使用區

module.exports = router;