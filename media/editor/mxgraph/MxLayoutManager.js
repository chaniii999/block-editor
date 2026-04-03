/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxLayoutManager.js - mxGraph 레이아웃 관리
 * mxGraph 내장 레이아웃 알고리즘 활용
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.layout = ns.MxGraph.layout || {};

    // 로그 함수
    function log(prefix, ...args) {
        try {
            console.log(`[MxLayoutManager] ${prefix}`, ...args);
        } catch (_) {}
    }

    // 레이아웃 타입
    const LAYOUT_TYPES = {
        HIERARCHICAL: 'hierarchical',
        ORGANIC: 'organic',
        TREE: 'tree',
        CIRCLE: 'circle',
        RADIAL: 'radial'
    };

    /**
     * 계층적 레이아웃 적용
     * @param {mxGraph} graph
     * @param {Object} options - 레이아웃 옵션
     */
    function applyHierarchicalLayout(graph, options = {}) {
        if (!graph) return;

        const {
            direction = 'north',  // north, south, east, west
            spacing = 50,
            interRankSpacing = 50,
            intraCellSpacing = 30
        } = options;

        try {
            const layout = new mxHierarchicalLayout(graph);
            
            // 방향 설정
            switch (direction) {
                case 'south':
                    layout.orientation = mxConstants.DIRECTION_SOUTH;
                    break;
                case 'east':
                    layout.orientation = mxConstants.DIRECTION_EAST;
                    break;
                case 'west':
                    layout.orientation = mxConstants.DIRECTION_WEST;
                    break;
                default:
                    layout.orientation = mxConstants.DIRECTION_NORTH;
            }

            layout.interRankCellSpacing = interRankSpacing;
            layout.intraCellSpacing = intraCellSpacing;

            const parent = graph.getDefaultParent();
            layout.execute(parent);

            log('계층적 레이아웃 적용 완료');
        } catch (e) {
            log('계층적 레이아웃 실패:', e);
        }
    }

    /**
     * 유기적 레이아웃 적용 (Force-directed)
     * @param {mxGraph} graph
     * @param {Object} options
     */
    function applyOrganicLayout(graph, options = {}) {
        if (!graph) return;

        const {
            forceConstant = 50,
            minDistanceLimit = 2,
            maxIterations = 100
        } = options;

        try {
            const layout = new mxFastOrganicLayout(graph);
            layout.forceConstant = forceConstant;
            layout.minDistanceLimit = minDistanceLimit;
            layout.maxIterations = maxIterations;

            const parent = graph.getDefaultParent();
            layout.execute(parent);

            log('유기적 레이아웃 적용 완료');
        } catch (e) {
            log('유기적 레이아웃 실패:', e);
        }
    }

    /**
     * 트리 레이아웃 적용
     * @param {mxGraph} graph
     * @param {Object} options
     */
    function applyTreeLayout(graph, options = {}) {
        if (!graph) return;

        const {
            horizontal = false,
            levelDistance = 40,
            nodeDistance = 20
        } = options;

        try {
            const layout = new mxCompactTreeLayout(graph, horizontal);
            layout.levelDistance = levelDistance;
            layout.nodeDistance = nodeDistance;

            const parent = graph.getDefaultParent();
            layout.execute(parent);

            log('트리 레이아웃 적용 완료');
        } catch (e) {
            log('트리 레이아웃 실패:', e);
        }
    }

    /**
     * 원형 레이아웃 적용
     * @param {mxGraph} graph
     * @param {Object} options
     */
    function applyCircleLayout(graph, options = {}) {
        if (!graph) return;

        const { radius = 100 } = options;

        try {
            const layout = new mxCircleLayout(graph);
            layout.radius = radius;

            const parent = graph.getDefaultParent();
            layout.execute(parent);

            log('원형 레이아웃 적용 완료');
        } catch (e) {
            log('원형 레이아웃 실패:', e);
        }
    }

    /**
     * 방사형 트리 레이아웃 적용
     * @param {mxGraph} graph
     * @param {Object} options
     */
    function applyRadialTreeLayout(graph, options = {}) {
        if (!graph) return;

        const {
            levelDistance = 60,
            nodeDistance = 16
        } = options;

        try {
            const layout = new mxRadialTreeLayout(graph);
            layout.levelDistance = levelDistance;
            layout.nodeDistance = nodeDistance;

            const parent = graph.getDefaultParent();
            layout.execute(parent);

            log('방사형 트리 레이아웃 적용 완료');
        } catch (e) {
            log('방사형 트리 레이아웃 실패:', e);
        }
    }

    /**
     * 레이아웃 적용 (타입별 분기)
     * @param {mxGraph} graph
     * @param {string} type - 레이아웃 타입
     * @param {Object} options - 레이아웃 옵션
     */
    function applyLayout(graph, type, options = {}) {
        if (!graph) return;

        log('레이아웃 적용:', type);

        switch (type) {
            case LAYOUT_TYPES.HIERARCHICAL:
                applyHierarchicalLayout(graph, options);
                break;
            case LAYOUT_TYPES.ORGANIC:
                applyOrganicLayout(graph, options);
                break;
            case LAYOUT_TYPES.TREE:
                applyTreeLayout(graph, options);
                break;
            case LAYOUT_TYPES.CIRCLE:
                applyCircleLayout(graph, options);
                break;
            case LAYOUT_TYPES.RADIAL:
                applyRadialTreeLayout(graph, options);
                break;
            default:
                log('알 수 없는 레이아웃 타입:', type);
        }

        // 뷰 새로고침
        graph.refresh();
    }

    /**
     * 자동 레이아웃 (노드 수에 따라 적절한 레이아웃 선택)
     * @param {mxGraph} graph
     */
    function autoLayout(graph) {
        if (!graph) return;

        const parent = graph.getDefaultParent();
        const cells = graph.getChildVertices(parent);
        const cellCount = cells.length;

        log('자동 레이아웃. 노드 수:', cellCount);

        if (cellCount <= 5) {
            applyCircleLayout(graph);
        } else if (cellCount <= 20) {
            applyHierarchicalLayout(graph);
        } else {
            applyOrganicLayout(graph);
        }
    }

    /**
     * 선택된 셀만 레이아웃 적용
     * @param {mxGraph} graph
     * @param {string} type
     * @param {Object} options
     */
    function applyLayoutToSelection(graph, type, options = {}) {
        if (!graph) return;

        const cells = graph.getSelectionCells();
        if (cells.length === 0) {
            log('선택된 셀 없음');
            return;
        }

        // 선택된 셀들의 부모를 임시 그룹으로 처리
        log('선택된 셀에 레이아웃 적용:', cells.length, '개');
        
        // 간단히 계층적 레이아웃 적용
        try {
            const layout = new mxHierarchicalLayout(graph);
            layout.execute(graph.getDefaultParent(), cells);
            graph.refresh();
        } catch (e) {
            log('선택 레이아웃 실패:', e);
        }
    }

    // 모듈 export
    ns.MxGraph.layout.TYPES = LAYOUT_TYPES;
    ns.MxGraph.layout.applyLayout = applyLayout;
    ns.MxGraph.layout.applyHierarchicalLayout = applyHierarchicalLayout;
    ns.MxGraph.layout.applyOrganicLayout = applyOrganicLayout;
    ns.MxGraph.layout.applyTreeLayout = applyTreeLayout;
    ns.MxGraph.layout.applyCircleLayout = applyCircleLayout;
    ns.MxGraph.layout.applyRadialTreeLayout = applyRadialTreeLayout;
    ns.MxGraph.layout.autoLayout = autoLayout;
    ns.MxGraph.layout.applyLayoutToSelection = applyLayoutToSelection;

    log('MxLayoutManager 모듈 로드 완료');
})();
