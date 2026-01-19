// routes/users.js
const express = require('express');
const router = express.Router();

// 将数据库连接池作为参数传递给模块
module.exports = function(db) {
  /**
   * 登录接口
   * POST /api/users/login
   */
  router.post('/login', async (req, res, next) => {
    try {
      const { username, password } = req.body;
      console.log('登录请求:', req.body);

      // 从数据库查询用户
      const [rows] = await db.execute('SELECT * FROM user WHERE username = ?', [username]);

      if (rows.length === 0) {
        return res.status(401).json({ 
          code: 401, 
          message: '用户名不存在' 
        });
      }

      const user = rows[0];

      // ✅ 明文密码比对
      if (user.password !== password) {
        return res.status(401).json({ 
          code: 401, 
          message: '用户名或密码错误' 
        });
      }

      res.json({
        code: 200,
        message: '登录成功',
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar // 确保数据库字段是 avatar（不是 avator）
        }
      });
    } catch (error) {
      console.error('登录错误:', error);
      next(error);
    }
  });

  /**
   * 注册接口
   * POST /api/users/register
   */
  router.post('/register', async (req, res, next) => {
    const { username, password } = req.body;

    // 基本验证
    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: '用户名和密码不能为空'
      });
    }

    try {
      // 检查用户名是否已存在
      const [existingUsers] = await db.execute(
        'SELECT id FROM user WHERE username = ?',
        [username]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          code: 400,
          message: '用户名已存在'
        });
      }

      // ✅ 不加密：直接使用明文密码
      const plainPassword = password;

      // 设置默认头像
      const defaultAvatar = 'https://via.placeholder.com/150'; // 可替换为你的默认头像

      // 插入新用户（password 存明文）
      const [result] = await db.execute(
        'INSERT INTO user (username, password, avatar) VALUES (?, ?, ?)',
        [username, plainPassword, defaultAvatar]
      );

      res.json({
        code: 200,
        message: '注册成功',
        data: {
          id: result.insertId,
          username,
          avatar: defaultAvatar
        }
      });
    } catch (error) {
      console.error('注册错误:', error);
      res.status(500).json({
        code: 500,
        message: '服务器错误'
      });
    }
  });

  /**
   * 登出接口
   * POST /api/users/logout
   */
  router.post('/logout', (req, res) => {
    // 由于你使用 sessionStorage，后端无需处理 session
    res.json({ 
      code: 200, 
      message: '登出成功' 
    });
  });

  // 返回路由实例
  return router;
};