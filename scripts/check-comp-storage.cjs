const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const Module = require('node:module');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const records = new Map();
const collections = new Map();
let imports = 0;
const db = { collection(name) {
  if (!collections.has(name)) collections.set(name, {
    async findOne(query) { return records.get(name + query._id) || null; },
    async bulkWrite(ops) { imports++; for (const { updateOne: op } of ops) await this.updateOne(op.filter, op.update); },
    async updateOne(query, update) {
      const id = name + query._id;
      const old = records.get(id);
      records.set(id, { _id: query._id, ...(old || update.$setOnInsert), ...update.$set });
    },
    find(query, options) {
      let rows = [...records.entries()].filter(([key]) => key.startsWith(name)).map(([, value]) => value).filter(row => Object.entries(query).every(([key, value]) => row[key] === value));
      if (options?.projection?._id === 0) rows = rows.map(({ _id, ...rest }) => rest);
      return { sort() { return this; }, async toArray() { return rows; } };
    },
  });
  return collections.get(name);
} };
const original = Module._load;
Module._load = function(id, parent, main) {
  if (id === '@/lib/helpers/mongodb') return { getDb: async () => db };
  if (id === '@/lib/admin-auth') return { getAdminFromRequest: request => request.headers.get('authorization') === 'Bearer test' ? { id: 'owner' } : null };
  if (id.startsWith('@/')) id = path.join(__dirname, '..', id.slice(2));
  return original.call(this, id, parent, main);
};
const { validatePreference } = require('../lib/comp/types.ts');
const { companyCategoryKeys } = require('../lib/comp/categories.ts');
const store = require('../lib/comp/store.ts');
const api = require('../app/api/comp/route.ts');
const { NextRequest } = require('next/server');
function request(body, authenticated = true, origin = 'http://localhost') {
  return new NextRequest('http://localhost/api/comp', { method: 'PUT', headers: { 'content-type': 'application/json', origin, ...(authenticated ? { authorization: 'Bearer test' } : {}) }, body: JSON.stringify(body) });
}
(async () => {
  const companies = await store.getCompanies();
  assert.equal(companies.length, 1000);
  await store.getCompanies();
  assert.equal(imports, 2, 'Catalog import and category backfill should each run once');
  for (const company of companies) {
    assert.deepEqual(company.categories, companyCategoryKeys(company));
  }
  const key = companies[0].key;
  await store.savePreference('owner', key, { liked: true, careersUrl: 'https://example.com/jobs' });
  const preferenceId = 'comp_preferences' + JSON.stringify(['owner', key]);
  assert.deepEqual(records.get(preferenceId).categories, ['likes']);
  await store.savePreference('owner', key, { disliked: true });
  assert.deepEqual(records.get(preferenceId).categories, ['dislikes']);
  let saved = await store.getPreferences('owner');
  assert.equal(saved[key].liked, false);
  assert.equal(saved[key].disliked, true);
  assert.equal(saved[key].careersUrl, 'https://example.com/jobs');
  await store.savePreference('owner', key, { liked: true }, true);
  assert.equal((await store.getPreferences('owner'))[key].disliked, true, 'Import must not overwrite existing preferences');
  assert.deepEqual(await store.getPreferences('other-owner'), {}, 'Preferences must be isolated');
  for (const value of [{ liked: true, disliked: true }, { liked: 'yes' }, { careersUrl: 'javascript:alert(1)' }, { careersUrl: 'https://user:pass@example.com' }]) assert.throws(() => validatePreference(value));
  assert.equal((await api.PUT(request({ preferences: { [key]: { liked: true } } }, false))).status, 401);
  assert.equal((await api.PUT(request({ preferences: { [key]: { liked: true } } }, true, 'https://other.example'))).status, 403);
  assert.equal((await api.PUT(request({ preferences: { unknown: { liked: true } } }))).status, 400);
  assert.equal((await api.PUT(request({ preferences: { [key]: { liked: true } } }))).status, 200);
  saved = await store.getPreferences('owner');
  assert.equal(saved[key].liked, true);
  assert.equal(saved[key].disliked, false);
  assert.deepEqual(records.get(preferenceId).categories, ['likes']);
  await store.savePreference('owner', key, { careersUrl: 'https://example.com/careers' });
  assert.deepEqual(records.get(preferenceId).categories, ['likes'], 'Editing a link preserves its category');
  await store.savePreference('owner', key, { liked: false });
  assert.deepEqual(records.get(preferenceId).categories, [], 'Undo clears the saved category');
  const publicResponse = await api.GET(new NextRequest('http://localhost/api/comp'));
  const publicData = await publicResponse.json();
  assert.equal(publicData.companies.length, 1000);
  assert.deepEqual(publicData.preferences, {});
  assert.equal(publicData.canEdit, false);
  console.log('Comp Mongo storage and API checks passed (in-memory database).');
})().catch(error => { console.error(error); process.exitCode = 1; });
