
<script setup lang="ts">
import original from './App.vue?raw'
import { ref } from 'vue'

const text = ref(original)
</script>

<template>
  <div>22222</div>
  <textarea v-model="text" />
</template>
