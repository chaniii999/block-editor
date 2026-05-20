/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxSelectionManager.js - mxGraph 선택 관리
 * selab-practice의 useSelectionState.js 참조
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.selection = ns.MxGraph.selection || {};

    // 로그 함수
    function log(prefix, ...args) {
        try {
            console.log(`[MxSelectionManager] ${prefix}`, ...args);
        } catch (_) {}
    }

    // 선택 상태
    let selectedCells = [];
    let selectionChangeCallbacks = [];

    /**
     * 선택된 셀 가져오기
     * @param {mxGraph} graph
     * @returns {Array} 선택된 셀 배열
     */
    function getSelectedCells(graph) {
        if (!graph) return [];
        try {
            return graph.getSelectionCells() || [];
        } catch (_) {
            return [];
        }
    }

    /**
     * 셀 선택
     * @param {mxGraph} graph
     * @param {mxCell|Array} cells - 선택할 셀 또는 셀 배열
     */
    function selectCells(graph, cells) {
        if (!graph) return;
        try {
            const cellArray = Array.isArray(cells) ? cells : [cells];
            graph.setSelectionCells(cellArray.filter(Boolean));
            log('셀 선택:', cellArray.length, '개');
        } catch (e) {
            log('셀 선택 실패:', e);
        }
    }

    /**
     * ID로 셀 선택
     * @param {mxGraph} graph
     * @param {string} id - 셀 ID
     */
    function selectById(graph, id) {
        if (!graph || !id) return;
        try {
            const model = graph.getModel();
            const cell = model.getCell(id);
            if (cell) {
                graph.setSelectionCell(cell);
                log('ID로 셀 선택:', id);
            }
        } catch (e) {
            log('ID로 셀 선택 실패:', e);
        }
    }

    /**
     * 선택 해제
     * @param {mxGraph} graph
     */
    function clearSelection(graph) {
        if (!graph) return;
        try {
            graph.clearSelection();
            log('선택 해제');
        } catch (e) {
            log('선택 해제 실패:', e);
        }
    }

    /**
     * 모든 셀 선택
     * @param {mxGraph} graph
     */
    function selectAll(graph) {
        if (!graph) return;
        try {
            graph.selectAll();
            log('모든 셀 선택');
        } catch (e) {
            log('모든 셀 선택 실패:', e);
        }
    }

    /**
     * 선택 변경 콜백 등록
     * @param {Function} callback - 콜백 함수 (cells) => void
     * @returns {Function} 콜백 제거 함수
     */
    function onSelectionChange(callback) {
        if (typeof callback !== 'function') return null;
        selectionChangeCallbacks.push(callback);
        return () => {
            const idx = selectionChangeCallbacks.indexOf(callback);
            if (idx >= 0) selectionChangeCallbacks.splice(idx, 1);
        };
    }

    /**
     * 선택 변경 이벤트 발생
     * @param {Array} cells - 선택된 셀 배열
     */
    function notifySelectionChange(cells) {
        selectedCells = cells || [];
        selectionChangeCallbacks.forEach(cb => {
            try {
                cb(selectedCells);
            } catch (_) {}
        });
    }

    /**
     * 선택 관리자 초기화
     * @param {mxGraph} graph
     */
    function init(graph) {
        if (!graph) return;

        // 선택 변경 이벤트 리스너
        const selectionModel = graph.getSelectionModel?.();
        if (selectionModel) {
            selectionModel.addListener(mxEvent.CHANGE, () => {
                const cells = getSelectedCells(graph);
                notifySelectionChange(cells);
                
                // 속성 패널 업데이트
                updateAttributePanel(cells);
            });
        }

        log('선택 관리자 초기화 완료');
    }

    /**
     * 속성 패널 업데이트
     * @param {Array} cells - 선택된 셀 배열
     */
    function updateAttributePanel(cells) {
        if (cells.length === 0) {
            return;
        }

        if (cells.length === 1) {
            let cell = cells[0];
            
            // doc compartment 항목을 클릭한 경우, 부모 노드의 속성을 표시하도록 처리
            if (cell._isCompartmentItem && cell._nodeData && cell._nodeData.compartmentKey === 'doc') {
                const parentCell = cell.getParent();
                if (parentCell && parentCell._nodeData) {
                    cell = parentCell;
                }
            }

            const data = cell._nodeData || cell._edgeData;
            if (data && ns.Editor?.attributes?.render) {
                // SVG 버전과 동일하게 속성 패널 렌더링
                const app = ns.Editor._app;
                ns.Editor.attributes.render(app, data);
                log('속성 패널 업데이트:', data.name || data.id);
            }
        } else {
            // 다중 선택 시 패널 숨기기
            if (ns.Editor?.attributes?.render) {
                ns.Editor.attributes.render(null, null);
            }
            if (ns.Editor?.associationList?.hide) {
                ns.Editor.associationList.hide();
            }
        }
    }

    // 모듈 export
    ns.MxGraph.selection.getSelectedCells = getSelectedCells;
    ns.MxGraph.selection.selectCells = selectCells;
    ns.MxGraph.selection.selectById = selectById;
    ns.MxGraph.selection.clearSelection = clearSelection;
    ns.MxGraph.selection.selectAll = selectAll;
    ns.MxGraph.selection.onSelectionChange = onSelectionChange;
    ns.MxGraph.selection.init = init;

    log('MxSelectionManager 모듈 로드 완료');
})();
