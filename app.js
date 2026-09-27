const FEED_URL = 'https://script.google.com/macros/s/AKfycbxu6Oqoz6RmYFpiepkhGnV58HsljMHak_dj1cQkzir1r8Pf_0BwZWn0-6Te8FL6pEJN5g/exec';
const CIRCUITS = [
  {id: 'domusring', label: 'DomusRing'},
  {id: 'jarama', label: 'Jarama'}
];
const REFRESH_MS = 60000;
let selectedCircuit = 'domusring';
let selectedMode = 'time_attack';
let feed = null;
let pendingScript = null;
let pendingTimer = null;

const $ = id => document.getElementById(id);
const circuitLabel = id => CIRCUITS.find(c => c.id === id)?.label || id;
const validUuid = uuid => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
const compactUuid = uuid => uuid.replace(/-/g, '');
const bodyUrl = uuid => `https://visage.surgeplay.com/full/256/${compactUuid(uuid)}`;
const headUrl = uuid => `https://visage.surgeplay.com/face/48/${compactUuid(uuid)}`;
const backupBodyUrl = uuid => `https://mc-heads.net/body/${encodeURIComponent(uuid)}/256`;
const backupHeadUrl = uuid => `https://mc-heads.net/avatar/${encodeURIComponent(uuid)}/48`;

