<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Marketplace')" class="header-nav" />

    <div v-if="!initialized" class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <div v-if="fetchingCheckout || loading" class="row justify-center items-center">
        <q-spinner size="3rem"/>
      </div>
    </div>
    <div v-else-if="checkout?.orderId" class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <div class="q-px-sm text-center">
        <div class="text-subtitle1">Checkout is already complete</div>
        <div>
          <q-btn
            flat
            no-caps
            label="Go to order"
            class="text-underline"
            padding="xs lg"
            :to="{ name: 'app-marketplace-order', params: { orderId: checkout.orderId }}"
          />
        </div>
      </div>
    </div>
    <div v-else class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center q-px-sm">
        <div class="text-h5 q-pb-sm">Checkout</div>
        <q-spinner v-if="loading" size="1.5em" class="q-ml-xs"/>
        <q-slide-transition>
          <div :model-value="Boolean(loading && loadingMsg)" class="ellipsis-2-lines q-ml-xs">
            {{ loadingMsg }}
          </div>
        </q-slide-transition>
      </div>
      <div v-if="checkoutStorefront?.id" class="q-px-sm">
        <div class=text-subtitle1>{{ checkoutStorefront?.name }}</div>
        <div
          v-if="checkoutStorefront?.location?.formatted"
          class="text-subtitle2" style="margin-top:-0.5em;"
          @click="() => displayStorefrontLocation()"
        >
          <q-icon name="place" class="button button-text-primary" :class="getDarkModeClass(darkMode)" />
          {{ checkoutStorefront?.location?.formatted }}
        </div>
      </div>
      <q-banner v-if="!checkout?.id && fetchCheckoutError" class="bg-red text-white rounded-borders">
        {{ fetchCheckoutError }}
      </q-banner>
      <q-tabs v-model="tabs.active" class="q-pt-sm q-pb-md">
        <q-tab v-for="(tab, index) in tabs.opts" :key="index" v-bind="tab"/>
      </q-tabs>
      <q-tab-panels v-model="tabs.active" class="pt-card" :class="getDarkModeClass(darkMode)" animated keep-alive>
        <q-tab-panel name="items" :dark="darkMode">
          <CartItemsList
            :disable="checkout?.cart?.$state?.updating"
            :cart="checkout?.cart"
            :currency="checkoutCurrency"
          />
          <div v-if="checkout?.cart?.requireCutlery" class="row items-center q-px-xs">
            <div class="q-pa-xs">
              <div class="text-body2">{{ $t('Cutlery') }}</div>
              <div class="text-grey text-caption bottom">{{ $t('CutleryIncludedMsg') }}</div>
            </div>
            <q-space/>
            <div class="q-pa-xs">{{ checkout?.cart?.cutlerySubtotal }} {{ checkoutCurrency }}</div>
          </div>
          <q-separator/>
          <div v-if="checkout?.cart?.markupSubtotal" class="q-px-xs q-mt-md row items-center text-subtitle1">
            <div class="q-space">Subtotal</div>
            <div>{{ checkout?.cart?.markupSubtotal }} {{ checkoutCurrency }}</div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="delivery" :dark="darkMode">
          <div v-if="deliveryOptions.length" class="q-mb-md">
            <q-btn-toggle
              v-model="formData.deliveryType"
              unelevated
              spread
              no-caps
              toggle-color="brandblue"
              :options="deliveryOptions"
              @update:modelValue="() => findRider({ displayDialog: true })"
            >
              <template v-slot:store_pickup="ctx">
                <div>
                  <q-icon name="storefront" size="md"/>
                  <div class="text-caption">Store pickup</div>
                </div>
              </template>
              <template v-slot:local_delivery="ctx">
                <div>
                  <q-icon name="delivery_dining" size="md"/>
                  <div class="text-caption">Local Delivery</div>
                </div>
              </template>
            </q-btn-toggle>
          </div>
          <q-slide-transition>
          <div v-if="formData.deliveryType == Checkout.DeliveryTypes.LOCAL_DELIVERY">
            <div class="text-subtitle1">Rider</div>
            <q-field
              dense outlined readonly
              :dark="darkMode"
              :model-value="formData?.delivery?.rider?.id"
              class="q-mb-sm"
            >
              <template v-slot:control>
                <div v-if="formData?.delivery?.rider?.id" class="row items-center no-wrap">
                  <img
                      v-if="formData?.delivery?.rider?.id && formData?.delivery?.rider?.profilePictureUrl"
                      :src="formData?.delivery?.rider?.profilePictureUrl"
                      class="rounded-borders q-mr-xs"
                      style="height:2rem;width:2rem;object-position:center;object-fit:cover;"
                      @click="() => openImage(
                        formData?.delivery?.rider?.profilePictureUrl,
                        formData?.delivery?.rider?.fullName || 'Rider',
                      )"
                    />
                  <div class="q-space">
                    <div>{{ formData?.delivery?.rider?.fullName }}</div>
                    <div>{{ formData?.delivery?.rider?.phoneNumber }}</div>
                  </div>
                </div>
                <div v-else class="text-grey">
                  No rider in the area
                </div>
              </template>
              <template v-slot:append>
                <q-btn
                  :disable="loadingState.rider"
                  flat
                  icon="search"
                  padding="sm"
                  @click="() => findRider({ replaceExisting: true, skipReplaceIfEmpty: true, displayDialog: true })"
                />
              </template>
            </q-field>
          </div>
          </q-slide-transition>
          <q-form @submit="() => submitDeliveryAddress().then(() => nextTab())">
            <q-banner v-if="formErrors?.delivery?.detail?.length" class="bg-red text-white rounded-borders q-mb-md">
              <div v-if="formErrors?.delivery?.detail?.length === 1">
                {{ formErrors?.delivery?.detail?.[0] }}
              </div>
              <ul v-else class="q-pl-md">
                <li v-for="(err, index) in formErrors?.delivery?.detail" :key="index">{{err}}</li>
              </ul>
            </q-banner>
            <q-banner v-if="formErrors?.payment?.deliveryFee" class="bg-red text-white rounded-borders q-mb-md">
              {{ formErrors?.payment?.deliveryFee }}
            </q-banner>

            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1">Contact</div>
              <q-space/>
            </div>
            <div class="row items-start">
              <q-input
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="First name*"
                v-model="formData.delivery.firstName"
                class="col-12 col-sm-6"
                :error="Boolean(formErrors?.delivery?.firstName)"
                :error-message="formErrors?.delivery?.firstName"
                :rules="[
                  val => Boolean(val) || 'Required',
                ]"
              />
              <q-input
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="Last name*"
                v-model="formData.delivery.lastName"
                class="col-12 col-sm-6"
                :error="Boolean(formErrors?.delivery?.lastName)"
                :error-message="formErrors?.delivery?.lastName"
                :rules="[
                  val => Boolean(val) || 'Required',
                ]"
              />
            </div>
            <q-input
              outlined
              dense
              :disable="loading"
              :dark="darkMode"
              label="Phone number*"
              v-model="formData.delivery.phoneNumber"
              :error="Boolean(formErrors?.delivery?.phoneNumber)"
              :error-message="formErrors?.delivery?.phoneNumber"
              :rules="[
                val => !val || String(val).match(/^(0|(\+\d+))\d{3}-?\d{3}-?\d{4}$/) || $t('InvalidPhoneNumber', {}, 'Invalid phone number'),
              ]"
              @update:model-value="() => showNumberCodeSelector = true"
            >
              <PhoneCountryCodeSelector
                v-model="showNumberCodeSelector"
                :needle="formData.delivery.phoneNumber"
                @selected-code="code => replacePrimaryNumberCode(code)"
                :dark="darkMode"
              />
            </q-input>
            <q-slide-transition>
              <div v-if="formData.deliveryType !== Checkout.DeliveryTypes.STORE_PICKUP">
                <div class="row items-center q-mb-sm">
                  <div class="text-subtitle1">Address</div>
                  <q-space/>
                  <div class="q-r-mx-lg">
                    <GeolocateBtn @geolocate="position => onGeolocate(position)"/>
                  </div>
                </div>
                <div v-if="customerLocations?.length > 0" class="row items-center q-mb-sm">
                  <q-space/>
                  <q-btn
                    flat
                    no-caps label="Saved addresses"
                    padding="2px sm"
                    class="q-r-mx-md text-underline button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    @click="() => customerLocationsDialog.show = !customerLocationsDialog.show"
                  />
                  <CustomerLocationsDialog v-model="customerLocationsDialog.show">
                    <template v-slot:actions="context">
                      <q-btn
                        flat
                        label="Select"
                        v-close-popup
                        @click="setAsDeliveryLocation(context.location)"
                      />
                    </template>
                  </CustomerLocationsDialog>
                </div>
                <q-input
                  outlined
                  dense
                  :disable="loading"
                  :dark="darkMode"
                  label="Address"
                  v-model="formData.delivery.address.address1"
                  :error="Boolean(formErrors?.delivery?.location?.address1)"
                  :error-message="formErrors?.delivery?.location?.address1"
                />
                <div class="row items-start">
                  <q-input
                    outlined
                    dense
                    :disable="loading"
                    :dark="darkMode"
                    label="Street*"
                    v-model="formData.delivery.address.street"
                    class="col-12 col-sm-6"
                    :error="Boolean(formErrors?.delivery?.location?.street)"
                    :error-message="formErrors?.delivery?.location?.street"
                    :rules="[
                      val => Boolean(val) || 'Required',
                    ]"
                  />
                  <q-input
                    outlined
                    dense
                    :disable="loading"
                    :dark="darkMode"
                    label="City*"
                    v-model="formData.delivery.address.city"
                    class="col-12 col-sm-6"
                    :error="Boolean(formErrors?.delivery?.location?.city)"
                    :error-message="formErrors?.delivery?.location?.city"
                    :rules="[
                      val => Boolean(val) || 'Required',
                    ]"
                  />
                </div>

                <div class="row items-start">
                  <q-input
                    outlined
                    dense
                    :disable="loading"
                    :dark="darkMode"
                    label="State / Province *"
                    v-model="formData.delivery.address.state"
                    class="col-12 col-sm-6"
                    :error="Boolean(formErrors?.delivery?.location?.state)"
                    :error-message="formErrors?.delivery?.location?.state"
                    :rules="[
                      val => Boolean(val) || 'Required',
                    ]"
                  />
                  <CountriesFieldWrapper v-slot="{ filteredCountriesOpts, filterCountriesOpts }">
                    <q-select
                      outlined
                      dense
                      :disable="loading"
                      :dark="darkMode"
                      label="Country*"
                      clearable
                      use-input
                      fill-input
                      hide-selected
                      :options="filteredCountriesOpts"
                      @filter="filterCountriesOpts"
                      v-model="formData.delivery.address.country"
                      class="col-12 col-sm-6"
                      :popup-content-class="darkMode ? '': 'text-black'"
                      :error="Boolean(formErrors?.delivery?.location?.country)"
                      :error-message="formErrors?.delivery?.location?.country"
                      :rules="[
                        val => Boolean(val) || 'Required',
                      ]"
                    />
                  </CountriesFieldWrapper>
                </div>
                <div class="row items-center q-gutter-x-sm q-mt-sm">
                  <q-btn
                    no-caps flat
                    :disable="loading"
                    class="q-space button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    @click="selectCoordinates()"
                  >
                    <q-icon name="location_on"/>
                    <template v-if="validCoordinates">
                      {{ formData.delivery.address.longitude }}, {{ formData.delivery.address.latitude }}
                    </template>
                    <template v-else>
                      {{ $t('PinLocation') }}
                    </template>
                  </q-btn>
                  <q-btn
                    v-if="validCoordinates"
                    icon="close"
                    padding="xs"
                    flat
                    class="close-button"
                    @click="() => {
                      formData.delivery.address.longitude = null
                      formData.delivery.address.latitude = null
                    }"
                  />
                </div>
              </div>
            </q-slide-transition>
            <div class="q-mt-sm">
              <q-btn
                :loading="loading"
                :disable="loading"
                no-caps
                label="Save"
                type="submit"
                class="full-width button"
              />
            </div>
          </q-form>
        </q-tab-panel>
        <q-tab-panel name="payment" :dark="darkMode">
          <q-banner
            v-if="formErrors?.payment?.deliveryFee || formErrors?.payment?.detail?.length"
            class="bg-red text-white rounded-borders q-mb-md"
            style="word-wrap: break-word;"
          >
            <div v-for="(errorMsg, index) in formErrors?.payment?.detail" :key="index" class="banner-error">
              {{ errorMsg }}
            </div>
            <div v-if="formErrors?.payment?.deliveryFee" class="banner-error">
              {{ formErrors?.payment?.deliveryFee }}
            </div>
          </q-banner>
          <q-banner v-if="cashback?.parsedMessage" rounded class="bg-grad q-mb-md">
            <span v-html="cashback?.parsedMessage"></span>
          </q-banner>
          <q-input
            dense
            outlined
            autogrow
            label="Payment refund address"
            :dark="darkMode"
            :disable="loading"
            v-model="formData.payment.escrowRefundAddress"
            :rules="[
              val => Boolean(val) || 'Required',
            ]"
            :error="Boolean(formErrors?.payment?.escrowRefundAddress)"
            :error-message="formErrors?.payment?.escrowRefundAddress"
          >
            <template v-slot:append>
              <q-icon name="help">
                <q-menu
                  anchor="bottom right" self="top right"
                  class="q-pa-sm pt-card-2 text-bow"
                  :class="getDarkModeClass(darkMode)"
                >
                  BCH address of customer. Used as receipient in case of refund on payment
                </q-menu>
              </q-icon>
            </template>
          </q-input>
          <div class="row items-center">
            <q-space/>
            <div>
              {{ checkoutBchPrice }} {{ checkoutCurrency }} / BCH
              <q-icon name="info" size="1.25em">
                <q-menu class="q-pa-sm pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                  <div class="text-body2">{{ checkoutCurrency }} price at</div>
                  <div>{{ formatTimestampToText(checkout?.payment?.bchPrice?.timestamp) }}</div>
                </q-menu>
              </q-icon>
            </div>
          </div>
          <div class="row items-start text-subtitle1" @click="toggleAmountsDisplay">
            <div class="q-space">Subtotal</div>
            <div v-if="displayBch" class="text-right">{{ checkoutAmounts.subtotal.bch }} BCH</div>
            <div v-else class="text-right">{{ checkoutAmounts.subtotal.currency }} {{ checkoutCurrency }}</div>
          </div>
          <div
            :class="[
              'row items-start text-subtitle1',
              isStorePickup ? 'text-grey' : '',
            ]"
            @click="toggleAmountsDisplay"
          >
            <div class="q-space">
              Delivery fee
              <template v-if="isStorePickup">(Store pickup)</template>
            </div>
            <template v-if="checkout?.deliveryType === Checkout.DeliveryTypes.LOCAL_DELIVERY">
              <div v-if="checkout?.deliveryAddress?.distance" class="text-grey q-mx-xs">{{ (checkout?.deliveryAddress?.distance / 1000).toFixed(3) }} km</div>
            </template>
            <div :class="isStorePickup ? 'line-through text-grey' : ''">
              <div v-if="displayBch" class="text-right">{{ checkoutAmounts.deliveryFee.bch }} BCH</div>
              <div v-else class="text-right">{{ checkoutAmounts.deliveryFee.currency }} {{ checkoutCurrency }}</div>
            </div>
          </div>
          <div class="row items-start text-h6" @click="toggleAmountsDisplay">
            <div class="q-space">Total</div>
            <div v-if="displayBch" class="text-right">{{ checkoutAmounts.total.bch }} BCH</div>
            <div v-else class="text-right">{{ checkoutAmounts.total.currency }} {{ checkoutCurrency }}</div>
          </div>
          <div v-if="checkoutAmounts.totalPaymentsSent.currency || payments?.length">
            <q-separator :dark="darkMode"/>
            <div v-if="payments?.length" class="row items-center q-mt-xs">
              <q-space/>
              <q-btn
                flat
                padding="none xs"
                no-caps
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                :label="payments?.length == 1 ? 'View payment' : 'View payments'"
                @click.stop="() => showPaymentsListDialog = true"
              />
            </div>
            <template v-if="checkoutAmounts.totalPaymentsSent.currency">
              <div v-if="checkoutAmounts.totalPaymentsSent.currency" class="row items-start text-subtitle1" @click="toggleAmountsDisplay">
                <div class="q-space">Paid</div>
                <div v-if="displayBch" class="text-right">{{ checkoutAmounts.totalPaymentsSent.bch }} BCH</div>
                <div v-else class="text-right">{{ checkoutAmounts.totalPaymentsSent.currency }} {{ checkoutCurrency }}</div>
              </div>
              <div v-if="checkoutAmounts.balanceToPay.currency" class="row items-start text-subtitle1"  @click="toggleAmountsDisplay">
                <div class="q-space">Remaining</div>
                <div v-if="displayBch" class="text-right">{{ checkoutAmounts.balanceToPay.bch }} BCH</div>
                <div v-else class="text-right">{{ checkoutAmounts.balanceToPay.currency }} {{ checkoutCurrency }}</div>
              </div>
              <div v-else-if="checkoutAmounts.change.currency >= 0" class="row items-start text-h6"  @click="toggleAmountsDisplay">
                <div class="q-space">Change</div>
                <div v-if="displayBch" class="text-right">{{ checkoutAmounts.change.bch }} BCH</div>
                <div v-else class="text-right">{{ checkoutAmounts.change.currency }} {{ checkoutCurrency }}</div>
              </div>
            </template>
          </div>

          <PaymentSelectionPanel
            v-if="checkout.balanceToPay > 0"
            :checkout="checkout"
            @newCheckoutData="setCheckoutData"
          />
          <div v-if="loadingState.creatingPayment" class="text-center q-my-sm">
            <q-spinner size="3em"/>
            <div>Creating payment</div>
          </div>
          <template v-if="checkout.balanceToPay > 0">
            <div v-if="payment?.escrowContractAddress" class="q-mt-sm">
              <q-card
                class="q-pa-sm pt-card-2 text-bow"
                :class="getDarkModeClass(darkMode)"
                :flat="!darkMode"
              >
                <q-icon name="info" size="1.5em"/> Escrow payment
              </q-card>
              <q-menu class="q-pa-sm pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                Payment sent will be temporarily held in escrow while the order is being completed.
              </q-menu>
            </div>
            <q-btn
              :disable="loadingState.creatingPayment"
              no-caps label="Pay with wallet"
              icon="mdi-wallet"
              class="full-width q-my-sm button"
              @click="() => bchPaymentState.tab = 'wallet'"
            />
            <q-btn
              v-if="bchPaymentData.url"
              :disable="loadingState.creatingPayment"
              no-caps
              :label="$t('ScanToPay')"
              icon="mdi-qrcode-scan"
              class="full-width q-my-sm button"
              @click="() => bchPaymentState.tab = 'qrcode'"
            />
          </template>
          <div v-if="!(checkout.balanceToPay > 0)" class="q-mt-sm">
            <q-btn
              :disable="loading"
              no-caps
              label="Review"
              class="full-width button"
              @click="() => savePayment().then(() => nextTab())"
            />
          </div>
          <q-dialog
            :model-value="bchPaymentState.tab === 'wallet'"
            position="bottom"
            @hide="() => bchPaymentState.tab = 'select'"
          >
            <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
              <q-card-section>
                <div class="row items-center no-wrap">
                  <div class="text-h6">Pay with wallet</div>
                  <q-space/>
                  <q-btn flat icon="close" v-close-popup class="q-r-mr-sm close-button" />
                </div>
                <div class="text-center q-my-md" @click="() => showBchPaymentEscrowContract()">
                  <q-icon name="open_in_new" class="float-right button button-text-primary" :class="getDarkModeClass(darkMode)" />
                  <div class="text-h5">{{ fundingRequirementFiatAmounts?.totalSats / 10 ** 8 }} BCH</div>
                  <div v-if="fundingRequirementFiatAmounts?.hasTokens" class="q-mb-sm">
                    <div v-for="(tokenAmountData, index) in fundingRequirementFiatAmounts?.tokensWithAmount" :key="index" class="text-h6 text-weight-regular" style="margin-top:-0.4em;">
                      {{ tokenAmountData?.tokenAmount }} {{ tokenAmountData?.tokenSymbol }}
                    </div>
                    <div v-if="fundingRequirementFiatAmounts?.tokensWithoutAmount?.length" class="text-subtitle2 text-weight-regular" style="margin-top:-0.4em;">
                      + {{ fundingRequirementFiatAmounts?.tokensWithoutAmount?.length }}
                      {{ fundingRequirementFiatAmounts?.tokensWithoutAmount?.length == 1 ? $t('Token') : $t('Tokens') }}
                    </div>
                  </div>
                  <div v-if="fundingRequirementFiatAmounts?.totalFiatValue" class="text-subtitle1 q-mb-md" style="line-height:0.75em;">
                    {{ fundingRequirementFiatAmounts?.totalFiatValue }} {{ bchPaymentData?.currency }}
                  </div>
                  <div class="text-body1" style="word-break: break-all;">{{ bchPaymentData?.address }}</div>
                </div>
                <div class="text-right q-mt-xs">Balance: {{ bchWalletBalance }} BCH</div>
                <!-- <q-btn
                  no-caps label="Send"
                  color="brandblue"
                  class="full-width"
                  @click.stop="() => sendBchPayment()"
                /> -->
              </q-card-section>
              <DragSlide disable-absolute-bottom class="q-r-mt-md" @swiped="onSendBchPaymentSwipe"/>
            </q-card>
          </q-dialog>

          <q-dialog
            :model-value="bchPaymentState.tab === 'qrcode'"
            position="bottom"
            persistent
            @hide="() => bchPaymentState.tab = 'select'"
          >
            <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
              <q-card-section>
                <div class="row items-center no-wrap">
                  <div class="text-h6">{{ $t('ScanToPay') }}</div>
                  <q-space/>
                  <q-btn flat icon="close" v-close-popup class="q-r-mr-sm close-button" />
                </div>
                <div class="row justify-center">
                  <div>
                    <div class="row items-center q-mb-xs">
                      <q-btn
                        flat padding="xs"
                        no-caps label="Payment details"
                        class="text-underline button button-text-primary"
                        :class="getDarkModeClass(darkMode)"
                        @click="() => showBchPaymentEscrowContract()"
                      />
                      <q-space/>
                      <q-btn
                        flat padding="xs"
                        icon="content_copy"
                        no-caps label="Copy link"
                        class="button button-text-primary"
                        :class="getDarkModeClass(darkMode)"
                        @click.stop="() => copyToClipboard(bchPaymentData?.url)"
                      />
                    </div>
                    <qr-code :text="bchPaymentData?.url" :size="200" asset-id="bch" />
                    <div class="text-center">
                      <div class="text-h6">{{ bchPaymentData?.bchAmount }} BCH</div>
                      <div v-if="bchPaymentData?.fiatAmount" class="text-subtitle1" style="line-height:0.75em;">
                        {{ bchPaymentData?.fiatAmount }} {{ bchPaymentData?.currency }}
                      </div>
                      <div class="text-subtitle2" style="word-break: break-all;">{{ bchPaymentData?.address }}</div>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </q-dialog>
        </q-tab-panel>
        <q-tab-panel name="review" :dark="darkMode" class="q-pa-sm">
          <div class="row items-start review-panel-content">
            <div v-if="checkout?.deliveryAddress?.id" class="col-12 col-sm-4 q-pa-xs">
              <q-card class="q-px-md q-py-sm pt-card text-bow" :class="getDarkModeClass(darkMode)">
                <div class="text-subtitle1">Delivery</div>
                <q-separator :dark="darkMode"/>
                <div>{{ checkout?.deliveryAddress?.fullName }}</div>
                <div>{{ checkout?.deliveryAddress?.phoneNumber }}</div>
                <div @click="() => displayDeliveryAddressLocation()">
                  <div>{{ checkout?.deliveryAddress?.location?.formatted }}</div>
                  <q-btn
                    v-if="checkout?.deliveryAddress?.location?.validCoordinates"
                    flat
                    padding="none"
                    no-caps
                    label="View location"
                    class="text-underline button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                  />
                </div>

                <div v-if="formData?.delivery?.rider?.id">
                  <q-separator spaced :dark="darkMode"/>
                  <div class="text-subtitle2">Rider</div>
                  <div>{{ formData?.delivery?.rider?.fullName }}</div>
                  <div>{{ formData?.delivery?.rider?.phoneNumber }}</div>
                </div>
              </q-card>
            </div>
            <div class="q-space q-pa-xs">
              <q-card class="q-pa-sm pt-card text-bow" :class="getDarkModeClass(darkMode)">
              <div class="q-px-sm text-subtitle1">Items</div>
              <q-separator :dark="darkMode" class="q-mx-sm"/>
              <table class="full-width items-table">
                <thead>
                  <tr>
                    <th colspan="2" class="full-width">Item</th>
                    <th>Quantity</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="cartItem in checkout?.cart?.items" :key="cartItem?.variant?.id">
                    <tr>
                      <td colspan="2">
                        <q-btn
                          flat no-caps
                          padding="none"
                          :to="{
                            name: 'app-marketplace-product',
                            params: { productId: cartItem?.variant?.product?.id },
                            query: { variantId: cartItem?.variant?.id },
                          }"
                        >
                          <div class="row items-center justify-left no-wrap full-width text-left">
                            <q-img
                              v-if="cartItem?.variant?.itemImage"
                              :src="cartItem?.variant?.itemImage"
                              width="35px"
                              ratio="1"
                              style="min-width:35px;"
                              class="rounded-borders q-mr-xs"
                            />
                            <div class="q-space">
                              <div class="text-weight-medium">{{ cartItem?.variant?.itemName }}</div>
                              <div class="text-caption bottom">{{ cartItem?.propertiesText }} </div>
                            </div>
                          </div>
                        </q-btn>
                      </td>
                      <td class="text-center" style="white-space:nowrap;">{{ cartItem?.quantity }}</td>
                      <td class="text-right" style="white-space:nowrap;">{{ (cartItem?.variant?.markupPrice * cartItem?.quantity) }} {{ checkoutCurrency }}</td>
                    </tr>
                    <tr v-for="(addon, index) in cartItem.addons" :key="`${cartItem?.id}-${index}`">
                      <td></td>
                      <td>
                        <div>{{ addon?.label }}</div>
                        <div v-if="addon?.inputValue" class="text-caption bottom">{{ addon?.inputValue }}</div>
                      </td>
                      <td class="text-center" style="white-space:nowrap;">{{ addon?.quantity }}</td>
                      <td class="text-right" style="white-space:nowrap;">{{ round(addon?.markupPrice * cartItem?.quantity, 3) }} {{ checkoutCurrency }}</td>
                    </tr>
                  </template>
                </tbody>
              </table>
              </q-card>
            </div>
          </div>

          <q-separator :dark="darkMode" spaced/>
          <div
            v-if="checkout?.payment?.escrowRefundAddress"
            class="row items-start no-wrap q-px-xs q-mb-sm"
          >
            <div class="q-space">
              <div class="text-grey text-caption" style="margin-bottom:-0.35em;">Payment refund address</div>
              <div style="word-break:break-all;">{{ checkout?.payment?.escrowRefundAddress || '---' }}</div>
            </div>
            <q-icon name="help" size="sm" class="q-my-sm"/>
            <q-menu
              anchor="bottom right" self="top right"
              class="q-pa-sm pt-card-2 text-bow"
              :class="getDarkModeClass(darkMode)"
            >
              BCH address of customer. Used as receipient in case of refund on payment
            </q-menu>
          </div>
          <div class="row items-center q-pa-xs">
            <div>BCH Price:</div>
            <q-space/>
            <div class="row items-center">
              <div>{{ checkoutBchPrice }} {{ checkoutCurrency }} / BCH</div>
              <q-icon name="info" size="1.25em"/>
              <q-menu class="q-pa-sm pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                <div class="text-body2">{{ checkoutCurrency }} price at</div>
                <div>{{ formatTimestampToText(checkout?.payment?.bchPrice?.timestamp) }}</div>
              </q-menu>
            </div>
          </div>
          <div class="q-px-xs" @click="toggleAmountsDisplay">
            <div class="row items-start text-subtitle2">
              <div class="q-space">Subtotal</div>
              <div v-if="displayBch">{{ checkoutAmounts.subtotal.bch }} BCH</div>
              <div v-else>{{ checkoutAmounts.subtotal.currency }} {{ checkoutCurrency }}</div>
            </div>
            <div class="row items-start text-subtitle2">
              <div class="q-space">Delivery fee</div>
              <div v-if="checkout?.deliveryAddress?.distance" class="text-grey q-mx-xs">{{ (checkout?.deliveryAddress?.distance / 1000).toFixed(3) }} km</div>
              <div v-if="displayBch">{{ checkoutAmounts.deliveryFee.bch }} BCH</div>
              <div v-else>{{ checkoutAmounts.deliveryFee.currency }} {{ checkoutCurrency }}</div>
            </div>
            <div class="row items-start text-h6">
              <div class="q-space">Total</div>
              <div v-if="displayBch">{{ checkoutAmounts.total.bch }} BCH</div>
              <div v-else>{{ checkoutAmounts.total.currency }} {{ checkoutCurrency }}</div>
            </div>

            <div v-if="checkoutAmounts.totalPaymentsSent.currency">
              <q-separator :dark="darkMode"/>
              <div v-if="payments?.length" class="row items-center q-mt-xs">
                <q-space/>
                <q-btn
                  flat
                  padding="none xs"
                  no-caps
                  class="button button-text-primary"
                  :class="getDarkModeClass(darkMode)"
                  :label="payments?.length == 1 ? 'View payment' : 'View payments'"
                  @click.stop="() => showPaymentsListDialog = true"
                />
              </div>
              <div v-if="checkoutAmounts.totalPaymentsSent.currency" class="row items-start text-subtitle1">
                <div class="q-space">Total Paid</div>
                <div v-if="displayBch">{{ checkoutAmounts.totalPaymentsSent.bch }} BCH</div>
                <div v-else>{{ checkoutAmounts.totalPaymentsSent.currency }} {{ checkoutCurrency }}</div>
              </div>
              <div v-if="checkoutAmounts.balanceToPay.currency" class="row items-start text-subtitle1">
                <div class="q-space">Remaining</div>
                <div v-if="displayBch">{{ checkoutAmounts.balanceToPay.bch }} BCH</div>
                <div v-else>{{ checkoutAmounts.balanceToPay.currency }} {{ checkoutCurrency }}</div>
              </div>
              <div v-else-if="checkoutAmounts.change.currency >= 0" class="row items-start text-h6">
                <div class="q-space">Change</div>
                <div v-if="displayBch">{{ checkoutAmounts.change.bch }} BCH</div>
                <div v-else>{{ checkoutAmounts.change.currency }} {{ checkoutCurrency }}</div>
              </div>
            </div>

          </div>
          <div class="q-mt-md">
            <q-btn
              no-caps
              label="Order"
              class="full-width button"
              @click="() => completeCheckout()"
            />
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>
    <PaymentsListDialog v-model="showPaymentsListDialog" :payments="payments"/>
    <RefundPaymentsDialog
      ref="refundPaymentsDialogRef"
      v-model="refundPaymentsDialog.show"
      :payments="refundPaymentsDialog.payments"
      @refunded="onRefundedPayments"
    />
  </q-pull-to-refresh>  
