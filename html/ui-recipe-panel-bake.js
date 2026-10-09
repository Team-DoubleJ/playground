/*
 * ui-recipe-panel-bake.js — 패널 프레임(CanvasUi.Panel) 레시피의 **정본 드로잉**(초안 · owner 목업 판정 전).
 * ──────────────────────────────────────────────────────────────────────
 * 버튼(ui-recipe-button-bake.js)과 같은 원칙: 레이어를 **흰/회색 바탕**으로 굽고 색은 게임이 입힌다.
 * 호출부가 고르는 채움색(OverlayPanel · SurfaceCard · PanelBackground…)과 테두리색·두께(Hairline 1 · ResultPanelBorder 1.2 ·
 * AchievementAccent 1.6/2)를 그대로 받기 위해서다.
 *   0 shadow — 바깥 그림자(아래로 3 단위 · 8 단위 감쇠). RGB 0.          색 = 흰(그대로)
 *   1 face   — 면. RGB = 밝기(결 + 가장자리 비네트). 알파 = 실루엣.   색 = 호출부 채움색(알파 포함)
 *   2 ramp   — 융기 램프: 위 칸 1 · 가운데 칸 1→0(감마 1.15) · 아래 칸 0. 색 = SurfaceRaisedTopColor (현행 Elevate 와 같은 색·같은 역할)
 *   3 sheen  — 상단 림 + 빛 띠 + 안쪽 베벨 빛. 색 = TextBtnColor
 *   3 ring1  — 테두리 1 단위.                                         색 = 호출부 테두리색 (두께 ≤ 1.4 일 때)
 *   4 ring2  — 테두리 2 단위.                                         색 = 호출부 테두리색 (두께 > 1.4 일 때)
 *   (베젤선은 2026-10-01 owner 판정으로 뺐다 — *"베젤선 차이는 모르겠다"*)
 *   (+) grain — 별도 타일(64², 이음매 없음 · 1 텍셀/단위 = ppu 100) · Image.Type.Tiled · 패널 안쪽 5 단위 사각형. 색 = TextBtnColor
 *   6 corner — 네 모서리 L 브래킷(테두리 안쪽 3~5 단위 · 호를 따라 + 변으로 12 단위). 색 = 호출부 테두리색  (owner *"모서리는 좋네"*)
 *
 * 기하: TX=2 텍셀/단위 · PAD=8(그림자) · 9-slice 경계 B = (PAD + radius + CORNER_RUN) × TX — 브래킷이 모서리 칸 안에 들어가야
 * 패널 크기가 바뀌어도 늘어나지 않는다. ⇒ 최소 패널 변 = 2 × (radius + CORNER_RUN) 단위(반경 14 면 52).
 * 결정성: v3 와 같은 mulberry32 · makeNoise('ui_panel'). Math.random 0.
 */
