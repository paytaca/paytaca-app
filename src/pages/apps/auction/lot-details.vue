<template>
  <!--
    This page contains the lot details. It also has the lines-of-code for the auction
    mechanisms.
  -->
  <q-pull-to-refresh id="app-container" class="auction-container" :class="getDarkModeClass(darkMode)" @refresh="refresh" >
    <HeaderNav :title="$t('Auction - Lot Details')" :backnavpath="smartBackPath" class="header-nav" />
    <div>
      <!--Data has been loaded-->
      <div v-if="!isLoading && lot && auction" class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
        <div class="q-mb-lg text-left">
          <!--Lot Title-->
          <div class="text-h4 text-weight-bold q-mb-xs" style="overflow-wrap: break-word; word-wrap: break-word;">
            Lot {{ lot?.id }}: <span class="text-weight-regular">{{ lot?.title }}</span>
          </div>
          
          <div class="row items-center q-gutter-sm q-mb-sm">
            <!--Lot Category-->
            <q-badge color="primary" class="q-pa-sm q-px-sm text-weight-bold">
              <q-icon :name="lot?.category === 'Digital' ? 'computer' : 'delivery_dining'" size="12px" class="q-mr-xs" />
              {{ lot?.category }}
            </q-badge>

            <!--Lot Status-->
            <q-badge :color="lot?.status_color" class="q-pa-sm q-px-sm text-weight-bold">
              {{ lot?.status }}
            </q-badge>
          </div>
        </div>
 
        <div class="row q-col-gutter-y-md q-col-gutter-x-none q-col-gutter-x-sm-md q-col-gutter-x-md-xl justify-center justify-sm-start items-start">
          <div class="col-12 col-sm-5 col-md-4 q-pr-md-lg" style="width: 100%; max-width: 380px; min-width: 280px;">
            <q-carousel animated navigation infinite ref="carousel" height="350px" class="rounded-borders shadow-1 full-width"
              v-model="lotImageActiveSlide"
              :control-color="controlColor"
              :control-text-color="controlColor"
            >
              <q-carousel-slide v-for="(img, index) in lotImages" :key="index" :name="index" :img-src="img" />
            </q-carousel>

            <div class="row justify-center items-center q-mt-sm full-width">
              <q-btn flat round icon="chevron_left" :color="controlColor" @click="$refs.carousel.previous()" />
              <span class="text-caption text-weight-medium q-mx-md">
                {{ lotImageActiveSlide + 1 }} / {{ lotImages.length }}
              </span>
              <q-btn flat round icon="chevron_right" :color="controlColor" @click="$refs.carousel.next()" />
            </div>

            <!--Image Slide-->
            <div class="row q-col-gutter-sm justify-center q-mt-sm">
              <div v-for="(imgSrc, index) in lotImages" :key="index" class="col-4">
                <q-img :src="imgSrc" ratio="1" class="rounded-borders cursor-pointer transition-effect full-width"
                  :style="lotImageActiveSlide === index ? 'border: 2px solid var(--q-secondary); opacity: 1;' : 'opacity: 0.7;'"
                  @click="lotImageActiveSlide = index"
                />
              </div>
            </div>

            <div v-if="lot?.status !== 'Sold'" class="row flex-center">
              <div class="text-secondary q-m-auto q-mt-md">
                There {{ viewCount === 1 ? 'is' : 'are' }} {{ viewCount }} {{ viewCount === 1 ? 'person' : 'people' }}
                currently viewing this lot?.
              </div>
            </div>

            <div class="q-mt-md">
              <!--User is auctioneer-->
              <div v-if="isAuctioneer" style="min-height: 50px; width: 100%;"
                class="row flex-center full-width rounded-borders"
                :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
              >
                <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('You are the author of this auction.') }}</div>
              </div>

              <!--User is bidder-->
              <div v-else class="full-width">
                <q-btn unelevated padding="md" class="text-bold text-white full-width" style="background-color: var(--q-secondary);"
                  :label="auction?.type === 'English' ? (userIsLeadingBidder ? 'Highest Bidder' : 'Place Bid') : 'Buy It Now'"
                  :disabled="isBidLoading || userIsLeadingBidder || lot?.status !== 'Active'"
                  @click="showMakeBidDialog = true"
                />
              </div>
            </div>

            <!--General bid status content-->
            <div v-if="!isAuctioneer && bidStatus" class="full-width q-mt-md">
              <q-banner rounded dense class="q-pa-md" :class="bidStatusMessage.bannerClass">
                <template v-slot:avatar>
                  <q-icon size="md" :name="bidStatusMessage.icon" :color="bidStatusMessage.iconColor"/>
                </template>
                <div class="text-subtitle2 text-weight-bold" :class="bidStatusMessage.titleClass">
                  {{ bidStatusMessage.title }}
                </div>
                <div class="text-caption text-grey-7">
                  {{ bidStatusMessage.description }}
                </div>
              </q-banner>
            </div>
            
            <div v-if="bidStatus === 'Winner' || isAuctioneer">
              <div v-if="isMarkedComplete" class="q-mt-md full-width">
                <q-banner rounded dense class="bg-positive text-white q-pa-md">
                  <template v-slot:avatar>
                    <q-icon name="check_circle" />
                  </template>
                  Transaction complete.
                </q-banner>
              </div>

              <div v-if="showPostAuctionActions" class="q-mt-md full-width">
                <q-btn outline dense no-caps color="primary" icon="history" label="View Delivery Status" class="full-width" @click="showDeliveryHistory = true"/>
              </div>

              <div>
                <template v-if="!isDisputeActive">
                  <div v-if="showPostAuctionActions" class="q-mt-md full-width row q-col-gutter-none items-center justify-center">
                    <div class="col text-center">
                      <q-btn v-if="isAuctioneer" outline stack class="text-bold text-caption full-width" padding="sm"
                        icon="check_circle"
                        label="Confirm Delivery"
                        :color="darkMode ? 'white' : 'black'"
                        :disable="deliveryDetails !== 1"
                        @click="updateDeliveryStatus('Delivered', 'Confirmed delivery!')"
                      />
                      <q-btn v-else outline stack padding="sm" class="text-bold text-caption full-width"
                        icon="check_circle"
                        label="Confirm Shipped" 
                        :color="darkMode ? 'white' : 'black'"
                        :disable="deliveryDetails !== 'Shipped'"
                        @click="updateDeliveryStatus('Shipped', 'Confirmed shipped!')"
                      />
                    </div>

                    <div class="col q-ml-md text-center">
                      <q-btn v-if="!isAuctioneer && deliveryDetails !== 'Delivered'" stack unelevated class="text-bold text-caption full-width"
                        color="negative"
                        text-color="white" 
                        content-class="q-gap-xs"
                        icon="gavel"
                        padding="sm"
                        label="File a Dispute"
                        @click="showSellerDisputeDialog = true"
                      />
                      <q-btn v-else-if="!isAuctioneer" stack unelevated class="text-bold text-caption full-width"
                        color="negative"
                        text-color="white"
                        content-class="q-gap-xs"
                        icon="assignment_return"
                        padding="sm"
                        label="Refund"
                        :disable="!canRequestRefund || isGrantedRefund"
                        @click="showRefundDialog = true"
                      />
                    </div>
                  </div>

                  <div v-if="!isAuctioneer && deliveryDetails === 3 && refundCountdown && !isGrantedRefund" class="text-caption text-right q-mt-xs">
                    Time left for refund: {{ refundCountdown }}
                  </div>

                  <!-- Seller: refund granted banner -->
                  <div v-if="isAuctioneer && isGrantedRefund" class="q-mt-md full-width">
                    <q-banner rounded dense class="bg-warning text-white q-pa-md">
                      <template v-slot:avatar>
                        <q-icon name="assignment_return" />
                      </template>
                      Refund has been granted. Funds will be released to the buyer directly.
                    </q-banner>
                  </div>

                  <!-- Resolved: funds returned by arbiter (status 1 or 2) -->
                  <div v-if="isGrantedReturn && (deliveryDetails === 1 || deliveryDetails === 2)" class="q-mt-md full-width">
                    <q-banner rounded dense class="bg-positive text-white q-pa-md">
                      <template v-slot:avatar>
                        <q-icon name="check_circle" />
                      </template>
                      Dispute resolved. Funds have been returned to the buyer.
                    </q-banner>
                  </div>

                  <!-- Bidder: mark as complete (no refund, delivered) -->
                  <div 
                  v-if="showPostAuctionActions 
                        && bidStatus === 'Winner' 
                        && !isMarkedComplete 
                        && !isGrantedRefund 
                        && deliveryDetails === 3" 
                  class="q-mt-md full-width"
                  >
                    <q-btn unelevated color="positive" icon="check_circle" class="full-width" label="Mark as Complete"
                      :disable="isMarkedComplete"
                      @click="markedAsCompleted"
                    />
                  </div>
                </template>
                
                <template v-else>
                  <q-banner class="bg-warning text-black rounded-borders q-mt-md">
                    <template v-slot:avatar>
                      <q-icon name="gavel" />
                    </template>
                    An active dispute is currently pending review. Operations are temporarily locked.
                  </q-banner>
                </template>
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
                      <div class="text-h6 text-weight-bold text-primary" style="line-height: 1.2;">
                        <template v-if="auction?.is_fiat">{{ formatFiat(estimatedAmountFiat) }}</template>
                        <template v-else>
                          {{ formatBCH(estimatedAmountBch).main }}<span style="opacity: 0.4;">{{ formatBCH(estimatedAmountBch).zeros }}</span> BCH
                        </template>
                      </div>
                      
                      <div class="text-caption text-weight-medium text-primary">
                        <template v-if="auction?.is_fiat">
                          {{ formatBCH(estimatedAmountBch).main }}<span style="opacity: 0.4;">{{ formatBCH(estimatedAmountBch).zeros }}</span> BCH
                        </template>
                        <template v-else>{{ formatFiat(estimatedAmountFiat) }}</template>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-sm-6">
                <!--Viewing Highest Bid (English Auction)-->
                <q-card v-if="auction?.type === 'English' " flat bordered class="full-height">
                  <q-card-section class="q-pa-sm">
                    <div class="row items-center justify-between q-mb-sm text-caption">
                      <div class="row items-center">
                        <q-icon name="payments" size="14px" class="q-mr-xs" />
                        Highest Bid
                      </div>
                    </div>

                    <!-- AUCTION HAS A BID -->
                    <div v-if="Boolean(lotWinningBid?.id)">
                      <div class="text-h6 text-weight-bold text-positive" style="line-height: 1.2;">
                        <template v-if="auction?.is_fiat">{{ formatFiat(engCurrentFiat) }}</template>
                        <template v-else>
                          {{ formatBCH(engCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(engCurrentBch).zeros }}</span> BCH
                        </template>
                      </div>

                      <div class="text-caption text-weight-medium text-positive q-mt-xs">
                        <template v-if="auction?.is_fiat">
                          {{ formatBCH(engCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(engCurrentBch).zeros }}</span> BCH
                        </template>
                        <template v-else>{{ formatFiat(engCurrentFiat) }}</template>
                      </div>
                    </div>

                    <!-- AUCTION HAS NO BIDS YET -->
                    <div v-else>
                      <div class="text-subtitle1 text-weight-bold q-my-none text-grey-6" style="line-height: 1.2;">
                        No bids yet
                      </div>
                      <div class="text-caption text-weight-medium q-mt-xs">
                        <template v-if="auction?.is_fiat">
                          {{ formatFiat(engCurrentFiat) }} floor · {{ formatBCH(engCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(engCurrentBch).zeros }}</span> BCH
                        </template>
                        <template v-else>
                          {{ formatBCH(engCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(engCurrentBch).zeros }}</span> BCH floor · {{ formatFiat(engCurrentFiat) }}
                        </template>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
                
                <q-card v-else flat bordered class="full-height">
                  <q-card-section v-if="lot?.status === 'Sold'" class="q-pa-sm">
                    <div class="text-caption row items-center q-mb-sm">
                      <q-icon name="price_change" size="14px" class="q-mr-xs" />
                      Winning Bid Details
                    </div>

                    <template v-if="lotWinningBid">
                      <div class="text-h6 text-weight-bold text-green" style="line-height: 1.2;">
                        <template v-if="auction?.is_fiat">{{ formatFiat(lotWinningBid?.bid_price_fiat) }}</template>
                        <template v-else>
                          {{ formatBCH(lotWinningBid?.bid_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lotWinningBid?.bid_price_bch).zeros }}</span> BCH
                        </template>
                      </div>

                      <div class="text-caption text-weight-medium text-green">
                        <template v-if="auction?.is_fiat">
                          {{ formatBCH(lotWinningBid?.bid_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lotWinningBid?.bid_price_bch).zeros }}</span> BCH
                        </template>
                        <template v-else>{{ formatFiat(lotWinningBid?.bid_price_fiat) }}</template>
                      </div>

                      <div class="text-caption text-grey-6 q-mt-xs">
                        <q-icon name="schedule" size="11px" class="q-mr-xs" />
                        {{ formatAuctionDate(lotWinningBid?.date_bid) }}
                      </div>
                    </template>

                    <div v-else class="text-caption text-grey-6">No bids were made.</div>
                  </q-card-section>

                  <q-card-section v-else class="q-pa-sm">
                    <div class="text-caption row items-center q-mb-xs">
                      <q-icon name="trending_down" size="14px" class="q-mr-xs" />
                      Current Price
                    </div>
                    
                    <div class="row items-end justify-between no-wrap">
                      <div>
                        <div class="text-h6 text-weight-bold text-negative" style="line-height: 1.2;">
                          <template v-if="auction?.is_fiat">{{ formatFiat(dynamicPriceFiat) }}</template>
                          <template v-else>
                            {{ formatBCH(dynamicPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dynamicPriceBch).zeros }}</span> BCH
                          </template>
                        </div>

                        <div class="text-caption text-weight-medium text-negative q-mt-xs">
                          <template v-if="auction?.is_fiat">
                            {{ formatBCH(dynamicPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dynamicPriceBch).zeros }}</span> BCH
                          </template>
                          <template v-else>{{ formatFiat(dynamicPriceFiat) }}</template>
                        </div>
                      </div>
                      
                      <div class="text-right border-left q-pl-sm" :style="darkMode ? 'border-color: rgba(255,255,255,0.15)' : 'border-color: rgba(0,0,0,0.1)'">
                        <div class="text-caption q-mb-xs">Floor Limit</div>
                        <div>
                          <div class="text-subtitle2 text-weight-bold" style="line-height: 1.2;">
                            <template v-if="auction?.is_fiat">{{ formatFiat(dutchFloorPriceFiat) }}</template>
                            <template v-else>
                              {{ formatBCH(dutchFloorPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dutchFloorPriceBch).zeros }}</span> BCH
                            </template>
                          </div>

                          <div class="text-caption text-grey-7 q-mt-xs">
                            <template v-if="auction?.is_fiat">
                              {{ formatBCH(dutchFloorPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dutchFloorPriceBch).zeros }}</span> BCH
                            </template>
                            <template v-else>{{ formatFiat(dutchFloorPriceFiat) }}</template>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="lot?.status === 'Sold'" class="text-caption text-center q-mt-sm text-positive text-weight-medium">
                      <q-icon name="check_circle" size="12px" class="q-mr-xs" />Sold
                    </div>
                    
                    <div v-else-if="!dutchAtFloor" class="q-mt-sm">
                      <div class="row items-center justify-between text-caption q-mb-xs">
                        Next price drop in
                        <span class="text-weight-medium">{{ formatIntervalCountdown(timeLeft) }}</span>
                      </div>

                      <q-linear-progress rounded size="6px" color="negative"
                        :value="dutchIntervalProgress" 
                        :track-color="darkMode ? 'grey-9' : 'grey-3'"
                      />
                    </div>
                    <div v-else class="text-caption text-center q-mt-sm" style="opacity: 0.6;">
                      Floor price reached
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
 
            <!--Lot Information-->
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
                  <div class="col column overflow-hidden">
                    <div class="row items-center no-wrap full-width">
                      <span v-if="auction?.auctioneer?.username" class="text-weight-medium ellipsis col-shrink q-mr-xs" >
                        {{ auction.auctioneer.username }}
                      </span>
                      
                      <q-badge v-if="isAuctioneer" color="positive" class="q-px-xs no-shrink">
                        <q-icon name="star" size="10px" class="q-mr-xs" />You
                      </q-badge>
                    </div>
                    
                    <span class="text-caption ellipsis" style="opacity: 0.6;">
                      {{ auction ? formatAddressWithEllipsis(auction.auctioneer?.id) : 'N/A' }}
                    </span>
                  </div>
                  <q-btn flat round dense icon="content_copy" size="xs" @click="copyToClipboard(auction?.auctioneer?.id, $q)" />
                </div>
                <q-separator spaced="xs" />
                <div class="row items-center q-py-xs">
                  <div class="text-caption col-4 q-mr-sm">
                    <q-icon name="event" size="13px" class="q-mr-xs" />Posted on
                  </div>
                  <span>{{ formatAuctionDate(auction.date_created) || 'N/A' }}</span>
                </div>
              </q-card-section>
            </q-card>
 
            <div class="column q-mt-xs">
              <div class="text-bold q-mb-xs">Description:</div>
              <p class="text-body2 text-left" style="white-space: pre-wrap; line-height: 1.5;">
                {{ lot?.description || 'No additional specifications provided.' }}
              </p>
            </div>
            
            <!--Date start and end of auction/lot-->
            <div class="row q-gutter-sm">
              <div class="col rounded-borders q-pa-sm" :class="darkMode ? 'bg-dark' : 'bg-grey-2'">
                <div class="text-caption q-mb-xs">
                  <q-icon name="event_available" size="12px" class="q-mr-xs" />Start date
                </div>
                <div class="text-body2 text-weight-medium">{{ formatAuctionDate(auction?.start_date) }}</div>
                <div  v-if="lot?.status === 'Inactive'" class="text-secondary">
                  Time Remaining: {{ auctionStartCountdown }}
                </div>
              </div>

              <div class="col rounded-borders q-pa-sm" :class="darkMode ? 'bg-dark' : 'bg-grey-2'">
                <div class="text-caption q-mb-xs">
                  <q-icon name="event_busy" size="12px" class="q-mr-xs" />End date
                </div>
                <div class="text-body2 text-weight-medium">{{ formatAuctionDate(auction?.end_date) }}</div>
                <div v-if="lot?.status === 'Active'" class="text-secondary">
                  Time Remaining: {{ auctionEndCountdown }}
                </div>
              </div>
            </div>

            <!--Viewing bid history information (English Auction)-->
            <div v-if="auction?.type === 'English'" class="q-mt-md full-width">
              <q-btn outline dense no-caps color="primary" icon="history" label="View Bidding History" class="col full-width" @click="showBidHistory = true" />
            </div>
          </div>
        </div>
      </div>
      
      <!--LOADING SKELETON-->
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
              <div v-for="n in 2" :key="n" class="col-12 col-sm-6">
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
              <div v-for="n in 2" :key="n" class="col rounded-borders">
                <q-skeleton type="rect" width="100%" height="75px" class="rounded-borders" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =================== POP UPS =================== -->
    <BiddingPopup v-if="showMakeBidDialog && auction?.type == 'English'"
      v-model="showMakeBidDialog"
      :lot="lot"
      :auction="auction"
      :loading="isBidLoading"
      @place-bid="handlePlaceBid"
    />

    <BuyItNowPopup v-if="showMakeBidDialog && auction?.type == 'Dutch'"
      v-model="showMakeBidDialog"
      :lot="lot"
      :auction="auction"
      :current-price-bch="dynamicPriceBch"
      :current-price-fiat="dynamicPriceFiat"
      :is-fiat="auction?.is_fiat"
      :loading="isBidLoading"
      @confirm-buy-it-now="handlePlaceBid"
    />

    <DeliveryStatusHistoryDialog v-model="showDeliveryHistory" :lotId="props.lotId" />
    <BiddingHistoryPopup v-model="showBidHistory" :lotId="props.lotId" />

    <SellerDisputePopup v-model="showSellerDisputeDialog" :lot="lot" :bidId="lotWinningBid.value?.id" @submit="refresh(() => {})" />
    <RefundPopup v-model="showRefundDialog" :lot="lot" :bidId="lotWinningBid.value?.id" @submit="refresh(() => {})" />
  </q-pull-to-refresh>
</template>

<script setup>
// Imports
import { useStore } from 'vuex'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar, date } from 'quasar'

import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { callAPI } from 'src/auction/api'
import { payFirstBidToContract } from 'src/auction/payment'
import { callLotWebsocket } from 'src/auction/websocket'
import { copyToClipboard, formatAuctionCountdown, formatIntervalCountdown, formatAuctionDate, formatFiat, formatBCH, formatAddressWithEllipsis } from './helper-functions'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import BiddingPopup from 'src/components/auction/BiddingPopup.vue'
import BuyItNowPopup from 'src/components/auction/BuyItNowPopup.vue'
import BiddingHistoryPopup from 'src/components/auction/BiddingHistoryPopup.vue'
import SellerDisputePopup from 'src/components/auction/SellerDisputePopup.vue'
import RefundPopup from 'src/components/auction/RefundPopup.vue'
import DeliveryStatusHistoryDialog from 'src/components/auction/DeliveryStatusHistoryDialog.vue'
import { DeliveryDetails, Bid, DeliveryEvent } from 'src/auction/object'

// Quasar variables
const $q = useQuasar()
const $store = useStore()
const $route = useRoute()
const $router = useRouter()

// System-related variables
const isLoading = ref(false)
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const controlColor = computed(() => darkMode.value ? 'white' : 'primary')
const userWalletHash = computed(() => $store.getters['global/getWallet']('bch')?.walletHash)
const bchToPhpRate = computed(() => $store.getters['market/getAssetPrice']('bch', 'php') || 0)
 
const intervalDurationSec = ref(600)

// Props
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

// Auction countdowns
const auctionEndCountdown = ref('Loading...')
const auctionStartCountdown = ref('Loading...')

// Dutch price-drop interval
const secondsRemaining = ref(null)
const dutchIntervalProgress = computed(() => {
  if (!intervalDurationSec.value) return 0
  return Math.max(0, Math.min(1, secondsRemaining.value / intervalDurationSec.value))
})

// Auction-related variables
const auction = computed(() => $store.getters['auction/auctionData'])
const isAuctionClosed = computed(() => auction.value?.status === 'Closed')
const isAuctioneer = computed(() => userWalletHash.value === auction.value?.auctioneer?.id)

// Lot-related variables
const lot = computed(() => $store.getters['auction/lotData'])
const lotImages = computed(() => $store.getters['auction/lotImages'])
const lotImageActiveSlide = ref(0)
const isLotSold = computed(() => lot.value?.status === 'Sold')

// Estimated amounts (BCH & Fiat)
const estimatedAmountBch = computed(() => {
  if (!auction.value?.is_fiat) return Number(lot.value?.est_price_bch ?? 0)
  const fiat = Number(lot.value?.est_price_fiat ?? 0)
  return bchToPhpRate.value > 0 ? fiat / bchToPhpRate.value : 0
})
const estimatedAmountFiat = computed(() => {  
  if (auction.value?.is_fiat) return Number(lot.value?.est_price_fiat ?? 0)
  const estBCH = Number(lot.value?.est_price_bch ?? 0)
  return estBCH * bchToPhpRate.value
})

// English-related amounts
const engCurrentPrice = computed(() => Number(
  auction.value?.is_fiat
    ? lotWinningBid.value?.bid_price_fiat ?? lot.value?.start_price_fiat ?? 0
    : lotWinningBid.value?.bid_price_bch ?? lot.value?.start_price_bch ?? 0
))
const engCurrentBch = computed(() => auction.value?.is_fiat
  ? bchToPhpRate.value > 0 ? engCurrentPrice.value / bchToPhpRate.value : 0
  : engCurrentPrice.value
)
const engCurrentFiat = computed(() => auction.value?.is_fiat
  ? engCurrentPrice.value : engCurrentPrice.value * bchToPhpRate.value
)

// Dutch-related amounts
const dynamicPriceBch = ref(0)
const dynamicPriceFiat = ref(0)

const dutchAtFloor = ref(false)
const dutchFloorPriceBch = computed(() => Number(lot.value?.thresh_price_bch || 0))
const dutchFloorPriceFiat = computed(() => Number(lot.value?.thresh_price_fiat || 0))

// ====================
// POST-AUCTION ACTIONS
// ====================
const showPostAuctionActions = computed(() => isLotSold.value && !isMarkedComplete.value)

// Viewing data
const showSellerDisputeDialog = ref(false)
const showRefundDialog = ref(false)

// Delivery-related variables
const showDeliveryHistory = ref(false)
const deliveryDetails = ref(null)
const deliveryEvents = ref(null)
const dateDelivered = ref(null)

// Creates delivery tracking for an sold lot.
const initDeliveryTracking = async () => {
  if (
    deliveryDetails.value != null   // Delivery details already exists
    && deliveryEvents.value != null
    && !isLotSold.value             // Lot isn't sold
    && !userIsLeadingBidder.value   // User isn't the winner
  ) return

  try {
    const deliveryDetailsRes = await $store.dispatch('auction/createDeliveryDetails', {
      lot: lot.value?.id,
      sender: auction.value?.auctioneer?.id,
      sender_address: 'N/A', // REVIEW
      receiver: userWalletHash.value,
      receiver_address: 'N/A', // REVIEW
      courier: (lot.value?.category === 'Physical') ? 'LBC' : 'N/A' // REVIEW
    })
    if (!deliveryDetailsRes || !deliveryDetailsRes.success || !deliveryDetailsRes.data) 
      throw new Error('Delivery tracking could not be created. Please refresh the page.')
    
    const data = deliveryDetailsRes.data
    const deliveryEventRes = await $store.dispatch('auction/createDeliveryEvent', {
      delivery: data.tracking_id,
      status: 'Preparing',
      description: 'N/A', // REVIEW
      location: 'N/A', // REVIEW
      date_of_event: new Date().toISOString()
    })

    if (deliveryEventRes && deliveryEventRes.success && deliveryEventRes.data){
      deliveryEvents.value = deliveryEventRes.data
      data['delivery_events'] = [DeliveryEvent.parse(deliveryEventRes.data)]
    } else throw new Error('Delivery event could not be created. Please refresh the page.')
    deliveryDetails.value = DeliveryDetails.parse(data)

  } catch (error) {
    $q.notify({ type: 'warning', message: error.message })
  }
}

const updateDeliveryStatus = async (status, successMessage) => {
  const response = await $store.dispatch('auction/createDeliveryEvent', {
    delivery: deliveryDetails.value?.tracking_id,
    status
  })
  $q.notify({
    type: response?.success ? 'positive' : 'negative',
    message: response?.success ? successMessage : 'Could not create new delivery event.'
  })
  await refresh(() => {})
}

// Marks the delivery as complete (bidder)
const markedAsCompleted = async () => {
  if (!lotWinningBid.value) {
    $q.notify({ type: 'warning', message: 'Could not find bid to release funds for.' })
    return
  }
  $q.loading.show({ message: 'Marking as complete, processing funds...' })
  //await callContractRelease(lotWinningBid.value?.id)
  $q.loading.hide()
  await refresh(() => {})
}

// ======================
// REFUND-RELATED ACTIONS
// ======================
const refundCountdown = ref('')
let refundCountdownInterval = null

// Updates the refund countdown from the latest websocket value.
const updateRefundCountdown = () => {
  if (!dateDelivered.value || isGrantedRefund.value) {
    refundCountdown.value = ''
    clearInterval(refundCountdownInterval)
    return
  }

  let dateStr = String(dateDelivered.value).trim().replace(' ', 'T')
  if (!dateStr.endsWith('Z') && !dateStr.includes('+')) dateStr += 'Z'

  const delivered = new Date(dateStr)
  const deadline = new Date(delivered.getTime() + 6 * 60 * 60 * 1000)
  const now = new Date()

  if (now >= deadline) {
    refundCountdown.value = 'Expired'
    clearInterval(refundCountdownInterval)
    return
  }

  const seconds = Math.max(0, date.getDateDiff(deadline, now, 'seconds'))
  if (seconds < 60) {
    refundCountdown.value = `${seconds}s`;
    return
  }

  const minutes = date.getDateDiff(deadline, now, 'minutes')
  if (minutes < 60) {
    refundCountdown.value = `${minutes}m`;
    return
  }

  const hours = date.getDateDiff(deadline, now, 'hours')
  refundCountdown.value = `${hours}h`
}

const canRequestRefund = computed(() => {
  if (!dateDelivered.value) return false
  const delivered = new Date(String(dateDelivered.value).trim().replace(' ', 'T'))
  const deadline = new Date(delivered.getTime() + 6 * 60 * 60 * 1000)
  return new Date() < deadline
})

// =======================
// DISPUTE-RELATED ACTIONS
// =======================
const isMarkedComplete = ref(false)
const isGrantedRefund = ref(false)
const isGrantedReturn = ref(false)
const currentDispute = ref(null)

const isDisputeActive = computed(() => {
  if (!currentDispute.value) return false
  return !currentDispute.value.is_resolved
})

// =====================
// BID-RELATED FUNCTIONS
// =====================
const isBidLoading = ref(false)
const showBidHistory = ref(false)
const showMakeBidDialog = ref(false)

const lotWinningBid = computed(() => $store.getters['auction/highestBid'])
const userIsLeadingBidder = computed(() => lotWinningBid.value?.bidder?.id === userWalletHash.value)

// Validates and submits bid data after the pending bid is created.
const handlePlaceBid = async (bidData) => {
  // Loading is still ongoing
  if (isBidLoading.value) return

  // Wallet not connected
  if (!userWalletHash.value) {
    $q.notify({ type: 'warning', message: 'Please connect your wallet first.' })
    return
  }

  // If ever (supposedly not being reached)
  if (lot.value?.status !== 'Active') {
    $q.notify({ type: 'warning', message: 'This lot is not accepting bids.' })
    return
  }

  // Bid information
  const bidBch = Number(bidData.bid_price_bch)
  const bidFiat = Number(bidData.bid_price_fiat)
  const bidPrice = auction.value?.is_fiat ? bidFiat : bidBch

  // Get current winner's bid price
  const priceType = auction.value?.is_fiat ? 'fiat' : 'bch'
  const currentPrice = Number(
    lotWinningBid.value?.[`bid_price_${priceType}`]
      ?? lot.value?.[`start_price_${priceType}`]
      ?? 0
  )
  
  // Check if new bid is valid
  const isLesserThanCurrentBid = !Number.isFinite(bidPrice) || bidPrice <= 0 || bidPrice <= currentPrice || (Boolean(lotWinningBid.value?.id) && bidPrice === currentPrice)
  if (isLesserThanCurrentBid) {
    $q.notify({ type: 'warning', message: 'Bid must be higher than the current bid.' })
    return
  }

  isBidLoading.value = true
  try {
    // Send the bid to WS
    const pendingBid = await websocketSendBid({ bid_price_bch: bidBch, bid_price_fiat: bidFiat })
    if (!pendingBid?.id) throw new Error('Bid was not created in the server.')

    // Settle/Complete the bid through payment
    $q.loading.show({ message: 'Processing smart contract...' })
    let settledBid

    // Existing bids
    if (lotWinningBid.value?.id) {
      const result = await callAPI('Outbid', pendingBid.id, 'post')
      if (!result.success) throw new Error(result.error || 'Failed to outbid.')
      settledBid = result.errorData

    } else { // No existing bids
      // Sending the first bid to the contract directly
      const txid = await payFirstBidToContract(Number(props.lotId), Number(bidBch.toFixed(8)))
      if (!socket || socket.readyState !== WebSocket.OPEN) 
        throw new Error('Bid connection closed before payment confirmation.')
      
      // Updating the bid in the server via WS
      const settlement = waitForBidSettlement(pendingBid.id)
      socket.send(JSON.stringify({
        type: 'paid_bid',
        data: { id: pendingBid.id, lot: Number(props.lotId), txid }
      }))
      settledBid = await settlement
    }

    showMakeBidDialog.value = false
    const notifType = ['Highest', 'Winner'].includes(settledBid.status) ? 'positive' : 'warning'
    const notifMsgs = {
      'Highest': `Bid of ${formatBCH(bidBch).main}${formatBCH(bidBch).zeros} BCH placed!`,
      'Outbid': 'Your bid was accepted but has already been outbid.',
      'Winner': `You have won the lot! ${formatBCH(bidBch).main}${formatBCH(bidBch).zeros} BCH was placed.`,
    }

    $q.notify({
      type: notifType,
      icon: 'gavel',
      message: notifMsgs[settledBid.status],
      timeout: 3000
    })
    
    $store.commit('auction/setHighestBid', Bid.parse(settledBid))
  } catch (error) {
    console.error(error)
    $q.notify({ 
      type: 'negative', 
      message: error.message || 'Something went wrong.' 
    })
  } finally {
    $q.loading.hide()
    isBidLoading.value = false
  }
}
// Lot's general bid status (in reference to the user)
const bidStatus = computed(() => {
  // NO BIDS
  if (!lotWinningBid.value?.id) return (isLotSold.value) ? 'Unsold' : null
  if (userIsLeadingBidder.value) return (isLotSold.value) ? 'Winner' : 'Highest'
  return 'Outbid' // OTHER WINNER OR HIGHEST
})

const bidStatusMessages = {
  Highest: {
    icon: 'emoji_events',
    iconColor: 'positive',
    bannerClass: 'bg-green-1',
    titleClass: 'text-green-9',
    title: 'You are the highest bidder!',
    description: "You're in the lead — we'll let you know if that changes.",
  },
  Outbid: {
    icon: 'warning',
    iconColor: 'negative',
    bannerClass: 'bg-red-1',
    titleClass: 'text-red-9',
    title: 'You have been outbid!',
    description: 'Place a higher bid to get back in the lead.',
  },
  Winner: {
    icon: 'celebration',
    iconColor: 'positive',
    bannerClass: 'bg-green-1',
    titleClass: 'text-green-9',
    title: 'Congratulations, you won!',
    description: "We'll be in touch with next steps shortly.",
  },
  Unsold: {
    icon: 'do_not_disturb',
    iconColor: 'grey-7',
    bannerClass: 'bg-grey-3',
    titleClass: 'text-grey-8',
    title: 'Auction closed, you did not win.',
    description: 'You did not win this item.',
  },
}

const bidStatusMessage = computed(() => bidStatusMessages[bidStatus.value] || bidStatusMessages.Unsold)

// ===========================
// WEBSOCKET-RELATED FUNCTIONS
// ===========================
const viewCount = ref(0) 
const timeLeft = ref(null)

let socket = null
let reconnectTimeout = null
let reconnectAttempts = 0
let maxReconnectAttempts = 10

// Connects to the lot websocket and handles incoming updates.
const connectWebsocket = async () => {
  const ws = await callLotWebsocket(Number(props.lotId))

  // Connecting to the WS
  ws.onopen = async () => {
    const wasReconnect = reconnectAttempts > 0
    reconnectAttempts = 0
    console.log("Connected to the lot websocket!")

    if (wasReconnect) {
      settlementTimeoutControl?.resume()

      await Promise.all([
        $store.dispatch('auction/fetchLotData'),
        $store.dispatch('auction/fetchHighestBid'),
      ])

      if (settlementBidId) {
        const settledBid = $store.getters['auction/lotBids'].find(bid => Number(bid.id) === settlementBidId && bid.status !== 'Pending')
        if (settledBid) resolveBidSettlement(settledBid)
      }
    }
  };

  // Receiving WS messages
  ws.onmessage = async (event) => {
    let message
    try {
      message = JSON.parse(event.data)
    } catch (error) {
      console.error("Invalid lot websocket message:", error)
      return
    }

    // Split the message
    const { type, data = {} } = message
    switch (type) {
      // Live viewer count
      case "live.viewing":
        viewCount.value = data.viewer_count
        break

      // Countdown for the start of the auction
      case "lot.start_countdown":
        auctionStartCountdown.value = formatAuctionCountdown(data.time_left)
        break

      // Countdown for the end of the auction
      case "lot.end_countdown":
        auctionEndCountdown.value = formatAuctionCountdown(data.time_left, true)
        if (auctionStartCountdown.value) auctionStartCountdown.value = ""
        break

      // Updating the lot's status
      case "lot.update_status":
        if (data && data?.status) 
          $store.commit('auction/updateLotStatus', { id: props.lotId, status: data.status })
        if (data.status !== 'Active') showMakeBidDialog.value = false
        if (data.status === 'Sold') await initDeliveryTracking()
        break

      // Updating the lot's information
      case "lot.update":
        if (data?.id) $store.commit('auction/mergeLotData', data)
        break

      // Deleting the lot
      case "lot.delete":
        if (data?.id) {
          $store.commit('auction/clearLotData', data.id)
          $router.replace(smartBackPath.value)
        }
        break
      
      case "lot.time_interval": // Updating the time interval (DUTCH Auction)
      case "lot.drop_price":    // Updating the price drop (DUTCH Auction)
        if (lot.value?.status !== 'Active' || isLotSold.value ) break

        if (type === "lot.drop_price"){
          secondsRemaining.value = data.seconds_remaining
          timeLeft.value = data.time_left
        }
        
        dynamicPriceFiat.value = (auction.value?.is_fiat) ? Number(data.price) : Number(data.price) * bchToPhpRate.value
        dynamicPriceBch.value = (!auction.value?.is_fiat) 
          ? Number(data.price) : (bchToPhpRate.value > 0) ? Number(data.price) / bchToPhpRate.value : 0
        break

      // Received placebid acknowledgement
      case "place.bid_ack":
        await $store.dispatch('auction/updateBidFromWebsocket', data)
        bidResolver?.(data)
        clearBidWaiters()
        break
      
      // Received ERROR from placebid
      case "bid.error": {
        const error = new Error(data.message || 'Bid failed.')
        clearBidWaiters(error)
        clearSettlementWaiter(error)
        break
      }

      case "bid.update": // Updating the bid's information
      case "update.highest_bid": // Updating the highest bidder
      case "update.winner": // Updating the bid winner
        await $store.dispatch('auction/updateBidFromWebsocket', data)
        resolveBidSettlement(data)
        break

      // Cancelling the bid
      case "bid.cancelled_ack":
        if (Array.isArray(data.cancelled_bid_ids) && data.cancelled_bid_ids.length) 
          $store.commit('auction/cancelLotBids', data.cancelled_bid_ids)
        break

      // UNRECOGNIZED WS EVENT
      default:
        console.warn("Unknown websocket event:", type, data)
        break
    }
  }

  ws.onclose = (event) => {
      console.log("Disconnected from the lot websocket!")
      if (settlementTimeoutControl) settlementTimeoutControl.pause()
      
      if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000)
        reconnectAttempts++
        reconnectTimeout = setTimeout(async () => {
          reconnectTimeout = null
          socket = await connectWebsocket()
        }, delay)
      }
    }

  ws.onerror = (event) => {
    console.error("Lot websocket error:", event)
  }

  return ws
}

// Clears the socket
const clearSocket = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  if (!socket) return

  const error = new Error('Bid connection closed.')
  clearBidWaiters(error)
  clearSettlementWaiter(error)
  socket.onmessage = null
  socket.onopen = null
  socket.onerror = null
  socket.onclose = null
  socket.close()
  socket = null
}

