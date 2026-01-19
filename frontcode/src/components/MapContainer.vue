<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import AMapLoader from "@amap/amap-jsapi-loader";
import { fetchHeatmapData } from "../api/relitu";
import * as echarts from 'echarts'
import { analyzeTotalMood } from "@/api/record";
import { useRcdStore } from '@/stores/rcdStore'


let map = null;
const rcdStore = useRcdStore()
const heatmapInstance = ref(null);
const heatmapVisible = ref(false);
// 新增：热力图模式状态（0:关闭, 1:热力图一, 2:热力图二）
const heatmapMode = ref(0);
const gridLayer = ref(null); // 网格图层引用
const gridPolygons = ref([]); // 存储所有网格多边形对象
const showGrid = ref(true); // 添加showGrid变量，默认为true表示显示网格


// 新增：看板相关状态
const boardVisible = ref(false); // 看板弹窗显示状态
const sentimentData = ref({
  xAxis: ['1分(悲伤)', '2分(低落)', '3分(中性)', '4分(开心)', '5分(愉悦)'],
  series: [0, 0, 0, 0, 0] // 初始各情绪计数为0
});
let analyse = ref("")

let myChart = null; // echarts实例

async function initHeatmap(AMap) {
  console.log('initHeatmap 调用');
  let data = await fetchHeatmapData();
  console.log('fetchHeatmapData 返回:', data);
  if (!Array.isArray(data)) {
    console.error('热力图数据格式错误:', data);
    return;
  }

  // 转换为数字类型
  data = data.map(item => ({
    lng: Number(item.lng),
    lat: Number(item.lat),
    count: Number(item.count)
  }));
  console.log('热力图数据:', data);
  heatmapInstance.value = new AMap.HeatMap(map, {
    radius: 25,
    opacity: [0, 0.8],
    gradient: {
      0.5: 'blue',
      0.65: 'rgb(117,211,248)',
      0.7: 'rgb(0, 255, 0)',
      0.9: '#ffea00',
      1.0: 'red'
    }
  });
  heatmapInstance.value.setDataSet({ data, max: 5 });
  heatmapInstance.value.hide(); // 默认隐藏
  console.log('heatmapInstance:', heatmapInstance.value);
}

const handleAnalyze = async () => {
  const result = await analyzeTotalMood(sentimentData.value);
  if (result.success) {
    analyse.value = result.data.analysis
    console.log('分析结果:', result.data.analysis);
  } else {
    console.error('分析失败:', result.message);
  }
};

// 添加初始化密度热力图的函数
async function initDensityHeatmap(AMap) {
  console.log('initDensityHeatmap 调用');
  
  // 初始化热力图实例，使用改进的配置
  heatmapInstance.value = new AMap.HeatMap(map, {
    radius: 30, // 增加半径以更好地显示密度
    opacity: [0, 0.8],
    gradient: {
      0.2: 'blue',      // 低密度/低情绪 - 蓝色
      0.4: 'cyan',      // 较低密度 - 青色
      0.5: 'green',     // 中等密度/中性情绪 - 绿色
      0.7: 'yellow',    // 较高密度 - 黄色
      0.9: 'orange',    // 高密度 - 橙色
      1.0: 'red'        // 极高密度/高情绪 - 红色
    }
  });
  
  // 从rcdStore获取数据并更新热力图
  await updateDensityHeatmap();
  
  heatmapInstance.value.hide(); // 默认隐藏
  console.log('densityHeatmapInstance:', heatmapInstance.value);
}

