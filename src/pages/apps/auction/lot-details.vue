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
      <div v-if="!isLoading && lot && auction" class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
        <div class="q-mb-lg text-left">
          <div class="text-h4 text-weight-bold q-mb-xs" style="overflow-wrap: break-word; word-wrap: break-word;">
            Lot {{ lot.id }}: <span class="text-weight-regular">{{ lot.title }}</span>
          </div>
 
          <div class="row items-center q-gutter-sm q-mb-sm">
            <q-badge color="primary" class="q-pa-sm q-px-sm text-weight-bold">
              <q-icon :name="lot.category_name === 'Digital' ? 'computer' : 'delivery_dining'" size="12px" class="q-mr-xs" />
              {{ lot.category_name }}
            </q-badge>
            <q-badge
              :color="lot.status_color"
              class="q-pa-sm q-px-sm text-weight-bold"
            >
              {{ lot.status_label }}
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

            <div v-if="!lot?.is_sold" class="row flex-center">
              <div class="text-secondary q-m-auto q-mt-md">
                There {{ viewCount === 1 ? 'is' : 'are' }} {{ viewCount }} {{ viewCount === 1 ? 'person' : 'people' }}
                currently viewing this lot.
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
                <!--Making a bid (Either English or Dutch)-->
                <template v-if="auction?.type === 'English'">
                  <q-btn 
                    class="text-bold text-white full-width"
                    style="background-color: var(--q-secondary);"
                    padding="md"
                    unelevated
                    :label="winningBid.value?.user === userWalletHash ? 'Highest Bidder' : 'Place Bid'"
                    :disabled="lot.status_label !== 'Open' || winningBid.value?.user === userWalletHash || bidOrBuyLoading"
                    @click="openBidDialog"
                  />
                </template>
                <template v-else>
                  <q-btn 
                    class="text-bold text-white full-width"
                    style="background-color: var(--q-secondary);"
                    padding="md"
                    label="Buy It Now"
                    :disabled="lot.status_label !== 'Open' || lot.value?.is_sold || bidOrBuyLoading"
                    @click="buyItNow"
                    unelevated
                  />
                </template>
              </div>
              
            </div>

            <!--General bid status content-->
            <div v-if="bidStatus" class="full-width q-mt-md">
              <q-banner
                rounded
                dense
                class="q-pa-md"
                :class="
                  bidStatus === 'highest' || isWinningBidder ? 'bg-green-1' :
                  bidStatus === 'outbid' ? 'bg-red-1' : 'bg-grey-3'
                "
              >
                <template v-slot:avatar>
                  <q-icon
                    :name="
                      bidStatus === 'highest' ? 'emoji_events' :
                      bidStatus === 'outbid' ? 'warning' :
                      isWinningBidder ? 'celebration' : 'do_not_disturb'
                    "
                    :color="
                      bidStatus === 'highest' || isWinningBidder ? 'positive' :
                      bidStatus === 'outbid' ? 'negative' : 'grey-7'
                    "
                    size="md"
                  />
                </template>

                <div
                  class="text-subtitle2 text-weight-bold"
                  :class="
                    bidStatus === 'highest' || isWinningBidder ? 'text-green-9' :
                    bidStatus === 'outbid' ? 'text-red-9' : 'text-grey-8'
                  "
                >
                  {{
                    bidStatus === 'highest' ? 'You are the highest bidder!' :
                    bidStatus === 'outbid' ? 'You have been outbid!' :
                    isWinningBidder ? 'Congratulations, you won!' :
                    'Auction closed, you did not win.'
                  }}
                </div>
                <div class="text-caption text-grey-7">
                  {{
                    bidStatus === 'highest' ? "You're in the lead — we'll let you know if that changes." :
                    bidStatus === 'outbid' ? 'Place a higher bid to get back in the lead.' :
                    isWinningBidder ? "We'll be in touch with next steps shortly." :
                    'You did not win this item.'
                  }}
                </div>
              </q-banner>
            </div>
            
            <div v-if="isWinningBidder || isAuctioneer">
              <div v-if="isMarkedComplete" class="q-mt-md full-width">
                <q-banner rounded dense class="bg-positive text-white q-pa-md">
                  <template v-slot:avatar>
                    <q-icon name="check_circle" />
                  </template>
                  Transaction complete.
                </q-banner>
              </div>

              <div v-if="showPostAuctionActions && (isAuctioneer || isWinningBidder)" class="q-mt-md full-width">
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
                  <div v-if="showPostAuctionActions && (isAuctioneer || isWinningBidder)" class="q-mt-md full-width row q-col-gutter-none items-center justify-center">
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
                        :disable="deliveryStatusId !== 1"
                        @click="confirmDeliveryTrigger"
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
                        :disable="deliveryStatusId !== 2"
                        @click="confirmPickupTrigger"
                      />
                    </div>

                    <div class="col q-ml-md text-center">
                      <q-btn
                        v-if="!isAuctioneer && deliveryStatusId !== 3"
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

                  <div v-if="!isAuctioneer && deliveryStatusId === 3 && refundCountdown && !isGrantedRefund" class="text-caption text-right q-mt-xs">
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
                  <div v-if="isGrantedReturn && (deliveryStatusId === 1 || deliveryStatusId === 2)" class="q-mt-md full-width">
                    <q-banner rounded dense class="bg-positive text-white q-pa-md">
                      <template v-slot:avatar>
                        <q-icon name="check_circle" />
                      </template>
                      Dispute resolved. Funds have been returned to the buyer.
                    </q-banner>
                  </div>

                  <!-- Bidder: mark as complete (no refund, delivered) -->
                  <div v-if="showPostAuctionActions && !isMarkedComplete && isWinningBidder && !isGrantedRefund && deliveryStatusId === 3" class="q-mt-md full-width">
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
                    <div v-if="englishLotHasBid">
                      <div class="text-h6 text-weight-bold text-positive" style="line-height: 1.2;">
                        <template v-if="auction?.is_fiat">
                          {{ formatFiat(englishCurrentFiat) }}
                        </template>
                        <template v-else>
                          {{ formatBCH(englishCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(englishCurrentBch).zeros }}</span> BCH
                        </template>
                      </div>
                      <div class="text-caption text-weight-medium text-positive q-mt-xs">
                        <template v-if="auction?.is_fiat">
                          {{ formatBCH(englishCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(englishCurrentBch).zeros }}</span> BCH
                        </template>
                        <template v-else>
                          {{ formatFiat(englishCurrentFiat) }}
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
                          {{ formatFiat(englishCurrentFiat) }} floor · {{ formatBCH(englishCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(englishCurrentBch).zeros }}</span> BCH
                        </template>
                        <template v-else>
                          {{ formatBCH(englishCurrentBch).main }}<span style="opacity: 0.4;">{{ formatBCH(englishCurrentBch).zeros }}</span> BCH floor · {{ formatFiat(englishCurrentFiat) }}
                        </template>
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
                        {{ formatAuctionDate(winningBid.bidding_date) }}
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

                    <div v-if="lot.value?.is_sold" class="text-caption text-center q-mt-sm text-positive text-weight-medium">
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
                        v-if="auction?.user?.username" 
                        class="text-weight-medium ellipsis col-shrink q-mr-xs" 
                      >
                        {{ auction.user.username }}
                      </span>
                      
                      <q-badge v-if="isAuctioneer" color="positive" class="q-px-xs no-shrink">
                        <q-icon name="star" size="10px" class="q-mr-xs" />You
                      </q-badge>
                    </div>
                    
                    <span class="text-caption ellipsis" style="opacity: 0.6;">
                      {{ auction?.getEllipsisInMiddleAddress ? auction.getEllipsisInMiddleAddress() : 'N/A' }}
                    </span>
                  </div>
                  <q-btn flat round dense icon="content_copy" size="xs" @click="copyToClipboard(auction?.user?.address)" />
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
            
            <!--Date start and end of auction/lot-->
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
      v-model="showMakeBidDialog"
      :lot="lot"
      :auction="auction"
      :loading="bidOrBuyLoading"
      @place-bid="handlePlaceBid"
    />

    <BuyItNowPopup
      v-model:showBuyItNowDialog="showBuyItNowDialog"
      :lot="lot"
      :auction="auction"
      :current-price-bch="dynamicPriceBch"
      :current-price-fiat="dynamicPriceFiat"
      :is-fiat="auction?.is_fiat"
      :loading="bidOrBuyLoading"
      @confirm-buy-it-now="handleBuyItNow"
    />

    <DeliveryStatusHistoryDialog
      v-model="showDeliveryHistory"
      :lotId="props.lotId"
    />

    <SellerDisputePopup
      v-model="showSellerDisputeDialog"
      :lot="lot"
      :bidId="winningBid.value?.id"
      @submit="refresh(() => {})"
    />

    <RefundPopup
      v-model="showRefundDialog"
      :lot="lot"
      :bidId="winningBid.value?.id"
      @submit="refresh(() => {})"
    />

    <BiddingHistoryPopup
      v-model="showBidHistory"
      :lotId="props.lotId"
    />
  </q-pull-to-refresh>
</template>

<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useStore } from 'vuex'
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar, date } from 'quasar'
import { callAPI } from 'src/auction/api'
import { walletToContract } from 'src/auction/payment'
import { callContractRelease, callContractReturn } from 'src/auction/arbiter'
import { callLotWebsocket } from 'src/auction/websocket'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import BiddingPopup from 'src/components/auction/BiddingPopup.vue'
import BuyItNowPopup from 'src/components/auction/BuyItNowPopup.vue'
import BiddingHistoryPopup from 'src/components/auction/BiddingHistoryPopup.vue'
import SellerDisputePopup from 'src/components/auction/SellerDisputePopup.vue'
import RefundPopup from 'src/components/auction/RefundPopup.vue'
import DeliveryStatusHistoryDialog from 'src/components/auction/DeliveryStatusHistoryDialog.vue'

// Quasar variables
const $q = useQuasar()
const $store = useStore()
const $route = useRoute()

// System-related variables
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isLoading = ref(false)
const userWalletHash = computed(() => $store.getters['global/getWallet']('bch')?.userWalletHash)
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

// Auction-related variables
const auction = computed(() => $store.getters['auction/auctionData'])
const isAuctioneer = computed(() => auction.value?.user?.id === userWalletHash.value)
const isWinningBidder = computed(() => bidStatus.value === 'win')
const attributeName = computed(() => auction.value?.is_fiat ? 'fiat' : 'bch')

// Lot-related variables
const lot = computed(() => $store.getters['auction/lotData'])
const lotImages = computed(() => $store.getters['auction/lotImages'])
const isLotClosed = computed(() => lot.value.status_label === 'Closed' || lot.value?.status_label === 'Sold')
const activeSlide = ref(0)

// Bidding variables
const winningBid = computed(() => $store.getters['auction/highestBid'])
const bidOrBuyLoading = ref(false)

const estimatedAmountBch = computed(() => {
  if (!auction.value?.is_fiat) 
    return Number(lot.value?.estimated_amount_bch ?? 0)
    
  const fiat = Number(lot.value?.estimated_amount_fiat ?? 0)
  return bchToPhpRate.value > 0 ? fiat / bchToPhpRate.value : 0
})

const estimatedAmountFiat = computed(() => {  
  if (auction.value?.is_fiat) 
    return Number(lot.value?.estimated_amount_fiat ?? 0)  

  const estBCH = Number(lot.value?.estimated_amount_bch ?? 0)
  return estBCH * bchToPhpRate.value
})

// ====================
// POST-AUCTION ACTIONS
// ====================
// Viewing data
const showSellerDisputeDialog = ref(false)
const showRefundDialog = ref(false)
const showBidHistory = ref(false)

// Delivery-related variables
const showDeliveryHistory = ref(false)
const deliveryStatusId = ref(null)
const deliveredDate = ref(null)

// Dispute-related variables
const isMarkedComplete = ref(false)
const isGrantedRefund = ref(false)
const isGrantedReturn = ref(false)
const currentDispute = ref(null)

const confirmDeliveryTrigger = async () => {
  const res = await callAPI('delivery-trackings', props.lotId, 'patch', {
    status: 2,
    shipping_date: new Date().toISOString()
  })

  const data = {
    type: (res.success) ? 'positive' : 'negative',
    message: (res.success) ? 'Confirmed delivery!' : 'Could not fetch delivery tacking.'
  }

  $q.notify(data)
  await refresh(() => {})
}

const confirmPickupTrigger = async () => {
  const res = await callAPI('delivery-trackings', props.lotId, 'patch', {
    status: 3,
    delivered_date: new Date().toISOString()
  })

  const data = {
    type: (res.success) ? 'positive' : 'negative',
    message: (res.success) ? 'Confirmed delivery!' : 'Could not fetch delivery tacking.'
  }

  $q.notify(data)
  await refresh(() => {})
}

const markedAsCompleted = async () => {
  if (!winningBid.value) {
    $q.notify({ type: 'warning', message: 'Could not find bid to release funds for.' })
    return
  }

  $q.loading.show({ message: 'Marking as complete, processing funds...' })
  await callContractRelease(winningBid.value?.id)
  $q.loading.hide()
  
  const res = await callAPI('delivery-trackings', props.lotId, 'patch', { mark_as_completed: true })
  if(!res.success) console.warn('Could not update delivery tracking:')

  await refresh(() => {})
}

// ===============
// ENGLISH AUCTION
// ===============
const showMakeBidDialog = ref(false)
const englishLotHasBid = computed(() => Boolean(winningBid.value))
const englishHasUserBid = computed(() => winningBid.value?.user === userWalletHash.value)
let bidResolver = null

const englishCurrentBch = computed(() => {
  const currentBCH = Number(lot.value?.[`threshold_bid_${attributeName.value}`] || 0)
  return (!auction.value?.is_fiat) 
    ? currentBCH
    : bchToPhpRate.value > 0 ? currentBCH / bchToPhpRate.value : 0
})

const englishCurrentFiat = computed(() => {
  const currentFiat = Number(lot.value?.[`threshold_bid_${attributeName.value}`] || 0)
  return (auction.value?.is_fiat) 
    ? currentFiat 
    : currentFiat * bchToPhpRate.value
})

const openBidDialog = async () => showMakeBidDialog.value = true


const verifyStillHighestBid = async (bidId) => {
  const result = await callAPI(`lots/${props.lotId}/highest-bid`)
  if (!result.success || !result.data) {
    throw new Error('Could not verify current highest bid.')
  }

  winningBid.value = result.data
  const isStillHighestBid = result.data.id === bidId

  return isStillHighestBid
}

const handlePlaceBid = async ({ bid_price_bch, bid_price_fiat }) => {
  if (!userWalletHash.value) {
    $q.notify({ type: 'warning', message: 'Please connect your wallet first.' })
    return
  }

  bidOrBuyLoading.value = true

  try {
    // if the socket is open, run the placebid
    if (!socket || socket.readyState !== WebSocket.OPEN)
      throw new Error('Bid failed. Please try again.')
    
    // else, send the bid to the websocket
    socket.send(JSON.stringify(
      {
        type: "place_bid",
        data: {
          user: userWalletHash.value,
          lot: props.lotId,
          bid_price_bch: Number(bid_price_bch).toFixed(8),
          bid_price_fiat: Number(bid_price_fiat).toFixed(2)
        }
      }
    ))

    //const ack = await waitForBidAck()
    //const bidId = ack.id

    let isStillHighest

    try {
      isStillHighest = await verifyStillHighestBid(bidId)
    } catch (err) {
      console.error('Could not confirm bid outcome:', err)

      showMakeBidDialog.value = false
      await $store.dispatch('auction/fetchLotData')
      
      $q.notify({
        type: 'warning',
        message: 'Your bid was submitted, but we could not confirm whether it is currently winning. Please check back.'
      })
      return
    }

    if (!isStillHighest) {
      await $store.dispatch('auction/fetchLotData')
      showMakeBidDialog.value = false
      
      $q.notify({
        type: 'warning',
        icon: 'warning',
        message: 'Someone placed a higher bid right as you submitted yours. You have not committed any funds — check the new highest bid and try again.'
      })
      return
    }

    await callAPI('lots', props.lotId, 'patch', {
      threshold_bid_bch: Number(bid_price_bch).toFixed(8),
      threshold_bid_fiat: Number(bid_price_fiat).toFixed(2)
    })

    $q.loading.show({ message: 'Processing smart contract...' })
    try {
      await walletToContract(Number(bid_price_bch).toFixed(8), bidId)
    } finally {
      $q.loading.hide()
    }
    
    const secondRes = await callAPI(`lots/${props.lotId}/second-highest-bid`)
    if (secondRes.success && secondRes.data?.id) {
      await callContractReturn(secondRes.data.id)
    }

    showMakeBidDialog.value = false

    $q.notify({
      type: 'positive',
      icon: 'gavel',
      message: `Bid of ${formatBCH(bid_price_bch).main}${formatBCH(bid_price_bch).zeros} BCH placed!`,
      timeout: 3000
    })

    await $store.dispatch('auction/fetchLotData')
    

  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Something went wrong.' })
  } finally {
    bidOrBuyLoading.value = false
  }
}


const showPostAuctionActions = computed(() => {
  if (isMarkedComplete.value) return false  // lot must not yet be delivered
  if (lot.value?.is_sold) return true       // lot must be sold
  return auction.value?.type === 'English' && isLotClosed.value && englishLotHasBid.value
})

const bidStatus = computed(() => {
  if (!englishHasUserBid.value) return null
  if (!englishLotHasBid.value) return isLotClosed.value ? 'did-not-win' : null

  const isHighest = winningBid.value?.user === userWalletHash.value
  if (lot.value?.is_sold || isLotClosed.value) return isHighest ? 'win' : 'did-not-win'
  return isHighest ? 'highest' : 'outbid'
})

// =============
// DUTCH AUCTION
// =============
const showBuyItNowDialog = ref(false)

const secondsRemaining = ref(0)
const intervalDurationSec = ref(600)
const dutchAtFloor = ref(false)
let visualCountdownTimer = null
let dutchStartTimeout = null

const dutchIntervalProgress = computed(() => {
  if (!intervalDurationSec.value) return 0
  return Math.max(0, Math.min(1, secondsRemaining.value / intervalDurationSec.value))
})

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

const closeAuctionIfAllSold = async () => {
  try {
    const res = await callAPI(`lots-by-auction/${props.auctionId}`)
    if (!res.success || !Array.isArray(res.data)) return
    const allSold = res.data.every(l => l.is_sold)
    if (allSold && new Date(auction.value.end_date) > new Date()) {
      await callAPI('auctions', props.auctionId, 'patch', {
        end_date: new Date().toISOString()
      })
      await $store.dispatch('auction/fetchAuctionData')
    }
  } catch (err) {
    console.warn('Could not close auction:', err)
  }
}

const dutchFloorPriceBch = computed(() => Number(lot.value?.threshold_bid_bch || 0))
const dutchFloorPriceFiat = computed(() => Number(lot.value?.threshold_bid_fiat || 0))
const dynamicPriceBch = ref(0)
const dynamicPriceFiat = ref(0)

const buyItNow = () => { 
  showBuyItNowDialog.value = true 
}

const handleBuyItNow = async (payload = {}) => {
  showBuyItNowDialog.value = false
  if (auction.value?.type !== 'Dutch') return

  
  if (!userWalletHash.value) {
    return $q.notify({ type: 'warning', message: 'Please connect your wallet first.' })
  }

  bidOrBuyLoading.value = true

  try {
    const bidBch = payload.bid_price_bch ?? dynamicPriceBch.value
    const bidFiat = payload.bid_price_fiat ?? dynamicPriceFiat.value

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('Bid failed. Please try again.')
    }

    socket.send(JSON.stringify({
      type: 'place_bid',
      data: {
        user: userWalletHash.value,
        lot: props.lotId,
        bid_price_bch: Number(bidBch).toFixed(8),
        bid_price_fiat: Number(bidFiat).toFixed(2)
      }
    }))

    // FIx this ack
    const ack = bidResolver
    const bidId = ack?.id

    if (!bidId) {
      throw new Error(ack?.error || 'Transaction failed. Please try again.')
    }

    const highestBidRes = await callAPI(`lots/${props.lotId}/highest-bid`)
    if (!highestBidRes.success || highestBidRes.data?.id !== bidId) {
      lot.value.is_sold = true
      await $store.dispatch('auction/fetchLotData')
      $q.notify({
        type: 'warning',
        message: 'This lot has already been sold.'
      })
      return
    }

    winningBid.value = highestBidRes.data

    lot.value.is_sold = true
    clearDutchTimers()
    await closeAuctionIfAllSold()

    await callAPI('delivery-trackings', null, 'post', {
      auctioneer: auction.value.user.id,
      bidder: userWalletHash.value,
      lot: props.lotId,
      status: 1,
      preparing_date: new Date().toISOString()
    })

    $q.loading.show({ message: 'Processing smart contract...' })

    try {
      await walletToContract(Number(bidBch).toFixed(8), bidId)
    } finally {
      $q.loading.hide()
    }

    await refresh(() => {})

    $q.notify({
      type: 'positive',
      message: `Secured for ${formatBCH(dynamicPriceBch.value).main}${formatBCH(dynamicPriceBch.value).zeros} BCH!`,
    })
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Something went wrong.' })
  } finally {
    bidOrBuyLoading.value = false
  }
}

