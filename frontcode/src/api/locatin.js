import axios from 'axios';

// 获取所有用户位置
export function fetchAllLocations() {
  return axios.get('/api/location').then(res => res.data);
}