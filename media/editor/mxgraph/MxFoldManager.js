/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxFoldManager.js - 패키지 노드 Collapse/Expand 기능 관리
 * - collapsed 상태 Set 관리
 * - 오버레이 버튼 생성 (우측 상단, 라벨 겹침 방지)
 * - ELK 재레이아웃 트리거
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};

    // collapse된 노드 ID Set
    const _collapsedSet = new Set();

    function getNodeLabelSettings() {
        return ns.Editor?.config?.displaySettings?.nodeLabel || {};
    }

    function getFoldIconSize() {
        return getNodeLabelSettings().foldIconSize ?? 16;
    }

    function getFoldOverlayOffsetX() {
        return getNodeLabelSettings().foldOverlayOffsetX ?? 13;
    }

    function getButtonReservePx() {
        const nl = getNodeLabelSettings();
        if (nl.foldButtonReservePx != null) {
            return nl.foldButtonReservePx;
        }
        return getFoldOverlayOffsetX() + getFoldIconSize() + (nl.foldGapPx ?? 4);
    }

    // 버튼 SVG (expand: ▼, collapse: ▶)
    const FOLD_ICON_SIZE = 16;
    const FOLD_ICON_STROKE = '#b7b7b7';
    const FOLD_ICON_STROKE_WIDTH = 2;

    function createFoldIconDataUri(showVerticalLine) {
        const verticalLine = showVerticalLine
            ? `<line x1="8" y1="5" x2="8" y2="11" stroke="${FOLD_ICON_STROKE}" stroke-width="${FOLD_ICON_STROKE_WIDTH}" />`
            : '';
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">' +
            `<rect x="1" y="1" width="14" height="14" fill="transparent" stroke="${FOLD_ICON_STROKE}" stroke-width="${FOLD_ICON_STROKE_WIDTH}" />` +
            `<line x1="5" y1="8" x2="11" y2="8" stroke="${FOLD_ICON_STROKE}" stroke-width="${FOLD_ICON_STROKE_WIDTH}" />` +
            verticalLine +
            '</svg>'
        );
    }

    const ICON_EXPANDED = createFoldIconDataUri(false);
    const ICON_COLLAPSED = createFoldIconDataUri(true);

    // collapsed 상태일 때 사용할 최소 노드 크기
    const COLLAPSED_WIDTH = 120;
    const COLLAPSED_HEIGHT = 40;

    // collapsed 라벨 최대 길이 (ellipsis 적용 기준)
    const COLLAPSED_LABEL_MAX_LENGTH = 12;

    function log(prefix, ...args) {
        try {
            console.log(`[MxFoldManager] ${prefix}`, ...args);
        } catch (_) {}
    }

    /**
     * 라벨 텍스트를 ellipsis 처리
     * @param {string} label - 원본 라벨
     * @param {number} maxLength - 최대 길이
     * @returns {string} 축약된 라벨
     */
    function truncateLabel(label, maxLength) {
        if (!label || typeof label !== 'string') return label;
        // HTML 태그 제거 후 순수 텍스트 길이 확인
        const plainText = label.replace(/<[^>]*>/g, '').replace(/\n/g, ' ').trim();
        if (plainText.length <= maxLength) return plainText;
        return plainText.substring(0, maxLength) + '...';
    }

    /**
     * fold 대상 노드인지 판단
     * - package 타입
     * - definition/usage 계열 타입 (compartment 유무와 무관하게 타입명으로 판단)
     *   재렌더링 시 compartments가 undefined일 수 있으므로 타입명만 사용
     * @param {Object} nodeData - 노드 데이터
     * @returns {boolean}
     */
    function isFoldTarget(nodeData) {
        if (!nodeData) return false;
        const typeUtils = ns.MxGraph?.typeUtils;
        const typeLower = typeUtils?.getTypeLower?.(nodeData) || String(nodeData.type || nodeData.kind || '').toLowerCase();

        // package는 자식 노드를 포함하는 컨테이너이므로 _hasChildren만 확인
        if (typeUtils?.isPackageType?.(typeLower)) {
            return !!(nodeData._hasChildren);
        }

        // definition/usage 계열은 compartment 또는 graph children이 있어야 fold 대상
        const hasFoldable = !!(nodeData._hasCompartments || nodeData._hasChildren);
        if (!hasFoldable) return false;

        return typeUtils?.isContainerLikeType?.(typeLower) ?? false;
    }

    /**
     * 특정 셀의 collapsed 상태 반환
     * @param {string} cellId
     * @returns {boolean}
     */
    function isCollapsed(cellId) {
        return _collapsedSet.has(String(cellId));
    }

    /**
     * diagramData에서 특정 노드의 모든 자손 ID를 재귀적으로 수집
     * @param {string} nodeId
     * @param {Array} allNodes
     * @returns {Set<string>}
     */
    function collectDescendants(nodeId, allNodes) {
        const result = new Set();
        const queue = [String(nodeId)];
        while (queue.length > 0) {
            const pid = queue.shift();
            for (const n of allNodes) {
                const nParent = String(n.parent || '');
                if (nParent === pid) {
                    result.add(String(n.id));
                    queue.push(String(n.id));
                }
            }
        }
        return result;
    }

    /**
     * collapse/expand 토글 실행
     * - diagramData의 _collapsed 플래그 및 자손 hidden 플래그 토글
     * - ELK 재레이아웃 + mxGraph 재렌더링 트리거
     * @param {mxGraph} graph
     * @param {mxCell} cell
     * @param {Object} diagramData - { elements, connections }
     */
    async function toggleFold(graph, cell, diagramData) {
        if (!graph || !cell || !diagramData) return;

        const nodeData = cell._nodeData;
        if (!nodeData || !isFoldTarget(nodeData)) return;

        const cellId = String(nodeData.id || cell.getId());
        const willCollapse = !_collapsedSet.has(cellId);

        log(`toggleFold: ${cellId} → ${willCollapse ? 'collapse' : 'expand'}`);

        if (willCollapse) {
            _collapsedSet.add(cellId);
        } else {
            _collapsedSet.delete(cellId);
        }

        // 자손 노드 hidden 플래그 토글
        const allNodes = diagramData.elements || [];
        const descendants = collectDescendants(cellId, allNodes);
        for (const n of allNodes) {
            if (descendants.has(String(n.id))) {
                n.hidden = willCollapse;
            }
        }

        // 해당 노드에 _collapsed 플래그 설정
        const targetNode = allNodes.find(n => String(n.id) === cellId);
        if (targetNode) {
            targetNode._collapsed = willCollapse;
            if (willCollapse) {
                // collapsed 상태에서 노드 크기를 최소화 (ELK에 힌트)
                targetNode._savedWidth = targetNode.width;
                targetNode._savedHeight = targetNode.height;
                targetNode.width = COLLAPSED_WIDTH;
                targetNode.height = COLLAPSED_HEIGHT;
            } else {
                // 복원
                if (targetNode._savedWidth) targetNode.width = targetNode._savedWidth;
                if (targetNode._savedHeight) targetNode.height = targetNode._savedHeight;
                delete targetNode._savedWidth;
                delete targetNode._savedHeight;
            }
        }

        // ELK 재레이아웃 + 재렌더링
        try {
            const precompute = ns.Editor?.layout?.precomputeNodeSizes;
            if (typeof precompute === 'function') {
                precompute(diagramData);
            }
            await ns.applyElkLayout(diagramData);
            ns.MxGraph.factory.renderModel(graph, diagramData);

            // expand 시 guiData에 저장된 자식 노드 위치 복원 (사용자 배치 유지)
            if (!willCollapse) {
                const guiData = ns.Editor._lastGuiData;
                if (guiData?.nodes && typeof ns.Editor.applyGuiDataPositions === 'function') {
                    ns.Editor.applyGuiDataPositions(graph, guiData.nodes);
                }
            }

            // 재렌더링 후 fold 버튼 재부착
            attachFoldOverlays(graph, diagramData);
        } catch (err) {
            log('재레이아웃 실패:', err);
        }
    }

    /**
     * 단일 셀에 fold 오버레이 버튼 추가
     * @param {mxGraph} graph
     * @param {mxCell} cell
     * @param {Object} nodeData
     */
    function attachFoldOverlay(graph, cell, nodeData) {
        if (!graph || !cell || !nodeData) return;
        if (!isFoldTarget(nodeData)) return;

        // 기존 fold 오버레이 제거
        const existing = graph.getCellOverlays(cell);
        if (existing) {
            const prevFold = existing.filter(o => o._isFoldOverlay);
            prevFold.forEach(o => graph.removeCellOverlay(cell, o));
        }

        const cellId = String(nodeData.id || cell.getId());
        const collapsed = _collapsedSet.has(cellId);
        const iconSrc = collapsed ? ICON_COLLAPSED : ICON_EXPANDED;

        const iconSize = getFoldIconSize();
        const overlay = new mxCellOverlay(
            new mxImage(iconSrc, iconSize, iconSize),
            collapsed ? 'Expand' : 'Collapse',
            mxConstants.ALIGN_RIGHT,
            mxConstants.ALIGN_TOP,
            new mxPoint(-getFoldOverlayOffsetX(), 18)
        );
        overlay._isFoldOverlay = true;
        overlay.cursor = 'pointer';

        // graph에 저장된 diagramDataRef로 클릭 이벤트 바인딩
        const dataRef = graph._foldDataRef;
        if (dataRef) {
            bindOverlayClick(overlay, graph, cell, dataRef);
        }

        graph.addCellOverlay(cell, overlay);
    }

    /**
     * diagramData의 모든 fold 대상 노드에 오버레이 부착
     * @param {mxGraph} graph
     * @param {Object} diagramData
     */
    function attachFoldOverlays(graph, diagramData) {
        if (!graph || !diagramData) return;
        const allNodes = diagramData.elements || [];
        const parent = graph.getDefaultParent();

        // 모든 셀 순회 (getChildCells는 직계만, 전체는 getChildVertices 재귀 필요)
        function visitCells(container) {
            const cells = graph.getChildCells(container, true, false);
            for (const cell of cells) {
                const nodeData = cell._nodeData;
                if (nodeData && isFoldTarget(nodeData)) {
                    attachFoldOverlay(graph, cell, nodeData);
                }
                visitCells(cell);
            }
        }
        visitCells(parent);
    }

    /**
     * 단일 오버레이에 클릭 이벤트 리스너 등록
     * mxCellOverlay의 자체 click 이벤트 사용 (좌표 계산 불필요)
     * @param {mxCellOverlay} overlay
     * @param {mxGraph} graph
     * @param {mxCell} cell
     * @param {Object} diagramDataRef - { current: diagramData }
     */
    function bindOverlayClick(overlay, graph, cell, diagramDataRef) {
        overlay.addListener(mxEvent.CLICK, function (sender, evt) {
            evt.consume();
            const diagramData = diagramDataRef.current;
            if (diagramData) {
                toggleFold(graph, cell, diagramData);
            }
        });
    }

    /**
     * fold 클릭 핸들러 등록 (diagramDataRef 저장용)
     * 실제 리스너는 attachFoldOverlay 시점에 오버레이별로 등록됨
     * @param {mxGraph} graph
     * @param {Object} diagramDataRef - { current: diagramData }
     */
    function registerClickHandler(graph, diagramDataRef) {
        if (!graph) return;
        // diagramDataRef를 graph에 저장하여 attachFoldOverlay에서 참조
        graph._foldDataRef = diagramDataRef;
    }

    // Export
    ns.MxGraph.fold = {
        isCollapsed,
        isFoldTarget,
        truncateLabel,
        attachFoldOverlay,
        attachFoldOverlays,
        registerClickHandler,
        toggleFold,
        getButtonReservePx,
        get collapsedSet() { return _collapsedSet; }
    };

})();
