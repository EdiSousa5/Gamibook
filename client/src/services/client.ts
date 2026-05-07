import { createDirectus, rest } from '@directus/sdk'

const directusUrl = import.meta.env.VITE_DIRECTUS_URL ?? ''
export const normalizedDirectusUrl = directusUrl.replace(/\/$/, '')

const ACCESS_TOKEN_KEY = 'gb_access_token'
const USER_ID_KEY = 'gb_user_id'

if (!directusUrl) {
  console.warn('VITE_DIRECTUS_URL is not set. Directus requests will fail.')
}

export const directus = createDirectus(normalizedDirectusUrl).with(rest())

export const getStoredUserId = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_ID_KEY)
}

export const setStoredUserId = (id: string | null) => {
  if (typeof window === 'undefined') return
  if (id) {
    localStorage.setItem(USER_ID_KEY, id)
  } else {
    localStorage.removeItem(USER_ID_KEY)
  }
}

export const getAssetUrl = (assetId?: string | null) => {
  if (!assetId) return ''
  if (!normalizedDirectusUrl) return ''
  return `${normalizedDirectusUrl}/assets/${assetId}`
}

// Access token lives in sessionStorage (cleared when the browser tab/window closes)
// This prevents long-lived token persistence in localStorage that XSS can exploit indefinitely.
export const getAccessToken = () => {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export const setAccessToken = (token: string | null) => {
  if (typeof window === 'undefined') return
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  }
}

export const clearAccessToken = () => {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
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
    window.location.href = '/login'
  }

  return response
}
