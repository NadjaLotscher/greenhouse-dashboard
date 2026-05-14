import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { auth } from './firebase'
import { signInAnonymously } from 'firebase/auth'

// Ensure anonymous auth is set up
signInAnonymously(auth).catch(err => console.error('Anonymous auth failed:', err))

createApp(App).use(router).mount('#app')
