import express from 'express';
import { readdir, readFile, writeFile, rename, unlink, stat } from 'fs/promises';
import { join, basename } from 'path';

const PORT = process.env.C2_PORT || 9090;
const BASE = process.env.C2_BASE || '/opt/fleet-c2';
const DIRS = {
  incoming: join(BASE, 'incoming'),
  outgoing: join(BASE, 'outgoing'),
  archive: join(BASE, 'archive'),
  units: join(BASE, 'units'),
  opords: join(BASE, 'opords'),
  handoffs: join(BASE, 'handoffs'),
};
const ROSTER_PATH = join(BASE, 'ROSTER.md');

const VALID_CALLSIGNS = [
  'OPS-EMPIRE', 'ARCH-EMPIRE', 'PROTO', 'EXCHANGE',
  'MDEX', 'MOTHER', 'BATTLE', 'MKTG', 'COMMAND',
];
const FLEET_CALLSIGNS = VALID_CALLSIGNS.filter(c => c !== 'COMMAND');
const VALID_STATUSES = ['ACTIVE', 'IDLE', 'TASKED', 'COMPLETE', 'ERROR'];
const VALID_REPORT_TYPES = ['SITREP', 'INTREP', 'SPOTREP', 'REQUEST'];
const VALID_PRIORITIES = ['FLASH', 'IMMEDIATE', 'ROUTINE'];

const app = express();
app.use(express.json());

const startTime = Date.now();

// --- Request logging ---

app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  const callsign = req.body?.callsign || req.params?.callsign || '-';
  console.log(`[${ts}] ${req.method} ${req.path} [${callsign}]`);
  next();
});

// --- Helpers ---

async function atomicWrite(filePath, content) {
  const tmp = filePath + '.tmp';
  await writeFile(tmp, content, 'utf-8');
  await rename(tmp, filePath);
}

function validateCallsign(callsign) {
  if (!callsign || !VALID_CALLSIGNS.includes(callsign)) {
    return `Invalid callsign: ${callsign}. Must be one of: ${VALID_CALLSIGNS.join(', ')}`;
  }
  return null;
}

function utcNow() {
  return new Date().toISOString();
}

