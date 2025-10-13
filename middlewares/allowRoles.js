//確認登入者的狀態來給予權限
// 權限驗證 middleware
const allowRoles = (...roles) => {
    //(...roles)為當你傳入 任意數量的參數 時，它們會被「收集」成一個陣列 roles。
    //allowRoles('admin') // roles = ['admin']
    // allowRoles('admin', 'user') // roles = ['admin', 'user']
    // allowRoles() // roles = []
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        //如果 req.user.role 不在 roles 陣列裡，就拒絕通過。
        // roles = ['admin']
        //req.user是在verifyToken中設定的
        // req.user.role = 'user'
        // 則觸發條件
      return res.status(403).json({ error: '權限不足' });
    }
    next();
  };
};

module.exports = allowRoles;