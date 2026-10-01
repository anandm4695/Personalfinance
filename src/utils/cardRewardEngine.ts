/**
 * Smart Credit Card Reward & Cashback Engine
 *
 * Real-time matching, ranking, and savings calculator for credit cards
 * against merchants (Swiggy, Zomato, Amazon, Blinkit, etc.) and spend categories.
 */

export interface MerchantInfo {
  id: string;
  name: string;
  category: string;
  brandName?: string;
  keywords: string[];
  typicalSpend: number;
  description: string;
  badge?: string;
}

export interface CardRewardPerk {
  returnPct: number;
  perkType: "cashback" | "reward_points" | "discount" | "miles";
  description: string;
  maxCap?: string;
  badge?: string;
}

export interface CardPerkRule {
  matchKeys: string[];
  cardDisplayName: string;
  merchantPerks?: Record<string, CardRewardPerk>;
  categoryPerks?: Record<string, CardRewardPerk>;
  defaultOnlineReturnPct: number;
  defaultOfflineReturnPct: number;
  specialPerks?: string[];
  forexMarkupPct?: number; // 0 for Scapia, OneCard (1%), etc.
}

export interface EvaluatedCardPayment {
  cardId: string;
  cardName: string;
  bankName: string;
  network?: string;
  last4?: string;
  owner?: string;
  availableLimit: number;
  limit: number;
  outstanding: number;
  interestFreeDays: number;
  nextDueDateStr: string;
  returnPct: number;
  savingsInINR: number;
  perkType: "cashback" | "reward_points" | "discount" | "miles";
  perkHeadline: string;
  perkReason: string;
  maxCap?: string;
  badge?: string;
  isCoBrandedMatch: boolean;
  score: number;
}

export interface BestMarketAlternative {
  cardName: string;
  bankName: string;
  returnPct: number;
  savingsInINR: number;
  reason: string;
  extraSavingsVsTopOwned: number;
}

