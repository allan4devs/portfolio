const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('app/(page_routes)/comp/CompanyDirectory.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const company = { key: 'example', name: 'Example', model: 'direct', locations: [], tracks: [], jobs: [] };
const extraCompanies = Array.from({ length: 60 }, (_, index) => ({ ...company, key: `extra-${index}`, name: `Extra ${index}` }));
const storage = new Map();
const key = 'cv-company-preferences-v1';
function mount() {
  const states = [];
  let cursor = 0;
  const effects = [];
  const exports = {};
  vm.runInNewContext(source, {
    exports, URL, setTimeout, clearTimeout,
    window: { matchMedia: () => ({ matches: false }) },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    fetch: async (_url, options) => {
      assert.equal(options.method, undefined, 'Guest reactions must not call the protected PUT endpoint');
      return { ok: true, json: async () => ({ companies: [company, ...extraCompanies], preferences: {}, canEdit: false, storage: 'catalog' }) };
    },
    require: id => {
      if (id === 'react') return {
        useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; },
        useEffect: callback => { effects.push(callback); },
      };
      if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (id === 'lucide-react') return {};
      if (id.includes('company-catalog')) return {
        companySignals: () => ({ technologies: [], roles: [], levels: [] }), matchesCompanyFilters: () => true,
        TECHNOLOGIES: [], ROLE_TYPES: [], LEVELS: [], TARGET_COMPANIES: 1000,
      };
      if (id.includes('comp/types')) return { validatePreference: value => value };
      throw new Error(id);
    },
  });
  const render = () => { cursor = 0; return exports.CompanyDirectory(); };
  render();
  effects.forEach(effect => effect());
  function find(predicate, node) {
    if (!node || typeof node !== 'object') return undefined;
    if (Array.isArray(node)) return node.map(child => find(predicate, child)).find(Boolean);
    return predicate(node) ? node : find(predicate, node.props?.children);
  }
  return { find: predicate => find(predicate, render()) };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  let app = mount();
  await settle();
  const button = label => app.find(node => node.type === 'button' && node.props['aria-label'] === label);
  assert.equal(button('Like Example').props.disabled, false);
  assert.ok(button('Like Extra 59'), 'All companies must render beyond the former 48-card limit');
  assert.equal(app.find(node => node.type === 'button' && JSON.stringify(node.props.children).includes('more companies')), undefined, 'No pagination button should remain');
  const liking = button('Like Example').props.onClick();
  assert.match(button('Like Example').props.className, /reaction-pop/, 'Clicked button animates before removal');
  assert.equal(button('Like Example').props.disabled, true, 'Prevent repeated clicks during animation');
  await new Promise(resolve => setTimeout(resolve, 260));
  assert.ok(app.find(node => node.props?.className?.includes('card-vanish')), 'Card exits after button feedback');
  await liking;
  assert.equal(JSON.parse(storage.get(key)).example.liked, true);
  app = mount();
  await settle();
  assert.equal(button('Like Example'), undefined, 'Liked companies leave the Companies tab after reload');
  app.find(node => node.props?.id === 'likes-tab').props.onClick();
  assert.equal(button('Unlike Example').props['aria-pressed'], true);
  await button('Dislike Example').props.onClick();
  assert.deepEqual(JSON.parse(storage.get(key)).example, { liked: false, disliked: true });
  app.find(node => node.props?.id === 'dislikes-tab').props.onClick();
  await button('Undo dislike for Example').props.onClick();
  app.find(node => node.props?.id === 'companies-tab').props.onClick();
  assert.equal(button('Like Example').props['aria-pressed'], false);
  console.log('Comp guest reactions: like, reload, dislike, saved tabs, and undo passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
