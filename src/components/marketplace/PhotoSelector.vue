<template>
  <div>
    <q-file
      v-show="false"
      ref="fileAttachmentField"
      borderless
      :model-value="null"
      accept="image/*"
      :filter="files => files.filter(file => file.type?.match(/image\/.*/))"
      @update:model-value="attemptResize"
    />
    <slot v-bind="{ innerVal, selectPhoto }"></slot>
  </div>
</template>
<script>
import { nativeFileAPI } from 'src/utils/native-file'
import { base64ImageToFile, dataUrlToFile, resizeImage } from 'src/marketplace/chat/attachment'
import { Camera } from '@capacitor/camera'
import { useQuasar } from 'quasar'
import { defineComponent, ref, watch, computed } from 'vue'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'


export default defineComponent({
  name: 'PhotoSelector',
  emits: [
    'update:modelValue',
  ],
  props: {
    modelValue: [String, nativeFileAPI.File],
  },
  setup(props, { emit: $emit }) {
    const $q = useQuasar()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    const innerVal = ref(props?.modelValue)
    watch(() => props.modelValue, () => innerVal.value = props.modelValue)
    watch(innerVal, (newVal, oldVal) => {
      $emit('update:modelValue', innerVal.value)
      if (oldVal instanceof nativeFileAPI.File) URL.revokeObjectURL(oldVal)
      if (newVal instanceof nativeFileAPI.File) newVal.objectUrl = URL.createObjectURL(newVal)
    })

    const fileAttachmentField = ref()
    function openFileAttachementField(evt) {
      if (!fileAttachmentField.value?.pickFiles) {
        $q.dialog({
          title: 'Unable to access photo selector',
          color: 'brandblue',
        })
      }
      fileAttachmentField.value?.pickFiles?.(evt)
    }

    async function attemptResize(file) {
      const isFile = file instanceof File
      if (!isFile) return
      innerVal.value = await resizeImage({
        file: file,
        maxWidthHeight: 640, // based on recommended dimensions for mobile
      })
    }

    async function checkOrRequestCameraPermissions() {
      let permission = await Camera.checkPermissions()
      const promptStatuses = ['prompt','prompt-with-rationale', 'limited']
      const request = promptStatuses.includes(permission.photos) || promptStatuses.includes(permission.camera)
      if (request) permission = await Camera.requestPermissions()
      return {
        camera: permission.camera === 'granted',
        photos: permission.photos === 'granted' || permission.photos === 'limited',
      }
    }

    async function getPhotoFromCamera() {
      const granted = await checkOrRequestCameraPermissions()
      if (!granted.camera && !granted.photos) {
        $q.dialog({
          title: 'Select photo', message: 'Permission denied',
          color: 'brandblue',
          class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
        })
        return Promise.reject(new Error('Permission Denied'))
      }
      return Camera.getPhoto({
        presentationStyle: 'popover',
        resultType: 'dataUrl',
        source: 'PROMPT', // This will show both camera and gallery options
      })
        .then(async (photo) => {
          let file
          if (photo?.base64String) file = base64ImageToFile(photo?.base64String)
          else if (photo?.dataUrl) file = dataUrlToFile(photo?.dataUrl)
          if (!file) return photo
          const resized = await resizeImage({ file, maxWidthHeight: 640 })
          innerVal.value = resized
          return photo
        })
    }

    function selectPhoto(evt) {
      return getPhotoFromCamera()
        .catch(error => {
          console.error(error)
          let errorMsg = error?.message
          if (typeof errorMsg !== 'string') return Promise.reject(error)
          if (errorMsg?.includes('cancel')) return Promise.resolve()
          if (errorMsg.match(/user.*denied.*access/i)) {
            openFileAttachementField(evt)
            return Promise.resolve()
          }
          if (errorMsg?.length < 250) return Promise.reject(error)
          $q.dialog({
            title: 'Select photo',
            message: errorMsg || 'Unknown error occurred',
            color: 'brandblue',
            class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
          })
        })
    }

    return {
      innerVal,
      fileAttachmentField,
      openFileAttachementField,
      attemptResize,
      selectPhoto,
      darkMode,
      getDarkModeClass,
    } 
  },
})
</script>
<style>
pwa-camera-modal-instance {
  z-index: 10000
}
</style>
