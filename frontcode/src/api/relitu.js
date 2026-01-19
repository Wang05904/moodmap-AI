import axios from 'axios';

// 获取热力图数据
export function fetchHeatmapData() {
  return axios.get('/api/relitu').then(res => res.data);
}