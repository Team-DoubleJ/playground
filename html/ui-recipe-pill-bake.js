/*
 * ui-recipe-pill-bake.js — 알약 배지(pill) 레시피의 **정본 드로잉**(묶음 ⑥ · 2026-10-03 owner 판정 · 포팅 완료).
 * ──────────────────────────────────────────────────────────────────────
 * 비교 목업: html/ui-recipe-pill-compare.html · 플랜: docs/plans/02-in-progress/phase-1/asset-recipe-importer-plan.md 「UI 레시피」
 * C# 포팅 = recipe-art `Editor/Drawers/UiPillDrawer.cs`(generator `ui_pill` · v0.9.0) — 이 파일의 **출하 시트**
 *   `bakeRecipes(r, K).pill`(= `bakeSheet(r, K)` · 레이어 7칸 `LAYERS` · 면 세로 밝기 켬 · 발광 없음)와 **바이트 동일**하다.
 *   그림을 바꾸려면 ① 여기를 고치고 ② UiPillDrawer.cs 를 1:1 로 따라 고치고 ③ `node scripts/art/ui-recipe-pill-golden.cjs --fixtures`
 *   ④ RecipeImporter 버전을 올린다. 게임 계약 테스트(EditMode `RecipeArtUiPillTests`)가 이 파일의 상수·판정 식을 읽는다.
 * owner 판정(2026-10-03 · `1a 2a 3a 4b 5a 6a`): ① 입체감(rim + shade) · ② 면 광택(gloss · face 세로 밝기) · ③ 바깥 그림자 = 켬
 *   · ④ 강조 발광 = **안 함**(차이를 못 느껴 추천안 그대로 끔) · ⑤ 네 벌(19 · 16 · 12 · 8 — 반경 차 1 이하만 공유) · ⑥ 6곳 전부 · 질감 ×1.25.
 *   ⇒ 발광(`glow` 칸 · `GLOW_BLUR` · `MOCK_LAYERS` · `opts.glow`)과 「면 세로 밝기 끔」(`opts.volume === false`)은 **목업 토글 전용**이다
 *     — C# 드로어는 굽지 않고 게임 레시피에도 없다(지우지 말 것: 비교 목업이 쓴다). 출하 시트는 glow 칸이 **없는** 7칸이고
 *     목업 시트(`bakeSheet(r, K, { glow: true })`)는 그 오른쪽에 glow 한 칸을 덧붙인 8칸이다(앞 7칸의 픽셀 값은 같다).
 *
 * 2026-10-03 이전: 알약은 공용 그림이 없었다. `CanvasUi.Pill(image, 높이)` / `AddPillBorder` / `Panel(…, PillRadius(높이))` 가
 *   절차식 `RoundedFill(r)` · `RoundedRing(r, 두께)`(흰 단색 · 1 텍셀/단위 · r = 높이의 절반)를 한 장씩 깔고, 면 색·링 색은 호출부가 Image.color 로 넣었다.
 *   런 HUD 두 곳(아키 토큰 칩 · 온보딩 토스트)만 그 위에 절차식 `Elevate`(세로 알파 램프 + 위 1.5 단위 직선 빛)가 얹혔다.
 * 이 레시피(게임 `CanvasUi.PillBadge` → `RecipePillBadge`) = 앞 묶음과 같은 원칙 — 전부 **흰/회색(또는 검정 알파) 바탕**이고 색은 게임이 입힌다.
 *   ⇒ 면 색(등급색 · 피버 알파)·링 색을 호출부가 갈아끼우는 계약이 그대로 산다. 신규 색 0.
 *
 * ── 레이어(시트 한 줄 · LAYERS 순서 = 칸 순서 · 합성 순서는 목업 `drawPill` rec 분기 = 게임 `CanvasUi.PillBadge` 의 자식 순서)
 *   0 shadow    — 바깥 그림자: 실루엣을 1 단위 내려 번진 검정. **실루엣 바깥에만**(반투명 면이 어두워지지 않게). RGB 0. 색 = 흰색
 *   1 face      — 면. RGB = 세로 밝기(volume 켬: 위 1.0 → 가운데 → 아래 / 끔: 전부 1.0), 알파 = 실루엣.   색 = 호출부 면 색
 *   2 shade     — 아래 안쪽 그늘(캡슐 아랫배). RGB 0, 알파만.                                         색 = 흰색
 *   3 gloss     — 면 광택(위 변에서 아래 변으로 옅어짐 — 캡 모양을 따라 잘린다). RGB 255, **높은 알파**(위 변 0.9 → 아래 변 0).   색 = SurfaceRaisedTopColor
 *                 어두운 패널색 면(아키 토큰 칩 · 온보딩 토스트 · 보물티켓)에만 얹는다 — 현행 `Elevate` 의 Sheen 과 같은 토큰·같은 방식이다.
 *                 밝은 흰빛을 낮은 알파로 얹으면 리니어 8비트 알파가 3·2·1·0 띠로 끊긴다(묶음 2 패널에서 확인) ⇒ 어두운 색 + 높은 알파.
 *                 색 면(NEW 등급색 · FEVER)에는 얹지 않는다 — 그 자리는 face 의 세로 밝기가 맡는다.
 *   4 ring      — 테두리 링 1 단위. RGB 255, 알파 = 바깥 실루엣 − 1 단위 안쪽 실루엣.                    색 = 호출부 링 색
 *   5 ringThick — 테두리 링 1.5 단위(현행 두께 1.35 · 1.5 자리 — 「1.25 이상이면 굵은 링」).               색 = 호출부 링 색
 *   6 rim       — 상단 림 빛: 위를 향한 변의 안쪽 1 단위(링 위에 얹혀 링 윗부분이 밝아진다). RGB 255.      색 = TextBtnColor
 *   (목업 전용) 7 glow — 바깥 발광(강조 배지용 · 실루엣 바깥에만). RGB 255, 알파만. ⚠ 출하 시트에 없다(owner 판정 ④ 안 함 · 포팅 안 함)
 *
 * ── 알약은 반경 = 높이의 절반 ⇒ 높이마다 벌이 필요하다
 *   실측 높이 16 · 18 · 24 · 32 · 32 · 34 · 38 → 반경 8 · 9 · 12 · 16 · 16 · 17 · 19.
 *   앞 묶음의 「요청 반경 이하 최대값」 을 그대로 쓰면 반경 19 가 16 으로 떨어져 캡 끝에 직선 6 단위가 생긴다(알약이 아니라 둥근 사각형으로 읽힌다).
 *   ⇒ 규칙: **요청 반경 이하 최대값이되 차가 SLACK(1) 이하일 때만**. 그보다 벌어지면 0(2026-10-03 이전 절차식 폴백).
 *     게임 `RecipePillBadge.RecipeRadius` · `RingLayer` 가 아래 `recipeRadius` · `ringLayer` 와 같은 식이다
 *     (골든 스크립트가 이 함수들을 실행해 `Fixtures/pill_fit.ref.txt` 진리표를 쓰고 EditMode 가 게임 쪽 값을 그 표와 대조한다).
 *     RADII = [19, 16, 12, 8] 네 벌 — 17 → 16 · 9 → 8 은 공유(캡 끝 직선 2 단위 · 1배에서 구분 안 됨), 나머지는 정확히 반원.
 *   세로 값은 전부 「위 변에서 잰 거리 / r」「아래 변에서 잰 거리 / r」 로만 정한다 ⇒ 높이 = 2r(가운데 칸 0)이어도, 더 높아도(펄스로 커진 칩) 이음매가 없다.
 *
 * owner 기판정 계승(2026-10-01~03): 질감 세기 기본 ×1.25 · 결(grain) **끔**(노이즈 0) · 상단 림·베벨 빛 켬.
 * 텍스처 기하: TX=2 텍셀/단위(ppu 200) · 바깥 여백 PAD=4 단위(그림자·발광 — 버튼과 같다)
 *   · 9-slice 경계 B = (PAD + radius) × TX(네 변 동일) · 가운데 칸 8×8 텍셀 · 셀 = (2B+8)² · 출하 시트 = 셀 × 7 가로(목업 시트는 × 8)
 *   · r19: 셀 100 · 시트 700×100 · 경계 46 / r16: 88 · 616×88 · 40 / r12: 72 · 504×72 · 32 / r8: 56 · 392×56 · 24
 * 리니어: 게임은 Linear 색공간 — 옅은 빛·그늘 알파는 linAlphaLight / linAlphaDark 로 역산한다(버튼·패널·카드·탭·게이지 bake 와 같은 식).
 * 결정성: 노이즈 0 · Math.random 0 · 시간 0 — 몇 번을 구워도 같은 바이트.
 */
