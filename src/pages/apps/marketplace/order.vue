<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Marketplace')" class="header-nav" />

    <div v-if="!initialized" class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="q-px-sm text-h5 q-space">Order</div>
      <div v-if="fetchingOrder" class="text-center">
        <q-spinner size="3em"/>
      </div>
    </div>
    <div v-else class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-start no-wrap q-px-sm">
        <div class="q-space row items-start">
          <div class="text-h5 q-space">
            Order <template v-if="order?.id">#{{ order.id }}</template>
          </div>
          <div style="margin-left:-4px;">
            <q-chip
              :color="parsePaymentStatusColor(order?.paymentStatus)"
              class="text-weight-medium text-white"
              clickable
              @click="() => showPaymentsDialog = true"
            >
              {{ order?.formattedPaymentStatus }}
            </q-chip>
            <q-chip v-if="order?.formattedStatus" :color="order?.statusColor" text-color="white" class="text-weight-medium">
              {{ order?.formattedStatus }}
            </q-chip>
          </div>
        </div>
        <q-btn flat icon="more_vert" padding="xs" rounded class="q-r-mr-md">
          <q-menu class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <q-item
              v-close-popup clickable
              @click="() => showPaymentsDialog = true"
            >
              <q-item-section>
                <q-item-label>
                  View Payments
                </q-item-label>
              </q-item-section>
            </q-item>
            <template v-if="order.isPending">
              <q-separator/>
              <q-item
                v-close-popup clickable
                @click="() => confirmCancelOrder()"
              >
                <q-item-section>
                  <q-item-label>
                    {{ $t('CancelOrder') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
            <template v-if="order?.inProgress || hasOngoingDispute">
              <q-separator/>
              <q-item
                v-close-popup clickable
                @click="() => showOrderDisputeDialog()"
              >
                <q-item-section>
                  <q-item-label>
                    Dispute
                  </q-item-label>
                </q-item-section>
              </q-item>

            </template>
          </q-menu>
        </q-btn>
      </div>
      <div class="row items-center q-px-sm">
        <div v-if="order?.createdAt" class="text-caption text-grey q-space">
          {{ formatTimestampToText(order?.createdAt) }}
        </div>
      </div>
      <div class="q-mx-xs q-my-sm">
        <OrderProgressPanel v-if="!order?.isCompleted" :order="order">
          <template v-slot:bottom>
            <div v-if="order?.isStorePickup && order?.isReadyForPickup">
              <q-btn
                v-if="storefront?.location?.gmapsDirectionUrl"
                padding="xs sm"
                no-caps
                target="_blank"
                color="brandblue"
                class="float-right q-mt-sm q-mx-sm"
                :href="storefront?.location?.gmapsDirectionUrl"
              >
                <q-icon name="directions" size="1.1em" class="q-mr-xs"/>
                <span>Directions</span>
                <q-icon name="open_in_new" size="0.7em" color="grey-3" class="q-ml-sm"/>
              </q-btn>
            </div>
            <div v-else-if="order?.status === 'on_delivery'" class="row items-center justify-end">
              <q-btn
                padding="xs sm"
                no-caps
                color="brandblue"
                class="q-mt-sm q-mx-sm"
                @click="() => showMap = true"
              >
                <q-icon name="map" size="1.1em" class="q-mr-xs"/>
                <span>Open Map</span>
              </q-btn>
            </div>
            <div v-if="order?.isDelivered || (order?.isStorePickup && order?.isPickedUp)">
              <div v-if="autoCompleteTimeRemaining && autoCompleteTimeRemainingText" class="">
                <q-separator :dark="darkMode" class="q-mb-xs"/>
                Order will be marked completed in {{ autoCompleteTimeRemainingText }} seconds
              </div>

              <div class="row items-center justify-between q-mt-sm">
                <q-btn
                  outline
                  rounded
                  no-caps
                  :color="disputeButtonOpts.color"
                  padding="1px sm"
                  @click="() => showOrderDisputeDialog()"
                >
                  Dispute
                  <q-icon v-if="disputeButtonOpts.icon" :name="disputeButtonOpts.icon" size="1.25em" class="q-ml-xs"/>
                </q-btn>
                <q-btn
                  rounded
                  no-caps
                  :disable="hasOngoingDispute"
                  :loading="completingOrder"
                  label="Mark as Complete"
                  class="button"
                  padding="1px sm"
                  @click="() => completeOrder()"
                />
              </div>
            </div>
          </template>
        </OrderProgressPanel>
      </div>
      <template v-if="order?.balanceToPay > 0 && !order?.isCancelled">
        <q-banner
          class="q-mx-xs q-my-sm pt-card text-bow"
          :class="getDarkModeClass(darkMode)"
        >
          <div class="row items-center">
            <div>
              <div class="text-caption top">
                Balance to pay
                <span v-if="payment?.id" class="text-grey">#{{ payment?.id }}</span>
              </div>
              <q-space/>
              <div class="text-subtitle1">{{ order?.balanceToPay }} {{ orderCurrency }}</div>
            </div>
            <q-space/>
            <q-btn
              rounded
              outlined
              :loading="creatingPayment"
              no-caps label="Pay"
              class="button"
              padding="1px md"
              @click="() => showPaymentDialog = true"
            />
          </div>
        </q-banner>
      </template>
      <template v-if="order?.isCompleted && order?.totalPendingPayment">
        <q-banner
          class="q-mx-xs q-my-sm pt-card text-bow"
          :class="getDarkModeClass(darkMode)"
          inline-actions
        >
          <div>Payments in escrow</div>
          <div class="text-subtitle1">
            <template v-if="displayBch">{{ orderAmounts.totalPendingPayment.bch }} BCH</template>
            <template v-else>{{ orderAmounts.totalPendingPayment.currency }} {{ orderCurrency }}</template>  
          </div>
          <template v-slot:action>
            <q-btn rounded outlined no-caps class="button" padding="1px md" @click="() => releaseEscrowPayments()">
              Release escrow
            </q-btn>
          </template>
        </q-banner>
      </template>
      <q-banner
        v-else-if="hasOngoingDispute" rounded
        class="q-mx-xs q-my-sm pt-card text-bow"
        :class="getDarkModeClass(darkMode)"
      >
      <div class="row items-center justify-between q-gutter-y-sm" style="gap:12px;">
        <div>
          <div class="text-subtitle1">
            {{ $t('OrderDispute') }}
          </div>
          <div class="text-caption text-grey">Order is currently in dispute</div>
        </div>
        <q-btn
          outline
          rounded
          no-caps
          :color="disputeButtonOpts.color"
          padding="1px sm"
          @click="() => showOrderDisputeDialog()"
        >
        Dispute
        <q-icon v-if="disputeButtonOpts.icon" :name="disputeButtonOpts.icon" size="1.25em" class="q-ml-xs"/>
      </q-btn>
      </div>
      </q-banner>

      <q-banner
        v-if="orderReview?.id"
        class="q-mx-xs q-my-sm q-pa-sm pt-card text-bow rounded-borders"
        style="position:relative;" v-ripple
        :class="getDarkModeClass(darkMode)"
        @click="() => openOrderReviewDialog = true"
      >
        <q-btn
          v-if="customer?.id === orderReview?.createdByCustomer?.id"
          flat icon="edit"
          padding="xs"
          class="float-right"
          @click.stop="() => rateOrder()"
        />
        <div>Customer review</div>
        <q-rating
          readonly
          max="5"
          :model-value="orderReview?.rating * (5 / 100)"
          color="brandblue"
          icon-half="star_half"
        />
        <div v-if="orderReview?.imagesUrls?.length" class="text-caption text-grey top bottom">
          {{ orderReview?.imagesUrls?.length }} {{ orderReview?.imagesUrls?.length === 1 ? 'image' : 'images' }}
        </div>
        <div class="text-grey text-caption ellipsis">
          {{ orderReview?.text }}
        </div>
      </q-banner>
      <div v-else-if="canReviewOrder" class="q-mx-xs q-my-sm">
        <q-btn
          no-caps label="Leave a review"
          color="brandblue"
          class="full-width"
          @click="() => rateOrder()"
        />
      </div>
      <q-dialog v-model="openOrderReviewDialog" position="bottom">
        <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="row items-center no-wrap">
              <div class="text-h5 q-space">Order Review</div>
              <q-btn flat icon="close" padding="sm" v-close-popup/>
            </div>
            <ReviewsListPanel :reviews="[orderReview]"/>
          </q-card-section>
        </q-card>
      </q-dialog>
      <div class="row items-start items-delivery-address-panel">
        <div v-if="order?.deliveryAddress?.id || delivery?.id" class="col-12 col-sm-4 q-pa-xs">
          <q-card
            v-if="order?.assignedStaff?.id && storefront?.id"
            class="q-px-md q-py-sm pt-card text-bow q-mb-sm"
            :class="getDarkModeClass(darkMode)"
          >
            <div class="text-subtitle1">{{ storefront?.name || 'Assigned staff' }}</div>
            <q-separator class="q-mb-sm"/>
            <div>
              <q-btn
                v-if="order?.assignedStaff?.phoneNumber && storefront?.phoneNumber"
                flat
                padding="sm"
                icon="phone"
                class="float-right"
              >
                <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                  <q-item
                    clickable v-close-popup
                    :href="`tel:${order?.assignedStaff?.phoneNumber}`"
                  >
                    <q-item-section>
                      <q-item-label caption>Staff</q-item-label>
                      <q-item-label>{{ order?.assignedStaff?.phoneNumber }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item
                    clickable v-close-popup
                    :href="`tel:${order?.assignedStaff?.phoneNumber}`"
                  >
                    <q-item-section>
                      <q-item-label caption>Shop</q-item-label>
                      <q-item-label>{{ storefront?.phoneNumber }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-menu>
              </q-btn>
              <q-btn
                v-else-if="order?.assignedStaff?.phoneNumber || storefront?.phoneNumber"
                flat
                padding="sm"
                icon="phone"
                class="float-right"
                :href="`tel:${order?.assignedStaff?.phoneNumber || storefront?.phoneNumber}`"
              >
              </q-btn>
              <div class="row items-start no-wrap">
                <img
                  v-if="order?.assignedStaff?.profilePictureUrl"
                  :src="order?.assignedStaff?.profilePictureUrl"
                  class="rounded-borders q-mt-xs q-mr-xs"
                  style="height:3rem;width:3rem;object-position:center;object-fit:cover;"
                  @click="() => openImage(
                    order?.assignedStaff?.profilePictureUrl,
                    order?.assignedStaff?.fullName || 'Assigned Staff',
                  )"
                />
                <div class="q-space">
                  <div>{{ order?.assignedStaff?.fullName }}</div>
                  <div>{{ order?.assignedStaff?.phoneNumber }}</div>
                  <div>{{ storefront?.phoneNumber }}</div>
                </div>
              </div>
            </div>
          </q-card>
          <LeafletMapDialog ref="mapDialog" v-model="showMap" :locations="mapLocations"/>
          <q-card
            v-if="order?.isStorePickup"
            class="q-px-md q-py-sm q-mb-sm pt-card text-bow"
            :class="getDarkModeClass(darkMode)"
          >
            <div class="text-subtitle1">Store pickup</div>
            <div v-if="order.status !== 'completed'" class="text-grey text-caption bottom">
              Pickup order after order is prepared
            </div>
            <q-separator spaced/>
            <div
              class="row items-start no-wrap"
              v-ripple style="position:relative;"
              @click="() => showMap = true"
            >
              <img :src="merchantLocationPin" style="height:1.9rem;" class="q-mb-xs q-mr-xs"/>
              <div class="q-space">
                <div class="text-subtitle2">{{ storefront?.name }}</div>
                <div>{{ storefront?.location?.formatted }}</div>
              </div>
              <q-btn
                v-if="storefront?.location?.gmapsDirectionUrl"
                flat
                padding="sm"
                icon="directions"
                target="_blank"
                @click.stop
                :href="storefront?.location?.gmapsDirectionUrl"
              />
            </div>
          </q-card>
          <q-card
            v-if="!order?.isStorePickup && order?.deliveryAddress?.id || delivery?.id"
            class="q-px-md q-py-sm pt-card text-bow"
            :class="getDarkModeClass(darkMode)"
          >
            <q-btn
              flat
              padding="none"
              no-caps
              label="Open Map"
              class="float-right q-mt-xs button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              @click="() => showMap = true"
            />
            <div class="text-subtitle1">
              Delivery
              <span v-if="delivery?.id" class="text-grey">#{{ delivery?.id }}</span>
            </div>
            <q-separator :dark="darkMode" class="q-mb-sm"/>
            <div v-if="delivery?.id">
              <div
                v-if="delivery.deliveredAt || delivery.pickedUpAt"
                class="row items-center q-mb-sm q-pa-sm rounded-borders pt-card-2 shadow-1"
                :class="getDarkModeClass(darkMode)"
              >
                <q-icon
                  name="delivery_dining"
                  size="1.75em"
                  :color="delivery?.deliveredAt ? 'green' : 'amber'"
                  class="q-mr-xs"
                />
                <div v-if="delivery.deliveredAt && delivery.pickedUpAt">Order picked up and delivered</div>
                <div v-else-if="delivery.deliveredAt">Order delivered</div>
                <div v-else-if="delivery.pickedUpAt">Order picked up</div>
                <q-space/>
                <div class="text-grey">
                  {{ formatDateRelative(delivery.deliveredAt || delivery.pickedUpAt) }}
                  <q-menu
                    class="q-pa-sm pt-card-2 text-bow" :class="getDarkModeClass(darkMode)"
                  >
                    <div v-if="delivery.pickedUpAt">
                      Picked up {{ formatTimestampToText(delivery.pickedUpAt) }}
                    </div>
                    <div v-if="delivery.deliveredAt">
                      Delivered {{ formatTimestampToText(delivery.deliveredAt) }}
                    </div>
                  </q-menu>
                </div>
              </div>
              <div class="row items-start no-wrap">
                <img :src="riderLocationPin" style="height:1.9rem;" class="q-mb-xs q-mr-xs"/>
                <div class="q-space">
                  <q-btn
                    v-if="delivery?.rider?.id && delivery?.rider?.phoneNumber"
                    flat
                    padding="sm"
                    icon="phone"
                    class="float-right"
                    :href="`tel:${delivery?.rider?.phoneNumber}`"
                  />
                  <div class="text-subtitle2 text-weight-medium">
                    Rider
                    <q-icon v-if="delivery?.activeRiderId" name="check_circle" size="1.5em" color="green">
                      <q-menu class="q-pa-sm pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                        Rider has accepted delivery
                        <span v-if="delivery?.acceptedAt">({{  formatDateRelative(delivery?.acceptedAt) }})</span>
                      </q-menu>
                    </q-icon>
                  </div>
                  <div v-if="delivery?.rider?.id" class="row items-center">
                    <img
                      v-if="delivery?.rider?.id && delivery?.rider?.profilePictureUrl"
                      :src="delivery?.rider?.profilePictureUrl"
                      class="rounded-borders q-mr-xs"
                      style="height:2rem;width:2rem;object-position:center;object-fit:cover;"
                      @click="() => openImage(
                        delivery?.rider?.profilePictureUrl,
                        delivery?.rider?.fullName || 'Rider',
                      )"
                    />
                    <div class="q-space">
                      <div>{{ delivery?.rider?.fullName }}</div>
                      <div>{{ delivery?.rider?.phoneNumber }}</div>
                    </div>
                  </div>
                  <div v-else class="text-grey">No rider yet</div>
                </div>
              </div>
              <q-separator :dark="darkMode" spaced/>
            </div>
            <div class="q-gutter-xs delivery-locations-panel">
              <div class="row items-start no-wrap">
                <img :src="merchantLocationPin" style="height:1.9rem;" class="q-mb-xs q-mr-xs"/>
                <div class="ellipsis-3-lines">{{ deliveryPanel?.pickupAddress?.location?.formatted }}</div>
              </div>
              <div class="self-center text-center">
                <q-icon name="arrow_forward" class="arrow"/>
              </div>
              <div class="row items-start no-wrap">
                <img :src="customerLocationPin" style="height:1.9rem;" class="q-mb-xs q-mr-xs"/>
                <div class="ellipsis-3-lines">{{ deliveryPanel?.deliveryAddress?.location?.formatted }}</div>
              </div>
            </div>
          </q-card>
        </div>
        <div class="q-pa-xs q-space" style="max-width:100%;">
          <q-card class="q-pa-sm pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <div class="q-px-sm">
              <div class="row items-center">
                <div class="q-space text-subtitle1">Items</div>
                <q-btn
                  flat padding="xs sm"
                  no-caps label="BCH"
                  :color="displayBch ? undefined : 'grey'"
                  @click="() => displayBch = true"
                />
                <q-separator vertical inset/>
                <q-btn
                  flat padding="xs sm"
                  no-caps :label="orderCurrency || 'Fiat'"
                  :color="!displayBch ? undefined : 'grey'"
                  @click="() => displayBch = false"
                />
              </div>
              <q-separator :dark="darkMode"/>
            </div>
            <q-markup-table class="full-width items-table pt-card" :class="getDarkModeClass(darkMode)">
              <tr>
                <th colspan="2" class="full-width">Item</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Subtotal</th>
              </tr>
              <template v-for="orderItem in order?.items" :key="orderItem?.id">
                <tr>
                  <td colspan="2">
                    <q-btn
                      flat no-caps
                      padding="none"
                      :to="{
                        name: 'app-marketplace-product',
                        params: { productId: orderItem?.variant?.product?.id },
                        query: { variantId: orderItem?.variant?.id },
                      }"
                    >
                      <div class="row items-center justify-left no-wrap full-width text-left">
                        <q-img
                          v-if="orderItem?.variant?.itemImage"
                          :src="orderItem?.variant?.itemImage"
                          width="35px"
                          ratio="1"
                          style="min-width:35px;"
                          class="rounded-borders q-mr-xs"
                        />
                        <div class="q-space">
                          <div class="text-weight-medium">{{ orderItem?.variant?.itemName }}</div>
                          <div class="text-caption bottom">{{ orderItem?.propertiesText }} </div>
                        </div>
                      </div>
                    </q-btn>
                  </td>
                  <td class="text-center" style="white-space:nowrap;">{{ formatFiatAmount(orderItem?.displayPrice) }}</td>
                  <td class="text-center" style="white-space:nowrap;">{{ orderItem?.quantity }}</td>
                  <td class="text-center" style="white-space:nowrap;">{{ formatFiatAmount(round(orderItem?.displayPrice * orderItem?.quantity, 3)) }}</td>
                </tr>
                <tr v-for="(addon, index) in orderItem.addons" :key="`${orderItem?.id}-${index}`">
                  <td></td>
                  <td>
                    <div>{{ addon?.label }}</div>
                    <div v-if="addon?.inputValue" class="text-caption bottom">{{ addon?.inputValue }}</div>
                  </td>
                  <td class="text-center" style="white-space:nowrap;">{{ formatFiatAmount(addon?.markupPrice) }}</td>
                  <td class="text-center" style="white-space:nowrap;">{{ addon?.quantity }}</td>
                  <td class="text-center" style="white-space:nowrap;">{{ formatFiatAmount(round(addon?.markupPrice * orderItem?.quantity, 3)) }}</td>
                </tr>
              </template>
              <tr v-if="orderAmounts?.cutlerySubtotal">
                <td colspan="4" class="q-py-xs">
                  <div class="text-weight-medium">{{ $t('Cutlery') }}</div>
                  <div class="text-caption bottom">
                    {{ $t('AdditionalChargesForCutlery') }}
                  </div>
                </td>
                <td class="text-center">
                  <div v-if="displayBch">{{ orderAmounts.cutlerySubtotal.bch }} BCH</div>
                  <div v-else>{{ orderAmounts.cutlerySubtotal.currency }} {{ orderCurrency }}</div>
                </td>
              </tr>
            </q-markup-table>
          </q-card>
        </div>
      </div>

      <div class="q-px-xs q-pt-sm q-pb-md" @click="toggleAmountsDisplay">
        <q-banner v-if="aggregatedCashback?.parsedMessage" rounded class="bg-grad q-mb-md">
          <span v-html="aggregatedCashback?.parsedMessage"></span>
        </q-banner>

        <div class="row items-start text-subtitle2">
          <div class="q-space">Subtotal</div>
          <div v-if="displayBch">{{ orderAmounts.subtotal.bch }} BCH</div>
          <div v-else>{{ orderAmounts.subtotal.currency }} {{ orderCurrency }}</div>
        </div>
        <div class="row items-start text-subtitle2">
          <div class="q-space">Delivery fee</div>
          <div v-if="displayBch">{{ orderAmounts.deliveryFee.bch }} BCH</div>
          <div v-else>{{ orderAmounts.deliveryFee.currency }} {{ orderCurrency }}</div>
        </div>
        <div class="row items-start text-h6">
          <div class="q-space">Total</div>
          <div v-if="displayBch">{{ orderAmounts.total.bch }} BCH</div>
          <div v-else>{{ orderAmounts.total.currency }} {{ orderCurrency }}</div>
        </div>

        <template v-if="orderAmounts.totalPaid.currency || orderAmounts.totalPendingPayment.currency">
          <q-separator :dark="darkMode"/>
          <div class="row items-start text-body1">
            <div class="q-space">Total Paid</div>
            <div v-if="displayBch">{{ orderAmounts.totalPaid.bch || 0 }} BCH</div>
            <div v-else>{{ orderAmounts.totalPaid.currency || 0 }} {{ orderCurrency }}</div>
          </div>
          <div
            v-if="orderAmounts.totalPendingPayment.currency"
            class="row items-start text-grey"
            @click.stop
          >
            <div class="q-space">Pending amount</div>
            <div v-if="displayBch">{{ orderAmounts.totalPendingPayment.bch }} BCH</div>
            <div v-else>{{ orderAmounts.totalPendingPayment.currency }} {{ orderCurrency }}</div>
            <q-menu class="q-pa-md pt-card text-bow" :class="getDarkModeClass(darkMode)">
              Amount sent by customer but not yet received
            </q-menu>
          </div>
          <template v-if="orderAmounts.totalRefunded.currency">
            <div class="row items-start text-grey" @click.stop>
              <div class="q-space">Total refunded</div>
              <div v-if="displayBch">{{ orderAmounts.totalRefunded.bch }} BCH</div>
              <div v-else>{{ orderAmounts.totalRefunded.currency }} {{ orderCurrency }}</div>
            </div>
            <div class="row items-start text-body1" @click.stop>
              <div class="q-space">Net paid</div>
              <div v-if="displayBch">{{ orderAmounts.netPaid.bch }} BCH</div>
              <div v-else>{{ orderAmounts.netPaid.currency }} {{ orderCurrency }}</div>
            </div>
          </template>
          <div
            v-if="orderAmounts.change.currency"
            class="row items-start text-h6"
            @click.stop
          >
            <div class="q-space">Change</div>
            <div v-if="displayBch">{{ orderAmounts.change.bch }} BCH</div>
            <div v-else>{{ orderAmounts.change.currency }} {{ orderCurrency }}</div>
          </div>
        </template>
      </div>
    </div>
    <div class="fixed-bottom q-pl-sm q-pb-sm">
      <OrderChatButton
        ref="chatButton"
        :order-id="orderId"  
      >
        <template v-if="order?.inProgress || orderDispute?.id" v-slot:before-messages>
          <div class="row item-center q-r-mt-sm q-pb-xs">
            <q-btn
              outline
              rounded
              no-caps
              :color="disputeButtonOpts.color"
              padding="xs md"
              @click="() => showOrderDisputeDialog()"
            >
              Dispute
              <q-icon v-if="disputeButtonOpts.icon" :name="disputeButtonOpts.icon" size="1.25em" class="q-ml-xs"/>
            </q-btn>
          </div>
          <q-separator/>
        </template>
      </OrderChatButton>
    </div>
    <OrderPaymentsDialog v-model="showPaymentsDialog" :payments="payments"/>
    <q-dialog v-model="showPaymentDialog" position="bottom">
      <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="row no-wrap items-center justify-center">
            <div class="text-h6 q-mt-sm">Payment</div>
            <q-space/>
            <q-btn flat padding="sm" icon="close" v-close-popup class="close-button" />
          </div>
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
          <div class="row items-center justify-center">
            <div class="col-qr-code">
              <q-skeleton v-if="creatingPayment" height="200px" width="200px"/>
              <qr-code v-else :text="bchPaymentData?.url" :size="200"/>
            </div>
          </div>
          <div v-if="creatingPayment" class="q-gutter-sm column items-center q-mt-sm">
            <q-skeleton height="1.5em" width="10em"/>
            <q-skeleton height="1em" width="8em"/>
            <q-skeleton height="2.5em" width="100%"/>
          </div>
          <div v-else class="text-center">
            <div class="text-h6">{{ bchPaymentData?.bchAmount }} BCH</div>
            <div v-if="bchPaymentData?.fiatAmount" class="text-subtitle1" style="line-height:0.75em;">
              {{ bchPaymentData?.fiatAmount }} {{ bchPaymentData?.currency }}
            </div>
            <div class="text-subtitle2" style="word-break: break-all;">{{ bchPaymentData?.address }}</div>
          </div>
          <div class="text-caption q-mt-sm">
            Balance: {{ bchWalletBalance }} BCH
          </div>
        </q-card-section>
        <DragSlide v-if="!creatingPayment" disable-absolute-bottom @swiped="onSendBchPaymentSwipe"/>
      </q-card>
    </q-dialog>
    <q-dialog v-model="showOrderCompletedPrompt">
      <q-card class="rounded-borders pt-card text-bow" :class="getDarkModeClass(darkMode)">
        <q-btn flat icon="close" padding="sm" class="float-right" style="z-index:100;" v-close-popup/>
        <q-card-section class="text-center">
          <div class="text-h5">Order Complete</div>
          <q-icon name="check_circle" color="green" size="5rem"/>
          <div>Order has been completed, thank you for using our service!</div>
          <div v-if="canReviewOrder">
            <q-btn
              no-caps label="Leave a review"
              color="brandblue"
              padding="2px md"
              class="q-mt-md"
              v-close-popup
              @click="() => rateOrder()"
            />
          </div>
          <q-btn
            :flat="canReviewOrder"
            no-caps label="Go to marketplace"
            color="brandblue"
            padding="2px md"
            class="q-mt-md"
            v-close-popup
            :to="{ name: 'app-marketplace' }"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-pull-to-refresh>
</template>
<script setup>
import { bus } from 'src/wallet/event-bus'
import { backend } from 'src/marketplace/backend'
import { marketplaceRpc } from 'src/marketplace/rpc'
import { Delivery, Order, OrderDispute, Payment, Review, Storefront } from 'src/marketplace/objects'
import { parseCashbackMessage } from 'src/utils/engagementhub-utils/engagementhub-utils'
import { errorParser, formatDateRelative, formatTimestampToText, parsePaymentStatusColor, round } from 'src/marketplace/utils'
import { fetchOrderPaymentsForSettlements, generateSettlementTransactions } from 'src/marketplace/escrow'
import { parseFiatCurrency } from 'src/utils/denomination-utils'
import { Device } from '@capacitor/device';
import { debounce, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onUnmounted, inject, onActivated, onDeactivated } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import LeafletMapDialog from 'src/components/LeafletMapDialog.vue'
import OrderPaymentsDialog from 'src/components/marketplace/order-payments-dialog.vue'
import EscrowContractDialog from 'src/components/marketplace/escrow-contract-dialog.vue'
import DragSlide from 'src/components/drag-slide.vue'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import OrderChatButton from 'src/components/marketplace/OrderChatButton.vue'
import OrderDisputeFormDialog from 'src/components/marketplace/order/OrderDisputeFormDialog.vue'
import { loadWallet, Wallet } from 'src/wallet'
import { TransactionListener, asyncSleep } from 'src/wallet/transaction-listener'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import customerLocationPin from 'src/assets/marketplace/customer_map_marker.png'
import riderLocationPin from 'src/assets/marketplace/rider_map_marker_2.png'
import merchantLocationPin from 'src/assets/marketplace/merchant_map_marker_2.png'
import ReviewFormDialog from 'src/components/marketplace/reviews/ReviewFormDialog.vue'
import ReviewsListPanel from 'src/components/marketplace/reviews/ReviewsListPanel.vue'
import ImageViewerDialog from 'src/components/marketplace/ImageViewerDialog.vue'
import OrderProgressPanel from 'src/components/marketplace/order/OrderProgressPanel.vue'

const props = defineProps({
  orderId: [String, Number],  
})

const pageActive = ref(false)
onActivated(() => pageActive.value = true)
onDeactivated(() => pageActive.value = false)

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $q = useQuasar()
const { t: $t } = useI18n()

const customer = computed(() => $store.getters['marketplace/customer'])

onMounted(() => refreshPage())
const initialized = ref(false)
function resetPage() {
  initialized.value = false
  order.value.raw = null
  delivery.value = Delivery.parse()
  payments.value = []
  chatButton.value?.reset?.()
  orderReview.value = null
}
watch(
  () => [props.orderId],
  () => {
    resetPage()
    refreshPage()
  }
)

const chatButton = ref()
function openChatDialog() {
  chatButton.value.openChatDialog = true
}

const delivery = ref(Delivery.parse())
const fetchingDelivery = ref(false)
function fetchDelivery() {
  if (!props.orderId) return Promise.reject()
  const params = { order_id: props.orderId }

  fetchingDelivery.value = true
  return backend.get(`connecta-express/deliveries/`, { params })
    .then(response => {
      const data = response?.data?.results?.[0]
      delivery.value = Delivery.parse(data)
      return response
    })
    .finally(() => {
      fetchingDelivery.value = false
    })
}

const order = ref(Order.parse())
const storefrontId = computed(() => order.value?.storefrontId)
onActivated(() => {
  if (!storefrontId.value) return
  $store.commit('marketplace/setActiveStorefrontId', storefrontId.value)
})
watch(storefrontId,() => {
  if (!storefrontId.value) return
  $store.commit('marketplace/setActiveStorefrontId', storefrontId.value)
})
const fetchingOrder = ref(false)
const orderCurrency = computed(() => order.value?.currency?.symbol)
const orderBchPrice = computed(() => order.value?.bchPrice?.price || undefined)
function fetchOrder() {
  if (!props.orderId) return Promise.reject()
  fetchingOrder.value = true
  return backend.get(`connecta/orders/${props.orderId}/`)
    .then(response => {
      order.value = Order.parse(response?.data)
      return response
    })
    .finally(() => {
      fetchingOrder.value = false
    })
}
fetchOrder.debounced = debounce(fetchOrder, 500)

const orderAmounts = computed(() => {
  const data = {
    subtotal: { currency: order.value?.markupSubtotal || 0, bch: 0 },
    cutlerySubtotal: { currency: order.value?.cutlerySubtotal || 0, bch: 0 },
    deliveryFee: { currency: order.value?.payment?.deliveryFee || 0, bch: 0 },
    total: { currency: order.value?.total, bch: 0 },
    totalPaid: { currency: parseFloat(order.value?.totalPaid), bch: 0 },
    totalPendingPayment: { currency: parseFloat(order.value?.totalPendingPayment), bch: 0 },
    totalRefunded: { currency: parseFloat(order.value?.totalRefunded), bch: 0 },
    netPaid: { currency: parseFloat(order.value?.netPaid), bch: 0 },
    change: { currency: parseFloat(order.value.change), bch: 0}
  }

  data.subtotal.bch = fiatToBch(data.subtotal.currency)
  data.cutlerySubtotal.bch = fiatToBch(data.cutlerySubtotal.currency)
  data.deliveryFee.bch = fiatToBch(data.deliveryFee.currency)
  data.total.bch = fiatToBch(data.total.currency)
  data.totalPaid.bch = fiatToBch(data.totalPaid.currency)
  data.totalPendingPayment.bch = fiatToBch(data.totalPendingPayment.currency)
  data.totalRefunded.bch = fiatToBch(data.totalRefunded.currency)
  data.netPaid.bch = fiatToBch(data.netPaid.currency)
  data.change.bch = fiatToBch(data.change.currency)

  return data
})

const parseBch = num => Math.floor(num * 10 ** 8) / 10 ** 8
function fiatToBch(value) {
  if (Number.isNaN(orderBchPrice.value)) return null
  return parseBch(value / orderBchPrice.value)
}

function formatFiatAmount(value) {
  if (Number.isNaN(parseFloat(value))) return ''

  if (!displayBch.value) return `${value} ${orderCurrency.value}`
  return `${fiatToBch(value)} BCH`
}

const displayBch = ref(false)
function toggleAmountsDisplay() {
  if (isNaN(orderBchPrice.value)) {
    displayBch.value = false
    return
  }
  displayBch.value = !displayBch.value
}

const storefront = ref(Storefront.parse())
watch(storefrontId, () => fetchStorefront())
function fetchStorefront() {
  if (!storefrontId.value) return Promise.reject()
  const cachedStorefront = $store.getters['marketplace/getStorefront']?.(storefrontId.value)
  if (storefrontId.value == cachedStorefront?.id) {
    storefront.value = Storefront.parse(cachedStorefront.raw)
    return Promise.resolve()
  }
  return backend.get(`connecta/storefronts/${storefrontId.value}/`)
    .then(response => {
      const storefrontData = response?.data
      storefront.value = Storefront.parse(storefrontData)
      $store.commit('marketplace/cacheStorefront', storefrontData)
      return response
    })
}

const trackRiderInterval = ref(null)
function stopTrackRider () {
  clearInterval(trackRiderInterval.value)
  trackRiderInterval.value = null
}
function trackRider() {
  stopTrackRider()
  updateRiderLocation()
  trackRiderInterval.value = setInterval(() => updateRiderLocation(), 5 * 1000)
}
async function updateRiderLocation() {
  const riderId = delivery.value?.rider?.id
  if (!riderId) return
  const params = { ids: riderId }
  const response = await backend.get(`connecta-express/riders/get_locations/`, { params })
  const currentLocation = response?.data?.results?.[0]?.coordinates
  if (isNaN(currentLocation?.[0]) || isNaN(currentLocation?.[1])) return
  delivery.value.rider.currentLocation = [currentLocation[1], currentLocation[0]]
  delivery.value.rider.currentLocationTimestamp = Date.now()
}
onUnmounted(() => stopTrackRider())

const deliveryPanel = computed(() => {
  const response = {
    pickupAddress: {
      display: false,
      name: storefront.value?.name,
      location: delivery.value?.orderId == order.value?.id
        ? delivery.value?.pickupLocation
        : storefront.value?.location,
    },
    deliveryAddress: {
      display: false,
      name: order.value?.deliveryAddress?.fullName,
      location: delivery.value?.orderId == order.value?.id
        ? delivery.value?.deliveryLocation
        : order.value?.deliveryAddress?.location,
    },
  }
  response.pickupAddress.display = Boolean(response.pickupAddress.name) ||
                              Boolean(response.pickupAddress.location?.formatted)
  response.deliveryAddress.display = Boolean(response.deliveryAddress.name) ||
                              Boolean(response.deliveryAddress.location?.formatted)
  return response
})

const mapDialog = ref()
const showMap = ref(false)
watch(showMap, () => showMap.value ? trackRider() : stopTrackRider())
watch(showMap, () => setTimeout(() => {
  if (!showMap.value) return
  mapDialog.value?.centerMap?.()
}, 250))
const mapLocations = computed(() => {
  const data = []
  const pickupLoc = deliveryPanel.value?.pickupAddress?.location
  if (pickupLoc?.validCoordinates) {
    data.push({
      popup: ['Pickup location', pickupLoc?.formatted].filter(Boolean).join(': '),
      lat: pickupLoc?.latitude,
      lon: pickupLoc?.longitude,
      icon: {
        iconUrl: merchantLocationPin,
        iconSize: [30, 45],
        iconAnchor: [15, 45],
        popupAnchor:  [0, -45],
      },
    })
  }

  const deliveryLoc = deliveryPanel.value?.deliveryAddress?.location
  if (deliveryLoc?.validCoordinates && !order.value?.isStorePickup) {
    data.push({
      lat: deliveryLoc?.latitude,
      lon: deliveryLoc?.longitude,
      popup: ['Delivery address', deliveryLoc?.formatted].filter(Boolean).join(': '),
      icon: {
        iconUrl: customerLocationPin,
        iconSize: [30, 45],
        iconAnchor: [15, 45],
        popupAnchor:  [0, -45],
      },
    })
  }

  const rider = delivery.value?.rider
  const riderLoc = rider?.currentLocation
  const riderLocTimestamp = rider?.currentLocationTimestamp
  if (!isNaN(riderLoc?.[0]) && !isNaN(riderLoc?.[1])) {
    let timestampText = ''
    if (!isNaN(riderLocTimestamp)) timestampText = `<br/>${formatDateRelative(riderLocTimestamp)}`
    const riderName = [rider?.firstName, rider?.lastName].filter(Boolean).join(' ')
    data.push({
      popup: [`Rider`, riderName].filter(Boolean).join(': ') + timestampText,
      lat: riderLoc[0],
      lon: riderLoc[1],
      icon: {
        iconUrl: riderLocationPin,
        iconSize: [30, 45],
        iconAnchor: [15, 45],
        popupAnchor:  [0, -45],
      },
    })
  }

  return data
})


const showPaymentsDialog = ref(false)
const payments = ref([].map(Payment.parse))
const fetchingPayments = ref(false)
function fetchPayments() {
  const params = { order_id: props?.orderId || null }

  fetchingPayments.value = true
  return backend.get(`connecta/payments/`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      payments.value = response.data.results.map(Payment.parse)
      return response
    })
    .finally(() => {
      fetchingPayments.value = false
    })
}

