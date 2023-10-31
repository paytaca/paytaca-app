const translate = require("translate-google")
const fs = require("fs")

/**
 * NOTE: YOU ONLY NEED TO UPDATE TEXTS HERE and run this script.
 * This script automatically translates and writes the translated
 * objects to the language index files (i18n/{language}/index.js)
 *
 *
 * To execute this script:
 * 1) go to the directory of this file
 * 2) run "node translate.js"
 *
 */
const words = [
  {
    Hedge: "Hedge",
    Long: "Long",
    Crypto: "Crypto",
    Fiat: "Fiat",
    Accept: "Accept",
    Account: "Account",
    All: "All",
    Add: "Add",
    Amount: "Amount",
    Address: "Address",
    Applications: "Applications",
    Approve: "Approve",
    Apps: "Apps",
    Balance: "Balance",
    Biometric: "Biometric",
    Bridge: "Bridge",
    Back: "Back",
    Branch: "Branch",
    Cancel: "Cancel",
    City: "City",
    CashTokens: "CashTokens",
    Clear: "Clear",
    Close: "Close",
    Country: "Country",
    Collectibles: "Collectibles",
    Connect: "Connect",
    Confirmation: "Confirmation",
    Continue: "Continue",
    Copying: "Copying",
    Create: "Create",
    Currency: "Currency",
    Date: "Date",
    Dismiss: "Dismiss",
    Data: "Data",
    Decoded: "Decoded",
    Devices: "Devices",
    Deadline: "Deadline",
    Deposit: "Deposit",
    Disconnected: "Disconnected",
    English: "English",
    Error: "Error",
    Done: "Done",
    From: "From",
    Gas: "Gas",
    German: "German",
    Home: "Home",
    Keep: "Keep",
    Language: "Language",
    Link: "Link",
    Location: "Location",
    Manage: "Manage",
    Memo: "Memo",
    Message: "Message",
    MAX: "MAX",
    Name: "Name",
    or: "or",
    Personalize: "Personalize",
    ChangePin: "Change PIN",
    POSID: "POSID",
    Ramp: "Ramp",
    Receive: "Receive",
    Received: "Received",
    Recipient: "Recipient",
    Recipients: "Recipients",
    Refetch: "Refetch",
    Reject: "Reject",
    Remove: "Remove",
    Rename: "Rename",
    Required: "Required",
    Raw: "Raw",
    Retry: "Retry",
    Route: "Route",
    Routing: "Routing",
    Scan: "Scan",
    Scanning: "Scanning",
    Security: "Security",
    Send: "Send",
    Sender: "Sender",
    Senders: "Senders",
    Sent: "Sent",
    Settings: "Settings",
    Setup: "Setup",
    Set: "Set",
    Skip: "Skip",
    Slippage: "Slippage",
    Spanish: "Spanish",
    Street: "Street",
    Success: "Success",
    Swap: "Swap",
    Sweep: "Sweep",
    Symbol: "Symbol",
    To: "To",
    Tokens: "Tokens",
    Transactions: "Transactions",
    Update: "Update",
    Verify: "Verify",
    Value: "Value",
    Version: "Version",
    Wallet: "Wallet",
    Wallets: "Wallets",
    Details: "Details",
    Transaction: "Transaction",
    Extensions: "Extensions",
    Description: "Description",
    Unlink: "Unlink",
    Gifts: "Gifts",
    Commitment: "Commitment",
    Capability: "Capability",
    Submit: "Submit",
    Select: "Select",
    Duration: "Duration",
    Low: "Low",
    Asset: "Asset",
    Calculate: "Calculate",
    Expired: "Expired",
    High: "High",
    Liquidity: "Liquidity",
  }
]
const phrases = {
  /**
   * NOTE: separate text objects if it gets too big in size
   * bec the translator has a limit (unspecified in docs)
   */
  static: [
    {
      ApproveToken: "Approve token",
      AboutTheApp: "About the App",
      Add_SEP20_Token: "Add SEP20 Token",
      Add_Type1_Token: "Add SLP Type 1 Token",
      ApprovingToken: "Approving token",
      AssetRemovalText: "Do you want to continue removing the asset?",
      AssetsSwappedSuccesfully: "Assets swapped succesfully",
      AssetSwap: "Asset Swap",
      AddingNewDevice: "Adding new device",
      AddNewDevice: "Add new device",
      BackToEdit: "Back to Edit",
      BalanceExceeded: "Balance exceeded",
      BchAddress: "BCH Address",
      BchAddresses: "BCH Addresses",
      BchBalance: "BCH Balance",
      BchBridge: "BCH Bridge",
      BchToReceive: "BCH to receive",
      BchToSend: "BCH to send",
      BridgeBalance: "Bridge balance",
      BiometricMaxAttemptsMsg: 'You"ve done many attempts. Please try again after 30 seconds.',
      BridgeLeavingPageMsg: "Leaving the page may result in being unable to view progress. Leave page?",
      BridgeError1: "Must be at least 0.01",
      BridgeError2: 'Amount must be less than bridge"s balance',
      BranchDetails: "Branch details",
      BranchDetailsSaved: "Branch details saved",
      BranchName: "Branch name",
      BranchRemoved: "Branch removed",
      BusinessDetails: "Business details",
      BusinessName: "Business name",
      CancelUnlinkRequestError: "Cancel unlink request error",
      CancellingUnlinkRequest: "Cancelling unlink request",
      CreatingUnlinkDeviceRequest: "Creating unlink device request",
      CallRequest: "Call Request",
      ChineseTraditional: "Chinese Traditional",
      ChineseSimplified: "Chinese Simplified",
      CallRequestAccepted: "Call request accepted",
      CameraPermissionErrMsg1: "Permission required to access to camera",
      CameraPermissionErrMsg2: "No camera found on this device",
      CameraPermissionErrMsg3: "Unable to acccess camera in non-secure context",
      CameraPermissionErrMsg4: "Unable to access camera",
      CameraPermissionErrMsg5: 'Constraints don"t match any installed camera. Did you ask for the front camera although there is none?',
      ChoosePreferredSecAuth: "Please choose your preferred security authentication",
      ClickToCopyAddress: "Click to copy address",
      ClearCallRequests: "Clear call requests",
      ClearCallRequestsPrompt: "Removing all call requests. Are you sure?",
      ConfirmPin: "Confirm PIN",
      ConfirmSwap: "Confirm Swap",
      CopiedToClipboard: "Copied To Clipboard",
      CopyPrivateKey: "Copy private key",
      CreateNewWallet: "Create New Wallet",
      CreatingYourWallet: "Creating your wallet",
      DarkMode: "Dark Mode",
      DerivationPath: "Derivation Path",
      DeviceSuspended: "Device suspended",
      DeviceUnsuspended: "Device unsuspended",
      Enter_SEP20_ContractAddress: "Enter SEP20 contract address",
      Enter_SLP_TokenId: "Enter SLP token ID",
      ErrAcceptingCallRequest: "Error accepting call request",
      EnterAmount: "Enter amount",
      EnterPin: "Enter PIN",
      EstimatedFee: "Estimated fee",
      ExplorerLink: "Explorer Link",
      FailedToExecutePaymentRequest: "Failed to execute payment request",
      FetchingPaymentData: "Fetching payment data",
      FindingUnlistedAssets: "Finding unlisted assets",
      FailedAddingNewDevice: "Failed to add new device",
      FailedRemoveBranch: "Failed to remove branch",
      FailedToCreateRandomSig: "Failed to create random signature",
      FailedToCreateUnlinkRequest: "Failed to create unlink request",
      FailedToRemoveDevice: "Failed to remove device",
      FilterSalesReport: "Filter sales report",
      GeneratingRandomSignature: "Generating random signature",
      GasFee: "Gas fee",
      GasPrice: "Gas Price",
      GenerateNewAddress: "Generate new address",
      HasBalance: "Has balance",
      InvalidPhoneNumber: "Invalid phone number",
      IgnoredTokens: "Ignored Tokens",
      IncorrectPin: "Incorrect PIN",
      Input_SEP721_TokenAddress: "Input SEP721 Token address",
      InputOrderNoFromConnecta: "Input order number from Connecta",
      InputValidAddress: "Input valid address",
      InputWalletConnectUri: "Input Wallet Connect URI",
      InsufficientBalance: "Insufficient balance",
      InvalidAddress: "Invalid address",
      LegacyAddress: "Legacy Address",
      LeavingPage: "Leaving page",
      LogIn: "Log In",
      MinerFee: "Miner fee",
      MinimumReturn: "Minimum return",
      MnemonicBackupPhrase: "Mnemonic Backup Phrase",
      MnemonicBackupPhraseDescription1: "Double check if this matches your mnemonic backup phrase",
      MnemonicBackupPhraseDescription2: "Write on paper or take a screenshot and keep it somewhere safe",
      SkipVerification: "Skip Verification",
      SkipVerificationMessage: "Are you sure you want to skip the verification step?",
      MerchantDetails: "Merchant details",
      MerchantDetailsRequired: "Merchant details required",
      MerchantDetailsSaved: "Merchant details saved",
      NewDevice: "New device",
      NotifyPOSDeviceToConfirmUnlinking: "Notify POS device to confirm unlinking",
      NativeBiometricReason1: "For easy log in",
      NativeBiometricReason2: "For ownership verification",
      NativeBiometricSubtitle: "Verify your account using fingerprint",
      NewUnlisted: "New / Unlisted",
      NoCollectibles: "You don't own any SLP NFTs yet.",
      NotEnoughBalForSendAmount: "Not enough balance to cover the send amount",
      NotEnoughBchForFee: "Not enough BCH to cover for transaction fee",
      NoIgnoredTokens: "No ignored tokens",
      NoInternetConnectionNotice: "You have lost connection to the internet. This app is offline.",
      NoTokensFound: "No tokens found",
      NoTransactionsToDisplay: "No transactions to display",
      OpenSourceCode: "Open source code",
      OrderNo: "Order number",
      OrderNotFound: "Order not found",
      PaymentOTP: "Payment OTP",
      PinLocation: "Pin location",
      POSDeviceNotFound: "POS device not found",
      POSDeviceIsNotLinked: "POS device is not linked",
      POSDeviceMustBeUnlinked: "POS Device must be unlinked",
      PrimaryContactNumber: "Primary contact number",
      PaymentDetails: "Payment Details",
      PaymentDetailsNotFound: "Payment details not found",
      PaymentRequestIsExpired: "Payment request is expired",
      PasteAddressOrLnsHere: "Paste address or LNS name here",
      PasteAddressHere: "Paste address here",
      PaytacaMotto: "YOUR MONEY. YOUR CONTROL.",
      PayTransactionFeeFrom: "Pay for transaction fee from",
      PaymentAcknowledged: "Payment acknowledged",
      PinMismatched: "PIN mismatched",
      PinSubtext1: "Enter your PIN to proceed.",
      PinSubtext2: "PIN will serve as a verification of your account in every transaction you make for security purposes.",
      PoweredBy: "Powered by",
      ReceivingAddress: "Receiving address",
      ResolvingLnsAddress: "Resolving LNS name address",
      RestoreWallet: "Restore Wallet",
      RemoveAsset: "Remove asset",
      RejectedByUser: "Rejected by user",
      RejectedCallRequest: "Rejected call request",
      RemoveIgnoredToken: "Remove ignored token",
      RemoveIgnoredTokenPrompt: "You have added assets from ignored list. Remove them from the ignored list?",
      RestoreWalletDescription: "Restore your Paytaca wallet from its mnemonic backup phrase",
      RestoringYourWallet: "Restoring your wallet",
      RemoveBranch: "Remove branch",
      RemoveBranchConfirm: "Remove branch. Are you sure?",
      RemoveDevice: "Remove Device",
      RestoreFromSeedPhrase: "Restore From Seed Phrase",
      RemoveDeviceFailed: "Remove Device Failed",
      RemovePOSDevice: "Remove POS device",
      SalesReport: "Sales Report",
      SetCoordinates: "Set coordinates",
      SetName: "Set name",
      SetNewNameForDevice: "Set new name for device",
      SuspendDevice: "Suspend device",
      SuspendingDevice: "Suspending device",
      SavingYourPin: "Saving your PIN",
      ScanQrCode: "Scan QR code",
      SecurityAuthentication: "Security Authentication",
      SecurityAuthenticationSetup: "Security Authentication Setup",
      SecurityCheck: "Security Check",
      SearchingForOtherAssets: "Searching for other assets",
      SeedPhraseCaution1: "Warning: Do not copy this to clipboard!",
      SeedPhraseCaution2: "Some malicious apps installed in your device may be able to snatch it from there. Best way to keep a backup of your seed phrase is to write it on paper.",
      SelectAssetToSend: "Select Asset to Send",
      SelectAssetToBeReceived: "Select Asset to be Received",
      SendToAnotherAddress: "Send to another address",
      SendTransaction: "Send Transaction",
      SignTransaction: "Sign Transaction",
      SelectCustomToken: "Select custom token",
      SelectToken: "Select token",
      SelectFromList: "Select from list",
      SetupNewPin: "Setup New PIN",
      SetupPin: "Setup PIN",
      ShopName: "Shop name",
      ShowMore: "Show More",
      SignMessage: "Sign Message",
      SlippageTolerance: "Slippage Tolerance",
      SlippageToleranceDescription: "The swap will be reverted if price changes unfavorably by this percentage",
      SlpAddress: "SLP Address",
      SlpAddresses: "SLP Addresses",
      SLP_to_SEP20: "SLP to SEP20",
      SwapRatio: "Swap ratio",
      SEP20_VaultBalance: "SEP20 vault balance",
      SmartBchAddresses: "SmartBCH Addresses",
      SmartSwapBchSoonTokens: "We will integrate SLP DEX for SLP tokens soon!",
      SmartSwapFormErr: "Error occurred in fetching swap information",
      SwapAgain: "Swap Again",
      SwapFrom: "Swap from",
      SwapTo: "Swap to",
      SwapSuccess: "Swap success",
      SwapTransactionDeadlineDescription: "The swap will be reverted if the transaction is pending for more than this duration",
      SweepInputPlaceholder: "Paste here the private key in WIF format",
      SweepTheTokensFirst: "Sweep the tokens first",
      SweepErrMsg1: "This address is empty",
      SweepErrMsg2: "You will need sufficient BCH balance to be able to sweep the token(s) below",
      SwipeToSend: "Swipe To Send",
      SwapUpdate: "Swap update",
      TokenApproved: "Token approved",
      TokenId: "Token ID",
      TokenAdded: "Token added",
      TokenAlreadyInList: "Token already exists in list",
      TransactionId: "Transaction ID",
      TransactionDeadline: "Transaction Deadline",
      TransactionSent: "Transaction Sent",
      UnlinkDevice: "Unlink device",
    },
    {
      TotalHedgeValue: "Total hedge value",
      NoOngoingContract: "No ongoing contract",
      UnknownAsset: "Unknown asset",
      OraclePubkey: "Oracle pubkey",
      HedgeOffers: "Hedge Offers",
      ClearFilter: "Clear filter",
      LiquidityPool: "Liquidity Pool",
      HedgePositions: "Hedge Positions",
      LongOffers: "Long Offers",
      LongPositions: "Long Positions",
      TotalLongPositions: "Total Long Positions",
      SelectLiquidityPool: "Select liquidity pool",
      MatchSimilarity: "Match similarity",
      AnyHedgeNoExactMatchInfo: "If there is no exact match found from the pool, a list of similar offers is suggested instead",
      AddAll: "Add All",
      SelectSource: "Select Source",
      TransactionHistory: "Transaction History",
      RefundAddress: "Refund Address",
      AppInfo: "App Info",
      AddressScan: "Address Scan",
      UtxoScan: "UTXO Scan",
      BackendDown: "Our backend server is unreachable. This could be due to your internet connection or our server being temporarily down",
      ClickToReveal: "Click to Reveal",
      SLPTokens: "SLP Tokens",
      AddFungibleCashToken: "Add Fungible CashToken",
      AssetValueNote: "Asset value is based on prices at the time of transaction",
      CreateOrImportWallet: "Create/Import Wallet",
      EnterCashTokenCategoryID: "Enter CashToken category ID",
      ManageIgnoredTokens: "Manage Ignored Tokens",
      ManageTokens: "Manage Tokens",
      ScanForTokens: "Scan for Tokens",
      HideTokens: "Hide Tokens",
      OnBoardSettingHeader: "Set Localization Preferences",
      OnBoardSettingDescription: "Adjust settings to fit your native experience",
      POSAdmin: "POS Admin",
      RenameWallet: "Rename Wallet",
      ShowTokens: "Show Tokens",
      SwitchWallet: "Switch Wallet",
      SourceCodeRepo: "Source code repository",
      EnableSmartBCH: "Enable SmartBCH",
      UnlinkDeviceRequestCreated: "Unlink device request created",
      UnlinkDeviceRequestFailed: "Unlink device request failed",
      UnlinkPOSDevice: "Unlink POS device",
      UseChipnetNetwork: "Use Chipnet Network",
      UnlinkRequestCancelled: "Unlink request cancelled",
      UnsuspendDevice: "Unsuspend device",
      UnsuspendingDevice: "Unsuspending device",
      UnableToGetPaymentDetails: "Unable to get payment details",
      UnableToReadPaymentRequest: "Unable to read payment request",
      UnableToResolveLnsAddress: "Unable to resolve LNS name address",
      UnknownErrorOccurred: "Unknown error occurred",
      UnlistedAssets: "Unlisted Assets",
      ScanningForUtxos: "Scanning for UTXOs",
      ScanningForUntrackedAddr: "Scanning for untracked addresses",
      ScanningForUtxosAndAddr: "Scanning for UTXOs and addresses",
      VerifyMnemonicBackupPhrase: "Verify shuffled mnemonic to proceed",
      VerifyPin: "Verify PIN",
      ViewIgnoredTokens: "View ignored tokens",
      ViewInExplorer: "View in explorer",
      ViewTokens: "View Tokens",
      ViewTransactionInExplorer: "View transaction in explorer",
      WaitingSmartBchTransaction: "Waiting for transaction in Smart BCH",
      WaitingBchTransaction: "Waiting for transaction in Bitcoin Cash",
      WalletBalance: "Wallet balance",
      WalletConnect: "Wallet Connect",
      WalletHash: "Wallet Hash",
      WalletInfo: "Wallet Info",
      Waiting_SEP20_TokenSent: "Waiting for SEP20 token to be sent",
      XpubKey: "xPub Key",
      YouReceive: "You receive",
      YouSend: "You send",
      SuccessfullySent: "Successfully sent",
      ShowReceivingAddress: "Show Receiving Address",
      RefreshList: "Refresh List",
      LoadingMetadata: "Loading metadata",
      CategoryID: "Category ID",
      RampFiatNotice: "Our peer-to-peer BCH-to-fiat exchange will be here soon. Stay tuned!",
      Add_SEP721_Token: "Add SEP721 Token",
      SelectBCHDenomination: "BCH Denomination",
    }
  ],
  dynamic: [
    {
      ApprovingTokenName: "Approving {tokenInfoName}",
      DeviceAddedIDNo: "Device added #{ID}",
      FailedUpdateDeviceIDNo: "Failed to update device #{ID}",
      RemovedDeviceIDNo: "Removed device #{ID}",
      RemovingDeviceIDNo: "Removing device #{ID}",
      RemovePOSDeviceNumName: "Remove POS Device #{ID}{name}",
      UnlinkPOSDeviceNumName: "Ulink POS Device #{ID}{name}",
      UpdateDeviceIDNo: "Update device #{ID}",
      UpdatedDeviceIDNo: "Updated device #{ID}",
      UpdatingDeviceIDNo: "Updating device #{ID}",
    }
  ]
}

