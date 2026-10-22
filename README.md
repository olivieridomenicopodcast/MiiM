# Smista Rifiuti

Mini gioco 2D a generazione procedurale di gestione rifiuti: sei un addetto allo smistamento. Sul nastro arrivano i rifiuti, colorati in base al tipo: portali nella cassa del colore giusto.

Nessuna build: apri `index.html` nel browser (HTML + Canvas + JS puro).

## Comandi
- ← → / A D: muovi · Spazio / E / ↓: prendi o lascia · P / Esc: pausa
- Su touch compaiono i pulsanti a schermo. Meglio giocare con lo schermo in orizzontale.

## Regole
- Rifiuti leggeri (frequenti), medi, pesanti (rari); più sono pesanti, più ti rallentano e più valgono.
- Rifiuto perso o cassa sbagliata: perdi metà dei punti che valeva, azzeri la serie e fai un errore (15 errori = fine turno).
- Ogni tanto due rifiuti arrivano accavallati: prendili e premi Spazio a raffica per staccarli (la barra cala se rallenti), poi portali nelle casse giuste.
- Il nastro accelera col tempo. Con i punti (300 / 1000 / 2500) puoi assumere fino a 3 colleghi comandati dall'IA: tasto H o tocco sul riquadro in alto, che mostra il progresso.
- Ogni rifiuto smistato entra nel Pokédex (unico, valido per tutti i semi).

## Modalità
- **Il nastro**: la modalità principale.
- (Le modalità qui sotto si sbloccano finendo almeno un turno del nastro.)
- **Dominò dei palindromi**: attacca le parole per lettera o per colore contro Gino.
- **Il fiume dei riflessi**: raccogli i rifiuti veri, evita le illusioni (riflesso diverso).
- **Mercatino dell'usato**: compra, contratta e rivendi in 12 clienti.

## Seme e salvataggi
- Il seme (casuale o scelto) determina i rifiuti che arrivano.
- Salvataggi multipli in `localStorage` (personaggio, seme, Pokédex, record, partita in corso), con esporta/importa JSON.

## Struttura
`js/core.js` RNG + generazione · `js/draw.js` personaggi · `js/storage.js` salvataggi · `js/game.js` logica/render · `js/ui.js` menu e schermate

## Porting in GDScript (Godot 4) e guida
- `godot_port/scripts/` contiene il porting del gioco in GDScript (word_gen, save_manager, person_drawer, game).
- `docs/smista-rifiuti-gdscript.pdf` è la guida con il codice spiegato riga per riga.
