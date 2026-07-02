/**
 * Per-region structured content — the shared data contract for the destination
 * page redesign (/destinations/:region). Every section component imports from
 * here so copy, representative ports and slugs live in ONE place.
 *
 * Ports: each `code` is a real port that has a harvested photo in
 * src/data/portImages.generated.json, so portImage(code) resolves to a real
 * file (no placeholder). Port `name`s are factual geographic data.
 *
 * Copy: `en`/`el` are ORIGINAL, evocative blurbs written for this partner site
 * — never Explora brand campaign copy. The Greek is natural, not literal.
 *
 * Region→repPort lifts the map already used by the home DestinationsRow.
 */

import { content } from '@/lib/content/store';

export type RegionKey =
  | 'mediterranean'
  | 'caribbean'
  | 'alaska'
  | 'asia'
  | 'northernEurope'
  | 'transatlantic'
  | 'arabian'
  | 'southAmerica'
  | 'pacificCoast'
  | 'canadaNewEngland'
  | 'worldJourney';

export interface RegionPort {
  /** Port code present in portImages.generated.json (so portImage() resolves). */
  code: string;
  /** Factual port name. */
  name: string;
}

export interface RegionCopy {
  /** Short headline, ~4-8 words. */
  tagline: string;
  /** One-sentence introduction, ~25-40 words. */
  intro: string;
  /** "Ashore" blurbs, each ~12-20 words. */
  ashore: {
    culture: string;
    culinary: string;
    history: string;
    nature: string;
  };
}

export interface RegionContent {
  key: RegionKey;
  /** URL slug used by /destinations/:slug. */
  slug: string;
  /** Representative photographed port code (anchor image), '' for world-journey. */
  repPort: string;
  /** 4-6 representative ports, each with a real harvested photo. */
  ports: RegionPort[];
  en: RegionCopy;
  el: RegionCopy;
}

