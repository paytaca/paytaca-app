const translate = require("translate-google")
const fs = require("fs")

/**
 * NOTE: YOU ONLY NEED TO UPDATE TEXTS HERE and run this script.
 * This script automatically translates and writes the translated
 * objects to the language index files (i18n/{language}/index.js)
 * 
 * THIS DOES NOT TRANSLATE THE INTERPOLATED STRINGS PROPERLY (you have to do it manually)
 *
 * WHEN ADDING A PHRASE/WORD, make sure to not mix dynamic (interpolated) and static strings
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
    Pin: "PIN",
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
    ArgentinianSpanish: "Spanish (Argentina)",
    BrazilianPortuguese: "Portuguese (Brazil)",
    Hausa: "Hausa",
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
      SmartSwapBchSoonTokens: "We will integrate a DEX soon!",
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
      SLPTokens: "SLP",
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
      DetectedUnknownCurrency: "Detected unknown currency: #{currency}",
      InvalidRecipient: "Recipient should be a valid #{walletType} address",
      ThemeName: "{theme} Theme",
      ExceededBalanceError: "Exceeding balance {spendableBchValue}",
      LiquidityLeastError: "Liquidity requires at least {convertedMinimumAmount}",
      LiquidityMostError: "Liquidity requires at most {convertedMaximumAmount}",
      NoMatchingPositionError: "No matching {hedgeLongPosition} position found",
      FindingMatchingPositionError: "Error in finding matching {hedgeLongPosition} position",
      MustAtLeastBe: "Must at least be {amount}",
      MustAtMostBe: "Must at most be {amount}",
      MustBeAtLeast: "Must be at least {amount}",
      MustBeAtMost: "Must be at most {amount}",
      RemoveAssetPrompt: "Remove asset {assetName}. Are you sure?",
      MustBeGreaterThan: "Must be greater than {amount}",
      MustBeLessThan: "Must be less than {amount}",
      InvalidHedgeSatoshis: "Invalid hedge satoshis, expected {amount}",
      RecoverGiftDescription: "Recover gift of {amount} BCH. Proceed?"
    }
  ]
}

// token to point
const hongKongSpecific = [
  {
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
    SmartSwapBchSoonPoints: "We will integrate a DEX soon!",
    SweepThePointsFirst: "Sweep the points first",
    SweepErrMsg2: "You will need sufficient BCH balance to be able to sweep the point(s) below",
    PointApproved: "Point approved",
    PointId: "Point ID",
    PointAdded: "Point added",
    PointAlreadyInList: "Point already exists in list",
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
    DEEM: "DEEM"
  }
]

const shardsBackupTexts = [{
  RestoreExistingWallet: "Restore Existing Wallet",
  WalletRestoredDescription: "Wallet restored successfully. Click on the button to continue.",
  ChooseBackupPhase: "Choose Backup Phase",
  ChooseBackupPhaseDescription: "Choose the wallet backup method you want to use to proceed to the next phase.",
  ImportShardsDescription: "If you have QR code images of the shards, proceed with using the Shards backup method.",
  ImportSeedPhraseDescription: "If you do not have any QR images, or just want to use the old backup, proceed with using the Seed Phrase backup method.",
  CreateShardsDescription: "The Shards backup method is recommended for beginners, which is a simple but very secure method. It works by encrypting the seed phrase and splitting it into 3 shards. One is stored securely by us, and the other two are for you to store and share. You can still view the seed phrase and the generated shards later in you wallet info.",
  CreateSeedPhraseDescription: "If you are an advanced user or just want to use the old backup phase, proceed with using the Seed Phrase backup method.",
  ProceedWithShards: "Proceed with Using Shards",
  ProceedWithSeedPhrase: "Proceed with Using Seed Phrase",
  RestoreShardsDescription: "Restore your Paytaca wallet from the QR code of its shards",
  ScanUploadPersonalQR: "Scan or upload the wallet's first shard QR",
  ScanUploadForSharingQR: "Scan or upload the wallet's second shard QR",
  ClearQR: "Clear QR",
  LoadingShards: "Loading shards",
  CreatingShards: "Creating shards",
  ShardsBackupPhase: "Shards Backup Phase",
  ShardsBackupPhaseDescription1: "Below are the shards for this wallet.",
  ShardsBackupPhaseDescription2: "Below are QR code images generated from the shards.",
  ShardsBackupPhaseDescription3: "You can screenshot them by yourself or use the button below to download them to your device.",
  PersonalQRDescription1: "This QR code needs to be saved and stored securely in your device.",
  PersonalQRDescription2: "Save this QR code in your device",
  ForSharingQRDescription1: "This QR code needs to be shared to your friend. We highly advise that you share it immediately after saving instead of just storing it in your device.",
  ForSharingQRDescription2: "Share this QR code to a friend",
  DownloadQRCodeImages: "Download QR Code Images",
  FirstShard: "First Shard",
  SecondShard: "Second Shard",
  CreateMobileProcessDescription1: "To ensure a smooth and successful process, follow the following steps",
  CreateMobileProcessDescription2: "Click on the buttons below to display the shard images.",
  CreateMobileProcessDescription3: "Take a screenshot of the displayed image.",
  CreateMobileProcessDescription4: "To continue, check the checkbox to confirm that you have saved both screenshots.",
  ShowFirstShard: "Show First Shard",
  ShowSecondShard: "Show Second Shard",
  ConfirmCheckboxText: "I confirm that I already saved the screenshots to my device."
}]

const additional = [
  {
    Theme: "Theme",
    Default: "Default",
    ReferenceId: "Reference ID",
    SendPageOffline: "You cannot send funds while offline. Please connect to the internet.",
    AddAnotherRecipient: "Add Another Recipient",
    InvalidAddressFormat: "Invalid address format",
    MultipleRecipientsUnsupported: "Multiple recipients not yet supported",
    NotEnoughForGasFee: "Not enough balance to cover the gas fee",
    NotEnoughForSendAmount: "Not enough balance to cover the send amount",
    NotEnoughForTransactionFee: "Not enough balance to cover the transaction fee",
    NotEnoughForBoth: "Not enough balance to cover the send amount and transaction fee",
    SendAmountGreaterThanZero: "Send amount should be greater than zero",
    UnknownError: "Unknown error",
    CannotAddRecipient: "Cannot add more than 5 recipients.",
    TotalAmountError: "Total amount being sent is greater than your current balance",
    EmptyRecipient: "Recipient cannot be empty",
    Warning: "Warning",
    SetMaxWarning: "This will set the maximum amount to this recipient. Other recipients added will be removed. Do you want to proceed?",
    Yes: "YES",
    No: "NO",
    SetAmountIn: "Set amount in",
    RemoveRecipient: "Remove recipient",
    Recipient: "Recipient",
    To: "to",
    SetReceiveAmount: "Set Receive Amount",
    PaymentNotYetAcknowledged: "Payment not yet acknowledged by payment server. Make sure to check with recipient if it went through.",
    LightMode: "Light Mode",
    ThemePreferenceTitle: "Set Theme Preference",
    ThemePreferenceSubtitle: "Adjust theme to fit your native experience",
    EnterOneByOne: "Enter seed phrase one by one",
    PasteSeedPhrase: "Paste entire seed phrase instead",
    YourMnemonic: "Your mnemonic backup phrase is",
    YouWillReceive: "You Will Receive",
    CurrentPrice: "Current price",
    AssetName: "Asset Name",
    PriceTimestamp: "Price Timestamp",
    BCHBullDescription: "Create anyhedge contracts instantly with a liquidity provider",
    P2PDescription: "Create anyhedge contract offers and find a match with other users",
    ApproxHedgeAmount: "Approx hedge amount",
    ApproxHedgeAmountDescription: "Hedge amount is calculated from long amount below and low liquidation percentage below",
    BridgeDisabled: "The bridge is temporarily disabled until further notice",
    Minutes: "minutes",
    Hours: "hours",
    Days: "days",
    Weeks: "weeks",
    Months: "months",
    CreateContractError: "Encountered error creating contract",
    CreateHedgeError: "Encountered error in creating hedge position",
    CreateLongError: "Encountered error in creating long position",
    Offer: "offer",
    CreateHedge: "Creating hedge position offer",
    CreateLong: "Creating long position offer",
    FinalizeHedge: "Finalizing hedge position",
    FinalizeLong: "Finalizing long position",
    PrepareFundingError: "Encountered error in preparing funding transaction",
    ContractAddressMismatch: "Contract address mismatch. Unable to create funding UTXO",
    CreatingUTXO: "Creating UTXO for funding proposal",
    IncompleteDataError: "Unable to create funding UTXO due to incomplete data",
    SecurityCheckFailed: "Security check failed",
    Confirm: "Confirm",
    MatchingPositionError: "Encountered error in accepting matching position offer",
    OutdatedPriceError: "Starting price is outdated",
    InvalidOfferError: "Position offer is invalid",
    UnavailableOfferError: "Position offer is no longer available",
    SettlementService: "Settlement Service",
    SettlementServiceDescription: "Settlement service fee for Paytaca",
    FoundExistingOffer: "Found existing offer. Accepting position offer",
    NoMatchingOfferTitle: "No Matching Offer",
    NoMatchingOfferError: "No matching offers found, create one instead?",
    SelectingFromOffers: "Selecting from similar offers",
    SimilarOffersFound: "Similar offers found",
    SimilarOffersError: "No matching offers found but found similar offers. Select one instead?",
    FindingMatchingContract: "Finding matching contract",
    PreparingContractError: "Encountered error in preparing contract position",
    CompilingContractError: "Encountered error in compiling contract",
    ContractProposalError: "Encountered error in contract proposal",
    FetchingContractStatusError: "Encountered error in fetching contract status",
    CalculateFeesError: "Error calculating contract fees",
    CalculatingContractFees: "Calculating contract fees",
    GeneratingAddressesError: "Error generating addresses",
    GenerateReceivingAddress: "Generating receiving address",
    GreaterThanHundredError: "Must be greater than 100%",
    HigherThanThousandError: "Must not be higher than 1000%",
    PositionOffer: "Position offer",
    Stabilize: "Stabilize",
    Leverage: "Leverage",
    HedgeContract: "Hedge Contract",
    ContractValue: "Contract Value",
    LongAmountDescription: "Long amount is only an approximation without a starting price value on the asset",
    Funding: "Funding",
    Contract: "Contract",
    Fees: "Fees",
    NetworkFee: "Network fee",
    OfValue: "of position's value",
    Premium: "Premium",
    PremiumIs: "Premium is",
    ContractDuration: "Contract Duration",
    LiquidationParameters: "Liquidation Parameters",
    StartPrice: "Start price",
    Units: "units",
    PayoutAddresses: "Payout addresses",
    SwipeToConfirm: "SWIPE TO CONFIRM"
  },
  {
    Session: "Session",
    ScanNewSession: "Scan new session",
    PasteURL: "Paste URL",
    PendingSessionRequests: "Pending session requests",
    SelectActiveSession: "Select active session",
    NoActiveSessionsConnectNew: "No active sessions, connect new session",
    NoActiveSessions: "No active sessions",
    Requests: "Requests",
    NoPendingRequests: "No pending requests",
    Method: "Method",
    Chain: "Chain",
    Topic: "Topic",
    SessionProposals: "Session Proposals",
    NoPendingSessionProposals: "No pending session proposals",
    Connecting: "Connecting",
    NewSession: "New Session",
    SessionURL: "Session URL",
    ApprovingSession: "Approving session",
    ActiveSessions: "Active Sessions",
    OK: "OK",
    SelectCollection: "Select Collection",
    NoCashTokens: "You don't own any CashToken NFTs yet.",
    Properties: "Properties",
    SLPCollectibles: "SLP Collectibles",
    UngroupedCollectibles: "Ungrouped Collectibles",
    NewBranch: "New branch",
    IsNewBranch: "Is main branch",
    NoBranches: "No branches",
    BranchSmall: "branch",
    Branches: "branches",
    NoMerchantDetails: "No merchant details",
    SetupMerchantDetails: "Setup merchant details",
    DeviceSuspendedPOS: "Device is currently suspended",
    UnlinkPending: "Unlink request pending",
    NoDevices: "No devices",
    DeviceName: "Device name",
    DeviceMustBeOnline: "Device must be online to link POS device",
    GenerateNewCode: "Generate new code",
    TotalSales: "Total sales",
    Range: "Range",
    DateFrom: "Date from",
    DateTo: "Date to",
    Monthly: "Monthly",
    Daily: "Daily",
    Filter: "Filter",
    LinkExpiresIn: "Link expires in",
    LinkExpired: "Link expired",
    Ago: "ago",
    Seconds: "seconds",
    Second: "second",
    MainBranch: "Main Branch",
    WalletDeletion: "Wallet Deletion",
    DeleteWalletNow: "Delete Wallet Now",
    DeleteWallet: "Delete Wallet",
    DeleteWalletDescription: "Are you sure you want to delete this wallet?",
    UTXOScanComplete: "UTXO scan completed at",
    UTXOScanOngoing: "UTXO scan ongoing, started",
    Allowance: "Allowance",
    InvalidAmount: "Invalid amount",
    MinDuration: "Min Duration",
    MaxDuration: "Max Duration",
    InvalidDuration: "Invalid duration",
    UpdatingLongPref: "Updating long account preferences",
    UpdatingLongError: "Error encountered in updating long account",
    SavingLongAccount: "Saving long account",
    RegisterLongError: "Error encountered in registering long accounts",
    GeneratingAddressSet: "Generating address set",
    GeneratingAddressesError: "Error generating addresses",
    MutualRedemptionProposal: "Mutual Redemption Proposal",
    TotalPayout: "Total Payout",
    Type: "Type",
    Refund: "Refund",
    EarlyMaturation: "Early Maturation",
    Arbitrary: "Arbitrary",
    SettlementPrice: "Settlement Price",
    HedgePayout: "Hedge payout",
    LongPayout: "Long payout",
    AreYouSure: "Are you sure?",
    ConfirmMutualRedemptionProposal: "Confirm mutual redemption proposal",
    VerifyingContractFunding: "Verifying contract funding",
    ValidatingContractFundingError: "Encountered error in validating contract funding",
    RetrievePrivateKey: "Retrieving private key",
    RetrievePrivateKeyError: "Failed to retrieve private key",
    SigningProposal: "Signing proposal",
    SigningProposalError: "Encountered error in creating data",
    UnresolvedTransactionProposal: "Unresolved transaction proposal",
    SubmittingMutualRedemption: "Submitting mutual redemption",
    SubmittingMutualRedemptionError: "Encountered error in submitting mutual redemption",
    MutualRedemptionSubmitted: "Mutual redemption submitted",
    ServiceFee: "Service fee",
    ServiceFees: "Service fees",
    Total: "Total",
    AnyHedgeContract: "AnyHedgeContract",
    OtherFees: "Other fees",
    ContractCancelled: "Contract cancelled",
    NotYetFunded: "Not yet funded",
    Submitted: "Submitted",
    SubmitFundingProposal: "Submit funding proposal",
    NotYetSubmitted: "Not yet submitted",
    VerifyValidity: "Verify Validity",
    Resubmit: "Resubmit",
    CancelContract: "Cancel contract",
    CompleteFundingProposal: "Complete Funding Proposal",
    Liquidation: "Liquidation",
    LiquidationPrice: "Liquidation Price",
    PayoutAddressesBig: "Payout Addresses",
    Settlement: "Settlement",
    SettlementTransactionNotFound: "Settlement transaction not found",
    SettlementType: "Settlement Type",
    Start: "Start",
    Summary: "Summary",
    Maturation: "Maturation",
    YouLost: "You lost",
    YouGained: "You gained",
    ContractValueMaintained: "Contract value maintained",
    ContractValueDroppedTo: "Contract value dropped to",
    ContractValueRoseTo: "Contract value rose to",
    ByA: "by a",
    Loss: "loss",
    Gain: "gain",
    MutualRedemption: "Mutual Redemption",
    Signed: "Signed",
    Pending: "Pending",
    Decline: "Decline",
    ProposeAnotherRedemption: "Propose Another Redemption",
    ProposeMutualRedemption: "Propose Mutual Redemption"
  },
  {
    Minute: "minute",
    Hour: "hour",
    Day: "day",
    Week: "week",
    TildeMonth: "~month",
    TildeMonths: "~months",
    TildeYear: "~year",
    TildeYears: "~years",
    SubmittingFundingProposal: "Submitting funding proposal",
    RetrievingAddresses: "Retrieving addresses",
    RetrievingAddressesError: "Encountered error in retrieving addresses",
    CalculatingFundingAmount: "Calculating funding amount",
    FundHedgePosition: "Fund hedge position",
    FundLongPosition: "Fund long position",
    PreparingUTXOAmount: "Prepare UTXO amounting to",
    UserRejected: "User rejected",
    CreatingFundingProposal: "Creating funding proposal",
    CreatingFundingUTXOError: "Encountered error in creating funding UTXO",
    FundingProposalSubmitted: "Funding proposal submitted!",
    SubmittingFundingProposalError: "Error in submitting funding proposal",
    CompletingContractFunding: "Completing contract funding",
    FundingTransactionSubmitted: "Funding transaction submitted!",
    CompletingFundingProposalError: "Error in completing funding proposal",
    ResubmitProposal: "Resubmit funding proposal?",
    SigningMutualRedemptionProposal: "Signing mutual redemption proposal",
    MutualRedemptionSigningError: "Mutual redemption signing error",
    SignMutualRedemption: "Sign mutual redemption",
    CancelProposal: "Cancel proposal",
    DeclineProposal: "Decline proposal",
    SigningMessage: "Signing message",
    SignMessageError: "Unable to sign message",
    CancelMutualRedemptionProposal: "Cancelling mutual redemption proposal",
    DeclineMutualRedemptionProposal: "Declining mutual redemption proposal",
    MutualRedemptionCancelled: "Mutual redemption cancelled",
    MutualRedemptionDeclined: "Mutual redemption declined",
    CancellingProposalError: "Encountered error in cancelling proposal",
    CancellingContract: "Cancelling contract",
    SigningRequest: "Signing request",
    SigningMessageError: "Encountered error in signing message",
    CancellingContractError: "Encountered error in cancelling contract",
    ContractWasCancelled: "Contract was cancelled",
    By: 'by',
    ContractSettled: "Contract has been settled.",
    ContractMaturity: "Contract has reached maturity",
    FundingComplete: "Contract is already funded",
    FundingReady: "Funds are in place but is not yet completed",
    FundingPartial: "Not all parties have submitted funding proposals",
    FundingPending: "Both parties have not submitted funding proposals yet",
    FilterOffersList: "Filter offers list",
    Accepted: "Accepted",
    Agreed: "Agreed",
    ExpiresAt: "Expires at",
    ViewContract: "View contract",
    UpdateExpiry: "Update expiry",
    SetExpiration: "Set expiration",
    RemoveOffer: "Remove offer",
    CurrentTimeError: "Must be after current time",
    UpdatingExpiration: "Updating expiration",
    RemovingExpiration: "Removing expiration",
    ExpirationUpdated: "Expiration updated",
    RemoveHedgePositionOffer: "Remove hedge position offer",
    RemoveHedgePositionOfferDescription: "Removing hedge position offer. Are you sure?",
    RemoveLongPositionOffer: "Remove long position offer",
    RemoveLongPositionOfferDescription: "Removing long position offer. Are you sure?",
    Removing: "Removing",
    RemovingHedgePositionOffer: "Removing hedge position offer",
    RemovingLongPositionOffer: "Removing long position offer",
    Removed: "Removed",
    HedgePositionOfferRemoved: "Hedge position offer removed",
    LongPositionOfferRemoved: "Long position offer removed",
    RemoveHedgePositionError: "Failed to remove hedge position offer",
    RemoveLongPositionError: "Failed to remove long position offer",
    SelectPositionOffer: "Select position offer",
    SpendingTransaction: "Spending transaction",
    VerifyingHedgeFndingProposal: "Verifying hedge funding proposal",
    VerifyingLongFndingProposal: "Verifying long funding proposal",
    InvalidData: "Invalid data",
    DetermineProposalError: "Unable to determine position to verify",
    UsedFundingProposal: "Funding proposal is already used",
    ValidFundingProposal: "Funding proposal valid",
    VerifyFundingProposalError: "Encountered error in verifying funding proposal",
    FundingValidationFailed: "Funding proposal verification failed",
    HedgePositionOffer: "Hedge Position Offer",
    LongPositionOffer: "Long Position Offer",
    HedgePositionOfferCreated: "Hedge position offer created",
    LongPositionOfferCreated: "Long position offer created",
    UnableToFindContract: "Unable to find contract",
    HedgePosition: "Hedge Position",
    LongPosition: "Long Position",
    HedgePositionCreated: "Hedge position created.",
    LongPositionCreated: "Long position created"
  },
  {
    CreateGift: "Create Gift",
    ClaimGift: "Claim Gift",
    GiftsYouCreated: "Gifts you created",
    Claimed: "Claimed",
    Unclaimed: "Unclaimed",
    NoGifts: "No gifts",
    DateCreated: "Date Created",
    Campaign: "Campaign",
    Recovered: "Recovered",
    RecoverGift: "Recover Gift",
    ClaimGift: "Claim Gift",
    RecoveringGift: "Recovering gift...",
    ClaimingGift: "Claiming gift...",
    PasteGiftCodeHere: "Paste gift code here",
    Claim: "Claim",
    Recover: "Recover",
    ClaimGiftCompleted: "Claim gift completed!",
    RecoverGiftCompleted: "Recover gift completed!",
    GiftAlreadyClaimed: "This gift has been claimed! Try another one.",
    CreatingGift: "Creating gift...",
    FieldIsRequired: "Field is required",
    AmountGreaterThanBalance: "Amount is greater than your balance",
    SelectExistingCampaign: "Select existing campaign",
    CampaignName: "Campaign Name",
    MaxAmountPerWallet: "Max Amount Per Wallet",
    CannotBeLowerThanGiftAmount: "This cannot be lower than the gift amount",
    CampaignOptional: "Campaign (optional)",
    CampaignDescription: "You can group together gifts under a campaign where you can set the maximum sum of gifts that a wallet user can claim within the same campaign.",
    SelectCampaign: "Select Campaign",
    Generate: "Generate",
    ScanClaimGift: "Scan to claim the gift",
    ShareGiftLink: "Share gift link",
    CampaignLimitError: "Campaign limit per wallet cannot be greater than the gift amount",
    CreateNewCampaign: "Create New Campaign",
    SeeBasicWalletInfo: "See Basic Wallet Info",
    WalletName: "Wallet Name",
    WalletBalanceCap: "Wallet Balance",
    LoadingWallet: "Loading wallet...",
    ReceiverWarningText1: "First time receiving funds for this asset? Please",
    ReceiverWarningText2: "backup your seed phrase",
    ReceiverWarningText3: "before proceeding.",
    GoBack: "Go back",
    Proceed: "Proceed",
    LegacyAddressWarning: 'You pasted a legacy address. Please make sure that it is a <span class="highlighted-word">BCH deposit address</span>, not a BTC deposit address.',
    WalletBackup: "Wallet Backup",
    SeedPhraseShards: "Seed Phrase Shards"
  }
]

const TEXT_GROUPS = [
  ...words,
  ...phrases.static,
  ...phrases.dynamic,
  ...hongKongSpecific,
  ...shardsBackupTexts,
  ...additional
]

const hardcodedTranslations = {
  'zh-tw': {
    Pin: '密碼',
    ChangePin: '密碼',
    Biometric: '生物認證',
    ShowTokens: '顯示幣種',
    ManageIgnoredTokens: '管理被忽略幣種',
    ChineseTraditional: '中文繁體字',
    Ramp: 'Ramp',
    Sweep: 'Sweep',
    Collectibles: 'NFT',
    Home: '主頁',
    Send: '發送',
    Receive: '收取',
    Apps: '應用程式'
  }
}


const index = 'index.js'
const interpolatedStrRegex = /\{(\w|\p{Script=Han})+\}/gu
const htmlClassRegex = /[“|"](\s|\w|\p{Script=Han})+[”|"]/gu

/*
  check for supported language codes here
  https://github.com/shikar/NODE_GOOGLE_TRANSLATE/blob/master/languages.js
*/
const supportedLangs = [
  'en-us',
  'es',
  'zh-tw',
  'zh-cn',
  'de',
  'ha',
  'pt',

  /* 
    LANGUAGE BRANCH (variations)

    place the unsupported languages here,
    these langs will just be copied from the main language (e.g. es will be copied to es-ar)
    and be translated by real people

    SYNTAX: {branch-language}:{main-language}
  */

  'es-ar:es',
  'pt-br:pt',
]

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
  const toPath = `./${to}/${index}`

  fs.writeFile(
    toPath,
    data,
    (err) => {
      if (err) throw err
    }
  )
}