const creatingPayment = ref(false)
const payment = computed(() => {
  return payments.value.find(payment => {
    return payment.status == 'pending' && payment?.totalAmount == order.value.balanceToPay
  })
})
const showPaymentDialog = ref(false)
watch(showPaymentDialog, () => {
  if(!showPaymentDialog.value) return
  if (payment.value?.id) return
  createPayment()
})
const bchAddress = computed(() => {
  return $store.getters['global/getWallet']('bch')?.lastAddress
})

const createPayment = debounce(async () => {
  if (order.value.balanceToPay <= 0) return Promise.resolve('Order paid')
  const data = {
    order_id: order.value.id,
    ignore_pending_payments: true,
    escrow: {
      // network: $store.getters['global/isChipnet'] ? 'chipnet' : 'mainnet',
      buyer_address: order.value?.payment?.escrowRefundAddress || bchAddress.value,
    },
  }

  creatingPayment.value = true
  return backend.post(`connecta/orders/${order.value.id}/payment/`, data)
    .then(async (response) => {
      if (!response?.data?.id) return Promise.reject({ response })
      const newPayment = Payment.parse(response?.data)
      const index = payments.value.findIndex(_payment => _payment?.id == newPayment?.id)
      if (index >= 0) payments.value[index] = newPayment
      else payments.value.unshift(newPayment)
      await Promise.allSettled([
        fetchOrder(),
        fetchPayments(),
      ])
      return response
    })
    .then(() => {
      if (!payment.value?.id) fetchOrder()
    })
    .finally(() => {
      creatingPayment.value = false
    })
}, 250)

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
  }

  if (!data.address || !data.bchAmount) return data

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
watch(showPaymentDialog, () => {
  if (!showPaymentDialog.value) txListener.value.disconnect()
  else txListener.value.connect()
})

