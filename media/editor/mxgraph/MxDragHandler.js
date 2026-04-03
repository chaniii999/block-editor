/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxDragHandler.js - mxGraph 드래그 처리
 * selab-practice의 useGraphDragAndDrop.js 참조
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.drag = ns.MxGraph.drag || {};

    // 로그 함수
    function log(prefix, ...args) {
        try {
            console.log(`[MxDragHandler] ${prefix}`, ...args);
        } catch (_) {}
    }

    // 그리드 스냅 설정 (displaySettings 참조)
    const DS = window.SELAB?.Editor?.config?.displaySettings;
    const GRID_SIZE = DS?.grid?.size ?? 10;

    /**
     * 값을 그리드에 스냅
     * @param {number} value
     * @returns {number}
     */
    function snapToGrid(value) {
        return Math.round(value / GRID_SIZE) * GRID_SIZE;
    }

    /**
     * 셀 지오메트리를 그리드에 스냅
     * @param {mxGraph} graph
     * @param {mxCell} cell
     */
    function snapCellToGrid(graph, cell) {
        if (!graph || !cell) return;
        const model = graph.getModel();
        if (!model.isVertex(cell)) return;

        const geo = cell.getGeometry();
        if (!geo) return;

        const newGeo = geo.clone();
        newGeo.x = snapToGrid(newGeo.x);
        newGeo.y = snapToGrid(newGeo.y);
        newGeo.width = Math.max(GRID_SIZE, snapToGrid(newGeo.width));
        newGeo.height = Math.max(GRID_SIZE, snapToGrid(newGeo.height));

        if (newGeo.x !== geo.x || newGeo.y !== geo.y || 
            newGeo.width !== geo.width || newGeo.height !== geo.height) {
            model.setGeometry(cell, newGeo);
        }
    }

    /**
     * 부모 컨테이너를 자식을 포함하도록 확장
     * @param {mxGraph} graph
     * @param {mxCell} parentCell - 부모 셀
     */
    function expandParentToFitChildren(graph, parentCell) {
        if (!graph || !parentCell) return;

        const model = graph.getModel();
        const parentGeo = parentCell.getGeometry();
        if (!parentGeo) return;

        const children = model.getChildVertices(parentCell);
        if (!children || children.length === 0) return;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        // 자식들의 범위 계산
        for (const child of children) {
            const geo = child.getGeometry();
            if (!geo) continue;

            // 상대 좌표를 절대 좌표로 변환
            const absX = geo.relative ? parentGeo.x + geo.x * parentGeo.width : parentGeo.x + geo.x;
            const absY = geo.relative ? parentGeo.y + geo.y * parentGeo.height : parentGeo.y + geo.y;

            minX = Math.min(minX, absX);
            minY = Math.min(minY, absY);
            maxX = Math.max(maxX, absX + geo.width);
            maxY = Math.max(maxY, absY + geo.height);
        }

        if (minX === Infinity) return;

        // 패딩 (displaySettings 참조)
        const DS_c = window.SELAB?.Editor?.config?.displaySettings;
        const CT = DS_c?.container;
        const PADDING_RIGHT = CT?.paddingRight ?? 16;
        const PADDING_BOTTOM = CT?.paddingBottom ?? 16;
        const PADDING_LEFT = CT?.paddingLeft ?? 16;
        const PADDING_TOP = CT?.paddingTop ?? 16;

        // 새로운 부모 크기 계산
        const newWidth = Math.max(parentGeo.width, maxX - parentGeo.x + PADDING_RIGHT);
        const newHeight = Math.max(parentGeo.height, maxY - parentGeo.y + PADDING_BOTTOM);

        // 부모 확장
        if (newWidth > parentGeo.width || newHeight > parentGeo.height) {
            const newGeo = parentGeo.clone();
            newGeo.width = newWidth;
            newGeo.height = newHeight;
            model.setGeometry(parentCell, newGeo);
            log(`부모 컨테이너 확장: ${parentCell.id}, ${parentGeo.width}x${parentGeo.height} → ${newWidth}x${newHeight}`);
        }
    }

    /**
     * 드래그 핸들러 초기화
     * @param {mxGraph} graph
     */
    function init(graph) {
        if (!graph) return;

        // 셀 이동 후 그리드 스냅 + 부모 확장
        graph.addListener(mxEvent.CELLS_MOVED, (sender, evt) => {
            const cells = evt.getProperty('cells') || [];
            const model = graph.getModel();

            model.beginUpdate();
            try {
                // 그리드 스냅
                cells.forEach(cell => snapCellToGrid(graph, cell));

                // 이동된 셀의 부모들을 확장
                const parents = new Set();
                cells.forEach(cell => {
                    const parent = model.getParent(cell);
                    if (parent && model.isVertex(parent)) {
                        parents.add(parent);
                    }
                });

                // 부모 확장
                parents.forEach(parent => expandParentToFitChildren(graph, parent));
            } finally {
                model.endUpdate();
            }
        });

        // 셀 리사이즈 후 그리드 스냅
        graph.addListener(mxEvent.CELLS_RESIZED, (sender, evt) => {
            const cells = evt.getProperty('cells') || [];
            const model = graph.getModel();
            
            model.beginUpdate();
            try {
                cells.forEach(cell => snapCellToGrid(graph, cell));
            } finally {
                model.endUpdate();
            }
        });

        // 드래그 프리뷰 설정
        if (graph.graphHandler) {
            graph.graphHandler.scaleGrid = true;
            
            // 가이드라인 활성화 (파워포인트 스타일 정렬 가이드)
            graph.graphHandler.guidesEnabled = true;
        }
        
        // mxGuide 스타일 설정 (가이드라인 굵기, 대시 패턴)
        if (typeof mxGuide !== 'undefined') {
            mxGuide.prototype.strokeWidth = 1;
            mxGuide.prototype.dashed = true;
        }

        log('드래그 핸들러 초기화 완료 (가이드라인 활성화)');
    }

    /**
     * 셀 이동
     * @param {mxGraph} graph
     * @param {mxCell|Array} cells - 이동할 셀
     * @param {number} dx - X 이동량
     * @param {number} dy - Y 이동량
     */
    function moveCells(graph, cells, dx, dy) {
        if (!graph) return;
        try {
            const cellArray = Array.isArray(cells) ? cells : [cells];
            graph.moveCells(cellArray.filter(Boolean), dx, dy);
            log('셀 이동:', cellArray.length, '개, dx:', dx, 'dy:', dy);
        } catch (e) {
            log('셀 이동 실패:', e);
        }
    }

    /**
     * 셀 리사이즈
     * @param {mxGraph} graph
     * @param {mxCell} cell - 리사이즈할 셀
     * @param {Object} bounds - { x, y, width, height }
     */
    function resizeCell(graph, cell, bounds) {
        if (!graph || !cell || !bounds) return;
        try {
            const geo = new mxGeometry(
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height
            );
            graph.getModel().setGeometry(cell, geo);
            log('셀 리사이즈:', cell.id);
        } catch (e) {
            log('셀 리사이즈 실패:', e);
        }
    }

    /**
     * 드래그 앤 드롭 활성화/비활성화
     * @param {mxGraph} graph
     * @param {boolean} enabled
     */
    function setDragEnabled(graph, enabled) {
        if (!graph) return;
        try {
            graph.setCellsMovable(enabled);
            log('드래그 활성화:', enabled);
        } catch (e) {
            log('드래그 설정 실패:', e);
        }
    }

    /**
     * 리사이즈 활성화/비활성화
     * @param {mxGraph} graph
     * @param {boolean} enabled
     */
    function setResizeEnabled(graph, enabled) {
        if (!graph) return;
        try {
            graph.setCellsResizable(enabled);
            log('리사이즈 활성화:', enabled);
        } catch (e) {
            log('리사이즈 설정 실패:', e);
        }
    }

    // 모듈 export
    ns.MxGraph.drag.init = init;
    ns.MxGraph.drag.snapToGrid = snapToGrid;
    ns.MxGraph.drag.snapCellToGrid = snapCellToGrid;
    ns.MxGraph.drag.moveCells = moveCells;
    ns.MxGraph.drag.resizeCell = resizeCell;
    ns.MxGraph.drag.setDragEnabled = setDragEnabled;
    ns.MxGraph.drag.setResizeEnabled = setResizeEnabled;
    ns.MxGraph.drag.GRID_SIZE = GRID_SIZE;

    log('MxDragHandler 모듈 로드 완료');
})();
