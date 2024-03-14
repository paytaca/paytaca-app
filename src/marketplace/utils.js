import ago from 's-ago'
import { capitalize } from 'vue'
import { backend } from './backend'

/**
 * @param {Number} value 
 * @param {Object} opts 
 * @param {Number} opts.base change rating value from 1-100 to 1-<base>
 * @param {Number} opts.decimals number of decimals to put
 * @param {Boolean} opts.forceDecimals force appendin zeroes to maintain decimal numbers, this will result in a string
 */
export function roundRating(value, opts={ base: 5, decimals: 1, forceDecimals: true }) {
  const base = parseInt(opts?.base) || 5
  const decimals = parseInt(opts?.decimals) || 2
  const rounded = round(parseFloat(value) * (base / 100), decimals)
  if (opts?.forceDecimals) return rounded.toFixed(decimals)
  return rounded
}

export function round(value, decimals) {
  const multiplier = 10 ** decimals
  return Math.round(Number(value) * multiplier) / multiplier
}

export function lineItemPropertiesToText(data) {
  if (!data) return ''
  return Object.getOwnPropertyNames(data).map(name => {
    return `${name}: ${data[name]}`
  }).join(', ')
}

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


export function formatDuration(durationInSeconds, opts={ roundDecimals: undefined }) {
  const unitOptions = [
    {label: 'second', multiplier: 1,               max: 60 },
    {label: 'minute', multiplier: 60,              max: 3600 },
    {label: 'hour',   multiplier: 3600,            max: 86400 },
    {label: 'day',    multiplier: 86400,           max: 86400 * 10 },
    {label: 'week',   multiplier: 86400 * 7,       max: 86400 * 30 },
    {label: '~month', multiplier: 86400 * 30,      max: 86400 * 30 * 12 },
    {label: '~year',  multiplier: 86400 * 30 * 12, max: Infinity },
  ]
  if (!isFinite(durationInSeconds) || durationInSeconds <= 0) return ''
  const unit = unitOptions.find(unit => durationInSeconds <= unit.max)
  if (!unit) return ''
  
  let durationValue = durationInSeconds/unit.multiplier
  if (Number.isInteger(opts?.roundDecimals)) durationValue = round(durationValue, opts?.roundDecimals)
  let label = unit.label
  if (durationValue > 1) {
    label += 's'
  }
  return `${durationValue} ${label}`
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

/**
 * @param {Object} opts 
 * @param {{ latitude:Number, longitude:Number }} opts.pos1
 * @param {{ latitude:Number, longitude:Number }} opts.pos2
 */
export function aerialDistance(opts) {
  const lat1 = opts?.pos1?.latitude
  const lon1 = opts?.pos1?.longitude
  const lat2 = opts?.pos2?.latitude
  const lon2 = opts?.pos2?.longitude

  const R = 6371000; // Radius of the Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in meters

  return distance;
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