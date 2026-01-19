<template>
  <div class="side-panel" :class="{ 'collapsed': !isExpanded }">
    <div class="panel-content" v-if="isExpanded">
      <!-- 收缩按钮 -->
      <button class="collapse-btn" @click="togglePanel">
        ⬅️
      </button>
      <button class="logout-btn" @click="handleLogout">登出</button>
      <!-- 用户信息区域 -->
      <div class="user-info">
        <div class="avatar">
          <img src="@/assets/label1.jpg" alt="用户头像">
        </div>
        <div class="nickname">{{ username }}</div>
      </div>
      
      <!-- 心情记录列表 -->
      <div class="mood-list">
        <div class="mood-item" v-for="item in rcdStore.myRcd" :key="item.mood_id">
          <div class="mood-emoji" :class="getEmojiClass(item.sentiment_score)">{{ getEmoji(item.sentiment_score) }}</div>
          <div class="mood-text">{{ item.content }}</div>
          <div class="mood-delete" @click="() => rcdStore.removeRcdItem(item.mood_id)">🗑️</div>
        </div>
      </div>
    </div>
    
    <!-- 展开按钮 ◀️▶️-->
    <button v-if="!isExpanded" class="expand-btn" @click="togglePanel">
     ➡️
    </button>
  </div>
</template>

<style scoped>
.side-panel {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  background-color: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  transition: width 0.3s;
  width: 300px;
  z-index: 1000;
}

.side-panel.collapsed {
  width: 40px;
}

.panel-content {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.collapse-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
}

.expand-btn {
  width: 100%;
  height: 40px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 60px;
  margin-bottom: 30px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 10px;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nickname {
  font-size: 16px;
  font-weight: bold;
}

.mood-list {
  flex: 1;
  overflow-y: auto;
}

.mood-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.mood-emoji {
  margin-right: 10px;
  font-size: 24px;
}

.mood-emoji.sad {
  color: #ff4d4d; /* 红色 */
}

.mood-emoji.ok {
  color: #f9c23c; /* 黄色 */
}

.mood-emoji.happy {
  color: #8bc34a; /* 绿色 */
}

.mood-emoji.very-happy {
  color: #5cb85c; /* 较亮绿色 */
}

.mood-emoji.extremely-happy {
  color: #4caf50; /* 最亮绿色 */
}

.mood-text {
  flex: 1;
}

.mood-delete {
  cursor: pointer;
  opacity: 0.5;
}

.mood-delete:hover {
  opacity: 1;
}

.logout-btn {
  margin: 20px;
  position: fixed;
  top: 0;
  left: 180px;
  background: red;
  color: white;
  border-radius: 10px;
  width: 80px;
  height: 30px;
  border: none;
}

/* 添加字体图标库 */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');

/* 添加一些基本的间距和布局 */
.side-panel.collapsed .collapse-btn {
  transform: rotate(180deg);
  padding: 10px;
}

.panel-content .logout-btn {
  top: 10px;
  right: 10px;
  background: red;
  color: white;
  border-radius: 10px;
  width: 80px;
  height: 30px;
  border: none;
}

.user-info .avatar img {
  border-radius: 50%;
}

.user-info .nickname {
  margin-top: 10px;
}
</style>

<script setup>
import { onMounted, ref } from 'vue';
import { logout } from '@/api/login';
import { useRcdStore } from '@/stores/rcdStore';

const rcdStore = useRcdStore();
const username = sessionStorage.getItem('username') || '用户昵称';

// 组件挂载时初始化数据
onMounted(() => {
  rcdStore.initRcdList();
  console.log('rcdStore:', rcdStore.myRcd);
});

const isExpanded = ref(true);

const togglePanel = () => {
  isExpanded.value = !isExpanded.value;
};

const handleLogout = () => {
  logout().then(() => {
    sessionStorage.removeItem('isLogin');
    sessionStorage.removeItem('userId');
    window.location.reload();
  });
};

// 根据 sentiment_score 获取对应的 emoji
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

// 根据 sentiment_score 获取对应的 emoji 类
const getEmojiClass = (score) => {
  switch (score) {
    case 1:
      return 'sad';
    case 2:
      return 'ok';
    case 3:
      return 'happy';
    case 4:
      return 'very-happy';
    case 5:
      return 'extremely-happy';
    default:
      return '';
  }
};
</script>
