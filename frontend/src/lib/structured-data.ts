/**
 * Schema.org JSON-LD blocks rendered site-wide from the root layout.
 * Ported verbatim from the legacy index.html — these earn Google rich results
 * (Organization, Sitelinks search box, FAQ, service ItemList, navigation).
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vedicvaibhav.com";
const LOGO_URL = "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/webLogo.png";

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Vedic Vaibhav",
  alternateName: "VedicVaibhav",
  url: `${SITE_URL}/`,
  logo: { "@type": "ImageObject", url: LOGO_URL, width: 512, height: 512 },
  description:
    "Vedic Vaibhav is India's leading online platform for authentic puja bookings, chadhava offerings, prasad delivery, and spiritual services from sacred temples across India.",
  foundingDate: "2022",
  areaServed: { "@type": "Country", name: "India" },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: ["Hindi", "English"],
    email: "vedicvaibhav1122@gmail.com",
  },
  sameAs: [
    "https://www.instagram.com/vedicvaibhav",
    "https://www.facebook.com/vedicvaibhav",
    "https://www.youtube.com/@vedicvaibhav",
    "https://twitter.com/vedicvaibhav",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: "Vedic Vaibhav",
  description: "Online Puja, Chadhava & Prasad from India's Sacred Temples",
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: ["hi-IN", "en-IN"],
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/blogs?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["ReligiousOrganization", "LocalBusiness"],
  "@id": `${SITE_URL}/#localbusiness`,
  name: "Vedic Vaibhav",
  image: LOGO_URL,
  url: `${SITE_URL}/`,
  email: "vedicvaibhav1122@gmail.com",
  priceRange: "₹₹",
  currenciesAccepted: "INR",
  paymentAccepted: "Credit Card, Debit Card, UPI, Net Banking",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Zirakpur",
    addressRegion: "Punjab",
    addressCountry: "IN",
  },
  geo: { "@type": "GeoCoordinates", latitude: 27.5706, longitude: 77.6701 },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "06:00",
    closes: "22:00",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Spiritual Services",
    itemListElement: [
      { "@type": "OfferCatalog", name: "Puja Booking", url: `${SITE_URL}/services/puja` },
      { "@type": "OfferCatalog", name: "Chadhava", url: `${SITE_URL}/chadhava` },
      { "@type": "OfferCatalog", name: "Prasad Delivery", url: `${SITE_URL}/services/prasad` },
      { "@type": "OfferCatalog", name: "12 Jyotirlinga Puja", url: `${SITE_URL}/services/12-jyotirlinga` },
      { "@type": "OfferCatalog", name: "4 Dham Yatra", url: `${SITE_URL}/4-dham-yatra` },
      { "@type": "OfferCatalog", name: "Gau Seva", url: `${SITE_URL}/services/gau-seva` },
    ],
  },
  sameAs: [
    "https://www.instagram.com/vedicvaibhav_/",
    "https://www.facebook.com/profile.php?id=61574194044695",
  ],
};

export const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` }],
};

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How can I book an online puja at Vrindavan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Visit vedicvaibhav.com/services/puja, select the puja, enter your name and gotra, choose a date, and pay online. A certified pandit will perform the puja and send you a video proof.",
      },
    },
    {
      "@type": "Question",
      name: "What is Chadhava and how does it work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Chadhava is an offering of flowers, sweets, and sacred items to a deity at the temple on your behalf. On Vedic Vaibhav you can book chadhava at Banke Bihari, Kedarnath, Vaishno Devi and other temples and receive live video of the offering.",
      },
    },
    {
      "@type": "Question",
      name: "Do you deliver prasad from temples across India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Vedic Vaibhav delivers authentic temple prasad from Vrindavan, Mathura, Kedarnath, Vaishno Devi, and other sacred temples directly to your door anywhere in India.",
      },
    },
    {
      "@type": "Question",
      name: "Can I book puja for 12 Jyotirlinga temples online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Vedic Vaibhav offers puja booking at all 12 Jyotirlinga temples including Somnath, Mahakaleshwar, Omkareshwar, Kedarnath, Bhimashankar, Kashi Vishwanath, Trimbakeshwar, Vaidyanath, Nageshvara, Rameshwaram, Grishneshwar, and Mallikarjuna.",
      },
    },
    {
      "@type": "Question",
      name: "What is the 4 Dham Yatra package offered by Vedic Vaibhav?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Vedic Vaibhav's 4 Dham Yatra package covers Badrinath, Kedarnath, Gangotri, and Yamunotri. It includes guided pilgrimage arrangements, puja bookings at each dham, and accommodation support.",
      },
    },
    {
      "@type": "Question",
      name: "Is Gau Seva available online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can sponsor Gau Seva (cow service) online through vedicvaibhav.com/services/gau-seva. Your donation feeds and cares for cows at a registered gaushala and you receive photo/video confirmation.",
      },
    },
  ],
};

const topServices = [
  { name: "Chadhava", path: "/chadhava" },
  { name: "Book Pooja", path: "/services/puja" },
  { name: "Shri Banke Bihari Ji Mandir Puja", path: "/services/banke-bihariji" },
  { name: "4 Dham Yatra", path: "/4-dham-yatra" },
  { name: "12 Jyotirlinga", path: "/services/12-jyotirlinga" },
  { name: "Gau Seva", path: "/services/gau-seva" },
  { name: "Jyotirling Chadhava Seva", path: "/services/new-jyotirling-chadhava" },
  { name: "Vedic Pathshala", path: "/vedic-pathshala" },
  { name: "Book Personalise Puja by Mandir", path: "/personalizedpuja" },
  { name: "Sanatan Yatra", path: "/sanatan-yatra" },
  { name: "Video Proof", path: "/video-proof" },
];

export const topServicesSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Top Services on Vedic Vaibhav",
  itemListOrder: "https://schema.org/ItemListOrderAscending",
  numberOfItems: topServices.length,
  itemListElement: topServices.map((s, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: s.name,
    url: `${SITE_URL}${s.path}`,
  })),
};

export const navigationSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Primary Navigation",
  description: "Main navigation tabs for Vedic Vaibhav",
  itemListElement: topServices.map((s, i) => ({
    "@type": "SiteNavigationElement",
    position: i + 1,
    name: s.name,
    url: `${SITE_URL}${s.path}`,
  })),
};

export const allSchemas = [
  organizationSchema,
  websiteSchema,
  localBusinessSchema,
  breadcrumbSchema,
  faqSchema,
  topServicesSchema,
  navigationSchema,
];
