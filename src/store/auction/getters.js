export function processedItems(state) {
  const currentListings = state.listings || []
  const activeTypeFilter = (state.auctionType || 'All').toLowerCase()

  if (activeTypeFilter === 'all') {
    return currentListings
  }
  
  return currentListings.filter(item => {
    let typeLabel = ''
    
    if (item.raw?.type_id?.type) {
      typeLabel = item.raw.type_id.type
    } else if (item.raw?.type?.type) {
      typeLabel = item.raw.type.type
    } else {
      const typeId = Number(item.type_id || item.raw?.type_id)
      if (typeId === 1) typeLabel = 'English'
      if (typeId === 2) typeLabel = 'Dutch'
    }

    return typeLabel.toLowerCase() === activeTypeFilter
  })
}

// const tempListings = [
//   {
//     id: 1,
//     title: "Prime Commercial Lot - Downtown Area",
//     location: "Tacloban City, Leyte",
//     type: "English",
//     startDate: "2026-05-28 08:00",
//     endDate: "2026-07-01 17:00",
//     description: "Strategic commercial property location perfect for massive retail developments.",
//     isOpen: true,
//     lots: [
//       {
//         id: 101,
//         title: "Corner Lot Section A",
//         category: "Physical",
//         description: "Main road facing corner lot with premium visibility.",
//         estimatedAmt: 12.50000000,
//         thresholdBid: 9.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 102,
//         title: "Interior Lot Section B",
//         category: "Physical",
//         description: "Adjacent interior lot optimal for secondary parking structures.",
//         estimatedAmt: 8.20000000,
//         thresholdBid: 6.10000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 103,
//         title: "Digital Surveying Maps & Architectural Drafts",
//         category: "Digital",
//         description: "Complete localized high-resolution CAD files, zoning files, and structural 3D blueprints.",
//         estimatedAmt: 1.20000000,
//         thresholdBid: 0.85000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 2,
//     title: "Heavy Construction Equipment Surplus",
//     location: "Ormoc City, Leyte",
//     type: "Dutch",
//     startDate: "2026-06-15 08:00",
//     endDate: "2026-06-22 17:00",
//     description: "Liquidation sale of fleet operations machinery in optimal working condition.",
//     isOpen: true,
//     lots: [
//       {
//         id: 201,
//         title: "Caterpillar 320D Hydraulic Excavator",
//         category: "Physical",
//         description: "Operational hours: 4,500. Full service log history available.",
//         estimatedAmt: 28.12500000,
//         thresholdBid: 22.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 202,
//         title: "Heavy Duty 10-Wheeler Dump Truck",
//         category: "Physical",
//         description: "2021 fleet model with reinforced steel box bed liner.",
//         estimatedAmt: 17.00000000,
//         thresholdBid: 14.50000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 203,
//         title: "Komatsu D65EX Bulldozer",
//         category: "Physical",
//         description: "Equipped with semi-U tilt dozer blade and single shank ripper setup.",
//         estimatedAmt: 32.40000000,
//         thresholdBid: 26.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 204,
//         title: "Proprietary Fleet Management Tracking Software Key",
//         category: "Digital",
//         description: "Lifetime standalone administrative enterprise package subscription license for tracking metrics.",
//         estimatedAmt: 2.50000000,
//         thresholdBid: 1.80000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 3,
//     title: "Vintage Luxury Watch Collection",
//     location: "Metro Manila",
//     type: "English",
//     startDate: "2026-05-01 08:00",
//     endDate: "2026-05-15 17:00",
//     description: "Rare pristine historical collection pieces featuring original box matching paperwork.",
//     isOpen: false,
//     lots: [
//       {
//         id: 301,
//         title: "1968 Rolex Cosmograph Daytona Ref. 6239",
//         category: "Physical",
//         description: "Exotic Paul Newman dial in original unpolished condition.",
//         estimatedAmt: 35.75000000,
//         thresholdBid: 30.00000000,
//         isSold: true,
//         dateSold: "2026-05-15 14:32:00"
//       },
//       {
//         id: 302,
//         title: "Omega Speedmaster Professional Caliber 321",
//         category: "Physical",
//         description: "Vintage chronograph variant featuring verified historic step dial design.",
//         estimatedAmt: 4.80000000,
//         thresholdBid: 3.50000000,
//         isSold: true,
//         dateSold: "2026-05-14 11:15:00"
//       },
//       {
//         id: 303,
//         title: "Patek Philippe Calatrava Ref. 3919",
//         category: "Physical",
//         description: "Classic yellow gold dress watch containing signature Clous de Paris bezel details.",
//         estimatedAmt: 11.20000000,
//         thresholdBid: 9.00000000,
//         isSold: true,
//         dateSold: "2026-05-15 17:48:00"
//       },
//       {
//         id: 304,
//         title: "High-Res Macro Photography 1-of-1 Digital Ownership Rights",
//         category: "Digital",
//         description: "Full master rights to production grade digital photography archive assets detailing watch movements.",
//         estimatedAmt: 0.95000000,
//         thresholdBid: 0.60000000,
//         isSold: true,
//         dateSold: "2026-05-15 12:04:00"
//       }
//     ]
//   },
//   {
//     id: 4,
//     title: "Sealed Container of Mixed Electronic Goods",
//     location: "Cebu City, Cebu",
//     type: "Dutch",
//     startDate: "2026-05-25 08:00",
//     endDate: "2026-06-05 17:00",
//     description: "Bulk factory returns containing high-tier consumer electronics, laptops, and displays.",
//     isOpen: true,
//     lots: [
//       {
//         id: 401,
//         title: "Pallet of 30x Core-i7 Business Laptops",
//         category: "Digital",
//         description: "Factory overstock, factory sealed inside anti-static wraps.",
//         estimatedAmt: 8.20000000,
//         thresholdBid: 6.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 402,
//         title: "Bulk Crate of Mixed UltraWide IPS Monitors",
//         category: "Digital",
//         description: "45 assorted corporate surplus high-resolution displays calibrated for workflow applications.",
//         estimatedAmt: 5.15000000,
//         thresholdBid: 3.80000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 403,
//         title: "Heavy Duty Custom Server Rack Cabinet Frame",
//         category: "Physical",
//         description: "Steel execution infrastructure 42U containment structure equipped with internal variable cooling blocks.",
//         estimatedAmt: 1.50000000,
//         thresholdBid: 1.10000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 5,
//     title: "Agricultural Tractors and Milling Machinery",
//     location: "Baybay City, Leyte",
//     type: "English",
//     startDate: "2026-07-10 08:00",
//     endDate: "2026-07-20 17:00",
//     description: "Industrial farming equipment optimized for high-yield grain operations.",
//     isOpen: true,
//     lots: [
//       {
//         id: 501,
//         title: "Kubota L5018 Four-Wheel Drive Tractor",
//         category: "Physical",
//         description: "50HP setup including rotary tiller attach accessory pack.",
//         estimatedAmt: 11.40000000,
//         thresholdBid: 9.25000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 502,
//         title: "Rice Milling Station Machine Set",
//         category: "Physical",
//         description: "Automated husker, whitener, and color grader apparatus handling two tons hourly capacity.",
//         estimatedAmt: 14.30000000,
//         thresholdBid: 11.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 503,
//         title: "Automated Soil Analysis Software Suite",
//         category: "Digital",
//         description: "Enterprise software license key managing mapping grids and real-time yield metric evaluation charts.",
//         estimatedAmt: 0.80000000,
//         thresholdBid: 0.55000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 6,
//     title: "High-End Corporate Office Assets Liquidation",
//     location: "Davao City, Davao del Sur",
//     type: "English",
//     startDate: "2026-06-01 08:00",
//     endDate: "2026-06-12 17:00",
//     description: "Premium ergonomic furniture, executive desks, and presentation hardware from a tech headquarters.",
//     isOpen: true,
//     lots: [
//       {
//         id: 601,
//         title: "Herman Miller Aeron Chairs (Set of 10)",
//         category: "Physical",
//         description: "Size B, fully adjustable armrests, posturefit carbon weave mesh setup.",
//         estimatedAmt: 3.10000000,
//         thresholdBid: 2.40000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 602,
//         title: "Solid Walnut Boardroom Table Assembly",
//         category: "Physical",
//         description: "12-foot custom polished natural timber finish equipped with centralized structural conduit tracks.",
//         estimatedAmt: 2.20000000,
//         thresholdBid: 1.60000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 603,
//         title: "Corporate UX/UI Digital Asset Libraries",
//         category: "Digital",
//         description: "Complete structured raw library components including component kits, icons, layout wireframes, and design source files.",
//         estimatedAmt: 1.40000000,
//         thresholdBid: 1.00000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 7,
//     title: "Commercial Fishing Vessel Equipment & Spares",
//     location: "General Santos City",
//     type: "Dutch",
//     startDate: "2026-06-20 08:00",
//     endDate: "2026-06-30 17:00",
//     description: "Deep sea maritime components, navigation arrays, and heavy duty industrial freezing storage components.",
//     isOpen: true,
//     lots: [
//       {
//         id: 701,
//         title: "Furuno Commercial Marine Radar System",
//         category: "Digital",
//         description: "High-accuracy X-band tracking unit with 12kW output power and antenna array.",
//         estimatedAmt: 6.80000000,
//         thresholdBid: 5.20000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 702,
//         title: "Marine Diesel Engine Generator Set",
//         category: "Physical",
//         description: "Heavy duty auxiliary power supply plant running at 45kW output capacity.",
//         estimatedAmt: 14.50000000,
//         thresholdBid: 11.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 703,
//         title: "Commercial Heavy-Duty Fishing Net Array",
//         category: "Physical",
//         description: "Reinforced deep-sea trawling gear arrays with high-tensile structural grade support components.",
//         estimatedAmt: 3.20000000,
//         thresholdBid: 2.50000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 8,
//     title: "Sovereign Gold and Rare Numismatic Collection",
//     location: "Iloilo City, Iloilo",
//     type: "English",
//     startDate: "2026-05-10 08:00",
//     endDate: "2026-05-24 17:00",
//     description: "Precious metals portfolio assets including authenticated gold bullion pieces and historic regional coins.",
//     isOpen: false,
//     lots: [
//       {
//         id: 801,
//         title: "Fine Gold Bullion Bars 1oz (Lot of 5)",
//         category: "Physical",
//         description: "999.9 pure certified investment grade assay stamped units.",
//         estimatedAmt: 18.45000000,
//         thresholdBid: 16.00000000,
//         isSold: true,
//         dateSold: "2026-05-24 19:55:00"
//       },
//       {
//         id: 802,
//         title: "Spanish Colonial Silver Real Coins",
//         category: "Physical",
//         description: "Collection of 12 historical silver pieces excavated from localized shipwreck zones.",
//         estimatedAmt: 2.10000000,
//         thresholdBid: 1.55000000,
//         isSold: true,
//         dateSold: "2026-05-23 15:40:00"
//       },
//       {
//         id: 803,
//         title: "Authenticated Digital Provenance Certificates",
//         category: "Digital",
//         description: "Cryptographically secured legal audit chains and verification records confirming collection sequence origins.",
//         estimatedAmt: 0.50000000,
//         thresholdBid: 0.30000000,
//         isSold: true,
//         dateSold: "2026-05-24 18:12:00"
//       }
//     ]
//   },
//   {
//     id: 9,
//     title: "Renewable Energy Solar Microgrid Components",
//     location: "Zamboanga City",
//     type: "Dutch",
//     startDate: "2026-07-01 08:00",
//     endDate: "2026-07-15 17:00",
//     description: "High-capacity distribution infrastructure including high-efficiency cells and storage setups.",
//     isOpen: true,
//     lots: [
//       {
//         id: 901,
//         title: "Monocrystalline Solar Panels 450W (Pallet of 40)",
//         category: "Physical",
//         description: "Tier 1 high efficiency photostatic solar cell panel architecture bundles.",
//         estimatedAmt: 4.90000000,
//         thresholdBid: 3.75000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 902,
//         title: "Industrial LiFePO4 Battery Bank 48V",
//         category: "Physical",
//         description: "Lithium iron phosphate storage matrix outputting 200Ah system capacity with smart BMS modules.",
//         estimatedAmt: 7.20000000,
//         thresholdBid: 5.80000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 903,
//         title: "Three-Phase Hybrid Solar Inverter 15kW",
//         category: "Digital",
//         description: "Dual MPPT control module supporting clean off-grid utility bypass integrations.",
//         estimatedAmt: 3.40000000,
//         thresholdBid: 2.60000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 10,
//     title: "Industrial Warehousing and Material Logistics Auction",
//     location: "Cagayan de Oro, Misamis Oriental",
//     type: "English",
//     startDate: "2026-06-10 08:00",
//     endDate: "2026-06-25 17:00",
//     description: "Comprehensive infrastructure rollout inventory including material logistics tools and heavy storage solutions.",
//     isOpen: true,
//     lots: [
//       {
//         id: 1001,
//         title: "Toyota 2.5-Ton Electric Forklift Truck",
//         category: "Physical",
//         description: "Three-stage mast setup with 4.5m max lift height. Charger unit included.",
//         estimatedAmt: 15.80000000,
//         thresholdBid: 12.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1002,
//         title: "Heavy Duty Industrial Pallet Racking Bays",
//         category: "Physical",
//         description: "24 interconnecting steel column uprights handling 3-ton capacity load spans.",
//         estimatedAmt: 2.95000000,
//         thresholdBid: 2.10000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1003,
//         title: "Digital Platform Weighing Scale 5-Ton",
//         category: "Digital",
//         description: "Reinforced steel checkered plate deck platform running highly accurate localized load cell modules.",
//         estimatedAmt: 1.40000000,
//         thresholdBid: 0.95000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1004,
//         title: "Semi-Automatic Pallet Stretch Wrapper Machine",
//         category: "Physical",
//         description: "Rotary turntable system with automated height photo-eye sensor detection packages.",
//         estimatedAmt: 4.60000000,
//         thresholdBid: 3.40000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1005,
//         title: "Hydraulic Hand Pallet Jacks (Set of 5)",
//         category: "Physical",
//         description: "Heavy duty steel construction running reinforced polyurethane tandem wheels.",
//         estimatedAmt: 0.85000000,
//         thresholdBid: 0.60000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 11,
//     title: "High-Performance Data Center Networking Gear",
//     location: "Makati City, Metro Manila",
//     type: "English",
//     startDate: "2026-08-01 08:00",
//     endDate: "2026-08-14 17:00",
//     description: "Enterprise level rack switches, optical transceivers, and specialized networking appliances.",
//     isOpen: true,
//     lots: [
//       {
//         id: 1101,
//         title: "Cisco Nexus 93180YC-FX Core Switch",
//         category: "Physical",
//         description: "48 port multi-gigabit top-of-rack network architecture core unit.",
//         estimatedAmt: 9.50000000,
//         thresholdBid: 7.80000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1102,
//         title: "Fortinet FortiGate 100F Network Firewall",
//         category: "Physical",
//         description: "Next-generation security gateway appliance complete with original rack ears.",
//         estimatedAmt: 3.10000000,
//         thresholdBid: 2.45000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1103,
//         title: "Enterprise Core Router Firmware Source Files",
//         category: "Digital",
//         description: "Legacy operating system customization source data and compiled binary libraries code.",
//         estimatedAmt: 14.00000000,
//         thresholdBid: 11.20000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1104,
//         title: "Fiber Optic Transceiver Module Bundle (x50)",
//         category: "Physical",
//         description: "10G SFP+ short range optical connectivity connectors, individual custom casing slots.",
//         estimatedAmt: 1.80000000,
//         thresholdBid: 1.30000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 12,
//     title: "Fine Art and Contemporary Masterpieces",
//     location: "Baguio City, Benguet",
//     type: "English",
//     startDate: "2026-07-15 08:00",
//     endDate: "2026-08-05 17:00",
//     description: "Original signed oil paintings, custom canvas prints, and contemporary sculpture assemblies.",
//     isOpen: true,
//     lots: [
//       {
//         id: 1201,
//         title: "Original Textured Oil Painting on Canvas",
//         category: "Physical",
//         description: "Abstract expressionism style composition signed by artist, dimensions 4ft x 4ft.",
//         estimatedAmt: 5.40000000,
//         thresholdBid: 4.10000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1202,
//         title: "High-Definition Digital Art Master TIFF Assets",
//         category: "Digital",
//         description: "Ultra high fidelity 600DPI source digital scan file including commercial token creation rights.",
//         estimatedAmt: 2.20000000,
//         thresholdBid: 1.65000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 13,
//     title: "Commercial Printing and Packaging Machinery",
//     location: "Mandaue City, Cebu",
//     type: "Dutch",
//     startDate: "2026-08-20 08:00",
//     endDate: "2026-08-30 17:00",
//     description: "High capacity multi-color printing plants, industrial die cutting blocks, and boxing assets.",
//     isOpen: true,
//     lots: [
//       {
//         id: 1301,
//         title: "Heidelberg Speedmaster 4-Color Offset Press",
//         category: "Physical",
//         description: "High volume production model with automatic plate configuration tracks.",
//         estimatedAmt: 42.00000000,
//         thresholdBid: 35.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1302,
//         title: "Automated Box Die-Cutting Machine Station",
//         category: "Physical",
//         description: "Heavy duty pneumatic press processing 5,000 cardboard sheets per hour.",
//         estimatedAmt: 11.30000000,
//         thresholdBid: 8.90000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1303,
//         title: "Pre-Flight Vector Layout Formatting Automation Macros",
//         category: "Digital",
//         description: "Custom software actions pipeline scripts optimized for manufacturing workflow configurations.",
//         estimatedAmt: 0.75000000,
//         thresholdBid: 0.50000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 14,
//     title: "High-Tier Audio Production Studio Equipment",
//     location: "Quezon City, Metro Manila",
//     type: "English",
//     startDate: "2026-05-12 08:00",
//     endDate: "2026-05-20 17:00",
//     description: "Premium analog mixing consoles, classic vocal microphones, and outboard signal processors.",
//     isOpen: false,
//     lots: [
//       {
//         id: 1401,
//         title: "Solid State Logic AWS 924 Mixing Console",
//         category: "Physical",
//         description: "24 channel analog console with integrated workstation control protocols.",
//         estimatedAmt: 22.50000000,
//         thresholdBid: 19.00000000,
//         isSold: true,
//         dateSold: "2026-05-20 16:45:11"
//       },
//       {
//         id: 1402,
//         title: "Neumann U87 Ai Condenser Microphone Studio Kit",
//         category: "Physical",
//         description: "Prand new internal gold capsule model containing original shockmount and wooden vault container box.",
//         estimatedAmt: 2.80000000,
//         thresholdBid: 2.10000000,
//         isSold: true,
//         dateSold: "2026-05-19 11:23:00"
//       },
//       {
//         id: 1403,
//         title: "Premium Master Audio Loop and Sample Library Archive",
//         category: "Digital",
//         description: "Full uncompressed WAV file multi-track recordings containing absolute copyright clearances.",
//         estimatedAmt: 1.10000000,
//         thresholdBid: 0.80000000,
//         isSold: true,
//         dateSold: "2026-05-20 14:02:00"
//       }
//     ]
//   },
//   {
//     id: 15,
//     title: "Boutique Coffee Roasting and Espresso Assets",
//     location: "Tagbilaran City, Bohol",
//     type: "English",
//     startDate: "2026-09-01 08:00",
//     endDate: "2026-09-12 17:00",
//     description: "Commercial grade steel drum roasters, professional espresso workstations, and heavy grinder machinery.",
//     isOpen: true,
//     lots: [
//       {
//         id: 1501,
//         title: "Diedrich IR-12 Coffee Bean Roaster Plant",
//         category: "Physical",
//         description: "12kg batch capacity infrared burner layout setup utilizing propane gas feeds.",
//         estimatedAmt: 16.20000000,
//         thresholdBid: 13.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1502,
//         title: "La Marzocco Linea PB 3-Group Espresso Machine",
//         category: "Physical",
//         description: "Dual boiler premium custom saturation group setup with digital display controllers.",
//         estimatedAmt: 6.40000000,
//         thresholdBid: 5.10000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1503,
//         title: "Mahlkonig EK43 Commercial Coffee Grinder",
//         category: "Physical",
//         description: "High-capacity matte black housing unit containing pristine premium steel burr discs.",
//         estimatedAmt: 1.90000000,
//         thresholdBid: 1.50000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1504,
//         title: "Interactive Barista Digital Training Curriculum",
//         category: "Digital",
//         description: "Complete private distribution access to operational handbook applications, tutorial videos, and workflow structures.",
//         estimatedAmt: 0.40000000,
//         thresholdBid: 0.25000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 16,
//     title: "Enterprise Logistics Delivery Fleet Van Sale",
//     location: "Pasig City, Metro Manila",
//     type: "Dutch",
//     startDate: "2026-07-22 08:00",
//     endDate: "2026-08-01 17:00",
//     description: "Corporate asset liquidation of white cargo transport vans with standardized internal maintenance logs.",
//     isOpen: true,
//     lots: [
//       {
//         id: 1601,
//         title: "Toyota Hiace Commuter Cargo Van (2022)",
//         category: "Physical",
//         description: "Manual diesel layout setup, 34,000 kilometers mileage, clean documentation properties.",
//         estimatedAmt: 11.20000000,
//         thresholdBid: 9.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1602,
//         title: "Toyota Hiace Commuter Cargo Van (2023)",
//         category: "Physical",
//         description: "Pristine fleet unit, 18,500 kilometers total run history, company registered framework.",
//         estimatedAmt: 13.10000000,
//         thresholdBid: 10.50000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1603,
//         title: "Proprietary Route Optimization API Access Token",
//         category: "Digital",
//         description: "Pre-allocated 3-year commercial API access gateway credential handling high capacity coordinates processing.",
//         estimatedAmt: 3.50000000,
//         thresholdBid: 2.80000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 17,
//     title: "Luxury Hotel Hospitality Furniture Overstock",
//     location: "Lapu-Lapu City, Cebu",
//     type: "English",
//     startDate: "2026-06-18 08:00",
//     endDate: "2026-06-29 17:00",
//     description: "High tier resort grade modular sofas, lighting arrays, and uninstalled luxury bedding components.",
//     isOpen: true,
//     lots: [
//       {
//         id: 1701,
//         title: "Resort Style Outdoor Wicker Lounge Set",
//         category: "Physical",
//         description: "Includes four modular sectional units and matching weather resistant cushion fabrics.",
//         estimatedAmt: 2.60000000,
//         thresholdBid: 1.95000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1702,
//         title: "Brushed Brass Geometric Chandelier Array (x5)",
//         category: "Physical",
//         description: "Uninstalled premium restaurant dining layout lighting fixtures inside factory casing boxes.",
//         estimatedAmt: 1.40000000,
//         thresholdBid: 1.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1703,
//         title: "Interior Design Vector CAD Layout Maps",
//         category: "Digital",
//         description: "Re-usable complete schematics and blueprint configurations for spatial luxury resort planning views.",
//         estimatedAmt: 0.65000000,
//         thresholdBid: 0.40000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 18,
//     title: "Industrial Metalworking CNC Machine Shop Assets",
//     location: "Calamba City, Laguna",
//     type: "English",
//     startDate: "2026-08-05 08:00",
//     endDate: "2026-08-19 17:00",
//     description: "High speed industrial milling installations, turning centers, and high pressure coolant modules.",
//     isOpen: true,
//     lots: [
//       {
//         id: 1801,
//         title: "Haas VF-2 Vertical Machining Center CNC",
//         category: "Physical",
//         description: "Features high speed spindle rotation capability, 20-station tool carousel tray setup.",
//         estimatedAmt: 24.80000000,
//         thresholdBid: 21.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1802,
//         title: "Precision Metal Lathe Turning Bench Station",
//         category: "Physical",
//         description: "Manual control interface, solid cast iron bed construction complete with auxiliary gears pack.",
//         estimatedAmt: 4.30000000,
//         thresholdBid: 3.20000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 1803,
//         title: "G-Code Toolpath Optimization Automation Macros",
//         category: "Digital",
//         description: "Custom pre-configured scripts for rapid rendering calculations across complex milling configurations.",
//         estimatedAmt: 1.25000000,
//         thresholdBid: 0.90000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   },
//   {
//     id: 19,
//     title: "Rare Cryptocurrency Commemorative Physical Medallions",
//     location: "Metro Manila",
//     type: "English",
//     startDate: "2026-04-20 08:00",
//     endDate: "2026-05-02 17:00",
//     description: "Limited series minted collectible currency tokens cast in precious metals.",
//     isOpen: false,
//     lots: [
//       {
//         id: 1901,
//         title: "Solid Platinum Commemorative Coin 2oz",
//         category: "Physical",
//         description: "Serial number #003 of 100 ever created, proof finish case display presentation box.",
//         estimatedAmt: 14.20000000,
//         thresholdBid: 12.00000000,
//         isSold: true,
//         dateSold: "2026-05-02 21:11:42"
//       },
//       {
//         id: 1902,
//         title: "Vector Graphics Source Master Asset Pack",
//         category: "Digital",
//         description: "The official design core production print layers used to format the physical coin stamp tooling arrays.",
//         estimatedAmt: 2.15000000,
//         thresholdBid: 1.50000000,
//         isSold: true,
//         dateSold: "2026-05-01 09:34:00"
//       }
//     ]
//   },
//   {
//     id: 20,
//     title: "Commercial Aquaculture Aerator and Pump Infrastructure",
//     location: "Roxas City, Capiz",
//     type: "English",
//     startDate: "2026-07-25 08:00",
//     endDate: "2026-08-08 17:00",
//     description: "High volume water management equipment optimized for commercial prawn and fish farming compounds.",
//     isOpen: true,
//     lots: [
//       {
//         id: 2001,
//         title: "Paddlewheel Aerator Units Assembly (Set of 12)",
//         category: "Physical",
//         description: "Heavy duty electric motors equipped with floating pontoon framing stabilization units.",
//         estimatedAmt: 3.80000000,
//         thresholdBid: 2.90000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 2002,
//         title: "High-Volume Submersible Water Flow Pump",
//         category: "Physical",
//         description: "Industrial grade cast iron casing running a 10HP continuous duty underwater motor configuration.",
//         estimatedAmt: 5.20000000,
//         thresholdBid: 4.00000000,
//         isSold: false,
//         dateSold: null
//       },
//       {
//         id: 2003,
//         title: "Smart Water Quality Monitoring Telemetry Code",
//         category: "Digital",
//         description: "Custom firmware dashboard code used to relay automated salinity, pH levels, and dissolved oxygen parameters.",
//         estimatedAmt: 1.60000000,
//         thresholdBid: 1.15000000,
//         isSold: false,
//         dateSold: null
//       }
//     ]
//   }
// ];