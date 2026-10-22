extends Node2D

const W := 960.0
const H := 540.0
const WALL_H := 320.0
const BELT_TOP := 430.0
const WALK_Y := 432.0
const BIN_TOP := 148.0
const BIN_X0 := 90.0
const BIN_DX := 130.0
const BIN_W := 110.0
const MAX_ERRORS := 15
const HELPER_COST := [300, 1000, 2500]
const HELPER_NAMES := ["Gino", "Marta", "Pino", "Lia", "Otto", "Anna", "Ada", "Bob", "Ele", "Ivo"]
const PLAYER_SPEED := 260.0
const HELPER_SPEED := 165.0
const PLATE_SIZE := 22

var slot: Dictionary = {}
var font: Font
var t := 0.0
var level := 0
var belt_speed := 60.0
var belt_offset := 0.0
var score := 0
var spent := 0
var streak := 0
var errors := 0
var saved := 0
var new_words := 0
var spawn_index := 0
var spawn_in := 1.2
var next_id := 1
var words: Array = []
var player_x := W / 2.0
var player_facing := 1.0
var player_phase := 0.0
var player_moving := false
var player_carry: Dictionary = {}
var helpers: Array = []
var pops: Array = []
var toasts: Array = []
var game_over := false
var summary: Dictionary = {}

func _ready() -> void:
	font = ThemeDB.fallback_font
	process_mode = Node.PROCESS_MODE_ALWAYS
	_setup_inputs()
	slot = SaveManager.get_last_slot()
	if slot.is_empty():
		var hero := {"name": "Niky", "gender": "m", "hair": "short", "hair_color": 1, "shirt": 1, "skin": 1}
		slot = SaveManager.create_slot(hero, WordGen.random_seed())

func _setup_inputs() -> void:
	_add_action("move_left", [KEY_A, KEY_LEFT])
	_add_action("move_right", [KEY_D, KEY_RIGHT])
	_add_action("act", [KEY_SPACE, KEY_E, KEY_DOWN])
	_add_action("hire", [KEY_H])
	_add_action("pause", [KEY_P, KEY_ESCAPE])

func _add_action(action: String, keys: Array) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	for k in keys:
		var ev := InputEventKey.new()
		ev.physical_keycode = k
		InputMap.action_add_event(action, ev)

func _unhandled_input(event: InputEvent) -> void:
	if game_over:
		if event.is_action_pressed("ui_accept"):
			get_tree().paused = false
			get_tree().reload_current_scene()
		return
	if event.is_action_pressed("pause"):
		get_tree().paused = not get_tree().paused
	elif get_tree().paused:
		return
	elif event.is_action_pressed("act"):
		_action()
	elif event.is_action_pressed("hire"):
		_hire()
	elif event is InputEventMouseButton and event.pressed:
		if _hire_pill_rect().has_point(event.position):
			_hire()

func _process(delta: float) -> void:
	if game_over or get_tree().paused:
		queue_redraw()
		return
	t += delta
	level = int(t / 20.0)
	belt_speed = minf(190.0, 60.0 + level * 9.0)
	belt_offset = fposmod(belt_offset + belt_speed * delta, 40.0)
	_update_spawn(delta)
	_update_words(delta)
	_update_player(delta)
	for i in helpers.size():
		_update_helper(i, delta)
	_update_effects(delta)
	if errors >= MAX_ERRORS:
		_end_game()
	queue_redraw()

func _update_spawn(delta: float) -> void:
	spawn_in -= delta
	if spawn_in > 0.0:
		return
	var word := WordGen.make_word(slot["seed"], spawn_index)
	var rng := WordGen.rng_for(slot["seed"], "t%d" % spawn_index)
	spawn_index += 1
	spawn_in = maxf(0.9, 3.2 - level * 0.2) * (0.75 + rng.randf() * 0.5)
	var width := _plate_w(word["text"])
	var x := W + width / 2.0 + 10.0
	for o in words:
		x = maxf(x, o["x"] + (_plate_w(o["text"]) + width) / 2.0 + 14.0)
	word["x"] = x
	word["id"] = next_id
	word["claim"] = -1
	next_id += 1
	words.append(word)

