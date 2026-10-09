/*
 * skilltree-node-branch-color-data.js — skilltree-node-branch-color-compare.html 의 보조 데이터(생성물 · 손으로 고치지 말 것).
 * 무엇: 게임 소스에서 **읽어 옮긴** 색·상수·노드 배치·시트 그리기 코드. 숫자를 손으로 베끼지 않는다(CLAUDE.md 검증 위생 7).
 * 생성 기준: HEAD 96a5d3dc (2026-10-03). 생성기는 리포 밖 스크래치(C:/tmp/node-color-capture/gen-data.cjs) — 소스에서 못 찾으면 드리프트로 죽는다.
 * 출처 심볼:
 *   branches / branchDefault ← GetBranchTheme (Assets/_Game/Runtime/MvpGameController.SkillTreeScreen.cs)
 *   tokens                   ← Assets/Resources/UI/UiTheme.asset (kAwakenGold · BackgroundDeep · …)
 *   K                        ← MvpGameController.cs / .UI.cs / .Rendering.cs / .SkillTreeScreen.cs 의 const
 *   iconIndex                ← GetSkillTreeNodeIconIndex (MvpGameController.UI.cs)
 *   colors                   ← DrawSkillTreeNodeCenterIcon · DrawSkillTreeNodes · s_skillNodeLabelStyle (값 일치를 정규식으로 확인하고 옮김)
 *   sprites(그리기 코드)      ← html/node-sprites.html 의 HELPERS~drawNodeCell · ICON_DEFS~drawIconShape · badges 배열을 **글자 그대로**
 *     ⤷ 2026-10-04 포팅(owner 판정 1a 2a 3a 4a 5a): 정본 drawNodeCell 이 회색 두 겹(layer 'fill'|'ring')을 직접 그리게 되어
 *       HELPERS~drawNodeCell 구획만 다시 옮겼다(스크래치 refresh-data-sprites.cjs). 나머지 값은 생성 기준 HEAD 그대로다.
 *   nodes / counts           ← skill_tree_nodes_draft.json (374 노드) · 모양 = GetSkillTreeNodeShapeKey 규칙 · depth = 코어에서 간선 BFS
 *   nodes 한 줄 = [gridX, gridY, branch, shape, baseLabel, effectType, maxLevel, depth, 이웃 인덱스(자기보다 큰 것만), baseColor]
 * 계약(생성 시 확인 · **포팅 전** 사실): DrawSkillTreeNodeStateSprite 가 GUI.color = white 로 그린다 · DrawSkillTreeNodes 가 node.Branch 를 안 쓴다 ·
 *   그리기 순서 = 각성 강조 → 시트 몸통 → 아이콘 → 배지 → 라벨.
 */
