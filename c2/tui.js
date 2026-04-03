import blessed from 'blessed';

const C2_URL = process.env.C2_URL || 'http://localhost:9090';
const REFRESH_INTERVAL = 30000;

// --- Data fetchers ---

async function fetchJson(path) {
  const res = await fetch(`${C2_URL}${path}`, { headers: { 'Content-Type': 'application/json' } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function postJson(path, body) {
  const res = await fetch(`${C2_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// --- Screen setup ---

const screen = blessed.screen({
  smartCSR: true,
  title: 'CommandCC',
  fullUnicode: true,
});

// Top bar
const topBar = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: '100%',
  height: 1,
  style: { fg: 'black', bg: 'green', bold: true },
  content: ' CommandCC -- AXL FLEET C2 | Loading...',
});

// Left panel: Incoming Reports
const reportList = blessed.list({
  parent: screen,
  label: ' INCOMING REPORTS ',
  top: 1,
  left: 0,
  width: '60%',
  height: '70%-2',
  border: { type: 'line' },
  style: {
    border: { fg: 'cyan' },
    label: { fg: 'cyan', bold: true },
    selected: { fg: 'black', bg: 'cyan' },
    item: { fg: 'white' },
  },
  keys: true,
  vi: true,
  mouse: true,
  scrollable: true,
  scrollbar: { ch: '|', style: { fg: 'cyan' } },
});

// Right panel: Unit Status
const unitTable = blessed.listtable({
  parent: screen,
  label: ' UNIT STATUS ',
  top: 1,
  left: '60%',
  width: '40%',
  height: '70%-2',
  border: { type: 'line' },
  style: {
    border: { fg: 'yellow' },
    label: { fg: 'yellow', bold: true },
    header: { fg: 'white', bold: true },
    cell: { fg: 'white' },
  },
  align: 'left',
  pad: 1,
  noCellBorders: true,
});

// Bottom panel: Active OPORDs + Handoffs
const bottomPanel = blessed.box({
  parent: screen,
  label: ' ACTIVE OPORDS / HANDOFFS ',
  top: '70%-1',
  left: 0,
  width: '100%',
  height: '30%-1',
  border: { type: 'line' },
  style: {
    border: { fg: 'magenta' },
    label: { fg: 'magenta', bold: true },
    fg: 'white',
  },
  scrollable: true,
  scrollbar: { ch: '|' },
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
});

// Command bar
const cmdBar = blessed.box({
  parent: screen,
  bottom: 0,
  left: 0,
  width: '100%',
  height: 1,
  style: { fg: 'white', bg: 'blue' },
  content: ' [o]OPORD [f]FRAGO [b]Broadcast [r]Read [a]Archive [s]Refresh [q]Quit',
});

// Report detail popup
const detailBox = blessed.box({
  parent: screen,
  label: ' REPORT DETAIL ',
  top: 'center',
  left: 'center',
  width: '80%',
  height: '80%',
  border: { type: 'line' },
  style: {
    border: { fg: 'green' },
    label: { fg: 'green', bold: true },
    fg: 'white',
  },
  scrollable: true,
  scrollbar: { ch: '|' },
  keys: true,
  vi: true,
  hidden: true,
});

// --- State ---
let incomingFiles = [];
let units = [];
let opords = [];
let handoffs = [];
let flashActive = false;
let flashTimer = null;

// --- Flash alert ---

function triggerFlash() {
  if (flashTimer) clearInterval(flashTimer);
  flashActive = true;
  let toggle = false;
  flashTimer = setInterval(() => {
    toggle = !toggle;
    topBar.style.bg = toggle ? 'red' : 'yellow';
    topBar.style.fg = toggle ? 'white' : 'black';
    screen.render();
  }, 500);
  // Stop flashing after 10 seconds
  setTimeout(() => {
    if (flashTimer) clearInterval(flashTimer);
    flashTimer = null;
    flashActive = false;
    topBar.style.bg = 'green';
    topBar.style.fg = 'black';
    screen.render();
  }, 10000);
}

// --- Data refresh ---

async function refreshAll() {
  try {
    const [inc, u, op, hf] = await Promise.all([
      fetchJson('/incoming'),
      fetchJson('/units'),
      fetchJson('/opords'),
      fetchJson('/handoffs'),
    ]);

    const prevCount = incomingFiles.length;
    incomingFiles = Array.isArray(inc) ? inc : [];
    units = Array.isArray(u) ? u : [];
    opords = Array.isArray(op) ? op : [];
    handoffs = Array.isArray(hf) ? hf : [];

    // Check for FLASH priority in new incoming reports
    if (incomingFiles.length > prevCount) {
      const newReports = incomingFiles.slice(prevCount);
      const hasFlash = newReports.some(r => {
        const preview = r.preview || '';
        return preview.includes('FLASH');
      });
      if (hasFlash) triggerFlash();
    }
  } catch (e) {
    incomingFiles = [];
  }
  renderAll();
}

function renderAll() {
  // Top bar
  const activeCount = units.filter(u => u.status === 'ACTIVE' || u.status === 'TASKED').length;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z';
  if (!flashActive) {
    topBar.setContent(` CommandCC -- AXL FLEET C2 | Units: ${units.length} | Active: ${activeCount} | ${now}`);
  }

  // Report list
  const reportItems = incomingFiles.map(r => {
    const f = r.filename || r;
    const preview = r.preview || '';
    // Parse type and callsign from preview
    const typeMatch = preview.match(/^(SITREP|INTREP|SPOTREP|REQUEST)/);
    const type = typeMatch ? typeMatch[1] : '?';
    const csMatch = preview.match(/FROM: ([A-Z-]+)/);
    const callsign = csMatch ? csMatch[1] : '?';
    const priMatch = preview.match(/PRIORITY: (FLASH|IMMEDIATE|ROUTINE)/);
    const pri = priMatch ? priMatch[1] : '';
    const typeIcons = { SITREP: '[S]', INTREP: '[I]', SPOTREP: '[!]', REQUEST: '[?]' };
    const priTag = pri === 'FLASH' ? ' **FLASH**' : pri === 'IMMEDIATE' ? ' *IMM*' : '';
    return ` ${typeIcons[type] || '[*]'} ${callsign} ${type}${priTag}`;
  });
  reportList.setItems(reportItems.length ? reportItems : [' No incoming reports']);

  // Unit table
  const headers = ['CALLSIGN', 'STATUS', 'CHECKIN', 'OPORD'];
  const rows = units.map(u => {
    const lastCheckin = u.last_checkin ? u.last_checkin.slice(11, 19) : 'never';
    const mission = u.current_opord || '-';
    return [u.callsign || '?', u.status || 'UNKNOWN', lastCheckin, mission];
  });
  unitTable.setData([headers, ...rows]);

  // Bottom panel
  const lines = [];
  if (opords.length) {
    lines.push('{yellow-fg}ACTIVE OPORDS:{/yellow-fg}');
    opords.forEach(o => lines.push(`  ${o}`));
  } else {
    lines.push('{yellow-fg}ACTIVE OPORDS:{/yellow-fg} None');
  }
  lines.push('');
  if (handoffs.length) {
    lines.push('{magenta-fg}PENDING HANDOFFS:{/magenta-fg}');
    handoffs.forEach(h => lines.push(`  ${h}`));
  } else {
    lines.push('{magenta-fg}PENDING HANDOFFS:{/magenta-fg} None');
  }
  bottomPanel.setContent(lines.join('\n'));

  screen.render();
}

// --- Key handlers ---

screen.key(['q', 'C-c'], () => process.exit(0));

screen.key('s', () => refreshAll());

screen.key('r', async () => {
  const idx = reportList.selected;
  if (!incomingFiles[idx]) return;
  const filename = incomingFiles[idx].filename || incomingFiles[idx];
  const content = await fetchJson(`/incoming/${encodeURIComponent(filename)}`);
  detailBox.setContent(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  detailBox.show();
  detailBox.focus();
  screen.render();
});

detailBox.key(['escape', 'q'], () => {
  detailBox.hide();
  reportList.focus();
  screen.render();
});

screen.key('a', async () => {
  const idx = reportList.selected;
  if (!incomingFiles[idx]) return;
  const filename = incomingFiles[idx].filename || incomingFiles[idx];
  await postJson(`/incoming/${encodeURIComponent(filename)}/archive`, {});
  await refreshAll();
});

screen.key('o', () => showOpordForm());
screen.key('f', () => showFragoForm());
screen.key('b', () => showBroadcastForm());

// --- Form helpers ---

function createFormField(form, label, name, top, height = 1) {
  blessed.text({ parent: form, top, left: 1, content: label, style: { fg: 'cyan' } });
  const input = blessed.textbox({
    parent: form,
    name,
    top,
    left: label.length + 2,
    width: '50%',
    height,
    style: { fg: 'white', bg: 'black', focus: { bg: 'blue' } },
    inputOnFocus: true,
  });
  return input;
}

function createSubmitBtn(form, top, label = ' SUBMIT ') {
  return blessed.button({
    parent: form,
    top,
    left: 'center',
    width: label.length + 2,
    height: 1,
    content: label,
    style: { fg: 'black', bg: 'green', focus: { bg: 'yellow' } },
  });
}

// --- Forms ---

function showOpordForm() {
  const form = blessed.form({
    parent: screen,
    label: ' ISSUE OPORD ',
    top: 'center',
    left: 'center',
    width: '70%',
    height: '80%',
    border: { type: 'line' },
    style: { border: { fg: 'green' }, label: { fg: 'green', bold: true } },
    keys: true,
  });

  const fields = [
    { label: 'OPORD ID:', name: 'id', top: 1 },
    { label: 'TO (callsign):', name: 'to', top: 3 },
    { label: 'PRIORITY:', name: 'priority', top: 5 },
    { label: 'MISSION:', name: 'mission', top: 7 },
    { label: 'EXECUTION:', name: 'execution', top: 9, height: 4 },
    { label: 'SUCCESS CRITERIA:', name: 'success_criteria', top: 14, height: 3 },
    { label: 'REPORT WHEN:', name: 'report_when', top: 18 },
  ];

  const inputs = {};
  fields.forEach(f => { inputs[f.name] = createFormField(form, f.label, f.name, f.top, f.height); });

  const btn = createSubmitBtn(form, 20);
  btn.on('press', async () => {
    const data = {};
    for (const [k, v] of Object.entries(inputs)) data[k] = v.getValue();
    await postJson('/opord', data);
    form.destroy();
    await refreshAll();
  });

  form.key('escape', () => { form.destroy(); screen.render(); });
  form.focus();
  screen.render();
}

function showFragoForm() {
  const form = blessed.form({
    parent: screen,
    label: ' ISSUE FRAGO ',
    top: 'center',
    left: 'center',
    width: '70%',
    height: '50%',
    border: { type: 'line' },
    style: { border: { fg: 'yellow' }, label: { fg: 'yellow', bold: true } },
    keys: true,
  });

  const fields = [
    { label: 'OPORD ID to modify:', name: 'opord_id', top: 1 },
    { label: 'TO (callsign):', name: 'to', top: 3 },
    { label: 'CHANGE:', name: 'change', top: 5, height: 3 },
    { label: 'REASON:', name: 'reason', top: 9, height: 2 },
    { label: 'NEW PRIORITY:', name: 'new_priority', top: 12 },
  ];

  const inputs = {};
  fields.forEach(f => { inputs[f.name] = createFormField(form, f.label, f.name, f.top, f.height); });

  const btn = createSubmitBtn(form, 14);
  btn.on('press', async () => {
    const data = {};
    for (const [k, v] of Object.entries(inputs)) data[k] = v.getValue();
    await postJson('/frago', data);
    form.destroy();
    await refreshAll();
  });

  form.key('escape', () => { form.destroy(); screen.render(); });
  form.focus();
  screen.render();
}

function showBroadcastForm() {
  const form = blessed.form({
    parent: screen,
    label: ' BROADCAST TO ALL UNITS ',
    top: 'center',
    left: 'center',
    width: '70%',
    height: '40%',
    border: { type: 'line' },
    style: { border: { fg: 'red' }, label: { fg: 'red', bold: true } },
    keys: true,
  });

  const priInput = createFormField(form, 'PRIORITY:', 'priority', 1);
  const msgInput = createFormField(form, 'MESSAGE:', 'content', 3, 5);

  const btn = createSubmitBtn(form, 9, ' SEND ALL ');
  btn.on('press', async () => {
    const priority = priInput.getValue() || 'ROUTINE';
    const content = msgInput.getValue();
    if (content) {
      await postJson('/broadcast', { content, priority });
    }
    form.destroy();
    await refreshAll();
  });

  form.key('escape', () => { form.destroy(); screen.render(); });
  form.focus();
  screen.render();
}

// --- Init ---

reportList.focus();
refreshAll();
setInterval(refreshAll, REFRESH_INTERVAL);
