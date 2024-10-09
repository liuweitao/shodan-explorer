<template>
  <div class="columns mt-4">
    <div class="column is-half">
      <div class="box">
        <h3 class="subtitle">Request</h3>
        <template v-if="request">
          <p><strong>URL:</strong> {{ request.url }}</p>
          <p><strong>Method:</strong> {{ request.method }}</p>
          <p><strong>Headers:</strong></p>
          <pre class="content-box">{{ JSON.stringify(request.headers, null, 2) }}</pre>
          <p v-if="request.queryParams"><strong>Query Parameters:</strong></p>
          <pre v-if="request.queryParams" class="content-box">{{ JSON.stringify(request.queryParams, null, 2) }}</pre>
          <p v-if="request.body"><strong>Body:</strong></p>
          <pre v-if="request.body" class="content-box">{{ request.body }}</pre>
        </template>
        <p v-else>No request data available</p>
      </div>
    </div>
    <div class="column is-half">
      <div class="box response-box">
        <h3 class="subtitle">Response</h3>
        <div v-if="isLoading" class="has-text-centered">
          <p>请求处理中，请稍候...</p>
          <progress class="progress is-small is-primary" max="100">15%</progress>
        </div>
        <div v-else-if="response" class="response-wrapper">
          <div class="tabs">
            <ul>
              <li :class="{ 'is-active': activeTab === 'json' }">
                <a @click="activeTab = 'json'">JSON (折叠)</a>
              </li>
              <li :class="{ 'is-active': activeTab === 'text' }">
                <a @click="activeTab = 'text'">Text</a>
              </li>
              <li :class="{ 'is-active': activeTab === 'raw' }">
                <a @click="activeTab = 'raw'">Raw JSON</a>
              </li>
            </ul>
          </div>
          <div class="response-content" ref="responseContent">
            <div v-if="activeTab === 'json'" class="output-content">
              <vue-json-pretty
                :data="response"
                :deep="1"
                :show-double-quotes="true"
                :show-length="true"
                @click="handleClick"
              ></vue-json-pretty>
            </div>
            <pre v-else-if="activeTab === 'text'" class="output-content content-box">{{ formattedTextResponse }}</pre>
            <pre v-else-if="activeTab === 'raw'" class="output-content content-box">{{ formattedRawResponse }}</pre>
          </div>
          <div class="buttons mt-3">
            <button @click="copyToClipboard" class="button is-primary is-small">
              复制到剪贴板
            </button>
            <button @click="saveToFile" class="button is-info is-small">
              保存到文件
            </button>
          </div>
        </div>
        <p v-else>No response data available</p>
      </div>
    </div>
  </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

export default {
  name: 'ApiOutput',
  components: {
    VueJsonPretty
  },
  props: ['request', 'response'],
  data() {
    return {
      isLoading: false,
      activeTab: 'json'
    }
  },
  computed: {
    formattedTextResponse() {
      if (typeof this.response === 'object') {
        return JSON.stringify(this.response, null, 2)
          .replace(/[{[]/g, '')
          .replace(/[}\]]/g, '')
          .replace(/,\n/g, '\n')
          .replace(/"/g, '')
          .replace(/^\s{2}/gm, '')
          .trim();
      }
      return this.response;
    },
    formattedRawResponse() {
      return JSON.stringify(this.response, null, 2);
    }
  },
  methods: {
    handleClick(path, data, expanded) {},
    copyToClipboard() {
      const textToCopy = JSON.stringify(this.response, null, 2);
      navigator.clipboard.writeText(textToCopy).then(() => {
        alert('Response copied to clipboard');
      }, (err) => {
        console.error('Could not copy text: ', err);
      });
    },
    saveToFile() {
      const textToSave = JSON.stringify(this.response, null, 2);
      const blob = new Blob([textToSave], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'api_response.txt';
      link.click();
      URL.revokeObjectURL(link.href);
    }
  },
  watch: {
    request() {
      this.isLoading = true;
    },
    response() {
      this.isLoading = false;
    }
  }
}
</script>

<style scoped>
.response-box {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.response-wrapper {
  position: relative;
  height: 100%;
}

.response-content {
  flex-grow: 1;
  overflow: hidden;
  max-height: 600px;
  overflow-y: auto;
}

.output-content {
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.content-box {
  max-width: 100%;
}

/deep/ .vjs-tree {
  max-width: 100%;
  overflow-x: auto;
}
</style>