export const REGIONS: Record<RegionKey, RegionContent> = {
  mediterranean: {
    key: 'mediterranean',
    slug: 'mediterranean',
    repPort: 'ESBCN',
    ports: [
      { code: 'ESBCN', name: 'Barcelona' },
      { code: 'FRMRS', name: 'Marseille' },
      { code: 'ITGOA', name: 'Genoa' },
      { code: 'ITLIV', name: 'Livorno' },
      { code: 'HRDBV', name: 'Dubrovnik' },
      { code: 'GRPIR', name: 'Athens (Piraeus)' },
    ],
    en: {
      tagline: 'Sun-warmed coasts and ancient harbours',
      intro:
        'Trace a shoreline where Roman ruins, sea-bright villages and terraced vineyards meet, gliding from one storied harbour to the next under an unhurried southern sun.',
      ashore: {
        culture: 'Wander tiled old towns, open-air markets and gilded basilicas where each port carries its own dialect of beauty.',
        culinary: 'Long lunches of just-landed seafood, sun-ripened tomatoes and local wine poured beneath the shade of olive trees.',
        history: 'Walk among temples, amphitheatres and harbour fortresses that have watched the same blue water for millennia.',
        nature: 'Hidden coves, cypress hillsides and turquoise shallows reward those who step a little beyond the quay.',
      },
    },
    el: {
      tagline: 'Ηλιόλουστες ακτές και αρχαία λιμάνια',
      intro:
        'Ακολουθήστε μια ακτογραμμή όπου ρωμαϊκά ερείπια, φωτεινά παραθαλάσσια χωριά και αμπελώνες σε πεζούλες συναντιούνται, γλιστρώντας από το ένα ιστορικό λιμάνι στο άλλο κάτω από έναν ανέμελο νότιο ήλιο.',
      ashore: {
        culture: 'Περιπλανηθείτε σε γραφικές παλιές πόλεις, υπαίθριες αγορές και χρυσαφένιες βασιλικές, όπου κάθε λιμάνι έχει τη δική του γλώσσα ομορφιάς.',
        culinary: 'Ατελείωτα γεύματα με ολόφρεσκα θαλασσινά, ηλιοψημένες ντομάτες και ντόπιο κρασί κάτω από τη σκιά των ελαιόδεντρων.',
        history: 'Περπατήστε ανάμεσα σε ναούς, αμφιθέατρα και λιμενικά κάστρα που αντικρίζουν το ίδιο γαλάζιο νερό εδώ και χιλιετίες.',
        nature: 'Κρυμμένοι κολπίσκοι, λόφοι με κυπαρίσσια και τιρκουάζ ρηχά νερά ανταμείβουν όσους τολμούν λίγο πιο πέρα από την προκυμαία.',
      },
    },
  },

  caribbean: {
    key: 'caribbean',
    slug: 'caribbean',
    repPort: 'USMIA',
    ports: [
      { code: 'USMIA', name: 'Miami' },
      { code: 'BBBGI', name: 'Bridgetown' },
      { code: 'LCCAS', name: 'Castries' },
      { code: 'KNBAS', name: 'Basseterre' },
      { code: 'JMOCJ', name: 'Ocho Rios' },
      { code: 'VIFRD', name: 'Frederiksted' },
    ],
    en: {
      tagline: 'Turquoise water, easy island time',
      intro:
        'Drift between green volcanic isles and powder-soft shores where the rhythm slows, the water turns every shade of blue and each island keeps its own warm welcome.',
      ashore: {
        culture: 'Colour-washed streets, drumming and dancehall, and a creole spirit that blends African, European and indigenous threads.',
        culinary: 'Jerk spice and grilled catch of the day, rum cooled in the shade and tropical fruit straight from the tree.',
        history: 'Stone garrisons, sugar estates and harbour forts trace the long, layered story of the trade-wind isles.',
        nature: 'Snorkel coral gardens, hike a rainforest waterfall or simply sink your feet into improbably white sand.',
      },
    },
    el: {
      tagline: 'Τιρκουάζ νερά, νησιώτικη ηρεμία',
      intro:
        'Πλεύστε ανάμεσα σε καταπράσινα ηφαιστειακά νησιά και ακτές με λευκή άμμο, εκεί όπου ο ρυθμός χαλαρώνει, το νερό παίρνει κάθε απόχρωση του γαλάζιου και κάθε νησί κρατά το δικό του ζεστό καλωσόρισμα.',
      ashore: {
        culture: 'Πολύχρωμα δρομάκια, ρυθμοί από τύμπανα και dancehall, και ένα κρεόλικο πνεύμα που σμίγει αφρικανικές, ευρωπαϊκές και ιθαγενείς κλωστές.',
        culinary: 'Πικάντικο jerk και φρεσκοψημένα θαλασσινά, παγωμένο ρούμι στη σκιά και τροπικά φρούτα κατευθείαν από το δέντρο.',
        history: 'Πέτρινα οχυρά, φυτείες ζάχαρης και λιμενικά κάστρα αφηγούνται τη μακρά, πολυεπίπεδη ιστορία των νησιών των αληγών ανέμων.',
        nature: 'Κάντε κατάδυση σε κοραλλιογενείς κήπους, ανηφορίστε σε καταρράκτη μέσα στο τροπικό δάσος ή απλώς βυθίστε τα πόδια σας στην κάτασπρη άμμο.',
      },
    },
  },

  alaska: {
    key: 'alaska',
    slug: 'alaska',
    repPort: 'USJNU',
    ports: [
      { code: 'USJNU', name: 'Juneau' },
      { code: 'USSIT', name: 'Sitka' },
      { code: 'USKTN', name: 'Ketchikan' },
      { code: 'USSWD', name: 'Seward' },
      { code: 'CAVAN', name: 'Vancouver' },
    ],
    en: {
      tagline: 'Glaciers, fjords and the great wild',
      intro:
        'Sail a coast of calving glaciers and mist-wrapped fjords, where bald eagles ride the thermals and whales surface in still, silver water beneath the mountains.',
      ashore: {
        culture: 'Totem traditions and gold-rush frontier towns where indigenous heritage and pioneer grit still shape daily life.',
        culinary: 'Wild salmon and king crab pulled cold from the sea, smoked, grilled and served beside a spruce-tip ale.',
        history: 'Boomtown saloons, Russian onion domes and clapboard canneries recall a coast built on fur, gold and fish.',
        nature: 'Watch glaciers thunder into the sea, count breaching whales and scan the shore for bears and eagles.',
      },
    },
    el: {
      tagline: 'Παγετώνες, φιόρδ και άγρια φύση',
      intro:
        'Πλεύστε σε μια ακτή με παγετώνες που θρυμματίζονται και ομιχλώδη φιόρδ, εκεί όπου οι αετοί καλπάζουν στους ανέμους και οι φάλαινες αναδύονται σε ασημένια, ακίνητα νερά κάτω από τα βουνά.',
      ashore: {
        culture: 'Παραδόσεις των τοτέμ και πόλεις του πυρετού του χρυσού, όπου η ιθαγενής κληρονομιά και το πνεύμα των πρωτοπόρων ζουν ακόμη.',
        culinary: 'Άγριος σολομός και βασιλικός κάβουρας βγαλμένοι από την παγωμένη θάλασσα, καπνιστοί ή ψητοί, με μια τοπική μπίρα δίπλα.',
        history: 'Σαλούν της εποχής του χρυσού, ρωσικοί τρούλοι και ξύλινες κονσερβοποιίες θυμίζουν μια ακτή χτισμένη στη γούνα, τον χρυσό και το ψάρι.',
        nature: 'Δείτε παγετώνες να καταρρέουν στη θάλασσα, μετρήστε φάλαινες που πηδούν και ψάξτε στην ακτή για αρκούδες και αετούς.',
      },
    },
  },

  asia: {
    key: 'asia',
    slug: 'asia',
    repPort: 'JPTYO',
    ports: [
      { code: 'JPTYO', name: 'Tokyo' },
      { code: 'JPOSA', name: 'Osaka' },
      { code: 'JPKNZ', name: 'Kanazawa' },
      { code: 'THHKT', name: 'Phuket' },
      { code: 'VNHLG', name: 'Ha Long' },
    ],
    en: {
      tagline: 'Old temples, new horizons',
      intro:
        'Cross a coast of lantern-lit ports and limestone bays, where neon cities give way to silent shrines, floating markets and the slow ceremony of tea.',
      ashore: {
        culture: 'Tea houses and temple gardens, electric night markets and craft passed through unbroken generations.',
        culinary: 'Knife-edge sushi, smoky street woks and fragrant broths simmered low and slow in family kitchens.',
        history: 'Imperial castles, ancient pilgrim routes and harbour cities reshaped by centuries of trade with the sea.',
        nature: 'Drift past emerald karst islands, cherry-blossom valleys and rice terraces stepping down to the shore.',
      },
    },
    el: {
      tagline: 'Αρχαίοι ναοί, νέοι ορίζοντες',
      intro:
        'Διασχίστε μια ακτή με λιμάνια φωτισμένα από φαναράκια και κόλπους με ασβεστολιθικούς βράχους, εκεί όπου οι πόλεις του νέον δίνουν τη θέση τους σε σιωπηλά ιερά, πλωτές αγορές και την αργή τελετή του τσαγιού.',
      ashore: {
        culture: 'Τεϊοποτεία και κήποι ναών, ηλεκτρισμένες νυχτερινές αγορές και τέχνη που περνά αδιάκοπα από γενιά σε γενιά.',
        culinary: 'Λεπτεπίλεπτο σούσι, καπνιστά γουόκ του δρόμου και αρωματικοί ζωμοί που σιγοβράζουν στις οικογενειακές κουζίνες.',
        history: 'Αυτοκρατορικά κάστρα, αρχαίοι δρόμοι προσκυνητών και λιμάνια που διαμορφώθηκαν από αιώνες εμπορίου με τη θάλασσα.',
        nature: 'Περάστε δίπλα από σμαραγδένια βραχονήσια, κοιλάδες με ανθισμένες κερασιές και ορυζώνες σε πεζούλες που κατεβαίνουν στην ακτή.',
      },
    },
  },

  northernEurope: {
    key: 'northernEurope',
    slug: 'northern-europe',
    repPort: 'DKCPH',
    ports: [
      { code: 'DKCPH', name: 'Copenhagen' },
      { code: 'NOBGO', name: 'Bergen' },
      { code: 'NOHVG', name: 'Honningsvåg' },
      { code: 'ISREY', name: 'Reykjavik' },
      { code: 'NLAMS', name: 'Amsterdam' },
    ],
    en: {
      tagline: 'Deep fjords and long northern light',
      intro:
        'Follow a coast of mirror-still fjords and design-bright capitals, where the summer sun barely sets and waterfalls thread down sheer green walls into the sea.',
      ashore: {
        culture: 'Harbourfront design districts, Viking sagas and the warm, candlelit ease of a long northern evening.',
        culinary: 'New-Nordic plates of foraged herbs, cured fish and rye, paired with crisp aquavit and dark coffee.',
        history: 'Longships and hanseatic warehouses, painted wharves and timber stave churches that have weathered a thousand winters.',
        nature: 'Glide beneath cliffs and cascades, chase the midnight sun and watch for puffins, seals and breaching whales.',
      },
    },
    el: {
      tagline: 'Βαθιά φιόρδ και ατέλειωτο βόρειο φως',
      intro:
        'Ακολουθήστε μια ακτή με καθρεφτένια φιόρδ και πρωτεύουσες λαμπερές από σχέδιο, εκεί όπου ο καλοκαιρινός ήλιος δεν δύει σχεδόν ποτέ και καταρράκτες κατηφορίζουν κατακόρυφα πράσινα τοιχώματα προς τη θάλασσα.',
      ashore: {
        culture: 'Σχεδιαστικές γειτονιές στην προκυμαία, σάγκα των Βίκινγκ και η ζεστή, κεριά-φωτισμένη γαλήνη μιας μακριάς βόρειας βραδιάς.',
        culinary: 'Νεο-σκανδιναβικά πιάτα με αυτοφυή βότανα, παστό ψάρι και σίκαλη, με δροσερό aquavit και βαρύ καφέ.',
        history: 'Δράκαρ των Βίκινγκ και χανσεατικές αποθήκες, βαμμένες προβλήτες και ξύλινες εκκλησίες που άντεξαν χίλιους χειμώνες.',
        nature: 'Γλιστρήστε κάτω από βράχια και καταρράκτες, κυνηγήστε τον ήλιο του μεσονυχτίου και αναζητήστε θαλασσοπούλια, φώκιες και φάλαινες.',
      },
    },
  },

  transatlantic: {
    key: 'transatlantic',
    slug: 'transatlantic',
    repPort: 'USNYC',
    ports: [
      { code: 'USNYC', name: 'New York City' },
      { code: 'GBSOU', name: 'Southampton' },
      { code: 'PTLIS', name: 'Lisbon' },
      { code: 'PTFNC', name: 'Funchal' },
      { code: 'ESCAD', name: 'Cadiz' },
    ],
    en: {
      tagline: 'The classic ocean crossing',
      intro:
        'Cross the open Atlantic the timeless way — unhurried days at sea between two continents, bookended by great port cities and a scatter of mid-ocean islands.',
      ashore: {
        culture: 'From a skyline metropolis to old-world capitals, each landfall trades one continent’s rhythm for another.',
        culinary: 'Atlantic flavours from char-grilled fish and salt cod to garden Madeira wine and pastel custard tarts.',
        history: 'Trace the great age of liners and explorers across harbours that launched ships toward the New World.',
        nature: 'Endless horizons, star-thick night skies and seabirds shadowing the wake far from any shore.',
      },
    },
    el: {
      tagline: 'Το κλασικό πέρασμα του ωκεανού',
      intro:
        'Διασχίστε τον ανοιχτό Ατλαντικό με τον διαχρονικό τρόπο — ανέμελες μέρες στη θάλασσα ανάμεσα σε δύο ηπείρους, με σπουδαία λιμάνια στις δύο άκρες και νησιά σκορπισμένα στη μέση του ωκεανού.',
      ashore: {
        culture: 'Από μια μητρόπολη με ουρανοξύστες ως πρωτεύουσες του Παλιού Κόσμου, κάθε αράξιμο αλλάζει τον ρυθμό μιας ηπείρου με μιας άλλης.',
        culinary: 'Ατλαντικές γεύσεις, από ψητό ψάρι και παστό μπακαλιάρο ως κρασί Μαδέρας και πορτογαλικά παστάκια κρέμας.',
        history: 'Ακολουθήστε τη μεγάλη εποχή των υπερωκεάνιων και των εξερευνητών σε λιμάνια που ξεπροβόδισαν πλοία προς τον Νέο Κόσμο.',
        nature: 'Ατέλειωτοι ορίζοντες, νυχτερινοί ουρανοί γεμάτοι αστέρια και θαλασσοπούλια που ακολουθούν τον απόνερο μακριά από κάθε ακτή.',
      },
    },
  },

  arabian: {
    key: 'arabian',
    slug: 'arabian',
    repPort: 'AEDXB',
    ports: [
      { code: 'AEDXB', name: 'Dubai' },
      { code: 'AEAUH', name: 'Abu Dhabi' },
      { code: 'OMMCT', name: 'Muscat' },
      { code: 'QADOH', name: 'Doha' },
      { code: 'SAJED', name: 'Jeddah' },
    ],
    en: {
      tagline: 'Desert gold meets warm gulf seas',
      intro:
        'Sail a coast where mirrored skylines rise from the sand, spice souks perfume the evening air and ancient forts keep watch over the warm, glassy gulf.',
      ashore: {
        culture: 'Gold and spice souks, soaring mosques and the deep hospitality of desert and dhow alike.',
        culinary: 'Slow-spiced rice and grilled meats, dates and cardamom coffee, mezze laid out beneath the stars.',
        history: 'Mud-brick forts, pearl-diving harbours and frankincense routes that once tied this coast to the world.',
        nature: 'Sculpted dunes and oasis palms by day, snorkelling reefs and calm turquoise shallows by the shore.',
      },
    },
    el: {
      tagline: 'Χρυσή έρημος και ζεστές θάλασσες του Κόλπου',
      intro:
        'Πλεύστε σε μια ακτή όπου καθρεφτένιοι ουρανοξύστες υψώνονται από την άμμο, τα παζάρια μπαχαρικών αρωματίζουν τον βραδινό αέρα και αρχαία οχυρά φυλούν τον ζεστό, γυάλινο κόλπο.',
      ashore: {
        culture: 'Παζάρια χρυσού και μπαχαρικών, επιβλητικά τζαμιά και η βαθιά φιλοξενία της ερήμου και των ιστιοφόρων dhow.',
        culinary: 'Ρύζι με αργά μπαχαρικά και ψητά κρέατα, χουρμάδες και καφές με κάρδαμο, μεζέδες στρωμένοι κάτω από τα αστέρια.',
        history: 'Πήλινα οχυρά, λιμάνια αλιείας μαργαριταριών και δρόμοι του λιβανιού που έδεσαν κάποτε αυτή την ακτή με τον κόσμο.',
        nature: 'Γλυπτοί αμμόλοφοι και φοίνικες των οάσεων τη μέρα, κοραλλιογενείς ύφαλοι και γαλήνια τιρκουάζ νερά στην ακτή.',
      },
    },
  },

  southAmerica: {
    key: 'southAmerica',
    slug: 'south-america',
    repPort: 'BRMAO',
    ports: [
      { code: 'BRMAO', name: 'Manaus' },
      { code: 'BRMCP', name: 'Macapá' },
      { code: 'CLVAP', name: 'Valparaíso' },
    ],
    en: {
      tagline: 'Rivers, rainforest and high coasts',
      intro:
        'Voyage from the wide, brown reach of the Amazon to the bright Pacific shore, between jungle ports, painted hill towns and a continent of vivid, untamed colour.',
      ashore: {
        culture: 'Carnival rhythm and rainforest river life, hillside murals and markets bursting with handcraft and song.',
        culinary: 'River fish and tropical fruit, ceviche brightened with lime, and dark coffee from the high valleys.',
        history: 'Rubber-boom opera houses, colonial plazas and ports that opened a continent’s interior to the sea.',
        nature: 'Glide past flooded forest and pink-dolphin water, then trade jungle heat for breezy Pacific cliffs.',
      },
    },
    el: {
      tagline: 'Ποτάμια, τροπικά δάση και ψηλές ακτές',
      intro:
        'Ταξιδέψτε από την πλατιά, καστανή ροή του Αμαζονίου ως τη φωτεινή ακτή του Ειρηνικού, ανάμεσα σε λιμάνια της ζούγκλας, πολύχρωμες πόλεις στους λόφους και μια ήπειρο γεμάτη ζωντανό, αδάμαστο χρώμα.',
      ashore: {
        culture: 'Ρυθμός καρναβαλιού και ζωή στα ποτάμια του δάσους, τοιχογραφίες στους λόφους και αγορές γεμάτες χειροτεχνία και τραγούδι.',
        culinary: 'Ψάρια του ποταμού και τροπικά φρούτα, σεβίτσε με άρωμα λάιμ, και βαρύς καφές από τις ψηλές κοιλάδες.',
        history: 'Όπερες της εποχής του καουτσούκ, αποικιακές πλατείες και λιμάνια που άνοιξαν την ενδοχώρα μιας ηπείρου στη θάλασσα.',
        nature: 'Γλιστρήστε δίπλα από πλημμυρισμένα δάση και νερά με ροζ δελφίνια, κι έπειτα αλλάξτε τη ζέστη της ζούγκλας με τους δροσερούς βράχους του Ειρηνικού.',
      },
    },
  },

  pacificCoast: {
    key: 'pacificCoast',
    slug: 'pacific-coast',
    repPort: 'USSFO',
    ports: [
      { code: 'USSFO', name: 'San Francisco' },
      { code: 'USLAX', name: 'Los Angeles' },
      { code: 'USSAN', name: 'San Diego' },
      { code: 'MXCZM', name: 'Cozumel' },
      { code: 'CABCO', name: 'Baie-Comeau' },
    ],
    en: {
      tagline: 'Surf coast and golden cities',
      intro:
        'Trace the western shore where fog-cool bays meet sun-bleached beaches, gliding past landmark bridges, vineyard hills and easy, open-collared coastal cities.',
      ashore: {
        culture: 'Bay-front neighbourhoods, surf and studio towns, and a relaxed coastal culture all its own.',
        culinary: 'Farm-to-table plates and ocean-fresh oysters, taco trucks and the bold reds of nearby valleys.',
        history: 'Spanish missions, gold-rush wharves and the bright modern story of a coast built facing the sunset.',
        nature: 'Watch sea lions and grey whales offshore, then drive a cliff road above the endless rolling Pacific.',
      },
    },
    el: {
      tagline: 'Ακτή του σερφ και χρυσές πόλεις',
      intro:
        'Ακολουθήστε τη δυτική ακτή όπου δροσεροί, ομιχλώδεις κόλποι συναντούν ηλιόλουστες παραλίες, γλιστρώντας δίπλα από εμβληματικές γέφυρες, αμπελώνες στους λόφους και χαλαρές παραθαλάσσιες πόλεις.',
      ashore: {
        culture: 'Γειτονιές στην προκυμαία, πόλεις του σερφ και της δημιουργίας, και μια χαλαρή παραθαλάσσια κουλτούρα ολόδική της.',
        culinary: 'Πιάτα από το χωράφι στο τραπέζι και ολόφρεσκα στρείδια, φορτηγάκια με τάκος και τα δυνατά κόκκινα κρασιά των γειτονικών κοιλάδων.',
        history: 'Ισπανικές αποστολές, προβλήτες του πυρετού του χρυσού και η φωτεινή σύγχρονη ιστορία μιας ακτής στραμμένης στο ηλιοβασίλεμα.',
        nature: 'Παρατηρήστε θαλάσσια λιοντάρια και γκρι φάλαινες ανοιχτά, κι έπειτα διασχίστε έναν δρόμο πάνω από βράχους με θέα τον ατέλειωτο Ειρηνικό.',
      },
    },
  },

  canadaNewEngland: {
    key: 'canadaNewEngland',
    slug: 'canada-new-england',
    repPort: 'CAQUE',
    ports: [
      { code: 'CAQUE', name: 'Quebec City' },
      { code: 'CAHAL', name: 'Halifax' },
      { code: 'USBOS', name: 'Boston' },
      { code: 'USPWM', name: 'Portland' },
      { code: 'USNYC', name: 'New York City' },
    ],
    en: {
      tagline: 'Lighthouses, lobster and autumn fire',
      intro:
        'Sail a northeast coast of clapboard harbours and walled riverside cities, where lighthouses mark the headlands and the forests blaze scarlet and gold come autumn.',
      ashore: {
        culture: 'Cobbled old towns and harbour villages, maritime museums and a proud, weathered seafaring spirit.',
        culinary: 'Lobster straight from the pot, chowder and steamed clams, maple sweetness and crisp cider.',
        history: 'Walled colonial cities, revolutionary harbours and forts that guarded the gateway to a new continent.',
        nature: 'Watch whales off rocky headlands and sail beneath cliffs ablaze with the colour of a northern fall.',
      },
    },
    el: {
      tagline: 'Φάροι, αστακός και φθινοπωρινή φωτιά',
      intro:
        'Πλεύστε σε μια βορειοανατολική ακτή με ξύλινα λιμανάκια και τειχισμένες παραποτάμιες πόλεις, εκεί όπου οι φάροι σημαδεύουν τα ακρωτήρια και τα δάση φλέγονται κατακόκκινα και χρυσά το φθινόπωρο.',
      ashore: {
        culture: 'Λιθόστρωτες παλιές πόλεις και ψαροχώρια, ναυτικά μουσεία και ένα περήφανο, καλοδεμένο ναυτικό πνεύμα.',
        culinary: 'Αστακός κατευθείαν από την κατσαρόλα, ψαρόσουπα και αχνιστά κυδώνια, η γλύκα του σφενδάμου και δροσερός μηλίτης.',
        history: 'Τειχισμένες αποικιακές πόλεις, λιμάνια της επανάστασης και οχυρά που φύλαγαν την πύλη προς μια νέα ήπειρο.',
        nature: 'Δείτε φάλαινες έξω από βραχώδη ακρωτήρια και πλεύστε κάτω από βράχια που φλέγονται στα χρώματα του βόρειου φθινοπώρου.',
      },
    },
  },

  worldJourney: {
    key: 'worldJourney',
    slug: 'world-journey',
    repPort: '',
    ports: [
      { code: 'AUSYD', name: 'Sydney' },
      { code: 'PFPPT', name: 'Papeete' },
      { code: 'MVMLE', name: 'Malé' },
      { code: 'LKCMB', name: 'Colombo' },
      { code: 'ISREY', name: 'Reykjavik' },
    ],
    en: {
      tagline: 'One voyage, the whole world',
      intro:
        'Circle the globe across oceans and time zones, stringing together far-flung harbours and tiny islands into a single, unhurried journey of a lifetime.',
      ashore: {
        culture: 'Step between continents and faiths, festivals and tongues, gathering a world’s worth of welcomes ashore.',
        culinary: 'Taste a planet in one passage — street spice, raw island fish and grand-capital tables alike.',
        history: 'Follow the old trade and exploration routes that first knit distant coasts into one connected world.',
        nature: 'Cross open ocean to coral atolls, glacier coasts and palm-fringed bays few travellers ever reach.',
      },
    },
    el: {
      tagline: 'Ένα ταξίδι, όλος ο κόσμος',
      intro:
        'Κάντε τον γύρο του κόσμου διασχίζοντας ωκεανούς και ζώνες ώρας, δένοντας μακρινά λιμάνια και μικροσκοπικά νησιά σε ένα ενιαίο, ανέμελο ταξίδι ζωής.',
      ashore: {
        culture: 'Περάστε ανάμεσα σε ηπείρους και θρησκείες, γιορτές και γλώσσες, μαζεύοντας τα καλωσορίσματα ολόκληρου του κόσμου.',
        culinary: 'Γευτείτε έναν πλανήτη σε ένα ταξίδι — μπαχαρικά του δρόμου, ωμό ψάρι των νησιών και τραπέζια μεγάλων πρωτευουσών.',
        history: 'Ακολουθήστε τους παλιούς δρόμους του εμπορίου και της εξερεύνησης που πρωτοέδεσαν μακρινές ακτές σε έναν ενωμένο κόσμο.',
        nature: 'Διασχίστε ανοιχτούς ωκεανούς προς κοραλλιογενείς ατόλες, παγωμένες ακτές και κόλπους με φοίνικες που λίγοι ταξιδιώτες φτάνουν.',
      },
    },
  },
};

