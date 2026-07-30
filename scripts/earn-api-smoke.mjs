const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3000';

const checks = [
  { path: '/api/server-time', expected: [200] },
  { path: '/api/homepage/stats', expected: [200] },
  { path: '/api/homepage/sponsor-count', expected: [200] },
  { path: '/api/homepage/feed', expected: [200] },
  { path: '/api/homepage/recent-earners', expected: [200] },
  { path: '/api/listings/live-opportunities', expected: [200] },
  {
    path: '/api/listings/count?context=home&tab=all&status=open&region=&sponsor=',
    expected: [200],
  },
  {
    path: '/api/listings?context=home&tab=all&category=All&status=open&sortBy=Date&order=asc&region=&sponsor=',
    expected: [200],
  },
  {
    path: '/api/grants?context=home&category=All&region=&sponsor=',
    expected: [200],
  },
  { path: '/api/chapters', expected: [200] },
  { path: '/api/tokens', expected: [200] },
  { path: '/api/user/stats', expected: [401] },
];

let failures = 0;

function trimBody(body) {
  return body.replace(/\s+/g, ' ').trim().slice(0, 180);
}

console.log(`Smoke testing Earn API against ${baseUrl}`);

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    const body = await response.text();
    const ok = check.expected.includes(response.status);
    const marker = ok ? 'OK' : 'FAIL';

    console.log(
      `${marker} ${response.status} ${check.path} :: ${trimBody(body) || '<empty>'}`,
    );

    if (!ok) {
      failures += 1;
    }
  } catch (error) {
    failures += 1;
    console.log(`FAIL ERR ${check.path} :: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures > 0) {
  process.exitCode = 1;
}