// token to point
const hongKongSpecific = [
  {
    CashPoints: "CashPoints",
    Points: "Points",
    ApprovePoint: "Approve point",
    Add_SEP20_Point: "Add SEP20 Point",
    Add_Type1_Point: "Add SLP Type 1 Point",
    ApprovingPoint: "Approving point",
    Enter_SLP_PointId: "Enter SLP point ID",
    IgnoredPoints: "Ignored Points",
    Input_SEP721_PointAddress: "Input SEP721 Point address",
    NoIgnoredPoints: "No ignored points",
    NoPointsFound: "No points found",
    RemoveIgnoredPoint: "Remove ignored point",
    SelectCustomPoint: "Select custom point",
    SelectPoint: "Select point",
    SmartSwapBchSoonPoints: "We will integrate SLP DEX for SLP points soon!",
    SweepThePointsFirst: "Sweep the points first",
    SweepErrMsg2: "You will need sufficient BCH balance to be able to sweep the point(s) below",
    PointApproved: "Point approved",
    PointId: "Point ID",
    PointAdded: "Point added",
    PointAlreadyInList: "Point already exists in list",
    SLPPoints: "SLP Points",
    AddFungibleCashPoint: "Add Fungible CashPoint",
    EnterCashPointCategoryID: "Enter CashPoint category ID",
    ManageIgnoredPoints: "Manage Ignored Points",
    ManagePoints: "Manage Points",
    ScanForPoints: "Scan for Points",
    HidePoints: "Hide Points",
    ShowPoints: "Show Points",
    ViewIgnoredPoints: "View ignored points",
    ViewPoints: "View Points",
    Waiting_SEP20_PointSent: "Waiting for SEP20 point to be sent",
    Add_SEP721_Point: "Add SEP721 Point",
    DEEM: "DEEM",
    Theme: "Theme",
    Default: "Default"
  }
]

