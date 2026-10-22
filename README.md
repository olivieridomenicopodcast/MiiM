# Smista Rifiuti

Mini gioco 2D a generazione procedurale di gestione rifiuti: sei un addetto allo smistamento. Sul nastro arrivano i rifiuti, colorati in base al tipo: portali nella cassa del colore giusto.

Nessuna build: apri `index.html` nel browser (HTML + Canvas + JS puro).

## Comandi
- ← → / A D: muovi · Spazio / E / ↓: prendi o lascia · P / Esc: pausa
- Su touch compaiono i pulsanti a schermo; il layout si adatta a schermo orizzontale e verticale.

## Regole
- Rifiuti leggeri (frequenti), medi, pesanti (rari); più sono pesanti, più ti rallentano e più valgono.
- Rifiuto perso o cassa sbagliata: perdi metà dei punti che valeva, azzeri la serie e fai un errore (15 errori = fine turno).
- Il nastro accelera col tempo. Con i punti (300 / 1000 / 2500) puoi assumere fino a 3 colleghi comandati dall'IA: tasto H o tocco sul riquadro in alto, che mostra il progresso.
- Ogni rifiuto smistato entra nel catalogo del seme.

## Seme e salvataggi
- Il seme (casuale o scelto) determina i rifiuti che arrivano.
- Salvataggi multipli in `localStorage` (personaggio, seme, catalogo, record, partita in corso), con esporta/importa JSON.

## Struttura
`js/core.js` RNG + generazione · `js/draw.js` personaggi · `js/storage.js` salvataggi · `js/game.js` logica/render · `js/ui.js` menu e schermate
