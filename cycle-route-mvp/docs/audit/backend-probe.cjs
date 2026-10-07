// Local regression smoke after the audit fixes: no database or provider requests.
// Run from the repository: node docs/audit/backend-probe.cjs
const assert = require('node:assert/strict');
const axios = require('../../backend/node_modules/axios');
const express = require('../../backend/node_modules/express');
const dotenv = require('../../backend/node_modules/dotenv');
dotenv.config = () => ({});
process.env.ORS_API_KEY = 'audit-placeholder';
process.env.NODE_ENV = 'production';
delete process.env.ALLOWED_ORIGINS;
let upstream = [];
const feature = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[21,52],[21.01,52.01]] }, properties: { summary: { distance: 2000, duration: 600 } } };
axios.post = async (url, payload) => {
  upstream.push({ method: 'POST', url, points: payload.coordinates.length });
  if (payload.coordinates[0][0] === 22) throw Object.assign(new Error('mock forbidden'), { response: { status: 403, data: {} } });
  return { data: { type: 'FeatureCollection', features: [structuredClone(feature)] } };
};
axios.get = async (url) => {
  upstream.push({ method: 'GET', url });
  if (url.includes('project-osrm')) return { data: { routes: [{ geometry: feature.geometry, distance: 2000, duration: 600, legs: [] }] } };
  return { data: [] };
};
let server;
express.application.listen = function () { server = require('node:http').createServer(this); return server.listen(0, '127.0.0.1'); };
require('../../backend/server').listen();
(async () => {
  if (!server.listening) await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  async function check(name, path, options, status) {
    const response = await fetch(base + path, options);
    const body = await response.text();
    assert.equal(response.status, status, name);
    results.push({ name, status: response.status, contentType: response.headers.get('content-type'), cors: response.headers.get('access-control-allow-origin'), body: body.slice(0, 160) });
    return response;
  }
  const post = body => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  try {
    await check('health', '/api/health', {}, 200);
    const corsResponse = await check('foreign Vercel origin rejected', '/api/health', { headers: { Origin: 'https://unrelated-audit.vercel.app' } }, 403);
    assert.equal(corsResponse.headers.get('access-control-allow-origin'), null);
    await check('rejected CORS returns JSON 403', '/api/health', { headers: { Origin: 'https://unrelated.invalid' } }, 403);
    await check('invalid coordinates rejected', '/api/route', post({start:{lat:999,lng:21},end:{lat:52,lng:21}}), 400);
    assert.equal(upstream.length, 0, 'invalid input must not reach a provider');
    await check('malformed JSON returns JSON', '/api/route', {method:'POST',headers:{'content-type':'application/json'},body:'{'}, 400);
    await check('reverse outside range returns 400', '/api/reverse?lat=999&lng=21', {}, 400);
    await check('anonymous route succeeds', '/api/route', post({start:{lat:52,lng:21},end:{lat:52.01,lng:21.01}}), 200);
    await check('provider denial returns unavailable without OSRM', '/api/route', post({waypoints:[{lat:52,lng:22},{lat:52.5,lng:22.5},{lat:53,lng:23}]}), 503);
    const fallback = upstream.find(request => request.method === 'GET' && request.url.includes('project-osrm'));
    assert.equal(fallback, undefined, 'ORS denial must not silently use OSRM');
    await check('proxy request', '/api/route', { ...post({}), headers:{'content-type':'application/json','x-forwarded-for':'198.51.100.7'} }, 400);
    let limited = false;
    for (let i=0;i<65;i++) { const r = await fetch(base+'/api/not-found'); await r.text(); if(r.status===429) { limited=true; break; } }
    assert.ok(limited, 'rate limit reached');
    await check('health bypasses exhausted limiter', '/api/health', {}, 200);
    console.log(JSON.stringify({results,limited,upstream}, null, 2));
  } finally { server.close(); server.closeAllConnections(); }
})().catch(e => { console.error(e); process.exitCode=1; });