const isCreatingDeliveryTracking = ref(false)

const initEnglishDeliveryTracking = async () => {
  if (isCreatingDeliveryTracking.value) return
  if (auction.value?.type !== 'English') return
  if (!isLotClosed.value) return
  if (winningBid.value?.user !== userWalletHash.value) return
  if (deliveryStatusId.value !== null) return

  try {
    await callAPI('delivery-trackings', null, 'post', {
      auctioneer: auction.value.user.id,
      bidder: userWalletHash.value,
      lot: props.lotId,
      status: 1,
      preparing_date: new Date().toISOString()
    })
    deliveryStatusId.value = 1
  } catch (err) {
    console.warn('Could not init delivery tracking for English auction:', err)
  } finally {
    isCreatingDeliveryTracking.value = false
  }
}

const fetchDeliveryTracking = async () => {
  try {
    const res = await callAPI('delivery-trackings', props.lotId)
    if (res.success && res.data) {
      const data = Array.isArray(res.data) ? res.data[0] : res.data
      deliveryStatusId.value = data?.status ?? null
      deliveredDate.value = data?.delivered_date ?? null
      isMarkedComplete.value = data?.mark_as_completed ?? false
    }
  } catch (err) {
    console.warn('Could not fetch delivery tracking:', err)
  }
}

