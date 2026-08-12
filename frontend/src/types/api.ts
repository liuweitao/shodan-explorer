export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface ApiDefinition {
  name: string
  chineseName: string
  endpoint: string
  params: string[]
  optionalParams?: string[]
  method?: HttpMethod
  selectOptions?: Record<string, string[]>
  jsonParams?: string[]
  jsonBody?: string[]
}

export interface LegacyApiDefinition extends ApiDefinition {
  request: null
  response: null
}

export interface ApiGroup {
  name: string
  chineseName: string
  apis: ApiDefinition[]
}

export interface LegacyApiGroup extends Omit<ApiGroup, 'apis'> {
  apis: LegacyApiDefinition[]
}

export type FormValue = string | number | boolean | Record<string, unknown> | unknown[]
export type FormData = Record<string, FormValue>

export interface RequestSnapshot {
  url: string
  method: HttpMethod
  headers: Record<string, string>
  body: string | null
  queryParams: Record<string, string>
}

export interface PreparedRequest {
  url: string
  init: RequestInit
  snapshot: RequestSnapshot
}

export interface ApiErrorPayload {
  error: string
  status?: number
}
