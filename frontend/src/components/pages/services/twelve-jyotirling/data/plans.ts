export interface Plan {
  id: string;
  name: string;
  nameHindi: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
  premium?: boolean;
  features: string[];
  badge?: string;
}

export const subscriptionPlans: Plan[] = [
  {
    id: "bhakti",
    name: "Bhakti Plan",
    nameHindi: "भक्ति प्लान",
    monthlyPrice: 699,
    yearlyPrice: 7499,
    features: [
      "Monthly essential seva at designated Jyotirlinga",
      "Personalized Sankalp in your Name & Gotra",
      "WhatsApp proof (photo + video clip)",
      "Standard Prasad delivery to your home",
      "Monthly temple updates & reminders",
    ],
  },
  {
    id: "sankalp",
    name: "Sankalp Plan",
    nameHindi: "संकल्प प्लान",
    monthlyPrice: 999,
    yearlyPrice: 10999,
    popular: true,
    badge: "MOST POPULAR",
    features: [
      "Larger monthly seva with enhanced offerings",
      "Personalized Sankalp in your Name & Gotra",
      "WhatsApp proof (photo + HD video)",
      "Premium Prasad pack delivery",
      "Festival upgrade eligibility",
      "Priority reminders & dedicated support",
    ],
  },
  {
    id: "ananta",
    name: "Ananta Plan",
    nameHindi: "अनंत प्लान",
    monthlyPrice: 1999,
    yearlyPrice: 21999,
    premium: true,
    badge: "PREMIUM",
    features: [
      "Premium-size offerings with special items",
      "Personalized Sankalp in your Name & Gotra",
      "Enhanced proof with detailed documentation",
      "Premium Prasad box with exclusive items",
      "Special gifts during peak months (Shravan, Mahashivratri)",
      "Priority booking & VIP support",
      "Festival add-on benefits included",
    ],
  },
];

export interface OneTimeProduct {
  id: string;
  name: string;
  nameHindi: string;
  price: number;
  description: string;
  type: "individual" | "sarva";
}

export const oneTimeProducts: OneTimeProduct[] = [
  { id: "individual-essential", name: "Essential Seva", nameHindi: "आवश्यक सेवा", price: 1001, description: "One-time seva at any temple of your choice", type: "individual" },
  { id: "individual-festival", name: "Festival Special", nameHindi: "त्योहार विशेष", price: 2501, description: "Enhanced festival seva with special offerings", type: "individual" },
  { id: "individual-premium", name: "Premium Abhishek", nameHindi: "प्रीमियम अभिषेक", price: 5001, description: "Premium abhishek + large prasad delivery", type: "individual" },
  { id: "sarva-essential", name: "Sarva Essential", nameHindi: "सर्व आवश्यक", price: 7999, description: "Essential seva at all 12 Jyotirlinga in one month", type: "sarva" },
  { id: "sarva-sankalp", name: "Sarva Sankalp", nameHindi: "सर्व संकल्प", price: 12999, description: "Enhanced seva at all 12 Jyotirlinga with premium prasad", type: "sarva" },
  { id: "sarva-rajshahi", name: "Sarva Rajshahi", nameHindi: "सर्व राजशाही", price: 21999, description: "Royal seva at all 12 + premium prasad box + gifts", type: "sarva" },
];

export interface AddOn {
  id: string;
  name: string;
  nameHindi: string;
  price: number;
  priceLabel: string;
  description: string;
  category: "family" | "shravan" | "festival";
}

export const addOns: AddOn[] = [
  { id: "family-monthly", name: "Family Member (Monthly)", nameHindi: "परिवार सदस्य", price: 199, priceLabel: "₹199/person/month", description: "Add a family member's name to the monthly Sankalp", category: "family" },
  { id: "family-yearly", name: "Family Member (Yearly)", nameHindi: "परिवार सदस्य (वार्षिक)", price: 999, priceLabel: "₹999/person/year", description: "Add a family member for the full 12-month cycle", category: "family" },
  { id: "shravan-mini", name: "Shravan Mini Booster", nameHindi: "श्रावण मिनी बूस्टर", price: 501, priceLabel: "₹501", description: "Mini chadhava at top 3 Jyotirlinga during Shravan", category: "shravan" },
  { id: "shravan-medium", name: "Shravan Medium Booster", nameHindi: "श्रावण मीडियम बूस्टर", price: 851, priceLabel: "₹851", description: "Enhanced chadhava at 6 Jyotirlinga during Shravan", category: "shravan" },
  { id: "shravan-full", name: "Shravan Full Booster", nameHindi: "श्रावण पूर्ण बूस्टर", price: 1101, priceLabel: "₹1,101", description: "Complete chadhava at all 12 Jyotirlinga during Shravan", category: "shravan" },
  { id: "mahashivratri", name: "Mahashivratri Booster", nameHindi: "महाशिवरात्रि बूस्टर", price: 851, priceLabel: "₹851", description: "Special Mahakaal abhishek + belpatra pack at Mahakaleshwar", category: "festival" },
];



// Rashi (Zodiac Sign) 	Jyotirlinga	Location
// Aries (Mesh)	Rameshwaram	Tamil Nadu
// Taurus (Vrishabh)	Somnath	Gujarat
// Gemini (Mithun)	Nageshwara	Gujarat
// Cancer (Karka)	Omkareshwar	Madhya Pradesh
// Leo (Simha)	Vaidyanath	Jharkhand
// Virgo (Kanya)	Mallikarjuna	Andhra Pradesh
// Libra (Tula)	Mahakaleshwar	Madhya Pradesh
// Scorpio (Vrischika)	Ghrishneshwar	Maharashtra
// Sagittarius (Dhanu)	Kashi Vishwanath	Uttar Pradesh
// Capricorn (Makara)	Bhimashankar	Maharashtra
// Aquarius (Kumbha)	Kedarnath	Uttarakhand
// Pisces (Meena)	Trimbakeshwar	Maharashtra