</template>
<script setup>
import { backend } from 'src/marketplace/backend'
import { Checkout, Rider, Payment, Location } from 'src/marketplace/objects'
import { TransactionListener, asyncSleep } from 'src/wallet/transaction-listener'
import { errorParser, formatTimestampToText, getISOWithTimezone, round } from 'src/marketplace/utils'
import { parseFiatCurrency } from 'src/utils/denomination-utils'
import { Wallet, loadWallet } from 'src/wallet'
import { Device } from '@capacitor/device';
import { debounce, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onUnmounted, inject, onDeactivated, onActivated } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'
import PhoneCountryCodeSelector from 'src/components/PhoneCountryCodeSelector.vue'
import CountriesFieldWrapper from 'src/components/marketplace/countries-field-wrapper.vue'
import GeolocateBtn from 'src/components/GeolocateBtn.vue'
import PaymentsListDialog from 'src/components/marketplace/PaymentsListDialog.vue'
import EscrowContractDialog from 'src/components/marketplace/escrow-contract-dialog.vue'
import CustomerLocationsDialog from 'src/components/marketplace/CustomerLocationsDialog.vue'
import DragSlide from 'src/components/drag-slide.vue'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import RefundPaymentsDialog from 'src/components/marketplace/RefundPaymentsDialog.vue'
import ImageViewerDialog from 'src/components/marketplace/ImageViewerDialog.vue'
import CartItemsList from 'src/components/marketplace/product/CartItemsList.vue'
import StorePickupDialog from 'src/components/marketplace/checkout/StorePickupDialog.vue'
import PaymentSelectionPanel from 'src/components/marketplace/checkout/PaymentSelectionPanel.vue'

