export const ALL_ENTITY_ORDER = [
  'layers',
  'systems',
  'components',
  'weaknesses',
  'fallbacks',
  'costs',
  'actors',
  'evidence',
  'principles',
  'metrics',
  'cases',
  'topics',
  'narratives',
  'captures',
  'reflexivity',
  'exitvoice',
  'unknownunknowns',
];

export function routeForType(type) {
  const specialRoutes = {
    cases: '/cases',
    topics: '/topics',
    gaps: '/gaps',
    matrix: '/matrix',
    principles: '/principles',
  };
  return specialRoutes[type] || `/${type}`;
}

export function hashHref(path) {
  return `#${path}`;
}

export function parseHash() {
  if (typeof window === 'undefined') return '/dashboard';
  const hash = window.location.hash.slice(1);
  return hash || '/dashboard';
}