// 添加更新密度热力图数据的函数
async function updateDensityHeatmap() {
  if (!heatmapInstance.value) {
    console.warn('热力图实例未初始化');
    return;
  }
  
  try {
    // 获取所有记录
    await rcdStore.getRcd();
    const allRecords = rcdStore.allRcd;
    console.log('从rcdStore获取到的所有记录:', allRecords);
    
    if (!Array.isArray(allRecords) || allRecords.length === 0) {
      console.log('没有找到记录数据');
      return;
    }
    
    // 过滤出有位置信息的记录
    const locationData = allRecords.filter(record => 
      record.longitude && record.latitude
    ).map(record => ({
      lng: Number(record.longitude),
      lat: Number(record.latitude),
      weight: 1, // 使用固定权重
      sentiment_score: record.sentiment_score || 3 // 默认中性情绪
    }));
    
    if (locationData.length === 0) {
      console.log('没有有效的位置数据');
      return;
    }
    
    console.log('处理后的位置数据:', locationData);
    
    // 计算位置密度和情绪得分
    const densityData = calculateLocationDensity(locationData);
    console.log('密度数据:', densityData);
    
    // 根据情绪得分调整热力图数据点
    const heatmapData = densityData.map(item => {
      // 计算综合得分：密度 * 情绪得分影响因子
      // 情绪得分越高，颜色越偏向红色；情绪得分越低，颜色越偏向蓝色
      const sentimentFactor = item.sentiment >= 3 ? 
        1 + (item.sentiment - 3) * 0.3 : // 积极情绪增强
        1 - (3 - item.sentiment) * 0.3; // 消极情绪减弱
      
      return {
        lng: item.lng,
        lat: item.lat,
        count: item.count * sentimentFactor
      };
    });
    
    // 更新热力图数据
    heatmapInstance.value.setDataSet({
      data: heatmapData,
      max: Math.max(...heatmapData.map(item => item.count))
    });
    
    console.log('密度热力图数据已更新');
    // 如果需要显示网格，更新网格显示
    if (showGrid && window.AMap) {
      await showGridWithColor(densityData);
    }

  } catch (error) {
    console.error('更新密度热力图数据失败:', error);
  }
}

// 添加计算位置密度的函数
function calculateLocationDensity(locationData) {
  const gridSize = 0.0005; // 网格大小，约50米
  const grid = new Map();
  
  // 将每个位置放入对应的网格中
  locationData.forEach(point => {
    const gridKey = `${Math.floor(point.lng / gridSize)},${Math.floor(point.lat / gridSize)}`;
    
    if (!grid.has(gridKey)) {
      grid.set(gridKey, {
        lng: point.lng,
        lat: point.lat,
        count: 0,
        totalWeight: 0,
        totalSentiment: 0 // 新增：总情绪得分
      });
    }
    
    const gridCell = grid.get(gridKey);
    gridCell.count += 1;
    gridCell.totalWeight += point.weight;
    gridCell.totalSentiment += point.sentiment_score || 1; // 累加情绪得分
    
    // 更新网格中心点
    gridCell.lng = (gridCell.lng * (gridCell.count - 1) + point.lng) / gridCell.count;
    gridCell.lat = (gridCell.lat * (gridCell.count - 1) + point.lat) / gridCell.count;
  });
  
  // 转换为热力图需要的格式，并考虑权重和情绪
  return Array.from(grid.values()).map(cell => ({
    lng: cell.lng,
    lat: cell.lat,
    count: cell.count * (cell.totalWeight / cell.count), // 加权密度
    sentiment: cell.totalSentiment / cell.count // 平均情绪得分
  }));
}

// 新增：显示带颜色的网格函数
function showGridWithColor(densityData) {
  const gridSize = 0.0005; // 网格大小，与calculateLocationDensity函数保持一致
  
  // 清除之前的网格
  clearGrid();
  
  // 计算所有网格的最大和最小情绪得分，用于颜色映射
  const sentiments = densityData.map(item => item.sentiment);
  const minSentiment = Math.min(...sentiments);
  const maxSentiment = Math.max(...sentiments);
  const sentimentRange = maxSentiment - minSentiment || 1; // 避免除零
  
  function getEmoji(score) {
  // 将小数分数转换为整数分数（1-5分）
  const integerScore = Math.round(score);
  
  switch (integerScore) {
    case 1:
      return '😢'; // 非常悲伤
    case 2:
      return '😔'; // 悲伤
    case 3:
      return '😐'; // 中性
    case 4:
      return '😊'; // 开心
    case 5:
      return '😄'; // 非常开心
    default:
      return '🤔'; // 默认表情
  }
}

  // 创建网格多边形
  densityData.forEach(gridCell => {
    // 根据情绪得分计算颜色
    // 将情绪得分映射到0-1范围
    const normalizedSentiment = (gridCell.sentiment - minSentiment) / sentimentRange;
    // 生成颜色：蓝色(低情绪)到红色(高情绪)
    const color = getColorFromSentiment(normalizedSentiment);
    
    // 计算网格的四个角坐标
    const lngBase = Math.floor(gridCell.lng / gridSize) * gridSize;
    const latBase = Math.floor(gridCell.lat / gridSize) * gridSize;
    
    const path = [
      [lngBase, latBase],
      [lngBase + gridSize, latBase],
      [lngBase + gridSize, latBase + gridSize],
      [lngBase, latBase + gridSize],
      [lngBase, latBase] // 闭合
    ];
    
    // 创建多边形
    const polygon = new window.AMap.Polygon({
      path: path,
      strokeColor: '#999', // 网格线颜色
      strokeWeight: 1,    // 网格线宽度
      strokeOpacity: 0.5, // 网格线透明度
      fillColor: color,   // 填充颜色
      fillOpacity: 0.6    // 填充透明度
    });
    
    // 添加到地图
    polygon.setMap(map);
    gridPolygons.value.push(polygon);
    
    // 添加鼠标悬停信息
    polygon.on('mouseover', () => {
      // 根据情绪值获取对应的表情
      const emoji = getEmoji(gridCell.sentiment);

      const infoWindow = new window.AMap.InfoWindow({
        content: `<div style="padding: 10px;">
          <div style="font-size: 32px; margin-bottom: 8px;">${emoji}</div>
          <div>密度: ${gridCell.count.toFixed(2)}</div>
          <div>情绪值: ${gridCell.sentiment.toFixed(2)}</div>
          <div>心情数量: ${gridCell.count.toFixed(0)}</div>
        </div>`,
        position: [(lngBase + lngBase + gridSize) / 2, (latBase + latBase + gridSize) / 2]
      });
      infoWindow.open(map);
    });
  });
  
  console.log('网格显示已更新，共显示', gridPolygons.value.length, '个网格');
}

