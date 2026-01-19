// api/index.js 或 utils/api.js（文件名根据你的项目结构）

import axios from 'axios'

// 创建axios实例
const service = axios.create({
  baseURL: 'http://localhost:3000/api', // 后端接口基础地址
  timeout: 5000 // 请求超时时间
})

// 登录方法
export const login = async (username, password) => {
  try {
    const response = await service.post('users/login', {  // ✅ 改为 /login
      username,
      password
    })
    
    // 登录成功后保存状态
    if (response.data.code === 200) {
      sessionStorage.setItem('isLogin', 'true')
      sessionStorage.setItem('username', username)
    }

    return response.data
  } catch (error) {
    if (error.response) {
      // 服务器返回错误状态码
      throw new Error(error.response.data.message || '登录失败')
    } else if (error.request) {
      // 请求发出但没有收到响应
      throw new Error('服务器无响应')
    } else {
      // 请求配置出错
      throw new Error('请求配置错误')
    }
  }
}

// 注册方法（新增）
export const register = async (username, password) => {
  try {
    const response = await service.post('users/register', {  // ✅ 对应后端 /register 接口
      username,
      password
    })

    if (response.data.code === 200) {
      sessionStorage.setItem('isLogin', 'true')
      sessionStorage.setItem('username', username)
    }

    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || '注册失败')
    } else if (error.request) {
      throw new Error('服务器无响应')
    } else {
      throw new Error('请求配置错误')
    }
  }
}

// 退出登录方法
export const logout = async () => {
  // 可选：调用登出接口
  try {
    await service.post('/logout') // 如果你想通知后端
  } catch (err) {
    console.warn('登出接口调用失败', err)
  } finally {
    sessionStorage.removeItem('isLogin')
    sessionStorage.removeItem('username')
  }
}

// 获取登录状态
export const getLoginStatus = () => {
  return !!sessionStorage.getItem('isLogin')
}

// 导出所有方法
export default {
  login,
  register,  // ✅ 导出注册方法
  logout,
  getLoginStatus
}