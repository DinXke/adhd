/**
 * usePushNotifications — registreert service worker en VAPID push subscription
 */
import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading'

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading')
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }

    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      setRegistration(reg)
      const permission = Notification.permission
      if (permission === 'denied') {
        setState('denied')
        return
      }
      const existing = await reg.pushManager.getSubscription()
      setState(existing ? 'subscribed' : 'unsubscribed')
    }).catch(() => setState('unsupported'))
  }, [])

  const subscribe = useCallback(async () => {
    if (!registration) return
    setState('loading')
    try {
      // Haal VAPID public key op
      const { publicKey } = await api.get<{ publicKey: string }>('/api/push/vapid-public-key')
      if (!publicKey) {
        setState('unsupported')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const json = sub.toJSON()
      await api.post('/api/push/subscribe', {
        endpoint: json.endpoint,
        keys: json.keys,
      })

      setState('subscribed')
    } catch (err) {
      console.error('Push subscribe fout:', err)
      setState('unsubscribed')
    }
  }, [registration])

  const unsubscribe = useCallback(async () => {
    if (!registration) return
    setState('loading')
    try {
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await api.delete('/api/push/subscribe', { endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setState('unsubscribed')
    } catch {
      setState('subscribed')
    }
  }, [registration])

  return { state, subscribe, unsubscribe }
}