const TEXT_GROUPS = [
  ...words,
  ...phrases.static,
  ...phrases.dynamic,
  ...hongKongSpecific
]

// check for supported language codes here
// https://github.com/shikar/NODE_GOOGLE_TRANSLATE/blob/master/languages.js
const supportedLangs = ['en-us', 'es', 'zh-tw', 'zh-cn', 'de']

// ordering of keys
function orderObj (unorderedObj) {
  return Object.keys(unorderedObj)
    .sort()
    .reduce((obj, key) => {
      obj[key] = unorderedObj[key]
      return obj
    }, {})
}

// writing to language index files
function write (data, to) {
  fs.writeFile(`./${to}/index.js`, data, (err) => {
    if (err) throw err
  })
}

// get text group label for logging
function getTextGroupLabel (index) {
  const wordsLen = words.length
  const staticPhrasesLen = phrases.static.length
  const wordsAndStaticPhrasesLen = staticPhrasesLen + wordsLen

  if (index < wordsLen) {
    return `words group ${index + 1}`
  } else if (index < wordsAndStaticPhrasesLen) {
    const groupNo = index - (wordsLen - 1)
    return `static phrases group ${groupNo}`
  } else {
    const groupNo = index - (wordsAndStaticPhrasesLen - 1)
    return `dynamic phrases group ${groupNo}`
  }
}