const fetchDispute = async () => {
  try {
    const res = await callAPI('disputes-by-bid', winningBid.value?.id)
    if (res.success && res.data) {
      const data = Array.isArray(res.data) ? res.data[0] : res.data
      currentDispute.value = data || null
      isGrantedRefund.value = data?.is_granted_refund ?? false
      isGrantedReturn.value = data?.is_granted_return ?? false
    }
  } catch (err) {
    console.warn('Could not fetch dispute:', err)
    currentDispute.value = null
  }
}

const isDisputeActive = computed(() => {
  if (!currentDispute.value) return false
  return !currentDispute.value.is_resolved
})

const canRequestRefund = computed(() => {
  if (!deliveredDate.value) return false
  const delivered = new Date(String(deliveredDate.value).trim().replace(' ', 'T'))
  const deadline = new Date(delivered.getTime() + 6 * 60 * 60 * 1000)
  return new Date() < deadline
})

const refundCountdown = ref('')
let refundCountdownInterval = null

const updateRefundCountdown = () => {
  if (!deliveredDate.value || isGrantedRefund.value) {
    refundCountdown.value = ''
    clearInterval(refundCountdownInterval)
    return
  }

  let dateStr = String(deliveredDate.value).trim().replace(' ', 'T')
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

const autoMarkLotSold = async () => {
  if (auction.value?.type !== 'English') return
  if (!englishLotHasBid.value || lot.value?.is_sold) return
  if (!isLotClosed.value) return
  try {
    await callAPI('lots', props.lotId, 'patch', { is_sold: true })
    if (lot.value) lot.value.is_sold = true
  } catch (err) {
    console.warn('Could not auto-mark lot as sold:', err)
  }
}

const listingsTotalTime = computed(() => Date.now() - $store.getters['auction/listingsLastFetched'])
const auctionLotsTotalTime = computed(() => Date.now() - $store.getters['auction/auctionLotsLastFetched'])

const loadPageData = async () => {
  const isSameLotId = $store.getters['auction/lotId'] === Number(props.lotId)
  if(!isSameLotId) $store.commit('auction/setLotId', Number(props.lotId))
  if(!isSameLotId || auctionLotsTotalTime.value > 3000) await $store.dispatch('auction/fetchLotData') 
  else await $store.dispatch('auction/fetchExistingLotData')

  const isSameAuctionId = $store.getters['auction/auctionId'] === Number(props.auctionId)
  if(!isSameAuctionId) $store.commit('auction/setAuctionId', Number(props.auctionId))
  if(!isSameAuctionId || listingsTotalTime.value > 30000) await $store.dispatch('auction/fetchAuctionData')
  else await $store.dispatch('auction/fetchExistingAuctionData')
  
  await autoMarkLotSold()
  await Promise.all([fetchDeliveryTracking(), fetchDispute()])
  if (deliveredDate.value) {
    updateRefundCountdown()
    refundCountdownInterval = setInterval(updateRefundCountdown, 1000)
  }
  await initEnglishDeliveryTracking()
}

const copyToClipboard = (text) => {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    $q.notify({ type: 'positive', message: 'Copied to clipboard!', timeout: 1500 })
  })
}


