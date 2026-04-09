/**
 * API client — wraps fetch met auth headers en token refresh.
 */

let accessToken: string | null = null
let isRefreshing = false
let refreshSubscribers: ((token: string | null) => void)[] = []

export function setAccessToken(token: string | null) {
  accessToken = token
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

async function refreshToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push(resolve)
    })
  }

  isRefreshing = true
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      onRefreshed(null)
      return null
    }
    const data = await res.json()
    accessToken = data.accessToken
    onRefreshed(data.accessToken)
    return data.accessToken
  } catch {
    onRefreshed(null)
    return null
  } finally {
    isRefreshing = false
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let res = await fetch(path, { ...options, headers, credentials: 'include' })

  // 401 → probeer token te refreshen
  if (res.status === 401 && accessToken) {
    const newToken = await refreshToken()
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`)
      res = await fetch(path, { ...options, headers, credentials: 'include' })
    } else {
      // Refresh mislukt → uitloggen
      setAccessToken(null)
      window.dispatchEvent(new CustomEvent('auth:logout'))
      throw new Error('Sessie verlopen. Log opnieuw in.')
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(error.error ?? `HTTP ${res.status}`)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json()
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