// 新增：根据情绪得分获取颜色的函数
function getColorFromSentiment(normalizedSentiment) {
  // normalizedSentiment 范围是0-1
  // 根据用户提供的配色方案映射颜色
  const colorStops = [
    { stop: 0.0, color: '#4A90E2' }, // 权重最低：浅蓝色（密度低+心情差）
    { stop: 0.2, color: '#7B68EE' }, // 权重较低：靛蓝色
    { stop: 0.4, color: '#9370DB' }, // 权重中等： mediumpurple
    { stop: 0.6, color: '#DDA0DD' }, // 权重较高：浅紫色
    { stop: 0.8, color: '#FFB6C1' }, // 权重很高：浅粉色
    { stop: 1.0, color: '#FF69B4' }  // 权重最高：粉色
  ];

  // 找到归一化情绪值对应的颜色区间
  for (let i = 0; i < colorStops.length - 1; i++) {
    if (normalizedSentiment >= colorStops[i].stop && normalizedSentiment <= colorStops[i + 1].stop) {
      // 在两个色阶之间进行线性插值
      const t = (normalizedSentiment - colorStops[i].stop) / 
                (colorStops[i + 1].stop - colorStops[i].stop);
      return interpolateColor(colorStops[i].color, colorStops[i + 1].color, t);
    }
  }

  // 如果超出范围，返回最接近的颜色
  return normalizedSentiment <= 0 ? colorStops[0].color : colorStops[colorStops.length - 1].color;
}

// 辅助函数：在两个颜色之间进行线性插值
function interpolateColor(color1, color2, t) {
  // 从十六进制颜色解析RGB值
  const parseColor = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) return color1; // 如果解析失败，返回原始颜色

  // 计算插值后的RGB值
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);

  // 转回十六进制格式
  return `rgb(${r}, ${g}, ${b})`;
}

// 新增：清除网格的函数
function clearGrid() {
  // 移除所有网格多边形
  gridPolygons.value.forEach(polygon => {
    map && polygon.setMap(null);
  });
  gridPolygons.value = [];
}

// ========== 关键改动1：修改 toggleHeatmap，添加标记显示/隐藏控制 ==========
async function toggleHeatmap() {
  if (!heatmapInstance.value || typeof heatmapInstance.value.hide !== 'function') {
    console.warn('热力图尚未初始化或方法不存在');
    return;
  }
  
  // 循环切换模式：0 → 1 → 2 → 0
  heatmapMode.value = (heatmapMode.value + 1) % 3;
  
  if (heatmapMode.value === 0) {
    // 关闭热力图
    heatmapVisible.value = false;
    heatmapInstance.value.hide();
    showAllMarkers(); // 关闭热力图 → 显示所有标记
    clearGrid(); // 清除网格显示
    console.log('热力图关闭');
  }  else if (heatmapMode.value === 1) {
    // 显示热力图一(原有)
    await initHeatmap(window.AMap);
    heatmapInstance.value.show();
    heatmapVisible.value = true;
    hideAllMarkers(); 
    clearGrid(); // 清除网格显示
    console.log('显示热力图一(原有)');
  } else if (heatmapMode.value === 2) {
    // 显示热力图二(密度)
    heatmapInstance.value.hide();
    await initDensityHeatmap(window.AMap);
    heatmapInstance.value.show();
    heatmapVisible.value = true;
    hideAllMarkers(); 
    console.log('显示热力图二(密度)');
  }
}


