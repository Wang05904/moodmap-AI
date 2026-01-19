<script setup>
import InputBox from '@/components/InputBox.vue';
import MapContainer from '@/components/MapContainer.vue';
import SidePanel from '@/components/SidePanel.vue';
</script>

<template>
   <div class="home">
      <SidePanel />
      <InputBox />
      <MapContainer />
   </div>
</template>
<style scoped>
.home {
   position: relative;
   width: 100%;
   height: 100vh;
}
</style>