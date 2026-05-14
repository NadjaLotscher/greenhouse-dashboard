<script setup lang="ts">
defineProps<{
  online: boolean
  lastSeen?: string
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      class="relative flex h-2.5 w-2.5"
    >
      <span
        v-if="online"
        class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
      ></span>
      <span
        class="relative inline-flex rounded-full h-2.5 w-2.5"
        :class="online ? 'bg-green-400' : 'bg-slate-500'"
      ></span>
    </span>
    <span class="text-sm font-medium" :class="online ? 'text-green-400' : 'text-slate-400'">
      {{ online ? 'Online' : 'Offline' }}
    </span>
    <span v-if="lastSeen" class="text-xs text-slate-500 ml-1">
      {{ lastSeen }}
    </span>
  </div>
</template>