import customerLocationPin from 'src/assets/marketplace/customer_map_marker.png'
import merchantLocationPin from 'src/assets/marketplace/merchant_map_marker_2.png'
import { parseCashbackMessage } from 'src/utils/engagementhub-utils/engagementhub-utils'
import { useCheckoutDetails } from 'src/composables/marketplace/checkout'
import { compileEscrowSmartContract, sendEscrowPayment } from 'src/marketplace/escrow'
import { useEscrowAmountsCalculator } from 'src/composables/marketplace/escrow'


const props = defineProps({
  checkoutId: [String, Number],
  cartId: [String, Number],
  deliveryType: String,
})

const { t: $t } = useI18n()
const $q = useQuasar()
const $router = useRouter()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const initialized = ref(false)
// onMounted(() => refreshPageDebounced())
onActivated(() => refreshPageDebounced())
onDeactivated(() => resetPage())
function resetPage() {
  checkout.value.raw = Checkout.parse()
  payments.value = []
  transactionsReceived.value = []
  resetFormData({ resetRider: true })
  resetFormErrors()
  tabs.value.active = tabs.value.opts?.[0]?.name
  tabs.value.opts.forEach(tab => tab.disable = tab.name === tabs.value.active)
  initialized.value = false
}

watch(
  () => [props.cartId, props.checkoutId],
  () => {
    resetPage()
    refreshPageDebounced()
  }
)

