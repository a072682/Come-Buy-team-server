// 對應 /orderController 的路由設定
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verifyCookie = require('../middlewares/verifyCookieData');//verifyCookie為讀取使用者的cookie使用者是否有提供合法的Token
const allowRoles = require('../middlewares/allowRoles');//引入allowRoles確認登入者的身分權限


//取得訂單資料
router.get('/getOrderData', verifyCookie, allowRoles('admin','user','vip','vendor'),orderController.getOrder);

//新增訂單資料
router.post('/registerOrder', verifyCookie,allowRoles('admin','user','vip','vendor'),orderController.registerOrder);

//管理員使用區

    //取得所有訂單資料
    router.get('/getAllOrder', verifyCookie, allowRoles('admin'),orderController.getAllOrder);

    //取得今日所有訂單資料
    router.get('/getToDayOrder', verifyCookie, allowRoles('admin'),orderController.getToDayOrder);

    //審核訂單資料
    router.post('/reviewOrder', verifyCookie, allowRoles('admin'),orderController.reviewOrder);
    
    //長條圖資料取得
    router.get('/getBarChartData',verifyCookie,allowRoles('admin'), orderController.getBarChartData);

    
//管理員使用區

module.exports = router;