(function (global) {
  'use strict';
  var TX = 2, PAD = 8, CW = 8, CH = 16, CORNER_RUN = 12;
  var LAYERS = ['shadow', 'face', 'ramp', 'sheen', 'ring1', 'ring2', 'corner'];

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
  // 기준(채널 평균): 패널 채움 SurfaceCard/OverlayPanel #0a1017 · 메뉴 바탕 --bg #0b1218 · TextBtn #c9d6e2
  var REF_FACE = 16.333, REF_BG = 17.667, REF_TEXT = 213.667;
  function to8(v) { return Math.round(clamp01(v) * 255); }
  function cellSize(radius) { var B = (PAD + radius + CORNER_RUN) * TX; return { B: B, W: B * 2 + CW, H: B * 2 + CH }; }

  /** 시트 1장(레이어 7셀 가로). 반환 { W, H, cellW, border: B, data: Uint8Array RGBA(straight, 위→아래) } */
  function bakeSheet(radius, strength) {
    var K = strength;
    var cs = cellSize(radius), B = cs.B, W = cs.W, H = cs.H, SW = W * LAYERS.length;
    var out = new Uint8Array(SW * H * 4);
    var N = makeNoise('ui_panel');
    var x0 = PAD * TX, y0 = PAD * TX, x1 = W - PAD * TX, y1 = H - PAD * TX;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2, rr = radius * TX;
    var yTop = B, yBot = H - B;
    var run = (radius + CORNER_RUN) * TX;   // 브래킷이 닿는 곳(실루엣 모서리에서 잰 텍셀)

    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var px = x + 0.5, py = y + 0.5;
        var d = sdRound(px, py, cx, cy, hw, hh, rr);
        var gx = sdRound(px + 0.5, py, cx, cy, hw, hh, rr) - sdRound(px - 0.5, py, cx, cy, hw, hh, rr);
        var gy = sdRound(px, py + 0.5, cx, cy, hw, hh, rr) - sdRound(px, py - 0.5, cx, cy, hw, hh, rr);
        var gl = Math.sqrt(gx * gx + gy * gy); if (gl === 0) gl = 1;
        gx /= gl; gy /= gl;
        var up = clamp01(-gy), down = clamp01(gy);
        var u = -d / TX;
        var cov = clamp01(0.5 - d);                                   // 실루엣
        function band(a, b) { return clamp01(0.5 - (d + a * TX)) - clamp01(0.5 - (d + b * TX)); } // u∈[a,b] 띠

        // 0 shadow
        var ds = sdRound(px, py - 3 * TX, cx, cy, hw, hh, rr) / TX;
        var sh = ds < 0 ? 0.45 : 0.45 * Math.pow(clamp01(1 - ds / 8), 2.2);
        var shadowA = sh * (1 - cov);

        // 1 face — 결(가로 브러시) + 가장자리 비네트(안쪽 10 단위). 밝기 ≤ 1(채움색에 곱한다)
        // ⚠ 결을 면 밝기에 **곱하면** 거의 검은 채움(#0a1017 · 밝기 ≈16)에서는 ±2 단계밖에 안 움직인다(2026-10-01 실측 —
        //   질감 세기 ×0.5↔×2 의 면 평균 차 3.8/255). 그래서 결은 아래 sheen 에 **밝게 얹고**, 면에는 가장자리 그늘만 남긴다.
        var vig = 0.30 * K * Math.pow(clamp01(1 - u / 10), 2);
        var faceL = clamp01(1 - vig);

        // 2 ramp — 넓은 램프는 **어두운 색(SurfaceRaisedTop)을 높은 알파로** 얹는다(현행 Elevate 와 같은 방식).
        //   ⚠ 2026-10-01 — 처음엔 TextBtn 을 알파 0.07 로 얹었는데, 리니어 보정 뒤 알파가 3→2→1→0(/255)으로 양자화돼
        //   한 단계마다 밝기가 ≈5/255 씩 뛰는 **가로 띠**가 생겼다. 어두운 색·높은 알파면 한 단계가 0.1/255 수준이라 안 보인다.
        var ramp;
        if (y < yTop) ramp = 1;
        else if (y >= yBot) ramp = 0;
        else ramp = Math.pow(1 - (y - yTop + 0.5) / (yBot - yTop), 1.15);
        var rampA = ramp * cov;

        // 3 sheen — 상단 림 + 빛 띠 + 안쪽 베벨 빛
        var rim = (u >= 1 && u < 2 ? 1 : 0) * Math.pow(up, 1.6) * Math.min(0.5, 0.22 * K);   // 테두리 바로 안쪽 1 단위
        var glowBand = 0.06 * K * Math.exp(-Math.max(0, u - 1) / 7) * clamp01(1 - (y - y0) / (rr * 1.8));
        // 결은 여기 없다 — 9-slice 가운데 칸이 늘어나면 결이 뭉개져 위·아래 칸과 **가로 띠 이음매**가 생긴다(2026-10-01 목업에서 확인).
        //   ⇒ 별도 타일 `bakeGrainTile` 을 Image.Type.Tiled 로 깐다.
        // 안쪽 베벨 빛 — 네 변 모두, 위가 가장 밝고 옆·아래는 약하게
        var bevel = u >= 1 ? 0.07 * K * Math.exp(-(u - 1) / 2.5) * (0.3 + 0.7 * up) : 0;
        var sheenA = clamp01(rim + glowBand + bevel) * cov;

        // 4·5 ring — 위쪽은 밝기 1, 아래 칸에서 0.75
        var tBot = y >= yBot ? clamp01((y - yBot) / rr) : 0;
        var ringL = 1 - 0.25 * tBot;
        var ring1A = band(0, 1), ring2A = band(0, 2);

        // 6 corner — L 브래킷: 테두리 안쪽 3~5 단위 띠 중 모서리에서 run 안쪽만(끝은 2 단위에 걸쳐 흐려진다)
        var ex = Math.min(px - x0, x1 - px), ey = Math.min(py - y0, y1 - py);   // 가까운 변까지(텍셀)
        var fadeX = clamp01((run - ex) / (2 * TX)), fadeY = clamp01((run - ey) / (2 * TX));
        var cornerA = band(3, 5) * Math.min(fadeX, fadeY);

        var vals = [
          [0, 0, 0, linAlphaDark(shadowA, REF_BG)],
          [faceL, faceL, faceL, cov],
          [1, 1, 1, rampA],
          [1, 1, 1, linAlphaLight(sheenA, REF_FACE, REF_TEXT)],
          [ringL, ringL, ringL, ring1A],
          [ringL, ringL, ringL, ring2A],
          [1, 1, 1, cornerA]
        ];
        for (var l = 0; l < LAYERS.length; l++) {
          var o = (y * SW + l * W + x) * 4, v = vals[l];
          out[o] = to8(v[0]); out[o + 1] = to8(v[1]); out[o + 2] = to8(v[2]); out[o + 3] = to8(v[3]);
        }
      }
    }
    return { W: SW, H: H, cellW: W, border: B, data: out };
  }

  // ── 게임 레시피로 내보내기 — 그림자만 PAD 여백을 갖고, 나머지 4장(face · sheen · ring1 · ring2 · corner = 5장)은 **패널 rect 그대로**로 자른다.
  //    face 는 호출부 Image 자체에 들어가야 해서(호출부가 그 Image 의 색을 바꾼다) 바깥 여백이 있으면 안 된다.
  //    실루엣 경계가 텍셀 경계(PAD×TX)에 정확히 놓이므로 잘라도 안티에일리어싱이 잃는 것은 없다.
  function bakeRecipes(radius, strength) {
    var sh = bakeSheet(radius, strength), W = sh.cellW, H = sh.H, P = PAD * TX;
    var shadow = new Uint8Array(W * H * 4);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var si = (y * sh.W + x) * 4, di = (y * W + x) * 4;
      for (var c = 0; c < 4; c++) shadow[di + c] = sh.data[si + c];
    }
    var iw = W - 2 * P, ih = H - 2 * P, n = LAYERS.length - 1, frame = new Uint8Array(iw * n * ih * 4);
    for (var l = 1; l < LAYERS.length; l++) for (var yy = 0; yy < ih; yy++) for (var xx = 0; xx < iw; xx++) {
      var s2 = ((yy + P) * sh.W + l * W + xx + P) * 4, d2 = (yy * iw * n + (l - 1) * iw + xx) * 4;
      for (var c2 = 0; c2 < 4; c2++) frame[d2 + c2] = sh.data[s2 + c2];
    }
    return {
      shadow: { W: W, H: H, border: sh.border, data: shadow },
      frame: { W: iw * n, H: ih, cellW: iw, border: sh.border - P, names: LAYERS.slice(1), data: frame }
    };
  }

  // ── 결 타일(이음매 없이 반복) — 주기 격자 값 노이즈. 가로로 길게(브러시 결) · 밝은 쪽만 알파로.
  //    Unity: Image.Type.Tiled · 색 = TextBtnColor · 패널 안쪽으로 GRAIN_INSET 단위 들인 사각형(둥근 모서리 밖으로 안 새게:
  //    반경 14 에서 5 단위 들이면 사각형 꼭짓점이 호 안쪽에 들어온다).
  // GRAIN_TX = 1 텍셀/단위(스프라이트 ppu 100) — 2 텍셀/단위로 두면 밉맵 없는 2:1 축소에서 세로 결이 겹쳐 **가로 띠(모아레)**가 생겼다(2026-10-01 엔진 캡처·리니어 목업).
  var GRAIN_TILE = 64, GRAIN_INSET = 5, GRAIN_TX = 1;
  function bakeGrainTile(strength) {
    var K = strength, S = GRAIN_TILE, out = new Uint8Array(S * S * 4);
    var rnd = mulberry32(seedOf('ui_panel_grain')), val = new Array(64 * 64), i;
    for (i = 0; i < val.length; i++) val[i] = rnd();
    function fade(t) { return t * t * (3 - 2 * t); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    // 주기 (px, py) 격자 — 타일 가장자리에서 값이 이어진다
    function pn(x, y, px, py) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      function v(a, b) { return val[((b % py + py) % py) * 64 + ((a % px + px) % px)]; }
      var u = fade(xf), w = fade(yf);
      return lerp(lerp(v(xi, yi), v(xi + 1, yi), u), lerp(v(xi, yi + 1), v(xi + 1, yi + 1), u), w);
    }
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      var s2 = 0, a = 0.5, n = 0;
      for (var o = 0; o < 3; o++) {
        var px = 16 << o, py = 16 << o;                     // 가로 16·32·64 칸 · 세로 16·32·64 칸 — 가로 칸이 적으면 행 전체가 한 밝기로 묶여 띠가 된다
        s2 += a * pn(x / S * px, y / S * py, px, py); n += a; a *= 0.5;
      }
      var g = clamp01(s2 / n - 0.44) * 0.12 * K;
      var k = (y * S + x) * 4;
      out[k] = 255; out[k + 1] = 255; out[k + 2] = 255; out[k + 3] = to8(linAlphaLight(g, REF_FACE, REF_TEXT));
    }
    return { W: S, H: S, data: out };
  }

  var api = { TX: TX, PAD: PAD, CORNER_RUN: CORNER_RUN, LAYERS: LAYERS, GRAIN_TILE: GRAIN_TILE, GRAIN_INSET: GRAIN_INSET, GRAIN_TX: GRAIN_TX,
    cellSize: cellSize, bakeSheet: bakeSheet, bakeRecipes: bakeRecipes, bakeGrainTile: bakeGrainTile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.UiPanelRecipe = api;
})(typeof window !== 'undefined' ? window : this);
