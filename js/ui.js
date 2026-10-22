// Interfaccia: menu, creazione personaggio, salvataggi, catalogo, pausa.
(function () {
  const M = window.MiiM;
  const root = document.getElementById('ui');
  const cv = document.getElementById('cv');
  let game = null;
  let draft = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const show = (html) => (root.innerHTML = html);
  const hide = () => (root.innerHTML = '');
  const fmtDate = (t) => new Date(t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------- schermate ----------
  function menu() {
    const last = M.Storage.last();
    const mute = M.Storage.settings().mute;
    show(`<div class="card narrow col">
      <h1>Smista <span>Rifiuti</span></h1>
      <p>Prendi i rifiuti dal nastro e portali nella cassa del loro colore.</p>
      ${last ? `<button class="big" data-act="continue">▶ Continua<br><small>${esc(last.character.name)} · seme ${esc(last.seed)}</small></button>` : ''}
      <button class="big ${last ? 'alt' : ''}" data-act="new">Nuova partita</button>
      <button class="alt" data-act="saves">Salvataggi (${M.Storage.list().length})</button>
      <button class="alt" data-act="dexLast" ${last ? '' : 'disabled'}>Catalogo dei rifiuti</button>
      <div class="row">
        <button class="alt" data-act="help" style="flex:1">Come si gioca</button>
        <button class="alt" data-act="mute" style="flex:1">Audio: ${mute ? 'OFF' : 'ON'}</button>
      </div>
    </div>`);
  }

  function help() {
    show(`<div class="card col">
      <h2>Come si gioca</h2>
      <p><b>Muoviti</b> con ← → (o A / D). <b>Prendi / lascia</b> un rifiuto con Spazio (o E, ↓): devi essere vicino al rifiuto sul nastro, oppure sotto una cassa per lasciarla. <b>Pausa</b>: P o Esc.</p>
      <p>Il colore indica il tipo di rifiuto: portalo nella cassa dello stesso colore. Ci sono rifiuti leggeri e frequenti, medi, e pesantissimi e rari (ma valgono di più): più è pesante, più vai piano.</p>
      <p>Se un rifiuto cade dal nastro o lo butti nella cassa sbagliata perdi la <b>metà</b> dei punti che varrebbe, azzeri la serie e fai un errore. Con ${M.MAX_ERRORS} errori il turno finisce. Dopo ogni 5 rifiuti di fila giuste il moltiplicatore sale.</p>
      <p>Raggiungendo certi punteggi arrivano dei <b>colleghi</b> comandati dall'IA che ti aiutano (ogni tanto sbagliano cassa!).</p>
      <p>Ogni rifiuto smistato finisce nel <b>catalogo</b> di quel seme. Lo stesso seme genera sempre gli stessi rifiuti.</p>
      <button data-act="menu">Indietro</button>
    </div>`);
  }

  function saves() {
    const list = M.Storage.list();
    show(`<div class="card col">
      <h2>Salvataggi</h2>
      ${list.length ? '' : '<p>Nessun salvataggio. Inizia una nuova partita o importane uno.</p>'}
      ${list.map((s) => `<div class="slot">
          <div><b>${esc(s.character.name)}</b> · seme <code>${esc(s.seed)}</code>
            <small>Record ${s.stats.best} · ${Object.keys(s.dex).length} rifiuti nel catalogo · ${s.stats.runs} turni${s.run ? ' · <b style="color:#f5c518">partita in corso</b>' : ''}</small>
            <small>Ultimo salvataggio: ${fmtDate(s.updated)}</small></div>
          <div class="row">
            <button data-act="play" data-id="${s.id}">Gioca</button>
            <button class="alt" data-act="dex" data-id="${s.id}">Catalogo</button>
            <button class="alt" data-act="export" data-id="${s.id}">Esporta</button>
            <button class="danger" data-act="del" data-id="${s.id}">✕</button>
          </div></div>`).join('')}
      <div class="row">
        <button data-act="import">Importa file…</button>
        <button class="alt" data-act="exportAll" ${list.length ? '' : 'disabled'}>Esporta tutti</button>
        <button class="alt" data-act="menu">Indietro</button>
      </div>
      <input type="file" id="file" accept=".json,application/json" hidden>
    </div>`);
    document.getElementById('file').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const n = M.Storage.importJSON(await f.text());
        saves();
        alert(`Importati ${n} salvataggi.`);
      } catch (err) {
        alert('Importazione fallita: ' + err.message);
      }
    });
  }

  function swatches(key, colors) {
    return colors.map((c, i) => `<button class="sw" style="background:${c}" data-act="pick" data-key="${key}" data-v="${i}" aria-label="${key} ${i + 1}"></button>`).join('');
  }

  function newGame() {
    const rnd = (n) => Math.floor(Math.random() * n);
    draft = draft || {
      name: '', gender: 'm', hair: 'corto', hairColor: rnd(M.HAIR_COLORS.length),
      shirt: rnd(M.SHIRTS.length), skin: rnd(M.SKINS.length), seed: M.randomSeed(),
    };
    show(`<div class="card col">
      <h2>Crea il tuo operatore</h2>
      <div class="creator">
        <div>
          <label>Nome</label><input type="text" id="cName" maxlength="14" placeholder="Operaio" value="${esc(draft.name)}">
          <label>Sesso</label><div class="row">
            <button class="alt" data-act="pick" data-key="gender" data-v="m">Maschio</button>
            <button class="alt" data-act="pick" data-key="gender" data-v="f">Femmina</button></div>
          <label>Capelli</label><div class="row">${M.HAIRS.map((h) => `<button class="alt" data-act="pick" data-key="hair" data-v="${h.id}">${h.name}</button>`).join('')}</div>
          <label>Colore capelli</label><div class="row">${swatches('hairColor', M.HAIR_COLORS)}</div>
          <label>Maglia</label><div class="row">${swatches('shirt', M.SHIRTS)}</div>
          <label>Pelle</label><div class="row">${swatches('skin', M.SKINS)}</div>
        </div>
        <div class="col"><canvas id="prev" width="190" height="260"></canvas>
          <button class="alt" data-act="randChar">🎲 Casuale</button></div>
      </div>
      <label>Seme (genera i rifiuti che arrivano)</label>
      <div class="row"><input type="text" id="cSeed" maxlength="40" value="${esc(draft.seed)}" style="flex:1;min-width:140px">
        <button class="alt" data-act="randSeed">🎲 Seme casuale</button></div>
      <p class="muted">Scrivi un seme tuo oppure tira i dadi: stesso seme, stessi rifiuti.</p>
      <div class="row"><button class="big" data-act="create">Inizia il turno</button><button class="alt" data-act="menu">Indietro</button></div>
    </div>`);
    document.getElementById('cName').addEventListener('input', (e) => (draft.name = e.target.value));
    document.getElementById('cSeed').addEventListener('input', (e) => (draft.seed = e.target.value));
    refreshDraft();
  }

  function refreshDraft() {
    root.querySelectorAll('[data-act="pick"]').forEach((b) => {
      const v = String(draft[b.dataset.key]);
      b.classList.toggle('on', v === b.dataset.v);
    });
    const c = document.getElementById('prev');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    M.drawPerson(ctx, 95, 225, draft, { scale: 2.1, facing: 1 });
  }

  function dex(slot, back) {
    const entries = Object.entries(slot.dex);
    const byLen = (n) => entries.filter(([, d]) => d.len === n).length;
    let filter = -1, sort = 'az';
    show(`<div class="card col">
      <h2>Catalogo · ${esc(slot.character.name)} · seme ${esc(slot.seed)}</h2>
      <div class="stat"><span>Rifiuti scoperti</span><b>${entries.length}</b></div>
      <div class="stat"><span>Leggeri / medi / pesanti</span><b>${byLen(4)} / ${byLen(6)} / ${byLen(8)}</b></div>
      <div class="row" id="dexTabs"></div>
      <div class="row"><label style="margin:0">Ordina</label>
        <select id="dexSort" style="width:auto"><option value="az">A → Z</option><option value="len">Lunghezza</option><option value="n">Più smistate</option></select></div>
      <div class="chips" id="dexList"></div>
      <button class="alt" data-act="back">Indietro</button>
    </div>`);
    const tabs = document.getElementById('dexTabs');
    const list = document.getElementById('dexList');
    const draw = () => {
      tabs.innerHTML = [`<button class="tab alt ${filter < 0 ? 'on' : ''}" data-f="-1">Tutte</button>`]
        .concat(M.CATS.map((c, i) => {
          const n = entries.filter(([, d]) => d.cat === i).length;
          return `<button class="tab alt ${filter === i ? 'on' : ''}" data-f="${i}" style="border-bottom:4px solid ${c.color}">${c.name} ${n}</button>`;
        })).join('');
      let rows = entries.filter(([, d]) => filter < 0 || d.cat === filter);
      rows.sort((a, b) => (sort === 'len' ? a[1].len - b[1].len || a[0].localeCompare(b[0]) : sort === 'n' ? b[1].n - a[1].n : a[0].localeCompare(b[0])));
      list.innerHTML = rows.length
        ? rows.map(([w, d]) => `<span class="chip" style="color:${M.CATS[d.cat].color};border-color:${M.CATS[d.cat].color}66">${esc(w)}<small>×${d.n}</small></span>`).join('')
        : '<p>Ancora nessun rifiuto: smistane qualcuno!</p>';
    };
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]');
      if (b) { filter = +b.dataset.f; draw(); }
    });
    document.getElementById('dexSort').addEventListener('change', (e) => { sort = e.target.value; draw(); });
    dex.back = back;
    draw();
  }

  function pauseMenu() {
    show(`<div class="card narrow col">
      <h2>Pausa</h2>
      <button class="big" data-act="resume">▶ Riprendi</button>
      <button class="alt" data-act="saveNow">💾 Salva partita</button>
      <button class="alt" data-act="pdex">Catalogo</button>
      <button class="alt" data-act="mute">Audio: ${M.Storage.settings().mute ? 'OFF' : 'ON'}</button>
      <button class="danger" data-act="quit">Salva ed esci al menu</button>
    </div>`);
  }

  let lastOver = null;
  function gameOver(s) {
    lastOver = s;
    show(`<div class="card narrow col">
      <h2>Turno finito!</h2>
      ${s.record ? '<p style="color:#f5c518;font-weight:700">🏆 Nuovo record!</p>' : ''}
      <div class="stat"><span>Punti</span><b>${s.score}</b></div>
      <div class="stat"><span>Record</span><b>${s.best}</b></div>
      <div class="stat"><span>Rifiuti smistati</span><b>${s.saved}</b></div>
      <div class="stat"><span>Nuovi nel catalogo</span><b>${s.newWords}</b></div>
      <div class="stat"><span>Durata</span><b>${fmtTime(s.time)}</b></div>
      <button class="big" data-act="again">Ancora!</button>
      <button class="alt" data-act="pdex">Catalogo</button>
      <button class="alt" data-act="quitNoSave">Menu</button>
    </div>`);
  }

  // ---------- flusso di gioco ----------
  function play(id) {
    const slot = M.Storage.get(id);
    if (!slot) return menu();
    endGame();
    M.Storage.setLast(id);
    hide();
    game = new M.Game(cv, slot, {
      persist: () => M.Storage.save(slot),
      onPause: pause,
      onGameOver: (s) => gameOver(s),
    });
    game.start();
    M.game = game;
  }

  function endGame() {
    if (game) {
      game.stop();
      game = null;
      M.game = null;
    }
  }

  function pause() {
    if (!game || game.over) return;
    if (game.paused) return resume();
    game.setPaused(true);
    pauseMenu();
  }

  function resume() {
    if (!game) return;
    hide();
    game.setPaused(false);
  }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  const actions = {
    menu: () => { endGame(); menu(); },
    continue: () => { const s = M.Storage.last(); if (s) play(s.id); },
    new: () => { draft = null; newGame(); },
    saves, help,
    play: (d) => play(d.id),
    dexLast: () => { const s = M.Storage.last(); if (s) { dex(s); dex.back = menu; } },
    dex: (d) => { dex(M.Storage.get(d.id)); dex.back = saves; },
    back: () => (dex.back || menu)(),
    del: (d) => { const s = M.Storage.get(d.id); if (s && confirm(`Eliminare il salvataggio di ${s.character.name} (seme ${s.seed})?`)) { M.Storage.remove(d.id); saves(); } },
    export: (d) => { const s = M.Storage.get(d.id); download(`rifiuti-${slug(s.character.name)}-${slug(s.seed)}.json`, M.Storage.exportJSON([d.id])); },
    exportAll: () => download('rifiuti-salvataggi.json', M.Storage.exportJSON()),
    import: () => document.getElementById('file').click(),
    mute: () => { const st = M.Storage.settings(); st.mute = !st.mute; M.Storage.saveSettings(); game ? pauseMenu() : menu(); },
    pick: (d) => { draft[d.key] = d.key === 'gender' || d.key === 'hair' ? d.v : +d.v; refreshDraft(); },
    randChar: () => {
      const rnd = (n) => Math.floor(Math.random() * n);
      Object.assign(draft, { gender: rnd(2) ? 'f' : 'm', hair: M.HAIRS[rnd(3)].id, hairColor: rnd(M.HAIR_COLORS.length), shirt: rnd(M.SHIRTS.length), skin: rnd(M.SKINS.length) });
      refreshDraft();
    },
    randSeed: () => { draft.seed = M.randomSeed(); document.getElementById('cSeed').value = draft.seed; },
    create: () => {
      const seed = (draft.seed || '').trim() || M.randomSeed();
      const slot = M.Storage.create({ ...draft, name: draft.name.trim() || 'Operaio' }, seed);
      draft = null;
      play(slot.id);
    },
    resume,
    saveNow: () => { game.persist(); const b = root.querySelector('[data-act=saveNow]'); b.textContent = '✔ Salvato'; },
    pdex: () => { dex(game.slot); dex.back = game.over ? () => gameOver(lastOver) : pauseMenu; },
    quit: () => { if (game) game.persist(); endGame(); menu(); },
    quitNoSave: () => { endGame(); menu(); },
    again: () => play(game.slot.id),
  };

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const fn = actions[b.dataset.act];
    if (fn) fn(b.dataset);
  });

  // ---------- controlli touch ----------
  const touch = document.getElementById('touch');
  if (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) touch.hidden = false;
  touch.querySelectorAll('[data-k]').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (game) game.setKey(k, true); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => game && game.setKey(k, false));
  });
  document.getElementById('tAct').addEventListener('pointerdown', (e) => { e.preventDefault(); if (game) game.press(); });
  document.getElementById('tPause').addEventListener('pointerdown', (e) => { e.preventDefault(); pause(); });

  window.addEventListener('beforeunload', () => game && !game.over && game.persist());
  document.addEventListener('visibilitychange', () => { if (document.hidden && game && !game.over && !game.paused) pause(); });

  // sfondo del menu
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#10151c';
  ctx.fillRect(0, 0, cv.width, cv.height);

  M.ui = { menu, play };
  menu();
})();
