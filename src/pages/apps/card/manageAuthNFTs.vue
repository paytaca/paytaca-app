<template>
  <div class="full-width">
    <!-- Search bar -->
    <div class="row items-center q-mb-md q-gutter-x-sm">
      <div class="col">
        <q-input 
          v-model="search" 
          label="Search merchants..." 
          outlined 
          dense
          :dark="$q.dark.isActive"
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Generic Auth NFT Toggle -->
    <div 
      class="row items-center justify-between q-pa-md border-outlined br-10 q-mb-md"
      :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'"
    >
      <div class="text-subtitle2 text-primary text-weight-bold">Generic Auth NFT</div>
      <q-toggle 
        v-model="genericAuthEnabled"
        color="primary"
        @update:model-value="onGenericAuthToggle"
      />
    </div>

    <q-separator class="q-mb-sm" :dark="$q.dark.isActive" />

    <!-- Merchants List -->
    <div class="text-subtitle2 q-mb-sm" :class="$q.dark.isActive ? 'text-white' : 'text-dark'">Authorized Merchants</div>
    
    <div class="scroll" style="height: 350px;">
      <div v-if="filteredMerchants.length > 0">
        <q-list separator :dark="$q.dark.isActive">
          <q-item 
            v-for="merchant in filteredMerchants" 
            :key="merchant.id" 
            class="q-px-none merchant-item"
            :class="{ 'disabled-merchant': genericAuthEnabled }"
          >
            <q-item-section>
              <div 
                class="text-weight-bold"
                :class="genericAuthEnabled 
                  ? ($q.dark.isActive ? 'text-white' : 'text-grey-4') 
                  : ($q.dark.isActive ? 'text-white' : 'text-dark')"
              >
                {{ merchant.name }}
              </div>
              <div 
                class="text-caption text-weight-bold"
                :class="genericAuthEnabled 
                  ? ($q.dark.isActive ? 'text-grey-4' : 'text-grey-5') 
                  : ($q.dark.isActive ? 'text-grey-4' : 'text-grey')"
              >
                {{ merchant.address }}
              </div>
            </q-item-section>
            <q-item-section side>
              <q-toggle 
                :model-value="genericAuthEnabled ? true : merchant.isEnabled"
                :color="genericAuthEnabled 
                  ? ($q.dark.isActive ? 'grey-6' : 'grey-5') 
                  : 'secondary'"
                :disable="genericAuthEnabled"
                @update:model-value="(val) => onMerchantToggle(merchant, val)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div v-else class="text-center q-pa-xl" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
        No merchants found
      </div>
    </div>

    <!-- Status message -->
    <div 
      class="text-caption q-mt-sm text-center"
      :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
    >
      {{ genericAuthEnabled ? 'Generic Auth NFT is enabled - all merchants are authorized' : 'Select specific merchants to authorize' }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'ManageAuthNFTs',
  props: {
    card: { type: Object, required: true }
  },
  data() {
    return {
      search: '',
      genericAuthEnabled: true, // Toggled ON by default
      merchants: []
    }
  },
  computed: {
    filteredMerchants() {
      let list = [...this.merchants];
      if (this.search) {
        const s = this.search.toLowerCase();
        list = list.filter(m => m.name.toLowerCase().includes(s));
      }
      return list;
    }
  },
  mounted() {
    this.generateRandomMerchants();
  },
  methods: {
    generateRandomMerchants() {
      const merchantNames = [
        'Main Street Coffee', 'Tech Store', 'Gas Station', 'SuperMart', 'Book Haven',
        'Pizza Palace', 'Fitness Gym', 'Pharmacy Plus', 'Bakery Delight', 'Fashion Hub',
        'Electronics World', 'Pet Store', 'Home Hardware', 'Auto Parts', 'Jewelry Corner',
        'Sports Arena', 'Beauty Salon', 'Taco Stand', 'Grocery Central', 'Wine & Spirits',
        'Coffee Corner', 'Gadget World', 'Fashion Forward', 'Burger Joint', 'Auto Care'
      ];
      
      const addresses = [
        '123 Main St, Cityville', '456 Tech Ave, Innovatown', '789 Fuel Rd, Gasville',
        '321 Market St, Shopville', '654 Read Ln, Booktown', '987 Pizza Blvd, Foodcity',
        '147 Gym St, Fitville', '258 Health Ave, Medtown', '369 Bake Rd, Sweetsville',
        '741 Style St, Fashioncity', '852 Circuit Ave, Techville', '963 Pet Ln, Animalcity',
        '159 Build Rd, Tooltown', '357 Auto Ave, Carville', '486 Jewel St, Glamcity',
        '753 Sport Ln, Athletetown', '951 Beauty Ave, Glitzcity', '357 Taco Rd, Mexville',
        '159 Food St, Grocerytown', '486 Wine Ave, Spiritville', '111 Coffee Ln, Beanville',
        '222 Gadget Way, Techcity', '333 Fashion Blvd, Styletown', '444 Burger Ave, Foodburg',
        '555 Service Rd, Maintown'
      ];

      // Generate random number of merchants (up to 15)
      const count = Math.floor(Math.random() * 11) + 5; // 5-15 merchants
      const shuffled = this.shuffleArray([...merchantNames]);
      
      this.merchants = shuffled.slice(0, count).map((name, index) => ({
        id: index + 1,
        name: name,
        address: addresses[Math.floor(Math.random() * addresses.length)],
        isEnabled: false, // All merchants start disabled
        wasEnabledBeforeGeneric: false // Track previous state for generic auth toggle
      }));
    },

    shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    },

    onGenericAuthToggle(enabled) {
      if (enabled) {
        // When Generic Auth is enabled, all merchants are authorized
        // Store previous states before overwriting
        this.merchants.forEach(m => {
          m.wasEnabledBeforeGeneric = m.isEnabled; // preserve previous state
          m.isEnabled = true; // Show as enabled when generic auth is on
        });
        this.$q.notify({
          message: 'Generic Auth NFT enabled - all merchants are authorized',
          color: 'positive',
          icon: 'check_circle'
        });
      } else {
        // When Generic Auth is disabled, restore previous merchant states
        this.merchants.forEach(m => {
          m.isEnabled = m.wasEnabledBeforeGeneric || false;
        });
        this.$q.notify({
          message: 'Generic Auth NFT disabled - select specific merchants to authorize',
          color: 'info',
          icon: 'info'
        });
      }
    },

    onMerchantToggle(merchant, enabled) {
      const action = enabled ? 'enabled' : 'disabled';
      this.$q.notify({
        message: `${merchant.name} ${action}`,
        color: enabled ? 'positive' : 'grey',
        icon: enabled ? 'check' : 'block',
        timeout: 1000
      });
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>
