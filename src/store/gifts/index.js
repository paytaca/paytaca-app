import state from './state'
import * as getters from './getters'
import * as mutations from './mutations'
import * as actions from './actions'

export default {
  namespaced: true,
  state: {
    gifts: {},
    qrs: {}
  },
  getters: {
    getGift: (state) => (giftCodeHash) => {
      return state.gifts[giftCodeHash]
    },
    getQr: (state) => (giftCodeHash) => {
      return state.qrs[giftCodeHash]
    },
    getGiftStatus: (state) => (giftCodeHash) => {
      return state.gifts[giftCodeHash]?.status || null
    },
    getGiftShare: (state) => (giftCodeHash) => {
      return state.gifts[giftCodeHash]?.share || null
    }
  },
  mutations: {
    saveGift (state, { giftCodeHash, share, status, amount, address, payload }) {
      state.gifts[giftCodeHash] = {
        share,
        status,
        amount,
        address,
        payload,
        timestamp: Date.now()
      }
    },
    saveQr (state, { giftCodeHash, qr }) {
      state.qrs[giftCodeHash] = qr
    },
    updateGiftStatus (state, { giftCodeHash, status }) {
      if (state.gifts[giftCodeHash]) {
        state.gifts[giftCodeHash].status = status
      }
    }
  },
  actions: {
    saveGift ({ commit }, giftData) {
      commit('saveGift', giftData)
    },
    saveQr ({ commit }, qrData) {
      commit('saveQr', qrData)
    },
    updateGiftStatus ({ commit }, statusData) {
      commit('updateGiftStatus', statusData)
    }
  }
}