func _update_words(delta: float) -> void:
	for w in words.duplicate():
		w["x"] -= belt_speed * delta
		if w["x"] < 24.0:
			words.erase(w)
			_penalty(w, "Persa!", w["x"] + 20.0, BELT_TOP)

func _update_player(delta: float) -> void:
	var dir := Input.get_axis("move_left", "move_right")
	player_moving = dir != 0.0
	if player_moving:
		player_facing = signf(dir)
		var mult := _carry_mult(player_carry)
		player_x = clampf(player_x + dir * PLAYER_SPEED * mult * delta, 30.0, W - 30.0)
		player_phase += delta * 11.0 * mult

func _carry_mult(carry: Dictionary) -> float:
	if carry.is_empty():
		return 1.0
	return WordGen.length_info(carry["len"])["carry"]

func _plate_w(text: String) -> float:
	return font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, PLATE_SIZE).x + 18.0

func _reachable(w: Dictionary, px: float) -> bool:
	return absf(w["x"] - px) < _plate_w(w["text"]) / 2.0 + 26.0

func _bin_x(i: int) -> float:
	return BIN_X0 + i * BIN_DX

func _bin_under(x: float) -> int:
	for i in WordGen.CATS.size():
		if absf(x - _bin_x(i)) < BIN_W / 2.0 + 4.0:
			return i
	return -1

func _action() -> void:
	if not player_carry.is_empty():
		var bin := _bin_under(player_x)
		if bin < 0:
			_toast("Portala sotto una cassa!")
			return
		var w := player_carry
		player_carry = {}
		_drop(w, bin, true)
	else:
		var best: Dictionary = {}
		for w in words:
			if _reachable(w, player_x) and (best.is_empty() or absf(w["x"] - player_x) < absf(best["x"] - player_x)):
				best = w
		if not best.is_empty():
			words.erase(best)
			player_carry = best

func _drop(w: Dictionary, bin: int, by_player: bool) -> void:
	if bin != w["cat"]:
		_penalty(w, "Cassa sbagliata!", _bin_x(bin), BIN_TOP + 20.0)
		return
	var pts: int = WordGen.length_info(w["len"])["base"]
	if by_player:
		streak += 1
		pts = roundi(pts * _multiplier())
	score += pts
	saved += 1
	slot["stats"]["saved"] += 1
	if SaveManager.add_to_dex(w["text"]):
		new_words += 1
		_toast("Nuovo nel Pokédex: " + w["text"])
	pops.append({"x": _bin_x(bin), "y": BIN_TOP, "text": "+%d" % pts, "color": Color("#7cfc9a"), "t": 0.0})

func _multiplier() -> float:
	return 1.0 + minf(4.0, floorf(streak / 5.0)) * 0.5

func _penalty(w: Dictionary, why: String, x: float, y: float) -> void:
	var pts := roundi(WordGen.length_info(w["len"])["base"] / 2.0)
	score = maxi(0, score - pts)
	streak = 0
	errors += 1
	pops.append({"x": clampf(x, 40.0, W - 40.0), "y": y, "text": "%s -%d" % [why, pts], "color": Color("#ff6b6b"), "t": 0.0})

func _hire() -> void:
	if helpers.size() >= HELPER_COST.size():
		_toast("La squadra è al completo!")
		return
	var cost: int = HELPER_COST[helpers.size()]
	if score < cost:
		_toast("Servono %d punti per assumere un collega" % cost)
		return
	score -= cost
	spent += cost
	var rng := WordGen.rng_for(slot["seed"], "helper%d" % helpers.size())
	var look := {
		"name": "",
		"gender": "f" if rng.randf() < 0.5 else "m",
		"hair": ["bald", "short", "long"][rng.randi() % 3],
		"hair_color": rng.randi() % PersonDrawer.HAIR_COLORS.size(),
		"shirt": rng.randi() % PersonDrawer.SHIRTS.size(),
		"skin": rng.randi() % PersonDrawer.SKINS.size(),
	}
	helpers.append({
		"name": HELPER_NAMES[rng.randi() % HELPER_NAMES.size()],
		"look": look,
		"x": W - 40.0,
		"carry": {},
		"target": -1,
		"wrong": false,
		"facing": -1.0,
		"phase": 0.0,
		"moving": false,
		"cd": 0.0,
	})
	_toast("Nuovo collega: %s ti dà una mano!" % helpers[-1]["name"])

