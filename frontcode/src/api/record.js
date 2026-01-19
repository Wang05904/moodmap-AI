import axios from 'axios'
import AMapLoader from "@amap/amap-jsapi-loader";


// 创建axios实例
const service = axios.create({
    baseURL: 'http://localhost:3000/api', // 后端服务器地址
    timeout: 5000 // 请求超时时间
  })

const analyzeMood = async (content) => {
  try {
    const response = await service.post('/mood/analyze', {
      content: content
    })
    if (response.data.status === 'success') {
      return response.data.data.sentiment_score
    } else {
      console.warn('AI分析失败:', response.data.message)
      return 2 // 默认中性
    }
  } catch (error) {
    console.error('AI请求失败:', error)
    return 2 // 失败时返回中性分
  }
}

export async function analyzeTotalMood(sentimentData) {
  try {
    // 使用已配置的service实例发送请求
    const response = await service.post('/mood/analyze-total', sentimentData);
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('情绪分析请求失败:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || '分析请求失败，请重试'
    };
  }
}

//发送记录
export const sendRcd = async (data) => {
  try {
    //  1. 先调用 AI 分析，获取情绪分
    const sentiment_score = await analyzeMood(data.content)
    console.log('情绪分:', sentiment_score)
    //2.获取定位
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;
            const moodData = {
              userId: data.userId,
              latitude: lat,
              longitude: lng,
              content: data.content,
              sentiment_score: sentiment_score,
            };
            console.log('获取到的定位:', lng, lat);

            // 3. 发送记录（后端 /record/sendRcd 接收情绪分）
            service.post('/record/sendRcd', moodData)
              .then(response => {
                console.log('记录发送成功:', response);
                resolve(moodData);
              })
              .catch(error => {
                console.error('记录发送失败:', error);
                reject(error);
              });
          },
          (error) => {
            console.error('定位失败:', error);
            reject(error);
          }
        );
      } else {
        console.error('浏览器不支持地理定位');
        reject(new Error('浏览器不支持地理定位'));
      }
    });
  } catch (error) {
    console.error('AI请求失败:', error);
    throw error;
  }
};
export const getRcdByUserId = async (userId) => {
  try{
    const response = await service.get('/record/getRcdByUserId', {
      params: {
        userId: userId // 会自动转换为查询参数 ?userId=1
      }
    })
    return response;
  } catch (error) {
    console.log(error)
  }
}
export const getAllRcd = async () => {
  try{
    const response = await service.post('/record/getAllRcd')
    console.log('所有记录:', response.data);
    return response;
  } catch (error) {
    console.log(error)
  }
}
export const deleteRcdById = async (id) => {
  try {
    console.log('删除记录:', id);
    const response = await service.delete(`/record/deleteRcdById/${id}`);
    console.log('删除记录响应:', response);
    if (!response.data.success) {
      throw new Error('删除记录失败');
    }
    
    return response;
  } catch (error) {
    console.error('删除记录时发生错误:', error);
    throw error; // 抛出自定义错误处理
  }
};
  export default {
    // getScore,
    sendRcd,
    deleteRcdById,
    // getRcds,
    // addRcd,
    getRcdByUserId,
    getAllRcd,
    analyzeTotalMood
  }