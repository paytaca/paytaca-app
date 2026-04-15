<template>
  <q-layout view="LHh Lpr lFf">
    <q-page-container :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'">
      <CardPageHeader />

      <q-page v-if="activeCard" class="q-px-md">
        <div class="column items-center q-mb-lg">
          <div class="row items-center q-mb-sm full-width q-gutter-sm">
            <!-- Card name - uses localStorage (add skeleton when enabling backend)
                 Backend option: <q-skeleton v-if="loading" type="text" width="120px" /> -->
            <div 
              class="text-subtitle1 q-mr-sm"
              :class="textColor"
            >
              {{ getCardName(activeCard) }}
            </div>
            <q-badge 
              rounded 
              :color="activeCard?.isLocked ? 'negative' : 'positive'" 
              size="xs" 
              class="cursor-pointer"
            >
              <q-tooltip>{{ activeCard?.isLocked ? 'Card is locked' : 'Card is active' }}</q-tooltip>
            </q-badge>
            <q-btn flat dense icon="edit" size="sm" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" @click="showEditNameDialog = true"/>
          </div>

          <div 
            class="virtual-card-container flex flex-center shadow-4"
            :class="$q.dark.isActive ? 'virtual-card-dark' : 'virtual-card-light'"
          >
            <div class="virtual-card-content full-width full-height q-pa-sm">
              <!-- Card Header with Logo -->
              <div class="row items-center justify-between">
                <div class="virtual-card-chip row items-center no-wrap" style="gap: 6px; padding: 0 8px;">
                  <q-img src="~assets/bch-logo.png" style="width: 14px; height: 14px;" fit="contain" />
                  <!-- Card name in chip - uses localStorage
                       Backend option: <q-skeleton v-if="loading" type="text" width="80px" height="16px" /> -->
                  <div class="text-caption text-weight-bold ellipsis" style="max-width: 100px; color: inherit; font-family: 'Courier New', monospace; letter-spacing: 0.5px;">
                    {{ getCardName(activeCard) || 'My Card' }}
                  </div>
                </div>
                <q-img
                  src="~assets/paytaca_logo.png"
                  style="width: 55px;"
                  fit="contain"
                />
              </div>
              
              <!-- Contract Address (Card Number) -->
              <div class="virtual-card-address text-caption text-weight-medium q-mt-sm">
              {{ formatContractAddress(activeCard?.contractAddress) || 'bitcoincash:qz6zv...efvjw' }}
              <!-- TODO: Replace with card.raw.cash_address or card.raw.token_address from Card class -->
            </div>
              
              <!-- Bottom Section: Reserved for future use -->
              <div class="q-mt-auto"></div>
            </div>
          </div>

          <div class="row justify-center full-width q-mt-md">
            <div class="row items-center">
              <!-- Backend data fetching disabled - showing localStorage data only -->
              <!-- <div v-if="loading" class="q-mr-sm">
                <q-skeleton type="text" width="120px" height="24px" />
              </div> -->
              <div 
                class="q-mr-sm"
                :class="textColor"
              >
                {{ formatBalance(activeCard?.balance) }} BCH
                <!-- NEW: Use Card class getBchBalance() method -->
                <!-- {{ formatBalance(activeCard?.getBchBalance ? activeCard.getBchBalance() : activeCard?.balance) }} BCH -->
              </div>
              <q-btn outline dense label="Cash In" color="primary" size="sm" class="cash-in-btn q-px-md q-py-xs" style="border-width: 1px" @click="openCashInDialog" />
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
            v-else-if="activeTab === 'Order Card' && activeCard"
            class="full-width"
          >
            <div v-if="!showOrderPhysicalCardForm" class="order-physical-card-intro text-center q-pa-lg">
              <div 
                class="text-h5 text-weight-bold q-mb-sm"
                :class="textColor"
              >
                Your new Paytaca card awaits.
              </div>
              <p 
                class="opacity-80 q-mb-lg"
                :class="textColorGrey"
              >
                Global payments, Paytaca style.
              </p>
              <div 
                class="text-caption q-mb-md"
                :class="textColorGreyLight"
                style="max-width: 400px; margin: 0 auto;"
              >
                <q-icon name="local_shipping" size="16px" class="q-mr-xs" :color="$q.dark.isActive ? 'grey-5' : 'grey-6'"/>
                <strong>Local shipping:</strong> 7-10 business days<br/>
                <q-icon name="public" size="16px" class="q-mr-xs" :color="$q.dark.isActive ? 'grey-5' : 'grey-6'"/>
                <strong>International shipping:</strong> May take longer depending on destination
              </div>
              <q-btn 
                :label="'Get Started'" 
                color="primary" 
                class="q-px-xl q-mt-lg text-bold"
                unelevated
                rounded
                @click="activateOrderPhysicalCardForm"
              />
            </div>

            <div v-else class="order-physical-card-form">
              <div 
                class="row items-center justify-between q-mb-md"
                :class="bgColor"
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
                  :class="textColorGrey"
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
            class="content-box flex flex-center"
            :class="$q.dark.isActive ? 'content-box-dark' : 'content-box-light'"
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
                :class="textColor"
              >
                Request Under Review
              </div>
              <div 
                class="text-subtitle1 q-mb-lg"
                :class="textColorGrey"
                style="max-width: 400px; margin: 0 auto;"
              >
                We're reviewing your card replacement request. This typically takes 1-2 business days. You'll receive a notification once your request is approved.
              </div>
              <div class="q-mt-md">
                <q-btn 
                  flat
                  :color="$q.dark.isActive ? 'grey-5' : 'grey-7'"
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
                :class="textColor"
              >
                Processing Your Card
              </div>
              <div 
                class="text-subtitle1 q-mb-lg"
                :class="textColorGrey"
                style="max-width: 400px; margin: 0 auto;"
              >
                We're now processing your card replacement request. Your new card is being produced and personalized. Expect to receive your card within 7-10 business days.
              </div>
              <div class="q-mt-md">
                <q-btn 
                  flat
                  :color="$q.dark.isActive ? 'grey-5' : 'grey-7'"
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
                :class="textColor"
              >
                Your New Card is on the Way!
              </div>
              <div 
                class="text-subtitle1 q-mb-lg"
                :class="textColorGrey"
                style="max-width: 400px; margin: 0 auto;"
              >
                Welcome your new card! Your replacement card has been shipped and is on its way to you. You should receive it within 2-3 business days. Please activate it upon arrival.
              </div>
              <div class="q-mt-md">
                <q-btn 
                  flat
                  :color="$q.dark.isActive ? 'grey-5' : 'grey-7'"
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

            <!-- Order Form (shows only when user selects "No, I need to update") -->
            <div v-else-if="showReplacementLocationForm" class="order-physical-card-form q-mt-xl">
              <div 
                class="row items-center justify-between q-mb-md"
                :class="bgColor"
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
                  :class="textColorGrey"
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
                    :color="$q.dark.isActive ? 'grey-5' : 'grey-7'"
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
                    :disable="hasCardBalance"
                  />
                  <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">
                    Please sweep all funds before replacing your card
                  </q-tooltip>
                </div>
              </q-form>
            </div>

            <div v-else-if="locationSame !== null && !showReplacementLocationForm" class="card-replacement-confirm text-center q-pa-lg q-mt-xl">
              <div 
                class="text-h5 text-weight-bold q-mb-md"
                :class="textColor"
              >
                Ready to Replace Your Card
              </div>
              <div 
                class="text-subtitle1 q-mb-lg"
                :class="textColorGrey"
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
                  flat
                  :color="$q.dark.isActive ? 'grey-5' : 'grey-7'"
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
                  :disable="hasCardBalance"
                />
                <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">
                  Please sweep all funds before replacing your card
                </q-tooltip>
              </div>
            </div>

            <!-- Combined Questions (default view) -->
            <div v-else class="card-replacement-container text-center q-pa-lg">
              <!-- Question 1: Why do you want to replace your card? -->
              <div class="q-mb-xl">
                <div 
                  class="text-h5 text-weight-bold q-mb-md"
                  :class="textColor"
                >
                  Why do you want to replace your card?
                </div>
                <div class="replacement-options q-gutter-sm">
                  <q-btn 
                    v-for="option in replacementReasons" 
                    :key="option.value"
                    :label="option.label"
                    :outline="replacementReason !== option.value"
                    :color="replacementReason === option.value ? 'primary' : ($q.dark.isActive ? 'grey-9' : 'grey-3')"
                    text-color="primary"
                    class="q-ma-sm"
                    unelevated
                    rounded
                    :disable="hasCardBalance"
                    @click="selectReplacementReason(option.value)"
                  />
                  <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">
                    Please sweep all funds before replacing your card
                  </q-tooltip>
                </div>
              </div>

              <!-- Question 2: Is your shipping location still the same? -->
              <div class="q-mb-xl" :class="{ 'disabled-section': !replacementReason }">
                <div 
                  class="text-h5 text-weight-bold q-mb-md"
                  :class="textColor"
                >
                  Is your shipping location still the same?
                </div>
                <div class="location-options">
                  <q-btn 
                    label="Yes, proceed" 
                    :disable="!replacementReason || hasCardBalance"
                    :outline="locationSame !== true"
                    :color="locationSame === true ? 'primary' : ($q.dark.isActive ? 'grey-9' : 'grey-3')"
                    text-color="primary"
                    class="q-ma-sm q-px-xl"
                    unelevated
                    rounded
                    @click="handleLocationSame(true)"
                  />
                  <q-btn 
                    label="No, I need to update" 
                    :disable="!replacementReason || hasCardBalance"
                    :outline="locationSame !== false"
                    :color="locationSame === false ? 'primary' : ($q.dark.isActive ? 'grey-9' : 'grey-3')"
                    text-color="primary"
                    class="q-ma-sm q-px-xl"
                    unelevated
                    rounded
                    @click="handleLocationSame(false)"
                  />
                  <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">
                    Please sweep all funds before replacing your card
                  </q-tooltip>
                </div>
              </div>

              <!-- Reset Button -->
              <div v-if="replacementReason || locationSame !== null">
                <q-btn 
                  label="Reset" 
                  flat
                  :color="$q.dark.isActive ? 'grey-5' : 'grey-7'"
                  icon="refresh"
                  @click="resetReplacementFlow"
                />
              </div>
            </div>
          </div>

          <div 
            v-else-if="activeTab === 'Card Security' && activeCard"
            class="full-width"
          >
            <div 
              class="settings-section q-mb-md"
            >
              <div class="settings-header q-pa-md">
                <div 
                  class="text-subtitle1 text-weight-bold"
                  :class="textColor"
                >
                  Card Settings
                </div>
              </div>

              <q-separator color="primary" />

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
                        :class="textColor"
                      >
                        <!-- SKELETON LOADER for lock status: <q-skeleton v-if="loadingLockStatus" type="text" width="120px" /> -->
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
                    :disable="loadingLockStatus" 
                  />
                  <!-- BACKEND: Disable toggle during API call -->
                </div>

                <q-separator color="primary" />

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
                        :class="textColor"
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

                <q-separator color="primary" />
              </div>
            </div>

            <div 
              class="settings-section q-mb-md"
            >
              <div class="settings-header q-pa-md">
                <div 
                  class="text-subtitle1 text-weight-bold"
                  :class="textColor"
                >
                  Funds Management
                </div>
              </div>

              <q-separator color="primary" />

              <div class="settings-list">
                <div class="settings-item clickable" @click="showSweepFundsDialog = true">
                  <div class="settings-item-content">
                    <q-icon name="swap_horiz" color="info" size="24px" />
                    <div class="q-ml-md">
                      <div 
                        class="text-subtitle2"
                        :class="textColor"
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
            >
              <div class="settings-header q-pa-md">
                <div 
                  class="text-subtitle1 text-weight-bold"
                  :class="textColor"
                >
                  Danger Zone
                </div>
              </div>

              <q-separator color="primary" />

              <div class="settings-list">
                <div 
                  class="settings-item" 
                  :class="{ 'clickable': !hasCardBalance, 'disabled-item': hasCardBalance }"
                  @click="hasCardBalance ? null : showDeleteCardDialog = true"
                >
                  <div class="settings-item-content">
                    <q-icon name="delete" :color="hasCardBalance ? 'grey-5' : 'negative'" size="24px" />
                    <div class="q-ml-md">
                      <div :class="hasCardBalance ? 'text-grey-5' : 'text-subtitle2 text-negative'">Delete Card</div>
                      <div 
                        class="text-caption"
                        :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
                      >
                        Permanently remove this card
                      </div>
                    </div>
                  </div>
                  <q-icon name="chevron_right" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
                  <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">
                    Please sweep all funds before deleting your card
                  </q-tooltip>
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
            <div class="text-h6" :class="textColor">Edit Card Name</div>
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
        <q-card class="cash-in-dialog" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-white'">
          <q-card-section class="row justify-between items-center q-pb-none">
            <div class="text-h6 q-mb-md" :class="textColor">Cash In</div>
            <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" @click="showCashInDialog = false" />
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
                <!-- TODO: Replace with card.raw.cash_address or card.raw.token_address from Card class -->
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
                :options="currencyOptions"
                filled
                :dark="$q.dark.isActive"
                emit-value
                map-options
                class="currency-select"
                popup-content-class="text-dark"
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
            <div class="text-h6" :class="textColor">Sweep Funds</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div 
              class="q-mb-md"
              :class="textColorGrey"
            >
              This will transfer all funds ({{ formatBalance(activeCard?.balance) }} BCH) from your card back to your wallet.
              <!-- NEW: Use Card class method -->
              <!-- This will transfer all funds ({{ formatBalance(activeCard?.getBchBalance ? activeCard.getBchBalance() : activeCard?.balance) }} BCH) from your card back to your wallet. -->
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
              :class="textColorGrey"
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
import {createCardLogic} from './createCard.js'
import TransactionHistory from './transactionHistory.vue'
import ManageAuthNFTs from './manageAuthNFTs.vue'
import L from 'leaflet'
import CardPageHeader from './CardPageHeader.vue'