export const rashiMapping: { rashi: string; rashiHindi: string; jyotirlinga: string; element: string; image: string }[] = [
  // Rameshwaram or Somnath
  { rashi: "Aries", rashiHindi: "मेष", jyotirlinga: "Rameshwaram", element: "🔥", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/aries.webp" },

  // Somnath or Mallikarjuna
  { rashi: "Taurus", rashiHindi: "वृषभ", jyotirlinga: "Somnath", element: "🌍", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/taurus.webp" },

  // Nageshwar or Mahakaleshwar
  { rashi: "Gemini", rashiHindi: "मिथुन", jyotirlinga: "Nageshwara", element: "💨", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/gemini.webp" },

  // Omkareshwar
  { rashi: "Cancer", rashiHindi: "कर्क", jyotirlinga: "Omkareshwar", element: "💧", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/cancer.webp" },

  // Vaidyanath or Kedarnath
  { rashi: "Leo", rashiHindi: "सिंह", jyotirlinga: "Baidyanath", element: "🔥", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/leo.webp" },

  // Mallikarjuna or Bhimashankar
  { rashi: "Virgo", rashiHindi: "कन्या", jyotirlinga: "Mallikarjuna", element: "🌍", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/virgo.webp" },

  // Mahakaleshwar
  { rashi: "Libra", rashiHindi: "तुला", jyotirlinga: "Mahakaleshwar", element: "💨", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/Libra.webp" },

  // Grishneshwar
  { rashi: "Scorpio", rashiHindi: "वृश्चिक", jyotirlinga: "Ghrishneshwar", element: "💧", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/scorpio.webp" },


  { rashi: "Sagittarius", rashiHindi: "धनु", jyotirlinga: "Kashi Vishwanath", element: "🔥", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/Sagittarious.webp" },

  { rashi: "Capricorn", rashiHindi: "मकर", jyotirlinga: "Bhimashankar", element: "🌍", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/Capricon.webp" },

  { rashi: "Aquarius", rashiHindi: "कुंभ", jyotirlinga: "Kedarnath", element: "💨", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/Aquarious.webp" },

  { rashi: "Pisces", rashiHindi: "मीन", jyotirlinga: "Trimbakeshwar", element: "💧", image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/jyotirlingas/Zoadic%20sign/Pisces.webp" },
];

export const faqItems = [
  { q: "What is the 12 Jyotirlinga subscription?", a: "It is a 12-month devotional subscription where we perform chadhava (sacred offering) at one Jyotirlinga temple each month in your name and gotra. You'll receive WhatsApp proof and sacred prasad delivered to your home." },
  { q: "How does the 12-month cycle work?", a: "The cycle follows the Hindu calendar starting from Chaitra (March–April). Each month is dedicated to a specific Jyotirlinga. The calendar remains fixed to maintain the sanctity and trust of the process." },
  { q: "Can I subscribe mid-year?", a: "Yes! You can start at any point. Your 12-month cycle will begin from the current Hindu month, and you'll complete all 12 Jyotirlinga over the next year." },
  { q: "What proof will I receive?", a: "You'll receive a photo of the offering and a short video clip via WhatsApp after each month's seva is completed." },
  { q: "What is included in the Prasad?", a: "Prasad includes sacred items from the temple — Vibhuti, Flowers, Sweets, and other blessed items. The contents vary by plan tier and the specific temple." },
  { q: "Can I pause or cancel my subscription?", a: "Yes, you can pause or cancel anytime from your dashboard. If you cancel mid-cycle, your current month's seva will still be completed." },
  { q: "Can I add family members?", a: "Yes! You can add family members' names to the monthly Sankalp for ₹199/person/month or ₹999/person/year." },
  { q: "Is there a refund policy?", a: "Once a month's seva has been initiated, it cannot be refunded. Future months can be cancelled. Please contact support for special circumstances." },
  { q: "What is the Rashi recommendation?", a: "The Rashi-based recommendation is purely symbolic for personalization purposes. Lord Shiva is universal and blesses all equally regardless of rashi." },
  { q: "Do you ship Prasad internationally?", a: "Currently we ship within India. International shipping is coming soon. Contact us for special arrangements." },
];

export const testimonials = [
  { name: "Sunita Devi", location: "Jaipur", quote: "I gifted the Ananta Plan to my parents. They receive premium prasad every month and they're overjoyed!", avatar: "SD", plan: "Ananta Plan", planHindi: "अनंत प्लान", planType: "premium" as const },
  { name: "Priya Patel", location: "Mumbai", quote: "I started the Sankalp Plan during a difficult time. The monthly Sankalp in my name gave me peace I hadn't felt in years.", avatar: "PP", plan: "Sankalp Plan", planHindi: "संकल्प प्लान", planType: "popular" as const },
  { name: "Amit Verma", location: "Bangalore", quote: "The video proof of chadhava is so touching. Knowing the offering is made with my gotra makes it truly personal.", avatar: "AV", plan: "Sankalp Plan", planHindi: "संकल्प प्लान", planType: "popular" as const },
  { name: "Rajesh Sharma", location: "Delhi", quote: "The monthly prasad delivery brings temple blessings right to my doorstep. My family feels more connected to our faith.", avatar: "RS", plan: "Bhakti Plan", planHindi: "भक्ति प्लान", planType: "basic" as const },
];
