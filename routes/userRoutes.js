// 對應 /userController 的路由設定
const express = require('express');
const router = express.Router();
const { registerUser } = require('../controllers/userController');
//使用{}為解構，意思是指從userController取出registerUser函式
const verifyCookie = require('../middlewares/verifyCookieData');
//verifyCookie為讀取使用者的cookie使用者是否有提供合法的Token
const verifyTokenData = require('../middlewares/verifyTokenData');
//verifyTokenData為讀取使用者的token是否為合法的Token以及是否延續token
const adminVerifyCookieData = require('../middlewares/adminVerifyCookieData');
//adminVerifyCookieData為讀取管理者的cookie確認管理者是否有提供合法的Token
const adminVerifyTokenData = require('../middlewares/adminVerifyTokenData');
//adminVerifyTokenData為讀取管理者的token是否為合法的Token以及是否延續token
const userController = require('../controllers/userController');
//不使用{}為引入整個模組可以使用所有userController的函式但是命名方式為userController.xxx
const allowRoles = require('../middlewares/allowRoles');
//引入allowRoles確認登入者的身分權限




//取得會員資料
router.get('/getUserData', verifyTokenData, allowRoles('admin','user','vip','vendor'),userController.getCurrentUser);

//確認登入
router.post('/logInCheck', verifyTokenData,userController.logInCheck);

//會員登入次數統計
router.post('/userLoginCounter',verifyTokenData, userController.userLoginCounter);

//創建會員
router.post('/register', registerUser);

//登入會員
router.post('/login', userController.login);

//登出
router.post('/logout',userController.logout);

//更新會員資料
router.post('/userDataUpChange', verifyTokenData, allowRoles('admin','user','vip','vendor'),userController.userDataUpChange);

//會員密碼修改更新
router.post('/userPasswordUpLoad', verifyTokenData, allowRoles('admin','user','vip','vendor'),userController.userPasswordUpLoad);


//管理員使用區

    //登入會員
    router.post('/adminlogin', userController.adminLogin);

    //確認登入
    router.post('/adminlogInCheck', adminVerifyTokenData,allowRoles('admin'),userController.logInCheck);

    //登出
    router.post('/adminlogout',userController.adminLogout);

    //取得所有會員資料
    router.get('/getAllUser',adminVerifyTokenData,allowRoles('admin'), userController.getAllUserData);

    //搜尋會員資料
    router.post('/searchUser',adminVerifyTokenData,allowRoles('admin'), userController.searchUserData);

    //修改會員權限
    router.post('/roleChange',adminVerifyTokenData,allowRoles('admin'), userController.roleChange);

    //圓環圖資料取得
    router.get('/getChartData',adminVerifyTokenData,allowRoles('admin'), userController.getChartData);

    //折線圖資料取得
    router.get('/getLineChartData',adminVerifyTokenData,allowRoles('admin'), userController.getLineChartData);

    
    
    

    
    

//管理員使用區


module.exports = router;
