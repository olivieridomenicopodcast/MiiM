// Salvataggi multipli in localStorage + import/export JSON.
(function () {
  const M = (window.MiiM = window.MiiM || {});
  const KEY = 'miim.smista-palindromi.v1';
  const FORMAT = 'smista-palindromi';
  let db = null;
  let memFallback = null;

  function load() {
    if (db) return db;
    try {
      const raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : null;
    } catch (e) {
      db = memFallback;
    }
    if (!db || !Array.isArray(db.slots)) db = { slots: [], last: null, settings: { mute: false } };
    db.settings = db.settings || { mute: false };
    return db;
  }

  function flush() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      memFallback = db;
    }
  }

  const clampInt = (v, min, max, def) => {
    v = Math.floor(Number(v));
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
  };

  function uid() {
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function sanitizeCharacter(c) {
    c = c || {};
    return {
      name: String(c.name || 'Operaio').slice(0, 14),
      gender: c.gender === 'f' ? 'f' : 'm',
      hair: ['calvo', 'corto', 'lungo'].includes(c.hair) ? c.hair : 'corto',
      hairColor: clampInt(c.hairColor, 0, M.HAIR_COLORS.length - 1, 0),
      shirt: clampInt(c.shirt, 0, M.SHIRTS.length - 1, 0),
      skin: clampInt(c.skin, 0, M.SKINS.length - 1, 1),
    };
  }

  // Ricostruisce uno slot da dati non fidati (import).
  function sanitizeSlot(o) {
    if (!o || typeof o !== 'object' || typeof o.seed !== 'string' || !o.seed.trim()) return null;
    const seed = o.seed.trim().slice(0, 40);
    const dex = {};
    if (o.dex && typeof o.dex === 'object') {
      for (const [text, d] of Object.entries(o.dex)) {
        if (!/^[A-Za-z]{4,8}$/.test(text) || text.length % 2 || !M.isPalindrome(text)) continue;
        if (text[0] !== text[0].toUpperCase() || text.at(-1) !== text.at(-1).toUpperCase()) continue;
        dex[text] = { cat: M.categoryOf(seed, text), len: text.length, n: clampInt(d && d.n, 1, 1e9, 1) };
      }
    }
    const st = o.stats || {};
    const slot = {
      id: uid(),
      seed,
      character: sanitizeCharacter(o.character),
      dex,
      stats: {
        best: clampInt(st.best, 0, 1e9, 0),
        saved: clampInt(st.saved, 0, 1e9, 0),
        runs: clampInt(st.runs, 0, 1e9, 0),
      },
      created: clampInt(o.created, 0, 8.64e15, Date.now()),
      updated: Date.now(),
      run: null,
    };
    const r = o.run;
    if (r && typeof r === 'object' && Array.isArray(r.words) && Array.isArray(r.helpers) && r.player) {
      slot.run = r; // validato in modo difensivo da Game.restore
    }
    return slot;
  }

  M.Storage = {
    list() {
      return load().slots.slice().sort((a, b) => b.updated - a.updated);
    },
    get(id) {
      return load().slots.find((s) => s.id === id) || null;
    },
    create(character, seed) {
      const slot = {
        id: uid(),
        seed: String(seed || M.randomSeed()).trim().slice(0, 40),
        character: sanitizeCharacter(character),
        dex: {},
        stats: { best: 0, saved: 0, runs: 0 },
        created: Date.now(),
        updated: Date.now(),
        run: null,
      };
      load().slots.push(slot);
      db.last = slot.id;
      flush();
      return slot;
    },
    save(slot) {
      load();
      slot.updated = Date.now();
      const i = db.slots.findIndex((s) => s.id === slot.id);
      if (i >= 0) db.slots[i] = slot;
      else db.slots.push(slot);
      flush();
    },
    remove(id) {
      load();
      db.slots = db.slots.filter((s) => s.id !== id);
      if (db.last === id) db.last = null;
      flush();
    },
    last() {
      load();
      return (db.last && this.get(db.last)) || this.list()[0] || null;
    },
    setLast(id) {
      load().last = id;
      flush();
    },
    settings() {
      return load().settings;
    },
    saveSettings() {
      flush();
    },
    exportJSON(ids) {
      const slots = load().slots.filter((s) => !ids || ids.includes(s.id));
      return JSON.stringify({ format: FORMAT, version: 1, exported: new Date().toISOString(), slots }, null, 1);
    },
    // Ritorna il numero di salvataggi importati (sempre come nuovi slot).
    importJSON(text) {
      const data = JSON.parse(text);
      const arr = data && data.format === FORMAT && Array.isArray(data.slots) ? data.slots : data && data.seed ? [data] : null;
      if (!arr) throw new Error('File non valido');
      load();
      let n = 0;
      for (const o of arr) {
        const s = sanitizeSlot(o);
        if (s) {
          db.slots.push(s);
          n++;
        }
      }
      if (!n) throw new Error('Nessun salvataggio valido nel file');
      flush();
      return n;
    },
  };
})();
