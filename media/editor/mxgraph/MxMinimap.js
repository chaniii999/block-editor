/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxMinimap.js - mxGraph 미니맵 (Outline)
 * selab-practice의 useMiniMap.js 참조
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.minimap = ns.MxGraph.minimap || {};

    // 로그 함수
    function log(prefix, ...args) {
        try {
            console.log(`[MxMinimap] ${prefix}`, ...args);
        } catch (_) {}
    }

    // 미니맵 인스턴스
    let outlineInstance = null;
    let minimapContainer = null;
    let minimapVisible = true;
    let sourceGraph = null;
    let parentMountElement = null;
    let minimapOptions = null;

    /**
     * 미니맵 생성
     * @param {mxGraph} graph - 메인 그래프
     * @param {HTMLElement} container - 미니맵 컨테이너
     * @param {Object} options - 옵션
     * @returns {mxOutline} 미니맵 인스턴스
     */
    function create(graph, container, options = {}) {
        if (!graph || !container) {
            log('미니맵 생성 실패: 그래프 또는 컨테이너 없음');
            return null;
        }

        const { width = 200, height = 150, border = 10 } = options;

        try {
            sourceGraph = graph;
            minimapContainer = container;
            minimapOptions = {
                ...(minimapOptions || {}),
                ...options,
                width,
                height,
                border,
            };

            // 컨테이너 스타일 설정
            container.style.width = `${width}px`;
            container.style.height = `${height}px`;
            container.style.overflow = 'hidden';
            container.style.border = '1px solid #ccc';
            container.style.background = '#f9f9f9';

            // mxOutline 생성
            const outline = new mxOutline(graph, container);
            outline.border = border;

            // 뷰포트 사각형 스타일 설정
            if (outline.sizer) {
                outline.sizer.style.border = '2px solid #0078d4';
                outline.sizer.style.background = 'rgba(0, 120, 212, 0.1)';
            }

            outlineInstance = outline;
            applyOutlineOverlayVisibility(true);
            return outline;
        } catch (e) {
            log('미니맵 생성 실패:', e);
            return null;
        }
    }

    /**
     * 미니맵 컨테이너 자동 생성
     * @param {mxGraph} graph
     * @param {HTMLElement} parentElement - 부모 요소
     * @param {Object} options
     * @returns {mxOutline}
     */
    function createWithContainer(graph, parentElement, options = {}) {
        if (!graph || !parentElement) return null;

        if (outlineInstance || minimapContainer) {
            destroy();
        }

        const { position = 'bottom-right', width = 200, height = 150, margin = 10 } = options;
        sourceGraph = graph;
        parentMountElement = parentElement;
        minimapOptions = {
            ...(minimapOptions || {}),
            ...options,
            position,
            width,
            height,
            margin,
        };

        // 미니맵 컨테이너 생성
        const container = document.createElement('div');
        container.id = 'mxGraphMinimap';
        // fixed 위치 사용하여 패닝 시에도 고정 위치 유지
        container.style.position = 'fixed';
        container.style.zIndex = '100';
        container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        container.style.borderRadius = '4px';
        container.style.pointerEvents = 'auto';
        container.style.outline = 'none';

        // 위치 설정 (fixed 기준)
        switch (position) {
            case 'top-left':
                container.style.top = `${margin}px`;
                container.style.left = `${margin}px`;
                break;
            case 'top-right':
                container.style.top = `${margin}px`;
                container.style.right = `${margin}px`;
                break;
            case 'bottom-left':
                container.style.bottom = `${margin}px`;
                container.style.left = `${margin}px`;
                break;
            case 'bottom-right':
            default:
                container.style.bottom = `${margin}px`;
                container.style.right = `${margin}px`;
                break;
        }

        // 부모 요소에 추가 (fixed 위치이므로 패닝과 무관하게 고정)
        parentElement.appendChild(container);

        return create(graph, container, { width, height });
    }

    /**
     * 미니맵 업데이트
     */
    function update() {
        if (outlineInstance) {
            try {
                outlineInstance.update(true);
                log('미니맵 업데이트');
            } catch (e) {
                log('미니맵 업데이트 실패:', e);
            }
        }
    }

    function applyOutlineOverlayVisibility(visible) {
        if (!outlineInstance) return;
        const selectionBorderNode = outlineInstance.selectionBorder?.node;
        const sizerNode = outlineInstance.sizer?.node;
        const outlineGraphContainer = outlineInstance.outline?.container;
        const outlineCanvas = outlineInstance.outline?.view?.canvas;
        const outlineBackgroundPane = outlineInstance.outline?.view?.backgroundPane;
        const outlineDrawPane = outlineInstance.outline?.view?.drawPane;
        const outlineOverlayPane = outlineInstance.outline?.view?.overlayPane;

        try {
            outlineInstance.setEnabled(visible === true);
            outlineInstance.setZoomEnabled(visible === true);
        } catch (e) {
            log('미니맵 overlay 이벤트 상태 변경 실패:', e);
        }

        if (selectionBorderNode) {
            selectionBorderNode.style.visibility = visible ? 'visible' : 'hidden';
            selectionBorderNode.style.opacity = visible ? '1' : '0';
            selectionBorderNode.style.pointerEvents = visible ? 'auto' : 'none';
            selectionBorderNode.style.display = visible ? '' : 'none';
            selectionBorderNode.style.cursor = visible ? 'move' : 'default';
        }
        if (sizerNode) {
            sizerNode.style.visibility = visible ? 'visible' : 'hidden';
            sizerNode.style.opacity = visible ? '1' : '0';
            sizerNode.style.pointerEvents = visible ? 'auto' : 'none';
            sizerNode.style.display = visible ? '' : 'none';
            sizerNode.style.cursor = visible ? '' : 'default';
        }
        if (outlineGraphContainer) {
            outlineGraphContainer.style.pointerEvents = visible ? 'auto' : 'none';
            outlineGraphContainer.style.cursor = visible ? '' : 'default';
        }
        if (outlineCanvas) {
            outlineCanvas.style.pointerEvents = visible ? 'auto' : 'none';
            outlineCanvas.style.cursor = visible ? '' : 'default';
        }
        if (outlineBackgroundPane) {
            outlineBackgroundPane.style.pointerEvents = visible ? 'auto' : 'none';
            outlineBackgroundPane.style.cursor = visible ? '' : 'default';
        }
        if (outlineDrawPane) {
            outlineDrawPane.style.pointerEvents = visible ? 'auto' : 'none';
            outlineDrawPane.style.cursor = visible ? '' : 'default';
        }
        if (outlineOverlayPane) {
            outlineOverlayPane.style.pointerEvents = visible ? 'auto' : 'none';
            outlineOverlayPane.style.cursor = visible ? '' : 'default';
        }
    }

    /**
     * 미니맵 표시/숨김
     * @param {boolean} visible
     */
    function setVisible(visible) {
        minimapVisible = visible === true;

        if (!minimapVisible) {
            destroy();
            log('미니맵 숨김');
            return;
        }

        if (!outlineInstance) {
            if (sourceGraph && parentMountElement) {
                createWithContainer(sourceGraph, parentMountElement, minimapOptions || {});
            }
        }

        if (minimapContainer) {
            minimapContainer.style.display = 'block';
            minimapContainer.style.visibility = 'visible';
            minimapContainer.style.opacity = '1';
            minimapContainer.style.pointerEvents = 'auto';
            minimapContainer.style.transform = '';
            minimapContainer.setAttribute('aria-hidden', 'false');
            applyOutlineOverlayVisibility(true);
            log('미니맵 표시:', minimapVisible);
            if (outlineInstance) {
                requestAnimationFrame(() => {
                    try {
                        outlineInstance.update(true);
                        applyOutlineOverlayVisibility(true);
                        log('미니맵 표시 후 업데이트 완료');
                    } catch (e) {
                        log('미니맵 표시 후 업데이트 실패:', e);
                    }
                });
            }
        }
    }

    /**
     * 미니맵 토글
     */
    function toggle() {
        setVisible(!minimapVisible);
    }

    /**
     * 미니맵 파괴
     */
    function destroy() {
        if (outlineInstance) {
            try {
                outlineInstance.destroy();
                outlineInstance = null;
                log('미니맵 파괴 완료');
            } catch (e) {
                log('미니맵 파괴 실패:', e);
            }
        }

        if (minimapContainer && minimapContainer.parentNode) {
            minimapContainer.parentNode.removeChild(minimapContainer);
        }
        minimapContainer = null;
    }

    /**
     * 미니맵 크기 조정
     * @param {number} width
     * @param {number} height
     */
    function resize(width, height) {
        if (minimapContainer) {
            minimapContainer.style.width = `${width}px`;
            minimapContainer.style.height = `${height}px`;
            update();
        }
    }

    /**
     * 미니맵 인스턴스 가져오기
     * @returns {mxOutline|null}
     */
    function getInstance() {
        return outlineInstance;
    }

    /**
     * 미니맵 활성화 여부
     * @returns {boolean}
     */
    function isEnabled() {
        return outlineInstance !== null && minimapContainer !== null;
    }

    /**
     * 미니맵 표시 여부
     * @returns {boolean}
     */
    function isVisible() {
        return minimapVisible;
    }

    // 모듈 export
    ns.MxGraph.minimap.create = create;
    ns.MxGraph.minimap.createWithContainer = createWithContainer;
    ns.MxGraph.minimap.update = update;
    ns.MxGraph.minimap.setVisible = setVisible;
    ns.MxGraph.minimap.toggle = toggle;
    ns.MxGraph.minimap.destroy = destroy;
    ns.MxGraph.minimap.resize = resize;
    ns.MxGraph.minimap.getInstance = getInstance;
    ns.MxGraph.minimap.isEnabled = isEnabled;
    ns.MxGraph.minimap.isVisible = isVisible;

    log('MxMinimap 모듈 로드 완료');
})();
