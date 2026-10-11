const assert = require('node:assert/strict');
const {POINTS, rank, individual, teams, championshipCircuit} = require('./scoring.js');
const ids = Array.from({length: 11}, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
const times = ids.map((uuid, index) => ({uuid, player: `Piloto${index + 1}`, milliseconds: 30000 + index * 1000}));
const drift = ids.map((uuid, index) => ({uuid, player: `Piloto${index + 1}`, points: 11000 - index * 1000}));
assert.deepEqual(POINTS, [15, 12, 10, 8, 6, 5, 4, 3, 2, 1]);
assert.equal(rank(times, 'time_attack')[0].tournamentPoints, 15);
assert.equal(rank(times, 'time_attack')[9].tournamentPoints, 1);
assert.equal(rank(times, 'time_attack')[10].tournamentPoints, 0);
assert.equal(rank(drift, 'drift')[0].points, 11000);
const pilots = individual({times, drift});
assert.equal(pilots[0].total, 30);
assert.equal(pilots[1].total, 24);
assert.equal(pilots[10].total, 0);
const result = teams(pilots, {'Ducati Lenovo Team': [ids[0], ids[1]], 'Aprilia Racing': []});
assert.equal(result.ranked[0].attack, 27);
assert.equal(result.ranked[0].drift, 27);
assert.equal(result.ranked[0].total, 54);
assert.equal(result.pending[0].name, 'Aprilia Racing');
assert.equal(teams(pilots, {A: [ids[0], ids[1]], B: [ids[0], ids[2]]}).pending.length, 1);
const named = teams([], {A: [{uuid: ids[0], name: 'Piloto A'}, {uuid: ids[1], name: 'Piloto B'}]});
assert.deepEqual(named.ranked[0].pilots, ['Piloto A', 'Piloto B']);
assert.equal(named.ranked[0].total, 0);
const dated = (date, uuid) => ({uuid, player: 'Piloto', milliseconds: 30000, points: 100, achievedAt: date});
const windowRecords = [
  dated('2026-10-10T21:59:59.999Z', ids[0]),
  dated('2026-10-10T22:00:00.000Z', ids[1]),
  dated('2026-10-24T21:59:59.999Z', ids[2]),
  dated('2026-10-24T22:00:00.000Z', ids[3]),
  dated('not-a-date', ids[4])
];
const jarama = championshipCircuit({id: 'jarama', times: windowRecords, drift: windowRecords});
assert.deepEqual(jarama.times.map(row => row.uuid), [ids[1], ids[2]]);
assert.deepEqual(jarama.drift.map(row => row.uuid), [ids[1], ids[2]]);
assert.equal(championshipCircuit({id: 'domusring', times: windowRecords}).times.length, 5);
console.log('PASS: top-10 points, both modes, individual totals, team totals, incomplete and duplicate rosters');
