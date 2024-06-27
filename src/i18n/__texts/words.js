/**
 * NOTE: separate text objects if it gets too big in size
 * bec the translator has a limit (unspecified in docs)
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
    Category: "Category",
    Outputs: "Outputs",
    Token: "Token",
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
    Created: "Created",
    Currency: "Currency",
    Date: "Date",
    URL: "URL",
    Dismiss: "Dismiss",
    Data: "Data",
    Invoice: "Invoice",
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
    Redirecting: "Redirecting",
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
    Bytecode: "Bytecode",
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
  },
  {
      Type: "Type",
      Refund: "Refund",
      Arbitrary: "Arbitrary",
      Total: "Total",
      Submitted: "Submitted",
      Resubmit: "Resubmit",
      Liquidation: "Liquidation",
      Settlement: "Settlement",
      Start: "Start",
      Summary: "Summary",
      Maturation: "Maturation",
      Loss: "loss",
      Gain: "gain",
      Signed: "Signed",
      Pending: "Pending",
      Decline: "Decline",
      Minute: "minute",
      Hour: "hour",
      Day: "day",
      Week: "week",
      Processing: "Processing",
      Sandbox: "Sandbox",
      TildeMonth: "~month",
      TildeMonths: "~months",
      TildeYear: "~year",
      TildeYears: "~years",
      By: 'by',
      Accepted: "Accepted",
      Agreed: "Agreed",
      Removing: "Removing",
      Removed: "Removed",
      Claim: "Claim",
      Generate: "Generate",
      Proceed: "Proceed",
      Recover: "Recover",
      Claimed: "Claimed",
      Unclaimed: "Unclaimed",
      Campaign: "Campaign",
      Recovered: "Recovered",
      Ago: "ago",
      Seconds: "seconds",
      Second: "second",
      Allowance: "Allowance",
      Range: "Range",
      Monthly: "Monthly",
      Daily: "Daily",
      Filter: "Filter",
      OK: "OK",
      Properties: "Properties",
      BranchSmall: "branch",
      Branches: "branches",
      Stabilize: "Stabilize",
      Leverage: "Leverage",
      Funding: "Funding",
      Contract: "Contract",
      Fees: "Fees",
      Premium: "Premium",
      Units: "units",
      Session: "Session",
      Method: "Method",
      Chain: "Chain",
      Requests: "Requests",
      Topic: "Topic",
      Connecting: "Connecting",
      Minutes: "minutes",
      Hours: "hours",
      Days: "days",
      Weeks: "weeks",
      Months: "months",
      Confirm: "Confirm",
      Offer: "offer",
      Warning: "Warning",
      Yes: "YES",
      No: "NO",
      To: "to",
      Recipient: "Recipient",
      Points: "Points",
      DEEM: "DEEM",
      Theme: "Theme",
      Default: "Default",
      Options: 'Options',
      Quantity: 'Quantity',
      Chat: 'Chat',
      Attachment: 'Attachment',
      Save: 'Save',
      Addresses: 'Addresses',
      Delete: 'Delete',
      Escrow: 'Escrow',
      Recipient: 'Recipient',
      None: 'None',
      Payments: 'Payments',
      Call: 'Call',
      Mute: 'Mute',
      Unmute: 'Unmute',
      HangUp: 'Hang-up',
      Customer: 'Customer',
      Delivery: 'Delivery',
      Item: 'Item',
      Qty: 'Qty',
      Price: 'Price',
      Subtotal: 'Subtotal',
      Markup: 'Markup',
      Okay: 'Okay',
      Unavailable: 'Unavailable',
      Available: 'Available',
  },
  {
    Resolved: 'Resolved',
    Edit: 'Edit',
    Dispute: 'Dispute',
    Issue: 'Issue',
    Issues: 'Issues',
    Addons: 'Addons',
    Review: 'Review',
    Reviews: 'Reviews',
    Action: 'Action',
    Txid: 'Txid',
    Status: 'Status',
    Release: 'Release',
    Gift: 'Gift',
    Arbiter: 'Arbiter',
    SELLER: 'SELLER',
    BUYER: 'BUYER',
    Ads: 'Ads',
    Orders: 'Orders',
    Profile: 'Profile',
    REVIEWS: 'REVIEWS',
    ADS: 'ADS',
    Limit: 'Limit',
    Limits: 'Limits',
    Released: 'Released',
    Canceled: 'Canceled',
    Ongoing: 'Ongoing',
    Completed: 'Completed',
    Appealable: 'Appealable',
    APPEAL: 'APPEAL',
    BUY: 'BUY',
    SELL: 'SELL',
    Fixed: 'Fixed',
    Floating: 'Floating',
    Loading: 'Loading',
    Minimum: 'Minimum',
    Maximum: 'Maximum',
    Public: 'Public',
    Next: 'Next',
    Reasons: 'Reasons',
    You: 'You',
    Ownership: 'Ownership',
    Reset: 'Reset',
    Ascending: 'Ascending',
    Descending: 'Descending',
    Escrowed: 'Escrowed',
    Paid: 'Paid',
    Appealed: 'Appealed',
    Refunded: 'Refunded',
    Test: 'Test',
    Chats: 'Chats',
    Unread: 'Unread',
    Fee: 'Fee',
    Timestamp: 'Timestamp',
    Signer: 'Signer',
    Origin: 'Origin',
    Message: 'Message',
    Inputs: 'Inputs',
    Outputs: 'Outputs',
    Function: 'Function',
    Token: 'Token',
    Locate: 'Locate',
    Active: 'Active',
    Invoice: 'Invoice',
    Payment: 'Payment',
    URL: 'URL',
    Created: 'Created',
    Expires: 'Expires',
    BCH: 'BCH',
  },
]

module.exports = words
