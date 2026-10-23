/*
 * ui-recipe-labtab-bake.js — 연구소 탭(LabShellView 탭 스트립 7개) 레시피의 **정본 드로잉**(묶음 ④ · 2026-10-03 owner 판정 · 포팅 완료).
 * ──────────────────────────────────────────────────────────────────────
 * 비교 목업: html/ui-recipe-labtab-compare.html · 플랜: docs/plans/02-in-progress/phase-1/asset-recipe-importer-plan.md 「UI 레시피」
 * C# 포팅 = recipe-art `Editor/Drawers/UiLabTabDrawer.cs`(generator `ui_labtab` · v0.7.0) — 이 파일의 round 모양과 **바이트 동일**하다.
 *   그림을 바꾸려면 ① 여기를 고치고 ② UiLabTabDrawer.cs 를 1:1 로 따라 고치고 ③ `node scripts/art/ui-recipe-labtab-golden.cjs --fixtures`
 *   ④ RecipeImporter 버전을 올린다. 게임 계약 테스트(EditMode `RecipeArtUiLabTabTests`)가 이 파일의 상수를 읽는다.
 * owner 판정(2026-10-03): ① 밑줄 발광 · ② 비활성 눌린 깊이감 · ③ 구운 구분선 · ④ 접합 빛 = 켬 · ⑤ 폴더 탭 모양 = **안 함** · 질감 ×1.25.
 *   ⇒ `opts.shape = 'folder'` 분기는 **목업 토글 전용**이다 — C# 드로어는 round 만 굽고 게임 레시피도 round 뿐이다(지우지 말 것: 비교 목업이 쓴다).
 *
 * 2026-10-03 이전: 탭은 `CanvasUi.NewButton`(반경 11) = 묶음 1 버튼 레시피 `btn_r11` 5장을 그대로 탔다.
 *   활성 표시 = 링 색(MenuCursorColor) + ColorTint normalColor(MenuFocusFillColor) + 라벨 굵게 — 탭 전용 그림이 없었다.
 * 이 레시피 = 탭 전용 레이어 6장 + 낱장 2장(게임 `CanvasUi.NewLabTab` · `LabTabDivider`). 묶음 1~3 과 같은 원칙 — 전부 **흰/회색(또는 검정 알파) 바탕**이고 색은 게임이 입힌다.
 *   ⇒ `SyncShell` 이 링 색(border.color)과 ColorTint(normalColor/selectedColor)를 갈아끼우는 기존 계약이 그대로 산다.
 *   0 shadow    — 바깥 자리 그림자 + 립. RGB 0, 알파만.                 Image.color = 흰색       · 활성 탭(또는 「눌린 깊이감」 끔이면 전부)
 *   1 ring      — 테두리 1 단위. RGB = 밝기(위 1.0 → 아래 0.70).        Image.color = 호출부 링 색(ButtonBorderColor ↔ MenuCursorColor)
 *   2 face      — 면. RGB = 밝기(세로 램프 × 곡면 그늘). **결 없음**.   ColorTint 상태색(targetGraphic)
 *   3 sheen     — 상단 림 + 빛 띠. RGB 255, 알파만.                      Image.color = TextBtnColor · 활성 탭(또는 「눌린 깊이감」 끔이면 전부)
 *   4 inset     — 눌린 깊이감: 안쪽 위·옆 그늘. RGB 0, 알파만.           Image.color = 흰색       · **비활성 탭만**
 *   5 indicator — 활성 밑줄(2 단위 막대) + 위로 번지는 빛 + 탭 아래 발광. RGB 255, 알파만. Image.color = MenuCursorColor · **활성 탭만**
 *   낱장 stem    — 접합 빛: 활성 탭 아래 ~ 본문 패널 위(간격 16 단위)를 잇는 아래로 옅어지는 빛. 좌우 9-slice · 세로 통째.  색 = MenuCursorColor
 *   낱장 divider — 그룹 구분선(index 4 앞): 위아래 끝이 옅어지는 1 단위 세로선(양옆 투명 1 단위씩 — 폭 3 단위). 통째로 늘린다. 색 = MenuSubtitleColor
 *   (포커스 glow 는 굽지 않는다 — 탭은 `SyncFocusRing` 을 타지 않는다: 메뉴 포커스 순서에 없다.)
 *
 * owner 기판정 계승(2026-10-01~02): 질감 세기 기본 ×1.25 · 결(grain) **끔** · 상단 림·베벨 빛 켬 · 그림자 켬.
 * 텍스처 기하(버튼과 동일): TX=2 텍셀/단위(ppu 200) · 바깥 여백 PAD=4 단위 · 9-slice 경계 B = (PAD + radius) × TX(네 변 동일)
 *   · 가운데 칸 CW×CH = 8×16 텍셀 · 시트 = 레이어 6장 가로(왼→오 = LAYERS 순서) — 셀 W×H = (2B+8)×(2B+16)
 *   · r11: 셀 68×76 · 시트 408×76 · 경계 30. 최소 변 = 2 × 반경(탭은 239.4×56 이라 여유).
 *   · opts.shape = 'folder' 면 아래 두 모서리만 반경 FOLDER_RB(3)로 굽는다(위는 radius 그대로) — 경계는 같다.
 * 리니어: 게임은 Linear 색공간 — 옅은 빛·그늘 알파는 linAlphaLight / linAlphaDark 로 역산한다(버튼·패널·카드 bake 와 같은 식).
 * 결정성: 이 드로어는 노이즈를 쓰지 않는다(결 끔). Math.random 0 · 시간 0 — 몇 번을 구워도 같은 바이트.
 */