// ===============================
// BID-RELATED WEBSOCKET FUNCTIONS
// ===============================

let bidResolver = null
let bidRejecter = null
let settlementBidId = null
let settlementResolver = null
let settlementRejecter = null
let settlementTimeoutControl = null

const clearBidWaiters = (error) => {
  if (error) bidRejecter?.(error)
  bidResolver = null
  bidRejecter = null
}

const clearSettlementWaiter = (error) => {
  if (error) settlementRejecter?.(error)
  settlementTimeoutControl?.clear()
  settlementBidId = null
  settlementResolver = null
  settlementRejecter = null
  settlementTimeoutControl = null
}

// Sends a bid through WS
const websocketSendBid = async ({ bid_price_bch, bid_price_fiat }) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error('Bid failed. Please try again.')
  }

  const ack = waitForWebsocketBidAck()
  socket.send(JSON.stringify(
    {
      type: "place_bid",
      data: {
        bidder: userWalletHash.value,
        lot: props.lotId,
        bid_price_bch: Number(bid_price_bch).toFixed(8),
        bid_price_fiat: Number(bid_price_fiat).toFixed(2)
      }
    }
  ))

  return ack
}

// Waits for the bid ack (data saved to server)
const waitForWebsocketBidAck = () => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearBidWaiters()
      reject(new Error('Timed out waiting for bid confirmation.'))
    }, 10000)

    bidResolver = (data) => {
      clearTimeout(timeout)
      clearBidWaiters()
      resolve(data)
    }
    bidRejecter = (error) => {
      clearTimeout(timeout)
      clearBidWaiters()
      reject(error)
    }
  })
}