const tabs = ref({
  active: 'items',
  opts: [
    { label: 'Items', name: 'items', disable: true },
    { label: 'Delivery', name: 'delivery', disable: true },
    { label: 'Payment', name: 'payment', disable: true },
    { label: 'Review', name: 'review', disable: true },
  ]
})

const tabOptsMap = computed(() => {
  return tabs.value.opts.reduce((map, tab) => {
    map[tab.name] = tab
    return map
  }, {})
})

function nextTab() {
  const _tabs = tabs.value.opts
  const index = _tabs.findIndex(tabOpt => tabOpt.name === tabs.value.active)
  const nextIndex = Math.min(index + 1, _tabs.length-1)

  tabs.value.active = _tabs.at(nextIndex).name
}

watch(() => [tabs.value.active], () => {
  tabs.value.opts.forEach(tab => {
    if (tab.name !== tabs.value.active) return
    tab.disable = false
  })

  const deliveryFee = checkout.value?.payment?.deliveryFee
  if (['payment', 'review'].indexOf(tabs.value.active) >= 0 && (isNaN(deliveryFee) || deliveryFee == null)) {
    updateDeliveryFee()
  }
})

async function resetTabs() {
  tabs.value.opts.forEach(tab => tab.disable = true)
  tabs.value.opts[0].disable = false
  tabs.value.active = tabs.value.opts[0].name
  nextTab()

  await asyncSleep(10)
  if (!validCoordinates.value) return

  const hasName = Boolean(formData.value.delivery?.firstName && formData.value.delivery?.lastName)
  if (!formData.value.delivery?.phoneNumber || !hasName) return
 
  if (!checkout.value.deliveryAddress?.distance) await updateDeliveryFee().catch(console.error)
  await suggestStorePickup()
  await findRider({ replaceExisting: false, displayDialog: true })
  nextTab()

  if (checkout.value.balanceToPay) return
  await asyncSleep(10)
  nextTab()
}

async function enableTabs() {
  if (checkout.value?.cart?.subtotal && tabOptsMap.value?.items) {
    tabOptsMap.value.items.disable = false
    tabOptsMap.value.delivery.disable = false
  }
  await asyncSleep(10)
  if (validCoordinates.value && tabOptsMap.value?.payment) {
    tabOptsMap.value.payment.disable = false
  }
  if (!checkout.value.balanceToPay && tabOptsMap.value?.review) {
    tabOptsMap.value.review.disable = false
  }
}

const loadingState = ref({
  price: false,
  rider: false,
  deliveryFee: false,
  deliveryAddress: false,
  creatingPayment: false,
  payment: false,
  completing: false,
})
const loading = computed(() => {
  return Object.getOwnPropertyNames(loadingState.value)
    .reduce((loading, property) => loading || loadingState.value[property], false)
})
const loadingMsg = ref('')
function resolveLoadingMsg() {
  if (loadingState.value.completing) return 'Creating order'
  if (loadingState.value.payment) return 'Updating payment'
  if (loadingState.value.creatingPayment) return 'Creating payment'
  if (loadingState.value.deliveryAddress) return 'Updating delivery address'
  if (loadingState.value.deliveryFee) return 'Calculating delivery fee'
  if (loadingState.value.rider) return 'Finding a rider'
  return ''
}

const deliveryOptions = computed(() => {
  const deliveryTypes = checkoutStorefront.value?.deliveryTypes
  let options = [
    { value: Checkout.DeliveryTypes.STORE_PICKUP, slot: 'store_pickup' },
    { value: Checkout.DeliveryTypes.LOCAL_DELIVERY, slot: 'local_delivery' },
  ]
  if (Array.isArray(deliveryTypes)) {
    options = options.filter(opt => deliveryTypes.includes(opt.value))
  }

  if (options.length === 1 && checkout.value?.deliveryType === options[0].value) {
    return []
  }

  return options
})

const formData = ref({
  payment: {
    escrowRefundAddress: '',
  },
  deliveryType: '',
  delivery: {
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: {
      address1: '',
      address2: '',
      street: '',
      city: '',
      state: '',
      country: '',
      longitude: null,
      latitude: null,
    },
    rider: [].map(Rider.parse)[0],
  },
})

function resetFormData(opts={ resetRider: false }) {
  const existingRider = opts?.resetRider ? undefined : formData.value.delivery?.rider
  formData.value = {
    payment: {
      escrowRefundAddress: checkout.value?.payment?.escrowRefundAddress || bchAddress.value,
    },
    deliveryType: checkout.value?.deliveryType || '',
    delivery: {
      rider: existingRider,
      firstName: checkout?.value?.deliveryAddress?.firstName || '',
      lastName: checkout?.value?.deliveryAddress?.lastName || '',
      phoneNumber: checkout?.value?.deliveryAddress?.phoneNumber || '',
      address: {
        address1: checkout?.value?.deliveryAddress?.location?.address1 || '',
        address2: checkout?.value?.deliveryAddress?.location?.address2 || '',
        street: checkout?.value?.deliveryAddress?.location?.street || '',
        city: checkout?.value?.deliveryAddress?.location?.city || '',
        state: checkout?.value?.deliveryAddress?.location?.state || '',
        country: checkout?.value?.deliveryAddress?.location?.country || '',
        longitude: Number(checkout?.value?.deliveryAddress?.location?.longitude) || null,
        latitude: Number(checkout?.value?.deliveryAddress?.location?.latitude) || null,
      },
    },
  }
}

const showNumberCodeSelector = ref(false)
function replacePrimaryNumberCode(code='') {
  const isPhoneNumberLike = RegExp("\\+?[0-9\\-]+").test(formData.value.delivery.phoneNumber)
  if (typeof formData.value.delivery.phoneNumber !== 'string' || !isPhoneNumberLike) {
    formData.value.delivery.phoneNumber = code
    return
  }
  formData.value.delivery.phoneNumber = code + formData.value.delivery.phoneNumber.substring(code.length)
}


