import { addDays, addMonths, format, nextFriday, nextSunday, startOfDay, subDays } from 'date-fns';
import { enGB } from 'date-fns/locale/en-GB';
import { fr as frLocale } from 'date-fns/locale/fr';
import type {
  CompletedItem, Item, Label, Project, Section, Snapshot, TodoistUser,
} from '@/domain/types';
import { emptySnapshot } from '@/domain/types';
import type { Locale } from '@/i18n';
import { SITE_URL } from '@/app-info';
import { demoFilterRecords } from './demoFilters';
import { buildLegacyDemoCompleted, buildLegacyDemoSnapshot } from './demoData.legacy';

/** The end-to-end tests' own demo: see demoData.legacy.ts. Only a dev server or a build made for the tests (VITE_E2E_LEGACY_DEMO) has it. */
const legacy = (): boolean => {
  if (!import.meta.env.DEV && import.meta.env.VITE_E2E_LEGACY_DEMO !== '1') return false;
  try { return localStorage.getItem('e2eLegacyDemo') === '1'; } catch { return false; }
};

/**
 * A made-up account, so the product can be shown or tried without connecting
 * anyone's real Todoist.
 *
 * Everything here is invented for the demo: no name, project or task is taken
 * from a real account. It is the same account in French and in English: the
 * same person, the same projects in the same order, the same tasks on the same
 * days, only the words change. The guided tour walks through it, so it keeps
 * what the tour points at: a folder, the horizons, the Matrix, the Dashboard,
 * the Review, the Logbook and Someday all have something in them. The snapshot
 * lives in memory only, and the store refuses to send commands or cache
 * anything while it is loaded.
 */

/** Deterministic per session, so a demo can be talked through without it shifting. */
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** The demo user's picture, and the workspace's logo. */
const PERSON_PICTURE = 'https://images.unsplash.com/photo-1639747280804-dd2d6b3d88ac?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D';
const WORKSPACE_LOGO = 'https://images.unsplash.com/vector-1739896184344-762e89390e65?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D';
/** A teammate who is a real person on purpose: the author's own picture, shipped with the app. */
const TEAMMATE_PICTURE = '/author.png';

/** The workspace the demo's pro projects live in. */
export const DEMO_WORKSPACE_ID = 'ws-pro';
/** The teammate the demo's shared projects and assignments use. */
export const DEMO_TEAMMATE_ID = 'demo-jules';
export const DEMO_TEAMMATE_NAME = 'Jules Bertolino';