// Waits for the bid to be marked as complete
const waitForBidSettlement = (bidId) => {
  return new Promise((resolve, reject) => {
    const startTimeout = () => setTimeout(() => {
      clearSettlementWaiter()
      reject(new Error('Timed out waiting for bid settlement.'))
    }, 60000)
    let timeout = startTimeout()

    settlementBidId = Number(bidId)
    settlementResolver = (data) => {
      clearTimeout(timeout)
      clearSettlementWaiter()
      resolve(data)
    }
    settlementRejecter = (error) => {
      clearTimeout(timeout)
      clearSettlementWaiter()
      reject(error)
    }
    settlementTimeoutControl = {
      clear: () => clearTimeout(timeout),
      pause: () => { clearTimeout(timeout) },
      resume: () => { clearTimeout(timeout); timeout = startTimeout() },
    }
  })
}

// Resolves the pending settlement wait for a bid.
const resolveBidSettlement = (data) => {
  if (Number(data?.id) !== settlementBidId || data?.status === 'Pending') return
  settlementResolver?.(data)
}

// ============
// PAGE-RELATED
// ============

const shouldRefetch = (lastFetchedGetter) => {
  const lastFetched = $store.getters[`auction/${lastFetchedGetter}`]
  return !lastFetched || Date.now() - lastFetched > 30000
}

