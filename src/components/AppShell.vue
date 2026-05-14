<script setup lang="ts">
import { useRouter } from 'vue-router'
import { logout } from '../services/authService'
import OnlineStatusBadge from './OnlineStatusBadge.vue'

defineProps<{
  online: boolean
  lastSeen?: string
}>()

const router = useRouter()

async function handleLogout() {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-dark-900">
    <header class="sticky top-0 z-50 bg-dark-800/80 backdrop-blur-lg border-b border-dark-600">
      <div class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h1 class="text-lg font-bold text-white hidden sm:block">Greenhouse Control Dashboard</h1>
            <h1 class="text-lg font-bold text-white sm:hidden">Greenhouse</h1>
          </div>
          <OnlineStatusBadge :online="online" :last-seen="lastSeen" />
        </div>
        <button
          @click="handleLogout"
          class="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg transition-all duration-200"
        >
          Logout
        </button>
      </div>
    </header>
    <main class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <slot />
    </main>
  </div>
</template>
