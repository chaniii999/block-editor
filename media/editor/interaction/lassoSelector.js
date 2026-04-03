/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 라쏘 선택기 - 영역 선택
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.interaction = ns.Editor.interaction || {};

    // 라쏘 상태
    let lasso = null; // { start:{x,y}, rectEl, endX, endY }

    /**
     * 라쏘 시작
     * @param {Object} app - 앱 인스턴스
     * @param {MouseEvent} ev - 마우스 이벤트
     */
    function startLasso(app, ev) {
        const svg = app?.dom?.svg || document.getElementById('diagramSvg');
        const overlay = ensureOverlay(svg);
        
        // 기존 라쏘 사각형 제거
        clearLassoOverlay(app);
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', 'lasso-rect');
        overlay.appendChild(rect);
        
        lasso = { start: { x: ev.clientX, y: ev.clientY }, rectEl: rect };
    }

    /**
     * 라쏘 중 마우스 이동 처리
     * @param {MouseEvent} ev - 마우스 이벤트
     * @param {Object} app - 앱 인스턴스
     * @returns {boolean} 라쏘 처리 여부
     */
    function handleLassoMove(ev, app) {
        if (!lasso || !lasso.rectEl) return false;
        
        const svg = app?.dom?.svg || document.getElementById('diagramSvg');
        const rect = svg.getBoundingClientRect();
        const scale = Math.max(0.0001, app?.viewport?.scale || 1);
        const ox = app?.viewport?.x || 0;
        const oy = app?.viewport?.y || 0;
        
        const x1w = (Math.min(lasso.start.x, ev.clientX) - rect.left - ox) / scale;
        const y1w = (Math.min(lasso.start.y, ev.clientY) - rect.top - oy) / scale;
        const x2w = (Math.max(lasso.start.x, ev.clientX) - rect.left - ox) / scale;
        const y2w = (Math.max(lasso.start.y, ev.clientY) - rect.top - oy) / scale;
        
        lasso.rectEl.setAttribute('x', String(x1w));
        lasso.rectEl.setAttribute('y', String(y1w));
        lasso.rectEl.setAttribute('width', String(Math.max(0, x2w - x1w)));
        lasso.rectEl.setAttribute('height', String(Math.max(0, y2w - y1w)));
        
        // 종료 좌표 저장
        lasso.endX = ev.clientX;
        lasso.endY = ev.clientY;
        
        return true;
    }

    /**
     * 라쏘 종료 및 선택 수행
     * @param {Object} app - 앱 인스턴스
     * @returns {boolean} 라쏘가 있었는지 여부
     */
    function endLasso(app) {
        const hadLasso = !!lasso;
        
        if (lasso) {
            try {
                performLassoSelection(app, lasso);
                lasso.rectEl?.remove?.();
            } catch {}
            lasso = null;
        }
        
        // 남은 라쏘 사각형 정리
        clearLassoOverlay(app);
        
        return hadLasso;
    }

    /**
     * 라쏘 취소
     * @param {Object} app - 앱 인스턴스
     */
    function cancelLasso(app) {
        if (!lasso) return;
        try {
            lasso.rectEl?.remove?.();
        } catch {}
        lasso = null;
        clearLassoOverlay(app);
    }

    /**
     * 라쏘 중인지 확인
     * @returns {boolean} 라쏘 중 여부
     */
    function isLassoing() {
        return !!lasso;
    }

    /**
     * 라쏘 선택 수행
     * @param {Object} app - 앱 인스턴스
     * @param {Object} l - 라쏘 상태
     */
    function performLassoSelection(app, l) {
        const svg = app?.dom?.svg || document.getElementById('diagramSvg');
        const rect = svg.getBoundingClientRect();
        
        const x1s = Math.min(l.start.x, l.endX || l.start.x) - rect.left;
        const y1s = Math.min(l.start.y, l.endY || l.start.y) - rect.top;
        const x2s = Math.max(l.start.x, l.endX || l.start.x) - rect.left;
        const y2s = Math.max(l.start.y, l.endY || l.start.y) - rect.top;
        
        const sx = app.viewport.scale || 1;
        const ox = app.viewport.x || 0;
        const oy = app.viewport.y || 0;
        
        // 스크린 좌표를 월드 좌표로 변환
        const x1 = (x1s - ox) / sx;
        const y1 = (y1s - oy) / sx;
        const x2 = (x2s - ox) / sx;
        const y2 = (y2s - oy) / sx;
        
        const minx = Math.min(x1, x2);
        const miny = Math.min(y1, y2);
        const maxx = Math.max(x1, x2);
        const maxy = Math.max(y1, y2);
        
        // 기존 선택 해제
        const selectionManager = ns.Editor.interaction.selectionManager;
        if (selectionManager) {
            selectionManager.clearSelection();
        } else {
            document.querySelectorAll('.diagram-element.selected').forEach((el) => el.classList.remove('selected'));
        }
        
        // 영역 내 요소 선택
        for (const n of app.model.elements || []) {
            const inside = n.x >= minx && n.y >= miny && n.x + n.width <= maxx && n.y + n.height <= maxy;
            if (inside) {
                if (selectionManager) {
                    selectionManager.addSelection(n.id);
                } else {
                    const el = document.querySelector(`.diagram-element[data-id="${n.id}"]`);
                    if (el) el.classList.add('selected');
                }
            }
        }
    }

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
     * 라쏘 오버레이 정리
     * @param {Object} app - 앱 인스턴스
     */
    function clearLassoOverlay(app) {
        const svg = app?.dom?.svg || document.getElementById('diagramSvg');
        const viewport = svg?.querySelector('#viewport') || svg;
        const overlay = viewport?.querySelector('#overlay');
        if (!overlay) return;
        overlay.querySelectorAll('.lasso-rect').forEach((el) => {
            try {
                el.remove();
            } catch {}
        });
    }

    // 모듈 내보내기
    ns.Editor.interaction.lassoSelector = {
        startLasso,
        handleLassoMove,
        endLasso,
        cancelLasso,
        isLassoing,
        performLassoSelection,
        clearLassoOverlay,
    };
})();
