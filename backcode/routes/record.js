// routes/users.js
const express = require("express");
const router = express.Router();

// 将数据库连接池作为参数传递给模块
module.exports = function (db) {
  // 增加记录接口
  router.post("/sendRcd", async function (req, res) {
    const { userId, content, latitude, longitude, sentiment_score } = req.body;
    const result = await db.query(
      "INSERT INTO mood_entry (user_id,content,sentiment_score,latitude,longitude,created_at) VALUES (?,?,?,?,?,?)",
      [userId, content, sentiment_score, latitude, longitude, new Date()]
    );
    res.json(result);
  });
  //获取个人记录接口
  router.get("/getRcdByUserId", async function (req, res) {
    const { userId } = req.query;
    const records = await db.query(
      "SELECT * FROM mood_entry WHERE user_id =?",
      [userId]
    );
    res.json(records[0]);
  });
    // 删除记录接口
    router.delete('/deleteRcdById/:id', async (req, res) => {
      const { id } = req.params;
      console.log(id);
      try {
        // 验证ID是否有效
        if (!id || isNaN(Number(id))) {
          return res.status(400).json({ 
            success: false, 
            message: '无效的记录ID' 
          });
        }
        
        // 执行删除操作
        const sql = 'DELETE FROM mood_entry WHERE mood_id = ?';
        const [result] = await db.execute(sql, [id]);
        
        // 检查是否有记录被删除
        if (result.affectedRows === 0) {
          return res.status(404).json({ 
            success: false, 
            message: '未找到要删除的记录' 
          });
        }
        
        // 返回成功响应
        res.json({
          success: true,
          message: '记录已成功删除',
          deletedId: id
        });
      } catch (error) {
        console.error('删除记录时发生错误:', error);
        res.status(500).json({ 
          success: false, 
          message: '服务器错误，删除失败' 
        });
      }
    });

  // 获取所有记录接口
  router.post("/getAllRcd", async function (req, res) {
    const records = await db.query("SELECT * FROM mood_entry");
    res.json(records[0]);
  });
  return router;
};