/** Original generic fallback copy — used when a region has no entry/locale. */
export const GENERIC_COPY: RegionCopy = {
  tagline: 'Horizons worth crossing an ocean for',
  intro:
    'Glide from one storied harbour to the next, trading the rush of arrival for the quiet pleasure of the sea, and let each shore unfold at its own unhurried pace.',
  ashore: {
    culture: 'Wander old towns and waterfront quarters where every port keeps its own customs, colour and welcome.',
    culinary: 'Taste the coast itself — just-landed catch, local produce and a glass poured the way the locals like it.',
    history: 'Walk among forts, harbours and monuments that have watched the same water for generations.',
    nature: 'Beyond the quay lie coves, headlands and wild shorelines that reward the curious traveller.',
  },
};

const SLUG_INDEX: Record<string, RegionContent> = Object.fromEntries(
  Object.values(REGIONS).map((r) => [r.slug, r]),
);

/** Resolve region content by its URL slug (e.g. 'northern-europe'). */
export function regionContentBySlug(slug: string): RegionContent | undefined {
  return SLUG_INDEX[slug];
}

/** Pick the locale copy for a region; Greek when lang starts with 'el', else English.
 *  A client-set CMS override for `data.regions.<slug>.tagline` (if any) wins. */
export function regionCopy(c: RegionContent, lang: string): RegionCopy {
  const locale = lang.startsWith('el') ? 'el' : 'en';
  const base = locale === 'el' ? c.el : c.en;
  const tagline = content(`data.regions.${c.slug}.tagline`, base.tagline, locale);
  return tagline === base.tagline ? base : { ...base, tagline };
}
