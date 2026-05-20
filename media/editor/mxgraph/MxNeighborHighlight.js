/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 선택 노드·연관관계(associations JSON) 노드 테두리·mx 엣지 하이라이트
 ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.neighborHighlight = ns.MxGraph.neighborHighlight || {};

    /** primary: 선택 노드 / edgeStroke: mx 엣지 / associationStroke: JSON 연관 노드 */
    function getNeighborHighlightPalette() {
        const dark =
            typeof ns.MxGraph?.styleColors?.isDarkTheme === 'function' &&
            ns.MxGraph.styleColors.isDarkTheme();
        if (dark) {
            return {
                edgeStroke: '#6ec1ff',
                connectedStroke: '#4dd0e1',
                associationStroke: '#ce93d8',
                primaryStroke: '#ffb74d',
                fill: '#383838',
            };
        }
        return {
            edgeStroke: '#0078d4',
            connectedStroke: '#00897b',
            associationStroke: '#7b1fa2',
            primaryStroke: '#e65100',
            fill: '#f0f3f6',
        };
    }

    const HL_STROKE_W_EDGE = '3';
    const HL_STROKE_W_VERTEX = '3';
    const HL_STROKE_W_PRIMARY_VERTEX = '4';
    const HL_STROKE_W_PRIMARY_EDGE = '3';

    let lastHighlighted = [];
    const styleBackup = new Map();

    function log(prefix, msg) {
        try {
            console.log('[MxNeighborHighlight]', prefix, msg);
        } catch (_) {}
    }

    function resolveTraversalSeed(cell) {
        if (!cell) {
            return null;
        }
        if (cell._isCompartmentItem && cell.getParent) {
            const p = cell.getParent();
            if (p && p._nodeData) {
                return p;
            }
        }
        return cell;
    }

    function cellKey(cell) {
        if (!cell) {
            return '';
        }
        const id = cell.getId != null ? cell.getId() : cell.id;
        return id != null ? String(id) : '';
    }

    function getDiagramModel() {
        const app = ns.Editor._app;
        if (app?.model && Array.isArray(app.model.associations)) {
            return app.model;
        }
        const last = ns.Editor._lastNormalizedModel;
        if (last && Array.isArray(last.associations)) {
            return last;
        }
        return app?.model || last || null;
    }

    function resolveCellByNodeId(graph, nodeId) {
        if (!graph || nodeId == null) {
            return null;
        }
        const model = graph.getModel();
        const key = String(nodeId);
        let cell = model.getCell(key);
        if (cell && model.contains(cell)) {
            return cell;
        }
        const root = graph.getDefaultParent?.();
        if (!root) {
            return null;
        }
        const stack = graph.getChildCells(root, true, true) || [];
        for (let i = 0; i < stack.length; i++) {
            const c = stack[i];
            const data = c?._nodeData;
            if (data && String(data.id) === key) {
                return c;
            }
        }
        return null;
    }

    function resolveLookupIds(nodeId, elements) {
        const ids = new Set([String(nodeId)]);
        for (const el of elements || []) {
            if (!el?.id) {
                continue;
            }
            if (el._specCloneOf && String(el._specCloneOf) === String(nodeId)) {
                ids.add(String(el.id));
            }
            if (String(el.id) === String(nodeId) && el._specCloneOf) {
                ids.add(String(el._specCloneOf));
            }
        }
        return ids;
    }

    /** JSON associations — mxGraph에 없는 연관관계만 */
    function collectAssociationPartnerIds(nodeId, diagram) {
        const out = new Set();
        if (!diagram || !Array.isArray(diagram.associations)) {
            return out;
        }
        const lookupIds = resolveLookupIds(nodeId, diagram.elements || []);
        for (const assoc of diagram.associations) {
            const src = String(assoc.source || '');
            const tgt = String(assoc.target || '');
            const srcHit = lookupIds.has(src);
            const tgtHit = lookupIds.has(tgt);
            if (!srcHit && !tgtHit) {
                continue;
            }
            if (srcHit && !lookupIds.has(tgt)) {
                out.add(tgt);
            }
            if (tgtHit && !lookupIds.has(src)) {
                out.add(src);
            }
        }
        return out;
    }

    function resolvePrimaryTargets(graph, seedCells) {
        const model = graph.getModel();
        const primary = new Set();
        for (let i = 0; i < seedCells.length; i++) {
            const s = resolveTraversalSeed(seedCells[i]);
            if (!s || !model.contains(s)) {
                continue;
            }
            if (model.isVertex(s)) {
                const key = cellKey(s);
                if (key) {
                    primary.add(key);
                }
            } else if (model.isEdge(s)) {
                const a = model.getTerminal(s, true);
                const b = model.getTerminal(s, false);
                const ak = cellKey(a);
                const bk = cellKey(b);
                if (ak) {
                    primary.add(ak);
                }
                if (bk) {
                    primary.add(bk);
                }
            }
        }
        return primary;
    }

    function collectHighlightTargets(graph, seedCells) {
        const model = graph.getModel();
        const diagram = getDiagramModel();
        const primaryKeys = resolvePrimaryTargets(graph, seedCells);
        const seen = new Set();
        const items = [];

        function push(cell, isEdge, isPrimary, isAssociation, isConnected) {
            if (!cell || !model.contains(cell)) {
                return;
            }
            if (seen.has(cell)) {
                for (let j = 0; j < items.length; j++) {
                    if (items[j].cell !== cell) {
                        continue;
                    }
                    const it = items[j];
                    it.isPrimary = it.isPrimary || !!isPrimary;
                    it.isAssociation = it.isAssociation || !!isAssociation;
                    it.isConnected = it.isConnected || !!isConnected;
                    if (isEdge) {
                        it.isEdge = true;
                    }
                    return;
                }
                return;
            }
            seen.add(cell);
            items.push({
                cell,
                isEdge: !!isEdge,
                isPrimary: !!isPrimary,
                isAssociation: !!isAssociation,
                isConnected: !!isConnected,
            });
        }

        const associationKeys = new Set();
        for (const key of primaryKeys) {
            for (const partnerId of collectAssociationPartnerIds(key, diagram)) {
                associationKeys.add(partnerId);
            }
        }

        for (const key of primaryKeys) {
            const v = resolveCellByNodeId(graph, key);
            if (!v || !model.isVertex(v)) {
                continue;
            }
            push(v, false, true, false, false);
            let edgeList = [];
            if (typeof graph.getEdges === 'function') {
                edgeList = graph.getEdges(v, null, true, true, true) || [];
            } else {
                const ec = model.getEdgeCount(v);
                for (let i = 0; i < ec; i++) {
                    edgeList.push(model.getEdgeAt(v, i));
                }
            }
            for (let i = 0; i < edgeList.length; i++) {
                const e = edgeList[i];
                push(e, true, false, false, false);
                const t0 = model.getTerminal(e, true);
                const t1 = model.getTerminal(e, false);
                for (let t = 0; t < 2; t++) {
                    const end = t === 0 ? t0 : t1;
                    if (!end || !model.isVertex(end)) {
                        continue;
                    }
                    const ek = cellKey(end);
                    if (!ek || primaryKeys.has(ek) || associationKeys.has(ek)) {
                        continue;
                    }
                    push(end, false, false, false, true);
                }
            }
        }

        for (let i = 0; i < seedCells.length; i++) {
            const s = resolveTraversalSeed(seedCells[i]);
            if (s && model.isEdge(s)) {
                push(s, true, false, false, false);
            }
        }

        for (const partnerId of associationKeys) {
            if (primaryKeys.has(partnerId)) {
                continue;
            }
                const p = resolveCellByNodeId(graph, partnerId);
                push(p, false, false, true, false);
        }

        return items;
    }

    function clearFocusHighlight(graph) {
        const model = graph.getModel();
        model.beginUpdate();
        try {
            for (let i = 0; i < lastHighlighted.length; i++) {
                const cell = lastHighlighted[i];
                if (!cell || !model.contains(cell)) {
                    continue;
                }
                const prev = styleBackup.get(cell);
                if (prev !== undefined) {
                    model.setStyle(cell, prev);
                }
            }
        } catch (err) {
            log('clear', err);
        } finally {
            model.endUpdate();
        }
        lastHighlighted = [];
        styleBackup.clear();
        try {
            graph.view.validate();
        } catch (_) {}
    }

    function mergeHighlightStyle(graph, cell, isEdge, isPrimary, isAssociation, isConnected) {
        const pal = getNeighborHighlightPalette();
        let stroke = pal.edgeStroke;
        if (isPrimary) {
            stroke = pal.primaryStroke;
        } else if (isAssociation) {
            stroke = pal.associationStroke;
        } else if (isConnected && !isEdge) {
            stroke = pal.connectedStroke;
        }
        const strokeW = isPrimary
            ? isEdge
                ? HL_STROKE_W_PRIMARY_EDGE
                : HL_STROKE_W_PRIMARY_VERTEX
            : isEdge
              ? HL_STROKE_W_EDGE
              : HL_STROKE_W_VERTEX;
        const cur = graph.getModel().getStyle(cell) || '';
        const borderOnlyVertex = !isEdge && !isPrimary;
        let next = cur;
        try {
            if (typeof mxUtils !== 'undefined' && mxUtils.setStyle) {
                next = mxUtils.setStyle(next, mxConstants.STYLE_STROKECOLOR, stroke);
                next = mxUtils.setStyle(next, mxConstants.STYLE_STROKEWIDTH, strokeW);
                if (!isEdge && isPrimary) {
                    next = mxUtils.setStyle(next, mxConstants.STYLE_FILLCOLOR, pal.fill);
                }
            } else {
                next =
                    (cur ? cur + ';' : '') +
                    'strokeColor=' +
                    stroke +
                    ';strokeWidth=' +
                    strokeW +
                    (borderOnlyVertex ? '' : !isEdge ? ';fillColor=' + pal.fill : '');
            }
        } catch (_) {
            next = cur;
        }
        return next;
    }

    function applyFocusHighlight(graph, cells) {
        clearFocusHighlight(graph);
        if (!cells || cells.length === 0) {
            return;
        }

        const model = graph.getModel();
        const targets = collectHighlightTargets(graph, cells);
        if (targets.length === 0) {
            return;
        }

        model.beginUpdate();
        try {
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                const cell = t.cell;
                const isEdge = t.isEdge || model.isEdge(cell);
                if (!isEdge && !model.isVertex(cell)) {
                    continue;
                }
                const raw = model.getStyle(cell);
                if (!styleBackup.has(cell)) {
                    styleBackup.set(cell, raw != null ? raw : '');
                }
                const next = mergeHighlightStyle(
                    graph,
                    cell,
                    isEdge,
                    t.isPrimary,
                    t.isAssociation,
                    t.isConnected,
                );
                model.setStyle(cell, next);
                lastHighlighted.push(cell);
            }
        } catch (err) {
            log('apply', err);
        } finally {
            model.endUpdate();
        }
        try {
            graph.view.validate();
        } catch (_) {}
    }

    function handleSelectionChange(graph) {
        const cells = graph.getSelectionCells() || [];
        if (cells.length === 0) {
            clearFocusHighlight(graph);
            return;
        }
        if (cells.length > 1) {
            clearFocusHighlight(graph);
            return;
        }
        const c = cells[0];
        const model = graph.getModel();
        if (!c || !model.contains(c)) {
            clearFocusHighlight(graph);
            return;
        }
        if (!model.isEdge(c) && !model.isVertex(c)) {
            clearFocusHighlight(graph);
            return;
        }
        applyFocusHighlight(graph, cells);
    }

    function init(graph) {
        if (!graph || graph._neighborHighlightInit) {
            return;
        }
        graph._neighborHighlightInit = true;
        const sm = graph.getSelectionModel && graph.getSelectionModel();
        if (!sm || typeof sm.addListener !== 'function') {
            return;
        }
        sm.addListener(mxEvent.CHANGE, function handleNeighborHighlightSelection() {
            handleSelectionChange(graph);
        });
        log('init', 'selection 연동');
    }

    ns.MxGraph.neighborHighlight.init = init;
    ns.MxGraph.neighborHighlight.clear = clearFocusHighlight;
})();
