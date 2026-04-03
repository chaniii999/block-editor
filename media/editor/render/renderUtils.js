/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
// Render utilities: reusable functions for SVG rendering
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.renderUtils = ns.Editor.renderUtils || {};
    const EMPTY_DIAGRAM_MESSAGE = 'No SysML elements found. Add some elements to see the diagram.';

    function createMarkerDefinitions() {
        console.log('[createMarkerDefinitions] Creating SVG marker definitions...');
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon class="arrowhead" points="0 0, 10 3.5, 0 7" />
      </marker>
      <marker id="open-triangle" markerWidth="12" markerHeight="10" refX="12" refY="5" orient="auto">
        <path d="M 0 0 L 12 5 L 0 10 Z" fill="none" stroke="var(--vscode-foreground)" stroke-width="1.5" />
      </marker>
      <marker id="diamond" markerWidth="9.6" markerHeight="9.6" refX="9.6" refY="4.8" orient="auto">
        <path d="M 0 4.8 L 4.8 0 L 9.6 4.8 L 4.8 9.6 Z" fill="var(--vscode-foreground)" />
      </marker>
      <marker id="small-arrowhead" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
        <polygon class="arrowhead" points="0 0, 6 3, 0 6" />
      </marker>
      <marker id="arrow-open" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <path d="M 0 0 L 10 3.5 L 0 7" fill="none" stroke="currentColor" stroke-width="1.5" />
      </marker>
      <marker id="filled-dot" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <circle cx="4" cy="4" r="3" fill="currentColor" />
      </marker>
      <marker id="tilde-marker" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
        <path d="M 2 5 Q 4 2, 6 5 Q 8 8, 10 5" fill="none" stroke="currentColor" stroke-width="1.5" />
      </marker>
      <marker id="closed-arrow-with-dots" markerWidth="18" markerHeight="14" refX="15" refY="7" orient="auto">
        <path d="M 5 0 L 17 7 L 5 14 Z" fill="none" stroke="var(--vscode-foreground)" stroke-width="1.5" />
        <circle cx="1.5" cy="5" r="1.2" fill="var(--vscode-foreground)" />
        <circle cx="1.5" cy="9" r="1.2" fill="var(--vscode-foreground)" />
      </marker>
      <marker id="colon-marker" markerWidth="20" markerHeight="14" refX="18" refY="7" orient="auto">
        <path d="M 8 0 L 20 7 L 8 14 Z" fill="none" stroke="var(--vscode-foreground)" stroke-width="1.5" />
        <text x="2" y="10" font-size="12" font-weight="bold" fill="var(--vscode-foreground)">:</text>
      </marker>
    `;
        console.log('[createMarkerDefinitions] ✅ Created 9 markers: arrowhead, open-triangle, diamond, small-arrowhead, arrow-open, filled-dot, tilde-marker, closed-arrow-with-dots, colon-marker');
        return defs;
    }

    function createViewportGroup(viewport = { x: 0, y: 0, scale: 1 }) {
        const viewportGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        viewportGroup.setAttribute('id', 'viewport');
        viewportGroup.setAttribute('transform', `translate(${viewport.x},${viewport.y}) scale(${viewport.scale})`);
        return viewportGroup;
    }

    function createEmptyDiagramMessage() {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '50%');
        text.setAttribute('y', '50%');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('class', 'diagram-text');
        text.style.fontSize = '16px';
        text.style.fill = 'var(--vscode-descriptionForeground)';
        text.textContent = EMPTY_DIAGRAM_MESSAGE;
        return text;
    }

    function getEmptyDiagramMessageText() {
        return EMPTY_DIAGRAM_MESSAGE;
    }

    function createSvgText(x, y, className, content, options = {}) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(x));
        text.setAttribute('y', String(y));
        text.setAttribute('class', className);
        text.textContent = String(content);
        if (options.role) text.setAttribute('data-role', options.role);
        if (options.fontWeight) text.style.fontWeight = options.fontWeight;
        if (options.textAnchor) {
            // Inline style beats class CSS in specificity
            try {
                text.style.setProperty('text-anchor', String(options.textAnchor));
            } catch {}
            text.setAttribute('text-anchor', String(options.textAnchor));
        }
        if (options.dominantBaseline) {
            try {
                text.style.setProperty('dominant-baseline', String(options.dominantBaseline));
            } catch {}
            text.setAttribute('dominant-baseline', String(options.dominantBaseline));
        }
        if (options.dataCompIndex !== undefined) text.setAttribute('data-comp-index', String(options.dataCompIndex));
        if (options.dataItemIndex !== undefined) text.setAttribute('data-item-index', String(options.dataItemIndex));
        return text;
    }

    function createSvgRect(x, y, width, height, className) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', String(y));
        rect.setAttribute('width', String(width));
        rect.setAttribute('height', String(height));
        if (className) rect.setAttribute('class', className);
        return rect;
    }

    function createSvgLine(x1, y1, x2, y2, className) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(x1));
        line.setAttribute('y1', String(y1));
        line.setAttribute('x2', String(x2));
        line.setAttribute('y2', String(y2));
        if (className) line.setAttribute('class', className);
        return line;
    }

    function createSvgCircle(cx, cy, r, className, portId = '') {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r', String(r));
        if (className) circle.setAttribute('class', className);
        if (portId) circle.setAttribute('data-port-id', String(portId));
        return circle;
    }

    function createSvgPath(d, className, id = '') {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        if (className) path.setAttribute('class', className);
        if (id) path.setAttribute('data-id', id);
        console.log('[createSvgPath] Created path:', { className, id, hasD: !!d });
        return path;
    }

    function createToggleElement(x, y, glyph, onClick, options = {}) {
        const hit = createSvgRect(x - 6, y - 10, 20, 16, 'comp-toggle');
        hit.setAttribute('fill', 'transparent');
        hit.setAttribute('stroke', 'none');
        const toggle = createSvgText(x, y, 'comp-toggle', glyph);
        if (options.compIndex !== undefined) {
            hit.setAttribute('data-comp-index', String(options.compIndex));
            toggle.setAttribute('data-comp-index', String(options.compIndex));
        }
        const handleClick = (ev) => {
            try {
                onClick();
            } catch (e) {
                console.error('[renderUtils] Toggle click error:', e);
            }
            ev.stopPropagation();
            ev.preventDefault();
        };
        hit.addEventListener('click', handleClick);
        toggle.addEventListener('click', handleClick);
        return [hit, toggle];
    }

    function calculatePortPosition(element, port) {
        const side = (port.side || 'E').toUpperCase();
        const offset = Math.max(0, Math.min(1, Number(port.offset || 0.5)));
        const x = Number(element.x);
        const y = Number(element.y);
        const w = Number(element.width);
        const h = Number(element.height);
        switch (side) {
            case 'N':
                return { x: x + w * offset, y: y };
            case 'S':
                return { x: x + w * offset, y: y + h };
            case 'W':
                return { x: x, y: y + h * offset };
            case 'E':
            default:
                return { x: x + w, y: y + h * offset };
        }
    }

    // Helpers for border-node-aware anchors (ports and items)
    function getPortPositionById(element, portId) {
        if (!element || !portId) return null;
        // borderNodes 배열 우선 확인 (ports는 이제 borderNodes로 통합됨)
        const borderNodes = Array.isArray(element.borderNodes) ? element.borderNodes : [];
        const bn = borderNodes.find((node) => String(node.id || node.name || '') === String(portId));
        if (bn) return calculatePortPosition(element, bn);
        
        // 하위 호환성: 레거시 ports 배열도 확인
        const ports = Array.isArray(element.ports) ? element.ports : [];
        const p = ports.find((pt) => String(pt.id || pt.name || '') === String(portId));
        if (p) return calculatePortPosition(element, p);
        
        return null;
    }

    function getElementCenter(el) {
        return { x: Number(el.x) + Number(el.width) / 2, y: Number(el.y) + Number(el.height) / 2 };
    }

    function segmentIntersectsRect(x1, y1, x2, y2, rect) {
        // Axis-aligned segments only expected for orthogonal routing
        const min = (a, b) => (a < b ? a : b);
        const max = (a, b) => (a > b ? a : b);
        if (y1 === y2) {
            const y = y1;
            if (y < rect.y || y > rect.y + rect.h) return false;
            const r1 = min(x1, x2),
                r2 = max(x1, x2);
            const s1 = rect.x,
                s2 = rect.x + rect.w;
            return !(r2 < s1 || r1 > s2);
        }
        if (x1 === x2) {
            const x = x1;
            if (x < rect.x || x > rect.x + rect.w) return false;
            const r1 = min(y1, y2),
                r2 = max(y1, y2);
            const s1 = rect.y,
                s2 = rect.y + rect.h;
            return !(r2 < s1 || r1 > s2);
        }
        return false;
    }

    function avoidObstaclesPolyline(points, obstacles) {
        if (!Array.isArray(obstacles) || obstacles.length === 0) return points;
        const safe = [];
        for (let i = 0; i < points.length - 1; i++) {
            let a = points[i];
            let b = points[i + 1];
            let hit = obstacles.find((r) => segmentIntersectsRect(a.x, a.y, b.x, b.y, r));
            if (!hit) {
                safe.push(a);
                continue;
            }
            // Detour: offset around the nearest side of the rectangle by margin
            const margin = 10;
            if (a.y === b.y) {
                // horizontal -> go above or below
                const above = hit.y - margin;
                const below = hit.y + hit.h + margin;
                const chooseY = Math.abs(a.y - above) < Math.abs(a.y - below) ? above : below;
                const k1 = { x: a.x, y: chooseY };
                const k2 = { x: b.x, y: chooseY };
                safe.push(a, k1, k2);
                a = k2;
            } else {
                // vertical -> go left or right
                const left = hit.x - margin;
                const right = hit.x + hit.w + margin;
                const chooseX = Math.abs(a.x - left) < Math.abs(a.x - right) ? left : right;
                const k1 = { x: chooseX, y: a.y };
                const k2 = { x: chooseX, y: b.y };
                safe.push(a, k1, k2);
                a = k2;
            }
            // next iteration will push final segment from adjusted a to b
            if (i === points.length - 2) safe.push(b);
        }
        if (safe.length === 0) return points;
        // Deduplicate consecutive identical points
        const dedup = [safe[0]];
        for (let i = 1; i < safe.length; i++) {
            const p = safe[i];
            const q = dedup[dedup.length - 1];
            if (!q || q.x !== p.x || q.y !== p.y) dedup.push(p);
        }
        return dedup;
    }

    function polylineToPath(points) {
        if (!points || points.length === 0) return '';
        const parts = [`M ${points[0].x} ${points[0].y}`];
        for (let i = 1; i < points.length; i++) parts.push(`L ${points[i].x} ${points[i].y}`);
        return parts.join(' ');
    }

    function generateConnectionPath(p1, p2, style = 'straight', opts = {}) {
        console.log('[generateConnectionPath] Input:', { p1, p2, style });
        const s = String(style).toLowerCase();
        if (s === 'curved') {
            const cx = (p1.x + p2.x) / 2;
            const cy = (p1.y + p2.y) / 2;
            const path = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
            console.log('[generateConnectionPath] Curved path:', path);
            return path;
        } else if (s === 'orthogonal' || s === 'right-angled') {
            const midX = (p1.x + p2.x) / 2;
            const raw = [
                { x: p1.x, y: p1.y },
                { x: midX, y: p1.y },
                { x: midX, y: p2.y },
                { x: p2.x, y: p2.y },
            ];
            const obstacles = Array.isArray(opts.obstacles) ? opts.obstacles : [];
            const routed = avoidObstaclesPolyline(raw, obstacles);
            const path = polylineToPath(routed);
            console.log('[generateConnectionPath] Orthogonal path:', path);
            return path;
        }
        const path = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
        console.log('[generateConnectionPath] Straight path:', path);
        return path;
    }

    function applyConnectionMarker(path, kind) {
        const k = String(kind).toLowerCase();
        console.log('[applyConnectionMarker] kind:', kind, '→ lowercase:', k);

        // Annotation: 점선 + 화살표 없음
        if (k.includes('annotation')) {
            console.log('[applyConnectionMarker] ✅ Applying ANNOTATION style (dashed line, no arrow)');
            path.style.strokeDasharray = '6 4';
            path.removeAttribute('marker-end');
            path.classList.add('annotation-edge');
        }
        // Dependency: 점선 + 화살표
        else if (k.includes('dependency')) {
            console.log('[applyConnectionMarker] ✅ Applying DEPENDENCY style (dashed line)');
            path.style.strokeDasharray = '6 4';
            path.setAttribute('marker-end', 'url(#arrowhead)');
        }
        // FeatureTyping: 실선 + 빈 삼각형+콜론(:) (SysML v2 표준: 정의됨 관계)
        else if (k.includes('featuretyping')) {
            console.log('[applyConnectionMarker] ✅ Applying FEATURETYPING style (solid line, open triangle with colon)');
            path.style.strokeDasharray = '';
            path.setAttribute('marker-end', 'url(#colon-marker)');
            path.classList.add('featuretyping-edge');
        }
        // TypeFeaturing: 실선 + 화살표 없음 (specialization 그룹보다 먼저 체크)
        else if (k.includes('typefeaturing')) {
            console.log('[applyConnectionMarker] ✅ Applying TYPEFEATURING style (solid line, no arrow)');
            path.style.strokeDasharray = '';
            path.removeAttribute('marker-end');
            path.classList.add('typefeaturing-edge');
        }
        // Import/Expose: 점선 + 열린 화살표
        else if (k.includes('import') || k.includes('expose')) {
            console.log('[applyConnectionMarker] ✅ Applying IMPORT/EXPOSE style (dashed line, open arrow)');
            path.style.strokeDasharray = '6 4';
            path.setAttribute('marker-end', 'url(#arrowhead)');
            if (k.includes('import')) path.classList.add('import-edge');
            else path.classList.add('expose-edge');
        }
        // Specialization 계열: 실선 + 빈 삼각형 (featuretyping, typefeaturing 제외)
        else if (k.includes('specialization') || k.includes('generalization') || k.includes('inheritance') || k.includes('redefinition') || k.includes('subsetting')) {
            console.log('[applyConnectionMarker] ✅ Applying SPECIALIZATION style (open triangle)');
            path.setAttribute('marker-end', 'url(#open-triangle)');
        }
        // Conjugation: 물결선 + 물결 마커
        else if (k.includes('conjugation')) {
            console.log('[applyConnectionMarker] ✅ Applying CONJUGATION style (wavy line)');
            path.style.strokeDasharray = '8 4 2 4';
            path.setAttribute('marker-end', 'url(#tilde-marker)');
            path.classList.add('conjugation-edge');
        }
        // Disjoining: 이중선 + 빈 삼각형
        else if (k.includes('disjoining')) {
            console.log('[applyConnectionMarker] ✅ Applying DISJOINING style (double line)');
            path.classList.add('disjoining-edge');
            path.setAttribute('marker-end', 'url(#open-triangle)');
        }
        // Binding: 실선 + 양쪽 끝 작은 원 (filled dot)
        else if (k.includes('binding')) {
            console.log('[applyConnectionMarker] ✅ Applying BINDING style (filled dots both ends)');
            path.style.strokeDasharray = ''; // 실선
            path.style.stroke = '#3498DB'; // 파란색
            path.setAttribute('marker-start', 'url(#filled-dot)');
            path.setAttribute('marker-end', 'url(#filled-dot)');
            path.classList.add('binding-edge');
        }
        // Composition: 다이아몬드 마커
        else if (k.includes('composition')) {
            console.log('[applyConnectionMarker] ✅ Applying COMPOSITION style (diamond)');
            path.setAttribute('marker-end', 'url(#diamond)');
        }
        // Allocation: 실선 + 보라색 + 열린 화살표 (SysON 스타일)
        else if (k.includes('allocation') || k.includes('allocate')) {
            console.log('[applyConnectionMarker] ✅ Applying ALLOCATION style (solid purple)');
            path.style.strokeDasharray = ''; // 실선
            path.style.stroke = '#9370DB';
            path.setAttribute('marker-end', 'url(#arrow-open)');
            path.classList.add('allocation-edge');
        }
        // Succession Flow: 실선 + 채워진 삼각형 (SysML v2 표준)
        else if (k.includes('succession-flow') || k.includes('succession-item-flow')) {
            console.log('[applyConnectionMarker] ✅ Applying SUCCESSION-FLOW style (solid line with filled triangle)');
            path.style.strokeDasharray = ''; // 실선
            path.setAttribute('marker-end', 'url(#arrowhead)'); // 채워진 삼각형
            path.classList.add('succession-flow-edge');
        }
        // Succession: 점선 + 열린 화살표 (SySON 스타일)
        else if (k.includes('succession')) {
            console.log('[applyConnectionMarker] ✅ Applying SUCCESSION style (dashed open arrow)');
            path.style.strokeDasharray = '6 4';
            path.setAttribute('marker-end', 'url(#arrow-open)');
            path.classList.add('succession-edge');
        }
        // Transition: StateUsage 간은 실선, ActionUsage 간은 점선 (SySON 스타일)
        else if (k.includes('transition')) {
            console.error('[applyConnectionMarker] 🎯 TRANSITION 감지! kind=' + kind);
            console.error('[applyConnectionMarker] ✅ Applying TRANSITION style (solid line)');
            path.style.stroke = '#FF0000'; // 디버그: 빨간색으로 변경
            path.style.strokeWidth = '3px'; // 디버그: 굵게
            path.style.setProperty('stroke-dasharray', 'none', 'important'); // 강제로 실선
            path.setAttribute('marker-end', 'url(#arrow-open)');
            path.classList.add('transition-edge');
        }
        // ControlFlow: 점선 + 화살표
        else if (k.includes('controlflow')) {
            console.log('[applyConnectionMarker] ✅ Applying CONTROLFLOW style (dashed orange)');
            path.style.strokeDasharray = '6 4';
            path.setAttribute('marker-end', 'url(#arrowhead)');
            path.classList.add('controlflow-edge');
        }
        // Connection: 실선 + 마커 없음 (SysML v2 표준: 양쪽 끝 아무 표시 없음)
        // flow보다 먼저 체크해야 FlowConnectionUsage가 아닌 일반 ConnectionUsage가 올바르게 처리됨
        else if (k === 'connection') {
            console.log('[applyConnectionMarker] ✅ Applying CONNECTION style (solid line, no markers)');
            path.style.strokeDasharray = ''; // 실선
            path.removeAttribute('marker-start'); // 시작 마커 없음
            path.removeAttribute('marker-end'); // 끝 마커 없음
            path.classList.add('connection-edge');
        }
        // Flow: 실선 + 화살표
        else if (k.includes('flow') && !k.includes('controlflow')) {
            console.log('[applyConnectionMarker] ✅ Applying FLOW style (green arrow)');
            path.setAttribute('marker-end', 'url(#arrowhead)');
            path.classList.add('flow-edge');
        }
        // 기본: 화살표
        else {
            console.log('[applyConnectionMarker] ⚠️ Applying DEFAULT style (basic arrow) - kind not matched');
            path.setAttribute('marker-end', 'url(#arrowhead)');
        }
    }

    function getElementChildIds(element, childrenOf, allElements = []) {
        const a = childrenOf.get(element.id) || [];
        const b = childrenOf.get(element.name) || [];
        const prefix = String(element.name || '') + '::';
        let c = [];
        try {
            c = allElements.filter((e) => e && e.id !== element.id && typeof e.name === 'string' && e.name.startsWith(prefix)).map((e) => e.id);
        } catch (e) {
            console.error('[renderUtils] Error in namespace-based child lookup:', e);
        }
        return Array.from(new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : []), ...c]));
    }

    function renderTextLines(parent, lines, startX, startY, lineHeight, className, options = {}) {
        let currentY = startY;
        for (const line of lines) {
            if (line && String(line).trim()) {
                const text = createSvgText(startX, currentY, className, line, options);
                parent.appendChild(text);
                currentY += lineHeight;
            }
        }
        return currentY;
    }

    function measureText(text, className, options = {}) {
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.style.position = 'absolute';
        tempSvg.style.visibility = 'hidden';
        document.body.appendChild(tempSvg);
        const svgText = createSvgText(0, 0, className, text, options);
        tempSvg.appendChild(svgText);
        const width = svgText.getBBox().width;
        document.body.removeChild(tempSvg);
        return width;
    }

    function findPath(src, dst, style, opts = {}) {
        let p1 = opts.p1,
            p2 = opts.p2;
        if (!p1 || !p2) {
            const [boundaryP1, boundaryP2] = getBoundaryPoints(src, dst);
            if (!p1) p1 = boundaryP1;
            if (!p2) p2 = boundaryP2;
        }
        console.log('[findPath] Points:', { p1, p2, style });
        const path = generateConnectionPath(p1, p2, style, opts);
        console.log('[findPath] Generated path:', path);
        return path;
    }

    function getBoundaryPoints(el1, el2) {
        // 두 노드의 중심을 계산
        const c1 = getElementCenter(el1);
        const c2 = getElementCenter(el2);

        // 각 노드의 가장 가까운 변의 중심점에서 연결선 시작/끝
        return [getNearestEdgeCenter(el1, c2), getNearestEdgeCenter(el2, c1)];
    }

    /**
     * 대상 점(targetPoint)에 가장 가까운 노드 변의 중심점을 반환
     * @param {Object} rect - 노드 (x, y, width, height)
     * @param {Object} targetPoint - 대상 점 {x, y}
     * @returns {Object} 가장 가까운 변의 중심점 {x, y}
     */
    function getNearestEdgeCenter(rect, targetPoint) {
        const { x, y, width, height } = rect;
        const cx = x + width / 2;
        const cy = y + height / 2;

        // 네 변의 중심점
        const edges = {
            top: { x: cx, y: y },
            bottom: { x: cx, y: y + height },
            left: { x: x, y: cy },
            right: { x: x + width, y: cy }
        };

        // 대상 점과 각 변 중심점 사이의 거리 계산
        let minDist = Infinity;
        let nearest = edges.right; // 기본값: 오른쪽

        for (const [side, point] of Object.entries(edges)) {
            const dist = Math.sqrt(
                Math.pow(point.x - targetPoint.x, 2) +
                Math.pow(point.y - targetPoint.y, 2)
            );
            if (dist < minDist) {
                minDist = dist;
                nearest = point;
            }
        }

        return nearest;
    }

    function getRectIntersection(p1, p2, rect) {
        const { x, y, width, height } = rect;
        const right = x + width;
        const bottom = y + height;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        if (dx === 0 && dy === 0) return p1;

        const t = [
            (x - p1.x) / dx, // left
            (right - p1.x) / dx, // right
            (y - p1.y) / dy, // top
            (bottom - p1.y) / dy, // bottom
        ];

        const validT = t.filter((val) => val >= 0 && val <= 1);
        if (validT.length === 0) return p1;

        const minT = Math.min(...validT);
        return { x: p1.x + minT * dx, y: p1.y + minT * dy };
    }

    function getLastPoints(d) {
        const parts = d.trim().split(/[\s,]+/);
        const last = parts.slice(-2).map(Number);
        const first = parts.slice(1, 3).map(Number);
        return { p1: { x: first[0], y: first[1] }, p2: { x: last[0], y: last[1] } };
    }

    ns.Editor.renderUtils = {
        createMarkerDefinitions,
        createViewportGroup,
        createEmptyDiagramMessage,
        getEmptyDiagramMessageText,
        createSvgText,
        createSvgRect,
        createSvgLine,
        createSvgCircle,
        createSvgPath,
        createToggleElement,
        calculatePortPosition,
        getPortPositionById,
        getElementCenter,
        generateConnectionPath,
        applyConnectionMarker,
        getElementChildIds,
        renderTextLines,
        measureText,
        findPath,
        getLastPoints,
    };
})();
