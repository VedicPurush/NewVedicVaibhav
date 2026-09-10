export interface SevaPackage {
  id: string;
  name?: string;        // Package name from DB (e.g. "Diwya Seva", "Maha Seva")
  duration: string;
  days: number;
  price: number;
  priceDisplay: string;
  perDay?: string;
  badge?: string;
  badgeColor?: string;
  highlighted?: boolean;
  features: string[];
  prasadItems?: string[];
}

export const PACKAGES: SevaPackage[] = [
  {
    id: "1day",
    duration: "1 Day",
    days: 1,
    price: 1100,
    priceDisplay: "₹1,100",
    features: ["Daily Laddoo Seva", "Daily Deepak Seva", "Daily Paan Seva", "Video Darshan", "WhatsApp Updates"],
  },
  {
    id: "7days",
    duration: "7 Days",
    days: 7,
    price: 3100,
    priceDisplay: "₹3,100",
    perDay: "₹443/day",
    badge: "Recommended",
    badgeColor: "rose",
    highlighted: true,
    features: ["Daily Laddoo Seva", "Daily Deepak Seva", "Daily Paan Seva", "Video Darshan", "WhatsApp Updates", "Sankalp with Name & Gotra"],
  },
  {
    id: "14days",
    duration: "14 Days",
    days: 14,
    price: 5100,
    priceDisplay: "₹5,100",
    perDay: "₹364/day",
    features: ["Daily Laddoo Seva", "Daily Deepak Seva", "Daily Paan Seva", "Video Darshan", "WhatsApp Updates", "Sankalp with Name & Gotra", "Extra Blessings"],
  },
  {
    id: "31days",
    duration: "31 Days",
    days: 31,
    price: 25000,
    priceDisplay: "₹25,000",
    perDay: "₹806/day",
    badge: "Best Value",
    badgeColor: "gold",
    features: ["Daily Laddoo Seva", "Daily Deepak Seva", "Daily Paan Seva", "Video Darshan", "WhatsApp Updates", "Sankalp with Name & Gotra", "Priority Seva", "Prasad Dispatch"],
  },
  {
    id: "101days",
    duration: "101 Days",
    days: 101,
    price: 51000,
    priceDisplay: "₹51,000",
    perDay: "₹505/day",
    badge: "Maha Seva",
    badgeColor: "peacock",
    features: ["Daily Laddoo Seva", "Daily Deepak Seva", "Daily Paan Seva", "Video Darshan", "WhatsApp Updates", "Sankalp with Name & Gotra", "Priority Seva", "Prasad Dispatch", "Premium Seva Status"],
  },
];

export const OFFERINGS = [
  { title: "Laddoo Seva", description: "Sacred bhog offered daily to Thakur Ji", icon: "🪔" },
  { title: "Deepak Seva", description: "Daily diya seva performed with devotion", icon: "🕯️" },
  { title: "Paan Seva", description: "Traditional paan offering as part of seva ritual", icon: "🌿" },
];

export const STEPS = [
  { step: 1, title: "Choose Package", description: "Select your preferred seva duration" },
  { step: 2, title: "Enter Name & Gotra", description: "Provide devotional details for your sankalp" },
  { step: 3, title: "Pandit Performs Seva", description: "Verified pandits perform seva at Banke Bihari Temple" },
  { step: 4, title: "Receive Video Darshan", description: "Get visual proof and sacred updates" },
  { step: 5, title: "Daily Blessings", description: "Stay spiritually connected from anywhere" },
];

export const BENEFITS = [
  { title: "Darshan Videos", description: "Receive sacred visual updates daily", icon: "📹" },
  { title: "Temple Seva", description: "Laddoo, Deepak & Paan offered with devotion", icon: "🪔" },
  { title: "WhatsApp Updates", description: "Stay connected through WhatsApp blessings", icon: "📱" },
  { title: "Personalized Sankalp", description: "Sankalp taken in your name & gotra", icon: "📿" },
  { title: "Divine Blessings", description: "Daily blessings from Thakur Ji", icon: "🙏" },
  { title: "E-Receipt", description: "Digital confirmation of your seva booking", icon: "📜" },
  { title: "Photo Proof", description: "Authentic photos of seva performed", icon: "📸" },
  { title: "Prasad Note", description: "Optional sacred prasad dispatch details", icon: "🌸" },
];

export const TRUST_ITEMS = [
  "Verified Pandits",
  "Real Temple Seva",
  "Daily Video Proof",
  "WhatsApp Updates",
  "E-Receipt",
  "Devotee Support",
  "10,000+ Devotees Served",
];

export const TESTIMONIALS = [
  {
    name: "Sunita Sharma",
    location: "Delhi",
    rating: 5,
    text: "Daily video proof made us feel truly connected to Banke Bihari Ji. The seva experience was so authentic and peaceful. Highly recommend!",
  },
  {
    name: "Ramesh Agarwal",
    location: "Mumbai",
    rating: 5,
    text: "Beautiful seva experience! Pandit ji performs the seva with such devotion. WhatsApp updates keep us spiritually connected every single day.",
  },
  {
    name: "Priya Mehta",
    location: "New Jersey, USA",
    rating: 5,
    text: "Even from abroad, we felt close to Banke Bihari Ji. The video darshan brings tears of joy. This service is a blessing for NRIs.",
  },
];

export const FAQS = [
  {
    q: "Is the seva really performed at the temple?",
    a: "Yes, all seva is performed by verified pandits at the Banke Bihari Temple in Vrindavan. You receive daily video and photo proof as confirmation.",
  },
  {
    q: "Will I receive proof of seva?",
    a: "Absolutely. You will receive daily photos and video darshan via WhatsApp, showing your seva being performed with devotion.",
  },
  {
    q: "Can I provide my name and gotra?",
    a: "Yes, during booking you can share your name, gotra, and a special sankalp wish. The pandit takes sankalp in your name before performing seva.",
  },
  {
    q: "How will I receive updates?",
    a: "All updates including video darshan, photos, and blessings are sent directly to your WhatsApp number daily.",
  },
  {
    q: "Can devotees outside India book this seva?",
    a: "Yes! Devotees from anywhere in the world can book seva. We serve thousands of NRI devotees across USA, UK, Canada, Australia and more.",
  },
  {
    q: "When will the seva start after booking?",
    a: "Seva begins from your selected start date. If no date is chosen, it starts from the next day after booking confirmation.",
  },
];
