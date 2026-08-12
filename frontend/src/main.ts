import { createApp } from 'vue'

import App from './App.vue'
import { loadRuntimeConfig, runtimeConfigKey } from './runtime/config'
import './styles/main.css'

async function bootstrap() {
  const runtimeConfig = await loadRuntimeConfig()
  const app = createApp(App)

  app.provide(runtimeConfigKey, runtimeConfig)
  app.mount('#app')
}

void bootstrap()
