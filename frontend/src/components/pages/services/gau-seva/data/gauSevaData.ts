// ─── Gau Seva Static Data ─────────────────────────────────────────────────────
// Images: placeholder CDN paths — replace with real CDN URLs when available

export interface GauSevaPackage {
  id: string;
  name: string;
  nameHindi: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  badgeColor?: "saffron" | "gold" | "green" | "emerald";
  highlighted?: boolean;
  cowCount: number;
  duration: string;
  durationDays: number;
  image: string;
  features: string[];
  deliverables: string[];
}

export type OccasionType = "none" | "birthday" | "anniversary" | "newborn" | "pitru_paksha";

export interface SpecialOccasion {
  id: OccasionType;
  name: string;
  nameHindi: string;
  premium: number;           // extra charge added on top of package price
  image: string;
  description: string;
  icon?: string;
}

// Placeholder image — gray skeleton that can be swapped for CDN

export const PACKAGES: GauSevaPackage[] = [
  {
    id: "feed-3-cows",
    name: "Feed 3 Cows",
    nameHindi: "3 गायों को भोजन",
    price: 499,
    badge: "Starter Seva",
    badgeColor: "saffron",
    cowCount: 3,
    duration: "Every Wednesday",
    durationDays: 7,
    image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/pkg_3_cows.png.webp",
    features: [
      "Fresh green grass + dry fodder",
      "Your name on every bundle",
      "Feeding done every Wednesday",
      "Photo proof on WhatsApp",
      "Digital certificate",
    ],
    deliverables: ["1 Photo", "Digital Certificate"],
  },
  {
    id: "feed-5-cows",
    name: "Feed 5 Cows",
    nameHindi: "5 गायों को भोजन",
    price: 649,
    badge: "Most Popular",
    badgeColor: "green",
    highlighted: true,
    cowCount: 5,
    duration: "Every Wednesday",
    durationDays: 7,
    image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/pkg_5_cows.png.webp",
    features: [
      "Fresh green grass + premium fodder",
      "Your name on every bundle",
      "Feeding done every Wednesday",
      "Photo proof on WhatsApp",
      "Digital certificate",
    ],
    deliverables: ["1 Photo", "Digital Certificate"],
  },
  {
    id: "feed-10-cows",
    name: "Feed 10 Cows",
    nameHindi: "10 गायों को भोजन",
    price: 999,
    badge: "Best Value",
    badgeColor: "gold",
    highlighted: true,
    cowCount: 10,
    duration: "Every Wednesday",
    durationDays: 7,
    image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/pkg_10_cows.png.webp",
    features: [
      "Fresh grass + premium fodder + jaggery",
      "Your name on every bundle",
      "Feeding done every Wednesday",
      "Photo proof on WhatsApp",
      "Premium digital certificate",
    ],
    deliverables: ["1 Photo", "Premium Certificate"],
  },
  {
    id: "feed-20-cows",
    name: "Feed 20 Cows",
    nameHindi: "20 गायों को भोजन",
    price: 1999,
    badge: "Punya Seva",
    badgeColor: "gold",
    highlighted: true,
    cowCount: 20,
    duration: "Every Wednesday",
    durationDays: 7,
    image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/pkg_20_cows.png.webp",
    features: [
      "Premium grass + fodder + jaggery per cow",
      "Personalised name board at Gaushala",
      "Feeding done every Wednesday",
      "Photo + video proof on WhatsApp",
      "Sponsor certificate",
    ],
    deliverables: ["1 Photo/Video", "Sponsor Certificate", "Name Board"],
  },
  {
    id: "feed-30-cows",
    name: "Feed 30 Cows",
    nameHindi: "30 गायों को भोजन",
    price: 2999,
    badge: "Max Punya",
    badgeColor: "emerald",
    highlighted: true,
    cowCount: 30,
    duration: "Every Wednesday",
    durationDays: 7,
    image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/pkg_30_cows.png.webp",
    features: [
      "Premium grass + fodder + jaggery per cow",
      "Permanent name board in Gaushala",
      "Feeding done every Wednesday",
      "Photo + video proof on WhatsApp",
      "Premium sponsor certificate",
      "Name in Wednesday prayers",
    ],
    deliverables: ["1 Photo/Video", "Premium Sponsor Certificate", "Permanent Name Board"],
  },
];