export default {
  mixins: [createCardLogic],
  components: {
    TransactionHistory,
    ManageAuthNFTs,
    CardPageHeader
  },

  data () {
    return {
      activeCard: null,
      activeTab: 'Transactions',
      showEditNameDialog: false,
      newCardName: '',
      showCashInDialog: false,
      cashInAmount: '',
      cashInCurrency: 'USD',
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
      // Backend data fetching disabled
      // loading: true,
      // backendData: null,
      // dataError: null,
      // loadingLockStatus: false, // BACKEND: Loading state for lock/unlock API call
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
      const baseTabs = ['Transactions', 'Manage Merchants', 'Card Security']
      const thirdTab = hasPhysicalCard ? 'Card Replacement' : 'Order Card'
      baseTabs.splice(2, 0, thirdTab)
      return baseTabs
    },

    selectedCurrency () {
      return this.$store.getters['market/selectedCurrency']
    },

    currencyOptions () {
      const options = this.$store.getters['market/currencyOptions']
      let symbols = []
      if (Array.isArray(options) && options.length > 0) {
        symbols = options.map(c => c.symbol)
      }
      // Always ensure USD, PHP, and BCH are available
      const requiredCurrencies = ['USD', 'PHP', 'BCH']
      requiredCurrencies.forEach(currency => {
        if (!symbols.includes(currency)) {
          symbols.push(currency)
        }
      })
      return symbols
    },

    bchPriceInSelectedCurrency () {
      const currencySymbol = this.selectedCurrency?.symbol || 'USD'
      const price = this.$store.getters['market/getAssetPrice']('bch', currencySymbol)
      return price || null
    },

    hasCardBalance () {
      const balance = parseFloat(this.activeCard?.balance) || 0
      // NEW: Use Card class method: const balance = parseFloat(this.activeCard?.getBchBalance ? this.activeCard.getBchBalance() : (this.activeCard?.balance || 0)) || 0
      return balance > 0
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
    // Check if any cards exist - if not, redirect to card homepage
    const cards = this.CardStorage.getCards()
    // TODO: Switch to backend - use await this.getCards() instead
    if (cards.length === 0) {
      this.$router.push({ name: 'app-card' })
      return
    }
    
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
        'order-card': 'Order Card',
        'other-settings': 'Card Security'
      }
      if (tabMap[requestedTab]) {
        this.activeTab = tabMap[requestedTab]
      }
    }
    this.loadSpecificCard()
  },

  methods: {

    capitalizeFirst (str) {
      if (!str) return ''
      return str.charAt(0).toUpperCase() + str.slice(1)
    },

    /**
     * Get card name from localStorage
     * Currently uses localStorage only. To add backend support:
     * 1. Add skeleton loader: <q-skeleton v-if="loading" type="text" width="100px" />
     * 2. Use backend: const name = card.name || this.backendData?.raw?.alias
     * @param {Object} card - Card object from localStorage
     * @returns {string} Card name
     */
    getCardName (card) {
      if (!card) return 'Card'
      // Current: localStorage only
      // Backend option: card.name || this.backendData?.raw?.alias
      const name = card.name
      return this.capitalizeFirst(name) || 'Card'
    },

    /* Helper method to get card BCH balance using Card class
     * Uses card.getBchBalance() which returns card.raw.bch_balance from backend
     * Falls back to card.balance from localStorage if method not available
     * 
     * Usage: {{ getCardBchBalance() }} in template
     * 
     * getCardBchBalance () {
     *   if (!this.activeCard) return '0.00'
     *   try {
     *     // Use getBchBalance() from Card class
     *     const balance = this.activeCard.getBchBalance?.() ?? this.activeCard.balance
     *     return typeof balance === 'number' ? balance.toFixed(2) : (balance || '0.00')
     *   } catch (error) {
     *     console.error('Error getting card balance:', error)
     *     return this.activeCard?.balance || '0.00'
     *   }
     * },
     * 
     * // Async version for real-time blockchain balance
     * async getCardContractBalance () {
     *   if (!this.activeCard) return '0.00'
     *   try {
     *     // Fetches directly from blockchain using getContractBalance()
     *     const balance = await this.activeCard.getContractBalance()
     *     return typeof balance === 'number' ? balance.toFixed(8) : (balance || '0.00')
     *   } catch (error) {
     *     console.error('Error getting contract balance:', error)
     *     return this.activeCard?.balance || '0.00'
     *   }
     * },
     */

    loadSpecificCard () {
      const cardId = this.$route.query.id
      // get card from storage
      const found = this.CardStorage.getCardById(cardId)
      
      if (found) {
        this.activeCard = found
        this.newCardName = found.name || ''
        
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
    },

    /*
    async fetchBackendData () {
      if (!this.activeCard?.id) return
      
      this.loading = true
      this.dataError = null
      
      try {
        const { Card } = await import('src/services/card/card')
        const card = await Card.createInitialized({ raw: { id: this.activeCard.id } })
        
        // Fetch balances
        const bchUtxos = await card.getBchUtxos()
        const bchBalanceSats = bchUtxos.reduce((sum, utxo) => sum + BigInt(utxo.satoshis || 0), 0n)
        const bchBalance = (Number(bchBalanceSats) / 100000000).toFixed(8)
        
        // Fetch addresses from raw data
        this.backendData = {
          balance: bchBalance,
          contractAddress: card.raw?.contract_id,
          tokenAddress: card.raw?.token_address,
          cashAddress: card.raw?.cash_address,
          category: card.raw?.category,
          utxos: bchUtxos,
          raw: card.raw
        }
      } catch (error) {
        console.error('Failed to fetch card data from backend:', error)
        this.dataError = error.message
        // Keep backendData as null to show skeleton/empty state
      } finally {
        this.loading = false
      }
    },
    */

    saveCardName () {
      if (this.newCardName && this.newCardName.trim()) {
        const trimmedName = this.newCardName.trim()
        
        // Update the name directly
        this.activeCard.name = this.capitalizeFirst(trimmedName)
        this.newCardName = this.capitalizeFirst(trimmedName)
        
        // Save to localStorage
        const updatedCard = this.CardStorage.updateCard(this.activeCard.id, this.activeCard)
        if (updatedCard) {
          this.activeCard = updatedCard
        }
        
        // Show success notification
        this.notifySuccess('Card name updated successfully')
      }
      this.showEditNameDialog = false
    },



    copyContractAddress () {
      const address = this.getContractAddress(this.activeCard)
      if (address) {
        navigator.clipboard.writeText(address)
        this.notifySuccess('Contract address copied!')
      }
    },

    getContractAddress (card) {
      return card?.contractAddress || this.contractAddress || 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw'
    },

    openCashInDialog () {
      // Set default currency to the currently selected currency
      this.cashInCurrency = this.selectedCurrency?.symbol || 'USD'
      this.cashInAmount = ''
      this.showCashInDialog = true
    },

    handleCashIn () {
      if (!this.cashInAmount || parseFloat(this.cashInAmount) <= 0) {
        this.notifyError('Please enter a valid amount greater than 0')
        return
      }

      // Convert to BCH based on selected currency using real market data
      let amountInBCH
      
      if (this.cashInCurrency === 'BCH') {
        amountInBCH = parseFloat(this.cashInAmount)
      } else if (this.cashInCurrency === 'sats' || this.cashInCurrency === 'Satoshis') {
        // 1 BCH = 100,000,000 satoshis
        amountInBCH = parseFloat(this.cashInAmount) / 100000000
      } else {
        // Use real market price from store
        const bchPrice = this.bchPriceInSelectedCurrency
        if (!bchPrice) {
          this.notifyError('Unable to fetch current BCH price. Please try again.')
          return
        }
        // Convert fiat to BCH: amount / price = BCH
        amountInBCH = parseFloat(this.cashInAmount) / bchPrice
      }

      // Update card balance in localStorage
      if (this.activeCard) {
        const updatedCard = this.CardStorage.incrementCardProperty(this.activeCard.id, 'balance', amountInBCH)
        if (updatedCard) {
          this.activeCard.balance = updatedCard.balance
        }
      }

      this.$q.notify({
        message: `Successfully added ${this.cashInAmount} ${this.cashInCurrency} (~${amountInBCH.toFixed(4)} BCH) to your card!`,
        color: 'positive',
        position: 'top',
        timeout: 2000
      })
      
      this.showCashInDialog = false
      this.cashInAmount = ''
    },

    handleOrderPhysicalCard () {
      if (!this.orderPhysicalCardData.fullName || !this.orderPhysicalCardData.city || 
          !this.orderPhysicalCardData.state || !this.orderPhysicalCardData.zip || 
          !this.orderPhysicalCardData.country) {
        this.notifyError('Please fill in all required fields')
        return
      }

      this.notifySuccess('Card order submitted successfully!')

      this.hasOrderedPhysicalCard = true
      
      if (this.activeCard) {
        const updates = {
          hasOrderedPhysicalCard: true,
          shippingAddress: { ...this.orderPhysicalCardData }
        }
        const updatedCard = this.CardStorage.updateCard(this.activeCard.id, updates)
        if (updatedCard) {
          this.activeCard.hasOrderedPhysicalCard = updatedCard.hasOrderedPhysicalCard
          this.activeCard.shippingAddress = updatedCard.shippingAddress
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
          color: 'positive',
          timeout: 1500
        })
      }
      catch (error) {
        this.notifyError('Geocoding failed')
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
          color: 'positive',
          timeout: 1500
        })
      }
      catch (error) {
        this.notifyError('Geocoding failed')
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
      if (this.activeCard) {
        const updatedCard = this.CardStorage.setCardProperty(this.activeCard.id, 'shippingAddress', { ...this.orderPhysicalCardData })
        if (updatedCard) {
          this.activeCard.shippingAddress = updatedCard.shippingAddress
        }
      }
    },

    confirmCardReplacement () {
      this.notifySuccess('Card replacement order submitted successfully!', { icon: 'check_circle' })
      this.cardReplacementStatus = 'pending'
      this.saveCardReplacementStatus()
    },

    saveCardReplacementStatus () {
      if (this.activeCard) {
        const updatedCard = this.CardStorage.setCardProperty(this.activeCard.id, 'cardReplacementStatus', this.cardReplacementStatus)
        if (updatedCard) {
          this.activeCard.cardReplacementStatus = updatedCard.cardReplacementStatus
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
        icon: 'update',
        timeout: 1500
      })
    },

    toggleCardLock (locked) {
      if (!this.activeCard) return

      const updatedCard = this.CardStorage.setCardProperty(this.activeCard.id, 'isLocked', locked)
      if (updatedCard) {
        this.activeCard.isLocked = updatedCard.isLocked
      }

      this.$q.notify({
        message: locked ? 'Card has been locked' : 'Card has been unlocked',
        color: locked ? 'warning' : 'positive',
        icon: locked ? 'lock' : 'lock_open',
        timeout: 1500
      })
    },

    /*
     * BACKEND INTEGRATION for Card Lock/Unlock Toggle
     * 
     * Replace the toggleCardLock method above with this backend-enabled version:
     * 
     * async toggleCardLock (locked) {
     *   if (!this.activeCard) return
     *   
     *   // Show loading state during API call
     *   this.loadingLockStatus = true
     *   
     *   try {
     *     // BACKEND API CALL: Update card lock status
     *     const response = await fetch(`/api/cards/${this.activeCard.id}/lock`, {
     *       method: 'POST',
     *       headers: {
     *         'Content-Type': 'application/json',
     *         'Authorization': `Bearer ${this.getAuthToken()}` // Add auth method
     *       },
     *       body: JSON.stringify({
     *         isLocked: locked,
     *         reason: locked ? 'User initiated lock' : 'User initiated unlock'
     *       })
     *     })
     *     
     *     if (!response.ok) {
     *       throw new Error(`Failed to ${locked ? 'lock' : 'unlock'} card`)
     *     }
     *     
     *     const data = await response.json()
     *     
     *     // Update localStorage only after successful backend update
     *     const updatedCard = this.CardStorage.setCardProperty(this.activeCard.id, 'isLocked', locked)
     *     if (updatedCard) {
     *       this.activeCard.isLocked = updatedCard.isLocked
     *     }
     *     
     *     // Show success notification
     *     this.$q.notify({
     *       message: data.message || (locked ? 'Card has been locked' : 'Card has been unlocked'),
     *       color: locked ? 'warning' : 'positive',
     *       icon: locked ? 'lock' : 'lock_open',
     *       timeout: 1500
     *     })
     *   } catch (error) {
     *     console.error('Failed to toggle card lock:', error)
     *     
     *     // Revert the toggle on error
     *     this.$q.notify({
     *       message: `Failed to ${locked ? 'lock' : 'unlock'} card. Please try again.`,
     *       color: 'negative',
     *       icon: 'error',
     *       timeout: 3000
     *     })
     *   } finally {
     *     this.loadingLockStatus = false
     *   }
     * },
     * 
     * // Optional: Add a method to fetch current lock status from backend
     * // This is useful when loading the card details page to ensure sync
     * async fetchCardLockStatus () {
     *   if (!this.activeCard?.id) return
     *   
     *   try {
     *     const response = await fetch(`/api/cards/${this.activeCard.id}/status`, {
     *       method: 'GET',
     *       headers: {
     *         'Authorization': `Bearer ${this.getAuthToken()}`
     *       }
     *     })
     *     
     *     if (response.ok) {
     *       const data = await response.json()
     *       
     *       // Update local state and localStorage with backend status
     *       if (data.isLocked !== undefined && data.isLocked !== this.activeCard.isLocked) {
     *         const updatedCard = this.CardStorage.setCardProperty(
     *           this.activeCard.id, 
     *           'isLocked', 
     *           data.isLocked
     *         )
     *         if (updatedCard) {
     *           this.activeCard.isLocked = updatedCard.isLocked
     *         }
     *         
     *         // Notify user if status changed from backend
     *         this.$q.notify({
     *           message: `Card status updated from server: ${data.isLocked ? 'Locked' : 'Unlocked'}`,
     *           color: 'info',
     *           icon: 'sync',
     *           timeout: 2000
     *         })
     *       }
     *     }
     *   } catch (error) {
     *     console.error('Failed to fetch card lock status:', error)
     *   }
     * }
     * 
     * // Call fetchCardLockStatus() in mounted() or when card is loaded:
     * // await this.fetchCardLockStatus()
     */

    handleSweepFunds () {
      if (!this.activeCard) return

      const balance = parseFloat(this.activeCard?.balance) || 0
      // NEW: Use Card class method: const balance = parseFloat(this.activeCard?.getBchBalance ? this.activeCard.getBchBalance() : (this.activeCard?.balance || 0)) || 0

      if (balance <= 0) {
        this.$q.notify({
          message: 'No funds to sweep',
          color: 'warning',
          position: 'top',
          timeout: 1500
        })
        this.showSweepFundsDialog = false
        return
      }

      const updatedCard = this.CardStorage.setCardProperty(this.activeCard.id, 'balance', '0')
      if (updatedCard) {
        this.activeCard.balance = updatedCard.balance
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

      const deleted = this.CardStorage.deleteCard(this.activeCard.id)
      
      if (deleted) {
        this.$q.notify({
          message: 'Card has been deleted',
          color: 'positive',
          icon: 'delete',
          position: 'top',
          timeout: 2000
        })
      }

      this.showDeleteCardDialog = false
      this.$router.push({ name: 'stacked-cards' })
    },

    saveCardSettings () {
      if (!this.activeCard) return

      const updatedCard = this.CardStorage.setCardProperty(this.activeCard.id, 'transactionAlerts', this.activeCard.transactionAlerts)
      
      this.$q.notify({
        message: 'Settings saved',
        color: 'positive',
        icon: 'check',
        position: 'top'
      })
    },

    // Card operations - moved from createCard.js
    
    /**
     * Sweep UTXOs from card back to wallet
     * @param card {Card} - Card instance
     */
    async sweep(card) {
      const result = await card.sweep()
      console.log('sweep result:', result)

      await card.getUtxos().then(utxos => {
        console.log('Card UTXOs (after sweep):', utxos)
      })
    },

    /**
     * Burn a Merchant Auth Token to revoke authorization for a specific merchant
     * @param card {Card} - Card instance
     * @param merchant {Object} - merchant details {id, pubkey}
     * @param opts {Object} - options {retryOnFundFailure: boolean}
     */
    async burnMerchantAuthToken(card, merchant, opts = { retryOnFundFailure: true }) {
      try {
        const cardUser = await this.loadCardUser()
        const tokenId = card.raw.category
        const result = await cardUser.burnMerchantAuthToken(tokenId, merchant.id, merchant.pubkey)
        return result
      } catch (error) {
        console.error('Error burning merchant auth token:', error)
        if (opts?.retryOnFundFailure)
          await this.createFundingUtxoAndCallback(error, this.burnMerchantAuthToken)
      }
    },

    /**
     * Burn a Global Auth Token to revoke all authorizations
     * @param card {Card} - Card instance
     * @param opts {Object} - options {retryOnFundFailure: boolean}
     */
    async burnGlobalAuthToken(card, opts = { retryOnFundFailure: true }) {
      try {
        const cardUser = await this.loadCardUser()
        const tokenId = card.raw.category
        const result = await cardUser.burnGlobalAuthToken(tokenId)
        return result
      } catch (error) {
        console.error('Error burning global auth token:', error)
        if (opts?.retryOnFundFailure)
          await this.createFundingUtxoAndCallback(error, this.burnGlobalAuthToken)
      }
    },

    async createFundingUtxoAndCallback(error, operationCallback) {
      console.error(error)
      const satsNeeded = this.parseSatoshisNeeded(error.message)
      console.log('Satoshis needed for operation:', satsNeeded)
      if (satsNeeded !== null) {
        const cardUser = await this.loadCardUser()
        const result = await cardUser.wallet.createFundingUtxo(satsNeeded)
        console.log('Funding UTXO created:', result)
        console.log('Retrying operation...')
        await operationCallback({retryOnFundFailure: false})
      }
    },

    /**
     * Mutate Global Auth Token
     * @param {Card} card - Card instance
     * @param {Object} mutation - mutation parameters
     * @param mutation.authorize {boolean} - true to authorize, false to deauthorize
     * @param mutation.spendLimitSats {number} - (optional) spend limit in satoshis
     * @param mutation.broadcast {boolean} - (optional) whether to broadcast the transaction, default: true
     */
    async mutateGlobalAuthToken(card, mutation) {
      if (!mutation) {
        console.error('Mutation parameter is required')
        return
      }
      try {
        const result = await card.mutateGlobalAuthToken(mutation)
        console.log('Mutate Global Auth Token result:', result)
      } catch(error) {
        const satsNeeded = this.parseSatoshisNeeded(error.message)
        if (satsNeeded !== null) {
          console.error("Insufficient funds in contract:", error.message)
        } else {
          console.error(error)
        }
      }
    },

    /**
     * Mutate Merchant Auth Token
     * @param card 
     * @param mutation 
     * @param mutation.authorize {boolean} - true to authorize, false to deauthorize
     * @param mutation.merchant {Object} - merchant details {id, pubkey}
     * @param mutation.spendLimitSats {number} - (optional) spend limit in satoshis
     * @param mutation.broadcast {boolean} - (optional) whether to broadcast the transaction, default: true
     */
    async mutateMerchantAuthToken(card, mutation) {
      try {
        const result = await card.mutateMerchantAuthToken(mutation)
        console.log('Mutate Merchant Auth Token result:', result)
      } catch(error) {
        const satsNeeded = this.parseSatoshisNeeded(error.message)
        if (satsNeeded !== null) {
          console.error("Insufficient funds in contract:", error.message)
        } else {
          console.error(error)
        }
      }
    },

    /**
     * Mint Merchant Auth Token
     * @param {Card} card - Card instance
     * @param {Object} merchant - merchant details {id, pubkey}
     */
    async mintMerchantAuthToken(card, merchant) {
      const mintParams = {
        authorized: true,
        merchant: {
          id: merchant.id,
          pubkey: merchant.pubkey
        }
      }
      const { mintResult, issueResult } = await card.issueMerchantAuthToken(mintParams)
      console.log('Mint Result:', mintResult)
      console.log('Issue Result:', issueResult)
    },
  },

  beforeUnmount () {
    this.destroyOrderFormMap()
    this.destroyReplacementMap()
  }

}
</script>

<style lang="scss" scoped>
  @import "src/css/app-card.scss";
</style>