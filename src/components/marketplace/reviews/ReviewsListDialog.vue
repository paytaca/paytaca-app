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
        <q-linear-progress v-if="fetchingReviews && !fetchingMoreReviews" query reverse rounded color="pt-primary"/>
        <div v-else class="q-mb-xs"></div>
        <div ref="reviewsScrollContainer" style="max-height:calc(75vh - 9rem);overflow-y:auto;" @scroll="onScroll">
          <ReviewsListPanel
            :reviews="reviews"
          />
          
          <!-- Infinite scroll loading indicator -->
          <div v-if="fetchingMoreReviews" class="row justify-center q-py-md">
            <q-spinner size="2em" color="pt-primary1"/>
          </div>
          
          <!-- Scroll sentinel for infinite loading -->
          <div ref="reviewScrollSentinel" style="height: 1px; width: 100%;"></div>
        </div>
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
import { defineComponent, onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue'
import ReviewsListPanel from 'src/components/marketplace/reviews/ReviewsListPanel.vue'


export default defineComponent({
  name: 'ReviewsListDialog',
  components: {
    ReviewsListPanel,
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

    onMounted(() => fetchReviews({ reset: true }))
    watch(() => [props?.productId, props?.orderId, props?.storefrontId], () => fetchReviews({ reset: true }))

    const fetchingReviews = ref(false)
    const fetchingMoreReviews = ref(false)
    const reviewsPagination = ref({ count: 0, limit: 0, offset: 0})
    const reviews = ref([].map(Review.parse))
    const reviewsScrollContainer = ref(null)
    const reviewScrollSentinel = ref(null)
    
    const fetchReviews = debounce((opts={ limit: 0, offset: 0, reset: false }) => {
      // If resetting, clear the list
      if (opts.reset) {
        reviews.value = []
        reviewsPagination.value = { count: 0, limit: 0, offset: 0 }
      }

      const params = {
        limit: opts?.limit || 10,
        offset: opts?.offset !== undefined ? opts?.offset : reviewsPagination.value.offset,
        product_id: props?.productId || undefined,
        order_id: props?.orderId || undefined,
        order__storefront_id: props?.storefrontId || undefined,
      }

      const isLoadingMore = params.offset > 0
      if (isLoadingMore) {
        fetchingMoreReviews.value = true
      } else {
        fetchingReviews.value = true
      }

      return backend.get(`reviews/`, { params })
        .then(response => {
          const newReviews = response?.data?.results?.map(Review.parse)
          
          // Append to existing list if loading more, otherwise replace
          if (isLoadingMore) {
            reviews.value = [...reviews.value, ...newReviews]
          } else {
            reviews.value = newReviews
          }
          
          reviewsPagination.value.count = response?.data?.count
          reviewsPagination.value.limit = response?.data?.limit
          reviewsPagination.value.offset = response?.data?.offset + response?.data?.results.length
          
          // Set up infinite scroll observer after initial data is loaded
          if (!isLoadingMore && response?.data?.results.length > 0) {
            setupReviewInfiniteScroll()
          }
          
          return response
        })
        .finally(() => {
          fetchingReviews.value = false
          fetchingMoreReviews.value = false
        })
        .then((response) => {
          // After loading completes and loading states are cleared, check again if we need more
          if (response?.data?.results.length > 0) {
            checkAndLoadMoreReviews()
          }
        })
    }, 250)

    // Infinite scroll setup for reviews
    let reviewObserver = null
    let reviewScrollListenerCleanup = null

    function onScroll(event) {
      if (fetchingReviews.value || fetchingMoreReviews.value) return
      
      const hasMore = reviews.value.length < reviewsPagination.value.count
      if (!hasMore) return
      
      const element = event?.target
      if (!element) return
      
      const scrollTop = element.scrollTop
      const scrollHeight = element.scrollHeight
      const clientHeight = element.clientHeight
      
      const scrollBottom = scrollHeight - scrollTop - clientHeight
      
      // Load more when user is within 300px of the bottom
      if (scrollBottom < 300) {
        fetchReviews({ offset: reviewsPagination.value.offset })
      }
    }

    function setupReviewInfiniteScroll() {
      // Clean up existing observer and listeners
      if (reviewObserver) {
        reviewObserver.disconnect()
      }
      if (reviewScrollListenerCleanup) {
        reviewScrollListenerCleanup()
        reviewScrollListenerCleanup = null
      }
      
      nextTick(() => {
        if (!reviewScrollSentinel.value) return
        
        const scrollRoot = reviewsScrollContainer.value
        
        let initialIntersectionHandled = false
        
        const options = {
          root: scrollRoot,
          rootMargin: '200px',
          threshold: 0.1
        }
        
        reviewObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0]
            
            // On first callback, just record the state and skip action
            if (!initialIntersectionHandled) {
              initialIntersectionHandled = true
              // If it's not initially intersecting, we're good to process next time
              if (!entry.isIntersecting) {
                return
              }
              // If it IS initially intersecting, skip this one but process the next
              return
            }
            
            if (entry.isIntersecting && !fetchingReviews.value && !fetchingMoreReviews.value) {
              // Check if there are more items to load
              const hasMore = reviews.value.length < reviewsPagination.value.count
              if (hasMore) {
                fetchReviews({ offset: reviewsPagination.value.offset })
              }
            }
          },
          options
        )
        reviewObserver.observe(reviewScrollSentinel.value)
      })
    }

    onUnmounted(() => {
      if (reviewObserver) {
        reviewObserver.disconnect()
      }
      if (reviewScrollListenerCleanup) {
        reviewScrollListenerCleanup()
      }
    })

    // Check if sentinel is visible and load more if needed
    function checkAndLoadMoreReviews() {
      // Wait a bit for DOM to update
      setTimeout(() => {
        if (!reviewScrollSentinel.value) return
        if (fetchingReviews.value || fetchingMoreReviews.value) return
        
        const hasMore = reviews.value.length < reviewsPagination.value.count
        if (!hasMore) return
        
        const scrollContainer = reviewsScrollContainer.value
        if (!scrollContainer) return
        
        const rect = reviewScrollSentinel.value.getBoundingClientRect()
        const containerRect = scrollContainer.getBoundingClientRect()
        
        // Check if sentinel is visible within the scroll container
        const isVisible = rect.top < containerRect.bottom && rect.bottom >= containerRect.top
        
        // If sentinel is visible, load more items
        if (isVisible) {
          fetchReviews({ offset: reviewsPagination.value.offset })
        }
      }, 100)
    }

    return {
      fetchingReviews,
      fetchingMoreReviews,
      reviewsPagination,
      reviews,
      reviewsScrollContainer,
      reviewScrollSentinel,
      fetchReviews,
      onScroll,

      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      darkMode,
      innerVal,

      getDarkModeClass,
    }
  },
})
</script>
