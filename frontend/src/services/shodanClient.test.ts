import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  executeShodanRequest,
  prepareShodanRequest,
  ShodanRequestError
} from '@/services/shodanClient'
import type { ApiDefinition } from '@/types/api'

const searchApi: ApiDefinition = {
  name: 'Search Shodan',
  chineseName: 'Shodan搜索',
  endpoint: '/shodan/host/search',
  params: ['query']
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('prepareShodanRequest', () => {
  it('keeps the real key in the network request and redacts the visible snapshot', () => {
    const prepared = prepareShodanRequest(searchApi, { query: 'product:nginx' }, 'gateway-key')

    expect(prepared.url).toBe('/shodan/host/search?key=gateway-key&query=product%3Anginx')
    expect(prepared.snapshot.url).toBe('/shodan/host/search?key=[REDACTED]&query=product%3Anginx')
    expect(prepared.snapshot.queryParams.key).toBe('[REDACTED]')
  })

  it('encodes path parameters and JSON request bodies', () => {
    const api: ApiDefinition = {
      name: 'Update Alert',
      chineseName: '更新警报',
      endpoint: '/shodan/alert/{id}',
      params: ['id'],
      optionalParams: ['filters'],
      method: 'POST',
      jsonParams: ['filters'],
      jsonBody: ['filters']
    }
    const prepared = prepareShodanRequest(
      api,
      { id: 'alert/a', filters: { ip: ['1.1.1.1'] } },
      'shodanproxy'
    )

    expect(prepared.url).toBe('/shodan/alert/alert%2Fa?key=shodanproxy')
    expect(prepared.init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(prepared.init.body).toBe('{"filters":{"ip":["1.1.1.1"]}}')
  })

  it('rejects missing deployment credentials', () => {
    expect(() => prepareShodanRequest(searchApi, { query: 'nginx' }, ' ')).toThrow(
      ShodanRequestError
    )
  })
})

describe('executeShodanRequest', () => {
  it('parses JSON responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"total":42}', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
    )
    const prepared = prepareShodanRequest(searchApi, { query: 'nginx' }, 'gateway-key')

    await expect(executeShodanRequest(prepared)).resolves.toEqual({ total: 42 })
  })

  it('preserves useful upstream errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"error":"Invalid API key"}', {
          status: 401,
          headers: { 'content-type': 'application/json' }
        })
      )
    )
    const prepared = prepareShodanRequest(searchApi, { query: 'nginx' }, 'invalid')

    await expect(executeShodanRequest(prepared)).rejects.toMatchObject({
      message: 'Invalid API key',
      status: 401
    })
  })

  it('handles empty success responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    const prepared = prepareShodanRequest(searchApi, { query: 'nginx' }, 'gateway-key')

    await expect(executeShodanRequest(prepared)).resolves.toBeNull()
  })

  it('distinguishes a timeout from a generic network failure', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
            once: true
          })
        })
      })
    )
    const prepared = prepareShodanRequest(searchApi, { query: 'nginx' }, 'gateway-key')
    const request = executeShodanRequest(prepared, undefined, 100)
    const expectation = expect(request).rejects.toThrow('The request timed out. Please try again.')

    await vi.advanceTimersByTimeAsync(100)

    await expectation
  })
})
