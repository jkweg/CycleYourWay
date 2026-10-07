#!/usr/bin/env node
// Staging smoke test for RLS / RPC / idempotency / export pagination.
//
// Talks to a SEPARATE Supabase staging project through the public API exactly
// like the app does (supabase-js -> PostgREST). It creates two throwaway users
// (A, B) with the service-role key, runs the scenarios and deletes the users in
// a finally block. It never touches production: it refuses to run when the
// staging URL equals any VITE_SUPABASE_URL found in frontend/.env* files.
//
// Setup (cycle-route-mvp/.env.staging.local, git-ignored via .env.*.local):
//   STAGING_SUPABASE_URL=https://<staging-ref>.supabase.co
//   STAGING_SUPABASE_ANON_KEY=...
//   STAGING_SUPABASE_SERVICE_ROLE_KEY=...
//
// Run (PowerShell, from cycle-route-mvp/frontend):
//   node scripts/staging-rls-smoke.mjs --confirm-staging
//
// Exit code 0 = no FAIL. GAP lines are known, documented weaknesses.

import { readFileSync, existsSync } from 'node:fs'
import { randomUUID, randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from '../src/lib/paginatedExport.js'

const here = dirname(fileURLToPath(import.meta.url))
const frontendDir = join(here, '..')
const appDir = join(frontendDir, '..')

function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    out[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .replace(/\s+#.*$/, '')
      .trim()
      .replace(/^['"]|['"]$/g, '')
  }
  return out
}

const env = { ...parseEnvFile(join(appDir, '.env.staging.local')), ...process.env }
const URL_ = env.STAGING_SUPABASE_URL
const ANON = env.STAGING_SUPABASE_ANON_KEY
const SERVICE = env.STAGING_SUPABASE_SERVICE_ROLE_KEY

if (!process.argv.includes('--confirm-staging')) {
  console.error('Refusing to run without --confirm-staging (this creates and deletes users).')
  process.exit(2)
}
if (!URL_ || !ANON || !SERVICE) {
  console.error('Missing STAGING_SUPABASE_URL / _ANON_KEY / _SERVICE_ROLE_KEY in .env.staging.local')
  process.exit(2)
}
const normalise = (u) => String(u || '').trim().replace(/\/+$/, '').toLowerCase()
for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  const appUrl = parseEnvFile(join(frontendDir, name)).VITE_SUPABASE_URL
  if (appUrl && normalise(appUrl) === normalise(URL_)) {
    console.error(`Refusing: staging URL equals VITE_SUPABASE_URL from frontend/${name}.`)
    console.error('Use a separate Supabase project for staging.')
    process.exit(2)
  }
}

const results = []
const record = (status, message, detail = '') => {
  results.push({ status, message, detail })
  const tail = detail && status !== 'PASS' ? `  [${detail}]` : ''
  console.log(`   ${status.padEnd(4)} ${message}${tail}`)
}
const ok = (cond, message, detail) => record(cond ? 'PASS' : 'FAIL', message, cond ? '' : detail)

const clientOpts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(URL_, SERVICE, clientOpts)
const anon = createClient(URL_, ANON, clientOpts)

const runId = randomBytes(4).toString('hex')
const users = []

async function makeUser(label) {
  const email = `cyw-rls-${label}-${runId}@example.test`
  const password = randomBytes(18).toString('base64url')
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser ${label}: ${error.message}`)
  users.push(data.user.id)
  const client = createClient(URL_, ANON, clientOpts)
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`signIn ${label}: ${signInError.message}`)
  return { id: data.user.id, client }
}

const geo = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[19.94, 50.06], [19.95, 50.07]] },
    },
  ],
}

async function insertRoute(user, name) {
  const { data, error } = await user.client
    .from('saved_routes')
    .insert({ user_id: user.id, name, mode: 'AtoB', geojson: geo, distance_km: 1.5, duration_seconds: 300 })
    .select('id')
    .single()
  if (error) throw new Error(`insert route: ${error.message}`)
  return data.id
}

async function main() {
  console.log(`== staging smoke run ${runId} against ${new URL(URL_).host}`)
  const A = await makeUser('a')
  const B = await makeUser('b')

  const a1 = await insertRoute(A, 'A one')
  await insertRoute(A, 'A two')
  const b1 = await insertRoute(B, 'B one')

  console.log('== anon')
  for (const table of ['saved_routes', 'rides', 'profiles']) {
    const { data, error } = await anon.from(table).select('*').limit(5)
    ok(!error ? data.length === 0 : true, `anon: cannot list ${table}`, error?.message || `${data?.length} rows`)
  }
  {
    const { error } = await anon
      .from('saved_routes')
      .insert({ user_id: A.id, name: 'x', mode: 'AtoB', geojson: geo })
    ok(Boolean(error), 'anon: cannot insert route impersonating A')
  }
  for (const [fn, args] of [
    ['set_route_sharing', { p_route_id: a1, p_enabled: true }],
    ['get_own_account_stats', {}],
    ['delete_own_account', {}],
  ]) {
    const { error } = await anon.rpc(fn, args)
    ok(Boolean(error), `anon: ${fn} rejected`, 'call succeeded')
  }

  console.log('== cross-account (A vs B)')
  {
    const { data } = await A.client.from('saved_routes').select('id')
    ok(data?.length === 2, 'A: sees exactly own 2 routes', `${data?.length}`)
    const { data: peek } = await A.client.from('saved_routes').select('id').eq('id', b1).maybeSingle()
    ok(peek === null, 'A: cannot read B route by UUID')
    const { data: upd } = await A.client.from('saved_routes').update({ name: 'pwned' }).eq('id', b1).select('id')
    ok(Array.isArray(upd) && upd.length === 0, 'A: UPDATE of B route affects no rows')
    const { data: del } = await A.client.from('saved_routes').delete().eq('id', b1).select('id')
    ok(Array.isArray(del) && del.length === 0, 'A: DELETE of B route affects no rows')
    const { error: spoof } = await A.client
      .from('saved_routes')
      .insert({ user_id: B.id, name: 'spoof', mode: 'AtoB', geojson: geo })
    ok(Boolean(spoof), 'A: cannot insert route owned by B')
    const { error: move } = await A.client.from('saved_routes').update({ user_id: B.id }).eq('id', a1)
    ok(Boolean(move), 'A: cannot move own route to B')
    const { data: profiles } = await A.client.from('profiles').select('id')
    ok(profiles?.length === 1 && profiles[0].id === A.id, 'A: sees only own profile')
    const { data: bCheck } = await admin.from('saved_routes').select('name').eq('id', b1).single()
    ok(bCheck?.name === 'B one', 'B route unchanged after A attempts')
  }

  console.log('== share tokens')
  {
    const { error: foreign } = await B.client.rpc('set_route_sharing', { p_route_id: a1, p_enabled: true })
    ok(Boolean(foreign), 'B: cannot enable sharing on A route')
    const { data: t1, error: e1 } = await A.client.rpc('set_route_sharing', { p_route_id: a1, p_enabled: true })
    ok(!e1 && typeof t1 === 'string', 'A: enable sharing returns token', e1?.message)
    const { data: shared } = await anon.rpc('get_shared_route', { p_share_token: t1 })
    ok(shared?.length === 1, 'anon: token resolves route')
    ok(
      shared?.length === 1 &&
        Object.keys(shared[0]).sort().join(',') === 'distance_km,duration_seconds,geojson,mode,name',
      'anon: RPC returns only name/mode/geojson/distance/duration',
      shared?.[0] ? Object.keys(shared[0]).join(',') : 'no row',
    )
    const { data: t2 } = await A.client.rpc('set_route_sharing', { p_route_id: a1, p_enabled: true })
    ok(t2 && t2 !== t1, 'A: re-enable rotates token')
    const { data: old } = await anon.rpc('get_shared_route', { p_share_token: t1 })
    ok(old?.length === 0, 'anon: old token dead after rotation')
    const { data: off } = await A.client.rpc('set_route_sharing', { p_route_id: a1, p_enabled: false })
    ok(off === null, 'A: disable returns null')
    const { data: dead } = await anon.rpc('get_shared_route', { p_share_token: t2 })
    ok(dead?.length === 0, 'anon: token dead after disable')
    const { data: rnd } = await anon.rpc('get_shared_route', { p_share_token: randomUUID() })
    ok(rnd?.length === 0, 'anon: random token resolves nothing')

    // Legacy link as produced by the migration: share_token = route id.
    await admin.from('saved_routes').update({ share_enabled: true, share_token: a1 }).eq('id', a1)
    const { data: legacy } = await anon.rpc('get_shared_route', { p_share_token: a1 })
    ok(legacy?.length === 1, 'anon: migrated legacy link (?share=<route id>) resolves')
    await A.client.rpc('set_route_sharing', { p_route_id: a1, p_enabled: true })
    const { data: legacyDead } = await anon.rpc('get_shared_route', { p_share_token: a1 })
    ok(legacyDead?.length === 0, 'anon: legacy link dead after owner rotates')
    await A.client.rpc('set_route_sharing', { p_route_id: a1, p_enabled: false })

    const { error: direct } = await A.client
      .from('saved_routes')
      .update({ share_enabled: true, share_token: randomUUID() })
      .eq('id', a1)
    ok(Boolean(direct), 'A: cannot set own share_token directly (RPC-only guard)')
    const { error: preShared } = await A.client
      .from('saved_routes')
      .insert({ user_id: A.id, name: 'pre-shared', mode: 'AtoB', geojson: geo, share_enabled: true })
    ok(Boolean(preShared), 'A: cannot insert an already-shared route')
    const { data: renamed, error: renameError } = await A.client
      .from('saved_routes')
      .update({ name: 'A one renamed', is_favorite: true })
      .eq('id', a1)
      .select('id')
    ok(!renameError && renamed?.length === 1, 'A: ordinary UPDATE still works with the guard', renameError?.message)
    await A.client.rpc('set_route_sharing', { p_route_id: a1, p_enabled: false })
  }

  console.log('== ride idempotency')
  {
    const clientRequestId = randomUUID()
    const payload = {
      user_id: A.id,
      client_request_id: clientRequestId,
      route_id: a1,
      route_name: 'A one',
      mode: 'AtoB',
      status: 'completed',
      distance_meters: 1500,
      duration_seconds: 300,
      completed_at: new Date().toISOString(),
    }
    for (let i = 0; i < 3; i += 1) {
      const { error } = await A.client.from('rides').upsert(payload, { onConflict: 'user_id,client_request_id' })
      ok(!error, `A: upsert retry #${i + 1} accepted`, error?.message)
    }
    const { count } = await A.client
      .from('rides')
      .select('id', { count: 'exact', head: true })
      .eq('client_request_id', clientRequestId)
    ok(count === 1, 'A: three retries -> exactly one ride', `${count}`)
    const { error: bReuse } = await B.client
      .from('rides')
      .upsert({ ...payload, user_id: B.id, route_id: null }, { onConflict: 'user_id,client_request_id' })
    ok(!bReuse, 'B: may reuse the same client_request_id', bReuse?.message)
    const { error: spoof } = await A.client.from('rides').insert({ ...payload, user_id: B.id, client_request_id: randomUUID() })
    ok(Boolean(spoof), 'A: cannot insert ride owned by B')
    const { data: cross, error: crossError } = await A.client
      .from('rides')
      .insert({ user_id: A.id, route_id: b1, distance_meters: 1, duration_seconds: 1 })
      .select('id, route_id')
    ok(!crossError && cross?.length === 1 && cross[0].route_id === null,
      'A: R07 ride.route_id pointing to B route is stored unlinked', crossError?.message || JSON.stringify(cross))
    if (cross?.[0]?.id) await A.client.from('rides').delete().eq('id', cross[0].id)
  }

  console.log('== R07 data constraints')
  {
    const rejected = async (query, message) => {
      const { error } = await query
      ok(error?.code === '23514', message, error ? `${error.code}: ${error.message}` : 'accepted')
    }
    const route = (extra) => A.client.from('saved_routes').insert({ user_id: A.id, name: 'r07', mode: 'AtoB', geojson: geo, ...extra })
    await rejected(
      A.client.from('rides').insert({ user_id: A.id, distance_meters: -5, duration_seconds: -10 }),
      'A: R07 negative ride metrics rejected')
    await rejected(
      A.client.from('rides').insert({ user_id: A.id, distance_meters: 1, duration_seconds: 1, track_geojson: 'x' }),
      'A: R07 non-object track_geojson rejected')
    await rejected(route({ name: 'x'.repeat(201) }), 'A: R07 201-char route name rejected')
    await rejected(route({ geojson: 'not geojson' }), 'A: R07 non-object geojson rejected')
    await rejected(route({ geojson: { features: [] } }), 'A: R07 geojson without type rejected')
    await rejected(route({ tags: 'abcdefghi'.split('') }), 'A: R07 nine tags rejected')
    await rejected(route({ tags: ['x'.repeat(41)] }), 'A: R07 41-char tag rejected')
    await rejected(
      A.client.from('profiles').update({ display_name: 'x'.repeat(101) }).eq('id', A.id),
      'A: R07 101-char display_name rejected')
    const { data: edge, error: edgeError } = await route({ name: 'ą'.repeat(200), tags: ['Żółć', 't'.repeat(40)] }).select('id')
    ok(!edgeError && edge?.length === 1, 'A: R07 app-shaped route at the limits accepted', edgeError?.message)
    if (edge?.[0]?.id) await A.client.from('saved_routes').delete().eq('id', edge[0].id)
  }

  console.log('== export pagination (> 500 rides, > 8 routes)')
  {
    // One bulk insert -> identical created_at for all rows: worst case for range pagination.
    const bulk = Array.from({ length: 520 }, (_, i) => ({
      user_id: A.id,
      client_request_id: randomUUID(),
      route_name: `bulk ${i}`,
      distance_meters: 10,
      duration_seconds: 1,
    }))
    const { error: bulkError } = await A.client.from('rides').insert(bulk)
    ok(!bulkError, 'A: bulk insert of 520 rides', bulkError?.message)
    const routes = Array.from({ length: 9 }, (_, i) => ({
      user_id: A.id, name: `extra ${i}`, mode: 'Loop', geojson: geo,
    }))
    await A.client.from('saved_routes').insert(routes)

    const fetchResource = (table) =>
      fetchAllPages(async (from, to) => {
        const { data, error } = await A.client
          .from(table)
          .select('id')
          .eq('user_id', A.id)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
        if (error) throw new Error(error.message)
        return data || []
      })
    const rides = await fetchResource('rides')
    const routesAll = await fetchResource('saved_routes')
    ok(rides.length === 521 && new Set(rides.map((r) => r.id)).size === 521,
      'export: 521 rides across pages, no duplicates', `${rides.length}`)
    ok(routesAll.length === 11, 'export: 11 routes (> 8 preview)', `${routesAll.length}`)
    const { data: stats, error: statsError } = await A.client.rpc('get_own_account_stats')
    ok(!statsError && stats?.rides === 521 && stats?.routes === 11,
      'stats: exact totals in DB', statsError?.message || JSON.stringify(stats))
  }

  console.log('== delete account cascade')
  {
    const { error } = await A.client.rpc('delete_own_account')
    ok(!error, 'A: delete_own_account succeeds', error?.message)
    if (!error) users.splice(users.indexOf(A.id), 1)
    for (const [table, col] of [['saved_routes', 'user_id'], ['rides', 'user_id'], ['profiles', 'id']]) {
      const { count } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(col, A.id)
      ok(count === 0, `delete: A ${table} removed`, `${count}`)
    }
    const { count: bRoutes } = await admin.from('saved_routes').select('*', { count: 'exact', head: true }).eq('user_id', B.id)
    ok(bRoutes === 1, 'delete: B routes intact', `${bRoutes}`)
  }
}

let crashed = null
try {
  await main()
} catch (error) {
  crashed = error
  record('FAIL', 'run aborted', error.message)
} finally {
  for (const id of users) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) console.error(`cleanup: could not delete test user ${id}: ${error.message}`)
  }
}

const count = (s) => results.filter((r) => r.status === s).length
console.log(`== result: PASS=${count('PASS')} FAIL=${count('FAIL')} GAP(known)=${count('GAP')}`)
process.exit(count('FAIL') === 0 && !crashed ? 0 : 1)
