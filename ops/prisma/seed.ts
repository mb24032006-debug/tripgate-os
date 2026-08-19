// Seeds the OS with the ONLY real data that exists today: the two providers the marketing site's
// own repo actually evidences (TripGate itself, and Moods Travel — see
// ../../research/06_PROVIDER_INVENTORY.md), the full product taxonomy (per the founder's "model
// every future category now, seed only what's real" direction), and every real product transcribed
// directly from the marketing site's content/*.ts files. Nothing here is invented: where the source
// has no price, this seed has no price either (matching content/tours.ts's own `price: null`
// discipline) — see comments per entry for exact source line references.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — see .env.example.");
}
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// French translations, keyed by slug/name — kept separate from the English source-of-truth arrays
// below rather than interleaved, so the "transcribed verbatim from the marketing site" arrays stay
// a clean 1:1 match with content/*.ts. Only name/description are translated (per the founder's
// "add French language" direction) — hotel proper names and city names are not translated.
const TOUR_FR: Record<string, { title: string; description: string }> = {
  "golden-coast-retreat": { title: "Retraite de la Côte Dorée", description: "Soleil, surf et détente sur la scintillante côte atlantique du sud." },
  "imperial-echoes": { title: "Échos Impériaux", description: "Une plongée profonde dans l'âme médiévale du Maroc, à travers les villes anciennes les plus intactes au monde." },
  "northern-gateway": { title: "Porte du Nord", description: "Une escapade bohème à travers la cosmopolite « Porte de l'Afrique » et la célèbre Ville Bleue." },
  "the-atlantic-hub": { title: "Le Carrefour Atlantique", description: "Découvrez le mélange sophistiqué entre le cœur économique moderne du Maroc et son élégante capitale politique." },
  "desert-under-the-stars": { title: "Désert sous les Étoiles", description: "Un voyage envoûtant à travers les paysages désertiques du Maroc, incluant les dunes de l'Erg Chebbi." },
  "northern-morocco-gems-tangier-chefchaouen-tetouan": { title: "Joyaux du Nord du Maroc", description: "Découvrez les joyaux cachés du nord du Maroc, en visitant Tanger, Chefchaouen et Tétouan." },
  "moroccan-coastal-escape-essaouira-taghazout-agadir": { title: "Essaouira, Taghazout et Agadir", description: "Un voyage rafraîchissant le long de la côte atlantique du Maroc, à travers Essaouira, Taghazout et Agadir." },
  "atlas-mountain-adventure": { title: "Aventure dans les Montagnes de l'Atlas", description: "Un voyage inoubliable à travers les montagnes de l'Atlas marocain." },
  "imperial-cities-tour": { title: "Circuit des Villes Impériales", description: "Découvrez la grandeur du véritable héritage impérial du Maroc." },
  "red-city-fever": { title: "Fièvre de la Ville Rouge", description: "Le contraste ultime : l'énergie intense de la Ville Rouge suivie de la majesté silencieuse du désert." },
};