func _update_helper(idx: int, delta: float) -> void:
	var h: Dictionary = helpers[idx]
	var goal := -1.0
	h["cd"] = maxf(0.0, h["cd"] - delta)
	var mult := _carry_mult(h["carry"])
	if not h["carry"].is_empty():
		var bin: int = h["carry"]["cat"]
		if h["wrong"]:
			bin = (bin + 1) % WordGen.CATS.size()
		goal = _bin_x(bin)
		if absf(h["x"] - goal) < 6.0 and h["cd"] <= 0.0:
			var w: Dictionary = h["carry"]
			h["carry"] = {}
			h["cd"] = 0.4
			_drop(w, bin, false)
			goal = -1.0
	elif h["cd"] <= 0.0:
		var target := _word_by_id(h["target"])
		if target.is_empty() or target["claim"] != idx:
			h["target"] = -1
			target = {}
			var best_time := INF
			for w in words:
				if w["claim"] != -1 and w["claim"] != idx:
					continue
				var tt := _intercept_time(h["x"], w["x"])
				if tt < best_time:
					best_time = tt
					target = w
			if not target.is_empty():
				target["claim"] = idx
				h["target"] = target["id"]
		if not target.is_empty():
			goal = target["x"]
			if _reachable(target, h["x"]) and absf(target["x"] - h["x"]) < 16.0:
				words.erase(target)
				h["carry"] = target
				h["target"] = -1
				h["cd"] = 0.25
				h["wrong"] = randf() < 0.08
	h["moving"] = false
	if goal >= 0.0 and (not h["carry"].is_empty() or h["cd"] <= 0.0):
		var d: float = goal - h["x"]
		if absf(d) > 4.0:
			h["facing"] = signf(d)
			h["x"] = clampf(h["x"] + signf(d) * minf(absf(d), HELPER_SPEED * mult * delta), 30.0, W - 30.0)
			h["moving"] = true
			h["phase"] += delta * 10.0

func _word_by_id(id: int) -> Dictionary:
	for w in words:
		if w["id"] == id:
			return w
	return {}

func _intercept_time(hx: float, wx: float) -> float:
	var dx := wx - hx
	if dx >= 0.0:
		return dx / (HELPER_SPEED + belt_speed)
	if HELPER_SPEED > belt_speed:
		return -dx / (HELPER_SPEED - belt_speed)
	return INF

func _update_effects(delta: float) -> void:
	for p in pops:
		p["t"] += delta
		p["y"] -= 28.0 * delta
	pops = pops.filter(func(p): return p["t"] < 1.1)
	for m in toasts:
		m["t"] += delta
	toasts = toasts.filter(func(m): return m["t"] < 3.0)

func _toast(text: String) -> void:
	toasts.append({"text": text, "t": 0.0})
	if toasts.size() > 3:
		toasts.pop_front()

func _end_game() -> void:
	game_over = true
	var total := score + spent
	var record: bool = total > int(slot["stats"]["best"])
	if record:
		slot["stats"]["best"] = total
	slot["stats"]["runs"] += 1
	SaveManager.save_slot(slot)
	summary = {"score": total, "saved": saved, "new_words": new_words, "record": record, "best": int(slot["stats"]["best"])}

func _draw() -> void:
	_draw_background()
	var carrying := not player_carry.is_empty()
	var under := _bin_under(player_x) if carrying else -1
	for i in WordGen.CATS.size():
		_draw_bin(i, i == under)
	for h in helpers:
		var opts := {"scale": 1.2, "facing": h["facing"], "phase": h["phase"], "moving": h["moving"], "carry": not h["carry"].is_empty(), "name": h["name"]}
		PersonDrawer.draw_person(self, Vector2(h["x"], WALK_Y - 2.0), h["look"], opts)
	var me := {"scale": 1.3, "facing": player_facing, "phase": player_phase, "moving": player_moving, "carry": carrying, "name": slot["character"]["name"]}
	PersonDrawer.draw_person(self, Vector2(player_x, WALK_Y), slot["character"], me)
	_draw_belt()
	var near: Dictionary = {}
	if not carrying:
		for w in words:
			if _reachable(w, player_x) and (near.is_empty() or absf(w["x"] - player_x) < absf(near["x"] - player_x)):
				near = w
	for w in words:
		_draw_plate(w["text"], w["cat"], Vector2(w["x"], BELT_TOP + 8.0), w == near)
	for h in helpers:
		if not h["carry"].is_empty():
			_draw_plate(h["carry"]["text"], h["carry"]["cat"], Vector2(h["x"], WALK_Y - 60.0), false)
	if carrying:
		_draw_plate(player_carry["text"], player_carry["cat"], Vector2(player_x, WALK_Y - 60.0), false)
	_draw_effects()
	_draw_hud()
	if game_over:
		_draw_game_over()