(function (global) {
  'use strict';
  var TX = 2, PAD = 4, CW = 8, CH = 8;
  var LAYERS = ['shadow', 'face', 'shade', 'gloss', 'ring', 'ringThick', 'rim'];   // 출하 시트(게임 레시피 · C# 드로어) 7칸
  var MOCK_LAYERS = LAYERS.concat(['glow']);                                       // 목업 시트 = 출하 7칸 + glow(owner 판정 ④ 안 함 — 토글 전용)
  var RADII = [19, 16, 12, 8];
  var SLACK = 1;                 // 요청 반경 − 구운 반경 허용 차(단위)
  var RING = 1, RING_THICK = 1.5, THICK_FROM = 1.25;   // 링 두께(단위) · 호출부 두께가 THICK_FROM 이상이면 굵은 링
  var SHADOW_DY = 1, SHADOW_BLUR = 3;                  // 그림자: 아래로 1 단위 · 번짐 3 단위
  var GLOW_BLUR = 3.2;                                 // (목업 전용) 발광 번짐(단위) — PAD 4 안에서 0 으로 끝난다
  var FACE_MID_DROP = 0.05, FACE_BOT_DROP = 0.14;      // 면 밝기: 가운데 1 − 0.05K · 아래 변 1 − 0.14K

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
  // 기준(채널 평균 0..255)
  //   바탕 = 장비 헤더 OverlayShellHeader #0d171f · 젬 타일 CardSurface #0a1017 · 런 필드 자리 표시 #0c1621 의 평균 ≈ 17
  //   면   = 어두운 면 넷(OverlayPanel #0a1017 · RunHudPanel #0a1017 · RunIntroBanner #050d14 · RunFeverBadge #381408)의 평균 ≈ 18
  //          — 아래 그늘은 어두운 면 기준으로 역산한다
  //   링   = kChestNodeTint #c9a227 · MenuGoldText #ffdb3d · RunIntroBannerBorder #94f5d6 · RunHudArchTokenPanelBorder #b899fa · FeverTheme #ff6b2e 의 평균 ≈ 175
  var REF_BG = 17, REF_FACE = 18, REF_RING = 175, REF_WHITE = 255;
  function to8(v) { return Math.round(clamp01(v) * 255); }

  /** 요청 반경 → 구운 반경. 요청 이하 최대값이되 차가 SLACK 이하일 때만. 없으면 0(현행 절차식 폴백). */
  function recipeRadius(r) { for (var i = 0; i < RADII.length; i++) if (RADII[i] <= r) return r - RADII[i] <= SLACK ? RADII[i] : 0; return 0; }
  /** 호출부 링 두께(단위) → 쓸 링 레이어 이름. */
  function ringLayer(thickness) { return thickness >= THICK_FROM ? 'ringThick' : 'ring'; }
  function cellSize(radius) { var B = (PAD + radius) * TX; return { B: B, W: B * 2 + CW, H: B * 2 + CH }; }

  /**
   * 시트 1장(레이어 셀 가로). 반환 { W, H, cellW, border: B, layers, data: Uint8Array RGBA(straight, 위→아래 행) }
   *   opts 없이 부르면 **출하 시트**(7칸 `LAYERS` · 면 세로 밝기 켬) — C# `UiPillDrawer.Render` 가 이것과 바이트 동일하다.
   * @param radius 캡 반경(단위) — 19 · 16 · 12 · 8
   * @param strength 질감 세기 K(owner 기판정 1.25)
   * @param opts 목업 토글 전용 { volume: 면 세로 밝기(기본 true) · glow: true 면 glow 칸을 덧붙인 8칸 `MOCK_LAYERS`(기본 false) }
   */
  function bakeSheet(radius, strength, opts) {
    var K = strength, volume = !opts || opts.volume !== false;
    var layers = opts && opts.glow === true ? MOCK_LAYERS : LAYERS;
    var cs = cellSize(radius), W = cs.W, H = cs.H, SW = W * layers.length;
    var out = new Uint8Array(SW * H * 4);
    var x0 = PAD * TX, y0 = PAD * TX, x1 = W - PAD * TX, y1 = H - PAD * TX, rr = radius * TX;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
    var mid = 1 - FACE_MID_DROP * K, bot = 1 - FACE_BOT_DROP * K;
    function sd(ax, ay) { return sdRound(ax, ay, cx, cy, hw, hh, rr); }
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var px = x + 0.5, py = y + 0.5, d = sd(px, py);
        var gy = sd(px, py + 0.5) - sd(px, py - 0.5), gx = sd(px + 0.5, py) - sd(px - 0.5, py);
        var gl = Math.sqrt(gx * gx + gy * gy); if (gl === 0) gl = 1;
        var up = clamp01(-gy / gl);                        // 위를 향한 면 1 · 옆·아래 0
        var cov = clamp01(0.5 - d), u = -d / TX;           // 실루엣 덮임 · 안쪽 거리(단위)
        var tT = clamp01((py - y0) / rr), tB = clamp01((y1 - py) / rr);   // 위/아래 변에서 잰 정규 거리(0 = 변 · 1 = r 이상)

        // 0 shadow — 1 단위 내린 실루엣의 바깥 번짐. 실루엣 안쪽은 0
        var ds = sd(px, py - SHADOW_DY * TX) / TX;
        var shadowA = 0.44 * K * Math.pow(clamp01(1 - Math.max(ds, 0) / SHADOW_BLUR), 2) * (1 - cov);
        // 1 face — 세로 밝기: 위 변 1.0 → (r 지점) mid → 아래 변 bot. 가운데 칸은 mid 로 균일
        var faceL = !volume ? 1 : (tT < 1 ? 1 + (mid - 1) * tT : (tB < 1 ? bot + (mid - bot) * tB : mid));
        // 2 shade — 아래 변에서 0.6r 까지 제곱 감쇠
        var shadeA = 0.22 * K * Math.pow(clamp01(1 - tB / 0.6), 2);
        // 3 gloss — 위 변 1 → 가운데 0.5 → 아래 변 0 (현행 RoundedFade 와 같은 세로 램프 · 감마 1.15). 높은 알파(어두운 색을 입힌다 — 역산 없음)
        var glossG = tT < 1 ? 1 - 0.5 * tT : 0.5 * tB;
        var glossA = 0.72 * K * Math.pow(glossG, 1.15);
        // 4·5 ring — 바깥 실루엣 − 안쪽 실루엣(두께만큼 줄인 것)
        var ringA = clamp01(cov - clamp01(0.5 - (d + RING * TX)));
        var ringThickA = clamp01(cov - clamp01(0.5 - (d + RING_THICK * TX)));
        // 6 rim — 위를 향한 변의 안쪽 1 단위(끝이 또렷하게 끊긴다)
        var rimA = 0.28 * K * clamp01((1 - u) * TX + 0.5) * Math.pow(up, 1.3);
        // (목업 전용) 7 glow — 바깥으로 번지는 빛. PAD 끝에서 0. 출하 시트는 이 칸을 쓰지 않는다(아래 루프가 layers.length 까지만 돈다)
        var dg = Math.max(d, 0) / TX;
        var glowA = 0.42 * K * Math.exp(-dg / 1.1) * Math.pow(clamp01(1 - dg / GLOW_BLUR), 1.5) * (1 - cov);

        var vals = [
          [0, 0, 0, linAlphaDark(clamp01(shadowA), REF_BG)],
          [faceL, faceL, faceL, cov],
          [0, 0, 0, linAlphaDark(clamp01(shadeA), REF_FACE) * cov],
          [1, 1, 1, clamp01(glossA) * cov],
          [1, 1, 1, ringA],
          [1, 1, 1, ringThickA],
          [1, 1, 1, linAlphaLight(clamp01(rimA), REF_RING, REF_WHITE) * cov],
          [1, 1, 1, linAlphaLight(clamp01(glowA), REF_BG, REF_RING)]
        ];
        for (var l = 0; l < layers.length; l++) {
          var o = (y * SW + l * W + x) * 4, v = vals[l];
          out[o] = to8(v[0]); out[o + 1] = to8(v[1]); out[o + 2] = to8(v[2]); out[o + 3] = to8(v[3]);
        }
      }
    }
    return { W: SW, H: H, cellW: W, border: cs.B, layers: layers, data: out };
  }

  /** 게임 레시피 한 벌(반경 하나 · recipe-art `ui_pill` 드로어가 1:1 로 굽는다): **출하 시트** 한 장(7칸 · 발광 없음 · 면 세로 밝기 켬). 목업 토글은 `bakeSheet(r, K, opts)` 를 직접 부른다. */
  function bakeRecipes(radius, strength) { return { pill: bakeSheet(radius, strength) }; }

  var api = { TX: TX, PAD: PAD, LAYERS: LAYERS, MOCK_LAYERS: MOCK_LAYERS, RADII: RADII, SLACK: SLACK, RING: RING, RING_THICK: RING_THICK, THICK_FROM: THICK_FROM,
    recipeRadius: recipeRadius, ringLayer: ringLayer, cellSize: cellSize, bakeSheet: bakeSheet, bakeRecipes: bakeRecipes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.UiPillRecipe = api;
})(typeof window !== 'undefined' ? window : this);
