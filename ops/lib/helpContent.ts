// Long-form bilingual content for the Help page — kept separate from lib/i18n.ts's flat
// UI_STRINGS dictionary on purpose: that dictionary is short chrome labels, this is paragraphs.

export type PipelineStep = {
  key: string;
  titleEn: string;
  titleFr: string;
  whereEn: string;
  whereFr: string;
  href: string | null; // null when the stage genuinely has no screen yet (Documents, Payments)
};

// Same nine stages as the Dashboard's "Trip Engine" strip and every architecture doc — this is
// that same fixed pipeline, just answering "where do I actually do this" for each stage.
export const PIPELINE_STEPS: PipelineStep[] = [
  {
    key: "lead",
    titleEn: "Lead",
    titleFr: "Prospect",
    whereEn: "Created automatically the moment you save a new trip.",
    whereFr: "Créé automatiquement dès qu'un nouveau voyage est enregistré.",
    href: "/leads",
  },
  {
    key: "requirements",
    titleEn: "Requirements",
    titleFr: "Exigences",
    whereEn: "Destinations, dates, budget — filled in on the trip page.",
    whereFr: "Destinations, dates, budget — renseignés sur la page du voyage.",
    href: "/trips",
  },
  {
    key: "products",
    titleEn: "Travel Products",
    titleFr: "Produits de voyage",
    whereEn: "One shared catalogue — internal and external products side by side.",
    whereFr: "Un seul catalogue — produits internes et externes côte à côte.",
    href: "/products",
  },
  {
    key: "pricing",
    titleEn: "Pricing",
    titleFr: "Tarification",
    whereEn: "Net cost and selling price, set per line, right inside the quote.",
    whereFr: "Coût net et prix de vente, définis par ligne, dans le devis.",
    href: "/quotes",
  },
  {
    key: "quote",
    titleEn: "Quote",
    titleFr: "Devis",
    whereEn: "Build, price and send an offer — one trip can hold several.",
    whereFr: "Construisez, tarifez et envoyez une offre — un voyage peut en contenir plusieurs.",
    href: "/quotes",
  },
  {
    key: "booking",
    titleEn: "Booking",
    titleFr: "Réservation",
    whereEn: "Created automatically the moment a customer accepts a quote.",
    whereFr: "Créée automatiquement dès qu'un client accepte un devis.",
    href: "/bookings",
  },
  {
    key: "documents",
    titleEn: "Documents",
    titleFr: "Documents",
    whereEn: "Not tracked in TripGate OS yet.",
    whereFr: "Pas encore suivi dans TripGate OS.",
    href: null,
  },
  {
    key: "payments",
    titleEn: "Payments",
    titleFr: "Paiements",
    whereEn: "Not tracked in TripGate OS yet.",
    whereFr: "Pas encore suivi dans TripGate OS.",
    href: null,
  },
  {
    key: "support",
    titleEn: "Support",
    titleFr: "Assistance",
    whereEn: "Log and triage issues for any trip, at any stage.",
    whereFr: "Consignez et triez les problèmes de tout voyage, à toute étape.",
    href: "/support",
  },
];

export type FaqEntry = { qEn: string; qFr: string; aEn: string; aFr: string };

