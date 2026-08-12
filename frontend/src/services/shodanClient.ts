import type {
  ApiDefinition,
  ApiErrorPayload,
  FormData,
  HttpMethod,
  PreparedRequest
} from '@/types/api'

const DEFAULT_TIMEOUT_MS = 30_000

export class ShodanRequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ShodanRequestError'
    this.status = status
  }
}

function serializeValue(value: FormData[string]): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function hasValue(value: FormData[string] | undefined): value is FormData[string] {
  return value !== null && value !== undefined && value !== ''
}

function redactRequestUrl(url: string): string {
  const [path, rawQuery = ''] = url.split('?', 2)
  const query = new URLSearchParams(rawQuery)

  if (query.has('key')) {
    query.set('key', '[REDACTED]')
  }

  const redactedQuery = query.toString().replace('%5BREDACTED%5D', '[REDACTED]')
  return redactedQuery ? `${path}?${redactedQuery}` : (path ?? url)
}

function normalizeMethod(api: ApiDefinition): HttpMethod {
  return api.method ?? 'GET'
}

export function prepareShodanRequest(
  api: ApiDefinition,
  formData: FormData,
  apiKey: string
): PreparedRequest {
  const normalizedApiKey = apiKey.trim()
  if (!normalizedApiKey) {
    throw new ShodanRequestError('No API key is configured for this deployment.')
  }

  const method = normalizeMethod(api)
  let url = api.endpoint
  const queryParams = new URLSearchParams({ key: normalizedApiKey })
  const bodyParams = new URLSearchParams()
  const headers: Record<string, string> = { Accept: 'application/json' }

  for (const [key, value] of Object.entries(formData)) {
    if (!hasValue(value)) continue

    const placeholder = `{${key}}`
    if (url.includes(placeholder)) {
      url = url.replaceAll(placeholder, encodeURIComponent(serializeValue(value)))
    } else if (method === 'GET') {
      queryParams.append(key, serializeValue(value))
    } else if (!api.jsonBody?.includes(key)) {
      bodyParams.append(key, serializeValue(value))
    }
  }

  const unresolvedPlaceholder = url.match(/\{[^}]+\}/)?.[0]
  if (unresolvedPlaceholder) {
    throw new ShodanRequestError(`Missing required path parameter: ${unresolvedPlaceholder}`)
  }

  let body: string | undefined
  if (method !== 'GET' && api.jsonBody) {
    const jsonBody: Record<string, FormData[string]> = {}
    for (const key of api.jsonBody) {
      const value = formData[key]
      if (hasValue(value)) jsonBody[key] = value
    }
    body = JSON.stringify(jsonBody)
    headers['Content-Type'] = 'application/json'
  } else if (method !== 'GET' && bodyParams.size > 0) {
    body = bodyParams.toString()
    headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8'
  }

  url += `${url.includes('?') ? '&' : '?'}${queryParams.toString()}`
  const safeQueryParams = Object.fromEntries(queryParams)
  safeQueryParams.key = '[REDACTED]'

  return {
    url,
    init: {
      method,
      headers,
      body
    },
    snapshot: {
      url: redactRequestUrl(url),
      method,
      headers,
      body: body ?? null,
      queryParams: safeQueryParams
    }
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('json')) {
    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new ShodanRequestError('The server returned malformed JSON.', response.status)
    }
  }

  return text
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as ApiErrorPayload).error
    if (typeof error === 'string' && error.trim()) return error
  }

  if (typeof payload === 'string' && payload.trim()) return payload
  return `The request failed with HTTP ${status}.`
}

export async function executeShodanRequest(
  prepared: PreparedRequest,
  externalSignal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<unknown> {
  const timeoutController = new AbortController()
  const timeoutId = window.setTimeout(() => timeoutController.abort(), timeoutMs)
  const signals = externalSignal
    ? [externalSignal, timeoutController.signal]
    : [timeoutController.signal]

  try {
    const response = await fetch(prepared.url, {
      ...prepared.init,
      signal: signals.length === 1 ? signals[0] : AbortSignal.any(signals)
    })
    const payload = await parseResponse(response)

    if (!response.ok) {
      throw new ShodanRequestError(extractErrorMessage(payload, response.status), response.status)
    }

    return payload
  } catch (error) {
    if (error instanceof ShodanRequestError) throw error
    if (externalSignal?.aborted) throw new ShodanRequestError('The request was cancelled.')
    if (timeoutController.signal.aborted) {
      throw new ShodanRequestError('The request timed out. Please try again.')
    }
    throw new ShodanRequestError('The request failed. Check the network and try again.')
  } finally {
    window.clearTimeout(timeoutId)
  }
}
