interface User {
  id: string
  email: string
  name?: string | null
}

export function syncMonkfeedLogin(user: User) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('monkfeed-login', { detail: user })
    window.dispatchEvent(event)
  }
}

export function syncMonkfeedLogout() {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('monkfeed-logout')
    window.dispatchEvent(event)
  }
}