const smartBackPath = computed(() => {
  const sourceContext = $route.query.from
  if (sourceContext === 'activity') return '/apps/auction/activity'
  return `/apps/auction/${props.auctionId}`
})

const refresh = async (done) => {
  isLoading.value = true
  if (auction.value?.type === 'Dutch') lot.value.is_sold = false
  await loadPageData()
  isLoading.value = false

  clearSocket()
  socket = connectWebsocket()
  done()
}


onMounted(async () => {
  isLoading.value = true
  await loadPageData()

  if (lot.value?.is_sold) {
    $q.notify({
      type: 'info',
      icon: 'lock',
      message: 'This lot has already been sold.'
    })
  } else if (isLotClosed.value) {
    $q.notify({
      type: 'info',
      icon: 'lock',
      message: 'This lot is closed.'
    })
  }
  isLoading.value = false
  
  socket = connectWebsocket()
})

onBeforeUnmount(() => {
  clearSocket()
})

onUnmounted(() => {
  if (visualCountdownTimer) clearInterval(visualCountdownTimer)
  if (refundCountdownInterval) clearInterval(refundCountdownInterval)
})

/*
===========================
WEBSOCKET-RELATED FUNCTIONS
===========================
*/

const viewCount = ref(0) // current live viewers
const timeLeft = ref(0)
let socket = null
let reconnectTimeout = null
let reconnectAttempts = 0
let maxReconnectAttempts = 10

