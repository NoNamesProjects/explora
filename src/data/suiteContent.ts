/**
 * Per-tier ORIGINAL editorial copy for the suite-page redesign (en + el).
 *
 * IP note: every line here is written from scratch. These are NOT Explora's
 * verbatim brand campaign lines — they are original phrasings grounded in the
 * factual specs (sizes, berths, the role each suite plays in the fleet). The
 * Greek reads naturally, not as a word-for-word translation of the English.
 *
 * Pairs with the structural contract in src/lib/suiteGallery.ts (TierKey,
 * SUITE_TIERS, galleries). No photos or sizes live here — copy only.
 */

import type { TierKey } from '@/lib/shipAssets';

export interface SuiteCopy {
  /** ~4-8 words — a headline-scale promise for the tier. */
  tagline: string;
  /** 1-2 original sentences, ~25-45 words, describing the suite's character. */
  blurb: string;
  /** 3 short, distinct phrases — scannable highlights. */
  highlights: string[];
}

export const SUITE_COPY: Record<TierKey, { en: SuiteCopy; el: SuiteCopy }> = {
  owners: {
    en: {
      tagline: 'The grandest address at sea',
      blurb:
        'Spanning some 280 square metres, the Owner’s Residence lives like a private apartment afloat — expansive lounge, dining for guests and a wraparound terrace where the horizon becomes your own.',
      highlights: ['Around 280 m² of living space', 'Wraparound private terrace', 'Sleeps up to four guests'],
    },
    el: {
      tagline: 'Η πιο επιβλητική διαμονή στη θάλασσα',
      blurb:
        'Με περίπου 280 τετραγωνικά μέτρα, η Owner’s Residence θυμίζει ιδιωτικό διαμέρισμα — ευρύχωρο σαλόνι, χώρος για δείπνο και μια γωνιακή βεράντα όπου ο ορίζοντας γίνεται δικός σας.',
      highlights: ['Περίπου 280 m² χώρου', 'Γωνιακή ιδιωτική βεράντα', 'Έως τέσσερις επιβάτες'],
    },
  },
  grandPenthouse: {
    en: {
      tagline: 'Generous space, uninterrupted views',
      blurb:
        'A near-60-square-metre penthouse with a wide sea-facing terrace and a living room that opens fully to the light. The most spacious of the penthouse collection, built for unhurried days.',
      highlights: ['Around 60 m²', 'Wide sea-facing terrace', 'Sleeps up to four guests'],
    },
    el: {
      tagline: 'Άπλετος χώρος, αδιάκοπη θέα',
      blurb:
        'Ένα penthouse περίπου 60 τετραγωνικών μέτρων με φαρδιά βεράντα προς τη θάλασσα και σαλόνι γεμάτο φως. Το πιο ευρύχωρο της σειράς penthouse.',
      highlights: ['Περίπου 60 m²', 'Φαρδιά βεράντα στη θάλασσα', 'Έως τέσσερις επιβάτες'],
    },
  },
  premierPenthouse: {
    en: {
      tagline: 'A refined retreat above the waterline',
      blurb:
        'Around 52 square metres of calm, residential design with a separate lounge and a private terrace facing the sea — a penthouse that rewards both quiet mornings and slow evenings.',
      highlights: ['Around 52 m²', 'Separate lounge area', 'Private sea-facing terrace'],
    },
    el: {
      tagline: 'Μια εκλεπτυσμένη γωνιά πάνω από το κύμα',
      blurb:
        'Περίπου 52 τετραγωνικά μέτρα γαλήνιας, κατοικήσιμης σχεδίασης με ξεχωριστό σαλόνι και ιδιωτική βεράντα με θέα στη θάλασσα.',
      highlights: ['Περίπου 52 m²', 'Ξεχωριστό σαλόνι', 'Ιδιωτική βεράντα στη θάλασσα'],
    },
  },
  deluxePenthouse: {
    en: {
      tagline: 'Light-filled living, close to the sea',
      blurb:
        'About 48 square metres arranged around floor-to-ceiling glass, with a comfortable lounge and a furnished terrace. Space to spread out, and a view that never repeats itself.',
      highlights: ['Around 48 m²', 'Floor-to-ceiling glass', 'Furnished private terrace'],
    },
    el: {
      tagline: 'Φωτεινή διαμονή, κοντά στο κύμα',
      blurb:
        'Περίπου 48 τετραγωνικά μέτρα γύρω από τζαμαρίες από το δάπεδο έως την οροφή, με άνετο σαλόνι και επιπλωμένη βεράντα.',
      highlights: ['Περίπου 48 m²', 'Τζαμαρίες από το δάπεδο έως την οροφή', 'Επιπλωμένη ιδιωτική βεράντα'],
    },
  },
  penthouse: {
    en: {
      tagline: 'Where the penthouse story begins',
      blurb:
        'The entry to the penthouse collection at roughly 43 square metres — a relaxed lounge, a private terrace and the easy elegance that runs through every suite on board.',
      highlights: ['Around 43 m²', 'Relaxed lounge area', 'Private terrace'],
    },
    el: {
      tagline: 'Εδώ ξεκινά η ιστορία των penthouse',
      blurb:
        'Η είσοδος στη σειρά penthouse, στα περίπου 43 τετραγωνικά μέτρα — άνετο σαλόνι, ιδιωτική βεράντα και η διακριτική κομψότητα όλων των σουιτών.',
      highlights: ['Περίπου 43 m²', 'Άνετος χώρος σαλονιού', 'Ιδιωτική βεράντα'],
    },
  },
  oceanGrandTerrace: {
    en: {
      tagline: 'An outsized terrace, just for two',
      blurb:
        'Around 39 square metres with a notably wide private terrace facing the open sea. Designed for two, it trades extra rooms for extra horizon and unhurried mornings outdoors.',
      highlights: ['Around 39 m²', 'Extra-wide private terrace', 'Sleeps two guests'],
    },
    el: {
      tagline: 'Μια ασυνήθιστα μεγάλη βεράντα, μόνο για δύο',
      blurb:
        'Περίπου 39 τετραγωνικά μέτρα με ιδιαίτερα φαρδιά ιδιωτική βεράντα προς την ανοιχτή θάλασσα. Σχεδιασμένη για δύο, δίνει περισσότερο ορίζοντα.',
      highlights: ['Περίπου 39 m²', 'Έξτρα φαρδιά βεράντα', 'Για δύο επιβάτες'],
    },
  },
  cove: {
    en: {
      tagline: 'A sheltered nook by the water',
      blurb:
        'Around 70 square metres tucked low and close to the sea, the Cove Residence feels intimate and grounded — a private terrace, a soft lounge and the rhythm of the waves nearby.',
      highlights: ['Around 70 m²', 'Close to the waterline', 'Private terrace'],
    },
    el: {
      tagline: 'Μια προστατευμένη γωνιά δίπλα στο νερό',
      blurb:
        'Περίπου 70 τετραγωνικά μέτρα χαμηλά και κοντά στη θάλασσα· η Cove Residence είναι ζεστή και γειωμένη, με ιδιωτική βεράντα και τον ήχο των κυμάτων.',
      highlights: ['Περίπου 70 m²', 'Κοντά στην επιφάνεια της θάλασσας', 'Ιδιωτική βεράντα'],
    },
  },
  retreat: {
    en: {
      tagline: 'Calm, private, your own pace',
      blurb:
        'About 77 square metres of quiet, residential comfort with a private terrace and a separate lounge — a Retreat Residence made for slowing down and shutting out the world.',
      highlights: ['Around 77 m²', 'Separate lounge area', 'Private terrace'],
    },
    el: {
      tagline: 'Γαλήνιο, ιδιωτικό, στον δικό σας ρυθμό',
      blurb:
        'Περίπου 77 τετραγωνικά μέτρα ήρεμης, κατοικήσιμης άνεσης με ιδιωτική βεράντα και ξεχωριστό σαλόνι — μια Retreat Residence για να επιβραδύνετε.',
      highlights: ['Περίπου 77 m²', 'Ξεχωριστό σαλόνι', 'Ιδιωτική βεράντα'],
    },
  },
  serenity: {
    en: {
      tagline: 'Stillness with a sea view',
      blurb:
        'Around 113 square metres designed around rest — soft textures, a private terrace and a serene interior where the sea sets the tempo for an unbroken sense of ease.',
      highlights: ['Around 113 m²', 'Serene, restful interior', 'Private terrace'],
    },
    el: {
      tagline: 'Ηρεμία με θέα στη θάλασσα',
      blurb:
        'Περίπου 113 τετραγωνικά μέτρα σχεδιασμένα γύρω από την ανάπαυση — απαλές υφές, ιδιωτική βεράντα και ένα γαλήνιο εσωτερικό όπου τον ρυθμό δίνει η θάλασσα.',
      highlights: ['Περίπου 113 m²', 'Γαλήνιο εσωτερικό', 'Ιδιωτική βεράντα'],
    },
  },
  cocoon: {
    en: {
      tagline: 'Wrapped in warmth and quiet',
      blurb:
        'About 149 square metres that fold gently around you — warm materials, a private terrace and an enveloping calm. The Cocoon Residence is a place to feel held while you travel.',
      highlights: ['Around 149 m²', 'Warm, enveloping design', 'Private terrace'],
    },
    el: {
      tagline: 'Τυλιγμένοι σε ζεστασιά και ησυχία',
      blurb:
        'Περίπου 149 τετραγωνικά μέτρα που σας αγκαλιάζουν — θερμά υλικά, ιδιωτική βεράντα και μια περιβάλλουσα ηρεμία. Η Cocoon Residence είναι ένας χώρος προστασίας.',
      highlights: ['Περίπου 149 m²', 'Θερμό, περιβάλλον σχέδιο', 'Ιδιωτική βεράντα'],
    },
  },
  oceanTerrace: {
    en: {
      tagline: 'The sea, from the very first step',
      blurb:
        'The entry suite at around 35 square metres, made for two. Compact and considered, with floor-to-ceiling glass and a private terrace — everything you need, nothing you don’t.',
      highlights: ['Around 35 m²', 'Floor-to-ceiling glass', 'Sleeps two guests'],
    },
    el: {
      tagline: 'Η θάλασσα, από το πρώτο βήμα',
      blurb:
        'Η εισαγωγική σουίτα στα περίπου 35 τετραγωνικά μέτρα, για δύο. Μικρή και μελετημένη, με τζαμαρίες από το δάπεδο έως την οροφή και ιδιωτική βεράντα.',
      highlights: ['Περίπου 35 m²', 'Τζαμαρίες από το δάπεδο έως την οροφή', 'Για δύο επιβάτες'],
    },
  },
};

