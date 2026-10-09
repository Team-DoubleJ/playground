/*
 * ui-recipe-button-bake.js — 기본 버튼(CanvasUi.NewButton) 레시피의 **정본 드로잉**.
 * ──────────────────────────────────────────────────────────────────────
 * C# 포팅 대상: Team-DoubleJ/recipe-art `Editor/Drawers/UiButtonDrawer.cs` — 이 파일과 1:1(같은 식 · 같은 순서 · 같은 반올림).
 * 비교 목업: html/ui-recipe-button-compare.html · 플랜: docs/plans/02-in-progress/phase-1/asset-recipe-importer-plan.md 「UI 레시피」
 *
 * 레이어 5장 — 전부 **흰색(또는 회색) 기반**이고 색은 게임이 입힌다(Image.color · Button ColorTint).
 * 그래서 호출부가 테두리 색(포커스 청록 · 레벨 칩 금 · 런 종료 빨강)이나 ColorTint(탭 · 런 종료)를 바꾸는 기존 계약이 그대로 산다.
 *   0 shadow — 바깥 자리 그림자 + 립. RGB 0, 알파만.           Image.color = 흰색(그대로)
 *   1 ring   — 테두리 1 단위. RGB = 밝기(위 1.0 → 아래 0.70).  Image.color = 호출부 테두리색(ButtonBorderColor 등)
 *   2 face   — 면. RGB = 밝기(세로 램프 × 결 × 곡면 그늘).     ColorTint 상태색(normal/hover/pressed/selected/disabled)
 *   3 sheen  — 상단 림 + 빛 띠(+ 테두리 위쪽 밝힘). RGB 255, 알파만. Image.color = TextBtnColor
 *   4 glow   — 포커스 발광(바깥 + 안쪽 가장자리). RGB 255, 알파만. Image.color = MenuCursorColor, 포커스일 때만 켠다
 *
 * 텍스처 기하: 해상도 TX=2 텍셀/단위(스프라이트 ppu 200) · 바깥 여백 PAD=4 단위(Image 를 그만큼 바깥으로 키운다)
 *   9-slice 경계 B = (PAD + radius) × TX 텍셀(네 변 동일) · 가운데 칸 CW×CH = 8×16 텍셀
 *   시트 = 레이어 5장을 가로로(왼→오: shadow ring face sheen glow) — 셀 W×H = (2B+8)×(2B+16)
 * 결정성: 난수·노이즈는 run-juice-fx-common.js(v3) 와 같은 mulberry32·makeNoise('ui_button'). Math.random 0.
 */
