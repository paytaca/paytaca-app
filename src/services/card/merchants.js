import { backend } from 'src/marketplace/backend';

/**
 * Fetches verified merchants from commercehub storefronts endpoint
 * Filters by user location if coordinates are provided
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of results per page (default: 10)
 * @param {number} params.offset - Offset for pagination (default: 0)
 * @param {Object} params.location - User location coordinates
 * @param {number} params.location.latitude - Latitude
 * @param {number} params.location.longitude - Longitude
 * @param {number} params.radius - Search radius in km (default: 30)
 * @returns {Promise<Object>} Response with results, count, limit, offset
 */
export async function getMerchantList(params = {}) {
  const {
    limit = 10,
    offset = 0,
    location = null,
    radius = 30
  } = params;

  const queryParams = {
    limit,
    offset,
    active: true,
    annotate_is_open_at: new Date().toISOString(),
    ordering: 'in_prelaunch,-is_open',
  };

  // Add distance filter if location coordinates are provided
  if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
    queryParams.distance = btoa(JSON.stringify({
      lat: location.latitude,
      lon: location.longitude,
      radius: radius * 1000 // Convert km to meters
    }));
    queryParams.ordering = [queryParams.ordering, 'distance'].join(',');
  }

  const response = await backend.get('connecta/storefronts/', { params: queryParams });
  
  // Transform storefront data to merchant format
  const merchants = response?.data?.results?.map(storefront => ({
    id: storefront.id,
    name: storefront.name,
    address: storefront.location?.formatted || storefront.address || 'Address not available',
    location: storefront.location,
    isOpen: storefront.is_open,
    inPrelaunch: storefront.in_prelaunch,
    distance: storefront.distance, // Distance in meters from user location
    // Additional storefront data
    imageUrl: storefront.logo_url,
    currency: storefront.currency?.code,
    description: storefront.description,
    // Original storefront data for reference
    storefrontData: storefront
  })) || [];

  return {
    results: merchants,
    count: response?.data?.count || 0,
    limit: response?.data?.limit || limit,
    offset: response?.data?.offset || offset,
    hasMore: (response?.data?.offset || offset) + merchants.length < (response?.data?.count || 0)
  };
}