const geocoding = ref(false)
const validCoordinates = computed(() => 
  Number.isFinite(formData.value.delivery.address.longitude) && Number.isFinite(formData.value.delivery.address.latitude)
)

function selectCoordinates() {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      initLocation: {
        latitude: formData.value.delivery.address.latitude,
        longitude: formData.value.delivery.address.longitude,
      }
    }
  })
    .onOk(coordinates => {
      formData.value.delivery.address.longitude = coordinates.lng
      formData.value.delivery.address.latitude = coordinates.lat
    })
}

function onGeolocate(response) {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      initLocation: {
        latitude: response?.coords?.latitude,
        longitude: response?.coords?.longitude,
      }
    }
  }).onOk(pinLocationResp => {
    return reverseGeocode({ lat: pinLocationResp?.lat, lng: pinLocationResp?.lng, syncToForm: true })
  })
}

function reverseGeocode(opts = { lat: null, lng: null, syncToForm: false}) {
  const params = {
    lat: opts?.lat,
    lon: opts?.lng,
    format: 'json',
  }

  return backend.get(`https://nominatim.openstreetmap.org/reverse`, { params })
    .then(response => {
      const result = response?.data?.address
      const address1 = [
        result?.amenity || result?.shop || '',
        result?.village || result?.neighbourhood || result?.suburb || '',
      ].filter(Boolean).join(', ')

      const data = {
        address1: address1,
        address2: '',
        street: result?.road,
        city: result?.city,
        state: result?.state || result?.province || '', // most results have returned none so far
        country: result?.country || '',
        latitude: parseFloat(params.lat),
        longitude: parseFloat(params.lon),
      }
      if (opts?.syncToForm) Object.assign(formData.value.delivery.address, data)
      return data
    })
}

function geocode() {
  let street = [
    formData.value?.delivery?.address?.address1,
    formData.value?.delivery?.address?.street
  ].filter(Boolean).join(' ')

  const params = {
    format: 'json',
    street: street,
    city: formData.value?.delivery?.address?.city,
    country: formData.value?.delivery?.address?.country || undefined,
  }

  geocoding.value = true
  return backend.get('https://nominatim.openstreetmap.org/search', { params })
    .then(response => {
      const result = response?.data?.[0]
      if (!result) return
      const lat = Number(result?.lat)
      const lon = Number(result?.lon)
      if (!isNaN(lat) && !isNaN(lon)) {
        formData.value.delivery.address.longitude = lon
        formData.value.delivery.address.latitude = lat
        return { lat, lon }
      }
    })
    .finally(() => {
      geocoding.value = false
    })
}

function createEmptyFormErrors() {
  return {
    detail: [],
    payment: { detail: [].map(String), deliveryFee: '', escrowRefundAddress: '' },
    delivery: {
      detail: [],
      firstName: '',
      lastName: '',
      phoneNumber: '',
      location: {
        address1: '', address2: '',
        street: '', city: '',
        state: '', country: '',
        longitude: '', latitude: '',
      },
    }
  }
} 
const formErrors = ref(createEmptyFormErrors())
function resetFormErrors() {
  formErrors.value = createEmptyFormErrors()
}

let unsubscribeCacheCartMutation = null 
onMounted(() => {
  unsubscribeCacheCartMutation = $store.subscribe(mutation => {
    if (mutation?.type !== 'marketplace/cacheCart') return
    const payload = mutation?.payload
    if (payload?.id !== checkout.value?.cart?.id) return
    checkout.value.cart.raw = payload
  })
})
onUnmounted(() => unsubscribeCacheCartMutation?.())

const fetchingCheckout = ref(false)
const checkout = ref(Checkout.parse())
const fetchCheckoutError = ref('')
const {
  isStorePickup,
  checkoutCurrency, checkoutBchPrice,
  checkoutAmounts,
} = useCheckoutDetails(checkout)
const displayBch = ref(true)
watch(checkoutBchPrice, () => displayBch.value = displayBch.value && !isNaN(checkoutBchPrice))

function toggleAmountsDisplay() {
  displayBch.value = !displayBch.value && !isNaN(checkoutBchPrice.value)
}

/**
 * @param {Object} data
 * @param {Object} opts
 * @param {Object} opts.updateBchPrice
 * @param {Object} opts.checkNewPayment
 */
function setCheckoutData(data, opts) {
  checkout.value = Checkout.parse(data)
  if (opts?.updateBchPrice) updateBchPrice({ age: 0 })
  if (opts?.checkNewPayment && !payment.value && checkout.value?.balanceToPay > 0) attemptCreatePayment()
}
function fetchCheckout() {
  let request

  const sessionLocation = $store.getters['marketplace/sessionLocation']
  const parsedSessionLocationData = {
    address1: sessionLocation?.address1,
    address2: sessionLocation?.address2,
    street: sessionLocation?.street,
    city: sessionLocation?.city,
    state: sessionLocation?.state,
    country: sessionLocation?.country,
    zip_code: sessionLocation?.zip_code,
    longitude: parseFloat(sessionLocation?.longitude),
    latitude: parseFloat(sessionLocation?.latitude),
  }

  if (!initialized.value && !Number.isNaN(parsedSessionLocationData?.longitude) && !Number.isNaN(parsedSessionLocationData?.latitude)) {  
    const data = {
      delivery_type: props.deliveryType || Checkout.DeliveryTypes.LOCAL_DELIVERY,
      delivery_address: { location: parsedSessionLocationData },
      check_stocks: true,
    }
    if (props.checkoutId) request = backend.patch(`connecta/checkouts/${props.checkoutId}/`, data)
    else if (props.cartId) request = backend.post(`connecta/carts/${props.cartId}/checkout/`, data)
  } else {
    if (props.checkoutId) request = backend.get(`connecta/checkouts/${props.checkoutId}/`)
    else if (props.cartId) request = backend.post(`connecta/carts/${props.cartId}/checkout/`)
  }

  if (!request) return Promise.reject()
  fetchingCheckout.value = true
  return request.finally(() => {
    fetchCheckoutError.value = ''
  }).then(response => {
    setCheckoutData(response?.data)
    if (!initialized.value) resetTabs()
    else enableTabs()
    return response
  }).catch(error => {
    if (initialized.value) return Promise.reject(error)
    const data = error?.response?.data
    fetchCheckoutError.value = data?.detail
    if (!fetchCheckoutError.value && typeof error?.message === 'string' && error?.message?.length < 200) {
      fetchCheckoutError.value = error?.message
    } 
    return Promise.reject(error)
  }).finally(() => {
    fetchingCheckout.value = false
  })
}

function saveCart() {
  $store.dispatch('marketplace/saveCart', checkout.value.cart)
}

const updateBchPricePromise = ref()
function updateBchPrice(opts={age: 60 * 1000, abortIfCompleted: true }) {
  if (!updateBchPricePromise.value) {
    loadingState.value.price = true
    updateBchPricePromise.value = checkout.value.updateBchPrice(opts)
      .finally(() => {
        updateBchPricePromise.value = undefined
      })
      .then(() => resetFormData())
      .finally(() => loadingState.value.price = false)
  }
  return updateBchPricePromise.value
}

const customerLocationsDialog = ref({ show: false })
const customerLocations = computed(() => $store.getters['marketplace/customerLocations'])
function setAsDeliveryLocation(location=Location.parse()) {
  if (!location?.formatted && !location?.validCoordinates) return Promise.reject('Invalid address')

  formData.value.delivery.address = {
    address1: location?.address1,
    address2: location?.address2,
    street: location?.street,
    city: location?.city,
    state: location?.state,
    country: location?.country,
    longitude: parseFloat(location?.longitude),
    latitude: parseFloat(location?.latitude),
  }

  return submitDeliveryAddress()
}


async function findRider(opts={ replaceExisting: false, skipReplaceIfEmpty: false, displayDialog: false }) {
  if (formData.value?.deliveryType !== Checkout.DeliveryTypes.LOCAL_DELIVERY) return
  if (!opts?.replaceExisting && formData.value?.delivery?.rider?.id) return
  loadingState.value.rider = true
  loadingMsg.value = 'Finding a rider'

  let dialog
  try {
    if (opts?.displayDialog) {
      dialog = $q.dialog({
        title: 'Searching rider',
        message: 'Finding a nearby rider for delivery',
        progress: true,
        persistent: true,
        ok: false,
        cancel: false,
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
      })
    }

    const excludeIds = []
    if (opts?.replaceExisting && formData.value?.delivery?.rider?.id) {
      excludeIds.push(formData.value?.delivery?.rider?.id)
    }
    const riders = await findRiders(excludeIds).catch(() => [])
    loadingState.value.rider = false
    loadingMsg.value = resolveLoadingMsg()

    if (!riders[0]?.id && formData.value?.delivery?.rider?.id && opts?.skipReplaceIfEmpty) {
      (dialog?.update || $q.dialog)({
        title: 'Rider search',
        message: 'No other riders around to replace current one',
        ok: true,
        progress: false,
        persistent: false,
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
      })
      return
    }
    formData.value.delivery.rider = riders[0]
    dialog?.hide?.()
    if (riders?.length) return

    return new Promise((resolve, reject) => {
      $q.dialog({
        component: StorePickupDialog,
        componentProps: {
          storefront: checkoutStorefront.value,
          relativeLocation: checkout.value?.deliveryAddress?.location,
        },
      }).onCancel(() => {
        $router.replace({ params: { cartId: undefined } })
        $router.go(-1)
        reject()
      }).onOk(() => {
        formData.value.deliveryType = Checkout.DeliveryTypes.STORE_PICKUP
        saveDeliveryAddress()
        resolve()
      })
    })
  } catch(error) {
    dialog?.hide?.()
    return Promise.reject(error)
  }
}

function findRiders(excludeIds=[]) {
  const excludeRiderIds = !Array.isArray(excludeIds) ? [] : excludeIds.map(Number).filter(Number.isInteger)
  const data = {
    pickup_location: {
      longitude: checkoutStorefront.value?.location?.longitude,
      latitude: checkoutStorefront.value?.location?.latitude,
    },
    radius: 7500,
    exclude_rider_ids: excludeRiderIds?.length ? excludeRiderIds : undefined,
    max_active_deliveries: 2,
  }

  return backend.post('connecta-express/riders/find/', data)
    .then(response => {
      if (!Array.isArray(response?.data)) return Promise.reject({ response })
      return response?.data?.map(Rider.parse)
    })
    .catch(error => {
      console.error(error)
      return []
    })
}

