<template>
    <q-dialog v-model="showDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="orange" text-color="white" size="56px"/>
          <div class="col q-ml-md">
            <div class="text-h6">Resume Card Creation?</div>
            <div class="text-subtitle2">We noticed you have an unfinished card creation process. Would you like to resume where you left off?</div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="No, Start Over" color="primary" @click="onDeleteAttempt"/>
          <q-btn flat label="Yes, Resume" color="primary" @click="onResumeAttempt"/>
        </q-card-actions>
      </q-card>

    </q-dialog>
</template>
<script>
export default {
  name: 'ResumeCreateCardDialog',
  emits: ['resumeAttempt', 'deleteAttempt'],
  data() {
    return {
        showDialog: true
    }
  },
  methods: {
    onResumeAttempt() {
      this.$emit('resumeAttempt');
    },
    onDeleteAttempt() {
      this.$emit('deleteAttempt');
    }
  }
}
</script>