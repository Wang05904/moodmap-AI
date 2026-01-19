<template>
  <div class="input-container">
    <!-- 右侧 icon，点击显示输入框 -->
    <div
      class="icon"
      @click="toggleInput"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
        <circle cx="9" cy="10" r="1" fill="currentColor" />
        <circle cx="15" cy="10" r="1" fill="currentColor" />
        <circle cx="9" cy="14" r="1" fill="currentColor" />
        <circle cx="15" cy="14" r="1" fill="currentColor" />
        <path
          d="M10 16H14"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </div>

    <!-- 输入框，根据 isInputVisible 控制显示隐藏 -->
    <div
      v-show="isInputVisible"
      class="input-box"
    >
      <div class="input-wrapper">
        <textarea
          v-model="moodData.content"
          placeholder="请输入内容"
          class="input-textarea"
        ></textarea>
        <button
          @click="sendContent"
          class="send-btn"
          :disabled="isloading"
        >
          {{ isloading ? '发送中...' : '发送' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {sendRcd} from '@/api/record'; 
import { useRcdStore } from '@/stores/rcdStore'
const rcdStore = useRcdStore()
const isloading = ref(false);
const myRcd = ref([]);
// 控制输入框显示隐藏
const isInputVisible = ref(false);
//情绪信息
const moodData = ref({
  userId: sessionStorage.getItem('userId'),
  content: '',
  latitude: 1,
  longitude: 2
});

// 点击图标切换输入框显示状态
const toggleInput = () => {
  isInputVisible.value = !isInputVisible.value;
};

// 隐藏输入框
const hideInput = () => {
  isInputVisible.value = false;
};

//获取自己的记录
onMounted(() => {
  rcdStore.initRcdList()
})

// 发送内容到后端
const sendContent = async () => {
    console.log(moodData.value);
    isloading.value = true;
    try{
      const result = await sendRcd(moodData.value)
    rcdStore.initRcdList()
  }catch(error){
    ElMessage.error('发送失败');
  }
  moodData.value.content = '';
  isloading.value = false;
  // 发送成功后隐藏输入框
  // hideInput();
};

</script>

<style scoped>
.input-container {
  position: fixed;
  right: 20px;
  bottom: 50px;
  display: flex;
  align-items: center;
  z-index: 1000;
}

.icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: linear-gradient(135deg, #ff99cc 0%, #ff66b3 100%);
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(255, 153, 204, 0.3);
  transition: all 0.3s ease;
  color: white;
}

.icon:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(255, 102, 179, 0.4);
}

.input-box {
  position: absolute;
  right: 0;
  bottom: 60px;
  background-color: #fff;
  border-radius: 20px;
  padding: 15px;
  box-shadow: 0 10px 30px rgba(255, 153, 204, 0.2);
  border: 2px solid #ffcce5;
  min-width: 250px;
  animation: fadeInUp 0.3s ease;
}

.input-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
}

.input-textarea {
  width: 100%;
  height: 100px;
  resize: none;
  border: 2px solid #ffcce5;
  border-radius: 15px;
  padding: 12px 15px;
  font-family: inherit;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;
  margin-bottom: 0;
}

.input-textarea:focus {
  outline: none;
  border-color: #ff66b3;
  box-shadow: 0 0 0 3px rgba(255, 102, 179, 0.1);
}

.send-btn {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 6px 15px;
  background: linear-gradient(135deg, #ff99cc 0%, #ff66b3 100%);
  color: #fff;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(255, 153, 204, 0.3);
  z-index: 1;
}

.send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff80b3 0%, #ff4d99 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 102, 179, 0.4);
}

.send-btn:disabled {
  background: #ffcce5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 添加动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 装饰元素 */
.input-box::before {
  content: '';
  position: absolute;
  top: -15px;
  right: -15px;
  width: 60px;
  height: 60px;
  background-color: rgba(255, 183, 207, 0.3);
  border-radius: 50%;
  z-index: -1;
}

.input-box::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: -10px;
  width: 40px;
  height: 40px;
  background-color: rgba(204, 229, 255, 0.4);
  border-radius: 50%;
  z-index: -1;
}
</style>