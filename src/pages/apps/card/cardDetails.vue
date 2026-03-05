<template>
  <q-layout view="LHh Lpr lFf">
    <q-page-container>
      <div class="row items-center q-pa-md">
        <q-btn 
          flat
          round
          dense
          icon="arrow_back"
          color="primary"
          @click="$router.back()"
        />
        <div class="col">
          <h5 class="text-primary text-weight-bold text-center q-ma-none">Card Management</h5>
        </div>
        <div class="q-pa-xs" style="width: 32px"></div>
      </div>

      <div>
        <MultiWalletDropdown></MultiWalletDropdown>
      </div>

      <q-page v-if="activeCard" class="q-px-md">
        <div class="column items-center q-mb-lg">
          <div class="row items-center q-mb-sm full-width q-gutter-sm">
            <div 
              class="text-subtitle1 q-mr-sm"
              :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
            >
              {{activeCard?.raw?.alias}}
            </div>
            <q-badge rounded color="green" size="xs" />
            <q-btn flat dense icon="edit" size="sm" @click="showEditNameDialog = true"/>
          </div>

          <div 
            class="virtual-card-container flex flex-center shadow-2"
            :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'"
          >
            <div :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">
              Virtual Card UI / Ad Content
            </div>
          </div>

          <div class="row justify-center full-width q-mt-sm">
            <div class="row items-center">
              <div 
                class="q-mr-sm"
                :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
              >
                {{ activeCard.balance }} BCH
              </div>
              <q-btn outline dense label="Cash In" size="sm" class="cash-in-btn q-px-md q-py-xs" style="border-width: 1px" @click="showCashInDialog = true" />
            </div>
          </div>
        </div>

        <div class="tabs-container q-mb-md">
          <div class="tabs-wrapper">
            <div 
              v-for="tab in tabs"
              :key="tab"
              class="tab-item"
              :class="{ 'tab-active': activeTab === tab }"
              @click="activeTab = tab"
            >
              <span class="tab-label">{{ tab }}</span>
            </div>
          </div>
        </div>

        <div 
          class="content-box flex flex-center"
          :class="$q.dark.isActive ? 'content-box-dark' : 'content-box-light'"
        >
          <TransactionHistory 
            v-if="activeTab === 'Transactions' && activeCard" 
            :card="activeCard"
          />
          <ManageAuthNFTs 
            v-else-if="activeTab === 'Manage Merchants' && activeCard" 
            :card="activeCard"
          />
          <div 
            v-else-if="activeTab === 'Order Physical Card' && activeCard"
            class="full-width"
          >
            <div v-if="!showOrderPhysicalCardForm" class="order-physical-card-intro text-center q-pa-lg">
              <div 
                class="text-h5 text-weight-bold q-mb-sm"
                :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
              >
                Your new physical Paytaca card awaits.
              </div>
              <p 
                class="opacity-80 q-mb-lg"
                :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
              >
                Global payments, physical style.
              </p>
              <q-btn 
                :label="'Get Started'" 
                color="primary" 
                class="q-px-xl text-bold"
                unelevated
                rounded
                @click="activateOrderPhysicalCardForm"
              />
            </div>

            <div v-else class="order-physical-card-form">
              <div 
                class="row items-center justify-between q-mb-md"
                :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'"
                style="border-radius: 12px; padding: 16px;"
              >
                <div 
                  class="text-subtitle1 text-bold text-primary"
                >
                  Shipping Details
                </div>
                <q-btn icon="close" flat round dense :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" @click="closeOrderPhysicalCardForm" />
              </div>

              <q-form @submit="handleOrderPhysicalCard" class="q-col-gutter-md">
                <div class="col-12">
                  <q-input 
                    outlined 
                    dense 
                    v-model="orderPhysicalCardData.fullName" 
                    label="Full Name *" 
                    :dark="$q.dark.isActive"
                    :rules="[val => !!val || 'Full name is required']"
                    lazy-rules
                  />
                </div>
                  
                <div class="row q-col-gutter-md">
                  <div class="col-6">
                    <q-input 
                      outlined 
                      dense 
                      v-model="orderPhysicalCardData.city" 
                      label="City *" 
                      :dark="$q.dark.isActive"
                      :rules="[val => !!val || 'City is required']"
                      lazy-rules
                    />
                  </div>
                  <div class="col-6">
                    <q-input 
                      outlined 
                      dense 
                      v-model="orderPhysicalCardData.state" 
                      label="State *" 
                      :dark="$q.dark.isActive"
                      :rules="[val => !!val || 'State is required']"
                      lazy-rules
                    />
                  </div>
                  <div class="col-6">
                    <q-input 
                      outlined 
                      dense 
                      v-model="orderPhysicalCardData.zip" 
                      label="Zip *" 
                      :dark="$q.dark.isActive"
                      :rules="[val => !!val || 'Zip code is required']"
                      lazy-rules
                    />
                  </div>
                  <div class="col-6">
                    <q-input 
                      outlined 
                      dense 
                      v-model="orderPhysicalCardData.country" 
                      label="Country *" 
                      :dark="$q.dark.isActive"
                      :rules="[val => !!val || 'Country is required']"
                      lazy-rules
                    />
                  </div>
                </div>
                
                <div 
                  class="text-caption q-mt-sm"
                  :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
                >
                  <q-icon name="place" color="primary"/>
                  Click or drag the marker to your location to auto-fill address fields.
                </div>  

                <div 
                  ref="orderFormMapContainer" 
                  class="q-mt-md order-form-map"
                  style="height: 300px; width: 100%; border-radius: 8px; border: 1px solid;"
                  :style="$q.dark.isActive ? 'border-color: #424242;' : 'border-color: #ddd;'"
                ></div>

                <div class="row justify-center q-mt-lg">
                  <q-btn 
                    label="Confirm Order" 
                    color="primary" 
                    type="submit" 
                    class="q-px-xl"
                    unelevated 
                    rounded
                  />
                </div>
              </q-form>
            </div>
          </div>

          <div 
            v-else-if="activeTab === 'Card Replacement' && activeCard"
            class="full-width"
          >
            <!-- PENDING: Request Under Review -->
            <div v-if="cardReplacementStatus === 'pending'" class="card-replacement-status text-center q-pa-xl">
              <q-icon 
                name="schedule" 
                size="80px" 
                color="warning"
                class="q-mb-lg"
              />
              <div 
                class="text-h5 text-weight-bold q-mb-md"
                :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
              >
                Request Under Review
              </div>
              <div 
                class="text-subtitle1 q-mb-lg"
                :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
                style="max-width: 400px; margin: 0 auto;"
              >
                We're reviewing your card replacement request. This typically takes 1-2 business days. You'll receive a notification once your request is approved.
              </div>
              <div class="q-mt-md">
                <q-btn 
                  flat
                  color="grey"
                  icon="refresh"
                  label="Simulate Progress (Testing)"
                  @click="simulateStatusProgression"
                  class="q-mr-sm"
                />
                <q-btn 
                  label="Back to Card Details" 
                  color="primary" 
                  class="q-px-xl"
                  unelevated
                  rounded
                  @click="activeTab = 'Transactions'"
                />
              </div>
            </div>

            <!-- PROCESSING: Card Being Produced -->
            <div v-else-if="cardReplacementStatus === 'processing'" class="card-replacement-status text-center q-pa-xl">
              <q-icon 
                name="precision_manufacturing" 
                size="80px" 
                color="info"
                class="q-mb-lg"
              />
              <div 
                class="text-h5 text-weight-bold q-mb-md"
                :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
              >
                Processing Your Card
              </div>
              <div 
                class="text-subtitle1 q-mb-lg"
                :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
                style="max-width: 400px; margin: 0 auto;"
              >
                We're now processing your card replacement request. Your new card is being produced and personalized. Expect to receive your card within 7-10 business days.
              </div>
              <div class="q-mt-md">
                <q-btn 
                  flat
                  color="grey"
                  icon="refresh"
                  label="Simulate Progress (Testing)"
                  @click="simulateStatusProgression"
                  class="q-mr-sm"
                />
                <q-btn 
                  label="Back to Card Details" 
                  color="primary" 
                  class="q-px-xl"
                  unelevated
                  rounded
                  @click="activeTab = 'Transactions'"
                />
              </div>
            </div>

            <!-- SHIPPED: Card on the Way -->
            <div v-else-if="cardReplacementStatus === 'shipped'" class="card-replacement-status text-center q-pa-xl">
              <q-icon 
                name="local_shipping" 
                size="80px" 
                color="positive"
                class="q-mb-lg"
              />
              <div 
                class="text-h5 text-weight-bold q-mb-md"
                :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
              >
                Your New Card is on the Way!
              </div>
              <div 
                class="text-subtitle1 q-mb-lg"
                :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
                style="max-width: 400px; margin: 0 auto;"
              >
                Welcome your new card! Your replacement card has been shipped and is on its way to you. You should receive it within 2-3 business days. Please activate it upon arrival.
              </div>
              <div class="q-mt-md">
                <q-btn 
                  flat
                  color="grey"
                  icon="refresh"
                  label="Reset Status (Testing)"
                  @click="simulateStatusProgression"
                  class="q-mr-sm"
                />
                <q-btn 
                  label="Back to Card Details" 
                  color="primary" 
                  class="q-px-xl"
                  unelevated
                  rounded
                  @click="activeTab = 'Transactions'"
                />
              </div>
            </div>

            <!-- Order Form (shows only when user selects "No, I need to update") -->
            <div v-else-if="showReplacementLocationForm" class="order-physical-card-form q-mt-xl">
              <div 
                class="row items-center justify-between q-mb-md"
                :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'"
                style="border-radius: 12px; padding: 16px;"
              >
                <div class="text-subtitle1 text-bold text-primary">
                  Update Shipping Details
                </div>
                <q-btn icon="close" flat round dense :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" @click="resetReplacementFlow" />
              </div>

              <q-form @submit="handleCardReplacement" class="q-col-gutter-md">
                <div class="col-12">
                  <q-input 
                    outlined 
                    dense 
                    v-model="orderPhysicalCardData.fullName" 
                    label="Full Name *" 
                    :dark="$q.dark.isActive"
                    :rules="[val => !!val || 'Full name is required']"
                    lazy-rules
                  />
                </div>
                  
                <div class="row q-col-gutter-md">
                  <div class="col-6">
                    <q-input 
                      outlined 
                      dense 
                      v-model="orderPhysicalCardData.city" 
                      label="City *" 
                      :dark="$q.dark.isActive"
                      :rules="[val => !!val || 'City is required']"
                      lazy-rules
                    />
                  </div>
                  <div class="col-6">
                    <q-input 
                      outlined 
                      dense 
                      v-model="orderPhysicalCardData.state" 
                      label="State *" 
                      :dark="$q.dark.isActive"
                      :rules="[val => !!val || 'State is required']"
                      lazy-rules
                    />
                  </div>
                  <div class="col-6">
                    <q-input 
                      outlined 
                      dense 
                      v-model="orderPhysicalCardData.zip" 
                      label="Zip *" 
                      :dark="$q.dark.isActive"
                      :rules="[val => !!val || 'Zip code is required']"
                      lazy-rules
                    />
                  </div>
                  <div class="col-6">
                    <q-input 
                      outlined 
                      dense 
                      v-model="orderPhysicalCardData.country" 
                      label="Country *" 
                      :dark="$q.dark.isActive"
                      :rules="[val => !!val || 'Country is required']"
                      lazy-rules
                    />
                  </div>
                </div>

                <div 
                  class="text-caption q-mt-sm"
                  :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
                >
                  <q-icon name="place" color="primary"/>
                  Click or drag the marker to your location to auto-fill address fields.
                </div>

                <div 
                  ref="replacementMapContainer" 
                  class="q-mt-md order-form-map"
                  style="height: 300px; width: 100%; border-radius: 8px; border: 1px solid;"
                  :style="$q.dark.isActive ? 'border-color: #424242;' : 'border-color: #ddd;'"
                ></div>

                <div class="row justify-center q-mt-lg q-gutter-md">
                  <q-btn 
                    label="Back" 
                    color="grey"
                    class="q-px-xl"
                    unelevated
                    rounded
                    @click="resetReplacementFlow"
                  />
                  <q-btn 
                    label="Replace Card" 
                    color="primary" 
                    class="q-px-xl"
                    unelevated
                    rounded
                    type="submit"
                  />
                </div>
              </q-form>
            </div>

            <div v-else-if="locationSame !== null && !showReplacementLocationForm" class="card-replacement-confirm text-center q-pa-lg q-mt-xl">
              <div 
                class="text-h5 text-weight-bold q-mb-md"
                :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
              >
                Ready to Replace Your Card
              </div>
              <div 
                class="text-subtitle1 q-mb-lg"
                :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
              >
                Reason: <span class="text-capitalize">{{ replacementReason }}</span>
              </div>
              <div 
                class="text-caption q-mb-lg"
                :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
              >
                Shipping to: {{ activeCard?.shippingAddress?.city || 'Original address on file' }}
              </div>
              <div class="row justify-center q-mt-lg q-gutter-md">
                <q-btn 
                  label="Go Back" 
                  color="grey"
                  class="q-px-xl"
                  unelevated
                  rounded
                  @click="resetReplacementFlow"
                />
                <q-btn 
                  label="Confirm Replacement" 
                  color="primary" 
                  class="q-px-xl"
                  unelevated
                  rounded
                  @click="confirmCardReplacement"
                />
              </div>
            </div>

            <!-- Combined Questions (default view) -->
            <div v-else class="card-replacement-container text-center q-pa-lg">
              <!-- Question 1: Why do you want to replace your card? -->
              <div class="q-mb-xl">
                <div 
                  class="text-h5 text-weight-bold q-mb-md"
                  :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
                >
                  Why do you want to replace your card?
                </div>
                <div class="replacement-options q-gutter-sm">
                  <q-btn 
                    v-for="option in replacementReasons" 
                    :key="option.value"
                    :label="option.label"
                    :outline="replacementReason !== option.value"
                    :color="replacementReason === option.value ? 'primary' : ($q.dark.isActive ? 'grey-4' : 'grey-7')"
                    class="q-ma-sm"
                    unelevated
                    rounded
                    @click="selectReplacementReason(option.value)"
                  />
                </div>
              </div>

              <!-- Question 2: Is your shipping location still the same? -->
              <div class="q-mb-xl" :class="{ 'disabled-section': !replacementReason }">
                <div 
                  class="text-h5 text-weight-bold q-mb-md"
                  :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
                >
                  Is your shipping location still the same?
                </div>
                <div class="location-options">
                  <q-btn 
                    label="Yes, proceed" 
                    :disable="!replacementReason"
                    :outline="locationSame !== true"
                    :color="locationSame === true ? 'primary' : ($q.dark.isActive ? 'grey-4' : 'grey-7')"
                    class="q-ma-sm q-px-xl"
                    unelevated
                    rounded
                    @click="handleLocationSame(true)"
                  />
                  <q-btn 
                    label="No, I need to update" 
                    :disable="!replacementReason"
                    :outline="locationSame !== false"
                    :color="locationSame === false ? 'primary' : ($q.dark.isActive ? 'grey-4' : 'grey-7')"
                    class="q-ma-sm q-px-xl"
                    unelevated
                    rounded
                    @click="handleLocationSame(false)"
                  />
                </div>
              </div>

              <!-- Reset Button -->
              <div v-if="replacementReason || locationSame !== null">
                <q-btn 
                  label="Reset" 
                  flat
                  color="grey"
                  icon="refresh"
                  @click="resetReplacementFlow"
                />
              </div>
            </div>
          </div>

          <div 
            v-else-if="activeTab === 'Other Settings' && activeCard"
            class="other-settings-container full-width"
          >
            <div 
              class="settings-section q-mb-md"
              :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-1'"
            >
              <div class="settings-header q-pa-md">
                <div 
                  class="text-subtitle1 text-weight-bold"
                  :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
                >
                  Card Settings
                </div>
              </div>

              <q-separator :dark="$q.dark.isActive" />

              <div class="settings-list">
                <div class="settings-item">
                  <div class="settings-item-content">
                    <q-icon 
                      :name="activeCard?.isLocked ? 'lock_open' : 'lock'" 
                      :color="activeCard?.isLocked ? 'positive' : 'warning'"
                      size="24px"
                    />
                    <div class="q-ml-md">
                      <div 
                        class="text-subtitle2"
                        :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
                      >
                        {{ activeCard?.isLocked ? 'Unlock Card' : 'Temporary Lock Card' }}
                      </div>
                      <div 
                        class="text-caption"
                        :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
                      >
                        {{ activeCard?.isLocked ? 'Card is currently locked' : 'Temporarily disable all transactions' }}
                      </div>
                    </div>
                  </div>
                  <q-toggle 
                    :model-value="activeCard?.isLocked"
                    @update:model-value="(val) => toggleCardLock(val)"
                    color="warning"
                  />
                </div>

                <q-separator :dark="$q.dark.isActive" />

                <div class="settings-item">
                  <div class="settings-item-content">
                    <q-icon 
                      name="notifications" 
                      :color="activeCard?.transactionAlerts ? 'primary' : 'grey'"
                      size="24px"
                    />
                    <div class="q-ml-md">
                      <div 
                        class="text-subtitle2"
                        :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
                      >
                        Transaction Alerts
                      </div>
                      <div 
                        class="text-caption"
                        :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
                      >
                        Get notified for every transaction
                      </div>
                    </div>
                  </div>
                  <q-toggle 
                    v-model="activeCard.transactionAlerts"
                    color="primary"
                    @update:model-value="saveCardSettings"
                  />
                </div>

                <q-separator :dark="$q.dark.isActive" />
              </div>
            </div>

            <div 
              class="settings-section q-mb-md"
              :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-1'"
            >
              <div class="settings-header q-pa-md">
                <div 
                  class="text-subtitle1 text-weight-bold"
                  :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
                >
                  Funds Management
                </div>
              </div>

              <q-separator :dark="$q.dark.isActive" />

              <div class="settings-list">
                <div class="settings-item clickable" @click="showSweepFundsDialog = true">
                  <div class="settings-item-content">
                    <q-icon name="swap_horiz" color="info" size="24px" />
                    <div class="q-ml-md">
                      <div 
                        class="text-subtitle2"
                        :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
                      >
                        Sweep Funds
                      </div>
                      <div 
                        class="text-caption"
                        :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
                      >
                        Transfer all funds back to wallet
                      </div>
                    </div>
                  </div>
                  <q-icon name="chevron_right" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
                </div>
              </div>
            </div>

            <div 
              class="settings-section"
              :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-1'"
            >
              <div class="settings-header q-pa-md">
                <div 
                  class="text-subtitle1 text-weight-bold"
                  :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
                >
                  Danger Zone
                </div>
              </div>

              <q-separator :dark="$q.dark.isActive" />

              <div class="settings-list">
                <div class="settings-item clickable" @click="showDeleteCardDialog = true">
                  <div class="settings-item-content">
                    <q-icon name="delete" color="negative" size="24px" />
                    <div class="q-ml-md">
                      <div class="text-subtitle2 text-negative">Delete Card</div>
                      <div 
                        class="text-caption"
                        :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
                      >
                        Permanently remove this card
                      </div>
                    </div>
                  </div>
                  <q-icon name="chevron_right" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!activeCard" class="flex flex-center full-height">
            <q-spinner-dots color="primary" size="40px"/>
          </div>
        </div>
      </q-page>

      <q-page v-else class flex flex-center>
        <q-spinner-dots color="primary" size="40px" />
      </q-page>

      <q-dialog v-model="showEditNameDialog">
        <q-card style="min-width: 300px">
          <q-card-section>
            <div class="text-h6" :class="$q.dark.isActive ? 'text-white' : 'text-dark'">Edit Card Name</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model="newCardName"
              filled
              maxlength="10"
              counter
              autofocus
              placeholder="Enter new card name"
              :dark="$q.dark.isActive"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Close" color="primary" @click="showEditNameDialog = false" />
            <q-btn flat label="Save" color="primary" @click="saveCardName" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="showCashInDialog">
        <q-card class="cash-in-dialog">
          <q-card-section class="row justify-between items-center q-pb-none">
            <div class="text-h6 q-mb-md" :class="$q.dark.isActive ? 'text-white' : 'text-dark'">Cash In</div>
            <q-btn flat round dense icon="close" @click="showCashInDialog = false" />
          </q-card-section>

          <q-card-section class="text-center q-pt-sm">
            
            <div class="qr-container q-mb-md">
              <qr-code 
                :text="getContractAddress(activeCard)"
                :size="180"
              />
            </div>

            <div class="row items-center justify-center q-gutter-sm q-mb-lg">
              <div 
                class="contract-address" 
                :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-8'"
              >
                {{ formatContractAddress(getContractAddress(activeCard)) }}
              </div>
              <q-btn 
                flat 
                round 
                dense 
                icon="content_copy" 
                size="sm"
                :color="$q.dark.isActive ? 'grey-4' : 'grey-7'"
                @click="copyContractAddress"
              />
            </div>

            <div class="row justify-center q-gutter-md q-mb-lg">
              <q-input
                v-model="cashInAmount"
                type="number"
                filled
                :dark="$q.dark.isActive"
                placeholder="Amount"
                class="amount-input"
                :rules="[val => (val && parseFloat(val) > 0) || 'Amount must be greater than 0']"
                lazy-rules
              />
              <q-select
                v-model="cashInCurrency"
                :options="['Satoshis', 'PHP', 'BCH']"
                filled
                :dark="$q.dark.isActive"
                emit-value
                map-options
                class="currency-select"
              />
            </div>

            <q-btn
              color="primary"
              label="Cash In"
              class="full-width"
              unelevated
              @click="handleCashIn"
            />
          </q-card-section>
        </q-card>
      </q-dialog>

      <q-dialog v-model="showSweepFundsDialog" persistent>
        <q-card style="min-width: 320px">
          <q-card-section>
            <div class="text-h6" :class="$q.dark.isActive ? 'text-white' : 'text-dark'">Sweep Funds</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div 
              class="q-mb-md"
              :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
            >
              This will transfer all funds ({{ activeCard?.balance }} BCH) from your card back to your wallet.
            </div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
            >
              Are you sure you want to sweep all funds?
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="primary" @click="showSweepFundsDialog = false" />
            <q-btn flat label="Sweep Funds" color="info" @click="handleSweepFunds" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="showDeleteCardDialog" persistent>
        <q-card style="min-width: 320px">
          <q-card-section>
            <div class="text-h6 text-negative">Delete Card</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div 
              class="q-mb-md"
              :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
            >
              Are you sure you want to delete this card? This action cannot be undone.
            </div>
            <div 
              class="text-caption text-negative"
            >
              Warning: Any remaining funds will be lost.
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="primary" @click="showDeleteCardDialog = false" />
            <q-btn flat label="Delete Card" color="negative" @click="handleDeleteCard" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-page-container>
  </q-layout>