export function buildDemoSnapshot(locale: Locale = 'en', seed = 20260914): Snapshot {
  if (legacy()) return buildLegacyDemoSnapshot(locale, seed);
  const fr = locale === 'fr';
  /** The same line in the two languages, side by side. */
  const L = (en: string, french: string) => (fr ? french : en);
  const random = makeRandom(seed);
  const today = startOfDay(new Date());
  const iso = (d: Date) => format(d, 'yyyy-MM-dd');
  const day = (n: number) => addDays(today, n);
  const dateFns = fr ? frLocale : enGB;

  const projects: Record<string, Project> = {};
  let projectOrder = 0;
  const addProject = (
    id: string, name: string, color: string, extra: Partial<Project> & { icon?: string } = {},
  ) => {
    const { icon, ...rest } = extra;
    const description = [rest.description, icon ? `<!-- icon:${icon} -->` : ''].filter(Boolean).join('\n\n');
    projectOrder += 1;
    projects[id] = {
      id, name, color, parent_id: null, child_order: projectOrder,
      is_archived: false, is_deleted: false, is_favorite: false,
      workspace_id: null, ...rest, ...(description ? { description } : {}),
    };
  };

  /* Two places, as a Todoist account has them: "My projects" is the absence of
     a workspace, and one workspace for the studio. Inbox never joins either. */
  const workspaces = {
    [DEMO_WORKSPACE_ID]: { id: DEMO_WORKSPACE_ID, name: 'Robin Studio', logo_big: WORKSPACE_LOGO },
  };
  const ws = { workspace_id: DEMO_WORKSPACE_ID };

  addProject('inbox', L('Inbox', 'Boîte de réception'), 'charcoal', { inbox_project: true });
  addProject('personal', L('Personal', 'Perso'), 'orange', { icon: 'user' });
  addProject('health', L('Health', 'Santé'), 'lime_green');
  addProject('home', L('Home', 'Maison'), 'green', {
    icon: 'house', description: L('Upkeep, shopping and small repairs.', 'Entretien, courses et petites réparations.'),
  });
  addProject('side', L('Projects', 'Projets'), 'grey', { is_folder: true });
  addProject('london', L('London weekend', 'Week-end à Londres'), 'red', {
    parent_id: 'side', icon: 'plane',
  });
  addProject('marathon', L('New York Marathon', 'Marathon de New York'), 'yellow', {
    parent_id: 'side',
  });
  addProject('bookclub', L('Book club', 'Club de lecture'), 'violet', { parent_id: 'side' });
  addProject('reading', L('Reading list', 'À lire'), 'lavender');

  addProject('studio', 'Robin Studio', 'blue', { ...ws, is_favorite: true, icon: 'briefcase' });
  addProject('team', L('Team', 'Équipe'), 'teal', { ...ws });
  addProject('clients', L('Projects', 'Projets'), 'grey', { ...ws, is_folder: true });
  addProject('atelier', L('Atelier Lumen website', 'Site Atelier Lumen'), 'grape', {
    ...ws, parent_id: 'clients',
    description: L(
      'A new site for a lighting workshop.\n\n- Warm, simple brand\n- Seven pages\n- Live in five weeks',
      'Un nouveau site pour un atelier de luminaires.\n\n- Une marque chaleureuse et simple\n- Sept pages\n- En ligne dans cinq semaines',
    ),
  });
  addProject('aurel', 'Domaine Aurel', 'salmon', { ...ws, parent_id: 'clients' });
  addProject('bloom', 'Bloom & Co', 'mint_green', { ...ws, parent_id: 'clients' });

  const sections: Record<string, Section> = {};
  let sectionOrder = 0;
  const addSection = (id: string, projectId: string, name: string, description?: string) => {
    sectionOrder += 1;
    sections[id] = {
      id, project_id: projectId, name, section_order: sectionOrder,
      is_archived: false, is_deleted: false, ...(description ? { description } : {}),
    };
  };
  addSection('p-admin', 'personal', L('Admin and finances', 'Administratif et finances'));
  addSection('p-rel', 'personal', L('Relationships', 'Relations'));
  addSection('l-before', 'london', L('Before the trip', 'Avant le voyage'), L('The reservations, before anything else.', 'Les réservations, avant tout le reste.'));
  addSection('l-d1', 'london', L('Day 1', 'Jour 1'));
  addSection('l-d2', 'london', L('Day 2', 'Jour 2'));
  addSection('l-d3', 'london', L('Day 3', 'Jour 3'));
  addSection('m-train', 'marathon', L('Training', 'Entraînement'));
  addSection('m-log', 'marathon', L('Logistics', 'Logistique'));
  addSection('b-read', 'bookclub', L('To read', 'À lire'));
  addSection('b-meet', 'bookclub', L('Next meeting', 'Prochaine rencontre'));
  addSection('s-admin', 'studio', L('Admin and finances', 'Administratif et finances'));
  addSection('s-mkt', 'studio', L('Marketing', 'Marketing'));
  addSection('t-robin', 'team', 'Robin');
  addSection('t-jules', 'team', 'Jules');
  addSection('t-maya', 'team', 'Maya');
  addSection('a-brand', 'atelier', L('Brand and scope', 'Marque et cadrage'));
  addSection('a-design', 'atelier', L('Design', 'Design'), L('Two tasks here at most, or nothing moves.', 'Deux tâches maximum ici, sinon plus rien n’avance.'));
  addSection('a-dev', 'atelier', L('Development', 'Développement'));
  addSection('a-launch', 'atelier', L('Launch', 'Mise en ligne'));

  const labels: Record<string, Label> = {
    l1: { id: 'l1', name: 'quick', color: 'sky_blue', item_order: 1, is_deleted: false, is_favorite: false },
    l2: { id: 'l2', name: 'week', color: 'olive_green', item_order: 2, is_deleted: false, is_favorite: false },
    l3: { id: 'l3', name: 'waiting', color: 'charcoal', item_order: 3, is_deleted: false, is_favorite: true },
    l4: { id: 'l4', name: 'errands', color: 'orange', item_order: 4, is_deleted: false, is_favorite: true },
  };

  const items: Record<string, Item> = {};
  let counter = 0;

  const addItem = (partial: Partial<Item> & { content: string }): Item => {
    counter += 1;
    const item: Item = {
      id: `demo-${counter}`,
      user_id: 'demo-user',
      project_id: 'inbox',
      section_id: null,
      parent_id: null,
      description: '',
      priority: 1,
      due: null,
      deadline: null,
      duration: null,
      labels: [],
      child_order: counter,
      day_order: -1,
      collapsed: false,
      checked: false,
      is_deleted: false,
      added_at: subDays(today, Math.floor(random() * 60)).toISOString(),
      completed_at: null,
      updated_at: today.toISOString(),
      responsible_uid: null,
      ...partial,
      content: partial.content,
    };
    items[item.id] = item;
    return item;
  };

  const due = (date: Date, time?: string, recurring?: string) => ({
    date: time ? `${iso(date)}T${time}` : iso(date),
    timezone: null,
    string: recurring ?? iso(date),
    lang: locale,
    is_recurring: !!recurring,
  });
  const deadline = (date: Date) => ({ date: iso(date), lang: locale });
  const minutes = (amount: number) => ({ amount, unit: 'minute' as const });

  /* Priorities are stored the other way round: 4 is p1. */
  const P1 = 4, P2 = 3, P3 = 2;
  const everyDay = L('every day', 'tous les jours');
  const everyFriday = L('every Friday', 'tous les vendredis');
  const everySunday = L('every Sunday', 'tous les dimanches');
  const afterCompletion = L('every! week', 'tous les! 7 jours');

  /* The trip: a weekend about ten weeks away, from a Friday. */
  const trip = nextFriday(day(72));
  const tripDay = (offset: number) => format(addDays(trip, offset), 'EEEE d MMMM', { locale: dateFns });

  // ── Inbox ──────────────────────────────────────────────────────────────
  addItem({
    content: L('Move my tasks from Notion to Todoist', 'Déplacer mes tâches de Notion vers Todoist'),
    description: L('Export the databases, then import them in one go.', 'Exporter les bases, puis tout importer d’un coup.'),
    labels: ['week', 'est-90'], priority: P2,
  });
  addItem({
    content: L('Check out Enhanced for Todoist', 'Découvrir Enhanced for Todoist'),
    description: `[Enhanced for Todoist](${SITE_URL})`,
    labels: ['thismonth', 'est-10'],
  });
  addItem({ content: L('Pay the parking ticket', 'Payer l’amende de stationnement'), labels: ['est-2'] });

  // ── Personal ───────────────────────────────────────────────────────────
  addItem({
    content: L('Weekly review', 'Revue de la semaine'),
    description: L(
      'Every Friday, in this order:\n- [ ] Sort the Todoist inbox\n- [ ] Sort the email inbox\n- [ ] Check the tasks accomplished this week\n- [ ] Set up next week’s goals',
      'Chaque vendredi, dans cet ordre :\n- [ ] Trier la boîte de réception Todoist\n- [ ] Trier la boîte mail\n- [ ] Vérifier les tâches accomplies cette semaine\n- [ ] Préparer les objectifs de la semaine prochaine',
    ),
    project_id: 'personal', section_id: 'p-admin', priority: P2, labels: ['est-30'],
    due: due(nextFriday(today), '16:00:00', everyFriday),
  });
  addItem({
    content: L('Daily review', 'Revue du jour'),
    description: L(`Start the day here: [open the Review](${SITE_URL}/#/review).`, `Commencer la journée ici : [ouvrir la Revue](${SITE_URL}/#/review).`),
    project_id: 'personal', section_id: 'p-admin', priority: P1, labels: ['est-10'],
    due: due(today, undefined, everyDay),
  });
  addItem({
    content: L('Send Netflix password to Laura', 'Envoyer le mot de passe Netflix à Laura'),
    project_id: 'personal', section_id: 'p-rel', labels: ['quick', 'est-3'], priority: P3, due: due(today),
  });
  addItem({
    content: L('Buy a gift for Laura', 'Acheter un cadeau pour Laura'),
    description: L('Something small, under 40 €.', 'Quelque chose de petit, moins de 40 €.'),
    project_id: 'personal', section_id: 'p-rel', labels: ['errands', 'est-45'], priority: P2,
    due: due(day(6)), deadline: deadline(day(10)),
  });
  addItem({
    content: L('Buy a rainjacket', 'Acheter un k-way'),
    project_id: 'personal', labels: ['errands', 'est-45'], due: due(day(2)),
  });

  // ── Health ─────────────────────────────────────────────────────────────
  addItem({
    content: L('Run 5K', 'Courir 5 km'),
    project_id: 'health', priority: P2, labels: ['est-30'], due: due(day(1), '07:30:00'),
  });
  addItem({
    content: L('Book an appointment to the dentist', 'Prendre rendez-vous chez le dentiste'),
    project_id: 'health', labels: ['quick', 'est-3'],
  });

  // ── Home ───────────────────────────────────────────────────────────────
  addItem({
    content: L('Water the plants', 'Arroser les plantes'),
    project_id: 'home', labels: ['est-10'], due: due(day(1), undefined, afterCompletion),
  });
  addItem({
    content: L('Batch-cooking', 'Batch-cooking'),
    description: L('Soup, a big pot of rice and two sauces.', 'Une soupe, une grande casserole de riz et deux sauces.'),
    project_id: 'home', priority: P3, due: due(nextSunday(today), undefined, everySunday), duration: minutes(120),
  });
  addItem({
    content: L('Order coffee grains', 'Commander du café en grains'),
    project_id: 'home', labels: ['quick', 'errands', 'est-3'], due: due(today),
  });
  addItem({
    content: L('Wait for the landlord’s answer about the boiler', 'Attendre la réponse du propriétaire pour la chaudière'),
    project_id: 'home', labels: ['waiting'],
  });

  // ── Reading list ───────────────────────────────────────────────────────
  addItem({
    content: '[Systemist](https://www.todoist.com/fr/productivity-methods/systemist)',
    description: L('Todoist’s founder’s personal productivity system.', 'Le système de productivité personnel du fondateur de Todoist.'),
    project_id: 'reading', priority: P3,
  });
  addItem({
    content: L(
      '[The obsession with customer service at Captain Train](https://jonathanlefevre.com/articles/obsession-service-client-captain-train)',
      '[L’obsession du service client chez Captain Train](https://jonathanlefevre.com/articles/obsession-service-client-captain-train)',
    ),
    project_id: 'reading',
  });

  // ── London weekend ─────────────────────────────────────────────────────
  addItem({
    content: L('Book the flights', 'Réserver les vols'),
    project_id: 'london', section_id: 'l-before', priority: P2, due: due(day(2)),
  });
  addItem({
    content: L('Book the hotel for London', 'Réserver l’hôtel à Londres'),
    description: L(
      `Dates: ${tripDay(0)} to ${tripDay(2)}.\nFirst idea: [The Ritz London](https://www.theritzlondon.com/), if the price is reasonable.`,
      `Dates : du ${tripDay(0)} au ${tripDay(2)}.\nPremière idée : [The Ritz London](https://www.theritzlondon.com/), si le prix reste raisonnable.`,
    ),
    project_id: 'london', section_id: 'l-before', priority: P1, due: due(day(4)), deadline: deadline(day(14)),
  });
  addItem({
    content: L('Prepare my bag for London', 'Préparer mon sac pour Londres'),
    description: L(
      '- [ ] Flight tickets\n- [ ] Hotel reservation\n- [ ] Backpack\n- [ ] Underwear\n- [ ] Pants\n- [ ] Shoes\n- [ ] Phone charger\n- [ ] Shirt\n- [ ] Jacket\n- [ ] Sunglasses\n- [ ] Book\n- [ ] Pyjama\n- [ ] Toothbrush',
      '- [ ] Billets d’avion\n- [ ] Réservation de l’hôtel\n- [ ] Sac à dos\n- [ ] Sous-vêtements\n- [ ] Pantalons\n- [ ] Chaussures\n- [ ] Chargeur de téléphone\n- [ ] Chemise\n- [ ] Veste\n- [ ] Lunettes de soleil\n- [ ] Livre\n- [ ] Pyjama\n- [ ] Brosse à dents',
    ),
    project_id: 'london', section_id: 'l-before', labels: ['est-30'], due: due(addDays(trip, -1)),
  });
  const londonDay = (section: string, offset: number, content: string, time?: string, description = '') =>
    addItem({ content, description, project_id: 'london', section_id: section, due: due(addDays(trip, offset), time) });
  londonDay('l-d1', 0, L('Go to the airport', 'Aller à l’aéroport'), '07:00:00');
  londonDay('l-d1', 0, L('Check in at the hotel', 'S’enregistrer à l’hôtel'));
  londonDay('l-d1', 0, L('Walk along the South Bank', 'Se promener le long de la Tamise'), undefined, L('Tate Modern, then the Globe.', 'Tate Modern, puis le Globe.'));
  londonDay('l-d1', 0, L('Dinner at Borough Market', 'Dîner à Borough Market'));
  londonDay('l-d2', 1, L('Visit the British Museum', 'Visiter le British Museum'), '10:00:00');
  londonDay('l-d2', 1, L('Afternoon in Notting Hill', 'Après-midi à Notting Hill'));
  londonDay('l-d2', 1, L('See a show in the West End', 'Voir un spectacle dans le West End'), '19:30:00');
  londonDay('l-d3', 2, L('Breakfast in Soho', 'Petit-déjeuner à Soho'));
  londonDay('l-d3', 2, L('Visit the Natural History Museum', 'Visiter le Muséum d’histoire naturelle'));
  londonDay('l-d3', 2, L('Go back to the airport', 'Retourner à l’aéroport'), '18:00:00');

  // ── New York Marathon, Book club ───────────────────────────────────────
  addItem({
    content: L('Long run, 12 km', 'Sortie longue de 12 km'),
    project_id: 'marathon', section_id: 'm-train', priority: P2, labels: ['est-75'], due: due(day(3), '08:00:00'),
  });
  addItem({
    content: L('Buy new running shoes', 'Acheter de nouvelles chaussures de course'),
    project_id: 'marathon', section_id: 'm-train', labels: ['errands', 'est-60'],
  });
  addItem({
    content: L('Book the flights to New York', 'Réserver les vols pour New York'),
    project_id: 'marathon', section_id: 'm-log', priority: P2, deadline: deadline(day(60)),
  });
  addItem({
    content: L('Finish this month’s book', 'Finir le livre du mois'),
    project_id: 'bookclub', section_id: 'b-read', labels: ['est-120'], due: due(day(9)),
  });
  addItem({
    content: L('Choose next month’s book', 'Choisir le livre du mois prochain'),
    project_id: 'bookclub', section_id: 'b-meet',
  });

  // ── Robin Studio ───────────────────────────────────────────────────────
  addItem({
    content: L('File the quarterly VAT return', 'Déposer la déclaration de TVA du trimestre'),
    project_id: 'studio', section_id: 's-admin', priority: P2, labels: ['est-60'],
    due: due(day(12)), deadline: deadline(day(16)),
  });
  addItem({
    content: L('IG - Recap of the month', 'IG - Récap du mois'),
    description: L('Four slides: the numbers, the best project, one lesson, one teaser.', 'Quatre slides : les chiffres, le meilleur projet, une leçon, un teaser.'),
    project_id: 'studio', section_id: 's-mkt', priority: P3, labels: ['est-45'], due: due(day(3)),
  });
  addItem({
    content: L('Update my LinkedIn’s profile picture', 'Mettre à jour ma photo de profil LinkedIn'),
    project_id: 'studio', section_id: 's-mkt', labels: ['quick', 'thismonth', 'est-3'],
  });
  addItem({
    content: L('Fix the contact form on mobile', 'Corriger le formulaire de contact sur mobile'),
    description: L('The phone field still accepts letters.', 'Le champ téléphone accepte encore des lettres.'),
    project_id: 'studio', section_id: 's-mkt', priority: P2, labels: ['est-60'], due: due(day(-1)),
  });

  // ── Team ───────────────────────────────────────────────────────────────
  addItem({
    content: L('Review the website estimates', 'Revoir les estimations des sites'),
    project_id: 'team', section_id: 't-robin', labels: ['est-45'], due: due(day(2)),
  });
  addItem({
    content: L('Prepare the Domaine Aurel mockups', 'Préparer les maquettes de Domaine Aurel'),
    project_id: 'team', section_id: 't-jules', priority: P2, labels: ['est-120'], due: due(day(5)),
    responsible_uid: DEMO_TEAMMATE_ID,
  });
  addItem({
    content: L('Write the Bloom & Co case study', 'Écrire l’étude de cas de Bloom & Co'),
    description: L('Context, what we did, the result in one number.', 'Le contexte, ce que nous avons fait, le résultat en un chiffre.'),
    project_id: 'team', section_id: 't-maya', labels: ['est-90'], due: due(day(7)), responsible_uid: 'demo-maya',
  });

  // ── Domaine Aurel, Bloom & Co ──────────────────────────────────────────
  addItem({
    content: L('Send a proposal to Domaine Aurel', 'Envoyer une proposition à Domaine Aurel'),
    description: L('Two options, a clear price for each, valid for 30 days.', 'Deux options, un prix clair pour chacune, valable 30 jours.'),
    project_id: 'aurel', priority: P2, labels: ['est-60'], due: due(day(-2)),
  });
  addItem({
    content: L('Prepare the discovery call with Domaine Aurel', 'Préparer l’appel de découverte avec Domaine Aurel'),
    description: L('Before the call:\n- [x] Read their current site\n- [ ] List the questions to ask\n- [ ] Decide what to say about price', 'Avant l’appel :\n- [x] Lire leur site actuel\n- [ ] Lister les questions à poser\n- [ ] Décider quoi dire sur le prix'),
    project_id: 'aurel', priority: P1, due: due(day(1), '10:00:00'), duration: minutes(45),
  });
  addItem({
    content: L('Waiting for Domaine Aurel’s brief', 'Attendre le brief de Domaine Aurel'),
    project_id: 'aurel', labels: ['waiting'],
  });
  addItem({
    content: L('Send the invoice of the project', 'Envoyer la facture du projet'),
    description: L('The site is live and signed off: invoice the balance.', 'Le site est en ligne et validé : facturer le solde.'),
    project_id: 'bloom', priority: P1, labels: ['est-10'], due: due(today),
  });
  addItem({
    content: L('Waiting for Bloom & Co’s payment', 'Attendre le paiement de Bloom & Co'),
    project_id: 'bloom', labels: ['waiting'], due: due(day(14)),
  });

  // ── Atelier Lumen website ──────────────────────────────────────────────
  addItem({
    content: L('Define the brand identity of Atelier Lumen', 'Définir l’identité de marque d’Atelier Lumen'),
    description: L('- [ ] Colours\n- [ ] Typographies\n- [ ] Tone of voice', '- [ ] Couleurs\n- [ ] Typographies\n- [ ] Ton'),
    project_id: 'atelier', section_id: 'a-brand', priority: P1, labels: ['est-120'], due: due(day(1)),
  });
  addItem({
    content: L('Write functional specifications', 'Rédiger les spécifications fonctionnelles'),
    description: L('Context, pages, features, what is out of scope.', 'Contexte, pages, fonctionnalités, ce qui est hors périmètre.'),
    project_id: 'atelier', section_id: 'a-brand', priority: P2, labels: ['week', 'est-90'], due: due(day(3)),
  });

  const home = addItem({
    content: L('Design the homepage', 'Concevoir la page d’accueil'),
    description: L('Three blocks, one idea each.', 'Trois blocs, une seule idée par bloc.'),
    project_id: 'atelier', section_id: 'a-design', priority: P2, labels: ['week'], due: due(day(5)),
  });
  const homeChildren: Array<[string, string, string]> = [
    ['Write the copy', 'Rédiger les textes', 'est-45'],
    ['Choose the images', 'Choisir les images', 'est-30'],
    ['Build the layout', 'Composer la mise en page', 'est-120'],
  ];
  homeChildren.forEach(([en, french, est]) => addItem({
    content: L(en, french), parent_id: home.id, project_id: 'atelier', section_id: 'a-design', labels: [est],
  }));
  addItem({
    content: L('Develop the homepage', 'Développer la page d’accueil'),
    project_id: 'atelier', section_id: 'a-dev', priority: P2, labels: ['est-180'], due: due(day(12)),
  });

  const pages: Array<[string, string, number]> = [
    ['the contact page', 'la page contact', 7],
    ['the services page', 'la page services', 8],
    ['the about us page', 'la page à propos', 9],
    ['the links page', 'la page liens', 10],
    ['the blog page', 'la page blog', 12],
    ['the article detail page', 'la page détail d’article', 13],
  ];
  pages.forEach(([enThe, frThe, offset]) => {
    addItem({
      content: L(`Design ${enThe}`, `Concevoir ${frThe}`),
      project_id: 'atelier', section_id: 'a-design', labels: ['est-90'], due: due(day(offset)),
    });
    addItem({
      content: L(`Develop ${enThe}`, `Développer ${frThe}`),
      project_id: 'atelier', section_id: 'a-dev', labels: ['est-120'], due: due(day(offset + 10)),
    });
  });
  addItem({
    content: L('Connect to Google Search Console', 'Connecter Google Search Console'),
    project_id: 'atelier', section_id: 'a-launch', labels: ['est-15'], due: due(day(26)),
  });
  addItem({
    content: L('Push to prod', 'Mettre en production'),
    project_id: 'atelier', section_id: 'a-launch', priority: P1, due: due(day(28)), deadline: deadline(day(31)),
  });

  /* Months old, undated and not short: what the Gathering dust group names
     (#161). The last one is also quick, and goes to Quick rather than being
     listed twice. */
  const monthsAgo = (months: number, days = 0) =>
    subDays(addMonths(today, -months), days).toISOString();
  addItem({ content: L('Repaint the hallway', 'Repeindre le couloir'), project_id: 'home', labels: ['est-180'], added_at: monthsAgo(8, 12) });
  addItem({ content: L('Learn the basics of woodworking', 'Apprendre les bases de la menuiserie'), project_id: 'personal', added_at: monthsAgo(10, 3) });
  addItem({ content: L('Digitise the family albums', 'Numériser les albums de famille'), project_id: 'home', labels: ['est-120'], added_at: monthsAgo(6, 5) });
  addItem({ content: L('Write the book outline', 'Rédiger le plan du livre'), project_id: 'personal', labels: ['est-90'], added_at: monthsAgo(4, 9) });
  addItem({ content: L('Sell the old monitor', 'Vendre l’ancien écran'), project_id: 'home', labels: ['est-3'], added_at: monthsAgo(7) });

  const user: TodoistUser = {
    id: 'demo-user',
    email: 'robin@demo.test',
    full_name: 'Robin Hale',
    inbox_project_id: 'inbox',
    tz_info: { timezone: 'Europe/Paris', hours: 2, minutes: 0, is_dst: 1 },
    start_day: 1,
    is_premium: true,
    karma: 23480,
    image_id: null,
    avatar_big: PERSON_PICTURE,
  };

  return {
    ...emptySnapshot(),
    items,
    projects,
    sections,
    labels,
    filters: demoFilterRecords(locale),
    workspaces,
    collaborators: {
      [DEMO_TEAMMATE_ID]: { id: DEMO_TEAMMATE_ID, email: 'jules@demo.test', full_name: DEMO_TEAMMATE_NAME, image_id: null, avatar_big: TEAMMATE_PICTURE },
      'demo-maya': { id: 'demo-maya', email: 'maya@demo.test', full_name: 'Maya Chen', image_id: null },
    },
    collaboratorStates: [
      ...['atelier', 'aurel', 'bloom', 'team', 'studio'].flatMap((project_id) => [
        { project_id, user_id: 'demo-user', state: 'active' },
        { project_id, user_id: DEMO_TEAMMATE_ID, state: 'active' },
        { project_id, user_id: 'demo-maya', state: 'active' },
      ]),
      /* Jules runs the book club and shares it: the one demo project that can be left (#35). */
      { project_id: 'bookclub', user_id: DEMO_TEAMMATE_ID, state: 'active', role: 'CREATOR' },
      { project_id: 'bookclub', user_id: 'demo-user', state: 'active', role: 'READ_WRITE' },
    ],
    notifications: {
      'demo-n1': {
        id: 'demo-n1', notification_type: 'item_assigned', from_uid: DEMO_TEAMMATE_ID, project_id: 'team',
        is_unread: true, created_at: new Date(Date.now() - 3_600_000).toISOString(),
      },
      'demo-n2': {
        id: 'demo-n2', notification_type: 'note_added', from_uid: DEMO_TEAMMATE_ID, project_id: 'atelier',
        is_unread: false, created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      },
    },
    user,
    syncToken: 'demo',
    syncedAt: Date.now(),
  };
}

