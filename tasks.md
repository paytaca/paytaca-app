# Today's Tasks - Payment Hub

Scope of work / Modifications:
>>[!NOTE]: DO NOT MODIFY ANY OTHER FILES UNLESS NECESSARY.

- [Payment Hub Merchant Pages](src/pages/apps/payment-hub/)
- [Payment Hub Recurring Payments Pages](src/pages/apps/payment-hub-subscriptions/)
- [Payment Hub Compoents](src/components/payment-hub/)
- [Payment Hub JavaScript](src/wallet/payment-hub.js)

Reference API:

- [Payment Hub API](/home/ddrhckrzz/Documents/Code/paymenthub_nu/docs/API_DOCS.md)

## Misc

- [x] Check for missing locales / wrong name/description again, I think there are a few in the related pages right now that are missing.
- [x] IMPORTANT: Change the Payment Hub API address being used depending on whether that app `isChipnet` or not. Mainnet uses the same as currently (fallback is `paymenthub.paytaca.com/api`), while chipnet uses the `PAYMENT_HUB_CHIP_API` envvar with a fallback of `chipnet.paymenthub.paytaca.com/api`.

## Recurring Payments - Customer End

- [x] Rework Customer-Side Payment Hub App.
  - [x] Hub Subscriptions -> Recurring Payments
  - [x] Must check for wallet registration upon opening (e.g. register the wallet to payment hub backend if not already there. Check [payment-hub.js](src/wallet/payment-hub.js) for more details).
  - [x] UI/UX REWORK
    - [x] Must be able to view invoices per subscription.
    - [x] Must be able to only mainly view the vault/contract address. (contract and funder address can be a more details thing so as not to confuse the user)
    - [x] On non-cancelled/terminated (active/pending) subscriptions, there should be a button that directly allows the user to go into the send transactions page with the contract address automatically fileld. This button will be called `TOP UP` or `FUND VAULT` whichever name would be more understandable to the user.
    - [x] Must be able to filter for subscriptions with different statuses.
    - [x] Must be able to search for different subscriptions.
    - [x] Improve Billing Amount and Billing Period UI with info icons and approximate text.
    - [x] Add pull-to-refresh to the recurring payments subscriptions list.
  - [x] Subscription Logic Change
    - [x] The subscription dialog needs to have a scan/upload QR code option (it should strictly only try to check if the QR is a valid UUID and set it as the plan when we're about to send the requewst).
    - [x] The only input there should really be the subscription plan ID. (Just call it Plan ID).
    - [x] Have it GET the specific subscription plan first when scanning/uploading the QR or just typing the plan ID after pressing that `Subscribe` button. As a confirmation thing.
    - [x] Make it so that instead of subscribing right away, it gives the details of the subcription plan then the user must confirm it before it actually sends the POST request to the server to subscribe.
    - [x] UI/UX Polish: Plan URL is now displayed in the merchant plan details with copy/open links.
    - [x] UI/UX Polish: All numerical inputs correctly bring up device number pads using `inputmode="decimal"`.
    - [x] UI/UX Polish: Tab panels have transparent backgrounds to blend with dialogs cleanly.

## Recurring Payments / Subscriptions - Merchant

- [ ] Better grouping for Subscriptions and Plans
  - [ ] Should be able to view invoices related to the subscription (inside the subscription detail page itself, shouold be separate page by now probably).
  - [ ] Should be able to view invoices related to the plan separately (inside the plan detail page itself, shouold be separate page by now probably).
