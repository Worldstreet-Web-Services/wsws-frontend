const EARN_BACKEND_PROXY_PREFIX = '/earn-api';
const DEFAULT_EARN_BACKEND_URL = 'http://localhost:8083';

export const EARN_API_EXACT_ROUTE_MAP = new Map<string, string>([
  ['/api/hello', '/hello'],
  ['/api/location', '/location'],
  ['/api/pro/perks', '/pro/perks'],
  ['/api/report-listing', '/report-listing'],
  ['/api/server-time', '/server-time'],
  ['/api/spam-dispute', '/spam-dispute'],
  ['/api/sponsor/verification', '/sponsor/verification'],
  ['/api/token-icon', '/token-icon'],
  ['/api/twitter/tweet-stats', '/twitter/tweet-stats'],
  ['/api/user-sponsors', '/user-sponsors'],
]);

export const EARN_API_PREFIX_ROUTE_MAP: Array<{
  backend: string;
  frontend: string;
}> = [
  { frontend: '/api/agents', backend: '/agents' },
  { frontend: '/api/chapters', backend: '/chapters' },
  { frontend: '/api/comment', backend: '/comment' },
  { frontend: '/api/dynamic-og', backend: '/dynamic-og' },
  { frontend: '/api/email', backend: '/email' },
  { frontend: '/api/feed', backend: '/feed' },
  { frontend: '/api/grant-application', backend: '/grant-application' },
  { frontend: '/api/grants', backend: '/grants' },
  { frontend: '/api/hackathon', backend: '/hackathon' },
  { frontend: '/api/homepage', backend: '/homepage' },
  { frontend: '/api/image', backend: '/image' },
  { frontend: '/api/listings', backend: '/listings' },
  { frontend: '/api/member-invites', backend: '/member-invites' },
  { frontend: '/api/og', backend: '/og' },
  { frontend: '/api/pow', backend: '/pow' },
  { frontend: '/api/search', backend: '/search' },
  { frontend: '/api/sponsor-dashboard', backend: '/sponsor-dashboard' },
  { frontend: '/api/sponsors', backend: '/sponsors' },
  { frontend: '/api/submission', backend: '/submission' },
  { frontend: '/api/sumsub', backend: '/sumsub' },
  { frontend: '/api/tokens', backend: '/tokens' },
  { frontend: '/api/user', backend: '/user' },
  { frontend: '/api/wallet', backend: '/wallet' },
];

type ParsedUrl = {
  hash: string;
  origin: string | null;
  pathname: string;
  search: string;
};

type BackendEnvelope<T> = {
  data: T;
  success: true;
};

function parseUrl(input: string): ParsedUrl {
  if (/^https?:\/\//i.test(input)) {
    const url = new URL(input);
    return {
      origin: url.origin,
      pathname: normalizePathname(url.pathname),
      search: url.search,
      hash: url.hash,
    };
  }

  const relative = input.startsWith('/') ? input : `/${input}`;
  const url = new URL(relative, 'http://localhost');
  return {
    origin: null,
    pathname: normalizePathname(url.pathname),
    search: url.search,
    hash: url.hash,
  };
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function matchPrefixRule(pathname: string): string | null {
  for (const { frontend, backend } of EARN_API_PREFIX_ROUTE_MAP) {
    if (pathname === frontend || pathname.startsWith(`${frontend}/`)) {
      return `${backend}${pathname.slice(frontend.length)}`;
    }
  }

  return null;
}

export function mapEarnApiPathToBackendPath(pathname: string): string | null {
  const normalized = normalizePathname(pathname);

  if (EARN_API_EXACT_ROUTE_MAP.has(normalized)) {
    return EARN_API_EXACT_ROUTE_MAP.get(normalized) ?? null;
  }

  return matchPrefixRule(normalized);
}

export function mapEarnApiUrlToProxy(url: string): string {
  const parsed = parseUrl(url);
  const backendPath = mapEarnApiPathToBackendPath(parsed.pathname);

  if (!backendPath) {
    return url;
  }

  const rewrittenPath = `${EARN_BACKEND_PROXY_PREFIX}${backendPath}${parsed.search}${parsed.hash}`;
  return parsed.origin ? `${parsed.origin}${rewrittenPath}` : rewrittenPath;
}

export function buildEarnBackendUrl(path: string): string {
  const parsed = parseUrl(path);
  const backendPath = mapEarnApiPathToBackendPath(parsed.pathname);

  if (!backendPath) {
    throw new Error(`No earn-backend mapping exists for "${path}"`);
  }

  const baseUrl =
    process.env.EARN_BACKEND_URL ||
    process.env.NEXT_PUBLIC_EARN_BACKEND_URL ||
    DEFAULT_EARN_BACKEND_URL;

  return `${baseUrl}${backendPath}${parsed.search}${parsed.hash}`;
}

export function unwrapEarnBackendResponse<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    (payload as { success?: unknown }).success === true &&
    'data' in payload
  ) {
    return (payload as BackendEnvelope<T>).data;
  }

  return payload as T;
}
