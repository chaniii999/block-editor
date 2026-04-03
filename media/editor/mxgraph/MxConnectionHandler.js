/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxConnectionHandler.js - mxGraph connection handling
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.connection = ns.MxGraph.connection || {};

    function log(prefix, ...args) {
        try {
            console.log(`[MxConnectionHandler] ${prefix}`, ...args);
        } catch (_) {}
    }

    let connectionMode = false;
    let _iconDragActive = false;

    let _lastMouseX = 300;
    let _lastMouseY = 300;
    document.addEventListener('mousemove', (ev) => {
        _lastMouseX = ev.clientX;
        _lastMouseY = ev.clientY;
    }, { passive: true });
    document.addEventListener('mouseup', (ev) => {
        _lastMouseX = ev.clientX;
        _lastMouseY = ev.clientY;
    }, { passive: true });

    function init(graph) {
        if (!graph) return;

        graph.setConnectable(true);

        const connectionHandler = graph.connectionHandler;
        if (connectionHandler) {
            connectionHandler.connectImage = null;

            connectionHandler.validateConnection = function (source, target) {
                if (source === target) return 'Cannot connect to itself.';
                if (!graph.getModel().isVertex(source) || !graph.getModel().isVertex(target)) {
                    return 'Only vertices can be connected.';
                }
                return null;
            };

            // 연결 아이콘 버튼을 통한 드래그만 허용, 노드 중앙 직접 클릭 드래그 차단
            const originalIsValidSource = connectionHandler.isValidSource;
            connectionHandler.isValidSource = function(cell, me) {
                if (!_iconDragActive) {
                    return false;
                }
                return originalIsValidSource ? originalIsValidSource.apply(this, arguments) : true;
            };
        }

        // 선택(클릭) 시에만 연결 아이콘이 표시되도록 mxVertexHandler 확장
        const CONNECT_ICON_URI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxNiAxNicgd2lkdGg9JzE2JyBoZWlnaHQ9JzE2Jz48cmVjdCB4PScwLjUnIHk9JzAuNScgd2lkdGg9JzE1JyBoZWlnaHQ9JzE1JyByeD0nMicgZmlsbD0nI2ZmZmZmZicgc3Ryb2tlPScjZDNkM2QzJyBzdHJva2Utd2lkdGg9JzEnLz48cGF0aCBkPSdNNCAxMiBMMTIgNCBNMTIgNCBMOCA0IE0xMiA0IEwxMiA4JyBmaWxsPSdub25lJyBzdHJva2U9JyMwMDUyY2MnIHN0cm9rZS13aWR0aD0nMS41JyBzdHJva2UtbGluZWNhcD0ncm91bmQnIHN0cm9rZS1saW5lam9pbj0ncm91bmQnLz48Y2lyY2xlIGN4PSc0JyBjeT0nMTInIHI9JzEnIGZpbGw9JyMwMDUyY2MnLz48L3N2Zz4=";
        const originalCreateHandler = graph.createHandler;
        graph.createHandler = function(state) {
            const handler = originalCreateHandler.apply(this, arguments);
            // Vertex가 선택되었을 때만 처리 (Edge 제외)
            if (handler && graph.getModel().isVertex(state.cell)) {
                // mxVertexHandler 생성자에서 init()이 이미 호출되므로, 생성 직후 아이콘을 추가
                handler.connectIcon = new mxImageShape(
                    new mxRectangle(0, 0, 16, 16),
                    CONNECT_ICON_URI
                );
                handler.connectIcon.dialect = graph.dialect;
                handler.connectIcon.preserveImageAspect = false;
                handler.connectIcon.init(graph.getView().getOverlayPane());
                handler.connectIcon.node.style.cursor = mxConstants.CURSOR_CONNECT;

                const getState = () => handler.state;
                const mouseDown = (evt) => {
                    if (!mxEvent.isConsumed(evt)) {
                        // 연결 아이콘 버튼 클릭 시 플래그 설정
                        _iconDragActive = true;
                        // connectionHandler의 상태를 현재 노드로 설정하여 드래그 연결 시작
                        if (graph.connectionHandler) {
                            graph.connectionHandler.previous = handler.state;
                            graph.connectionHandler.currentState = handler.state;
                            graph.connectionHandler.error = null;
                            graph.connectionHandler.icon = handler.connectIcon;
                        }
                        graph.fireMouseEvent(mxEvent.MOUSE_DOWN, new mxMouseEvent(evt, handler.state));
                    }
                };
                mxEvent.redirectMouseEvents(handler.connectIcon.node, graph, getState, mouseDown);

                // 초기 위치 설정
                if (handler.state) {
                    const s = handler.state;
                    handler.connectIcon.bounds.x = s.x + s.width / 2 - 8;
                    handler.connectIcon.bounds.y = s.y - 16 - 5;
                    handler.connectIcon.redraw();
                }

                const originalRedraw = handler.redraw;
                handler.redraw = function() {
                    originalRedraw.apply(this, arguments);
                    if (this.connectIcon && this.state) {
                        const s = this.state;
                        // 중앙 상단 (Top-Center)에 5px 여백을 두고 배치
                        this.connectIcon.bounds.x = s.x + s.width / 2 - 8;
                        this.connectIcon.bounds.y = s.y - 16 - 5;
                        this.connectIcon.redraw();
                    }
                };

                const originalDestroy = handler.destroy;
                handler.destroy = function() {
                    if (this.connectIcon) {
                        this.connectIcon.destroy();
                        this.connectIcon = null;
                    }
                    originalDestroy.apply(this, arguments);
                };
            }
            return handler;
        };

        // 연결 완료 또는 취소 시 플래그 해제
        graph.connectionHandler.addListener(mxEvent.CONNECT, (_sender, evt) => {
            _iconDragActive = false;
            const edge = evt.getProperty('cell');
            if (!edge) return;

            function resolveNodeCell(cell) {
                if (!cell) return null;
                if (cell._nodeData?.id) return cell;

                const parentId = cell._nodeData?.parentId;
                if (parentId) {
                    const allCells = graph.getModel().cells;
                    for (const key of Object.keys(allCells || {})) {
                        const c = allCells[key];
                        if (c?._nodeData?.id === parentId) return c;
                    }
                }

                const parent = graph.getModel().getParent(cell);
                if (parent?._nodeData?.id) return parent;
                return null;
            }

            const srcCell = resolveNodeCell(edge.source);
            const tgtCell = resolveNodeCell(edge.target);

            const sourceId = srcCell?._nodeData?.qualifiedName || srcCell?._nodeData?.name || srcCell?._nodeData?.id;
            const targetId = tgtCell?._nodeData?.qualifiedName || tgtCell?._nodeData?.name || tgtCell?._nodeData?.id;
            const sourceName = srcCell?._nodeData?.name;
            const targetName = tgtCell?._nodeData?.name;
            const sourceKind = srcCell?._nodeData?.kind || srcCell?._nodeData?.type;
            const targetKind = tgtCell?._nodeData?.kind || tgtCell?._nodeData?.type;

            const srcQN = srcCell?._nodeData?.qualifiedName || srcCell?._nodeData?.id || '';
            const sourceParent = srcCell?._nodeData?.parent
                || (typeof srcQN === 'string' && srcQN.includes('::')
                    ? srcQN.substring(0, srcQN.lastIndexOf('::'))
                    : undefined);

            if (!sourceId || !targetId) {
                log('resolveNodeCell failed: missing sourceId/targetId');
                return;
            }

            ns.MxGraph.edgeTypeMenu?.show({
                x: _lastMouseX,
                y: _lastMouseY,
                sourceKind,
                targetKind,
                onSelect: (selectedTool) => {
                    const tool = (selectedTool && typeof selectedTool === 'object')
                        ? selectedTool
                        : {
                            id: String(selectedTool || ''),
                            type: String(selectedTool || ''),
                            edgeType: String(selectedTool || 'dependency'),
                            drawTemporaryEdge: true,
                        };

                    const edgeType = String(tool.edgeType || tool.type || 'dependency');
                    const keepTemporaryEdge = tool.drawTemporaryEdge !== false;

                    if (keepTemporaryEdge) {
                        try {
                            const newStyle = ns.MxGraph.styles?.getEdgeStyle?.(edgeType);
                            if (newStyle) {
                                graph.getModel().beginUpdate();
                                try {
                                    graph.getModel().setStyle(edge, newStyle);
                                } finally {
                                    graph.getModel().endUpdate();
                                }
                            }
                        } catch (_) {}
                    } else {
                        try {
                            graph.getModel().beginUpdate();
                            try {
                                graph.getModel().remove(edge);
                            } finally {
                                graph.getModel().endUpdate();
                            }
                        } catch (_) {}
                    }

                    ns.Editor.post?.({
                        type: 'connection-created',
                        sourceId,
                        targetId,
                        sourceName,
                        targetName,
                        sourceParent,
                        sourceKind,
                        targetKind,
                        edgeId: edge.id,
                        edgeType,
                        edgeToolId: String(tool.id || tool.type || ''),
                    });
                },
                onCancel: () => {
                    try {
                        graph.getModel().beginUpdate();
                        try {
                            graph.getModel().remove(edge);
                        } finally {
                            graph.getModel().endUpdate();
                        }
                    } catch (_) {}
                },
            });
        });

        // 연결 취소/리셋 시에도 플래그 해제
        graph.connectionHandler.addListener(mxEvent.RESET, () => {
            _iconDragActive = false;
        });

        log('connection handler initialized');
    }

    function setConnectionMode(graph, enabled) {
        if (!graph) return;
        connectionMode = enabled;
        graph.setConnectable(enabled);
        log('connection mode:', enabled);
    }

    function isConnectionMode() {
        return connectionMode;
    }

    function createEdge(graph, source, target, style = '', label = '') {
        if (!graph || !source || !target) return null;
        try {
            const parent = graph.getDefaultParent();
            const model = graph.getModel();
            model.beginUpdate();
            try {
                return graph.insertEdge(parent, null, label, source, target, style);
            } finally {
                model.endUpdate();
            }
        } catch (e) {
            log('createEdge failed:', e);
            return null;
        }
    }

    function createEdgeById(graph, sourceId, targetId, style = '', label = '') {
        if (!graph) return null;
        const model = graph.getModel();
        const source = model.getCell(sourceId);
        const target = model.getCell(targetId);
        if (!source || !target) return null;
        return createEdge(graph, source, target, style, label);
    }

    function removeEdge(graph, edge) {
        if (!graph || !edge) return;
        try {
            const model = graph.getModel();
            model.beginUpdate();
            try {
                graph.removeCells([edge]);
            } finally {
                model.endUpdate();
            }
        } catch (e) {
            log('removeEdge failed:', e);
        }
    }

    function setEdgeStyle(graph, edge, style) {
        if (!graph || !edge) return;
        try {
            graph.setCellStyle(style, [edge]);
        } catch (e) {
            log('setEdgeStyle failed:', e);
        }
    }

    function setupConnectionPoints(graph) {
        if (!graph) return;
        graph.setAllowDanglingEdges(false);
        graph.setDisconnectOnMove(false);
        
        // 1. 모든 vertex는 원칙적으로 connectable 상태여야 드래그 이벤트가 시작될 수 있습니다.
        // compartment도 드래그의 시작점이 될 수 있어야 하므로 true를 반환합니다.
        graph.connectionHandler.isConnectableCell = function (cell) {
            return graph.getModel().isVertex(cell);
        };
        
        // 2. compartment 위에서 선을 긋기 시작하거나 끝낼 때, 실제 대상(terminal)을 부모 노드로 변경합니다.
        // 이렇게 하면 논리적인 연결이 compartment가 아닌 부모 노드에 맺어집니다.
        const originalGetTerminalForPort = graph.getTerminalForPort;
        graph.getTerminalForPort = function(cell, source) {
            if (cell && (cell._isCompartmentItem || (cell.style && cell.style.includes('connectable=0')))) {
                const parent = this.getModel().getParent(cell);
                if (parent && this.getModel().isVertex(parent)) {
                    return parent;
                }
            }
            return originalGetTerminalForPort.apply(this, arguments);
        };

        // 3. 대상 마커(상대방 노드를 가리킬 때 뜨는 초록색 하이라이트)에서도 부모를 타겟으로 잡도록 오버라이드
        if (graph.connectionHandler.marker) {
            const originalMarkerGetCell = graph.connectionHandler.marker.getCell;
            graph.connectionHandler.marker.getCell = function(me) {
                let cell = originalMarkerGetCell ? originalMarkerGetCell.apply(this, arguments) : me.getCell();
                if (cell && (cell._isCompartmentItem || (cell.style && cell.style.includes('connectable=0')))) {
                    const parent = graph.getModel().getParent(cell);
                    if (parent && graph.getModel().isVertex(parent)) {
                        return parent;
                    }
                }
                return cell;
            };
        }
    }

    ns.MxGraph.connection.init = init;
    ns.MxGraph.connection.setConnectionMode = setConnectionMode;
    ns.MxGraph.connection.isConnectionMode = isConnectionMode;
    ns.MxGraph.connection.createEdge = createEdge;
    ns.MxGraph.connection.createEdgeById = createEdgeById;
    ns.MxGraph.connection.removeEdge = removeEdge;
    ns.MxGraph.connection.setEdgeStyle = setEdgeStyle;
    ns.MxGraph.connection.setupConnectionPoints = setupConnectionPoints;

    log('module loaded');
})();
