/**
 * Minimal dependency-free mock of the reqres.in API used by the feature
 * suite. Lets the framework run fully self-contained (CI-friendly, no
 * shared-quota rate limits): `npm run test:local`.
 *
 * Mirrors the behaviour the scenarios rely on:
 *  - GET    /api/users/:id   200 (ids 1..12) / 404 for unknown ids
 *  - GET    /api/users?page=N 200, 6 items per page
 *  - POST   /api/users       201, echoes payload + id/createdAt
 *  - PUT    /api/users/:id   200, echoes payload + updatedAt
 *  - PATCH  /api/users/:id   200, echoes payload + updatedAt
 *  - DELETE /api/users/:id   204, empty body
 *  - POST   /api/login       200 {token} / 400 {error} when incomplete
 */
const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const TOTAL_USERS = 12;

const user = id => ({
  id,
  email: `user${id}@reqres.in`,
  first_name: `First${id}`,
  last_name: `Last${id}`,
  avatar: `https://reqres.in/img/faces/${id}-image.jpg`
});

const support = { url: 'https://reqres.in/go/mock', text: 'Local mock server' };

const json = (res, status, body) => {
  const payload = status === 204 ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
};

const readBody = req =>
  new Promise(resolve => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const match = url.pathname.match(/^\/api\/users\/(\d+)$/);
  const method = req.method.toUpperCase();

  if (url.pathname === '/api/users' && method === 'GET') {
    const page = Number(url.searchParams.get('page') || 1);
    const perPage = 6;
    const startId = (page - 1) * perPage + 1;
    const data = [];
    for (let i = 0; i < perPage && startId + i <= TOTAL_USERS; i++) data.push(user(startId + i));
    return json(res, 200, {
      page,
      per_page: perPage,
      total: TOTAL_USERS,
      total_pages: Math.ceil(TOTAL_USERS / perPage),
      data,
      support
    });
  }

  if (match) {
    const id = Number(match[1]);
    if (method === 'GET') {
      if (id < 1 || id > TOTAL_USERS) return json(res, 404, {});
      return json(res, 200, { data: user(id), support });
    }
    if (method === 'DELETE') return json(res, 204, {});
    if (method === 'PUT' || method === 'PATCH') {
      const payload = await readBody(req);
      return json(res, 200, { ...payload, updatedAt: new Date().toISOString() });
    }
  }

  if (url.pathname === '/api/users' && method === 'POST') {
    const payload = await readBody(req);
    return json(res, 201, { ...payload, id: TOTAL_USERS + 1, createdAt: new Date().toISOString() });
  }

  if (url.pathname === '/api/login' && method === 'POST') {
    const payload = await readBody(req);
    if (!payload.email || !payload.password) {
      return json(res, 400, { error: 'Missing email or password' });
    }
    return json(res, 200, { token: 'QpwL5tke4Pnpja7X4' });
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => console.log(`[mock] reqres mock listening on http://localhost:${PORT}`));
