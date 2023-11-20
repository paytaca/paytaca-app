import ago from 's-ago'
import { capitalize } from 'vue'
import { backend } from './backend'

/**
 * @typedef {'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'on_delivery' | 'delivered' | 'completed' | 'cancelled'} OrderStatus
 */

/**
 * @param {OrderStatus} value
 */
export function formatOrderStatus(value) {
  if (typeof value !== 'string') return ''

  return capitalize(value.replaceAll('_', ' '))
}

/**
 * 
 * @param {OrderStatus} value 
 */
export function parseOrderStatusColor(value) {
  switch (value) {
    case 'pending':
      return 'amber'
    case 'confirmed':
      return 'blue'
    case 'preparing':
      return 'amber-7'
    case 'ready_for_pickup':
      return 'amber-8'
    case 'on_delivery':
      return 'green'
    case 'delivered':
      return 'green-7'
    case 'completed':
      return 'green-8'
    case 'cancelled':
      return 'red'
    default:
      return undefined
  }
}


/**
 * @param {Date} value 
 */
export function formatDateRelative(value) {
  if (!value?.getDate?.()) value = new Date(value)
  return ago(value)
}

/**
 * @param {Date | String | Number} timestamp 
 */
export function formatTimestampToText(timestamp) {
  const dateObj = new Date(timestamp)
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(dateObj)
}

/**
 * @param {Date} date 
 */
export function getTimezoneOffsetString(date) {
  const offsetMinutes = date.getTimezoneOffset();
  const offsetHours = -Math.floor(offsetMinutes / 60);
  const offsetMinutesAbs = Math.abs(offsetMinutes % 60);
  const prefix = offsetHours >= 0 ? '+' : ''
  return `${prefix}${offsetHours.toString().padStart(2, '0')}:${offsetMinutesAbs.toString().padStart(2, '0')}`;
}

/**
 * @param {Date} date 
 */
export function getISOWithTimezone(date) {
  const timezoneOffsetString = getTimezoneOffsetString(date);
  const translatedDate = new Date(date.setMinutes(date.getMinutes() - date.getTimezoneOffset()))
  const isoString = translatedDate.toISOString();


  return `${isoString.substring(0, isoString.length - 1)}${timezoneOffsetString}`;
}

export function parsePaymentStatusColor(value) {
  switch(value) {
    case 'paid':
      return 'green'
    case 'partially_paid':
    case 'payment_in_escrow':
    case 'partial_payment_in_escrow':
      return 'cyan'
    case 'payment_pending':
      return 'amber'
    default:
      return undefined
  }
}


export const errorParser = {
  toArray(value) {
    if (Array.isArray(value)) return value
    if (value?.detail) return [value?.detail]
    if (value) return [value]
    return []
  },
  firstElementOrValue(array=[]){
    let data = Array.isArray(array) ? array[0] : array
    if (data?.detail) return data?.detail
    return data
  },
}

export function reverseGeocode(opts = { lat: null, lng: null, syncToForm: false}) {
  const params = {
    lat: opts?.lat,
    lon: opts?.lng,
    format: 'json',
  }

  return backend.get(`https://nominatim.openstreetmap.org/reverse`, { params })
    .then(response => {
      const result = response?.data?.address
      const address1 = [
        result?.amenity || result?.shop || '',
        result?.village || result?.neighbourhood || result?.suburb || '',
      ].filter(Boolean).join(', ')

      const data = {
        address1: address1,
        address2: '',
        street: result?.road,
        city: result?.city,
        state: result?.state || result?.province || '', // most results have returned none so far
        country: result?.country || '',
        latitude: parseFloat(params.lat),
        longitude: parseFloat(params.lon),
      }
      if (opts?.syncToForm) Object.assign(formData.value.defaultLocation, data)
      return data
    })
}