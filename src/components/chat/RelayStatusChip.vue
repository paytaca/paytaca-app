<template>
  <div class="relay-status-bar">
    <div
      v-for="url in relayUrls"
      :key="url"
      class="relay-chip"
      :class="statusClass(url)"
    >
      <q-icon :name="statusIcon(url)" size="10px" class="relay-icon" />
      <span class="relay-label">{{ hostName(url) }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RelayStatusChip',
  props: {
    relayUrls: { type: Array, default: () => [] },
    relayStatus: { type: Object, default: () => ({}) },
  },
  methods: {
    hostName (url) {
      try {
        return new URL(url).hostname.replace('www.', '')
      } catch {
        return url
      }
    },
    statusClass (url) {
      const status = this.relayStatus[url]
      if (status === 'connected') return 'connected'
      if (status === 'connecting') return 'connecting'
      return 'disconnected'
    },
    statusIcon (url) {
      const status = this.relayStatus[url]
      if (status === 'connected') return 'wifi'
      if (status === 'connecting') return 'wifi_tethering'
      return 'wifi_off'
    },
  },
}
</script>

<style scoped>
.relay-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.relay-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.04);
  color: #6b7280;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.relay-chip.connected {
  background: rgba(16, 185, 129, 0.08);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.15);
}

.relay-chip.connecting {
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.15);
}

.relay-chip.disconnected {
  background: rgba(107, 114, 128, 0.06);
  color: #9ca3af;
  border-color: rgba(107, 114, 128, 0.1);
}

.relay-icon {
  opacity: 0.8;
}

/* Dark mode adjustments */
.dark .relay-chip {
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
}

.dark .relay-chip.connected {
  background: rgba(16, 185, 129, 0.1);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.2);
}

.dark .relay-chip.connecting {
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.2);
}

.dark .relay-chip.disconnected {
  background: rgba(255, 255, 255, 0.03);
  color: #64748b;
  border-color: rgba(255, 255, 255, 0.06);
}
</style>
