export default function () {
  return {
    activeStorefrontId: 0,
    activeCartId: null,

    storefronts: [].map(() => {
      return {
        id: 0,
        shop_id: 0,
        image_url: '',
        name: '',
        currency: { code: '', symbol: '' },
        location: {
          id: 0,
          address1: '', address2: '',
          street: '', city: '', state: '',
          country: '', zip_code: '',
          longitude: '', latitude: '',
        }
      }
    }),

    carts: [].map(() => {
      return {
        id: 0,
        order_id: 0,
        storefront_id: 0,
        customer: {
          id: '',
          ref: '',
          first_name: '',
          last_name: '',
        },
        subtotal: 0,
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
            }
          }
        })
      }
    })
  }
}
