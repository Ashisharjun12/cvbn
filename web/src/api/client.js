import axios from 'axios'

/** Empty string = same-origin (Docker nginx proxies /api and /health to test-backend). */
function resolveApiBaseUrl(envValue) {
  if (envValue === '') return ''
  if (envValue != null && String(envValue).trim() !== '') return envValue
  // Vite omits empty build-args — prod bundles must not default to :3001 (not exposed in compose).
  if (import.meta.env.PROD) return ''
  return 'http://localhost:3001'
}

const ADMIN_API_URL = resolveApiBaseUrl(import.meta.env.VITE_ADMIN_API_URL)
const TESTER_API_URL = resolveApiBaseUrl(import.meta.env.VITE_TESTER_API_URL)

export const adminClient = axios.create({
  baseURL: ADMIN_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const testerClient = axios.create({
  baseURL: TESTER_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

adminClient.interceptors.request.use((config) => {
  try {
    const raw = sessionStorage.getItem('admin-auth')
    const state = raw ? JSON.parse(raw) : null
    const key = state?.state?.apiKey ?? ''
    if (key) config.headers['x-admin-api-key'] = key
  } catch {}
  return config
})

testerClient.interceptors.request.use((config) => {
  try {
    const raw = sessionStorage.getItem('tester-auth')
    const state = raw ? JSON.parse(raw) : null
    const token = state?.state?.token ?? ''
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

export function unwrap(res) {
  return res.data?.data ?? res.data
}

export function mapApiError(error) {
  if (error.response) {
    const status = error.response.status
    const message = error.response.data?.message
    if (status === 401) return message ?? 'Invalid API key or not authenticated.'
    if (status === 503) return message ?? 'Service unavailable.'
    if (status === 404) return message ?? 'Resource not found.'
    if (status === 422) return message ?? 'Invalid request.'
    return message ?? `Request failed (${status}).`
  }
  if (error.request) return 'Cannot reach server. Is the service running?'
  return error.message ?? 'Unexpected error.'
}
