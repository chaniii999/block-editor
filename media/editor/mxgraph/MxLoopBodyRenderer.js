/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxLoopBodyRenderer.js - SysML Loop body compartment 렌더링
 * Loop body 내부 ActionUsage 노드들을 mxGraph 자식 셀로 렌더링
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.compartment = ns.MxGraph.compartment || {};

    /**
     * HTML 이스케이프 처리 (MxCompartmentRenderer와 동일 로직, 독립 실행 보장)
     * @param {string} text
     * @returns {string}
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Loop body compartment를 mxGraph 자식 셀로 렌더링합니다.
     * SysML v2 표준: start → perform action → assign → done (점선 화살표로 연결)
     * @param {mxGraph} graph - mxGraph 인스턴스
     * @param {mxCell} vertex - 부모 Loop 셀
     * @param {Object} loopBodyComp - loop body compartment 데이터
     * @param {number} startY - loop body 시작 Y 좌표 (for iterator 구획 아래)
     * @returns {Object} 생성된 셀 맵 (id -> cell)
     */
    function createLoopBodyCells(graph, vertex, loopBodyComp, startY) {
        const cellMap = {};
        const items = loopBodyComp.items || [];
        if (items.length === 0) return cellMap;

        const parentGeo = vertex.getGeometry();
        const DS = window.SELAB?.Editor?.config?.displaySettings;
        const AF = DS?.mxActionFlow;
        const nodeWidth = AF?.cellNodeWidth ?? 140;
        const nodeHeight = AF?.cellNodeHeight ?? 36;
        const circleSize = AF?.cellCircleSize ?? 16;
        const spacing = AF?.cellSpacing ?? 40;
        const startX = (parentGeo.width - nodeWidth) / 2;

        let y = startY + 10;
        const nodePositions = [];

        graph.getModel().beginUpdate();
        try {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item || !item.id) continue;

                const itemKind = item.kind || '';
                const itemRole = item.role || '';
                const itemName = item.name || '';
                const itemStereotype = item.stereotype || '';
                const itemTypeName = item.typeName || '';

                let itemX, itemY, itemW, itemH, itemStyle, itemLabel;

                if (itemKind === 'StartAction' || itemRole === 'initial') {
                    itemW = circleSize;
                    itemH = circleSize;
                    itemX = (parentGeo.width - circleSize) / 2;
                    itemY = y;
                    itemStyle = 'shape=ellipse;fillColor=#000000;strokeColor=#000000;';
                    itemLabel = '';
                    nodePositions.push({ id: item.id, x: itemX + itemW / 2, y: itemY, bottom: itemY + itemH, type: 'start' });
                    y += circleSize + spacing;

                } else if (itemKind === 'DoneAction' || itemRole === 'final') {
                    const outerSize = circleSize + 4;
                    itemW = outerSize;
                    itemH = outerSize;
                    itemX = (parentGeo.width - outerSize) / 2;
                    itemY = y;
                    itemStyle = 'shape=doubleEllipse;fillColor=#000000;strokeColor=#000000;strokeWidth=2;';
                    itemLabel = '';
                    nodePositions.push({ id: item.id, x: itemX + itemW / 2, y: itemY, bottom: itemY + itemH, type: 'done' });
                    y += outerSize + 10;

                } else if (itemKind === 'PerformActionUsage') {
                    itemW = nodeWidth;
                    const borderNodes = item.borderNodes || [];
                    const hasInParams = borderNodes.filter(b => b.direction === 'in').length > 0;
                    const hasOutParams = borderNodes.filter(b => b.direction === 'out').length > 0;
                    itemH = nodeHeight + (hasInParams || hasOutParams ? 24 : 0);
                    itemX = startX;
                    itemY = y;
                    itemStyle = 'rounded=1;fillColor=#E3F2FD;strokeColor=#1976D2;strokeWidth=1.5;html=1;';

                    const labelParts = [];
                    if (itemStereotype) labelParts.push(`<i>${escapeHtml(itemStereotype)}</i>`);
                    let mainLabel = itemName;
                    if (itemTypeName) mainLabel += ` : ${itemTypeName}`;
                    labelParts.push(`<b>${escapeHtml(mainLabel)}</b>`);

                    if (borderNodes.length > 0) {
                        const inParams = borderNodes.filter(b => b.direction === 'in').map(b => `[in] ${b.name}`).join(', ');
                        const outParams = borderNodes.filter(b => b.direction === 'out').map(b => `${b.name} [out]`).join(', ');
                        if (inParams || outParams) {
                            labelParts.push(`<hr style="margin:2px 0;border:none;border-top:1px solid #888;">`);
                            if (inParams) labelParts.push(`<small>${escapeHtml(inParams)}</small>`);
                            if (outParams) labelParts.push(`<small>${escapeHtml(outParams)}</small>`);
                        }
                    }
                    itemLabel = labelParts.join('<br/>');
                    nodePositions.push({ id: item.id, x: itemX + itemW / 2, y: itemY, bottom: itemY + itemH, type: 'perform' });
                    y += itemH + spacing;

                } else if (itemKind === 'AssignmentActionUsage') {
                    itemW = nodeWidth;
                    itemH = nodeHeight;
                    itemX = startX;
                    itemY = y;
                    itemStyle = 'rounded=1;fillColor=#FFF3E0;strokeColor=#FF9800;strokeWidth=1.5;html=1;';
                    const labelParts = [];
                    if (itemStereotype) labelParts.push(`<i>${escapeHtml(itemStereotype)}</i>`);
                    labelParts.push(`<b>${escapeHtml(itemName)}</b>`);
                    itemLabel = labelParts.join('<br/>');
                    nodePositions.push({ id: item.id, x: itemX + itemW / 2, y: itemY, bottom: itemY + itemH, type: 'assign' });
                    y += itemH + spacing;

                } else {
                    itemW = nodeWidth;
                    itemH = nodeHeight;
                    itemX = startX;
                    itemY = y;
                    itemStyle = 'rounded=1;fillColor=#FFFFFF;strokeColor=#666666;strokeWidth=1;html=1;';
                    itemLabel = `<b>${escapeHtml(itemName)}</b>`;
                    nodePositions.push({ id: item.id, x: itemX + itemW / 2, y: itemY, bottom: itemY + itemH, type: 'action' });
                    y += itemH + spacing;
                }

                const itemCell = graph.insertVertex(
                    vertex,
                    item.id,
                    itemLabel,
                    itemX,
                    itemY,
                    itemW,
                    itemH,
                    itemStyle
                );
                cellMap[item.id] = itemCell;
            }

            // Succession 엣지 생성 (점선 화살표)
            for (let i = 0; i < nodePositions.length - 1; i++) {
                const from = nodePositions[i];
                const to = nodePositions[i + 1];
                const fromCell = cellMap[from.id];
                const toCell = cellMap[to.id];
                if (fromCell && toCell) {
                    const edgeStyle = 'dashed=1;strokeColor=#666666;strokeWidth=1.5;endArrow=classic;endSize=6;';
                    graph.insertEdge(
                        vertex,
                        `${from.id}->${to.id}`,
                        '',
                        fromCell,
                        toCell,
                        edgeStyle
                    );
                }
            }

        } finally {
            graph.getModel().endUpdate();
        }

        // 부모 높이 업데이트 (loop body 높이 반영)
        const newHeight = y + 10;
        if (newHeight > parentGeo.height) {
            const newGeo = parentGeo.clone();
            newGeo.height = newHeight;
            graph.getModel().setGeometry(vertex, newGeo);
        }

        return cellMap;
    }

    // Export (MxCompartmentRenderer와 동일 네임스페이스 - 하위 호환)
    ns.MxGraph.compartment.createLoopBodyCells = createLoopBodyCells;

    console.log('[MxLoopBodyRenderer] 모듈 로드 완료');
})();