func _text(txt: String, center_x: float, baseline_y: float, size: int, color: Color) -> void:
	draw_string(font, Vector2(center_x - 300.0, baseline_y), txt, HORIZONTAL_ALIGNMENT_CENTER, 600.0, size, color)

func _draw_background() -> void:
	draw_rect(Rect2(0, 0, W, WALL_H), Color("#34404f"))
	draw_rect(Rect2(0, WALL_H, W, H - WALL_H), Color("#3d414b"))
	for x in range(0, int(W), 60):
		draw_line(Vector2(x, 0), Vector2(x, WALL_H), Color(1, 1, 1, 0.05), 2.0)
	draw_rect(Rect2(0, WALL_H - 8.0, W, 8.0), Color(0, 0, 0, 0.25))

func _draw_bin(i: int, active: bool) -> void:
	var c: Color = WordGen.CATS[i]["color"]
	var x := _bin_x(i)
	var bot := BIN_TOP + 122.0
	var body := PackedVector2Array([Vector2(x - 50.0, BIN_TOP + 16.0), Vector2(x + 50.0, BIN_TOP + 16.0), Vector2(x + 42.0, bot), Vector2(x - 42.0, bot)])
	draw_colored_polygon(body, c)
	for k in [-1, 0, 1]:
		draw_rect(Rect2(x + k * 24.0 - 3.0, BIN_TOP + 30.0, 6.0, bot - BIN_TOP - 42.0), Color(0, 0, 0, 0.18))
	var lid_y := BIN_TOP - 4.0 if active else BIN_TOP + 2.0
	draw_rect(Rect2(x - 56.0, lid_y, 112.0, 16.0), c.darkened(0.25))
	draw_rect(Rect2(x - 36.0, lid_y + 12.0, 72.0, 4.0), Color("#10141a"))
	if active:
		draw_rect(Rect2(x - 58.0, BIN_TOP - 6.0, 116.0, 134.0), Color.WHITE, false, 2.0)
	_text(WordGen.CATS[i]["name"], x, bot + 18.0, 13, Color.WHITE if active else c)

func _draw_belt() -> void:
	for x in range(60, int(W), 220):
		draw_rect(Rect2(x, BELT_TOP + 30.0, 14.0, H - BELT_TOP - 30.0), Color("#17191e"))
	draw_rect(Rect2(0, BELT_TOP, W, 36.0), Color("#2d3138"))
	draw_rect(Rect2(0, BELT_TOP, W, 5.0), Color("#3a3f48"))
	var x := -belt_offset
	while x < W:
		draw_rect(Rect2(x, BELT_TOP + 8.0, 3.0, 24.0), Color(0, 0, 0, 0.35))
		x += 40.0
	draw_rect(Rect2(0, BELT_TOP - 30.0, 60.0, 70.0), Color(0.86, 0.15, 0.15, 0.35))
	draw_string(font, Vector2(6, BELT_TOP + 56.0), "< SCARTO", HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color("#9ca3af"))

func _draw_plate(text: String, cat: int, center: Vector2, highlight: bool) -> void:
	var w := _plate_w(text)
	var col: Color = WordGen.CATS[cat]["color"]
	var r := Rect2(center.x - w / 2.0, center.y - 16.0, w, 32.0)
	draw_rect(r, Color("#0f1318"))
	draw_rect(r, Color.WHITE if highlight else col.darkened(0.25), false, 3.0 if highlight else 2.0)
	draw_string(font, Vector2(r.position.x, center.y + 8.0), text, HORIZONTAL_ALIGNMENT_CENTER, w, PLATE_SIZE, col)