(function (global) {
  'use strict';
  var sprites = (function () {
    // HELPERS
    function hexRgb(h){ return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }
    function rgba(hex,a){ const[r,g,b]=hexRgb(hex); return `rgba(${r},${g},${b},${+a.toFixed(3)})`; }
    
    function mixColor(hex, m) {
      const[r,g,b]=hexRgb(hex);
      return `rgba(${Math.round(r*m+4)},${Math.round(g*m+8)},${Math.round(b*m+14)},1)`;
    }
    
    function pathRRect(ctx,x,y,w,h,r){
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
    }
    function pathHex(ctx,cx,cy,r){
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6; i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}
      ctx.closePath();
    }
    function pathOct(ctx,cx,cy,r){
      ctx.beginPath();
      for(let i=0;i<8;i++){const a=Math.PI/4*i+Math.PI/8; i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}
      ctx.closePath();
    }
    function pathDiamond(ctx,cx,cy,r){
      ctx.beginPath();
      ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r*0.66,cy); ctx.lineTo(cx,cy+r); ctx.lineTo(cx-r*0.66,cy);
      ctx.closePath();
    }
    
    function makePath(ctx, shape, cx, cy, r) {
      if      (shape==='stat')   { const rr=Math.max(6,r*0.22); pathRRect(ctx,cx-r,cy-r,r*2,r*2,rr); }
      else if (shape==='lang')   pathHex(ctx,cx,cy,r);
      else if (shape==='weapon') pathOct(ctx,cx,cy,r);
      else if (shape==='awaken') pathDiamond(ctx,cx,cy,r);
      else                       { ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); }
    }
    
    // NODE SHAPE DRAWER
    const SHAPE_COLORS = {
      stat:'#e67e22', lang:'#ED8B00', weapon:'#00bcd4', awaken:'#fbbf24', core:'#57d1b8'
    };
    
    // ── 회색 두 겹(브랜치색 틴트용 · 2026-10-04) ───────────────────────────────────────────
    // 아래 drawNodeCell 의 한 겹 그림과 **페인트 명령이 한 줄씩 대응**한다. 바뀌는 것은 색뿐:
    //   col → 흰색 · mixColor 의 푸른 오프셋(+4,+8,+14) → 무채색 +9 · 리터럴 테두리색(잠김 #2a3a4a · 가능 #57d1b8) → 흰색.
    // 색은 게임이 그릴 때 곱해 되돌린다. 계수를 고치면 한 겹 그림(drawNodeCell 의 mixColor·border 분기)도 같이 고친다.
    const TINT_SHAPES = ['stat', 'lang'];
    const GRAY_MIX    = { locked:0.07, unlockable:0.18, unlocked:0.40, uf1:0.62, uf2:0.55, uf3:0.44 };
    const GRAY_BORDER = { locked:[1.2,0.5], unlockable:[1.8,0.75], unlocked:[2.2,0.9], uf1:[2.2,0.96], uf2:[2.4,1.0], uf3:[2.0,0.92] };
    function white(a){ return `rgba(255,255,255,${a})`; }
    
    // layer: 'fill' = 면(무채색 몸통+하이라이트) | 'ring' = 테두리+바깥 글로우(흰색 · 몸통 안쪽은 비움)
    function drawNodeCellLayer(ctx, shape, state, cx, cy, r, layer) {
      const revealGlowR = state==='uf2'||state==='uf3' ? 61 : 63;
      const disc = (grad)=>{ ctx.beginPath(); ctx.arc(cx,cy,revealGlowR,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill(); };
      let g;
      ctx.save();
    
      if (layer==='fill') {
        const v = Math.round(255*GRAY_MIX[state]+9);
        makePath(ctx,shape,cx,cy,r);
        ctx.fillStyle=`rgb(${v},${v},${v})`; ctx.fill();
        if (state==='unlocked'||state==='uf2'||state==='uf3') {
          makePath(ctx,shape,cx,cy,r);
          g=ctx.createRadialGradient(cx,cy-r*0.3,r*0.05,cx,cy,r);
          g.addColorStop(0,white(0.55)); g.addColorStop(1,white(0.04));
          ctx.fillStyle=g; ctx.fill();
        }
        if (state==='uf1') {
          makePath(ctx,shape,cx,cy,r);
          g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
          g.addColorStop(0,white(0.72)); g.addColorStop(0.5,white(0.44)); g.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=g; ctx.fill();
          makePath(ctx,shape,cx,cy,r*0.46);
          ctx.fillStyle=white(0.18); ctx.fill();
        }
        ctx.restore();
        return;
      }
    
      // 바깥 글로우(한 겹 그림에서는 몸통 fill 의 shadow · 리빌 블룸) → 그린 뒤 몸통 안쪽을 지운다(면 겹 위에 올리므로)
      if (state==='uf1') {
        g=ctx.createRadialGradient(cx,cy,r*0.55,cx,cy,revealGlowR);
        g.addColorStop(0,white(0.26)); g.addColorStop(0.62,white(0.10)); g.addColorStop(1,white(0)); disc(g);
      }
      if (state==='uf2'||state==='uf3') {
        g=ctx.createRadialGradient(cx,cy,r*0.62,cx,cy,revealGlowR);
        g.addColorStop(0,white(state==='uf2'?0.24:0.12)); g.addColorStop(0.7,white(state==='uf2'?0.10:0.05)); g.addColorStop(1,white(0)); disc(g);
      }
      if (state==='unlocked'||state==='unlockable') {
        ctx.shadowBlur=state==='unlocked'?10:12; ctx.shadowColor=white(state==='unlocked'?0.55:0.4);
        makePath(ctx,shape,cx,cy,r); ctx.fillStyle='#fff'; ctx.fill();
        ctx.shadowBlur=0; ctx.shadowColor='rgba(0,0,0,0)';
      }
      ctx.globalCompositeOperation='destination-out';
      makePath(ctx,shape,cx,cy,r); ctx.fillStyle='#000'; ctx.fill();
      ctx.globalCompositeOperation='source-over';
    
      if (state==='unlocked') { ctx.shadowBlur=8; ctx.shadowColor=white(0.7); }
      makePath(ctx,shape,cx,cy,r);
      ctx.strokeStyle=white(GRAY_BORDER[state][1]); ctx.lineWidth=GRAY_BORDER[state][0]; ctx.stroke();
      ctx.shadowBlur=0; ctx.shadowColor='rgba(0,0,0,0)';
    
      if (state==='uf2') {
        g=ctx.createRadialGradient(cx,cy,r*1.02,cx,cy,revealGlowR);
        g.addColorStop(0,white(0.16)); g.addColorStop(0.78,white(0.06)); g.addColorStop(1,white(0)); disc(g);
        ctx.beginPath(); ctx.arc(cx,cy,r*1.18,0,Math.PI*2);
        ctx.strokeStyle=white(0.55); ctx.lineWidth=2.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,r*1.06,0,Math.PI*2);
        ctx.strokeStyle=white(0.30); ctx.lineWidth=1.2; ctx.stroke();
      }
      if (state==='uf3') {
        g=ctx.createRadialGradient(cx,cy,r*1.00,cx,cy,revealGlowR);
        g.addColorStop(0,white(0.10)); g.addColorStop(0.82,white(0.04)); g.addColorStop(1,white(0)); disc(g);
        ctx.beginPath(); ctx.arc(cx,cy,r*1.16,0,Math.PI*2);
        ctx.strokeStyle=white(0.28); ctx.lineWidth=1.6; ctx.stroke();
      }
      if (state==='unlockable') {
        ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.arc(cx,cy,r*1.16,0,Math.PI*2);
        ctx.strokeStyle=white(0.25); ctx.lineWidth=1; ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
    
    // state: 'locked'|'unlockable'|'unlocked'|'uf1'|'uf2'|'uf3'
    // layer: 생략 = 모양색을 구운 한 겹(무기·각성·코어 시트 · 스탯·육각의 옛 그림) | 'fill'·'ring' = 회색 두 겹(스탯·육각 시트)
    function drawNodeCell(ctx, shape, state, cx, cy, r, layer) {
      if (layer==='fill'||layer==='ring') { drawNodeCellLayer(ctx, shape, state, cx, cy, r, layer); return; }
      const col = SHAPE_COLORS[shape];
      const revealGlowR = state==='uf2'||state==='uf3' ? 61 : 63;
      ctx.save();
    
      let bodyColor;
      if      (state==='locked')     { bodyColor=mixColor(col,0.07); }
      else if (state==='unlockable') { bodyColor=mixColor(col,0.18); }
      else if (state==='unlocked')   { bodyColor=mixColor(col,0.40); }
      else if (state==='uf1')        { bodyColor=mixColor(col,0.62); }
      else if (state==='uf2')        { bodyColor=mixColor(col,0.55); }
      else                           { bodyColor=mixColor(col,0.44); }
    
      if (state==='unlocked') {
        ctx.shadowBlur=10; ctx.shadowColor=rgba(col,0.55);
      }
      if (state==='unlockable') { ctx.shadowBlur=12; ctx.shadowColor=rgba('#57d1b8',0.4); }
      if (state==='uf1') {
        const bloom=ctx.createRadialGradient(cx,cy,r*0.55,cx,cy,revealGlowR);
        bloom.addColorStop(0,'rgba(200,230,255,0.26)');
        bloom.addColorStop(0.62,'rgba(200,230,255,0.10)');
        bloom.addColorStop(1,'rgba(200,230,255,0)');
        ctx.beginPath(); ctx.arc(cx,cy,revealGlowR,0,Math.PI*2);
        ctx.fillStyle=bloom; ctx.fill();
      }
      if (state==='uf2'||state==='uf3') {
        const bloom=ctx.createRadialGradient(cx,cy,r*0.62,cx,cy,revealGlowR);
        bloom.addColorStop(0,rgba(col,state==='uf2'?0.24:0.12));
        bloom.addColorStop(0.7,rgba(col,state==='uf2'?0.10:0.05));
        bloom.addColorStop(1,rgba(col,0));
        ctx.beginPath(); ctx.arc(cx,cy,revealGlowR,0,Math.PI*2);
        ctx.fillStyle=bloom; ctx.fill();
      }
    
      makePath(ctx,shape,cx,cy,r);
      ctx.fillStyle=bodyColor; ctx.fill();
      ctx.shadowBlur=0;
    
      if (state==='unlocked'||state==='uf2'||state==='uf3') {
        makePath(ctx,shape,cx,cy,r);
        const g=ctx.createRadialGradient(cx,cy-r*0.3,r*0.05,cx,cy,r);
        g.addColorStop(0,rgba(col,0.55)); g.addColorStop(1,rgba(col,0.04));
        ctx.fillStyle=g; ctx.fill();
      }
      if (state==='uf1') {
        makePath(ctx,shape,cx,cy,r);
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
        g.addColorStop(0,rgba(col,0.72)); g.addColorStop(0.5,rgba(col,0.44)); g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g; ctx.fill();
      }
    
      let borderCol, borderW, borderA;
      if      (state==='locked')     { borderCol='#2a3a4a'; borderW=1.2; borderA=0.5; }
      else if (state==='unlockable') { borderCol='#57d1b8'; borderW=1.8; borderA=0.75; }
      else if (state==='unlocked')   { borderCol=col;       borderW=2.2; borderA=0.9; }
      else if (state==='uf1')        { borderCol=col;       borderW=2.2; borderA=0.96; }
      else if (state==='uf2')        { borderCol=col;       borderW=2.4; borderA=1.0; }
      else                           { borderCol=col;       borderW=2.0; borderA=0.92; }
    
      if (state==='unlocked') {
        ctx.shadowBlur=8; ctx.shadowColor=rgba(col,0.7);
      }
      makePath(ctx,shape,cx,cy,r);
      ctx.strokeStyle=rgba(borderCol,borderA); ctx.lineWidth=borderW; ctx.stroke();
      ctx.shadowBlur=0;
    
      if (state==='uf1') {
        makePath(ctx,shape,cx,cy,r*0.46);
        ctx.fillStyle=rgba(col,0.18); ctx.fill();
      }
      if (state==='uf2') {
        const ringGlow=ctx.createRadialGradient(cx,cy,r*1.02,cx,cy,revealGlowR);
        ringGlow.addColorStop(0,rgba(col,0.16));
        ringGlow.addColorStop(0.78,rgba(col,0.06));
        ringGlow.addColorStop(1,rgba(col,0));
        ctx.beginPath(); ctx.arc(cx,cy,revealGlowR,0,Math.PI*2);
        ctx.fillStyle=ringGlow; ctx.fill();
        ctx.beginPath(); ctx.arc(cx,cy,r*1.18,0,Math.PI*2);
        ctx.strokeStyle=rgba(col,0.55); ctx.lineWidth=2.4;
        ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,r*1.06,0,Math.PI*2);
        ctx.strokeStyle=rgba(col,0.30); ctx.lineWidth=1.2; ctx.stroke();
      }
      if (state==='uf3') {
        const ringGlow=ctx.createRadialGradient(cx,cy,r*1.00,cx,cy,revealGlowR);
        ringGlow.addColorStop(0,rgba(col,0.10));
        ringGlow.addColorStop(0.82,rgba(col,0.04));
        ringGlow.addColorStop(1,rgba(col,0));
        ctx.beginPath(); ctx.arc(cx,cy,revealGlowR,0,Math.PI*2);
        ctx.fillStyle=ringGlow; ctx.fill();
        ctx.beginPath(); ctx.arc(cx,cy,r*1.16,0,Math.PI*2);
        ctx.strokeStyle=rgba(col,0.28); ctx.lineWidth=1.6;
        ctx.stroke();
      }
    
      if (state==='unlockable') {
        ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.arc(cx,cy,r*1.16,0,Math.PI*2);
        ctx.strokeStyle=rgba('#57d1b8',0.25); ctx.lineWidth=1; ctx.stroke();
        ctx.setLineDash([]);
      }
    
      ctx.restore();
    }

    const ICON_DEFS = [
      { label:'Click ATK',   color:'#e67e22' },
      { label:'Click Crit%', color:'#f97316' },
      { label:'Click CritX', color:'#f5c518' },
      { label:'Click Range', color:'#57d1b8' },
      { label:'Global DMG',  color:'#ef4444' },
      { label:'Global Crit', color:'#f97316' },
      { label:'Chain DMG',   color:'#00bcd4' },
      { label:'Chain Depth', color:'#22d3ee' },
      { label:'Chain Range', color:'#0ea5e9' },
      { label:'Chain CD',    color:'#38bdf8' },
      { label:'Tx Damage',   color:'#3b82f6' },
      { label:'Tx Duration', color:'#818cf8' },
      { label:'Worker Cnt',  color:'#2ecc71' },
      { label:'Worker DMG',  color:'#4ade80' },
      { label:'Worker Spd',  color:'#86efac' },
      { label:'Vdom Patch',  color:'#a855f7' },
      { label:'Vdom Diff',   color:'#9b59b6' },
      { label:'Vdom Scan',   color:'#c084fc' },
      { label:'Spawn Slot',  color:'#27ae60' },
      { label:'Spawn Speed', color:'#4ade80' },
      { label:'Res Unlock',  color:'#f7df1e' },
      { label:'Gold Bonus',  color:'#f5e859' },
      { label:'Wpn Unlock',  color:'#a78bfa' },
      { label:'Wpn Awaken',  color:'#fbbf24' },
    ];
    
    function drawIconShape(ctx, idx, cx, cy, color) {
      const lw = 1.8;
      ctx.strokeStyle = rgba(color, 0.92);
      ctx.fillStyle   = rgba(color, 0.92);
      ctx.lineWidth   = lw;
      ctx.lineCap  = 'round';
      ctx.lineJoin = 'round';
    
      switch(idx) {
        case 0: {
          ctx.beginPath();
          ctx.moveTo(cx-5, cy-10); ctx.lineTo(cx-5, cy+3);
          ctx.lineTo(cx-1, cy);    ctx.lineTo(cx+2, cy+6);
          ctx.lineTo(cx+4, cy+4);  ctx.lineTo(cx+1, cy-1);
          ctx.lineTo(cx+5, cy-1);  ctx.closePath(); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx+7, cy+8, 2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(cx+7, cy+4); ctx.lineTo(cx+7, cy+5.5);
          ctx.moveTo(cx+10, cy+6); ctx.lineTo(cx+8.8, cy+6.8);
          ctx.moveTo(cx+9, cy+9); ctx.lineTo(cx+7.8, cy+8.5);
          ctx.stroke(); break;
        }
        case 1: {
          const r=8;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(cx-r-4, cy); ctx.lineTo(cx-r+1, cy);
          ctx.moveTo(cx+r-1, cy); ctx.lineTo(cx+r+4, cy);
          ctx.moveTo(cx, cy-r-4); ctx.lineTo(cx, cy-r+1);
          ctx.moveTo(cx, cy+r-1); ctx.lineTo(cx, cy+r+4);
          ctx.stroke(); break;
        }
        case 2: {
          ctx.beginPath();
          ctx.moveTo(cx, cy-11); ctx.lineTo(cx+9, cy);
          ctx.lineTo(cx, cy+11); ctx.lineTo(cx-9, cy);
          ctx.closePath(); ctx.stroke();
          const o=5;
          ctx.beginPath();
          ctx.moveTo(cx-o, cy-o); ctx.lineTo(cx+o, cy+o);
          ctx.moveTo(cx+o, cy-o); ctx.lineTo(cx-o, cy+o);
          ctx.lineWidth = 2.2; ctx.stroke(); break;
        }
        case 3: {
          [4, 7, 11].forEach((r, i) => {
            ctx.globalAlpha = 1 - i*0.28;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
          });
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI*2); ctx.fill(); break;
        }
        case 4: {
          ctx.beginPath();
          ctx.moveTo(cx, cy-11);
          ctx.lineTo(cx+7, cy-2); ctx.lineTo(cx+3, cy-2);
          ctx.lineTo(cx+3, cy+11); ctx.lineTo(cx-3, cy+11);
          ctx.lineTo(cx-3, cy-2); ctx.lineTo(cx-7, cy-2);
          ctx.closePath(); ctx.stroke(); break;
        }
        case 5: {
          ctx.beginPath(); ctx.ellipse(cx, cy, 11, 7, 0, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, Math.PI*2); ctx.fill(); break;
        }
        case 6: {
          ctx.beginPath(); ctx.ellipse(cx-5, cy+1, 3.5, 5.5, 0, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(cx+5, cy+1, 3.5, 5.5, 0, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-1.5, cy+1); ctx.lineTo(cx+1.5, cy+1); ctx.stroke();
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx+1, cy-10); ctx.lineTo(cx-2, cy-6);
          ctx.lineTo(cx+1, cy-6);  ctx.lineTo(cx-1, cy-2); ctx.stroke(); break;
        }
        case 7: {
          for(let i=0; i<3; i++){
            const y=cy-7+i*7;
            ctx.beginPath(); ctx.rect(cx-4.5, y-2.5, 9, 5); ctx.stroke();
            if(i<2){ ctx.beginPath(); ctx.moveTo(cx, y+2.5); ctx.lineTo(cx, y+4.5); ctx.stroke(); }
          }
          ctx.beginPath();
          ctx.moveTo(cx-4, cy+10); ctx.lineTo(cx, cy+14); ctx.lineTo(cx+4, cy+10); ctx.stroke(); break;
        }
        case 8: {
          ctx.beginPath(); ctx.arc(cx, cy+4, 5, -Math.PI*0.8, -Math.PI*0.2); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy+4, 10, -Math.PI*0.8, -Math.PI*0.2); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy+4, 1.5, 0, Math.PI*2); ctx.fill();
          const a1=-Math.PI*0.8, a2=-Math.PI*0.2, r=10;
          ctx.beginPath(); ctx.arc(cx+r*Math.cos(a1), cy+4+r*Math.sin(a1), 1.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx+r*Math.cos(a2), cy+4+r*Math.sin(a2), 1.5, 0, Math.PI*2); ctx.fill(); break;
        }
        case 9: {
          ctx.beginPath(); ctx.arc(cx-1, cy+1, 9, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx-1, cy+1); ctx.lineTo(cx-1, cy-6);
          ctx.moveTo(cx-1, cy+1); ctx.lineTo(cx+5, cy+3);
          ctx.stroke();
          ctx.beginPath(); ctx.arc(cx-1, cy+1, 1.5, 0, Math.PI*2); ctx.fill();
          ctx.lineWidth=1.3;
          ctx.beginPath();
          ctx.moveTo(cx+7, cy-8); ctx.lineTo(cx+4, cy-4);
          ctx.lineTo(cx+7, cy-4); ctx.lineTo(cx+5, cy-0); ctx.stroke(); break;
        }
        case 10: {
          ctx.beginPath(); ctx.arc(cx-2, cy+1, 8, 0, Math.PI*2); ctx.stroke();
          ctx.fillStyle=rgba(color,0.15); ctx.fill(); ctx.fillStyle=rgba(color,0.92);
          ctx.font='bold 9px Consolas'; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText('tx', cx-2, cy+1.5);
          ctx.lineWidth=1.4;
          ctx.beginPath();
          ctx.moveTo(cx+6, cy-8); ctx.lineTo(cx+3, cy-4);
          ctx.lineTo(cx+6, cy-4); ctx.lineTo(cx+4, cy+0); ctx.stroke(); break;
        }
        case 11: {
          ctx.beginPath();
          ctx.moveTo(cx-7, cy-10); ctx.lineTo(cx+7, cy-10);
          ctx.lineTo(cx,   cy+0);
          ctx.lineTo(cx+7, cy+10); ctx.lineTo(cx-7, cy+10);
          ctx.lineTo(cx,   cy+0);
          ctx.closePath(); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy+0, 1.5, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha=0.6;
          ctx.beginPath(); ctx.arc(cx-2, cy-2, 1, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx+2, cy-2, 1, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha=1; break;
        }
        case 12: {
          [[cx, cy-7],[cx-6, cy+5],[cx+6, cy+5]].forEach(([wx,wy])=>{
            ctx.beginPath(); ctx.arc(wx, wy, 4, 0, Math.PI*2); ctx.stroke();
          }); break;
        }
        case 13: {
          ctx.lineWidth=2.8;
          ctx.beginPath(); ctx.moveTo(cx-8, cy+9); ctx.lineTo(cx+2, cy-2); ctx.stroke();
          ctx.lineWidth=lw;
          ctx.beginPath(); ctx.arc(cx+4, cy-5, 5.5, 0, Math.PI*2); ctx.stroke();
          ctx.save();
          ctx.globalCompositeOperation='destination-out';
          ctx.beginPath(); ctx.arc(cx+4, cy-5, 3, 0, Math.PI*2); ctx.fill();
          ctx.restore();
          ctx.fillStyle=rgba(color,0.92); break;
        }
        case 14: {
          ctx.lineWidth=2.4;
          ctx.beginPath(); ctx.moveTo(cx-9, cy+8); ctx.lineTo(cx+1, cy-2); ctx.stroke();
          ctx.lineWidth=lw;
          ctx.beginPath(); ctx.arc(cx+3, cy-4, 4.5, 0, Math.PI*2); ctx.stroke();
          ctx.save();
          ctx.globalCompositeOperation='destination-out';
          ctx.beginPath(); ctx.arc(cx+3, cy-4, 2.5, 0, Math.PI*2); ctx.fill();
          ctx.restore();
          ctx.fillStyle=rgba(color,0.92);
          ctx.globalAlpha=0.75;
          [[cx+8,cy+1,cx+12,cy+1],[cx+9,cy+5,cx+12,cy+5],[cx+8,cy+9,cx+12,cy+9]].forEach(([x1,y1,x2,y2])=>{
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
          });
          ctx.globalAlpha=1; break;
        }
        case 15: {
          ctx.font='bold 13px Consolas';
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText('</>',cx,cy+1); break;
        }
        case 16: {
          ctx.beginPath(); ctx.rect(cx-11, cy-7, 10, 14); ctx.stroke();
          ctx.fillStyle=rgba(color,0.08); ctx.fill(); ctx.fillStyle=rgba(color,0.92);
          ctx.beginPath(); ctx.rect(cx+1,  cy-7, 10, 14); ctx.stroke();
          ctx.fillStyle=rgba(color,0.08); ctx.fill(); ctx.fillStyle=rgba(color,0.92);
          ctx.beginPath(); ctx.moveTo(cx-9.5,cy); ctx.lineTo(cx-2.5,cy); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx+3,cy); ctx.lineTo(cx+9,cy);
          ctx.moveTo(cx+6,cy-3); ctx.lineTo(cx+6,cy+3); ctx.stroke(); break;
        }
        case 17: {
          ctx.beginPath(); ctx.rect(cx-11, cy-8, 22, 16); ctx.stroke();
          const grad=ctx.createLinearGradient(cx-9,0,cx+9,0);
          grad.addColorStop(0,rgba(color,0));
          grad.addColorStop(0.5,rgba(color,0.9));
          grad.addColorStop(1,rgba(color,0.3));
          ctx.strokeStyle=grad; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx-9,cy); ctx.lineTo(cx+9,cy); ctx.stroke();
          ctx.strokeStyle=rgba(color,0.92); ctx.lineWidth=lw;
          ctx.beginPath(); ctx.arc(cx+8, cy, 2, 0, Math.PI*2); ctx.fill(); break;
        }
        case 18: {
          const gs=5, gap=3;
          [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx,dy])=>{
            ctx.beginPath();
            ctx.rect(cx+dx*(gs+gap/2)-gs/2, cy+dy*(gs+gap/2)-gs/2, gs, gs);
            ctx.stroke();
          }); break;
        }
        case 19: {
          ctx.beginPath();
          ctx.moveTo(cx,   cy-11);
          ctx.lineTo(cx+5, cy-4);
          ctx.moveTo(cx,   cy-11);
          ctx.lineTo(cx-5, cy-4);
          ctx.moveTo(cx,   cy-11); ctx.lineTo(cx, cy+5); ctx.stroke();
          ctx.globalAlpha=0.65;
          ctx.beginPath(); ctx.moveTo(cx-6,cy+8); ctx.lineTo(cx+6,cy+8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-4,cy+11); ctx.lineTo(cx+4,cy+11); ctx.stroke();
          ctx.globalAlpha=1; break;
        }
        case 20: {
          ctx.beginPath(); ctx.rect(cx-7, cy, 14, 11); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy+5.5, 2.5, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.rect(cx-1, cy+6, 2, 4); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(cx-4, cy);
          ctx.lineTo(cx-4, cy-6);
          ctx.arc(cx, cy-6, 4, Math.PI, 0, false);
          ctx.lineTo(cx+4, cy-3); ctx.stroke(); break;
        }
        case 21: {
          ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI*2); ctx.stroke();
          ctx.fillStyle=rgba(color,0.14); ctx.fill(); ctx.fillStyle=rgba(color,0.92);
          ctx.font='bold 12px Consolas'; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText('G',cx,cy+0.5);
          ctx.globalAlpha=0.5; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(cx-3,cy-6); ctx.lineTo(cx+1,cy-3); ctx.stroke();
          ctx.globalAlpha=1; break;
        }
        case 22: {
          ctx.beginPath();
          ctx.moveTo(cx, cy-13); ctx.lineTo(cx+2.5, cy+1);
          ctx.lineTo(cx, cy+3.5); ctx.lineTo(cx-2.5, cy+1); ctx.closePath(); ctx.stroke();
          ctx.lineWidth=2.2;
          ctx.beginPath(); ctx.moveTo(cx-8, cy+1); ctx.lineTo(cx+8, cy+1); ctx.stroke();
          ctx.lineWidth=lw;
          ctx.beginPath(); ctx.rect(cx-1.5, cy+3, 3, 8); ctx.stroke(); break;
        }
        case 23: {
          ctx.beginPath();
          ctx.moveTo(cx-3, cy-11); ctx.lineTo(cx-0.5, cy+1);
          ctx.lineTo(cx-3, cy+3.5); ctx.lineTo(cx-5, cy+1); ctx.closePath(); ctx.stroke();
          ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx-9, cy); ctx.lineTo(cx+2, cy); ctx.stroke();
          ctx.lineWidth=lw;
          ctx.strokeStyle=rgba('#fde68a',0.95);
          ctx.beginPath();
          ctx.moveTo(cx+5, cy+9);
          ctx.quadraticCurveTo(cx+2, cy+3, cx+5, cy-3);
          ctx.quadraticCurveTo(cx+7, cy-1, cx+8, cy-7);
          ctx.quadraticCurveTo(cx+10, cy-1, cx+10, cy+2);
          ctx.quadraticCurveTo(cx+11, cy+5, cx+5, cy+9);
          ctx.stroke(); break;
        }
      }
    }

    const BADGES = [
      { symbol:'+',   color:'rgba(20,178,48,0.97)',  stroke:'rgba(110,255,130,0.6)', label:'UNLOCK',  shadow:'rgba(40,255,70,0.7)' },
      { symbol:'UP',  color:'rgba(200,140,20,0.97)', stroke:'rgba(255,220,80,0.6)',  label:'UPGRADE', shadow:'rgba(255,200,40,0.7)' },
      { symbol:'MAX', color:'rgba(30,80,60,0.97)',   stroke:'rgba(50,180,120,0.4)',  label:'MAX LV',  shadow:'rgba(80,200,140,0.4)' },
    ];
    return { hexRgb: hexRgb, rgba: rgba, mixColor: mixColor, makePath: makePath, SHAPE_COLORS: SHAPE_COLORS, TINT_SHAPES: TINT_SHAPES,
             drawNodeCell: drawNodeCell, ICON_DEFS: ICON_DEFS, drawIconShape: drawIconShape, BADGES: BADGES };
  })();
  global.NodeBranchColorData = {
    head: "96a5d3dc",
    branches: {"Resource":{"rgb":[0.2,0.78,0.42],"label":"자원"},"Combat":{"rgb":[0.95,0.45,0.18],"label":"전투"},"Automation":{"rgb":[0.66,0.42,0.95],"label":"자동화"},"Economy":{"rgb":[0.96,0.73,0.22],"label":"경제"},"Core":{"rgb":[0.95,0.78,0.32],"label":"코어"}},
    branchDefault: {"rgb":[0.72,0.78,0.92],"label":"미지정"},
    tokens: {"kAwakenGold":[1,0.84,0.3,1],"BackgroundDeep":[0.0275,0.0471,0.0667,1],"HairlineColor":[0.106,0.157,0.212,1],"TextCaptionColor":[0.725,0.776,0.827,1],"kSkillTreeAmbientArcColor":[0.4,0.8,1,1]},
    K: {"SkillTreeBaseCellSize":126,"SkillTreeNodeSize":78,"SkillTreeMinZoom":0.35,"SkillTreeMaxZoom":2,"SkillTreeUiScale":1.18,"SkillNodeLabelFontSize":16,"SkillNodeSubLabelFontSize":9,"SkillTreeAwakenNodeSizeMultiplier":1.5,"SkillTreeWeaponNodeSizeMultiplier":1.3,"SkillTreeCoreNodeSizeMultiplier":1.4,"SkillTreeAwakenRingOutset":3,"SkillTreeAwakenRingOutsetY":2,"SkillTreeIconSheetContentInset":0.21875,"SkillTreeNodeCardFillDefault":0.796875,"SkillTreeNodeCardFillWeapon":0.734375,"SkillTreeNodeLabelBandCenter":0.7,"SkillTreeNodeLabelBandHeightRatio":0.26,"SkillTreeNodeLabelSidePadding":2,"NodeMinSize":36,"AwakenRingAlphaMin":0.3,"AwakenRingAlphaMax":0.78},
    sheet: {"unlockableBorder":"#57d1b8","lockedBorder":"#2a3a4a","cell":128,"r":50},
    colors: {"iconUnlocked":[1,1,1,0.92],"iconUnlockable":[1,1,1,0.86],"iconLocked":[0.82,0.88,0.96,0.56],"labelText":[0.93,0.96,1,1],"subLabelText":[0.93,0.96,1,0.65],"labelAlphaUnlocked":1,"labelAlphaUnlockable":0.9,"labelAlphaLocked":0.65},
    iconIndex: {"ClickPower":0,"EliteSpawnChance":3,"EliteHpReduction":4,"EliteRewardBonus":5,"CritChance":1,"CritMultiplier":2,"ClickRange":3,"GlobalDamage":4,"ChainDamage":6,"ChainDepth":7,"ChainRange":8,"ChainCooldown":9,"ChainInitialTargets":7,"TxTickDamage":10,"TxDuration":11,"TxRadius":10,"TxCooldown":11,"TxMaxTargets":10,"WorkerCount":12,"WorkerDamage":13,"WorkerSpeed":14,"WorkerLifetime":14,"WorkerBonusYield":13,"VdomPatchDamage":15,"VdomDiffCount":16,"VdomScanInterval":17,"VdomPatchRadius":15,"VdomDiffDamageScale":16,"SpawnWeight":18,"GlobalSpawnCount":18,"InitialSpawnCount":18,"SpawnInterval":19,"ResourceUnlock":20,"FeverUnlock":20,"MapUnlock":20,"EliteUnlock":20,"ResourceGoldBonus":21,"ResourceInterval":19,"WeaponUnlock":22,"WeaponAwaken":23,"PassiveGoldPerSec":21,"PassiveEfficiency":13,"StudyEfficiency":13,"StudyTime":11,"ArchTokenDropChance":5,"ArchTokenDropAmount":21,"GlobalCritChance":1,"ClickCritChance":1,"GlobalCritMultiplier":2,"ClickCritMultiplier":2,"InsightDropChance":5,"InsightDropAmount":21},
    counts: {"Core":1,"Automation":48,"Combat":83,"Economy":28,"Resource":214},
    shapeBranch: {"core/Core":1,"weapon/Automation":4,"awaken/Automation":4,"stat/Combat":83,"stat/Automation":40,"stat/Economy":28,"stat/Resource":200,"lang/Resource":14},
    sprites: sprites,
    nodes: [
      [0,0,"Core","core","CORE","",1,0,[158,28,19,14],"#c0c0d0"],
      [5,0,"Automation","weapon","MC","WeaponUnlock",1,5,[149,30,13],"#00bcd4"],
      [-5,0,"Automation","weapon","TX","WeaponUnlock",1,5,[152,16,55],"#3498db"],
      [13,0,"Automation","weapon","WT","WeaponUnlock",1,13,[211,45],"#2ecc71"],
      [0,-10,"Automation","weapon","VDOM","WeaponUnlock",1,10,[17,36,51],"#9b59b6"],
      [5,-7,"Automation","awaken","MC★","WeaponAwaken",1,12,[202],"#00bcd4"],
      [-5,-7,"Automation","awaken","TX★","WeaponAwaken",1,12,[305],"#3498db"],
      [13,-7,"Automation","awaken","WT★","WeaponAwaken",1,20,[250],"#2ecc71"],
      [-7,-10,"Automation","awaken","VD★","WeaponAwaken",1,17,[254],"#9b59b6"],
      [0,-2,"Combat","stat","HW","ClickPower",5,2,[14,29],"#e67e22"],
      [2,0,"Combat","stat","VAR","ClickCritChance",5,2,[19,15],"#e67e22"],
      [0,-6,"Combat","stat","IF","ClickRange",3,6,[21,44,91,94],"#e67e22"],
      [-2,-6,"Combat","stat","FOR","ClickCritMultiplier",5,8,[91,33],"#e67e22"],
      [5,-1,"Automation","stat","CDmg","ChainDamage",5,6,[59],"#00bcd4"],
      [0,-1,"Combat","stat","ARR","GlobalDamage",5,1,[],"#e74c3c"],
      [3,0,"Combat","stat","LIST","GlobalCritChance",5,3,[149],"#e74c3c"],
      [-6,0,"Combat","stat","I/O","GlobalCritMultiplier",5,6,[92],"#e74c3c"],
      [0,-9,"Economy","stat","TRY","StudyTime",3,9,[93],"#1abc9c"],
      [-5,-2,"Automation","stat","TxDot","TxTickDamage",5,7,[55,54],"#3498db"],
      [1,0,"Resource","stat","CLS","GlobalSpawnCount",3,1,[],"#27ae60"],
      [-2,0,"Resource","stat","NEW","InitialSpawnCount",3,2,[28,148],"#27ae60"],
      [0,-5,"Resource","stat","EXT","PassiveGoldPerSec",5,5,[150],"#f39c12"],
      [-8,0,"Resource","stat","OVR","PassiveEfficiency",5,8,[92,331],"#f39c12"],
      [10,2,"Resource","stat","ABST","StudyEfficiency",5,12,[42,321],"#f39c12"],
      [9,3,"Resource","stat","IFACE","SpawnInterval",5,14,[321,217],"#27ae60"],
      [-12,3,"Resource","stat","SYNC","GlobalSpawnCount",3,15,[156,68],"#27ae60"],
      [-1,-15,"Resource","stat","POOL","InitialSpawnCount",3,16,[95,244],"#27ae60"],
      [13,3,"Resource","stat","SCHED","PassiveGoldPerSec",5,16,[218,258],"#f39c12"],
      [-1,0,"Resource","stat","O(n)","StudyEfficiency",5,1,[],"#f39c12"],
      [0,-3,"Resource","stat","SORT","PassiveGoldPerSec",5,3,[150,151,306],"#f39c12"],
      [6,0,"Resource","stat","FIND","PassiveEfficiency",5,6,[90],"#f39c12"],
      [2,-6,"Resource","stat","S/Q","GlobalSpawnCount",3,8,[94,34],"#27ae60"],
      [-3,-10,"Automation","stat","VPDmg","VdomPatchDamage",5,13,[52,50,251,255],"#9b59b6"],
      [-3,-6,"Resource","stat","ALL","ResourceGoldBonus",1,9,[],"#9aa7b4"],
      [3,-6,"Resource","stat","ALL","InitialSpawnCount",3,9,[],"#9aa7b4"],
      [10,0,"Resource","stat","ALL","ResourceGoldBonus",5,10,[41,316,319,42],"#9aa7b4"],
      [0,-11,"Resource","stat","ALL","ResourceInterval",5,11,[43],"#9aa7b4"],
      [-10,0,"Resource","stat","ALL","SpawnWeight",3,10,[331,317,318,320],"#9aa7b4"],
      [0,-13,"Resource","stat","COM","GlobalSpawnCount",1,13,[43,154],"#778899"],
      [-1,-12,"Resource","stat","COM","PassiveGoldPerSec",1,13,[43],"#778899"],
      [1,-12,"Resource","stat","COM","PassiveEfficiency",1,13,[43,155],"#778899"],
      [9,0,"Combat","stat","ARG","ClickPower",1,9,[311],"#778899"],
      [10,1,"Combat","stat","SP","ClickRange",1,11,[],"#778899"],
      [0,-12,"Combat","stat","SP","ClickCritChance",1,12,[],"#778899"],
      [0,-7,"Resource","stat","GC","InitialSpawnCount",1,7,[93],"#778899"],
      [13,-1,"Automation","stat","WCnt","WorkerCount",5,14,[48],"#2ecc71"],
      [14,-3,"Automation","stat","WDmg","WorkerDamage",5,17,[47,49],"#2ecc71"],
      [13,-3,"Automation","stat","WSpd","WorkerSpeed",5,16,[48,248,249],"#2ecc71"],
      [13,-2,"Automation","stat","WLif","WorkerLifetime",5,15,[],"#2ecc71"],
      [15,-3,"Automation","stat","WBY","WorkerBonusYield",1,18,[],"#778899"],
      [-3,-9,"Automation","stat","VDiff","VdomDiffCount",5,14,[53],"#9b59b6"],
      [-1,-10,"Automation","stat","VScan","VdomScanInterval",5,11,[52],"#9b59b6"],
      [-2,-10,"Automation","stat","VPRad","VdomPatchRadius",5,12,[],"#9b59b6"],
      [-3,-8,"Automation","stat","VPDmg","VdomDiffDamageScale",1,15,[],"#9b59b6"],
      [-5,-3,"Automation","stat","TxDur","TxDuration",5,8,[56,301,303],"#3498db"],
      [-5,-1,"Automation","stat","TxRad","TxRadius",5,6,[],"#3498db"],
      [-4,-3,"Automation","stat","TxCld","TxCooldown",5,9,[57],"#3498db"],
      [-3,-3,"Automation","stat","TxMax","TxMaxTargets",3,10,[],"#3498db"],
      [5,-3,"Automation","stat","CDep","ChainDepth",5,8,[59,61,141,142],"#00bcd4"],
      [5,-2,"Automation","stat","CRng","ChainRange",5,7,[],"#00bcd4"],
      [7,-3,"Automation","stat","CIni","ChainInitialTargets",3,10,[61],"#00bcd4"],
      [6,-3,"Automation","stat","CCld","ChainCooldown",5,9,[],"#00bcd4"],
      [5,-12,"Economy","stat","CONF","InsightDropAmount",3,17,[86,98,99,100],"#e91e63"],
      [-9,6,"Combat","stat","TALK","GlobalCritChance",5,17,[107,123],"#e74c3c"],
      [10,8,"Combat","stat","HACK","GlobalCritMultiplier",5,18,[235,72],"#e74c3c"],
      [-7,6,"Combat","stat","PAIR","ClickCritChance",5,19,[123],"#e67e22"],
      [14,6,"Resource","stat","REVW","StudyEfficiency",5,20,[166,277],"#1abc9c"],
      [-8,9,"Combat","stat","PR","ClickPower",5,21,[101,243],"#e67e22"],
      [-13,3,"Resource","stat","MEET","PassiveGoldPerSec",5,16,[81],"#f39c12"],
      [3,-15,"Economy","stat","AWS","InsightDropChance",5,18,[245,264],"#e91e63"],
      [-10,8,"Combat","stat","CERT","GlobalDamage",5,18,[234,165],"#e74c3c"],
      [-15,2,"Resource","stat","STUDY","PassiveGoldPerSec",5,19,[145,129],"#f39c12"],
      [10,9,"Resource","stat","BOOK","StudyEfficiency",5,19,[108,109,113],"#1abc9c"],
      [-6,-15,"Economy","stat","BLOG","InsightDropChance",5,21,[189,204],"#e91e63"],
      [5,-10,"Resource","stat","SIDE","PassiveEfficiency",5,19,[100,126],"#f39c12"],
      [15,1,"Resource","stat","SHIP","StudyEfficiency",5,20,[77],"#1abc9c"],
      [4,-9,"Resource","stat","OJT","PassiveGoldPerSec",5,21,[126,172],"#f39c12"],
      [15,2,"Combat","stat","OPEN","GlobalDamage",5,19,[146],"#e74c3c"],
      [-11,9,"Economy","stat","PORT","StudyTime",3,20,[165,278],"#1abc9c"],
      [6,-9,"Combat","stat","AI","GlobalCritMultiplier",5,21,[126,224],"#e74c3c"],
      [-8,3,"Resource","stat","MQ","PassiveGoldPerSec",5,15,[157,83],"#16A085"],
      [-14,3,"Resource","stat","RATE","SpawnInterval",5,17,[145],"#C0392B"],
      [-10,2,"Resource","stat","PQ","GlobalSpawnCount",5,12,[320,153],"#E74C3C"],
      [-7,3,"Resource","stat","GRAPH","GlobalSpawnCount",3,16,[],"#27ae60"],
      [10,5,"Combat","stat","REC","GlobalCritMultiplier",5,15,[96,106],"#e74c3c"],
      [11,3,"Economy","stat","HASH","InsightDropChance",5,14,[321,218],"#e91e63"],
      [4,-12,"Resource","stat","DFS","ResourceInterval",1,16,[97],"#778899"],
      [1,-15,"Resource","stat","BFS","ResourceGoldBonus",1,16,[95,245],"#778899"],
      [0,-16,"Resource","stat","MEMO","StudyEfficiency",5,16,[95,105],"#f39c12"],
      [7,3,"Resource","stat","DP","PassiveEfficiency",5,16,[217],"#f39c12"],
      [7,0,"Resource","stat","ALL","ResourceGoldBonus",1,7,[311],"#9aa7b4"],
      [-1,-6,"Resource","stat","ALL","InitialSpawnCount",3,7,[],"#9aa7b4"],
      [-7,0,"Resource","stat","ALL","ResourceGoldBonus",5,7,[],"#9aa7b4"],
      [0,-8,"Resource","stat","ALL","SpawnWeight",3,8,[],"#9aa7b4"],
      [1,-6,"Resource","stat","ALL","ResourceInterval",5,7,[],"#9aa7b4"],
      [0,-15,"Resource","stat","UNIT","PassiveGoldPerSec",1,15,[154],"#6DB33F"],
      [10,4,"Resource","stat","UNIT","StudyEfficiency",5,14,[321],"#6DB33F"],
      [3,-12,"Resource","stat","UNIT","PassiveEfficiency",1,15,[155],"#6DB33F"],
      [5,-13,"Resource","stat","COVER","StudyEfficiency",5,18,[265],"#2A9D8F"],
      [6,-12,"Resource","stat","COVER","GlobalSpawnCount",1,18,[266],"#2A9D8F"],
      [5,-11,"Resource","stat","COVER","SpawnWeight",1,18,[],"#2A9D8F"],
      [-9,9,"Resource","stat","CI","PassiveGoldPerSec",5,20,[165],"#9B59B6"],
      [9,12,"Combat","stat","HOTFIX","GlobalCritChance",5,23,[131,140],"#E74C3C"],
      [-9,12,"Combat","stat","HOTFIX","ClickCritMultiplier",5,23,[130,139],"#E74C3C"],
      [11,12,"Combat","stat","HOTFIX","GlobalCritMultiplier",5,23,[131,284],"#E74C3C"],
      [0,-17,"Combat","stat","INTG","GlobalCritMultiplier",1,17,[236],"#457B9D"],
      [10,6,"Combat","stat","INTG","GlobalCritChance",1,16,[332,333,235],"#457B9D"],
      [-10,6,"Combat","stat","INTG","ClickCritChance",5,16,[219,259,234],"#457B9D"],
      [9,9,"Resource","stat","CI","PassiveEfficiency",1,20,[191],"#9B59B6"],
      [11,9,"Resource","stat","CI","ResourceInterval",1,20,[192],"#9B59B6"],
      [-10,10,"Resource","stat","ALL","ResourceGoldBonus",1,20,[165,195],"#9aa7b4"],
      [-5,-16,"Resource","stat","ALL","InitialSpawnCount",1,21,[189,178],"#9aa7b4"],
      [-3,-18,"Resource","stat","ALL","ResourceInterval",5,21,[190,194],"#9aa7b4"],
      [10,10,"Resource","stat","ALL","ResourceGoldBonus",5,20,[193],"#9aa7b4"],
      [5,-16,"Resource","stat","ALL","SpawnWeight",3,21,[128,179],"#9aa7b4"],
      [12,-12,"Combat","stat","REVW2","GlobalDamage",5,24,[181,299],"#3498DB"],
      [10,-10,"Combat","stat","REVW2","ClickCritChance",5,24,[292],"#3498DB"],
      [9,-9,"Combat","stat","REVW2","ClickCritMultiplier",5,24,[294,186],"#3498DB"],
      [-20,2,"Combat","stat","REVW2","ClickRange",5,24,[119,187],"#3498DB"],
      [-20,3,"Resource","stat","TDD","StudyEfficiency",5,23,[223,122,180],"#E74C3C"],
      [20,3,"Economy","stat","TDD","GlobalDamage",5,23,[225,121,273,133],"#E74C3C"],
      [20,2,"Economy","stat","BRANCH","InsightDropChance",5,24,[188],"#F05032"],
      [-21,3,"Economy","stat","BRANCH","InsightDropAmount",5,24,[205],"#F05032"],
      [-8,6,"Combat","stat","REFAC","GlobalDamage",5,18,[],"#F4A261"],
      [8,6,"Resource","stat","REFAC","StudyEfficiency",5,18,[332,169],"#F4A261"],
      [12,6,"Resource","stat","REFAC","PassiveEfficiency",5,18,[333,166],"#F4A261"],
      [5,-9,"Combat","stat","LINT","GlobalDamage",5,20,[],"#95A5A6"],
      [8,-12,"Combat","stat","LINT","GlobalDamage",5,20,[266,240],"#95A5A6"],
      [5,-15,"Combat","stat","LINT","ClickCritChance",5,20,[264,239],"#95A5A6"],
      [-15,1,"Combat","stat","LINT","ClickCritMultiplier",5,20,[],"#95A5A6"],
      [-10,12,"Resource","stat","STAGE","SpawnWeight",5,22,[195,198,173],"#1ABC9C"],
      [10,12,"Resource","stat","STAGE","GlobalSpawnCount",5,22,[193,226],"#1ABC9C"],
      [-5,-18,"Resource","stat","STAGE","SpawnInterval",5,23,[194,227,229],"#1ABC9C"],
      [20,4,"Resource","stat","ALL","ResourceGoldBonus",1,24,[],"#9aa7b4"],
      [-18,6,"Resource","stat","ALL","SpawnWeight",3,24,[279],"#9aa7b4"],
      [18,6,"Resource","stat","ALL","ResourceGoldBonus",5,24,[199],"#9aa7b4"],
      [-15,9,"Resource","stat","ALL","ResourceInterval",5,24,[196],"#9aa7b4"],
      [15,9,"Resource","stat","ALL","InitialSpawnCount",1,24,[197],"#9aa7b4"],
      [-12,12,"Economy","stat","RELNOTE","InsightDropAmount",5,24,[198],"#E67E22"],
      [-8,12,"Economy","stat","RELNOTE","InsightDropChance",5,24,[],"#E67E22"],
      [8,12,"Resource","stat","RELNOTE","PassiveGoldPerSec",5,24,[],"#E67E22"],
      [4,-3,"Automation","stat","CDmg","ChainDamage",5,9,[143],"#00bcd4"],
      [5,-4,"Automation","stat","CDep","ChainDepth",5,9,[144],"#00bcd4"],
      [3,-3,"Automation","stat","CRng","ChainRange",5,10,[],"#00bcd4"],
      [5,-5,"Automation","stat","CCld","ChainCooldown",5,10,[202],"#00bcd4"],
      [-15,3,"Combat","stat","DIFF","GlobalCritChance",5,18,[163,220],"#61DAFB"],
      [15,3,"Combat","stat","DIFF","GlobalCritMultiplier",5,18,[258,164,221],"#61DAFB"],
      [-12,6,"Combat","stat","DIFF","StudyTime",5,18,[259,222],"#61DAFB"],
      [-3,0,"Resource","stat","ALL","ResourceGoldBonus",1,3,[152],"#9aa7b4"],
      [4,0,"Resource","stat","ALL","InitialSpawnCount",3,4,[],"#9aa7b4"],
      [0,-4,"Resource","stat","ALL","ResourceGoldBonus",5,4,[],"#9aa7b4"],
      [-1,-3,"Resource","stat","ALL","SpawnWeight",3,4,[],"#9aa7b4"],
      [-4,0,"Resource","stat","ALL","ResourceInterval",5,4,[],"#9aa7b4"],
      [-10,3,"Combat","stat","POINTER","GlobalDamage",1,13,[156,157,326],"#778899"],
      [0,-14,"Combat","stat","EVTDEL","GlobalDamage",5,14,[],"#F39C12"],
      [2,-12,"Combat","stat","EVTDEL","GlobalDamage",5,14,[],"#F39C12"],
      [-11,3,"Combat","stat","EVTDEL","GlobalDamage",5,14,[],"#F39C12"],
      [-9,3,"Combat","stat","EVTDEL","ClickRange",5,14,[],"#F39C12"],
      [0,1,"Resource","lang","JS","ResourceUnlock",1,1,[159],"#f5e04a"],
      [0,2,"Resource","stat","JS","InitialSpawnCount",1,2,[160,210],"#f5e04a"],
      [0,3,"Resource","stat","JS","SpawnWeight",3,3,[162,307],"#f5e04a"],
      [0,5,"Resource","stat","JS","ResourceGoldBonus",5,5,[162,371],"#f5e04a"],
      [0,4,"Resource","stat","JS","ResourceInterval",5,4,[312],"#f5e04a"],
      [-16,3,"Resource","stat","SPLIT","StudyEfficiency",5,19,[212],"#F05032"],
      [16,3,"Resource","stat","SPLIT","PassiveGoldPerSec",5,19,[213],"#F05032"],
      [-10,9,"Economy","stat","VLIST","InsightDropChance",5,19,[],"#3498DB"],
      [13,6,"Economy","stat","VLIST","InsightDropAmount",5,19,[],"#3498DB"],
      [10,-13,"Resource","stat","LAZY","SpawnWeight",5,23,[171,291],"#F1C40F"],
      [-5,-12,"Resource","stat","LAZY","ResourceGoldBonus",5,23,[170,290],"#F1C40F"],
      [7,6,"Economy","stat","VLIST","GlobalDamage",5,19,[],"#3498DB"],
      [-5,-13,"Combat","stat","REDR","GlobalCritChance",5,22,[238],"#61DAFB"],
      [10,-12,"Combat","stat","REDR","GlobalCritMultiplier",5,22,[240,181,292],"#61DAFB"],
      [3,-9,"Combat","stat","REDR","GlobalDamage",5,22,[293],"#61DAFB"],
      [-10,13,"Resource","stat","ALL","ResourceGoldBonus",1,23,[285],"#9aa7b4"],
      [2,8,"Resource","stat","RE","InitialSpawnCount",1,10,[336,176],"#52ffe8"],
      [5,8,"Resource","stat","RE","ResourceGoldBonus",5,13,[177],"#52ffe8"],
      [3,8,"Resource","stat","RE","SpawnWeight",3,11,[177],"#52ffe8"],
      [4,8,"Resource","stat","RE","ResourceInterval",5,12,[],"#52ffe8"],
      [-5,-17,"Combat","stat","RAY","GlobalDamage",5,22,[],"#E74C3C"],
      [5,-17,"Combat","stat","RAY","ClickCritChance",5,22,[270],"#E74C3C"],
      [-20,4,"Resource","stat","ALL","ResourceGoldBonus",1,24,[],"#9aa7b4"],
      [11,-12,"Resource","stat","LAZY","ResourceInterval",5,23,[],"#F1C40F"],
      [2,10,"Resource","stat","UN","InitialSpawnCount",1,12,[337,183],"#ff6b6b"],
      [3,10,"Resource","stat","UN","SpawnWeight",3,13,[185],"#ff6b6b"],
      [5,10,"Resource","stat","UN","ResourceGoldBonus",5,15,[185],"#ff6b6b"],
      [4,10,"Resource","stat","UN","ResourceInterval",5,14,[],"#ff6b6b"],
      [10,-9,"Resource","stat","STATE","StudyEfficiency",5,25,[],"#764ABC"],
      [-20,1,"Resource","stat","STATE","PassiveEfficiency",5,25,[],"#764ABC"],
      [20,1,"Resource","stat","STATE","PassiveGoldPerSec",5,25,[],"#764ABC"],
      [-5,-15,"Economy","stat","DROP","InsightDropAmount",5,20,[263,238],"#9B59B6"],
      [-2,-18,"Economy","stat","DROP","InsightDropChance",5,20,[261],"#9B59B6"],
      [8,9,"Resource","stat","ALL","ResourceGoldBonus",1,21,[287],"#9aa7b4"],
      [12,9,"Resource","stat","ALL","InitialSpawnCount",1,21,[288],"#9aa7b4"],
      [10,11,"Resource","stat","ALL","SpawnWeight",3,21,[],"#9aa7b4"],
      [-4,-18,"Resource","stat","ALL","ResourceGoldBonus",5,22,[],"#9aa7b4"],
      [-10,11,"Resource","stat","ALL","ResourceInterval",5,21,[],"#9aa7b4"],
      [-14,9,"Resource","stat","QOPT","StudyEfficiency",5,23,[242],"#E38C00"],
      [14,9,"Resource","stat","QOPT","PassiveGoldPerSec",5,23,[288],"#E38C00"],
      [-11,12,"Resource","stat","QOPT","PassiveEfficiency",5,23,[],"#E38C00"],
      [17,6,"Combat","stat","RACE","StudyTime",5,23,[215],"#C0392B"],
      [-15,8,"Combat","stat","RACE","GlobalCritMultiplier",5,23,[216],"#C0392B"],
      [15,8,"Combat","stat","RACE","GlobalCritChance",5,23,[241],"#C0392B"],
      [5,-6,"Automation","stat","CIni","ChainInitialTargets",3,11,[],"#00bcd4"],
      [7,-15,"Combat","stat","RAY","ClickRange",5,22,[239,272],"#E74C3C"],
      [-7,-15,"Combat","stat","RAY","ClickCritMultiplier",5,22,[271],"#E74C3C"],
      [-22,3,"Resource","stat","ASYNC","StudyEfficiency",5,25,[],"#2ECC71"],
      [-2,2,"Resource","stat","PY","InitialSpawnCount",1,4,[210,208],"#6fa8ff"],
      [-5,2,"Resource","stat","PY","ResourceGoldBonus",5,7,[209],"#6fa8ff"],
      [-3,2,"Resource","stat","PY","SpawnWeight",3,5,[209],"#6fa8ff"],
      [-4,2,"Resource","stat","PY","ResourceInterval",5,6,[],"#6fa8ff"],
      [-1,2,"Resource","lang","PY","ResourceUnlock",1,3,[],"#6fa8ff"],
      [12,0,"Combat","stat","SP","ClickCritMultiplier",1,12,[316],"#778899"],
      [-17,3,"Resource","stat","TPOOL","GlobalSpawnCount",5,20,[256],"#E67E22"],
      [17,3,"Resource","stat","TPOOL","InitialSpawnCount",5,20,[257],"#E67E22"],
      [-16,6,"Resource","stat","CHAN","SpawnInterval",5,22,[276,279],"#1ABC9C"],
      [16,6,"Economy","stat","CHAN","InsightDropChance",5,22,[277],"#1ABC9C"],
      [-15,7,"Economy","stat","CHAN","InsightDropAmount",5,22,[276],"#1ABC9C"],
      [8,3,"Combat","stat","SPIN","GlobalDamage",5,15,[],"#D35400"],
      [12,3,"Combat","stat","SPIN","GlobalCritChance",5,15,[],"#D35400"],
      [-10,5,"Combat","stat","SPIN","GlobalCritMultiplier",5,15,[326],"#D35400"],
      [-15,4,"Combat","stat","CBACK","GlobalCritMultiplier",5,19,[267],"#7F8C8D"],
      [15,4,"Combat","stat","CBACK","GlobalCritChance",5,19,[268],"#7F8C8D"],
      [-13,6,"Combat","stat","CBACK","GlobalDamage",5,19,[269],"#7F8C8D"],
      [-19,3,"Resource","stat","MUTEX","PassiveEfficiency",5,22,[256],"#8E44AD"],
      [7,-9,"Economy","stat","MUTEX","GlobalDamage",5,22,[294],"#8E44AD"],
      [19,3,"Resource","stat","MUTEX","SpawnWeight",5,22,[257],"#8E44AD"],
      [10,13,"Resource","stat","ALL","ResourceGoldBonus",1,23,[286],"#9aa7b4"],
      [-5,-19,"Resource","stat","ALL","InitialSpawnCount",1,24,[231],"#9aa7b4"],
      [6,-18,"Resource","stat","ALL","SpawnWeight",3,24,[270,233],"#9aa7b4"],
      [-6,-18,"Resource","stat","ALL","ResourceGoldBonus",5,24,[232],"#9aa7b4"],
      [-9,-15,"Resource","stat","ALL","ResourceInterval",5,24,[271,300],"#9aa7b4"],
      [-5,-20,"Resource","stat","DEAD","StudyEfficiency",5,25,[],"#C0392B"],
      [-7,-18,"Resource","stat","DEAD","PassiveGoldPerSec",5,25,[],"#C0392B"],
      [7,-18,"Resource","stat","DEAD","PassiveEfficiency",5,25,[],"#C0392B"],
      [-10,7,"Combat","stat","EVTLP","GlobalDamage",5,17,[],"#F39C12"],
      [10,7,"Combat","stat","EVTLP","ClickCritChance",5,17,[],"#F39C12"],
      [0,-18,"Combat","stat","EVTLP","ClickCritMultiplier",5,18,[260,261,262],"#F39C12"],
      [-3,-15,"Combat","stat","EVTLP","ClickRange",5,18,[244,263],"#F39C12"],
      [-5,-14,"Resource","stat","SEMA","GlobalSpawnCount",5,21,[],"#2980B9"],
      [6,-15,"Resource","stat","SEMA","GlobalSpawnCount",5,21,[],"#2980B9"],
      [9,-12,"Resource","stat","SEMA","GlobalSpawnCount",5,21,[],"#2980B9"],
      [15,7,"Combat","stat","PUB","GlobalDamage",5,22,[277],"#27AE60"],
      [-13,9,"Combat","stat","PUB","GlobalCritChance",5,22,[278],"#27AE60"],
      [-7,9,"Combat","stat","PUB","GlobalCritMultiplier",5,22,[],"#27AE60"],
      [-2,-15,"Resource","stat","PROM","StudyEfficiency",5,17,[],"#3498DB"],
      [2,-15,"Economy","stat","PROM","GlobalDamage",5,17,[],"#3498DB"],
      [11,-3,"Automation","stat","WLif","WorkerLifetime",5,18,[248],"#2ecc71"],
      [13,-5,"Automation","stat","WSpd","WorkerSpeed",5,18,[249,250],"#2ecc71"],
      [12,-3,"Automation","stat","WBY","WorkerBonusYield",1,17,[],"#778899"],
      [13,-4,"Automation","stat","WDmg","WorkerDamage",5,17,[],"#2ecc71"],
      [13,-6,"Automation","stat","WCnt","WorkerCount",5,19,[],"#2ecc71"],
      [-3,-11,"Automation","stat","VScan","VdomScanInterval",5,14,[252],"#9b59b6"],
      [-3,-12,"Automation","stat","VDiff","VdomDiffCount",5,15,[],"#9b59b6"],
      [-5,-10,"Automation","stat","VPRad","VdomPatchRadius",5,15,[255,254],"#9b59b6"],
      [-6,-10,"Automation","stat","VPDmg","VdomPatchDamage",5,16,[],"#9b59b6"],
      [-4,-10,"Automation","stat","VPDmg","VdomDiffDamageScale",1,14,[],"#9b59b6"],
      [-18,3,"Combat","stat","AI","GlobalCritChance",5,21,[],"#e74c3c"],
      [18,3,"Combat","stat","AI","GlobalDamage",5,21,[],"#e74c3c"],
      [14,3,"Resource","stat","RATE","ResourceInterval",5,17,[],"#C0392B"],
      [-11,6,"Resource","stat","RATE","SpawnWeight",5,17,[],"#C0392B"],
      [0,-19,"Economy","stat","API","InsightDropAmount",5,19,[],"#3498DB"],
      [-1,-18,"Economy","stat","API","InsightDropChance",5,19,[],"#3498DB"],
      [1,-18,"Economy","stat","API","StudyTime",5,19,[],"#3498DB"],
      [-4,-15,"Combat","stat","LB","GlobalDamage",5,19,[],"#1ABC9C"],
      [4,-15,"Combat","stat","LB","ClickCritChance",5,19,[],"#1ABC9C"],
      [5,-14,"Combat","stat","LB","ClickCritMultiplier",5,19,[],"#1ABC9C"],
      [7,-12,"Combat","stat","LB","ClickRange",5,19,[],"#1ABC9C"],
      [-15,5,"Resource","stat","CACHE","PassiveGoldPerSec",5,20,[],"#F39C12"],
      [15,5,"Resource","stat","CACHE","StudyEfficiency",5,20,[],"#F39C12"],
      [-14,6,"Resource","stat","CACHE","PassiveEfficiency",5,20,[276],"#F39C12"],
      [5,-18,"Combat","stat","AUTH","GlobalCritChance",5,23,[],"#8E44AD"],
      [-8,-15,"Combat","stat","AUTH","GlobalDamage",5,23,[],"#8E44AD"],
      [8,-15,"Combat","stat","AUTH","GlobalCritMultiplier",5,23,[289],"#8E44AD"],
      [21,3,"Resource","stat","ALL","ResourceGoldBonus",1,24,[],"#9aa7b4"],
      [0,8,"Resource","stat","CI","InitialSpawnCount",1,8,[335,295,336],"#b46cff"],
      [0,11,"Resource","stat","CI","ResourceGoldBonus",5,11,[296,372],"#b46cff"],
      [-15,6,"Combat","stat","JWT","GlobalCritChance",5,21,[],"#2980B9"],
      [15,6,"Combat","stat","JWT","GlobalDamage",5,21,[],"#2980B9"],
      [-12,9,"Combat","stat","JWT","GlobalCritMultiplier",5,21,[],"#2980B9"],
      [-17,6,"Resource","stat","ALL","ResourceGoldBonus",1,23,[],"#9aa7b4"],
      [-2,9,"Resource","stat","DK","InitialSpawnCount",1,11,[338,281],"#2aa7f0"],
      [-3,9,"Resource","stat","DK","SpawnWeight",3,12,[283],"#2aa7f0"],
      [-5,9,"Resource","stat","DK","ResourceGoldBonus",5,14,[283],"#2aa7f0"],
      [-4,9,"Resource","stat","DK","ResourceInterval",5,13,[],"#2aa7f0"],
      [12,12,"Resource","stat","HLTH","PassiveEfficiency",5,24,[],"#27AE60"],
      [-10,14,"Resource","stat","HLTH","PassiveGoldPerSec",5,24,[],"#27AE60"],
      [10,14,"Resource","stat","HLTH","StudyEfficiency",5,24,[],"#27AE60"],
      [7,9,"Resource","stat","CB","SpawnWeight",5,22,[],"#E74C3C"],
      [13,9,"Resource","stat","CB","ResourceGoldBonus",5,22,[],"#E74C3C"],
      [9,-15,"Economy","stat","ALERT","InsightDropAmount",5,24,[297],"#F4A261"],
      [-6,-12,"Economy","stat","ALERT","GlobalDamage",5,24,[298],"#F4A261"],
      [10,-14,"Economy","stat","ALERT","InsightDropChance",5,24,[],"#F4A261"],
      [10,-11,"Resource","stat","OAUTH","InitialSpawnCount",5,23,[],"#EB5757"],
      [2,-9,"Resource","stat","OAUTH","SpawnInterval",5,23,[],"#EB5757"],
      [8,-9,"Resource","stat","OAUTH","SpawnWeight",5,23,[],"#EB5757"],
      [0,9,"Resource","stat","CI","SpawnWeight",3,9,[296,338],"#b46cff"],
      [0,10,"Resource","stat","CI","ResourceInterval",5,10,[337],"#b46cff"],
      [10,-15,"Combat","stat","MON","GlobalDamage",5,25,[],"#2ECC71"],
      [-7,-12,"Combat","stat","MON","ClickCritChance",5,25,[],"#2ECC71"],
      [13,-12,"Combat","stat","MON","ClickCritMultiplier",5,25,[],"#2ECC71"],
      [-10,-15,"Combat","stat","RETRY","GlobalDamage",5,25,[],"#E67E22"],
      [-6,-3,"Automation","stat","TxDur","TxDuration",5,9,[302],"#3498db"],
      [-7,-3,"Automation","stat","TxDot","TxTickDamage",5,10,[],"#3498db"],
      [-5,-4,"Automation","stat","TxRad","TxRadius",5,9,[304],"#3498db"],
      [-5,-5,"Automation","stat","TxCld","TxCooldown",5,10,[305],"#3498db"],
      [-5,-6,"Automation","stat","TxMax","TxMaxTargets",3,11,[],"#3498db"],
      [1,-3,"Resource","stat","ALL","ResourceGoldBonus",1,4,[],"#9aa7b4"],
      [1,3,"Resource","stat","C#","InitialSpawnCount",1,4,[308],"#4fb3ff"],
      [2,3,"Resource","stat","C#","SpawnWeight",3,5,[310],"#4fb3ff"],
      [4,3,"Resource","stat","C#","ResourceGoldBonus",5,7,[310],"#4fb3ff"],
      [3,3,"Resource","stat","C#","ResourceInterval",5,6,[],"#4fb3ff"],
      [8,0,"Resource","stat","ALL","ResourceGoldBonus",1,8,[],"#9aa7b4"],
      [-1,4,"Resource","stat","GIT","InitialSpawnCount",1,5,[313],"#ff8a4a"],
      [-2,4,"Resource","stat","GIT","SpawnWeight",3,6,[315],"#ff8a4a"],
      [-4,4,"Resource","stat","GIT","ResourceGoldBonus",5,8,[315],"#ff8a4a"],
      [-3,4,"Resource","stat","GIT","ResourceInterval",5,7,[],"#ff8a4a"],
      [11,0,"Resource","stat","ALL","ResourceGoldBonus",1,11,[],"#9aa7b4"],
      [-11,0,"Resource","stat","ALL","InitialSpawnCount",1,11,[334],"#9aa7b4"],
      [-10,-1,"Resource","stat","ALL","SpawnWeight",3,11,[],"#9aa7b4"],
      [10,-1,"Resource","stat","ALL","ResourceGoldBonus",5,11,[],"#9aa7b4"],
      [-10,1,"Resource","stat","ALL","ResourceInterval",5,11,[],"#9aa7b4"],
      [10,3,"Resource","stat","ALL","ResourceGoldBonus",1,13,[],"#9aa7b4"],
      [0,14,"Resource","stat","PAT","InitialSpawnCount",1,14,[339,323,340],"#f5b83b"],
      [0,15,"Resource","stat","PAT","SpawnWeight",3,15,[325,341],"#f5b83b"],
      [0,17,"Resource","stat","PAT","ResourceGoldBonus",5,17,[325,373],"#f5b83b"],
      [0,16,"Resource","stat","PAT","ResourceInterval",5,16,[346],"#f5b83b"],
      [-10,4,"Resource","stat","ALL","ResourceGoldBonus",1,14,[],"#9aa7b4"],
      [-2,14,"Resource","stat","CLN","InitialSpawnCount",1,16,[340,328],"#7ee06a"],
      [-3,14,"Resource","stat","CLN","SpawnWeight",3,17,[330],"#7ee06a"],
      [-5,14,"Resource","stat","CLN","ResourceGoldBonus",5,19,[330],"#7ee06a"],
      [-4,14,"Resource","stat","CLN","ResourceInterval",5,18,[],"#7ee06a"],
      [-9,0,"Combat","stat","FVR","FeverUnlock",1,9,[],"#e67e22"],
      [9,6,"Economy","stat","ELT","EliteSpawnChance",5,17,[],"#ff8a3a"],
      [11,6,"Economy","stat","ELR","EliteRewardBonus",5,17,[],"#ff8a3a"],
      [-12,0,"Combat","stat","ELP","EliteHpReduction",5,12,[],"#ff8a3a"],
      [0,7,"Resource","lang","CI","ResourceUnlock",1,7,[371],"#b46cff"],
      [1,8,"Resource","lang","RE","ResourceUnlock",1,9,[],"#52ffe8"],
      [1,10,"Resource","lang","UN","ResourceUnlock",1,11,[],"#ff6b6b"],
      [-1,9,"Resource","lang","DK","ResourceUnlock",1,10,[],"#2aa7f0"],
      [0,13,"Resource","lang","PAT","ResourceUnlock",1,13,[372],"#f5b83b"],
      [-1,14,"Resource","lang","CLN","ResourceUnlock",1,15,[],"#7ee06a"],
      [1,15,"Resource","lang","K8S","ResourceUnlock",1,16,[342],"#7d8cff"],
      [2,15,"Resource","stat","K8S","InitialSpawnCount",1,17,[343],"#7d8cff"],
      [3,15,"Resource","stat","K8S","SpawnWeight",3,18,[344],"#7d8cff"],
      [4,15,"Resource","stat","K8S","ResourceInterval",5,19,[345],"#7d8cff"],
      [5,15,"Resource","stat","K8S","ResourceGoldBonus",5,20,[],"#7d8cff"],
      [-1,16,"Resource","lang","MSA","ResourceUnlock",1,17,[347],"#ff9f6b"],
      [-2,16,"Resource","stat","MSA","InitialSpawnCount",1,18,[348],"#ff9f6b"],
      [-3,16,"Resource","stat","MSA","SpawnWeight",3,19,[349],"#ff9f6b"],
      [-4,16,"Resource","stat","MSA","ResourceInterval",5,20,[350],"#ff9f6b"],
      [-5,16,"Resource","stat","MSA","ResourceGoldBonus",5,21,[],"#ff9f6b"],
      [0,19,"Resource","lang","MF","ResourceUnlock",1,19,[373,352],"#ff5fc8"],
      [0,20,"Resource","stat","MF","InitialSpawnCount",1,20,[353,356],"#ff5fc8"],
      [0,21,"Resource","stat","MF","SpawnWeight",3,21,[354,361],"#ff5fc8"],
      [0,22,"Resource","stat","MF","ResourceInterval",5,22,[355,366],"#ff5fc8"],
      [0,23,"Resource","stat","MF","ResourceGoldBonus",5,23,[],"#ff5fc8"],
      [1,20,"Resource","lang","COB","ResourceUnlock",1,21,[357],"#f0e6c8"],
      [2,20,"Resource","stat","COB","InitialSpawnCount",1,22,[358],"#f0e6c8"],
      [3,20,"Resource","stat","COB","SpawnWeight",3,23,[359],"#f0e6c8"],
      [4,20,"Resource","stat","COB","ResourceInterval",5,24,[360],"#f0e6c8"],
      [5,20,"Resource","stat","COB","ResourceGoldBonus",5,25,[],"#f0e6c8"],
      [-1,21,"Resource","lang","GOD","ResourceUnlock",1,22,[362],"#9fb4c8"],
      [-2,21,"Resource","stat","GOD","InitialSpawnCount",1,23,[363],"#9fb4c8"],
      [-3,21,"Resource","stat","GOD","SpawnWeight",3,24,[364],"#9fb4c8"],
      [-4,21,"Resource","stat","GOD","ResourceInterval",5,25,[365],"#9fb4c8"],
      [-5,21,"Resource","stat","GOD","ResourceGoldBonus",5,26,[],"#9fb4c8"],
      [1,22,"Resource","lang","SPG","ResourceUnlock",1,23,[367],"#e0c36a"],
      [2,22,"Resource","stat","SPG","InitialSpawnCount",1,24,[368],"#e0c36a"],
      [3,22,"Resource","stat","SPG","SpawnWeight",3,25,[369],"#e0c36a"],
      [4,22,"Resource","stat","SPG","ResourceInterval",5,26,[370],"#e0c36a"],
      [5,22,"Resource","stat","SPG","ResourceGoldBonus",5,27,[],"#e0c36a"],
      [0,6,"Resource","stat","MAP2","MapUnlock",4,6,[],"#fbb03b"],
      [0,12,"Resource","stat","MAP3","MapUnlock",4,12,[],"#bf9cfe"],
      [0,18,"Resource","stat","MAP4","MapUnlock",4,18,[],"#c9824f"]
    ]
  };
})(window);