watch(() => [payment.value?.escrowContractAddress], debounce(() => {
  payment.value?.fetchEscrowContract?.().then(() => checkPaymentFundingTx())
}, 250))

watch(() => [bchPaymentData.value?.address], () => {
  txListener.value.address = bchPaymentData.value?.address
  txListener.value.addListener(txListenerCallback)
  if (txListener.value.readyState != WebSocket.OPEN && showPaymentDialog.value) {
    txListener.value.connect()
  }
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
  savePaymentFundingTx(fundingTx)
    .then(() => {
      showPaymentDialog.value = false
    })
}

function getFundingTxFromReceivedTxs() {
  return transactionsReceived.value.find(tx => {
    if (tx.address != bchPaymentData.value.address) return false
    if (tx.tokenName != 'bch') return false
    return parseInt(tx.value) == Math.floor(bchPaymentData.value.bchAmount * 10 ** 8)
  })
}

function savePaymentFundingTx(txData=txListener.value.parseWebsocketDataReceived()) {
  if (!txData?.txid) return Promise.reject()

  const data = {
    funding_txid: txData.txid,
    funding_vout: txData.index,
    funding_sats: txData.value,
  }
  const dialog = $q.dialog({
    title: 'Verifying payment',
    message: 'Payment received',
    progress: { color: 'brandblue' },
    persistent: true,
    ok: false,
    cancel: false,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
  creatingPayment.value = true
  return backend.post(`connecta/escrow/${txData?.address}/set_funding_transaction/`, data)
    .then(response => {
      fetchOrder()
      dialog.hide()
      return response
    })
    .catch(error => {
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
      dialog.update({ persistent: false, ok: { color: 'brandblue' } })
      creatingPayment.value = false
    })
}

function onSendBchPaymentSwipe(resetSwipe=()=>{}) {
  $q.dialog({
    component: SecurityCheckDialog,
  })
    .onOk(() => {
      sendBchPayment()
        .finally(() => resetSwipe())
    })
    .onCancel(() => resetSwipe())
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

async function sendBchPayment() {
  const amount = bchPaymentData.value.bchAmount
  const address = bchPaymentData.value.address
  const chipnet = address.indexOf('bchtest:') >= 0
  const changeAddress = getChangeAddress({ chipnet })
  // const changeAddress = 'bchtest:qq4sh33hxw2v23g2hwmcp369tany3x73wuveuzrdz5'
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

  const bchWallet = chipnet ? wallet.value.BCH_CHIP : wallet.value.BCH
  bchWallet.sendBch(amount, address, changeAddress)
    .then(async result => {
      if (!result.success) return Promise.reject(result)
      await asyncSleep(1000)
      savePaymentFundingTx({ txid: result.txid, address: address }).then(() => {
        showPaymentDialog.value = false
      })
      dialog.hide()
    })
    .catch(error => {
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

  creatingPayment.value = true
  return backend.post(`connecta/escrow/${escrowContract?.address}/resolve_funding_transaction/`)
    .then(response => {
      if (response?.data?.address != escrowContract?.address) return Promise.reject({ response })
      escrowContract.raw = response?.data
      refreshPage()
        .finally(() => {
          if (!order.value.balanceToPay) showPaymentDialog.value = false
        })
      return response
    })
    .finally(() => {
      creatingPayment.value = false
    })
}

watch(() => [order.value.autoCompleteAtTimestamp, order.value.status], () => runAutoCompleteCountdown())
onActivated(() => runAutoCompleteCountdown())
onDeactivated(() => stopAutoCompleteCountdown())
onUnmounted(() => stopAutoCompleteCountdown())
const autoCompleteCountdownInterval = ref(null)
const autoCompleteTimeRemaining = ref(0)
watch(autoCompleteTimeRemaining, () => {
  if (autoCompleteTimeRemaining.value == -60) refreshPage()
})
const autoCompleteTimeRemainingText = computed(() => {
  const negative = autoCompleteTimeRemaining.value < 0
  const seconds = Math.abs(Math.round(autoCompleteTimeRemaining.value / 1000))
  if (Number.isNaN(seconds)) return ''

  // const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  // const milliseconds = Math.floor((seconds - Math.floor(seconds)) * 1000);

  const pad = (value) => (value < 10 ? `0${value}` : `${value}`);

  return `${negative ? '-' : ''}${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
})
function shouldRunAutoCompleteCountdown() {
  const isDelivered = order.value?.isDelivered
  const isPickedUp = order.value.isStorePickup && order.value.isPickedUp
  if (!isDelivered && !isPickedUp) return false
  return Date.now() < order.value.autoCompleteAtTimestamp
}

function runAutoCompleteCountdown() {
  stopAutoCompleteCountdown()
  if (!shouldRunAutoCompleteCountdown()) return
  autoCompleteCountdownInterval.value = setInterval(() => {
    autoCompleteTimeRemaining.value = order.value.autoCompleteAtTimestamp - Date.now()
  }, 1000)
}
function stopAutoCompleteCountdown() {
  clearInterval(autoCompleteCountdownInterval.value)
  autoCompleteCountdownInterval.value = null
  autoCompleteTimeRemaining.value = 0
}

function confirmCancelOrder() {
  $q.dialog({
    title: 'Cancel order',
    message: 'Are you sure?',
    color: 'brandblue',
    ok: { noCaps: true, label: 'Cancel Order', color: 'red' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(() => cancelOrder())
}

function cancelOrder() {
 const data = { status: 'cancelled', cancel_reason: 'Customer cancelled' }
 const dialog = $q.dialog({
    title: 'Cancelling order',
    progress: true,
    persistent: true,
    color: 'brandblue',
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })

 return backend.post(`connecta/orders/${order.value.id}/update_status/`, data)
  .then(response => {
    order.value.raw = response?.data
    dialog.hide()
  })
  .catch(error => {
    const data = error?.response?.data
      let errorMessage = errorParser.firstElementOrValue(data?.detail) ||
                         errorParser.firstElementOrValue(data?.non_field_errors) ||
                         errorParser.firstElementOrValue(data?.status)

      if (typeof data === 'string' && data.length < 200) errorMessage = data
      dialog.update({
        title: 'Unable to cancel order',
        message: errorMessage || 'An unknown error occurred',
      })
  })
  .finally(() => {
    dialog.update({ progress: false, persistent: true })
  })
}


const completingOrder = ref(false)
const showOrderCompletedPrompt = ref(false)
/**
 * @param {import('quasar').DialogChainObject} dialog
 */
async function createPaymentSettlementTransactions(dialog) {
  try {
    dialog.update({ message: $t('FetchingPaymentData') })
    const escrowContracts = await fetchOrderPaymentsForSettlements(order.value?.id)
    if (!wallet.value) await initWallet()

    const settlementResults = await generateSettlementTransactions({
      escrowContracts, wallet: wallet.value, settlementType: 'release', dialog
    })
    return settlementResults.map(result => {
      return {
        escrow_contract_address: result.escrowContract.address,
        tx_hex: result.txHex,
      }
    })
  } catch(error) {
    let message = error?.name === 'SettlementTransactionError'
      ? error?.message
      : $t('UnknownErrorOccurred')

    dialog.update({ message: message, persistent: false, progress: false })
    throw error
  }
}
async function completeOrder() {
  const isDelivered = order.value?.isDelivered
  const isPickedUp = order.value?.isStorePickup && order.value?.isPickedUp
  if (!isDelivered && !isPickedUp) return

  const data = { status: 'completed' }

  const dialog = $q.dialog({
    title: 'Completing order',
    progress: true,
    persistent: true,
    ok: false,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })

  if (order.value.totalPendingPayment > 0) {
    dialog.update({ title: 'Signing payment settlement' })
    data.escrow_settlements = await createPaymentSettlementTransactions(dialog)
  }

  dialog.update({ title: 'Completing order', message: '' })
  completingOrder.value = true
  return backend.post(`connecta/orders/${order.value.id}/update_status/`, data)
    .then(response => {
      order.value.raw = response?.data
      showOrderCompletedPrompt.value = true
      dialog.hide()
    })
    .catch(error => {
      const data = error?.response?.data
      let errorMessage = errorParser.firstElementOrValue(data?.detail) ||
                         errorParser.firstElementOrValue(data?.non_field_errors) ||
                         errorParser.firstElementOrValue(data?.status)

      if (typeof data === 'string' && data.length < 200) errorMessage = data
      dialog.update({
        title: 'Unable to complete order',
        message: errorMessage || 'An unknown error occurred',
      })
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false })
      completingOrder.value = false
    })
}

async function releaseEscrowPayments() {
  if (!order.value.isCompleted) {
    await new Promise((resolve, reject) => {
      $q.dialog({
        title: 'Order incomplete',
        message: 'Order is not yet completed',
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
      }).onOk(resolve).onDismiss(reject)
    })
  }

  const dialog = $q.dialog({
    title: 'Releasing escrow',
    progress: true,
    persistent: true,
    ok: false,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
  try {
    const settlementTransactions = await createPaymentSettlementTransactions(dialog)
    const data = {
      status: Order.Status.COMPLETED,
      escrow_settlements: settlementTransactions
    }
    dialog.update({ message: 'Verifying & sending transaction' })
    return await backend.post(`connecta/orders/${order.value.id}/update_status/`, data)
      .then(response => {
        order.value.raw = response?.data
        dialog.hide()
      })
      .catch(error => {
        const data = error?.response?.data
        const fieldError = errorParser.firstElementOrValue(
          data?.escrow_settlements?.filter?.(Boolean)?.[0]
        )
        let errorMessage = errorParser.firstElementOrValue(data?.detail) ||
                          errorParser.firstElementOrValue(data?.non_field_errors) ||
                          errorParser.firstElementOrValue(data?.status) ||
                          fieldError

        if (typeof data === 'string' && data.length < 200) errorMessage = data
        dialog.update({
          message: errorMessage || 'An unknown error occurred',
        })
      })
  } finally {
    dialog.update({ persistent: false , progress: false })
  }
}

const orderDispute = ref([].map(OrderDispute.parse)[0])
const hasOngoingDispute = computed(() => {
  if (!orderDispute.value?.id) return order.value?.hasOngoingDispute
  return !orderDispute.value?.resolvedAt
})
const disputeButtonOpts = computed(() => {
  if (!orderDispute.value?.id) return { color: 'grey', icon: undefined }
  if (orderDispute.value.id) {
    if (orderDispute.value.resolvedAt) return { color: 'green', icon: 'done' }
    else return { color: 'red', icon: undefined }
  }
})
function fetchOrderDispute() {
  return backend.get(`connecta/orders/${props.orderId}/dispute/`)
    .then(response => {
      orderDispute.value = OrderDispute.parse(response?.data)
      return response
    })
    .catch(error => {
      if (error?.response?.status === 404 && error?.response?.data?.detail) {
        orderDispute.value = undefined
      }
      return Promise.reject(error)
    })
}
function showOrderDisputeDialog() {
  $q.dialog({
    component: OrderDisputeFormDialog,
    componentProps: {
      readonly: Boolean(orderDispute.value?.id),
      editable: true,
      orderDispute: orderDispute.value,
    }
  })
    .onOk(result => {
      if (result?.action === 'submit') createOrUpdateDispute(result?.data)
      // else if (result?.action === 'resolve') resolveDispute(result?.data)
    })
}

function createOrUpdateDispute(opts={ reasons:[].map(String) }) {
  const reasons = opts?.reasons
  if (!reasons?.length) return Promise.resolve()

  const data = { reasons }
  const dialog = $q.dialog({
    title: orderDispute.value?.id ? 'Updating dispute' : 'Creating dispute',
    progress: true,
    persistent: true,
    ok: false,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
  return backend.post(`connecta/orders/${props.orderId}/dispute/`, data)
    .then(response => {
      orderDispute.value = OrderDispute.parse(response?.data)
      dialog.hide()
      return response
    })
    .catch(error => {
      const data = error?.response?.data
      let errorMessage = errorParser.firstElementOrValue(data?.non_field_errors) ||
                         errorParser.firstElementOrValue(data?.detail) ||
                         errorParser.firstElementOrValue(data?.reasons)

      if (!errorMessage && typeof error?.message === 'string' && error?.message?.length < 200) {
        errorMessage = error?.message
      }
      dialog.update({ message: errorMessage || 'Error encountered in updating dispute' })
      return Promise.reject(error)
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false, ok: true, })
    })
}


const canReviewOrder = computed(() => {
  if (order.value?.customer?.id != customer.value?.id) return false
  return ['completed', 'cancelled'].includes(order.value?.status)
})
watch(() => [order.value?.id, order.value?.customer?.id], () => fetchOrderReview())
const openOrderReviewDialog = ref(false)
const orderReview = ref([].map(Review.parse)[0])
function fetchOrderReview() {
  if (!order.value?.id || !order.value?.customer?.id) {
    orderReview.value = null
    return Promise.resolve()
  }
  const params = {
    order_id: order.value?.id || 0,
    created_by_customer_id: order.value?.customer?.id || 0,
    limit: 1,
  }

  return backend.get(`reviews/`, { params })
    .then(response => {
      const orderReviewObj = Review.parse(response?.data?.results?.[0])
      orderReview.value = orderReviewObj?.id ? orderReviewObj : null
      return response
    })
}

async function rateOrder() {
  $q.dialog({
    component: ReviewFormDialog,
    componentProps: {
      orderId: order.value?.id,
      review: orderReview.value?.id ? orderReview.value : undefined,
    }
  }).onOk(newOrderReview => {
    if (newOrderReview?.id) {
      $q.dialog({
        title: 'Review Submitted',
        message: 'Thank you for your response!',
        color: 'brandblue',
        class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
      })
    }
    orderReview.value = newOrderReview
  })
}

const cashbacks = ref([].map(() => {
  return { paymentId: 0, amountBch: 0, fiatAmount: 0, message: '', merchantName: '', parsedMessage: '' }
}))
const paymentsForCashback = computed(() => payments.value.filter(payment => {
  if (!payment.escrowContractAddress) return false
  return payment.status === 'sent'
}))
watch(paymentsForCashback, () => updateCashbackAmounts())
async function updateCashbackAmounts() {
  const deviceId = await Device.getId()

  await Promise.all(paymentsForCashback.value
    .map(payment => {
      if (payment.escrowContract) return Promise.resolve()
      return payment.fetchEscrowContract()
    })
  )

  paymentsForCashback.value = []
  return await Promise.all(paymentsForCashback.value
    .map(payment => {
      const data = {
        merchant_address: payment.value?.escrowContract?.sellerAddress,
        customer_address: payment.value?.escrowContract?.buyerAddress,
        satoshis: payment.escrowContract?.amountSats,
        device_id: deviceId.uuid || deviceId.identifier,
      }
      if (!data.merchant_address || !data.customer_address || !data.satoshis) return

      return backend.post(`cashback/calculate_cashback/`, data)
        .then(response => {
          const bch = round(parseFloat(response?.data?.cashback_amount), 8)
          const fiatAmount = round(payment.bchPrice.price * bch, 3)
          const cashback = {
            paymentId: payment?.id,
            amountBch: bch,
            fiatAmount: fiatAmount,
            merchantName: response?.data?.merchant_name,
            message: response?.data?.message,
          }
          cashback.parsedMessage = parseCashbackMessage(
            response?.data.message,
            bch,
            parseFiatCurrency(fiatAmount, orderCurrency.value),
            response?.data?.merchant_name,
          )
          cashbacks.value.push(cashback)
          return response
        })
    })
  )
}

const aggregatedCashback = computed(() => {
  if (cashbacks.value?.length === 1) return cashbacks.value[0]

  const totalBch = round(
    cashbacks.value.reduce((subtotal, cashback) => subtotal + cashback.amountBch, 0), 8
  )
  const totalFiat = round(
    cashbacks.value.reduce((subtotal, cashback) => subtotal + cashback.fiatAmount, 0), 3
  )

  const mostFrequent = arr => arr.reduce((a, b, i, arr) =>
    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
  );

  const merchantName = mostFrequent(
    cashbacks.value.map(cashback => cashback.merchantName).filter(Boolean)
  )
  const message = mostFrequent(
    cashbacks.value.map(cashback => cashback.message).filter(Boolean)
  )
  const parsedMessage = parseCashbackMessage(
    message, totalBch, totalFiat, merchantName,
  )

  return {
    amountBch: totalBch,
    fiatAmount: totalFiat,
    merchantName: merchantName,
    message: message,
    parsedMessage: parsedMessage,
  }
})

const rpcEventNames = Object.freeze({
  orderUpdate: 'order_updates',
  paymentUpdate: 'payment_updates',
})
const onNotificationHandler = notification  => {
  console.log('Notifications', notification)
  const eventName = notification?.event
  const data = notification?.data
  if (eventName === rpcEventNames.orderUpdate) {
    if (data?.id != props.orderId) return console.log('Not matching id')
    fetchOrder.debounced()
    if (typeof data?.has_ongoing_dispute === 'boolean') fetchOrderDispute()
    if (['on_delivery', 'delivered'].includes(data?.status)) fetchDelivery()
  }
  if (eventName === rpcEventNames.paymentUpdate) {
    if (data?.order_id != props.orderId) return
    if (data?.status) fetchOrder.debounced()
    fetchPayments()
  }
}

marketplaceRpc.client.onOpen(() => {
  if (!pageActive.value) return
  subscribeUpdatesToRpc()
})

watch(() => [props.orderId], () => {
  unsubscribeUpdatesToRpc().finally(() => subscribeUpdatesToRpc())
})
onActivated(() => subscribeUpdatesToRpc())
onDeactivated(() => unsubscribeUpdatesToRpc())
async function subscribeUpdatesToRpc() {
  if (!marketplaceRpc.isConnected()) await marketplaceRpc.connect()
  marketplaceRpc.client.call('subscribe', [rpcEventNames.orderUpdate, { id: parseInt(props.orderId) }])
  marketplaceRpc.client.call('subscribe', [rpcEventNames.paymentUpdate, { order_id: parseInt(props.orderId) }])

  if (!marketplaceRpc.client.onNotification.includes(onNotificationHandler)) {
    marketplaceRpc.client.onNotification.push(onNotificationHandler)
  }
}

async function unsubscribeUpdatesToRpc() {
  if (!marketplaceRpc.isConnected()) return
  marketplaceRpc.client.call('unsubscribe', [rpcEventNames.orderUpdate])
  marketplaceRpc.client.call('unsubscribe', [rpcEventNames.paymentUpdate])
  marketplaceRpc.client.onNotification = marketplaceRpc.client.onNotification
    .filter(handler => handler !== onNotificationHandler)
}

bus.on('handle-push-notification', handleOpenedNotification)
function handleOpenedNotification(openedNotification) {
  const notificationTypes = $store.getters['notification/types']
  const type = openedNotification?.data?.type
  if (type == notificationTypes.MARKETPLACE_CHAT_UNREAD_MESSAGES) {
    openChatDialog()
  }
}

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
    await Promise.all([
      fetchOrder(),
      fetchDelivery(),
      fetchPayments(),
      fetchOrderDispute(),
      chatButton.value?.refresh?.()
    ])
  } finally {
    initialized.value = true
    done()
  }
}
</script>
<style scoped lang="scss">
::v-deep(.items-table table) {
  border-spacing: 6px 4px;
}

.items-table .q-table td, .items-table .q-table th {
  padding: unset;
}

.col-qr-code {
  display: flex;
  justify-content: center;
  border-radius: 16px;
  border: 4px solid #ed5f59;
  background: white;
  padding: 12px;
}
.delivery-locations-panel {
  display:grid;
  grid-template-columns: 1fr min-content 1fr;
}
</style>
<style scoped lang="scss">
@media (min-width: $breakpoint-xs) {
  .items-delivery-address-panel {
    flex-direction: row-reverse;
  }
  .delivery-locations-panel {
    display: block;
    // grid-template-columns: 1fr min-content 1fr;
  }

  .delivery-locations-panel .arrow {
    display: none;
    transform: rotate(90deg);
  }
}

:deep(.q-pull-to-refresh__puller-container) {
  min-width: 100vw !important;
}
</style>