function suggestStorePickup() {
  const deliveryDistance = parseFloat(checkout.value?.deliveryAddress?.distance)
  if (Number.isNaN(deliveryDistance) || deliveryDistance >= 250) return Promise.resolve()

  return dialogPromise({
    component: StorePickupDialog,
    componentProps: {
      storefront: checkoutStorefront.value,
      relativeLocation: checkout.value?.deliveryAddress?.location,
      title: 'Store Pickup',
      message: `Your delivery address is close to the store.
            Would you like to pick up from the store instead
            to save ${checkout.value.payment?.deliveryFee} ${checkoutCurrency.value}?
          `
    }
  })
    .then(() => {
      formData.value.deliveryType = Checkout.DeliveryTypes.STORE_PICKUP
      return saveDeliveryAddress().then(() => updateDeliveryFee()).catch(console.error)
    })
    .catch(() => {})
}

const updateDeliveryFeePromise = ref()
async function updateDeliveryFee() {
  await updateBchPricePromise.value?.catch?.(console.error)
  loadingState.value.deliveryFee = true
  loadingMsg.value = 'Calculating delivery fee'
  updateDeliveryFeePromise.value = backend.post(`connecta/checkouts/${checkout.value.id}/update_delivery_fee/`)
  return updateDeliveryFeePromise.value
    .finally(() => resetFormData())
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })
      checkout.value.raw = response?.data
      resetFormData()
    })
    .catch(error => {
      const data = error?.response?.data
      formErrors.value.payment.deliveryFee = data?.detail
      return Promise.reject(error)
    })
    .finally(() => {
      loadingState.value.deliveryFee = false
      loadingMsg.value = resolveLoadingMsg()
    })
    .finally(() => {
      updateDeliveryFeePromise.value = undefined
    })
}

async function submitDeliveryAddress() {
  try {
    loadingState.value.deliveryAddress = true
    loadingMsg.value = 'Locating address'
    if (!validCoordinates.value) await geocode()
    if (!validCoordinates.value) {
      resetFormErrors()
      formErrors.value.delivery.detail = ['Unable to locate delivery address. Please pin location of address']
      return Promise.reject()
    }
  } finally {
    loadingState.value.deliveryAddress = false
    loadingMsg.value = resolveLoadingMsg()
  }

  return saveDeliveryAddress().then(() => updateDeliveryFee())
    .then(() => findRider({ replaceExisting: false }))
}

function saveDeliveryAddress() {
  loadingState.value.deliveryAddress = true
  loadingMsg.value = 'Updating address'
  return updateCheckout({
    delivery_type: formData.value.deliveryType,
    delivery_address: {
      first_name: formData.value?.delivery?.firstName,
      last_name: formData.value?.delivery?.lastName,
      phone_number: formData.value?.delivery?.phoneNumber,
      location: {
        address1: formData.value?.delivery?.address?.address1,
        address2: formData.value?.delivery?.address?.address2,
        street: formData.value?.delivery?.address?.street,
        city: formData.value?.delivery?.address?.city,
        state: formData.value?.delivery?.address?.state,
        country: formData.value?.delivery?.address?.country,
        longitude: formData.value?.delivery?.address?.longitude,
        latitude: formData.value?.delivery?.address?.latitude,
      },
    }
  })
  .finally(() => resetFormErrors())
  .catch(error => {
    const data = error?.response?.data
    formErrors.value.delivery.detail = errorParser.toArray(data?.delivery_address?.non_field_errors)
    if (!formErrors.value.delivery.detail?.length) formErrors.value.delivery.detail = errorParser.toArray(data?.non_field_errors)
    if (!formErrors.value.delivery.detail?.length) formErrors.value.delivery.detail = errorParser.toArray(data?.delivery_address?.location) 
    if (!formErrors.value.delivery.detail?.length) formErrors.value.delivery.detail = errorParser.toArray(data?.delivery_type) 
    formErrors.value.delivery.firstName = errorParser.firstElementOrValue(data?.delivery_address?.first_name)
    formErrors.value.delivery.lastName = errorParser.firstElementOrValue(data?.delivery_address?.last_name)
    formErrors.value.delivery.phoneNumber = errorParser.firstElementOrValue(data?.delivery_address?.phone_number)
    formErrors.value.delivery.location = {
      address1: errorParser.firstElementOrValue(data?.delivery_address?.location?.address1),
      address2: errorParser.firstElementOrValue(data?.delivery_address?.location?.address2),
      street: errorParser.firstElementOrValue(data?.delivery_address?.location?.street),
      city: errorParser.firstElementOrValue(data?.delivery_address?.location?.city),
      state: errorParser.firstElementOrValue(data?.delivery_address?.location?.state),
      country: errorParser.firstElementOrValue(data?.delivery_address?.location?.country),
      longitude: errorParser.firstElementOrValue(data?.delivery_address?.location?.longitude),
      latitude: errorParser.firstElementOrValue(data?.delivery_address?.location?.latitude),
    }
    if (!formErrors.value.delivery.detail?.length) {
      if (Array.isArray(data)) formErrors.value.delivery.detail = data
      if (data?.detail) formErrors.value.delivery.detail = [data?.detail]
    }
    if (!formErrors.value.delivery.detail?.length) formErrors.value.delivery.detail = ['Unable to update delivery info']
    return Promise.reject(error)
  })
  .finally(() => {
    loadingState.value.deliveryAddress = false
    loadingMsg.value = resolveLoadingMsg()
  })
}

function savePayment() {
  loadingMsg.value = 'Updating payment'
  return updateCheckout({
    payment: { escrow_refund_address: formData.value.payment.escrowRefundAddress },
  })
  .finally(() => resetFormErrors())
  .catch(error => {
    const data = error?.response?.data
    formErrors.value.delivery.detail = errorParser.toArray(data?.non_field_errors)
    if (!formErrors.value.delivery.detail?.length) formErrors.value.delivery.detail = errorParser.toArray(data?.payment?.non_field_errors)
    formErrors.value.payment.escrowRefundAddress = errorParser.firstElementOrValue(data?.payment?.escrow_refund_address)
    formErrors.value.payment.deliveryFee = errorParser.firstElementOrValue(data?.payment?.delivery_fee)

    if (!formErrors.value.delivery.detail?.length) {
      if (Array.isArray(data)) formErrors.value.delivery.detail = data
      if (data?.detail) formErrors.value.delivery.detail = [data?.detail]
    }
    if (!formErrors.value.delivery.detail?.length) formErrors.value.delivery.detail = ['Unable to update delivery info']
    return Promise.reject(error)
  })
  .finally(() => {
    loadingMsg.value = resolveLoadingMsg()
  })
}

const payments = ref([].map(Payment.parse))
const payment = computed(() => {
  return payments.value.find(payment => {
    const isPending = payment.status == 'pending';
    const isEqualAmount = payment.totalAmount == checkout.value.balanceToPay;

    if (!payment.escrowContract) return isPending && isEqualAmount;

    const checkoutAmountCategory = checkout.value?.payment?.amountToken?.category || null;
    const checkoutDeliveryFeeCategory = checkout.value?.payment?.deliveryFeeToken?.category || null;
    const paymentAmountCategory = payment.escrowContract?.amountCategory || null;
    const paymentDeliveryFeeCategory = payment.escrowContract?.deliveryFeeKeyNft?.category || null;
    const isMatchingAssets = checkoutAmountCategory === paymentAmountCategory &&
                            checkoutDeliveryFeeCategory === paymentDeliveryFeeCategory;

    return isPending && isEqualAmount && isMatchingAssets;
  })
})
const showPaymentsListDialog = ref(false)
watch(() => [tabs.value.active], async () => attemptCreatePayment())

const fetchPaymentPromise = ref()
function fetchPayments() {
  const params = { checkout_id: checkout.value.id }
  fetchPaymentPromise.value = backend.get('connecta/payments/', { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      const parsedData = response?.data?.results?.map(Payment.parse)
          .filter(payment => payment?.checkoutId == checkout.value?.id)

      payments.value = parsedData
      return response
    })
  return fetchPaymentPromise
}

const createPaymentPromise = ref()
async function attemptCreatePayment(opts={ checkCurrentTab: true }) {
  if (!checkout.value.id) return
  if (checkout.value.totalPayable < 0) return

  if (opts?.checkCurrentTab && tabs.value.active != 'payment') return

  await fetchPaymentPromise.value
  if (!checkout.value?.payment?.bchPrice?.price) await updateBchPrice()?.catch?.(console.error)
  await updateBchPricePromise.value?.catch?.(console.error)
  await updateDeliveryFeePromise.value
  await createPaymentPromise.value?.catch?.(console.error)
  await asyncSleep(10)
  if (!payment.value) return createPayment()
}
const createPayment = debounce(async () => {
  if (checkout.value.balanceToPay <= 0) return Promise.resolve('Checkout paid')
  const data = {
    checkout_id: checkout.value.id,
    ignore_pending_payments: true,
    escrow: {
      // network: $store.getters['global/isChipnet'] ? 'chipnet' : 'mainnet',
      buyer_address: checkout.value?.payment?.escrowRefundAddress ? undefined : formData.value.payment?.escrowRefundAddress,
    },
    // amount: 100,
  }

  loadingState.value.creatingPayment = true
  loadingMsg.value = 'Creating payment'
  createPaymentPromise.value = backend.post(`connecta/checkouts/${checkout.value.id}/payment/`, data)
  return createPaymentPromise.value
    .finally(() => resetFormErrors())
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })
      payments.value.unshift(Payment.parse(response?.data))
      fetchCheckout()
      fetchPayments()
      return response
    })
    .catch(error => {
      if (payment.value?.id) return

      const data = error?.response?.data
      let errorMsgs = errorParser.toArray(data?.delivery_fee_key_nft?.non_field_errors)
      if (!errorMsgs.length) errorMsgs = errorParser.toArray(data?.escrow?.non_field_errors)
      if (!errorMsgs.length) errorMsgs = errorParser.toArray(data?.non_field_errors)
      if (!errorMsgs.length) errorMsgs = errorParser.toArray(data?.detail)
      if (!errorMsgs.length && typeof data === 'string') errorMsgs = errorParser.toArray(data)
      if (!errorMsgs.length) errorMsgs = [$t('UnableToCreatePayment')]
      formErrors.value.payment.detail = errorMsgs
    })
    .finally(() => {
      loadingState.value.creatingPayment = false
      loadingMsg.value = resolveLoadingMsg()
    })
}, 250)


