
<script setup lang="ts">
import code1 from './App.vue?raw'
import code2 from './random.ts?raw'
import { ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { getRandom } from './random'

const text1 = ref(code1)
const text2 = ref(code2)

watchDebounced(text1, () => {
  import.meta.hot?.send(
    'code1', 
    text1.value
  )
}, {
  debounce: 200,
  immediate: false,
})

watchDebounced(text2, () => {
  import.meta.hot?.send(
    'code2', 
    text2.value
  )
}, {
  debounce: 200,
  immediate: false,
})
</script>

<template>
  <div>22222</div>
  <div>{{ getRandom() }}</div>
  <textarea v-model="text1" />
  <textarea v-model="text2" />
</template>
