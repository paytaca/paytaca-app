import { useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
import { computed } from "vue";
import { convertIpfsUrl } from "src/wallet/cashtokens";
import { loadWallet } from "src/wallet";
import { LibauthHDWallet } from "src/wallet/bch-libauth";
import { getWalletByNetwork } from "src/wallet/chipnet";

export function useCauldronValueFormatters() {
  const { t: $t } = useI18n()
  const $q = useQuasar()
  const $store = useStore()

  function formatAmount(amount, decimals) {
    if (!amount) return '0';
    const num = Number(amount) / (10 ** decimals);
    return num.toFixed(decimals > 8 ? 8 : decimals);
  }

  /**
   * @param {Number | String} amount 
   * @param {import("src/wallet/cauldron/tokens").CauldronTokenData} tokenData 
   * @returns 
   */
  function formatTokenAmount(amount, tokenData) {
    if (!amount || !tokenData) return '0';
    const decimals = parseInt(tokenData?.bcmr?.token?.decimals || 0);
    return formatAmount(amount, decimals);
  }

  function formatDate(timestamp) {
    if (!timestamp) return ''
    const dateObj = new Date(timestamp * 1000)
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(dateObj)
  }

  function formatAPY(apy) {
    if (apy === null || apy === undefined || isNaN(apy)) {
      return 'N/A'
    }
    if (apy < 0.01) {
      return '< 0.01%'
    }
    if (apy > 10000) {
      return '> 10,000%'
    }
    return `${apy.toFixed(2)}%`
  }

  function formatAmountChange(change) {
    if (!change) return '0'
    const num = Number(change) / (10 ** 8)
    const sign = num >= 0 ? '+' : ''
    return `${sign}${num.toFixed(8)}`
  }

  /**
   * 
   * @param {Number | String} change 
   * @param {import("src/wallet/cauldron/tokens").CauldronTokenData} tokenData 
   * @returns 
   */
  function formatTokenAmountChange(change, tokenData) {
    if (!change || !tokenData) return '0'
    const decimals = parseInt(tokenData?.bcmr?.token?.decimals || 0)
    const num = Number(change) / (10 ** decimals)
    const sign = num >= 0 ? '+' : ''
    return `${sign}${num.toFixed(decimals > 8 ? 8 : decimals)}`
  }

  function getTokenImage(url) {
    const ipfsUrl = convertIpfsUrl(url);
    if (ipfsUrl.startsWith('https://ipfs.paytaca.com/ipfs')) {
      return ipfsUrl + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN;
    } else {
      return ipfsUrl;
    }
  }

  function onImgError(event) {
    event.target.style.display = 'none';
  }

  function copyTxid(txid) {
    if (!txid) return;
    navigator.clipboard.writeText(txid).then(() => {
      $q.notify({
        color: 'blue-9',
        message: $t('TransactionIdCopied'),
        icon: 'mdi-clipboard-check',
        timeout: 2000
      });
    });
  }

  const isChipnet = computed(() => $store.getters['global/isChipnet'])
  function getAddressExplorerLink(address) {
    if (!address) return
    let url = 'https://explorer.paytaca.com/address/'
    if (isChipnet.value) {
      url = `${process.env.TESTNET_EXPLORER_URL}/address/`
    }
    return url + address
  }


  async function loadWalletForTrade() {
    const walletIndex = $store.getters['global/getWalletIndex']
    const isChipnet = $store.getters['global/isChipnet']
    const wallet = await loadWallet(isChipnet ? 'chipnet' : 'mainnet', walletIndex)
    /** @type {import("src/wallet/bch").BchWallet} */
    const bchWallet = getWalletByNetwork(wallet, 'bch');

    const libuathWallet = new LibauthHDWallet(
      bchWallet.mnemonic,
      bchWallet.derivationPath,
      isChipnet.value ? 'chipnet' : 'mainnet',
    )
    return {bchWallet, libuathWallet}
  }


  return {
    // Value formatters
    formatAmount,
    formatTokenAmount,
    formatDate,
    formatAPY,
    formatAmountChange,
    formatTokenAmountChange,

    // Image handling
    getTokenImage,
    onImgError,

    // UI Utility
    copyTxid,
    getAddressExplorerLink,

    // Wallet loader
    loadWalletForTrade,
  }
}