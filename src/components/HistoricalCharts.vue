<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import type { Measurement } from '../services/measurementService'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{
  measurements: Measurement[]
  loading: boolean
}>()

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' as const },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e2536',
      borderColor: '#283044',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      padding: 12,
      cornerRadius: 8,
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(58, 69, 96, 0.3)' },
      ticks: { color: '#64748b', maxTicksLimit: 10 },
      border: { color: '#283044' }
    },
    y: {
      grid: { color: 'rgba(58, 69, 96, 0.3)' },
      ticks: { color: '#64748b' },
      border: { color: '#283044' }
    }
  },
  elements: {
    point: { radius: 0, hoverRadius: 4 },
    line: { tension: 0.3, borderWidth: 2 }
  }
}

const labels = computed(() =>
  props.measurements.map(m => {
    if (!m.timestamp) return ''
    const date = m.timestamp.toDate ? m.timestamp.toDate() : new Date(m.timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
)

const tempData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Temperature (°C)',
    data: props.measurements.map(m => m.temperature),
    borderColor: '#14b8a6',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    fill: true
  }]
}))

const humidityData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Humidity (%)',
    data: props.measurements.map(m => m.humidity),
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    fill: true
  }]
}))

const actuatorData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Heater',
      data: props.measurements.map(m => m.heaterOn ? 3 : 0),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true
    },
    {
      label: 'Fan',
      data: props.measurements.map(m => m.fanOn ? 2 : 0),
      borderColor: '#14b8a6',
      backgroundColor: 'rgba(20, 184, 166, 0.1)',
      fill: true
    },
    {
      label: 'Misting',
      data: props.measurements.map(m => (m.mist1On || m.mist2On) ? 1 : 0),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true
    }
  ]
}))

const actuatorOptions = {
  ...chartOptions,
  plugins: {
    ...chartOptions.plugins,
    legend: { display: true, labels: { color: '#94a3b8', boxWidth: 12, padding: 16 } }
  },
  scales: {
    ...chartOptions.scales,
    y: {
      ...chartOptions.scales.y,
      ticks: { ...chartOptions.scales.y.ticks, stepSize: 1, callback: (v: any) => ['Off', 'Mist', 'Fan', 'Heat'][v] || '' },
      min: 0,
      max: 3
    }
  }
}
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold text-white">Historical Data</h2>

    <div v-if="loading" class="bg-dark-700 border border-dark-600 rounded-xl p-12 text-center">
      <div class="inline-block w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p class="text-slate-400">Loading measurements...</p>
    </div>

    <div v-else-if="measurements.length === 0" class="bg-dark-700 border border-dark-600 rounded-xl p-12 text-center">
      <p class="text-slate-400">No measurements available yet</p>
      <p class="text-slate-500 text-sm mt-1">Data will appear once the Raspberry Pi starts sending readings</p>
    </div>

    <template v-else>
      <div class="bg-gradient-to-br from-dark-700 to-dark-800 border border-dark-600 rounded-xl p-5">
        <h3 class="text-sm font-medium text-slate-400 mb-4">Temperature (°C)</h3>
        <div class="h-56">
          <Line :data="tempData" :options="chartOptions" />
        </div>
      </div>

      <div class="bg-gradient-to-br from-dark-700 to-dark-800 border border-dark-600 rounded-xl p-5">
        <h3 class="text-sm font-medium text-slate-400 mb-4">Humidity (%)</h3>
        <div class="h-56">
          <Line :data="humidityData" :options="chartOptions" />
        </div>
      </div>

      <div class="bg-gradient-to-br from-dark-700 to-dark-800 border border-dark-600 rounded-xl p-5">
        <h3 class="text-sm font-medium text-slate-400 mb-4">Actuator Activity</h3>
        <div class="h-56">
          <Line :data="actuatorData" :options="actuatorOptions as any" />
        </div>
      </div>
    </template>
  </div>
</template>
