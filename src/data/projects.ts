// `exploring` is a valid status for early/idea-stage projects (no card styling yet —
// add `.status-exploring` / `.fp-badge-exploring` in global.css if you use it).
export type ProjectStatus = 'active' | 'building' | 'parked' | 'exploring';

export interface Project {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: ProjectStatus;
  url?: string;
  emoji: string;
  highlights: string[];
}

// Real projects. For a custom accent color on the homepage featured card, add a
// `.fp-<slug>` rule in src/styles/global.css (see "Per-project accent colors").
// Without one, the card uses the default blue accent (`.fp-card-accent` base).
export const projects: Project[] = [
  {
    slug: 'perfeat',
    name: 'Perfeat',
    tagline: 'Personal food diary',
    description: 'A private food diary where every meal gets a rating from 1 to 7 and its own page: the dish, the place, who you were with, the price, and a photo. Your eating history becomes a searchable taste library.',
    status: 'active',
    emoji: '🍜',
    highlights: [
      'Rate meals 1–7 and log dish, place, price, photo',
      'Top-moments montage: your best meals as shareable cards',
      'TestFlight v1.0, in App Store review',
    ],
  },
  {
    slug: 'paddock',
    name: 'Paddock',
    tagline: 'F1 widget app',
    description: 'A glanceable Formula 1 companion — live timing, race calendar, and standings as native iOS/macOS widgets. Built for fans who want the session on their home screen, not buried in an app.',
    status: 'building',
    emoji: '🏎️',
    highlights: [
      'Native WidgetKit (iOS + macOS), real-time race data',
      'Self-refreshing Supabase backend, live web showcase',
      'Free tier + cheap Pro — built solo, idea→shipped in a session',
    ],
  },
];

