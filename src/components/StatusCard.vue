<script setup lang="ts">
defineProps<{
  title: string
  value: string
  icon: string
  color: 'red' | 'amber' | 'teal' | 'green' | 'slate'
  subtitle: string
}>()

function getColorClasses(color: string) {
  const colors: Record<string, string> = {
    red: 'bg-red-500/10 border-red-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
    teal: 'bg-teal-500/10 border-teal-500/20',
    green: 'bg-green-500/10 border-green-500/20',
    slate: 'bg-slate-500/10 border-slate-500/20'
  }
  return colors[color] || colors.slate
}

function getTextColor(color: string) {
  const colors: Record<string, string> = {
    red: 'text-red-400',
    amber: 'text-amber-400',
    teal: 'text-teal-400',
    green: 'text-green-400',
    slate: 'text-slate-400'
  }
  return colors[color] || colors.slate
}
</script>

<template>
  <div class="bg-gradient-to-br from-dark-700 to-dark-800 border rounded-lg p-4 space-y-2" :class="getColorClasses(color)">
    <div class="flex items-center justify-between">
      <span class="text-2xl">{{ icon }}</span>
      <p class="text-xs font-medium text-slate-400">{{ title }}</p>
    </div>
    <div>
      <p class="text-2xl font-bold" :class="getTextColor(color)">{{ value }}</p>
      <p class="text-xs text-slate-500 mt-1">{{ subtitle }}</p>
    </div>
  </div>
</template>
