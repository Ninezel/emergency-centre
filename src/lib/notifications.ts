import type { LocationProfile, SignalItem } from '../types'

interface NewLiveAlert {
  profile: LocationProfile
  signal: SignalItem
}

export async function ensureNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported' as const
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }

  return Notification.requestPermission()
}

export function notifyNewLiveAlerts(alerts: NewLiveAlert[]) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return 0
  }

  const visibleAlerts = alerts.slice(0, 3)

  visibleAlerts.forEach(({ profile, signal }) => {
    const notification = new Notification(signal.title, {
      body: `${profile.name} · ${signal.severity} · ${signal.summary}`,
      tag: `${profile.id}:${signal.id}`,
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  })

  return visibleAlerts.length
}
