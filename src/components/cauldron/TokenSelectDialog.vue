<template>
  <q-dialog ref="dialogRef" v-model="innerVal" @hide="onDialogHide" full-width seamless>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-pl-md q-pt-sm">
        <div class="text-subtitle1 q-space">{{ $t('SelectToken') }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section>
        <q-input
          dense
          outlined
          v-model="searchQuery"
          rounded
          :placeholder="$t('SearchTokens')"
          @update:model-value="debouncedFetchTokens"
        >
          <template v-slot:append>
            <q-icon name="search" color="grey-5" />
          </template>
        </q-input>
      </q-card-section>
      <q-card-section class="q-pt-none" style="max-height:50vh;overflow-y:auto;">
        <q-slide-transition>
          <div v-if="fetchingTokens" class="text-center q-mb-md">
            {{ $t('FetchingTokens') }}
            <q-spinner size="1.5em" color="primary"/>
          </div>
        </q-slide-transition>
        <q-list>
          <q-item
            v-for="token in tokensList"
            :key="token.token_id"
            clickable
            @click="handleSelectToken(token)"
          >
            <q-item-section avatar>
              <img
                v-if="token?.bcmr?.uris?.icon"
                :src="getTokenImage(token.bcmr.uris.icon)"
                height="30"
                @error="onImgError"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ token?.bcmr?.token?.symbol || $t('Unknown') }}</q-item-label>
              <q-item-label caption>{{ token?.bcmr?.name || '' }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item-label v-if="!searchQuery && tokensList?.length" class="text-caption text-center text-grey">
            {{ $t('CauldronTokenSelectSearchSuggestion') }}
          </q-item-label>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { fetchTokensList } from 'src/wallet/cauldron/tokens';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useCauldronValueFormatters } from 'src/composables/cauldron/ui-helpers';
import { debounce, useDialogPluginComponent } from 'quasar';
import { defineComponent, ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';

export default defineComponent({
  name: 'TokenSelectDialog',
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
  },
  emits: [
    'update:modelValue',
    'select-token',
    ...useDialogPluginComponent.emits,
  ],
  setup(props, { emit }) {
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus']);

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue);
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => emit('update:modelValue', innerVal.value))

    /** @type {import("vue").Ref<import("src/wallet/cauldron/tokens").CauldronTokenData[]>} */
    const tokensList = ref([]);
    const fetchingTokens = ref(false);
    const searchQuery = ref('');
    const tokensFilterOpts = ref({
      by: 'score',
      order: 'desc',
      q: '',
    });

    async function fetchTokens(opts = { limit: 20, offset: 0 }) {
      fetchingTokens.value = true;
      const filterOpts = Object.assign({}, tokensFilterOpts.value, {
        limit: opts?.limit || 20,
        offset: opts?.offset || undefined,
      });

      return fetchTokensList(filterOpts)
        .then((tokens) => {
          tokensList.value = tokens;
          tokensFilterOpts.value.q = filterOpts.q;
        })
        .finally(() => {
          fetchingTokens.value = false;
        });
    }

    const debouncedFetchTokens = debounce(() => {
      tokensFilterOpts.value.q = searchQuery.value;
      fetchTokens();
    }, 500);

    const {
      getTokenImage,
      onImgError,
    } = useCauldronValueFormatters();

    function handleSelectToken(token) {
      emit('select-token', token);
      emit('update:modelValue', false);
      // Reset search when token is selected
      searchQuery.value = '';
      tokensFilterOpts.value.q = '';
    }

    // Fetch tokens when dialog opens
    watch(() => props.modelValue, (isOpen) => {
      if (isOpen) {
        searchQuery.value = '';
        tokensFilterOpts.value.q = '';
        fetchTokens();
      }
    });

    // Initial fetch on mount
    onMounted(() => {
      if (props.modelValue) {
        fetchTokens();
      }
    });

    return {
      darkMode,
      innerVal,
      dialogRef,
      onDialogHide,
      onDialogOK,
      onDialogCancel,
      getTokenImage,
      onImgError,
      handleSelectToken,
      tokensList,
      fetchingTokens,
      fetchTokens,
      searchQuery,
      debouncedFetchTokens,
      getDarkModeClass,
    };
  },
});
</script>

