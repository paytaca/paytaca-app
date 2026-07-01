<template>
  <q-pull-to-refresh id="app-container" class="auction-container" :class="getDarkModeClass(darkMode)"
    @refresh="refresh">
    <HeaderNav :title="$t('Auction')" :backnavpath="smartBackPath" class="header-nav" />
    <div>
      <div v-if="!isLoading && lot && auction" class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
        <div class="q-mb-lg text-left">
          <div class="text-h4 text-weight-bold q-mb-xs" style="overflow-wrap: break-word; word-wrap: break-word;">
            Lot {{ lot.id }}: <span class="text-weight-regular">{{ lot.title }}</span>
          </div>
          <div class="row items-center q-gutter-sm q-mb-sm">
            <q-badge color="primary" class="q-pa-sm q-px-sm text-weight-bold">
              <q-icon :name="lot.category_name === 'Digital' ? 'computer' : 'delivery_dining'" size="12px"
                class="q-mr-xs" />
              {{ lot.category_name }}
            </q-badge>
            <q-badge :color="lotStatus.color" class="q-pa-sm q-px-sm text-weight-bold">
              {{ lotStatus.label }}
            </q-badge>
          </div>
        </div>
        <div
          class="row q-col-gutter-y-md q-col-gutter-x-none q-col-gutter-x-sm-md q-col-gutter-x-md-xl justify-center justify-sm-start items-start">
          <div class="col-12 col-sm-5 col-md-4 q-pr-md-lg" style="width: 100%; max-width: 380px; min-width: 280px;">
            <q-carousel ref="carousel" v-model="activeSlide" animated navigation infinite height="350px"
              class="rounded-borders shadow-1 full-width" :control-color="darkMode ? 'white' : 'primary'"
              :control-text-color="darkMode ? 'white' : 'primary'">
              <q-carousel-slide v-for="(img, index) in lotImages" :key="index" :name="index" :img-src="img" />
            </q-carousel>


            <div class="row justify-center items-center q-mt-sm full-width">
              <q-btn flat round icon="chevron_left" :color="darkMode ? 'white' : 'primary'"
                @click="$refs.carousel.previous()" />
              <span class="text-caption text-weight-medium q-mx-md">
                {{ activeSlide + 1 }} / {{ lotImages.length }}
              </span>


              <q-btn flat round icon="chevron_right" :color="darkMode ? 'white' : 'primary'"
                @click="$refs.carousel.next()" />
            </div>


            <div class="row q-col-gutter-sm justify-center q-mt-sm">
              <div v-for="(imgSrc, index) in lotImages" :key="index" class="col-4">
                <q-img :src="imgSrc" ratio="1" class="rounded-borders cursor-pointer transition-effect full-width"
                  :style="activeSlide === index ? 'border: 2px solid var(--q-secondary); opacity: 1;' : 'opacity: 0.7;'"
                  @click="activeSlide = index" />
              </div>
            </div>
            <div v-if="!isSold" class="row flex-center">
              <div class="text-secondary q-m-auto q-mt-md">
                There {{ viewCount === 1 ? 'is' : 'are' }} {{ viewCount }} {{ viewCount === 1 ? 'person' : 'people' }}
                currently viewing this lot.
              </div>
            </div>


            <div class="q-mt-md">
              <!--v-if="!isAuthor"-->
              <div class="full-width">
                <div v-if="auction?.type === 'English'">
                  <q-btn class="text-bold text-white full-width" style="background-color: var(--q-secondary);"
                    padding="md" unelevated :label="highestBid.user === walletHash ? 'Highest Bidder' : 'Place Bid'"
                    :disabled="lotStatus.label !== 'Open' ||
                      highestBid.user === walletHash || englishBidLoading
                      " @click="openBidDialog" />
                </div>
                <div v-else>
                  <q-btn class="text-bold text-white full-width" style="background-color: var(--q-secondary);"
                    padding="md" label="Buy It Now"
                    :disabled="lotStatus.label !== 'Open' || dutchAlreadySold || buyItNowLoading" @click="buyItNow"
                    unelevated />
                </div>
              </div>
              <!--v-else-->
              <!--
              <div 
                class="row flex-center full-width rounded-borders"
                :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
                style="min-height: 50px; width: 100%;"
              >
                <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('You are the author of this auction.') }}</div>
              </div>
              -->
            </div>
            <div v-if="bidStatus" class="full-width q-mt-md">
              <q-banner rounded dense class="q-pa-md" :class="bidStatus === 'highest' || bidStatus === 'win' ? 'bg-green-1' :
                  bidStatus === 'outbid' ? 'bg-red-1' : 'bg-grey-3'
                ">
                <template v-slot:avatar>
                  <q-icon :name="bidStatus === 'highest' ? 'emoji_events' :
                      bidStatus === 'outbid' ? 'warning' :
                        bidStatus === 'win' ? 'celebration' : 'do_not_disturb'
                    " :color="bidStatus === 'highest' || bidStatus === 'win' ? 'positive' :
    bidStatus === 'outbid' ? 'negative' : 'grey-7'
  " size="md" />
                </template>


                <div class="text-subtitle2 text-weight-bold" :class="bidStatus === 'highest' || bidStatus === 'win' ? 'text-green-9' :
                    bidStatus === 'outbid' ? 'text-red-9' : 'text-grey-8'
                  ">
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


            <div v-if="isMarkedComplete" class="q-mt-md full-width">
              <q-banner rounded dense class="bg-positive text-white q-pa-md">
                <template v-slot:avatar>
                  <q-icon name="check_circle" />
                </template>
                Transaction complete.
              </q-banner>
            </div>


            <div v-if="(isSold || showPostAuctionActions) && (isAuthor || isWinningBidder)" class="q-mt-md full-width">
              <q-btn outline dense no-caps color="primary" icon="history" label="View Delivery Status"
                class="full-width" @click="showDeliveryHistory = true" />
            </div>


            <div>
              <div v-if="!isDisputeActive">
                <div v-if="showPostAuctionActions && (isAuthor || isWinningBidder)"
                  class="q-mt-md full-width row q-col-gutter-none items-center justify-center">
                  <div class="col text-center">
                    <q-btn v-if="isAuthor" outline stack class="text-bold text-caption full-width"
                      :color="darkMode ? 'white' : 'black'" icon="check_circle" padding="sm" label="Confirm Delivery"
                      :disable="deliveryStatusId !== 1" @click="confirmDeliveryTrigger" />
                    <q-btn v-else outline stack class="text-bold text-caption full-width"
                      :color="darkMode ? 'white' : 'black'" icon="check_circle" padding="sm" label="Confirm Pickup"
                      :disable="deliveryStatusId !== 2" @click="confirmPickupTrigger" />
                  </div>


                  <div class="col q-ml-md text-center">
                    <q-btn v-if="!isAuthor && deliveryStatusId !== 3" class="text-bold text-caption full-width"
                      color="negative" text-color="white" stack content-class="q-gap-xs" icon="gavel" padding="sm"
                      label="File a Dispute" unelevated @click="showSellerDisputeDialog = true" />


                    <q-btn v-else-if="!isAuthor" class="text-bold text-caption full-width" color="negative"
                      text-color="white" stack content-class="q-gap-xs" icon="assignment_return" padding="sm" unelevated
                      :disable="!canRequestRefund" @click="showRefundDialog = true">
                      <div>
                        Refund <span v-if="refundCountdown" class="text-caption">({{ refundCountdown }})</span>
                      </div>
                    </q-btn>
                  </div>
                </div>


                <!-- Resolved: funds returned by arbiter (status 1 or 2) -->
                <div
                  v-if="showPostAuctionActions && isGrantedReturn && (deliveryStatusId === 1 || deliveryStatusId === 2)"
                  class="q-mt-md full-width">
                  <q-banner rounded dense class="bg-positive text-white q-pa-md">
                    <template v-slot:avatar>
                      <q-icon name="check_circle" />
                    </template>
                    Dispute resolved. Funds have been returned to the buyer.
                  </q-banner>
                </div>


                <!-- Seller: confirm items shipped back (status 4) -->
                <div
                  v-if="showPostAuctionActions && !isMarkedReturned && isAuthor && isGrantedRefund && deliveryStatusId === 4"
                  class="q-mt-md full-width">
                  <q-btn color="warning" icon="inventory" label="Confirm Returned Items" class="full-width" unelevated
                    @click="confirmReturnedItems" />
                </div>


                <!-- Seller: mark as returned (status 5) -->
                <div
                  v-if="showPostAuctionActions && !isMarkedReturned && isAuthor && isGrantedRefund && deliveryStatusId === 5"
                  class="q-mt-md full-width">
                  <q-btn color="warning" icon="assignment_return" label="Mark as Return" class="full-width" unelevated
                    :disable="isMarkedReturned" @click="markedAsReturned" />
                </div>


                <!-- Seller: mark as complete after return confirmed -->
                <div
                  v-if="showPostAuctionActions && isMarkedReturned && !isMarkedComplete && isAuthor && isGrantedRefund"
                  class="q-mt-md full-width">
                  <q-btn color="positive" icon="check_circle" label="Mark as Complete" class="full-width" unelevated
                    @click="markedAsCompletedRefund" />
                </div>


                <!-- Bidder: ship back to seller after refund granted (status 3) -->
                <div
                  v-if="showPostAuctionActions && !isMarkedReturned && isWinningBidder && isGrantedRefund && deliveryStatusId === 3"
                  class="q-mt-md full-width">
                  <q-btn color="warning" icon="local_shipping" label="Confirm Ship To Seller" class="full-width"
                    unelevated @click="confirmShipToSeller" />
                </div>


                <!-- Bidder: mark as complete (no refund, delivered) -->
                <div
                  v-if="showPostAuctionActions && !isMarkedComplete && isWinningBidder && !isGrantedRefund && deliveryStatusId === 3"
                  class="q-mt-md full-width">
                  <q-btn color="positive" icon="check_circle" label="Mark as Complete" class="full-width" unelevated
                    :disable="isMarkedComplete" @click="markedAsCompleted" />
                </div>
              </div>
              <div v-else>
                <q-banner class="bg-warning text-black rounded-borders q-mt-md">
                  <template v-slot:avatar>
                    <q-icon name="gavel" />
                  </template>
                  An active dispute is currently pending review. Operations are temporarily locked.
                </q-banner>
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
                          {{ formatBCH(estimatedAmountBCH).main }}<span style="opacity: 0.4;">{{
                            formatBCH(estimatedAmountBCH).zeros }}</span> BCH
                        </div>
                      </div>


                      <div v-else>
                        <div class="text-h6 text-weight-bold text-primary" style="line-height: 1.2;">
                          {{ formatBCH(estimatedAmountBCH).main }}<span style="opacity: 0.4;">{{
                            formatBCH(estimatedAmountBCH).zeros }}</span> BCH
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
                      <!--
                        <q-spinner-dots v-if="englishBidPolling" size="14px" color="positive" />
                      -->
                    </div>


                    <div v-if="hasBid">
                      <div v-if="auction?.is_fiat">
                        <div class="text-h6 text-weight-bold text-positive" style="line-height: 1.2;">
                          {{ formatFiat(englishCurrentFiat) }}
                        </div>
                        <div class="text-caption text-weight-medium text-positive q-mt-xs">
                          {{ formatBCH(englishCurrentBCH).main }}<span style="opacity: 0.4;">{{
                            formatBCH(englishCurrentBCH).zeros
                            }}</span> BCH
                        </div>
                      </div>


                      <div v-else>
                        <div class="text-h6 text-weight-bold text-positive" style="line-height: 1.2;">
                          {{ formatBCH(englishCurrentBCH).main }}<span style="opacity: 0.4;">{{
                            formatBCH(englishCurrentBCH).zeros
                            }}</span> BCH
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
                          {{ formatFiat(englishCurrentFiat) }} floor · {{ formatBCH(englishCurrentBCH).main }}<span
                            style="opacity: 0.4;">{{ formatBCH(englishCurrentBCH).zeros }}</span> BCH
                        </div>
                        <div v-else>
                          {{ formatBCH(englishCurrentBCH).main }}<span style="opacity: 0.4;">{{
                            formatBCH(englishCurrentBCH).zeros
                            }}</span> BCH floor · {{ formatFiat(englishCurrentFiat) }}
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
                          {{ formatBCH(winningBid.bid_price_bch).main }}<span style="opacity: 0.4;">{{
                            formatBCH(winningBid.bid_price_bch).zeros }}</span> BCH
                        </div>
                      </div>


                      <div v-else>
                        <div class="text-h6 text-weight-bold text-green" style="line-height: 1.2;">
                          {{ formatBCH(winningBid.bid_price_bch).main }}<span style="opacity: 0.4;">{{
                            formatBCH(winningBid.bid_price_bch).zeros }}</span> BCH
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
                            {{ formatBCH(dutchCurrentPriceBCH).main }}<span style="opacity: 0.4;">{{
                              formatBCH(dutchCurrentPriceBCH).zeros }}</span> BCH
                          </div>
                        </div>
                        <div v-else>
                          <div class="text-h6 text-weight-bold text-negative" style="line-height: 1.2;">
                            {{ formatBCH(dutchCurrentPriceBCH).main }}<span style="opacity: 0.4;">{{
                              formatBCH(dutchCurrentPriceBCH).zeros }}</span> BCH
                          </div>
                          <div class="text-caption text-weight-medium text-negative q-mt-xs">
                            {{ formatFiat(dutchCurrentPriceFiat) }}
                          </div>
                        </div>
                      </div>
                      <div class="text-right border-left q-pl-sm"
                        :style="darkMode ? 'border-color: rgba(255,255,255,0.15)' : 'border-color: rgba(0,0,0,0.1)'">
                        <div class="text-caption q-mb-xs">Floor Limit</div>
                        <div v-if="auction?.is_fiat">
                          <div class="text-subtitle2 text-weight-bold" style="line-height: 1.2;">
                            {{ formatFiat(dutchFloorPriceFiat) }}
                          </div>
                          <div class="text-caption text-grey-7 q-mt-xs">
                            {{ formatBCH(dutchFloorPriceBCH).main }}<span style="opacity: 0.4;">{{
                              formatBCH(dutchFloorPriceBCH).zeros }}</span> BCH
                          </div>
                        </div>


                        <div v-else>
                          <div class="text-subtitle2 text-weight-bold" style="line-height: 1.2;">
                            {{ formatBCH(dutchFloorPriceBCH).main }}<span style="opacity: 0.4;">{{
                              formatBCH(dutchFloorPriceBCH).zeros }}</span> BCH
                          </div>
                          <div class="text-caption text-grey-7 q-mt-xs">
                            {{ formatFiat(dutchFloorPriceFiat) }}
                          </div>
                        </div>
                      </div>
                    </div>


                    <div v-if="dutchAlreadySold"
                      class="text-caption text-center q-mt-sm text-positive text-weight-medium">
                      <q-icon name="check_circle" size="12px" class="q-mr-xs" />Sold
                    </div>
                    <div v-else-if="!dutchAtFloor" class="q-mt-sm">
                      <div class="row items-center justify-between text-caption q-mb-xs">
                        Next price drop in
                        <span class="text-weight-medium">{{ timeLeft }} left</span>
                      </div>
                      <q-linear-progress :value="dutchIntervalProgress" color="negative"
                        :track-color="darkMode ? 'grey-9' : 'grey-3'" size="6px" rounded />
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
                  <div class="col column overflow-hidden">
                    <div class="row items-center no-wrap full-width">
                      <span v-if="auction?.user?.username" class="text-weight-medium ellipsis col-shrink q-mr-xs">
                        {{ auction.user.username }}
                      </span>
                      <q-badge v-if="isAuthor" color="positive" class="q-px-xs no-shrink">
                        <q-icon name="star" size="10px" class="q-mr-xs" />You
                      </q-badge>
                    </div>
                    <span class="text-caption ellipsis" style="opacity: 0.6;">
                      {{ auction?.getEllipsisInMiddleUserId ? auction.getEllipsisInMiddleUserId() : 'N/A' }}
                    </span>
                  </div>
                  <q-btn flat round dense icon="content_copy" size="xs"
                    @click="copyToClipboard(auction?.user?.address)" />
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
              <q-btn outline dense no-caps color="primary" icon="history" label="View Bidding History"
                class="col full-width" @click="showBidHistory = true" />
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


        <div
          class="row q-col-gutter-y-md q-col-gutter-x-none q-col-gutter-x-sm-md q-col-gutter-x-md-xl justify-center justify-sm-start items-start">
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
    <BiddingPopup v-model="openDialog" :lot="lot" :auction="auction" :loading="englishBidLoading"
      @place-bid="handlePlaceBid" />


    <BuyItNowPopup v-model:isToggledBuyItNow="isToggledBuyItNow" :lot="lot" :auction="auction"
      :current-price-bch="dutchCurrentPriceBCH" :current-price-fiat="dutchCurrentPriceFiat" :is-fiat="auction?.is_fiat"
      :loading="buyItNowLoading" @confirm-buy-it-now="handleBuyItNow" />


    <DeliveryStatusHistoryDialog v-model="showDeliveryHistory" :lotId="props.lotId" />


    <SellerDisputePopup v-model="showSellerDisputeDialog" :lot="lot" :bidId="winningBid.id"
      @submit="refresh(() => { })" />


    <RefundPopup v-model="showRefundDialog" :lot="lot" :bidId="winningBid.id" @submit="refresh(() => { })" />


    <BiddingHistoryPopup v-model="showBidHistory" :lotId="props.lotId" />
  </q-pull-to-refresh>
