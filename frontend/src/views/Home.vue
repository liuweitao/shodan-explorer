<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'

import ApiForm from '@/components/ApiForm.vue'
import ApiOutput from '@/components/ApiOutput.vue'
import { apiGroups } from '@/data/apiGroups'
import { runtimeConfigKey } from '@/runtime/config'
import {
  executeShodanRequest,
  prepareShodanRequest,
  ShodanRequestError
} from '@/services/shodanClient'
import type { ApiErrorPayload, FormData, RequestSnapshot } from '@/types/api'

const runtimeConfig = inject(runtimeConfigKey)
const selectedApiName = ref('')
const request = ref<RequestSnapshot | null>(null)
const response = ref<unknown>(null)
const hasResponse = ref(false)
const isLoading = ref(false)
let activeRequest: AbortController | null = null

const selectedApi = computed(() => {
  for (const group of apiGroups) {
    const api = group.apis.find((candidate) => candidate.name === selectedApiName.value)
    if (api) return api
  }
  return undefined
})

const configuredApiKey = computed(() => runtimeConfig?.shodanApiKey ?? '')

function resetResult() {
  activeRequest?.abort()
  activeRequest = null
  request.value = null
  response.value = null
  hasResponse.value = false
  isLoading.value = false
}

watch(selectedApiName, resetResult)
onBeforeUnmount(() => activeRequest?.abort())

async function handleSubmit(formData: FormData) {
  if (!selectedApi.value) return

  activeRequest?.abort()
  const controller = new AbortController()
  activeRequest = controller

  try {
    const prepared = prepareShodanRequest(selectedApi.value, formData, configuredApiKey.value)
    request.value = prepared.snapshot
    response.value = null
    hasResponse.value = false
    isLoading.value = true

    response.value = await executeShodanRequest(prepared, controller.signal)
    hasResponse.value = true
  } catch (error) {
    if (controller.signal.aborted && activeRequest !== controller) return

    const payload: ApiErrorPayload = {
      error: error instanceof Error ? error.message : 'An unexpected error occurred.'
    }
    if (error instanceof ShodanRequestError && error.status !== undefined) {
      payload.status = error.status
    }
    response.value = payload
    hasResponse.value = true
  } finally {
    if (activeRequest === controller) {
      activeRequest = null
      isLoading.value = false
    }
  }
}
</script>

<template>
  <section class="hero" aria-labelledby="page-title">
    <p class="eyebrow">Shodan API workbench</p>
    <h1 id="page-title">Explore the Shodan API with clarity.</h1>
    <p class="hero-copy">
      Choose an endpoint, provide its parameters, and inspect the exact request and response.
      Requests retain the standard Shodan <code>base_url + key</code> contract.
    </p>
  </section>

  <div v-if="!configuredApiKey" class="notice notice-error" role="alert">
    No API key is configured. Set <code>SHODAN_API_KEY</code> before sending requests.
  </div>

  <section class="card endpoint-picker" aria-labelledby="endpoint-heading">
    <div class="section-heading">
      <div>
        <p class="step-label">Step 1</p>
        <h2 id="endpoint-heading">Select an endpoint</h2>
      </div>
      <span class="endpoint-count">
        {{ apiGroups.reduce((total, group) => total + group.apis.length, 0) }} endpoints
      </span>
    </div>

    <label class="field-label" for="api-select">API endpoint</label>
    <div class="select-wrap">
      <select id="api-select" v-model="selectedApiName">
        <option value="">Choose an API…</option>
        <optgroup
          v-for="group in apiGroups"
          :key="group.name"
          :label="`${group.chineseName} · ${group.name}`"
        >
          <option v-for="api in group.apis" :key="api.name" :value="api.name">
            {{ api.chineseName }} · {{ api.name }} · [{{ api.method ?? 'GET' }}]
            {{ api.endpoint }}
          </option>
        </optgroup>
      </select>
      <span aria-hidden="true">⌄</span>
    </div>
  </section>

  <template v-if="selectedApi">
    <ApiForm :key="selectedApi.name" :api="selectedApi" @submit="handleSubmit" />
    <ApiOutput
      :request="request"
      :response="response"
      :has-response="hasResponse"
      :is-loading="isLoading"
    />
  </template>
</template>
