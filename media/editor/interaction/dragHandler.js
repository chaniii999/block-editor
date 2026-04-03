/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 드래그 핸들러 - 노드 드래그 및 정렬 가이드
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.interaction = ns.Editor.interaction || {};

    // 드래그 상태
    let dragging = null; // { ids: string[], start:{x,y}, posById: Map }
    let draggingLabel = null; // { connId, start:{x,y}, dx0, dy0 }

    /**
     * 노드 드래그 시작
     * @param {Object} node - 드래그할 노드
     * @param {Object} app - 앱 인스턴스
     * @param {MouseEvent} ev - 마우스 이벤트
     */
    function startDrag(node, app, ev) {
        if (!node) return;
        
        // 드래그 시작 표시 (렌더러에서 무거운 재계산을 건너뛰도록 힌트)
        app.isDragging = true;
        
        const childrenOf = ns.Editor.utils.computeChildrenMap(app.model.elements);
        const pack = [node.id];
        
        // 자식 요소들도 함께 수집
        (function collect(id) {
            const kids = childrenOf.get(id) || [];
            for (const k of kids) {
                pack.push(k);
                collect(k);
            }
        })(node.id);
        
        const posById = new Map();
        for (const id of pack) {
            const n = app.model.elements.find((e) => e.id === id);
            if (n) posById.set(id, { x: n.x, y: n.y, name: n.name });
        }
        
        dragging = { ids: pack, start: { x: ev.clientX, y: ev.clientY }, posById };
    }

    /**
     * 드래그 중 처리
     * @param {MouseEvent} ev - 마우스 이벤트
     * @param {Object} app - 앱 인스턴스
     * @returns {boolean} 드래그 처리 여부
     */
    function handleDragMove(ev, app) {
        if (!dragging) return false;
        
        const dx = ev.clientX - dragging.start.x;
        const dy = ev.clientY - dragging.start.y;
        
        for (const id of dragging.ids) {
            const pos = dragging.posById.get(id);
            const n = app.model.elements.find((e) => e.id === id);
            if (pos && n) {
                const scale = Math.max(0.0001, app?.viewport?.scale || 1);
                let nx = pos.x + dx / scale;
                let ny = pos.y + dy / scale;
                
                // 스냅 적용
                if (app.settings.snap) {
                    nx = Math.round(nx / app.settings.grid) * app.settings.grid;
                    ny = Math.round(ny / app.settings.grid) * app.settings.grid;
                }
                
                n.x = nx;
                n.y = ny;
            }
        }
        
        // 정렬 가이드 그리기
        drawAlignGuides(app, dragging.ids.map((id) => app.model.elements.find((e) => e.id === id)).filter(Boolean));
        
        return true;
    }

    /**
     * 드래그 종료
     * @param {Object} app - 앱 인스턴스
     * @returns {boolean} 드래그가 있었는지 여부
     */
    function endDrag(app) {
        const hadDragging = !!dragging;
        dragging = null;
        app.isDragging = false;
        clearGuides();
        return hadDragging;
    }

    /**
     * 드래그 중인지 확인
     * @returns {boolean} 드래그 중 여부
     */
    function isDragging() {
        return !!dragging;
    }

    /**
     * 엣지 라벨 드래그 시작
     * @param {Object} app - 앱 인스턴스
     * @param {SVGElement} label - 라벨 요소
     * @param {MouseEvent} ev - 마우스 이벤트
     */
    function startDragEdgeLabel(app, label, ev) {
        const id = label.getAttribute('data-id');
        const c = (app.model.connections || []).find((x) => String(x.id) === String(id));
        if (!c) return;
        
        draggingLabel = {
            connId: c.id,
            start: { x: ev.clientX, y: ev.clientY },
            dx0: Number(c.labelDx || 0),
            dy0: Number(c.labelDy || -6)
        };
        
        ev.preventDefault();
        ev.stopPropagation();
    }

    /**
     * 엣지 라벨 드래그 중 처리
     * @param {MouseEvent} ev - 마우스 이벤트
     * @param {Object} app - 앱 인스턴스
     * @returns {boolean} 라벨 드래그 처리 여부
     */
    function handleLabelDragMove(ev, app) {
        if (!draggingLabel) return false;
        
        const c = (app.model.connections || []).find((x) => String(x.id) === String(draggingLabel.connId));
        if (c) {
            const scale = Math.max(0.0001, app?.viewport?.scale || 1);
            c.labelDx = draggingLabel.dx0 + (ev.clientX - draggingLabel.start.x) / scale;
            c.labelDy = draggingLabel.dy0 + (ev.clientY - draggingLabel.start.y) / scale;
        }
        
        return true;
    }

    /**
     * 엣지 라벨 드래그 종료
     * @returns {boolean} 라벨 드래그가 있었는지 여부
     */
    function endLabelDrag() {
        const hadLabelDrag = !!draggingLabel;
        draggingLabel = null;
        return hadLabelDrag;
    }

    /**
     * 라벨 드래그 중인지 확인
     * @returns {boolean} 라벨 드래그 중 여부
     */
    function isLabelDragging() {
        return !!draggingLabel;
    }

    // ========== 정렬 가이드 ==========

    /**
     * 오버레이 요소 확보
     * @param {SVGElement} svg - SVG 요소
     * @returns {SVGElement} 오버레이 그룹
     */
    function ensureOverlay(svg) {
        const viewport = svg.querySelector('#viewport') || svg;
        let overlay = viewport.querySelector('#overlay');
        if (!overlay) {
            overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            overlay.setAttribute('id', 'overlay');
            overlay.style.pointerEvents = 'none';
            viewport.appendChild(overlay);
        }
        return overlay;
    }

    /**
     * 정렬 가이드 그리기
     * @param {Object} app - 앱 인스턴스
     * @param {Array} nodes - 드래그 중인 노드들
     */
    function drawAlignGuides(app, nodes) {
        const svg = app?.dom?.svg || document.getElementById('diagramSvg');
        const overlay = ensureOverlay(svg);
        
        // 이전 가이드 제거
        overlay.querySelectorAll('.align-guide').forEach((el) => el.remove());
        
        if (!nodes || nodes.length === 0) return;
        if (!app?.settings?.guides) return;
        
        // 가이드 계산 쓰로틀링
        const now = Date.now();
        if (app._lastGuideAt && now - app._lastGuideAt < (app.settings.guidesThrottleMs || 80)) return;
        app._lastGuideAt = now;

        const all = app.model.elements || [];
        let others = all.filter((e) => !nodes.some((n) => n.id === e.id));
        
        // 요소가 너무 많으면 샘플링
        const maxOthers = Math.max(10, Number(app?.settings?.guidesMaxOthers || 200));
        if (others.length > maxOthers) {
            const stride = Math.ceil(others.length / maxOthers);
            others = others.filter((_, i) => i % stride === 0);
        }
        
        const thr = 5;
        for (const n of nodes) {
            const cx = n.x + n.width / 2;
            const cy = n.y + n.height / 2;
            for (const o of others) {
                const ocx = o.x + o.width / 2;
                const ocy = o.y + o.height / 2;
                if (Math.abs(cx - ocx) <= thr) addVGuide(overlay, ocx);
                if (Math.abs(cy - ocy) <= thr) addHGuide(overlay, ocy);
            }
        }
    }

    /**
     * 수직 가이드 추가
     */
    function addVGuide(overlay, x) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', x);
        line.setAttribute('y2', 9999);
        line.setAttribute('class', 'align-guide');
        overlay.appendChild(line);
    }

    /**
     * 수평 가이드 추가
     */
    function addHGuide(overlay, y) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', 0);
        line.setAttribute('y1', y);
        line.setAttribute('x2', 9999);
        line.setAttribute('y2', y);
        line.setAttribute('class', 'align-guide');
        overlay.appendChild(line);
    }

    /**
     * 모든 가이드 제거
     */
    function clearGuides() {
        document.querySelectorAll('#overlay .align-guide').forEach((el) => el.remove());
    }

    // 모듈 내보내기
    ns.Editor.interaction.dragHandler = {
        startDrag,
        handleDragMove,
        endDrag,
        isDragging,
        startDragEdgeLabel,
        handleLabelDragMove,
        endLabelDrag,
        isLabelDragging,
        drawAlignGuides,
        clearGuides,
        ensureOverlay,
    };
})();
