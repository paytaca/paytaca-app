import { getWalletHash } from 'src/utils/wallet-storage'

import axios from 'axios'

// const WATCHTOWER_CASH_URL = 
//   process.env.MAINNET_WATCHTOWER_BASE_URL || 'https://watchtower.cash/api'
const WATCHTOWER_CASH_URL = 'http://localhost:8000/api'
const ADDRESS_BOOK_URL = axios.create({ baseURL: `${WATCHTOWER_CASH_URL}/address-book/` })
const ADDRESSES_URL = axios.create({ baseURL: `${WATCHTOWER_CASH_URL}/address-book-address/` })

export async function getWalletAddressBook () {
  return await ADDRESS_BOOK_URL
    .get(`wallet/${getWalletHash()}/`)
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return []
    })
    .catch(error => {
      console.error('An error occured while fetching wallet address book data: ', error)
      return []
    })
}

export async function addNewRecord (data) {
  return await ADDRESS_BOOK_URL
    .post('', data)
    .then(resp => {
      if (resp.status === 201) return resp.data
      else return -1
    })
    .catch(error => {
      console.error('An error occured while creating new record: ', error)
      return -1
    })
}

export async function getRecord (id) {
  return await ADDRESS_BOOK_URL
    .get(`/${id}/`)
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return null
    })
    .catch(error => {
      console.error('An error occurred while fetching record: ', error)
      return null
    })
}

export async function patchRecord (id, data) {
  return await ADDRESS_BOOK_URL
    .patch(`/${id}/`, data)
    .then(resp => {
      return resp.status === 200
    })
    .catch(error => {
      console.error('An error occured while patching record: ', error)
      return false
    })
}

// export async function deleteRecord(id)

export async function addAddress (data) {
  return await ADDRESSES_URL
    .post('', data)
    .then(resp => {
      return resp.status === 201
    })
    .catch(error => {
      console.error('An error occurred while adding new address: ', error)
      return false
    })
}

export async function patchAddress (id, data) {
  return await ADDRESSES_URL
    .patch(`/${id}/`, data)
    .then(resp => {
      return resp.status === 200
    })
    .catch(error => {
      console.error('An error occurred while updating an address: ', error)
      return false
    })
}

export async function deleteAddress (id) {
  return await ADDRESSES_URL
    .delete(`/${id}/`)
    .then(resp => {
      return resp.status === 204
    })
    .catch(error => {
      console.error('An error occurred while deleting an address: ', error)
      return false
    })
}