// used to copy branch languages from their main languages
function copy (from, to) {
  const fromPath = `./${from}/${index}`
  const toPath = `./${to}/${index}`

  fs.copyFile(
    fromPath,
    toPath,
    (err) => {
      if (err) throw err
    }
  )
}

async function sleep (seconds) {
  await new Promise(r => setTimeout(r, seconds * 1000))
}

// get text group label for logging
function getTextGroupLabel (index) {
  const wordsLen = words.length
  const staticLen = phrases.static.length
  const wordsAndStaticLen = staticLen + wordsLen
  const wordsStaticAndDynamicLen = wordsAndStaticLen + phrases.dynamic.length

  if (index < wordsLen) {
    return `words group ${index + 1}`
  } else if (index < wordsAndStaticLen) {
    const groupNo = index - (wordsLen - 1)
    return `static phrases group ${groupNo}`
  } else if (index < wordsStaticAndDynamicLen) {
    const groupNo = index - (wordsAndStaticLen - 1)
    return `dynamic phrases group ${groupNo}`
  } else {
    const groupNo = index - (wordsStaticAndDynamicLen - 1)
    return `other group ${groupNo}`
  }
}

// print out length of texts for verification later after writing to file
function getTotalLines () {
  let sum = 0
  for (const group of TEXT_GROUPS) {
    sum += Object.keys(group).length
  }
  return sum
}


