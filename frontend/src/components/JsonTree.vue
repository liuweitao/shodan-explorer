<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'JsonTree' })

const props = withDefaults(
  defineProps<{
    data: unknown
    depth?: number
  }>(),
  { depth: 0 }
)

const isContainer = computed(() => props.data !== null && typeof props.data === 'object')
const entries = computed<[string, unknown][]>(() => {
  if (!isContainer.value) return []
  return Object.entries(props.data as Record<string, unknown>)
})
const containerLabel = computed(() => {
  const count = entries.value.length
  const noun = Array.isArray(props.data) ? 'items' : 'properties'
  return `${Array.isArray(props.data) ? 'Array' : 'Object'} · ${count} ${noun}`
})
const primitiveValue = computed(() => {
  if (typeof props.data === 'string') return JSON.stringify(props.data)
  if (props.data === null) return 'null'
  return String(props.data)
})
const primitiveType = computed(() => (props.data === null ? 'null' : typeof props.data))
</script>

<template>
  <details v-if="isContainer" class="json-node" :open="depth < 1">
    <summary>{{ containerLabel }}</summary>
    <ul>
      <li v-for="([key, value], index) in entries" :key="key">
        <span class="json-key">{{ Array.isArray(data) ? `[${key}]` : key }}</span>
        <span aria-hidden="true">: </span>
        <JsonTree :data="value" :depth="depth + 1" />
        <span v-if="index < entries.length - 1" aria-hidden="true">,</span>
      </li>
    </ul>
  </details>
  <span v-else class="json-primitive" :data-type="primitiveType">{{ primitiveValue }}</span>
</template>
