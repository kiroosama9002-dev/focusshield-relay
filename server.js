'use strict';
/**
 * FocusShield relay: lets the phone reach the PC app from any network.
 * The PC and the phone both connect OUT to this server; it only passes messages between them.
 * The PC app still checks the pairing token and enforces PIN rules, so the relay holds no data.
 */
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const MAX_ROOMS = 500, MAX_PHONES = 6;
const rooms = new Map(); // room -> { pc: ws|null, phones: Map<id, ws> }
let nextId = 1;

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('FocusShield relay OK'); }
  res.writeHead(404); res.end();
});
const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });

const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const valid = (s, re) => typeof s === 'string' && re.test(s);

wss.on('connection', (ws, req) => {
  const u = new URL(req.url, 'http://x');
  const room = u.searchParams.get('r') || '';
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; }); ws.on('error', () => {});
  if (!valid(room, /^[a-f0-9]{32}$/)) return ws.close(4000, 'bad room');

  if (u.pathname === '/pc') {
    let r = rooms.get(room);
    if (!r && rooms.size >= MAX_ROOMS) return ws.close(4005, 'full');
    if (!r) rooms.set(room, (r = { pc: null, phones: new Map() }));
    if (r.pc && r.pc !== ws) { try { r.pc.close(4006, 'replaced'); } catch {} }
    r.pc = ws;
    // phones that were waiting get told the PC is back (they reconnect themselves)
    ws.on('message', (raw) => {
      let m; try { m = JSON.parse(raw.toString()); } catch { return; }
      const p = r.phones.get(m.c);
      if (!p) return;
      if (m.k === 'msg' && typeof m.d === 'string') { if (p.readyState === 1) p.send(m.d); }
      else if (m.k === 'close') { try { p.close(Number(m.code) || 4001, 'closed'); } catch {} }
    });
    ws.on('close', () => {
      if (r.pc === ws) { r.pc = null; for (const p of r.phones.values()) { try { p.close(4003, 'pc offline'); } catch {} } r.phones.clear(); }
      if (!r.pc && !r.phones.size) rooms.delete(room);
    });
    return;
  }

  if (u.pathname === '/phone') {
    const token = u.searchParams.get('t') || '';
    const r = rooms.get(room);
    if (!valid(token, /^[a-f0-9]{24}$/)) return ws.close(4001, 'bad token');
    if (!r || !r.pc) return ws.close(4003, 'pc offline');
    if (r.phones.size >= MAX_PHONES) return ws.close(4005, 'too many devices');
    const id = nextId++;
    r.phones.set(id, ws);
    send(r.pc, { k: 'open', c: id, t: token });
    ws.on('message', (raw) => { send(r.pc, { k: 'msg', c: id, d: raw.toString() }); });
    ws.on('close', () => { r.phones.delete(id); send(r.pc, { k: 'close', c: id }); });
    return;
  }
  ws.close(4000, 'bad path');
});

setInterval(() => {
  for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch {} }
}, 25000);

server.listen(PORT, () => console.log('FocusShield relay on', PORT));