const connectWebsocket = async () => {
  const ws = callLotWebsocket(Number(props.lotId))

  ws.onopen = () => {
    reconnectAttempts = 0
    console.log("Connected to the lot websocket!")
  };

  ws.onmessage = async (event) => {
    const { type, data } = JSON.parse(event.data);

    switch (type) {
      // update the viewcount
      case "live.viewing":
        viewCount.value = data.viewer_count
        break

      // start.close lot
      case "lot.update_status":
        lot.value?.refreshStatus()
        await autoMarkLotSold()
        break

      // sends placebid acknowledgement
      case "place.bid_ack":
        bidResolver?.(data)
        bidResolver = null
        break

      // update the highest bidder
      case "update.highest_bid":
        englishLotHasBid.value = Boolean(data?.user)
        englishHasUserBid.value = data?.user === userWalletHash.value
        
        if (lot.value?.is_sold) {
          if (auction.value.type === 'English')
            await initEnglishDeliveryTracking()
          else
            winningBid.value = data
        }
        break

      // update the winningBid.value?.id
      case "update.winner":
        lot.value.is_sold = Boolean(data?.is_sold)
        winningBid.value = data

        await initEnglishDeliveryTracking()
        break

      // update the time interval
      case "lot.time_interval":
        secondsRemaining.value = data.seconds_remaining
        timeLeft.value = data.time_left
        break

      // update the price drop
      case "lot.drop_price":
        dynamicPriceBch.value = data.price
        break

      default:
        console.warn("Unknown websocket message:", type, data)
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

const clearSocket = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  if (!socket) return

  socket.close()
  socket.onmessage = null
  socket.onopen = null
  socket.onerror = null
  socket.onclose = null
  socket = null
}

/*
=================
HELPER FUNCTIONS
=================
*/
// Formatting functions
const formatAuctionDate = (dateString) => {
  if (!dateString) return 'N/A'
  return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A')
}

const formatCountdown = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0))
  const hour = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const minute = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const second = (seconds % 60).toString().padStart(2, '0')
  return `${hour}:${minute}:${second}`
}

const formatFiat = (fiatValue) => {
  const numValue = Number(fiatValue) || 0
  return `₱${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatBCH = (value) => {
  const bch = Number(value) || 0
  const numStr = Number(bch).toFixed(8)
  const match = numStr.match(/^(.*?)0*$/)
  const main = match ? match[1] : numStr
  const zeros = numStr.substring(main.length)
  return { main, zeros, full: numStr }
}

</script>