// ========== 关键改动2：新增标记批量显示/隐藏函数 ==========
// 隐藏所有位置标记
function hideAllMarkers() {
  otherMarkers.forEach(marker => {
    if (map && marker && typeof marker.hide === 'function') {
      marker.hide(); // AMap.Marker 自带 hide 方法
    }
  });
}
// 显示所有位置标记
function showAllMarkers() {
  otherMarkers.forEach(marker => {
    if (map && marker && typeof marker.show === 'function') {
      marker.show(); // AMap.Marker 自带 show 方法
    }
  });
}

let userMarker = null;
let otherMarkers = [];
let fetchTimer = null;

const getEmoji = (score) => {
  switch (score) {
    case 1:
      return '😢'; // 非常悲伤
    case 2:
      return '😔'; // 悲伤
    case 3:
      return '😐'; // 中性
    case 4:
      return '😊'; // 开心
    case 5:
      return '😄'; // 非常开心
    default:
      return '🤔'; // 默认表情
  }
};

// 上传自己位置
function uploadLocation(lng, lat, user_id) {
  fetch('/api/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, lng, lat })
  });
}

function calculateSentimentData(locations) {
  // 初始化计数数组（索引0对应1分，索引1对应2分...）
  const countArr = [0, 0, 0, 0, 0];
  locations.forEach(loc => {
    // 确保情绪分数在1-5范围内
    const score = Math.min(Math.max(Number(loc.sentiment_score), 1), 5);
    // 转换为数组索引（1分→0，2分→1...）
    const index = score - 1;
    countArr[index] += 1;
  });
  sentimentData.value.series = countArr;
  // 更新图表数据
  updateChart();
}

// ========== 关键改动3：修改 fetchAllLocations，新增热力图状态判断 ==========
// 获取所有用户位置并渲染到地图
function fetchAllLocations(myUserId) {
  fetch('/api/location')
    .then(res => res.json())
    .then(locations => {
      console.log('获取到的位置数据:', locations);

      // 新增：更新情绪数据
      calculateSentimentData(locations);

      // 清除之前的所有标记
      otherMarkers.forEach(m => map && map.remove(m));
      otherMarkers = [];

      // 为每个心情创建标记
      locations.forEach(loc => {
        const isMe = loc.user_id == myUserId;
        console.log('当前用户ID:', myUserId, '记录用户ID:', loc.user_id, 'isMe:', isMe);
        const marker = new window.AMap.Marker({
          position: [parseFloat(loc.lng), parseFloat(loc.lat)],
          title: loc.content,
          icon: isMe
            ? 'assets/mark_r.png'
            : 'assets/mark_b.png',
          opacity: 0.7
        });

        // 双击显示心情内容和评价
        marker.on('dblclick', () => {
          // 定义1-5分对应的颜色数组
          const colors = [
            '#4A90E2',  // 1分：浅蓝色（权重最低）
            '#7B68EE',  // 2分：靛蓝色
            '#DDA0DD',  // 3分：浅紫色
            '#FFB6C1',  // 4分：浅粉色
            '#FF69B4'   // 5分：深粉色（权重最高）
          ];

          // 获取当前分数对应的颜色索引（确保在1-5范围内）
          const score = Math.min(Math.max(loc.sentiment_score, 1), 5);
          const colorIndex = Math.floor(score) - 1;
          const baseColor = colors[colorIndex];

          // 根据基础颜色生成不同透明度的阴影
          const shadowColor = `${baseColor}33`; // 添加33的透明度值

          // 构建样式字符串
          const containerStyle = `
    background-color: ${baseColor}15;
    border-radius: 12px;
    padding: 15px;
    box-shadow: 0 4px 12px ${shadowColor};
    border: 1px solid ${baseColor};
    transition: all 0.3s ease;
  `;
          const info = `
    <div style="${containerStyle}">
      <div style="color: #333; font-size: 14px; line-height: 1.5; margin-bottom: 8px;">${loc.content}</div>
      <div style="text-align: center; font-size: 20px; color: ${baseColor};">
        ${getEmoji(loc.sentiment_score)}
      </div>
      <div style="text-align: right; margin-top: 8px; font-size: 12px; color: ${baseColor}80;">
        情感指数: ${loc.sentiment_score}
      </div>
    </div>
  `;
          const infoWindow = new window.AMap.InfoWindow({
            content: info,
            offset: new window.AMap.Pixel(0, -30),
          });
          infoWindow.open(map, marker.getPosition());
        });
        map && map.add(marker);
        otherMarkers.push(marker);
      });

      // 新增：如果当前热力图是显示状态，新标记创建后直接隐藏
      if (heatmapVisible.value) {
        hideAllMarkers();
      }
    })
    .catch(error => {
      console.error('获取位置信息失败:', error);
    });
}