async function listFiles(dir) {
  try {
    const files = await readdir(dir);
    return files.filter(f => !f.endsWith('.tmp'));
  } catch {
    return [];
  }
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

// --- Archive cleanup: delete files older than 7 days ---

async function cleanupArchive() {
  const files = await listFiles(DIRS.archive);
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let cleaned = 0;
  for (const f of files) {
    try {
      const fp = join(DIRS.archive, f);
      const s = await stat(fp);
      if (s.mtimeMs < cutoff) {
        await unlink(fp);
        cleaned++;
      }
    } catch { /* ignore */ }
  }
  if (cleaned > 0) console.log(`[C2] Archive cleanup: removed ${cleaned} files older than 7 days`);
}

// --- ENDPOINTS ---

// GET /health
app.get('/health', async (_req, res) => {
  const unitFiles = await listFiles(DIRS.units);
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  res.json({ status: 'ONLINE', units: unitFiles.length, uptime });
});

// POST /checkin
app.post('/checkin', async (req, res) => {
  const { callsign, status, brief } = req.body;
  const err = validateCallsign(callsign);
  if (err) return res.status(400).json({ error: err });
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const unitPath = join(DIRS.units, `${callsign}.json`);
  let unit = {};
  try { unit = await readJson(unitPath); } catch { /* new unit */ }

  unit.callsign = callsign;
  unit.status = status;
  unit.last_checkin = utcNow();
  if (brief) unit.brief = brief;

  await atomicWrite(unitPath, JSON.stringify(unit, null, 2));
  res.json({ ok: true, callsign, status, time: unit.last_checkin });
});

// POST /report
app.post('/report', async (req, res) => {
  const { callsign, type, priority = 'ROUTINE', content } = req.body;
  const err = validateCallsign(callsign);
  if (err) return res.status(400).json({ error: err });
  if (!VALID_REPORT_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid type: ${type}. Must be one of: ${VALID_REPORT_TYPES.join(', ')}` });
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority: ${priority}. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }
  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }

  const ts = utcNow();
  const filename = `${ts.replace(/[:.]/g, '-')}-${callsign}-${type}.md`;
  const body = `${type}\nFROM: ${callsign}\nTIME: ${ts}\nPRIORITY: ${priority}\n\n${content}\n\n-- ${callsign}\n`;

  await atomicWrite(join(DIRS.incoming, filename), body);
  res.json({ ok: true, filename, time: ts });
});

// GET /orders/:callsign - CONSUME: return pending orders, move to archive
app.get('/orders/:callsign', async (req, res) => {
  const { callsign } = req.params;
  const err = validateCallsign(callsign);
  if (err) return res.status(400).json({ error: err });

  const dir = join(DIRS.outgoing, callsign);
  const files = await listFiles(dir);
  if (files.length === 0) return res.json([]);

  const orders = [];
  for (const f of files) {
    const content = await readFile(join(dir, f), 'utf-8');
    orders.push({ filename: f, content });
    await rename(join(dir, f), join(DIRS.archive, `${callsign}-${f}`));
  }
  res.json(orders);
});

// GET /context/:callsign - PEEK: unit state + pending orders + active opord, no consumption
app.get('/context/:callsign', async (req, res) => {
  const { callsign } = req.params;
  const err = validateCallsign(callsign);
  if (err) return res.status(400).json({ error: err });

  // Unit state
  let unit = null;
  try { unit = await readJson(join(DIRS.units, `${callsign}.json`)); } catch { /* missing */ }

  // Pending orders (peek, do not move)
  const dir = join(DIRS.outgoing, callsign);
  const orderFiles = await listFiles(dir);
  const pending_orders = [];
  for (const f of orderFiles) {
    const content = await readFile(join(dir, f), 'utf-8');
    pending_orders.push({ filename: f, content });
  }

  // Active OPORD content
  let active_opord = null;
  if (unit?.current_opord) {
    try {
      const opordFile = unit.current_opord.endsWith('.md') ? unit.current_opord : `${unit.current_opord}.md`;
      active_opord = await readFile(join(DIRS.opords, opordFile), 'utf-8');
    } catch { /* missing */ }
  }

  res.json({ unit, pending_orders, active_opord });
});

// POST /opord
app.post('/opord', async (req, res) => {
  const { id, to, priority = 'ROUTINE', mission, execution, success_criteria, report_when } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });
  const err = validateCallsign(to);
  if (err) return res.status(400).json({ error: err });
  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority: ${priority}` });
  }

  const body = `OPORD ${id}\nTO: ${to}\nPRIORITY: ${priority}\n\nMISSION: ${mission}\n\nEXECUTION:\n${execution}\n\nSUCCESS CRITERIA:\n${success_criteria}\n\nREPORT WHEN: ${report_when}\n\n-- COMMAND\n`;
  const filename = `OPORD-${id}.md`;

  await atomicWrite(join(DIRS.opords, filename), body);
  await atomicWrite(join(DIRS.outgoing, to, filename), body);

  // Update unit state
  const unitPath = join(DIRS.units, `${to}.json`);
  try {
    const unit = await readJson(unitPath);
    unit.current_opord = `OPORD-${id}`;
    unit.status = 'TASKED';
    await atomicWrite(unitPath, JSON.stringify(unit, null, 2));
  } catch { /* unit file may not exist yet */ }

  res.json({ ok: true, opord: filename, delivered_to: to });
});

// POST /frago
app.post('/frago', async (req, res) => {
  const { opord_id, to, change, reason, new_priority } = req.body;
  if (!opord_id) return res.status(400).json({ error: 'opord_id is required' });
  const err = validateCallsign(to);
  if (err) return res.status(400).json({ error: err });

  const body = `FRAGO to OPORD ${opord_id}\nTO: ${to}\n\nCHANGE: ${change}\nREASON: ${reason}\nNEW PRIORITY: ${new_priority}\n\nALL OTHER ORDERS REMAIN IN EFFECT.\n-- COMMAND\n`;
  const filename = `FRAGO-${opord_id}-${utcNow().replace(/[:.]/g, '-')}.md`;

  await atomicWrite(join(DIRS.outgoing, to, filename), body);
  res.json({ ok: true, frago: filename, delivered_to: to });
});

