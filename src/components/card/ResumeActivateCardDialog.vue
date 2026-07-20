<template>
    <q-dialog v-model="showDialog" persistent>
      <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="border-radius: 24px;">
        <q-card-section class="q-pa-lg row items-center">
          <q-avatar icon="warning" color="orange" text-color="white" size="56px"/>
          <div class="col q-ml-md">
            <div class="text-h6 text-weight-bold" :class="textColor">Resume Card Activation?</div>
            <div class="text-subtitle2" :class="textColorGrey">We noticed you have an unfinished card activation process. Would you like to resume where you left off?</div>
          </div>
          <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="onCancelAttempt" class="absolute-top-right q-mt-sm q-mr-sm" />
        </q-card-section>

        <q-card-actions align="center" class="q-pb-lg q-px-lg">
          <q-btn flat label="Cancel" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" rounded @click="onCancelAttempt"/>
          <q-btn flat label="No, Discard it" color="primary" rounded @click="onDeleteAttempt"/>
          <q-btn unelevated label="Yes, Resume" color="primary" class="bg-grad text-white" rounded @click="onResumeAttempt"/>
        </q-card-actions>
      </q-card>

    </q-dialog>
</template>
<script>
export default {
  name: 'ResumeActivateCardDialog',
  emits: ['resumeAttempt', 'deleteAttempt', 'cancelAttempt'],
  data() {
    return {
        showDialog: true
    }
  },
  computed: {
    textColor() {
      return this.$q.dark.isActive ? 'text-white' : 'text-black'
    },
    textColorGrey() {
      return this.$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'
    }
  },
  methods: {
    onResumeAttempt() {
      this.$emit('resumeAttempt');
    },
    onDeleteAttempt() {
      this.$emit('deleteAttempt');
    },
    onCancelAttempt() {
      this.$emit('cancelAttempt');
    }
  }
}
</script>