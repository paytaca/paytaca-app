<template>
  <!--
    This page contains the lot details. It also has the lines-of-code for the auction
    mechanisms.
  -->
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction - Lot Details')" :backnavpath="smartBackPath" class="header-nav" />
 
    <div>
      <!--All data has been loaded-->
      <div v-if="!isLoading && lot && auction" class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
        <div class="q-mb-lg text-left">
          <div class="text-h4 text-weight-bold q-mb-xs" style="overflow-wrap: break-word; word-wrap: break-word;">
            Lot {{ lot?.id }}: <span class="text-weight-regular">{{ lot?.title }}</span>
          </div>
 
          <div class="row items-center q-gutter-sm q-mb-sm">
            <q-badge color="primary" class="q-pa-sm q-px-sm text-weight-bold">
              <q-icon :name="lot?.category === 'Digital' ? 'computer' : 'delivery_dining'" size="12px" class="q-mr-xs" />
              {{ lot?.category }}
            </q-badge>
            <q-badge
              :color="lot?.status_color"
              class="q-pa-sm q-px-sm text-weight-bold"
            >
              {{ lot?.status }}
            </q-badge>
          </div>
        </div>
 
        <div class="row q-col-gutter-y-md q-col-gutter-x-none q-col-gutter-x-sm-md q-col-gutter-x-md-xl justify-center justify-sm-start items-start">
          <div class="col-12 col-sm-5 col-md-4 q-pr-md-lg" style="width: 100%; max-width: 380px; min-width: 280px;">
            <q-carousel
              ref="carousel"
              v-model="lotImageActiveSlide"
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
                {{ lotImageActiveSlide + 1 }} / {{ lotImages.length }}
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
                  :style="lotImageActiveSlide === index ? 'border: 2px solid var(--q-secondary); opacity: 1;' : 'opacity: 0.7;'"
                  @click="lotImageActiveSlide = index"
                />
              </div>
            </div>

            <div v-if="!lot?.status === 'Sold'" class="row flex-center">
              <div class="text-secondary q-m-auto q-mt-md">
                There {{ viewCount === 1 ? 'is' : 'are' }} {{ viewCount }} {{ viewCount === 1 ? 'person' : 'people' }}
                currently viewing this lot?.
              </div>
            </div>

            <div class="q-mt-md">
              <!--User is auctioneer-->
              <div v-if="isAuctioneer"
                class="row flex-center full-width rounded-borders"
                :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
                style="min-height: 50px; width: 100%;"
              >
                <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('You are the author of this auction.') }}</div>
              </div>

              <!--User is bidder-->
              <div v-else class="full-width">
                <!--Making a bid (English)-->
                <template v-if="auction?.type === 'English'">
                  <q-btn 
                    class="text-bold text-white full-width"
                    style="background-color: var(--q-secondary);"
                    padding="md"
                    unelevated
                    :label="userIsLeadingBidder ? 'Highest Bidder' : 'Place Bid'"
                    :disabled="isBidLoading || userIsLeadingBidder || lot?.status !== 'Active'"
                    @click="() => { showMakeBidDialog = true }"
                  />
                </template>

                <!--Making a bid (Dutch)-->
                <template v-else>
                  <q-btn 
                    class="text-bold text-white full-width"
                    style="background-color: var(--q-secondary);"
                    padding="md"
                    label="Buy It Now"
                    :disabled="isBidLoading || userIsLeadingBidder || lot?.status !== 'Active'"
                    @click="() => { showMakeBidDialog = true }"
                    unelevated
                  />
                </template>
              </div>
            </div>

            <!--General bid status content-->
            <div v-if="!isAuctioneer && bidStatus" class="full-width q-mt-md">
              <q-banner
                rounded
                dense
                class="q-pa-md"
                :class="
                  ['Highest','Winner'].includes(bidStatus) ? 'bg-green-1' :
                  bidStatus === 'Outbid' ? 'bg-red-1' : 'bg-grey-3'
                "
              >
                <template v-slot:avatar>
                  <q-icon
                    :name="
                      bidStatus === 'Highest' ? 'emoji_events' :
                      bidStatus === 'Outbid' ? 'warning' :
                      bidStatus === 'Winner' ? 'celebration' : 'do_not_disturb'
                    "
                    :color="
                      ['Highest','Winner'].includes(bidStatus) ? 'positive' :
                      bidStatus === 'Outbid' ? 'negative' : 'grey-7'
                    "
                    size="md"
                  />
                </template>

                <div
                  class="text-subtitle2 text-weight-bold"
                  :class="
                    ['Highest','Winner'].includes(bidStatus) ? 'text-green-9' :
                    bidStatus === 'Outbid' ? 'text-red-9' : 'text-grey-8'
                  "
                >
                  {{
                    bidStatus === 'Highest' ? 'You are the highest bidder!' :
                    bidStatus === 'Outbid' ? 'You have been outbid!' :
                    bidStatus === 'Winner' ? 'Congratulations, you won!' :
                    'Auction closed, you did not win.'
                  }}
                </div>
                <div class="text-caption text-grey-7">
                  {{
                    bidStatus === 'Highest' ? "You're in the lead — we'll let you know if that changes." :
                    bidStatus === 'Outbid' ? 'Place a higher bid to get back in the lead.' :
                    bidStatus === 'Winner' ? "We'll be in touch with next steps shortly." :
                    'You did not win this item.'
                  }}
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

              <div v-if="showPostAuctionActions && (isAuctioneer || bidStatus === 'Winner')" class="q-mt-md full-width">
                <q-btn
                  outline
                  dense
                  no-caps
                  color="primary"
                  icon="history"
                  label="View Delivery Status"
                  class="full-width"
                  @click="showDeliveryHistory = true"
                />
              </div>

              <div>
                <template v-if="!isDisputeActive">
                  <div v-if="showPostAuctionActions && (isAuctioneer || bidStatus === 'Winner')" class="q-mt-md full-width row q-col-gutter-none items-center justify-center">
                    <div class="col text-center">
                      <q-btn
                        v-if="isAuctioneer"
                        outline
                        stack
                        class="text-bold text-caption full-width"
                        :color="darkMode ? 'white' : 'black'"
                        icon="check_circle"
                        padding="sm"
                        label="Confirm Delivery"
                        :disable="deliveryTracking !== 1"
                        @click="confirmDeliveredTrigger"
                      />
                      <q-btn
                        v-else
                        outline
                        stack
                        class="text-bold text-caption full-width"
                        :color="darkMode ? 'white' : 'black'"
                        icon="check_circle"
                        padding="sm"
                        label="Confirm Shipped"
                        :disable="deliveryTracking !== 'Shipped'"
                        @click="confirmShippedTrigger"
                      />
                    </div>

                    <div class="col q-ml-md text-center">
                      <q-btn
                        v-if="!isAuctioneer && deliveryTracking !== 'Delivered'"
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
                        v-else-if="!isAuctioneer"
                        class="text-bold text-caption full-width"
                        color="negative"
                        text-color="white"
                        stack
                        content-class="q-gap-xs"
                        icon="assignment_return"
                        padding="sm"
                        label="Refund"
                        unelevated
                        :disable="!canRequestRefund || isGrantedRefund"
                        @click="showRefundDialog = true"
                      />
                    </div>
                  </div>

                  <div v-if="!isAuctioneer && deliveryTracking === 3 && refundCountdown && !isGrantedRefund" class="text-caption text-right q-mt-xs">
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
                  <div v-if="isGrantedReturn && (deliveryTracking === 1 || deliveryTracking === 2)" class="q-mt-md full-width">
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
                        && deliveryTracking === 3" 
                  class="q-mt-md full-width"
                  >
                    <q-btn
                      color="positive"
                      icon="check_circle"
                      label="Mark as Complete"
                      class="full-width"
                      unelevated
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
                        <template v-if="auction?.is_fiat">
                          {{ formatFiat(estimatedAmountFiat) }}
                        </template>
                        <template v-else>
                          {{ formatBCH(estimatedAmountBch).main }}<span style="opacity: 0.4;">{{ formatBCH(estimatedAmountBch).zeros }}</span> BCH
                        </template>
                      </div>
                      <div class="text-caption text-weight-medium text-primary">
                        <template v-if="auction?.is_fiat">
                          {{ formatBCH(estimatedAmountBch).main }}<span style="opacity: 0.4;">{{ formatBCH(estimatedAmountBch).zeros }}</span> BCH
                        </template>
                        <template v-else>
                          {{ formatFiat(estimatedAmountFiat) }}
                        </template>
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
                        <template v-if="auction?.is_fiat">
                          {{ formatFiat(engCurrentFiat) }}
                        </template>
                        <template v-else>
                          {{ formatBCH(engCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(engCurrentBch).zeros }}</span> BCH
                        </template>
                      </div>
                      <div class="text-caption text-weight-medium text-positive q-mt-xs">
                        <template v-if="auction?.is_fiat">
                          {{ formatBCH(engCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(engCurrentBch).zeros }}</span> BCH
                        </template>
                        <template v-else>
                          {{ formatFiat(engCurrentFiat) }}
                        </template>
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

                    <template v-if="winningBid">
                      <div class="text-h6 text-weight-bold text-green" style="line-height: 1.2;">
                        <template v-if="auction?.is_fiat">
                          {{ formatFiat(winningBid.bid_price_fiat) }}
                        </template>
                        <template v-else>
                          {{ formatBCH(winningBid.bid_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(winningBid.bid_price_bch).zeros }}</span> BCH
                        </template>
                      </div>
                      <div class="text-caption text-weight-medium text-green">
                        <template v-if="auction?.is_fiat">
                          {{ formatBCH(winningBid.bid_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(winningBid.bid_price_bch).zeros }}</span> BCH
                        </template>
                        <template v-else>
                          {{ formatFiat(winningBid.bid_price_fiat) }}
                        </template>
                      </div>

                      <div class="text-caption text-grey-6 q-mt-xs">
                        <q-icon name="schedule" size="11px" class="q-mr-xs" />
                        {{ formatAuctionDate(winningBid.date_bid) }}
                      </div>
                    </template>

                    <div v-else class="text-caption text-grey-6">
                      No bids were made.
                    </div>
                  </q-card-section>

                  <q-card-section v-else class="q-pa-sm">
                    <div class="text-caption row items-center q-mb-xs">
                      <q-icon name="trending_down" size="14px" class="q-mr-xs" />
                      Current Price
                    </div>
                    
                    <div class="row items-end justify-between no-wrap">
                        <div v-if="auction?.is_fiat">
                          <div class="text-h6 text-weight-bold text-negative" style="line-height: 1.2;">
                            <template v-if="auction?.is_fiat">
                              {{ formatFiat(dynamicPriceFiat) }}
                            </template>
                            <template v-else>
                              {{ formatBCH(dynamicPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dynamicPriceBch).zeros }}</span> BCH
                            </template>
                          </div>
                          <div class="text-caption text-weight-medium text-negative q-mt-xs">
                            <template v-if="auction?.is_fiat">
                              {{ formatBCH(dynamicPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dynamicPriceBch).zeros }}</span> BCH
                            </template>
                            <template v-else>
                              {{ formatFiat(dynamicPriceFiat) }}
                            </template>
                          </div>
                      </div>
                      
                      <div class="text-right border-left q-pl-sm" :style="darkMode ? 'border-color: rgba(255,255,255,0.15)' : 'border-color: rgba(0,0,0,0.1)'">
                        <div class="text-caption q-mb-xs">Floor Limit</div>
                        <div v-if="auction?.is_fiat">
                          <div class="text-subtitle2 text-weight-bold" style="line-height: 1.2;">
                            <template v-if="auction?.is_fiat">
                              {{ formatFiat(dutchFloorPriceFiat) }}
                            </template>
                            <template v-else>
                              {{ formatBCH(dutchFloorPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dutchFloorPriceBch).zeros }}</span> BCH
                            </template>
                          </div>
                          <div class="text-caption text-grey-7 q-mt-xs">
                            <template v-if="auction?.is_fiat">
                              {{ formatBCH(dutchFloorPriceBch).main }}<span style="opacity: 0.4;">{{ formatBCH(dutchFloorPriceBch).zeros }}</span> BCH
                            </template>
                            <template v-else>
                              {{ formatFiat(dutchFloorPriceFiat) }}
                            </template>
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
                      <span 
                        v-if="auction?.auctioneer?.username"
                        class="text-weight-medium ellipsis col-shrink q-mr-xs" 
                      >
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
                  <span>{{ formatAuctionDate(auction.creation_date) || 'N/A' }}</span>
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
                <div class="text-body2 text-weight-medium">
                  {{ formatAuctionDate(auction?.start_date) }}
                </div>
                <div  v-if="lot?.status === 'Inactive'" class="text-secondary">
                  Time Remaining: {{ auctionStartCountdown }}
                </div>
                <div  v-else class="text-secondary"></div>
              </div>
              <div class="col rounded-borders q-pa-sm" :class="darkMode ? 'bg-dark' : 'bg-grey-2'">
                <div class="text-caption q-mb-xs">
                  <q-icon name="event_busy" size="12px" class="q-mr-xs" />End date
                </div>
                <div class="text-body2 text-weight-medium">
                  {{ formatAuctionDate(auction?.end_date) }}
                </div>
                <div v-if="lot?.status === 'Active'" class="text-secondary">
                  Time Remaining: {{ auctionEndCountdown }}
                </div>
                <div  v-else class="text-secondary"></div>
              </div>
            </div>

            <!--Viewing bid history information (English Auction)-->
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
      v-if="showMakeBidDialog && auction?.type == 'English'"
      v-model="showMakeBidDialog"
      :lot="lot"
      :auction="auction"
      :loading="isBidLoading"
      @place-bid="handlePlaceBid"
    />

    <BuyItNowPopup
      v-if="showMakeBidDialog && auction?.type == 'Dutch'"
      v-model="showMakeBidDialog"
      :lot="lot"
      :auction="auction"
      :current-price-bch="dynamicPriceBch"
      :current-price-fiat="dynamicPriceFiat"
      :is-fiat="auction?.is_fiat"
      :loading="isBidLoading"
      @confirm-buy-it-now="handlePlaceBid"
    />

    <DeliveryStatusHistoryDialog
      v-model="showDeliveryHistory"
      :lotId="props.lotId"
    />

    <SellerDisputePopup
      v-model="showSellerDisputeDialog"
      :lot="lot"
      :bidId="lotWinningBid.value?.id"
      @submit="refresh(() => {})"
    />

    <RefundPopup
      v-model="showRefundDialog"
      :lot="lot"
      :bidId="lotWinningBid.value?.id"
      @submit="refresh(() => {})"
    />

    <BiddingHistoryPopup
      v-model="showBidHistory"
      :lotId="props.lotId"
    />
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
import { copyToClipboard, formatAuctionCountdown as formatCountdown, formatAuctionDate, formatFiat, formatBCH, formatAddressWithEllipsis } from './helper-functions'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import BiddingPopup from 'src/components/auction/BiddingPopup.vue'
import BuyItNowPopup from 'src/components/auction/BuyItNowPopup.vue'
import BiddingHistoryPopup from 'src/components/auction/BiddingHistoryPopup.vue'
import SellerDisputePopup from 'src/components/auction/SellerDisputePopup.vue'
import RefundPopup from 'src/components/auction/RefundPopup.vue'
import DeliveryStatusHistoryDialog from 'src/components/auction/DeliveryStatusHistoryDialog.vue'
import { DeliveryDetails } from 'src/auction/object'

// Quasar variables
const $q = useQuasar()
const $store = useStore()
const $route = useRoute()
const $router = useRouter()

// System-related variables
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isLoading = ref(false)
const userWalletHash = computed(() => $store.getters['global/getWallet']('bch')?.walletHash)
const bchToPhpRate = computed(() => $store.getters['market/getAssetPrice']('bch', 'php') || 0)
 
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
const secondsRemaining = ref(0)
const intervalDurationSec = ref(600)
const dutchIntervalProgress = computed(() => {
  if (!intervalDurationSec.value) return 0
  return Math.max(0, Math.min(1, secondsRemaining.value / intervalDurationSec.value))
})

// Auction-related variables
const auction = computed(() => $store.getters['auction/auctionData'])
const isAuctionClosed = computed(() => auction.value?.status === 'Closed')
const isAuctioneer = computed(() => {
  const walletHash = $store.getters['global/getWallet']('bch')?.walletHash
  return walletHash === auction.value?.auctioneer?.id
})

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
const engCurrentBch = computed(() => {
  const currentBCH = auction.value?.is_fiat
    ? Number(lotWinningBid.value?.bid_price_fiat ?? lot.value?.start_price_fiat ?? 0)
    : Number(lotWinningBid.value?.bid_price_bch ?? lot.value?.start_price_bch ?? 0)
  return (!auction.value?.is_fiat) 
    ? currentBCH
    : bchToPhpRate.value > 0 ? currentBCH / bchToPhpRate.value : 0
})
const engCurrentFiat = computed(() => {
  const currentFiat = auction.value?.is_fiat
    ? Number(lotWinningBid.value?.bid_price_fiat ?? lot.value?.start_price_fiat ?? 0)
    : Number(lotWinningBid.value?.bid_price_bch ?? lot.value?.start_price_bch ?? 0)
  return (auction.value?.is_fiat) 
    ? currentFiat 
    : currentFiat * bchToPhpRate.value
})

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
const deliveryTracking = ref(null)
const deliveryEvents = ref(null)
const dateDelivered = ref(null)

// Creates delivery tracking for an sold lot.
const initDeliveryTracking = async () => {
  if (
    deliveryTracking.value != null  // Delivery event already exists
    && !isLotSold.value             // Lot isn't sold
    && !userIsLeadingBidder.value   // User isn't the winner
  ) return

  try {
    const deliveryTrackingRes = await callAPI('delivery-trackings', null, 'post', {
      lot: lot.value?.id,
      sender: auction.value?.auctioneer?.id,
      sender_address: 'N/A', // REVIEW
      receiver: userWalletHash.value,
      receiver_address: 'N/A', // REVIEW
      courier: (lot.value?.category === 'Physical') ? 'LBC' : 'N/A' // REVIEW
    })
    if (!deliveryTrackingRes || !deliveryTrackingRes.success || !deliveryTrackingRes.data) 
      throw new Error('Delivery tracking could not be created. Please refresh the page.')
    
    const data = deliveryTrackingRes.data

    const deliveryEventRes = await callAPI('delivery-events', null, 'post', {
      delivery: deliveryTrackingRes.data?.tracking_id,
      status: 'Preparing',
      description: 'N/A', // REVIEW
      location: 'N/A', // REVIEW
      date_of_event: new Date().toISOString()
    })
    if (deliveryEventRes && deliveryEventRes.success && deliveryEventRes.data){
      deliveryEvents.value = deliveryEventRes.data
      data['delivery_events'] = deliveryEventRes.data
    } else throw new Error('Delivery event could not be created. Please refresh the page.')

    deliveryTracking.value = DeliveryDetails.parse(data)
  } catch (error) {
    $q.notify({ type: 'warning', message: error.message })
  }
}

// TRIGGER: Shipped confirmation (auctioneer)
const confirmShippedTrigger = async () => {
  const response = await $store.dispatch('auction/createdeliveryTracking', { status: 'Shipped' })
  const data = {
    type: (response.success) ? 'positive' : 'negative',
    message: (response.success) ? 'Confirmed shipped!' : 'Could not create new delivery event.'
  }
  $q.notify(data)
  await refresh(() => {})
}

// TRIGGER: Delivery confirmation (bidder)
const confirmDeliveredTrigger = async () => {
  const response = await $store.dispatch('auction/createdeliveryTracking', { status: 'Delivered' })
  const data = {
    type: (response.success) ? 'positive' : 'negative',
    message: (response.success) ? 'Confirmed delivery!' : 'Could not create new delivery event.'
  }
  $q.notify(data)
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
  console.log(`bidBCH: ${bidBch}`)
  console.log(`bidFiat: ${bidFiat}`)
  console.log(`bidPrice: ${bidPrice}`)

  // Get current winnder's bid price
  const currentPrice = auction.value?.is_fiat
    ? Number(lotWinningBid.value?.bid_price_fiat ?? lot.value?.start_price_fiat ?? 0)
    : Number(lotWinningBid.value?.bid_price_bch ?? lot.value?.start_price_bch ?? 0)
  console.log(`currentPrice: ${currentPrice}`)
  
  // Check if new bid is valid
  const isLesserThanCurrentBid = !Number.isFinite(bidPrice) 
    || bidPrice <= 0 
    || Boolean(lotWinningBid.value?.id)
      ? bidPrice <= currentPrice
      : bidPrice < currentPrice
  if (isLesserThanCurrentBid) {
    $q.notify({ type: 'warning', message: 'Bid must be higher than the current bid.' })
    return
  }
  console.log('Bid is valid (greater than current bid price)')

  isBidLoading.value = true
  try {
    // Send the bid to WS
    const pendingBid = await websocketSendBid({
      bid_price_bch: bidBch,
      bid_price_fiat: bidFiat,
    })
    if (!pendingBid?.id) throw new Error('Bid was not created.')
    console.log('Bid was created in the server.')

    // Settle/Complete the bid through payment
    let settledBid
    $q.loading.show({ message: 'Processing smart contract...' })
    if (lotWinningBid.value?.id) { // EXISTING BIDS
      console.log('OUTBIDDING...')
      const result = await callAPI('Outbid', pendingBid.id, 'post')
      if (!result.success) throw new Error(result.error || 'Failed to outbid.')
      settledBid = result.data
      console.log(`Settled bid: ${settledBid}`)
    } else { 
      console.log('FIRST BID...')
      const txid = await payFirstBidToContract(Number(props.lotId), Number(bidBch.toFixed(8)))
      const settlement = waitForBidSettlement(pendingBid.id)
      socket.send(JSON.stringify({
        type: 'paid_bid',
        data: { id: pendingBid.id, lot: Number(props.lotId), txid }
      }))
      settledBid = await settlement
      console.log(`Settled bid: ${settledBid}`)
    }
    console.log('Bid completed.')

    showMakeBidDialog.value = false
    $q.notify({
      type: settledBid.status === 'Highest' ? 'positive' : 'warning',
      icon: 'gavel',
      message: settledBid.status === 'Highest'
        ? `Bid of ${formatBCH(bidBch).main}${formatBCH(bidBch).zeros} BCH placed!`
        : 'Your bid was accepted but has already been outbid.',
      timeout: 3000
    })
    
    lotWinningBid.value = settledBid
    $store.commit('auction/setHighestBid', settledBid)
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
  if (!lotWinningBid.value?.id) 
    return (isLotSold.value) ? 'Unsold' : null

  // USER IS WINNER OR HIGHEST BIDDER
  if (userIsLeadingBidder.value) 
    return (isLotSold.value) ? 'Winner' : 'Highest'
  return 'Outbid' // OTHER WINNER OR HIGHEST
})

// ===========================
// WEBSOCKET-RELATED FUNCTIONS
// ===========================
const viewCount = ref(0) 
const timeLeft = ref(0)

let socket = null
let reconnectTimeout = null
let reconnectAttempts = 0
let maxReconnectAttempts = 10

// Connects to the lot websocket and handles incoming updates.
const connectWebsocket = () => {
  const ws = callLotWebsocket(Number(props.lotId))

  // Connecting to the WS
  ws.onopen = async () => {
    const wasReconnect = reconnectAttempts > 0
    reconnectAttempts = 0
    console.log("Connected to the lot websocket!")

    if (wasReconnect) {
      await Promise.all([
        $store.dispatch('auction/fetchLotData'),
        $store.dispatch('auction/fetchHighestBid'),
      ])
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
        auctionStartCountdown.value = formatCountdown(data.time_left)
        break

      // Countdown for the end of the auction
      case "lot.end_countdown":
        auctionEndCountdown.value = formatCountdown(data.time_left, true)
        if (auctionStartCountdown.value) 
          auctionStartCountdown.value = ""
        break

      // Updating the lot's status
      case "lot.update_status":
        if (data && data?.status) 
          $store.commit('auction/updateLotStatus', { id: props.lotId, status: data.status })
        if (data.status !== 'Active') 
          showMakeBidDialog.value = false
        if (data.status === 'Sold') 
          await initDeliveryTracking()
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
      
      // Updating the time interval (DUTCH Auction)
      case "lot.time_interval":
        if (lot.value?.status !== 'Active' || isLotSold ) break
        secondsRemaining.value = data.seconds_remaining
        timeLeft.value = data.time_left
        break

      // Updating the price drop (DUTCH Auction)
      case "lot.drop_price":
        if (lot.value?.status !== 'Active' || isLotSold ) break

        dynamicPriceFiat.value = (auction.value?.is_fiat) 
          ? Number(data.price)
          : dynamicPriceBch.value * bchToPhpRate.value

        dynamicPriceBch.value = (auction.value?.is_fiat) 
          ? (bchToPhpRate.value > 0)
            ? dynamicPriceFiat.value / bchToPhpRate.value
            : 0
          : Number(data.price)
        break

      // Received placebid acknowledgement
      case "place.bid_ack":
        await $store.dispatch('auction/updateBidFromWebsocket', data)
        bidResolver?.(data)
        bidResolver = null
        break
      
      // Received ERROR from placebid
      case "bid.error": {
        const error = new Error(data.message || 'Bid failed.')
        bidRejecter?.(error)
        settlementRejecter?.(error)
        bidResolver = null
        bidRejecter = null
        settlementResolver = null
        settlementRejecter = null
        settlementBidId = null
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
        if (
          Array.isArray(data.cancelled_bid_ids) 
          && data.cancelled_bid_ids.length
        ) $store.commit('auction/cancelLotBids', data.cancelled_bid_ids)
        break

      // UNRECOGNIZED WS EVENT
      default:
        console.warn("Unknown websocket event:", type, data)
        break
    }
  }

  ws.onclose = (event) => {
      console.log("Disconnected from the lot websocket!")
      if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000)
        reconnectAttempts++
        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null
          socket = connectWebsocket()
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

  bidRejecter?.(new Error('Bid connection closed.'))
  settlementRejecter?.(new Error('Bid connection closed.'))
  bidResolver = null
  bidRejecter = null
  settlementBidId = null
  settlementResolver = null
  settlementRejecter = null
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
      bidResolver = null
      bidRejecter = null
      reject(new Error('Timed out waiting for bid confirmation.'))
    }, 10000)

    bidResolver = (data) => {
      clearTimeout(timeout)
      bidResolver = null
      bidRejecter = null
      resolve(data)
    }
    bidRejecter = (error) => {
      clearTimeout(timeout)
      reject(error)
    }
  })
}

// Waits for the bid to be marked as complete
const waitForBidSettlement = (bidId) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      settlementBidId = null
      settlementResolver = null
      settlementRejecter = null
      reject(new Error('Timed out waiting for bid settlement.'))
    }, 15000)

    settlementBidId = Number(bidId)
    settlementResolver = (data) => {
      clearTimeout(timeout)
      settlementBidId = null
      settlementResolver = null
      settlementRejecter = null
      resolve(data)
    }
    settlementRejecter = (error) => {
      clearTimeout(timeout)
      settlementBidId = null
      settlementResolver = null
      settlementRejecter = null
      reject(error)
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

// Should-fetch functions
const shouldFetchAuctionData = () => {
  const lastFetched = $store.getters['auction/listingsLastFetched']
  return !lastFetched || Date.now() - lastFetched > 30000
}
const shouldFetchAuctionLots = () => {
  const lastFetched = $store.getters['auction/auctionLotsLastFetched']
  return !lastFetched || Date.now() - lastFetched > 30000
}

// Loads the data required to render the page.
const loadPageData = async (force=false) => {
  const isSameLotId = $store.getters['auction/lotId'] === Number(props.lotId)
  const isSameAuctionId = $store.getters['auction/auctionId'] === Number(props.auctionId)

  await Promise.all([
    !isSameLotId || force || shouldFetchAuctionLots
      ? $store.dispatch('auction/fetchLotData', props.lotId) 
      : $store.dispatch('auction/fetchExistingLotData', props.lotId),
    !isSameAuctionId || force || shouldFetchAuctionData
      ? $store.dispatch('auction/fetchAuctionData', props.auctionId)
      : $store.dispatch('auction/fetchExistingAuctionData', props.auctionId),
  ])
  
  if (isLotSold.value) {
    await initDeliveryTracking()
  }

  if (dateDelivered.value) {
    updateRefundCountdown()
    refundCountdownInterval = setInterval(updateRefundCountdown, 1000)
  }
}

const smartBackPath = computed(() => {
  const sourceContext = $route.query.from
  if (sourceContext === 'activity') return '/apps/auction/activity'
  return `/apps/auction/${props.auctionId}`
})

// Refreshes the page data and completes the pull-to-refresh action.
const refresh = async (done) => {
  if (!auction.value || !lot.value) $router.replace(smartBackPath.value)
  await loadPageData()

  clearSocket()
  socket = connectWebsocket()
  done()
}

onMounted(async () => {
  isLoading.value = true

  // Could not load auction or lot data
  if (!auction.value || !lot.value) 
    $router.replace(smartBackPath.value)

  // Load the page data
  await loadPageData()
  isLoading.value = false
  
  // Notify if the lot is already closed (either sold or not)
  if (isAuctionClosed.value) {
    $q.notify({
      type: 'info',
      icon: 'lock',
      message: (isLotSold.value) 
        ? 'This lot has already been sold.'
        : 'This lot is closed.'
    })
  }
  socket = connectWebsocket()
})

onBeforeUnmount(() => {
  clearSocket()
})

</script>