const fundingRequirements = computed(() => {
  if (!payment.value?.escrowContract) return []
  const escrow = compileEscrowSmartContract(payment.value.escrowContract)
  return escrow.generateFundingOutputs()
})

const fundingRequirementFiatAmounts = computed(() => {
  if (!payment.value?.bchPrice) return {}
  if (!Array.isArray(fundingRequirements.value)) return {}
  const { getFundingRequirementFiatValues } = useEscrowAmountsCalculator(
    payment.value?.bchPrice, payment.value?.tokenPrices);

  const amountsData = getFundingRequirementFiatValues(fundingRequirements.value);

  const tokens = amountsData.filter(amountData => amountData?.category);
  const tokensWithInfo = tokens.filter(tokens => tokens.tokenUnits && tokens.tokenSymbol)
  const tokensWithoutInfo = tokens.filter(tokens => !tokens.tokenUnits || !tokens.tokenSymbol)
  return {
    totalSats: amountsData.reduce((subtotal, amountData) => subtotal + amountData.satoshis, 0),
    totalFiatValue: amountsData.reduce((subtotal, amountData) => subtotal + amountData.fiatValue, 0),
    tokensWithAmount: tokensWithInfo,
    tokensWithoutAmount: tokensWithoutInfo,
    hasTokens: tokensWithInfo.length > 0 || tokensWithoutInfo.length > 0,
  }
})

const bchPaymentState = ref({ tab: '' })
const bchPaymentData = computed(() => {
  const data = {
    escrowContract: payment.value?.escrowContract,
    bchPrice: payment.value?.bchPrice,
    tokenPrices: payment.value?.tokenPrices,
    address: payment.value?.escrowContract?.address || payment.value?.escrowContractAddress,
    bchAmount: parseFloat(payment.value?.escrowContract?.bchAmounts?.total),
    fiatAmount: 0,
    currency: payment.value?.bchPrice?.currency?.symbol,
    url: '',
    fundingRequirements: fundingRequirements.value,
  }
  if (!data.address || !data.bchAmount) return data
  if (fundingRequirements.value.length !== 1) return data
  if (fundingRequirements.value.length === 1) data.bchAmount = fundingRequirements.value[0].satoshis / 10 ** 8;

  const fiatPrice = parseFloat(payment.value?.bchPrice?.price)
  if (fiatPrice) data.fiatAmount = Math.round(data.bchAmount * fiatPrice * 10 ** 3) / 10 ** 3
  data.url = `${data?.address}?amount=${data.bchAmount}`
  return data
})
function showBchPaymentEscrowContract() {
  $q.dialog({
    component: EscrowContractDialog,
    componentProps: bchPaymentData.value,
  })
}

const txListener = ref(new TransactionListener())
const transactionsReceived = ref([].map(() => {
  const data = txListener.value.parseWebsocketDataReceived()
  return Object.assign({ marketValue: { symbol: '', price: 0, amount: 0 } }, data)
}))

watch(() => [payment.value?.escrowContractAddress], debounce(() => {
  payment.value?.fetchEscrowContract?.().then(() => checkPaymentFundingTx())
}, 250))
watch(() => [bchPaymentData.value?.address], () => {
  if (!bchPaymentData.value?.address) return txListener.value?.disconnect?.()
  txListener.value.address = bchPaymentData.value?.address
  txListener.value.addListener(txListenerCallback)
  if (txListener.value.readyState != WebSocket.OPEN) txListener.value.connect()
})
const txListenerCallback = (msg, parsedData) => {
  const price = parseFloat(bchPaymentData.value.bchPrice?.price)
  const marketValue = {
    symbol: bchPaymentData.value?.currency,
    price: price,
    amount: (Math.floor(parsedData?.value * price) / 10 ** 8),
  }
  marketValue.amount = Number(marketValue.amount.toPrecision(3))

  parsedData.marketValue = marketValue

  console.log('Received transaction:', parsedData)
  const index = transactionsReceived.value.findIndex(data => data?.txid == parsedData?.txid)
  if (index >= 0) transactionsReceived.value[index] = parsedData
  else transactionsReceived.value.push(parsedData)

  const fundingTx = getFundingTxFromReceivedTxs()
  if (fundingTx) bchPaymentState.value.tab = ''
  savePaymentFundingTx(fundingTx, { awaitCheckout: true })
    .then(() => {
      if (tabs.value.active == 'payment') nextTab()
      if (checkout.value.change <= 0) completeCheckout()
    })
    .finally(() => fetchPayments())
}

function getFundingTxFromReceivedTxs() {
  return transactionsReceived.value.find(tx => {
    if (tx.address != bchPaymentData.value.address) return false
    if (tx.tokenName != 'bch') return false
    return parseInt(tx.value) == Math.floor(bchPaymentData.value.bchAmount * 10 ** 8)
  })
}

function savePaymentFundingTx(txData=txListener.value.parseWebsocketDataReceived(), opts={ awaitCheckout: false }) {
  if (!txData?.txid) return Promise.reject()

  const data = {
    funding_txid: txData.txid,
    funding_vout: txData.index,
    funding_sats: txData.value,
  }
  loadingState.value.payment = true
  loadingMsg.value = 'Saving payment transaction'
  const dialog = $q.dialog({
    title: 'Verifying payment',
    message: 'Payment received',
    progress: { color: 'brandblue' },
    persistent: true,
    ok: false,
    cancel: false,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
  return backend.post(`connecta/escrow/${txData?.address}/set_funding_transaction/`, data)
    .then(async (response) => {
      if (payment.value?.escrowContractAddress == response?.data?.address) payment.value.fetchEscrowContract()
      const fetchCheckoutPromise = fetchCheckout()
      if (opts?.awaitCheckout) await fetchCheckoutPromise?.catch()
      dialog.hide()
      return response
    })
    .catch(error => {
      console.error(error)
      const data = error?.response?.data
      let errorMessage = errorParser.firstElementOrValue(data?.non_field_errors) ||
                        errorParser.firstElementOrValue(data?.detail)
      dialog.update({
        title: 'Payment verification error',
        message: errorMessage || 'Unable to verify payment',
      })
      return Promise.reject(error)
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false, ok: { color: 'brandblue' } })
      loadingState.value.payment = false
      loadingMsg.value = resolveLoadingMsg()
    })
}

const bchWalletBalance = computed(() => {
  const asset = $store.getters['assets/getAsset']?.('bch')?.[0]
  return asset?.spendable
})
const wallet = ref([].map(() => new Wallet())[0])
async function initWallet () {
  wallet.value = await loadWallet(undefined, $store.getters['global/getWalletIndex'])
}
function getChangeAddress(opts={chipnet: false}) {
  const walletTypes = opts?.chipnet
    ? $store.getters['global/getAllChipnetTypes']
    : $store.getters['global/getAllWalletTypes']

  const bchWalletData = walletTypes?.bch
  return bchWalletData?.lastChangeAddress
}

function onSendBchPaymentSwipe(resetSwipe=()=>{}) {
  $q.dialog({
    component: SecurityCheckDialog,
  })
    .onOk(() => {
      sendBchPayment()
        .then(() => bchPaymentState.value.tab = '')
        .finally(() => resetSwipe())
    })
    .onCancel(() => resetSwipe())
}

async function sendBchPayment() {
  const amount = bchPaymentData.value.bchAmount
  const address = bchPaymentData.value.address
  const chipnet = address.indexOf('bchtest:') >= 0
  const changeAddress = getChangeAddress({ chipnet })
  if (!wallet.value) await initWallet()

  const dialog = $q.dialog({
    title: 'Sending payment',
    mesage: `Sending ${amount} BCH to ${address}`,
    persistent: true,
    progress: true,
    ok: false,
    cancel: false,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })

  sendEscrowPayment(bchPaymentData.value?.escrowContract, wallet.value, dialog)
    .then(async result => {
      console.log('Escrow payment', result)
      if (!result.success) return Promise.reject(result)

      await asyncSleep(1000)
      fetchCheckout().then(() => {
        if (tabs.value.active == 'payment') nextTab()
        if (checkout.value.change <= 0) completeCheckout()
      })
      dialog.hide()
    })
    .catch(error => {
      console.error('Escrow payment error', error)
      let errorMessage = error?.error || ''
      if (errorMessage.indexOf('not enough balance in sender') > -1) {
        errorMessage = 'Not enough balance to cover the send amount and transaction fee'
      } else if (errorMessage.indexOf('has insufficient priority') > -1) {
        errorMessage = 'Not enough balance to cover the transaction fee'
      }

      dialog.update({ title: 'Unable to send payment', message: errorMessage })
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false, ok: true })
    })
}

function checkPaymentFundingTx() {
  const escrowContract = bchPaymentData.value?.escrowContract
  if (!escrowContract?.address) return Promise.resolve()
  if (escrowContract?.fundingTxid) return Promise.resolve()

  loadingState.value.payment = true
  loadingMsg.value = 'Checking payment'
  return backend.post(`connecta/escrow/${escrowContract?.address}/resolve_funding_transaction/`)
    .then(response => {
      if (response?.data?.address != escrowContract?.address) return Promise.reject({ response })
      escrowContract.raw = response?.data
      refreshPageDebounced()
        .then(() => {
          if (!checkout.value.balanceToPay && tabs.value.active == 'payment') nextTab()
        })
      return response
    })
    .catch(error => {
      if (error?.response) return error?.response
      return Promise.reject(error)
    })
    .finally(() => {
      loadingState.value.payment = false
      loadingMsg.value = resolveLoadingMsg()
    })
}


async function dialogPromise(qDialogOptions) {
  return new Promise((resolve, reject) => {
    $q.dialog(qDialogOptions).onOk(resolve).onDismiss(reject)
  })
}

