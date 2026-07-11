// All the data on this page is mock/static data for the front-end demo.
// Once the backend/API is ready, these arrays get swapped for real fetched data.

export const alerts = [
  {
    id: 'tap-out',
    type: 'urgent',
    badge: 'Urgent',
    icon: 'LogOut',
    title: 'Tap Out Reminder',
    heading: 'Tap OUT at Stratford, now',
    body: 'Tap out with your Blue Oyster before leaving the platform. Missing this tap will trigger a maximum fare charge.',
    tag: 'Blue Oyster · active card',
    time: 'Just now',
    category: 'updates',
    primaryLabel: "I've tapped out",
    secondaryLabel: 'I missed it, log',
  },
  {
    id: 'interchange',
    type: 'action',
    badge: 'Action needed',
    icon: 'ArrowLeftRight',
    title: 'Interchange Reminder',
    heading: 'Interchange at Stratford, tap IN for Overground',
    body: 'Tap in with your Blue Oyster for the Overground on Platform 2. Use the same card you tapped out with.',
    tag: 'Blue Oyster · active card',
    time: '3 min ago',
    category: 'updates',
    primaryLabel: 'Tapped in',
    secondaryLabel: 'Wrong Card Used',
  },
  {
    id: 'fare',
    type: 'fare',
    badge: 'Fare alert',
    icon: 'PoundSterling',
    title: 'Fare Warning',
    heading: 'Fare increase risk on your route',
    body: 'Your Morning Commute has an interchange at Stratford. Failing to tap out correctly here can add up to £6.50 to your fare.',
    tag: 'Blue Oyster · active card',
    time: '9 min ago',
    category: 'disruptions',
    primaryLabel: 'Got it',
    secondaryLabel: null,
  },
  {
    id: 'mismatch',
    type: 'mismatch',
    badge: 'Mismatch',
    icon: 'CreditCard',
    title: 'Card Mismatch',
    heading: 'Wrong card detected at Paddington',
    body: 'You tapped in with your Barclays card but your saved journey uses Blue Oyster. You may face a penalty fare.',
    tag: 'Blue Oyster · active card',
    time: 'Just now',
    category: 'safety',
    primaryLabel: 'Log dispute',
    secondaryLabel: 'Dismiss',
  },
]

export const alertFilters = [
  { key: 'all', label: 'All', count: 5 },
  { key: 'disruptions', label: 'Disruptions', count: 2 },
  { key: 'safety', label: 'Safety', count: 1 },
  { key: 'updates', label: 'Updates', count: 1 },
  { key: 'engineering', label: 'Engineering', count: 1 },
]

export const notificationSettings = [
  { key: 'tapOut', icon: 'LogOut', label: 'Tap out reminders', enabled: true },
  { key: 'interchange', icon: 'ArrowLeftRight', label: 'Interchange reminders', enabled: false },
  { key: 'fare', icon: 'PoundSterling', label: 'Fare warnings', enabled: true },
  { key: 'mismatch', icon: 'CreditCard', label: 'Card mismatch alerts', enabled: false },
  { key: 'severeDelays', icon: 'Clock', label: 'Severe delays', enabled: false },
  { key: 'safety', icon: 'ShieldCheck', label: 'Safety alerts', enabled: true },
  { key: 'engineering', icon: 'Wrench', label: 'Engineering works', enabled: true },
  { key: 'service', icon: 'RefreshCw', label: 'Service updates', enabled: true },
  { key: 'crowding', icon: 'Users', label: 'Crowding Alerts', enabled: false },
  { key: 'events', icon: 'Globe', label: 'Events', enabled: true },
]

export const savedRoutesForAlerts = [
  { route: 'Ealing Broadway → Paddington', line: 'Elizabeth line' },
  { route: 'Stratford → Liverpool Street', line: 'Central line' },
  { route: 'Clapham Junction → Victoria', line: 'Overground' },
]

