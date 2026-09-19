const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

// Execute the browser's definitions and fresh-plan builder, not just tax exports.
// This catches startup ReferenceErrors that a syntax check cannot detect.
const source = fs.readFileSync(process.argv[2] || path.join(__dirname, '../public/life-by-design/app.js'), 'utf8');
const boundary = source.indexOf('let state=fresh()');
assert(boundary > 0, 'Startup boundary must exist');
const context = { document: {} };
vm.createContext(context);
vm.runInContext(source.slice(0, boundary) + '\nthis.plan = fresh(); })();', context);
assert.equal(context.plan.currentStep, 'foundation');
assert.equal(Object.keys(context.plan.sections).length, 5);
for (const rows of Object.values(context.plan.sections)) {
  assert(rows.length > 0);
  for (const row of rows) {
    assert.equal(typeof row.name, 'string');
    assert(row.name.trim().length > 0);
    assert.equal(typeof row.hint, 'string');
  }
}
console.log('PASS browser startup definitions and fresh expense rows');
