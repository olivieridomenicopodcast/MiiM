// Logica di gioco e rendering su canvas.
(function () {
  const M = (window.MiiM = window.MiiM || {});

  const MAX_ERRORS = 15;
  const HELPER_COST = [300, 1000, 2500]; // punti per assumere il 1°, 2° e 3° collega
  const HELPER_NAMES = ['Gino', 'Marta', 'Pino', 'Lia', 'Otto', 'Anna', 'Ada', 'Bob', 'Ele', 'Ivo'];
  const UNTANGLE_GAIN = 0.14, UNTANGLE_DECAY = 0.35; // ogni pressione riempie la barra del 14%, che cala del 35% al secondo
  const TANGLE_MIN_GAP = 8, TANGLE_CHANCE = 0.15; // un groviglio ogni ~14 rifiuti, mai prima del 7°
  const PLAYER_SPEED = 260, HELPER_SPEED = 165;
  const CHAR_FONT = 'bold 22px "Courier New", monospace';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  class Game {
    constructor(canvas, slot, hooks) {
      this.canvas = canvas;
      this.slot = slot;
      this.hooks = hooks;
      this.ctx = canvas.getContext('2d');
      this.setLayout();
      this.keys = new Set();
      this.actQ = false;
      this.paused = false;
      this.over = false;
      this.fx = { pops: [], fly: [], toasts: [] };
      this.beltOff = 0;
      this.level = 0;
      this.belt = 60;
      this.autosave = 0;
      this.onKeyDown = (e) => this.keyDown(e);
      this.onPointer = (e) => this.pointer(e);
      this.onKeyUp = (e) => this.keys.delete(this.keyName(e));
    }

    // Layout fisso 960x540.
    setLayout() {
      Object.assign(this, { W: 960, H: 540, WALL_H: 320, BELT_TOP: 430, WALK_Y: 432, binS: 1, binTop: 148, binDX: 130, binX0: 90, kx: 1, BIN_W: 110 });
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = this.W * dpr;
      this.canvas.height = this.H * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.font = CHAR_FONT;
      this.charW = this.ctx.measureText('M').width;
    }

    binX(i) {
      return this.binX0 + i * this.binDX;
    }

    // Larghezza di un rifiuto sul nastro (se è un groviglio di due parole, le due targhe si sovrappongono).
    wOf(o) {
      if (o.pair && o.pair.length > 1) return this.plateW(o.pair[0].len) + 0.55 * this.plateW(o.pair[1].len);
      return this.plateW(o.len);
    }

    // Moltiplicatore di velocità di ciò che si porta in mano (due parole insieme pesano di più).
    carryMult(c) {
      if (!c) return 1;
      if (c.pair) return M.lenInfo(Math.max(...c.pair.map((q) => q.len))).carry * (c.pair.length > 1 ? 0.85 : 1);
      return M.lenInfo(c.len).carry;
    }

    plateW(len) {
      return Math.round(len * this.charW + 18);
    }

    // ---------- ciclo di vita ----------
    start() {
      this.run = this.restore(this.slot.run) || this.fresh();
      this.slot.run = null;
      window.addEventListener('keydown', this.onKeyDown);
      this.canvas.addEventListener('pointerdown', this.onPointer);
      window.addEventListener('keyup', this.onKeyUp);
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    }

    stop() {
      cancelAnimationFrame(this.raf);
      window.removeEventListener('keydown', this.onKeyDown);
      this.canvas.removeEventListener('pointerdown', this.onPointer);
      window.removeEventListener('keyup', this.onKeyUp);
      this.keys.clear();
    }

    fresh() {
      return {
        t: 0, score: 0, spent: 0, streak: 0, errors: 0, saved: 0, newWords: 0,
        spawnIndex: 0, spawnIn: 1.2, words: [], wid: 1, lastTangle: -10,
        player: { x: this.W / 2, carry: null, facing: 1, phase: 0, moving: false },
        helpers: [],
      };
    }

    restore(s) {
      if (!s || typeof s !== 'object') return null;
      try {
        const r = this.fresh();
        const num = (v, d, a = 0, b = 1e9) => (Number.isFinite(+v) ? clamp(+v, a, b) : d);
        r.t = num(s.t, 0); r.score = num(s.score, 0); r.spent = num(s.spent, 0); r.streak = num(s.streak, 0);
        r.errors = num(s.errors, 0, 0, MAX_ERRORS - 1); r.saved = num(s.saved, 0);
        r.newWords = num(s.newWords, 0); r.spawnIndex = Math.floor(num(s.spawnIndex, 0));
        r.spawnIn = num(s.spawnIn, 1, 0, 10); r.lastTangle = Math.floor(num(s.lastTangle, -10, -10));
        const word = (t) => {
          const text = String(t);
          if (!/^[A-Za-z]{4,8}$/.test(text) || text.length % 2 || !M.isPalindrome(text)) throw 0;
          return { text, len: text.length, cat: M.categoryOf(text) };
        };
        const mk = (o) => {
          const obj = Object.assign({ id: r.wid++, x: num(o.x, this.W + 50, -50, 3000), claim: null }, word(o.text));
          if (Array.isArray(o.pair) && o.pair.length >= 1 && o.pair.length <= 2) {
            obj.pair = o.pair.map(word);
            Object.assign(obj, obj.pair[0]);
            obj.tangled = !!o.tangled && obj.pair.length === 2;
            obj.progress = num(o.progress, 0, 0, 1);
          }
          return obj;
        };
        r.words = s.words.slice(0, 60).map(mk);
        r.player.x = num(s.player.x, this.W / 2, 30, this.W - 30);
        r.player.carry = s.player.carry ? mk(s.player.carry) : null;
        r.helpers = s.helpers.slice(0, 3).map((h, i) => ({
          name: String(h.name || HELPER_NAMES[i]).slice(0, 10), look: this.helperLook(i),
          x: num(h.x, 100, 30, this.W - 30), carry: h.carry ? mk(h.carry) : null,
          target: null, wrong: false, facing: 1, phase: 0, moving: false, cd: 0,
        }));
        return r;
      } catch (e) {
        return null;
      }
    }

    snapshot() {
      const r = this.run;
      const w = (o) => ({ text: o.text, x: Math.round(o.x), pair: o.pair ? o.pair.map((q) => q.text) : undefined, tangled: o.tangled, progress: o.progress });
      return {
        t: r.t, score: r.score, spent: r.spent, streak: r.streak, errors: r.errors, saved: r.saved, newWords: r.newWords,
        spawnIndex: r.spawnIndex, spawnIn: r.spawnIn, lastTangle: r.lastTangle,
        player: { x: r.player.x, carry: r.player.carry ? w(r.player.carry) : null },
        words: r.words.map(w),
        helpers: r.helpers.map((h) => ({ name: h.name, x: h.x, carry: h.carry ? w(h.carry) : null })),
      };
    }

    persist() {
      if (this.over) return;
      this.slot.run = this.snapshot();
      this.hooks.persist();
      this.slot.run = null;
    }

    setPaused(p) {
      if (this.over) return;
      this.paused = p;
      if (p) {
        this.keys.clear();
        this.persist();
      }
      this.last = performance.now();
    }

    frame(now) {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!this.paused && !this.over) this.update(dt);
      this.render();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    }

    // ---------- input ----------
    keyName(e) {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') return 'left';
      if (k === 'arrowright' || k === 'd') return 'right';
      if (k === ' ' || k === 'e' || k === 'enter' || k === 'arrowdown' || k === 's' || k === 'arrowup' || k === 'w') return 'act';
      if (k === 'p' || k === 'escape') return 'pause';
      if (k === 'h') return 'hire';
      return k;
    }

    keyDown(e) {
      if (this.over || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = this.keyName(e);
      if (n === 'hire') {
        if (!e.repeat && !this.paused) this.hire();
        return;
      }
      if (n === 'pause') {
        if (!e.repeat) this.hooks.onPause();
        return;
      }
      if (this.paused) return;
      if (n === 'left' || n === 'right' || n === 'act') {
        e.preventDefault();
        if (n === 'act' && !e.repeat) this.actQ = true;
        this.keys.add(n);
      }
    }

    setKey(name, down) {
      if (down) this.keys.add(name);
      else this.keys.delete(name);
    }

    press() {
      if (!this.paused && !this.over) this.actQ = true;
    }

    // ---------- aggiornamento ----------
    update(dt) {
      const r = this.run, slot = this.slot;
      r.t += dt;
      this.level = Math.floor(r.t / 20);
      this.belt = Math.min(190, 60 + this.level * 9) * this.kx;
      this.beltOff = (this.beltOff + this.belt * dt) % 40;

      r.spawnIn -= dt;
      if (r.spawnIn <= 0) this.spawn();

      for (const w of r.words.slice()) {
        w.x -= this.belt * dt;
        if (w.x < 24) {
          r.words.splice(r.words.indexOf(w), 1);
          if (w.pair) w.pair.forEach((q, i) => this.penalty(q, 'Persa!', w.x + 20 + i * 40, this.BELT_TOP, i === 0));
          else this.penalty(w, 'Persa!', w.x + 20, this.BELT_TOP);
        }
      }

      // giocatore
      const p = r.player;
      const dir = (this.keys.has('right') ? 1 : 0) - (this.keys.has('left') ? 1 : 0);
      const stuck = !!(p.carry && p.carry.tangled); // finché i rifiuti sono accavallati non ti puoi muovere
      p.moving = dir !== 0 && !stuck;
      if (stuck) p.carry.progress = Math.max(0, p.carry.progress - UNTANGLE_DECAY * dt);
      if (p.moving) {
        p.facing = dir;
        const mult = this.carryMult(p.carry);
        p.x = clamp(p.x + dir * PLAYER_SPEED * this.kx * mult * dt, 30, this.W - 30);
        p.phase += dt * 11 * mult;
      }
      if (this.actQ) {
        this.actQ = false;
        this.action();
      }

      r.helpers.forEach((h, i) => this.updateHelper(h, i, dt));

      const ready = r.helpers.length < HELPER_COST.length && r.score >= HELPER_COST[r.helpers.length];
      if (ready && !this.hireNotified) this.toast('Puoi assumere un collega! (H o tocca il riquadro)');
      this.hireNotified = ready;

      const f = this.fx;
      for (const a of f.pops) { a.t += dt; a.y -= 28 * dt; }
      for (const a of f.fly) a.t += dt;
      for (const a of f.toasts) a.t += dt;
      f.pops = f.pops.filter((a) => a.t < 1.1);
      f.fly = f.fly.filter((a) => a.t < a.dur);
      f.toasts = f.toasts.filter((a) => a.t < 3);

      this.autosave += dt;
      if (this.autosave > 15) {
        this.autosave = 0;
        this.persist();
      }
      if (r.errors >= MAX_ERRORS) this.gameOver();
    }

    spawn() {
      const r = this.run, seed = this.slot.seed;
      const idx = r.spawnIndex;
      const wd = M.makeWord(seed, idx);
      const rg = M.rngFor(seed, 't' + idx);
      r.spawnIndex++;
      r.spawnIn = Math.max(0.9, 3.2 - this.level * 0.2) * (0.75 + rg() * 0.5);
      const item = { id: r.wid++, text: wd.text, len: wd.len, cat: wd.cat, x: 0, claim: null };
      // ogni tanto due rifiuti arrivano accavallati (deciso dal seme, quindi sempre uguale a parità di seme)
      if (idx >= 6 && idx - r.lastTangle >= TANGLE_MIN_GAP && M.rngFor(seed, 'g' + idx)() < TANGLE_CHANCE) {
        item.pair = [wd, M.makeWord(seed, 100000 + idx)];
        item.tangled = true;
        item.progress = 0;
        r.lastTangle = idx;
        if (!this.tangleHinted) {
          this.tangleHinted = true;
          this.toast('Rifiuti accavallati! Prendili e premi Spazio a raffica per staccarli');
        }
      }
      const pw = this.wOf(item);
      let x = this.W + pw / 2 + 10;
      for (const o of r.words) x = Math.max(x, o.x + (this.wOf(o) + pw) / 2 + 14);
      item.x = x;
      r.words.push(item);
    }

    reachable(w, px) {
      return Math.abs(w.x - px) < this.wOf(w) / 2 + 26;
    }

    action() {
      const r = this.run, p = r.player;
      if (p.carry && p.carry.tangled) {
        // ogni pressione fa avanzare la barra: bisogna premere in fretta, prima che cali
        const c = p.carry;
        c.progress = Math.min(1, c.progress + UNTANGLE_GAIN);
        M.sfx('pick');
        if (c.progress >= 1) {
          c.tangled = false;
          this.toast('Staccati! Portali nelle casse giuste');
          M.sfx('ok');
        }
        return;
      }
      if (p.carry) {
        const i = this.binUnder(p.x);
        if (i < 0) {
          this.toast('Portala sotto una cassa!');
          return;
        }
        const c = p.carry;
        if (c.pair) {
          // due rifiuti in mano: butta quello che corrisponde alla cassa (altrimenti il primo)
          let k = c.pair.findIndex((q) => q.cat === i);
          if (k < 0) k = 0;
          const w = c.pair.splice(k, 1)[0];
          if (c.pair.length === 1) p.carry = Object.assign({ id: r.wid++, x: 0, claim: null }, c.pair[0]);
          this.drop(w, i, p.x, this.WALK_Y - 60, true);
          return;
        }
        const w = p.carry;
        p.carry = null;
        this.drop(w, i, p.x, this.WALK_Y - 60, true);
      } else {
        let best = null;
        for (const w of r.words) if (this.reachable(w, p.x) && (!best || Math.abs(w.x - p.x) < Math.abs(best.x - p.x))) best = w;
        if (best) {
          r.words.splice(r.words.indexOf(best), 1);
          p.carry = best;
          if (best.pair) best.progress = 0.1;
          M.sfx('pick');
        }
      }
    }

    binUnder(x) {
      for (let i = 0; i < M.CATS.length; i++) if (Math.abs(x - this.binX(i)) < this.BIN_W / 2 + 4) return i;
      return -1;
    }

    drop(w, bin, fx, fy, byPlayer) {
      const r = this.run, slot = this.slot;
      this.fx.fly.push({ text: w.text, color: M.CATS[w.cat].color, x0: fx, y0: fy, x1: this.binX(bin), y1: this.binTop + 45 * this.binS, t: 0, dur: 0.28 });
      if (bin !== w.cat) {
        this.penalty(w, 'Cassa sbagliata!', this.binX(bin), this.binTop + 20);
        return;
      }
      let pts = M.lenInfo(w.len).base;
      if (byPlayer) {
        r.streak++;
        pts = Math.round(pts * this.mult());
      }
      r.score += pts;
      r.saved++;
      slot.stats.saved++;
      const dex = M.Storage.dex();
      const d = dex[w.text];
      if (d) d.n++;
      else {
        dex[w.text] = { cat: w.cat, len: w.len, n: 1 };
        r.newWords++;
        this.toast('Nuovo nel Pokédex: ' + w.text);
        M.sfx('new');
      }
      M.sfx('ok');
      this.fx.pops.push({ x: this.binX(bin), y: this.binTop, text: '+' + pts, color: '#7CFC9A', t: 0 });
    }

    mult() {
      return 1 + Math.min(4, Math.floor(this.run.streak / 5)) * 0.5;
    }

    penalty(w, why, x, y, countError = true) {
      const r = this.run;
      const pts = Math.round(M.lenInfo(w.len).base / 2);
      r.score = Math.max(0, r.score - pts);
      r.streak = 0;
      if (countError) r.errors++;
      M.sfx('bad');
      this.fx.pops.push({ x: clamp(x, 40, this.W - 40), y: y || 300, text: `${why} -${pts}`, color: '#ff6b6b', t: 0 });
    }

    toast(text) {
      this.fx.toasts.push({ text, t: 0 });
      if (this.fx.toasts.length > 3) this.fx.toasts.shift();
    }

    // ---------- colleghi (IA) ----------
    helperLook(i) {
      const rg = M.rngFor(this.slot.seed, 'helper' + i);
      const pick = (n) => Math.floor(rg() * n);
      return {
        name: '', gender: rg() < 0.5 ? 'm' : 'f', hair: ['calvo', 'corto', 'lungo'][pick(3)],
        hairColor: pick(M.HAIR_COLORS.length), shirt: pick(M.SHIRTS.length), skin: pick(M.SKINS.length),
      };
    }

    hire() {
      const r = this.run;
      if (this.paused || this.over) return;
      const cost = HELPER_COST[r.helpers.length];
      if (cost === undefined) return this.toast('La squadra è al completo!');
      if (r.score < cost) return this.toast(`Servono ${cost} punti per assumere un collega`);
      r.score -= cost;
      r.spent += cost;
      this.fx.pops.push({ x: 90, y: 90, text: '-' + cost, color: '#ffd166', t: 0 });
      this.addHelper();
    }

    addHelper() {
      const r = this.run, i = r.helpers.length;
      const look = this.helperLook(i);
      r.helpers.push({
        name: HELPER_NAMES[(M.xmur3(this.slot.seed + 'hn' + i)() % HELPER_NAMES.length)], look,
        x: this.W - 40, carry: null, target: null, wrong: false, facing: -1, phase: 0, moving: false, cd: 0,
      });
      this.toast(`Nuovo collega: ${r.helpers[i].name} ti dà una mano!`);
      M.sfx('new');
    }

    updateHelper(h, idx, dt) {
      const r = this.run;
      let goal = null;
      const mult = h.carry ? M.lenInfo(h.carry.len).carry : 1;
      h.cd = Math.max(0, h.cd - dt);
      if (h.carry) {
        // sbaglia cassa ogni tanto (8%), deciso al momento della presa
        const bin = h.wrong ? (h.carry.cat + 1) % M.CATS.length : h.carry.cat;
        goal = this.binX(bin);
        if (Math.abs(h.x - goal) < 6 && h.cd <= 0) {
          const w = h.carry;
          h.carry = null;
          h.cd = 0.4;
          this.drop(w, bin, h.x, this.WALK_Y - 60, false);
          goal = null;
        }
      } else if (h.cd <= 0) {
        let w = r.words.find((o) => o.id === h.target && (o.claim === idx));
        if (!w) {
          h.target = null;
          let bt = Infinity;
          for (const o of r.words) {
            if (o.pair) continue; // i grovigli li può staccare solo il giocatore
            if (o.claim !== null && o.claim !== idx && r.helpers[o.claim]) continue;
            const t = this.interceptTime(h, o);
            if (t < bt) { bt = t; w = o; }
          }
          if (w) {
            w.claim = idx;
            h.target = w.id;
          }
        }
        if (w) {
          goal = w.x;
          if (this.reachable(w, h.x) && Math.abs(w.x - h.x) < 16) {
            r.words.splice(r.words.indexOf(w), 1);
            h.carry = w;
            h.target = null;
            h.cd = 0.25;
            const rg = M.rngFor(this.slot.seed, 'hw' + idx + ':' + w.id + ':' + Math.floor(r.t));
            h.wrong = rg() < 0.08;
          }
        }
      }
      h.moving = false;
      if (goal !== null && (h.carry || h.cd <= 0)) {
        const d = goal - h.x;
        if (Math.abs(d) > 4) {
          h.facing = Math.sign(d);
          h.x = clamp(h.x + Math.sign(d) * Math.min(Math.abs(d), HELPER_SPEED * this.kx * mult * dt), 30, this.W - 30);
          h.moving = true;
          h.phase += dt * 10;
        }
      }
    }

    // tempo stimato perché l'aiutante raggiunga il rifiuto (che scorre verso sinistra)
    interceptTime(h, w) {
      const v = HELPER_SPEED * this.kx;
      const dx = w.x - h.x;
      if (dx >= 0) return dx / (v + this.belt);
      return v > this.belt ? -dx / (v - this.belt) : Infinity;
    }

    gameOver() {
      const r = this.run, slot = this.slot;
      this.over = true;
      slot.stats.runs++;
      const total = r.score + r.spent; // i punti spesi per i colleghi contano nel punteggio finale
      const record = total > slot.stats.best;
      if (record) slot.stats.best = total;
      slot.run = null;
      this.hooks.persist();
      M.sfx('over');
      this.hooks.onGameOver({ score: total, saved: r.saved, newWords: r.newWords, record, time: r.t, best: slot.stats.best });
    }

    // ---------- rendering ----------
    render() {
      const ctx = this.ctx, r = this.run;
      if (!r) return;
      this.drawBackground(ctx);
      const carrying = !!r.player.carry;
      const under = carrying ? this.binUnder(r.player.x) : -1;
      for (let i = 0; i < M.CATS.length; i++) this.drawBin(ctx, i, i === under);
      r.helpers.forEach((h) => {
        M.drawPerson(ctx, h.x, this.WALK_Y - 2, h.look, { scale: 1.2, facing: h.facing, phase: h.phase, moving: h.moving, carry: !!h.carry, name: h.name });
      });
      const p = r.player;
      M.drawPerson(ctx, p.x, this.WALK_Y, this.slot.character, { scale: 1.3, facing: p.facing, phase: p.phase, moving: p.moving, carry: carrying, name: this.slot.character.name });
      this.drawBelt(ctx);
      let near = null;
      if (!carrying) for (const w of r.words) if (this.reachable(w, p.x) && (!near || Math.abs(w.x - p.x) < Math.abs(near.x - p.x))) near = w;
      for (const w of r.words) this.drawItem(ctx, w, w.x, this.BELT_TOP + 8, w === near);
      for (const h of r.helpers) if (h.carry) this.drawItem(ctx, h.carry, h.x, this.WALK_Y - 60, false);
      if (carrying) {
        this.drawItem(ctx, p.carry, p.x, this.WALK_Y - 60, false);
        if (p.carry.tangled) this.drawUntangleBar(ctx, p.x, this.WALK_Y - 152, p.carry.progress);
      }
      for (const a of this.fx.fly) {
        const k = a.t / a.dur;
        this.drawPlate(ctx, a.text, M.CATS.findIndex((c) => c.color === a.color), a.x0 + (a.x1 - a.x0) * k, a.y0 + (a.y1 - a.y0) * k - Math.sin(k * Math.PI) * 40, false, 1 - k * 0.4);
      }
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (const a of this.fx.pops) {
        ctx.globalAlpha = Math.min(1, (1.1 - a.t) * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
        ctx.strokeText(a.text, a.x, a.y);
        ctx.fillStyle = a.color;
        ctx.fillText(a.text, a.x, a.y);
      }
      ctx.globalAlpha = 1;
      this.drawHUD(ctx);
    }

    drawBackground(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, this.WALL_H);
      g.addColorStop(0, '#2c3744');
      g.addColorStop(1, '#3b4757');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.WALL_H);
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      ctx.lineWidth = 2;
      for (let x = 0; x < this.W; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.WALL_H);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(0, this.WALL_H - 8, this.W, 8);
      const f = ctx.createLinearGradient(0, this.WALL_H, 0, this.H);
      f.addColorStop(0, '#4a4f5a');
      f.addColorStop(1, '#2b2e36');
      ctx.fillStyle = f;
      ctx.fillRect(0, this.WALL_H, this.W, this.H - this.WALL_H);
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      ctx.lineWidth = 1;
      for (let y = this.WALL_H + 30; y < this.H; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.W, y);
        ctx.stroke();
      }
    }

    drawBin(ctx, i, active) {
      const c = M.CATS[i], x = this.binX(i), sc = this.binS, bot = 122;
      ctx.save();
      ctx.translate(x, this.binTop);
      ctx.scale(sc, sc);
      if (active) {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 22;
      }
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.moveTo(-50, 16);
      ctx.lineTo(50, 16);
      ctx.lineTo(42, bot);
      ctx.lineTo(-42, bot);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      for (let k = -1; k <= 1; k++) ctx.fillRect(k * 24 - 3, 30, 6, bot - 42);
      ctx.fillStyle = M.shade(c.color, -0.25);
      M.rr(ctx, -56, active ? -4 : 2, 112, 16, 5);
      ctx.fill();
      ctx.fillStyle = '#10141a';
      ctx.fillRect(-36, active ? 8 : 14, 72, 4);
      ctx.restore();
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = active ? '#fff' : c.color;
      ctx.fillText(c.name, x, this.binTop + bot * sc + 18);
    }

    drawBelt(ctx) {
      ctx.fillStyle = '#17191e';
      for (let x = 60; x < this.W; x += 220) ctx.fillRect(x, this.BELT_TOP + 30, 14, this.H - this.BELT_TOP - 30);
      ctx.fillStyle = '#2d3138';
      ctx.fillRect(0, this.BELT_TOP, this.W, 36);
      ctx.fillStyle = '#3a3f48';
      ctx.fillRect(0, this.BELT_TOP, this.W, 5);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      for (let x = -this.beltOff; x < this.W; x += 40) ctx.fillRect(x, this.BELT_TOP + 8, 3, 24);
      const g = ctx.createLinearGradient(0, 0, 90, 0);
      g.addColorStop(0, 'rgba(220,38,38,.65)');
      g.addColorStop(1, 'rgba(220,38,38,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, this.BELT_TOP - 30, 90, 70);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('◀ SCARTO', 6, this.BELT_TOP + 56);
    }

    // Disegna un rifiuto singolo o un groviglio di due parole.
    drawItem(ctx, o, x, y, hl) {
      if (!o.pair) return this.drawPlate(ctx, o.text, o.cat, x, y, hl);
      const [a, b] = o.pair;
      if (!o.tangled || !b) {
        // staccati (portati in mano): uno sopra l'altro
        this.drawPlate(ctx, a.text, a.cat, x, y, false);
        if (b) this.drawPlate(ctx, b.text, b.cat, x, y - 36, false);
        return;
      }
      const w0 = this.plateW(a.len), w1 = this.plateW(b.len), tot = this.wOf(o);
      const c0 = x - tot / 2 + w0 / 2, c1 = x + tot / 2 - w1 / 2;
      this.drawPlate(ctx, a.text, a.cat, c0, y + 4, hl, 0, -0.06);
      this.drawPlate(ctx, b.text, b.cat, c1, y - 8, hl, 0, 0.1);
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const zx = c1 - w1 / 2;
      ctx.moveTo(zx - 8, y - 22); ctx.lineTo(zx + 2, y - 12); ctx.lineTo(zx - 6, y - 2); ctx.lineTo(zx + 4, y + 8); ctx.lineTo(zx - 4, y + 18);
      ctx.stroke();
      ctx.restore();
    }

    drawUntangleBar(ctx, x, y, k) {
      const w = 96;
      ctx.fillStyle = 'rgba(0,0,0,.7)';
      M.rr(ctx, x - w / 2 - 3, y - 3, w + 6, 18, 8);
      ctx.fill();
      ctx.fillStyle = k > 0.66 ? '#22c55e' : k > 0.33 ? '#facc15' : '#ef4444';
      M.rr(ctx, x - w / 2, y, Math.max(6, w * k), 12, 6);
      ctx.fill();
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.strokeText('PREMI SPAZIO A RAFFICA!', x, y - 8);
      ctx.fillStyle = '#fff';
      ctx.fillText('PREMI SPAZIO A RAFFICA!', x, y - 8);
    }

    drawPlate(ctx, text, cat, x, y, hl, alpha, rot) {
      if (rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        this.drawPlate(ctx, text, cat, 0, 0, hl, alpha);
        ctx.restore();
        return;
      }
      const w = this.plateW(text.length), h = 32;
      ctx.save();
      if (alpha) ctx.globalAlpha = alpha;
      const col = (M.CATS[cat] || M.CATS[0]).color;
      ctx.fillStyle = '#0f1318';
      M.rr(ctx, x - w / 2, y - h / 2, w, h, 8);
      ctx.fill();
      ctx.lineWidth = hl ? 3 : 2;
      ctx.strokeStyle = hl ? '#fff' : M.shade(col, -0.25);
      ctx.stroke();
      ctx.font = CHAR_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      // palindromo = specchio: le lettere della metà destra sono riflesse orizzontalmente
      const half = text.length / 2;
      const x0 = x - (text.length * this.charW) / 2;
      for (let i = 0; i < text.length; i++) {
        ctx.save();
        ctx.translate(x0 + (i + 0.5) * this.charW, y + 1);
        if (i >= half) ctx.scale(-1, 1);
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }

    // Riquadro "assumi collega": mostra il costo e quanto manca per poterlo comprare.
    drawHire(ctx) {
      const r = this.run, n = r.helpers.length;
      const w = 290, h = 26, x = 10, y = 46;
      const cost = HELPER_COST[n];
      this.hirePill = cost === undefined ? null : { x, y, w, h };
      const can = cost !== undefined && r.score >= cost;
      ctx.save();
      ctx.fillStyle = 'rgba(8,10,14,.7)';
      M.rr(ctx, x, y, w, h, 13);
      ctx.fill();
      if (cost !== undefined) {
        ctx.save();
        M.rr(ctx, x, y, w, h, 13);
        ctx.clip();
        ctx.fillStyle = can ? (Math.floor(performance.now() / 400) % 2 ? '#22c55e' : '#16a34a') : '#3b4a63';
        ctx.fillRect(x, y, w * Math.min(1, r.score / cost), h);
        ctx.restore();
      }
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(cost === undefined ? 'Squadra al completo 👷👷👷' : can ? `👷 ASSUMI collega ${n + 1} (−${cost})  [H]` : `👷 Collega ${n + 1}: ${r.score}/${cost} punti`, x + w / 2, y + h / 2 + 1);
      ctx.restore();
    }

    // click/tap sul riquadro
    pointer(e) {
      const rc = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rc.left) * this.W) / rc.width, y = ((e.clientY - rc.top) * this.H) / rc.height;
      const b = this.hirePill;
      if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) this.hire();
    }

    drawHUD(ctx) {
      const r = this.run;
      ctx.fillStyle = 'rgba(8,10,14,.62)';
      ctx.fillRect(0, 0, this.W, 40);
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'left';
      const m = this.mult();
      const errCol = r.errors > MAX_ERRORS - 5 ? '#ff6b6b' : '#e5e7eb';
      const items =
        [[14, 21, '#fff', 'Punti ' + r.score], [160, 21, m > 1 ? '#ffd166' : '#9ca3af', `Serie ${r.streak} ×${m}`], [320, 21, '#9ad1ff', 'Velocità ' + (this.level + 1)],
           [460, 21, errCol, `Errori ${r.errors}/${MAX_ERRORS}`], [610, 21, '#c4b5fd', 'Colleghi ' + r.helpers.length]];
      for (const [x, y, col, t] of items) {
        ctx.fillStyle = col;
        ctx.fillText(t, x, y);
      }
      this.drawHire(ctx);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('Seme: ' + this.slot.seed, this.W - 10, 21);
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px system-ui, sans-serif';
      this.fx.toasts.forEach((t, i) => {
        ctx.globalAlpha = clamp(3 - t.t, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        const tw = ctx.measureText(t.text).width + 24;
        M.rr(ctx, this.W / 2 - tw / 2, 78 + i * 30, tw, 26, 13);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(t.text, this.W / 2, 92 + i * 30);
      });
      ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
    }
  }

  // Effetti sonori minimali (WebAudio), disattivabili.
  let actx = null;
  M.sfx = function (kind) {
    if (M.Storage.settings().mute) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const spec = {
        pick: [[440, 0.05]], ok: [[660, 0.06], [880, 0.08]], bad: [[180, 0.18]],
        new: [[523, 0.07], [659, 0.07], [784, 0.12]], over: [[300, 0.2], [220, 0.3]],
      }[kind];
      let t = actx.currentTime;
      for (const [f, d] of spec) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = kind === 'bad' ? 'sawtooth' : 'square';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(actx.destination);
        o.start(t);
        o.stop(t + d);
        t += d;
      }
    } catch (e) { /* audio non disponibile */ }
  };

  M.Game = Game;
  M.MAX_ERRORS = MAX_ERRORS;
})();