</template>


<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { vElementVisibility } from '@vueuse/components'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onUnmounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar, date } from 'quasar'
import { callAPI } from 'src/auction/api'
import { Store } from 'src/store'
import { AuctionList, LotsList } from 'src/auction/object'
import { walletToContract } from 'src/auction/payment'
import { callContractRefund, callContractRelease, callContractReturn } from 'src/auction/arbiter'


// Components
import HeaderNav from 'src/components/header-nav.vue'
import BiddingPopup from 'src/components/auction/BiddingPopup.vue'
import BuyItNowPopup from 'src/components/auction/BuyItNowPopup.vue'
import BiddingHistoryPopup from 'src/components/auction/BiddingHistoryPopup.vue'
import SellerDisputePopup from 'src/components/auction/SellerDisputePopup.vue'
import RefundPopup from 'src/components/auction/RefundPopup.vue'
import DeliveryStatusHistoryDialog from 'src/components/auction/DeliveryStatusHistoryDialog.vue'
import { callLotWebsocket } from 'src/auction/websocket'


defineOptions({
  directives: {
    'element-visibility': vElementVisibility
  }
})


// props for the vue page
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


const $q = useQuasar()
const $store = useStore()
const $route = useRoute()


const activeSlide = ref(0)
const lotImages = ref([])
const lot = ref(null)
const auction = ref(null)


