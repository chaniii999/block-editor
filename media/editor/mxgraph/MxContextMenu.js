/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxContextMenu.js - ninja-keys 기반 우클릭 컨텍스트 메뉴
 *
 * 노드 타입별 동적 메뉴 생성:
 * - Package/빈 캔버스: 전체 SysML 타입 목록 (다이어그램 레벨 추가)
 * - Definition/Usage 노드: compartmentRules 기반 타입별 동적 메뉴
 *
 * 의존 모듈:
 * - MxContextMenuData.js: 상수/데이터 정의
 * - MxContextMenuUtils.js: 유틸리티 함수
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};

    const LOG_PREFIX = '[MxContextMenu]';
    function log(...args) {
        try { console.log(LOG_PREFIX, ...args); } catch (_) {}
    }

    // 데이터/유틸 모듈 참조
    function getData() {
        return ns.MxGraph.contextMenuData || {};
    }
    function getUtils() {
        return ns.MxGraph.contextMenuUtils || {};
    }

    // ── 상태 변수 ──

    var _ninjaEl = null;
    var _graph = null;
    var _cleanup = null;
    var _targetParentId = null;
    var _targetCompartment = null;
    var _targetCell = null;
    var _deleteTargetCell = null;
    var _useFullMenu = true;
    var _currentDynamicSections = null;
    var _pendingOpen = false;
    var _pendingData = null;
    var _popupGraphPoint = null;

    // ── 초기화 ──

    function init(graph, container) {
        if (!graph || !container) {
            log('init 실패: graph 또는 container 없음');
            return;
        }
        _graph = graph;

        const data = getData();
        const utils = getUtils();
        const DIAGRAM_SECTIONS = data.DIAGRAM_SECTIONS || [];
        const TOOLBAR_ICONS = data.TOOLBAR_ICONS || {};
        const TOOLBAR_STYLES = data.TOOLBAR_STYLES || '';

        // mxGraph popupMenuHandler 비활성화
        try {
            graph.popupMenuHandler.factoryMethod = null;
            graph.popupMenuHandler.enabled = false;
        } catch (e) {
            log('popupMenuHandler 비활성화 실패:', e);
        }

        // 브라우저 기본 contextmenu 전체 차단
        var onContextMenu = function (event) {
            event.preventDefault();
            event.stopPropagation();
        };
        document.addEventListener('contextmenu', onContextMenu, true);

        // mxGraph 마우스 리스너
        var mouseListener = {
            mouseDown: function (sender, me) {
                var event = me.getEvent();
                if (!mxEvent.isPopupTrigger(event)) return;

                _targetParentId = null;
                _targetCompartment = null;
                _targetCell = null;
                _deleteTargetCell = null;
                _useFullMenu = true;
                _popupGraphPoint = null;

                // 우클릭 시점의 그래프 논리 좌표 저장 (노드 생성 위치로 사용)
                // getGraphX/Y는 캔버스 픽셀을 반환할 수 있으므로 항상 논리 좌표 공식을 직접 계산
                try {
                    var evt = typeof me.getEvent === 'function' ? me.getEvent() : null;
                    if (evt && graph.container && graph.view) {
                        var rect = graph.container.getBoundingClientRect();
                        var sc = graph.view.scale || 1;
                        var tv = graph.view.translate || { x: 0, y: 0 };
                        _popupGraphPoint = {
                            x: (mxEvent.getClientX(evt) - rect.left) / sc - tv.x,
                            y: (mxEvent.getClientY(evt) - rect.top) / sc - tv.y,
                        };
                    }
                    log('[MxContextMenu] mouseDown _popupGraphPoint=', _popupGraphPoint);
                } catch (e) {
                    log('[MxContextMenu] mouseDown 좌표 계산 오류:', e);
                }

                var popupCell = null;
                try {
                    popupCell = typeof me.getCell === 'function' ? me.getCell() : null;
                } catch (_) {}
                var model = graph.getModel?.();
                var popupCellIsEdge = !!(popupCell && model?.isEdge?.(popupCell));
                var popupCellIsCompartmentItem = !!popupCell?._isCompartmentItem;
                var popupCellHasNodeData = !!popupCell?._nodeData;
                var cell = utils.resolvePopupNodeCell(graph, me);
                _deleteTargetCell = (popupCellIsEdge || popupCellIsCompartmentItem || popupCellHasNodeData) ? popupCell : cell;
                _targetCell = (popupCellIsEdge || popupCellIsCompartmentItem) ? popupCell : (cell || popupCell);
                var menuCell = cell || _targetCell;
                if (popupCellIsEdge) {
                    try {
                        graph.setSelectionCell(popupCell);
                    } catch (_) {}
                } else if (_targetCell) {
                    try {
                        graph.setSelectionCell(_targetCell);
                    } catch (_) {}
                }

                if (menuCell) {
                    var targetCell = menuCell;
                    var nodeData = targetCell._nodeData;
                    while (!nodeData && targetCell.parent) {
                        targetCell = targetCell.parent;
                        nodeData = targetCell._nodeData;
                    }
                    var cellType = utils.normalizeCellType(String(nodeData?.type || nodeData?.kind || ''));
                    var cellTypeLower = cellType.toLowerCase();

                    // IfAction/ElseIfAction/ElseAction은 부모 노드로 올라감
                    var isIfElseCellType = cellTypeLower === 'ifactionusage' || cellTypeLower.includes('ifaction') ||
                        cellTypeLower === 'elseifaction' || cellTypeLower === 'elseaction';
                    if (isIfElseCellType) {
                        var parentCell = targetCell.parent;
                        while (parentCell) {
                            var parentNodeData = parentCell._nodeData;
                            if (parentNodeData) {
                                nodeData = parentNodeData;
                                cellType = utils.normalizeCellType(String(nodeData?.type || nodeData?.kind || ''));
                                cellTypeLower = cellType.toLowerCase();
                                break;
                            }
                            parentCell = parentCell.parent;
                        }
                    }

                    _targetParentId = nodeData?.qualifiedName || nodeData?.id || null;

                    if (cellTypeLower.includes('package')) {
                        _useFullMenu = true;
                    } else {
                        var dynamicSections = utils.buildSectionsForNodeType(cellType);
                        if (dynamicSections) {
                            _useFullMenu = false;
                            _currentDynamicSections = dynamicSections;
                            var dynamicData = utils.buildHistoryData().concat(utils.buildNinjaDataFromSections(dynamicSections));
                            if (_ninjaEl) {
                                _ninjaEl.data = dynamicData;
                            } else {
                                _pendingData = dynamicData;
                            }
                        } else {
                            _useFullMenu = true;
                            _currentDynamicSections = null;
                            _pendingData = null;
                        }
                    }
                } else {
                    _useFullMenu = true;
                }

                if (_useFullMenu) {
                    _pendingData = null;
                    _currentDynamicSections = null;
                    if (_ninjaEl) {
                        _ninjaEl.data = utils.buildFullData(DIAGRAM_SECTIONS);
                    }
                }

                me.consume();

                if (_ninjaEl && typeof _ninjaEl.open === 'function') {
                    if (typeof _ninjaEl._updateToolbarState === 'function') {
                        _ninjaEl._updateToolbarState();
                    }
                    _ninjaEl.open();
                } else {
                    _pendingOpen = true;
                }
            },
            mouseMove: function () {},
            mouseUp: function () {},
        };
        graph.addMouseListener(mouseListener);

        _cleanup = function () {
            document.removeEventListener('contextmenu', onContextMenu, true);
            try { graph.removeMouseListener(mouseListener); } catch (_) {}
            if (_ninjaEl && _ninjaEl.parentNode) {
                _ninjaEl.parentNode.removeChild(_ninjaEl);
            }
            _ninjaEl = null;
            _graph = null;
        };

        // ninja-keys 초기화
        function initNinjaEl() {
            if (_ninjaEl) return;
            _ninjaEl = document.createElement('ninja-keys');
            _ninjaEl.setAttribute('noAutoLoadMdIcons', '');
            _ninjaEl.setAttribute('placeholder', 'Search elements to add...');
            _ninjaEl.setAttribute('openHotkey', '');
            document.body.appendChild(_ninjaEl);

            _ninjaEl.data = _pendingData || utils.buildFullData(DIAGRAM_SECTIONS);
            _pendingData = null;

            // shadow DOM에 아이콘 툴바 삽입
            requestAnimationFrame(function () {
                try {
                    var shadow = _ninjaEl.shadowRoot;
                    if (!shadow) return;

                    var styleEl = document.createElement('style');
                    styleEl.textContent = TOOLBAR_STYLES;
                    shadow.insertBefore(styleEl, shadow.firstChild);

                    var toolbar = document.createElement('div');
                    toolbar.className = 'ninja-toolbar';
                    toolbar.id = 'ninja-toolbar';

                    // 편집 버튼
                    var editBtn = document.createElement('button');
                    editBtn.className = 'ninja-toolbar-btn';
                    editBtn.title = 'Rename (F2)';
                    editBtn.innerHTML = TOOLBAR_ICONS.edit;
                    editBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        try { _ninjaEl.close(); } catch (_) {}
                        if (_graph && _targetCell) {
                            if (_graph.isCellEditable(_targetCell) && (_targetCell._nodeData || _targetCell._edgeData)) {
                                log('편집 버튼 클릭 - 편집 시작:', _targetCell._nodeData?.name || _targetCell._edgeData?.label);
                                ns.MxGraph._isTypingEvent = false;
                                _graph.startEditingAtCell(_targetCell);
                            }
                        }
                    });
                    toolbar.appendChild(editBtn);

                    // 삭제 버튼
                    var trashBtn = document.createElement('button');
                    trashBtn.className = 'ninja-toolbar-btn';
                    trashBtn.title = 'Delete (Del)';
                    trashBtn.innerHTML = TOOLBAR_ICONS.trash;
                    trashBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        e.preventDefault();
                        var cellToDelete = _deleteTargetCell || _targetCell;
                        var cellData = cellToDelete ? (cellToDelete._nodeData || cellToDelete._edgeData) : null;
                        log('삭제 버튼 클릭:', cellData?.name || cellData?.declaredName || cellToDelete?.id);
                        
                        if (cellToDelete && ns.MxGraph?.toolbar?.deleteCell) {
                            try {
                                ns.MxGraph.toolbar.deleteCell(_graph, cellToDelete);
                            } catch (_) {}
                        }
                        
                        try { _ninjaEl.close(); } catch (_) {}
                    });
                    toolbar.appendChild(trashBtn);

                    // Collapse/Expand 버튼
                    var foldBtn = document.createElement('button');
                    foldBtn.className = 'ninja-toolbar-btn';
                    foldBtn.title = 'Collapse/Expand';
                    foldBtn.innerHTML = TOOLBAR_ICONS.collapse;
                    foldBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        e.preventDefault();
                        try { _ninjaEl.close(); } catch (_) {}

                        var cell = _targetCell;
                        if (!cell || !cell._nodeData) return;

                        var foldManager = ns.MxGraph?.fold;
                        if (!foldManager || typeof foldManager.toggleFold !== 'function') {
                            log('fold 모듈 없음');
                            return;
                        }

                        // diagramDataRef에서 현재 diagramData 가져오기
                        var diagramDataRef = _graph?._foldDataRef;
                        var diagramData = diagramDataRef?.current;
                        if (!diagramData) {
                            log('diagramData 없음');
                            return;
                        }

                        log('Collapse/Expand 버튼 클릭:', cell._nodeData?.name || cell._nodeData?.id);
                        foldManager.toggleFold(_graph, cell, diagramData);
                    });
                    toolbar.appendChild(foldBtn);

                    var modalContent = shadow.querySelector('.modal-content');
                    if (modalContent && modalContent.firstChild) {
                        modalContent.insertBefore(toolbar, modalContent.firstChild);
                    }

                    _ninjaEl._updateToolbarState = function () {
                        var hasSelection = _targetParentId !== null || !!_targetCell || !!_deleteTargetCell;
                        editBtn.disabled = !_targetCell;
                        trashBtn.disabled = !hasSelection;

                        // fold 버튼 상태 업데이트
                        var foldManager = ns.MxGraph?.fold;
                        var nodeData = _targetCell?._nodeData;
                        var isFoldable = nodeData && foldManager?.isFoldTarget?.(nodeData);
                        foldBtn.disabled = !isFoldable;

                        if (isFoldable) {
                            var cellId = String(nodeData.id || _targetCell.getId?.() || '');
                            var isCollapsed = foldManager.isCollapsed?.(cellId);
                            // collapsed 상태면 expand 아이콘, 아니면 collapse 아이콘
                            foldBtn.innerHTML = isCollapsed ? TOOLBAR_ICONS.expand : TOOLBAR_ICONS.collapse;
                            foldBtn.title = isCollapsed ? 'Expand' : 'Collapse';
                        } else {
                            foldBtn.innerHTML = TOOLBAR_ICONS.collapse;
                            foldBtn.title = 'Collapse/Expand';
                        }
                    };
                } catch (err) {
                    log('툴바 삽입 실패:', err);
                }
            });

            if (_pendingOpen) {
                _pendingOpen = false;
                try { _ninjaEl.open(); } catch (_) {}
            }

            // actionsSelected 이벤트 핸들러
            _ninjaEl.addEventListener('actionsSelected', function (event) {
                var action = event.detail;
                if (!action) return;

                if (action.children && action.children.length > 0) return;

                if (typeof action.handler === 'function') {
                    action.handler();
                    try {
                        if (typeof _ninjaEl.close === 'function') _ninjaEl.close();
                    } catch (_) {}
                    return;
                }

                utils.pushHistory(action);

                var type = action._type || action.keywords || (action.id || '').split('/').pop() || '';
                if (!type) return;

                var baseName = action._nameOverride || utils.typeToBaseName(type);
                var name = action._nameOverride ? baseName : ns.Editor._nextAutoName(baseName);

                var parent = _targetParentId || null;
                if (!parent) {
                    try {
                        if (ns.Editor.interactions && typeof ns.Editor.interactions.getSelectedElementId === 'function') {
                            parent = ns.Editor.interactions.getSelectedElementId() || null;
                        }
                    } catch (_) {}
                }

                var compartment = action._compartment || action._nameOverride_compartment || null;

                var element = { type: type, name: name };
                if (parent) element.parent = parent;
                if (compartment) element.compartment = compartment;
                if (_popupGraphPoint) element.position = { x: _popupGraphPoint.x, y: _popupGraphPoint.y };

                log('add 메시지 전송 (popupGraphPoint=', _popupGraphPoint, '):', element);

                try {
                    if (typeof ns.Editor.post === 'function') {
                        ns.Editor.post({ type: 'add', element: element });
                    } else if (window.vscode && typeof window.vscode.postMessage === 'function') {
                        window.vscode.postMessage({ type: 'add', element: element });
                    }
                } catch (err) {
                    log('add 메시지 전송 실패:', err);
                }

                try {
                    if (_ninjaEl) {
                        var activeSections = _useFullMenu ? DIAGRAM_SECTIONS : _currentDynamicSections;
                        if (activeSections) {
                            _ninjaEl.data = utils.buildHistoryData().concat(utils.buildNinjaDataFromSections(activeSections));
                        }
                    }
                } catch (_) {}
                try {
                    if (typeof _ninjaEl.close === 'function') _ninjaEl.close();
                } catch (_) {}
            });
        }

        if (customElements.get('ninja-keys')) {
            initNinjaEl();
        } else {
            window.addEventListener('ninja-keys-ready', function () {
                initNinjaEl();
            }, { once: true });
        }
    }

    function destroy() {
        if (typeof _cleanup === 'function') {
            _cleanup();
            _cleanup = null;
        }
    }

    // ── 네임스페이스 등록 ──

    ns.MxGraph.contextMenu = {
        init: init,
        destroy: destroy,
    };

    console.log('[MxContextMenu] 모듈 로드 완료');
})();