export const MISSION_BANNERS = [
  { id: "mission-1", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/banner_mission.png.webp", title: "Our Divine Mission", text: "Providing a safe, loving, and spiritual home for Gau Mata." },
  { id: "mission-2", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/banner_care.png.webp", title: "Nurturing Care", text: "Feeding fresh grass and premium fodder to hundreds of cows daily." },
  { id: "mission-3", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/banner_blessings.png.webp", title: "Spiritual Blessings", text: "Experience the profound peace and blessings of genuine Gau Seva." }
];

export const SPECIAL_OCCASIONS: SpecialOccasion[] = [
  {
    id: "birthday",
    name: "Birthday Offering",
    nameHindi: "जन्मदिन अर्पण",
    premium: 51,
    image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/occ_birthday.png.webp",
    description: "Celebrate a birthday with Gau Mata's blessings",
    icon: "🎂",
  },
  {
    id: "anniversary",
    name: "Anniversary Offering",
    nameHindi: "वर्षगाँठ अर्पण",
    premium: 101,
    image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/occ_anniversary.png.webp",
    description: "Honour a wedding anniversary with a special seva",
    icon: "💝",
  },
  {
    id: "newborn",
    name: "Newborn Blessing",
    nameHindi: "नवजात आशीर्वाद",
    premium: 151,
    image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/occ_newborn.png.webp",
    description: "Welcome a newborn with Gau Mata's divine blessings",
    icon: "👼",
  },
  {
    id: "pitru_paksha",
    name: "Pitra Paksha Seva",
    nameHindi: "पितृ पक्ष सेवा",
    premium: 201,
    image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/occ_pitru.png.webp",
    description: "Offer Gau Seva in memory of your ancestors",
    icon: "🙏",
  },
];

export const HOW_IT_WORKS_STEPS = [
  { step: 1, image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/step_book.png.webp", title: "Book Online", description: "Choose your seva package and pay in 2 minutes" },
  { step: 2, image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/step_feed.png.webp", title: "We Feed Gau Mata", description: "Our seva team feeds cows with your name on bundle" },
  { step: 3, image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/step_photo.png.webp", title: "Photo on WhatsApp", description: "Photo & certificate sent to your WhatsApp after every Wednesday feeding" },
];

export const BENEFITS = [
  { title: "Photo Proof", description: "Real photo after every Wednesday feeding" },
  { title: "E-Certificate", description: "Digital seva certificate" },
  { title: "Punya", description: "Authentic spiritual merit" },
  { title: "WhatsApp Updates", description: "Instant delivery to phone" },
  { title: "Real Gaushala", description: "500+ cows at our Gaushala" },
  { title: "Name on Bundle", description: "Personalised seva" },
];

export const TRUST_STATS = [
  { number: "12.5K+", label: "Sevas Done" },
  { number: "500+", label: "Cows Fed Weekly" },
  { number: "4.9★", label: "Rating" },
  { number: "24 hrs", label: "Photo Delivery" },
];

export const TESTIMONIALS = [
  {
    name: "Sunita Sharma",
    location: "Delhi",
    rating: 5,
    text: "I booked the weekly seva for my mother's birthday. Photos arrived on time and the whole family felt blessed. Truly divine service!",
    avatar: "S",
  },
  {
    name: "Ramesh Agarwal",
    location: "Mumbai",
    rating: 5,
    text: "Annual Annadaan is incredible value. My name is permanently on the Gaushala board — a lifetime of punya!",
    avatar: "R",
  },
  {
    name: "Priya Mehta",
    location: "New Jersey, USA",
    rating: 5,
    text: "Even from abroad I can do Gau Seva. Photo proof makes it feel so real and connected to home.",
    avatar: "P",
  },
];

export const FAQS = [
  {
    q: "How quickly will I receive photo proof?",
    a: "After the feeding is done every Wednesday. Photos and your certificate are sent directly to your WhatsApp the same day.",
  },
  {
    q: "Will my name really be on the grass bundle?",
    a: "Yes! We attach a waterproof personalised name slip to every grass bundle. You will clearly see it in the photo.",
  },
  {
    q: "Can I visit the Gaushala in person?",
    a: "Absolutely! We welcome devotees warmly. Location details and visiting hours are shared after booking.",
  },
  {
    q: "Is this a real Gaushala or just online?",
    a: "100% real. We have 500+ cows at Vedic Vaibhav Gaushala. Every photo is taken on the same day.",
  },
  {
    q: "Can I book from outside India?",
    a: "Yes! Thousands of NRI devotees from USA, UK, Canada, and Australia book seva with us.",
  },
  {
    q: "Are there special festival packages?",
    a: "Yes — special packages for Gopashtami, Diwali, Makar Sankranti and more are in the Special Occasions section.",
  },
];