onBeforeRouteLeave(async (to, from, next) => {
  next(await onLeaveCheckout())
})

async function onLeaveCheckout() {
  if (checkout.value?.orderId) return true

  const totalPending = checkout.value.totalPendingPayment
  const totalSent = checkout.value.totalPaymentsSent
  if (totalSent > 0) {
    const leaveWithPaymentsMade = await dialogPromise({
      title: 'Leaving page',
      message: 'You have payments sent already. Are you sure?',
      persistent: true,
      ok: { color: 'red', label: 'Leave page', noCaps: true, class: 'q-space' },
      cancel: { color: 'grey', label: 'Stay on page', noCaps: true, class: 'q-space' },
      class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
    }).then(() => true).catch(() => false)
    if (!leaveWithPaymentsMade) return leaveWithPaymentsMade

    if (totalPending > 0) {
      const didProceedToRefund = await refundPendingPaymentsPromptBeforeRouteLeave()
      if (didProceedToRefund) return false
    }

    return leaveWithPaymentsMade
  }

  return true
}

async function refundPendingPaymentsPromptBeforeRouteLeave() {
  const refund = await dialogPromise({
    title: 'Refund payments',
    message: 'You have refundable payments. Proceed to refund?',
    persistent: true,
    ok: { color: 'brandblue', label: 'Refund', noCaps: true, class: 'q-space button' },
    cancel: { color: 'grey', label: 'Leave page', noCaps: true, class: 'q-space' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).then(() => true).catch(() => false)

  if (refund) openRefundPaymentsDialog()
  return refund
}

const refundPaymentsDialogRef = ref()
const refundPaymentsDialog = ref({
  show: false,
  payments: [].map(Payment.parse),
})
function onRefundedPayments(payments=[].map(Payment.parse)) {
  if (!payments?.length) return
  fetchCheckout()
  fetchPayments()
}
async function openRefundPaymentsDialog() {
  refundPaymentsDialog.value.show = true
  refundPaymentsDialog.value.payments = payments.value
    .filter(payment => ['sent', 'received'].includes(payment?.status))

  // setTimeout(() => refundPaymentsDialogRef.value?.refundPayments?.(), 250)
}


const cashback = ref({ amountBch: 0, fiatAmount: 0, message: '', merchantName: '', parsedMessage: '' })
watch(() => [
  payment.value?.escrowContract?.buyerAddress,
  payment.value?.escrowContract?.sellerAddress,
], () => updateCashbackAmount())
async function updateCashbackAmount() {
  if (!payment.value?.escrowContract) return
  if (payment.value?.escrowContract?.amountCategory) return

  const deviceId = await Device.getId()
  const data = {
    merchant_address: payment.value?.escrowContract?.sellerAddress,
    customer_address: payment.value?.escrowContract?.buyerAddress,
    satoshis: payment.value.escrowContract?.amountSats,
    device_id: deviceId.uuid || deviceId.identifier,
  }
  cashback.value = { amountBch: 0, fiatAmount: 0, message: '', merchantName: '', parsedMessage: '' }
  if (!data.merchant_address || !data.customer_address || !data.satoshis) return

  // return backend.post(`http://localhost:8000/api/cashback/calculate_cashback/`, data)
  return backend.post(`cashback/calculate_cashback/`, data)
    .then(response => {
      const bch = round(parseFloat(response?.data?.cashback_amount), 8)
      const fiatAmount = round(payment.value.bchPrice.price * bch, 3)
      cashback.value = {
        amountBch: bch,
        fiatAmount: fiatAmount,
        merchantName: response?.data?.merchant_name,
        message: response?.data?.message,
      }
      try {
        cashback.value.parsedMessage = parseCashbackMessage(
          response?.data.message,
          bch,
          parseFiatCurrency(fiatAmount, checkoutCurrency.value),
          response?.data?.merchant_name,
        )
      } catch(error) {
        console.error(error)
      }
      return response
    })
}

function updateCheckout(data) {
  return backend.patch(`connecta/checkouts/${checkout.value.id}/`, data)
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })
      checkout.value.raw = response?.data
      resetFormData()
      return response
    })
}

async function completeCheckout() {
  if (loadingState.value.completing) return

  const data = {
    rider_id: formData.value?.delivery?.rider?.id || undefined,
  }

  const dialog = $q.dialog({
    title: 'Creating order',
    progress: true,
    ok: false,
    persistent: true,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
  loadingState.value.completing = true
  loadingMsg.value = 'Creating order'
  await updateBchPrice().catch(console.error)

  if (!checkout.value?.payment?.escrowRefundAddress) {
    await savePayment()
      .catch(error => {
        dialog.update({
          title: 'Error',
          message: 'Encountered error in saving payment details',
          progress: false, persistent: false, ok: true,
        }).onDismiss(() => {
          tabs.value.active = 'payment'
        })

        loadingState.value.completing = false
        loadingMsg.value = resolveLoadingMsg()
        return Promise.reject(error)
      })
  }

  return backend.post(`connecta/checkouts/${checkout.value.id}/complete/`, data)
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })

      const orderId = response?.data?.id
      checkout.value.orderId = orderId
      dialog.update({ title: 'Order placed!' }).onDismiss(() => {
        $router.replace({ name: 'app-marketplace-order', params: { orderId }})
      })
      return response
    })
    .catch(error => {
      const data = error?.response?.data
      const errorMessage = data?.detail ||
                           errorParser.firstElementOrValue(data?.non_field_errors) ||
                           errorParser.firstElementOrValue(data?.checkout_id) ||
                           'Encountered error in completing checkout'

      if (errorMessage === 'BCH price is not updated') updateBchPrice()
      dialog.update({ title: 'Error', message: errorMessage })
      return Promise.reject(error)
    })
    .then(() => {
      $store.dispatch('marketplace/refreshCart', {
        cartId: checkout.value?.cart?.id,
        existsInCache: true,
      })
    })
    .finally(() => {
      dialog.update({ progress: false, ok: true })
      loadingState.value.completing = false
      loadingMsg.value = resolveLoadingMsg()
    })
}

const checkoutStorefrontId = computed(() => checkout.value?.cart?.storefrontId)
onActivated(() => {
  if (!checkoutStorefrontId.value) return
  $store.commit('marketplace/setActiveStorefrontId', checkoutStorefrontId.value)
})
watch(checkoutStorefrontId, () => {
  if (!checkout.value?.cart?.storefrontId) return
  $store.commit('marketplace/setActiveStorefrontId', checkoutStorefrontId.value)
  if (!checkoutStorefront.value?.id) fetchCheckoutStorefront()
})

const checkoutStorefront = computed(() => $store.getters['marketplace/getStorefront']?.(checkoutStorefrontId.value))
function fetchCheckoutStorefront() {
  if (!checkoutStorefrontId.value) Promise.reject()
  backend.get(`connecta/storefronts/${checkoutStorefrontId.value}/`)
    .then(response => $store.commit('marketplace/cacheStorefront', response?.data))
}

function displayStorefrontLocation() {
  if (!checkoutStorefront.value?.location?.validCoordinates) return

  return displayCoordinates({
    hideCancel: true,
    headerText: checkoutStorefront.value?.name,
    latitude: Number(checkoutStorefront.value?.location?.latitude),
    longitude: Number(checkoutStorefront.value?.location?.longitude),
    markerIcon: {
      iconUrl: merchantLocationPin,
      iconSize: [30, 45],
      iconAnchor: [15, 45],
      popupAnchor:  [0, -45],
    }
  })
}

function displayDeliveryAddressLocation() {
  if (!checkout.value?.deliveryAddress?.location?.validCoordinates) return

  return displayCoordinates({
    hideCancel: true,
    headerText: 'Delivery address',
    latitude: Number(checkout.value?.deliveryAddress?.location?.latitude),
    longitude: Number(checkout.value?.deliveryAddress?.location?.longitude),
    markerIcon: {
      iconUrl: customerLocationPin,
      iconSize: [30, 45],
      iconAnchor: [15, 45],
      popupAnchor:  [0, -45],
    }
  })
}

function displayCoordinates(opts={latitude: 0, longitude: 0, headerText: undefined, hideCancel: undefined, markerIcon: undefined }) {
  console.log(opts)
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      static: true,
      headerText: opts?.headerText,
      hideCancel: opts?.hideCancel,
      initLocation: { latitude: opts?.latitude, longitude: opts?.longitude },
      markerIcon: opts?.markerIcon,
    }
  })
}

const bchAddress = computed(() => {
  return $store.getters['global/getWallet']('bch')?.lastAddress
})

const $copyText = inject('$copyText')
function copyToClipboard(value, message) {
  $copyText(value)
  $q.notify({
    message: message || 'Copied to clipboard',
    timeout: 800,
    color: 'blue-9',
    icon: 'mdi-clipboard-check'
  })
}

function openImage(img, title) {
  if (!img) return
  $q.dialog({
    component: ImageViewerDialog,
    componentProps: {
      image: img,
      title: title,
    }
  })  
}

async function refreshPage(done=() => {}) {
  try {
    initialized.value = Boolean(checkout.value.id)
    await Promise.all([
      fetchCheckout()
        .finally(() => resetFormData())
        .then(() => {
          return Promise.all([updateBchPrice(), fetchPayments()])
        })
        .then(() => attemptCreatePayment()),
    ])
  } finally {
    initialized.value = true
    done()
  }
}
const refreshPageDebounced = debounce((...args) => refreshPage(...args), 500)
</script>
<style scoped>
table.items-table {
  border-spacing: 4px;
}
table.items-table td {
  vertical-align: top;
}
.q-tab-panels {
  background: unset;
}
</style>
<style scoped lang="scss">
@media (min-width: $breakpoint-xs) {
  .review-panel-content {
    flex-direction: row-reverse;
  }
}
</style>
<style lang="scss" scoped>
  .payment-mode-panels.q-tab-panels {
    background: inherit;
  }
  .payment-mode-panels .q-tab-panel {
    padding: unset;
  }

  .q-banner .banner-error:not(:only-child) {
    display: list-item;
    margin-left: 0.75em;
  }

  .line-through {
    text-decoration: line-through;
  }
</style>
