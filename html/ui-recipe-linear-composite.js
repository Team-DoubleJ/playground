/*
 * ui-recipe-linear-composite.js — 목업을 **게임과 같은 리니어 블렌딩**으로 합성한다(2026-10-01).
 * 게임은 Linear 색공간(ProjectSettings m_ActiveColorSpace 1)이라 uGUI 반투명 레이어를 리니어로 섞는다.
 * 브라우저 캔버스는 감마(sRGB 바이트)로 섞으므로, 같은 알파라도 어두운 바탕 위 옅은 빛이 게임에서 2배 넘게 밝다.
 * ⇒ 레이어를 각자 투명 캔버스에 그린 다음, 이 함수가 sRGB→리니어로 풀어 "src·a + dst·(1−a)" 로 쌓고 다시 sRGB 로 굽는다.
 *    (색 곱하기 틴트는 감마든 리니어든 같다 — (a·b)^2.2 = a^2.2·b^2.2. 그래서 틴트는 레이어 캔버스에서 그대로 한다.)
 * 사용: LinearComposite.stack(width, height, '#0b1218', [layerCanvas, ...]) → 불투명 캔버스
 */
(function (global) {
  'use strict';
  var LUT = new Float32Array(256);
  for (var i = 0; i < 256; i++) { var c = i / 255; LUT[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function toSrgb(l) { var c = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, c)) * 255); }
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }

  function stack(w, h, bgHex, layers) {
    var bg = hex(bgHex), n = w * h;
    var r = new Float32Array(n), g = new Float32Array(n), b = new Float32Array(n);
    r.fill(LUT[bg[0]]); g.fill(LUT[bg[1]]); b.fill(LUT[bg[2]]);
    layers.forEach(function (cv) {
      var d = cv.getContext('2d').getImageData(0, 0, w, h).data;
      for (var p = 0, q = 0; p < n; p++, q += 4) {
        var a = d[q + 3] / 255; if (a === 0) continue;
        var ia = 1 - a;
        r[p] = LUT[d[q]] * a + r[p] * ia; g[p] = LUT[d[q + 1]] * a + g[p] * ia; b[p] = LUT[d[q + 2]] * a + b[p] * ia;
      }
    });
    var out = document.createElement('canvas'); out.width = w; out.height = h;
    var ctx = out.getContext('2d'), img = ctx.createImageData(w, h), o = img.data;
    for (var k = 0, j = 0; k < n; k++, j += 4) { o[j] = toSrgb(r[k]); o[j + 1] = toSrgb(g[k]); o[j + 2] = toSrgb(b[k]); o[j + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    return out;
  }
  function layer(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'low';
    return { canvas: c, ctx: x };
  }
  global.LinearComposite = { stack: stack, layer: layer };
})(window);
