<script setup lang="ts">
import { computed, ref } from 'vue'
import AppShell from '../components/AppShell.vue'
import CurrentStatusGrid from '../components/CurrentStatusGrid.vue'
import HistoricalCharts from '../components/HistoricalCharts.vue'
import ManualControls from '../components/ManualControls.vue'
import CommandHistory from '../components/CommandHistory.vue'
import { useDevice } from '../services/deviceService'
import { useMeasurements } from '../services/measurementService'
import { useCommands } from '../services/commandService'

const { device, loading: deviceLoading } = useDevice('greenhouse-01')
const { measurements, loading: measurementsLoading } = useMeasurements('greenhouse-01')
const { commands, loading: commandsLoading, error: commandsError } = useCommands('greenhouse-01')

const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

function showToast(message: string, type: 'success' | 'error') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

const lastSeenText = computed(() => {
  if (!device.value?.lastSeen) return undefined
  const date = device.value.lastSeen.toDate ? device.value.lastSeen.toDate() : new Date(device.value.lastSeen)
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <AppShell :online="device?.online ?? false" :last-seen="lastSeenText">
    <div v-if="deviceLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="inline-block w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-slate-400">Loading dashboard...</p>
      </div>
    </div>

    <div v-else class="space-y-8">
      <CurrentStatusGrid :device="device" />

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <HistoricalCharts :measurements="measurements" :loading="measurementsLoading" />
        <div class="space-y-8">
          <ManualControls @toast="showToast" />
          <div v-if="commandsError" class="text-red-400 text-sm p-3 bg-red-500/10 rounded">{{ commandsError }}</div>
          <CommandHistory :commands="commands" :loading="commandsLoading" />
        </div>
      </div>
    </div>
  </AppShell>

  <Teleport to="body">
    <div
      v-if="toast"
      class="fixed bottom-6 right-6 px-5 py-3 rounded-xl font-medium text-sm z-50 shadow-2xl"
      :class="toast.type === 'success'
        ? 'bg-gradient-to-r from-green-900/90 to-green-800/90 border border-green-500/30 text-green-300'
        : 'bg-gradient-to-r from-red-900/90 to-red-800/90 border border-red-500/30 text-red-300'"
      style="animation: slideIn 0.3s ease"
    >
      {{ toast.message }}
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
