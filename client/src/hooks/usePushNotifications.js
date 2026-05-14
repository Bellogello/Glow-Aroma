import { useEffect } from 'react';
import { API_BASE_URL } from '../config';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(isAdmin) {
  useEffect(() => {
    if (!isAdmin) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribe() {
      try {
        // Register service worker
        const reg = await navigator.serviceWorker.register('/sw.js');

        // Ask for permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Subscribe to push
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // Save subscription on backend
        await fetch(`${API_BASE_URL}/admin/push-subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });

        console.log('Push notifications enabled ✓');
      } catch (err) {
        console.error('Push subscription failed:', err);
      }
    }

    subscribe();
  }, [isAdmin]);
}