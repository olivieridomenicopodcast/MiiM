# Smista Palindromi

Mini gioco 2D a generazione procedurale: sei un addetto allo smistamento rifiuti. Sul nastro arrivano **parole palindrome** (es. `LuuL`, `CiaaiC`, `ScavvacS`), colorate come il rifiuto che rappresentano: portale nella cassa del colore giusto.

Nessuna build: apri `index.html` nel browser (HTML + Canvas + JS puro).

## Comandi
- ← → / A D: muovi · Spazio / E / ↓: prendi o lascia · P / Esc: pausa
- Su touch compaiono i pulsanti a schermo.

## Regole
- Parole da 4 (frequenti), 6 (medie), 8 lettere (rare); più lunghe = più pesanti (ti rallentano) e più punti.
- Parola persa o cassa sbagliata: perdi metà dei punti che valeva, azzeri la serie e fai un errore (15 errori = fine turno).
- Il nastro accelera col tempo. A 300 / 1200 / 3000 punti arrivano colleghi comandati dall'IA.
- Ogni parola smistata entra nel Pokédex del seme.

## Seme e salvataggi
- Il seme (casuale o scelto) determina parole e colori.
- Salvataggi multipli in `localStorage` (personaggio, seme, Pokédex, record, partita in corso), con esporta/importa JSON.

## Struttura
`js/core.js` RNG + generazione parole · `js/draw.js` personaggi · `js/storage.js` salvataggi · `js/game.js` logica/render · `js/ui.js` menu e schermate
