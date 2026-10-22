// Schede dei rifiuti: disegno e descrizione generati proceduralmente dalla parola (sempre uguali per la stessa parola).
(function () {
  const M = (window.MiiM = window.MiiM || {});
  const pick = (rg, a) => a[Math.floor(rg() * a.length)];
  const rnd = (rg, a, b) => a + rg() * (b - a);
  const rr = (...a) => M.rr(...a);
  const shade = (c, a) => M.shade(c, a);

  // ---------- disegni (origine al centro, ~ ±70 px) ----------
  const fill = (ctx, c) => (ctx.fillStyle = c);
  const rect = (ctx, c, x, y, w, h, r = 0) => { fill(ctx, c); if (r) rr(ctx, x, y, w, h, r); else { ctx.beginPath(); ctx.rect(x, y, w, h); } ctx.fill(); };
  const poly = (ctx, c, pts) => { fill(ctx, c); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };
  const ell = (ctx, c, x, y, rx, ry) => { fill(ctx, c); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
  const line = (ctx, c, w, pts) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
  const blob = (ctx, c, rg, r, n, jit) => {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, d = r * (1 - jit + rg() * jit * 2); pts.push([Math.cos(a) * d, Math.sin(a) * d]); }
    poly(ctx, c, pts);
  };
  const W = 'rgba(255,255,255,.4)';

  // Ogni variante: nome, articolo, genere e funzione di disegno (c = colore principale).
  const ITEMS = [
    { // plastica
      colors: ['#f5c518', '#fb923c', '#38bdf8', '#a3e635', '#f472b6', '#e5e7eb'],
      v: [
        { noun: 'bottiglia', art: 'Una', g: 1, draw(ctx, c, rg) {
          rect(ctx, c, -22, -30, 44, 80, 12); rect(ctx, shade(c, -0.05), -9, -52, 18, 26, 4); rect(ctx, shade(c, -0.3), -11, -62, 22, 12, 3);
          rect(ctx, 'rgba(255,255,255,.78)', -22, rnd(rg, -8, 4), 44, 22); rect(ctx, shade(c, -0.2), -16, 4, 32, 4); rect(ctx, W, -16, -26, 6, 60, 3); } },
        { noun: 'tanica', art: 'Una', g: 1, draw(ctx, c, rg) {
          rect(ctx, c, -38, -40, 76, 86, 10); rect(ctx, shade(c, -0.25), -28, -54, 20, 16, 3);
          ctx.strokeStyle = shade(c, -0.25); ctx.lineWidth = 6; rr(ctx, 8, -60, 30, 26, 8); ctx.stroke();
          for (let i = 0; i < 3; i++) line(ctx, shade(c, -0.2), 3, [[-30, -10 + i * 18], [30, -10 + i * 18]]); rect(ctx, W, -32, -34, 6, 70, 3); } },
        { noun: 'vaschetta', art: 'Una', g: 1, draw(ctx, c, rg) {
          poly(ctx, c, [[-48, -8], [48, -8], [38, 34], [-38, 34]]); poly(ctx, shade(c, -0.15), [[-42, -4], [42, -4], [34, 28], [-34, 28]]);
          rect(ctx, 'rgba(255,255,255,.35)', -48, -14, 96, 8, 3); if (rg() < 0.6) rect(ctx, '#f8fafc', -30, 6, 60, 14, 2); } },
      ] },
    { // carta
      colors: ['#e9e4d4', '#c59a62', '#f1ead2', '#dbeafe', '#fde68a'],
      v: [
        { noun: 'giornale', art: 'Un', g: 0, draw(ctx, c, rg) {
          rect(ctx, c, -46, -52, 92, 104, 3); rect(ctx, '#374151', -38, -44, 76, 12); rect(ctx, '#9ca3af', -38, -26, 34, 30);
          for (let i = 0; i < 6; i++) rect(ctx, '#6b7280', -38 + (i % 2) * 40, -24 + Math.floor(i / 2) * 9, rnd(rg, 22, 34), 3);
          for (let i = 0; i < 4; i++) rect(ctx, '#6b7280', -38, 10 + i * 9, rnd(rg, 50, 76), 3); line(ctx, 'rgba(0,0,0,.18)', 2, [[0, -52], [0, 52]]); } },
        { noun: 'scatola', art: 'Una', g: 1, draw(ctx, c, rg) {
          rect(ctx, c, -50, -24, 100, 70, 3); poly(ctx, shade(c, -0.12), [[-50, -24], [-36, -44], [36, -44], [50, -24]]);
          rect(ctx, '#e3c88d', -10, -44, 20, 70); rect(ctx, '#f8fafc', rnd(rg, -42, 10), 20, 28, 18, 2); line(ctx, 'rgba(0,0,0,.2)', 2, [[-50, -24], [50, -24]]); } },
        { noun: 'cartaccia', art: 'Una', g: 1, draw(ctx, c, rg) {
          blob(ctx, c, rg, 44, 11, 0.25);
          for (let i = 0; i < 7; i++) line(ctx, 'rgba(0,0,0,.2)', 2, [[rnd(rg, -30, 30), rnd(rg, -30, 30)], [rnd(rg, -30, 30), rnd(rg, -30, 30)]]);
          blob(ctx, 'rgba(255,255,255,.3)', rg, 20, 8, 0.3); } },
      ] },
    { // vetro
      colors: ['#22c55e', '#16a34a', '#86efac', '#b45309', '#93c5fd'],
      v: [
        { noun: 'bottiglia', art: 'Una', g: 1, draw(ctx, c, rg) {
          rect(ctx, c, -20, -20, 40, 70, 10); rect(ctx, c, -8, -58, 16, 42, 4); rect(ctx, shade(c, -0.3), -10, -62, 20, 8, 2);
          rect(ctx, 'rgba(255,255,255,.8)', -20, rnd(rg, -6, 8), 40, 20); rect(ctx, W, -14, -14, 5, 56, 3); rect(ctx, 'rgba(0,0,0,.15)', -20, 36, 40, 14, 6); } },
        { noun: 'barattolo', art: 'Un', g: 0, draw(ctx, c, rg) {
          rect(ctx, c, -34, -30, 68, 72, 14); rect(ctx, '#b0b7c3', -30, -46, 60, 16, 4); rect(ctx, W, -26, -24, 7, 58, 3);
          rect(ctx, 'rgba(255,255,255,.75)', -34, rnd(rg, -8, 6), 68, 22); rect(ctx, 'rgba(0,0,0,.12)', -34, 28, 68, 14, 8); } },
        { noun: 'bicchiere', art: 'Un', g: 0, draw(ctx, c, rg) {
          poly(ctx, c, [[-30, -38], [30, -38], [21, 44], [-21, 44]]); poly(ctx, 'rgba(255,255,255,.18)', [[-26, -30], [26, -30], [18, 8], [-18, 8]]);
          rect(ctx, W, -22, -32, 6, 62, 3); rect(ctx, 'rgba(0,0,0,.18)', -21, 36, 42, 8, 3); } },
      ] },
    { // metallo
      colors: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#e5e7eb'],
      v: [
        { noun: 'lattina', art: 'Una', g: 1, draw(ctx, c, rg) {
          rect(ctx, '#cbd5e1', -26, -42, 52, 84, 5); rect(ctx, c, -26, -18, 52, 40); ell(ctx, '#94a3b8', 0, -42, 26, 7); ell(ctx, '#e2e8f0', 0, -43, 21, 5);
          ell(ctx, '#64748b', 6, -43, 5, 2); rect(ctx, 'rgba(255,255,255,.5)', -19, -38, 6, 76, 3); ell(ctx, 'rgba(0,0,0,.25)', 0, 42, 26, 5); } },
        { noun: 'scatoletta', art: 'Una', g: 1, draw(ctx, c, rg) {
          rect(ctx, '#b8c2cf', -40, -22, 80, 54, 5); rect(ctx, c, -40, -10, 80, 28); ell(ctx, '#e2e8f0', 0, -22, 40, 8);
          for (let i = -30; i <= 30; i += 15) line(ctx, 'rgba(0,0,0,.2)', 2, [[i, -17], [i, 30]]); rect(ctx, W, -34, -16, 5, 44, 2); } },
        { noun: 'ingranaggio', art: 'Un', g: 0, draw(ctx, c, rg) {
          const n = 8 + Math.floor(rg() * 5), pts = [];
          for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 36 : 46; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
          poly(ctx, '#94a3b8', pts); ell(ctx, '#b8c2cf', 0, 0, 33, 33); ell(ctx, '#475569', 0, 0, 12, 12); ell(ctx, '#64748b', 0, 0, 7, 7); } },
      ] },
    { // legno
      colors: ['#b5733a', '#8b5a2b', '#d6a15f', '#a16207', '#7c4a21'],
      v: [
        { noun: 'tavola', art: 'Una', g: 1, draw(ctx, c, rg) {
          rect(ctx, c, -56, -17, 112, 34, 3);
          for (let i = 0; i < 5; i++) line(ctx, shade(c, -0.18), 1.6, [[-54, -12 + i * 6], [-20, -12 + i * 6 + rnd(rg, -3, 3)], [20, -12 + i * 6 + rnd(rg, -3, 3)], [54, -12 + i * 6]]);
          ell(ctx, shade(c, -0.25), rnd(rg, -30, 30), rnd(rg, -6, 6), 7, 4); ell(ctx, '#64748b', -48, 0, 2.4, 2.4); ell(ctx, '#64748b', 48, 0, 2.4, 2.4); } },
        { noun: 'tronchetto', art: 'Un', g: 0, draw(ctx, c, rg) {
          rect(ctx, c, -50, -28, 78, 56, 6); ell(ctx, shade(c, 0.12), 28, 0, 18, 28); ell(ctx, shade(c, -0.1), 28, 0, 14, 22);
          for (let r = 3; r < 14; r += 4) { ctx.strokeStyle = shade(c, -0.3); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(28, 0, r * 0.8, r * 1.5, 0, 0, Math.PI * 2); ctx.stroke(); }
          for (let i = 0; i < 4; i++) line(ctx, shade(c, -0.2), 1.6, [[-46, -18 + i * 12], [10, -18 + i * 12]]); } },
        { noun: 'cassetta', art: 'Una', g: 1, draw(ctx, c, rg) {
          rect(ctx, shade(c, -0.15), -46, -36, 92, 72, 3);
          for (let i = 0; i < 3; i++) rect(ctx, c, -44, -34 + i * 24, 88, 20, 2);
          rect(ctx, shade(c, -0.25), -44, -36, 8, 72); rect(ctx, shade(c, -0.25), 36, -36, 8, 72); } },
      ] },
    { // organico
      colors: ['#ef4444', '#84cc16', '#facc15', '#f97316'],
      v: [
        { noun: 'torsolo', art: 'Un', g: 0, draw(ctx, c, rg) {
          ell(ctx, c, 0, -30, 36, 22); ell(ctx, c, 0, 30, 34, 20); rect(ctx, '#fef3c7', -15, -34, 30, 68, 10);
          for (let i = 0; i < 4; i++) ell(ctx, '#5b3a1e', rnd(rg, -6, 6), -12 + i * 9, 2.4, 3.6); line(ctx, '#5b3a1e', 3, [[0, -50], [rnd(rg, 4, 12), -64]]);
          rect(ctx, 'rgba(0,0,0,.12)', -15, 22, 30, 12, 6); } },
        { noun: 'buccia di banana', art: 'Una', g: 1, draw(ctx, c, rg) {
          for (const a of [-2.4, -0.7, 1.4]) {
            ctx.strokeStyle = c; ctx.lineWidth = 17; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(Math.cos(a) * 26, Math.sin(a) * 26 - 12, Math.cos(a) * 52, Math.sin(a) * 52 + 4); ctx.stroke();
            ell(ctx, '#5b3a1e', Math.cos(a) * 52, Math.sin(a) * 52 + 4, 5, 5);
          }
          ell(ctx, shade(c, -0.12), 0, 0, 14, 14); for (let i = 0; i < 5; i++) ell(ctx, 'rgba(91,58,30,.55)', rnd(rg, -40, 40), rnd(rg, -30, 30), 2.5, 2.5); } },
        { noun: 'lisca di pesce', art: 'Una', g: 1, draw(ctx, c, rg) {
          line(ctx, '#f1f5f9', 5, [[-34, 0], [34, 0]]);
          for (let i = -22; i <= 24; i += 9) {
            const k = Math.abs(i) * 0.2;
            line(ctx, '#f1f5f9', 3, [[i, 0], [i - 6, -20 + k]]);
            line(ctx, '#f1f5f9', 3, [[i, 0], [i - 6, 20 - k]]);
          }
          ell(ctx, '#f1f5f9', -46, 0, 14, 12); ell(ctx, '#1f2937', -50, -2, 2.6, 2.6); poly(ctx, '#f1f5f9', [[34, 0], [54, -14], [54, 14]]); } },
      ] },
    { // indifferenziato
      colors: ['#c084fc', '#f472b6', '#38bdf8', '#fb923c', '#94a3b8'],
      v: [
        { noun: 'calzino', art: 'Un', g: 0, draw(ctx, c, rg) {
          rect(ctx, c, -16, -46, 32, 58, 6); poly(ctx, c, [[-16, 4], [16, 4], [44, 22], [36, 40], [-16, 32]]); ell(ctx, c, 38, 31, 10, 9);
          rect(ctx, shade(c, -0.3), -16, -46, 32, 10, 3); rect(ctx, 'rgba(255,255,255,.55)', -16, -22, 32, 7); rect(ctx, 'rgba(255,255,255,.55)', -16, -8, 32, 7);
          ell(ctx, '#f1f5f9', 20, 30, 5, 4); } },
        { noun: 'sacchetto annodato', art: 'Un', g: 0, draw(ctx, c, rg) {
          blob(ctx, '#475569', rg, 42, 14, 0.12); poly(ctx, '#475569', [[-8, -38], [-22, -56], [-4, -46], [4, -58], [8, -38]]); ell(ctx, W, -14, -12, 6, 14);
          line(ctx, 'rgba(0,0,0,.25)', 2, [[-20, 8], [10, 24]]); ell(ctx, c, rnd(rg, -14, 14), rnd(rg, 8, 22), 6, 4); } },
        { noun: 'spugna', art: 'Una', g: 1, draw(ctx, c, rg) {
          rect(ctx, '#facc15', -42, -22, 84, 46, 8); rect(ctx, c, -42, -22, 84, 14, 7);
          for (let i = 0; i < 9; i++) ell(ctx, 'rgba(120,53,15,.5)', rnd(rg, -34, 34), rnd(rg, -2, 18), rnd(rg, 2, 4.5), rnd(rg, 2, 4.5)); rect(ctx, W, -36, -16, 40, 3, 2); } },
      ] },
  ];

  // Rifiuti speciali, con disegno e descrizione fatti apposta.
  const SAUCE = {
    noun: 'barattolo di sugo', art: 'Un', g: 0,
    curio: ['Ha ancora un po\' di sugo sul fondo: la nonna dice che si può usare.', 'Il coperchio fa "pop" ogni volta, senza eccezioni.', 'Un tempo condiva una domenica memorabile.', 'Rosso fuori, rosso dentro.'],
    tip: 'Svuota e sciacqua: il vetro va nella cassa del vetro; il coperchio di metallo, a parte.',
    draw(ctx, c, rg) {
      rect(ctx, 'rgba(255,255,255,.25)', -34, -30, 68, 72, 14); rect(ctx, '#dc2626', -34, -8, 68, 50, 14); rect(ctx, '#dc2626', -34, -8, 68, 20);
      rect(ctx, '#b91c1c', -34, 30, 68, 12, 10); rect(ctx, '#e5e7eb', -30, -46, 60, 16, 4);
      for (let i = -24; i <= 20; i += 12) rect(ctx, '#b91c1c', i, -46, 6, 16);
      rect(ctx, '#fef3c7', -26, -6, 52, 30, 3); ell(ctx, '#ef4444', 0, 9, 9, 9); poly(ctx, '#22c55e', [[-3, 0], [0, -4], [3, 0], [8, -1], [3, 3]]);
      rect(ctx, W, -28, -24, 6, 58, 3); } };
  const BALCONY = {
    noun: 'pelato al balcone', art: 'Un', g: 0,
    tip: 'Va messo nell\'organico a testa in giù.',
    compose(rg) {
      const adj = ['imperturbabile', 'pensieroso', 'vigile', 'sereno', 'immobile'].sort(() => rg() - 0.5).slice(0, 2);
      const place = ['Avvistato al terzo piano, sempre sullo stesso balcone.', 'Presente ogni mattina, prima ancora del giornalaio.', 'Si ferma a guardare il traffico da prima che esistesse il semaforo.'];
      const curio = ['Giudica in silenzio il modo in cui parcheggiate.', 'Ha un parere su tutto e non gli serve che glielo chiediate.', 'Con le braccia incrociate sembra dire: "ai miei tempi".', 'Se lo salutate, annuisce. Una volta sola.'];
      return `Un pelato al balcone ${adj[0]} e ${adj[1]}. ${pick(rg, place)} ${pick(rg, curio)}`;
    },
    draw(ctx, c, rg) {
      rect(ctx, '#e5e7eb', -24, -28, 48, 50, 8); rect(ctx, '#cbd5e1', -24, -28, 10, 50, 4);
      rect(ctx, '#e0ac81', -4, -34, 8, 10); ell(ctx, '#e0ac81', 0, -48, 17, 19); ell(ctx, '#e0ac81', -17, -47, 4, 6); ell(ctx, '#e0ac81', 17, -47, 4, 6);
      ell(ctx, 'rgba(255,255,255,.5)', -6, -58, 6, 3); line(ctx, '#3b2a1c', 2.6, [[-10, -53], [-3, -51]]); line(ctx, '#3b2a1c', 2.6, [[10, -53], [3, -51]]);
      ell(ctx, '#1f2937', -6, -48, 2, 2); ell(ctx, '#1f2937', 6, -48, 2, 2); line(ctx, '#7a3b2e', 2, [[-5, -38], [5, -38]]);
      line(ctx, '#e0ac81', 9, [[-26, -10], [24, -22]]); line(ctx, '#e0ac81', 9, [[26, -10], [-24, -22]]); ell(ctx, '#d99a6d', -26, -10, 6, 6); ell(ctx, '#d99a6d', 26, -10, 6, 6);
      rect(ctx, '#64748b', -58, 34, 116, 9, 2); rect(ctx, '#94a3b8', -60, 0, 120, 6, 3);
      for (let i = -52; i <= 52; i += 13) rect(ctx, '#94a3b8', i - 2, 6, 4, 28); } };
  // Descrizioni scritte a mano (il disegno resta quello generato dalla parola).
  const FIXED_TEXT = {
    IniinI: 'di TututututuTTE le categorie... eiie...\nNon avesse... esse.. AGITOH\nQuesto era un problema UN PROBLEMA\nChe oggi uhu... uhu\nNoi crediamo\nInquadauqnI\nAddigngniddA',
  };
  const YTP = {
    noun: 'YTP', art: 'Un', g: 0,
    tip: 'Va nell\'organico, ovviamente. Ascoltare a basso volume.',
    compose(rg) {
      const adj = ['incomprensibile', 'rumoroso', 'ripetuto', 'a volume altissimo', 'tritato', 'molto consigliato'].sort(() => rg() - 0.5).slice(0, 2);
      const place = ['Trovato alle 3 di notte, dopo il quinto video consigliato.', 'Condiviso in chat senza alcuna spiegazione.', 'Scoperto per caso, e poi non si è più smesso.'];
      const curio = ['Dura 47 secondi e ne sono bastati 10 per perdere la ragione.', 'Contiene lo stesso suono ripetuto 38 volte, e funziona ogni volta.', 'Ha più effetti sonori che parole.', 'Se lo guardi al contrario, ha ancora più senso.'];
      return `Un YTP ${adj[0]} e ${adj[1]}. ${pick(rg, place)} ${pick(rg, curio)}`;
    },
    draw(ctx, c, rg) {
      rect(ctx, '#111827', -56, -44, 112, 86, 8); rect(ctx, '#1f2937', -50, -38, 100, 64, 4);
      rect(ctx, '#5b3a1e', -22, 4, 44, 20, 8); rect(ctx, '#6b4423', -16, -8, 32, 16, 7); rect(ctx, '#7a4d2a', -9, -18, 18, 13, 6); poly(ctx, '#7a4d2a', [[-4, -18], [4, -18], [0, -28]]);
      ell(ctx, '#fff', -6, -2, 3.6, 4); ell(ctx, '#fff', 6, -2, 3.6, 4); ell(ctx, '#111', -6, -1, 1.6, 1.6); ell(ctx, '#111', 6, -1, 1.6, 1.6); line(ctx, '#111', 1.6, [[-4, 7], [4, 7]]);
      for (let i = 0; i < 5; i++) rect(ctx, ['rgba(239,68,68,.55)', 'rgba(34,211,238,.55)', 'rgba(250,204,21,.5)'][i % 3], -50 + rnd(rg, -6, 6), -36 + i * 12 + rnd(rg, -3, 3), rnd(rg, 30, 90), rnd(rg, 3, 7));
      for (let y = -38; y < 26; y += 4) rect(ctx, 'rgba(0,0,0,.25)', -50, y, 100, 1);
      ctx.font = 'bold 20px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ef4444'; ctx.fillText('YTP', -29, -20); ctx.fillStyle = '#22d3ee'; ctx.fillText('YTP', -25, -22); ctx.fillStyle = '#fff'; ctx.fillText('YTP', -27, -21);
      rect(ctx, '#374151', -50, 32, 100, 5, 2); rect(ctx, '#ef4444', -50, 32, rnd(rg, 30, 80), 5, 2); poly(ctx, '#fff', [[-48, 38], [-48, 44], [-43, 41]].map(([x, y]) => [x, y - 2])); } };
  // Parole che nella descrizione ne citano un'altra.
  const MENTIONS = { WeeW: 'CiaaiC', CiaaiC: 'WeeW' };
  const MENTION_TEXT = [
    (o) => `Si dice sia in ottimi rapporti con ${o}.`,
    (o) => `Non dirlo a nessuno, ma con ${o} c'è un debito di gratitudine.`,
    (o) => `Spesso è in compagnia di ${o}.`,
  ];
  const SPECIAL_ITEMS = { SooS: SAUCE, SaaS: SAUCE, IniinI: BALCONY, PooP: YTP };
  const PARTICIPLES = [['Trovato', 'Trovata'], ['Recuperato', 'Recuperata'], ['Abbandonato', 'Abbandonata'], ['Dimenticato', 'Dimenticata'], ['Ripescato', 'Ripescata']];
  const PLACES = ['dietro un vecchio frigorifero', 'sul fondo di una borsa', 'in un cassonetto del quartiere', 'sotto un divano', 'durante il trasloco di un cugino',
    'dopo una festa di compleanno', 'nel garage di un nonno', 'sul nastro, di martedì', 'dentro uno zaino dimenticato', 'accanto a una macchinetta del caffè'];
  const ADJ = [['sbiadito', 'sbiadita'], ['ammaccato', 'ammaccata'], ['misterioso', 'misteriosa'], ['stanco', 'stanca'], ['elegante', 'elegante'], ['curioso', 'curiosa'], ['consumato', 'consumata'], ['orgoglioso', 'orgogliosa']];
  // Frasi senza concordanza di genere, valide per qualsiasi oggetto del tipo.
  const CURIO = [
    ['Ha vissuto una vita avventurosa, a sentire i diretti interessati.', 'Una volta conteneva qualcosa di importantissimo. Nessuno ricorda cosa.', 'Se ci avvicini l\'orecchio, fa un leggero eco.', 'Si crede un pezzo da collezione.'],
    ['Ha letto più notizie di un edicolante.', 'Dentro, un tempo, c\'era un ottimo consiglio. Purtroppo è sparito.', 'Si piega con grande dignità.', 'Un tempo era un albero e non lo dimentica.'],
    ['Brilla anche quando nessuno guarda.', 'Ha visto brindisi memorabili.', 'Controluce, fa gli occhi dolci.', 'Fragile fuori, tenace dentro.'],
    ['Quando cade, il suo suono è sempre un po\' cupo.', 'Ha resistito a tre traslochi e a un cognato.', 'Ama farsi trasformare in qualcosa di nuovo.', 'Ha un debole per i magneti.'],
    ['Profuma ancora di bosco, ma solo se lo si vuole credere.', 'Ha un nodo che sembra un sorriso.', 'Ha fatto da sgabello, da scaffale e, per un attimo, da trono.', 'Sa di segatura e di buoni propositi.'],
    ['Dal compost nasce terra di prima qualità.', 'Aveva un futuro da pranzo importante.', 'Piace molto alle mosche; ai vicini molto meno.', 'Ha una data di scadenza che nessuno ha letto.'],
    ['Nessuno sa da dove arrivi, e non parla.', 'Impossibile da riciclare, difficile da disprezzare.', 'Ha già cambiato tre proprietari e nessuno ne sente la mancanza.', 'Resta lì, con il suo mistero.'],
  ];
  const TIPS = ['Sciacqua e schiaccia prima di buttare: occupa meno spazio.', 'Piega e appiattisci: più carta entra in un solo viaggio.', 'Svuota e togli il tappo: il vetro si ricicla all\'infinito.',
    'Vuota e schiaccia: il metallo si ricicla all\'infinito.', 'Solo legno non verniciato: chiodi e viti vanno tolti.', 'Meglio se compostato: ritorna terra.', 'Se proprio non sai dove metterlo, qui va bene.'];
  const RARITY = { 4: ['Comune', '★'], 6: ['Non comune', '★★'], 8: ['Rarissimo', '★★★'] };
  const WEIGHT = { 4: 'leggero', 6: 'di peso medio', 8: 'pesantissimo' };

  // Dati deterministici di una parola: variante, colore, descrizione.
  function info(word) {
    const cat = M.categoryOf(word);
    const rg = M.rngFor('scheda', word);
    const def = ITEMS[cat];
    const special = SPECIAL_ITEMS[word] || null;
    const variant = special || def.v[Math.floor(rg() * def.v.length)];
    const color = pick(rg, def.colors);
    const adjs = ADJ.slice().sort(() => rg() - 0.5).slice(0, 2).map((a) => a[variant.g]);
    const part = pick(rg, PARTICIPLES)[variant.g];
    const lenInfo = M.lenInfo(word.length);
    const text = FIXED_TEXT[word] || (special && special.compose ? special.compose(rg) : `${variant.art} ${variant.noun} ${adjs[0]} e ${adjs[1]}. ${part} ${pick(rg, PLACES)}. ${pick(rg, special && special.curio ? special.curio : CURIO[cat])}`);
    const fullText = word in MENTIONS ? `${text} ${pick(rg, MENTION_TEXT)(MENTIONS[word])}` : text;
    return {
      cat, variant, color, text: fullText, tip: special ? special.tip : TIPS[cat], seedKey: word,
      rarity: RARITY[word.length][0], stars: RARITY[word.length][1], weight: WEIGHT[word.length], points: lenInfo.base, noun: variant.noun,
    };
  }

  function drawItem(ctx, word, w, h) {
    const d = info(word), rg = M.rngFor('disegno', word), cat = M.CATS[d.cat];
    const bg = ctx.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h / 2, w * 0.75);
    bg.addColorStop(0, M.shade(cat.color, -0.45));
    bg.addColorStop(1, '#10141a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h * 0.52);
    const s = (w / 200) * rnd(rg, 1.0, 1.25);
    ctx.scale(s, s);
    ell(ctx, 'rgba(0,0,0,.35)', 0, 56, 52, 8);
    ctx.rotate(rnd(rg, -0.2, 0.2));
    d.variant.draw(ctx, d.color, rg);
    ctx.restore();
    ctx.fillStyle = cat.color;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(d.stars, 10, 20);
  }

  M.itemInfo = info;
  M.drawItem = drawItem;
})();
