<template>
  <div id="connected-dialog" class="text-white" :class="{'pt-dark': darkMode}">
    <div style="display: flex; justify-content: center; margin-top: 5px;">Connected Addresses</div>
    <q-dialog ref="dialog" @hide="hide" persistent seamless>
      <q-card ref="card" style="padding: 20px 10px 5px 0;" :class="{'pt-dark-card': darkMode}" class="pp-text br-15">
        <div style="right: 10px; top: 10px; position: absolute; z-index: 100;">
          <q-btn icon="close" flat round dense v-close-popup :color="darkMode ? 'grey' : ''" />
        </div>
        <div class="text-h6" :class="{'text-white': darkMode}" style="text-align: center !important;" v-text="origin"></div>
        <div :class="{'text-white': darkMode}" style="text-align: center !important;" v-if="connectedAddresses.length">{{ `You have ${connectedAddresses.length} addresses connected to this site.` }}</div>
        <div :class="{'text-white': darkMode}" style="text-align: center !important; margin: 10px" v-else>{{ `You are not connected to this site.` }}</div>

        <q-card-section v-for="(address, index) in connectedAddresses" class="amount q-pb-none" style="padding-right: 0px; padding-top: 8px;">
          <q-item class="q-px-none">
            <q-item-section side avatar class="logo">
              <q-avatar>
                <img :src="addressLogo(address)" height="30" />
              </q-avatar>
            </q-item-section>
            <q-item-section :class="darkMode ? 'text-white' : 'pp-text'" class="address-section">
              <div>{{ address.split(':')[1] }}</div>
              <div v-if="address == activeAddress" style="color: grey">Active</div>
              <div v-else class="text-brandblue" style="font-weight: 400" @click="switchAddress(address)">Switch to this address</div>
            </q-item-section>
            <q-item-section side :class="darkMode ? 'text-white' : 'pp-text'" style="padding-left: 4px">
              <q-btn style="width: 1px" icon="eject" flat round dense :color="darkMode ? 'grey' : ''" @click="disconnectAddress(address)" />
            </q-item-section>
          </q-item>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
export default {
  name: 'connected-dialog',
  props: {
    hideCallback: {
      type: Function
    }
  },
  data () {
    return {
      darkMode: false,
      origin: "",
      connectedAddresses: [],
      activeAddress: "",
      darkMode: this.$store.getters['darkmode/getStatus']
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

  },
  methods: {
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
    show (transaction, darkMode) {
      // this.darkMode = darkMode
      // try {
        this.$refs.dialog.show()
      // } catch (err) {}
    },
    hide () {
      this.$refs.dialog.hide()
    },
  }
}
</script>

<style scoped>
  .amount {
    /* height: 50px; */
    font-size: 20px;
    /* margin-left: 16px; */
  }
  .logo {
    justify-content: center;
  }
  .address-section {
    font-size: 14px;
    text-overflow: ellipsis;
    overflow: hidden;
  };
  .text-gray {
    color: gray;
  }
  .amount-label {
    position: relative;
    margin-top: -38px;
    margin-left: 35px;
  }
  .q-dialog__backdrop {
    background: black;
  }
  .record-type-icon {
    /* color: #3b7bf6; */
    color: #fff;
    font-size: 30px;
    background: #3b7bf6;
    border-radius: 20px;
  }
</style>
