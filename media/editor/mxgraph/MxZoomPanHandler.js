/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxZoomPanHandler.js - mxGraph 줌/팬 처리
 * selab-practice의 useZoomControls.js 참조
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.zoomPan = ns.MxGraph.zoomPan || {};

    // 로그 함수
    function log(prefix, ...args) {
        try {
            console.log(`[MxZoomPanHandler] ${prefix}`, ...args);
        } catch (_) {}
    }

    // 줌 설정
    const ZOOM_FACTOR = 1.2;
    const MIN_SCALE = 0.1;
    const MAX_SCALE = 4.0;

    /**
     * 줌 인
     * @param {mxGraph} graph
     */
    function zoomIn(graph) {
        if (!graph) return;
        try {
            const view = graph.getView();
            const currentScale = view.getScale();
            const newScale = Math.min(currentScale * ZOOM_FACTOR, MAX_SCALE);
            
            if (typeof graph.zoomIn === 'function') {
                graph.zoomIn();
            } else {
                view.setScale(newScale);
            }
            
            view.validate?.();
            log('줌 인:', newScale.toFixed(2));
        } catch (e) {
            log('줌 인 실패:', e);
        }
    }

    /**
     * 줌 아웃
     * @param {mxGraph} graph
     */
    function zoomOut(graph) {
        if (!graph) return;
        try {
            const view = graph.getView();
            const currentScale = view.getScale();
            const newScale = Math.max(currentScale / ZOOM_FACTOR, MIN_SCALE);
            
            if (typeof graph.zoomOut === 'function') {
                graph.zoomOut();
            } else {
                view.setScale(newScale);
            }
            
            view.validate?.();
            log('줌 아웃:', newScale.toFixed(2));
        } catch (e) {
            log('줌 아웃 실패:', e);
        }
    }

    /**
     * 줌 리셋 (100%)
     * @param {mxGraph} graph
     */
    function zoomReset(graph) {
        if (!graph) return;
        try {
            const view = graph.getView();
            view.setScale(1.0);
            view.setTranslate(0, 0);
            view.validate?.();
            log('줌 리셋');
        } catch (e) {
            log('줌 리셋 실패:', e);
        }
    }

    /**
     * 특정 배율로 줌
     * @param {mxGraph} graph
     * @param {number} scale - 배율 (0.1 ~ 4.0)
     */
    function zoomTo(graph, scale) {
        if (!graph) return;
        try {
            const clampedScale = Math.max(MIN_SCALE, Math.min(scale, MAX_SCALE));
            const view = graph.getView();
            view.setScale(clampedScale);
            view.validate?.();
            log('줌 설정:', clampedScale.toFixed(2));
        } catch (e) {
            log('줌 설정 실패:', e);
        }
    }

    /**
     * 콘텐츠에 맞게 줌
     * @param {mxGraph} graph
     * @param {number} border - 여백 (기본값: 20)
     */
    function zoomToFit(graph, border = 20) {
        if (!graph) return;
        try {
            graph.fit(border);
            graph.getView().validate?.();
            log('콘텐츠에 맞게 줌');
        } catch (e) {
            log('콘텐츠 맞춤 줌 실패:', e);
        }
    }

    /**
     * 현재 줌 배율 가져오기
     * @param {mxGraph} graph
     * @returns {number}
     */
    function getScale(graph) {
        if (!graph) return 1.0;
        try {
            return graph.getView().getScale();
        } catch (_) {
            return 1.0;
        }
    }

    /**
     * 팬 (이동)
     * @param {mxGraph} graph
     * @param {number} dx - X 이동량
     * @param {number} dy - Y 이동량
     */
    function pan(graph, dx, dy) {
        if (!graph) return;
        try {
            const view = graph.getView();
            const translate = view.getTranslate();
            const scale = view.getScale();
            
            // 스케일 보정: 화면상 dx, dy만큼 이동하려면 view translate는 dx/scale 만큼 이동해야 함
            view.setTranslate(translate.x + dx / scale, translate.y + dy / scale);
            view.validate?.();
        } catch (e) {
            log('팬 실패:', e);
        }
    }

    /**
     * 팬 모드 활성화/비활성화
     * @param {mxGraph} graph
     * @param {boolean} enabled
     */
    function setPanningEnabled(graph, enabled) {
        if (!graph) return;
        try {
            graph.setPanning(true);
            if (graph.panningHandler) {
                graph.panningHandler.useLeftButtonForPanning = true;
                graph.panningHandler.ignoreCell = !!enabled;
                graph.panningHandler.usePopupTrigger = false;
            }
            log('팬 모드:', enabled);
        } catch (e) {
            log('팬 모드 설정 실패:', e);
        }
    }

    /**
     * 마우스 휠 줌 초기화
     * @param {mxGraph} graph
     * @param {HTMLElement} container
     */
    function initWheelZoom(graph, container) {
        if (!graph || !container) return;

        const wheelHandler = (evt) => {
            // Ctrl 없이도 휠로 줌 가능
            evt.preventDefault();
            evt.stopPropagation();
            
            const view = graph.getView();
            const currentScale = view.getScale();
            const translate = view.getTranslate();
            
            // 새 스케일 계산
            const delta = evt.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
            const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentScale * delta));
            
            // 마우스 위치 (컨테이너 기준)
            const rect = container.getBoundingClientRect();
            const mouseX = evt.clientX - rect.left;
            const mouseY = evt.clientY - rect.top;
            
            // 마우스 위치의 그래프 좌표 계산 (줌 전)
            const graphX = mouseX / currentScale - translate.x;
            const graphY = mouseY / currentScale - translate.y;
            
            // 새 translate 계산 (마우스 위치 고정)
            const newTranslateX = mouseX / newScale - graphX;
            const newTranslateY = mouseY / newScale - graphY;
            
            view.setScale(newScale);
            view.setTranslate(newTranslateX, newTranslateY);
            view.validate?.();
        };

        container.addEventListener('wheel', wheelHandler, { passive: false });
        log('마우스 휠 줌 초기화 완료');

        // 제거 함수 반환
        return () => {
            container.removeEventListener('wheel', wheelHandler);
        };
    }

    /**
     * 줌/팬 핸들러 초기화
     * @param {mxGraph} graph
     * @param {HTMLElement} container
     */
    function init(graph, container) {
        if (!graph) return;

        // 기본값: 배경 드래그 시 패닝, 요소 위에서는 드래그/선택
        graph.setPanning(true);
        
        // panningHandler 설정
        if (graph.panningHandler) {
            // 기본 패닝 (배경 드래그 등) 설정은 유지/초기화
            // MxGraphWrapper에서 useScrollbarsForPanning = false로 설정됨.
            
            // 우클릭 드래그로 패닝 허용 (단, 컨텍스트 메뉴는 팝업 트리거로 동작)
            graph.panningHandler.usePopupTrigger = true;
            
            // 패닝 강제 이벤트 오버라이드 (Space 키 또는 Shift 키 조합)
            graph.panningHandler.isForcePanningEvent = function(me) {
                // Space 키가 눌려있으면 패닝 강제 (mxGraph 기본동작과 유사하게 구현)
                const evt = me.getEvent();
                return mxEvent.isConsumed(evt) ? false : (mxEvent.isShiftDown(evt) || evt.code === 'Space');
            };
        }
        
        // 마우스 휠 줌
        if (container) {
            initWheelZoom(graph, container);
        }

        log('줌/팬 핸들러 초기화 완료');
    }

    // 모듈 export
    ns.MxGraph.zoomPan.init = init;
    ns.MxGraph.zoomPan.zoomIn = zoomIn;
    ns.MxGraph.zoomPan.zoomOut = zoomOut;
    ns.MxGraph.zoomPan.zoomReset = zoomReset;
    ns.MxGraph.zoomPan.zoomTo = zoomTo;
    ns.MxGraph.zoomPan.zoomToFit = zoomToFit;
    ns.MxGraph.zoomPan.getScale = getScale;
    ns.MxGraph.zoomPan.pan = pan;
    ns.MxGraph.zoomPan.setPanningEnabled = setPanningEnabled;
    ns.MxGraph.zoomPan.ZOOM_FACTOR = ZOOM_FACTOR;
    ns.MxGraph.zoomPan.MIN_SCALE = MIN_SCALE;
    ns.MxGraph.zoomPan.MAX_SCALE = MAX_SCALE;

    log('MxZoomPanHandler 모듈 로드 완료');
})();
