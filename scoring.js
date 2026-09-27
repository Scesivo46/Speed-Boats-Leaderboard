(function (root) {
  const POINTS = [15, 12, 10, 8, 6, 5, 4, 3, 2, 1];
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function rank(records, mode) {
    const field = mode === 'drift' ? 'points' : 'milliseconds';
    const best = new Map();
    for (const item of Array.isArray(records) ? records : []) {
      if (!item || !UUID.test(item.uuid) || typeof item.player !== 'string'
          || !Number.isSafeInteger(item[field]) || item[field] < 0) continue;
      const id = item.uuid.toLowerCase();
      const prior = best.get(id);
      if (!prior || (mode === 'drift' ? item[field] > prior[field] : item[field] < prior[field])) {
        best.set(id, {...item, uuid: id});
      }
    }
    return [...best.values()].sort((a, b) => {
      const difference = mode === 'drift' ? b[field] - a[field] : a[field] - b[field];
      return difference || String(a.achievedAt || '').localeCompare(String(b.achievedAt || ''))
        || a.uuid.localeCompare(b.uuid);
    }).map((item, index) => ({...item, place: index + 1, tournamentPoints: POINTS[index] || 0}));
  }

  function individual(circuit) {
    const attack = rank(circuit?.times, 'time_attack');
    const drift = rank(circuit?.drift, 'drift');
    const pilots = new Map();
    for (const [mode, rows] of [['attack', attack], ['drift', drift]]) {
      for (const row of rows) {
        const current = pilots.get(row.uuid) || {uuid: row.uuid, player: row.player, attack: 0, drift: 0};
        current.player = row.player;
        current[mode] = row.tournamentPoints;
        pilots.set(row.uuid, current);
      }
    }
    return [...pilots.values()].map(pilot => ({...pilot, total: pilot.attack + pilot.drift}))
      .sort((a, b) => b.total - a.total || b.attack - a.attack || a.player.localeCompare(b.player));
  }

  function teams(individuals, roster) {
    const byUuid = new Map(individuals.map(pilot => [pilot.uuid, pilot]));
    const assigned = new Set();
    const ranked = [];
    const pending = [];
    for (const [name, members] of Object.entries(roster || {})) {
      const ids = Array.isArray(members) ? members.map(id => String(id).toLowerCase()) : [];
      if (ids.length !== 2 || ids[0] === ids[1] || ids.some(id => !UUID.test(id) || assigned.has(id))) {
        pending.push({name, reason: 'Pilotos por asignar'});
        continue;
      }
      ids.forEach(id => assigned.add(id));
      const pilots = ids.map(id => byUuid.get(id));
      ranked.push({name, members: ids, pilots: pilots.map((pilot, index) => pilot?.player || ids[index]),
        attack: pilots.reduce((sum, pilot) => sum + (pilot?.attack || 0), 0),
        drift: pilots.reduce((sum, pilot) => sum + (pilot?.drift || 0), 0)});
    }
    ranked.forEach(team => { team.total = team.attack + team.drift; });
    ranked.sort((a, b) => b.total - a.total || b.attack - a.attack || a.name.localeCompare(b.name));
    return {ranked, pending};
  }

  root.SpeedBoatScoring = {POINTS, rank, individual, teams};
  if (typeof module !== 'undefined') module.exports = root.SpeedBoatScoring;
})(typeof window !== 'undefined' ? window : globalThis);
