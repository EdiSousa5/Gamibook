import {
  getStoredUserId,
  setStoredUserId,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
} from './storage'

export {
  getStoredUserId,
  setStoredUserId,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
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
let _refreshPromise: Promise<string | null> | null = null

export const setUnauthorizedHandler = (handler: () => void) => {
  _onUnauthorized = handler
}

const tryRefreshToken = (): Promise<string | null> => {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken || !normalizedDirectusUrl) return null
    try {
      const res = await fetch(`${normalizedDirectusUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken, mode: 'json' }),
      })
      if (!res.ok) return null
      const data = await res.json().catch(() => null)
      const newAccess = data?.data?.access_token as string | undefined
      const newRefresh = data?.data?.refresh_token as string | undefined
      if (!newAccess) return null
      setAccessToken(newAccess)
      if (newRefresh) setRefreshToken(newRefresh)
      return newAccess
    } catch {
      return null
    } finally {
      _refreshPromise = null
    }
  })()

  return _refreshPromise
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

  const makeRequest = (token: string) => {
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)
    return fetch(`${normalizedDirectusUrl}${path}`, { ...options, headers })
  }

  const token = getAccessToken()
  if (!token) {
    throw new Error('Missing access token. Please login first.')
  }

  let response = await makeRequest(token)

  if (response.status === 401) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      response = await makeRequest(newToken)
    }
    if (response.status === 401) {
      clearAccessToken()
      clearRefreshToken()
      setStoredUserId(null)
      _onUnauthorized?.()
    }
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
