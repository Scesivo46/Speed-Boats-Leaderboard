const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'roster.js'), 'utf8'), context);
const roster = context.window.SpeedBoatRoster;
assert.equal(Object.keys(roster).length, 5);
const actualPairs = Object.values(roster).map(pair => {
  assert.equal(pair.length, 2);
  return pair.map(pilot => pilot.name.toLowerCase()).sort().join('/');
}).sort();
const expectedPairs = [
  'Juanes081_YT/Lussi1312', 'luciamarcos/Cesiviox', 'Nankyx/Simbiwi',
  'Scesivo/glaukodesmayada', 'demena/Tristrasther'
].map(pair => pair.toLowerCase().split('/').sort().join('/')).sort();
assert.deepEqual(actualPairs, expectedPairs);
const uuids = Object.values(roster).flatMap(pair => pair.map(pilot => pilot.uuid));
assert.equal(new Set(uuids).size, 10);
assert(uuids.every(uuid => /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(uuid)));
console.log('PASS: five complete teams, original pairs intact, ten unique UUIDs');
