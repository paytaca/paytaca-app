<template>
  <q-dialog ref="dialogRef" v-model="innerVal" position="bottom" @hide="onDialogHide" full-height>
    <q-card class="pt-card text-bow bottom-card" :class="getDarkModeClass(darkMode)" style="min-width:min(500px, 75vw);">
      <q-card-section>
        <div class="row items-center">
          <div class="text-h6 q-space">
            {{ $t('Reviews') }}
            <template v-if="reviewsPagination?.count">
              ({{ reviewsPagination?.count }})
            </template>
          </div>
          <q-btn flat icon="close" padding="sm" class="float-right" v-close-popup/>
        </div>
        <div class="row items-center justify-end">
          <LimitOffsetPagination
            :pagination-props="{
              maxPages: 5,
              round: true,
              padding: 'xs',
              boundaryNumbers: true,
              disable: fetchingReviews,
            }"
            class="q-my-sm"
            :hide-below-pages="2"
            :modelValue="reviewsPagination"
            @update:modelValue="fetchReviews"
          />
        </div>
        <q-linear-progress v-if="fetchingReviews" query reverse rounded color="pt-primary"/>
        <div v-else class="q-mb-xs"></div>
        <ReviewsListPanel
          :reviews="reviews"
          style="max-height:calc(75vh - 9rem);overflow-y:auto;"
        />
        <slot name="bottom"></slot>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { backend } from 'src/marketplace/backend'
import { Review } from 'src/marketplace/objects'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { debounce, useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex'
import { defineComponent, onMounted, ref, computed, watch } from 'vue'
import ReviewsListPanel from 'src/components/marketplace/reviews/ReviewsListPanel.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'


export default defineComponent({
  name: 'ReviewsListDialog',
  components: {
    ReviewsListPanel,
    LimitOffsetPagination, 
  },
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    productId: [Number, String],
    orderId: [Number, String],
    storefrontId: [Number, String],
  },
  setup(props, { emit: $emit }) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    const innerVal = ref(props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)

    onMounted(() => fetchReviews())
    watch(() => [props?.productId, props?.orderId, props?.storefrontId], () => fetchReviews())

    const fetchingReviews = ref(false)
    const reviewsPagination = ref({ count: 0, limit: 0, offset: 0})
    const reviews = ref([].map(Review.parse))
    
    const fetchReviews = debounce((opts={ limit: 0, offset: 0 }) => {
      const params = {
        limit: opts?.limit || 10,
        offset: opts?.offset || undefined,
        product_id: props?.productId || undefined,
        order_id: props?.orderId || undefined,
        order__storefront_id: props?.storefrontId || undefined,
      }

      fetchingReviews.value = true
      return backend.get(`reviews/`, { params })
        .then(response => {
          reviews.value = response?.data?.results?.map(Review.parse)
          reviewsPagination.value.count = response?.data?.count
          reviewsPagination.value.limit = response?.data?.limit
          reviewsPagination.value.offset = response?.data?.offset
          return response
        })
        .finally(() => {
          fetchingReviews.value = false
        })
    }, 250)

    return {
      fetchingReviews,
      reviewsPagination,
      reviews,
      fetchReviews,

      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      darkMode,
      innerVal,

      getDarkModeClass,
    }
  },
})
</script>
