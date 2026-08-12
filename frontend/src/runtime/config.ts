import type { InjectionKey } from 'vue'

export interface RuntimeConfig {
  shodanApiKey: string
}

const defaultConfig: RuntimeConfig = {
  shodanApiKey: ''
}

export const runtimeConfigKey: InjectionKey<Readonly<RuntimeConfig>> = Symbol('runtimeConfig')

export async function loadRuntimeConfig(): Promise<Readonly<RuntimeConfig>> {
  try {
    const response = await fetch('/runtime-config.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) {
      return defaultConfig
    }

    const candidate = (await response.json()) as Partial<RuntimeConfig>
    return {
      shodanApiKey: typeof candidate.shodanApiKey === 'string' ? candidate.shodanApiKey.trim() : ''
    }
  } catch {
    return defaultConfig
  }
}
