/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxEventHandler.js - mxGraph 이벤트 핸들러
 * selab-practice의 useGraphEvents.js 참조
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.events = ns.MxGraph.events || {};

    // 로그 함수
    function log(prefix, ...args) {
        try {
            console.log(`[MxEventHandler] ${prefix}`, ...args);
        } catch (_) {}
    }

    // 등록된 리스너 제거 함수 목록
    const removers = [];

    /**
     * 선택된 노드 및 연결된 에지 정보 수집
     * @param {mxGraph} graph
     * @returns {Object} { nodes: Array, edges: Array }
     */
    function collectSelectedElements(graph) {
        const cells = graph.getSelectionCells();
        const model = graph.getModel();
        const nodes = [];

        // 노드만 수집 (에지는 복사 대상에서 제외)
        cells.forEach((cell) => {
            if (cell._nodeData && !model.isEdge(cell)) {
                nodes.push({
                    id: cell._nodeData.qualifiedName || cell._nodeData.id,
                    type: cell._nodeData.type || cell._nodeData.kind || '',
                    name: cell._nodeData.declaredName || cell._nodeData.name || '',
                    parent: cell._nodeData.parent || cell._nodeData.parentQualifiedName || '',
                });
            }
        });

        // 에지 복사는 지원하지 않음 (노드만 복사 가능)
        return { nodes, edges: [] };
    }

    /**
     * 그래프 이벤트 리스너 등록
     * @param {mxGraph} graph - mxGraph 인스턴스
     * @param {string} eventName - 이벤트 이름 (예: 'click', 'cellsMoved')
     * @param {Function} handler - 이벤트 핸들러
     * @returns {Function} 리스너 제거 함수
     */
    function addGraphListener(graph, eventName, handler) {
        if (!graph || !handler) return null;
        try {
            graph.addListener(eventName, handler);
            const remove = () => {
                try {
                    graph.removeListener(handler);
                } catch (_) {}
            };
            removers.push(remove);
            return remove;
        } catch (e) {
            log('그래프 리스너 등록 실패:', e);
            return null;
        }
    }

    /**
     * 모델 이벤트 리스너 등록
     * @param {mxGraph} graph - mxGraph 인스턴스
     * @param {string} eventName - 이벤트 이름
     * @param {Function} handler - 이벤트 핸들러
     * @returns {Function} 리스너 제거 함수
     */
    function addModelListener(graph, eventName, handler) {
        if (!graph || !handler) return null;
        const model = graph.getModel?.();
        if (!model) return null;
        try {
            model.addListener(eventName, handler);
            const remove = () => {
                try {
                    model.removeListener(handler);
                } catch (_) {}
            };
            removers.push(remove);
            return remove;
        } catch (e) {
            log('모델 리스너 등록 실패:', e);
            return null;
        }
    }

    /**
     * 선택 모델 이벤트 리스너 등록
     * @param {mxGraph} graph - mxGraph 인스턴스
     * @param {string} eventName - 이벤트 이름
     * @param {Function} handler - 이벤트 핸들러
     * @returns {Function} 리스너 제거 함수
     */
    function addSelectionListener(graph, eventName, handler) {
        if (!graph || !handler) return null;
        const selectionModel = graph.getSelectionModel?.();
        if (!selectionModel) return null;
        try {
            selectionModel.addListener(eventName, handler);
            const remove = () => {
                try {
                    selectionModel.removeListener(handler);
                } catch (_) {}
            };
            removers.push(remove);
            return remove;
        } catch (e) {
            log('선택 리스너 등록 실패:', e);
            return null;
        }
    }

    /**
     * DOM 이벤트 리스너 등록
     * @param {HTMLElement} target - 대상 요소
     * @param {string} type - 이벤트 타입
     * @param {Function} handler - 이벤트 핸들러
     * @param {Object} options - addEventListener 옵션
     * @returns {Function} 리스너 제거 함수
     */
    function addDomListener(target, type, handler, options) {
        if (!target || !type || !handler) return null;
        try {
            target.addEventListener(type, handler, options);
            const remove = () => {
                try {
                    target.removeEventListener(type, handler, options);
                } catch (_) {}
            };
            removers.push(remove);
            return remove;
        } catch (e) {
            log('DOM 리스너 등록 실패:', e);
            return null;
        }
    }

    /**
     * 모든 등록된 리스너 제거
     */
    function removeAllListeners() {
        const toRemove = removers.splice(0);
        toRemove.forEach((fn) => {
            try {
                fn && fn();
            } catch (_) {}
        });
        log('모든 리스너 제거 완료:', toRemove.length);
    }

    /**
     * 기본 이벤트 핸들러 설정
     * @param {mxGraph} graph - mxGraph 인스턴스
     */
    function setupDefaultHandlers(graph) {
        if (!graph) return;

        // 선택 변경 이벤트
        addSelectionListener(graph, mxEvent.CHANGE, (sender, evt) => {
            const cells = graph.getSelectionCells();
            log('선택 변경:', cells.length, '개 셀');

            // VS Code에 선택 변경 알림
            if (cells.length === 1) {
                const cell = cells[0];
                const nodeData = cell._nodeData || cell._edgeData;
                if (nodeData) {
                    try {
                        ns.Editor.post?.({
                            type: 'selection',
                            id: nodeData.id,
                            name: nodeData.name,
                            elementType: nodeData.type,
                        });
                    } catch (_) {}
                }
            }
        });

        // 셀 이동 이벤트
        // 사용자 드래그에 의한 셀 이동만 저장 (renderModel 중 발생하는 이벤트는 무시)
        let _isRendering = false;
        ns.MxGraph._setRendering = (v) => { _isRendering = v; };

        addGraphListener(graph, mxEvent.CELLS_MOVED, (sender, evt) => {
            if (_isRendering) return; // renderModel 중에는 무시
            const cells = evt.getProperty('cells') || [];
            log('셀 이동 (사용자):', cells.length, '개');

            try {
                const nodesToSave = [];
                cells.forEach((cell) => {
                    const geo = cell.getGeometry?.();
                    if (geo && cell._nodeData) {
                        const qn = cell._nodeData.qualifiedName;
                        let rawId = cell._nodeData.id || '';
                        if (rawId.startsWith('view:')) rawId = rawId.slice(5);
                        if (rawId.includes('#')) rawId = rawId.split('#').pop();
                        const nodeId = qn || rawId;
                        if (nodeId) {
                            nodesToSave.push({ id: nodeId, x: geo.x, y: geo.y, width: geo.width, height: geo.height });
                        }
                    }
                });
                if (nodesToSave.length > 0) {
                    ns.Editor.post?.({ type: 'node-geometry', nodes: nodesToSave });
                }
            } catch (_) {}
        });

        // 셀 parent 변경 이벤트 (컨테이너 안으로/밖으로 드래그 시 SysML 구조 갱신)
        addGraphListener(graph, mxEvent.MOVE_CELLS, (sender, evt) => {
            const newParent = evt.getProperty('target');
            const cells = evt.getProperty('cells') || [];
            cells.forEach((cell) => {
                if (!cell._nodeData) return;
                try {
                    const memberId = cell._nodeData.id;
                    // memberId에서 원래 부모 QN 추출 (:: 이전 부분)
                    const memberParentQN = memberId.includes('::')
                        ? memberId.substring(0, memberId.lastIndexOf('::'))
                        : null;

                    if (newParent?._nodeData) {
                        // 이미 같은 부모의 자식이면 단순 이동 → reparent 불필요
                        if (memberParentQN === newParent._nodeData.id) return;

                        // 컨테이너 안으로 드래그: reparent
                        // MOVE_CELLS 시 cellGeo는 이미 새 부모 기준 상대 좌표로 변환됨
                        const cellGeo = graph.getCellGeometry(cell);
                        let dropPosition = null;
                        if (cellGeo) {
                            dropPosition = {
                                x: Math.round(cellGeo.x),
                                y: Math.round(cellGeo.y),
                                width: cellGeo.width,
                                height: cellGeo.height,
                            };
                        }
                        ns.Editor.post?.({
                            type: 'reparent',
                            memberId: memberId,
                            newParentId: newParent._nodeData.id,
                            dropPosition,
                        });
                    } else if (memberParentQN !== null) {
                        // top-level로 드래그 (부모에서 빼기)
                        // MOVE_CELLS 후 셀의 실제 부모가 여전히 원래 부모이면 단순 이동 → skip
                        const cellParent = graph.getModel().getParent(cell);
                        if (cellParent?._nodeData?.id === memberParentQN) return;

                        const geo = graph.getCellGeometry(cell);
                        ns.Editor.post?.({
                            type: 'reparent',
                            memberId: memberId,
                            newParentId: null,
                            currentParentId: memberParentQN,
                            dropPosition: geo
                                ? { x: geo.x, y: geo.y, width: geo.width, height: geo.height }
                                : null,
                        });
                    }
                    // memberId에 '::'가 없으면 이미 top-level → 무시
                } catch (_) {}
            });
        });

        // 셀 리사이즈 이벤트
        addGraphListener(graph, mxEvent.CELLS_RESIZED, (sender, evt) => {
            const cells = evt.getProperty('cells') || [];
            log('셀 리사이즈:', cells.length, '개');
        });

        // 더블클릭 이벤트 — 블록 에디터에서는 SysML 스크립트 에디터 팝업 불필요
        addGraphListener(graph, mxEvent.DOUBLE_CLICK, (sender, evt) => {
            evt.consume();
        });

        // 슬로우 클릭 편집: 이미 선택된 셀을 다시 클릭하면 인라인 편집 시작
        let _lastSelectedCellId = null;
        let _lastClickTime = 0;
        let _isPointerDraggingBackground = false;

        addGraphListener(graph, mxEvent.MOUSE_DOWN, (sender, evt) => {
            const me = evt.getProperty('event');
            const cell = me?.getCell?.() ?? evt.getProperty('cell');
            _isPointerDraggingBackground = !cell;
        });

        addGraphListener(graph, mxEvent.MOUSE_UP, () => {
            requestAnimationFrame(() => {
                _isPointerDraggingBackground = false;
            });
        });

        // 클릭 이벤트 - 빈 공간 클릭 시 선택 해제, 슬로우 클릭 편집
        addGraphListener(graph, mxEvent.CLICK, (sender, evt) => {
            const cell = evt.getProperty('cell');
            if (!cell) {
                if (_isPointerDraggingBackground) {
                    log('배경 드래그 직후 클릭 - 선택 해제 및 속성 패널 닫기 무시');
                    return;
                }
                // 빈 공간 클릭 시 선택 해제
                _lastSelectedCellId = null;
                graph.clearSelection();
                log('빈 공간 클릭 - 선택 해제');

                if (ns.Editor?.associationList?.hide) {
                    ns.Editor.associationList.hide();
                }

                // 속성 패널 닫기 (SVG 버전과 동일하게 처리)
                if (ns.Editor?.attributes?.render) {
                    ns.Editor.attributes.render(null, null);
                } else {
                    // fallback: 직접 hidden 클래스 추가
                    const container = document.querySelector('.attributes-panel');
                    if (container) container.classList.add('hidden');
                }
                return;
            }

            // 슬로우 클릭 편집: 이미 선택된 셀을 300ms 이후에 다시 클릭하면 편집 시작
            const now = Date.now();
            const cellId = cell.id;
            if (cellId && cellId === _lastSelectedCellId && now - _lastClickTime > 300) {
                if (graph.isCellEditable(cell) && (cell._nodeData || cell._edgeData)) {
                    log('슬로우 클릭 - 편집 시작:', cell._nodeData?.name || cell._edgeData?.label);
                    ns.MxGraph._isTypingEvent = false;
                    graph.startEditingAtCell(cell);
                }
            }
            _lastSelectedCellId = cellId;
            _lastClickTime = now;
        });

        // 키보드 이벤트 (Undo/Redo 단축키 및 인라인 편집)
        addDomListener(document, 'keydown', (e) => {
            if (!ns.MxGraph.history) return;

            // 입력 필드 등에서 타이핑 중일 때는 무시
            const target = e.target;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            if (isInput) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' || e.key === 'Z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        // Ctrl+Shift+Z : Redo
                        if (ns.MxGraph.history.canRedo()) {
                            ns.MxGraph.history.redo();
                        } else {
                            // mxGraph redo 없으면 extension에 위임 (.sysml 텍스트 redo)
                            try {
                                ns.Editor.post?.({ type: 'redo' });
                            } catch (_) {}
                        }
                    } else {
                        // Ctrl+Z : Undo
                        if (ns.MxGraph.history.canUndo()) {
                            ns.MxGraph.history.undo();
                        } else {
                            // mxGraph undo 없으면 extension에 위임 (.sysml 텍스트 undo)
                            try {
                                ns.Editor.post?.({ type: 'undo' });
                            } catch (_) {}
                        }
                    }
                } else if (e.key === 'y' || e.key === 'Y') {
                    // Ctrl+Y : Redo
                    e.preventDefault();
                    if (ns.MxGraph.history.canRedo()) {
                        ns.MxGraph.history.redo();
                    } else {
                        try {
                            ns.Editor.post?.({ type: 'redo' });
                        } catch (_) {}
                    }
                } else if (e.key === 'c' || e.key === 'C') {
                    // Ctrl+C: 선택된 노드+에지 복사
                    e.preventDefault();
                    const collected = collectSelectedElements(graph);
                    if (collected.nodes.length > 0) {
                        try {
                            ns.Editor.post?.({ type: 'copy-elements', nodes: collected.nodes, edges: collected.edges });
                        } catch (_) {}
                        log('Ctrl+C: copied', collected.nodes.length, 'nodes,', collected.edges.length, 'edges');
                    }
                } else if (e.key === 'v' || e.key === 'V') {
                    // Ctrl+V: 붙여넣기
                    e.preventDefault();
                    try {
                        ns.Editor.post?.({ type: 'paste-elements' });
                    } catch (_) {}
                    log('Ctrl+V: paste requested');
                } else if (e.key === 'd' || e.key === 'D') {
                    // Ctrl+D: 즉시 복제
                    e.preventDefault();
                    const collected = collectSelectedElements(graph);
                    if (collected.nodes.length > 0) {
                        try {
                            ns.Editor.post?.({ type: 'duplicate-elements', nodes: collected.nodes, edges: collected.edges });
                        } catch (_) {}
                        log('Ctrl+D: duplicate', collected.nodes.length, 'nodes,', collected.edges.length, 'edges');
                    }
                }
            } else if (!e.altKey && !e.ctrlKey && !e.metaKey) {
                // F2, Enter 또는 일반 문자 입력 시 즉시 편집 모드 진입
                const isPrintable = e.key.length === 1 && !e.key.match(/[\x00-\x1F]/);
                // IME 조합 시작 키(한글 등): keyCode 229 또는 isComposing
                const isIme = e.keyCode === 229 || e.key === 'Process' || e.isComposing;

                if (e.key === 'F2' || e.key === 'Enter' || isPrintable || isIme) {
                    const selectedCells = graph.getSelectionCells();
                    if (selectedCells.length === 1) {
                        const cell = selectedCells[0];
                        // 요소/엣지인지 확인 (포트 등은 편집 제외될 수 있음)
                        if (graph.isCellEditable(cell) && (cell._nodeData || cell._edgeData)) {
                            if (e.key === 'F2' || e.key === 'Enter') {
                                // F2/Enter: 기존 텍스트 전체선택 상태로 편집 시작
                                e.preventDefault();
                                ns.MxGraph._isTypingEvent = false;
                                graph.startEditingAtCell(cell);
                            } else {
                                // 타이핑으로 편집 시작:
                                // mxGraph cellEditor는 contenteditable div이므로 ta.value 조작 불가.
                                // getEditingValue가 ''를 반환하면 innerHTML이 비어 execCommand('selectAll')을 건너뜀.
                                // e.preventDefault()를 절대 호출하면 안 됨:
                                // keydown에서 preventDefault → keypress/input 이벤트 취소 → 브라우저가 첫 글자를 입력하지 못함.
                                // 올바른 흐름: startEditingAtCell(동기) → contenteditable focus → keydown 핸들러 반환 → 브라우저가 keypress/input을 contenteditable에 dispatch
                                ns.MxGraph._isTypingEvent = true;
                                graph.startEditingAtCell(cell);
                                ns.MxGraph._isTypingEvent = false;
                            }
                        }
                    }
                }
            }
        });

        log('기본 이벤트 핸들러 설정 완료');
    }

    // 모듈 export
    ns.MxGraph.events.addGraphListener = addGraphListener;
    ns.MxGraph.events.addModelListener = addModelListener;
    ns.MxGraph.events.addSelectionListener = addSelectionListener;
    ns.MxGraph.events.addDomListener = addDomListener;
    ns.MxGraph.events.removeAllListeners = removeAllListeners;
    ns.MxGraph.events.setupDefaultHandlers = setupDefaultHandlers;

    log('MxEventHandler 모듈 로드 완료');
})();
