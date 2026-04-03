/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxGraphWrapper.js - mxGraph 초기화 및 관리 래퍼
 * selab-practice의 useGraphInitialization.js, graphConfig.js 참조
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};

    // mxGraph 사용 가능 여부 확인
    function isAvailable() {
        return typeof mxGraph === 'function' && typeof mxClient !== 'undefined';
    }

    // 로그 함수
    function log(prefix, ...args) {
        try {
            console.log(`[MxGraphWrapper] ${prefix}`, ...args);
        } catch (_) {}
    }

    /**
     * 컨테이너에 격자 배경 적용
     * @param {HTMLElement} container
     */
    function applyGridBackground(container) {
        if (!container) return;
        
        // 흰색 배경만 적용 (격자 패턴 제거)
        container.style.backgroundColor = '#ffffff';
        container.style.backgroundImage = 'none';
        
        log('흰색 배경 적용 완료');
    }

    /**
     * mxGraph 인스턴스 생성 및 초기화
     * @param {HTMLElement} container - 그래프를 렌더링할 컨테이너
     * @returns {mxGraph|null} 생성된 그래프 인스턴스
     */
    function initGraph(container) {
        if (!isAvailable()) {
            log('❌ mxGraph를 사용할 수 없습니다.');
            return null;
        }

        if (!container) {
            log('❌ 컨테이너가 없습니다.');
            return null;
        }

        log('그래프 초기화 시작...');

        try {
            // 컨테이너에 격자 배경 적용
            applyGridBackground(container);
            
            // mxGraph 인스턴스 생성
            const graph = new mxGraph(container);

            // 기본 설정 적용
            setupGraphProperties(graph);
            setupStylesheet(graph);
            disableFolding(graph);
            setupSelectionStyles();

            // 디버그용 전역 노출
            exposeGraphGlobally(graph);

            log('✅ 그래프 초기화 완료');
            return graph;
        } catch (error) {
            log('❌ 그래프 초기화 실패:', error);
            return null;
        }
    }

    /**
     * 그래프 기본 속성 설정
     * @param {mxGraph} graph
     */
    function setupGraphProperties(graph) {
        // SELab: HTML 라벨 활성화 (스타일 적용용)
        graph.setHtmlLabels(true);
        
        // SELab: 자동 크기 조정 비활성화 (ELK 레이아웃이 크기 결정)
        graph.setAutoSizeCells(false);
        
        // SELab: 자식 추가 시 부모 자동 확장 비활성화 (ELK paddingTop이 유일한 크기 결정 소스)
        graph.extendParents = false;
        
        // SELab: 컨테이너 내부 클릭 시 자식 노드 우선 선택 (child-first)
        graph.swimlaneNesting = false;
        graph.graphHandler.getInitialCellForEvent = function (me) {
            // 클릭 지점에서 가장 깊은(최하위) 자식 셀을 직접 반환
            return graph.getCellAt(me.getGraphX(), me.getGraphY());
        };
        // 더블클릭 시 부모 셀로 선택 이동하는 기본 동작 비활성화
        graph.dblClick = function (evt, cell) {
            // 아무 동작 안 함 — 기본 escape(부모 선택) 방지
        };
        // DOM 레벨에서도 더블클릭 이벤트를 차단하여 MxGraph 내부 처리 방지
        graph.container.addEventListener('dblclick', function (evt) {
            evt.stopPropagation();
            evt.preventDefault();
        }, true);
        
        // 연결 가능
        graph.setConnectable(true);

        // 자식이 부모 경계 밖으로 나가도 이동 가능
        try { graph.setConstrainChildren(false); } catch (_) {}

        // 그리드 활성화
        try {
            graph.setGridEnabled(true);
            graph.gridSize = 10;
        } catch (_) {}

        // 인플레이스 텍스트 편집 활성화
        try { 
            graph.setCellsEditable(true); 

            // 이름만 편집하도록 getEditingValue 오버라이드
            const originalGetEditingValue = graph.getEditingValue;
            graph.getEditingValue = function(cell, event) {
                // 타이핑으로 편집을 시작한 경우, 기존 텍스트를 비워 브라우저의 기본 타이핑 이벤트가 
                // 첫 글자부터 온전히 입력(또는 한글 조합)되도록 함
                if (ns.MxGraph._isTypingEvent) {
                    // IfAction guard 편집 플래그 설정 (타이핑 시작에도 필요)
                    if (cell._nodeData) {
                        const typeReg = ns.Editor?.config?.typeRegistry || {};
                        const typeLower = String(cell._nodeData.type || cell._nodeData.kind || '').toLowerCase();
                        cell._editingGuard = !!(typeReg.isIfActionType?.(typeLower) && !typeReg.isElseActionType?.(typeLower));
                    }
                    return '';
                }
                
                if (cell._nodeData) {
                    // compartment item: declaredName만 편집 가능 (타입 정보 ':Real' 등 제외)
                    if (cell._isCompartmentItem && cell._nodeData.declaredName !== undefined) {
                        return cell._nodeData.declaredName || '';
                    }
                    // IfAction/ElseIfAction: guard 조건을 편집 대상으로 반환
                    const typeReg = ns.Editor?.config?.typeRegistry || {};
                    const typeLower = String(cell._nodeData.type || cell._nodeData.kind || '').toLowerCase();
                    if (typeReg.isIfActionType?.(typeLower) && !typeReg.isElseActionType?.(typeLower)) {
                        cell._editingGuard = true;
                        return cell._nodeData.guard || 'true';
                    }
                    cell._editingGuard = false;
                    return cell._nodeData.name || '';
                } else if (cell._edgeData) {
                    return cell._edgeData.label || '';
                }
                return originalGetEditingValue.apply(this, arguments);
            };

            // 편집 시작 시 contenteditable div에 밑줄 + 자동 줄바꿈 스타일 주입
            graph.addListener(mxEvent.EDITING_STARTED, function(sender, evt) {
                const ta = graph.cellEditor && graph.cellEditor.textarea;
                if (!ta) return;

                // 텍스트 바로 아래 밑줄 + 이탤릭
                ta.style.textDecoration = 'underline';
                ta.style.fontStyle = 'italic';
                ta.style.outline = 'none';
                ta.style.border = 'none';
                ta.style.boxSizing = 'border-box';

                // 노드 폭 내 자동 줄바꿈:
                // mxGraph가 resize()에서 whiteSpace/wordWrap을 덮어쓰므로 setTimeout으로 재적용
                setTimeout(function() {
                    if (!ta.isConnected) return;
                    ta.style.wordWrap = 'break-word';
                    ta.style.whiteSpace = 'pre-wrap';
                    ta.style.overflowWrap = 'break-word';
                    // 현재 width가 설정되어 있으면 maxWidth로도 제한
                    if (ta.style.width) {
                        ta.style.maxWidth = ta.style.width;
                    }
                }, 0);

                // Enter는 줄바꿈 대신 편집 종료(커밋)
                if (!ta._selabEnterCommits) {
                    ta.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && !e.isComposing) {
                            e.preventDefault();
                            e.stopPropagation();
                            graph.stopEditing(false);
                        }
                    });
                    ta._selabEnterCommits = true;
                }
            });

            // 편집 완료 시 서버로 메시지 전송하도록 labelChanged 오버라이드
            graph.labelChanged = function(cell, newValue, event) {
                if (cell._nodeData) {
                    // IfAction/ElseIfAction guard 편집 처리
                    if (cell._editingGuard) {
                        const oldGuard = cell._nodeData.guard || 'true';
                        const newGuard = String(newValue || '').trim();
                        if (newGuard && newGuard !== oldGuard) {
                            try {
                                const payload = {
                                    type: 'update-guard',
                                    id: cell._nodeData.id || cell._nodeData.qualifiedName,
                                    qualifiedName: cell._nodeData.qualifiedName || cell._nodeData.id,
                                    oldGuard: oldGuard,
                                    newGuard: newGuard,
                                };
                                if (typeof ns.Editor.post === 'function') ns.Editor.post(payload);
                                else window.vscode?.postMessage?.(payload);
                            } catch (e) {
                                console.error('[MxGraphWrapper] guard 변경 메시지 전송 실패', e);
                            }
                        }
                        cell._editingGuard = false;
                        return;
                    }

                    // compartment item: declaredName을 oldName으로 사용
                    const oldName = (cell._isCompartmentItem && cell._nodeData.declaredName !== undefined)
                        ? cell._nodeData.declaredName
                        : cell._nodeData.name;

                    // 'name:type' 형식 입력 시 name과 type 분리
                    // compartment item 또는 Usage 노드(action/item/part 등)에 적용
                    // 예: 'gearSetting:Integer' → parsedName='gearSetting', parsedType='Integer'
                    // Definition 노드(actionDef 등)는 파싱하지 않음
                    const nodeKind = String(cell._nodeData?.kind || '').toLowerCase();
                    const isUsageNode = cell._isCompartmentItem || nodeKind.endsWith('usage');
                    let parsedName = newValue;
                    let parsedType = null;
                    if (isUsageNode && typeof newValue === 'string' && newValue.includes(':')) {
                        const colonIdx = newValue.indexOf(':');
                        parsedName = newValue.substring(0, colonIdx).trim();
                        const typeStr = newValue.substring(colonIdx + 1).trim();
                        if (typeStr) parsedType = typeStr;
                    }

                    const nameChanged = parsedName !== undefined && parsedName !== oldName;
                    if (nameChanged || parsedType) {
                        try {
                            const payload = { 
                                type: 'rename-element', 
                                oldName: oldName, 
                                newName: nameChanged ? parsedName : oldName, 
                                id: cell._nodeData.id || cell._nodeData.qualifiedName, 
                                qualifiedName: cell._nodeData.qualifiedName || cell._nodeData.id 
                            };
                            if (parsedType) payload.typeName = parsedType;
                            if (typeof ns.Editor.post === 'function') ns.Editor.post(payload);
                            else window.vscode?.postMessage?.(payload);
                        } catch (e) {
                            console.error('[MxGraphWrapper] 라벨 변경 메시지 전송 실패', e);
                        }
                    }
                } else if (cell._edgeData) {
                    const oldLabel = cell._edgeData.label;
                    if (newValue !== undefined && newValue !== oldLabel) {
                        try {
                            const payload = {
                                type: 'update-property',
                                id: cell._edgeData.id,
                                qualifiedName: cell._edgeData.id,
                                propertyName: 'name', // Or 'label' depending on model schema
                                oldValue: oldLabel,
                                newValue: newValue
                            };
                            if (typeof ns.Editor.post === 'function') ns.Editor.post(payload);
                            else window.vscode?.postMessage?.(payload);
                        } catch (e) {
                            console.error('엣지 라벨 변경 메시지 전송 실패', e);
                        }
                    }
                }
                // 서버 응답으로 전체 다이어그램이 다시 그려지므로 로컬 mxGraph 모델 업데이트 생략
            };
        } catch (_) {}

        // 이동 허용
        graph.setCellsMovable(true);

        // 파트 드래그 영역 확장
        graph.tolerance = 12;

        // Dangling edges 비활성화
        graph.setAllowDanglingEdges(false);

        // 드롭 활성화
        try { graph.setDropEnabled(true); } catch (_) {}

        // 컨테이너 타입 노드만 드롭 타겟으로 허용 (기본값은 swimlane만 허용 → SysML 노드 인식 안 됨)
        graph.isValidDropTarget = function (cell) {
            if (!cell) return false;
            // defaultParent(최상위 레이어)는 컨테이너 밖으로 드래그 시 사용
            if (cell === graph.getDefaultParent()) return true;
            if (!cell._nodeData) return false;
            const t = (cell._nodeData.type || '').toLowerCase();
            const typeUtils = ns.MxGraph?.typeUtils;
            return typeUtils?.isContainerLikeType?.(t) || graph.getModel().getChildCount(cell) > 0;
        };

        // 컨테이너 내부 노드를 빈 공간(target=null)에 드롭할 때 exit container 지원.
        //
        // mxGraph 동작 원칙:
        //   - 마우스가 컨테이너 영역 안의 빈 공간: getCellAt → 컨테이너 셀 반환 → target = 컨테이너 (null 아님)
        //   - 마우스가 모든 셀 밖의 빈 공간  : getCellAt → null → target = null
        //
        // 따라서 target=null 이면 드롭 위치가 "어떤 셀도 없는 외부 영역" → 컨테이너 자식을 드래그 중이면
        // defaultParent 로 이동(exit container), top-level 노드는 그냥 null 유지.
        const _origGetDropTarget = graph.getDropTarget.bind(graph);
        graph.getDropTarget = function (cells, evt, cell, clone) {
            // evt=null 이면 원본 함수가 mxEvent.getClientX(null) 크래시 → 보호
            let target = null;
            try {
                target = _origGetDropTarget(cells, evt, cell, clone);
            } catch (_) {}
            if (target !== null) return target;

            // target=null: 마우스가 어떤 셀도 없는 빈 공간
            // 드래그 중인 셀이 SysML 컨테이너의 자식이면 defaultParent 반환 (exit container)
            const model = graph.getModel();
            for (const c of (cells || [])) {
                if (!c._nodeData) continue;
                const parent = model.getParent(c);
                if (parent && parent._nodeData) {
                    log('컨테이너 탈출 감지 - defaultParent 반환');
                    return graph.getDefaultParent();
                }
            }
            return null;
        };

        // 선택 가능
        graph.setCellsSelectable(true);

        // 패닝 설정 (Scrollbar 기반 패닝 비활성화, Translate 기반 패닝 사용)
        graph.useScrollbarsForPanning = false;
        // 마이너스 좌표 허용 (무한 캔버스 느낌) - 이게 없으면 Top/Left에서 막힘 느낌
        graph.setAllowNegativeCoordinates(true);
        
        // 줌시 센터 유지 (사용자 경험 개선)
        graph.centerZoom = true;
        
        // 줌시 선택된 셀이 보이도록 자동 패닝되는 기능 비활성화 (화면 튐 방지)
        graph.keepSelectionVisibleOnZoom = false;
        
        // 그래프 경계 여백 (화면 밖으로 나갔을 때도 어느정도 여유)
        graph.border = 60;

        // 컨테이너 리사이즈 방지 (고정된 뷰포트 사용)
        graph.setResizeContainer(false);

        if (graph.panningHandler) {
            graph.panningHandler.useScrollbarsForPanning = false;
            graph.panningHandler.ignoreCell = false; // 기본값 false로 복구 (Select 가능하게). 패닝은 Space/우클릭으로.
        }
        graph.panningHandler.useLeftButtonForPanning = true;

        // 드롭 시 선택 셀을 강제로 화면 안으로 스크롤하는 기본 동작 비활성화
        if (graph.graphHandler) {
            graph.graphHandler.scrollOnMove = false;
        }

        log('그래프 속성 설정 완료');
    }

    /**
     * 스타일시트 기본 설정
     * @param {mxGraph} graph
     */
    function setupStylesheet(graph) {
        const model = graph.getModel();
        model.beginUpdate();
        try {
            // 엣지 기본 스타일
            const edgeStyle = graph.getStylesheet().getDefaultEdgeStyle();
            edgeStyle[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_CONNECTOR;
            edgeStyle[mxConstants.STYLE_EDGE] = mxConstants.EDGESTYLE_ORTHOGONAL;
            edgeStyle[mxConstants.STYLE_ENDARROW] = mxConstants.ARROW_CLASSIC;
            edgeStyle[mxConstants.STYLE_ENDFILL] = '1';
            edgeStyle[mxConstants.STYLE_STROKEWIDTH] = '2';
            edgeStyle[mxConstants.STYLE_STROKECOLOR] = '#6c8ebf';
            edgeStyle[mxConstants.STYLE_FONTCOLOR] = '#446299';

            // 버텍스 기본 스타일
            const vertexStyle = graph.getStylesheet().getDefaultVertexStyle();
            vertexStyle[mxConstants.STYLE_STROKECOLOR] = '#000000';
            vertexStyle[mxConstants.STYLE_FILLCOLOR] = '#FFFFFF';
            vertexStyle[mxConstants.STYLE_STROKEWIDTH] = 1;
            vertexStyle[mxConstants.STYLE_FONTCOLOR] = '#000000';
            vertexStyle[mxConstants.STYLE_FONTSIZE] = 12;

            log('스타일시트 설정 완료');
        } finally {
            model.endUpdate();
        }
    }

    /**
     * 폴딩 기능 비활성화
     * @param {mxGraph} graph
     */
    function disableFolding(graph) {
        graph.foldingEnabled = false;
        graph.isCellFoldable = function () { return false; };
        graph.getFoldingImage = function () { return null; };

        try {
            if (graph.cellRenderer) {
                graph.cellRenderer.createControl = function () { return null; };
            }
        } catch (_) {}
    }

    /**
     * 선택 스타일 설정
     */
    function setupSelectionStyles() {
        try {
            mxConstants.VERTEX_SELECTION_COLOR = '#00a8ff';
            mxConstants.EDGE_SELECTION_COLOR = '#00a8ff';
            mxConstants.OUTLINE_COLOR = '#00a8ff';
            mxConstants.HIGHLIGHT_COLOR = '#00a8ff';
            mxConstants.HIGHLIGHT_OPACITY = 60;
            mxConstants.HANDLE_SIZE = 6;
            mxConstants.HANDLE_FILLCOLOR = '#ffffff';
            mxConstants.HANDLE_STROKECOLOR = '#00a8ff';
        } catch (_) {}
    }

    /**
     * 디버그용 전역 노출
     * @param {mxGraph} graph
     */
    function exposeGraphGlobally(graph) {
        try {
            window.__mxGraph = graph;
            window.__mxGraphInitStatus = 'created';
        } catch (_) {}
    }

    /**
     * 그래프 파괴
     * @param {mxGraph} graph
     */
    function destroyGraph(graph) {
        if (graph) {
            try {
                graph.destroy();
                log('그래프 파괴 완료');
            } catch (error) {
                log('그래프 파괴 실패:', error);
            }
        }
    }

    // 모듈 export
    ns.MxGraph.isAvailable = isAvailable;
    ns.MxGraph.init = initGraph;
    ns.MxGraph.destroy = destroyGraph;
    ns.MxGraph.setupStylesheet = setupStylesheet;

    log('MxGraphWrapper 모듈 로드 완료. mxGraph 사용 가능:', isAvailable());
})();