</template>

<script>
import {createCardLogic} from './noBackend.js'
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
import TransactionHistory from './transactionHistory.vue'
import ManageAuthNFTs from './manageAuthNFTs.vue'
import L from 'leaflet'

export default {
  mixins: [createCardLogic],
  components: {
    TransactionHistory,
    ManageAuthNFTs
  },

  data () {
    return {
      activeCard: null,
      activeTab: 'Transactions',
      showEditNameDialog: false,
      newCardName: '',
      showCashInDialog: false,
      cashInAmount: '',
      cashInCurrency: 'BCH',
      showOrderPhysicalCardForm: false,
      orderPhysicalCardData: {
        fullName: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      },
      orderFormMap: null,
      orderFormMarker: null,
      replacementMap: null,
      replacementMarker: null,
      showSweepFundsDialog: false,
      showDeleteCardDialog: false,
      replacementReason: null,
      locationSame: null,
      showReplacementLocationForm: false,
      cardReplacementStatus: 'none'
    }
  },

  watch: {
    activeTab (newTab) {
      if (newTab === 'Card Replacement') {
        // Only reset flow if no active replacement request
        if (this.cardReplacementStatus === 'none') {
          this.resetReplacementFlow()
        }
        // Load the current status from the card data
        this.loadCardReplacementStatus()
      }
    }
  },

  computed: {
    tabs () {
      const hasPhysicalCard = this.activeCard?.hasOrderedPhysicalCard || this.hasOrderedPhysicalCard
      const baseTabs = ['Transactions', 'Manage Merchants', 'Other Settings']
      const thirdTab = hasPhysicalCard ? 'Card Replacement' : 'Order Physical Card'
      baseTabs.splice(2, 0, thirdTab)
      return baseTabs
    },
    replacementReasons () {
      return [
        { value: 'lost', label: 'Card Lost' },
        { value: 'stolen', label: 'Card Stolen' },
        { value: 'damaged', label: 'Card Damaged' },
        { value: 'fraud', label: 'Suspected Fraud' },
        { value: 'other', label: 'Other' }
      ]
    }
  },

  mounted () {
    // Load card replacement status if available
    this.loadCardReplacementStatus()
    
    // Check if a specific tab is requested in query params
    const requestedTab = this.$route.query.tab
    if (requestedTab) {
      // Map query param to tab names
      const tabMap = {
        'transactions': 'Transactions',
        'manage-merchants': 'Manage Merchants',
        'card-replacement': 'Card Replacement',
        'order-physical-card': 'Order Physical Card',
        'other-settings': 'Other Settings'
      }
      if (tabMap[requestedTab]) {
        this.activeTab = tabMap[requestedTab]
      }
    }
    this.loadSpecificCard()
  },

  methods: {
    loadSpecificCard () {
      const cardId = this.$route.query.id
      // get all cards from localStorage
      const savedCards = localStorage.getItem('mock_subcards')

      if (savedCards) {
        const allCards = JSON.parse(savedCards)
        // find the specifc card
        const found = allCards.find(c => String(c.id) === String(cardId))
        
        if (found) {
          this.activeCard = found
          this.newCardName = found.raw?.alias || ''
          
          if (this.activeCard.isLocked === undefined) {
            this.activeCard.isLocked = false
          }
          if (this.activeCard.transactionAlerts === undefined) {
            this.activeCard.transactionAlerts = false
          }
        }
        else {
          console.error("Card not found in storage");
          this.$router.push({ name: 'stacked-cards' });
        }
      }   
    },
    saveCardName () {
      if (this.newCardName && this.newCardName.trim()) {
        this.activeCard.raw.alias = this.newCardName.trim()
        
        const savedCards = localStorage.getItem('mock_subcards')
        if (savedCards) {
          const allCards = JSON.parse(savedCards)
          const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
          if (cardIndex !== -1) {
            allCards[cardIndex] = this.activeCard
            localStorage.setItem('mock_subcards', JSON.stringify(allCards))
          }
        }
      }
      this.showEditNameDialog = false
    },
    formatContractAddress (addr) {
      if (!addr) return ''
      const address = typeof addr === 'object' ? addr.contractAddress : addr
      if (!address) return ''
      const len = address.length
      return address.substring(0, 12) + '...' + address.substring(len - 12, len)
    },
    copyContractAddress () {
      const address = this.getContractAddress(this.activeCard)
      if (address) {
        navigator.clipboard.writeText(address)
        this.$q.notify({
          message: 'Contract address copied!',
          color: 'positive',
          position: 'top'
        })
      }
    },
    getContractAddress (card) {
      return card?.contractAddress || this.contractAddress || 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw'
    },
    handleCashIn () {
      if (!this.cashInAmount || parseFloat(this.cashInAmount) <= 0) {
        this.$q.notify({
          message: 'Please enter a valid amount greater than 0',
          color: 'negative',
          position: 'top'
        })
        return
      }

      // Convert to BCH based on selected currency
      // Exchange rates (approximate)
      // 1 BCH = 100,000,000 satoshis
      // 1 BCH ≈ 250,000 PHP (depends on market)
      const exchangeRates = {
        BCH: 1,
        Satoshis: 1 / 100000000, // 1 satoshi = 0.00000001 BCH
        PHP: 1 / 250000 // 1 PHP = 0.000004 BCH
      }
      
      const amountInBCH = parseFloat(this.cashInAmount) * exchangeRates[this.cashInCurrency]

      // Update card balance in localStorage
      const savedCards = localStorage.getItem('mock_subcards')
      if (savedCards && this.activeCard) {
        const allCards = JSON.parse(savedCards)
        const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
        if (cardIndex !== -1) {
          const currentBalance = parseFloat(allCards[cardIndex].balance) || 0
          allCards[cardIndex].balance = (currentBalance + amountInBCH).toFixed(8)
          localStorage.setItem('mock_subcards', JSON.stringify(allCards))
          
          // Update activeCard for display
          this.activeCard.balance = allCards[cardIndex].balance
        }
      }

      this.$q.notify({
        message: `Successfully added ${this.cashInAmount} ${this.cashInCurrency} (~${amountInBCH.toFixed(8)} BCH) to your card!`,
        color: 'positive',
        position: 'top'
      })
      
      this.showCashInDialog = false
      this.cashInAmount = ''
    },

    handleOrderPhysicalCard () {
      if (!this.orderPhysicalCardData.fullName || !this.orderPhysicalCardData.city || 
          !this.orderPhysicalCardData.state || !this.orderPhysicalCardData.zip || 
          !this.orderPhysicalCardData.country) {
        this.$q.notify({
          message: 'Please fill in all required fields',
          color: 'negative',
          position: 'top'
        })
        return
      }

      this.$q.notify({
        message: 'Physical card order submitted successfully!',
        color: 'positive',
        position: 'top'
      })

      this.hasOrderedPhysicalCard = true
      
      if (this.activeCard) {
        const savedCards = localStorage.getItem('mock_subcards')
        if (savedCards) {
          const allCards = JSON.parse(savedCards)
          const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
          if (cardIndex !== -1) {
            allCards[cardIndex].hasOrderedPhysicalCard = true
            allCards[cardIndex].shippingAddress = { ...this.orderPhysicalCardData }
            localStorage.setItem('mock_subcards', JSON.stringify(allCards))
            this.activeCard.hasOrderedPhysicalCard = true
            this.activeCard.shippingAddress = { ...this.orderPhysicalCardData }
          }
        }
      }

      this.showOrderPhysicalCardForm = false
      this.orderPhysicalCardData = {
        fullName: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      }
      this.destroyOrderFormMap()
    },

    initOrderFormMap () {
      if (!this.$refs.orderFormMapContainer) return

      if (this.orderFormMap) {
        this.orderFormMap.remove()
      }

      this.orderFormMap = L.map(this.$refs.orderFormMapContainer).setView([7.123, 124.845], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.orderFormMap)

      this.orderFormMarker = L.marker([7.123, 124.845], {draggable: true}).addTo(this.orderFormMap)

      this.orderFormMarker.on('dragend', this.handleOrderFormMarkerDrag)

      this.orderFormMap.on('click', (e) => {
        const { lat, lng } = e.latlng
        this.orderFormMarker.setLatLng([lat, lng])
        this.reverseGeocode(lat, lng)
      })
    },

    async handleOrderFormMarkerDrag (event) {
      const { lat, lng } = event.target.getLatLng()
      await this.reverseGeocode(lat, lng)
    },

    async reverseGeocode (lat, lng) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        )
        const data = await response.json()
        const addr = data.address

        this.orderPhysicalCardData = {
          ...this.orderPhysicalCardData,
          city: addr.city || addr.town || addr.village || addr.municipality || addr.county || '',
          state: addr.state || addr.region || addr.province || '',
          zip: addr.zip || addr.postcode || '',
          country: addr.country || '',
        }
        
        this.$q.notify({
          message: `Location set to ${this.orderPhysicalCardData.city || this.orderPhysicalCardData.state || 'Unknown'}`,
          icon: 'check', 
          color: 'positive'
        })
      }
      catch (error) {
        this.$q.notify({
          message: 'Geocoding failed',
          color: 'negative'
        })
      }
    },

    destroyOrderFormMap () {
      if (this.orderFormMap) {
        this.orderFormMap.remove()
        this.orderFormMap = null
        this.orderFormMarker = null
      }
    },

    async activateOrderPhysicalCardForm () {
      this.showOrderPhysicalCardForm = true
      await this.$nextTick()
      this.initOrderFormMap()
    },

    closeOrderPhysicalCardForm () {
      this.showOrderPhysicalCardForm = false
      this.destroyOrderFormMap()
    },

    selectReplacementReason (reason) {
      this.replacementReason = reason
    },

    handleLocationSame (same) {
      this.locationSame = same
      if (same) {
        this.loadShippingAddress()
      } else {
        this.showReplacementLocationForm = true
        this.$nextTick(() => {
          this.initReplacementMap()
        })
      }
    },

    loadShippingAddress () {
      if (this.activeCard?.shippingAddress) {
        this.orderPhysicalCardData = {
          fullName: this.activeCard.shippingAddress.fullName || '',
          city: this.activeCard.shippingAddress.city || '',
          state: this.activeCard.shippingAddress.state || '',
          zip: this.activeCard.shippingAddress.zip || '',
          country: this.activeCard.shippingAddress.country || ''
        }
      }
    },

    resetReplacementFlow () {
      this.replacementReason = null
      this.locationSame = null
      this.showReplacementLocationForm = false
      this.cardReplacementStatus = 'none'
      this.destroyReplacementMap()
      this.orderPhysicalCardData = {
        fullName: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      }
      this.saveCardReplacementStatus()
    },

    initReplacementMap () {
      if (!this.$refs.replacementMapContainer) return

      if (this.replacementMap) {
        this.replacementMap.remove()
      }

      this.replacementMap = L.map(this.$refs.replacementMapContainer).setView([7.123, 124.845], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.replacementMap)

      this.replacementMarker = L.marker([7.123, 124.845], {draggable: true}).addTo(this.replacementMap)

      this.replacementMarker.on('dragend', (event) => {
        const { lat, lng } = event.target.getLatLng()
        this.reverseGeocodeReplacement(lat, lng)
      })

      this.replacementMap.on('click', (e) => {
        const { lat, lng } = e.latlng
        this.replacementMarker.setLatLng([lat, lng])
        this.reverseGeocodeReplacement(lat, lng)
      })
    },

    async reverseGeocodeReplacement (lat, lng) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        )
        const data = await response.json()
        const addr = data.address

        this.orderPhysicalCardData = {
          ...this.orderPhysicalCardData,
          city: addr.city || addr.town || addr.village || addr.municipality || addr.county || '',
          state: addr.state || addr.region || addr.province || '',
          zip: addr.zip || addr.postcode || '',
          country: addr.country || '',
        }
        
        this.$q.notify({
          message: `Location set to ${this.orderPhysicalCardData.city || this.orderPhysicalCardData.state || 'Unknown'}`,
          icon: 'check', 
          color: 'positive'
        })
      }
      catch (error) {
        this.$q.notify({
          message: 'Geocoding failed',
          color: 'negative'
        })
      }
    },

    destroyReplacementMap () {
      if (this.replacementMap) {
        this.replacementMap.remove()
        this.replacementMap = null
        this.replacementMarker = null
      }
    },

    handleCardReplacement () {
      this.saveShippingAddress()
      this.confirmCardReplacement()
    },

    saveShippingAddress () {
      const savedCards = localStorage.getItem('mock_subcards')
      if (savedCards && this.activeCard) {
        const allCards = JSON.parse(savedCards)
        const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
        if (cardIndex !== -1) {
          allCards[cardIndex].shippingAddress = { ...this.orderPhysicalCardData }
          localStorage.setItem('mock_subcards', JSON.stringify(allCards))
          this.activeCard.shippingAddress = { ...this.orderPhysicalCardData }
        }
      }
    },

    confirmCardReplacement () {
      this.$q.notify({
        message: 'Card replacement order submitted successfully!',
        color: 'positive',
        icon: 'check_circle',
        position: 'top'
      })
      this.cardReplacementStatus = 'pending'
      this.saveCardReplacementStatus()
    },

    saveCardReplacementStatus () {
      if (this.activeCard) {
        const savedCards = localStorage.getItem('mock_subcards')
        if (savedCards) {
          const allCards = JSON.parse(savedCards)
          const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
          if (cardIndex !== -1) {
            allCards[cardIndex].cardReplacementStatus = this.cardReplacementStatus
            localStorage.setItem('mock_subcards', JSON.stringify(allCards))
            this.activeCard.cardReplacementStatus = this.cardReplacementStatus
          }
        }
      }
    },

    loadCardReplacementStatus () {
      if (this.activeCard?.cardReplacementStatus) {
        this.cardReplacementStatus = this.activeCard.cardReplacementStatus
      }
    },

    // For testing: simulate status progression
    simulateStatusProgression () {
      const statusFlow = { 'pending': 'processing', 'processing': 'shipped', 'shipped': 'none' }
      const nextStatus = statusFlow[this.cardReplacementStatus] || 'none'
      this.cardReplacementStatus = nextStatus
      this.saveCardReplacementStatus()
      this.$q.notify({
        message: `Status updated to: ${nextStatus}`,
        color: 'info',
        icon: 'update'
      })
    },

    toggleCardLock (locked) {
      if (!this.activeCard) return

      const savedCards = localStorage.getItem('mock_subcards')
      if (savedCards) {
        const allCards = JSON.parse(savedCards)
        const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
        if (cardIndex !== -1) {
          allCards[cardIndex].isLocked = locked
          localStorage.setItem('mock_subcards', JSON.stringify(allCards))
          this.activeCard.isLocked = locked
        }
      }

      this.$q.notify({
        message: locked ? 'Card has been locked' : 'Card has been unlocked',
        color: locked ? 'warning' : 'positive',
        icon: locked ? 'lock' : 'lock_open'
      })
    },

    handleSweepFunds () {
      if (!this.activeCard) return

      const balance = parseFloat(this.activeCard.balance) || 0

      if (balance <= 0) {
        this.$q.notify({
          message: 'No funds to sweep',
          color: 'warning',
          position: 'top'
        })
        this.showSweepFundsDialog = false
        return
      }

      const savedCards = localStorage.getItem('mock_subcards')
      if (savedCards) {
        const allCards = JSON.parse(savedCards)
        const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
        if (cardIndex !== -1) {
          allCards[cardIndex].balance = '0'
          localStorage.setItem('mock_subcards', JSON.stringify(allCards))
          this.activeCard.balance = '0'
        }
      }

      this.$q.notify({
        message: `Successfully swept ${balance} BCH to your wallet`,
        color: 'positive',
        icon: 'check_circle',
        position: 'top'
      })

      this.showSweepFundsDialog = false
    },

    handleDeleteCard () {
      if (!this.activeCard) return

      const savedCards = localStorage.getItem('mock_subcards')
      if (savedCards) {
        const allCards = JSON.parse(savedCards)
        const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
        if (cardIndex !== -1) {
          allCards.splice(cardIndex, 1)
          localStorage.setItem('mock_subcards', JSON.stringify(allCards))
        }
      }

      this.$q.notify({
        message: 'Card has been deleted',
        color: 'positive',
        icon: 'delete',
        position: 'top'
      })

      this.showDeleteCardDialog = false
      this.$router.push({ name: 'stacked-cards' })
    },

    saveCardSettings () {
      if (!this.activeCard) return

      const savedCards = localStorage.getItem('mock_subcards')
      if (savedCards) {
        const allCards = JSON.parse(savedCards)
        const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
        if (cardIndex !== -1) {
          allCards[cardIndex].transactionAlerts = this.activeCard.transactionAlerts
          localStorage.setItem('mock_subcards', JSON.stringify(allCards))
        }
      }

      this.$q.notify({
        message: 'Settings saved',
        color: 'positive',
        icon: 'check',
        position: 'top'
      })
    }
  },

  beforeUnmount () {
    this.destroyOrderFormMap()
    this.destroyReplacementMap()
  }

}
</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>