// 定时获取所有用户位置
function startFetchingLocations() {
  const user_id = sessionStorage.getItem('userId');

  // 等待地图完全初始化
  const checkMapReady = setInterval(() => {
    if (map) {
      clearInterval(checkMapReady);
      fetchAllLocations(user_id);
      // 每10秒获取一次
      fetchTimer = setInterval(() => {
        fetchAllLocations(user_id);

        // 如果当前是密度热力图模式，更新数据
        if (heatmapMode.value === 2) {
          (async () => {
            try {
              await updateDensityHeatmap();
            } catch (error) {
              console.error('定时更新密度热力图失败:', error);
            }
          })();
        }
      }, 10000);
    }
  }, 100);
}


function initChart() {
  nextTick(() => {
    // 获取图表DOM容器
    const chartDom = document.getElementById('sentiment-chart');
    if (!chartDom) return;
    handleAnalyze()
    // 初始化echarts实例
    myChart = echarts.init(chartDom);

    // 配置图表选项
    const option = {
      title: {
        text: '情绪指数分布统计',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: '{b}: {c} 条记录' // 鼠标悬浮显示格式
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: sentimentData.value.xAxis,
        axisLabel: {
          color: '#666',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: '#eee'
          }
        }
      },
      yAxis: {
        type: 'value',
        min: 0, // 纵轴最小值为0（避免负数）
        axisLabel: {
          color: '#666',
          fontSize: 12,
          formatter: '{value} 条' // 纵轴标签格式
        },
        axisLine: {
          lineStyle: {
            color: '#eee'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#f5f5f5'
          }
        }
      },
      series: [
        {
          name: '记录个数',
          type: 'bar',
          barWidth: '60%',
          data: sentimentData.value.series,
          // 为不同情绪指数设置渐变颜色
          itemStyle: {
            color: (params) => {
              const colorList = [
                ['#4A90E2', '#8EC5FC'], // 1分：蓝色渐变
                ['#7B68EE', '#B19CD9'], // 2分：靛蓝渐变
                ['#DDA0DD', '#E6C0E9'], // 3分：紫色渐变
                ['#FFB6C1', '#FFD1DC'], // 4分：粉色渐变
                ['#FF69B4', '#FF85A2']  // 5分：深粉渐变
              ];
              return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colorList[params.dataIndex][0] },
                { offset: 1, color: colorList[params.dataIndex][1] }
              ]);
            },
            borderRadius: [4, 4, 0, 0] // 柱状图顶部圆角
          }
        }
      ]
    };

    // 设置图表选项
    myChart.setOption(option);

    // 监听窗口大小变化，自动 resize 图表
    window.addEventListener('resize', () => {
      myChart && myChart.resize();
    });
  });
}

// 新增：更新图表数据
function updateChart() {
  if (!myChart) return;
  myChart.setOption({
    xAxis: {
      data: sentimentData.value.xAxis
    },
    series: [
      {
        data: sentimentData.value.series
      }
    ]
  });
}

// 新增：切换看板显示/隐藏
function toggleBoard() {
  boardVisible.value = !boardVisible.value;
  // 显示看板时初始化图表
  if (boardVisible.value) {
    initChart();
  } else {
    // 隐藏看板时销毁图表实例（避免内存泄漏）
    myChart && myChart.dispose();
    myChart = null;
  }
}

