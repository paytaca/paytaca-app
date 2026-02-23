<!-- Order physical card form to be component -->
 <template>
   
  <div class="q-pa-md flex flex-center full-width">
    <div
      class="order-hero-container shadow-10"
      :style="heroStyle"
    >
      <div class="row full-height">
        
        <div class="col-12 col-md-7 q-pa-lg flex flex-center">
          <div class="full-width" style="max-width: 500px">
            
            <div class="text-white q-mb-md">
              <div class="text-h3 text-weight-bold line-height-tight">
                Your new physical Paytaca card awaits.
              </div>
              <p class="opacity-80 q-mt-sm">Global payments, physical style.</p>
            </div>

            <div class="col-12 col-md-5 flex flex-center q-pa-lg bg-white-opacity-10">
              <q-img
                src="~assets/paytaca-card.png"
                class="card-floating"
                style="width: 80%; max-width: 350px;"
              />
            </div>

            <transition mode="out-in" enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
              <div v-show="!showForm" class="text-center">
                <q-btn 
                  label="Get Started" 
                  color="white" 
                  text-color="primary" 
                  class="q-px-xl text-bold"
                  unelevated
                  rounded
                  @click="activateForm"
                />
              </div>
            </transition>

              <div v-show="showForm" class="bg-white q-pa-md rounded-borders shadow-2">
                <div class="row items-center justify-between q-mb-sm">
                  <div class="text-subtitle1 text-bold text-primary">Shipping Details</div>
                  <q-btn icon="close" flat round dense color="grey" @click="showForm = false" />
                </div>

                <q-form @submit="onSubmit" class="q-col-gutter-sm">
                  <q-input outlined dense v-model="formData.fullName" label="Full Name *" input-class="text-black" :rules="[val => !!val || 'Full name is required']" lazy-rules/>
                  
                  <div class="row q-col-gutter-sm">
                    <div class="col-6">
                      <q-input outlined dense v-model="formData.city" label="City *" input-class="text-black" :rules="[val => !!val || 'City is required']" lazy-rules/>
                    </div>
                    <div class="col-6">
                      <q-input outlined dense v-model="formData.state" label="State *" input-class="text-black" :rules="[val => !!val || 'State is required']" lazy-rules/>
                    </div>
                    <div class="col-6">
                      <q-input outlined dense v-model="formData.zip" label="Zip *" input-class="text-black" :rules="[val => !!val || 'Zip code is required']" lazy-rules/>
                    </div>
                    <div class="col-6">
                      <q-input outlined dense v-model="formData.country" label="Country *" input-class="text-black" :rules="[val => !!val || 'Country is required']" lazy-rules/>
                    </div>
                    
                    <!-- Users will drag marker and it will dynamically fill the required fields (City, State, Zip, and Country) -->
                    <div ref="mapContainer" class="q-mt-md" style="height: 300px; width: 100%; border-radius: 8px; border: 1px solid #ddd;"></div>
                    <div class="text-caption text-grey-7 q-mt-xs">
                      <q-icon name="place" color="primary"/>
                      Drag the marker to your location to auto-fill address fields.
                    </div>  
                  </div>
                  <q-btn label="Confirm Order" color="primary" type="submit" class="full-width q-mt-md" unelevated />
                </q-form>
              </div>

          </div>
        </div>
      </div>
    </div>
  </div>
   
</template>

<script>
  import { createCardLogic } from './createCard.js';

  export default {
    mixins: [createCardLogic]
  }
</script>