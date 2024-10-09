<template>
  <div class="container">
    <h1 class="title">Shodan Explorer</h1>
    <div class="select is-fullwidth">
      <select v-model="selectedApi" @change="resetForm">
        <option value="">Select an API</option>
        <optgroup v-for="(group, index) in apiGroups" :key="index" :label="`${group.chineseName} - ${group.name}`">
          <option v-for="api in group.apis" :key="api.name" :value="api.name">
            {{ api.chineseName }} - {{ api.name }} - [{{ api.method || 'GET' }}] {{ api.endpoint }}
          </option>
        </optgroup>
      </select>
    </div>
    <div v-if="selectedApi" class="mt-4">
      <api-form :api="getSelectedApi" @submit="handleSubmit"></api-form>
      <api-output :request="getSelectedApi.request" :response="getSelectedApi.response"></api-output>
    </div>
  </div>
</template>

<script>
import ApiForm from '@/components/ApiForm.vue'
import ApiOutput from '@/components/ApiOutput.vue'
import { apiGroups } from '@/data/apiGroups'

export default {
  name: 'Home',
  components: {
    ApiForm,
    ApiOutput
  },
  data() {
    return {
      selectedApi: '',
      apiGroups: apiGroups,
      apiKey: window.ENV.SHODAN_API_KEY || '',
    }
  },
  computed: {
    getSelectedApi() {
      for (const group of this.apiGroups) {
        const api = group.apis.find(api => api.name === this.selectedApi)
        if (api) return api
      }
      return null
    }
  },
  methods: {
    resetForm() {
      if (this.getSelectedApi) {
        this.getSelectedApi.request = null
        this.getSelectedApi.response = null
      }
    },
    async handleSubmit(apiName, formData) {
      const api = this.getSelectedApi
      if (!api) {
        return
      }

      let url = api.endpoint
      let body = null
      const headers = {}

      const queryParams = new URLSearchParams()
      queryParams.append('key', this.apiKey)  // 添加 API 密钥作为查询参数

      for (const [key, value] of Object.entries(formData)) {
        if (value === null || value === undefined || value === '') {
          continue;
        }
        
        if (api.endpoint.includes(`{${key}}`)) {
          url = url.replace(`{${key}}`, encodeURIComponent(value))
        } else if (api.method === 'GET' || !api.method) {
          queryParams.append(key, typeof value === 'object' ? JSON.stringify(value) : value)
        } else {
          if (!body) body = new URLSearchParams()
          body.append(key, typeof value === 'object' ? JSON.stringify(value) : value)
        }
      }

      // 对所有请求都添加 API 密钥作为查询参数
      url += (url.includes('?') ? '&' : '?') + queryParams.toString()

      if (api.method !== 'GET' && api.method) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        
        if (api.jsonBody) {
          headers['Content-Type'] = 'application/json'
          const jsonBody = {}
          for (const key of api.jsonBody) {
            if (formData[key] !== undefined) {
              jsonBody[key] = formData[key]
            }
          }
          body = JSON.stringify(jsonBody)
        }
      }

      api.request = {
        url: url,
        method: api.method || 'GET',
        headers: headers,
        body: body ? body.toString() : null,
        queryParams: Object.fromEntries(queryParams)
      }

      try {
        const response = await fetch(url, {
          method: api.method || 'GET',
          headers: headers,
          body: body,
        })

        const data = await response.json()

        if (!response.ok) {
          let errorMessage = data.error || 'Unknown error occurred'
          api.response = { error: errorMessage }
        } else {
          api.response = data
        }
      } catch (error) {
        api.response = { error: '请求失败，请检查网络连接或稍后重试。' }
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20px;
}
</style>