// Loads the data required to render the page.
const loadPageData = async (force=false) => {
  const isSameLotId = $store.getters['auction/lotId'] === Number(props.lotId)
  const isSameAuctionId = $store.getters['auction/auctionId'] === Number(props.auctionId)

  await Promise.all([
    $store.dispatch(`auction/fetch${force || !isSameLotId || shouldRefetch('auctionLotsLastFetched') ? '' : 'Existing'}LotData`, props.lotId),
    $store.dispatch(`auction/fetch${force || !isSameAuctionId || shouldRefetch('listingsLastFetched') ? '' : 'Existing'}AuctionData`, props.auctionId)
  ])
  
  if(auction.value?.type === 'Dutch') {
    dynamicPriceBch.value = lot.value?.start_price_bch
    dynamicPriceFiat.value = lot.value?.start_price_fiat
    const [hours, minutes, seconds] = (lot.value?.time_interval ?? '00:00:00').split(':').map(Number)
    intervalDurationSec.value = hours * 3600 + minutes * 60 + seconds
  }

  if (!isLotSold.value) return
  
  
  await initDeliveryTracking()

  if (dateDelivered.value) {
    updateRefundCountdown()
    refundCountdownInterval = setInterval(updateRefundCountdown, 1000)
  }
  
  
}

