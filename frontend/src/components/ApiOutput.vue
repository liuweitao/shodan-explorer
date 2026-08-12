<script setup lang="ts">
import { computed, ref } from 'vue'

import JsonTree from '@/components/JsonTree.vue'
import type { RequestSnapshot } from '@/types/api'

type OutputTab = 'tree' | 'formatted' | 'raw'

const props = defineProps<{
  request: RequestSnapshot | null
  response: unknown
  hasResponse: boolean
  isLoading: boolean
}>()

const activeTab = ref<OutputTab>('tree')
const copyStatus = ref('')

const formattedResponse = computed(() => {
  if (typeof props.response === 'string') return props.response
  return JSON.stringify(props.response, null, 2)
})

const rawResponse = computed(() => {
  if (typeof props.response === 'string') return props.response
  return JSON.stringify(props.response)
})

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(formattedResponse.value ?? '')
    copyStatus.value = 'Copied.'
  } catch {
    copyStatus.value = 'Copy failed. Select the response text manually.'
  }
}

function saveToFile() {
  const blob = new Blob([formattedResponse.value ?? ''], {
    type: 'application/json;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'shodan-response.json'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
</script>

<template>
  <section class="results-section" aria-labelledby="results-heading">
    <div class="section-heading results-heading">
      <div>
        <p class="step-label">Step 3</p>
        <h2 id="results-heading">Inspect the exchange</h2>
      </div>
      <span v-if="isLoading" class="loading-label" role="status">Request in progress…</span>
    </div>

    <div class="result-grid">
      <article class="card result-card">
        <h3>Request</h3>
        <dl v-if="request" class="request-details">
          <div>
            <dt>URL</dt>
            <dd>
              <code>{{ request.url }}</code>
            </dd>
          </div>
          <div>
            <dt>Method</dt>
            <dd>
              <span class="method-badge">{{ request.method }}</span>
            </dd>
          </div>
          <div>
            <dt>Headers</dt>
            <dd>
              <pre>{{ JSON.stringify(request.headers, null, 2) }}</pre>
            </dd>
          </div>
          <div v-if="request.body">
            <dt>Body</dt>
            <dd>
              <pre>{{ request.body }}</pre>
            </dd>
          </div>
        </dl>
        <p v-else class="empty-state">Submit the form to see the redacted request.</p>
      </article>

      <article class="card result-card response-card" aria-live="polite">
        <div class="response-title">
          <h3>Response</h3>
          <div v-if="hasResponse" class="response-actions">
            <button class="button button-quiet" type="button" @click="copyToClipboard">Copy</button>
            <button class="button button-quiet" type="button" @click="saveToFile">Save</button>
          </div>
        </div>

        <div v-if="isLoading" class="loading-state">
          <span class="spinner" aria-hidden="true" />
          <p>Waiting for Shodan…</p>
        </div>

        <template v-else-if="hasResponse">
          <div class="tabs" role="tablist" aria-label="Response format">
            <button
              v-for="tab in ['tree', 'formatted', 'raw'] as OutputTab[]"
              :key="tab"
              class="tab-button"
              :class="{ active: activeTab === tab }"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab"
              @click="activeTab = tab"
            >
              {{ tab }}
            </button>
          </div>
          <div class="response-output" role="tabpanel">
            <JsonTree v-if="activeTab === 'tree'" :data="response" />
            <pre v-else-if="activeTab === 'formatted'">{{ formattedResponse }}</pre>
            <pre v-else>{{ rawResponse }}</pre>
          </div>
          <p class="copy-status" role="status">{{ copyStatus }}</p>
        </template>

        <p v-else class="empty-state">The response will appear here.</p>
      </article>
    </div>
  </section>
</template>
