require('dotenv').config();const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2/promise'); // 使用mysql2/promise以支持async/await
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// 初始化数据库连接池
const db = mysql.createPool({
  host: 'localhost',
  user: 'root', // 替换为你的数据库用户名
  password: '123456', // 替换为你的密码
  database: 'moodmap', // 替换为你的数据库名

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 连接数据库
db.getConnection((err, connection) => {
  if (err) {
    console.error('数据库连接失败:', err);
    return;
  }
  console.log('数据库连接成功');
  connection.release(); // 释放连接
});

// 基础中间件
app.use(cors());                          // 启用 CORS
app.use(morgan('dev'));                   // 日志中间件
app.use(express.json());                  // 解析 JSON 请求体
app.use(express.urlencoded({ extended: false })); // 解析 URL 编码的请求体
app.use(cookieParser());                  // 解析 Cookie

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 路由
app.get('/', (req, res) => {
  res.json({ message: 'API 服务器运行正常' });
});

//location路由
const createLocationRouter = require('./routes/location');
const locationRouter = createLocationRouter(db);
app.use('/api/location', locationRouter);

// API 路由
const userRouter = require('./routes/users')(db);
app.use('/api/users', userRouter);

// mood路由
const moodRoutes = require('./routes/mood'); // ✅ 传入 db
app.use('/api/mood', moodRoutes);

//record路由
const recordRouter = require('./routes/record')(db);
app.use('/api/record', recordRouter);

// 热力图路由
const createRelituRouter = require('./routes/relitu');
const relituRouter = createRelituRouter(db);
app.use('/api', relituRouter);


// 404 错误处理
app.use((req, res) => {
  res.status(404).json({ message: '未找到请求的资源' });
});

// 错误处理中间件
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ 
//     message: '服务器内部错误',
//     error: process.env.NODE_ENV === 'development' ? err.message : {}
//   });
// });

// 设置端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;