const smartBackPath = computed(() => {
  const sourceContext = $route.query.from
  return `/apps/auction/${(sourceContext === 'activity') ? 'activity' : props.auctionId}`
})

// Refreshes the page data and completes the pull-to-refresh action.
const refresh = async (done) => {
  if (!auction.value || !lot.value) $router.replace(smartBackPath.value)
  await loadPageData()

  // Notify if the lot is already closed (either sold or not)
  if (isAuctionClosed.value) {
    $q.notify({
      type: 'info',
      icon: 'lock',
      message: `This lot ${ (isLotSold.value) ? 'has already been sold.' : 'is closed.' }`
    })
  }
  clearSocket()
  socket = await connectWebsocket()
  done()
}

onMounted(async () => {
  isLoading.value = true
  if (!auction.value || !lot.value) $router.replace(smartBackPath.value)
  await loadPageData()
  isLoading.value = false
  
  // Notify if the lot is already closed (either sold or not)
  if (isAuctionClosed.value) {
    $q.notify({
      type: 'info',
      icon: 'lock',
      message: `This lot ${ (isLotSold.value) ? 'has already been sold.' : 'is closed.' }`
    })
  }
  socket = await connectWebsocket()
})

onBeforeUnmount(() => {
  clearSocket()
})

</script>
