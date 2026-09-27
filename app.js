const FEED_URL = 'https://script.google.com/macros/s/AKfycbxu6Oqoz6RmYFpiepkhGnV58HsljMHak_dj1cQkzir1r8Pf_0BwZWn0-6Te8FL6pEJN5g/exec';
const CIRCUITS = [
  {id: 'domusring', label: 'DomusRing'},
  {id: 'jarama', label: 'Jarama'},
  {id: 'karting', label: 'Karting'}
];
const REFRESH_MS = 60000;
let selectedCircuit = 'domusring';
let feed = null;
let pendingScript = null;
let pendingTimer = null;

const $ = id => document.getElementById(id);
const circuitLabel = id => CIRCUITS.find(c => c.id === id)?.label || id;
const validUuid = uuid => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
const bodyUrl = uuid => `https://mc-heads.net/body/${encodeURIComponent(uuid)}/256`;
const headUrl = uuid => `https://mc-heads.net/avatar/${encodeURIComponent(uuid)}/48`;

function formatMillis(value) {
  const ms = Math.max(0, Math.trunc(Number(value) || 0));
  return `${Math.floor(ms / 60000)}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

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

function renderPodium(times) {
  const root = $('podium');
  root.replaceChildren();
  if (!times.length) {
    root.append(el('p', 'podium-empty', 'Todavía no hay tiempos para este circuito.'));
    return;
  }
  const order = times.length === 1 ? [0] : times.length === 2 ? [1, 0] : [1, 0, 2];
  for (const index of order) {
    const record = times[index];
    const rank = index + 1;
    const entry = el('div', `podium-entry is-${['first', 'second', 'third'][index]}`);
    if (validUuid(record.uuid)) {
      const image = el('img', 'podium-avatar');
      image.src = bodyUrl(record.uuid);
      image.alt = `Skin de ${record.player}`;
      image.loading = 'lazy';
      image.onerror = () => image.replaceWith(el('div', 'podium-avatar-fallback', record.player.slice(0, 1).toUpperCase()));
      entry.append(image);
    } else {
      entry.append(el('div', 'podium-avatar-fallback', record.player.slice(0, 1).toUpperCase()));
    }
    entry.append(el('div', 'podium-name', record.player));
    entry.append(el('div', 'podium-time', formatMillis(record.milliseconds)));
    const base = el('div', 'podium-base');
    base.append(el('span', 'podium-rank', String(rank).padStart(2, '0')));
    entry.append(base);
    root.append(entry);
  }
}

function renderTable(times) {
  const body = $('results-body');
  body.replaceChildren();
  if (!times.length) {
    const row = el('tr');
    const cell = el('td', 'empty-row', 'Aún no hay vueltas registradas.');
    cell.colSpan = 4;
    row.append(cell);
    body.append(row);
    return;
  }
  times.forEach((record, index) => {
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
      head.onerror = () => { head.style.visibility = 'hidden'; };
      pilot.append(head);
    }
    pilot.append(el('span', '', record.player));
    pilotCell.append(pilot);
    row.append(rankCell, pilotCell, el('td', '', formatMillis(record.milliseconds)), el('td', 'date-cell', formatDate(record.achievedAt)));
    body.append(row);
  });
}

function render() {
  $('results-title').textContent = circuitLabel(selectedCircuit);
  const circuit = feed?.circuits?.find(c => c.id === selectedCircuit);
  const times = (Array.isArray(circuit?.times) ? circuit.times : [])
    .filter(r => r && typeof r.player === 'string' && Number.isSafeInteger(r.milliseconds) && r.milliseconds >= 0)
    .sort((a, b) => a.milliseconds - b.milliseconds);
  $('pilots-count').textContent = feed ? String(times.length).padStart(2, '0') : '—';
  if (feed) {
    renderPodium(times);
    renderTable(times);
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
    setStatus('Resultados actualizados', 'live');
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
$('year').textContent = new Date().getFullYear();
refresh();
setInterval(refresh, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
