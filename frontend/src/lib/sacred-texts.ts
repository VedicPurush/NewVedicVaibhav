/**
 * Static slug → document map for the Puran / Ved / Audio / sacred-text reader
 * routes. URLs are copied from the legacy App.tsx route table so the reader
 * behaves identically to the old site.
 *
 * One deliberate exception: Sam Ved's URL ended in `.pdff` there, which 404s on
 * vedpuran.net and rendered an empty iframe. It is corrected to `.pdf` below.
 * Note the `ring-ved` SLUG is still the legacy spelling of "rig" — that one is
 * a live URL people may have bookmarked, so it is left alone.
 */

export type SacredTextType = "pdf" | "audio";

export interface SacredText {
  title: string;
  url: string;
  type: SacredTextType;
}

/** `/puran/:slug` */
export const PURAN_TEXTS: Record<string, SacredText> = {
  "agni-puran": { title: "Agni Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/agni-puran.pdf", type: "pdf" },
  "bhagwat-puran": { title: "Bhagwat Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/bhagwat-puran.pdf", type: "pdf" },
  "bhavishya-puran": { title: "Bhavishya Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/bavishya-puran.pdf", type: "pdf" },
  "brahma-puran": { title: "Brahma Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/bramha.pdf", type: "pdf" },
  "brahmand-puran-part-1": { title: "Brahmand Puran Part 1", url: "https://vedpuran.net/wp-content/uploads/2011/10/brahamand.pdf", type: "pdf" },
  "brahmand-puran-part-2": { title: "Brahmand Puran Part 2", url: "https://vedpuran.net/wp-content/uploads/2011/10/brahamandp.pdf", type: "pdf" },
  "garuda-puran": { title: "Garuda Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/garuda1.pdf", type: "pdf" },
  "kurma-puran": { title: "Kurma Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/kurma.pdf", type: "pdf" },
  "ling-puran": { title: "Ling Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/ling.pdf", type: "pdf" },
  "markandeya-puran": { title: "Markandeya Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/markende-puran.pdf", type: "pdf" },
  "matsya-puran-part-1": { title: "Matsya Puran Part 1", url: "https://vedpuran.net/wp-content/uploads/2011/10/matsya-puran-1.pdf", type: "pdf" },
  "matsya-puran-part-2": { title: "Matsya Puran Part 2", url: "https://vedpuran.net/wp-content/uploads/2011/10/matsya-puran-2.pdf", type: "pdf" },
  "narad-puran": { title: "Narad Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/nard-puran.pdf", type: "pdf" },
  "padma-puran": { title: "Padma Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/padam-puran.pdf", type: "pdf" },
  "shiv-puran": { title: "Shiv Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/shiv-puran.pdf", type: "pdf" },
  "skand-puran": { title: "Skand Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/sakand-puran.pdf", type: "pdf" },
  "brahmvaivatra-puran": { title: "Brahmvaivatra Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/vaivtpuran.pdf", type: "pdf" },
  "vaman-puran": { title: "Vaman Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/vamanpuran.pdf", type: "pdf" },
  "varah-puran": { title: "Varah Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/varaha-puran.pdf", type: "pdf" },
  "vishnu-puran": { title: "Vishnu Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/vishnu-puran.pdf", type: "pdf" },
  "vayu-puran": { title: "Vayu Puran", url: "https://vedpuran.net/wp-content/uploads/2016/07/vayu-puran.pdf", type: "pdf" },
  "narsimha-puran": { title: "Narsimha Puran", url: "https://vedpuran.net/wp-content/uploads/2011/10/narsihma-puran.pdf", type: "pdf" },
  "vishwakarma-puran": { title: "Vishwakarma Puran", url: "https://vedpuran.net/wp-content/uploads/2025/03/vishva-karma-puran-and-pujan-paddhati-by-pd-rakesh-shastri.pdf", type: "pdf" },
  "kalki-puran": { title: "Kalki Puran", url: "https://vedpuran.net/wp-content/uploads/2012/12/kalkipuranhindi1.pdf", type: "pdf" },
  "devi-bhagwat": { title: "Devi Bhagwat", url: "https://vedpuran.net/wp-content/uploads/2012/12/devi-bhagavata-purana_press.pdf", type: "pdf" },
};

