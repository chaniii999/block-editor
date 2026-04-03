/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxSizeManager.js - ELK 레이아웃 후 노드 크기 관리
 * 컨테이너 노드의 자식 바운딩 박스 기반 크기 보정
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.factory = ns.MxGraph.factory || {};

    function log(prefix, ...args) {
        try {
            console.log(`[MxSizeManager] ${prefix}`, ...args);
        } catch (_) {}
    }

    /**
     * ELK 레이아웃 적용 후 노드 크기 업데이트
     * - 컨테이너 노드: 자식 노드가 부모 영역 안에 포함되도록 크기 확장
     * @param {mxGraph} graph
     * @param {Array} elements - 노드 배열
     */
    function updateNodeSizesAfterLayout(graph, elements) {
        if (!graph || !elements) return;

        const model = graph.getModel();
        const DS = window.SELAB?.Editor?.config?.displaySettings;
        const parentPad = DS?.elk?.parentContainerPadding ?? 20;

        // 부모-자식 관계 맵 구축 (bottom-up 순서 결정용)
        const childrenOf = new Map();
        const nodeById = new Map();
        for (const n of elements) {
            nodeById.set(n.id, n);
            if (n.parent) {
                if (!childrenOf.has(n.parent)) childrenOf.set(n.parent, []);
                childrenOf.get(n.parent).push(n.id);
            }
        }

        // bottom-up 순서: 리프 → 부모 (깊이 우선 후위 순회)
        const ordered = [];
        const visited = new Set();
        function visit(id) {
            if (visited.has(id)) return;
            visited.add(id);
            const kids = childrenOf.get(id) || [];
            for (const kid of kids) visit(kid);
            ordered.push(id);
        }
        for (const n of elements) visit(n.id);

        model.beginUpdate();
        try {
            for (const nodeId of ordered) {
                const node = nodeById.get(nodeId);
                if (!node || !node.id || !node.width || !node.height) continue;

                // 컨트롤 노드는 크기 유지
                const role = String(node.role || '').toLowerCase();
                const controlRoles = ['fork', 'join', 'decision', 'merge', 'initial', 'final'];
                if (controlRoles.includes(role)) continue;

                const cell = model.getCell(node.id);
                if (!cell) continue;

                const geo = cell.getGeometry();
                if (!geo) continue;

                let targetW = node.width;
                let targetH = node.height;

                const childCount = model.getChildCount(cell);
                if (childCount > 0) {
                    let maxRight = 0;
                    let maxBottom = 0;
                    for (let i = 0; i < childCount; i++) {
                        const child = model.getChildAt(cell, i);
                        if (!model.isVertex(child)) continue;
                        const cGeo = model.getGeometry(child);
                        if (!cGeo) continue;

                        const childNode = nodeById.get(child.id);
                        const childKind = String(childNode?.kind || childNode?.type || '').toLowerCase();
                        const isComment = childKind === 'comment' || childKind === 'documentation';

                        let childBottom = cGeo.y + cGeo.height;
                        // roleLabel 등 부모 경계 아래로 확장되는 하위 셀 반영
                        const subCount = model.getChildCount(child);
                        for (let j = 0; j < subCount; j++) {
                            const sub = model.getChildAt(child, j);
                            if (!model.isVertex(sub)) continue;
                            const sg = model.getGeometry(sub);
                            if (sg && sg.relative && sg.y >= 1) {
                                const extraY = (sg.offset?.y || 0) + 20;
                                childBottom = Math.max(childBottom, cGeo.y + cGeo.height + extraY);
                            }
                        }
                        if (!isComment) {
                            maxRight = Math.max(maxRight, cGeo.x + cGeo.width);
                        }
                        maxBottom = Math.max(maxBottom, childBottom);
                    }

                    if (maxRight > 0 || maxBottom > 0) {
                        const requiredW = maxRight + parentPad;
                        const requiredH = maxBottom + parentPad;
                        targetW = Math.max(targetW, requiredW);
                        targetH = Math.max(targetH, requiredH);
                    }
                }

                if (Math.abs(geo.width - targetW) > 1 || Math.abs(geo.height - targetH) > 1) {
                    const newGeo = geo.clone();
                    newGeo.width = targetW;
                    newGeo.height = targetH;
                    model.setGeometry(cell, newGeo);
                    log(`[updateNodeSizes] "${node.name}" ${geo.width}x${geo.height} -> ${targetW}x${targetH}`);
                }
            }
        } finally {
            model.endUpdate();
        }
    }

    // Export
    ns.MxGraph.factory.updateNodeSizesAfterLayout = updateNodeSizesAfterLayout;

    console.log('[MxSizeManager] 모듈 로드 완료');
})();
