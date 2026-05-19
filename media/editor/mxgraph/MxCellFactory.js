/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxCellFactory.js - mxGraph 셀 생성 팩토리 (조율자)
 * 정규화된 모델 데이터를 mxGraph 셀로 변환
 *
 * 분리된 모듈:
 * - MxLabelUtils.js: 라벨 포맷팅 및 스타일 유틸리티
 * - MxCompartmentRenderer.js: Compartment 렌더링
 * - MxLoopBodyRenderer.js: Loop body 렌더링
 * - MxVertexBuilder.js: 버텍스(노드) 생성
 * - MxEdgeBuilder.js: 엣지 및 Border Node 생성
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.factory = ns.MxGraph.factory || {};
    const EMPTY_STATE_ID = 'mxGraphEmptyState';

    function log(prefix, ...args) {
        try {
            console.log(`[MxCellFactory] ${prefix}`, ...args);
        } catch (_) {}
    }

    function getEmptyStateOverlay(graph) {
        const container = graph?.container;
        if (!container) return null;
        return container.querySelector(`#${EMPTY_STATE_ID}`);
    }

    function ensureEmptyStateOverlay(graph) {
        const container = graph?.container;
        if (!container) return null;
        let overlay = getEmptyStateOverlay(graph);
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = EMPTY_STATE_ID;
        overlay.className = 'mxgraph-empty-state is-hidden';
        container.appendChild(overlay);
        return overlay;
    }

    function hideEmptyStateOverlay(graph) {
        const overlay = getEmptyStateOverlay(graph);
        if (!overlay) return;
        overlay.textContent = '';
        overlay.classList.add('is-hidden');
    }

    function getTranslatedEmptyMessage() {
        const tr = ns.Editor?.ui?.PropertyPanel?._translations
            || ns.Editor?._pendingPropertyPanelTranslations;
        if (tr?.emptyDiagram) return tr.emptyDiagram;
        return ns.Editor.renderUtils.getEmptyDiagramMessageText();
    }

    function showEmptyStateOverlay(graph) {
        const overlay = ensureEmptyStateOverlay(graph);
        if (!overlay) return;
        overlay.textContent = getTranslatedEmptyMessage();
        overlay.classList.remove('is-hidden');
    }

    /**
     * 부모 셀 크기를 자식 셀이 모두 포함되도록 확장 + 겹침 해소
     * 깊은 중첩부터 처리 (bottom-up)
     */
    function attachFeatureTypingFooters(graph, cellMap, nodes) {
        const createFooter = ns.MxGraph.compartment?.createFeatureTypingFooterCells;
        if (typeof createFooter !== 'function') return;
        for (const node of nodes) {
            if (!node || node.hidden || node._collapsed) continue;
            const names = node.featureTypingFooter;
            if (!Array.isArray(names) || names.length === 0) continue;
            const cell = cellMap[node.id];
            if (!cell) continue;
            createFooter(graph, cell, names);
        }
    }

    function getContentAreaTop(parentCell, parentNode) {
        const node = parentNode || parentCell?._nodeData;
        if (node?._compactContainmentSpine || node?._tightSingleChildContainer) {
            const spineTop =
                Number(ns.Editor?.config?.displaySettings?.bdd?.compactSpineLabelTop) ||
                32;
            return spineTop;
        }
        const precomputed = Number(node?._precomputedPaddingTop);
        if (precomputed > 0) return precomputed;
        const labelH =
            parentCell?._labelHeight ||
            node?._labelHeight ||
            Number(ns.Editor?.config?.displaySettings?.label?.minHeight) ||
            35;
        let top = Math.max(
            labelH + 6,
            Number(ns.Editor?.config?.displaySettings?.elk?.containerPadding?.top) ||
                48,
        );
        const metrics = ns.Editor?.metrics;
        const comps = node?.compartments;
        if (
            metrics?.calculateTotalCompartmentsHeight &&
            Array.isArray(comps) &&
            comps.length > 0
        ) {
            const compH = metrics.calculateTotalCompartmentsHeight(
                comps,
                false,
                Number(node?.width) || Number(parentCell?.geometry?.width) || 120,
            );
            top = Math.max(top, labelH + compH + 4);
        }
        return top;
    }

    /** bddLayout.packContainmentChildrenHorizontally 와 동일 기준 — 액션 다이어그램은 제외 */
    function isBddStyleLikeContainer(parentNode) {
        if (!parentNode) return false;
        const t = String(parentNode.type || '').toLowerCase();
        if (t.includes('ifaction') || t === 'elseifaction' || t === 'elseaction') return false;
        if (t.includes('whileloop')) return false;
        if (t.includes('statemachine') || t.includes('activity')) return false;
        if (
            Array.isArray(parentNode.compartments) &&
            parentNode.compartments.some((c) => c && c.key === 'actionFlow')
        ) {
            return false;
        }
        return true;
    }

    function resizeParentsToFitChildren(graph, defaultParent, cellMap, nodes) {
        const DS = ns.Editor?.config?.displaySettings;
        const spinePad = DS?.bdd?.compactSpinePad || {};
        const PADDING = 20;
        const CHILD_GAP = 10;
        const graphModel = graph.getModel();

        // 부모→자식 맵핑
        const childrenOf = new Map();
        for (const node of nodes) {
            if (!node.parent || !cellMap[node.id] || !cellMap[node.parent]) continue;
            if (!childrenOf.has(node.parent)) childrenOf.set(node.parent, []);
            childrenOf.get(node.parent).push(node.id);
        }

        // 깊이 계산 (리프부터 처리)
        function getDepth(nodeId) {
            const children = childrenOf.get(nodeId);
            if (!children || children.length === 0) return 0;
            return 1 + Math.max(...children.map(getDepth));
        }

        // 깊이 오름차순 정렬 (리프의 부모부터 → 루트 방향)
        const parentIds = [...childrenOf.keys()].sort((a, b) => getDepth(a) - getDepth(b));

        for (const parentId of parentIds) {
            const parentCell = cellMap[parentId];
            if (!parentCell) continue;
            const parentNodeEarly = parentCell._nodeData;
            const childCountEarly = (childrenOf.get(parentId) || []).length;
            if (
                childCountEarly === 1 &&
                isBddStyleLikeContainer(parentNodeEarly) &&
                (parentNodeEarly?._tightSingleChildContainer ||
                    parentNodeEarly?._compactContainmentSpine ||
                    parentNodeEarly?._containmentSpineChain)
            ) {
                const childId = childrenOf.get(parentId)[0];
                const childCell = cellMap[childId];
                const childNode = childCell?._nodeData;
                if (childCell && childNode) {
                    const pGeo = graphModel.getGeometry(parentCell);
                    const cGeo = graphModel.getGeometry(childCell);
                    if (pGeo && cGeo) {
                        const contentTop = getContentAreaTop(parentCell, parentNodeEarly);
                        const cw = Math.max(
                            Number(childNode.width) || 0,
                            Number(cGeo.width) || 0,
                            120,
                        );
                        const ch = Math.max(
                            Number(childNode.height) || 0,
                            Number(cGeo.height) || 0,
                            60,
                        );
                        const side =
                            Number(parentNodeEarly._spineSidePad) ||
                            Number(spinePad.left) ||
                            Number(DS?.bdd?.singleChildContainmentPad?.left) ||
                            6;
                        const bottom =
                            Number(parentNodeEarly._spineBottomPad) ||
                            Number(spinePad.bottom) ||
                            Number(DS?.bdd?.singleChildContainmentPad?.bottom) ||
                            8;
                        const footerH =
                            Number(parentNodeEarly._featureUsageFooterHeight) ||
                            Number(parentCell._featureUsageFooterHeight) ||
                            0;
                        const name = String(parentNodeEarly.name || parentNodeEarly.id || '');
                        const titleW = Math.max(72, name.length * 7 + 20);
                        const layoutW = Number(parentNodeEarly.width) || 0;
                        const parentW = Math.max(
                            layoutW,
                            cw + side * 2,
                            titleW,
                        );
                        const relX = Math.max(0, (parentW - cw) / 2);
                        const newChild = cGeo.clone();
                        newChild.x = relX;
                        newChild.y = contentTop;
                        newChild.width = cw;
                        newChild.height = ch;
                        graphModel.setGeometry(childCell, newChild);
                        childNode.width = cw;
                        childNode.height = ch;
                        childNode.relativeX = relX;
                        childNode.relativeY = contentTop;
                        const newParent = pGeo.clone();
                        newParent.width = parentW;
                        newParent.height = contentTop + ch + bottom + footerH;
                        graphModel.setGeometry(parentCell, newParent);
                        parentNodeEarly.width = newParent.width;
                        parentNodeEarly.height = newParent.height;
                    }
                }
                continue;
            }
            const children = childrenOf.get(parentId) || [];
            if (children.length === 0) continue;

            // 자식 셀 geometry 수집
            const childGeos = [];
            for (const childId of children) {
                const childCell = cellMap[childId];
                if (!childCell) continue;
                const geo = graphModel.getGeometry(childCell);
                if (!geo) continue;
                childGeos.push({ cell: childCell, geo });
            }

            if (childGeos.length === 0) continue;

            const parentNode = parentCell._nodeData;
            const contentTop = getContentAreaTop(parentCell, parentNode);
            const compactSpine = !!parentNode?._compactContainmentSpine;
            const sidePad = compactSpine
                ? Number(spinePad.left) || 14
                : PADDING;
            const bottomPad = compactSpine
                ? Number(spinePad.bottom) || 10
                : PADDING;
            // nodeNodeSpacing(루트·레이어)은 수백 단위일 수 있음 — 컨테이너 안 가로 줄에는 쓰지 않음
            const siblingGap =
                Number(DS?.bdd?.containmentRowGap) ||
                Number(DS?.elk?.containerChildSpacing) ||
                28;

            // ELK는 association 등으로 컨테이너 안 자식을 세로로 쌓는 경우가 많음.
            // bddLayout에서 모델 좌표를 가로로 맞춰도, 여기서 mxGeometry를 다시 잡기 전이면
            // 이후 겹침·센터링이 세로 배치를 유지하므로 BDD식 부모는 셀 기준으로 먼저 한 줄 배치.
            let packedContainmentRow = false;
            if (
                childGeos.length >= 1 &&
                isBddStyleLikeContainer(parentNode) &&
                !parentNode?._compactContainmentSpine &&
                !parentNode?._tightSingleChildContainer
            ) {
                const pGeoRow = graphModel.getGeometry(parentCell);
                if (pGeoRow) {
                    packedContainmentRow = true;
                    childGeos.sort(
                        (a, b) =>
                            (a.geo.y || 0) - (b.geo.y || 0) ||
                            (a.geo.x || 0) - (b.geo.x || 0),
                    );
                    let totalW = 0;
                    for (const cg of childGeos) {
                        totalW += Number(cg.geo.width) || 120;
                    }
                    totalW += siblingGap * Math.max(0, childGeos.length - 1);
                    const innerLeft = 10;
                    const rowY = contentTop + 5;
                    const pw = Number(pGeoRow.width) || 200;
                    const cx0 = (pw - totalW) / 2;
                    let cx = Number.isFinite(cx0) ? Math.max(innerLeft, cx0) : innerLeft;
                    if (childGeos.length === 1) {
                        const g0 = childGeos[0].geo;
                        const w0 = Number(g0.width) || 120;
                        cx = Math.max(innerLeft, (pw - w0) / 2);
                    }
                    for (let ci = 0; ci < childGeos.length; ci++) {
                        const { cell, geo } = childGeos[ci];
                        const newGeo = geo.clone();
                        newGeo.x = cx;
                        newGeo.y = rowY;
                        graphModel.setGeometry(cell, newGeo);
                        childGeos[ci].geo = newGeo;
                        const nd = cell._nodeData;
                        if (nd) {
                            nd.relativeX = newGeo.x;
                            nd.relativeY = newGeo.y;
                        }
                        cx += (Number(newGeo.width) || 120) + siblingGap;
                    }
                }
            }

            const footerReserve =
                Number(parentNode?._featureUsageFooterHeight) ||
                Number(parentCell._featureUsageFooterHeight) ||
                0;
            const footerExtra =
                Number(ns.Editor?.config?.displaySettings?.featureUsageSlot?.containerExtraBottom) ||
                0;
            let minX = Infinity, minY = Infinity, maxR = 0, maxB = 0;
            for (const { geo } of childGeos) {
                minX = Math.min(minX, geo.x);
                minY = Math.min(minY, geo.y);
                maxR = Math.max(maxR, geo.x + geo.width);
                maxB = Math.max(maxB, geo.y + geo.height);
            }
            const childrenWidth = maxR - minX;
            const childrenHeight = maxB - minY;
            const parentGeoForCenter = graphModel.getGeometry(parentCell);
            if (parentGeoForCenter) {
                const availW = parentGeoForCenter.width;
                const availH = parentGeoForCenter.height - contentTop - footerReserve;
                // 중앙 오프셋 계산 (compartment 아래 영역만 사용)
                const centerX = Math.max(10, (availW - childrenWidth) / 2);
                // 가로 한 줄로 맞춘 컨테이너는 세로 가운데 정렬하지 않음(상·하 빈 공백 방지)
                const centerY =
                    packedContainmentRow || (compactSpine && childGeos.length === 1)
                        ? contentTop + 5
                        : Math.max(
                              contentTop + 5,
                              contentTop + Math.max(0, (availH - childrenHeight) / 2),
                          );
                const shiftX = minX - centerX;
                const shiftY = minY - centerY;
                if (Math.abs(shiftX) > 2 || Math.abs(shiftY) > 2) {
                    for (let ci = 0; ci < childGeos.length; ci++) {
                        const { cell, geo } = childGeos[ci];
                        const newGeo = geo.clone();
                        newGeo.x = geo.x - shiftX;
                        newGeo.y = geo.y - shiftY;
                        graphModel.setGeometry(cell, newGeo);
                        childGeos[ci].geo = newGeo;
                    }
                }
            }

            // 겹침 감지 및 해소
            for (let i = 0; i < childGeos.length; i++) {
                const a = childGeos[i].geo;
                for (let j = i + 1; j < childGeos.length; j++) {
                    const b = childGeos[j].geo;
                    if (a.x < b.x + b.width + CHILD_GAP && a.x + a.width + CHILD_GAP > b.x &&
                        a.y < b.y + b.height + CHILD_GAP && a.y + a.height + CHILD_GAP > b.y) {
                        const newGeo = b.clone();
                        newGeo.x = a.x + a.width + CHILD_GAP;
                        graphModel.setGeometry(childGeos[j].cell, newGeo);
                        childGeos[j].geo = newGeo;
                    }
                }
            }

            // 부모 크기를 자식에 맞게 조정 (확장 또는 축소)
            let maxRight2 = 0;
            let maxBottom2 = 0;
            for (const { geo } of childGeos) {
                maxRight2 = Math.max(maxRight2, geo.x + geo.width);
                maxBottom2 = Math.max(maxBottom2, geo.y + geo.height);
            }

            if (maxRight2 > 0 || maxBottom2 > 0) {
                const pGeo = graphModel.getGeometry(parentCell);
                if (pGeo) {
                    const fitW = maxRight2 + (compactSpine ? sidePad : PADDING);
                    const fitH = Math.max(
                        maxBottom2 +
                            (compactSpine ? bottomPad : PADDING) +
                            footerReserve +
                            footerExtra,
                        contentTop +
                            childrenHeight +
                            (compactSpine ? bottomPad : PADDING) +
                            footerReserve +
                            footerExtra,
                    );
                    // 부모 크기를 자식 fit 크기로 조정 (확장뿐 아니라 축소도)
                    const newGeo = pGeo.clone();
                    if (compactSpine && childGeos.length === 1) {
                        newGeo.width = Math.max(fitW, 80);
                        newGeo.height = Math.max(fitH, 48);
                    } else {
                        newGeo.width = Math.max(fitW, 100);
                        newGeo.height = Math.max(fitH, 60);
                    }
                    graphModel.setGeometry(parentCell, newGeo);
                    if (parentNode) {
                        parentNode.width = newGeo.width;
                        parentNode.height = newGeo.height;
                    }
                }
            }
        }
    }

    /**
     * 정규화된 모델을 mxGraph로 렌더링
     * @param {mxGraph} graph - mxGraph 인스턴스
     * @param {Object} model - 정규화된 모델 { elements, connections } 또는 { nodes, edges }
     */
    function renderModel(graph, model) {
        if (!graph || !model) {
            log('렌더링 실패 - 그래프 또는 모델 없음');
            return;
        }

        const nodes = model.elements || model.nodes || [];
        const edges = model.connections || model.edges || [];
        const hasVisibleNodes = nodes.some((node) => node && !node.hidden);

        const cache = model.cache || ns.Editor._app?._modelCache;
        if (cache) {
            log(' 모델 캐시 사용 가능:', cache.getStats());
        } else {
            log(' 모델 캐시 없음 - 성능 저하 가능');
        }

        ns.MxGraph._currentApp = { model: { elements: nodes, edges: edges }, _modelCache: cache };
        // renderModel 중 CELLS_MOVED 이벤트 무시 플래그
        if (typeof ns.MxGraph._setRendering === 'function') ns.MxGraph._setRendering(true);
        log('모델 렌더링 시작. 노드:', nodes.length, '엣지:', edges.length);
        log('노드 ID 목록:', nodes.map(n => n.id));

        const graphModel = graph.getModel();
        const parent = graph.getDefaultParent();
        const cellMap = {};

        const _createVertex = ns.MxGraph.factory.createVertex;
        const _createEdge = ns.MxGraph.factory.createEdge;
        const _createBorderNode = ns.MxGraph.factory.createBorderNode;
        const _distributeOverlappingEdges = ns.MxGraph.factory.distributeOverlappingEdges;
        const _rerouteAllEdges = ns.MxGraph.factory.rerouteAllEdges;

        graphModel.beginUpdate();
        try {
            graph.removeCells(graph.getChildCells(parent, true, true));

            if (!hasVisibleNodes) {
                log('빈 모델 감지 - mxGraph empty-state 표시');
            } else {
                const borderNodeIds = new Set();
                const nodesById = cache ? null : new Map();
                const nodesByName = cache ? null : new Map();
                const parentGraphChildrenCount = new Map();

                nodes.forEach((node) => {
                    if (!cache) {
                        if (node?.id) nodesById.set(String(node.id), node);
                        if (node?.name) nodesByName.set(String(node.name), node);
                    }
                    if (node.parent) {
                        const pid = String(node.parent);
                        parentGraphChildrenCount.set(pid, (parentGraphChildrenCount.get(pid) || 0) + 1);
                    }
                });

                function resolveParentNode(node) {
                    if (!node || !node.parent) return null;
                    if (cache) return cache.getElement(node.parent);
                    const parentId = String(node.parent);
                    return nodesById.get(parentId) || nodesByName.get(parentId) || null;
                }

                function ensureCell(node) {
                    if (!node || cellMap[node.id]) return cellMap[node?.id];
                    // hidden 노드는 셀 생성 건너뜀 (collapse 상태)
                    if (node.hidden) return null;

                    let parentNode = resolveParentNode(node);
                    let parentCell = parent;
                    if (parentNode) {
                        parentCell = ensureCell(parentNode) || parent;
                    }

                    const hasGraphChildren = (parentGraphChildrenCount.get(String(node.id)) || 0) > 0;
                    const cell = _createVertex(graph, parentCell, node, parentNode, cellMap, hasGraphChildren);
                    if (cell) {
                        cellMap[node.id] = cell;

                        if (node.borderNodes && node.borderNodes.length > 0) {
                            const sideCountMap = {};
                            const sideTotalMap = {};
                            node.borderNodes.forEach((bn) => {
                                const s = String(bn.side || 'E').toUpperCase();
                                sideTotalMap[s] = (sideTotalMap[s] || 0) + 1;
                            });
                            node.borderNodes.forEach((borderNode, idx) => {
                                borderNodeIds.add(borderNode.id);
                                const s = String(borderNode.side || 'E').toUpperCase();
                                const sideIdx = sideCountMap[s] || 0;
                                sideCountMap[s] = sideIdx + 1;
                                const borderCell = _createBorderNode(graph, cell, borderNode, idx, node.borderNodes.length, sideIdx, sideTotalMap[s]);
                                if (borderCell) {
                                    cellMap[borderNode.id] = borderCell;
                                }
                            });
                        }
                    }
                    return cell;
                }

                nodes.forEach((node) => ensureCell(node));

                // 부모 셀 크기를 자식 포함하도록 조정 (푸터보다 먼저 — 푸터 너비는 최종 parent geo 기준)
                resizeParentsToFitChildren(graph, parent, cellMap, nodes);
                attachFeatureTypingFooters(graph, cellMap, nodes);
                if (typeof ns.MxGraph.compartment?.syncAllInteriorDecorWidths === 'function') {
                    ns.MxGraph.compartment.syncAllInteriorDecorWidths(graph, cellMap);
                }

                edges.forEach(edge => {
                    _createEdge(graph, parent, edge, cellMap, borderNodeIds);
                });

                log('렌더링 완료. 생성된 셀:', Object.keys(cellMap).length);
            }
        } finally {
            graphModel.endUpdate();
            if (typeof ns.MxGraph._setRendering === 'function') ns.MxGraph._setRendering(false);
        }

        if (!hasVisibleNodes) {
            graph.refresh();
            showEmptyStateOverlay(graph);
            ns.MxGraph.history?.clear?.();
            return;
        }

        graph.refresh();
        if (typeof _rerouteAllEdges === 'function') {
            _rerouteAllEdges(graph);
        }
        if (typeof _distributeOverlappingEdges === 'function') {
            _distributeOverlappingEdges(graph);
        }
        graph.refresh();
        hideEmptyStateOverlay(graph);

        // 그래프 재구축 작업이 undo 스택에 남지 않도록 클리어
        ns.MxGraph.history?.clear?.();
    }

    /**
     * 그래프 초기화 및 모델 렌더링
     * @param {HTMLElement} container - 컨테이너 요소
     * @param {Object} model - 정규화된 모델
     * @returns {mxGraph} 생성된 그래프
     */
    function initAndRender(container, model) {
        const graph = ns.MxGraph.init?.(container);
        if (!graph) {
            log('그래프 초기화 실패');
            return null;
        }

        ns.MxGraph.styles?.registerStyles?.(graph);

        if (model) {
            renderModel(graph, model);
        }

        return graph;
    }

    // Export
    ns.MxGraph.factory.renderModel = renderModel;
    ns.MxGraph.factory.initAndRender = initAndRender;

    Object.defineProperty(ns.MxGraph.factory, 'formatLabel', {
        get: () => ns.MxGraph.labelUtils?.formatLabel
    });

    log('MxCellFactory 모듈 로드 완료');
})();