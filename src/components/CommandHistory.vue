<script setup lang="ts">
import type { Command } from '../services/commandService'

defineProps<{
  commands: Command[]
  loading: boolean
}>()

function formatDate(timestamp: any): string {
  if (!timestamp) return '--'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusClass(status: string): string {
  switch (status) {
    case 'executed': return 'bg-green-500/10 text-green-400 border border-green-500/20'
    case 'rejected': return 'bg-red-500/10 text-red-400 border border-red-500/20'
    default: return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  }
}

function formatType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-xl font-bold text-white">Recent Commands</h2>

    <div v-if="loading" class="bg-dark-700 border border-dark-600 rounded-xl p-8 text-center">
      <div class="inline-block w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="commands.length === 0" class="bg-dark-700 border border-dark-600 rounded-xl p-8 text-center">
      <p class="text-slate-400">No commands sent yet</p>
    </div>

    <div v-else class="bg-gradient-to-br from-dark-700 to-dark-800 border border-dark-600 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-dark-600">
              <th class="text-left px-5 py-3 text-slate-400 font-medium">Time</th>
              <th class="text-left px-5 py-3 text-slate-400 font-medium">Type</th>
              <th class="text-left px-5 py-3 text-slate-400 font-medium">Value</th>
              <th class="text-left px-5 py-3 text-slate-400 font-medium">Status</th>
              <th class="text-left px-5 py-3 text-slate-400 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cmd in commands"
              :key="cmd.id"
              class="border-b border-dark-600/50 last:border-0 hover:bg-dark-600/30 transition-colors"
            >
              <td class="px-5 py-3 text-slate-300 whitespace-nowrap">{{ formatDate(cmd.createdAt) }}</td>
              <td class="px-5 py-3 text-slate-300">{{ formatType(cmd.type) }}</td>
              <td class="px-5 py-3 text-slate-300 font-mono">{{ cmd.value }}</td>
              <td class="px-5 py-3">
                <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="statusClass(cmd.status)">
                  {{ cmd.status }}
                </span>
              </td>
              <td class="px-5 py-3 text-slate-500 text-xs">{{ cmd.rejectedReason || '--' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
