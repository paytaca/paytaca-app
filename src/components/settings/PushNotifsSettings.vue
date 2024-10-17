<template>
  <div class="col-12 q-px-lg q-mt-md">
    <p class="q-px-sm q-my-sm dim-text section-title text-h6">Push Notifications</p>
    <q-list bordered separator class="pt-card" :class="getDarkModeClass(darkMode)">
      <q-item>
        <q-item-section>
          <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
            Enable Push Notifications
          </q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-toggle
            v-model="enablePushNotifs"
            color="blue-9"
            keep-color
          />
        </q-item-section>
      </q-item>

      <template v-if="enablePushNotifs">
        <q-item
          v-for="(item, index) in notifsList"
          :key="`${item}-${index}`"
        >
          <q-item-section>
            <q-item-label class="q-pl-md pt-setting-menu" :class="getDarkModeClass(darkMode)">
              {{ item.label }}
            </q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle
              v-model="item.isEnabled"
              color="blue-9"
              keep-color
            />
          </q-item-section>
        </q-item>
      </template>
    </q-list>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'PushNotifsSettings',

  data () {
    return {
      enablePushNotifs: false,
      notifsList: [
        {
          label: 'Promotions',
          isEnabled: false
        },
        {
          label: 'Events',
          isEnabled: false
        },
        {
          label: 'Transactions',
          isEnabled: false
        },
        {
          label: 'Cashbacks',
          isEnabled: false
        },
        {
          label: 'Marketplace',
          isEnabled: false
        },
        {
          label: 'P2P Exchange',
          isEnabled: false
        }
      ]
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass
  }
}
</script>
