<script setup lang="ts">
import { computed } from 'vue'
import StatusCard from './StatusCard.vue'
import type { DeviceData } from '../services/deviceService'

const props = defineProps<{
  device: DeviceData | null
}>()

const cards = computed(() => {
  const d = props.device
  if (!d) return []
  return [
    {
      title: 'Temperature',
      value: `${d.currentTemperature?.toFixed(1) ?? '--'}°C`,
      icon: '🌡️',
      color: (d.currentTemperature > 35 ? 'red' : d.currentTemperature > 28 ? 'amber' : 'teal') as any,
      subtitle: d.currentTemperature > 35 ? 'High' : d.currentTemperature > 28 ? 'Warm' : 'Normal'
    },
    {
      title: 'Humidity',
      value: `${d.currentHumidity?.toFixed(0) ?? '--'}%`,
      icon: '💧',
      color: (d.currentHumidity < 40 ? 'amber' : 'teal') as any,
      subtitle: d.currentHumidity < 40 ? 'Low' : 'Normal'
    },
    {
      title: 'Soil Status',
      value: d.soilDry ? 'Dry' : 'Moist',
      icon: '🌱',
      color: (d.soilDry ? 'amber' : 'green') as any,
      subtitle: d.soilDry ? 'Needs water' : 'Adequate moisture'
    },
    {
      title: 'Heater',
      value: d.heaterOn ? 'ON' : 'OFF',
      icon: '🔥',
      color: (d.heaterOn ? 'red' : 'slate') as any,
      subtitle: d.heaterOn ? 'Active' : 'Standby'
    },
    {
      title: 'Fan',
      value: d.fanOn ? 'ON' : 'OFF',
      icon: '🌀',
      color: (d.fanOn ? 'teal' : 'slate') as any,
      subtitle: d.fanOn ? 'Running' : 'Standby'
    },
    {
      title: 'Misting',
      value: (d.mist1On || d.mist2On) ? 'Active' : 'OFF',
      icon: '🌫️',
      color: ((d.mist1On || d.mist2On) ? 'teal' : 'slate') as any,
      subtitle: d.mist1On && d.mist2On ? 'Both active' : d.mist1On ? 'Mist 1 active' : d.mist2On ? 'Mist 2 active' : 'Standby'
    },
    {
      title: 'Mode',
      value: d.mode === 'automatic' ? 'Auto' : 'Manual',
      icon: '⚙️',
      color: (d.mode === 'automatic' ? 'green' : 'amber') as any,
      subtitle: d.mode === 'automatic' ? 'Automated control' : 'Manual override'
    }
  ]
})
</script>

<template>
  <div v-if="device" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
    <StatusCard
      v-for="card in cards"
      :key="card.title"
      :title="card.title"
      :value="card.value"
      :icon="card.icon"
      :color="card.color"
      :subtitle="card.subtitle"
    />
  </div>
  <div v-else class="bg-dark-700 border border-dark-600 rounded-xl p-8 text-center">
    <p class="text-slate-400">Waiting for Raspberry Pi data...</p>
  </div>
</template>
