/*
 * ui-recipe-progress-bake.js — 진행바·트랙(게이지) 레시피의 **정본 드로잉**(묶음 ⑤ · 2026-10-03 owner 판정 · 포팅 완료).
 * ──────────────────────────────────────────────────────────────────────
 * 비교 목업: html/ui-recipe-progress-compare.html · 플랜: docs/plans/02-in-progress/phase-1/asset-recipe-importer-plan.md 「UI 레시피」
 * C# 포팅 = recipe-art `Editor/Drawers/UiGaugeDrawer.cs`(generator `ui_gauge` · v0.8.0) — 이 파일의 `bakeSheet` · `bakeHead` 와 **바이트 동일**하다.
 *   그림을 바꾸려면 ① 여기를 고치고 ② UiGaugeDrawer.cs 를 1:1 로 따라 고치고 ③ `node scripts/art/ui-recipe-gauge-golden.cjs --fixtures`
 *   ④ RecipeImporter 버전을 올린다. 게임 계약 테스트(EditMode `RecipeArtUiGaugeTests`)가 이 파일의 상수·판정 식을 읽는다.
 * owner 판정(2026-10-03 · `1a 2a 3a 4a 5a 6a`): ① 파인 홈(groove + lip) · ② 채움 광택 · ③④ 앞머리 빛 + 가득 참 림 = 켬
 *   · ⑥ 아주 짧은 채움 = 둥근 점 하나(최소 캡) · ⑤ 눈금 = **안 함** · 범위 = 표의 6곳 · 질감 ×1.25.
 *   ⇒ `bakeTick`(과 `bakeRecipes(…).tick` · `TICK_H`)은 **목업 토글 전용**이다 — C# 드로어는 굽지 않고 게임 레시피에도 없다(지우지 말 것: 비교 목업이 쓴다).
 *
 * 2026-10-03 이전: 진행바는 공용 빌더가 없었다. 뷰마다 `CanvasUi.NewImage(…, radius)` / `Fill` / `Pill` 로
 *   트랙 한 장 + 채움 한 장(절차식 `RoundedFill(r)` · 흰 단색 · 1 텍셀/단위)을 세우고, 채움 **rect 폭**을 값에 맞춰 바꿨다.
 *   채움색은 호출부가 Image.color 로 직접 넣었다(도전과제 달성/잠김 · 장비 시대색 · XP 보라 · 피버 주황).
 * 이 레시피(게임 `CanvasUi.NewGaugeTrack` · `NewGaugeFill`) = 앞 묶음과 같은 원칙 — 전부 **흰/회색(또는 검정 알파) 바탕**이고 색은 게임이 입힌다.
 *   ⇒ 호출부가 트랙색·채움색을 바꾸는 계약과 「채움 rect 폭 = 값」 계약이 그대로 산다.
 *
 * ── 구조(채움 길이가 연속으로 변한다는 점이 앞 묶음과 다르다)
 *   트랙 쪽(길이 고정 · 9-slice)
 *     0 track  — 트랙 면. RGB 255, 알파 = 실루엣.                       Image.color = 호출부 트랙색
 *     1 groove — 파인 홈: 안쪽 위 그늘 + 옆 그늘. RGB 0, 알파만.        Image.color = 흰색
 *     2 lip    — 홈 아래 턱에 맺히는 빛(1 단위). RGB 255, 알파만.        Image.color = TextBtnColor
 *   채움 쪽(길이 = 값 · 9-slice — 호출부가 폭을 바꾸는 rect 를 그대로 덮는다)
 *     3 fill   — 채움 면. RGB = 밝기(위 1.0 → 가운데 → 아래), 알파 = 실루엣.   Image.color = 호출부 채움색
 *     4 gloss  — 채움 위쪽 광택 띠. RGB 255, 알파만.                     Image.color = 흰색
 *     5 full   — 가득 찼을 때만 켜는 안쪽 림(둘레 전체). RGB 255, 알파만.  Image.color = 흰색
 *   낱장
 *     head — 앞머리 빛: 채움 **오른쪽 끝에 붙는** 고정 폭 조각(HEAD 단위). 위·아래만 9-slice(가로는 통째 · 늘리지 않는다).
 *            채움 rect 의 오른쪽 끝에 앵커로 붙으므로 값이 변해도 코드가 따로 옮길 필요가 없다. RGB 255, 알파만. 색 = 흰색
 *     tick — 눈금 한 칸(2 단위 폭 = 어두운 홈 1 + 밝은 턱 1). 통째로 늘린다. 색 = 흰색(RGB 가 칸마다 0 / 255) — ⚠ 목업 토글 전용(포팅 안 함)
 *
 * ── 아주 짧은 채움(묶음 2 의 「9-slice 뭉개짐」 — 경계 합 2r 가 채움 폭보다 크다)
 *   Unity 는 경계를 비율로 눌러 담는다 ⇒ 채움이 납작한 타원으로 찌그러지고 광택·앞머리 빛도 같이 눌린다.
 *   owner 확정 = **최소 캡**: 0 < 폭 < 2r 이면 채움 **그림만** 2r(= 원 하나)로 그린다. rect 폭(값)은 호출부 것 그대로다.
 *     앞머리 빛은 폭 2r 에서 0, HEAD 에서 1 로 서서히 켠다(headAlpha) — 원 하나일 때는 빛이 없다.
 *     폭 0 은 아무것도 안 그린다. 가득 참(값 1)은 앞머리 빛을 끄고 full 을 켠다.
 *   이 판정은 게임 쪽 작은 컴포넌트 `RecipeGaugeFit`(묶음 3 `RecipeCardCornerFit` 와 같은 「크기가 바뀔 때마다 판정」)가 한다.
 *     그 컴포넌트의 `RecipeRadius` · `DrawWidth` · `HeadAlpha` · `HeadWidth` 는 아래 `recipeRadius` · `drawWidth` · `headAlpha` · `headWidth` 와 같은 식이다
 *     (골든 스크립트가 이 함수들을 실행해 `Fixtures/gauge_fit.ref.txt` 진리표를 쓰고 EditMode 가 게임 쪽 값을 그 표와 대조한다).
 *
 * owner 기판정 계승(2026-10-01~03): 질감 세기 기본 ×1.25 · 결(grain) **끔**(노이즈 0) · 상단 림·베벨 빛 켬.
 * 텍스처 기하: TX=2 텍셀/단위(ppu 200) · 바깥 여백 PAD=1 단위(투명 — 시트 칸 사이 쌍선형 번짐 방지. 그림자·발광은 없다: 트랙은 솟은 면이 아니라 파인 홈)
 *   · 9-slice 경계 B = (PAD + radius) × TX(네 변 동일) · 가운데 칸 CW×CH = 8×8 텍셀 · 셀 = (2B+8)×(2B+8)
 *   · 시트 = 레이어 6장 가로(LAYERS 순서). r5: 셀 32×32 · 시트 192×32 · 경계 12 / r4: 28×28 · 168×28 · 10 / r3: 24×24 · 144×24 · 8
 *   · 구울 반경 RADII = [5, 4, 3] — 요청 반경 이하 최대값(버튼·카드 규칙). 3 미만(높이 4·3 띠)은 현행 폴백.
 *   · 세로 값은 전부 「위 변에서 잰 거리 / r」「아래 변에서 잰 거리 / r」 로만 정한다 ⇒ 높이 = 2r(알약 · 가운데 칸 0)이어도, 더 높아도(가운데 칸이 늘어남) 이음매가 없다.
 * 리니어: 게임은 Linear 색공간 — 옅은 빛·그늘 알파는 linAlphaLight / linAlphaDark 로 역산한다(버튼·패널·카드·탭 bake 와 같은 식).
 * 결정성: 노이즈 0 · Math.random 0 · 시간 0 — 몇 번을 구워도 같은 바이트.
 */
