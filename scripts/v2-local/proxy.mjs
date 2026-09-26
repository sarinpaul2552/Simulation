// Minimal Supabase-shaped gateway for local tests: /rest/v1/* → PostgREST, CORS, apikey → Authorization.
import http from 'node:http';
const [port, upstream] = process.argv.slice(2).map(Number);
http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (!req.url.startsWith('/rest/v1')) { res.writeHead(404, cors); return res.end(); }
  const headers = { ...req.headers, host: `localhost:${upstream}` };
  if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
  const up = http.request({ host: 'localhost', port: upstream, path: req.url.slice('/rest/v1'.length) || '/', method: req.method, headers }, r => {
    res.writeHead(r.statusCode, { ...r.headers, ...cors }); r.pipe(res);
  });
  up.on('error', e => { res.writeHead(502, cors); res.end(String(e)); });
  req.pipe(up);
}).listen(port);
