<template>
  <q-dialog
    v-model="innerVal"
    ref="dialogRef"
    @hide="onDialogHide"
    position="bottom"
    :persistent="loading"
    full-height
  >
    <q-card
      class="dialog-content-base"
      :class="darkMode ? 'text-white pt-card-3' : 'text-black'"
      style="max-height:75vh !important;"
    >
      <div class="row items-center no-wrap dialog-content-header">
        <div class="text-h6">{{ $t('Profile') }}</div>
        <q-space/>
        <q-btn v-close-popup flat icon="close" class="q-r-mr-sm"/>
      </div>
      <q-card-section class="q-pt-none">
        <q-form @submit="() => onSubmit()">
          <PhotoSelector v-model="formData.profilePicture" v-slot="{ selectPhoto }">
            <div v-if="formData?.profilePicture" class="row items-center justify-center q-mb-sm">
              <img
                :src="formData.profilePicture?.objectUrl || formData?.profilePicture"
                style="max-height:200px;max-width:100%;object-fit: contain;"
              />
              <q-menu touch-position>
                <q-item :disable="loading" clickable v-close-popup @click="() => formData.profilePicture = ''">
                  <q-item-section>
                    <q-item-label>{{ $t('RemoveImage') }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item :disable="loading" clickable v-close-popup @click="selectPhoto">
                  <q-item-section>
                    <q-item-label>{{ $t('ReplaceImage') }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-menu>
            </div>
            <q-btn
              v-else
              flat
              no-caps
              :disable="loading"
              :label="$t('SelectImage')"
              class="q-mb-sm"
              @click="selectPhoto"
            />
          </PhotoSelector>
          <q-input
            dense
            outlined
            :disable="loading"
            :label="$t('FirstName')"
            v-model="formData.firstName"
            :maxlength="40"
            :error="Boolean(formErrors?.firstName)"
            :error-message="formErrors?.firstName"
          />
          <q-input
            dense
            outlined
            :disable="loading"
            :label="$t('LastName')"
            v-model="formData.lastName"
            :maxlength="40"
            :error="Boolean(formErrors?.lastName)"
            :error-message="formErrors?.lastName"
          />
          <q-input
            dense
            outlined
            :disable="loading"
            :label="$t('PhoneNumber')"
            v-model="formData.phoneNumber"
            :maxlength="20"
            :error="Boolean(formErrors?.phoneNumber)"
            :error-message="formErrors?.phoneNumber"
          />

          <q-btn
            no-caps
            :disable="loading"
            :loading="loading"
            :label="$t('Save')"
            type="submit"
            color="brandblue"
            class="full-width"
          />
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { User } from 'src/marketplace/objects'
import { useDialogPluginComponent } from 'quasar'
import { arbiterBackend } from 'src/marketplace/arbiter'
import { useStore } from 'vuex'
import { computed, defineComponent, onMounted, ref, watch } from 'vue'
import { nativeFileAPI } from 'src/utils/native-file'
import PhotoSelector from 'src/components/marketplace/PhotoSelector.vue'
import { errorParser } from 'src/marketplace/utils'

export default defineComponent({
  name: 'ArbiterProfileFormDialog',
  components: {
    PhotoSelector,
  },
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    user: User,
    emitSubmit: Boolean,
    customBackend: { required: false, default: () => arbiterBackend },
  },
  setup(props, { emit: $emit }) {
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()

    const innerVal = ref(props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))
    watch(() => props.modelValue, () => innerVal.value = props.modelValue)

    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    onMounted(() => resetFormData())
    const loading = ref(false)
    const formData = ref({
      profilePicture: [].map(el => el ? String() : new nativeFileAPI.File())[0],
      firstName: '',
      lastName: '',
      phoneNumber: '',
    })

    function resetFormData() {
      formData.value = {
        profilePicture: props.user?.profilePictureUrl,
        firstName: props.user?.firstName,
        lastName: props.user?.lastName,
        phoneNumber: props.user?.phoneNumber,
      }
    }

    const emptyFormErrors = () => ({
      detail: [],
      profilePicture: '',
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
    })

    const formErrors = ref(emptyFormErrors())
    function clearFormErrors() {
      formErrors.value = emptyFormErrors()
    }

    async function defaultOnSubmit() {
      console.log('Submitting')
      let data
      if (formData.value.profilePicture instanceof File) {
        data = new FormData()
        data.set('profile_picture', formData.value.profilePicture)
        data.set('first_name', formData.value.firstName)
        data.set('last_name', formData.value.lastName)
        data.set('phone_number', formData.value.phoneNumber)
      } else {
        data = {
          profile_picture_url: (typeof formData.value.profilePicture === 'string')
            ? formData.value.profilePicture
            : undefined,
          first_name: formData.value.firstName,
          last_name: formData.value.lastName,
          phone_number: formData.value.phoneNumber,
        }
        if (data.profile_picture_url === props?.user?.profilePictureUrl) {
          data.profile_picture_url = undefined
        }
        if (typeof data.profile_picture_url === 'string' && data?.profile_picture_url?.length <= 0) {
          data.profile_picture_url = undefined
          data.profile_picture = null
        }
      }

      loading.value = true
      return props.customBackend.patch(`users/${props?.user?.id}/`, data)
        .finally(() => clearFormErrors())
        .then(response => {
          if (props?.user?.id && response?.data?.id == props?.user?.id) {
            props.user.raw = response?.data
          }
          onDialogOK(User.parse(response?.data))
          return response
        })
        .catch(error => {
          const data = error?.response?.data
          formErrors.value.detail = errorParser.toArray(data?.non_field_errors)
          formErrors.value.profilePicture = errorParser.firstElementOrValue(data?.profile_picture) || 
                                    errorParser.firstElementOrValue(data?.profile_picture_url)
          formErrors.value.firstName = errorParser.firstElementOrValue(data?.first_name)
          formErrors.value.lastName = errorParser.firstElementOrValue(data?.last_name)
          formErrors.value.email = errorParser.firstElementOrValue(data?.email)
          formErrors.value.phoneNumber = errorParser.firstElementOrValue(data?.phone_number)
        })
        .finally(() => {
          loading.value = false
        })
    }

    function onSubmit() {
      console.log(props.emitSubmit)
      if (props.emitSubmit) {
        onDialogOK(Object.assign({}, formData.value))
        return
      }
      return defaultOnSubmit()
    }


    return {
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,
      darkMode,

      loading,
      formData,
      formErrors,
      onSubmit,
    }
  },
})
</script>
<style lang="scss" scoped>

.dialog-content-base {
  overflow: auto;
  background-color: white;
}

.dialog-content-base .dialog-content-header {
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 100;
  background-color: inherit;
  padding: map-get($space-md, 'y') map-get($space-md, 'x');
}

body.body--dark .dialog-content-base {
  background-color: $dark;
}
</style>
