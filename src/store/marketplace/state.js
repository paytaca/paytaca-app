export const DEVICE_LOCATION_ID_CONST = 'DEVICE_LOCATION_ID'

export default function () {
  return {
    shopListOpts: {
      radius: 30, // kilometers
      deliveryType: '',
    },
    customerData: {
      id: 0,
      ref: '',
      first_name: '',
      last_name: '',
      default_location: {
        id: 0,
        name: '',
        address1: '', address2: '',
        street: '', city: '', state: '',
        country: '', zip_code: '',
        longitude: '', latitude: '',
      },
      paytaca_wallet: {
        wallet_hash: '',
        verifying_pubkey: '',
        verifying_pubkey_index: 0,
      },
    },

    selectedSessionLocationId: DEVICE_LOCATION_ID_CONST,
    DEVICE_LOCATION_ID: DEVICE_LOCATION_ID_CONST,
    location: {
      timestamp: 0,
      address1: '', address2: '',
      street: '', city: '', state: '',
      country: '', zip_code: '',
      latitude: NaN, longitude: NaN,
    },
    customerLocations: [].map(() => {
      return {
        id: 0,
        address1: '', address2: '',
        street: '', city: '', state: '',
        country: '', zip_code: '',
        longitude: '', latitude: '',
      }
    }),

    activeStorefrontId: 0,
    activeCartId: null,

    storefronts: [].map(() => {
      return {
        id: 0,
        active: false,
        shop_id: 0,
        image_url: '',
        name: '',
        currency: { code: '', symbol: '' },
        delivery_types: [],
        location: {
          id: 0,
          address1: '', address2: '',
          street: '', city: '', state: '',
          country: '', zip_code: '',
          longitude: '', latitude: '',
        },
        orders_review_summary: {
          count: 0, average_rating: 0,
        }
      }
    }),

    carts: [].map(() => {
      return {
        id: 0,
        order_id: 0,
        checkout_id: 0,
        storefront_id: 0,
        require_cutlery: false,
        customer: {
          id: '',
          ref: '',
          first_name: '',
          last_name: '',
        },
        cutlery_subtotal: 0,
        subtotal: 0,
        markup_subtotal: 0,
        items: [].map(() => {
          return {
            quantity: 0,
            variant: {
              id: 0,
              product: { id: 0, name: '', image_url: '' },
              name: '',
              code: '',
              price: '',
              image_url: '',
              total_stocks: 0,
              expired_stocks: 0,
            },
            properties: [].map(() => {
              return { schema: {}, data: {} }
            })[0],
          }
        })
      }
    })
  }
}
