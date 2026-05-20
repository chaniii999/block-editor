/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * index.js - mxGraph 래퍼 모듈 진입점
 * 
 * 이 파일은 mxGraph 관련 모듈들을 로드 순서대로 나열합니다.
 * HtmlGenerator.js에서 이 파일 대신 개별 모듈을 직접 로드합니다.
 * 
 * 로드 순서:
 * 1. mxClient.min.js (npm 패키지)
 * 2. MxGraphWrapper.js
 * 3. MxStyleManager.js
 * 4. MxTypeUtils.js (공통 타입 유틸리티)
 * 5. MxLabelUtils.js
 * 6. MxCompartmentRenderer.js
 * 7. MxLoopBodyRenderer.js (MxCompartmentRenderer에서 분리)
 * 8. MxVertexBuilder.js (MxCellFactory에서 분리)
 * 9. MxEdgeBuilder.js (MxCellFactory에서 분리)
 * 10. MxCellFactory.js (조율자)
 * 11. MxHistoryManager.js
 * 12. MxEventHandler.js
 * 13. MxSelectionManager.js
 * 14. MxNeighborHighlight.js (선택 국소 하이라이트)
 * 15. MxDragHandler.js
 * 16. MxZoomPanHandler.js
 * 17. MxLayoutManager.js
 * 18. MxMinimap.js
 * 19. EdgeTypeMapping.js (에지 타입 매핑 테이블)
 * 20. EdgeTypeMenu.js (에지 타입 선택 컨텍스트 메뉴)
 * 21. MxConnectionHandler.js
 * 22. MxFoldManager.js (Collapse/Expand)
 * 23. MxContextMenu.js (ninja-keys 컨텍스트 메뉴)
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};

    // mxGraph 사용 가능 여부 확인
    ns.MxGraph.isReady = function () {
        return !!(
            typeof mxGraph === 'function' &&
            ns.MxGraph.init &&
            ns.MxGraph.styles &&
            ns.MxGraph.factory &&
            ns.MxGraph.history &&
            ns.MxGraph.events &&
            ns.MxGraph.selection &&
            ns.MxGraph.drag &&
            ns.MxGraph.zoomPan &&
            ns.MxGraph.layout &&
            ns.MxGraph.minimap &&
            ns.MxGraph.connection &&
            ns.MxGraph.fold
        );
    };

    // 버전 정보
    ns.MxGraph.version = {
        wrapper: '3.1.0',  // 리팩토링: MxCellFactory 분리
        mxGraph: typeof mxClient !== 'undefined' ? mxClient.VERSION : 'unknown'
    };

    // 모듈 목록
    ns.MxGraph.modules = [
        'init (MxGraphWrapper)',
        'styles (MxStyleManager)',
        'labelUtils (MxLabelUtils)',
        'layoutHelper (MxLayoutHelper)',
        'compartment (MxCompartmentRenderer)',
        'loopBody (MxLoopBodyRenderer)',
        'vertexBuilder (MxVertexBuilder)',
        'edgeBuilder (MxEdgeBuilder)',
        'sizeManager (MxSizeManager)',
        'factory (MxCellFactory)',
        'history (MxHistoryManager)',
        'events (MxEventHandler)',
        'selection (MxSelectionManager)',
        'drag (MxDragHandler)',
        'zoomPan (MxZoomPanHandler)',
        'layout (MxLayoutManager)',
        'minimap (MxMinimap)',
        'edgeTypeMapping (EdgeTypeMapping)',
        'edgeTypeMenu (EdgeTypeMenu)',
        'connection (MxConnectionHandler)',
        'fold (MxFoldManager)',
        'contextMenu (MxContextMenu)'
    ];

    console.log('[MxGraph/index] mxGraph 래퍼 모듈 로드 완료. 버전:', ns.MxGraph.version.wrapper);
    console.log('[MxGraph/index] 로드된 모듈:', ns.MxGraph.modules.length);
})();
