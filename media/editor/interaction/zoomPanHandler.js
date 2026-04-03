/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 줌/팬 핸들러 - 뷰포트 확대/축소 및 이동
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.interaction = ns.Editor.interaction || {};

    // 팬 상태
    let panning = null; // { start:{x,y}, v0:{x,y} }

    /**
     * 휠 이벤트 처리 - 줌
     * @param {WheelEvent} ev - 휠 이벤트
     * @param {Object} app - 앱 인스턴스
     */
    function handleWheel(ev, app) {
        ev.preventDefault();
        
        const svg = app?.dom?.svg || document.getElementById('diagramSvg');
        const viewport = svg?.querySelector('#viewport');
        if (!viewport) return;
        
        const delta = Math.sign(ev.deltaY) * -0.1; // wheel up zoom in
        const newScale = Math.max(0.2, Math.min(3, (app.viewport.scale || 1) * (1 + delta)));
        
        const pt = { x: ev.clientX, y: ev.clientY };
        const rect = svg.getBoundingClientRect();
        const cx = (pt.x - rect.left - app.viewport.x) / (app.viewport.scale || 1);
        const cy = (pt.y - rect.top - app.viewport.y) / (app.viewport.scale || 1);
        
        app.viewport.x = pt.x - rect.left - cx * newScale;
        app.viewport.y = pt.y - rect.top - cy * newScale;
        app.viewport.scale = newScale;
        
        // 뷰포트 변환만 업데이트 (전체 리드로우 없이)
        updateViewportTransform(app);
    }

    /**
     * 팬 시작
     * @param {MouseEvent} ev - 마우스 이벤트
     * @param {Object} app - 앱 인스턴스
     * @returns {boolean} 팬 시작 여부
     */
    function startPan(ev, app) {
        const isLeft = ev.button === 0;
        
        const onElement = ev.target.closest && (
            ev.target.closest('.diagram-element') ||
            ev.target.closest('.diagram-port') ||
            ev.target.closest('.diagram-connection') ||
            findInEventPath(ev, 'comp-toggle')
        );
        
        // 노드가 선택된 상태에서 요소 위를 끌면 패닝 차단 (노드 드래그 우선)
        const interaction = ns.Editor.interaction;
        const hasSelection = interaction?.selectionManager?.hasSelection?.();
        if (hasSelection && onElement) {
            return false;
        }
        
        // 배경 좌클릭 드래그만 패닝 허용
        const isBackgroundLeft = isLeft && !ev.shiftKey && !onElement;
        const isToolbarPan = isLeft && !!(app && app._panToolActive);
        
        if (!(isBackgroundLeft || isToolbarPan)) return false;
        
        panning = {
            start: { x: ev.clientX, y: ev.clientY },
            v0: { x: app.viewport.x, y: app.viewport.y }
        };
        
        ev.preventDefault();
        return true;
    }

    /**
     * 팬 중 처리
     * @param {MouseEvent} ev - 마우스 이벤트
     * @param {Object} app - 앱 인스턴스
     * @returns {boolean} 팬 처리 여부
     */
    function handlePanMove(ev, app) {
        if (!panning) return false;
        
        const dx = ev.clientX - panning.start.x;
        const dy = ev.clientY - panning.start.y;
        
        app.viewport.x = panning.v0.x + dx;
        app.viewport.y = panning.v0.y + dy;
        
        // 뷰포트 변환만 업데이트 (전체 리드로우 없이)
        updateViewportTransform(app);
        
        return true;
    }

    /**
     * 팬 종료
     */
    function endPan() {
        panning = null;
    }

    /**
     * 팬 중인지 확인
     * @returns {boolean} 팬 중 여부
     */
    function isPanning() {
        return !!panning;
    }

    /**
     * 뷰포트 변환 업데이트 (전체 리드로우 없이)
     * @param {Object} app - 앱 인스턴스
     */
    function updateViewportTransform(app) {
        const svg = app?.dom?.svg || document.getElementById('diagramSvg');
        if (!svg) return;
        
        const viewport = svg.querySelector('#viewport');
        if (!viewport) return;
        
        const v = app.viewport || { x: 0, y: 0, scale: 1 };
        viewport.setAttribute('transform', `translate(${v.x}, ${v.y}) scale(${v.scale})`);
    }

    /**
     * 이벤트 경로에서 클래스 찾기
     */
    function findInEventPath(event, className) {
        try {
            const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
            for (const n of path) {
                if (n && n.classList && n.classList.contains(className)) return n;
            }
        } catch {}
        try {
            return event.target && event.target.closest ? event.target.closest('.' + className) : null;
        } catch {
            return null;
        }
    }

    /**
     * 뷰포트 리셋
     * @param {Object} app - 앱 인스턴스
     */
    function resetViewport(app) {
        app.viewport.x = 0;
        app.viewport.y = 0;
        app.viewport.scale = 1;
        updateViewportTransform(app);
    }

    /**
     * 특정 위치로 뷰포트 이동
     * @param {Object} app - 앱 인스턴스
     * @param {number} x - X 좌표
     * @param {number} y - Y 좌표
     */
    function panTo(app, x, y) {
        app.viewport.x = x;
        app.viewport.y = y;
        updateViewportTransform(app);
    }

    /**
     * 특정 배율로 줌
     * @param {Object} app - 앱 인스턴스
     * @param {number} scale - 배율
     */
    function zoomTo(app, scale) {
        app.viewport.scale = Math.max(0.2, Math.min(3, scale));
        updateViewportTransform(app);
    }

    // 모듈 내보내기
    ns.Editor.interaction.zoomPanHandler = {
        handleWheel,
        startPan,
        handlePanMove,
        endPan,
        isPanning,
        updateViewportTransform,
        resetViewport,
        panTo,
        zoomTo,
    };
})();
