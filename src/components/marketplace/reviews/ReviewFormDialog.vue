<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    position="bottom"
    :persistent="loading"
    @hide="onDialogHide"
  >
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="row no-wrap items-center justify-center">
          <div class="text-h6">{{ title }}</div>
          <q-space/>
          <q-btn
            flat
            padding="sm"
            icon="close"
            v-close-popup
          />
        </div>
        <q-form @submit="() => onSubmit()">
          <q-banner v-if="formErrors?.detail?.length" class="bg-red text-white rounded-borders q-mb-md">
            <div v-if="formErrors?.detail?.length === 1">
              {{ formErrors?.detail?.[0] }}
            </div>
            <ul v-else class="q-pl-md q-my-xs">
              <li v-for="(err, index) in formErrors?.detail" :key="index">{{err}}</li>
            </ul>
          </q-banner>
          <div class="row items-center justify-center q-mb-md">
            <q-rating
              max="5"
              :disable="loading"
              v-model="formData.rating"
              size="2rem"
              color="brandblue"
            />
          </div>
          <q-input
            dense
            outlined
            :disable="loading"
            autogrow
            label="Message"
            v-model="formData.text"
            type="textarea"
            input-style="min-height:4rem;"
            :error="Boolean(formErrors?.text)"
            :error-message="formErrors?.text"
            bottom-slots
          >
            <template v-slot:append>
              <q-btn
                flat
                :disable="loading"
                icon="camera_alt"
                padding="sm"
                class="q-mt-sm q-r-mr-md"
                @click="addPhoto"
              />
            </template>
          </q-input>

          <div class="row items-start q-gutter-md no-wrap q-mt-sm" style="overflow:auto;">
            <TransitionGroup name="slide-group">
              <div
                v-for="(image, index) in formData.images" :key="index"
                style="position:relative;"
              >
                <q-btn
                  flat
                  round
                  :disable="loading"
                  icon="close"
                  padding="none"
                  class="bg-red text-white"
                  size="1em"
                  style="position:absolute;top:0;right:0;transform:translate(50%, -50%);"
                  @click="() => formData.images = formData.images.filter(img => img !== image)"
                />
                <img
                  :src="image?.objectUrl || image"
                  style="max-height: 150px;"
                  class="rounded-borders"
                />
              </div>
            </TransitionGroup>
          </div>
          <div v-if="formErrors?.images" class="text-red text-caption bottom">
            {{ formErrors?.images }}
          </div>
          <q-btn
            :disable="loading"
            :loading="loading"
            no-caps label="Submit"
            color="brandblue"
            class="full-width q-mt-sm"
            type="submit"
          />
          <q-btn
            v-if="!hideCancelButton"
            outline
            :disable="loading"
            :loading="loading"
            no-caps label="Cancel"
            color="grey"
            class="full-width q-mt-sm"
            v-close-popup
          />
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { backend } from 'src/marketplace/backend'
import { Review } from 'src/marketplace/objects'
import { base64ImageToFile, dataUrlToFile, resizeImage } from 'src/marketplace/chat/attachment'
import { errorParser } from 'src/marketplace/utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Camera } from '@capacitor/camera'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { computed, defineComponent, onMounted, ref, watch } from 'vue'