export const favoriteStations = [
  { name: 'Stratford', line: 'London' },
  { name: 'Ealing Broadway', line: 'Elizabeth line' },
  { name: 'Liverpool Street', line: 'Central line' },
]
// Named stations for the map. Previously these were unnamed dots with no
// id, which meant there was nothing to attach a rating to. Coordinates
// match the same points the map already used.
export const stations = [
  { id: 'warren-street', name: 'Warren Street', lat: 51.51908, lng: -0.13413 },
  { id: 'euston-square', name: 'Euston Square', lat: 51.5246, lng: -0.1339 },
  { id: 'great-portland-street', name: 'Great Portland Street', lat: 51.51287, lng: -0.13068 },
  { id: 'euston', name: 'Euston', lat: 51.52828, lng: -0.11113 },
]

export const reportCategories = [
  { key: 'revenue', label: 'Revenue Protection', icon: 'Coins' },
  { key: 'btp', label: 'British Transport Police', icon: 'Car' },
  { key: 'beggars', label: 'Beggars', icon: 'HandCoins' },
  { key: 'threat', label: 'Threatening Behavior & Violence', icon: 'Hand' },
  { key: 'fault', label: 'Train Fault', icon: 'TrainFront' },
  { key: 'crowded_train', label: 'Crowded Train', icon: 'Users' },
  { key: 'crowded_platform', label: 'Crowded Platform', icon: 'UsersRound' },
  { key: 'accessibility', label: 'Accessibility Issues', icon: 'CheckCircle2' },
  { key: 'hazards', label: 'Hazards', icon: 'Radiation' },
  { key: 'harassment', label: 'Sexual Harassment', icon: 'ShieldAlert' },
  { key: 'drunk', label: 'Drunk & Disorderly', icon: 'PersonStanding' },
  { key: 'vulnerable', label: 'Vulnerable Person & Mental Health', icon: 'HeartPulse' },
]

export const savedJourneys = [
  { route: 'Boston → New York', stations: 'South Station → Moynihan Train Hall', favorite: false },
  { route: 'Chicago → Seattle', stations: 'Chicago Union Station → King Street', favorite: true },
  { route: 'New York → Washington, DC', stations: 'Penn Station → Union Station', favorite: true },
]

export const lines = [
  { name: 'Central', status: 'Good service', color: '#DC2626', level: 'good' },
  { name: 'Victoria', status: 'Minor delays', color: '#2563EB', level: 'minor' },
  { name: 'Northern', status: 'Severe delay', color: '#111827', level: 'severe' },
  { name: 'Elizabeth', status: 'Good service', color: '#7C3AED', level: 'good' },
]

export const nearbyToggles = [
  { label: 'Bicycle and scooter hire', icon: 'Bike', enabled: false },
  { label: 'Cycle Parking', icon: 'ParkingSquare', enabled: false },
  { label: 'Hotels', icon: 'Building2', enabled: false },
]

export const mapLayerToggles = [
  { label: 'Live Events', icon: 'PartyPopper', enabled: false },
  { label: 'Station Retail', icon: 'Store', enabled: false },
  { label: 'First & Last Train', icon: 'TrainFront', enabled: false },
  { label: 'Show reports', icon: 'Megaphone', enabled: true },
  { label: 'Show Friends & Family', icon: 'Users', enabled: false },
  { label: 'Show engineering works', icon: 'Wrench', enabled: true },
  { label: 'Housebuddy', icon: 'Home', enabled: true },
]

export const liveFeed = [
  { icon: 'AlertTriangle', color: 'bg-slate-800', text: 'Signal failure near Euston', time: '5 min ago', confirmed: 39 },
  { icon: 'Users', color: 'bg-red-500', text: 'Severe overcrowding at Oxford Circus', time: '6 min ago', confirmed: 40 },
  { icon: 'Wrench', color: 'bg-purple-500', text: 'Engineering works · Stratford', time: '7 min ago', confirmed: 41 },
  { icon: 'Megaphone', color: 'bg-sky-500', text: 'Person on track · Vauxhall', time: '8 min ago', confirmed: 42 },
]

