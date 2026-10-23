/*
 * ui-recipe-card-bake.js — 융기 카드(CanvasUi.ElevateCard — 예전 CanvasUi.Elevate 의 opt-in 레시피 판) 레시피의 **정본 드로잉**.
 * ──────────────────────────────────────────────────────────────────────
 * owner 판정(2026-10-02, 목업 html/ui-recipe-card-compare.html): 질감 세기 ×1.25 · 결 **끔** · 상단 림·베벨 빛 켬 · 그림자·모서리 장식 **둘 다 켬**
 *   · Fill 만 쓰는 24곳은 지금 그대로 · 패널(FramePanel)에서도 결을 뺀다(카드와 질감 통일).
 * 묶음 1(버튼)·2(패널)와 같은 원칙: 레이어를 **흰/회색 바탕**으로 굽고 색은 게임이 입힌다.
 * 카드의 채움색은 호출부 Image.color(SurfaceCard · OverlayPanel · 등급색 …)이고, 여러 호출부가 그 color 를 **런타임에 바꾼다**
 * (선택·잠김·등급) ⇒ 상태별 완성 그림을 굽지 않고 face 를 흰 실루엣으로 구워 호출부 Image 자체에 넣는다(색 계약 유지).
 *
 *   face   — 면 실루엣. RGB = 밝기(가장자리 비네트). 알파 = 실루엣.     색 = 호출부 채움색(그대로 · 런타임 변경 그대로)
 *   ramp   — 융기 램프 = **현행 RoundedFade 와 같은 구조**: 9-slice 경계 좌우만(r×TX) · 위아래 0 ⇒ 세로는 카드 높이 전체로 한 장이 늘어난다.
 *            알파 = 실루엣 × (1 − t)^γ(K) — γ(1.25) = 1.15 = 현행 그대로, K 가 크면 γ 가 작아져 램프가 아래로 길어진다(γ = 1.15·(1.25/K)²).
 *            색 = SurfaceRaisedTopColor (어두운 색 · 높은 알파 ⇒ 리니어 알파 양자화 띠 없음 — 묶음 2 교훈)
 *            ⚠ 2026-10-02 엔진 대조 — 첫 초안은 램프를 위/가운데/아래 세 칸 9-slice 로 구워 **아래 칸 경계(y≈143)에 가로 단차**가 엔진에서도 보였다.
 *              그래서 세로 경계 0 의 한 장으로 바꿨다. sheen 의 넓은 광택(TextBtn 저알파 · 세로로 늘어남)도 같은 이유 + 리니어 양자화 띠 위험으로 뺐다.
 *   sheen  — 상단 림(호를 따라 휜다 — 현행 TopRim 은 반경 0.6 만큼 물린 직사각형) + 위쪽 빛 띠(위 칸 안) + 안쪽 베벨 빛(네 변).  색 = TextBtnColor
 *            가운데 칸은 세로로 균일(빛 띠는 위 칸 안에서 끝난다) ⇒ 세로로 늘어나도 단차 없음.
 *   shadow — 바깥 그림자(아래 2 단위 · 4 단위 감쇠). RGB 0. 별도 스프라이트(PAD 여백).  색 = 흰(그대로)
 *   corner — 모서리 짧은 L 브래킷(테두리 안쪽 2~3.5 단위 · 변으로 CORNER_RUN 단위). 경계가 더 크다.  색 = TextBtnColor α0.35
 *   (결 — owner 판정으로 **뺐다**. 목업의 「결」 토글은 비교용으로만 남는다: 패널 결 타일 `panel_grain` 재사용 · grainInset(r).)
 *
 * 기하: TX=2 텍셀/단위(ppu 200 · 버튼·패널과 같다) · PAD=4(그림자) ·
 *   face/sheen 9-slice 경계 = r × TX(카드 rect 기준) ⇒ **최소 변 = 2r — 현행 RoundedFill 과 같다**(레시피라서 더 커지는 제약 0).
 *   corner 경계 = (r + CORNER_RUN) × TX ⇒ 최소 변 2(r + CORNER_RUN). 그보다 작은 카드는 **브래킷 레이어만 빼고** 나머지는 레시피 그대로.
 *   bakeSheet 는 shadow·face·sheen·corner 를 PAD 여백을 둔 같은 셀 크기로 굽는다(경계 = (PAD + 레이어 경계) × TX).
 *   ramp 는 세로로 통째 늘어나므로 PAD 없이 **카드 rect 그대로** 따로 굽는다(bakeRamp).
 * 게임 레시피(bakeRecipes · recipe-art `ui_card` 드로어 1:1): 반경마다 3장 —
 *   card_r{R}_shadow — 그림자 셀(PAD 여백 포함 · single · border (PAD+r)×TX)
 *   card_r{R}        — face · sheen · corner 3칸을 카드 rect 그대로(PAD 여백 제외) 잘라 가로로(grid · **칸마다 border 가 다르다**: r×TX · r×TX · (r+CORNER_RUN)×TX)
 *   card_r{R}_ramp   — 램프 한 장(single · border [r×TX, 0, r×TX, 0])
 * 결정성: v3 · 버튼 · 패널과 같은 문법(이 드로어는 노이즈를 안 쓴다). Math.random 0.
 * 리니어: 밝은 빛·그림자 알파는 linAlphaLight/linAlphaDark 로 역산한다(패널 bake.js 와 같은 식 · 같은 기준값). ramp 는 현행처럼 역산 없음.
 */
