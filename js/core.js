// Nucleo: RNG con seme, categorie di rifiuti e generazione procedurale delle parole palindrome.
(function () {
  const M = (window.MiiM = window.MiiM || {});

  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Generatore indipendente per (seme, chiave): stesso input => stessa sequenza.
  function rngFor(seed, key) {
    return mulberry32(xmur3(seed + '|' + key)());
  }

  const CATS = [
    { id: 'plastica', name: 'Plastica', color: '#f5c518' },
    { id: 'carta', name: 'Carta', color: '#3b82f6' },
    { id: 'vetro', name: 'Vetro', color: '#22c55e' },
    { id: 'metallo', name: 'Metallo', color: '#cbd5e1' },
    { id: 'legno', name: 'Legno', color: '#b5733a' },
    { id: 'organico', name: 'Organico', color: '#ef4444' },
    { id: 'indifferenziato', name: 'Indifferenziato', color: '#c084fc' },
  ];

  // Lunghezze: le corte sono frequenti, le lunghe rare.
  const LENGTHS = [
    { len: 4, weight: 0.45, base: 10, carry: 1.0 },
    { len: 6, weight: 0.35, base: 25, carry: 0.75 },
    { len: 8, weight: 0.2, base: 60, carry: 0.5 },
  ];
  const lenInfo = (len) => LENGTHS.find((l) => l.len === len) || LENGTHS[0];

  const CONS = 'bbcccddfgglllmmmnnnpppprrrssstttvvzhhkjqwxy'; // le lettere ripetute escono più spesso; h k j q w x y sono rare
  const VOWS = 'aaeeiiooou';
  const PATTERNS = {
    2: ['CV', 'CV', 'CV', 'VC', 'VV'],
    3: ['CVC', 'CVV', 'VCV', 'CVC', 'CCV'],
    4: ['CVCV', 'CVCC', 'CVVC', 'VCVC', 'CCVC', 'CVCV'],
  };

  function isPalindrome(w) {
    const s = w.toLowerCase();
    return s === s.split('').reverse().join('');
  }

  // Il tipo dipende solo dalla parola (non dal seme), così il Pokédex è valido per tutti i semi.
  // Parole "speciali": rifiuti con un tipo deciso a mano (SooS e SaaS = barattoli di sugo, quindi vetro; IniinI = il pelato al balcone, sempre organico; PooP = YTP, organico pure lei).
  const SPECIAL = { SooS: 2, SaaS: 2, IniinI: 5, PooP: 5 };

  function categoryOf(text) {
    if (text in SPECIAL) return SPECIAL[text];
    return xmur3('cat#' + text.toLowerCase())() % CATS.length;
  }

  // Genera una parola per (seme, chiave), evitando quelle in "avoid" (fino a 12 tentativi).
  function generate(seed, key, avoid) {
    let word = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const rg = rngFor(seed, 'w' + key + (attempt ? ':' + attempt : ''));
      const r = rg();
      let acc = 0;
      let len = 4;
      for (const l of LENGTHS) {
        acc += l.weight;
        if (r < acc) {
          len = l.len;
          break;
        }
      }
      const pats = PATTERNS[len / 2];
      const pat = pats[Math.floor(rg() * pats.length)];
      let h = '';
      for (const c of pat) {
        const src = c === 'C' ? CONS : VOWS;
        h += src[Math.floor(rg() * src.length)];
      }
      const low = h + h.split('').reverse().join('');
      const text = low[0].toUpperCase() + low.slice(1, -1) + low[low.length - 1].toUpperCase();
      word = { text, len, cat: categoryOf(text) };
      if (!avoid || !avoid.has(text)) break;
    }
    return word;
  }

  // Parola n-esima del seme (deterministica). Non ripete nessuna delle RECENT parole precedenti.
  const RECENT = 15;
  const seqCache = {};
  function makeWord(seed, index) {
    if (!seqCache[seed]) {
      if (Object.keys(seqCache).length > 20) for (const k of Object.keys(seqCache)) delete seqCache[k];
      seqCache[seed] = [];
    }
    const arr = seqCache[seed];
    while (arr.length <= index) {
      const recent = new Set(arr.slice(-RECENT).map((w) => w.text));
      arr.push(generate(seed, String(arr.length), recent));
    }
    return arr[index];
  }

  // Parola "gemella" legata a un'altra (per i rifiuti accavallati): diversa da quella data.
  function makeCompanion(seed, index, other) {
    return generate(seed, 'p' + index, new Set([other]));
  }

  function randomSeed() {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }

  Object.assign(M, { xmur3, mulberry32, rngFor, CATS, LENGTHS, lenInfo, makeWord, makeCompanion, categoryOf, SPECIAL, isPalindrome, randomSeed });
})();
