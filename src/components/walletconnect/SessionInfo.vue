<template>
  <q-card :class=" flat ? 'session session-info-flat q-pa-sm': 'session session-info q-pa-sm'"  :flat="flat">
    <q-card-section style="padding-bottom: 0px">
      <div class="row justify-between items-center">
        <q-chip size="xs" dense style="background-color:inherit">
          <q-avatar class="q-mr-sm">
            <q-badge :color="sessionType==='proposal'? 'warning': 'green'"></q-badge>
          </q-avatar>
          <slot name="account"> 
            <span v-if="account" class="text-caption">
              {{ shortenAddressForDisplay(account.replace('bch:', '')) }}
            </span>
          </slot>
        </q-chip>
        <slot name="top-right">
            <!-- dummy if not slot is not used by parent -->
          <!-- <q-btn flat dense></q-btn> -->
        </slot>
      </div>
      <template v-if="sessionType==='proposal'">
          <PeerInfo :metadata="peerMetadata" :session-id="session.id" :session-topic="session.topic"> 
            <template v-slot:name> 
              <div class="row flex items-center">
                <span>{{ peerMetadata?.name || 'App'}} wants to connect. </span>
              </div>
            </template>
          </PeerInfo>
      </template>
      <template v-if="sessionType==='active'">
          <PeerInfo  :metadata="peerMetadata" :session-id="session.id" :session-topic="session.topic"/>
      </template>
      <template v-if="sessionType==='request'">
          <PeerInfo  :metadata="peerMetadata" :session-id="!hideSessionId && session?.id" :session-topic="!hideTopic && session?.topic"> 
            <template v-slot:name> 
              <div class="row items-center">
                <div v-if="session?.params?.request?.params?.userPrompt" class="text-bold col-auto">
                  {{ session?.params?.request?.params?.userPrompt || `Sign a ${method}`}} for {{session?.session?.peer?.metadata?.name || 'App'}}?
                </div>
                <div class="col q-mr-xs">
                  <q-icon name="notifications_active" color="warning" size="sm"></q-icon>
                </div>
              </div>
            </template>
            <template v-slot:url>
              <div class="row">
                <div class="col-12 text-light session-info-attribute-url">
                  Origin: <span style="word-break: break-all;">{{ session.verifyContext?.verified?.origin }}</span>
                </div>
                <div class="col-12 text-light session-info-attribute">
                  Method: {{ session.params?.request?.method }}
                </div>
                <div v-if="!hideSessionId" class="col-12 text-light session-info-attribute">
                  Sid: {{ session?.id}}
                </div>
                <div v-if="!hideTopic" class="col-12 text-light session-info-attribute">
                  Topic: {{session.session?.topic?.replace(session.session.topic.slice(3, session.session.topic.length - 6), '...') }}
                </div>
              </div>
            </template>
          </PeerInfo>
      </template>
    </q-card-section>
    <q-card-actions align="right" class="q-gutter-x-md" style="padding-top: 0px">
      <slot name="actions"></slot>
    </q-card-actions>
  </q-card>
</template>
<script setup>
import { ref, computed } from 'vue'
import PeerInfo from './PeerInfo.vue'
import { shortenAddressForDisplay } from '../../utils/address-utils'

const props = defineProps({
    sessionType: { type: String, required: true }, /* proposal | request | active */
    session: { type: Object, required: true}, // sessionProposal | sessionRequest | activeSession
    flat: { type: Boolean },
    hideSessionId: { type: Boolean },
    hideTopic: { type: Boolean },
})
const peerMetadata = computed(() => {
  if (props.sessionType === 'proposal') {
    return structuredClone(props.session.proposer.metadata)
  }
  if (props.sessionType === 'active') {
    return structuredClone(props.session.peer.metadata)
  }
  if (props.sessionType === 'request') {
    // props.session is a sessionRequest object 
    // and session is a property of the sessionRequest object
    return structuredClone(props.session.session.peer.metadata)
  }
  return {}
})

const account = computed(() => {
  // session 
  if (props.session?.namespaces?.bch?.accounts[0]) 
    return props.session?.namespaces?.bch?.accounts[0]
  // session request
  if (props.session?.session?.namespaces?.bch?.accounts[0]) 
    return props.session?.session?.namespaces?.bch?.accounts[0]
  
  return ''
})

</script>

<style lang="scss" scoped>
/* Inherit background and darken */
.q-card__section--vert {
  padding: 5px;
}

.session {
  background: inherit;
  position:relative;
  border-radius: 15px;
  font-family: monospace
}

.session-info:after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgb(0,0,0,0.25);
  border-radius: 15px;
}

.session-info-flat:after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgb(253,253,253, .023);
  border: 1px solid #80808038;
  border-radius: 15px;
}

.session-info-attribute {
  font-family: monospace;
  color: #ff6000;
  font-size: x-small;
}
.session-info-attribute-url {
  font-family: monospace;
  font-size: x-small;
}

</style>