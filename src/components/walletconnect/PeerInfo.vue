<template>
    <q-item>
      <q-item-section side>
        <q-avatar rounded size="48px">
          <img :src="metadata?.icons?.[0].replace('http://', 'https://')">
          <!-- <q-badge floating color="teal">online</q-badge> -->
        </q-avatar>
      </q-item-section>
      <q-item-section>
        <q-item-label>
          <slot name="name">
            <span class="text-bold">{{ metadata?.name}}</span>
          </slot>
        </q-item-label>
        <q-item-label caption>
          <slot name="url">
            <div class="text-light session-info-attribute-url" style="word-break: break-all">{{ metadata?.url  }}</div>
            <div v-if="sessionId" class="text-light session-info-attribute">Sid: {{ sessionId  }}</div>
            <div v-if="sessionTopic" class="text-light session-info-attribute">Topic: {{ sessionTopic?.replace(sessionTopic.slice(3, sessionTopic.length - 6), '...')  }}</div>
          </slot>
        </q-item-label>
      </q-item-section>
    </q-item>

</template>
<script setup>
defineProps({
    /**
     * Session peer's metadata.
     * Example: {
     *      "name": "Cauldron DEX",
     *      "description": "Cauldron DEX",
     *       "url": "https://cauldron.quest/",
     *       "icons": [
     *           "http://app.cauldron.quest/cauldron.gif"
     *       ]
     * }
     * 
     */
    metadata: {}, // wallet connect session
    sessionId: Number,
    sessionTopic: String,
})
</script>

<style lang="scss" scoped>
.session-info-attribute-url {
  font-family: monospace;
  font-size: x-small;
}
.session-info-attribute {
  font-family: monospace;
  color: #ff6000;
  font-size: x-small;
}
</style>