const VISITOR_STORAGE_KEY = '_vid'
const SESSION_STORAGE_KEY = '_sid'

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getVisitorId(): string {
  if (typeof localStorage === 'undefined') return 'ssr-visitor'

  let id = localStorage.getItem(VISITOR_STORAGE_KEY)
  if (!id) {
    id = `v_${randomId()}`
    localStorage.setItem(VISITOR_STORAGE_KEY, id)
  }
  return id
}

export function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'ssr-session'

  let id = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!id) {
    id = `s_${randomId()}`
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

export function getSafeReferrer(): string {
  if (typeof document === 'undefined') return ''
  return document.referrer?.trim() || ''
}
