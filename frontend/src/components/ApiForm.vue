<template>
  <div class="box">
    <h2 class="subtitle">{{ api.name }}</h2>
    <form @submit.prevent="onSubmit">
      <div v-for="param in api.params" :key="param" class="field">
        <label class="label">{{ param }} (Required)</label>
        <div class="control">
          <select v-if="api.selectOptions && api.selectOptions[param]" 
                  v-model="formData[param]" 
                  class="select is-fullwidth" 
                  required>
            <option v-for="option in api.selectOptions[param]" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
          <textarea v-else-if="isJsonParam(param)" 
                    class="textarea" 
                    v-model="formData[param]" 
                    :placeholder="'Enter JSON for ' + param"
                    required></textarea>
          <div v-else-if="param.startsWith('**')" class="dynamic-params">
            <div v-for="(value, key) in dynamicParams" :key="key" class="field has-addons">
              <div class="control">
                <input class="input" type="text" v-model="dynamicParams[key].name" placeholder="Parameter name">
              </div>
              <div class="control">
                <input class="input" type="text" v-model="dynamicParams[key].value" placeholder="Value">
              </div>
              <div class="control">
                <button type="button" class="button is-danger" @click="removeDynamicParam(key)">Remove</button>
              </div>
            </div>
            <button type="button" class="button is-primary" @click="addDynamicParam">Add Parameter</button>
          </div>
          <input v-else class="input" type="text" v-model="formData[param]" required>
        </div>
      </div>
      <div v-for="param in api.optionalParams" :key="param" class="field">
        <label class="label">{{ param }} (Optional)</label>
        <div class="control">
          <select v-if="api.selectOptions && api.selectOptions[param]" 
                  v-model="formData[param]" 
                  class="select is-fullwidth">
            <option value="">Select an option</option>
            <option v-for="option in api.selectOptions[param]" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
          <textarea v-else-if="isJsonParam(param)" 
                    class="textarea" 
                    v-model="formData[param]" 
                    :placeholder="'Enter JSON for ' + param"></textarea>
          <input v-else class="input" type="text" v-model="formData[param]">
        </div>
      </div>
      <div class="field">
        <div class="control">
          <button class="button is-primary" type="submit">Submit</button>
        </div>
      </div>
    </form>
  </div>
</template>

<script>
export default {
  name: 'ApiForm',
  props: ['api'],
  data() {
    return {
      formData: {},
      dynamicParams: {}
    }
  },
  methods: {
    onSubmit() {
      let processedFormData = {};
      
      for (const [key, value] of Object.entries(this.formData)) {
        if (value !== null && value !== undefined && value !== '') {
          if (this.isJsonParam(key)) {
            try {
              processedFormData[key] = JSON.parse(value);
            } catch (error) {
              processedFormData[key] = value;
            }
          } else {
            processedFormData[key] = value;
          }
        }
      }
      
      for (const param of this.api.params) {
        if (param.startsWith('**')) {
          for (const [key, value] of Object.entries(this.dynamicParams)) {
            if (value.name && value.value) {
              processedFormData[value.name] = value.value;
            }
          }
          delete processedFormData[param];
        }
      }

      if ((this.api.endpoint === '/shodan/alert' || this.api.endpoint === '/shodan/alert/{id}') && this.api.method === 'POST') {
        const specialProcessedData = {
          name: processedFormData.name,
          filters: processedFormData.filters,
        };
        if (processedFormData.expires) {
          specialProcessedData.expires = processedFormData.expires;
        }
        if (this.api.endpoint === '/shodan/alert/{id}') {
          specialProcessedData.id = processedFormData.id;
        }
        processedFormData = specialProcessedData;
      }

      this.$emit('submit', this.api.name, processedFormData, this.api.method);
    },
    addDynamicParam() {
      const newKey = Date.now();
      this.$set(this.dynamicParams, newKey, { name: '', value: '' });
    },
    removeDynamicParam(key) {
      this.$delete(this.dynamicParams, key);
    },
    isJsonParam(param) {
      return this.api.jsonParams && this.api.jsonParams.includes(param);
    },
  },
  watch: {
    api: {
      immediate: true,
      handler(newApi) {
        this.formData = {};
        this.dynamicParams = {};
        if (newApi) {
          newApi.params.forEach(param => {
            if (param.startsWith('**')) {
              this.addDynamicParam();
            } else if (newApi.selectOptions && newApi.selectOptions[param]) {
              this.formData[param] = newApi.selectOptions[param][0];
            } else {
              this.formData[param] = '';
            }
          });
          if (newApi.optionalParams) {
            newApi.optionalParams.forEach(param => {
              this.formData[param] = '';
            });
          }
        }
      }
    },
    formData: {
      deep: true,
      handler() {
        const processedFormData = {};
        for (const [key, value] of Object.entries(this.formData)) {
          if (value !== null && value !== undefined && value !== '') {
            processedFormData[key] = value;
          }
        }
        this.$emit('formDataChange', processedFormData, this.api.method);
      }
    }
  }
}
</script>

<style scoped>
pre {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.dynamic-params {
  margin-bottom: 1rem;
}
.dynamic-params .field {
  margin-bottom: 0.5rem;
}
</style>