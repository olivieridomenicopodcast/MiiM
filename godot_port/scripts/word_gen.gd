class_name WordGen
extends RefCounted
## Costanti
const CATS := [
	{"name": "Plastica", "color": Color("#f5c518")},
	{"name": "Carta", "color": Color("#3b82f6")},
	{"name": "Vetro", "color": Color("#22c55e")},
	{"name": "Metallo", "color": Color("#cbd5e1")},
	{"name": "Legno", "color": Color("#b5733a")},
	{"name": "Organico", "color": Color("#ef4444")},
	{"name": "Indifferenziato", "color": Color("#c084fc")},
]

const LENGTHS := [
	{"len": 4, "weight": 0.6, "base": 10, "carry": 1.0},
	{"len": 6, "weight": 0.3, "base": 25, "carry": 0.75},
	{"len": 8, "weight": 0.1, "base": 60, "carry": 0.5},
]

const CONS := "bbcccddfgglllmmmnnnpppprrrssstttvvz"
const VOWS := "aaeeiiooou"

const PATTERNS := {
	2: ["CV", "CV", "CV", "VC", "VV"],
	3: ["CVC", "CVV", "VCV", "CVC", "CCV"],
	4: ["CVCV", "CVCC", "CVVC", "VCVC", "CCVC", "CVCV"],
}

## Funzioni di utilità
static func reversed_text(s: String) -> String:
	var out := ""
	for i in range(s.length() - 1, -1, -1):
		out += s[i]
	return out

static func is_palindrome(word: String) -> bool:
	var s := word.to_lower()
	return s == reversed_text(s)

static func category_of(text: String) -> int:
	return text.to_lower().hash() % CATS.size()

static func length_info(length: int) -> Dictionary:
	for l in LENGTHS:
		if l["len"] == length:
			return l
	return LENGTHS[0]

static func rng_for(seed_text: String, key: String) -> RandomNumberGenerator:
	var rng := RandomNumberGenerator.new()
	rng.seed = (seed_text + "|" + key).hash()
	return rng

static func make_word(seed_text: String, index: int) -> Dictionary:
	var rng := rng_for(seed_text, "w%d" % index)
	var r := rng.randf()
	var acc := 0.0
	var length := 4
	for l in LENGTHS:
		acc += l["weight"]
		if r < acc:
			length = l["len"]
			break
	var half := floori(length / 2.0)
	var options: Array = PATTERNS[half]
	var pattern: String = options[rng.randi() % options.size()]
	var half_text := ""
	for c in pattern:
		var source := CONS if c == "C" else VOWS
		half_text += source[rng.randi() % source.length()]
	var low := half_text + reversed_text(half_text)
	var last := low.length() - 1
	var text := low[0].to_upper() + low.substr(1, last - 1) + low[last].to_upper()
	return {"text": text, "len": length, "cat": category_of(text)}

static func random_seed() -> String:
	var alphabet := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	var out := ""
	for _i in 6:
		out += alphabet[randi() % alphabet.length()]
	return out