export const featureCards = [
  {
    icon: 'Wallet',
    iconColor: 'text-emerald-600',
    title: 'Delay Repay',
    description: 'Check eligibility and claim compensation for delayed train journeys.',
    linkText: 'Check now',
  },
  {
    icon: 'ShoppingBag',
    iconColor: 'text-purple-600',
    title: 'Grab & Go',
    description: 'Station retail discounts, collect food and coffee before your train.',
    linkText: 'Explore retail',
  },
  {
    icon: 'Calendar',
    iconColor: 'text-blue-600',
    title: 'Events',
    description: 'Discover events near stations that may impact your journey.',
    linkText: 'View events',
  },
  {
    icon: 'Wrench',
    iconColor: 'text-amber-600',
    title: 'Engineering Works',
    description: 'Planned maintenance and upgrades affecting rail routes.',
    linkText: 'View works',
  },
  {
    icon: 'Users',
    iconColor: 'text-sky-600',
    title: 'User Locator',
    description: 'Track friends and family travelling across the rail network.',
    linkText: 'Locate',
  },
  {
    icon: 'MessageSquare',
    iconColor: 'text-indigo-600',
    title: 'Live Chat',
    description: 'Chat with the community and get real-time travel updates.',
    linkText: 'Join chat',
  },
]

export const departureBoards = [
  {
    station: 'London Paddington',
    subtitle: 'National Rail · All departures',
    updatedAt: '18:48:58',
    departures: [
      { time: '02:34', destination: 'Bristol Temple Meads', operator: 'Great Western Railway', platform: 3, status: 'On time', statusColor: 'text-emerald-600', boardStatusColor: 'text-emerald-400' },
      { time: '02:41', destination: 'Oxford', operator: 'Great Western Railway', platform: 7, status: '+9 mins', statusColor: 'text-amber-600', boardStatusColor: 'text-amber-300' },
      { time: '02:49', destination: 'Heathrow Terminal 5', operator: 'Heathrow Express', platform: 6, status: 'Due', statusColor: 'text-slate-600', boardStatusColor: 'text-neutral-400' },
      { time: '02:55', destination: 'Swansea', operator: 'Great Western Railway', platform: 1, status: 'On time', statusColor: 'text-emerald-600', boardStatusColor: 'text-emerald-400' },
      { time: '03:10', destination: 'Manchester Piccadilly', operator: 'CrossCountry', platform: 4, status: 'Cancelled', statusColor: 'text-red-600', boardStatusColor: 'text-red-400' },
    ],
  },
  {
    station: 'London Victoria',
    subtitle: 'National Rail · All departures',
    updatedAt: '18:48:58',
    departures: [
      { time: '17:12', destination: 'Brighton', operator: 'Southern', platform: 9, status: 'On time', statusColor: 'text-emerald-600', boardStatusColor: 'text-emerald-400' },
      { time: '17:18', destination: 'Gatwick Airport', operator: 'Gatwick Express', platform: 13, status: 'On time', statusColor: 'text-emerald-600', boardStatusColor: 'text-emerald-400' },
      { time: '17:24', destination: 'Orpington', operator: 'Southeastern', platform: 2, status: '+4 mins', statusColor: 'text-amber-600', boardStatusColor: 'text-amber-300' },
      { time: '17:31', destination: 'Epsom', operator: 'Southern', platform: 16, status: 'Due', statusColor: 'text-slate-600', boardStatusColor: 'text-neutral-400' },
      { time: '17:40', destination: 'Dover Priory', operator: 'Southeastern', platform: 7, status: 'On time', statusColor: 'text-emerald-600', boardStatusColor: 'text-emerald-400' },
    ],
  },
  {
    station: 'Stratford',
    subtitle: 'Elizabeth Line · Overground · DLR',
    updatedAt: '18:48:58',
    departures: [
      { time: '17:12', destination: 'Brighton', operator: 'Southern', platform: 9, status: 'On time', statusColor: 'text-emerald-600', boardStatusColor: 'text-emerald-400' },
      { time: '17:18', destination: 'Gatwick Airport', operator: 'Gatwick Express', platform: 13, status: 'On time', statusColor: 'text-emerald-600', boardStatusColor: 'text-emerald-400' },
      { time: '17:24', destination: 'Orpington', operator: 'Southeastern', platform: 2, status: '+4 mins', statusColor: 'text-amber-600', boardStatusColor: 'text-amber-300' },
      { time: '17:31', destination: 'Epsom', operator: 'Southern', platform: 16, status: 'Due', statusColor: 'text-slate-600', boardStatusColor: 'text-neutral-400' },
      { time: '17:40', destination: 'Dover Priory', operator: 'Southeastern', platform: 7, status: 'On time', statusColor: 'text-emerald-600', boardStatusColor: 'text-emerald-400' },
    ],
  },
]