export default defineComponent({
  name: 'ReviewFormDialog',
  emits: [
    'update:modelValue',
    'created',
    'updated:review',
    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,  
  ],
  props: {
    modelValue: Boolean,
    title: { type: String, default: 'Review' },
    review: Review,
    orderId: [Number, String],
    productId: [Number, String],
    hideCancelButton: Boolean,
  },
  setup(props, { emit: $emit }) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    const $q = useQuasar()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    const innerVal = ref(props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)

    onMounted(() => resetFormData())
    watch(() => [props.review?.id], () => resetFormData())
    const loading = ref(false)
    const formData = ref({
      rating: 0,
      text: '',
      images: [].map(el => el ? new File() : String(el)),
      // images: [
      //   'https://picsum.photos/200/300',
      //   'https://picsum.photos/400/300',
      //   'https://picsum.photos/1990/2100',
      // ]
    })

    watch(() => formData.value.images, (newVal, oldVal) => {
      if (!Array.isArray(oldVal)) return
      const isNewValArray = Array.isArray(newVal)

      oldVal
        .filter(val => !isNewValArray || newVal.includes(val))
        .forEach(URL.revokeObjectURL)
    })

    function resetFormData() {
      formData.value = {
        rating: parseFloat(props.review?.rating || 0) * (5 / 100),
        text: props.review?.text,
        images: Array.isArray(props.review?.imagesUrls)
          ? [...props.review?.imagesUrls]
          : [],
      }
    }

    const formErrors = ref({
      detail: [],
      text: '',
      images: '',
    })
    function resetFormErrors() {
      formErrors.value = {
        detail: [],
        rating: '',
        text: '',
        images: '',
      }
    }

    async function checkOrRequestCameraPermissions() {
      let permission = await Camera.checkPermissions()
      const promptStatuses = ['prompt','prompt-with-rationale', 'limited']
      const request = promptStatuses.includes(permission.photos) || promptStatuses.includes(permission.camera)
      if (request) permission = await Camera.requestPermissions()
      return {
        camera: permission.camera === 'granted',
        photos: permission.photos === 'photos',
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
      })
        .then(async (photo) => {
          let file
          if (photo?.base64String) file = base64ImageToFile(photo?.base64String)
          else if (photo?.dataUrl) file = dataUrlToFile(photo?.dataUrl)
          if (!file) return

          const resized = await resizeImage({ file, maxWidthHeight: 640 })
          resized.objectUrl = URL.createObjectURL(resized)
          return resized
        })
    }

    function addPhoto(evt) {
      return getPhotoFromCamera()
        .then(file => {
          formData.value.images.push(file)
          return file
        })
    }

    function serializeFormData() {
      const RATING_MUTIPLIER = 100 / 5 // backend has 0-100 scoring while form has 0-5
      const hasFile = formData.value.images.some(val => val instanceof File)
      if (hasFile) {
        const data = new FormData()
        if (props.productId) data.set('product_id', props.productId)
        if (props.orderId) data.set('order_id', props.orderId)

        data.set('rating', formData.value.rating * RATING_MUTIPLIER) 
        data.set('text', formData.value.text)

        const files = formData.value.images.filter(val => val instanceof File)
        const imageUrls = formData.value.images.filter(val => typeof val === 'string')
        files.forEach((file, index) => data.set(`upload_images[${index}]`, file))
        if (imageUrls?.length) {
          imageUrls.forEach((imageUrl, index) => data.set(`upload_image_urls[${index}]`, imageUrl))
        }
        return data
      }

      return {
        product_id: props.productId,
        order_id: props.orderId,
        rating: formData.value.rating * RATING_MUTIPLIER,
        text: formData.value.text,
        upload_image_urls: formData.value.images.filter(val => typeof val === 'string'),
      }
    }

    function onSubmit() {
      const data = serializeFormData()
      let signData
      if (data instanceof FormData) {
        signData = Date.now().toString(16).padStart(64, '0')
      }
      const reviewId = props?.review?.id
      loading.value = true
      const request = reviewId
        ? backend.patch(`reviews/${reviewId}/`, data, { signData })
        : backend.post(`reviews/`, data, { signData })
      return request
        .finally(() => resetFormErrors())
        .then(response => {
          const reviewObj = Review.parse(response?.data)
          if (reviewId) $emit('updated:review', reviewObj)
          else $emit('created', reviewObj)
          onDialogOK(reviewObj)
          return response
        })
        .catch(error => {
          console.error(error)
          const data = error?.response?.data
          formErrors.value.detail = errorParser.toArray(data?.non_field_errors)
          formErrors.value.rating = errorParser.firstElementOrValue(data?.rating)
          formErrors.value.text = errorParser.firstElementOrValue(data?.text)
          formErrors.value.images = errorParser.firstElementOrValue(data?.upload_images) ||
                                  errorParser.firstElementOrValue(data?.upload_image_urls)

          if (!formErrors.value.detail?.length) {
            if (Array.isArray(data)) formErrors.value.detail = data
            if (data?.detail) formErrors.value.detail = [data?.detail]
          }
          if (!formErrors.value.detail?.length) formErrors.value.detail = [
            'Unable to create review'
          ]
        })
        .finally(() => {
          loading.value = false
        })
    }

    return {
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      darkMode,
      innerVal,

      loading,
      formData,
      formErrors,

      addPhoto,

      onSubmit,

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
<style scoped>
.slide-group-enter-active,
.slide-group-enter-active {
  transition: all 0.5s ease-out;
}
.slide-group-enter-from {
  opacity: 0;
}
.slide-group-leave-to {
  opacity: 0;
}
</style>
