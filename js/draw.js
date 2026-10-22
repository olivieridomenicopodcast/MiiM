// Disegno procedurale dei personaggi (nessun asset esterno).
(function () {
  const M = (window.MiiM = window.MiiM || {});

  M.HAIR_COLORS = ['#1b1b1b', '#4a2c17', '#8b5a2b', '#d9a441', '#c0392b', '#9aa0a6'];
  M.SKINS = ['#fde0c8', '#f5cba7', '#e0ac81', '#c68642', '#8d5524', '#5c3a21'];
  M.SHIRTS = [
    '#e53935', '#fb8c00', '#fdd835', '#7cb342', '#2e7d32', '#00acc1', '#1e88e5',
    '#3949ab', '#8e24aa', '#d81b60', '#6d4c41', '#f5f5f5', '#9e9e9e', '#37474f', '#ff8a80',
  ];
  M.HAIRS = [
    { id: 'calvo', name: 'Calvo' },
    { id: 'corto', name: 'Corti' },
    { id: 'lungo', name: 'Lunghi' },
  ];

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // (x, y) = piedi. o: {scale, facing, phase, moving, carry, name}
  function drawPerson(ctx, x, y, ch, o) {
    o = o || {};
    const s = o.scale || 1;
    const skin = M.SKINS[ch.skin];
    const shirt = M.SHIRTS[ch.shirt];
    const hairC = M.HAIR_COLORS[ch.hairColor];
    const f = ch.gender === 'f';
    const swing = o.moving ? Math.sin(o.phase || 0) : 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (o.facing < 0 ? -1 : 1), s);

    // capelli lunghi (dietro)
    if (ch.hair === 'lungo') {
      ctx.fillStyle = hairC;
      rr(ctx, -15, -85, 30, f ? 50 : 40, 10);
      ctx.fill();
    }
    // gambe
    ctx.fillStyle = '#2d3748';
    rr(ctx, -10 + swing * 6, -26, 9, 26, 3);
    ctx.fill();
    rr(ctx, 1 - swing * 6, -26, 9, 26, 3);
    ctx.fill();
    ctx.fillStyle = '#111';
    rr(ctx, -12 + swing * 6, -4, 13, 5, 2);
    ctx.fill();
    rr(ctx, 0 - swing * 6, -4, 13, 5, 2);
    ctx.fill();
    // gonna
    if (f) {
      ctx.fillStyle = shade(shirt, -0.18);
      ctx.beginPath();
      ctx.moveTo(-12, -32);
      ctx.lineTo(12, -32);
      ctx.lineTo(18, -19);
      ctx.lineTo(-18, -19);
      ctx.closePath();
      ctx.fill();
    }
    // busto
    ctx.fillStyle = shirt;
    if (f) rr(ctx, -12, -58, 24, 30, 6);
    else rr(ctx, -15, -58, 30, 34, 6);
    ctx.fill();
    // braccia
    const sx = f ? 12 : 15;
    ctx.lineCap = 'round';
    ctx.lineWidth = 8;
    ctx.strokeStyle = shirt;
    for (const side of [-1, 1]) {
      const hx = o.carry ? side * 21 : side * (sx + 3) + side * swing * 2;
      const hy = o.carry ? -46 : -32 + (side * swing * 5);
      ctx.beginPath();
      ctx.moveTo(side * sx, -54);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(hx, hy, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // collo e testa
    ctx.fillStyle = skin;
    ctx.fillRect(-4, -63, 8, 7);
    ctx.beginPath();
    ctx.arc(0, -73, 13, 0, Math.PI * 2);
    ctx.fill();
    // capelli (sopra)
    if (ch.hair !== 'calvo') {
      ctx.fillStyle = hairC;
      ctx.beginPath();
      ctx.arc(0, -75, 14, Math.PI, 0);
      ctx.lineTo(14, -72);
      ctx.lineTo(7, -78);
      ctx.lineTo(-14, -72);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.ellipse(-4, -81, 4, 2, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // viso
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-1, -72, 1.8, 0, Math.PI * 2);
    ctx.arc(7, -72, 1.8, 0, Math.PI * 2);
    ctx.fill();
    if (f) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-3, -74);
      ctx.lineTo(-4.5, -75.5);
      ctx.moveTo(9, -74);
      ctx.lineTo(10.5, -75.5);
      ctx.stroke();
    }
    ctx.strokeStyle = f ? '#b03a3a' : '#7a3b2e';
    ctx.lineWidth = f ? 2 : 1.5;
    ctx.beginPath();
    ctx.arc(3.5, -67, 3, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();

    if (o.name) {
      ctx.save();
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.fillStyle = '#fff';
      ctx.strokeText(o.name, x, y - 94 * s);
      ctx.fillText(o.name, x, y - 94 * s);
      ctx.restore();
    }
  }

  M.drawPerson = drawPerson;
  M.rr = rr;
  M.shade = shade;
})();