function formatMillis(value) {
  const ms = Math.max(0, Math.trunc(Number(value) || 0));
  return `${Math.floor(ms / 60000)}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

const formatPoints = value => new Intl.NumberFormat('es-ES').format(value);
const formatResult = record => selectedMode === 'drift'
  ? `${formatPoints(record.points)} pts` : formatMillis(record.milliseconds);

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-ES', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(date);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderPodium(rows) {
  const root = $('podium');
  root.replaceChildren();
  if (!rows.length) {
    root.append(el('p', 'podium-empty', 'Todavía no hay resultados para esta modalidad y circuito.'));
    return;
  }
  const order = rows.length === 1 ? [0] : rows.length === 2 ? [1, 0] : [1, 0, 2];
  for (const index of order) {
    const record = rows[index];
    const rank = index + 1;
    const entry = el('div', `podium-entry is-${['first', 'second', 'third'][index]}`);
    if (validUuid(record.uuid)) {
      const image = el('img', 'podium-avatar');
      image.src = bodyUrl(record.uuid);
      image.alt = `Skin de ${record.player}`;
      image.loading = 'eager';
      image.onerror = () => {
        if (image.dataset.backup) {
          image.replaceWith(el('div', 'podium-avatar-fallback', record.player.slice(0, 1).toUpperCase()));
        } else {
          image.dataset.backup = '1';
          image.src = backupBodyUrl(record.uuid);
        }
      };
      entry.append(image);
    } else {
      entry.append(el('div', 'podium-avatar-fallback', record.player.slice(0, 1).toUpperCase()));
    }
    entry.append(el('div', 'podium-name', record.player));
    entry.append(el('div', 'podium-time', formatResult(record)));
    const base = el('div', 'podium-base');
    base.append(el('span', 'podium-rank', String(rank).padStart(2, '0')));
    entry.append(base);
    root.append(entry);
  }
}

function renderTable(rows) {
  const body = $('results-body');
  body.replaceChildren();
  if (!rows.length) {
    const row = el('tr');
    const cell = el('td', 'empty-row', 'Aún no hay resultados registrados.');
    cell.colSpan = 5;
    row.append(cell);
    body.append(row);
    return;
  }
  rows.forEach((record, index) => {
    const row = el('tr');
    const rankCell = el('td');
    rankCell.append(el('span', index < 3 ? 'position top' : 'position', String(index + 1).padStart(2, '0')));
    const pilotCell = el('td');
    const pilot = el('div', 'pilot-cell');
    if (validUuid(record.uuid)) {
      const head = el('img', 'pilot-head');
      head.src = headUrl(record.uuid);
      head.alt = '';
      head.loading = 'lazy';
      head.onerror = () => {
        if (head.dataset.backup) {
          head.style.visibility = 'hidden';
        } else {
          head.dataset.backup = '1';
          head.src = backupHeadUrl(record.uuid);
        }
      };
      pilot.append(head);
    }
    pilot.append(el('span', '', record.player));
    pilotCell.append(pilot);
    row.append(rankCell, pilotCell, el('td', '', formatResult(record)),
      el('td', 'tournament-points', String(record.tournamentPoints)),
      el('td', 'date-cell', formatDate(record.achievedAt)));
    body.append(row);
  });
}

function standingRow(position, name, detail, total) {
  const row = el('div', 'standing-row');
  row.append(el('span', 'standing-rank', position ? String(position).padStart(2, '0') : '—'));
  const main = el('div', 'standing-main');
  main.append(el('strong', '', name), el('small', '', detail));
  row.append(main);
  const score = el('span', 'standing-score', total === null ? '—' : String(total));
  score.append(el('small', '', total === null ? 'PENDIENTE' : 'PUNTOS'));
  row.append(score);
  return row;
}

function renderChampionship(circuit) {
  $('championship-circuit').textContent = circuitLabel(selectedCircuit);
  const pilotsRoot = $('individual-standings');
  const teamsRoot = $('team-standings');
  pilotsRoot.replaceChildren();
  teamsRoot.replaceChildren();
  if (!circuit || !Array.isArray(circuit.drift)) {
    pilotsRoot.append(el('p', 'standings-empty', 'Los puntos conjuntos estarán disponibles tras actualizar el Apps Script con los resultados de Drift.'));
  } else {
    const pilots = SpeedBoatScoring.individual(circuit);
    if (!pilots.length) pilotsRoot.append(el('p', 'standings-empty', 'Aún no hay pilotos clasificados.'));
    pilots.forEach((pilot, index) => pilotsRoot.append(standingRow(index + 1, pilot.player,
      `Time Attack ${pilot.attack} + Drift ${pilot.drift}`, pilot.total)));
    const teamResult = SpeedBoatScoring.teams(pilots, window.SpeedBoatRoster);
    teamResult.ranked.forEach((team, index) => teamsRoot.append(standingRow(index + 1, team.name,
      `${team.pilots.join(' + ')} · TA ${team.attack} + Drift ${team.drift}`, team.total)));
    teamResult.pending.forEach(team => teamsRoot.append(standingRow(null, team.name, team.reason, null)));
  }
  if (!teamsRoot.childElementCount) {
    for (const name of Object.keys(window.SpeedBoatRoster)) {
      teamsRoot.append(standingRow(null, name, 'Pilotos por asignar', null));
    }
  }
}

function render() {
  $('results-title').textContent = circuitLabel(selectedCircuit);
  $('results-kicker').textContent = `TABLA DE RÉCORDS · ${selectedMode === 'drift' ? 'DRIFT' : 'TIME ATTACK'}`;
  $('podium-caption').textContent = selectedMode === 'drift' ? 'LOS MEJORES DERRAPES' : 'LOS MÁS RÁPIDOS';
  $('metric-heading').textContent = selectedMode === 'drift' ? 'MEJOR PUNTUACIÓN' : 'MEJOR VUELTA';
  $('results-note').textContent = selectedMode === 'drift'
    ? 'Las puntuaciones se ordenan de mayor a menor. Los diez primeros suman puntos para el torneo.'
    : 'Los tiempos se ordenan de menor a mayor. Los diez primeros suman puntos para el torneo.';
  const circuit = feed?.circuits?.find(c => c.id === selectedCircuit);
  const records = selectedMode === 'drift' ? circuit?.drift : circuit?.times;
  const rows = SpeedBoatScoring.rank(records, selectedMode);
  $('pilots-count').textContent = feed ? String(rows.length).padStart(2, '0') : '—';
  if (feed) {
    if (selectedMode === 'drift' && circuit && !Array.isArray(circuit.drift)) {
      $('podium').replaceChildren(el('p', 'podium-empty', 'Actualiza el Apps Script para mostrar los resultados de Drift.'));
      $('results-body').replaceChildren();
    } else {
      renderPodium(rows);
      renderTable(rows);
    }
    renderChampionship(circuit);
  }
}

function setStatus(message, kind) {
  $('status-text').textContent = message;
  $('live-status').className = `live-status ${kind ? 'is-' + kind : ''}`;
}

function clearPending() {
  if (pendingTimer) clearTimeout(pendingTimer);
  if (pendingScript) pendingScript.remove();
  pendingTimer = null;
  pendingScript = null;
}

window.SpeedBoatsFeed = {
  receive(data) {
    clearPending();
    if (!data?.ok || !Array.isArray(data.circuits)) {
      setStatus('No se pudieron leer los resultados', 'error');
      return;
    }
    feed = data;
    render();
    const now = new Date();
    $('updated-at').textContent = `Actualizado a las ${new Intl.DateTimeFormat('es-ES', {hour: '2-digit', minute: '2-digit'}).format(now)}`;
    setStatus(data.circuits.some(c => c.id === 'domusring' && !Array.isArray(c.drift))
      ? 'Time Attack actualizado · Drift pendiente' : 'Resultados actualizados', 'live');
  }
};

function refresh() {
  if (pendingScript) return;
  pendingScript = document.createElement('script');
  pendingScript.src = `${FEED_URL}?feed=1&t=${Date.now()}`;
  pendingScript.async = true;
  pendingScript.onerror = () => {
    clearPending();
    setStatus(feed ? 'Sin conexión · mostrando últimos datos' : 'Sin conexión con la hoja', 'error');
  };
  pendingTimer = setTimeout(() => {
    clearPending();
    setStatus(feed ? 'Sin conexión · mostrando últimos datos' : 'Sin conexión con la hoja', 'error');
  }, 15000);
  document.head.append(pendingScript);
}

for (const button of document.querySelectorAll('[data-circuit]')) {
  button.addEventListener('click', () => {
    selectedCircuit = button.dataset.circuit;
    for (const item of document.querySelectorAll('[data-circuit]')) {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    }
    render();
  });
}
for (const button of document.querySelectorAll('[data-mode]')) {
  button.addEventListener('click', () => {
    selectedMode = button.dataset.mode;
    for (const item of document.querySelectorAll('[data-mode]')) {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    }
    render();
  });
}
$('year').textContent = new Date().getFullYear();
refresh();
setInterval(refresh, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
