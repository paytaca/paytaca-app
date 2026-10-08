import state from './state'
import * as getters from './getters'
import * as mutations from './mutations'
import * as actions from './actions'
import * as mlsMutations from './mls-mutations'
import * as mlsActions from './mls-actions'

export default {
  namespaced: true,
  state,
  getters,
  mutations: { ...mutations, ...mlsMutations },
  actions: { ...actions, ...mlsActions },
}