(function (global) {
  'use strict';
  var TX = 2, PAD = 4, CW = 8, CH = 16;
  var LAYERS = ['shadow', 'ring', 'face', 'sheen', 'inset', 'indicator'];
  var FACE_BOTTOM = 0.68;   // 면 아래 밝기 = SurfaceRaisedBottom / SurfaceRaisedTop (버튼 bake 와 같은 값)
  var RING_BOTTOM = 0.70;   // 테두리 아래쪽 밝기
  var FOLDER_RB = 3;        // 폴더 탭 모양의 아래 모서리 반경(단위)
  var IND_FROM = 1.5, IND_TO = 3.5;   // 밑줄 막대: 아래 변 안쪽 1.5 ~ 3.5 단위(링 1 단위 + 틈 0.5)
  var IND_REACH = 7;        // 밑줄 위로 번지는 빛이 0 이 되는 높이(단위) — 아래 경계 칸(반경 11) 안에서 끝나야 9-slice 가 안 끊긴다
  var STEM_H = 32;          // 접합 빛 텍스처 높이(텍셀) — 세로는 통째로 늘어나므로 곡선 표본 수일 뿐
  var DIV_H = 64;           // 구분선 텍스처 높이(텍셀)

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  // 모서리 반경이 위/아래로 다른 둥근 사각형 SDF(텍셀). 직선 변에서는 반경과 무관하게 같은 값이라 가운데에서 이어진다.
  function sdRound(px, py, cx, cy, hw, hh, rTop, rBot) {
    var r = py < cy ? rTop : rBot;
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
  // 기준(채널 평균 0..255): 탭 면 SurfaceRaisedTop #16202c · 활성 면 MenuFocusFill #0d261f · 연구소 바탕 OverlayPanel #0a1017
  //   · TextBtn #c9d6e2 · 청록 MenuCursor #57d1b8 · 구분선 MenuSubtitle #8c99ad
  var REF_FACE = 32.667, REF_FOCUS = 27.333, REF_BG = 16.333, REF_TEXT = 213.667, REF_TEAL = 160, REF_SUB = 155.333;
  function to8(v) { return Math.round(clamp01(v) * 255); }

  function cellSize(radius) { var B = (PAD + radius) * TX; return { B: B, W: B * 2 + CW, H: B * 2 + CH }; }

  // 밑줄·접합 빛의 가로 마스크 — 탭 좌우 변에서 0.45r 까지 0, r 에서 1(모서리 칸 안에서 끝나 가운데 칸은 가로로 균일)
  function hMask(exUnits, radius) { return clamp01((exUnits - 0.45 * radius) / (0.55 * radius)); }

  /**
   * 시트 1장(레이어 6셀 가로). 반환 { W, H, cellW, border: B, data: Uint8Array RGBA(straight, 위→아래 행) }
   * @param radius 모서리 반경(단위) — 탭은 11
   * @param strength 질감 세기 K(owner 기판정 1.25)
   * @param opts { shape: 'round'(기본) | 'folder' }
   */
  function bakeSheet(radius, strength, opts) {
    var K = strength, folder = !!opts && opts.shape === 'folder';
    var cs = cellSize(radius), B = cs.B, W = cs.W, H = cs.H;
    var SW = W * LAYERS.length;
    var out = new Uint8Array(SW * H * 4);
    var x0 = PAD * TX, y0 = PAD * TX, x1 = W - PAD * TX, y1 = H - PAD * TX;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
    var rr = radius * TX, rb = (folder ? Math.min(FOLDER_RB, radius) : radius) * TX;
    var yTop = B, yBot = H - B, bw = 1;
    function sd(px, py) { return sdRound(px, py, cx, cy, hw, hh, rr, rb); }

    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var px = x + 0.5, py = y + 0.5;
        var d = sd(px, py);
        var gx = sd(px + 0.5, py) - sd(px - 0.5, py);
        var gy = sd(px, py + 0.5) - sd(px, py - 0.5);
        var gl = Math.sqrt(gx * gx + gy * gy); if (gl === 0) gl = 1;
        gx /= gl; gy /= gl;
        var up = clamp01(-gy), down = clamp01(gy), side = Math.abs(gx);
        var u = -d / TX;                                     // 안쪽 거리(단위). 음수 = 바깥
        var tTop = y < yTop ? clamp01(1 - (y - y0) / rr) : 0;
        var tBot = y >= yBot ? clamp01((y - yBot) / rr) : 0;

        var covOuter = clamp01(0.5 - d);                     // 탭 실루엣
        var covFace = clamp01(0.5 - (d + bw * TX));          // 테두리 안쪽
        var covRing = clamp01(covOuter - covFace);
        var ui = u - bw; if (ui < 0) ui = 0;                 // 면 안쪽 거리(단위)

        // 0 shadow — 버튼과 같은 식: 아래로 1.5 단위 내린 상자의 바깥 3 단위 감쇠 + 1.2 단위 립
        var ds = sdRound(px, py - 1.5 * TX, cx, cy, hw, hh, rr, rb) / TX;
        var sh = ds < 0 ? 0.30 : 0.30 * Math.pow(clamp01(1 - ds / 3), 2);
        var lip = u < 0 ? clamp01(1 + u / 1.2) * 0.35 : 0;
        var shadowA = Math.max(sh, lip) * (1 - covOuter);

        // 1 ring
        var ringL = 1 - (1 - RING_BOTTOM) * tBot;

        // 2 face — 9-slice 를 아는 세로 램프(위 칸 1.0 · 가운데 1→FACE_BOTTOM · 아래 칸 FACE_BOTTOM) × 곡면 그늘. 결 없음.
        var base;
        if (y < yTop) base = 1;
        else if (y >= yBot) base = FACE_BOTTOM;
        else base = 1 + (FACE_BOTTOM - 1) * ((y - yTop + 0.5) / (yBot - yTop));
        var faceL = base;
        faceL *= 1 - clamp01(0.28 * K * Math.exp(-ui / 2.2) * down);   // 아래 안쪽 그늘
        faceL *= 1 - clamp01(0.16 * K * Math.exp(-ui / 4) * side);     // 옆 곡면 그늘

        // 3 sheen — 상단 림(1 단위 · 위를 향한 면) + 빛 띠 + 테두리 위쪽 밝힘
        var rim = (ui < 1 ? 1 : clamp01(2 - ui)) * Math.pow(up, 1.4) * Math.min(0.6, 0.24 * K);
        var band = 0.07 * 1.6 * K * Math.exp(-ui / 6) * clamp01(1 - (y - y0) / (rr * 1.6));
        var sheenA = clamp01(rim + band) * covFace + 0.22 * tTop * covRing;

        // 4 inset — 눌린 깊이감: 위쪽 안 그늘(짙게) + 옆 안 그늘(옅게). 아래 변에는 없다(빛이 위에서 온다)
        var insetA = clamp01(0.42 * K * Math.exp(-ui / 2.6) * up + 0.14 * K * Math.exp(-ui / 3.2) * side) * covFace;

        // 5 indicator — 밑줄 막대(아래 변 안쪽 IND_FROM~IND_TO) + 위로 번지는 빛(IND_REACH 에서 0) + 탭 아래 바깥 발광
        var exU = Math.min(px - x0, x1 - px) / TX;           // 좌우 변에서 잰 거리(단위)
        var m = hMask(exU, radius);
        var dbU = (y1 - py) / TX;                            // 아래 변에서 위로 잰 거리(단위). 음수 = 탭 아래
        var bar = clamp01((dbU - IND_FROM) * TX + 0.5) * clamp01((IND_TO - dbU) * TX + 0.5);
        var above = dbU > IND_TO ? 0.34 * Math.exp(-(dbU - IND_TO) / 2.4) * clamp01(1 - (dbU - IND_TO) / IND_REACH) : 0;
        var below = dbU < 0 ? 0.40 * Math.exp(dbU / 1.5) : 0;
        var indIn = clamp01(bar + linAlphaLight(above, REF_FOCUS, REF_TEAL) * (1 - bar)) * covFace;
        var indOut = linAlphaLight(below, REF_BG, REF_TEAL) * (1 - covOuter);
        var indA = clamp01(indIn + indOut) * m;

        var vals = [
          [0, 0, 0, linAlphaDark(shadowA, REF_BG)],
          [ringL, ringL, ringL, covRing],
          [faceL, faceL, faceL, covFace],
          [1, 1, 1, linAlphaLight(sheenA, REF_FACE, REF_TEXT)],
          [0, 0, 0, linAlphaDark(insetA, REF_FACE)],
          [1, 1, 1, indA]
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
   * 접합 빛 한 장 — 탭 rect 폭 그대로(PAD 없음) · 9-slice 경계 L/R = r×TX, B/T = 0(세로 통째 늘림 — 카드 ramp 와 같은 구조).
   * 놓는 자리: 활성 탭 아래 변 ~ 본문 패널 위 변(LabTabStripBodyGap 16 단위). 알파 = 0.30·(1−t)^1.6 × 가로 마스크.
   */
  function bakeStem(radius) {
    var rr = radius * TX, W = 2 * rr + CW, H = STEM_H, out = new Uint8Array(W * H * 4);
    for (var y = 0; y < H; y++) {
      var t = (y + 0.5) / H, fall = 0.30 * Math.pow(1 - t, 1.6);
      for (var x = 0; x < W; x++) {
        var exU = Math.min(x + 0.5, W - (x + 0.5)) / TX, o = (y * W + x) * 4;
        out[o] = 255; out[o + 1] = 255; out[o + 2] = 255; out[o + 3] = to8(linAlphaLight(fall * hMask(exU, radius), REF_BG, REF_TEAL));
      }
    }
    return { W: W, H: H, border: [rr, 0, rr, 0], data: out };
  }

  /**
   * 구분선 한 장 — 폭 3 단위(6 텍셀) 중 **가운데 1 단위만 선**이고 양옆 1 단위씩은 투명 · 위아래 22% 구간에서 smoothstep 으로 옅어진다.
   * 통째로 늘린다(경계 0). 양옆 투명 여백이 있는 이유: 현행 구분선은 텍스처 없는 1 단위 사각형이라 x 가 소수(1009.71)면
   * 래스터가 한 칸으로 스냅하고, 축척이 1 미만이면 통째로 빠질 수 있다 — 투명 여백이 있으면 필터가 가장자리를 부드럽게 남긴다.
   * 놓는 자리: 현행 구분선 x 에서 1 단위 왼쪽부터 3 단위 폭.
   */
  function bakeDivider() {
    var W = 3 * TX, H = DIV_H, out = new Uint8Array(W * H * 4);
    function ss(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
    for (var y = 0; y < H; y++) {
      var t = (y + 0.5) / H, a = ss(t / 0.22) * ss((1 - t) / 0.22);
      for (var x = 0; x < W; x++) {
        var o = (y * W + x) * 4, on = x >= TX && x < 2 * TX;
        out[o] = 255; out[o + 1] = 255; out[o + 2] = 255; out[o + 3] = on ? to8(linAlphaLight(a, REF_BG, REF_SUB)) : 0;
      }
    }
    return { W: W, H: H, border: [0, 0, 0, 0], data: out };
  }

  /** 게임 레시피 한 벌(recipe-art `ui_labtab` 드로어가 1:1 로 굽는다 — part tab · stem · divider): 시트 + 낱장 2장. */
  function bakeRecipes(radius, strength, opts) {
    return { tab: bakeSheet(radius, strength, opts), stem: bakeStem(radius), divider: bakeDivider() };
  }

  var api = { TX: TX, PAD: PAD, LAYERS: LAYERS, FOLDER_RB: FOLDER_RB, cellSize: cellSize,
    bakeSheet: bakeSheet, bakeStem: bakeStem, bakeDivider: bakeDivider, bakeRecipes: bakeRecipes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.UiLabTabRecipe = api;
})(typeof window !== 'undefined' ? window : this);