(function (global) {
  'use strict';
  var TX = 2, PAD = 1, CW = 8, CH = 8;
  var LAYERS = ['track', 'groove', 'lip', 'fill', 'gloss', 'full'];
  var RADII = [5, 4, 3];
  var FILL_MID_DROP = 0.06;   // 채움 가운데 밝기 = 1 − 0.06·K
  var FILL_BOT_DROP = 0.17;   // 채움 아래 변 밝기 = 1 − 0.17·K
  var TICK_H = 8;             // 눈금 텍스처 높이(텍셀) — 통째로 늘어나므로 표본 수일 뿐

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function sdRound(px, py, cx, cy, hw, hh, r) {
    var qx = Math.abs(px - cx) - (hw - r), qy = Math.abs(py - cy) - (hh - r);
    var ox = Math.max(qx, 0), oy = Math.max(qy, 0);
    return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
  }

  // ── 리니어 색공간 보정 — ui-recipe-button-bake.js 와 같은 식
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
  // 기준(채널 평균 0..255): 트랙 = RunXpBarTrack #262633 · RunFeverBarTrack #2e1f14 · Hairline #1b2836 · SurfaceRaisedTop #16202c 의 평균
  //   · 채움 = MenuCursor #57d1b8 · RunXpBarFill #b042fa · FeverTheme #ff6b2e · AchievementLocked #707a8f 의 평균 · TextBtn #c9d6e2
  var REF_TRACK = 37, REF_FILL = 147, REF_TEXT = 213.667, REF_WHITE = 255;
  function to8(v) { return Math.round(clamp01(v) * 255); }

  function recipeRadius(r) { for (var i = 0; i < RADII.length; i++) if (RADII[i] <= r) return RADII[i]; return 0; }
  function cellSize(radius) { var B = (PAD + radius) * TX; return { B: B, W: B * 2 + CW, H: B * 2 + CH }; }
  /** 앞머리 빛 조각의 폭(단위) — 채움 오른쪽 끝에서 왼쪽으로 이만큼. 채움 폭이 이보다 짧으면 빛을 줄인다(headAlpha). */
  function headWidth(radius) { return 2 * radius + 4; }
  /** 최소 캡: 채움 rect 폭(단위) → 실제로 그릴 폭. 0 은 0(안 그림) · 0 < w < 2r 은 2r(원 하나) · 그 밖은 그대로. */
  function drawWidth(radius, w) { return w <= 0 ? 0 : w < 2 * radius ? 2 * radius : w; }
  /** 앞머리 빛 세기 0..1 — 폭 2r 에서 0, headWidth 에서 1. 가득 참이면 호출부가 끈다. */
  function headAlpha(radius, w) { return clamp01((w - 2 * radius) / (headWidth(radius) - 2 * radius)); }

  // 한 픽셀의 기하: 실루엣 덮임 · 안쪽 거리 · 법선 · 위/아래 변에서 잰 정규 거리(0 = 변, 1 = r 이상)
  function geom(px, py, x0, y0, x1, y1, rr) {
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
    function sd(ax, ay) { return sdRound(ax, ay, cx, cy, hw, hh, rr); }
    var d = sd(px, py);
    var gx = sd(px + 0.5, py) - sd(px - 0.5, py), gy = sd(px, py + 0.5) - sd(px, py - 0.5);
    var gl = Math.sqrt(gx * gx + gy * gy); if (gl === 0) gl = 1;
    gx /= gl; gy /= gl;
    var u = -d / TX, r = rr / TX;
    return { cov: clamp01(0.5 - d), u: u, uc: u < 0 ? 0 : u > r ? r : u, up: clamp01(-gy), down: clamp01(gy), side: Math.abs(gx), right: clamp01(gx),
      tT: clamp01((py - y0) / rr), tB: clamp01((y1 - py) / rr), r: r };
  }
  function rimMask(u) { return u < 0 ? 0 : u < 1 ? 1 : clamp01(2 - u); }   // 변에서 1 단위는 꽉, 2 단위에서 0

  /**
   * 시트 1장(레이어 6셀 가로). 반환 { W, H, cellW, border: B, data: Uint8Array RGBA(straight, 위→아래 행) }
   * @param radius 모서리 반경(단위) — 5 · 4 · 3
   * @param strength 질감 세기 K(owner 기판정 1.25)
   */
  function bakeSheet(radius, strength) {
    var K = strength, cs = cellSize(radius), B = cs.B, W = cs.W, H = cs.H, SW = W * LAYERS.length;
    var out = new Uint8Array(SW * H * 4);
    var x0 = PAD * TX, y0 = PAD * TX, x1 = W - PAD * TX, y1 = H - PAD * TX, rr = radius * TX;
    var mid = 1 - FILL_MID_DROP * K, bot = 1 - FILL_BOT_DROP * K;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var g = geom(x + 0.5, y + 0.5, x0, y0, x1, y1, rr);

        // 1 groove — 위에서 드리우는 안쪽 그늘(위 변에서 r 까지 · 제곱 감쇠) + 옆 벽 그늘
        var grooveA = clamp01(0.52 * K * Math.pow(1 - g.tT, 2) + 0.16 * K * Math.exp(-g.uc / 1.0) * g.side);
        // 2 lip — 아래 턱 빛: 아래를 향한 변의 안쪽 1 단위
        var lipA = clamp01(0.18 * K * rimMask(g.u) * Math.pow(g.down, 1.4));
        // 3 fill — 세로 밝기: 위 변 1.0 → (r 지점) mid → 아래 변 bot. 가운데 칸은 mid 로 균일
        var fillL = g.tT < 1 ? 1 + (mid - 1) * g.tT : (g.tB < 1 ? bot + (mid - bot) * g.tB : mid);
        // 4 gloss — 위쪽 광택 띠: 윤곽을 따라 안쪽 0.30r 깊이에 중심, 위를 향한 면에서만
        var gz = (g.uc - 0.30 * g.r) / (0.20 * g.r);
        var glossA = clamp01(0.42 * K * Math.exp(-gz * gz) * Math.pow(g.up, 1.2));
        // 5 full — 가득 참 림: 둘레 전체 안쪽 1 단위(위는 밝게 · 아래·옆은 옅게)
        var fullA = clamp01(rimMask(g.u) * K * (0.16 + 0.30 * g.up));

        var vals = [
          [1, 1, 1, g.cov],
          [0, 0, 0, linAlphaDark(grooveA, REF_TRACK) * g.cov],
          [1, 1, 1, linAlphaLight(lipA, REF_TRACK, REF_TEXT) * g.cov],
          [fillL, fillL, fillL, g.cov],
          [1, 1, 1, linAlphaLight(glossA, REF_FILL, REF_WHITE) * g.cov],
          [1, 1, 1, linAlphaLight(fullA, REF_FILL, REF_WHITE) * g.cov]
        ];
        for (var l = 0; l < LAYERS.length; l++) {
          var o = (y * SW + l * W + x) * 4, v = vals[l];
          out[o] = to8(v[0]); out[o + 1] = to8(v[1]); out[o + 2] = to8(v[2]); out[o + 3] = to8(v[3]);
        }
      }
    }
    return { W: SW, H: H, cellW: W, border: B, data: out };
  }

  /**
   * 앞머리 빛 한 장 — 폭 (headWidth + PAD) 단위 · 높이 = 시트 셀 높이. 9-slice 경계 [L 0, B, R 0, T B](위·아래만 — 가로는 늘리지 않는다).
   * 놓는 자리: 채움 그림의 오른쪽 끝에 맞춰(오른쪽·위·아래로 PAD 만큼 밖) 폭 headWidth + PAD.
   * 그림: 오른쪽 캡 안쪽 림(오른쪽을 향한 면 1 단위) + 왼쪽으로 옅어지는 빛. 왼쪽 끝에서 0.
   */
  function bakeHead(radius, strength) {
    var K = strength, cs = cellSize(radius), H = cs.H, hwU = headWidth(radius), W = (hwU + PAD) * TX;
    var out = new Uint8Array(W * H * 4);
    var x1 = W - PAD * TX, y0 = PAD * TX, y1 = H - PAD * TX, rr = radius * TX, x0 = x1 - 4096;   // 왼쪽으로 충분히 긴 채움의 오른쪽 끝
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var g = geom(x + 0.5, y + 0.5, x0, y0, x1, y1, rr);
        var dR = (x1 - (x + 0.5)) / TX;                                   // 오른쪽 끝에서 잰 거리(단위)
        var fade = Math.pow(clamp01(1 - dR / hwU), 1.6);                  // 왼쪽 끝에서 0
        var glow = 0.46 * K * Math.exp(-dR / (0.30 * hwU)) * fade;
        var rim = 0.38 * K * rimMask(g.u) * Math.pow(g.right, 1.2);
        var o = (y * W + x) * 4;
        out[o] = 255; out[o + 1] = 255; out[o + 2] = 255; out[o + 3] = to8(linAlphaLight(clamp01(glow + rim), REF_FILL, REF_WHITE) * g.cov);
      }
    }
    return { W: W, H: H, border: [0, cs.B, 0, cs.B], data: out };
  }

  /**
   * 눈금 한 칸 — 폭 2 단위(4 텍셀): 왼쪽 1 단위 = 어두운 홈(RGB 0), 오른쪽 1 단위 = 밝은 턱(RGB 255). 통째로 늘린다(경계 0).
   * 놓는 자리: 트랙 안 k/N 지점마다(왼쪽 1 단위 걸치게) · 높이 = 트랙 높이 − 2 단위. 이산 값 바(무기 레벨 8칸 · 장비 타임라인 7단계) 전용.
   */
  function bakeTick(strength) {
    var K = strength, W = 2 * TX, H = TICK_H, out = new Uint8Array(W * H * 4);
    var dark = to8(linAlphaDark(0.40 * K, REF_FILL)), light = to8(linAlphaLight(0.14 * K, REF_FILL, REF_WHITE));
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var o = (y * W + x) * 4, isDark = x < TX, c = isDark ? 0 : 255;
      out[o] = c; out[o + 1] = c; out[o + 2] = c; out[o + 3] = isDark ? dark : light;
    }
    return { W: W, H: H, border: [0, 0, 0, 0], data: out };
  }

  /** 게임 레시피 한 벌(반경 하나 · recipe-art `ui_gauge` 드로어가 1:1 로 굽는다 — part gauge · head): 시트 + 앞머리 빛. 눈금(tick)은 목업 토글 전용 낱장(포팅 안 함). */
  function bakeRecipes(radius, strength) {
    return { gauge: bakeSheet(radius, strength), head: bakeHead(radius, strength), tick: bakeTick(strength) };
  }

  var api = { TX: TX, PAD: PAD, LAYERS: LAYERS, RADII: RADII, recipeRadius: recipeRadius, cellSize: cellSize,
    headWidth: headWidth, drawWidth: drawWidth, headAlpha: headAlpha,
    bakeSheet: bakeSheet, bakeHead: bakeHead, bakeTick: bakeTick, bakeRecipes: bakeRecipes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.UiProgressRecipe = api;
})(typeof window !== 'undefined' ? window : this);
