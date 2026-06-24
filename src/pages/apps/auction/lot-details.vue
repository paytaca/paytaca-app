<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction')" :backnavpath="smartBackPath" class="header-nav" />
 
    <div>
      <div v-if="!isLoading && lot && auction" class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
        <div class="q-mb-lg text-left">
          <div class="text-h4 text-weight-bold q-mb-xs" style="overflow-wrap: break-word; word-wrap: break-word;">
            Lot {{ lot.id }}: <span class="text-weight-regular">{{ lot.title }}</span>
          </div>
 
          <div class="row items-center q-gutter-sm q-mb-sm">
            <q-badge color="primary" class="q-pa-sm q-px-sm text-weight-bold">
              <q-icon :name="lot.category === 'Digital' ? 'computer' : 'delivery_dining'" size="12px" class="q-mr-xs" />
              {{ lot.category }}
            </q-badge>
            <q-badge
              :color="lot.getLotStatus(auction.start_date, auction.end_date).color"
              class="q-pa-sm q-px-sm text-weight-bold"
            >
              {{ lot.getLotStatus(auction.start_date, auction.end_date).label }}
            </q-badge>
          </div>
        </div>
 
        <div class="row q-col-gutter-y-md q-col-gutter-x-none q-col-gutter-x-sm-md q-col-gutter-x-md-xl justify-center justify-sm-start items-start">
          <div class="col-12 col-sm-5 col-md-4 q-pr-md-lg" style="width: 100%; max-width: 380px; min-width: 280px;">
            <q-carousel
              ref="carousel"
              v-model="activeSlide"
              animated
              navigation
              infinite
              height="350px"
              class="rounded-borders shadow-1 full-width"
              :control-color="darkMode ? 'white' : 'primary'"
              :control-text-color="darkMode ? 'white' : 'primary'"
            >
              <q-carousel-slide
                v-for="(img, index) in lotImages"
                :key="index"
                :name="index"
                :img-src="img"
              />
            </q-carousel>

            <div class="row justify-center items-center q-mt-sm full-width">
              <q-btn
                flat
                round
                icon="chevron_left"
                :color="darkMode ? 'white' : 'primary'"
                @click="$refs.carousel.previous()"
              />
              
              <span class="text-caption text-weight-medium q-mx-md">
                {{ activeSlide + 1 }} / {{ lotImages.length }}
              </span>

              <q-btn
                flat
                round
                icon="chevron_right"
                :color="darkMode ? 'white' : 'primary'"
                @click="$refs.carousel.next()"
              />
            </div>

            <div class="row q-col-gutter-sm justify-center q-mt-sm">
              <div
                v-for="(imgSrc, index) in lotImages"
                :key="index"
                class="col-4"
              >
                <q-img
                  :src="imgSrc"
                  ratio="1"
                  class="rounded-borders cursor-pointer transition-effect full-width"
                  :style="activeSlide === index ? 'border: 2px solid var(--q-secondary); opacity: 1;' : 'opacity: 0.7;'"
                  @click="activeSlide = index"
                />
              </div>
            </div>
 
            <div class="q-mt-md">
              <div v-if="!isAuthor" class="full-width">
                <div v-if="auction?.type === 'English'">
                  <q-btn 
                    class="text-bold text-white full-width"
                    style="background-color: var(--q-secondary);"
                    padding="md"
                    unelevated
                    :label="highestBidderId === walletHash ? 'Highest Bidder' : 'Place Bid'"
                    :disabled="
                      lot.getLotStatus(auction.start_date, auction.end_date).label !== 'Open' ||
                      highestBidderId === walletHash
                    "
                    @click="openDialog = !openDialog"
                  />
                </div>
 
                <div v-else>
                  <q-btn 
                    class="text-bold text-white full-width"
                    style="background-color: var(--q-secondary);"
                    padding="md"
                    label="Buy It Now"
                    :disabled="lot.getLotStatus(auction.start_date, auction.end_date).label !== 'Open' || dutchAlreadySold"
                    @click="buyItNow"
                    unelevated
                  />
                </div>
              </div>
 
              <div v-else
                class="row flex-center full-width rounded-borders"
                :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
                style="min-height: 50px; width: 100%;"
              >
                <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('You are the author of this auction.') }}</div>
              </div>
            </div>

            <div v-if="bidStatus" class="full-width q-mt-md">
              <q-banner
                rounded
                dense
                class="q-pa-md"
                :class="
                  bidStatus === 'highest' || bidStatus === 'win' ? 'bg-green-1' :
                  bidStatus === 'outbid' ? 'bg-red-1' : 'bg-grey-3'
                "
              >
                <template v-slot:avatar>
                  <q-icon
                    :name="
                      bidStatus === 'highest' ? 'emoji_events' :
                      bidStatus === 'outbid' ? 'warning' :
                      bidStatus === 'win' ? 'celebration' : 'do_not_disturb'
                    "
                    :color="
                      bidStatus === 'highest' || bidStatus === 'win' ? 'positive' :
                      bidStatus === 'outbid' ? 'negative' : 'grey-7'
                    "
                    size="md"
                  />
                </template>

                <div
                  class="text-subtitle2 text-weight-bold"
                  :class="
                    bidStatus === 'highest' || bidStatus === 'win' ? 'text-green-9' :
                    bidStatus === 'outbid' ? 'text-red-9' : 'text-grey-8'
                  "
                >
                  {{
                    bidStatus === 'highest' ? 'You are the highest bidder!' :
                    bidStatus === 'outbid' ? 'You have been outbid!' :
                    bidStatus === 'win' ? 'Congratulations, you won!' :
                    'Auction closed, you did not win.'
                  }}
                </div>
                <div class="text-caption text-grey-7">
                  {{
                    bidStatus === 'highest' ? "You're in the lead — we'll let you know if that changes." :
                    bidStatus === 'outbid' ? 'Place a higher bid to get back in the lead.' :
                    bidStatus === 'win' ? "We'll be in touch with next steps shortly." :
                    'You did not win this item.'
                  }}
                </div>
              </q-banner>
            </div>
            
            <div v-if="showPostAuctionActions && (isAuthor || isWinningBidder)" class="q-mt-md full-width row q-col-gutter-none items-center justify-center">
              <div class="col text-center">
                <q-btn
                  v-if="isAuthor"
                  outline
                  stack
                  class="text-bold text-caption full-width"
                  :color="darkMode ? 'white' : 'black'"
                  icon="check_circle"
                  padding="sm"
                  label="Confirm Delivery"
                />
                <q-btn
                  v-else
                  outline
                  stack
                  class="text-bold text-caption full-width"
                  :color="darkMode ? 'white' : 'black'"
                  icon="check_circle"
                  padding="sm"
                  label="Confirm Pickup"
                  @click="confirmPickupTrigger"
                />
              </div>

              <div class="col q-ml-md text-center">
                <q-btn
                  v-if="!confirmedPickup"
                  class="text-bold text-caption full-width"
                  color="negative"
                  text-color="white"
                  stack
                  content-class="q-gap-xs"
                  icon="gavel"
                  padding="sm"
                  label="File a Dispute"
                  unelevated
                  @click="showSellerDisputeDialog = true"
                />

                <q-btn
                  v-else
                  class="text-bold text-caption full-width"
                  color="negative"
                  text-color="white"
                  stack
                  content-class="q-gap-xs"
                  icon="assignment_return"
                  padding="sm"
                  label="Refund"
                  unelevated
                  @click="showRefundDialog = true"
                />
              </div>
            </div>
          </div>
 
          <div class="col-12 col-sm col-md-7">
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-12 col-sm-6">
                <q-card flat bordered class="full-height">
                  <q-card-section class="q-pa-sm">
                    <div class="text-caption row items-center q-mb-sm">
                      <q-icon name="price_change" size="14px" class="q-mr-xs" />
                      Estimated Amount
                    </div>
                    
                    <div>
                      <div v-if="auction?.is_fiat">
                        <div class="text-h6 text-weight-bold text-primary" style="line-height: 1.2;">
                          {{ formatFiat(estimatedAmountFiat) }}
                        </div>
                        <div class="text-caption text-weight-medium text-primary">
                          {{ formatBCH(estimatedAmountBch).main }}<span style="opacity: 0.4;">{{ formatBCH(estimatedAmountBch).zeros }}</span> BCH
                        </div>
                      </div>

                      <div v-else>
                        <div class="text-h6 text-weight-bold text-primary" style="line-height: 1.2;">
                          {{ formatBCH(estimatedAmountBch).main }}<span style="opacity: 0.4;">{{ formatBCH(estimatedAmountBch).zeros }}</span> BCH
                        </div>
                        <div class="text-caption text-weight-medium text-primary">
                          {{ formatFiat(estimatedAmountFiat) }}
                        </div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-sm-6">
                <q-card v-if="auction?.type === 'English'" flat bordered class="full-height">
                  <q-card-section class="q-pa-sm">
                    <div class="row items-center justify-between q-mb-sm text-caption">
                      <div class="row items-center">
                        <q-icon name="payments" size="14px" class="q-mr-xs" />
                        Highest Bid
                      </div>
                      <q-spinner-dots v-if="englishBidPolling" size="14px" color="positive" />
                    </div>

                    <div v-if="hasBid">
                      <div v-if="auction?.is_fiat">
                        <div class="text-h6 text-weight-bold text-positive" style="line-height: 1.2;">
                          {{ formatFiat(englishCurrentFiat) }}
                        </div>
                        <div class="text-caption text-weight-medium text-positive q-mt-xs">
                          {{ formatBCH(englishCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(englishCurrentBch).zeros }}</span> BCH
                        </div>
                      </div>

                      <div v-else>
                        <div class="text-h6 text-weight-bold text-positive" style="line-height: 1.2;">
                          {{ formatBCH(englishCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(englishCurrentBch).zeros }}</span> BCH
                        </div>
                        <div class="text-caption text-weight-medium text-positive q-mt-xs">
                          {{ formatFiat(englishCurrentFiat) }}
                        </div>
                      </div>
                    </div>

                    <div v-else>
                      <div class="text-subtitle1 text-weight-bold q-my-none text-grey-6" style="line-height: 1.2;">
                        No bids yet
                      </div>
                      
                      <div class="text-caption text-weight-medium q-mt-xs">
                        <div v-if="auction?.is_fiat">
                          {{ formatFiat(englishCurrentFiat) }} floor · {{ formatBCH(englishCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(englishCurrentBch).zeros }}</span> BCH
                        </div>
                        <div v-else>
                          {{ formatBCH(englishCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(englishCurrentBch).zeros }}</span> BCH floor · {{ formatFiat(englishCurrentFiat) }}
                        </div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>

                <q-card v-else flat bordered class="full-height">
                  <q-card-section v-if="lot.is_sold" class="q-pa-sm">
                    <div class="text-caption row items-center q-mb-sm">
                      <q-icon name="price_change" size="14px" class="q-mr-xs" />
                      Winning Bid Details
                    </div>

                    <div v-if="winningBid">
                      <div v-if="auction?.is_fiat">
                        <div class="text-h6 text-weight-bold text-green" style="line-height: 1.2;">
                          {{ formatFiat(winningBid.bid_price_fiat) }}
                        </div>
                        <div class="text-caption text-weight-medium text-green">
                          {{ formatBCH(winningBid.bid_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(winningBid.bid_price_bch).zeros }}</span> BCH
                        </div>
                      </div>

                      <div v-else>
                        <div class="text-h6 text-weight-bold text-green" style="line-height: 1.2;">
                          {{ formatBCH(winningBid.bid_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(winningBid.bid_price_bch).zeros }}</span> BCH
                        </div>
                        <div class="text-caption text-weight-medium text-green">
                          {{ formatFiat(winningBid.bid_price_fiat) }}
                        </div>
                      </div>

                      <div class="text-caption text-grey-6 q-mt-xs">
                        <q-icon name="schedule" size="11px" class="q-mr-xs" />
                        {{ formatAuctionDate(winningBid.bidding_date) }}
                      </div>
                    </div>

                    <div v-else class="text-caption text-grey-6">
                      Loading bid details...
                    </div>
                  </q-card-section>

                  <q-card-section v-else class="q-pa-sm">
                    <div class="text-caption row items-center q-mb-xs">
                      <q-icon name="trending_down" size="14px" class="q-mr-xs" />
                      Current Price
                    </div>
                    
                    <div class="row items-end justify-between no-wrap">
                      <div>
                        <div v-if="auction?.is_fiat">
                          <div class="text-h6 text-weight-bold text-negative" style="line-height: 1.2;">
                            {{ formatFiat(dutchCurrentPriceFiat) }}
                          </div>
                          <div class="text-caption text-weight-medium text-negative q-mt-xs">
                            {{ formatBCH(dutchCurrentPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dutchCurrentPriceBch).zeros }}</span> BCH
                          </div>
                        </div>
                        
                        <div v-else>
                          <div class="text-h6 text-weight-bold text-negative" style="line-height: 1.2;">
                            {{ formatBCH(dutchCurrentPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dutchCurrentPriceBch).zeros }}</span> BCH
                          </div>
                          <div class="text-caption text-weight-medium text-negative q-mt-xs">
                            {{ formatFiat(dutchCurrentPriceFiat) }}
                          </div>
                        </div>
                      </div>
                      
                      <div class="text-right border-left q-pl-sm" :style="darkMode ? 'border-color: rgba(255,255,255,0.15)' : 'border-color: rgba(0,0,0,0.1)'">
                        <div class="text-caption q-mb-xs">Floor Limit</div>
                        
                        <div v-if="auction?.is_fiat">
                          <div class="text-subtitle2 text-weight-bold" style="line-height: 1.2;">
                            {{ formatFiat(dutchFloorPriceFiat) }}
                          </div>
                          <div class="text-caption text-grey-7 q-mt-xs">
                            {{ formatBCH(dutchFloorPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dutchFloorPriceBch).zeros }}</span> BCH
                          </div>
                        </div>

                        <div v-else>
                          <div class="text-subtitle2 text-weight-bold" style="line-height: 1.2;">
                            {{ formatBCH(dutchFloorPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dutchFloorPriceBch).zeros }}</span> BCH
                          </div>
                          <div class="text-caption text-grey-7 q-mt-xs">
                            {{ formatFiat(dutchFloorPriceFiat) }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="dutchAlreadySold" class="text-caption text-center q-mt-sm text-positive text-weight-medium">
                      <q-icon name="check_circle" size="12px" class="q-mr-xs" />Sold
                    </div>
                    <div v-else-if="!dutchAtFloor" class="q-mt-sm">
                      <div class="row items-center justify-between text-caption q-mb-xs">
                        Next price drop in
                        <span class="text-weight-medium">{{ formatCountdown(secondsRemaining) }} left</span>
                      </div>
                      <q-linear-progress
                        :value="dutchIntervalProgress"
                        color="negative"
                        :track-color="darkMode ? 'grey-9' : 'grey-3'"
                        size="6px"
                        rounded
                      />
                    </div>
                    <div v-else class="text-caption text-center q-mt-sm" style="opacity: 0.6;">
                      Floor price reached
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
 
            <q-card flat bordered class="q-mb-md">
              <q-card-section class="q-pa-sm">
                <div class="row items-center q-py-xs">
                  <div class="text-caption col-4 q-mr-sm">
                    <q-icon name="gavel" size="13px" class="q-mr-xs" />Auction
                  </div>
                  <span>{{ auction?.title || 'N/A' }}</span>
                </div>
                <q-separator spaced="xs" />
                <div class="row items-center q-py-xs">
                  <div class="text-caption col-4 q-mr-sm">
                    <q-icon name="person" size="13px" class="q-mr-xs" />Auctioneer
                  </div>
                  <div class="col row items-center q-gutter-xs">
                    <span>{{ auction?.getEllipsisInMiddleUserId ? auction.getEllipsisInMiddleUserId() : 'N/A' }}</span>
                    <q-badge v-if="isAuthor" color="positive" class="q-px-xs q-mr-sm">
                      <q-icon name="star" size="10px" class="q-mr-xs" />You
                    </q-badge>
                  </div>
                </div>
                <q-separator spaced="xs" />
                <div class="row items-center q-py-xs">
                  <div class="text-caption col-4 q-mr-sm">
                    <q-icon name="event" size="13px" class="q-mr-xs" />Posted on
                  </div>
                  <span>{{ formatAuctionDate(auction.creation_date) || 'N/A' }}</span>
                </div>
              </q-card-section>
            </q-card>
 
            <div class="column q-mt-xs">
              <div class="text-bold q-mb-xs">Description:</div>
              <p class="text-body2 text-left" style="white-space: pre-wrap; line-height: 1.5;">
                {{ lot.description || 'No additional specifications provided.' }}
              </p>
            </div>
 
            <div class="row q-gutter-sm">
              <div class="col rounded-borders q-pa-sm" :class="darkMode ? 'bg-dark' : 'bg-grey-2'">
                <div class="text-caption q-mb-xs">
                  <q-icon name="event_available" size="12px" class="q-mr-xs" />Start date
                </div>
                <div class="text-body2 text-weight-medium">
                  {{ formatAuctionDate(auction?.start_date) }}
                </div>
              </div>
              <div class="col rounded-borders q-pa-sm" :class="darkMode ? 'bg-dark' : 'bg-grey-2'">
                <div class="text-caption q-mb-xs">
                  <q-icon name="event_busy" size="12px" class="q-mr-xs" />End date
                </div>
                <div class="text-body2 text-weight-medium">
                  {{ formatAuctionDate(auction?.end_date) }}
                </div>
              </div>
            </div>

            <div v-if="auction?.type === 'English'" class="q-mt-md full-width">
              <q-btn
                outline
                dense
                no-caps
                color="primary"
                icon="history"
                label="View Bidding History"
                class="col full-width"
                @click="showBidHistory = true"
              />
            </div>
          </div>
        </div>
      </div>
 
      <div v-else class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
        <div class="q-mb-lg text-left">
          <q-skeleton type="text" width="70%" height="32px" class="q-mb-sm" />
          <div class="row items-center q-gutter-sm">
            <q-skeleton type="QBadge" width="90px" height="22px" />
            <q-skeleton type="QBadge" width="70px" height="22px" />
          </div>
        </div>

        <div class="row q-col-gutter-y-md q-col-gutter-x-none q-col-gutter-x-sm-md q-col-gutter-x-md-xl justify-center justify-sm-start items-start">
          <div class="col-12 col-sm-5 col-md-4 q-pr-md-lg" style="width: 100%; max-width: 380px; min-width: 280px;">
            <q-skeleton height="350px" class="rounded-borders full-width" />

            <div class="row justify-center items-center q-mt-sm full-width">
              <q-skeleton type="QAvatar" size="36px" />
              <q-skeleton type="text" width="50px" class="q-mx-md" />
              <q-skeleton type="QAvatar" size="36px" />
            </div>
            
            <div class="row q-col-gutter-sm justify-center q-mt-sm">
              <div v-for="n in 3" :key="n" class="col-4">
                <q-skeleton class="rounded-borders full-width" style="aspect-ratio: 1;" />
              </div>
            </div>

            <q-skeleton class="rounded-borders full-width q-mt-md" height="48px" />
          </div>
          
          <div class="col-12 col-sm col-md-7">
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-12 col-sm-6">
                <q-skeleton type="rect" width="100%" height="82px" class="rounded-borders" />
              </div>

              <div class="col-12 col-sm-6">
                <q-skeleton type="rect" width="100%" height="82px" class="rounded-borders" />
              </div>
            </div>

            <div class="q-mb-md">
              <q-skeleton type="rect" width="100%" height="82px" class="rounded-borders" />
            </div>

            <div class="column q-mt-xs q-mb-md">
              <q-skeleton type="text" width="25%" class="q-mb-sm" />
              <q-skeleton type="text" width="100%" class="q-mb-xs" />
              <q-skeleton type="text" width="100%" class="q-mb-xs" />
              <q-skeleton type="text" width="65%" />
            </div>
            
            <div class="row q-gutter-sm">
              <div class="col rounded-borders">
                <q-skeleton type="rect" width="100%" height="75px" class="rounded-borders" />
              </div>

              <div class="col rounded-borders">
                <q-skeleton type="rect" width="100%" height="75px" class="rounded-borders" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =================== POP UPS =================== -->
    <BiddingPopup
      v-model="openDialog"
      :lot="lot"
      :auction="auction"
      :loading="englishBidLoading"
      @place-bid="handlePlaceBid"
    />

    <BuyItNowPopup
      v-model:isToggledBuyItNow="isToggledBuyItNow"
      :lot="lot"
      :auction="auction"
      :current-price-bch="dutchCurrentPriceBch"
      :current-price-fiat="dutchCurrentPriceFiat"
      :is-fiat="auction?.is_fiat"
      :loading="buyItNowLoading"
      @confirm-buy-it-now="handleBuyItNow"
    />

    <SellerDisputePopup
      v-model="showSellerDisputeDialog"
      :lot="lot"
    />

    <RefundPopup
      v-model="showRefundDialog"
      :lot="lot"
    />

    <BiddingHistoryPopup
      v-model="showBidHistory"
      :lotId="props.lotId"
    />
  </q-pull-to-refresh>
</template>

<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { vElementVisibility } from '@vueuse/components'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar, date } from 'quasar'
import { callAPI } from 'src/auction/api'
import { Store } from 'src/store'
import { AuctionList, LotsList } from 'src/auction/object'
import { walletToContract } from 'src/auction/payment'
import { callContractRelease, callContractReturn } from 'src/auction/arbiter'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import BiddingPopup from 'src/components/auction/BiddingPopup.vue'
import BuyItNowPopup from 'src/components/auction/BuyItNowPopup.vue'
import BiddingHistoryPopup from 'src/components/auction/BiddingHistoryPopup.vue'
import SellerDisputePopup from 'src/components/auction/SellerDisputePopup.vue'
import RefundPopup from 'src/components/auction/RefundPopup.vue'

defineOptions({
  directives: {
    'element-visibility': vElementVisibility
  }
})

const props = defineProps({
  auctionId: {
    type: [String, Number],
    required: true
  },
  lotId: {
    type: [String, Number],
    required: true
  }
})

const activeSlide = ref(0)
const lotImages = ref([])
const lot = ref(null)
const auction = ref(null)
const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
const showBidHistory = ref(false)
const isLoading = ref(false)

// Post-auction actions
const showSellerDisputeDialog = ref(false)
const showRefundDialog = ref(false)
const confirmedPickup = ref(false)    // Temporary confirm pickup status

const $q = useQuasar()
const $store = useStore()
const $route = useRoute()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const bchToPhpRate = computed(() => $store.getters['market/getAssetPrice']('bch', 'php') || 0)

const formatFiat = (fiatValue) => {
  const numValue = Number(fiatValue) || 0
  return `₱${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatBCH = (bchValue) => getFormattedBCH(Number(bchValue) || 0)

const estimatedAmountBch = computed(() => {
  if (!lot.value) return 0
  const rate = bchToPhpRate.value
  
  if (auction.value?.is_fiat) {
    const fiat = Number(lot.value.estimated_amount_fiat || 0)
    return rate > 0 ? fiat / rate : 0
  }
  
  return Number(lot.value.estimated_amount_bch || 0)
})

const estimatedAmountFiat = computed(() => {
  if (!lot.value) return 0
  
  if (auction.value?.is_fiat) {
    return Number(lot.value.estimated_amount_fiat || 0)
  }
  
  return Number(lot.value.estimated_amount_bch || 0) * bchToPhpRate.value
})




// =========================================================================
// =========================== RELEASE TO SELLER ===========================
// =========================================================================
const confirmPickupTrigger = async () => {
  const bidId = auction.value?.type === 'English' ? highestBidId.value : winningBid.value?.id

  if (!bidId) {
    $q.notify({ type: 'warning', message: 'Could not find bid to release funds for.' })
    return
  }

  confirmedPickup.value = true
  $q.loading.show({ message: 'Confirming pickup...' })
  await callContractRelease(bidId)
  $q.loading.hide()
}



// =========================================================================
// ============================ ENGLISH AUCTION ============================
// =========================================================================
const openDialog = ref(false)
const englishBidLoading = ref(false)
const englishBidPolling = ref(false)
const hasBid = ref(false)
const hasUserBid = ref(false)
const highestBidderId = ref(null)
const highestBidId = ref(null)
const isSold = computed(() => lot.value?.is_sold || false)
let englishPollingInterval = null

const englishCurrentBch = computed(() => {
  if (!lot.value) return 0
  const rate = bchToPhpRate.value
  
  if (auction.value?.is_fiat) {
    const fiat = Number(lot.value.threshold_bid_fiat || 0)
    return rate > 0 ? fiat / rate : 0
  }
  
  return Number(lot.value.threshold_bid_bch || 0)
})

const englishCurrentFiat = computed(() => {
  if (!lot.value) return 0
  
  if (auction.value?.is_fiat) {
    return Number(lot.value.threshold_bid_fiat || 0)
  }
  
  return Number(lot.value.threshold_bid_bch || 0) * bchToPhpRate.value
})

const handlePlaceBid = async ({ bid_price_bch, bid_price_fiat }) => {
  if (!walletHash) {
    $q.notify({ type: 'warning', message: 'Please connect your wallet first.' })
    return
  }

  englishBidLoading.value = true

  try {
    const bidResponse = await callAPI('biddings', null, 'post', {
      user_id: walletHash,
      lot_id: props.lotId,
      bid_price_bch: Number(bid_price_bch).toFixed(8),
      bid_price_fiat: Number(bid_price_fiat).toFixed(2),
      is_final_bid: true
    })

    if (!bidResponse.success) {
      throw new Error(bidResponse.error || 'Bid failed. Please try again.')
    }

    const bidId = bidResponse.data?.id
    await callAPI('lots', props.lotId, 'patch', {
      threshold_bid_bch: Number(bid_price_bch).toFixed(8),
      threshold_bid_fiat: Number(bid_price_fiat).toFixed(2)
    })

    $q.loading.show({ message: 'Processing smart contract...' })
    await walletToContract(Number(bid_price_bch).toFixed(8), bidId)
    
    const secondRes = await callAPI(`lots/${props.lotId}/second-highest-bidder`)
    if (secondRes.success && secondRes.data?.id) {
      await callContractReturn(secondRes.data.id)
    }

    $q.loading.hide()

    openDialog.value = false
    hasUserBid.value = true

    $q.notify({
      type: 'positive',
      icon: 'gavel',
      message: `Bid of ${getFormattedBCH(bid_price_bch).main}${getFormattedBCH(bid_price_bch).zeros} BCH placed!`,
      timeout: 3000
    })

    await fetchLot()
    await checkBidStatus()
    startEnglishPolling()
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Something went wrong.' })
  } finally {
    englishBidLoading.value = false
  }
}

const checkBidStatus = async () => {
  try {
    const result = await callAPI(`lots/${props.lotId}/highest-bid`)

    if (result.success && result.data?.user_id) {
      hasBid.value = true
      highestBidId.value = result.data.id
      highestBidderId.value = result.data.user_id
    } else {
      hasBid.value = false
      highestBidderId.value = null
    }
  } catch (err) {
    console.error('Error checking bid status:', err)
  }
}

const checkUserBid = async () => {
  if (!walletHash) {
    hasUserBid.value = false
    return
  }

  try {
    const result = await callAPI('my-biddings')
    hasUserBid.value = result.success && Array.isArray(result.data) && result.data.length > 0
  } catch (err) {
    console.error('Error checking user bid history:', err)
    hasUserBid.value = false
  }
}

const isLotClosed = computed(() => {
  if (!lot.value || !auction.value) return false
  const status = lot.value.getLotStatus(auction.value.start_date, auction.value.end_date).label
  return status === 'Closed' || status === 'Sold'
})

const showPostAuctionActions = computed(() => {
  if (isSold.value) return true
  return auction.value?.type === 'English' && isLotClosed.value && hasBid.value
})

const bidStatus = computed(() => {
  const isHighest = highestBidderId.value === walletHash

  if (!hasUserBid.value) {
    return null
  }
  
  if (!hasBid.value) {
    return isLotClosed.value ? 'did-not-win' : null
  }

  if (isSold.value || isLotClosed.value) {
    return isHighest ? 'win' : 'did-not-win'
  }

  return isHighest ? 'highest' : 'outbid'
})

const isWinningBidder = computed(() => bidStatus.value === 'win')

const startEnglishPolling = () => {
  if (englishPollingInterval) return
  englishPollingInterval = setInterval(async () => {
    if (isLotClosed.value) {
      stopEnglishPolling()
      return
    }
    await checkBidStatus()
  }, 8000)
}

const stopEnglishPolling = () => {
  if (englishPollingInterval) {
    clearInterval(englishPollingInterval)
    englishPollingInterval = null
  }
}



// =========================================================================
// ============================= DUTCH AUCTION =============================
// =========================================================================
const isToggledBuyItNow = ref(false)
const buyItNowLoading = ref(false)
const dutchAlreadySold = ref(false)
const winningBid = ref(null)

const secondsRemaining = ref(0)
const intervalDurationSec = ref(600)
const dutchAtFloor = ref(false)
let dutchStartTime = null
let visualCountdownTimer = null
let dutchStartTimeout = null

const getDutchAuctionStartTime = () => {
  const startDate = auction.value?.start_date || lot.value?.start_date
  if (!startDate) return null

  const startTs = new Date(startDate.replace(' ', 'T')).getTime()
  return Number.isNaN(startTs) ? null : startTs
}

const computeCurrentPrice = () => {
  if (!lot.value) return
  if (dutchAlreadySold.value) {
    clearDutchTimers()
    return
  }

  const isFiat = auction.value?.is_fiat ?? true
  const intervalSec = (lot.value.getIntervalMinutes() || 10) * 60
  intervalDurationSec.value = intervalSec
  const startTime = getDutchAuctionStartTime()
  const now = Date.now()

  if (startTime && now < startTime) {
    secondsRemaining.value = intervalSec
    dutchAtFloor.value = false
    return
  }

  const elapsedSec = startTime
    ? Math.max(0, (now - startTime) / 1000)
    : (now - dutchStartTime) / 1000
  const stepsDone = Math.floor(elapsedSec / intervalSec)

  if (isFiat) {
    const startFiat = Number(lot.value.starting_price_fiat || 0)
    const floorFiat = Number(lot.value.threshold_bid_fiat || 0)
    const dropFiat = Number(lot.value.price_drop_fiat || 0)
    const rate = bchToPhpRate.value

    const currentFiat = Math.max(startFiat - stepsDone * dropFiat, floorFiat)
    dynamicPriceFiat.value = currentFiat
    dynamicPriceBch.value = rate > 0 ? currentFiat / rate : 0
  } else {
    const startBch = Number(lot.value.starting_price_bch || 0)
    const floorBch = Number(lot.value.threshold_bid_bch || 0)
    const dropBch = Number(lot.value.price_drop_bch || 0)

    const currentBch = Math.max(startBch - stepsDone * dropBch, floorBch)
    dynamicPriceBch.value = currentBch
    dynamicPriceFiat.value = currentBch * bchToPhpRate.value
  }
  
  const elapsedInStep = elapsedSec % intervalSec
  secondsRemaining.value = Math.ceil(intervalSec - elapsedInStep)

  const atFloor = isFiat
    ? dynamicPriceFiat.value <= Number(lot.value.threshold_bid_fiat || 0)
    : dynamicPriceBch.value <= Number(lot.value.threshold_bid_bch || 0)

  if (atFloor) {
    if (visualCountdownTimer) clearInterval(visualCountdownTimer)
    secondsRemaining.value = 0
  }

  dutchAtFloor.value = atFloor
}

const dynamicPriceBch = ref(0)
const dynamicPriceFiat = ref(0)

const dutchIntervalProgress = computed(() => {
  if (!intervalDurationSec.value) return 0
  return Math.max(0, Math.min(1, secondsRemaining.value / intervalDurationSec.value))
})

const formatCountdown = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0))
  
  const hour = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const minute = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const second = (seconds % 60).toString().padStart(2, '0')
  
  return `${hour}:${minute}:${second}`
}

const clearDutchTimers = () => {
  if (visualCountdownTimer) {
    clearInterval(visualCountdownTimer)
    visualCountdownTimer = null
  }
  if (dutchStartTimeout) {
    clearTimeout(dutchStartTimeout)
    dutchStartTimeout = null
  }
}

const startDutchCountdown = () => {
  if (visualCountdownTimer) clearInterval(visualCountdownTimer)
  computeCurrentPrice()
  visualCountdownTimer = setInterval(computeCurrentPrice, 1000)
}

const initializeDutchAuctionTimer = (lotData) => {
  if (!lotData || !auction.value || auction.value?.type !== 'Dutch') return
  if (dutchAlreadySold.value) return
  clearDutchTimers()

  const startTime = getDutchAuctionStartTime()
  const intervalSec = (lotData.getIntervalMinutes() || 10) * 60
  const now = Date.now()

  const isFiat = auction.value?.is_fiat ?? true
  if (isFiat) {
    dynamicPriceFiat.value = Number(lotData.starting_price_fiat || 0)
    dynamicPriceBch.value = bchToPhpRate.value > 0
      ? dynamicPriceFiat.value / bchToPhpRate.value : 0
  } else {
    dynamicPriceBch.value = Number(lotData.starting_price_bch || 0)
    dynamicPriceFiat.value = dynamicPriceBch.value * bchToPhpRate.value
  }

  if (startTime && now < startTime) {
    dutchStartTime = startTime
    secondsRemaining.value = intervalSec
    dutchStartTimeout = setTimeout(() => {
      dutchStartTime = startTime
      startDutchCountdown()
    }, startTime - now)
    return
  }

  dutchStartTime = startTime || now
  secondsRemaining.value = intervalSec
  startDutchCountdown()
}

onUnmounted(() => {
  if (visualCountdownTimer) clearInterval(visualCountdownTimer)
  stopEnglishPolling()
})

const dutchFloorPriceBch = computed(() => Number(lot.value?.threshold_bid_bch || 0))
const dutchFloorPriceFiat = computed(() => Number(lot.value?.threshold_bid_fiat || 0))
const dutchCurrentPriceBch = computed(() => dynamicPriceBch.value)
const dutchCurrentPriceFiat = computed(() => dynamicPriceFiat.value)

const buyItNow = () => { 
  isToggledBuyItNow.value = true 
}

const handleBuyItNow = async (payload = {}) => {
  isToggledBuyItNow.value = false
  if (auction.value?.type !== 'Dutch') return

  const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
  if (!walletHash) {
    return $q.notify({ type: 'warning', message: 'Please connect your wallet first.' })
  }

  buyItNowLoading.value = true

  try {
    const bidBch = payload.bid_price_bch ?? dutchCurrentPriceBch.value
    const bidFiat = payload.bid_price_fiat ?? dutchCurrentPriceFiat.value
    
    const res = await callAPI('biddings', null, 'post', {
      user_id: walletHash,
      lot_id: props.lotId,
      bid_price_bch: Number(bidBch).toFixed(8),
      bid_price_fiat: Number(bidFiat).toFixed(2),
      is_final_bid: true
    })

    if (res.success) {
      const bidId = res.data?.id || res.id

      const resIsSold = await callAPI('lots', props.lotId, 'patch', { 
        is_sold: true, 
        date_sold: new Date().toISOString() 
      })

      if (resIsSold) {
        $q.loading.show({ message: 'Processing smart contract...' })

        try {
          await walletToContract(Number(bidBch).toFixed(8), bidId)
        } finally {
          $q.loading.hide()
        }

        dutchAlreadySold.value = true
        clearDutchTimers()
        await refresh(() => {})
        
        $q.notify({
          type: 'positive',
          message: `Secured for ${getFormattedBCH(dutchCurrentPriceBch.value).main}${getFormattedBCH(dutchCurrentPriceBch.value).zeros} BCH!`,
        })
      }
    } else {
      throw new Error(res.error || 'Transaction failed. Please try again.')
    }
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Something went wrong.' })
  } finally {
    buyItNowLoading.value = false
  }
}

const fetchDutchSoldStatus = async () => {
  if (auction.value?.type !== 'Dutch') return
  
  try {
    const res = await callAPI('biddings', null, 'get', null, { lot_id: props.lotId, is_final_bid: true })
    dutchAlreadySold.value = res.success && res.data?.length > 0
  } catch (err) {
    console.warn('Could not verify if lot was already sold:', err)
  }
}

const fetchWinningBid = async () => {
  if (auction.value?.type !== 'Dutch') return

  try {
    const res = await callAPI(`lots/${props.lotId}/highest-bid`)
    if (res.success && res.data) {
      winningBid.value = res.data
    }
  } catch (err) {
    console.warn('Could not fetch winning bid:', err)
  }
}






const getFormattedBCH = (bch) => {
  const numStr = Number(bch).toFixed(8)
  const match = numStr.match(/^(.*?)0*$/)
  const main = match ? match[1] : numStr
  const zeros = numStr.substring(main.length)
  return { main, zeros, full: numStr }
}

const fetchAuction = async () => {
  try {
    const result = await callAPI('auctions', Number(props.auctionId))
    if (result.success && result.data) {
      auction.value = AuctionList.parse(result.data)
    }
  } catch (error) {
    console.error('Failed to update auction details:', error)
  }
}

const fetchLot = async () => {
  const result = await callAPI('lots', props.lotId)
  if (result.success) {
    lot.value = LotsList.parse(result.data)

    const imageResult = await callAPI('lot-images-by-lot', props.lotId, 'get')
    if (imageResult.success && Array.isArray(imageResult.data)) {
      lotImages.value = imageResult.data.map(item => item.image)
    }

    initializeDutchAuctionTimer(lot.value)
  }
}

const loadPageData = async () => {
  await Promise.all([fetchLot(), fetchAuction(), fetchDutchSoldStatus(), checkBidStatus(), checkUserBid()])
  initializeDutchAuctionTimer(lot.value)
  await fetchWinningBid()
}

watch(() => [props.lotId, props.auctionId], async () => {
  dutchAlreadySold.value = false
  await loadPageData()
}, { immediate: true })




const isAuthor = computed(() => {
  const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
  return walletHash === auction.value?.user_id
})

const formatAuctionDate = (dateString) => {
  if (!dateString) return 'N/A'
  return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A')
}

const smartBackPath = computed(() => {
  const sourceContext = $route.query.from
  if (sourceContext === 'activity') return '/apps/auction/activity'
  return `/apps/auction/${props.auctionId}`
})

const refresh = async (done) => {
  isLoading.value = true
  dutchAlreadySold.value = false
  await loadPageData()
  isLoading.value = false
  done()
}
</script>