func _draw_effects() -> void:
	for p in pops:
		var a := clampf((1.1 - p["t"]) * 2.0, 0.0, 1.0)
		var c: Color = p["color"]
		c.a = a
		_text(p["text"], p["x"], p["y"], 18, c)

func _hire_pill_rect() -> Rect2:
	return Rect2(10, 46, 290, 26)

func _draw_hud() -> void:
	draw_rect(Rect2(0, 0, W, 40), Color(0.03, 0.04, 0.05, 0.62))
	var mult := _multiplier()
	var err_col := Color("#ff6b6b") if errors > MAX_ERRORS - 5 else Color("#e5e7eb")
	draw_string(font, Vector2(14, 27), "Punti %d" % score, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color.WHITE)
	draw_string(font, Vector2(160, 27), "Serie %d ×%.1f" % [streak, mult], HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color("#ffd166") if mult > 1.0 else Color("#9ca3af"))
	draw_string(font, Vector2(320, 27), "Velocità %d" % (level + 1), HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color("#9ad1ff"))
	draw_string(font, Vector2(460, 27), "Errori %d/%d" % [errors, MAX_ERRORS], HORIZONTAL_ALIGNMENT_LEFT, -1, 18, err_col)
	draw_string(font, Vector2(610, 27), "Colleghi %d" % helpers.size(), HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color("#c4b5fd"))
	draw_string(font, Vector2(W - 10.0 - 300.0, 26), "Seme: " + str(slot["seed"]), HORIZONTAL_ALIGNMENT_RIGHT, 300.0, 14, Color("#9ca3af"))

	var r := _hire_pill_rect()
	draw_rect(r, Color(0.03, 0.04, 0.05, 0.7))
	if helpers.size() < HELPER_COST.size():
		var cost: int = HELPER_COST[helpers.size()]
		var can := score >= cost
		var fill := clampf(float(score) / float(cost), 0.0, 1.0)
		var green := Color("#22c55e") if int(t * 2.5) % 2 == 0 else Color("#16a34a")
		draw_rect(Rect2(r.position, Vector2(r.size.x * fill, r.size.y)), green if can else Color("#3b4a63"))
		var label := "ASSUMI collega %d (-%d)  [H]" % [helpers.size() + 1, cost] if can else "Collega %d: %d/%d punti" % [helpers.size() + 1, score, cost]
		_text(label, r.position.x + r.size.x / 2.0, r.position.y + 18.0, 13, Color.WHITE)
	else:
		_text("Squadra al completo", r.position.x + r.size.x / 2.0, r.position.y + 18.0, 13, Color.WHITE)

	for i in toasts.size():
		var m: Dictionary = toasts[i]
		var tw := font.get_string_size(m["text"], HORIZONTAL_ALIGNMENT_LEFT, -1, 16).x + 24.0
		var alpha := clampf(3.0 - m["t"], 0.0, 1.0)
		draw_rect(Rect2(W / 2.0 - tw / 2.0, 78.0 + i * 30.0, tw, 26.0), Color(0, 0, 0, 0.6 * alpha))
		_text(m["text"], W / 2.0, 96.0 + i * 30.0, 16, Color(1, 1, 1, alpha))

func _draw_game_over() -> void:
	draw_rect(Rect2(0, 0, W, H), Color(0, 0, 0, 0.6))
	var box := Rect2(W / 2.0 - 190.0, 120.0, 380.0, 300.0)
	draw_rect(box, Color("#1a212b"))
	draw_rect(box, Color("#34404f"), false, 2.0)
	_text("Turno finito!", W / 2.0, 165.0, 26, Color.WHITE)
	if summary.get("record", false):
		_text("NUOVO RECORD!", W / 2.0, 200.0, 18, Color("#f5c518"))
	_text("Punti: %d   (record %d)" % [summary["score"], summary["best"]], W / 2.0, 245.0, 18, Color.WHITE)
	_text("Rifiuti smistati: %d" % summary["saved"], W / 2.0, 280.0, 18, Color.WHITE)
	_text("Nuovi nel Pokédex: %d" % summary["new_words"], W / 2.0, 315.0, 18, Color.WHITE)
	_text("Premi Invio per ricominciare", W / 2.0, 385.0, 16, Color("#9ad1ff"))