export const disruptions = [
  {
    level: 'severe',
    title: 'Severe delays · Northern Line',
    detail: 'Signal failure between Camden Town and Euston. Expect 15-20 min delays southbound.',
    updated: 'Updated 4 min ago',
  },
  {
    level: 'minor',
    title: 'Minor delays · Victoria Line',
  },
  {
    level: 'planned',
    title: 'Planned engineering · Circle Line',
  },
]

export const events = [
  {
    name: 'Pride in London 2026',
    time: '10:00 am - 11:00 am',
    date: 'Wed 30 Jul 2026',
    attendance: '4,000 Approx',
    location: 'Near Victoria',
    tag: 'Festival',
    tagColor: 'bg-purple-100 text-purple-700',
    barColor: 'bg-purple-400',
  },
  {
    name: 'Summer Late at the Museum',
    time: '9:00 am - 1:00 pm',
    date: 'Wed 30 Jul 2026',
    attendance: '56,000 Approx',
    location: 'Kings Cross',
    tag: 'Culture',
    tagColor: 'bg-amber-100 text-amber-700',
    barColor: 'bg-amber-400',
  },
  {
    name: 'West End Live',
    time: '7:30 pm - 8:30 pm',
    date: 'Fri 4 Aug 2026',
    attendance: '23,456 Approx',
    location: 'Charing cross',
    tag: 'Live music',
    tagColor: 'bg-orange-100 text-orange-700',
    barColor: 'bg-orange-400',
  },
  {
    name: 'Borough Market Food Fair',
    time: '8:30 pm - 11:00 pm',
    date: 'Sun 6 Aug 2026',
    attendance: '23,456 Approx',
    location: 'Charing cross',
    tag: 'Food',
    tagColor: 'bg-pink-100 text-pink-700',
    barColor: 'bg-pink-400',
  },
]

export const nextDepartures = [
  { destination: 'Brighton', line: 'Southern · Plat 9', time: '17:12', color: 'bg-sky-500' },
  { destination: 'Gatwick Airport', line: 'Gatwick Express · Plat 13', time: '17:18', color: 'bg-sky-500' },
  { destination: 'Orpington', line: 'Southeastern · Plat 2', time: '17:24', color: 'bg-emerald-500' },
  { destination: 'Epsom', line: 'Southern · Plat 16', time: '17:31', color: 'bg-sky-500' },
]

// Real-ish coordinates around Warren Street / Euston area, London, used for the
// interactive map's overlay pins.
export const housingPins = [
  { id: 1, lat: 51.52897, lng: -0.14448, price: '£720/mon' },
  { id: 2, lat: 51.52736, lng: -0.13758, price: '£720/mon' },
  { id: 3, lat: 51.52506, lng: -0.12723, price: '£720/mon' },
  { id: 4, lat: 51.52276, lng: -0.14103, price: '£720/mon' },
  { id: 5, lat: 51.52161, lng: -0.13528, price: '£720/mon' },
  { id: 6, lat: 51.52046, lng: -0.12953, price: '£720/mon' },
  { id: 7, lat: 51.51862, lng: -0.14793, price: '£720/mon' },
  { id: 8, lat: 51.51816, lng: -0.12263, price: '£720/mon' },
]

export const coffeePins = [
  { id: 1, lat: 51.52828, lng: -0.13183, name: 'Caffe Terrazzo', rating: 4.8, status: 'Closed', address: "1 Manor Road, London, England, inside Ealing Broadway station" },
  { id: 2, lat: 51.52138, lng: -0.14563, name: 'Urban Brew Café', rating: 4.5, status: 'Closed', address: '14 King Street, Manchester' },
  { id: 3, lat: 51.51977, lng: -0.12493, name: 'Bean & Bliss', rating: 4.9, status: 'Open', address: '18 Market Square, Cambridge' },
  { id: 4, lat: 51.51747, lng: -0.12838, name: 'Café Aroma', rating: 4.9, status: 'Open', address: '20 George Street, Brighton' },
]

export const liveEventPin = { lat: 51.52966, lng: -0.12493, name: 'Rugby', location: "King's Cross St Pancras", date: 'Sat, 18 Jul 2026, 18:30' }
