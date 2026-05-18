/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * BDD 노드 배치 — README 직교 품질 기준 (계층·대칭·간격·겹침 없음)
 * - containment: ELK 복합 배치
 * - specialization: ELK 제외 후 수직 밴드 + 부모 아래 자식 대칭 배치
 ********************************************************************************/
(function () {
    'use strict';

    const NS = (window.SELAB = window.SELAB || {});
    NS.Editor = NS.Editor || {};
    NS.Editor.layout = NS.Editor.layout || {};

    function isSpecKind(kind) {
        if (!kind) return false;
        const k = String(kind).toLowerCase();
        return (
            k.includes('specialization') ||
            k.includes('specialzation') ||
            k.includes('generalization') ||
            k.includes('inheritance') ||
            k === 'subclassification'
        );
    }

    function getBddCfg(elkCfg) {
        const DS = NS.Editor?.config?.displaySettings;
        const bdd = DS?.bdd || {};
        return {
            layerGap:
                Number(bdd.specLayerGap) ||
                Number(elkCfg?.nodeNodeBetweenLayers) ||
                80,
            siblingGap:
                Number(bdd.specSiblingGap) ||
                Number(elkCfg?.nodeNodeSpacing) ||
                100,
            corridorGap: Number(bdd.specCorridorGap) || 32,
            margin: Number(bdd.diagramMargin) || 48,
            siblingPad: Number(bdd.siblingOverlapGap) || 24,
        };
    }

    function indexElements(elements) {
        const byId = new Map();
        for (const el of elements) {
            if (el?.id && !el.hidden) byId.set(el.id, el);
        }
        return byId;
    }

    /** spec 엣지 waypoint 제거 — 렌더 시 SpecEdgeRouter 가 담당 */
    function clearSpecWaypoints(diagramData) {
        const connections = Array.isArray(diagramData?.connections)
            ? diagramData.connections
            : [];
        for (const conn of connections) {
            if (isSpecKind(conn.kind || conn.type)) {
                delete conn.waypoints;
            }
        }
    }

    /**
     * 부모(target) Y 밴드 < 자식(source) — 루트 spec 계층
     */
    function applySpecVerticalBands(diagramData, cfg) {
        const elements = Array.isArray(diagramData?.elements)
            ? diagramData.elements
            : [];
        const connections = Array.isArray(diagramData?.connections)
            ? diagramData.connections
            : [];
        if (elements.length === 0 || connections.length === 0) return;

        const byId = indexElements(elements);
        const childToParent = new Map();
        const involved = new Set();

        for (const conn of connections) {
            if (!isSpecKind(conn.kind || conn.type)) continue;
            const childId = conn.source;
            const parentId = conn.target;
            if (!byId.has(childId) || !byId.has(parentId) || childId === parentId) {
                continue;
            }
            childToParent.set(childId, parentId);
            involved.add(childId);
            involved.add(parentId);
        }
        if (involved.size === 0) return;

        function layoutRootId(nodeId) {
            let cur = byId.get(nodeId);
            while (cur?.parent && byId.has(cur.parent)) {
                cur = byId.get(cur.parent);
            }
            return cur?.id || nodeId;
        }

        const layer = new Map();
        function assignLayer(nodeId) {
            if (layer.has(nodeId)) return layer.get(nodeId);
            const parentId = childToParent.get(nodeId);
            const value = parentId ? assignLayer(parentId) + 1 : 0;
            layer.set(nodeId, value);
            return value;
        }
        for (const id of involved) assignLayer(id);

        const rootsByLayer = new Map();
        for (const id of involved) {
            const rootId = layoutRootId(id);
            const l = layer.get(id) ?? 0;
            const prev = rootsByLayer.get(rootId);
            rootsByLayer.set(rootId, prev == null ? l : Math.max(prev, l));
        }

        const layerToRoots = new Map();
        for (const [rootId, l] of rootsByLayer) {
            if (!layerToRoots.has(l)) layerToRoots.set(l, []);
            layerToRoots.get(l).push(rootId);
        }

        const layerGap = cfg.layerGap;
        const startY = Math.min(
            ...[...rootsByLayer.keys()].map((id) => Number(byId.get(id)?.y) || 0),
        );
        let bandY = Number.isFinite(startY) ? startY : 50;
        const sortedLayers = [...layerToRoots.keys()].sort((a, b) => a - b);

        for (const l of sortedLayers) {
            const rootIds = layerToRoots.get(l) || [];
            let bandHeight = 0;
            for (const rootId of rootIds) {
                const n = byId.get(rootId);
                bandHeight = Math.max(bandHeight, Number(n?.height) || 60);
            }
            for (const rootId of rootIds) {
                const n = byId.get(rootId);
                if (!n) continue;
                const dy = bandY - (Number(n.y) || 0);
                if (Math.abs(dy) > 1) {
                    n.y = (Number(n.y) || 0) + dy;
                    if (!n.parent) n.relativeY = n.y;
                }
            }
            bandY += bandHeight + layerGap;
        }
    }

    /**
     * 같은 부모의 spec 자식 — 부모 중심 아래 대칭 가로 배치 + spec 통로(corridor) 확보
     */
    function applySpecChildrenSymmetric(diagramData, cfg) {
        const elements = Array.isArray(diagramData?.elements)
            ? diagramData.elements
            : [];
        const connections = Array.isArray(diagramData?.connections)
            ? diagramData.connections
            : [];
        const byId = indexElements(elements);

        const specChildrenOf = new Map();
        for (const conn of connections) {
            if (!isSpecKind(conn.kind || conn.type)) continue;
            const childId = conn.source;
            const parentId = conn.target;
            if (!byId.has(childId) || !byId.has(parentId) || childId === parentId) {
                continue;
            }
            if (!specChildrenOf.has(parentId)) specChildrenOf.set(parentId, []);
            specChildrenOf.get(parentId).push(childId);
        }

        const siblingGap = cfg.siblingGap;
        const belowParentGap = Math.max(cfg.layerGap, cfg.corridorGap + 24);

        for (const [parentId, childIds] of specChildrenOf) {
            const parent = byId.get(parentId);
            if (!parent || parent.parent) continue;

            const children = childIds
                .map((id) => byId.get(id))
                .filter((c) => c && !c.hidden && !c.parent);
            if (children.length === 0) continue;

            children.sort((a, b) =>
                String(a.name || a.id).localeCompare(String(b.name || b.id)),
            );

            const px = Number(parent.x) || 0;
            const py = Number(parent.y) || 0;
            const pw = Number(parent.width) || 120;
            const ph = Number(parent.height) || 60;
            const pcx = px + pw / 2;

            const belowY = py + ph + belowParentGap;
            let rowW = 0;
            for (const c of children) {
                rowW += Number(c.width) || 120;
            }
            rowW += siblingGap * Math.max(0, children.length - 1);
            let cx = pcx - rowW / 2;
            for (const c of children) {
                const cw = Number(c.width) || 120;
                c.x = cx;
                c.y = belowY;
                if (!parent.parent) {
                    c.relativeX = c.x;
                    c.relativeY = c.y;
                }
                cx += cw + siblingGap;
            }
        }
    }

    /** 형제 bbox 겹침 해소 (동일 parent) */
    function resolveSiblingOverlaps(diagramData, gap) {
        const elements = Array.isArray(diagramData?.elements)
            ? diagramData.elements
            : [];
        const visible = elements.filter((e) => e && !e.hidden && e.id);
        const GAP = gap ?? 24;
        const MAX_PASS = 16;

        function bounds(el) {
            const x = Number(el.relativeX ?? el.x) || 0;
            const y = Number(el.relativeY ?? el.y) || 0;
            return {
                x,
                y,
                w: Number(el.width) || 120,
                h: Number(el.height) || 60,
            };
        }

        function overlaps(a, b) {
            return (
                a.x < b.x + b.w + GAP &&
                a.x + a.w + GAP > b.x &&
                a.y < b.y + b.h + GAP &&
                a.y + a.h + GAP > b.y
            );
        }

        function shiftSubtree(el, dx, dy) {
            if (dx) {
                el.x = (Number(el.x) || 0) + dx;
                if (typeof el.relativeX === 'number') el.relativeX += dx;
            }
            if (dy) {
                el.y = (Number(el.y) || 0) + dy;
                if (typeof el.relativeY === 'number') el.relativeY += dy;
            }
            for (const child of visible) {
                if (String(child.parent) === String(el.id)) {
                    shiftSubtree(child, dx, dy);
                }
            }
        }

        const childrenByParent = new Map();
        for (const el of visible) {
            const pid = el.parent ? String(el.parent) : '__root__';
            if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
            childrenByParent.get(pid).push(el);
        }

        for (let pass = 0; pass < MAX_PASS; pass++) {
            let moved = false;
            for (const [, siblings] of childrenByParent) {
                if (siblings.length < 2) continue;
                siblings.sort((a, b) => {
                    const ba = bounds(a);
                    const bb = bounds(b);
                    if (Math.abs(ba.y - bb.y) > GAP) return ba.y - bb.y;
                    return ba.x - bb.x;
                });
                for (let i = 0; i < siblings.length - 1; i++) {
                    const a = bounds(siblings[i]);
                    const b = bounds(siblings[i + 1]);
                    if (!overlaps(a, b)) continue;
                    const dx = a.x + a.w + GAP - b.x;
                    if (dx > 0) {
                        shiftSubtree(siblings[i + 1], dx, 0);
                        moved = true;
                    }
                    const dy = a.y + a.h + GAP - b.y;
                    if (dy > 0 && Math.abs(a.x - b.x) < GAP + Math.min(a.w, b.w)) {
                        shiftSubtree(siblings[i + 1], 0, dy);
                        moved = true;
                    }
                }
            }
            if (!moved) break;
        }
    }

    function fitDiagramToMargins(diagramData, margin) {
        const m = Number(margin) || 40;
        const elements = Array.isArray(diagramData?.elements)
            ? diagramData.elements
            : [];
        const visible = elements.filter((e) => e && !e.hidden && e.id);
        if (visible.length === 0) return;

        let minX = Infinity;
        let minY = Infinity;
        for (const el of visible) {
            minX = Math.min(minX, Number(el.x) || 0);
            minY = Math.min(minY, Number(el.y) || 0);
        }
        if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;

        const dx = minX < m ? m - minX : 0;
        const dy = minY < m ? m - minY : 0;
        if (dx === 0 && dy === 0) return;

        function shiftSubtree(el) {
            el.x = (Number(el.x) || 0) + dx;
            el.y = (Number(el.y) || 0) + dy;
            if (!el.parent) {
                if (typeof el.relativeX === 'number') el.relativeX += dx;
                else el.relativeX = el.x;
                if (typeof el.relativeY === 'number') el.relativeY += dy;
                else el.relativeY = el.y;
            }
            for (const child of visible) {
                if (String(child.parent) === String(el.id)) shiftSubtree(child);
            }
        }

        for (const el of visible) {
            if (!el.parent) shiftSubtree(el);
        }
    }

    /**
     * ELK 배치 후 BDD 후처리 파이프라인
     */
    function applyPostLayout(diagramData, elkCfg) {
        if (!diagramData) return;
        const cfg = getBddCfg(elkCfg);
        applySpecVerticalBands(diagramData, cfg);
        applySpecChildrenSymmetric(diagramData, cfg);
        fitDiagramToMargins(diagramData, cfg.margin);
        resolveSiblingOverlaps(diagramData, cfg.siblingPad);
        clearSpecWaypoints(diagramData);
    }

    NS.Editor.layout.bdd = {
        isSpecKind,
        applyPostLayout,
        applySpecVerticalBands,
        applySpecChildrenSymmetric,
        resolveSiblingOverlaps,
        fitDiagramToMargins,
        clearSpecWaypoints,
    };
})();