const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const bchToPhpRate = computed(() => $store.getters['market/getAssetPrice']('bch', 'php') || 0)


const isLoading = ref(false)
const viewCount = ref(0) // current live viewers


// Post-auction actions
const showSellerDisputeDialog = ref(false)
const showRefundDialog = ref(false)


const showBidHistory = ref(false)
const showDeliveryHistory = ref(false)
const deliveryStatusId = ref(null)
const deliveredDate = ref(null)
const isMarkedComplete = ref(false)
const isMarkedReturned = ref(false)
const isGrantedRefund = ref(false)
const isGrantedReturn = ref(false)
const currentDispute = ref(null)


// websocket variable
let socket = null


const lotStatus = computed(() => {
  if (!lot.value || !auction.value) return null


  return lot.value.getLotStatus(
    auction.value.start_date,
    auction.value.end_date
  )
})


// establish estimatedAmountBCH (dynamic)
const estimatedAmountBCH = computed(() => {
  if (!lot.value) return 0
  const rate = bchToPhpRate.value
  // return either the converted fiat or bch agad 
  return (auction.value?.is_fiat)
    ? (rate > 0 ? Number(lot.value.estimated_amount_fiat || 0) / rate : 0)
    : Number(lot.value.estimated_amount_bch || 0)
})


