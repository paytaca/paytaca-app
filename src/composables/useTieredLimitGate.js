import { useQuasar } from 'quasar'
import { useStore } from 'vuex'

import UpgradePromptDialog from 'src/components/subscription/UpgradePromptDialog.vue'
import MaxPlanComingSoonDialog from 'src/components/subscription/MaxPlanComingSoonDialog.vue'

/**
 * Centralized tier-aware limit gate.
 *
 * Behavior:
 * - Free tier: show UpgradePromptDialog when limit is reached
 * - Plus tier: show MaxPlanComingSoonDialog when limit is reached
 *
 * Use `useTieredLimitGate()` inside `<script setup>` / setup().
 * For Options API components, use `ensureCanPerformActionWithDeps`.
 *
 * @returns {{ ensureCanPerformAction: (limitType: string, options?: { darkMode?: boolean, forceRefresh?: boolean }) => Promise<boolean> }}
 */
export function useTieredLimitGate () {
  const $q = useQuasar()
  const $store = useStore()

  const ensureCanPerformAction = (limitType, options = {}) => {
    return ensureCanPerformActionWithDeps({ $q, $store }, limitType, options)
  }

  const showLimitDialog = (limitType, options = {}) => {
    return showLimitDialogWithDeps({ $q, $store }, limitType, options)
  }

  return { ensureCanPerformAction, showLimitDialog }
}

/**
 * Options API-friendly gate helper.
 *
 * @param {{ $q: import('quasar').QVueGlobals, $store: import('vuex').Store<any> }} deps
 * @param {string} limitType
 * @param {{ darkMode?: boolean, forceRefresh?: boolean }} [options]
 */
export async function ensureCanPerformActionWithDeps (deps, limitType, options = {}) {
  const { $q, $store } = deps || {}
  const { darkMode = false, forceRefresh = false } = options || {}
  if (!$q || !$store) return true
  if (!limitType) return true

  try {
    await $store.dispatch('subscription/checkSubscriptionStatus', Boolean(forceRefresh))
  } catch (_) {
    // best-effort; fall through to current store state
  }

  const tier = $store.getters['subscription/getSubscriptionTier']
  const canPerform = $store.getters['subscription/canPerformAction']?.(limitType)

  if (canPerform !== false) return true

  if (tier === 'plus') {
    $q.dialog({
      component: MaxPlanComingSoonDialog,
      componentProps: {
        darkMode: Boolean(darkMode),
        limitType
      }
    })
    return false
  }

  $q.dialog({
    component: UpgradePromptDialog,
    componentProps: {
      darkMode: Boolean(darkMode),
      limitType
    }
  })
  return false
}

/**
 * Show the correct tier-aware dialog for an already-known limit breach.
 * Useful for limits whose currentCount is not computed in the subscription store (e.g. favoriteTokens via API).
 *
 * @param {{ $q: import('quasar').QVueGlobals, $store: import('vuex').Store<any> }} deps
 * @param {string} limitType
 * @param {{ darkMode?: boolean, forceRefresh?: boolean }} [options]
 */
export async function showLimitDialogWithDeps (deps, limitType, options = {}) {
  const { $q, $store } = deps || {}
  const { darkMode = false, forceRefresh = false } = options || {}
  if (!$q || !$store) return
  if (!limitType) return

  try {
    await $store.dispatch('subscription/checkSubscriptionStatus', Boolean(forceRefresh))
  } catch (_) {
    // best-effort
  }

  const tier = $store.getters['subscription/getSubscriptionTier']
  if (tier === 'plus') {
    $q.dialog({
      component: MaxPlanComingSoonDialog,
      componentProps: {
        darkMode: Boolean(darkMode),
        limitType
      }
    })
    return
  }

  $q.dialog({
    component: UpgradePromptDialog,
    componentProps: {
      darkMode: Boolean(darkMode),
      limitType
    }
  })
}