export const FAQ: FaqEntry[] = [
  {
    qEn: "What's the difference between Lead Inbox and Trips?",
    qFr: "Quelle est la différence entre la Boîte de prospects et Voyages ?",
    aEn: "They're not two separate things — every trip starts as a lead. Capture a new enquiry on the Trips page (just a name and phone number is enough); a matching entry appears in Lead Inbox automatically.",
    aFr: "Ce ne sont pas deux choses distinctes — chaque voyage commence par un prospect. Saisissez une nouvelle demande depuis la page Voyages (un nom et un téléphone suffisent) ; une entrée correspondante apparaît automatiquement dans la Boîte de prospects.",
  },
  {
    qEn: "What does \"internal\" vs \"external\" mean on a product?",
    qFr: "Que signifie « interne » ou « externe » sur un produit ?",
    aEn: "Internal means TripGate is the source (no supplier). External means it's sourced from a supplier such as Moods Travel. It's only a label — both sit in the same catalogue and behave identically everywhere: same quote line, same pricing fields, same picker.",
    aFr: "Interne signifie que TripGate est la source (aucun fournisseur). Externe signifie que le produit provient d'un fournisseur comme Moods Travel. Ce n'est qu'une étiquette — les deux figurent dans le même catalogue et se comportent de façon identique partout : même ligne de devis, mêmes champs de prix, même sélecteur.",
  },
  {
    qEn: "I added a product to a quote but \"Send quote\" won't appear. Why?",
    qFr: "J'ai ajouté un produit à un devis mais « Envoyer le devis » n'apparaît pas. Pourquoi ?",
    aEn: "That line is probably priced in a different currency than the quote (e.g. a USD hotel on a MAD quote). A \"Set rate\" field appears automatically on any mismatched line — enter the exchange rate once, and Send unlocks as soon as every line agrees with the quote's currency.",
    aFr: "Cette ligne est probablement tarifée dans une devise différente de celle du devis (par ex. un hôtel en USD sur un devis en MAD). Un champ « Définir le taux » apparaît automatiquement sur toute ligne en écart — saisissez le taux de change une fois, et l'envoi se débloque dès que chaque ligne correspond à la devise du devis.",
  },
  {
    qEn: "How do I offer a customer several options — Budget, Premium, Luxury?",
    qFr: "Comment proposer plusieurs options à un client — Économique, Premium, Luxe ?",
    aEn: "Create several quotes on the same trip (give each a label) and send all of them. The customer sees every sent option side by side on one link and picks one — accepting it automatically closes the others, so the trip can never end up with two conflicting bookings.",
    aFr: "Créez plusieurs devis sur le même voyage (donnez un libellé à chacun) et envoyez-les tous. Le client voit toutes les options envoyées côte à côte sur un seul lien et en choisit une — l'accepter ferme automatiquement les autres, pour qu'un même voyage ne se retrouve jamais avec deux réservations contradictoires.",
  },
  {
    qEn: "What happens the moment a customer accepts a quote?",
    qFr: "Que se passe-t-il dès qu'un client accepte un devis ?",
    aEn: "A booking is created automatically, and every other live option on that trip is closed. Nothing needs to be done by hand.",
    aFr: "Une réservation est créée automatiquement, et toute autre option active de ce voyage est fermée. Rien à faire manuellement.",
  },
  {
    qEn: "A customer changed their mind after accepting. Can I undo it?",
    qFr: "Un client a changé d'avis après avoir accepté. Puis-je annuler ?",
    aEn: "Yes. Open the accepted quote and use \"Cancel booking\" (with a reason) — the booking is marked cancelled and the quote reopens as declined, ready to be revised if needed.",
    aFr: "Oui. Ouvrez le devis accepté et utilisez « Annuler la réservation » (avec un motif) — la réservation est marquée annulée et le devis redevient un devis refusé, prêt à être révisé si besoin.",
  },
  {
    qEn: "I need to change a price after sending a quote. What do I do?",
    qFr: "Je dois modifier un prix après l'envoi d'un devis. Comment faire ?",
    aEn: "A sent quote is locked on purpose — a customer must never see a number silently change after they've already seen it. Click \"Revise\" to create a new draft version with the same lines; the original is kept, marked \"revised\", for the record.",
    aFr: "Un devis envoyé est verrouillé, volontairement — un client ne doit jamais voir un chiffre changer en silence après l'avoir déjà vu. Cliquez sur « Réviser » pour créer une nouvelle version brouillon avec les mêmes lignes ; l'original est conservé, marqué « révisé », pour l'historique.",
  },
  {
    qEn: "What does the \"Blocked\" filter on the Trips page mean?",
    qFr: "Que signifie le filtre « Bloqué » sur la page Voyages ?",
    aEn: "A trip that needs a human decision: it's on hold, a sent quote's validity date has passed with no reply, or there's an unresolved high/urgent support ticket on it.",
    aFr: "Un voyage qui a besoin d'une décision humaine : il est en attente, la date de validité d'un devis envoyé est dépassée sans réponse, ou un ticket d'assistance haute priorité/urgent n'est pas résolu.",
  },
  {
    qEn: "What's the reference number (e.g. TG-2026-0001) for?",
    qFr: "À quoi sert le numéro de référence (ex. TG-2026-0001) ?",
    aEn: "A short, human-readable ID for a trip — safe to read aloud on a phone call or write on a supplier voucher, unlike the long internal ID that appears in the page's URL.",
    aFr: "Un identifiant court et lisible pour un voyage — que l'on peut dicter au téléphone ou écrire sur un bon fournisseur, contrairement à l'identifiant interne, long, qui figure dans l'URL de la page.",
  },
  {
    qEn: "A product's \"Net cost\" shows \"—\". What does that mean?",
    qFr: "Le « Coût net » d'un produit affiche « — ». Que faut-il en penser ?",
    aEn: "No rate has been entered for it yet — nothing was invented in its place. Open Products, click Edit on that product, and fill in Net cost / Selling price; new quote lines will then load with those numbers instead of 0.",
    aFr: "Aucun tarif n'a encore été saisi — rien n'a été inventé à sa place. Ouvrez Produits, cliquez sur Modifier sur ce produit, et renseignez Coût net / Prix de vente ; les nouvelles lignes de devis se chargeront alors avec ces montants au lieu de 0.",
  },
  {
    qEn: "How do I move a product from one supplier to another — or bring it in-house?",
    qFr: "Comment faire passer un produit d'un fournisseur à un autre — ou l'intégrer en interne ?",
    aEn: "Open the product (Products → Edit) and change its Provider field. That's the entire operation — nothing else about the product, or any past quote that already used it, changes.",
    aFr: "Ouvrez le produit (Produits → Modifier) et changez son champ Fournisseur. C'est toute l'opération — rien d'autre ne change, ni pour le produit, ni pour un devis passé qui l'utilisait déjà.",
  },
  {
    qEn: "Why can't I create a booking, document, or payment directly?",
    qFr: "Pourquoi ne puis-je pas créer directement une réservation, un document ou un paiement ?",
    aEn: "A booking is only ever created automatically, the moment a quote is accepted — never by hand, so it can't drift from what the customer actually agreed to. Documents and payments simply aren't tracked in TripGate OS yet; the page says so rather than pretending otherwise.",
    aFr: "Une réservation n'est jamais créée que de façon automatique, dès qu'un devis est accepté — jamais à la main, afin qu'elle ne puisse pas s'écarter de ce que le client a réellement accepté. Les documents et paiements ne sont simplement pas encore suivis dans TripGate OS ; la page le dit clairement plutôt que de faire semblant.",
  },
];
