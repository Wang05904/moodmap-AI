// routes/ai.js
const express = require('express');
const router = express.Router();
const { analyzeSentiment,analyzeTotalMood } = require('../utils/sentmentAI'); // 引入 AI 函数

/**
 * POST /api/analyze
 * 仅进行 AI 情绪分析，不涉及数据库
 */
router.post('/analyze', async (req, res) => {
  const { content } = req.body;

  // 验证输入
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      message: '请输入有效的心情内容'
    });
  }

  try {
    const sentiment_score = await analyzeSentiment(content.trim());

    // ✅ 只返回 AI 分析结果
    res.json({
      status: 'success',
      data: {
        sentiment_score,  // 0-5
        content: content.trim()
      }
    });
  } catch (err) {
    console.error('情绪分析失败:', err);
    res.status(500).json({
      status: 'error',
      message: '情绪分析失败，请稍后重试'
    });
  }
});

/**
 * POST /api/analyze-total
 * 分析整体情绪数据，返回文字描述结果
 */
router.post('/analyze-total', async (req, res) => {
  console.log('req.body:', req.body);
  const { xAxis, series } = req.body;

  // 验证输入数据格式
  if (!xAxis || !series) {
    return res.status(400).json({
      status: 'error',
      message: '请提供完整的情绪数据（xAxis和series）'
    });
  }

  try {
    // 调用整体情绪分析函数
    const analysisResult = await analyzeTotalMood({ xAxis, series });

    res.json({
      status: 'success',
      data: {
        analysis: analysisResult,  // 分析后的文字内容
        originalData: { xAxis, series }  // 返回原始数据供参考
      }
    });
  } catch (err) {
    console.error('整体情绪分析失败:', err);
    res.status(500).json({
      status: 'error',
      message: '整体情绪分析失败，请稍后重试'
    });
  }
});

module.exports = router;