(function (global) {
  'use strict';
  var TX = 2, PAD = 4, CW = 8, CH = 16;
  var LAYERS = ['shadow', 'ring', 'face', 'sheen', 'glow'];
  var FACE_BOTTOM = 0.68;   // 면 아래 밝기 = SurfaceRaisedBottom / SurfaceRaisedTop (#0e1620 / #16202c 채널 평균)
  var RING_BOTTOM = 0.70;   // 테두리 아래쪽 밝기

  // ── v3 run-juice-fx-common.js 와 비트 동일(mulberry32 · seedOf · makeNoise)
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function seedOf(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function makeNoise(name) {
    var rnd = mulberry32(seedOf('noise:' + name)), i;
    var p = []; for (i = 0; i < 256; i++) p.push(i);
    for (i = 255; i > 0; i--) { var j = (rnd() * (i + 1)) | 0; var tmp = p[i]; p[i] = p[j]; p[j] = tmp; }
    var perm = new Array(512); for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    var val = new Array(256); for (i = 0; i < 256; i++) val[i] = rnd();
    function fade(t) { return t * t * (3 - 2 * t); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function n2(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
      var v00 = val[perm[X + perm[Y]]], v10 = val[perm[X + 1 + perm[Y]]];
      var v01 = val[perm[X + perm[Y + 1]]], v11 = val[perm[X + 1 + perm[Y + 1]]];
      var u = fade(xf), v = fade(yf);
      return lerp(lerp(v00, v10, u), lerp(v01, v11, u), v);
    }
    function fbm(x, y, oct) {
      oct = oct || 4; var s = 0, a = 0.5, f = 1, n = 0;
      for (var k = 0; k < oct; k++) { s += a * n2(x * f + k * 17.3, y * f - k * 9.1); n += a; a *= 0.5; f *= 2.03; }
      return s / n;
    }
    return { n2: n2, fbm: fbm };
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function sdRound(px, py, cx, cy, hw, hh, r) {
    var qx = Math.abs(px - cx) - (hw - r), qy = Math.abs(py - cy) - (hh - r);
    var ox = Math.max(qx, 0), oy = Math.max(qy, 0);
    return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
  }

  // ── 리니어 색공간 보정(2026-10-01) ─────────────────────────────────────────
  // 게임은 Linear 색공간(ProjectSettings m_ActiveColorSpace 1)이라 UI 반투명 레이어를 **리니어로** 섞는다.
  // 브라우저(감마)에서 정한 알파를 그대로 쓰면 어두운 바탕 위의 옅은 빛이 2배 넘게 밝아진다
  // (실측: 패널 중앙 광택 알파 ≈0.035 — 감마 예측 20/255 · Unity 42/255).
  // ⇒ 굽는 단계에서 "감마로 섞었을 때의 결과"가 리니어로도 나오도록 알파를 역산한다. 기준 바탕·빛은 아래 REF 상수(채널 평균 0..255).
  function srgbToLin(c) { c = c / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  // 밝은 빛(light)을 어두운 바탕(dark) 위에 알파 a 로 얹는다
  function linAlphaLight(a, dark, light) {
    if (a <= 0) return 0;
    var ld = srgbToLin(dark), ll = srgbToLin(light);
    return clamp01((srgbToLin(dark + a * (light - dark)) - ld) / (ll - ld));
  }
  // 검정을 바탕(dark) 위에 알파 a 로 얹는다(그림자)
  function linAlphaDark(a, dark) {
    if (a <= 0) return 0;
    return clamp01(1 - srgbToLin(dark * (1 - a)) / srgbToLin(dark));
  }
  // 기준(채널 평균): 버튼 면 SurfaceRaisedTop #16202c · 메뉴 바탕 --bg #0b1218 · TextBtn #c9d6e2 · 청록 #57d1b8
  var REF_FACE = 32.667, REF_BG = 17.667, REF_TEXT = 213.667, REF_TEAL = 160;
  function to8(v) { return Math.round(clamp01(v) * 255); }

  function cellSize(radius) { var B = (PAD + radius) * TX; return { B: B, W: B * 2 + CW, H: B * 2 + CH }; }

  /**
   * 시트 1장(레이어 5셀 가로) 굽기. 반환 { W: 시트 폭, H, cellW, border: B, data: Uint8Array RGBA(straight, 위→아래 행) }
   * @param radius 모서리 반경(단위) — 11 · 8 · 6
   * @param strength 질감 세기 K(owner 확정 1.25 — 2026-10-01)
   */
  function bakeSheet(radius, strength) {
    var K = strength;
    var cs = cellSize(radius), B = cs.B, W = cs.W, H = cs.H;
    var SW = W * LAYERS.length;
    var out = new Uint8Array(SW * H * 4);
    var N = makeNoise('ui_button');
    var x0 = PAD * TX, y0 = PAD * TX, x1 = W - PAD * TX, y1 = H - PAD * TX;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2, rr = radius * TX;
    var yTop = B, yBot = H - B, bw = 1;

    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var px = x + 0.5, py = y + 0.5;
        var d = sdRound(px, py, cx, cy, hw, hh, rr);
        var gx = sdRound(px + 0.5, py, cx, cy, hw, hh, rr) - sdRound(px - 0.5, py, cx, cy, hw, hh, rr);
        var gy = sdRound(px, py + 0.5, cx, cy, hw, hh, rr) - sdRound(px, py - 0.5, cx, cy, hw, hh, rr);
        var gl = Math.sqrt(gx * gx + gy * gy); if (gl === 0) gl = 1;
        gx /= gl; gy /= gl;
        var up = clamp01(-gy), down = clamp01(gy), side = Math.abs(gx);
        var u = -d / TX;                                     // 안쪽 거리(단위). 음수 = 바깥
        var tTop = y < yTop ? clamp01(1 - (y - y0) / rr) : 0;
        var tBot = y >= yBot ? clamp01((y - yBot) / rr) : 0;

        // 덮임(안티에일리어싱 1 텍셀): 바깥 경계 / 면 경계
        var covOuter = clamp01(0.5 - d);                     // 버튼 실루엣
        var covFace = clamp01(0.5 - (d + bw * TX));          // 테두리 안쪽
        var covRing = clamp01(covOuter - covFace);

        // 0 shadow — 아래로 1.5 단위 내린 상자의 바깥 3 단위 감쇠 + 1.2 단위 립. 실루엣 안은 0(위 레이어가 덮는다)
        var ds = sdRound(px, py - 1.5 * TX, cx, cy, hw, hh, rr) / TX;
        var sh = ds < 0 ? 0.30 : 0.30 * Math.pow(clamp01(1 - ds / 3), 2);
        var lip = u < 0 ? clamp01(1 + u / 1.2) * 0.35 : 0;
        var shadowA = Math.max(sh, lip) * (1 - covOuter);

        // 1 ring — 밝기: 위쪽 1.0, 아래 경계 칸에서 RING_BOTTOM 까지
        var ringL = 1 - (1 - RING_BOTTOM) * tBot;

        // 2 face — 9-slice 를 아는 세로 램프: 위 칸 1.0 · 가운데 칸 1→FACE_BOTTOM · 아래 칸 FACE_BOTTOM
        var base;
        if (y < yTop) base = 1;
        else if (y >= yBot) base = FACE_BOTTOM;
        else base = 1 + (FACE_BOTTOM - 1) * ((y - yTop + 0.5) / (yBot - yTop));
        var ui = u - bw; if (ui < 0) ui = 0;
        var g = (N.fbm(x / TX * 0.02 + 3.1, y / TX * 0.85, 4) - 0.5) * 0.16 * K;
        var faceL = base * (1 + g);
        faceL *= 1 - clamp01(0.28 * K * Math.exp(-ui / 2.2) * down);   // 아래 안쪽 그늘
        faceL *= 1 - clamp01(0.16 * K * Math.exp(-ui / 4) * side);     // 옆 곡면 그늘

        // 3 sheen — 상단 림(1 단위 · 위를 향한 면) + 빛 띠 + 테두리 위쪽 밝힘
        var rim = (ui < 1 ? 1 : clamp01(2 - ui)) * Math.pow(up, 1.4) * Math.min(0.6, 0.24 * K);
        var band = 0.07 * 1.6 * K * Math.exp(-ui / 6) * clamp01(1 - (y - y0) / (rr * 1.6));
        var sheenA = clamp01(rim + band) * covFace + 0.22 * tTop * covRing;

        // 4 glow — 바깥 발광(1.4 단위 감쇠) + 안쪽 가장자리 0.16(1.2 단위 감쇠)
        var glowA = u < 0 ? 0.42 * Math.exp(u / 1.4) * (1 - covOuter) : 0.16 * Math.exp(-ui / 1.2) * covFace;

        var vals = [
          [0, 0, 0, linAlphaDark(shadowA, REF_BG)],
          [ringL, ringL, ringL, covRing],
          [faceL, faceL, faceL, covFace],
          [1, 1, 1, linAlphaLight(sheenA, REF_FACE, REF_TEXT)],
          [1, 1, 1, linAlphaLight(glowA, REF_BG, REF_TEAL)]
        ];
        for (var l = 0; l < 5; l++) {
          var o = (y * SW + l * W + x) * 4, v = vals[l];
          out[o] = to8(v[0]); out[o + 1] = to8(v[1]); out[o + 2] = to8(v[2]); out[o + 3] = to8(v[3]);
        }
      }
    }
    return { W: SW, H: H, cellW: W, border: B, data: out };
  }

  var api = { TX: TX, PAD: PAD, LAYERS: LAYERS, cellSize: cellSize, bakeSheet: bakeSheet, makeNoise: makeNoise, seedOf: seedOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.UiButtonRecipe = api;
})(typeof window !== 'undefined' ? window : this);
