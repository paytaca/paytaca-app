export default function () {
  return {
    listings: [
      {
        id: 1,
        title: "Prime Commercial Lot - Downtown Area",
        location: "Tacloban City, Leyte",
        type: "English",
        startDate: "2026-05-28",
        endDate: "2026-07-01",
      },
      {
        id: 2,
        title: "Heavy Construction Equipment Surplus (Excavators & Trucks)",
        location: "Ormoc City, Leyte",
        type: "Dutch",
        startDate: "2026-06-15",
        endDate: "2026-06-22",
      },
      {
        id: 3,
        title: "Vintage Luxury Watch Collection (Rolex, Omega, Patek)",
        location: "Metro Manila",
        type: "English",
        startDate: "2026-05-01",
        endDate: "2026-05-15",
      },
      {
        id: 4,
        title: "Sealed Container of Mixed Electronic Goods & Laptops",
        location: "Cebu City, Cebu",
        type: "Dutch",
        startDate: "2026-05-25",
        endDate: "2026-06-05",
      },
      {
        id: 5,
        title: "Agricultural Tractors and Milling Machinery",
        location: "Baybay City, Leyte",
        type: "English",
        startDate: "2026-07-10",
        endDate: "2026-07-20",
      }
    ],
    isLoading: false,
    auctionFilters: {
      search: '',
      type: 'All'
    }
  }
}