/** A year of plausible history, so Insights and the Logbook have something to show. */
export function buildDemoCompleted(locale: Locale = 'en', seed = 20260914): CompletedItem[] {
  if (legacy()) return buildLegacyDemoCompleted(locale, seed);
  const fr = locale === 'fr';
  const L = (en: string, french: string) => (fr ? french : en);
  const random = makeRandom(seed + 7);
  const today = startOfDay(new Date());
  const projectIds = ['inbox', 'personal', 'health', 'home', 'reading', 'studio', 'team', 'atelier', 'aurel', 'bloom'];
  const titles: Array<[string, string]> = [
    ['Review the proposal', 'Relire la proposition'], ['Send the quote', 'Envoyer le devis'],
    ['Call the bank', 'Appeler la banque'], ['Sort the wardrobe', 'Ranger le dressing'],
    ['Update the CV', 'Mettre à jour le CV'], ['Publish the newsletter', 'Publier la lettre d’information'],
    ['Pay the subscription', 'Payer la cotisation'], ['Fix the bike', 'Réparer le vélo'],
    ['Sort the photos', 'Trier les photos'], ['Prepare the meeting', 'Préparer la réunion'],
    ['Do the shopping', 'Faire les courses'], ['Reply to applicants', 'Répondre aux candidatures'],
    ['Follow up with the client', 'Relancer le client'], ['Write the notes', 'Écrire le compte-rendu'],
    ['Book the restaurant', 'Réserver le restaurant'], ['Renew the domain', 'Renouveler le domaine'],
  ];
  const out: CompletedItem[] = [];
  let id = 0;

  for (let daysAgo = 0; daysAgo < 365; daysAgo += 1) {
    const date = subDays(today, daysAgo);
    const weekday = date.getDay();
    // Fewer completions at weekends, and a gentle decline further back.
    const base = weekday === 0 || weekday === 6 ? 1.5 : 5;
    const count = Math.max(0, Math.round(base * (0.5 + random()) * (daysAgo > 120 ? 0.6 : 1)));

    for (let i = 0; i < count; i += 1) {
      id += 1;
      const hour = 8 + Math.floor(random() * 11);
      const at = new Date(date);
      at.setHours(hour, Math.floor(random() * 60), 0, 0);
      const estimate = [5, 10, 15, 25, 30, 45, 60, 90][Math.floor(random() * 8)];
      const [en, french] = titles[Math.floor(random() * titles.length)];
      out.push({
        id: `done-${id}`,
        user_id: 'demo-user',
        project_id: projectIds[Math.floor(random() * projectIds.length)],
        section_id: null,
        content: L(en, french),
        completed_at: at.toISOString(),
        priority: (1 + Math.floor(random() * 4)) as 1 | 2 | 3 | 4,
        labels: [
          ...(random() > 0.35 ? [`est-${estimate}`] : []),
          ...(id % 3 === 0 ? ['quick'] : []),
          ...(id % 7 === 0 ? ['errands'] : []),
          ...(id % 11 === 0 ? ['waiting'] : []),
        ],
      });
    }
  }

  /* Bloom & Co is a finished project: its work is done, and only the invoice is left. */
  const bloom: Array<[string, string, number]> = [
    ['Define the brand identity of Bloom & Co', 'Définir l’identité de marque de Bloom & Co', 41],
    ['Write functional specifications', 'Rédiger les spécifications fonctionnelles', 38],
    ['Design the homepage', 'Concevoir la page d’accueil', 31],
    ['Design the shop page', 'Concevoir la page boutique', 28],
    ['Develop the homepage', 'Développer la page d’accueil', 19],
    ['Develop the shop page', 'Développer la page boutique', 14],
    ['Connect to Google Search Console', 'Connecter Google Search Console', 6],
    ['Push to prod', 'Mettre en production', 4],
  ];
  bloom.forEach(([en, french, daysAgo], index) => {
    const at = new Date(subDays(today, daysAgo));
    at.setHours(11 + (index % 5), 15, 0, 0);
    out.push({
      id: `done-bloom-${index}`,
      user_id: 'demo-user',
      project_id: 'bloom',
      section_id: null,
      content: L(en, french),
      completed_at: at.toISOString(),
      priority: 2,
      labels: ['est-90'],
    });
  });

  return out;
}
