<template>
  <div class="row q-py-sm q-px-md">
    <div class="row col-12">
      <span class="row col-11 q-mb-sm text-bold" style="font-size: 17px;">
        {{ title }}
      </span>
      <div class="row col-1 justify-end">
        <q-icon
          v-if="!is_read"
          name="circle"
          color="red-5"
          class="q-mt-sm"
        />
      </div>
    </div>
    <span class="col-12">
      {{ message.substring(0, 150) }}
      <template v-if="message.length >= 150">...</template>
    </span>
    <span
      class="col-12 q-mt-xs text-caption"
      align="right"
      style="color: gray;"
    >
      {{ notif_type }} | {{ date_posted }}
    </span>
  </div>
</template>

<script>
export default {
  name: 'NotificationBody',

  props: {
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    notif_type: { type: String, default: '' },
    date_posted: { type: String, default: '' },
    is_read: { type: Boolean, default: false }
  }
}
</script>