/** Copy for the /suites/overview landing page (the whole-collection intro). */
export const OVERVIEW_COPY: {
  en: { tagline: string; intro: string };
  el: { tagline: string; intro: string };
} = {
  en: {
    tagline: 'Every journey begins with a suite',
    intro:
      'From the intimate Ocean Terrace to the apartment-scale Owner’s Residence, every suite is ocean-facing and quietly residential — a calm home at sea, sized to the way you like to travel.',
  },
  el: {
    tagline: 'Κάθε ταξίδι ξεκινά από μια σουίτα',
    intro:
      'Από την οικεία Ocean Terrace έως την Owner’s Residence σε μέγεθος διαμερίσματος, κάθε σουίτα βλέπει στη θάλασσα και είναι διακριτικά κατοικήσιμη — ένα ήρεμο σπίτι στη θάλασσα.',
  },
};

/** Generic fallback copy when a tier somehow lacks an entry (defensive only). */
export const GENERIC_SUITE_COPY: SuiteCopy = {
  tagline: 'An ocean-facing home at sea',
  blurb:
    'A calm, residential suite with floor-to-ceiling windows and a private terrace, designed so the sea is always part of the room — space to rest, dine and watch the coastline pass.',
  highlights: ['Ocean-facing throughout', 'Private terrace', 'Residential, restful design'],
};

/** True when a locale code is Greek (handles 'el', 'el-GR', etc.). */
function isGreek(lang: string): boolean {
  return lang.startsWith('el');
}

/** The {tagline, blurb, highlights} copy for a tier in the active language. */
export function suiteCopy(key: TierKey, lang: string): SuiteCopy {
  const entry = SUITE_COPY[key];
  if (!entry) return GENERIC_SUITE_COPY;
  return isGreek(lang) ? entry.el : entry.en;
}

/** The overview-page {tagline, intro} in the active language. */
export function overviewCopy(lang: string): { tagline: string; intro: string } {
  return isGreek(lang) ? OVERVIEW_COPY.el : OVERVIEW_COPY.en;
}
