/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
// Renderer part: drawEdge
(function () {
  const ns = (window.SELAB = window.SELAB || {});
  ns.Editor = ns.Editor || {};
  ns.Editor.render = ns.Editor.render || {};

  function drawEdge(svg, app, connection) {
    // Annotation 엣지 디버깅
    const connectionKind = String(connection.kind || connection.type || '').toLowerCase();
    if (connectionKind === 'annotation') {
      console.log(`[drawEdge] 🔍 Annotation 엣지 렌더링 시작: ${connection.source} → ${connection.target}`);
    }
    
    const elems = (app && Array.isArray(app._visibleElements)) ? app._visibleElements : (app.model.elements || []);
    const allElems = (app && app.model && Array.isArray(app.model.elements)) ? app.model.elements : elems;
    
    // Annotation 엣지: 사용 가능한 노드 목록 출력
    if (connectionKind === 'annotation') {
      console.log(`[drawEdge] 🔍 사용 가능한 노드 목록 (${elems.length}개):`, elems.map(e => ({ id: e.id, name: e.name, type: e.type })));
    }
    const byIdOrNameVisible = (ref) => ns.Editor.utils.byIdOrName(elems, ref);
    const byIdOrNameAll = (ref) => ns.Editor.utils.byIdOrName(allElems, ref);
    const findBySuffix = (list, ref) => {
      const s = String(ref || '').trim();
      if (!s) return null;
      const lc = s.toLowerCase();
      const cand = list.find(e => String(e.name || '').toLowerCase() === lc);
      if (cand) return cand;
      return list.find(e => String(e.name || '').toLowerCase().endsWith('::' + lc)) || null;
    };

    const splitBase = (ref) => {
      const s = String(ref || '');
      if (!s) return s;
      const idxs = ['.', '[', '('].map(ch => s.indexOf(ch)).filter(i => i > 0);
      const cut = idxs.length ? Math.min(...idxs) : -1;
      return cut > 0 ? s.substring(0, cut) : s;
    };

    const byId = new Map((allElems || []).map(e => [e.id, e]));
    const byName = new Map((allElems || []).map(e => [e.name, e]));
    const isActionish = (e) => {
      const t = String(e?.type || '').toLowerCase();
      const role = String(e?.role || '').toLowerCase();
      const structuredKeywords = ['loop', 'ifaction', 'while', 'for', 'switch'];
      const isStructured = structuredKeywords.some((kw) => t.includes(kw)) || role === 'loop';
      return (t.includes('action') && !t.includes('definition')) || isStructured;
    };
    const activityAncestorId = (e) => {
      let cur = e;
      const guard = new Set();
      while (cur && !guard.has(cur.id)) {
        guard.add(cur.id);
        if (String(cur.diagramKind || '').toLowerCase() === 'activity') return cur.id;
        if (!cur.parent) break;
        cur = byId.get(cur.parent) || byName.get(String(cur.parent));
      }
      return null;
    };
    const matchingCandidates = (ref) => {
      const base = splitBase(ref);
      const lc = String(base || '').toLowerCase();
      const exact = elems.filter(e => e.id === ref || String(e.name || '').toLowerCase() === lc);
      const suffix = elems.filter(e => exact.indexOf(e) < 0 && String(e.name || '').toLowerCase().endsWith('::' + lc));
      return exact.concat(suffix);
    };
    const pickBestPair = (srcc, dstc) => {
      if (srcc.length === 0 && dstc.length === 0) return { s: null, d: null };
      if (srcc.length === 0) return { s: null, d: dstc[0] };
      if (dstc.length === 0) return { s: srcc[0], d: null };
      let best = null; let bestScore = -1;
      const baseS = String(splitBase(connection.source)).toLowerCase();
      const baseD = String(splitBase(connection.target)).toLowerCase();
      const kindLc = String(connection.kindClass || connection.kind || connection.type || '').toLowerCase();
      const isCtrl = kindLc.includes('control') || kindLc.includes('succession') || kindLc.includes('then');
      for (const s of srcc) {
        const sAct = activityAncestorId(s);
        for (const d of dstc) {
          const dAct = activityAncestorId(d);
          let score = 0;
          const sName = String(s.name || '').toLowerCase();
          const dName = String(d.name || '').toLowerCase();
          if (sName === baseS || sName.endsWith('::' + baseS)) score += 4;
          if (dName === baseD || dName.endsWith('::' + baseD)) score += 6;
          if (isActionish(s)) score += 1;
          if (isActionish(d)) score += 1;
          if (sAct && dAct && sAct === dAct) score += 2;
          const dRole = String(d.role || '').toLowerCase();
          if (isCtrl && (dRole === 'join' || dRole === 'fork' || dRole === 'final')) score += 3;
          if (score > bestScore) { bestScore = score; best = { s, d }; }
        }
      }
      // For control/succession edges, require a destination name match to avoid miswiring
      if (best && isCtrl) {
        const dName = String(best.d?.name || '').toLowerCase();
        if (!(dName === baseD || dName.endsWith('::' + baseD))) {
          return { s: best.s, d: null };
        }
      }
      return best || { s: srcc[0], d: dstc[0] };
    };

    const srcCand = matchingCandidates(connection.source);
    const dstCand = matchingCandidates(connection.target);
    
    // Annotation 엣지: 후보 노드 출력
    if (connectionKind === 'annotation') {
      console.log(`[drawEdge] 🔍 Source 후보 (${srcCand.length}개):`, srcCand.map(e => ({ id: e.id, name: e.name })));
      console.log(`[drawEdge] 🔍 Target 후보 (${dstCand.length}개):`, dstCand.map(e => ({ id: e.id, name: e.name })));
    }
    
    let chosen = pickBestPair(srcCand, dstCand);
    let src = chosen.s || byIdOrNameVisible(connection.source) || byIdOrNameVisible(splitBase(connection.source)) || findBySuffix(elems, splitBase(connection.source));
    let dst = chosen.d || byIdOrNameVisible(connection.target) || byIdOrNameVisible(splitBase(connection.target)) || findBySuffix(elems, splitBase(connection.target));
    
    // Annotation 엣지: 초기 찾기 결과
    if (connectionKind === 'annotation') {
      console.log(`[drawEdge] 🔍 초기 찾기 결과: src=${src ? src.id : 'null'}, dst=${dst ? dst.id : 'null'}`);
    }

    // 컨테이너를 끝점으로 선택한 경우, 내부의 액션 노드로 대체하여 정렬/라우팅 개선
    const childrenOf = (pid) => (allElems || []).filter(e => e.parent === pid);
    const preferChild = (node, refHint) => {
      if (!node) return node;
      // If the node itself is an action (including structured actions like If/Loop), use it directly
      if (isActionish(node)) return node;
      const kids = childrenOf(node.id);
      if (!kids || kids.length === 0) return node;
      const visibleSet = new Set((elems || []).map(e => e.id));
      const vkids = kids.filter(k => visibleSet.has(k.id));
      if (vkids.length === 0) return node;
      const base = String(splitBase(refHint) || '').toLowerCase();
      if (base) {
        const nameEq = vkids.find(k => String(k.name || '').toLowerCase() === base);
        if (nameEq) return nameEq;
        const suffix = vkids.find(k => String(k.name || '').toLowerCase().endsWith('::' + base));
        if (suffix) return suffix;
      }
      const actionKids = vkids.filter(isActionish);
      return (actionKids[0] || vkids[0] || node);
    };
    // 타입 참조 엣지 및 상속 관계 엣지는 컨테이너 본체를 가리켜야 하므로 preferChild를 건너뜀
    const kindLower = String(connection.kind || connection.type || '').toLowerCase();
    const isTypeReference = kindLower.includes('featuretyping') || kindLower.includes('typefeaturing') || kindLower.includes('composition') || kindLower.includes('inheritance') || kindLower.includes('specialization') || kindLower.includes('generalization');
    
    // Annotation 엣지는 preferChild 건너뛰기 (주석은 자식이 아닌 독립 노드)
    const isAnnotation = kindLower === 'annotation';
    
    if (!isTypeReference && !isAnnotation) {
        src = preferChild(src, connection.source);
        dst = preferChild(dst, connection.target);
    }
    
    // Annotation 엣지: preferChild 건너뜀 로그
    if (connectionKind === 'annotation') {
      console.log(`[drawEdge] 🔍 Annotation 엣지는 preferChild 건너뜀`);
    }

    // Fallback: if endpoint is hidden (e.g., occurrence/feature), climb to nearest visible ancestor
    const visibleIdSet = new Set((elems || []).map(e => e.id));
    const climbToVisible = (ref) => {
      let node = byIdOrNameAll(ref) || byIdOrNameAll(splitBase(ref)) || findBySuffix(allElems, splitBase(ref));
      const guard = new Set();
      while (node && !visibleIdSet.has(node.id) && !guard.has(node.id)) {
        guard.add(node.id);
        if (!node.parent) break;
        const p = byId.get(node.parent) || byName.get(String(node.parent));
        node = p || null;
      }
      return node && visibleIdSet.has(node.id) ? node : null;
    };
    const resolveParentByPath = (ref) => {
      if (!ref) return null;
      const parts = String(ref).split('::');
      while (parts.length > 1) {
        parts.pop();
        const candidateId = parts.join('::');
        const candidate = byId.get(candidateId);
        if (candidate) {
          if (visibleIdSet.has(candidate.id)) return candidate;
          const climbed = climbToVisible(candidate.id) || climbToVisible(candidate.name);
          return climbed || candidate;
        }
      }
      return null;
    };

    if (!src) src = climbToVisible(connection.source) || resolveParentByPath(connection.source);
    if (!dst) dst = climbToVisible(connection.target) || resolveParentByPath(connection.target);
    // If we climbed to a container, try to pick the intended child by name (타입 참조 엣지 및 annotation 엣지 제외)
    if (!isTypeReference && !isAnnotation) {
        src = preferChild(src, connection.source);
        dst = preferChild(dst, connection.target);
    }
    try {
      const sName = src?.name ?? src?.id;
      const dName = dst?.name ?? dst?.id;
      console.log(`[drawEdge] Drawing '${connection.kindClass || connection.kind || connection.type || ''}' from '${connection.source}' to '${connection.target}'. Resolved src='${sName}' dst='${dName}'`);
      
      // Annotation 엣지 상세 로그
      if (connectionKind === 'annotation') {
        console.log(`[drawEdge] 🔍 Annotation 노드 찾기 결과: src=${src ? 'FOUND' : 'NOT_FOUND'}, dst=${dst ? 'FOUND' : 'NOT_FOUND'}`);
        if (src) console.log(`[drawEdge] 🔍 Annotation src 노드:`, { id: src.id, name: src.name, type: src.type });
        if (dst) console.log(`[drawEdge] 🔍 Annotation dst 노드:`, { id: dst.id, name: dst.name, type: dst.type });
      }
    } catch {}
    const isBinding = kindLower.includes('binding');
    if (!src || !dst) {
      if (!isBinding) {
        if (connectionKind === 'annotation') {
          console.error(`[drawEdge] ❌ Annotation 엣지 렌더링 실패: src 또는 dst 노드를 찾을 수 없음`);
        }
        return;
      }
      src = src || resolveParentByPath(connection.source);
      dst = dst || resolveParentByPath(connection.target);
      if (!src || !dst) return;
    }
    // Port-aware anchors, fallback to centers
    let p1 = null; let p2 = null;
    const sourcePortRef = connection.sourcePort || connection.source;
    const targetPortRef = connection.targetPort || connection.target;
    if (src && sourcePortRef) p1 = ns.Editor.renderUtils.getPortPositionById(src, sourcePortRef);
    if (dst && targetPortRef) p2 = ns.Editor.renderUtils.getPortPositionById(dst, targetPortRef);
    const obstacles = (elems || []).filter(e => e && e.id !== src.id && e.id !== dst.id)
      .map(e => ({ x: Number(e.x), y: Number(e.y), w: Number(e.width), h: Number(e.height) }));
    // 선 스타일: 연결에 지정된 스타일이 우선 (활동 다이어그램 흐름은 기본적으로 직각 라우팅)
    const style = String(connection.style || (connection.sourcePort || connection.targetPort ? 'orthogonal' : 'straight')).toLowerCase();

    // ELK waypoints 사용 (있는 경우) 또는 자체 Pathfinding
    let d;
    // TODO: ELK waypoints 디버깅 중 - 임시로 비활성화
    const USE_ELK_WAYPOINTS = false;

    if (USE_ELK_WAYPOINTS && connection.waypoints && Array.isArray(connection.waypoints) && connection.waypoints.length >= 2) {
      // ELK waypoints를 SVG path 데이터로 변환
      const waypoints = connection.waypoints;
      const pathParts = [`M ${waypoints[0].x} ${waypoints[0].y}`];
      for (let i = 1; i < waypoints.length; i++) {
        pathParts.push(`L ${waypoints[i].x} ${waypoints[i].y}`);
      }
      d = pathParts.join(' ');
      console.log(`[drawEdge] ELK waypoints 사용: ${waypoints.length}개 점`, waypoints);
    } else {
      // 기존 pathfinding 사용
      d = ns.Editor.renderUtils.findPath(src, dst, style, { p1, p2, obstacles });
    }
    console.log('[drawEdge] Path data:', { 
      srcId: src.id, srcName: src.name, srcPos: {x: src.x, y: src.y, w: src.width, h: src.height},
      dstId: dst.id, dstName: dst.name, dstPos: {x: dst.x, y: dst.y, w: dst.width, h: dst.height},
      p1, p2, style, 
      pathD: d, 
      pathLength: d ? d.length : 0 
    });
    const path = ns.Editor.renderUtils.createSvgPath(d, 'diagram-connection', connection.id);
    // 활동 다이어그램 플로우에 클래스 부여 (Option A)
    if (connection.kindClass) {
      try { path.setAttribute('class', `diagram-connection act-edge ${String(connection.kindClass).toLowerCase()}`); } catch {}
    }

    const kind = String(connection.kind || connection.type || '');
    ns.Editor.renderUtils.applyConnectionMarker(path, kind);
    svg.appendChild(path);

    // Import/Expose 엣지에 자동으로 «import»/«expose» 라벨 추가
    let label = String(connection.label || '');
    const kindLowerForLabel = kind.toLowerCase();
    if (!label && (kindLowerForLabel.includes('import') || kindLowerForLabel.includes('expose'))) {
      console.log('[drawEdge] 🔍 Import/Expose 엣지 감지:', { kind, kindLowerForLabel, connection });
      if (kindLowerForLabel.includes('import')) {
        // Import 타입에 따라 라벨 설정
        if (kindLowerForLabel === 'membershipimport') {
          label = '«import»';
        } else if (kindLowerForLabel === 'namespaceimport') {
          label = '«import» *';
        } else {
          label = '«import»';
        }
        console.log('[drawEdge] ✅ Import 라벨 설정:', label);
      } else if (kindLowerForLabel.includes('expose')) {
        label = '«expose»';
        console.log('[drawEdge] ✅ Expose 라벨 설정:', label);
      }
    }
    if (label) {
        const { p1: finalP1, p2: finalP2 } = ns.Editor.renderUtils.getLastPoints(d);
        const tx = (finalP1.x + finalP2.x) / 2 + (connection.labelDx || 0);
        const ty = (finalP1.y + finalP2.y) / 2 + (connection.labelDy || 0);

        const kindLower = String(connection.kind || '').toLowerCase();
        const isSuccession = kindLower.includes('succession');
        const isAllocation = kindLower.includes('allocation');
        const needsBox = kindLower.includes('binding');

        const bindingYOffset = needsBox ? -6 : 0;
        let bindingBarsDrawn = false;
        if (needsBox) {
            const textWidth = ns.Editor.renderUtils.measureText(label, 'edge-label', {
                fontSize: '13px',
                fontWeight: 'bold'
            });
            const boxPaddingX = 8;
            const boxWidth = Math.max(18, textWidth + boxPaddingX);
            const boxHeight = 18;
            const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bgRect.setAttribute('x', tx - boxWidth / 2);
            bgRect.setAttribute('y', ty + bindingYOffset - boxHeight / 2);
            bgRect.setAttribute('width', boxWidth);
            bgRect.setAttribute('height', boxHeight);
            bgRect.setAttribute('fill', '#102235');
            bgRect.setAttribute('stroke', '#3498DB');
            bgRect.setAttribute('stroke-width', '1');
            bgRect.setAttribute('rx', '4');
            bgRect.setAttribute('data-id', connection.id);
            svg.appendChild(bgRect);

            const barWidth = Math.max(10, boxWidth - 10);
            const barHeight = 2;
            const barSpacing = 3;
            const barX = tx - barWidth / 2;
            const topBarY = ty + bindingYOffset - barHeight - barSpacing / 2;
            const bottomBarY = ty + bindingYOffset + barSpacing / 2;
            const createBar = (y) => {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', barX);
                rect.setAttribute('y', y);
                rect.setAttribute('width', barWidth);
                rect.setAttribute('height', barHeight);
                rect.setAttribute('fill', '#FFFFFF');
                rect.setAttribute('data-id', connection.id);
                rect.classList.add('edge-label-bar');
                svg.appendChild(rect);
            };
            createBar(topBarY);
            createBar(bottomBarY);
            bindingBarsDrawn = true;
        }

        const labelY = needsBox ? ty + bindingYOffset : (isSuccession || isAllocation) ? ty + 12 : ty - 10;
        const t = ns.Editor.renderUtils.createSvgText(tx, labelY, 'edge-label', bindingBarsDrawn ? '' : label);
        t.setAttribute('data-id', connection.id);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dominant-baseline', 'middle');
        t.style.fontSize = needsBox ? '13px' : (isSuccession || isAllocation) ? '12px' : '14px';
        t.style.fontWeight = needsBox ? 'bold' : (isSuccession || isAllocation) ? 'normal' : 'bold';
        if (bindingBarsDrawn) {
            t.style.fill = 'transparent';
            t.setAttribute('aria-label', 'binding equals');
        } else {
            t.style.fill = needsBox ? '#FFFFFF' : (isSuccession || isAllocation) ? '#FFFFFF' : '#3498DB';
        }
        svg.appendChild(t);
    }
  }

  ns.Editor.render.drawEdge = drawEdge;
})();