// POST /broadcast
app.post('/broadcast', async (req, res) => {
  const { content, priority = 'ROUTINE' } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority: ${priority}` });
  }

  const ts = utcNow();
  const body = `BROADCAST\nFROM: COMMAND\nTO: ALL UNITS\nTIME: ${ts}\nPRIORITY: ${priority}\n\n${content}\n\n-- COMMAND\n`;
  const filename = `BROADCAST-${ts.replace(/[:.]/g, '-')}.md`;

  const delivered = [];
  for (const cs of FLEET_CALLSIGNS) {
    await atomicWrite(join(DIRS.outgoing, cs, filename), body);
    delivered.push(cs);
  }

  res.json({ ok: true, broadcast: filename, delivered_to: delivered, time: ts });
});

// POST /handoff
app.post('/handoff', async (req, res) => {
  const { from, to, mission, state, files, dependencies, next_steps } = req.body;
  let err = validateCallsign(from);
  if (err) return res.status(400).json({ error: err });
  err = validateCallsign(to);
  if (err) return res.status(400).json({ error: err });

  const ts = utcNow();
  const body = `HANDOFF\nFROM: ${from} -> TO: ${to}\n\nMISSION: ${mission}\nSTATE: ${state}\nFILES: ${files}\nDEPENDENCIES: ${dependencies}\nNEXT STEPS: ${next_steps}\n\n-- ${from}\n`;
  const filename = `${from}-to-${to}-${ts.replace(/[:.]/g, '-')}.md`;

  await atomicWrite(join(DIRS.handoffs, filename), body);
  await atomicWrite(join(DIRS.outgoing, to, filename), body);
  await atomicWrite(join(DIRS.outgoing, 'COMMAND', filename), body);

  res.json({ ok: true, handoff: filename, from, to });
});

// GET /roster
app.get('/roster', async (_req, res) => {
  try {
    const content = await readFile(ROSTER_PATH, 'utf-8');
    res.type('text/markdown').send(content);
  } catch {
    res.status(404).json({ error: 'ROSTER.md not found' });
  }
});

// GET /units
app.get('/units', async (_req, res) => {
  const files = await listFiles(DIRS.units);
  const units = [];
  for (const f of files) {
    try {
      const unit = await readJson(join(DIRS.units, f));
      units.push(unit);
    } catch { /* skip corrupt files */ }
  }
  res.json(units);
});

// GET /units/:callsign
app.get('/units/:callsign', async (req, res) => {
  const { callsign } = req.params;
  const err = validateCallsign(callsign);
  if (err) return res.status(400).json({ error: err });
  try {
    const unit = await readJson(join(DIRS.units, `${callsign}.json`));
    res.json(unit);
  } catch {
    res.status(404).json({ error: `Unit ${callsign} not found` });
  }
});

// GET /incoming - list unread reports with filename + first 3 lines
app.get('/incoming', async (_req, res) => {
  const files = (await listFiles(DIRS.incoming)).sort();
  const results = [];
  for (const f of files) {
    try {
      const content = await readFile(join(DIRS.incoming, f), 'utf-8');
      const preview = content.split('\n').slice(0, 3).join(' | ');
      results.push({ filename: f, preview });
    } catch {
      results.push({ filename: f, preview: '' });
    }
  }
  res.json(results);
});

// GET /incoming/:filename
app.get('/incoming/:filename', async (req, res) => {
  const { filename } = req.params;
  try {
    const content = await readFile(join(DIRS.incoming, basename(filename)), 'utf-8');
    res.type('text/plain').send(content);
  } catch {
    res.status(404).json({ error: 'Report not found' });
  }
});

// POST /incoming/:filename/archive
app.post('/incoming/:filename/archive', async (req, res) => {
  const { filename } = req.params;
  const src = join(DIRS.incoming, basename(filename));
  const dst = join(DIRS.archive, basename(filename));
  try {
    await rename(src, dst);
    res.json({ ok: true, archived: filename });
  } catch {
    res.status(404).json({ error: 'Report not found or already archived' });
  }
});

// GET /opords
app.get('/opords', async (_req, res) => {
  const files = await listFiles(DIRS.opords);
  res.json(files.sort());
});

// GET /opords/:id
app.get('/opords/:id', async (req, res) => {
  const { id } = req.params;
  const filename = id.startsWith('OPORD-') ? `${id}.md` : `OPORD-${id}.md`;
  try {
    const content = await readFile(join(DIRS.opords, filename), 'utf-8');
    res.type('text/plain').send(content);
  } catch {
    res.status(404).json({ error: `OPORD ${id} not found` });
  }
});

// GET /handoffs
app.get('/handoffs', async (_req, res) => {
  const files = await listFiles(DIRS.handoffs);
  res.json(files.sort());
});

// --- Start ---

cleanupArchive();
setInterval(cleanupArchive, 6 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`[C2] CommandCC online on port ${PORT}`);
  console.log(`[C2] Base directory: ${BASE}`);
  console.log(`[C2] ${VALID_CALLSIGNS.length} callsigns registered`);
});