onMounted(() => {
  window._AMapSecurityConfig = {
    securityJsCode: "ebf56b1ca59032ded98d268acb41a70c",
  };
  AMapLoader.load({
    key: "4011cf2cb0d9f7678cf1955058781295",
    version: "2.0",
    plugins: ["AMap.Scale", "AMap.HeatMap"],
  })
    .then(async (AMap) => {
      map = new AMap.Map("container", {
        viewMode: "3D",
        zoom: 16.5,
        center: [120.3440, 30.3146],
      });
      await initHeatmap(AMap);
      startFetchingLocations();
    })
    .catch((e) => {
      console.log(e);
    });
});

onUnmounted(() => {
  map?.destroy();
  fetchTimer && clearInterval(fetchTimer); // 新增：清除定时器，避免内存泄漏
  clearGrid(); // 清除网格显示
});
</script>

<template>
  <div>
    <!-- 按钮在热力图实例初始化前禁用 -->
    <button @click="toggleHeatmap" class="heatmap-toggle-btn" :disabled="!heatmapInstance">
      {{ heatmapMode === 0 ? '显示情绪热力图' : heatmapMode === 1 ? '显示密度热力图' : '关闭热力图' }}
    </button>
    <button @click="toggleBoard" class="board-toggle-btn">
      显示数据看板
    </button>
    <!-- 数据看板弹窗 -->
    <div class="board-modal" v-if="boardVisible">
      <div class="board-content">
        <!-- 弹窗关闭按钮 -->
        <button @click="toggleBoard" class="board-close-btn">&times;</button>
        <!-- 图表容器 -->
        <div id="sentiment-chart" class="chart-container">
        </div>
      </div>
      <div class="analyse-text"><span>{{ analyse }}</span></div>
    </div>
    <div id="container"></div>
  </div>
</template>

<style scoped>
#container {
  width: 100%;
  height: 100vh;
}
.analyse-text {
  width: 800px;
  /* 字体保持圆润可爱 */
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #ff87b0;
  
  /* 细腻阴影增加立体感 */
  text-shadow: 0 1px 2px rgba(255, 135, 176, 0.15);
  
  padding: 8px 15px;
  margin: 12px 0;
  
  /* 纯白色背景 */
  background: #ffffff;
  border-radius: 22px;
  
  /* 淡粉色边框 */
  border: 4px solid rgba(255, 135, 176, 0.25);
  
  /* 轻微阴影增加层次感 */
  box-shadow: 0 2px 8px rgba(255, 135, 176, 0.08);
  
  transition: all 0.3s ease;
  display: inline-block;
}

.analyse-text:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 94, 148, 0.15);
  border-color: rgba(242, 72, 128, 0.35);
}

.analyse-text:empty {
  display: none;
}
.board-toggle-btn {
  position: absolute;
  top: 24px;
  right: 200px;
  z-index: 10;
  padding: 10px 24px;
  background: linear-gradient(90deg, #ff7e5f 0%, #feb47b 100%);
  color: #fff;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: bold;
  box-shadow: 0 2px 12px rgba(79, 140, 255, 0.15);
  cursor: pointer;
  transition: background 0.3s, box-shadow 0.3s;
}

.board-toggle-btn:hover {
  background: linear-gradient(90deg, #feb47b 0%, #ff7e5f 100%);
  box-shadow: 0 4px 24px rgba(254, 180, 123, 0.18);
}

.board-modal {
  position: fixed;
  top: 0;
  left: 150px;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.board-content {
  width: 80%;
  max-width: 800px;
  height: 60%;
  max-height: 500px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.board-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  transition: color 0.3s;
  z-index: 101;
}

.board-close-btn:hover {
  color: #ff4444;
}

.chart-container {
  width: 100%;
  height: 100%;
  padding: 40px 20px 20px;
  box-sizing: border-box;
}

.heatmap-toggle-btn {
  position: absolute;
  top: 24px;
  right: 32px;
  z-index: 10;
  padding: 10px 24px;
  background: linear-gradient(90deg, #4f8cff 0%, #38e4ae 100%);
  color: #fff;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: bold;
  box-shadow: 0 2px 12px rgba(79, 140, 255, 0.15);
  cursor: pointer;
  transition: background 0.3s, box-shadow 0.3s;
}

.heatmap-toggle-btn:hover {
  background: linear-gradient(90deg, #38e4ae 0%, #4f8cff 100%);
  box-shadow: 0 4px 24px rgba(56, 228, 174, 0.18);
}

.heatmap-toggle-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}
</style>