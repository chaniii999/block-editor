/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxCompartmentRenderer.js - mxGraph Compartment 렌더링
 * Compartment 항목을 개별 mxCell 자식으로 렌더링 (클릭/선택 가능)
 * Loop body 렌더링은 MxLoopBodyRenderer.js에서 담당
 *
 * 의존 모듈:
 * - MxCompartmentHtml.js: HTML 빌드 유틸리티
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.compartment = ns.MxGraph.compartment || {};

    // HTML 유틸 모듈 참조
    function getHtmlUtils() {
        return ns.MxGraph.compartmentHtml || {};
    }

    function parseStylePx(style, key, fallback) {
        if (!style) return fallback;
        const m = String(style).match(new RegExp('(?:^|;)\\s*' + key + '=([^;]+)'));
        if (!m) return fallback;
        const n = parseFloat(m[1]);
        return Number.isFinite(n) ? n : fallback;
    }

    /**
     * compartment·푸터 decor 셀 geometry (부모 기준).
     * x는 spacingLeft만 반영(자식 좌표계). 폭은 stroke만 살짝 줄여 우측 넘침 방지.
     * html 셀은 overflow=fill 로 geometry 폭을 채워야 구분선이 보임(overflow=hidden+align=left 시 폭 붕괴).
     */
    function getVertexDecorBounds(vertex) {
        const geo = vertex?.getGeometry?.();
        if (!geo) return { x: 0, width: 1 };
        const style = vertex.getStyle() || '';
        const spacingLeft = parseStylePx(style, 'spacingLeft', 0);
        const spacingRight = parseStylePx(style, 'spacingRight', 0);
        const strokeTrim = Math.max(1, Math.ceil(parseStylePx(style, 'strokeWidth', 1)));
        const width = Math.max(1, geo.width - spacingLeft - spacingRight - strokeTrim);
        return { x: spacingLeft, width };
    }

    function dividerLineHtml(hrColor) {
        return (
            '<div style="display:block;box-sizing:border-box;width:100%;max-width:100%;' +
            'margin:0;padding:0;border:0;border-top:1px solid ' +
            hrColor +
            ';"></div>'
        );
    }

    /**
     * Compartment key → SysML 항목 타입 매핑
     */
    const COMPARTMENT_KEY_TO_TYPE = {
        'attributes': 'AttributeUsage',
        'references': 'ReferenceUsage',
        'parts': 'PartUsage',
        'items': 'ItemUsage',
        'ports': 'PortUsage',
        'enumeratedValue': 'EnumerationUsage',
        'enumeratedValues': 'EnumerationUsage',
        'constraints': 'ConstraintUsage',
        'doc': 'Documentation',
        'ends': 'EndFeatureMembership',
        'connections': 'ConnectionUsage',
        'interfaces': 'InterfaceUsage',
        'perform actions': 'PerformActionUsage',
        'performActions': 'PerformActionUsage',
        'metadata': 'MetadataUsage',
        'performed by': 'PerformActionUsage',
        'for iterator': 'ForLoopActionUsage',
        'loop body': 'ActionUsage',
        'concern': 'ConcernUsage',
        'stakeholder': 'StakeholderMembership',
        'subject': 'SubjectMembership',
        'objective': 'ObjectiveMembership',
        'occurrences': 'OccurrenceUsage',
        'successions': 'SuccessionAsUsage',
        'nestedPort': 'PortUsage',
        'nestedAttribute': 'AttributeUsage',
        'nestedInterface': 'InterfaceUsage',
        'parameters': 'ReferenceUsage',
        'actionFlow': 'ActionUsage',
    };

    /**
     * Compartment를 mxGraph 자식 셀로 렌더링합니다.
     * @param {mxGraph} graph - mxGraph 인스턴스
     * @param {mxCell} vertex - 부모 셀
     * @param {Array} compartments - compartment 배열
     * @param {Object} options - 옵션 (hasGraphChildren 등)
     * @returns {Object} 생성된 셀 맵 (id -> cell)
     */
    function createCompartmentCells(graph, vertex, compartments, options = {}) {
        if (!compartments || compartments.length === 0) {
            return {};
        }

        const htmlUtils = getHtmlUtils();
        const formatCompartmentItem = htmlUtils.formatCompartmentItem || function(item) { return String(item); };
        const cellMap = {};

        // 테마에 따른 텍스트 색상
        const isDark = ns.MxGraph.styleColors?.isDarkTheme?.() || false;
        const fontColor = isDark ? '#e0e0e0' : '#333333';
        const hrColor = isDark ? '#555555' : '#888888';

        try {
            const isActionFlowKey = (key) => key === 'action flow' || key === 'actionFlow';
            const actionFlowComp = compartments.find(c => isActionFlowKey(c.key));
            const hasActionFlowNodes = actionFlowComp && Array.isArray(actionFlowComp.items) && actionFlowComp.items.length > 0;
            const hasGraphChildren = !!options.hasGraphChildren;
            const showSeparator = hasActionFlowNodes || hasGraphChildren;
            // block editor에서 references compartment는 표시하지 않음 (allocation 등은 엣지로 표시)
            const visibleCompartments = compartments.filter(c => c.key !== 'references');

            if (visibleCompartments.length === 0 || visibleCompartments.every(c => (!c.items || c.items.length === 0) && c.headerOnly !== true)) {
                return {};
            }

            const DS = window.SELAB?.Editor?.config?.displaySettings;
            const HR_HEIGHT = DS?.compartment?.separatorHeight ?? 9;
            const HEADER_HEIGHT = DS?.compartment?.headerHeight ?? 20;
            const HEADER_PADDING = DS?.compartment?.headerPadding ?? 2;
            const ITEM_HEIGHT = DS?.compartment?.itemHeight ?? 16;

            const parentGeo = vertex.getGeometry();
            const { x: decorX, width: decorW } = getVertexDecorBounds(vertex);
            const decorStyle =
                'selectable=0;movable=0;resizable=0;connectable=0;' +
                'fillColor=none;strokeColor=none;html=1;overflow=fill;' +
                'align=left;verticalAlign=top;spacingLeft=0;spacingRight=0;';
            const hrCellsToFront = [];
            const metrics = ns.Editor?.metrics;
            const nodeData = vertex._nodeData;
            
            let labelHeight = 30;
            if (nodeData?._wrappedStereotype || nodeData?._wrappedName) {
                const stereotypeLines = nodeData._wrappedStereotype?.length || 0;
                const nameLines = nodeData._wrappedName?.length || 0;
                const totalLines = stereotypeLines + nameLines;
                const lineHeight = DS?.label?.lineHeight ?? 14;
                const paddingVertical = DS?.label?.paddingVertical ?? 16;
                labelHeight = totalLines * lineHeight + paddingVertical;
            } else {
                const labelText = nodeData?.name || '';
                labelHeight = metrics?.calculateLabelHeight
                    ? metrics.calculateLabelHeight(labelText)
                    : 30;
            }

            let y = labelHeight;
            let totalCompHeight = 0;
            if (nodeData) {
                nodeData._labelHeight = labelHeight;
            }
            vertex._labelHeight = labelHeight;

            let lastRenderIndex = -1;
            for (let i = visibleCompartments.length - 1; i >= 0; i--) {
                const c = visibleCompartments[i];
                const hasItems = c.items && c.items.length > 0;
                if (hasItems || isActionFlowKey(c.key) || c.headerOnly === true) {
                    lastRenderIndex = i;
                    break;
                }
            }

            graph.getModel().beginUpdate();
            try {
                for (let i = 0; i < visibleCompartments.length; i++) {
                    const comp = visibleCompartments[i];
                    const key = comp.key || 'compartment';
                    const items = Array.isArray(comp.items) ? comp.items : [];
                    const isHeaderOnly = comp.headerOnly === true;

                    if (isActionFlowKey(key)) {
                        const hrCellAf = graph.insertVertex(
                            vertex, null, '',
                            decorX, y, decorW, HR_HEIGHT,
                            decorStyle,
                        );
                        hrCellAf.setValue(dividerLineHtml(hrColor));
                        hrCellAf._isInteriorDecor = true;
                        hrCellsToFront.push(hrCellAf);
                        y += HR_HEIGHT;
                        totalCompHeight += HR_HEIGHT;
                        const afLabel = ns.Editor?.config?.compartmentLabels?.actionFlow ?? 'action flow';
                        const afHeaderCell = graph.insertVertex(
                            vertex, null, afLabel,
                            decorX, y, decorW, HEADER_HEIGHT + HEADER_PADDING,
                            'selectable=0;movable=0;resizable=0;connectable=0;' +
                            `fillColor=none;strokeColor=none;fontStyle=1;fontColor=${fontColor};` +
                            'align=left;spacingLeft=6;fontSize=11;verticalAlign=top;'
                        );
                        afHeaderCell._isInteriorDecor = true;
                        y += HEADER_HEIGHT + HEADER_PADDING;
                        totalCompHeight += HEADER_HEIGHT + HEADER_PADDING;
                        continue;
                    }

                    if (items.length === 0 && !isHeaderOnly) continue;

                    const hrCell = graph.insertVertex(
                        vertex, null, '',
                        decorX, y, decorW, HR_HEIGHT,
                        decorStyle,
                    );
                    hrCell.setValue(dividerLineHtml(hrColor));
                    hrCell._isInteriorDecor = true;
                    hrCellsToFront.push(hrCell);
                    y += HR_HEIGHT;
                    totalCompHeight += HR_HEIGHT;

                    const headerH = HEADER_HEIGHT + HEADER_PADDING;
                    const headerCell = graph.insertVertex(
                        vertex, null, key,
                        decorX, y, decorW, headerH,
                        'selectable=0;movable=0;resizable=0;connectable=0;' +
                        `fillColor=none;strokeColor=none;fontStyle=1;fontColor=${fontColor};` +
                        'align=left;spacingLeft=6;fontSize=11;verticalAlign=top;'
                    );
                    headerCell._isInteriorDecor = true;
                    y += headerH;
                    totalCompHeight += headerH;

                    if (isHeaderOnly) {
                        if (i === lastRenderIndex && showSeparator) {
                            const trailHrCell = graph.insertVertex(
                                vertex, null, '',
                                decorX, y, decorW, HR_HEIGHT,
                                decorStyle,
                            );
                            trailHrCell.setValue(dividerLineHtml(hrColor));
                            trailHrCell._isInteriorDecor = true;
                            hrCellsToFront.push(trailHrCell);
                            y += HR_HEIGHT;
                            totalCompHeight += HR_HEIGHT;
                        }
                        continue;
                    }

                    for (let j = 0; j < items.length; j++) {
                        const item = items[j];
                        const isSpecialComp = (key === 'doc' || key === 'constraints');

                        let itemH = ITEM_HEIGHT;
                        let itemLabel = '';

                        if (isSpecialComp && typeof item === 'object') {
                            if (key === 'constraints' && item.keyword) {
                                const rawBody = (item.body || item.name || '');
                                const cleanBody = rawBody.replace(/\r\n/g, '\n').replace(/\t+/g, '    ');
                                const bodyLines = cleanBody.split('\n').map(l => l.trim()).filter(Boolean);
                                itemLabel = item.keyword + ' {\n' + bodyLines.map(l => '    ' + l).join('\n') + '\n}';
                                const CHARS_PER_LINE = 25;
                                let wrapLines = 0;
                                for (const line of bodyLines) {
                                    wrapLines += Math.max(1, Math.ceil(line.length / CHARS_PER_LINE));
                                }
                                itemH = (wrapLines + 2) * ITEM_HEIGHT;
                            } else if (key === 'constraints' && item.body) {
                                const rawBody = (item.body || '');
                                const cleanBody = rawBody.replace(/\r\n/g, '\n').replace(/\t+/g, '    ');
                                const bodyLines = cleanBody.split('\n').map(l => l.trim()).filter(Boolean);
                                itemLabel = bodyLines.join('\n');
                                const CHARS_PER_LINE2 = 25;
                                let wrapLines2 = 0;
                                for (const line of bodyLines) {
                                    wrapLines2 += Math.max(1, Math.ceil(line.length / CHARS_PER_LINE2));
                                }
                                itemH = wrapLines2 * ITEM_HEIGHT;
                            } else {
                                itemLabel = item.body || item.name || '';
                                let linesCount = 1;
                                const compMaxWidth = Math.max(10, decorW - 20);
                                if (window.SELAB && window.SELAB.Editor && window.SELAB.Editor.metrics && window.SELAB.Editor.metrics.calculateWrappedLines) {
                                    linesCount = window.SELAB.Editor.metrics.calculateWrappedLines(itemLabel, compMaxWidth);
                                } else {
                                    const rawBody = itemLabel.replace(/\r\n/g, '\n').replace(/\t+/g, '    ');
                                    const bodyLines = rawBody.split('\n').map(l => l.trim()).filter(Boolean);
                                    let wrapLines = 0;
                                    for (const line of bodyLines) {
                                        wrapLines += Math.max(1, Math.ceil(line.length / 30));
                                    }
                                    linesCount = wrapLines > 0 ? wrapLines : 1;
                                }
                                itemH = linesCount * ITEM_HEIGHT;
                            }
                        } else {
                            itemLabel = (typeof item === 'object' && item.label)
                                ? item.label
                                : formatCompartmentItem(item);
                        }

                        const itemId = (typeof item === 'object' && item.id)
                            ? item.id
                            : null;

                        const itemCell = graph.insertVertex(
                            vertex, itemId, itemLabel,
                            decorX, y, decorW, itemH,
                            'movable=0;resizable=0;connectable=0;' +
                            `fillColor=none;strokeColor=none;fontColor=${fontColor};` +
                            'align=left;spacingLeft=14;fontSize=11;verticalAlign=top;' +
                            'whiteSpace=wrap;overflow=hidden;'
                        );

                        const itemType = COMPARTMENT_KEY_TO_TYPE[key] || '';

                        if (typeof item === 'object') {
                            if (!item.type && !item.kind) {
                                item.type = itemType;
                            }
                            item.parentId = item.parentId || nodeData?.id;
                            item.parentName = item.parentName || nodeData?.name;
                            item.compartmentKey = key;
                            itemCell._nodeData = item;
                        } else {
                            itemCell._nodeData = {
                                name: String(item),
                                type: itemType,
                                parentId: nodeData?.id,
                                parentName: nodeData?.name,
                                compartmentKey: key,
                                _isCompartmentItem: true,
                            };
                        }
                        itemCell._isCompartmentItem = true;

                        if (itemId) {
                            cellMap[itemId] = itemCell;
                        }

                        y += itemH;
                        totalCompHeight += itemH;
                    }

                    if (i === lastRenderIndex && showSeparator) {
                        const trailHrCell = graph.insertVertex(
                            vertex, null, '',
                            decorX, y, decorW, HR_HEIGHT,
                            decorStyle,
                        );
                        trailHrCell.setValue(dividerLineHtml(hrColor));
                        trailHrCell._isInteriorDecor = true;
                        hrCellsToFront.push(trailHrCell);
                        y += HR_HEIGHT;
                        totalCompHeight += HR_HEIGHT;
                    }
                }
                if (hrCellsToFront.length > 0 && typeof graph.orderCells === 'function') {
                    graph.orderCells(true, hrCellsToFront);
                }
            } finally {
                graph.getModel().endUpdate();
            }

            vertex._textCompartmentHeight = totalCompHeight;

        } catch (e) {
            console.error('[MxCompartmentRenderer] createCompartmentCells 오류:', e);
        }

        return cellMap;
    }

    function escapeFooterText(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function pinFeatureTypingFooterToBottom(graph, vertex) {
        const footerH =
            Number(vertex._featureUsageFooterHeight) ||
            Number(vertex._nodeData?._featureUsageFooterHeight) ||
            0;
        if (!footerH) return;
        const model = graph.getModel();
        const parentGeo = vertex.getGeometry();
        if (!parentGeo) return;
        const { x: decorX, width: decorW } = getVertexDecorBounds(vertex);
        model.beginUpdate();
        try {
            for (let i = 0; i < model.getChildCount(vertex); i++) {
                const child = model.getChildAt(vertex, i);
                if (!child?._isFeatureTypingFooter) continue;
                const geo = model.getGeometry(child);
                if (!geo) continue;
                const next = geo.clone();
                next.x = decorX;
                next.width = decorW;
                next.height = footerH;
                next.y = Math.max(0, parentGeo.height - footerH);
                model.setGeometry(child, next);
            }
        } finally {
            model.endUpdate();
        }
    }

    /** FeatureTyping 푸터 — 노드 박스 하단 단일 슬롯(구분선 + 텍스트) */
    function createFeatureTypingFooterCells(graph, vertex, names) {
        if (!graph || !vertex || !Array.isArray(names) || names.length === 0) {
            return 0;
        }

        const DS = window.SELAB?.Editor?.config?.displaySettings;
        const HR_HEIGHT = DS?.compartment?.separatorHeight ?? 9;
        const ITEM_HEIGHT = DS?.compartment?.itemHeight ?? 16;
        const padB = DS?.featureUsageSlot?.paddingBottom ?? 8;
        const padH = DS?.featureUsageSlot?.paddingHorizontal ?? 14;
        const footerH = HR_HEIGHT + names.length * ITEM_HEIGHT + padB;

        const isDark = ns.MxGraph.styleColors?.isDarkTheme?.() || false;
        const fontColor = isDark ? '#e0e0e0' : '#333333';
        const hrColor = isDark ? '#555555' : '#888888';

        const parentGeo = vertex.getGeometry();
        if (!parentGeo) return 0;

        const { x: decorX, width: decorW } = getVertexDecorBounds(vertex);
        const footerY = Math.max(0, parentGeo.height - footerH);
        const textBody = names.map((n) => escapeFooterText(n)).join('<br/>');
        const footerHtml =
            '<div style="box-sizing:border-box;width:100%;height:100%;margin:0;' +
            'padding:' + HR_HEIGHT + 'px ' + padH + 'px ' + padB + 'px ' + padH + 'px;' +
            'border-top:1px solid ' + hrColor + ';font-size:11px;line-height:' + ITEM_HEIGHT + 'px;' +
            'color:' + fontColor + ';text-align:left;">' + textBody + '</div>';

        const footerStyle =
            'selectable=0;movable=0;resizable=0;connectable=0;' +
            'fillColor=none;strokeColor=none;html=1;overflow=fill;' +
            'align=left;verticalAlign=bottom;spacingLeft=0;spacingRight=0;';

        graph.getModel().beginUpdate();
        try {
            const footerCell = graph.insertVertex(
                vertex,
                null,
                '',
                decorX,
                footerY,
                decorW,
                footerH,
                footerStyle,
            );
            footerCell.setValue(footerHtml);
            footerCell._isFeatureTypingFooter = true;
        } finally {
            graph.getModel().endUpdate();
        }

        if (vertex._nodeData) {
            vertex._nodeData._featureUsageFooterHeight = footerH;
        }
        vertex._featureUsageFooterHeight = footerH;
        return footerH;
    }

    function syncInteriorDecorCellWidths(graph, vertex) {
        if (!graph || !vertex) return;
        const model = graph.getModel();
        if (!model.isVertex(vertex)) return;
        const parentGeo = vertex.getGeometry();
        if (!parentGeo) return;
        const { x: decorX, width: decorW } = getVertexDecorBounds(vertex);
        model.beginUpdate();
        try {
            for (let i = 0; i < model.getChildCount(vertex); i++) {
                const child = model.getChildAt(vertex, i);
                if (!child) continue;
                if (child._isFeatureTypingFooter) continue;
                if (!child._isInteriorDecor && !child._isCompartmentItem) continue;
                const geo = model.getGeometry(child);
                if (!geo) continue;
                const next = geo.clone();
                next.x = decorX;
                next.width = decorW;
                model.setGeometry(child, next);
            }
            pinFeatureTypingFooterToBottom(graph, vertex);
        } finally {
            model.endUpdate();
        }
    }

    function syncAllInteriorDecorWidths(graph, cellMap) {
        if (!graph || !cellMap) return;
        for (const id of Object.keys(cellMap)) {
            const cell = cellMap[id];
            if (!cell) continue;
            syncInteriorDecorCellWidths(graph, cell);
        }
    }

    // Export (하위 호환성 유지)
    ns.MxGraph.compartment.createCompartmentCells = createCompartmentCells;
    ns.MxGraph.compartment.createFeatureTypingFooterCells = createFeatureTypingFooterCells;
    ns.MxGraph.compartment.pinFeatureTypingFooterToBottom = pinFeatureTypingFooterToBottom;
    ns.MxGraph.compartment.syncAllInteriorDecorWidths = syncAllInteriorDecorWidths;
    ns.MxGraph.compartment.getVertexDecorBounds = getVertexDecorBounds;
    ns.MxGraph.compartment.getVertexContentBounds = getVertexDecorBounds;
    
    // HTML 유틸 함수도 하위 호환성을 위해 노출
    ns.MxGraph.compartment.buildCompartmentHtml = function(compartments, showSeparator) {
        const htmlUtils = getHtmlUtils();
        if (typeof htmlUtils.buildCompartmentHtml === 'function') {
            return htmlUtils.buildCompartmentHtml(compartments, showSeparator);
        }
        return { html: '', height: 0 };
    };

    console.log('[MxCompartmentRenderer] 모듈 로드 완료');
})();