export interface PaymentRecommendationResult {
  merchantName: string;
  category: string;
  amount: number;
  topCard: EvaluatedCardPayment | null;
  rankedCards: EvaluatedCardPayment[];
  bestMarketAlternative: BestMarketAlternative | null;
  totalCardsEvaluated: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// POPULAR MERCHANTS REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
export const POPULAR_MERCHANTS: MerchantInfo[] = [
  // ── Food & Dining
  {
    id: "swiggy",
    name: "Swiggy",
    category: "Food & Dining",
    brandName: "Swiggy",
    keywords: ["swiggy", "swigy", "instamart", "dineout", "swiggy instamart", "swiggy gourmet"],
    typicalSpend: 800,
    description: "Food delivery, Instamart groceries, and Dineout restaurant bills",
    badge: "Food & Groceries",
  },
  {
    id: "zomato",
    name: "Zomato",
    category: "Food & Dining",
    brandName: "Zomato",
    keywords: ["zomato", "zomatto", "district", "zomato gold", "zomato dining"],
    typicalSpend: 750,
    description: "Food delivery, Zomato Gold, and dining out restaurant payments",
    badge: "Food & Dining",
  },
  {
    id: "eazydiner",
    name: "EazyDiner",
    category: "Food & Dining",
    brandName: "EazyDiner",
    keywords: ["eazydiner", "eazy diner", "prime dining"],
    typicalSpend: 2000,
    description: "Table booking and table bill payments with dining discounts",
    badge: "Dining Discounts",
  },
  {
    id: "starbucks",
    name: "Starbucks",
    category: "Food & Dining",
    brandName: "Starbucks",
    keywords: ["starbucks", "tata starbucks", "coffee"],
    typicalSpend: 550,
    description: "Coffee shops and cafes nationwide",
  },
  {
    id: "mcdonalds",
    name: "McDonald's / Domino's",
    category: "Food & Dining",
    brandName: "McDonald's",
    keywords: ["mcdonalds", "mcd", "dominos", "pizza", "burger king", "kfc"],
    typicalSpend: 650,
    description: "Fast food chains and quick service restaurants",
  },

  // ── Online Shopping & E-Commerce
  {
    id: "amazon",
    name: "Amazon India",
    category: "Online Shopping",
    brandName: "Amazon",
    keywords: ["amazon", "amazon.in", "amazon pay", "amazon prime", "kindle"],
    typicalSpend: 2500,
    description: "Amazon e-commerce marketplace, electronics, fashion, and Amazon Pay",
    badge: "Top Marketplace",
  },
  {
    id: "flipkart",
    name: "Flipkart",
    category: "Online Shopping",
    brandName: "Flipkart",
    keywords: ["flipkart", "flipkart.com", "supercoin", "minutes"],
    typicalSpend: 2500,
    description: "Electronics, appliances, fashion, and Flipkart Minutes",
    badge: "Top Marketplace",
  },
  {
    id: "myntra",
    name: "Myntra",
    category: "Online Shopping",
    brandName: "Myntra",
    keywords: ["myntra", "myntra.com", "fashion"],
    typicalSpend: 2000,
    description: "Fashion apparel, footwear, and lifestyle shopping",
  },
  {
    id: "tata_neu",
    name: "Tata Neu / Croma",
    category: "Online Shopping",
    brandName: "Tata Neu",
    keywords: ["tata neu", "tataneu", "croma", "tata cliq", "westside", "titan", "tanishq"],
    typicalSpend: 3000,
    description: "Tata digital ecosystem, electronics at Croma, and NeuPass brands",
    badge: "NeuCoins Ecosystem",
  },
  {
    id: "nykaa",
    name: "Nykaa",
    category: "Online Shopping",
    brandName: "Nykaa",
    keywords: ["nykaa", "nykaa man", "cosmetics", "beauty"],
    typicalSpend: 1800,
    description: "Beauty, skincare, grooming, and luxury fashion",
  },
  {
    id: "apple",
    name: "Apple Store India",
    category: "Electronics",
    brandName: "Apple",
    keywords: ["apple", "apple store", "iphone", "macbook", "ipad", "itunes"],
    typicalSpend: 40000,
    description: "Official Apple store, MacBooks, iPhones, and app subscriptions",
  },

  // ── Quick Commerce & Groceries
  {
    id: "blinkit",
    name: "Blinkit",
    category: "Quick Commerce",
    brandName: "Blinkit",
    keywords: ["blinkit", "grofers", "quick commerce"],
    typicalSpend: 600,
    description: "10-minute grocery delivery and instant essentials",
    badge: "10-Min Delivery",
  },
  {
    id: "zepto",
    name: "Zepto",
    category: "Quick Commerce",
    brandName: "Zepto",
    keywords: ["zepto", "zepto cafe", "zepto pass"],
    typicalSpend: 650,
    description: "Instant groceries, fresh fruits, vegetables, and snacks",
    badge: "10-Min Delivery",
  },
  {
    id: "bigbasket",
    name: "BigBasket / BB Daily",
    category: "Quick Commerce",
    brandName: "BigBasket",
    keywords: ["bigbasket", "bbnow", "bb daily", "groceries"],
    typicalSpend: 1500,
    description: "Weekly groceries, staples, dairy, and household essentials",
  },

  // ── Travel, Flights & Hotels
  {
    id: "makemytrip",
    name: "MakeMyTrip",
    category: "Travel & Flights",
    brandName: "MakeMyTrip",
    keywords: ["makemytrip", "mmt", "flights", "hotels", "homestays"],
    typicalSpend: 8000,
    description: "Flight tickets, hotel bookings, holiday packages, and cabs",
    badge: "Travel Hub",
  },
  {
    id: "easemytrip",
    name: "EaseMyTrip",
    category: "Travel & Flights",
    brandName: "EaseMyTrip",
    keywords: ["easemytrip", "emt", "flights zero convenience fee"],
    typicalSpend: 7500,
    description: "Flight bookings with zero convenience fee and hotel stays",
  },
  {
    id: "cleartrip",
    name: "Cleartrip",
    category: "Travel & Flights",
    brandName: "Cleartrip",
    keywords: ["cleartrip", "clear trip", "flipkart travel"],
    typicalSpend: 7000,
    description: "Domestic and international flight tickets & hotel stays",
  },
  {
    id: "irctc",
    name: "IRCTC Train Booking",
    category: "Travel & Flights",
    brandName: "IRCTC",
    keywords: ["irctc", "train tickets", "railway booking", "indian railways"],
    typicalSpend: 1200,
    description: "Indian Railways train tickets and Vande Bharat bookings",
  },
  {
    id: "uber",
    name: "Uber / Ola Cabs",
    category: "Travel & Flights",
    brandName: "Uber",
    keywords: ["uber", "ola", "rapido", "cab", "rides", "auto"],
    typicalSpend: 400,
    description: "Daily city taxi rides, airport drops, and auto commute",
  },

  // ── Utilities, Bills & Telecom
  {
    id: "airtel",
    name: "Airtel (Bills & Broadband)",
    category: "Utilities & Bills",
    brandName: "Airtel",
    keywords: ["airtel", "airtel thanks", "airtel broadband", "airtel dth", "airtel postpaid"],
    typicalSpend: 1200,
    description: "Airtel postpaid bills, fiber broadband, DTH, and mobile recharges",
    badge: "Telecom & Fiber",
  },
  {
    id: "electricity_bills",
    name: "Electricity & Gas Bills",
    category: "Utilities & Bills",
    brandName: "Electricity",
    keywords: ["electricity", "power bill", "gas bill", "tata power", "bescom", "adani power", "mahadiscom", "cesc"],
    typicalSpend: 2500,
    description: "Monthly municipal power supply and piped gas utility payments",
  },
  {
    id: "jio",
    name: "Jio Fiber & Mobile",
    category: "Utilities & Bills",
    brandName: "Jio",
    keywords: ["jio", "myjio", "jiofiber", "airfiber", "jio recharge"],
    typicalSpend: 1000,
    description: "Jio prepaid/postpaid recharges and JioFiber high-speed broadband",
  },

  // ── Entertainment & Movies
  {
    id: "bookmyshow",
    name: "BookMyShow",
    category: "Entertainment",
    brandName: "BookMyShow",
    keywords: ["bookmyshow", "bms", "movies", "cinema", "concerts", "pvr", "inox"],
    typicalSpend: 800,
    description: "Movie tickets, live concerts, theatre shows, and events",
    badge: "Movies & Events",
  },
  {
    id: "streaming",
    name: "Netflix / Prime / Hotstar",
    category: "Entertainment",
    brandName: "Netflix",
    keywords: ["netflix", "spotify", "hotstar", "disney", "youtube premium", "prime video", "apple tv"],
    typicalSpend: 499,
    description: "Monthly video and music streaming subscriptions",
  },

  // ── Fuel & Petrol
  {
    id: "fuel_pumps",
    name: "Fuel (Petrol & Diesel)",
    category: "Fuel",
    brandName: "HPCL",
    keywords: ["fuel", "petrol", "diesel", "hpcl", "iocl", "bpcl", "indian oil", "bharat petroleum", "shell"],
    typicalSpend: 2000,
    description: "Petrol pumps (HPCL, BPCL, IndianOil, Shell) with fuel surcharge waiver",
  },

  // ── International & Forex
  {
    id: "forex_international",
    name: "International & Forex Spends",
    category: "International Spends",
    brandName: "Forex",
    keywords: ["forex", "international", "foreign currency", "usd", "eur", "gbp", "overseas", "international travel"],
    typicalSpend: 15000,
    description: "Zero forex markup cards for overseas travel and foreign website payments",
    badge: "Zero Forex Markup",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SPEND CATEGORIES LIST
// ─────────────────────────────────────────────────────────────────────────────
export const SPEND_CATEGORIES = [
  "Food & Dining",
  "Online Shopping",
  "Quick Commerce",
  "Travel & Flights",
  "Utilities & Bills",
  "Entertainment",
  "Fuel",
  "Electronics",
  "International Spends",
  "General Spends",
];

// ─────────────────────────────────────────────────────────────────────────────
// CARD PERK KNOWLEDGE BASE (INDIAN CREDIT CARDS)
// ─────────────────────────────────────────────────────────────────────────────
export const CARD_PERK_RULES: CardPerkRule[] = [
  // ── HDFC Bank Cards
  {
    matchKeys: ["swiggy", "hdfc swiggy"],
    cardDisplayName: "HDFC Swiggy Credit Card",
    merchantPerks: {
      swiggy: { returnPct: 10.0, perkType: "cashback", description: "10% direct cashback on Swiggy (Food, Instamart, Dineout, Genie)", maxCap: "₹1,500/mo", badge: "10% Cashback" },
      zomato: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on top online platforms", maxCap: "₹1,500/mo" },
      amazon: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on online e-commerce shopping", maxCap: "₹1,500/mo" },
      flipkart: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on Flipkart", maxCap: "₹1,500/mo" },
      blinkit: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on quick commerce apps", maxCap: "₹1,500/mo" },
      zepto: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on Zepto", maxCap: "₹1,500/mo" },
      myntra: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on fashion platforms", maxCap: "₹1,500/mo" },
      uber: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on cab rides", maxCap: "₹1,500/mo" },
      bookmyshow: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on BookMyShow", maxCap: "₹1,500/mo" },
    },
    categoryPerks: {
      "Food & Dining": { returnPct: 10.0, perkType: "cashback", description: "10% on Swiggy & 5% on top dining platforms" },
      "Quick Commerce": { returnPct: 10.0, perkType: "cashback", description: "10% on Instamart & 5% on Blinkit/Zepto" },
      "Online Shopping": { returnPct: 5.0, perkType: "cashback", description: "5% cashback on 1000+ top online shopping platforms" },
    },
    defaultOnlineReturnPct: 1.0,
    defaultOfflineReturnPct: 1.0,
    specialPerks: ["10% on Swiggy ecosystem", "5% on top digital apps", "1% other retail"],
  },
  {
    matchKeys: ["tata neu infinity", "neu infinity"],
    cardDisplayName: "HDFC Tata Neu Infinity",
    merchantPerks: {
      tata_neu: { returnPct: 10.0, perkType: "reward_points", description: "10% NeuCoins on Tata Neu, Croma, 1mg, BigBasket", badge: "10% NeuCoins" },
      bigbasket: { returnPct: 10.0, perkType: "reward_points", description: "10% NeuCoins on BigBasket groceries", badge: "10% NeuCoins" },
      airtel: { returnPct: 5.0, perkType: "reward_points", description: "5% NeuCoins on utility bill payments via Tata Neu" },
      electricity_bills: { returnPct: 5.0, perkType: "reward_points", description: "5% NeuCoins on electricity bill payments via Tata Neu" },
    },
    categoryPerks: {
      "Quick Commerce": { returnPct: 10.0, perkType: "reward_points", description: "10% on BigBasket / BBnow" },
      "Online Shopping": { returnPct: 10.0, perkType: "reward_points", description: "10% on Tata Neu & Croma; 1.5% other UPI/non-Tata spends" },
      "Utilities & Bills": { returnPct: 5.0, perkType: "reward_points", description: "5% on bill payments via Tata Neu App" },
    },
    defaultOnlineReturnPct: 1.5,
    defaultOfflineReturnPct: 1.5,
    specialPerks: ["1.5% NeuCoins on RuPay UPI spends", "Complimentary domestic & international lounge access"],
  },
  {
    matchKeys: ["millennia", "hdfc millennia"],
    cardDisplayName: "HDFC Millennia Credit Card",
    merchantPerks: {
      swiggy: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on Swiggy, Amazon, Flipkart, Myntra, Zomato", maxCap: "₹1,000/mo", badge: "5% Cashback" },
      zomato: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on Zomato food delivery", maxCap: "₹1,000/mo" },
      amazon: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on Amazon shopping", maxCap: "₹1,000/mo" },
      flipkart: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on Flipkart e-commerce", maxCap: "₹1,000/mo" },
      myntra: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on Myntra fashion", maxCap: "₹1,000/mo" },
      uber: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on Uber rides", maxCap: "₹1,000/mo" },
      bookmyshow: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on BookMyShow movie tickets", maxCap: "₹1,000/mo" },
    },
    categoryPerks: {
      "Food & Dining": { returnPct: 5.0, perkType: "cashback", description: "5% cashback on Swiggy, Zomato, Dineout" },
      "Online Shopping": { returnPct: 5.0, perkType: "cashback", description: "5% cashback on Amazon, Flipkart, Myntra, Tata CLiQ" },
    },
    defaultOnlineReturnPct: 1.0,
    defaultOfflineReturnPct: 1.0,
    specialPerks: ["5% cashback on 10 partner merchants", "1% on all other spends", "₹1,000 quarterly spend milestone vouchers"],
  },
  {
    matchKeys: ["regalia", "regalia gold", "hdfc regalia"],
    cardDisplayName: "HDFC Regalia Gold",
    merchantPerks: {
      nykaa: { returnPct: 6.6, perkType: "reward_points", description: "5X Reward Points (6.6% value) on Nykaa, Myntra, Marks & Spencer, Reliance Digital" },
      myntra: { returnPct: 6.6, perkType: "reward_points", description: "5X Reward Points (6.6% value) on Myntra fashion" },
      makemytrip: { returnPct: 6.6, perkType: "reward_points", description: "Accelerated SmartBuy points on flight & hotel bookings" },
      easemytrip: { returnPct: 6.6, perkType: "reward_points", description: "SmartBuy voucher redemption value" },
    },
    categoryPerks: {
      "Travel & Flights": { returnPct: 6.6, perkType: "reward_points", description: "5X points on SmartBuy flights and hotels" },
      "Online Shopping": { returnPct: 6.6, perkType: "reward_points", description: "5X points on partner retail brands" },
    },
    defaultOnlineReturnPct: 1.33,
    defaultOfflineReturnPct: 1.33,
    specialPerks: ["12 complimentary domestic airport lounges/yr", "6 international lounges via Priority Pass", "Flight vouchers on spend milestones"],
  },
  {
    matchKeys: ["infinia", "hdfc infinia"],
    cardDisplayName: "HDFC Infinia Metal",
    merchantPerks: {
      makemytrip: { returnPct: 33.3, perkType: "reward_points", description: "10X SmartBuy Points (33.3% value) on hotel bookings; 5X (16.6%) on flights", badge: "Up to 33.3% Value" },
      swiggy: { returnPct: 16.6, perkType: "reward_points", description: "5X SmartBuy Gyftr voucher points (16.6% return on Swiggy)", badge: "16.6% via Gyftr" },
      amazon: { returnPct: 16.6, perkType: "reward_points", description: "5X SmartBuy Gyftr voucher points (16.6% return on Amazon Shopping)", badge: "16.6% via Gyftr" },
      zomato: { returnPct: 16.6, perkType: "reward_points", description: "5X SmartBuy Gyftr voucher points (16.6% return on Zomato)", badge: "16.6% via Gyftr" },
      flipkart: { returnPct: 16.6, perkType: "reward_points", description: "5X SmartBuy Gyftr voucher points (16.6% return on Flipkart)", badge: "16.6% via Gyftr" },
      apple: { returnPct: 16.6, perkType: "reward_points", description: "5X SmartBuy Gyftr vouchers or 10X hotel partner transfer" },
    },
    categoryPerks: {
      "Travel & Flights": { returnPct: 33.3, perkType: "reward_points", description: "Up to 33.3% value on SmartBuy hotels and 16.6% on flights (1 Point = ₹1)" },
      "Food & Dining": { returnPct: 16.6, perkType: "reward_points", description: "16.6% return via SmartBuy Gyftr instant food vouchers, 3.33% base" },
      "Online Shopping": { returnPct: 16.6, perkType: "reward_points", description: "16.6% return via SmartBuy e-vouchers, 3.33% base retail" },
      "International Spends": { returnPct: 3.33, perkType: "reward_points", description: "3.33% base points with lowest 2.0% forex markup" },
    },
    defaultOnlineReturnPct: 3.33,
    defaultOfflineReturnPct: 3.33,
    specialPerks: ["1:1 Point conversion on flights and hotels", "Unlimited domestic & global lounge access with add-ons", "ITC 1+1 buffet dining"],
  },

  // ── Axis Bank Cards
  {
    matchKeys: ["airtel axis", "axis airtel"],
    cardDisplayName: "Airtel Axis Bank Credit Card",
    merchantPerks: {
      airtel: { returnPct: 25.0, perkType: "cashback", description: "25% direct cashback on Airtel Mobile, Broadband & DTH via Airtel Thanks App", maxCap: "₹250/mo", badge: "25% Cashback" },
      electricity_bills: { returnPct: 10.0, perkType: "cashback", description: "10% cashback on Electricity, Gas & Water bill payments via Airtel Thanks", maxCap: "₹250/mo", badge: "10% Cashback" },
      swiggy: { returnPct: 10.0, perkType: "cashback", description: "10% cashback on Swiggy food orders", maxCap: "₹500/mo", badge: "10% Cashback" },
      zomato: { returnPct: 10.0, perkType: "cashback", description: "10% cashback on Zomato delivery", maxCap: "₹500/mo", badge: "10% Cashback" },
      bigbasket: { returnPct: 10.0, perkType: "cashback", description: "10% cashback on BigBasket groceries", maxCap: "₹500/mo", badge: "10% Cashback" },
    },
    categoryPerks: {
      "Utilities & Bills": { returnPct: 25.0, perkType: "cashback", description: "25% on Airtel bills & 10% on electricity/gas via Airtel Thanks" },
      "Food & Dining": { returnPct: 10.0, perkType: "cashback", description: "10% cashback on Swiggy and Zomato" },
      "Quick Commerce": { returnPct: 10.0, perkType: "cashback", description: "10% cashback on BigBasket grocery orders" },
    },
    defaultOnlineReturnPct: 1.0,
    defaultOfflineReturnPct: 1.0,
    specialPerks: ["25% on Airtel ecosystem", "10% on utilities & Swiggy/Zomato/BigBasket", "4 complimentary domestic lounge visits/yr"],
  },
  {
    matchKeys: ["axis ace", "ace"],
    cardDisplayName: "Axis Bank ACE Credit Card",
    merchantPerks: {
      electricity_bills: { returnPct: 5.0, perkType: "cashback", description: "5% cashback on utility bills via Google Pay (Electricity, Gas, Internet)", maxCap: "₹500/mo", badge: "5% Cashback" },
      swiggy: { returnPct: 4.0, perkType: "cashback", description: "4% cashback on Swiggy food delivery", maxCap: "₹500/mo" },
      zomato: { returnPct: 4.0, perkType: "cashback", description: "4% cashback on Zomato food delivery", maxCap: "₹500/mo" },
      uber: { returnPct: 4.0, perkType: "cashback", description: "4% cashback on Uber rides", maxCap: "₹500/mo" },
      ola: { returnPct: 4.0, perkType: "cashback", description: "4% cashback on Ola cabs", maxCap: "₹500/mo" },
    },
    categoryPerks: {
      "Utilities & Bills": { returnPct: 5.0, perkType: "cashback", description: "5% on Bill Payments via Google Pay" },
      "Food & Dining": { returnPct: 4.0, perkType: "cashback", description: "4% on Swiggy and Zomato" },
      "Travel & Flights": { returnPct: 4.0, perkType: "cashback", description: "4% on Uber & Ola commute" },
    },
    defaultOnlineReturnPct: 1.5,
    defaultOfflineReturnPct: 1.5,
    specialPerks: ["5% on utility bills via GPay", "4% on Swiggy/Zomato/Uber", "1.5% flat unlimited cashback on all other spends"],
  },
  {
    matchKeys: ["flipkart axis", "axis flipkart"],
    cardDisplayName: "Flipkart Axis Bank Credit Card",
    merchantPerks: {
      flipkart: { returnPct: 5.0, perkType: "cashback", description: "5% unlimited direct cashback on Flipkart shopping", badge: "5% Unlimited" },
      cleartrip: { returnPct: 5.0, perkType: "cashback", description: "5% unlimited direct cashback on Cleartrip flights & hotels", badge: "5% Unlimited" },
      swiggy: { returnPct: 4.0, perkType: "cashback", description: "4% cashback on Swiggy food orders" },
      uber: { returnPct: 4.0, perkType: "cashback", description: "4% cashback on Uber taxi rides" },
      pvr: { returnPct: 4.0, perkType: "cashback", description: "4% cashback on PVR INOX cinema tickets" },
    },
    categoryPerks: {
      "Online Shopping": { returnPct: 5.0, perkType: "cashback", description: "5% unlimited cashback on Flipkart" },
      "Travel & Flights": { returnPct: 5.0, perkType: "cashback", description: "5% on Cleartrip and 4% on Uber" },
      "Food & Dining": { returnPct: 4.0, perkType: "cashback", description: "4% on Swiggy food orders" },
    },
    defaultOnlineReturnPct: 1.0,
    defaultOfflineReturnPct: 1.0,
    specialPerks: ["5% unlimited cashback on Flipkart & Cleartrip", "4% on Swiggy, Uber, PVR", "1% on all other transactions"],
  },
  {
    matchKeys: ["axis atlas", "atlas"],
    cardDisplayName: "Axis Bank Atlas",
    merchantPerks: {
      makemytrip: { returnPct: 10.0, perkType: "miles", description: "5 EDGE Miles/₹100 (10% partner transfer value) on direct airline & hotel spends", badge: "10% Miles Value" },
      easemytrip: { returnPct: 10.0, perkType: "miles", description: "5 EDGE Miles/₹100 (10% partner transfer value) on flights & hotels" },
      cleartrip: { returnPct: 10.0, perkType: "miles", description: "5 EDGE Miles/₹100 on travel booking platforms" },
      apple: { returnPct: 4.0, perkType: "miles", description: "2 EDGE Miles/₹100 (4% transfer value) on general retail" },
    },
    categoryPerks: {
      "Travel & Flights": { returnPct: 10.0, perkType: "miles", description: "5 EDGE Miles per ₹100 on Airlines & Hotels (1:2 transfer ratio to airline partners)" },
      "International Spends": { returnPct: 4.0, perkType: "miles", description: "2 EDGE Miles per ₹100 on all foreign retail transactions" },
    },
    defaultOnlineReturnPct: 4.0,
    defaultOfflineReturnPct: 4.0,
    specialPerks: ["1 EDGE Mile = 2 Partner Points (Accor, Singapore Airlines, Qatar, Turkish)", "Up to 18 complimentary international & domestic lounges"],
  },

  // ── ICICI Bank Cards
  {
    matchKeys: ["amazon pay", "icici amazon", "amazon icici"],
    cardDisplayName: "ICICI Amazon Pay Credit Card",
    merchantPerks: {
      amazon: { returnPct: 5.0, perkType: "cashback", description: "5% unlimited cashback for Amazon Prime members (3% for non-Prime)", badge: "5% Unlimited" },
      swiggy: { returnPct: 2.0, perkType: "cashback", description: "2% cashback on 100+ Amazon Pay partner merchants (Swiggy, Zomato, Uber, BookMyShow)" },
      zomato: { returnPct: 2.0, perkType: "cashback", description: "2% cashback on Zomato via Amazon Pay" },
      uber: { returnPct: 2.0, perkType: "cashback", description: "2% cashback on Uber cabs" },
      airtel: { returnPct: 2.0, perkType: "cashback", description: "2% cashback on mobile & broadband recharges via Amazon Pay" },
      electricity_bills: { returnPct: 2.0, perkType: "cashback", description: "2% cashback on electricity & utility bills via Amazon Pay" },
      bookmyshow: { returnPct: 2.0, perkType: "cashback", description: "2% cashback on BookMyShow movie tickets" },
    },
    categoryPerks: {
      "Online Shopping": { returnPct: 5.0, perkType: "cashback", description: "5% unlimited cashback on Amazon India" },
      "Utilities & Bills": { returnPct: 2.0, perkType: "cashback", description: "2% cashback on all recharges and bills via Amazon Pay" },
      "Food & Dining": { returnPct: 2.0, perkType: "cashback", description: "2% cashback on food delivery partner platforms" },
    },
    defaultOnlineReturnPct: 1.0,
    defaultOfflineReturnPct: 1.0,
    specialPerks: ["Lifetime Free Card (LTF)", "No upper cap on cashback", "Auto-credited to Amazon Pay Balance on statement date"],
  },
  {
    matchKeys: ["sapphiro", "icici sapphiro"],
    cardDisplayName: "ICICI Sapphiro",
    merchantPerks: {
      bookmyshow: { returnPct: 25.0, perkType: "discount", description: "Buy 1 Get 1 Free on BookMyShow (up to ₹500 off twice a month)", badge: "BOGO Movie Tickets" },
      swiggy: { returnPct: 1.5, perkType: "reward_points", description: "ICICI Culinary Treats dining discount + 4 ICICI Rewards per ₹100" },
      makemytrip: { returnPct: 2.0, perkType: "reward_points", description: "4 ICICI Rewards per ₹100 (₹1/100 value) + lounge access" },
    },
    categoryPerks: {
      "Entertainment": { returnPct: 25.0, perkType: "discount", description: "Buy 1 Get 1 free movie ticket up to ₹500 discount twice every month on BMS" },
      "Food & Dining": { returnPct: 3.0, perkType: "discount", description: "Culinary Treats dining program discounts at premium restaurants" },
    },
    defaultOnlineReturnPct: 1.0,
    defaultOfflineReturnPct: 0.5,
    specialPerks: ["DreamFolios DragonPass international lounge access", "Golf rounds quarterly", "Dual Mastercard + Amex companion cards"],
  },

  // ── SBI Cards
  {
    matchKeys: ["sbi cashback", "cashback sbi", "cashback"],
    cardDisplayName: "SBI Cashback Credit Card",
    merchantPerks: {
      swiggy: { returnPct: 5.0, perkType: "cashback", description: "5% flat online cashback on Swiggy (Food & Instamart)", maxCap: "₹5,000/mo", badge: "5% Flat Cashback" },
      zomato: { returnPct: 5.0, perkType: "cashback", description: "5% flat online cashback on Zomato orders", maxCap: "₹5,000/mo", badge: "5% Flat Cashback" },
      amazon: { returnPct: 5.0, perkType: "cashback", description: "5% flat online cashback on Amazon Shopping", maxCap: "₹5,000/mo", badge: "5% Flat Cashback" },
      flipkart: { returnPct: 5.0, perkType: "cashback", description: "5% flat online cashback on Flipkart", maxCap: "₹5,000/mo", badge: "5% Flat Cashback" },
      blinkit: { returnPct: 5.0, perkType: "cashback", description: "5% flat online cashback on Blinkit quick delivery", maxCap: "₹5,000/mo", badge: "5% Flat Cashback" },
      zepto: { returnPct: 5.0, perkType: "cashback", description: "5% flat online cashback on Zepto", maxCap: "₹5,000/mo", badge: "5% Flat Cashback" },
      myntra: { returnPct: 5.0, perkType: "cashback", description: "5% flat online cashback on Myntra fashion", maxCap: "₹5,000/mo", badge: "5% Flat Cashback" },
      makemytrip: { returnPct: 5.0, perkType: "cashback", description: "5% flat online cashback on travel tickets and hotel bookings", maxCap: "₹5,000/mo", badge: "5% Flat Cashback" },
      bookmyshow: { returnPct: 5.0, perkType: "cashback", description: "5% flat online cashback on BookMyShow", maxCap: "₹5,000/mo", badge: "5% Flat Cashback" },
      apple: { returnPct: 5.0, perkType: "cashback", description: "5% flat online cashback on Apple online purchases", maxCap: "₹5,000/mo", badge: "5% Flat Cashback" },
    },
    categoryPerks: {
      "Food & Dining": { returnPct: 5.0, perkType: "cashback", description: "5% on all online food delivery and dining apps" },
      "Online Shopping": { returnPct: 5.0, perkType: "cashback", description: "5% flat cashback on ANY online merchant across India" },
      "Quick Commerce": { returnPct: 5.0, perkType: "cashback", description: "5% flat cashback on all quick commerce grocery platforms" },
      "Travel & Flights": { returnPct: 5.0, perkType: "cashback", description: "5% on all online airline, train, and bus booking portals" },
      "Entertainment": { returnPct: 5.0, perkType: "cashback", description: "5% on all online cinema and event booking websites" },
      "Electronics": { returnPct: 5.0, perkType: "cashback", description: "5% on electronic gadgets bought online" },
      "International Spends": { returnPct: 1.0, perkType: "cashback", description: "5% online cashback minus 3.5% international forex markup (net ~1.0% return)" },
    },
    defaultOnlineReturnPct: 5.0,
    defaultOfflineReturnPct: 1.0,
    specialPerks: ["5% flat cashback on nearly ALL online spends up to ₹5,000/month", "Auto-credited directly to card statement"],
  },
  {
    matchKeys: ["simplyclick", "sbi simplyclick"],
    cardDisplayName: "SBI SimplyClick Credit Card",
    merchantPerks: {
      amazon: { returnPct: 2.5, perkType: "reward_points", description: "10X Reward Points (2.5% return) on Amazon India", badge: "10X Points (2.5%)" },
      bookmyshow: { returnPct: 2.5, perkType: "reward_points", description: "10X Reward Points (2.5% return) on BookMyShow" },
      cleartrip: { returnPct: 2.5, perkType: "reward_points", description: "10X Reward Points (2.5% return) on Cleartrip flight bookings" },
      swiggy: { returnPct: 2.5, perkType: "reward_points", description: "10X Reward Points (2.5% return) on Swiggy orders" },
      zomato: { returnPct: 2.5, perkType: "reward_points", description: "10X Reward Points (2.5% return) on Zomato delivery" },
    },
    categoryPerks: {
      "Online Shopping": { returnPct: 2.5, perkType: "reward_points", description: "10X points (2.5%) on partner digital brands; 5X points (1.25%) on all other online spends" },
      "Food & Dining": { returnPct: 2.5, perkType: "reward_points", description: "10X reward points on partner food delivery platforms" },
    },
    defaultOnlineReturnPct: 1.25,
    defaultOfflineReturnPct: 0.25,
    specialPerks: ["10X points on Amazon, BookMyShow, Cleartrip, Lenskart, Netmeds, Swiggy", "₹2,000 Cleartrip e-voucher on 1L/2L spend milestone"],
  },

  // ── HSBC Cards
  {
    matchKeys: ["hsbc live+", "live+", "live plus", "hsbc live"],
    cardDisplayName: "HSBC Live+ Credit Card",
    merchantPerks: {
      swiggy: { returnPct: 10.0, perkType: "cashback", description: "10% accelerated cashback on Food Delivery & Dining", maxCap: "₹1,000/mo", badge: "10% Cashback" },
      zomato: { returnPct: 10.0, perkType: "cashback", description: "10% accelerated cashback on Zomato food delivery", maxCap: "₹1,000/mo", badge: "10% Cashback" },
      blinkit: { returnPct: 10.0, perkType: "cashback", description: "10% accelerated cashback on grocery delivery", maxCap: "₹1,000/mo", badge: "10% Cashback" },
      zepto: { returnPct: 10.0, perkType: "cashback", description: "10% accelerated cashback on Zepto grocery orders", maxCap: "₹1,000/mo", badge: "10% Cashback" },
      bigbasket: { returnPct: 10.0, perkType: "cashback", description: "10% accelerated cashback on BigBasket essentials", maxCap: "₹1,000/mo", badge: "10% Cashback" },
    },
    categoryPerks: {
      "Food & Dining": { returnPct: 10.0, perkType: "cashback", description: "10% cashback on all dining, restaurants, and food delivery apps" },
      "Quick Commerce": { returnPct: 10.0, perkType: "cashback", description: "10% cashback on all grocery stores and instant delivery apps" },
    },
    defaultOnlineReturnPct: 1.5,
    defaultOfflineReturnPct: 1.5,
    specialPerks: ["10% cashback on Dining, Food Delivery & Groceries (capped at ₹1,000/billing cycle)", "1.5% unlimited cashback on all other spends"],
  },

  // ── Standard Chartered Cards
  {
    matchKeys: ["ultimate", "standard chartered ultimate", "sc ultimate"],
    cardDisplayName: "Standard Chartered Ultimate",
    merchantPerks: {
      swiggy: { returnPct: 3.33, perkType: "reward_points", description: "5 Reward Points per ₹150 (3.33% real cash value) on all retail & dining", badge: "3.33% Universal" },
      zomato: { returnPct: 3.33, perkType: "reward_points", description: "5 Reward Points per ₹150 (3.33% reward rate) on dining out & delivery" },
      amazon: { returnPct: 3.33, perkType: "reward_points", description: "5 Reward Points per ₹150 (3.33% reward rate) on all e-commerce purchases" },
      apple: { returnPct: 3.33, perkType: "reward_points", description: "5 Reward Points per ₹150 on electronics and Apple devices" },
      makemytrip: { returnPct: 3.33, perkType: "reward_points", description: "5 Reward Points per ₹150 on flight & travel bookings" },
      forex_international: { returnPct: 3.33, perkType: "reward_points", description: "5 Points per ₹150 with industry-lowest 2.0% forex fee" },
    },
    categoryPerks: {
      "Food & Dining": { returnPct: 3.33, perkType: "reward_points", description: "5 points per ₹150 (1 Point = ₹1 on catalog vouchers)" },
      "Online Shopping": { returnPct: 3.33, perkType: "reward_points", description: "5 points per ₹150 across ALL retail shopping without merchant restrictions" },
      "International Spends": { returnPct: 3.33, perkType: "reward_points", description: "5 points per ₹150 with lowest 2.0% foreign exchange fee" },
      "Travel & Flights": { returnPct: 3.33, perkType: "reward_points", description: "5 points per ₹150 + comprehensive travel & golf privileges" },
    },
    defaultOnlineReturnPct: 3.33,
    defaultOfflineReturnPct: 3.33,
    specialPerks: ["1 Reward Point = ₹1 cash voucher value", "Flat 3.33% return on almost all offline and online spends", "4 complimentary golf games/quarter"],
  },
  {
    matchKeys: ["smart", "sc smart", "standard chartered smart", "digismart", "sc digismart"],
    cardDisplayName: "Standard Chartered Smart / DigiSmart",
    merchantPerks: {
      myntra: { returnPct: 20.0, perkType: "discount", description: "20% instant discount on Myntra up to ₹700 off monthly", badge: "20% Myntra Discount" },
      zomato: { returnPct: 10.0, perkType: "discount", description: "10% instant discount on Zomato food orders up to ₹150 off 5 times a month", badge: "10% Zomato Off" },
      swiggy: { returnPct: 2.0, perkType: "cashback", description: "2% flat cashback on online spends" },
      blinkit: { returnPct: 10.0, perkType: "discount", description: "10% instant discount on Blinkit groceries up to ₹1,000 monthly" },
      bookmyshow: { returnPct: 25.0, perkType: "discount", description: "Buy 1 Get 1 ticket discount on BookMyShow (up to ₹200 off)" },
    },
    categoryPerks: {
      "Online Shopping": { returnPct: 2.0, perkType: "cashback", description: "2% cashback on online spends (capped at ₹1,000/mo)" },
      "Food & Dining": { returnPct: 10.0, perkType: "discount", description: "10% discount on Zomato delivery" },
    },
    defaultOnlineReturnPct: 2.0,
    defaultOfflineReturnPct: 1.0,
    specialPerks: ["2% flat cashback on all online spends", "10% instant discount on Zomato and Blinkit", "20% on Myntra"],
  },
  {
    matchKeys: ["sc easemytrip", "easemytrip standard chartered"],
    cardDisplayName: "Standard Chartered EaseMyTrip",
    merchantPerks: {
      easemytrip: { returnPct: 20.0, perkType: "discount", description: "20% instant discount on domestic & international hotels, 10% on flights via EaseMyTrip", badge: "20% Hotel Discount" },
      makemytrip: { returnPct: 2.0, perkType: "reward_points", description: "10X reward points on standalone hotel/airline websites" },
    },
    categoryPerks: {
      "Travel & Flights": { returnPct: 20.0, perkType: "discount", description: "20% discount on hotel bookings and 10% on flight tickets via EaseMyTrip" },
    },
    defaultOnlineReturnPct: 2.0,
    defaultOfflineReturnPct: 1.0,
    specialPerks: ["20% off on hotels via EaseMyTrip", "10% off on flight bookings", "10X rewards on standalone ticket bookings"],
  },

  // ── Federal Bank / Scapia
  {
    matchKeys: ["scapia", "federal scapia"],
    cardDisplayName: "Federal Bank Scapia",
    merchantPerks: {
      makemytrip: { returnPct: 4.0, perkType: "reward_points", description: "20% Scapia Coins (4% real value) on in-app travel bookings, 10% Scapia Coins (2% value) elsewhere" },
      easemytrip: { returnPct: 4.0, perkType: "reward_points", description: "20% Scapia Coins on travel reservations" },
      forex_international: { returnPct: 5.5, perkType: "reward_points", description: "Zero Forex markup (saves 3.5% FX fee) + 10% Scapia Coins (2% value) on international spends", badge: "0% Forex + 2% Coins" },
      swiggy: { returnPct: 2.0, perkType: "reward_points", description: "10% Scapia Coins (2% value, 5 Coins = ₹1) on domestic shopping" },
      zomato: { returnPct: 2.0, perkType: "reward_points", description: "10% Scapia Coins on dining spends" },
    },
    categoryPerks: {
      "International Spends": { returnPct: 5.5, perkType: "reward_points", description: "Zero Forex markup saves 3.5% FX fee + 2% Scapia Coins value back" },
      "Travel & Flights": { returnPct: 4.0, perkType: "reward_points", description: "20% Scapia Coins on travel bookings (5 Coins = ₹1 on flights & hotels)" },
    },
    defaultOnlineReturnPct: 2.0,
    defaultOfflineReturnPct: 2.0,
    forexMarkupPct: 0.0,
    specialPerks: ["0% Forex Markup fee on all international payments", "Unlimited domestic lounge access on ₹5k spend/mo", "Instant coin redemption 5 Coins = ₹1"],
  },

  // ── OneCard
  {
    matchKeys: ["onecard", "one card"],
    cardDisplayName: "OneCard Metal",
    merchantPerks: {
      swiggy: { returnPct: 2.0, perkType: "reward_points", description: "5X Rewards (1% - 2% value) on top 2 spend categories of the month + Around You merchant offers" },
      zomato: { returnPct: 2.0, perkType: "reward_points", description: "5X points in top monthly dining category" },
      forex_international: { returnPct: 2.5, perkType: "reward_points", description: "Low 1% Forex markup fee with instant reward points", badge: "1% Low Forex" },
    },
    categoryPerks: {
      "Food & Dining": { returnPct: 2.0, perkType: "reward_points", description: "5X points in your top category for the month" },
      "International Spends": { returnPct: 2.5, perkType: "reward_points", description: "Lowest 1.0% forex fee vs 3.5% standard bank fee" },
    },
    defaultOnlineReturnPct: 1.0,
    defaultOfflineReturnPct: 1.0,
    forexMarkupPct: 1.0,
    specialPerks: ["5X points on top 2 spend categories", "1% low forex markup", "Around You instant local discounts"],
  },

  // ── Amex Cards
  {
    matchKeys: ["mrcc", "membership rewards", "amex mrcc"],
    cardDisplayName: "American Express MRCC",
    merchantPerks: {
      amazon: { returnPct: 6.0, perkType: "reward_points", description: "4 monthly transactions of ₹1,500 yield 1,000 bonus points (up to 6% return)", badge: "Milestone Multiplier" },
      swiggy: { returnPct: 6.0, perkType: "reward_points", description: "Use towards 4 × ₹1,500 monthly transactions for 1,000 bonus MR points" },
      zomato: { returnPct: 6.0, perkType: "reward_points", description: "Monthly ₹1,500 milestone bonus qualification" },
      electricity_bills: { returnPct: 6.0, perkType: "reward_points", description: "Utility payments qualify for monthly milestone bonus" },
    },
    categoryPerks: {
      "Online Shopping": { returnPct: 6.0, perkType: "reward_points", description: "Up to 6% return via 1,000 bonus points on 4 × ₹1,500 monthly transactions and 20k spend milestone" },
      "Utilities & Bills": { returnPct: 6.0, perkType: "reward_points", description: "Earn milestone bonus points on utility bill transactions" },
    },
    defaultOnlineReturnPct: 2.0,
    defaultOfflineReturnPct: 2.0,
    specialPerks: ["1,000 bonus points on 4 × ₹1,500 txns/month", "1,000 bonus points on ₹20k monthly spend", "Redeem for 18k / 24k Gold Collection vouchers"],
  },
  {
    matchKeys: ["amex platinum", "platinum travel"],
    cardDisplayName: "American Express Platinum Travel",
    merchantPerks: {
      makemytrip: { returnPct: 8.0, perkType: "reward_points", description: "Accelerated milestone yield: ₹4L annual spend gives 48,000 points + ₹10,000 Taj voucher (~8% net return)", badge: "8% Milestone Yield" },
      easemytrip: { returnPct: 8.0, perkType: "reward_points", description: "Milestone points convertible 1:1 to Marriott Bonvoy or Taj vouchers" },
      apple: { returnPct: 8.0, perkType: "reward_points", description: "Qualifies toward ₹1.9L and ₹4L annual spend milestone rewards" },
    },
    categoryPerks: {
      "Travel & Flights": { returnPct: 8.0, perkType: "reward_points", description: "₹4L milestone gives ~₹32,000 worth of travel and Taj hotel vouchers (8% return)" },
    },
    defaultOnlineReturnPct: 2.0,
    defaultOfflineReturnPct: 2.0,
    specialPerks: ["₹10,000 Taj voucher on ₹4L spend", "48,000 MR points convertible to Marriott Bonvoy", "8 complimentary domestic lounge visits"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS FOR CARD REWARD MATCHING
// ─────────────────────────────────────────────────────────────────────────────

function cleanKey(str: string): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

/** Matches a card entity to the best matching card perk rule */
export function findCardPerkRule(card: any): CardPerkRule | null {
  const cardName = cleanKey(card.issuer || card.cardName || card.name || card.bank || "");
  const network = cleanKey(card.network || "");

  for (const rule of CARD_PERK_RULES) {
    for (const key of rule.matchKeys) {
      const cleanK = cleanKey(key);
      if (cardName.includes(cleanK) || (cleanK.includes("rupay") && network.includes("rupay"))) {
        return rule;
      }
    }
  }
  return null;
}

/** Matches a merchant search input to a known popular merchant */
export function resolveMerchant(query: string, categoryFallback?: string): MerchantInfo | null {
  if (!query) return null;
  const q = cleanKey(query);

  // Exact / keyword match
  for (const m of POPULAR_MERCHANTS) {
    if (cleanKey(m.name) === q || m.id === q) return m;
    for (const kw of m.keywords) {
      if (q.includes(cleanKey(kw)) || cleanKey(kw).includes(q)) {
        return m;
      }
    }
  }

  // Fallback by category if provided
  if (categoryFallback) {
    const catMatch = POPULAR_MERCHANTS.find(
      (m) => m.category.toLowerCase() === categoryFallback.toLowerCase()
    );
    if (catMatch) return catMatch;
  }

  return null;
}

/**
 * Evaluates a single card in the user's portfolio for a payment at a specific merchant/category & amount.
 */
export function evaluateCardForPayment(
  card: any,
  merchantQuery: string,
  category: string,
  amount: number,
  rankedSwipeInfo?: any
): EvaluatedCardPayment {
  const cleanCardName = card.issuer || card.cardName || card.name || "Credit Card";
  const bankName = card.bank || card.bankName || card.issuer || "Bank";
  const rule = findCardPerkRule(card);
  const resolvedMerchant = resolveMerchant(merchantQuery, category);

  let returnPct = 1.0; // fallback base return
  let perkType: "cashback" | "reward_points" | "discount" | "miles" = "cashback";
  let perkHeadline = "Standard Return";
  let perkReason = "Standard retail reward points accrued on card";
  let maxCap: string | undefined = undefined;
  let badge: string | undefined = undefined;
  let isCoBrandedMatch = false;

  const targetCategory = resolvedMerchant ? resolvedMerchant.category : category || "General Spends";

  if (rule) {
    // 1. Direct Merchant Specific Match (e.g. Swiggy card on Swiggy -> 10%)
    if (resolvedMerchant && rule.merchantPerks && rule.merchantPerks[resolvedMerchant.id]) {
      const p = rule.merchantPerks[resolvedMerchant.id];
      returnPct = p.returnPct;
      perkType = p.perkType;
      perkReason = p.description;
      maxCap = p.maxCap;
      badge = p.badge || `${p.returnPct}% ${p.perkType === "cashback" ? "Cashback" : "Return"}`;
      isCoBrandedMatch = resolvedMerchant ? rule.matchKeys.some(k => k.includes(resolvedMerchant.id)) || cleanCardName.toLowerCase().includes(resolvedMerchant.id) : false;
    }
    // 2. Category Level Match (e.g. HSBC Live+ on Food & Dining -> 10%)
    else if (rule.categoryPerks && rule.categoryPerks[targetCategory]) {
      const p = rule.categoryPerks[targetCategory];
      returnPct = p.returnPct;
      perkType = p.perkType;
      perkReason = p.description;
      maxCap = p.maxCap;
      badge = p.badge || `${p.returnPct}% Category Reward`;
    }
    // 3. General Online / Retail Default for that card
    else {
      returnPct = rule.defaultOnlineReturnPct;
      perkReason = `Base online reward rate for ${rule.cardDisplayName}`;
      badge = `${rule.defaultOnlineReturnPct}% Base Rate`;
    }
  } else {
    // Card not in specialized knowledge base — check custom rewardPointValue if configured by user
    const pointVal = Number(card.rewardPointValue || 0);
    if (pointVal > 0) {
      // If user configured e.g. 1 point = ₹0.50 and card earns ~2-4 points/₹100
      returnPct = Math.max(1.0, Math.min(5.0, pointVal * 2.0));
      perkType = "reward_points";
      perkReason = `Custom Reward Structure: ₹${pointVal}/point configured on card`;
      badge = `${returnPct.toFixed(1)}% Configured`;
    } else {
      returnPct = 1.0;
      perkReason = "Standard 1% base reward value";
      badge = "1.0% Base Rate";
    }
  }

  // Calculate savings in INR
  const savingsInINR = Math.round(((amount * returnPct) / 100) * 100) / 100;
  perkHeadline = `${returnPct}% ${perkType === "cashback" ? "Cashback" : perkType === "miles" ? "Travel Miles" : "Reward Value"} (₹${savingsInINR.toLocaleString("en-IN")})`;

  const limit = Number(card.limit || 0);
  const outstanding = Number(card.outstanding || 0);
  const availableLimit = Math.max(0, limit - outstanding);
  const interestFreeDays = rankedSwipeInfo?.interestFreeDays ?? 30;
  const nextDueDateStr = rankedSwipeInfo?.nextDueDateStr ?? "Next billing cycle";

  // Score computation for ranking:
  // Primary weight: savings amount (profit in INR)
  // Secondary weight: co-branded match boost (+100)
  // Tertiary weight: interest-free days runway (+0.1 per day)
  const score = savingsInINR * 10 + (isCoBrandedMatch ? 100 : 0) + interestFreeDays * 0.1;

  return {
    cardId: card.id,
    cardName: cleanCardName,
    bankName,
    network: card.network,
    last4: card.last4,
    owner: card.owner,
    availableLimit,
    limit,
    outstanding,
    interestFreeDays,
    nextDueDateStr,
    returnPct,
    savingsInINR,
    perkType,
    perkHeadline,
    perkReason,
    maxCap,
    badge,
    isCoBrandedMatch,
    score,
  };
}

/**
 * Finds the single best market alternative credit card that would maximize profit
 * on this merchant if the user doesn't already own it.
 */
export function findBestMarketAlternative(
  merchantQuery: string,
  category: string,
  amount: number,
  ownedCards: any[]
): BestMarketAlternative | null {
  const resolvedMerchant = resolveMerchant(merchantQuery, category);
  const targetCategory = resolvedMerchant ? resolvedMerchant.category : category || "General Spends";

  let bestRule: CardPerkRule | null = null;
  let bestPerk: CardRewardPerk | null = null;
  let highestReturn = 0;

  for (const rule of CARD_PERK_RULES) {
    // Check if user already owns this card
    const isOwned = ownedCards.some((c) => {
      const r = findCardPerkRule(c);
      return r && r.cardDisplayName === rule.cardDisplayName;
    });
    if (isOwned) continue;

    let perk: CardRewardPerk | null = null;
    if (resolvedMerchant && rule.merchantPerks && rule.merchantPerks[resolvedMerchant.id]) {
      perk = rule.merchantPerks[resolvedMerchant.id];
    } else if (rule.categoryPerks && rule.categoryPerks[targetCategory]) {
      perk = rule.categoryPerks[targetCategory];
    }

    if (perk && perk.returnPct > highestReturn) {
      highestReturn = perk.returnPct;
      bestRule = rule;
      bestPerk = perk;
    }
  }

  if (!bestRule || !bestPerk || highestReturn <= 2.0) return null;

  const savingsInINR = Math.round(((amount * highestReturn) / 100) * 100) / 100;

  return {
    cardName: bestRule.cardDisplayName,
    bankName: bestRule.cardDisplayName.split(" ")[0] || "Bank",
    returnPct: bestPerk.returnPct,
    savingsInINR,
    reason: bestPerk.description,
    extraSavingsVsTopOwned: 0, // calculated in rankCardsForPayment
  };
}

/**
 * Main engine entrypoint:
 * Evaluates all cards in user's portfolio and ranks the best card for this payment.
 */
export function rankCardsForPayment(
  portfolioCards: any[],
  merchantQuery: string,
  category: string,
  amount: number,
  rankedCardsForSwipeMap?: Record<string, any>
): PaymentRecommendationResult {
  const validAmount = Math.max(1, Number(amount) || 1000);
  const resolvedMerchant = resolveMerchant(merchantQuery, category);
  const targetMerchantName = resolvedMerchant ? resolvedMerchant.name : merchantQuery || "Merchant";
  const targetCategory = resolvedMerchant ? resolvedMerchant.category : category || "Online Shopping";

  const activeCards = portfolioCards.filter(
    (c) => (c.status || "active").toLowerCase() === "active"
  );

  const evaluated = activeCards.map((c) => {
    const swipeInfo = rankedCardsForSwipeMap ? rankedCardsForSwipeMap[c.id] : undefined;
    return evaluateCardForPayment(c, merchantQuery, targetCategory, validAmount, swipeInfo);
  });

  // Sort descending by highest return % / savings in INR, co-branded priority, then available limit
  evaluated.sort((a, b) => {
    if (b.returnPct !== a.returnPct) {
      return b.returnPct - a.returnPct;
    }
    if (b.isCoBrandedMatch !== a.isCoBrandedMatch) {
      return b.isCoBrandedMatch ? 1 : -1;
    }
    if (b.savingsInINR !== a.savingsInINR) {
      return b.savingsInINR - a.savingsInINR;
    }
    return b.availableLimit - a.availableLimit;
  });

  const topCard = evaluated[0] || null;
  const marketAlternative = findBestMarketAlternative(
    merchantQuery,
    targetCategory,
    validAmount,
    activeCards
  );

  if (marketAlternative && topCard) {
    marketAlternative.extraSavingsVsTopOwned = Math.max(
      0,
      Math.round((marketAlternative.savingsInINR - topCard.savingsInINR) * 100) / 100
    );
  }

  return {
    merchantName: targetMerchantName,
    category: targetCategory,
    amount: validAmount,
    topCard,
    rankedCards: evaluated,
    bestMarketAlternative:
      marketAlternative && marketAlternative.extraSavingsVsTopOwned > 0
        ? marketAlternative
        : null,
    totalCardsEvaluated: evaluated.length,
  };
}

/**
 * Generates an at-a-glance Category Cheat Sheet Matrix for the user's entire portfolio.
 * Shows which card in their wallet they should use for each major everyday category.
 */
export function generateCategoryCardMatrix(
  portfolioCards: any[],
  rankedCardsForSwipeMap?: Record<string, any>
): Array<{
  category: string;
  bestCard: EvaluatedCardPayment | null;
  runnerUpCard: EvaluatedCardPayment | null;
  topPerkHeadline: string;
  topPerkReason: string;
  popularExamples: string;
}> {
  const categories = [
    { name: "Food & Dining", examples: "Swiggy, Zomato, EazyDiner, Dineout, Restaurants" },
    { name: "Online Shopping", examples: "Amazon, Flipkart, Myntra, Tata Neu, Ajio, Nykaa" },
    { name: "Quick Commerce", examples: "Blinkit, Zepto, Swiggy Instamart, BigBasket" },
    { name: "Travel & Flights", examples: "MakeMyTrip, EaseMyTrip, Cleartrip, IRCTC, Airlines" },
    { name: "Utilities & Bills", examples: "Airtel, Electricity, Broadband, Piped Gas, DTH" },
    { name: "Entertainment", examples: "BookMyShow, PVR INOX, Netflix, Spotify, Prime" },
    { name: "Fuel", examples: "HPCL, BPCL, IndianOil, Shell (1% surcharge waiver)" },
    { name: "International Spends", examples: "Overseas travel, Foreign Currency, Zero Forex" },
  ];

  return categories.map((cat) => {
    const result = rankCardsForPayment(
      portfolioCards,
      "",
      cat.name,
      2000,
      rankedCardsForSwipeMap
    );

    const bestCard = result.rankedCards[0] || null;
    const runnerUpCard = result.rankedCards[1] || null;

    return {
      category: cat.name,
      bestCard,
      runnerUpCard,
      topPerkHeadline: bestCard ? `${bestCard.returnPct}% Return` : "No Card",
      topPerkReason: bestCard ? bestCard.perkReason : "Add cards to portfolio",
      popularExamples: cat.examples,
    };
  });
}
