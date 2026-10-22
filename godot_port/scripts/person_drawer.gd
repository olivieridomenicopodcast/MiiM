class_name PersonDrawer
extends RefCounted

const HAIR_COLORS := [Color("#1b1b1b"), Color("#4a2c17"), Color("#8b5a2b"), Color("#d9a441"), Color("#c0392b"), Color("#9aa0a6")]
const SKINS := [Color("#fde0c8"), Color("#f5cba7"), Color("#e0ac81"), Color("#c68642"), Color("#8d5524"), Color("#5c3a21")]
const SHIRTS := [
	Color("#e53935"), Color("#fb8c00"), Color("#fdd835"), Color("#7cb342"), Color("#2e7d32"),
	Color("#00acc1"), Color("#1e88e5"), Color("#3949ab"), Color("#8e24aa"), Color("#d81b60"),
	Color("#6d4c41"), Color("#f5f5f5"), Color("#9e9e9e"), Color("#37474f"), Color("#ff8a80"),
]
const WORK_SHIRT := Color("#4b5563")
const PANTS := Color("#2d3748")
const REFLECTIVE := Color("#eef2f5")

static func draw_person(ci: CanvasItem, pos: Vector2, ch: Dictionary, o: Dictionary = {}) -> void:
	var s: float = o.get("scale", 1.0)
	var facing: float = o.get("facing", 1.0)
	var moving: bool = o.get("moving", false)
	var carry: bool = o.get("carry", false)
	var swing := 0.0
	if moving:
		swing = sin(o.get("phase", 0.0))
	var female: bool = ch["gender"] == "f"
	var skin: Color = SKINS[int(ch["skin"])]
	var hair_c: Color = HAIR_COLORS[int(ch["hair_color"])]
	var vest: Color = SHIRTS[int(ch["shirt"])]
	var hair: String = ch["hair"]

	ci.draw_set_transform(pos, 0.0, Vector2(s * facing, s))

	if hair == "long":
		ci.draw_rect(Rect2(-15, -85, 30, 50 if female else 40), hair_c)

	ci.draw_rect(Rect2(-10 + swing * 6.0, -26, 9, 26), PANTS)
	ci.draw_rect(Rect2(1 - swing * 6.0, -26, 9, 26), PANTS)
	ci.draw_rect(Rect2(-12 + swing * 6.0, -4, 13, 5), Color.BLACK)
	ci.draw_rect(Rect2(0 - swing * 6.0, -4, 13, 5), Color.BLACK)

	var body_w := 11.0 if female else 14.0
	ci.draw_rect(Rect2(-body_w, -58, body_w * 2.0, 32 if female else 34), WORK_SHIRT)
	var vw := 9.0 if female else 12.0
	ci.draw_rect(Rect2(-vw, -57, vw * 2.0, 30 if female else 33), vest)
	ci.draw_rect(Rect2(-vw, -44, vw * 2.0, 4), REFLECTIVE)
	ci.draw_rect(Rect2(-vw, -33, vw * 2.0, 4), REFLECTIVE)
	ci.draw_rect(Rect2(-vw + 3.0, -57, 3, 13), REFLECTIVE)
	ci.draw_rect(Rect2(vw - 6.0, -57, 3, 13), REFLECTIVE)

	for side in [-1.0, 1.0]:
		var hand := Vector2(side * (body_w + 3.0) + side * swing * 2.0, -32.0 + side * swing * 5.0)
		if carry:
			hand = Vector2(side * 21.0, -46.0)
		ci.draw_line(Vector2(side * body_w, -54), hand, WORK_SHIRT, 8.0)
		ci.draw_circle(hand, 4.2, skin)

	ci.draw_rect(Rect2(-4, -63, 8, 7), skin)
	ci.draw_circle(Vector2(0, -73), 13.0, skin)
	if hair != "bald":
		_half_disc(ci, Vector2(0, -75), 14.0, hair_c)
	if female:
		if hair == "short":
			ci.draw_circle(Vector2(-17, -66), 6.0, hair_c)
			ci.draw_rect(Rect2(-16, -78, 5, 3), Color("#333333"))
		ci.draw_circle(Vector2(-12, -67), 2.2, Color("#f2c94c"))

	ci.draw_circle(Vector2(-1, -72), 1.8, Color("#222222"))
	ci.draw_circle(Vector2(7, -72), 1.8, Color("#222222"))
	if female:
		ci.draw_line(Vector2(-3, -74), Vector2(-6, -77), Color("#222222"), 1.8)
		ci.draw_line(Vector2(-1, -75), Vector2(-2, -79), Color("#222222"), 1.8)
		ci.draw_line(Vector2(9, -74), Vector2(12, -77), Color("#222222"), 1.8)
		ci.draw_line(Vector2(7, -75), Vector2(8, -79), Color("#222222"), 1.8)
	var mouth := Color("#e0245e") if female else Color("#7a3b2e")
	ci.draw_arc(Vector2(3.5, -67), 3.0, 0.15 * PI, 0.85 * PI, 12, mouth, 3.0 if female else 1.5)

	ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	var name_text: String = o.get("name", "")
	if name_text != "":
		var font := ThemeDB.fallback_font
		var p := pos + Vector2(-60, -94.0 * s)
		ci.draw_string(font, p + Vector2(1, 1), name_text, HORIZONTAL_ALIGNMENT_CENTER, 120.0, 12, Color.BLACK)
		ci.draw_string(font, p, name_text, HORIZONTAL_ALIGNMENT_CENTER, 120.0, 12, Color.WHITE)

static func _half_disc(ci: CanvasItem, center: Vector2, radius: float, color: Color) -> void:
	var points := PackedVector2Array()
	for i in range(0, 13):
		var a := PI + PI * float(i) / 12.0
		points.append(center + Vector2(cos(a), sin(a)) * radius)
	ci.draw_colored_polygon(points, color)