const PROGRAM_FR: Record<string, { title: string; description: string }> = {
  "cairo-historical": { title: "Programme Historique du Caire", description: "Tenez-vous face au Grand Sphinx et aux pyramides de Gizeh, puis perdez-vous dans l'énergie intemporelle du bazar de Khan el-Khalili — une escapade cairote compacte construite autour des moments qui définissent l'Égypte." },
  "cairo-north-coast": { title: "Le Caire et la Côte Nord", description: "Profitez de l'équilibre parfait entre histoire ancienne et détente méditerranéenne, des pyramides de Gizeh aux sables blancs de la Côte Nord égyptienne, en un seul voyage." },
  "sharm-el-sheikh": { title: "Programme Charm el-Cheikh", description: "Échangez la routine contre des eaux turquoise — sorties en bateau en mer Rouge, safaris désertiques au coucher du soleil et l'effervescence de Naama Bay, avec deux jours libres pour profiter de la plage." },
  "fatimid-cairo-alexandria": { title: "Le Caire Fatimide et Alexandrie", description: "Parcourez les bazars intemporels du Caire et admirez les pyramides de Gizeh, puis prolongez votre voyage jusqu'à la Méditerranée — la citadelle de Qaitbay et la corniche d'Alexandrie vous attendent." },
  "cairo-hurghada-luxor": { title: "Le Caire – Hurghada – Louxor", description: "Découvrez les plus grands trésors de l'Égypte — des pyramides de Gizeh aux rivages turquoise de la mer Rouge — avec la possibilité de prolonger jusqu'à Louxor, musée à ciel ouvert de temples et de tombeaux." },
  "cairo-alexandria-hurghada-luxor": { title: "Le Caire – Alexandrie – Hurghada – Louxor", description: "Le voyage égyptien complet — pyramides, littoral méditerranéen et rivages de la mer Rouge — prolongé d'une journée complète à Alexandrie et d'une nuit supplémentaire en bord de mer, avec assistance visa et à l'aéroport." },
  "grand-egypt-cairo-aswan-luxor-hurghada": { title: "Grande Égypte : Le Caire – Assouan – Louxor – Hurghada", description: "Traversez l'Égypte en train-couchette et en croisière sur le Nil — des pyramides de Gizeh aux rives granitiques d'Assouan, jusqu'à la mer Rouge. Le grand tour d'Égypte par excellence, en un seul voyage inoubliable." },
  "cairo-sharm-el-sheikh": { title: "Le Caire – Charm el-Cheikh", description: "Deux visages emblématiques de l'Égypte en un seul voyage — les merveilles antiques du Caire et les eaux turquoise de Charm el-Cheikh — avec des jours de plage libres après chaque aventure." },
  "nile-cruise": { title: "Croisière sur le Nil — Louxor et Assouan", description: "Naviguez sur le Nil comme les voyageurs le font depuis des siècles — vous réveillant chaque matin face à un nouveau temple, et regardant défiler le paysage antique de l'Égypte depuis le confort d'une cabine de luxe." },
  "discover-dubai": { title: "Découvrir Dubaï", description: "Des dunes du désert à la plus haute tour du monde — admirez le Burj Khalifa, flânez dans des centres commerciaux futuristes et choisissez votre propre aventure : safari désertique, Grande Mosquée d'Abou Dabi ou Palm Jumeirah." },
};

const BUSINESS_SERVICE_FR: Record<string, { title: string; description: string }> = {
  "IATA BSP Ticketing": { title: "Billetterie IATA BSP", description: "Billetterie aérienne pour toutes les compagnies, émise via notre accréditation IATA BSP." },
  "Seminars & Team-Building": { title: "Séminaires et Team-Building", description: "Organisation clé en main de séminaires d'entreprise et de voyages de cohésion d'équipe." },
  "Congresses & Trade Shows": { title: "Congrès et Salons Professionnels", description: "Logistique pour congrès, salons professionnels et événements d'entreprise thématiques." },
  "Incentive & Reward Travel": { title: "Voyages de Motivation et Récompense", description: "Programmes de voyages de motivation pour récompenser et motiver les équipes." },
};