// establish estimatedAmountFiat (dynamic)
const estimatedAmountFiat = computed(() => {
  if (!lot.value) return 0
  const rate = bchToPhpRate.value
  // return either the converted fiat or bch agad 
  return (auction.value?.is_fiat)
    ? Number(lot.value.estimated_amount_fiat || 0)
    : Number(lot.value.estimated_amount_bch || 0) * rate
})



// helper functions
// formats fiat values
const formatFiat = (fiatValue) => {
  const numValue = Number(fiatValue) || 0
  return `₱${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}


// formats BCH values
const formatBCH = (bchValue) => {
  const numStr = Number(bchValue).toFixed(8)
  const match = numStr.match(/^(.*?)0*$/)
  const main = match ? match[1] : numStr
  const zeros = numStr.substring(main.length)
  return { main, zeros, full: numStr }
}


// =========================================================================
// ============================== POST-AUCTION =============================
// =========================================================================
// helper function that updates the delivery tracking status
const updateDeliveryTracking = async (status, message) => {
  try {
    const res = await callAPI('delivery-trackings', props.lotId, 'patch', {
      status: status,
      shipping_date: new Date().toISOString()
    })
    if (res.success) {
      $q.notify({ type: 'positive', message })
    }
  } catch (err) {
    console.warn('Could not fetch delivery tracking:', err)
  } finally {
    await refresh(() => { })
  }
}


const confirmDeliveryTrigger = async () => {
  await updateDeliveryTracking(2, 'Confirmed delivery!')
}


const confirmPickupTrigger = async () => {
  await updateDeliveryTracking(3, 'Confirmed pickup!')
}


const confirmShipToSeller = async () => {
  await updateDeliveryTracking(4, 'Confirmed shipping back to seller!')
}


const confirmReturnedItems = async () => {
  await updateDeliveryTracking(5, 'Confirmed items returned to seller!')
}


// mark the delivery as completed
const markedAsCompleted = async () => {
  try {
    if (!winningBid.value.id) {
      $q.notify({ type: 'warning', message: 'Could not find bid to release funds for.' })
      return
    }


    $q.loading.show({ message: 'Marking as complete, processing funds...' })
    await callContractRelease(winningBid.value.id)
    $q.loading.hide()


    await callAPI('delivery-trackings', props.lotId, 'patch', { mark_as_completed: true })
  } catch (err) {
    console.warn('Could not fetch delivery tracking:', err)
  } finally {
    await refresh(() => { })
  }
}


// mark the delivery as returned (refunded)
const markedAsReturned = async () => {
  try {
    if (!winningBid.value.id) {
      $q.notify({ type: 'warning', message: 'Could not find bid to refund for.' })
      return
    }


    $q.loading.show({ message: 'Marking as returned, processing funds...' })
    await callContractRefund(winningBid.value.id) // updated to callContractRefund because callContractReturn is for outbidding
    $q.loading.hide()


    await callAPI('delivery-trackings', props.lotId, 'patch', { mark_as_returned: true })
  } catch (err) {
    console.warn('Could not fetch delivery tracking:', err)
  } finally {
    await refresh(() => { })
  }
}


const markedAsCompletedRefund = async () => {
  try {
    $q.loading.show({ message: 'Marking as complete...' })
    await callAPI('delivery-trackings', props.lotId, 'patch', { mark_as_completed: true })
  } catch (err) {
    console.warn('Could not fetch delivery tracking:', err)
  } finally {
    $q.loading.hide()
    await refresh(() => { })
  }
}


// =========================================================================
// ============================ ENGLISH AUCTION ============================
// =========================================================================
const openDialog = ref(false)
const englishBidLoading = ref(false)


// bidding-related ref vars
const isSold = ref(false)
const hasBid = ref(false)
const hasUserBid = ref(false)
const highestBid = ref({
  id: null,
  user: null,
  bid_price_bch: 0,
  bid_price_fiat: 0
})


// establish englishCurrentBCH (dynamic)
const englishCurrentBCH = computed(() => {
  if (!lot.value) return 0
  const rate = bchToPhpRate.value


  return (auction.value?.is_fiat)
    ? (rate > 0 ? Number(highestBid.value.bid_price_fiat || 0) / rate : 0)
    : Number(highestBid.value.bid_price_bch || 0)
})


// establish englishCurrentFiat (dynamic)
const englishCurrentFiat = computed(() => {
  if (!lot.value) return 0
  const rate = bchToPhpRate.value


  return (auction.value?.is_fiat)
    ? Number(highestBid.value.bid_price_fiat || 0)
    : Number(highestBid.value.bid_price_bch || 0) * rate
})


const openBidDialog = async () => {
  openDialog.value = true
}


let bidResolver = null
function waitForBidAck() {
  return new Promise(resolve => {
    bidResolver = resolve
  })
}


const handlePlaceBid = async ({ bid_price_bch, bid_price_fiat }) => {
  if (!walletHash) {
    $q.notify({ type: 'warning', message: 'Please connect your wallet first.' })
    return
  }


  englishBidLoading.value = true
  try {
    // if the socket is open, run the placebid
    if (!socket || socket.readyState !== WebSocket.OPEN)
      throw new Error(bidResponse.error || 'Bid failed. Please try again.')


    // else, send the bid to the websocket
    socket.send(JSON.stringify(
      {
        type: "place_bid",
        data: {
          user: walletHash,
          lot: props.lotId,
          bid_price_bch: Number(bid_price_bch).toFixed(8),
          bid_price_fiat: Number(bid_price_fiat).toFixed(2)
        }
      }
    ))


    const ack = await waitForBidAck()


    // create new contract for new bid (send BCH from wallet to contract)
    $q.loading.show({ message: 'Processing smart contract...' })
    try {
      await walletToContract(Number(bid_price_bch).toFixed(8), ack.id)
    } finally {
      $q.loading.hide()
    }
    // return the contract funds to the second highest bid
    const secondRes = await callAPI(`lots/${props.lotId}/second-highest-bid`)
    if (secondRes.success && secondRes.data?.id) {
      await callContractReturn(secondRes.data.id)
    }


    openDialog.value = false


    $q.notify({
      type: 'positive',
      icon: 'gavel',
      message: `Bid of ${formatBCH(bid_price_bch).main}${formatBCH(bid_price_bch).zeros} BCH placed!`,
      timeout: 3000
    })


  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Something went wrong.' })
  } finally {
    englishBidLoading.value = false
  }
}


// shows the post-auction vue components
const showPostAuctionActions = computed(() => {
  if (isMarkedComplete.value) return false
  if (isSold.value) return true
  return auction.value?.type === 'English' && lotStatus.value.label === 'Closed' && hasBid.value
})


// get the bid status
const bidStatus = computed(() => {
  const isHighest = highestBid.value.user === walletHash


  if (!hasUserBid.value) // never bid
    return null
  else if (!hasBid.value) // bid but not user's
    return lotStatus.value.label === 'Closed' ? 'did-not-win' : null
  else if (isSold.value || lotStatus.value.label === 'Closed')  // is sold or lot is closed
    return isHighest ? 'win' : 'did-not-win'  // either win or not
  return isHighest ? 'highest' : 'outbid' // highest bidder but lot not sold/closed
})


// gets the isWinningBidder status from bidStatus computed var
const isWinningBidder = computed(() => bidStatus.value === 'win')


// =========================================================================
// ============================= DUTCH AUCTION =============================
// =========================================================================
const isToggledBuyItNow = ref(false)
const buyItNowLoading = ref(false)
const dutchAlreadySold = ref(false)
const winningBid = ref({
  id: null
})


const timeLeft = ref(0)
const secondsRemaining = ref(0)
const intervalDurationSec = ref(600)
const dutchAtFloor = computed(() => {
  return (auction.value.is_fiat)
    ? dutchCurrentPriceFiat <= lot.threshold_bid_fiat
    : dutchCurrentPriceBCH <= lot.threshold_bid_bch
})


const dutchIntervalProgress = computed(() => {
  if (!intervalDurationSec.value) return 0
  return Math.max(0, Math.min(1, secondsRemaining.value / intervalDurationSec.value))
})


onUnmounted(() => {
  if (refundCountdownInterval) clearInterval(refundCountdownInterval)
})
const dutchFloorPriceBCH = computed(() => Number(lot.value?.threshold_bid_bch || 0))
const dutchFloorPriceFiat = computed(() => Number(lot.value?.threshold_bid_fiat || 0))


const dutchPrice = ref(0)
const dutchCurrentPriceBCH = computed(() => auction.value.is_fiat ? Number(dutchPrice.value || 0) : dutchPrice.value * bchToPhpRate.value)
const dutchCurrentPriceFiat = computed(() => {
  return auction.value.is_fiat
    ? bchToPhpRate.value > 0 ? dutchPrice.value / bchToPhpRate.value : 0
    : Number(dutchPrice.value || 0)
})


const buyItNow = () => {
  isToggledBuyItNow.value = true
}


const handleBuyItNow = async (payload = {}) => {
  isToggledBuyItNow.value = false
  if (auction.value?.type !== 'Dutch') return


  buyItNowLoading.value = true
  try {
    const bidBCH = payload.bid_price_bch ?? dutchCurrentPriceBCH.value
    const bidFiat = payload.bid_price_fiat ?? dutchCurrentPriceFiat.value
    // if the socket is open, run the placebid
    if (!socket || socket.readyState !== WebSocket.OPEN)
      throw new Error(bidResponse.error || 'Bid failed. Please try again.')


    // else, send the bid to the websocket
    socket.send(JSON.stringify(
      {
        type: "place_bid",
        data: {
          user: walletHash,
          lot: props.lotId,
          bid_price_bch: Number(bidBCH).toFixed(8),
          bid_price_fiat: Number(bidFiat).toFixed(2)
        }
      }
    ))


    const ack = await waitForBidAck()
    dutchAlreadySold.value = true


    await callAPI('delivery-trackings', null, 'post', {
      auctioneer: auction.value.user,
      bidder: walletHash,
      lot: props.lotId,
      status: 1,
      preparing_date: new Date().toISOString()
    })


    $q.loading.show({ message: 'Processing smart contract...' })


    try {
      await walletToContract(Number(bidBCH).toFixed(8), ack.id)
    } finally {
      $q.loading.hide()
    }


    await refresh(() => { })
    $q.notify({
      type: 'positive',
      message: `Secured for ${formatBCH(dutchCurrentPriceBCH.value).main}${formatBCH(dutchCurrentPriceBCH.value).zeros} BCH!`,
    })
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Something went wrong.' })
  } finally {
    buyItNowLoading.value = false
  }
}


// other functions
const fetchAuction = async () => {
  try {
    const result = await callAPI('auctions', Number(props.auctionId))
    if (result.success && result.data) {
      auction.value = AuctionList.parse(result.data)


      const userId = auction.value.user?.id
      if (userId) {
        const userRes = await callAPI('user-details', userId)
        if (userRes.success && userRes.data) auction.value.setUserDetails(userRes.data)
      }
    }
  } catch (error) {
    console.error('Failed to update auction details:', error)
  }
}


const fetchLot = async () => {
  const result = await callAPI('lots', props.lotId)
  if (result.success) {
    isSold.value = result.data.is_sold
    lot.value = LotsList.parse(result.data)


    const imageResult = await callAPI('lot-images-by-lot', props.lotId, 'get')
    if (imageResult.success && Array.isArray(imageResult.data)) {
      lotImages.value = imageResult.data.map(item => item.image)
    }
  }
}


const initEnglishDeliveryTracking = async () => {
  if (auction.value?.type !== 'English') return
  if (lotStatus.value.label !== 'Closed') return
  if (highestBid.value.user !== walletHash) return
  if (deliveryStatusId.value !== null) return


  try {
    await callAPI('delivery-trackings', null, 'post', {
      auctioneer: auction.value.user,
      bidder: walletHash,
      lot: props.lotId,
      status: 1,
      preparing_date: new Date().toISOString()
    })
    deliveryStatusId.value = 1
  } catch (err) {
    console.warn('Could not init delivery tracking for English auction:', err)
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
      isMarkedReturned.value = data?.mark_as_returned ?? false
    }
  } catch (err) {
    console.warn('Could not fetch delivery tracking:', err)
  }
}


const fetchDispute = async () => {
  try {
    const res = await callAPI('disputes-by-bid', winningBid.value.id)
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


const refundTimeLeft = ref('')
const refundSecondsRemaining = ref(0)
let refundCountdownInterval = null


const loadPageData = async () => {
  await Promise.all([fetchLot(), fetchAuction()])
  await Promise.all([fetchDeliveryTracking(), fetchDispute()])


  if (deliveredDate.value) {
    clearInterval(refundCountdownInterval)
    refundCountdownInterval = setInterval(refundSecondsRemaining, 1000)
  }
  await initEnglishDeliveryTracking()
}


watch(() => [props.lotId, props.auctionId], async () => {
  isLoading.value = true
  dutchAlreadySold.value = false
  await loadPageData()


  isLoading.value = false


  if (isSold.value) {
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
}, { immediate: true })


// copies to clipboard
const copyToClipboard = (text) => {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    $q.notify({ type: 'positive', message: 'Copied to clipboard!', timeout: 1500 })
  })
}


// checks if user is the author of the lot
const isAuthor = computed(() => {
  return walletHash === auction.value?.user?.id
})


// helper func
const formatAuctionDate = (dateString) => {
  if (!dateString) return 'N/A'
  return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A')
}


const smartBackPath = computed(() => {
  const sourceContext = $route.query.from
  if (sourceContext === 'activity') return '/apps/auction/activity'
  return `/apps/auction/${props.auctionId}`
})


// refreshing the page
const refresh = async (done) => {
  isLoading.value = true
  if (auction.value?.type === 'Dutch') dutchAlreadySold.value = false
  await loadPageData()
  isLoading.value = false
  done?.()
}


// onMounted (general)
onMounted(async () => {
  socket = callLotWebsocket(Number(props.lotId))


  socket.onopen = function () {
    console.log("Connected to the lot websocket!")
  };


  socket.onmessage = (event) => {
    const { type, data } = JSON.parse(event.data);


    switch (type) {
      // update the viewcount
      case "live.viewing":
        viewCount.value = data.viewer_count
        break


      // sends placebid acknowledgement
      case "place.bid_ack":
        bidResolver?.(data)
        bidResolver = null
        break
      // update the highest bidder
      case "update.highest_bid":
        hasBid.value = Boolean(data?.user)
        highestBid.value = {
          id: data?.id ?? null,
          user: data?.user ?? null,
          bid_price_fiat: data?.bid_price_fiat ?? 0,
          bid_price_bch: data?.bid_price_bch ?? 0
        }
        break


      // update the winningBidId
      case "update.winner":
        isSold.value = Boolean(data?.is_sold)
        winningBid.value = data
        break


      // update the time interval
      case "time.interval":
        secondsRemaining.value = data.seconds_remaining
        timeLeft.value = data.time_left
        break


      // update the price drop
      case "drop.price":
        dutchPrice.value = data.price
        break


      // broadcasts the live refund
      case "live.refund_countdown":
        refundSecondsRemaining.value = data.seconds_remaining
        refundTimeLeft.value = data.time_left
        break


      default:
        console.warn("Unknown websocket message:", type, data)
    }
    console.log(data)
  }


  socket.onclose = function () {
    console.log("Disconnected from the lot websocket!")
  };


  socket.onerror = function (event) {
    console.error("Lot websocket error:", event)
  }
})


onBeforeUnmount(() => {
  socket.onmessage = null
  socket.onopen = null
  socket.onerror = null
  socket.onclose = null
  socket?.close()
})


</script>