(function (global) {
  'use strict';
  var TX = 2, PAD = 4, CW = 8, CH = 16, CORNER_RUN = 6;
  var LAYERS = ['shadow', 'face', 'sheen', 'corner'];
  var RAMP_H = 64;   // 램프 텍스처 높이(텍셀) — 세로는 카드 높이로 늘어나므로 곡선 표본 수일 뿐

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function sdRound(px, py, cx, cy, hw, hh, r) {
    var qx = Math.abs(px - cx) - (hw - r), qy = Math.abs(py - cy) - (hh - r);
    var ox = Math.max(qx, 0), oy = Math.max(qy, 0);
    return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
  }
  // ── 리니어 색공간 보정 — ui-recipe-panel-bake.js 와 같은 식(게임 = Linear 색공간)
  function srgbToLin(c) { c = c / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function linAlphaLight(a, dark, light) {
    if (a <= 0) return 0;
    var ld = srgbToLin(dark), ll = srgbToLin(light);
    return clamp01((srgbToLin(dark + a * (light - dark)) - ld) / (ll - ld));
  }
  function linAlphaDark(a, dark) {
    if (a <= 0) return 0;
    return clamp01(1 - srgbToLin(dark * (1 - a)) / srgbToLin(dark));
  }
  // 기준(채널 평균): 카드 채움 SurfaceCard/OverlayPanel #0a1017 · 카드가 놓이는 패널 면 ≈ #0b1218 · TextBtn #c9d6e2
  var REF_FACE = 16.333, REF_BG = 17.667, REF_TEXT = 213.667;
  function to8(v) { return Math.round(clamp01(v) * 255); }

  /** 결 타일을 들일 양(단위) — 반경 r 의 호 밖으로 결 사각형 꼭짓점이 새지 않게: ceil(r·(1 − 1/√2)) + 1 */
  function grainInset(r) { return Math.ceil(r * (1 - Math.SQRT1_2)) + 1; }
  /** 레이어별 9-slice 경계(텍셀, PAD 포함 셀 기준) */
  function borders(radius) {
    var main = (PAD + radius) * TX;
    return { shadow: main, face: main, sheen: main, corner: (PAD + radius + CORNER_RUN) * TX };
  }
  function cellSize(radius) { var B = (PAD + radius + CORNER_RUN) * TX; return { B: B, W: B * 2 + CW, H: B * 2 + CH }; }
  /** 램프 감마 — K = 1.25 에서 현행 RoundedFade 의 1.15 와 같다 */
  function rampGamma(strength) { return 1.15 * Math.pow(1.25 / strength, 2); }

  /**
   * 시트 1장(레이어 4셀 가로 · 셀마다 PAD 여백). strength = 질감 세기(owner 확정 ×1.25).
   * opts.rim / opts.bevel(기본 true) — 목업 토글용. 게임 레시피는 owner 판정대로 둘 다 켠 한 벌(bakeRecipes)만 굽는다.
   * 반환 { W, H, cellW, borders: {layer: 텍셀}, data: Uint8Array RGBA(straight, 위→아래) }
   */
  function bakeSheet(radius, strength, opts) {
    var K = strength;
    var useRim = !opts || opts.rim !== false, useBevel = !opts || opts.bevel !== false;
    var cs = cellSize(radius), W = cs.W, H = cs.H, SW = W * LAYERS.length;
    var bd = borders(radius);
    var out = new Uint8Array(SW * H * 4);
    var x0 = PAD * TX, y0 = PAD * TX, x1 = W - PAD * TX, y1 = H - PAD * TX;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2, rr = radius * TX;
    var run = (radius + CORNER_RUN) * TX;

    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var px = x + 0.5, py = y + 0.5;
        var d = sdRound(px, py, cx, cy, hw, hh, rr);
        var gy = sdRound(px, py + 0.5, cx, cy, hw, hh, rr) - sdRound(px, py - 0.5, cx, cy, hw, hh, rr);
        var gx = sdRound(px + 0.5, py, cx, cy, hw, hh, rr) - sdRound(px - 0.5, py, cx, cy, hw, hh, rr);
        var gl = Math.sqrt(gx * gx + gy * gy); if (gl === 0) gl = 1;
        var up = clamp01(-gy / gl);
        var u = -d / TX;                                             // 실루엣 안쪽으로 잰 거리(단위)
        var cov = clamp01(0.5 - d);
        function band(a, b) { return clamp01(0.5 - (d + a * TX)) - clamp01(0.5 - (d + b * TX)); }

        // shadow — 아래로 2 단위 · 4 단위 감쇠. 실루엣 안에서 0(면 위 자식으로 그려도 안 비친다).
        var ds = sdRound(px, py - 2 * TX, cx, cy, hw, hh, rr) / TX;
        var sh = ds < 0 ? 0.40 : 0.40 * Math.pow(clamp01(1 - ds / 4), 2.2);
        var shadowA = sh * (1 - cov);

        // face — 가장자리 비네트(안쪽 5 단위). 채움색에 **곱한다** ⇒ 어두운 채움에선 거의 안 움직인다(묶음 2 교훈) — 질감은 sheen·결·램프가 맡는다.
        var vig = 0.22 * K * Math.pow(clamp01(1 - u / 5), 2);
        var faceL = clamp01(1 - vig);

        // sheen — 상단 림(실루엣 바로 안쪽 1 단위 · 호를 따라 휜다) + 위쪽 빛 띠(위 칸 안에서 끝) + 안쪽 베벨 빛(네 변, 위가 가장 밝다)
        var rim = band(0, 1) * Math.pow(up, 1.6) * 0.24;                   // 현행 TopRim 알파 .24 와 같은 값(감마 의도값 → 아래서 역산)
        var glowBand = 0.10 * K * Math.exp(-u / 5) * clamp01(1 - (y - y0) / rr);
        var bevel = 0.10 * K * Math.exp(-u / 2.5) * (0.25 + 0.75 * up);
        var sheenA = clamp01((useRim ? rim : 0) + (useBevel ? (glowBand + bevel) * cov : 0));

        // corner — 짧은 L 브래킷(테두리 안쪽 2~3.5 단위 · 모서리에서 run 안쪽만 · 끝 1.5 단위 페이드)
        var ex = Math.min(px - x0, x1 - px), ey = Math.min(py - y0, y1 - py);
        var fadeX = clamp01((run - ex) / (1.5 * TX)), fadeY = clamp01((run - ey) / (1.5 * TX));
        var cornerA = band(2, 3.5) * Math.min(fadeX, fadeY);

        var vals = [
          [0, 0, 0, linAlphaDark(shadowA, REF_BG)],
          [faceL, faceL, faceL, cov],
          [1, 1, 1, linAlphaLight(sheenA, REF_FACE, REF_TEXT)],
          [1, 1, 1, cornerA]
        ];
        for (var l = 0; l < LAYERS.length; l++) {
          var o = (y * SW + l * W + x) * 4, v = vals[l];
          out[o] = to8(v[0]); out[o + 1] = to8(v[1]); out[o + 2] = to8(v[2]); out[o + 3] = to8(v[3]);
        }
      }
    }
    return { W: SW, H: H, cellW: W, borders: bd, data: out };
  }

  /**
   * 램프 한 장 — 카드 rect 그대로(PAD 없음) · 9-slice 경계 L/R = r×TX, B/T = 0(세로 통째 늘림 = 현행 RoundedFade 구조).
   * 실루엣은 RAMP_H 높이 텍스처 안의 둥근 사각형이라 세로로 늘면 모서리가 타원이 된다 — 현행과 같고, 타원은 면의 원호 **안쪽**이라 밖으로 새지 않는다.
   * 반환 { W, H, borderLR, data }
   */
  function bakeRamp(radius, strength) {
    var rr = radius * TX, W = 2 * rr + CW, H = Math.max(RAMP_H, 2 * rr + 2), g = rampGamma(strength);
    var out = new Uint8Array(W * H * 4), cx = W / 2, cy = H / 2;
    for (var y = 0; y < H; y++) {
      var t = y / (H - 1), ramp = Math.pow(1 - t, g);
      for (var x = 0; x < W; x++) {
        var cov = clamp01(0.5 - sdRound(x + 0.5, y + 0.5, cx, cy, W / 2, H / 2, rr));
        var o = (y * W + x) * 4;
        out[o] = 255; out[o + 1] = 255; out[o + 2] = 255; out[o + 3] = to8(ramp * cov);
      }
    }
    return { W: W, H: H, borderLR: rr, data: out };
  }

  // ── 게임 레시피로 내보내기 — 그림자만 PAD 여백을 갖고, face · sheen · corner 는 **카드 rect 그대로**로 자른다.
  //    face 는 호출부 Image 자체에 들어가야 해서(호출부가 그 Image 의 색을 바꾼다) 바깥 여백이 있으면 안 된다.
  //    실루엣 경계가 텍셀 경계(PAD×TX)에 정확히 놓이므로 잘라도 잃는 픽셀이 없다(패널 bakeRecipes 와 같은 이유).
  //    칸마다 9-slice 경계가 다르다(face·sheen r×TX · corner (r+CORNER_RUN)×TX) — 레시피 sprite.borders 로 칸별로 준다.
  var FRAME = ['face', 'sheen', 'corner'];
  function bakeRecipes(radius, strength) {
    var sh = bakeSheet(radius, strength), W = sh.cellW, H = sh.H, P = PAD * TX;
    var shadow = new Uint8Array(W * H * 4);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var si = (y * sh.W + x) * 4, di = (y * W + x) * 4;
      for (var c = 0; c < 4; c++) shadow[di + c] = sh.data[si + c];
    }
    var iw = W - 2 * P, ih = H - 2 * P, n = FRAME.length, frame = new Uint8Array(iw * n * ih * 4);
    for (var f = 0; f < n; f++) {
      var l = LAYERS.indexOf(FRAME[f]);
      for (var yy = 0; yy < ih; yy++) for (var xx = 0; xx < iw; xx++) {
        var s2 = ((yy + P) * sh.W + l * W + xx + P) * 4, d2 = (yy * iw * n + f * iw + xx) * 4;
        for (var c2 = 0; c2 < 4; c2++) frame[d2 + c2] = sh.data[s2 + c2];
      }
    }
    var rp = bakeRamp(radius, strength);
    return {
      shadow: { W: W, H: H, border: sh.borders.shadow, data: shadow },
      frame: { W: iw * n, H: ih, cellW: iw, names: FRAME.slice(), borders: FRAME.map(function (k) { return sh.borders[k] - P; }), data: frame },
      ramp: { W: rp.W, H: rp.H, border: [rp.borderLR, 0, rp.borderLR, 0], data: rp.data }
    };
  }

  var api = { TX: TX, PAD: PAD, CORNER_RUN: CORNER_RUN, LAYERS: LAYERS, FRAME: FRAME, cellSize: cellSize, borders: borders,
    grainInset: grainInset, rampGamma: rampGamma, bakeSheet: bakeSheet, bakeRamp: bakeRamp, bakeRecipes: bakeRecipes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.UiCardRecipe = api;
})(typeof window !== 'undefined' ? window : this);
