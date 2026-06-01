const ACCESS_TOKEN_KEY = 'gb_access_token'
const REFRESH_TOKEN_KEY = 'gb_refresh_token'
const USER_ID_KEY = 'gb_user_id'

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

// O token de acesso fica em sessionStorage (limpo quando a aba/janela fecha),
// o que impede a persistência prolongada em localStorage que XSS pode explorar indefinidamente.
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

export const getRefreshToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export const setRefreshToken = (token: string | null) => {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

export const clearRefreshToken = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
