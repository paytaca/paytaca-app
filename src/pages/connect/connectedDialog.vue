<template>
  <div id="connected-dialog pt-card-3 text-bow" :class="getDarkModeClass(darkMode)">
    <div style="display: flex; justify-content: center; margin-top: 5px;">{{$t('ConectedAddresses')}}</div>
    <q-dialog ref="dialog" @hide="hide" persistent seamless>
      <q-card ref="card" style="padding: 20px 10px 5px 0;" class="pp-text br-15 pt-card" :class="getDarkModeClass(darkMode)">
        <div class="connected-dialog-header">
          <q-btn icon="close" flat round dense v-close-popup class="close-button" />
        </div>
        <div class="text-h6 text-center text-bow" :class="getDarkModeClass(darkMode)" v-text="origin"></div>
        <div class="text-center text-bow" :class="getDarkModeClass(darkMode)" v-if="connectedAddresses.length">
          {{
            $t(
              'ConnectedAddressesToSite',
              { count: connectedAddress.length },
              `You have ${connectedAddresses.length} addresses connected to this site.`
            )
          }}
        </div>
        <div class="text-center text-bow" :class="getDarkModeClass(darkMode)" style="margin: 10px" v-else>
          {{ $t('YouArentConnectedToSite') }}
        </div>

        <q-card-section
          v-for="(address, index) in connectedAddresses"
          class="amount q-pb-none"
          style="padding-right: 0px; padding-top: 8px;"
        >
          <q-item class="q-px-none">
            <q-item-section side avatar class="logo">
              <q-avatar>
                <img :src="addressLogo(address)" height="30" alt=""/>
              </q-avatar>
            </q-item-section>
            <q-item-section class="address-section pt-label" :class="getDarkModeClass(darkMode)">
              <div>{{ address.split(':')[1] }}</div>
              <div v-if="address == activeAddress" style="color: grey">{{$t('Active')}}</div>
              <div
                v-else
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                style="font-weight: 400"
                @click="switchAddress(address)"
              >
              {{$t('SwitchAddresses')}}
              </div>
            </q-item-section>
            <q-item-section side class="pt-label" :class="getDarkModeClass(darkMode)" style="padding-left: 4px">
              <q-btn
                style="width: 1px"
                icon="eject"
                flat
                round
                dense
                :color="darkMode ? 'grey' : ''"
                @click="disconnectAddress(address)"
              />
            </q-item-section>
          </q-item>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'connected-dialog',
  props: {
    hideCallback: {
      type: Function
    }
  },
  data () {
    return {
      origin: "",
      connectedAddresses: [],
      activeAddress: ""
    }
  },
  mounted () {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
      const url = tabs[0].url;
      if (url) {
        this.origin = url.split('/')[2];
        this.fetchAddressInfo();
      }
    });
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getDarkModeClass,
    async switchAddress (address) {
      const network = this.$store.getters['global/network'].toLowerCase();
      const connectedAddresses = this.$store.getters['global/getConnectedSites'](network)[this.origin] || {};
      const addressIndex = connectedAddresses[address];
      this.$store.commit('global/setConnectedAddress', {
        type: network,
        connectedAddress: address,
        newConnectedAddressIndex: addressIndex
      });
      this.activeAddress = address;
      this.$q.bex.send('background.paytaca.addressChanged', {
        address: address
      });
    },
    disconnectAddress (address) {
      const network = this.$store.getters['global/network'].toLowerCase();
      const connectedSites = {...this.$store.getters['global/getConnectedSites'](network)};
      const connectedAddresses = {...connectedSites[this.origin] || {}};

      let newConnectedAddress = undefined;
      let newConnectedAddressIndex = undefined;

      delete connectedAddresses[address];
      if (Object.keys(connectedAddresses).length === 0) {
        delete connectedSites[this.origin];
      } else {
        newConnectedAddress = Object.keys(connectedAddresses)[0];
        newConnectedAddressIndex = newConnectedAddress ? connectedSites[newConnectedAddress] : undefined;
        connectedSites[this.origin] = connectedAddresses;
      }

      this.$store.commit('global/setConnectedSites', {
        type: network,
        connectedSites: connectedSites,
      });

      this.$store.commit('global/setConnectedAddress', {
        type: network,
        connectedAddress: newConnectedAddress,
        newConnectedAddressIndex: newConnectedAddressIndex,
      });

      this.activeAddress = newConnectedAddress;
      this.connectedAddresses.splice(this.connectedAddresses.findIndex(val => val === address), 1);
      this.$q.bex.send('background.paytaca.addressChanged', {
        address: newConnectedAddress
      });
    },
    fetchAddressInfo () {
      const network = this.$store.getters['global/network'].toLowerCase();
      const connectedAddresses = this.$store.getters['global/getConnectedSites'](network)[this.origin] || [];
      this.connectedAddresses.push(...Object.keys(connectedAddresses));
      this.activeAddress = this.$store.getters['global/getConnectedAddress'](network) || "";
    },

    addressLogo (address) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(address)
    },
    show () {
      this.$refs.dialog.show()
    },
    hide () {
      this.$refs.dialog.hide()
    },
  }
}
</script>

<style lang="scss" scoped>
  .amount {
    font-size: 20px;
  }
  .logo {
    justify-content: center;
  }
  .address-section {
    font-size: 14px;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .q-dialog__backdrop {
    background: black;
  }
  .connected-dialog-header {
    right: 10px;
    top: 10px;
    position:
    absolute; z-index: 100;
  }
</style>
