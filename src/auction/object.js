export class LotsList {
  static parse(data) {
    return new LotsList(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.title
   * @param {String} data.description
   * @param {Number|String} data.estimated_amount
   * @param {Number|String} data.threshold_bid
   * @param {Boolean} data.is_sold
   * @param {String|null} data.date_sold
   * @param {Number} data.bidding_decrement
   * @param {Number} data.category_id
   * @param {Number} data.auction_id
   * @param {Array<Object|String>} data.images
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data.id ? Number(data.id) : null;
    this.title = data.title || "Unnamed Lot";
    this.description = data.description || "";
    this.estimated_amount = data.estimated_amount !== undefined ? Number(data.estimated_amount) : 0.00000000;
    this.threshold_bid = data.threshold_bid !== undefined ? Number(data.threshold_bid) : 0.00000000;
    this.is_sold = !!data.is_sold;
    this.date_sold = data.date_sold || null;
    this.bidding_decrement = data.bidding_decrement !== undefined ? Number(data.bidding_decrement) : 1;
    this.category_id = data.category_id || (data.category ? data.category.id : null);
    this.category = data.category || (data.category_id === 1 ? 'Physical' : 'Digital');
    this.auction_id = data.auction_id || (data.auction ? data.auction.id : null);
    this.start_date = data.start_date || null;
    this.end_date = data.end_date || null;
    
    this.images = Array.isArray(data.images) 
      ? data.images.map(img => typeof img === 'object' ? img.image : img) 
      : [];
  }
  
  getFormattedBCH(bch) {
    const numStr = bch.toFixed(8);
    const match = numStr.match(/^(.*?)0*$/);
    const main = match ? match[1] : numStr;
    const zeros = numStr.substring(main.length);
    return { main, zeros, full: numStr };
  }

  getStatus() {
    if (this.is_sold) return { label: 'Sold', color: 'red' };
    
    if (!this.start_date || !this.end_date) return { label: 'Active', color: 'blue' };

    const now = new Date().getTime();
    const start = new Date(this.start_date.replace(' ', 'T')).getTime();
    const end = new Date(this.end_date.replace(' ', 'T')).getTime();

    if (now < start) return { label: 'Upcoming', color: 'orange' };
    if (now >= start && now <= end) return { label: 'Open', color: 'green' };
    
    return { label: 'Closed', color: 'red' };
  }

  getLotStatus(startDate, endDate) {
    if (this.is_sold) return { label: 'Sold', color: 'red' };
    
    if (!startDate || !endDate) return { label: 'Active', color: 'blue' };

    const now = new Date().getTime();
    const start = new Date(startDate.replace(' ', 'T')).getTime();
    const end = new Date(endDate.replace(' ', 'T')).getTime();

    if (now < start) return { label: 'Upcoming', color: 'orange' };
    if (now >= start && now <= end) return { label: 'Open', color: 'green' };
    
    return { label: 'Closed', color: 'red' };
  }
}

export class AuctionList {
  static parse(data) {
    return new AuctionList(data)
  }
  
  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.title
   * @param {String} data.description
   * @param {String} data.start_date
   * @param {String} data.end_date
   * @param {Boolean} data.is_open
   * @param {String|null} data.image
   * @param {String} data.creation_date
   * @param {Number} data.type_id
   * @param {Number} data.user_id
   * @param {Array<Object>} data.lots
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    
    this.id = data.id ? Number(data.id) : null;
    this.title = data.title || "Standard Auction Event";
    this.description = data.description || "";
    this.start_date = data.start_date || null;
    this.end_date = data.end_date || null;
    this.is_open = data.is_open !== undefined ? !!data.is_open : true;
    this.image = data.image || null;
    this.creation_date = data.creation_date || null;
    
    this.type_id = data.type_id || (data.type ? data.type.id : null);
    this.user_id = data.user_id || (data.user ? data.user.id : null);

    if(data.type_id == 1) this.type = "English"
    else this.type = "Dutch"
    
    this.lots = Array.isArray(data.lots)
      ? data.lots.map(lotObj => LotsList.parse(lotObj))
      : [];
  }
  
  getStatus() {
    if (!this.start_date || !this.end_date) {
      return { label: 'Closed', color: 'red' };
    }

    const formatIso = (str) => typeof str === 'string' ? str.replace(' ', 'T') : str

    const nowTime = new Date().getTime();
    const startTime = new Date(formatIso(this.start_date)).getTime()
    const endTime = new Date(formatIso(this.end_date)).getTime()
    
    if (nowTime < startTime) {
      return { label: 'Upcoming', color: 'orange' }
    }
    if (nowTime >= startTime && nowTime <= endTime) {
      return { label: 'Open', color: 'green' }
    }
    
    return { label: 'Closed', color: 'red' }
  }

  getEllipsisInMiddleUserId() {
    if (!this.user_id || this.user_id.length <= 7 + 7) return this.user_id
    
    const start = this.user_id.substring(0, 7)
    const end = this.user_id.substring(this.user_id.length - 7)
    
    return `${start}........${end}`
  }
}