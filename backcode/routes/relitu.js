const express = require('express');
const router = express.Router();

// 导出工厂函数，接收 db
module.exports = (db) => {
  // 热力图数据接口
  router.get('/relitu', async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT longitude AS lng, latitude AS lat, IFNULL(sentiment_score, 1) AS count FROM mood_entry'
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: '数据库查询失败' });
    }
  });

  return router;
};
