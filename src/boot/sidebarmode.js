import Vue from 'vue'

import Sidebar from '../components/Sidebar.vue'

Vue.component('sidebar-mode-toggler', Sidebar)

import { LocalStorage, SessionStorage } from 'quasar'

LocalStorage.set('active-account', false)
