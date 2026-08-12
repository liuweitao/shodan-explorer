import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadRuntimeConfig } from '@/runtime/config'

afterEach(() => vi.unstubAllGlobals())

describe('loadRuntimeConfig', () => {
  it('loads and trims the runtime key without build-time substitution', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"shodanApiKey":"  shodanproxy  "}', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
    )

    await expect(loadRuntimeConfig()).resolves.toEqual({ shodanApiKey: 'shodanproxy' })
  })

  it('fails closed when runtime configuration cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(loadRuntimeConfig()).resolves.toEqual({ shodanApiKey: '' })
  })
})
