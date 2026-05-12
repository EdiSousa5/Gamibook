import {
  getStoredUserId,
  setStoredUserId,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from './storage'

export {
  getStoredUserId,
  setStoredUserId,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
}

const directusUrl = import.meta.env.VITE_DIRECTUS_URL ?? ''
export const normalizedDirectusUrl = directusUrl.replace(/\/$/, '')

if (!directusUrl) {
  console.warn('VITE_DIRECTUS_URL is not set. Directus requests will fail.')
}

export const getAssetUrl = (assetId?: string | null) => {
  if (!assetId) return ''
  if (!normalizedDirectusUrl) return ''
  const token = getAccessToken()
  const base = `${normalizedDirectusUrl}/assets/${assetId}`
  return token ? `${base}?access_token=${token}` : base
}

let _onUnauthorized: (() => void) | null = null

export const setUnauthorizedHandler = (handler: () => void) => {
  _onUnauthorized = handler
}

export const publicFetch = async (path: string, options: RequestInit = {}) => {
  if (!normalizedDirectusUrl) {
    throw new Error('VITE_DIRECTUS_URL is not set.')
  }
  return fetch(`${normalizedDirectusUrl}${path}`, options)
}

export const authFetch = async (path: string, options: RequestInit = {}) => {
  if (!normalizedDirectusUrl) {
    throw new Error('VITE_DIRECTUS_URL is not set. Directus requests will fail.')
  }

  const token = getAccessToken()
  if (!token) {
    throw new Error('Missing access token. Please login first.')
  }

  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${normalizedDirectusUrl}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    clearAccessToken()
    setStoredUserId(null)
    _onUnauthorized?.()
  }

  return response
}

export const parseResponse = async <T>(response: Response, label: string): Promise<T> => {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`${label} failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as T
}

export const parseListResponse = async <T>(response: Response, label: string): Promise<T[]> => {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`${label} failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as T[]
}
