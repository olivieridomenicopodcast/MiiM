extends Node

const SAVE_PATH := "user://smista_rifiuti.json"
const FORMAT := "smista-rifiuti"

var slots: Array = []
var dex: Dictionary = {}
var last_id := ""
var mute := false

func _ready() -> void:
	load_all()

func load_all() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	var data = JSON.parse_string(file.get_as_text())
	file.close()
	if typeof(data) != TYPE_DICTIONARY:
		return
	slots = data.get("slots", [])
	dex = data.get("dex", {})
	last_id = data.get("last", "")
	mute = data.get("mute", false)

func save_all() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	var data := {"slots": slots, "dex": dex, "last": last_id, "mute": mute}
	file.store_string(JSON.stringify(data, "\t"))
	file.close()

func create_slot(character: Dictionary, seed_text: String) -> Dictionary:
	var clean_seed := seed_text.strip_edges().left(40)
	if clean_seed == "":
		clean_seed = WordGen.random_seed()
	var now := Time.get_unix_time_from_system()
	var slot := {
		"id": "s%d%04d" % [int(now), randi() % 10000],
		"seed": clean_seed,
		"character": character,
		"stats": {"best": 0, "saved": 0, "runs": 0},
		"created": now,
		"updated": now,
	}
	slots.append(slot)
	last_id = slot["id"]
	save_all()
	return slot

func get_slot(id: String) -> Dictionary:
	for s in slots:
		if s["id"] == id:
			return s
	return {}

func get_last_slot() -> Dictionary:
	var s := get_slot(last_id)
	if s.is_empty() and not slots.is_empty():
		s = sorted_slots()[0]
	return s

func sorted_slots() -> Array:
	var copy := slots.duplicate()
	copy.sort_custom(func(a, b): return a["updated"] > b["updated"])
	return copy

func save_slot(slot: Dictionary) -> void:
	slot["updated"] = Time.get_unix_time_from_system()
	last_id = slot["id"]
	save_all()

func remove_slot(id: String) -> void:
	slots = slots.filter(func(s): return s["id"] != id)
	if last_id == id:
		last_id = ""
	save_all()

func add_to_dex(text: String) -> bool:
	if dex.has(text):
		dex[text]["n"] += 1
		return false
	dex[text] = {"cat": WordGen.category_of(text), "len": text.length(), "n": 1}
	return true

func export_json(ids: Array = []) -> String:
	var chosen: Array = []
	for s in slots:
		if ids.is_empty() or ids.has(s["id"]):
			chosen.append(s)
	var data := {"format": FORMAT, "version": 2, "dex": dex, "slots": chosen}
	return JSON.stringify(data, "\t")

func export_to_file(path: String, ids: Array = []) -> bool:
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(export_json(ids))
	file.close()
	return true

func import_from_file(path: String) -> int:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return 0
	var text := file.get_as_text()
	file.close()
	return import_json(text)

func import_json(text: String) -> int:
	var data = JSON.parse_string(text)
	if typeof(data) != TYPE_DICTIONARY or data.get("format", "") != FORMAT:
		return 0
	merge_dex(data.get("dex", {}))
	var count := 0
	for raw in data.get("slots", []):
		var slot := sanitize_slot(raw)
		if not slot.is_empty():
			slots.append(slot)
			count += 1
	save_all()
	return count

func sanitize_slot(raw) -> Dictionary:
	if typeof(raw) != TYPE_DICTIONARY or typeof(raw.get("seed")) != TYPE_STRING:
		return {}
	var ch: Dictionary = raw.get("character", {})
	var stats: Dictionary = raw.get("stats", {})
	var now := Time.get_unix_time_from_system()
	return {
		"id": "s%d%04d" % [int(now), randi() % 10000],
		"seed": str(raw["seed"]).strip_edges().left(40),
		"character": sanitize_character(ch),
		"stats": {
			"best": clampi(int(stats.get("best", 0)), 0, 1000000000),
			"saved": clampi(int(stats.get("saved", 0)), 0, 1000000000),
			"runs": clampi(int(stats.get("runs", 0)), 0, 1000000000),
		},
		"created": now,
		"updated": now,
	}

func sanitize_character(ch: Dictionary) -> Dictionary:
	var hair := str(ch.get("hair", "short"))
	if not ["bald", "short", "long"].has(hair):
		hair = "short"
	return {
		"name": str(ch.get("name", "Operaio")).left(14),
		"gender": "f" if ch.get("gender", "m") == "f" else "m",
		"hair": hair,
		"hair_color": clampi(int(ch.get("hair_color", 0)), 0, PersonDrawer.HAIR_COLORS.size() - 1),
		"shirt": clampi(int(ch.get("shirt", 0)), 0, PersonDrawer.SHIRTS.size() - 1),
		"skin": clampi(int(ch.get("skin", 1)), 0, PersonDrawer.SKINS.size() - 1),
	}

func is_valid_word(text: String) -> bool:
	var re := RegEx.new()
	re.compile("^[A-Za-z]{4,8}$")
	if re.search(text) == null:
		return false
	if text.length() % 2 != 0:
		return false
	if text[0] != text[0].to_upper() or text[text.length() - 1] != text[text.length() - 1].to_upper():
		return false
	return WordGen.is_palindrome(text)

func merge_dex(src) -> void:
	if typeof(src) != TYPE_DICTIONARY:
		return
	for text in src:
		if not is_valid_word(str(text)):
			continue
		var entry = src[text]
		var n := 1
		if typeof(entry) == TYPE_DICTIONARY:
			n = maxi(1, int(entry.get("n", 1)))
		if dex.has(text):
			dex[text]["n"] = maxi(int(dex[text]["n"]), n)
		else:
			dex[text] = {"cat": WordGen.category_of(text), "len": str(text).length(), "n": n}
