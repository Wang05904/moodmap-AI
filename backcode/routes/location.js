// routes/location.js
const express = require('express');
module.exports = function(db) {
  const router = express.Router();

  // // 上传/更新用户位置
  // router.post('/', async (req, res) => {
  //   const { user_id, lng, lat } = req.body;
  //   if (!user_id || lng === undefined || lat === undefined) return res.status(400).json({ error: '参数缺失' });
  //   try {
  //     await db.execute(
  //       'REPLACE INTO user_location (user_id, lng, lat) VALUES (?, ?, ?)',
  //       [user_id, lng, lat]
  //     );
  //     res.json({ success: true });
  //   } catch (e) {
  //     res.status(500).json({ error: e.message });
  //   }
  // });

  // 获取所有心情位置及内容
  router.get('/', async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT mood_id, user_id, longitude AS lng, latitude AS lat, content, sentiment_score FROM mood_entry'
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: '数据库查询失败' });
    }
  });

  return router;
};