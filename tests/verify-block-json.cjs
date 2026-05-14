'use strict';

const fs = require('fs');
const path = require('path');
const { buildBlockModel } = require('../src/panel/BlockModelBuilder.js');

const dir = __dirname;
let errors = 0;
const files = fs.readdirSync(dir).filter((f) => /^test-\d+\.json$/.test(f)).sort();

if (!files.length) {
  console.error('[verify-block-json] no test-*.json in', dir);
  process.exit(1);
}

for (const f of files) {
  const full = path.join(dir, f);
  const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
  let m;
  try {
    m = buildBlockModel(raw);
  } catch (err) {
    console.error('[verify-block-json]', f, err && err.message);
    errors += 1;
    continue;
  }
  const ids = new Set(m.nodes.map((n) => n.id));
  for (const e of m.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) {
      console.error('[verify-block-json]', f, 'orphan edge', e.source, '->', e.target);
      errors += 1;
    }
  }
  console.log('[verify-block-json] OK', f, 'nodes=', m.nodes.length, 'edges=', m.edges.length);
}

process.exit(errors ? 1 : 0);
