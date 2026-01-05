<template>
  <q-layout>
    
    <div class="q-ml-l">
      <p class="text-primary text-weight-bold text-h5 text-center">Create Card</p>
    </div>
     
    <div>
      <MultiWalletDropdown></MultiWalletDropdown>
    </div>

    <q-separator class="q-my-xl" />

    <!-- Cards and Creating Cards -->
    <div class="row q-col-gutter-md">
      <div
        v-for="item in menuItems"
        :key="item.id"
        class="col-12 col-sm-6 col-md-4"
      >
      <q-card
          class="my-custom-card cursor-pointer q-hoverable"
          v-ripple
          @click="handleNavigation(item)"
        >
          <span class="q-focus-helper"></span>
          <q-card-section class="row items-center no-wrap">
            <q-avatar
              rounded
              :color="item.color"
              text-color="white"
              :icon="item.icon"
              font-size="28px"
              class="q-mr-md shadow-2"
            />
            <div class="ellipsis">
              <div class="text-h6 q-mb-xs">{{ item.title }}</div>
              <div class="text-caption text-grey-7">{{ item.subtitle }}</div>
            </div>
            <q-space />
            <q-icon 
              :name="isExpanded? 'expand_more' : 'chevron_right'"
              color="grey-4"
              size="30px"
              class="transition-icon cursor-pointer"
              @click.stop="isExpanded = !isExpanded"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row justify-center q-px-md">
      <q-card
        class="create-card-compact"  
        style="margin-top: 50px;"
        >
        <q-card-section class="row-items-center no-wrap q-py-sm q-px-md">
          <div class="text-h6 text-weight-medium">Create Card
            <q-icon
              name="mdi-plus"
              class="q-ml-lg cursor-pointer"
              color="primary"
              @click="handlePlus"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <transition
      appear
      enter-active-class="animated fadeIn"
      leave-active-class="animated fadeOut"
    >
      <div v-if="selectedCategory === 'Cards List'" class="q-mt-lg">
        <div class="text-h6 q-mb-md q-mt-md row items-center">
          <q-icon name="credit_card" class="q-mr-sm" color="primary" />
          My Cards
      </div>

      <div class="row q-col-gutter-md">
          <div v-for="card in subCards" :key="card.id" class="col-12 col-sm-2">
            <q-card bordered flat class="bg-white">
              <q-card-section>
                <div class="text-weight-bold text-subtitle1 text-black">{{ card.name }}</div>
                <div class="text-caption text-grey">Balance: {{ card.balance }} BCH</div>
              </q-card-section>

              <q-separator />

              <q-card-actions align="right">
                <q-btn flat color="grey-7" label="Edit" icon="edit" size="sm" @click="editCard(card)" />
                <q-btn flat color="primary" label="View" icon="visibility" size="sm" @click="handleEdit(card)" />
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </div>
    </transition>

    <q-dialog v-model="editDialogVisible" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Edit Card Details</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input 
            v-model="editingCard.name" 
            label="Card Name" 
            autofocus 
            counter
            @keyup.enter="saveCard"
          />
          
          <q-label v-model="editingCard.lock" autofocus style="margin-right: 40px;">Card Lock</q-label>
          <q-btn-toggle
            v-model="editingCard.lock"
            class="my-custom-toggle"
            no-caps
            rounded
            unelevated
            toggle-color="primary"
            toggle-text-color="white"
            color="grey-3"
            text-color="primary"
            :options="[
              {label: 'ON', value: 'on'},
              {label: 'OFF', value: 'off'}
            ]"
            @keyup.enter="saveCard"
          />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Save Changes" @click="saveCard" />
        </q-card-actions>
      </q-card>
    </q-dialog>



  </q-layout>
  
</template>

<script>
  import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';

  export default {
    
    components: {
      MultiWalletDropdown,
    },

    data() {
      return {
        expandedId: null, 
        isLoading: false,
        selectedCategory: null,
        editDialogVisible: false,
        editing: false, 
        editingCard: {id: null, name: '', balance: 0, lock: 'off'},
        menuItems: [
          { id: 1, title: 'Cards List', subtitle: 'View your cards list', icon: 'credit_card', color: 'primary', route: '/cardsList' },
          { id: 2, title: 'NFTs', subtitle: 'View your NFTs', icon: 'diamond', color: 'teal', route: '/nfts' },
        ],
        subCards: []
      }
    },

    methods: {
      toggleExpandId(){
        if(this.expandedId === id){
          this.expandedId = null;
        }
        else{
          this.expandedId = id;
        }
      },
    
      handleNavigation (item) {
        // if user clicks the same item twice, toggle it closed
        if (this.selectedCategory === item.title){
          this.selectedCategory = null
        }
        else {
          this.selectedCategory = item.title
        }
        console.log('Category selected is:', this.selectedCategory)
      },

      handlePlus() {
        this.editing = false;
        this.editingCard = {
          id: Date.now(),
          name: '',
          balance: 0,
          lock: 'off'
        };
        this.editDialogVisible = true;
      },

      handleEdit(card){
        this.editing = true;
        this.editingCard = {...card};
        this.editDialogVisible = true
      },

      editCard (card) {
        this.$q.notify({
          message: `Editing ${card.name}`,
          color: 'orange-7',
          icon: 'edit',
        }),
        this.editingCard = {...card};
        this.editDialogVisible = true;
      },

      saveCard() {
        if (this.editing === true){
          const index = this.subCards.findIndex(c => c.id === this.editingCard.id)
          if (index !== -1){
            this.subCards[index] = {...this.editingCard}

            this.$q.notify({
              color: 'positive',
              message: 'Card updated successfully',
              icon: 'check'
            });
          }
        }
        else {
          this.subCards.push({...this.editingCard});
          this.$q.notify({
            color: 'positive',
            message: 'New card created',
            icon: 'add'
          })
        }
        
        this.editDialogVisible = false
        this.editing = true
      },


      viewCard (card) {
        this.$q.notify({
          message: `View details for ${card.name}`,
          color: 'primary',
          icon: 'visibility',
        })
      },

      async getDashboardData () {
        this.isLoading = true;
        try {
          
          // Cards List and NFTs
          setTimeout(() => {
            this.menuItems = [
              { id: 1, title: 'Cards List', subtitle: 'View your cards list', icon: 'credit_card', color: 'blue' },
              { id: 2, title: 'NFTs', subtitle: 'View your NFTs', icon: 'diamond', color: 'green' }
            ];
            this.isLoading = false;
          }, 1000);
        } catch (error) {
          console.error("Failed to load", error);
        }
      }
    },

    mounted () {
      console.log('The component is now on the screen!');
    
      //Populate list
      this.getDashboardData();

    
    }

  }
</script>

<style lang="scss" scoped>
.my-custom-card {
  transition: all 0.3s;
  border: 1px solid transparent;
  &.border-primary {
    border-color: var(--q-primary);
  }
}

.my-custom-toggle {
  border: 1px solid var(--q-primary);
  transition: all 0.3s ease;
}

.my-custom-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.my-custom-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
}

.transition-icon {
  transition: transform 0.3s ease, color 0.3s ease;
}

.transition-icon:hover {
  color: var(--q-primary) !important;
}

</style>