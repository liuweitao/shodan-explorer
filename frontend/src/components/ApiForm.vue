<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import type { ApiDefinition, FormData } from '@/types/api'

interface DynamicParameter {
  id: number
  name: string
  value: string
}

const props = defineProps<{
  api: ApiDefinition
}>()

const emit = defineEmits<{
  submit: [formData: FormData]
}>()

const formData = reactive<Record<string, string>>({})
const dynamicParameters = ref<DynamicParameter[]>([])
const validationError = ref('')
let nextDynamicId = 0

function hasSelectOptions(parameter: string) {
  return Boolean(props.api.selectOptions?.[parameter]?.length)
}

function isJsonParameter(parameter: string) {
  return props.api.jsonParams?.includes(parameter) ?? false
}

function addDynamicParameter() {
  dynamicParameters.value.push({ id: nextDynamicId++, name: '', value: '' })
}

function removeDynamicParameter(id: number) {
  dynamicParameters.value = dynamicParameters.value.filter((parameter) => parameter.id !== id)
}

function resetForm() {
  for (const key of Object.keys(formData)) delete formData[key]
  dynamicParameters.value = []
  validationError.value = ''

  for (const parameter of props.api.params) {
    if (parameter.startsWith('**')) {
      addDynamicParameter()
    } else {
      formData[parameter] = props.api.selectOptions?.[parameter]?.[0] ?? ''
    }
  }

  for (const parameter of props.api.optionalParams ?? []) {
    formData[parameter] = ''
  }
}

function processParameter(output: FormData, parameter: string, value: string): boolean {
  if (!value) return true

  if (isJsonParameter(parameter)) {
    try {
      output[parameter] = JSON.parse(value) as FormData[string]
      return true
    } catch {
      validationError.value = `${parameter} must contain valid JSON.`
      return false
    }
  }

  output[parameter] = value
  return true
}

function onSubmit() {
  validationError.value = ''
  const output: FormData = {}

  for (const [parameter, value] of Object.entries(formData)) {
    if (!processParameter(output, parameter, value)) return
  }

  for (const parameter of props.api.params) {
    if (!parameter.startsWith('**')) continue

    const completed = dynamicParameters.value.filter((item) => item.name && item.value)
    if (completed.length === 0) {
      validationError.value = 'Add at least one named parameter.'
      return
    }
    for (const item of completed) output[item.name] = item.value
  }

  emit('submit', output)
}

watch(() => props.api, resetForm, { immediate: true })
</script>

<template>
  <section class="card form-card" aria-labelledby="parameters-heading">
    <div class="section-heading">
      <div>
        <p class="step-label">Step 2</p>
        <h2 id="parameters-heading">Configure {{ api.name }}</h2>
      </div>
      <span class="method-badge" :data-method="api.method ?? 'GET'">
        {{ api.method ?? 'GET' }}
      </span>
    </div>

    <code class="endpoint-path">{{ api.endpoint }}</code>

    <form @submit.prevent="onSubmit">
      <div class="form-grid">
        <div v-for="parameter in api.params" :key="parameter" class="form-field">
          <template v-if="parameter.startsWith('**')">
            <div class="field-heading">
              <span class="field-label">Additional parameters</span>
              <span class="requirement">Required</span>
            </div>
            <div class="dynamic-list">
              <div v-for="item in dynamicParameters" :key="item.id" class="dynamic-parameter">
                <label class="sr-only" :for="`dynamic-name-${item.id}`">Parameter name</label>
                <input
                  :id="`dynamic-name-${item.id}`"
                  v-model.trim="item.name"
                  type="text"
                  placeholder="Parameter name"
                />
                <label class="sr-only" :for="`dynamic-value-${item.id}`">Value</label>
                <input
                  :id="`dynamic-value-${item.id}`"
                  v-model="item.value"
                  type="text"
                  placeholder="Value"
                />
                <button
                  class="button button-quiet"
                  type="button"
                  aria-label="Remove parameter"
                  @click="removeDynamicParameter(item.id)"
                >
                  Remove
                </button>
              </div>
              <button class="button button-secondary" type="button" @click="addDynamicParameter">
                Add parameter
              </button>
            </div>
          </template>

          <template v-else>
            <div class="field-heading">
              <label class="field-label" :for="`parameter-${parameter}`">{{ parameter }}</label>
              <span class="requirement">Required</span>
            </div>
            <select
              v-if="hasSelectOptions(parameter)"
              :id="`parameter-${parameter}`"
              v-model="formData[parameter]"
              required
            >
              <option
                v-for="option in api.selectOptions?.[parameter]"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <textarea
              v-else-if="isJsonParameter(parameter)"
              :id="`parameter-${parameter}`"
              v-model="formData[parameter]"
              rows="5"
              :placeholder="`Enter valid JSON for ${parameter}`"
              required
              spellcheck="false"
            />
            <input
              v-else
              :id="`parameter-${parameter}`"
              v-model.trim="formData[parameter]"
              type="text"
              required
              autocomplete="off"
            />
          </template>
        </div>

        <div v-for="parameter in api.optionalParams ?? []" :key="parameter" class="form-field">
          <div class="field-heading">
            <label class="field-label" :for="`parameter-${parameter}`">{{ parameter }}</label>
            <span class="requirement optional">Optional</span>
          </div>
          <select
            v-if="hasSelectOptions(parameter)"
            :id="`parameter-${parameter}`"
            v-model="formData[parameter]"
          >
            <option value="">Not set</option>
            <option v-for="option in api.selectOptions?.[parameter]" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
          <textarea
            v-else-if="isJsonParameter(parameter)"
            :id="`parameter-${parameter}`"
            v-model="formData[parameter]"
            rows="5"
            :placeholder="`Enter valid JSON for ${parameter}`"
            spellcheck="false"
          />
          <input
            v-else
            :id="`parameter-${parameter}`"
            v-model.trim="formData[parameter]"
            type="text"
            autocomplete="off"
          />
        </div>
      </div>

      <p v-if="validationError" class="validation-error" role="alert">{{ validationError }}</p>

      <div class="form-actions">
        <button class="button button-primary" type="submit">Send request</button>
      </div>
    </form>
  </section>
</template>