// print out length of texts for verification later after writing to file
let sum = 0
for (const group of TEXT_GROUPS) {
  sum += Object.keys(group).length
}
console.log('Expected no. of translation keys on i18n files: ', sum)

// translate all texts here
let jsonData = {};

(async () => {
  for (let lang of supportedLangs) {
    const codes = { from: 'en', to: lang }
    if (lang === 'en-us') {
      codes.to = 'en'
    }

    console.log('==============================')
    console.log(`Processing ${codes.to}:`)
    console.log('==============================')

    let index = 0
    for (const group of TEXT_GROUPS) {
      if (Object.keys(group).length === 0) {
        continue
      }

      const label = getTextGroupLabel(index)
      console.log(`Translating ${label}...`)

      const translatedObj = await translate(group, codes)

      // merge the previous and current objects
      Object.assign(jsonData, translatedObj)
      jsonData = orderObj(jsonData)

      let strData = '// NOTE: DONT EDIT THIS FILE\n'
      strData +=
        '// UPDATE ON i18n/translate.js and follow steps there to apply changes\n\n'
      strData += 'export default '

      strData += JSON.stringify(jsonData, null, 2)

      // to remove the quotes on keys after stringify
      strData = strData.replace(/"([^"]+)":/g, '$1:')

      // write to our i18n/{lang_code}/index.js
      write(strData, lang)

      index++
    }
  }
})()