// Parses "From $350/night (double)" -> 350 (major units). Returns null if unparseable — never a guess.
function parseFromPrice(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

const CATEGORIES = [
  {
    name: "Tour",
    nameFr: "Circuit",
    defaultUnitType: "per_booking",
    attributeSchema: [
      { name: "destinations", type: "string[]" },
      { name: "durationDays", type: "number" },
      { name: "highlights", type: "string[]" },
      { name: "bestFor", type: "string[]" },
    ],
  },
  {
    name: "Hotel",
    nameFr: "Hôtel",
    defaultUnitType: "per_night",
    attributeSchema: [
      { name: "city", type: "string" },
      { name: "roomType", type: "string" },
      { name: "mealPlan", type: "string" },
    ],
  },
  {
    name: "Flight Ticketing",
    nameFr: "Billetterie aérienne",
    defaultUnitType: "per_booking",
    attributeSchema: [
      { name: "airline", type: "string" },
      { name: "class", type: "string" },
    ],
  },
  {
    name: "Corporate Event",
    nameFr: "Événement d'entreprise",
    defaultUnitType: "per_booking",
    attributeSchema: [
      { name: "eventType", type: "string" },
      { name: "headcount", type: "number" },
    ],
  },
  {
    name: "Visa Assistance",
    nameFr: "Assistance visa",
    defaultUnitType: "per_person",
    attributeSchema: [
      { name: "destinationCountry", type: "string" },
      { name: "processingDays", type: "number" },
    ],
  },
  // No real product exists yet for these — seeded as an empty taxonomy entry, honestly, per the
  // founder's "any future travel component" requirement and the site's own "honest absence" discipline.
  { name: "Transport", nameFr: "Transport", defaultUnitType: "per_day", attributeSchema: [{ name: "vehicleType", type: "string" }, { name: "capacity", type: "number" }] },
  { name: "Guide", nameFr: "Guide", defaultUnitType: "per_day", attributeSchema: [{ name: "languages", type: "string[]" }, { name: "certification", type: "string" }] },
  { name: "Activity", nameFr: "Activité", defaultUnitType: "per_person", attributeSchema: [{ name: "durationHours", type: "number" }] },
  { name: "Restaurant", nameFr: "Restaurant", defaultUnitType: "per_booking", attributeSchema: [{ name: "cuisine", type: "string" }, { name: "seating", type: "number" }] },
  { name: "Insurance", nameFr: "Assurance", defaultUnitType: "per_person", attributeSchema: [{ name: "coverageType", type: "string" }] },
];

// Morocco Tour SKUs — transcribed verbatim from content/tours.ts (10 entries). Provider: TripGate
// (internal) — no external supplier is named anywhere for these in the source repo.
const MOROCCO_TOURS = [
  { slug: "golden-coast-retreat", title: "Golden Coast Retreat", duration: "3 Days / 2 Nights", destinations: ["Agadir", "Taghazout"], description: "Sun, surf, and relaxation on the sparkling southern Atlantic coast.", highlights: ["Agadir Oufella Kasbah Views", "Taghazout Surf Beaches", "Paradise Valley (optional)"], category: "Beach Escape", bestFor: ["Couples", "Relaxation seekers"] },
  { slug: "imperial-echoes", title: "Imperial Echoes", duration: "3 Days / 2 Nights", destinations: ["Fes", "Meknes"], description: "A deep dive into the medieval soul of Morocco, featuring the world's most intact ancient cities.", highlights: ["Fes el-Bali Medina & Tanneries", "Bab Mansour, Meknes", "Volubilis Roman Ruins"], category: "Cultural", bestFor: ["History lovers", "First-time visitors"] },
  { slug: "northern-gateway", title: "Northern Gateway", duration: "3 Days / 2 Nights", destinations: ["Tangier", "Chefchaouen"], description: "A bohemian escape through the cosmopolitan 'Door to Africa' and the world-famous Blue City.", highlights: ["Chefchaouen Blue Medina", "Cap Spartel & Hercules Caves", "Rif Mountains Scenic Drive"], category: "Cultural", bestFor: ["Couples", "Photographers"] },
  { slug: "the-atlantic-hub", title: "The Atlantic Hub", duration: null, destinations: ["Casablanca", "Rabat"], description: "Experience the sophisticated blend of Morocco's modern economic heart and its elegant political capital.", highlights: ["Hassan II Mosque", "Kasbah of the Udayas", "Hassan Tower & Mausoleum of Mohammed V"], category: "Cultural", bestFor: ["City explorers", "First-time visitors"] },
  { slug: "desert-under-the-stars", title: "Desert Under the Stars", duration: "2–4 days – Perfect for travelers wanting a magical desert experience without extensive travel.", destinations: ["Erg Chebbi / Merzouga"], description: "A mesmerizing journey through Morocco's desert landscapes, including the Erg Chebbi dunes.", highlights: ["Camel trek on Erg Chebbi dunes", "Berber villages", "Merzouga oasis"], category: "Desert Adventure", bestFor: ["Couples", "Adventure seekers"], featured: true },
  { slug: "northern-morocco-gems-tangier-chefchaouen-tetouan", title: "Northern Morocco Gems", duration: null, destinations: ["Tangier", "Chefchaouen", "Tetouan"], description: "Discover the hidden gems of Northern Morocco, visiting Tangier, Chefchaouen, and Tetouan.", highlights: ["Kasbah/medina + Strait of Gibraltar views (Tangier)", "Blue streets, Rif hiking (Chefchaouen)", "UNESCO Andalusian medina (Tetouan)"], category: "Cultural", bestFor: ["Culture enthusiasts", "Photographers"] },
  { slug: "moroccan-coastal-escape-essaouira-taghazout-agadir", title: "Essaouira, Taghazout & Agadir", duration: "3–5 Days – Ideal for travelers seeking a balance of beach, culture, and adventure.", destinations: ["Essaouira", "Taghazout", "Agadir"], description: "A refreshing journey along Morocco's Atlantic coast, visiting Essaouira, Taghazout, and Agadir.", highlights: ["Essaouira medina/ramparts/seafood", "Taghazout surf & yoga", "Agadir beach resorts & Kasbah"], category: "Beach Escape", bestFor: ["Couples", "Friends traveling together"] },
  { slug: "atlas-mountain-adventure", title: "Atlas Mountain Adventure", duration: null, destinations: ["Atlas Mountains", "Berber villages (Aït Bougmez, Ourika valleys)"], description: "An unforgettable journey through Morocco's Atlas Mountains.", highlights: ["Toubkal National Park trekking", "Berber villages", "Aït Bougmez & Ourika valleys", "Optional biking/climbing/camel rides"], category: "Mountain Adventure", bestFor: ["Adventure seekers", "Hikers"] },
  { slug: "imperial-cities-tour", title: "Imperial Cities Tour", duration: null, destinations: ["Fes", "Meknes", "Marrakech", "Rabat"], description: "Experience the grandeur of Morocco's true imperial heritage.", highlights: ["Fes medina & Al Quaraouiyine", "Meknes / Bab Mansour / Volubilis", "Marrakech Jemaa el-Fnaa / souks", "Rabat Royal Palace / Kasbah of the Udayas"], category: "Cultural", bestFor: ["History lovers", "First-time visitors"] },
  { slug: "red-city-fever", title: "Red City Fever", duration: "3 Days / 2 Nights", destinations: ["Marrakech", "Agafay"], description: "The ultimate contrast: the high-energy pulse of the Red City followed by the silent majesty of the desert.", highlights: ["Jemaa el-Fna Square", "Bahia Palace & Marrakech Souks", "Agafay Desert Sunset & Dinner"], category: "Desert Adventure", bestFor: ["Couples", "First-time visitors"] },
];

// International Programs — transcribed from content/internationalTours.ts (10 entries). Provider:
// Moods Travel (external) — the sole named wholesaler behind this content, per its own file header.
// `netCostUSD`/`netCostSingleUSD` are populated ONLY where the source carries an explicit
// program-level verified rate in its own comments (4 of 10) — never derived or guessed for the
// other 6, which only have per-hotel tier rates, not a single program total (see
// research/03_PRODUCT_CATALOG_AUDIT.md).
const INTERNATIONAL_PROGRAMS = [
  { slug: "cairo-historical", title: "Cairo Historical Program", country: "Egypt", duration: "4 Days", description: "Stand face to face with the Great Sphinx and the Pyramids of Giza, then lose yourself in the timeless energy of Khan el-Khalili's ancient bazaar — a compact Cairo escape built around the moments that define Egypt.", highlights: ["Giza Pyramids & Sphinx", "Egyptian Museum", "Khan el-Khalili bazaar"], perfectFor: ["First-time visitors", "History lovers", "Couples"], hotelOptions: ["Sonesta Cairo (5★)", "Le Passage Cairo Hotel & Casino (5★)", "Hilton Ramses (5★)", "Hilton Nile Tower (5★)", "Fairmont Nile City (5★)", "Marriott Omar Khayyam (5★)"], netCostUSD: null },
  { slug: "cairo-north-coast", title: "Cairo & North Coast", country: "Egypt", duration: "8 Days", description: "Experience the perfect balance of ancient history and Mediterranean relaxation, from the Pyramids of Giza to the white sands of Egypt's North Coast, in one seamless journey.", highlights: ["Giza Pyramids & Sphinx", "Egyptian Museum", "Khan el-Khalili bazaar", "North Coast beach resort"], perfectFor: ["Families", "Couples", "Beach lovers"], hotelOptions: ["Marriott Omar Khayyam or Fairmont Nile City (Cairo) + Tolip North Coast (5★)"], netCostUSD: 975 },
  { slug: "sharm-el-sheikh", title: "Sharm El Sheikh Program", country: "Egypt", duration: "7 Days / 6 Nights", description: "Trade routine for turquoise water — Red Sea boat trips, sunset desert safaris, and the buzz of Naama Bay, balanced with two free days to simply relax on the beach.", highlights: ["Red Sea boat trip & snorkeling (excursion)", "Desert safari by quad bike (excursion)", "Old Market & Naama Bay tour (excursion)", "2 free beach days"], perfectFor: ["Adventure seekers", "Beach lovers", "Friends"], hotelOptions: ["Xperience St. George Sharm (4★)", "Dreams Vacation Resort (4★)", "Dreams Beach Resort (5★)", "Renaissance Golden View Beach Resort (5★)"], netCostUSD: null },
  { slug: "fatimid-cairo-alexandria", title: "Fatimid Cairo & Alexandria", country: "Egypt", duration: "5 Days / 4 Nights", description: "Wander Cairo's timeless bazaars and stand before the Pyramids of Giza, then extend your journey to the Mediterranean — Alexandria's Qaitbay Citadel and seafront Corniche await for those who want more.", highlights: ["Giza Pyramids, Sphinx & panorama", "Perfume & papyrus workshop", "Khan el-Khalili, Al-Azhar & Al-Muizz Street"], perfectFor: ["First-time visitors", "History lovers", "Couples"], hotelOptions: ["Aracan / Grand Pyramids Hotel (4★)", "Azal – Pyramids Park Hotel (4★)", "Gewan Hotel Cairo (5★) / Ramses Hilton"], netCostUSD: null },
  { slug: "cairo-hurghada-luxor", title: "Cairo – Hurghada – Luxor", country: "Egypt", duration: "8 Days / 7 Nights", description: "Discover Egypt's greatest treasures — from the Pyramids of Giza to the turquoise shores of the Red Sea — with the option to extend into Luxor's open-air museum of temples and tombs.", highlights: ["Giza Pyramids, Sphinx & papyrus institute", "Steila Makadi Garden Resort, Hurghada — 4 nights full board soft all-inclusive", "Luxor day trip (excursion)"], perfectFor: ["Couples", "Beach lovers", "History lovers"], hotelOptions: ["Cairo — Aracan/Grand Pyramids or Azal Pyramids Park (4★), 3 nights breakfast", "Hurghada — Steila Makadi Garden Resort, 4 nights full board soft all-inclusive"], netCostUSD: 575, netCostSingleUSD: 825 },
  { slug: "cairo-alexandria-hurghada-luxor", title: "Cairo – Alexandria – Hurghada – Luxor", country: "Egypt", duration: "9 Days / 8 Nights", description: "The complete Egyptian journey — pyramids, Mediterranean coastline, and Red Sea shores — extended with a full day in Alexandria and an extra night by the sea, with visa support and airport assistance handled for you.", highlights: ["Giza Pyramids, Sphinx & papyrus institute", "Alexandria day trip", "Steila Makadi Garden Resort, Hurghada — 5 nights full board soft all-inclusive", "Visa guarantee letter & facilitated Cairo airport entry"], perfectFor: ["Couples", "First-time visitors", "Beach lovers"], hotelOptions: ["Cairo — Aracan/Grand Pyramids or Azal Pyramids Park (4★), 3 nights breakfast", "Hurghada — Steila Makadi Garden Resort, 5 nights full board soft all-inclusive"], netCostUSD: 675, netCostSingleUSD: 995 },
  { slug: "grand-egypt-cairo-aswan-luxor-hurghada", title: "Grand Egypt: Cairo – Aswan – Luxor – Hurghada", country: "Egypt", duration: "10 Days / 9 Nights", description: "Cross Egypt by sleeper train and Nile cruise — from the Pyramids of Giza to Aswan's granite shores, the temples of Kom Ombo and Edfu, and finally the Red Sea. The definitive grand tour of Egypt, in one unforgettable journey.", highlights: ["Giza Pyramids, Sphinx & papyrus institute", "Overnight sleeper train, Cairo–Aswan", "3-night Nile cruise: Aswan → Kom Ombo → Edfu → Luxor", "Steila Makadi Garden Resort, Hurghada — 3 nights soft all-inclusive"], perfectFor: ["History lovers", "Luxury travelers", "First-time visitors"], hotelOptions: ["Cairo — Azal Pyramids/Grand Pyramids (4★), 2 nights breakfast", "Nile cruise (5★), 3 nights full board", "Hurghada — Steila Makadi Garden Resort (5★), 3 nights soft all-inclusive"], netCostUSD: 675, netCostSingleUSD: 925 },
  { slug: "cairo-sharm-el-sheikh", title: "Cairo – Sharm El Sheikh", country: "Egypt", duration: "10 Days / 9 Nights", description: "Two of Egypt's most iconic sides in one trip — the ancient wonders of Cairo and the turquoise waters of Sharm El Sheikh — with free beach days to unwind after every adventure.", highlights: ["Giza Pyramids, Sphinx & Khan el-Khalili bazaar", "Red Sea boat trip & snorkeling (excursion)", "Desert safari (excursion)", "Cairo 3 nights breakfast + Sharm El Sheikh 6 nights soft all-inclusive"], perfectFor: ["Families", "Beach lovers", "First-time visitors"], hotelOptions: ["Xperience St. George Sharm (4★)", "Dreams Vacation Resort (4★)", "Dreams Beach Resort (5★)", "Renaissance Golden View Beach Resort (5★)"], netCostUSD: null },
  { slug: "nile-cruise", title: "Nile Cruise — Luxor & Aswan", country: "Egypt", duration: "Multi-day cruise", description: "Sail the Nile as travelers have for centuries — waking each morning to a new temple on the riverbank, dining under the stars, and watching Egypt's ancient landscape drift past from the comfort of a luxury cabin.", highlights: ["Luxury cabin accommodation", "Fine dining on board", "Panoramic Nile views", "Expert tour guide", "24/7 Customer Service"], perfectFor: ["Couples", "Luxury travelers", "History lovers"], hotelOptions: ["Nile Cruise Sun Time", "Nile Cruise Tower Prestige", "Nile Cruise Grand Rose", "Nile Cruise Paradise", "Nile Cruise Montecarlo"], netCostUSD: null },
  { slug: "discover-dubai", title: "Discover Dubai", country: "Dubai", duration: "6 Days / 5 Nights", description: "From desert dunes to the world's tallest tower — witness Burj Khalifa, wander futuristic malls, and choose your own adventure with a desert safari, Abu Dhabi's Grand Mosque, or Palm Jumeirah's iconic shoreline.", highlights: ["Dubai City Tour: Dubai Frame, Museum of the Future, Burj Khalifa & Dubai Mall", "Desert safari (excursion)", "Abu Dhabi City Tour (excursion)", "Palm Jumeirah Tour (excursion)"], perfectFor: ["Families", "Luxury travelers", "First-time visitors"], hotelOptions: ["Coral Dubai Deira Hotel (4★)", "Khalidia Palace Hotel Dubai (5★)"], netCostUSD: null },
];

// Umrah/Hajj hotels — transcribed verbatim from content/omraHajj.ts. `currencyConfirmed: false` on
// the 17 international-sheet hotels reflects a real, unresolved open question in the source (USD vs
// SAR, never stated by the supplier's own PDF) — see research/04 and research/06. The 2
// `groupRateHotels` are confirmed SAR per their own source flyer.
const UMRAH_HOTELS = [
  { name: "Grand Al Massa", city: "Makkah", raw: "From $350/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Snood Ajyad", city: "Makkah", raw: "From $320/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Badr Al Massa", city: "Makkah", raw: "From $190/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Pullman Zam Zam Makkah", city: "Makkah", raw: "From $750/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Alsafwa Tower", city: "Makkah", raw: "From $650/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Sheraton Jabal Al Kaaba", city: "Makkah", raw: "From $480/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Meridien Ajyad", city: "Makkah", raw: "From $580/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Azka Al Safa", city: "Makkah", raw: "From $390/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Le Meridien Kudi", city: "Makkah", raw: "From $275/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "RUA Grand", city: "Madinah", raw: "From $270/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Al Fayroz Aldahbi", city: "Madinah", raw: "From $270/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "RUA Al Dhiyafa", city: "Madinah", raw: "From $270/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Al Saha", city: "Madinah", raw: "From $390/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Millennium Al Aqeeq", city: "Madinah", raw: "From $675/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Rotana Al Manakha", city: "Madinah", raw: "From $550/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Vally Almadina", city: "Madinah", raw: "From $450/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Dar Aleiman Al Haram", city: "Madinah", raw: "From $700/night (double)", currency: "USD", currencyConfirmed: false },
  { name: "Sari Al-Talaye Hotel (Mahbas Al-Jinn, Makkah)", city: "Makkah", raw: "From 50 SAR/night (group rate)", currency: "SAR", currencyConfirmed: true },
  { name: "Rawad Al-Mushair Hotel (Al-Rawdah district, Makkah)", city: "Makkah", raw: "From 45 SAR/night (group rate)", currency: "SAR", currencyConfirmed: true },
];

// Business Travel services — transcribed verbatim from content/businessTravel.ts (the 4 documented
// as sourced from Knowledge/Business_Travel/services.md; the 2 additional form-only cards —
// "Corporate Meetings", "Other" — are excluded here since they're UI-only, not a distinct
// documented service). Provider: TripGate (internal) — TripGate holds the IATA BSP accreditation
// itself; the airline seat is external, but the ticketing SERVICE is TripGate's own.
const BUSINESS_TRAVEL_SERVICES = [
  { name: "IATA BSP Ticketing", category: "Flight Ticketing", description: "Flight ticketing for all airlines, issued through our IATA BSP accreditation." },
  { name: "Seminars & Team-Building", category: "Corporate Event", description: "Turnkey planning for corporate seminars and team-building trips." },
  { name: "Congresses & Trade Shows", category: "Corporate Event", description: "Logistics for congresses, trade shows, and thematic corporate events." },
  { name: "Incentive & Reward Travel", category: "Corporate Event", description: "Incentive travel programs for rewarding and motivating teams." },
];

async function main() {
  // Deletion order follows the FK dependency graph leaf-first — this list grows every time a new
  // child-of-Trip table is added (Booking/Document/Payment/SupportTicket all arrived after this
  // script was first written), so update it here whenever a new Trip-attached entity is added.
  await prisma.organizationSettings.deleteMany();
  await prisma.knowledgeArticleLink.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.bookingLine.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.quoteLine.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.document.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.travelProduct.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tripRequirement.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.customer.deleteMany();

  // Operating model reflects real, evidenced reality today (see architecture/01_TARGET_ARCHITECTURE.md):
  // TripGate already mixes internal (own Morocco tours) and external (Moods Travel) sourcing.
  await prisma.organizationSettings.create({
    data: {
      operatingModel: "hybrid",
      enabledModules: JSON.stringify({
        leads: true,
        quotes: true,
        support: true,
        bookings: true,
        documents: false,
        payments: false,
        knowledgeBase: true,
        availability: false,
        customerPortal: false,
      }),
    },
  });

  const categoryByName = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.create({
      data: {
        name: c.name,
        nameFr: (c as any).nameFr ?? null,
        defaultUnitType: c.defaultUnitType,
        attributeSchema: JSON.stringify(c.attributeSchema),
      },
    });
    categoryByName.set(c.name, row.id);
  }

  const tripgate = await prisma.provider.create({
    data: {
      name: "TripGate",
      sourceKind: "internal",
      providerTypes: JSON.stringify(["Tour operator", "Business travel agent"]),
      status: "active",
    },
  });

  const moodsTravel = await prisma.provider.create({
    data: {
      name: "Moods Travel (Moods Tourism)",
      sourceKind: "external",
      providerTypes: JSON.stringify(["Tour operator / DMC"]),
      status: "active",
      commercialTerms: JSON.stringify({
        note: "Sole external wholesaler on file — supplies the Egypt/Dubai programs and Umrah/Hajj hotel inventory.",
      }),
    },
  });

  const tourCategoryId = categoryByName.get("Tour")!;
  const hotelCategoryId = categoryByName.get("Hotel")!;

  for (const t of MOROCCO_TOURS) {
    const fr = TOUR_FR[t.slug];
    await prisma.travelProduct.create({
      data: {
        name: t.title,
        shortDescription: t.description,
        nameFr: fr?.title ?? null,
        shortDescriptionFr: fr?.description ?? null,
        categoryId: tourCategoryId,
        providerId: tripgate.id,
        status: "active",
        unitType: "per_booking",
        // No price exists anywhere in the source for any of these 10 — matching content/tours.ts's
        // own `price: null` for every entry. Not invented here either.
        defaultNetCostMinor: null,
        defaultSellingPriceMinor: null,
        attributes: JSON.stringify({
          slug: t.slug,
          destinations: t.destinations,
          duration: t.duration,
          highlights: t.highlights,
          category: t.category,
          bestFor: t.bestFor,
          featured: (t as any).featured ?? false,
        }),
      },
    });
  }

  for (const p of INTERNATIONAL_PROGRAMS) {
    const fr = PROGRAM_FR[p.slug];
    await prisma.travelProduct.create({
      data: {
        name: p.title,
        shortDescription: p.description,
        nameFr: fr?.title ?? null,
        shortDescriptionFr: fr?.description ?? null,
        categoryId: tourCategoryId,
        providerId: moodsTravel.id,
        status: "active",
        unitType: "per_person",
        baseCurrency: p.netCostUSD != null ? "USD" : null,
        defaultNetCostMinor: p.netCostUSD != null ? Math.round(p.netCostUSD * 100) : null,
        attributes: JSON.stringify({
          slug: p.slug,
          country: p.country,
          duration: p.duration,
          highlights: p.highlights,
          perfectFor: p.perfectFor,
          hotelOptions: p.hotelOptions,
          netCostSingleUSD: (p as any).netCostSingleUSD ?? null,
        }),
      },
    });
  }

  for (const h of UMRAH_HOTELS) {
    const perNight = parseFromPrice(h.raw);
    await prisma.travelProduct.create({
      data: {
        name: h.name,
        shortDescription: `Umrah/Hajj hotel — ${h.city}`,
        shortDescriptionFr: `Hôtel Omra/Hajj — ${h.city}`,
        categoryId: hotelCategoryId,
        providerId: moodsTravel.id,
        status: "active",
        unitType: "per_night",
        baseCurrency: h.currency,
        defaultNetCostMinor: perNight != null ? Math.round(perNight * 100) : null,
        attributes: JSON.stringify({
          city: h.city,
          currencyConfirmed: h.currencyConfirmed,
          currencyNote: h.currencyConfirmed
            ? "Confirmed SAR per source flyer."
            : "Currency not confirmed by the supplier — do not treat as confirmed USD until verified.",
        }),
      },
    });
  }

  for (const s of BUSINESS_TRAVEL_SERVICES) {
    const fr = BUSINESS_SERVICE_FR[s.name];
    await prisma.travelProduct.create({
      data: {
        name: s.name,
        shortDescription: s.description,
        nameFr: fr?.title ?? null,
        shortDescriptionFr: fr?.description ?? null,
        categoryId: categoryByName.get(s.category)!,
        providerId: tripgate.id,
        status: "active",
        unitType: "per_booking",
        defaultNetCostMinor: null,
        defaultSellingPriceMinor: null,
      },
    });
  }

  const productCount = await prisma.travelProduct.count();
  console.log(`Seeded ${productCount} TravelProducts across 2 Providers and ${CATEGORIES.length} Categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
