import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher

export const echo = new Echo({
  broadcaster: 'pusher',
  key: 'myappkey123', // same as PUSHER_APP_KEY in .env
  wsHost: '10.97.70.127', // Explicitly set to your backend server IP
  wsPort: 6001,
  forceTLS: false,
  disableStats: true,
  enabledTransports: ['ws', 'wss'],
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
})
