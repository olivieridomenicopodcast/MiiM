// Modalità extra: Dominò dei palindromi, Il fiume dei riflessi, Mercatino dell'usato.
// Ogni modalità espone la stessa interfaccia del nastro: start(), stop(), setPaused(), persist(), setKey(), press(), slot, over, paused.
(function () {
  const M = (window.MiiM = window.MiiM || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mirrorHTML = (w) => [...w].map((c, i) => (i >= w.length / 2 ? `<span class="mir">${esc(c)}</span>` : esc(c))).join('');
  const base = (len) => M.lenInfo(len).base;

  // Disegno del rifiuto in una piccola immagine, memorizzato per parola/dimensione.
  const sprites = {};
  M.sprite = function (word, size) {
    const k = word + ':' + size;
    if (!sprites[k]) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      M.drawItem(c.getContext('2d'), word, size, size, true);
      sprites[k] = c;
    }
    return sprites[k];
  };
  const spriteURL = (word, size) => {
    const c = M.sprite(word, size);
    if (!c.url) c.url = c.toDataURL();
    return c.url;
  };

  // Registra una parola nel Pokédex generale. Ritorna true se è nuova.
  function register(w) {
    const dex = M.Storage.dex();
    if (dex[w.text]) {
      dex[w.text].n++;
      return false;
    }
    dex[w.text] = { cat: w.cat, len: w.len, n: 1 };
    return true;
  }

  // Chiude una partita di modalità extra: aggiorna record e statistiche, poi mostra il riepilogo.
  function finish(mode, summary) {
    const st = mode.slot.stats;
    st.modeBest = st.modeBest || {};
    st.modeRuns = st.modeRuns || {};
    const prev = st.modeBest[mode.id] || 0;
    summary.record = summary.score > prev;
    st.modeBest[mode.id] = Math.max(prev, summary.score);
    st.modeRuns[mode.id] = (st.modeRuns[mode.id] || 0) + 1;
    summary.best = st.modeBest[mode.id];
    mode.over = true;
    mode.hooks.persist();
    mode.hooks.onEnd(summary);
  }

  const noop = () => {};
  const Base = { setPaused: noop, setKey: noop, press: noop, persist() { this.hooks.persist(); }, noPause: true };

  // =====================================================================
  // 1 · DOMINÒ DEI PALINDROMI
  // Ogni parola ha la stessa lettera ai due estremi (specchiata a destra). Si attacca alla catena una parola che
  // abbia la stessa lettera OPPURE lo stesso tipo di rifiuto (colore) di un'estremità. Vince chi finisce le parole.
  // =====================================================================
  class Domino {
    constructor(root, slot, hooks) {
      Object.assign(this, { root, slot, hooks, id: 'domino', over: false, paused: false });
      this.onClick = (e) => this.click(e);
    }

    start() {
      this.s = { n: 0, chain: [], hand: [], opp: [], pile: 30, turn: 'p', passes: 0, pending: null, score: 0, played: 0, newWords: 0, msg: 'Tocca una parola per giocarla.' };
      this.s.chain.push(this.tile());
      for (let i = 0; i < 6; i++) {
        this.s.hand.push(this.tile());
        this.s.opp.push(this.tile());
      }
      this.root.addEventListener('click', this.onClick);
      this.render();
    }

    stop() {
      clearTimeout(this.timer);
      this.root.removeEventListener('click', this.onClick);
    }

    tile() {
      const s = this.s;
      const avoid = new Set([...s.chain, ...s.hand, ...s.opp].map((t) => t.text));
      return M.generate(this.slot.seed, 'd' + s.n++, avoid);
    }

    // Come si attacca una parola a un'estremità: stessa lettera, stesso tipo, o entrambe (doppio punteggio).
    match(t, end) {
      const l = t.text[0].toLowerCase() === end.text[0].toLowerCase();
      const c = t.cat === end.cat;
      return l && c ? 'both' : l ? 'letter' : c ? 'color' : null;
    }

    options(t) {
      const ch = this.s.chain;
      return { L: this.match(t, ch[0]), R: this.match(t, ch[ch.length - 1]) };
    }

    playable(t) {
      const o = this.options(t);
      return !!(o.L || o.R);
    }

    place(who, i, side) {
      const s = this.s, hand = who === 'p' ? s.hand : s.opp;
      const t = hand.splice(i, 1)[0];
      const how = this.options(t)[side];
      if (side === 'L') s.chain.unshift(t);
      else s.chain.push(t);
      s.passes = 0;
      if (who === 'p') {
        const pts = base(t.len) * (how === 'both' ? 2 : 1);
        s.score += pts;
        s.played++;
        if (register(t)) s.newWords++;
        s.msg = `+${pts} punti${how === 'both' ? ' (stessa lettera e stesso tipo: doppio!)' : ''}`;
      } else {
        s.msg = `Gino gioca ${t.text}.`;
      }
      M.sfx(who === 'p' ? 'ok' : 'pick');
    }

    click(e) {
      const b = e.target.closest('[data-m]');
      if (!b || this.over) return;
      const s = this.s, a = b.dataset.m;
      if (a === 'quit') return this.hooks.onQuit();
      if (s.turn !== 'p') return;
      if (a === 'play') {
        const i = +b.dataset.i, t = s.hand[i], o = this.options(t);
        if (!o.L && !o.R) {
          s.msg = 'Non si attacca: serve la stessa lettera o lo stesso colore di un\'estremità.';
          M.sfx('bad');
          return this.render();
        }
        if (o.L && o.R) {
          s.pending = i;
          s.msg = 'Da che parte la attacchi?';
          return this.render();
        }
        this.place('p', i, o.L ? 'L' : 'R');
        this.afterPlayer();
      } else if (a === 'side' && s.pending !== null) {
        const i = s.pending;
        s.pending = null;
        this.place('p', i, b.dataset.side);
        this.afterPlayer();
      } else if (a === 'draw') {
        if (s.hand.some((t) => this.playable(t))) return;
        if (s.pile > 0) {
          s.pile--;
          s.hand.push(this.tile());
          if (this.playable(s.hand[s.hand.length - 1])) {
            s.msg = 'Hai pescato una parola che si attacca!';
            return this.render();
          }
          s.msg = 'Pescata, ma non si attacca: passi.';
        } else s.msg = 'Pila finita: passi.';
        s.passes++;
        this.endTurn('o');
      }
    }

    afterPlayer() {
      if (!this.s.hand.length) return this.end();
      this.endTurn('o');
    }

    endTurn(next) {
      const s = this.s;
      s.turn = next;
      s.pending = null;
      this.render();
      if (s.passes >= 2) return this.end();
      if (next === 'o') this.timer = setTimeout(() => this.opponent(), 1000);
    }

    opponent() {
      const s = this.s;
      if (this.over) return;
      const pick = () => {
        let best = null;
        s.opp.forEach((t, i) => {
          const o = this.options(t);
          for (const side of ['L', 'R']) {
            if (!o[side]) continue;
            const v = (o[side] === 'both' ? 100 : 0) + t.len;
            if (!best || v > best.v) best = { i, side, v };
          }
        });
        return best;
      };
      let m = pick();
      if (!m && s.pile > 0) {
        s.pile--;
        s.opp.push(this.tile());
        m = pick();
      }
      if (m) {
        this.place('o', m.i, m.side);
        if (!s.opp.length) return this.end();
      } else {
        s.passes++;
        s.msg = 'Gino non ha parole che si attaccano: passa.';
      }
      this.endTurn('p');
    }

    end() {
      const s = this.s;
      s.turn = 'x';
      let result;
      if (!s.hand.length) result = 'win';
      else if (!s.opp.length) result = 'lose';
      else result = s.hand.length < s.opp.length ? 'win' : s.hand.length > s.opp.length ? 'lose' : 'draw';
      const bonus = result === 'win' ? 100 + 10 * s.opp.length : 0;
      const text = { win: 'Hai vinto la partita!', lose: 'Ha vinto Gino.', draw: 'Pareggio.' }[result];
      finish(this, {
        title: 'Dominò finito!', score: s.score + bonus, saved: s.played, newWords: s.newWords, savedLabel: 'Parole giocate',
        lines: [`<div class="stat"><span>Esito</span><b>${text}</b></div>`, `<div class="stat"><span>Bonus vittoria</span><b>${bonus}</b></div>`],
      });
    }

    tileHTML(t, extra = '') {
      const col = M.CATS[t.cat].color;
      return `<span class="tile ${extra}" style="--c:${col}"><span class="end">${esc(t.text[0])}</span>` +
        `<span class="mid"><img alt="" src="${spriteURL(t.text, 56)}"><b style="color:${col}">${mirrorHTML(t.text)}</b></span>` +
        `<span class="end"><span class="mir">${esc(t.text[0])}</span></span></span>`;
    }

    render() {
      const s = this.s, ch = s.chain;
      const can = s.turn === 'p' && s.hand.some((t) => this.playable(t));
      const hand = s.hand.map((t, i) => {
        const ok = this.playable(t);
        return `<button class="tileb ${ok ? 'ok' : 'no'}" data-m="play" data-i="${i}" ${s.turn === 'p' ? '' : 'disabled'}>${this.tileHTML(t)}</button>`;
      }).join('');
      this.root.innerHTML = `<div class="card col" id="dom">
        <h2>Dominò dei palindromi <small style="color:#a9b4c2;font-weight:400">· ${esc(this.slot.character.name)} contro Gino</small></h2>
        <div class="row spread"><span>Punti <b>${s.score}</b></span><span>Gino: <b>${s.opp.length}</b> parole</span><span>Pila: <b>${s.pile}</b></span></div>
        <p class="muted">Attacca una parola con la <b>stessa lettera</b> o lo <b>stesso colore</b> di un'estremità. Vince chi finisce per primo le parole.
          Estremità aperte: <b>${esc(ch[0].text[0])}</b> <span style="color:${M.CATS[ch[0].cat].color}">●</span> a sinistra, <b>${esc(ch[ch.length - 1].text[0])}</b> <span style="color:${M.CATS[ch[ch.length - 1].cat].color}">●</span> a destra.</p>
        <div class="chain" id="chain">${ch.map((t, i) => this.tileHTML(t, i === 0 || i === ch.length - 1 ? 'edge' : '')).join('')}</div>
        <p id="msg" style="min-height:22px;color:#ffd166">${esc(s.msg)}</p>
        ${s.pending !== null ? '<div class="row"><button data-m="side" data-side="L">← Sinistra</button><button data-m="side" data-side="R">Destra →</button></div>' : ''}
        <div class="hand">${hand}</div>
        <div class="row">
          <button class="alt" data-m="draw" ${s.turn === 'p' && !can && s.pending === null ? '' : 'disabled'}>${s.pile > 0 ? 'Pesca una parola' : 'Passa'}</button>
          <button class="danger" data-m="quit">Esci</button>
        </div></div>`;
      const c = this.root.querySelector('#chain');
      if (c) c.scrollLeft = (c.scrollWidth - c.clientWidth) / 2;
    }
  }
  Object.assign(Domino.prototype, Base);

  // =====================================================================
  // 2 · IL FIUME DEI RIFLESSI
  // Rifiuti scendono lungo il fiume con il loro riflesso nell'acqua. Se il riflesso è diverso, è un'illusione: evitala!
  // =====================================================================
  const W = 960, H = 540, RX0 = 190, RX1 = 770, BOAT_Y = 462;

  class River {
    constructor(canvas, slot, hooks) {
      Object.assign(this, { canvas, slot, hooks, id: 'fiume', over: false, paused: false, keys: new Set(), pointerX: null });
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      this.ctx = canvas.getContext('2d');
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.onKeyDown = (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key.toLowerCase();
        if (k === 'p' || k === 'escape') return e.repeat ? 0 : this.hooks.onPause();
        if (k === 'arrowleft' || k === 'a') { e.preventDefault(); this.keys.add('left'); this.pointerX = null; }
        if (k === 'arrowright' || k === 'd') { e.preventDefault(); this.keys.add('right'); this.pointerX = null; }
      };
      this.onKeyUp = (e) => {
        const k = e.key.toLowerCase();
        if (k === 'arrowleft' || k === 'a') this.keys.delete('left');
        if (k === 'arrowright' || k === 'd') this.keys.delete('right');
      };
      this.onPointer = (e) => {
        if (e.type === 'pointerdown' || e.buttons) {
          const rc = canvas.getBoundingClientRect();
          this.pointerX = ((e.clientX - rc.left) * W) / rc.width;
        }
      };
    }

    start() {
      this.speed = 95;
      this.level = 0;
      this.r = { t: 0, score: 0, lives: 3, streak: 0, saved: 0, newWords: 0, items: [], spawnIn: 1.2, idx: 0, boatX: W / 2, pops: [], toasts: [], shake: 0 };
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      this.canvas.addEventListener('pointerdown', this.onPointer);
      this.canvas.addEventListener('pointermove', this.onPointer);
      this.toast('Controlla il riflesso: se è diverso dal rifiuto, è un\'illusione. Evitala!');
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    }

    stop() {
      cancelAnimationFrame(this.raf);
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      this.canvas.removeEventListener('pointerdown', this.onPointer);
      this.canvas.removeEventListener('pointermove', this.onPointer);
    }

    setPaused(p) {
      if (this.over) return;
      this.paused = p;
      if (p) this.keys.clear();
      this.last = performance.now();
    }

    setKey(k, down) {
      if (down) { this.keys.add(k); this.pointerX = null; } else this.keys.delete(k);
    }

    toast(text) {
      this.r.toasts.push({ text, t: 0 });
      if (this.r.toasts.length > 2) this.r.toasts.shift();
    }

    frame(now) {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!this.paused && !this.over) this.update(dt);
      this.render();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    }

    update(dt) {
      const r = this.r, seed = this.slot.seed;
      r.t += dt;
      const level = Math.floor(r.t / 20);
      this.speed = Math.min(230, 95 + level * 12);
      this.level = level;
      // spawn
      r.spawnIn -= dt;
      if (r.spawnIn <= 0) {
        const i = r.idx++;
        const w = M.makeSeq(seed, 'f', i);
        const rg = M.rngFor(seed, 'fi' + i);
        const illusion = rg() < Math.min(0.45, 0.25 + level * 0.03);
        let refl = w;
        if (illusion) {
          const noun = M.itemInfo(w.text).noun;
          for (let k = 0; k < 8; k++) {
            refl = M.generate(seed, 'fr' + i + ':' + k, new Set([w.text]));
            if (M.itemInfo(refl.text).noun !== noun) break;
          }
        }
        r.items.push({ x: RX0 + 60 + rg() * (RX1 - RX0 - 120), y: -80, w, refl, illusion, ph: rg() * 6 });
        r.spawnIn = Math.max(0.7, 1.7 - level * 0.1) * (0.8 + rg() * 0.4);
      }
      // barca
      const dir = (this.keys.has('right') ? 1 : 0) - (this.keys.has('left') ? 1 : 0);
      if (dir) r.boatX += dir * 330 * dt;
      else if (this.pointerX !== null) r.boatX += clamp(this.pointerX - r.boatX, -330 * dt, 330 * dt);
      r.boatX = clamp(r.boatX, RX0 + 40, RX1 - 40);
      // rifiuti
      for (const it of r.items.slice()) {
        it.y += this.speed * dt;
        if (Math.abs(it.x - r.boatX) < 46 && Math.abs(it.y - (BOAT_Y - 10)) < 48) {
          r.items.splice(r.items.indexOf(it), 1);
          this.hit(it);
        } else if (it.y > H + 90) {
          r.items.splice(r.items.indexOf(it), 1);
          if (!it.illusion) this.miss(it);
        }
      }
      for (const p of r.pops) { p.t += dt; p.y -= 30 * dt; }
      r.pops = r.pops.filter((p) => p.t < 1.1);
      for (const t of r.toasts) t.t += dt;
      r.toasts = r.toasts.filter((t) => t.t < 4);
      r.shake = Math.max(0, r.shake - dt);
      if (r.lives <= 0 && !this.over) this.gameOver();
    }

    hit(it) {
      const r = this.r;
      if (it.illusion) {
        r.lives--;
        r.streak = 0;
        r.shake = 0.35;
        r.pops.push({ x: it.x, y: it.y, text: 'Illusione! −1 vita', color: '#ff6b6b', t: 0 });
        M.sfx('bad');
        return;
      }
      r.streak++;
      const mult = 1 + Math.min(4, Math.floor(r.streak / 5)) * 0.5;
      const pts = Math.round(base(it.w.len) * mult);
      r.score += pts;
      r.saved++;
      if (register(it.w)) {
        r.newWords++;
        this.toast('Nuovo nel Pokédex: ' + it.w.text);
      }
      r.pops.push({ x: it.x, y: it.y, text: '+' + pts, color: '#7CFC9A', t: 0 });
      M.sfx('ok');
    }

    miss(it) {
      const r = this.r;
      const pts = Math.round(base(it.w.len) / 2);
      r.score = Math.max(0, r.score - pts);
      r.streak = 0;
      r.pops.push({ x: clamp(it.x, 220, 740), y: H - 40, text: 'Persa -' + pts, color: '#ff6b6b', t: 0 });
    }

    gameOver() {
      const r = this.r;
      finish(this, { title: 'Fiume finito!', score: r.score, saved: r.saved, newWords: r.newWords, savedLabel: 'Rifiuti recuperati', time: r.t });
    }

    // ---------- disegno ----------
    text(ctx, word, x, y, size, color) {
      ctx.font = `bold ${size}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      const cw = ctx.measureText('M').width, x0 = x - (word.length * cw) / 2;
      for (let i = 0; i < word.length; i++) {
        ctx.save();
        ctx.translate(x0 + (i + 0.5) * cw, y);
        if (i >= word.length / 2) ctx.scale(-1, 1);
        ctx.fillText(word[i], 0, 0);
        ctx.restore();
      }
    }

    render() {
      const ctx = this.ctx, r = this.r;
      if (!r) return;
      ctx.save();
      if (r.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      // rive
      ctx.fillStyle = '#2f5d3a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#3d7a4b';
      for (let k = 0; k < 9; k++) {
        const y = (((k * 71 + r.t * this.speed * 0.6) % (H + 80)) - 40);
        for (const x of [60, 130, 840, 905]) { ctx.beginPath(); ctx.arc(x + (k % 2) * 14, y, 20 + (k % 3) * 4, 0, Math.PI * 2); ctx.fill(); }
      }
      // acqua
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1f5f8b');
      g.addColorStop(1, '#2a86b8');
      ctx.fillStyle = g;
      ctx.fillRect(RX0, 0, RX1 - RX0, H);
      ctx.strokeStyle = 'rgba(255,255,255,.1)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 14; k++) {
        const y = (k * 44 + r.t * this.speed * 0.9) % (H + 40) - 20;
        ctx.beginPath();
        for (let x = RX0; x <= RX1; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.04 + r.t * 2 + k) * 4);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.fillRect(RX0 - 6, 0, 6, H);
      ctx.fillRect(RX1, 0, 6, H);
      // rifiuti e riflessi
      for (const it of r.items) this.drawItem(ctx, it, r.t);
      // barca
      M.drawPerson(ctx, r.boatX, BOAT_Y + 6, this.slot.character, { scale: 0.95, facing: 1, carry: false, name: this.slot.character.name });
      ctx.fillStyle = '#8b5a2b';
      ctx.beginPath();
      ctx.moveTo(r.boatX - 50, BOAT_Y - 4);
      ctx.lineTo(r.boatX + 50, BOAT_Y - 4);
      ctx.lineTo(r.boatX + 36, BOAT_Y + 20);
      ctx.lineTo(r.boatX - 36, BOAT_Y + 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#a9743c';
      ctx.fillRect(r.boatX - 50, BOAT_Y - 7, 100, 5);
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.beginPath();
      ctx.ellipse(r.boatX, BOAT_Y + 24, 52, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // effetti
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (const p of r.pops) {
        ctx.globalAlpha = Math.min(1, (1.1 - p.t) * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      this.hud(ctx);
    }

    drawItem(ctx, it, t) {
      const col = M.CATS[it.w.cat].color, x = it.x, y = it.y;
      // riflesso (specchio verticale, un po' increspato); nelle illusioni mostra un altro rifiuto
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.translate(x + Math.sin(t * 3 + it.ph) * 2.5, y + 38);
      ctx.scale(1, -1);
      ctx.drawImage(M.sprite(it.refl.text, 72), -36, -72, 72, 72);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.4;
      this.text(ctx, it.refl.text, x + Math.sin(t * 3 + it.ph) * 2.5, y + 38 + 86, 15, M.CATS[it.refl.cat].color);
      ctx.restore();
      // rifiuto vero
      ctx.fillStyle = '#0f1318';
      M.rr(ctx, x - 40, y - 62, 80, 104, 9);
      ctx.fill();
      ctx.save();
      M.rr(ctx, x - 36, y - 36, 72, 72, 6);
      ctx.clip();
      ctx.drawImage(M.sprite(it.w.text, 72), x - 36, y - 36, 72, 72);
      ctx.restore();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = M.shade(col, -0.1);
      M.rr(ctx, x - 40, y - 62, 80, 104, 9);
      ctx.stroke();
      this.text(ctx, it.w.text, x, y - 49, it.w.len > 6 ? 12 : 15, col);
    }

    hud(ctx) {
      const r = this.r;
      ctx.fillStyle = 'rgba(8,10,14,.62)';
      ctx.fillRect(0, 0, W, 40);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = 'bold 18px system-ui, sans-serif';
      const mult = 1 + Math.min(4, Math.floor(r.streak / 5)) * 0.5;
      ctx.fillStyle = '#fff';
      ctx.fillText('Punti ' + r.score, 14, 21);
      ctx.fillStyle = '#ff6b8b';
      ctx.fillText('Vite ' + '♥'.repeat(Math.max(0, r.lives)) + '♡'.repeat(Math.max(0, 3 - r.lives)), 170, 21);
      ctx.fillStyle = mult > 1 ? '#ffd166' : '#9ca3af';
      ctx.fillText(`Serie ${r.streak} ×${mult}`, 350, 21);
      ctx.fillStyle = '#9ad1ff';
      ctx.fillText('Velocità ' + ((this.level || 0) + 1), 520, 21);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('Seme: ' + this.slot.seed, W - 12, 21);
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px system-ui, sans-serif';
      r.toasts.forEach((t, i) => {
        ctx.globalAlpha = clamp(4 - t.t, 0, 1);
        const tw = ctx.measureText(t.text).width + 24;
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        M.rr(ctx, W / 2 - tw / 2, 50 + i * 30, tw, 26, 13);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(t.text, W / 2, 64 + i * 30);
      });
      ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
    }
  }
  River.prototype.press = noop;
  River.prototype.persist = function () { this.hooks.persist(); };

  // =====================================================================
  // 3 · MERCATINO DELL'USATO
  // Dodici clienti propongono un rifiuto a un certo prezzo. Compri, contratti o rifiuti; a fine giornata rivendi tutto.
  // =====================================================================
  const VALUE = { 4: 20, 6: 55, 8: 140 };
  const CONDS = [['Usurato', 0.6, 0.3], ['Buono', 1, 0.45], ['Ottimo', 1.35, 0.25]];
  const TRENDS = [['▼ domanda bassa', 0.75], ['● normale', 1], ['▲ domanda alta', 1.35]];
  const GREET = ['«Lo teneva mia nonna, giuro.»', '«Affare unico, solo oggi!»', '«Non lo vedevo da anni, ma è ancora un gioiello.»', '«Mio cugino dice che vale una fortuna.»',
    '«L\'ho trovato in cantina. Ti interessa?»', '«È un pezzo raro, non buttarlo via.»', '«Ha un po\' di storia, ma funziona benissimo.»'];
  const CUSTOMERS = 12, START_CASH = 200, APPRAISAL = 10;

  class Market {
    constructor(root, slot, hooks) {
      Object.assign(this, { root, slot, hooks, id: 'mercatino', over: false, paused: false });
      this.onClick = (e) => this.click(e);
    }

    start() {
      const seed = this.slot.seed, rg = M.rngFor(seed, 'mt');
      this.trend = M.CATS.map(() => TRENDS[Math.floor(rg() * TRENDS.length)]);
      this.clients = [];
      for (let i = 0; i < CUSTOMERS; i++) {
        const w = M.makeSeq(seed, 'm', i), r = M.rngFor(seed, 'mc' + i);
        let x = r(), cond = CONDS[0];
        for (const c of CONDS) { if (x < c[2]) { cond = c; break; } x -= c[2]; }
        const special = w.text in M.SPECIAL ? 2.2 : 1;
        const value = Math.max(5, Math.round(VALUE[w.len] * cond[1] * this.trend[w.cat][1] * (0.9 + r() * 0.2) * special));
        const ask = Math.max(5, Math.round(value * (0.45 + r() * 1.0)));
        const floor = Math.round(ask * (0.55 + r() * 0.3));
        this.clients.push({ w, cond, value, ask, floor, greet: GREET[Math.floor(r() * GREET.length)], est: null });
      }
      this.s = { i: 0, cash: START_CASH, stock: [], msg: '', done: false, newWords: 0, bought: 0 };
      this.root.addEventListener('click', this.onClick);
      this.render();
    }

    stop() {
      this.root.removeEventListener('click', this.onClick);
    }

    buy(c, price, text) {
      const s = this.s;
      s.cash -= price;
      s.stock.push({ w: c.w, paid: price, value: c.value });
      s.bought++;
      if (register(c.w)) s.newWords++;
      s.msg = text;
      s.done = true;
      M.sfx('ok');
    }

    click(e) {
      const b = e.target.closest('[data-m]');
      if (!b || this.over) return;
      const s = this.s, a = b.dataset.m;
      if (a === 'quit') return this.hooks.onQuit();
      const c = this.clients[s.i];
      if (a === 'next') {
        s.i++;
        s.msg = '';
        s.done = false;
        if (s.i >= CUSTOMERS) return this.end();
      } else if (!s.done) {
        if (a === 'buy') {
          if (s.cash < c.ask) s.msg = 'Non hai abbastanza soldi.';
          else this.buy(c, c.ask, `Affare fatto: paghi ${c.ask} €.`);
        } else if (a === 'offer') {
          const offer = Math.round(c.ask * (1 - +b.dataset.p / 100));
          if (s.cash < offer) s.msg = 'Non hai abbastanza soldi.';
          else if (offer >= c.floor) this.buy(c, offer, `«D'accordo!» Paghi ${offer} € invece di ${c.ask} €.`);
          else { s.msg = '«Ma dai, così mi offendi!» Il cliente se ne va.'; s.done = true; M.sfx('bad'); }
        } else if (a === 'skip') {
          s.msg = 'Rifiuti: il cliente saluta.';
          s.done = true;
        } else if (a === 'appraise') {
          if (c.est !== null) return;
          if (s.cash < APPRAISAL) s.msg = 'Non hai abbastanza soldi per la perizia.';
          else {
            s.cash -= APPRAISAL;
            c.est = Math.round(c.value * (0.93 + ((c.ask * 7) % 14) / 100));
            s.msg = '';
          }
        }
      }
      this.render();
    }

    end() {
      const s = this.s;
      const total = s.stock.reduce((a, x) => a + x.value, 0);
      const final = s.cash + total;
      const profit = final - START_CASH;
      const lines = s.stock.map((x) => `<div class="stat"><span>${mirrorHTML(x.w.text)}</span><b style="color:${x.value >= x.paid ? '#7CFC9A' : '#ff6b6b'}">paghi ${x.paid} € · vale ${x.value} €</b></div>`);
      lines.unshift(`<div class="stat"><span>Cassa finale</span><b>${final} € (partivi da ${START_CASH} €)</b></div>`);
      finish(this, { title: 'Giornata finita!', score: Math.max(0, profit), saved: s.bought, newWords: s.newWords, savedLabel: 'Rifiuti comprati', lines });
    }

    render() {
      const s = this.s, c = this.clients[s.i], d = M.itemInfo(c.w.text), cat = M.CATS[c.w.cat];
      const trend = M.CATS.map((k, i) => `<span class="chip" style="color:${k.color};border-color:${k.color}66;font-size:12px">${k.name} ${this.trend[i][0]}</span>`).join('');
      const act = (m, label, extra = '', cls = '') => `<button class="${cls}" data-m="${m}" ${extra} ${s.done ? 'disabled' : ''}>${label}</button>`;
      this.root.innerHTML = `<div class="card col">
        <h2>Mercatino dell'usato <small style="color:#a9b4c2;font-weight:400">· cliente ${s.i + 1} di ${CUSTOMERS}</small></h2>
        <div class="row spread"><span>Cassa <b>${s.cash} €</b></span><span>In magazzino <b>${s.stock.length}</b></span></div>
        <div class="chips">${trend}</div>
        <div class="itemrow">
          <div class="col" style="align-items:center"><img alt="" src="${spriteURL(c.w.text, 200)}" style="width:200px;border-radius:10px">
            <b style="font-family:'Courier New',monospace;font-size:22px;color:${cat.color}">${mirrorHTML(c.w.text)}</b></div>
          <div class="col">
            <div class="stat"><span>Tipo</span><b style="color:${cat.color}">${cat.name} · ${d.noun}</b></div>
            <div class="stat"><span>Rarità</span><b>${d.rarity} ${d.stars}</b></div>
            <div class="stat"><span>Condizione</span><b>${c.cond[0]}</b></div>
            <div class="stat"><span>Chiede</span><b style="color:#ffd166">${c.ask} €</b></div>
            ${c.est !== null ? `<div class="stat"><span>Perizia dell'esperto</span><b>circa ${c.est} €</b></div>` : ''}
            <p style="white-space:pre-line;font-size:13px">${c.greet}\n${esc(d.text)}</p>
          </div>
        </div>
        <p style="min-height:22px;color:#ffd166">${esc(s.msg)}</p>
        <div class="row">
          ${act('buy', `Compra a ${c.ask} €`)}
          ${act('offer', 'Offri −10%', 'data-p="10"', 'alt')}${act('offer', 'Offri −25%', 'data-p="25"', 'alt')}${act('offer', 'Offri −40%', 'data-p="40"', 'alt')}
        </div>
        <div class="row">
          <button class="alt" data-m="appraise" ${s.done || c.est !== null ? 'disabled' : ''}>Perizia (${APPRAISAL} €)</button>
          ${act('skip', 'Rifiuta', '', 'alt')}
          ${s.done ? '<button class="big" data-m="next">Prossimo cliente ▶</button>' : ''}
          <button class="danger" data-m="quit">Esci</button>
        </div></div>`;
    }
  }
  Object.assign(Market.prototype, Base);

  M.MODES = [
    { id: 'nastro', name: 'Il nastro', desc: 'Smista i rifiuti che arrivano sul nastro, con colleghi e grovigli.' },
    { id: 'domino', name: 'Dominò dei palindromi', desc: 'Attacca le parole per lettera o per colore e batti Gino.', cls: Domino },
    { id: 'fiume', name: 'Il fiume dei riflessi', desc: 'Pesca i rifiuti veri, evita le illusioni nel riflesso.', cls: River },
    { id: 'mercatino', name: 'Mercatino dell\'usato', desc: 'Compra, contratta e rivendi: chiudi la giornata in guadagno.', cls: Market },
  ];
})();
