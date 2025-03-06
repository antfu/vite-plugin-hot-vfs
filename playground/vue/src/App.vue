
<script setup lang="ts">
import original from './App.vue?raw'
import { ref } from 'vue'
import { watchDebounced } from '@vueuse/core'

const text = ref(original)

watchDebounced(text, () => {
  import.meta.hot?.send(
    'hello', 
    text.value
  )
}, {
  debounce: 500,
  immediate: false,
})
</script>

<template>
  <div>22222</div>
  <textarea v-model="text" />
</template>