// translate all texts here
(async () => {
  const sum = getTotalLines()
  console.log('Expected no. of translation keys on i18n files: ', sum)
  
  let jsonData = {}

  for (let lang of supportedLangs) {
    await sleep(1)

    if (lang.includes(":")) {
      const [ branchLang, mainLang ] = lang.split(":")
      copy(mainLang, branchLang)
      continue
    }

    let codes = { from: 'en', to: lang }
    if (lang === 'en-us') codes.to = 'en'

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

      // store all the interpolated substring in an object with its corresponding key
      const interpolatedWords = {}
      for (const [key, value] of Object.entries(group)) {
        const interpolatedMatches = value.match(interpolatedStrRegex)
        if (interpolatedMatches !== null) interpolatedWords[key] = interpolatedMatches
      }

      // translate in bulks
      let translatedObj = await translate(group, codes)
      
      // replace the translated interpolation placeholder with the untranslated one
      if (Object.keys(interpolatedWords).length !== 0) {
        const placeholder = '{STRING}'
        for (const [key, value] of Object.entries(translatedObj)) {
          translatedObj[key] = value.replace(interpolatedStrRegex, placeholder)
          for (const interpolatedKey of interpolatedWords[key]) {
            translatedObj[key] = translatedObj[key].replace(placeholder, interpolatedKey)
          }
        }
      }

      // override hardcoded translations
      if (Object.keys(hardcodedTranslations).indexOf(lang) > -1) {
        translatedObj = {
          ...translatedObj,
          ...hardcodedTranslations[lang]
        }
      }

      // place code here to replace any word or capitalization on a phrase or word
      for (const [key, value] of Object.entries(translatedObj)) {
        translatedObj[key] = value
          .replaceAll('bch', 'BCH')
          .replaceAll('utxo', 'UTXO')
          .replaceAll(htmlClassRegex, '"highlighted-word"')
          .replaceAll('<-span', '<span')
      }
      
      // merge the previous and current objects
      Object.assign(jsonData, translatedObj)
      jsonData = orderObj(jsonData)

      // add commented notes
      let strData = '// NOTE: DONT EDIT THIS FILE\n'
      strData += '// UPDATE ON i18n/translate.js and follow steps there to apply changes\n\n'
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