/** `/ved/:slug` */
export const VED_TEXTS: Record<string, SacredText> = {
  "atharva-ved-part-1": { title: "Atharva Ved Part 1", url: "https://vedpuran.net/wp-content/uploads/2011/10/arthved-part-1.pdf", type: "pdf" },
  "atharva-ved-part-2": { title: "Atharva Ved Part 2", url: "https://vedpuran.net/wp-content/uploads/2011/10/atharva-2.pdf", type: "pdf" },
  "ring-ved": { title: "Rig Ved", url: "https://vedpuran.net/wp-content/uploads/2011/10/rigved.pdf", type: "pdf" },
  // `.pdff` here was a typo carried over from the legacy route table; it 404s.
  "sam-ved": { title: "Sam Ved", url: "https://vedpuran.net/wp-content/uploads/2011/10/samved.pdf", type: "pdf" },
  "yajur-ved": { title: "Yajur Ved", url: "https://vedpuran.net/wp-content/uploads/2011/10/yajurved.pdf", type: "pdf" },
};

/** `/audio/:slug` */
export const AUDIO_TEXTS: Record<string, SacredText> = {
  "bhagavad-gita": { title: "Bhagavad Gita", url: "https://vedpuran.net/wp-content/uploads/2021/05/bhagvad_gita-hindi_complete.mp3", type: "audio" },
  "brahma-sutra": { title: "Brahma Sutra", url: "https://vedpuran.net/wp-content/uploads/2021/05/vachaspti_mishra_bhamiti_ob_brahmsukt.zip", type: "audio" },
  "bhaktmal": { title: "Bhaktmal", url: "https://vedpuran.net/wp-content/uploads/2021/05/bhaktmal.zip", type: "audio" },
};

/** Root-level `/:slug` sacred texts */
export const ROOT_TEXTS: Record<string, SacredText> = {
  "shrimad-bhagavad-geeta-hindi": { title: "Shrimad Bhagavad Geeta (Hindi)", url: "https://vedpuran.net/wp-content/uploads/2012/03/unencrypted-geeta.pdf", type: "pdf" },
  "shrimad-bhagavad-geeta-punjabi": { title: "Shrimad Bhagavad Geeta (Punjabi)", url: "https://vedpuran.net/wp-content/uploads/2012/03/full-punjabi-geeta.pdf", type: "pdf" },
  "shrimad-bhagavad-geeta-english": { title: "Shrimad Bhagavad Geeta (English)", url: "https://vedpuran.net/wp-content/uploads/2013/04/455_gita_roman.pdf", type: "pdf" },
  "mahabharat-hindi": { title: "Mahabharat (Hindi)", url: "https://vedpuran.net/wp-content/uploads/2012/07/mahabhart-full-with-geeta-hindi.pdf", type: "pdf" },
  "ramayana-hindi": { title: "Ramayana (Hindi)", url: "https://vedpuran.net/wp-content/uploads/2012/08/ramayana_all_kand_6191_pages.pdf", type: "pdf" },
  "ramayana-tamil": { title: "Ramayana (Tamil)", url: "https://vedpuran.net/wp-content/uploads/2013/01/tamil-ramayanam-326-page.pdf", type: "pdf" },
  "ramacharitmanas-english": { title: "Ramacharitmanas (English)", url: "https://vedpuran.net/wp-content/uploads/2013/04/1318_sri-ramchritmanas_roman.pdf", type: "pdf" },
  "manusmriti-english": { title: "Manusmriti (English)", url: "https://vedpuran.net/wp-content/uploads/2013/04/manusmriti.pdf", type: "pdf" },
  "vimanika-shastra-hindi": { title: "Vimanika Shastra (Hindi)", url: "https://vedpuran.net/wp-content/uploads/2021/03/vimanika-shaster.pdf", type: "pdf" },
  "narayan-kwach-hindi": { title: "Narayan Kwach (Hindi)", url: "https://vedpuran.net/wp-content/uploads/2016/03/narayan-kwach.pdf", type: "pdf" },
};
