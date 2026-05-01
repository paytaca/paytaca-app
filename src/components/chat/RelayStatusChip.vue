<template>
  <div class="row items-center q-gutter-x-sm">
    <q-badge
      v-for="url in relayUrls"
      :key="url"
      :color="statusColor(url)"
      rounded
      class="q-px-sm"
    >
      <q-icon :name="statusIcon(url)" size="12px" class="q-mr-xs" />
      {{ hostName(url) }}
    </q-badge>
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
    statusColor (url) {
      const status = this.relayStatus[url]
      if (status === 'connected') return 'positive'
      if (status === 'connecting') return 'warning'
      return 'grey'
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
