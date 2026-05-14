<script setup lang="ts">
import { ref } from 'vue'
import { sendCommand } from '../services/commandService'
import { useDevice } from '../services/deviceService'

const emit = defineEmits<{
  toast: [message: string, type: 'success' | 'error']
}>()

const loadingBtn = ref<string | null>(null)
const { device } = useDevice('greenhouse-01')

interface ControlButton {
  label: string
  type: string
  value: string
  key: string
  controlType: 'heater' | 'fan' | 'mist'
}

const modeButtons: ControlButton[] = [
  { label: 'Set Automatic', type: 'mode', value: 'automatic', key: 'mode-auto', controlType: 'heater' },
  { label: 'Set Manual', type: 'mode', value: 'manual', key: 'mode-manual', controlType: 'heater' }
]

const controlGroups: Array<{ label: string; buttons: ControlButton[]; controlType: 'heater' | 'fan' | 'mist' }> = [
  {
    label: 'Heater',
    controlType: 'heater',
    buttons: [
      { label: 'ON', type: 'heater_override', value: 'on', key: 'heater-on', controlType: 'heater' },
      { label: 'OFF', type: 'heater_override', value: 'off', key: 'heater-off', controlType: 'heater' }
    ]
  },
  {
    label: 'Fan',
    controlType: 'fan',
    buttons: [
      { label: 'ON', type: 'fan_override', value: 'on', key: 'fan-on', controlType: 'fan' },
      { label: 'OFF', type: 'fan_override', value: 'off', key: 'fan-off', controlType: 'fan' }
    ]
  },
  {
    label: 'Mist',
    controlType: 'mist',
    buttons: [
      { label: 'ON', type: 'mist_override', value: 'on', key: 'mist-on', controlType: 'mist' },
      { label: 'OFF', type: 'mist_override', value: 'off', key: 'mist-off', controlType: 'mist' }
    ]
  }
]

function getCurrentState(controlType: 'heater' | 'fan' | 'mist'): boolean {
  if (!device.value) return false
  if (controlType === 'heater') return device.value.heaterOn
  if (controlType === 'fan') return device.value.fanOn
  if (controlType === 'mist') return device.value.mist1On
  return false
}

function getButtonVariant(btn: ControlButton, controlType?: 'heater' | 'fan' | 'mist'): 'primary' | 'warning' | 'danger' {
  if (controlType) {
    const isActive = getCurrentState(controlType)
    const isOn = btn.value === 'on'
    if (isActive === isOn) return 'danger'
    return 'primary'
  }

  if (btn.type === 'mode' && device.value) {
    if (btn.value === device.value.mode) return 'danger'
    return 'primary'
  }

  return 'primary'
}

async function handleCommand(btn: ControlButton) {
  loadingBtn.value = btn.key
  try {
    await sendCommand('greenhouse-01', btn.type, btn.value)
    emit('toast', 'Command sent', 'success')
  } catch (e: any) {
    emit('toast', e.message || 'Command failed', 'error')
  } finally {
    loadingBtn.value = null
  }
}

function btnClass(variant: string) {
  const base = 'px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  if (variant === 'primary') return `${base} bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20`
  if (variant === 'danger') return `${base} bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg shadow-red-500/10 hover:shadow-red-500/20`
  return `${base} bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20`
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-xl font-bold text-white mb-1">Manual Controls</h2>
      <p class="text-sm text-slate-500">Commands are sent as requests. The Raspberry Pi checks safety rules before executing them.</p>
    </div>

    <div class="bg-gradient-to-br from-dark-700 to-dark-800 border border-dark-600 rounded-xl p-5 space-y-5">
      <div>
        <h3 class="text-sm font-medium text-slate-400 mb-3">Operating Mode</h3>
        <div class="flex flex-wrap gap-3">
          <button
            v-for="btn in modeButtons"
            :key="btn.key"
            :class="btnClass(getButtonVariant(btn))"
            :disabled="loadingBtn === btn.key"
            @click="handleCommand(btn)"
          >
            <span v-if="loadingBtn === btn.key" class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
            {{ btn.label }}
          </button>
        </div>
      </div>

      <div class="border-t border-dark-600 pt-5">
        <h3 class="text-sm font-medium text-slate-400 mb-3">Actuator Controls</h3>
        <div class="space-y-3">
          <div v-for="group in controlGroups" :key="group.label" class="flex gap-3">
            <div class="text-xs font-medium text-slate-500 flex items-center min-w-12">{{ group.label }}</div>
            <div class="flex gap-3 flex-1">
              <button
                v-for="btn in group.buttons"
                :key="btn.key"
                :class="btnClass(getButtonVariant(btn, group.controlType))"
                :disabled="loadingBtn === btn.key"
                @click="handleCommand(btn)"
                class="flex-1"
              >
                <span v-if="loadingBtn === btn.key" class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                {{ btn.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
