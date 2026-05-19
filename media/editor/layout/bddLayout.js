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

    /** ELK는 x,y 절대·relativeX/Y 부모 기준 — 둘에 동일 delta를 더하면 mx 좌표가 깨짐 */
    function syncRelativeFromAbsolute(node, byId) {
        if (!node) {
            return;
        }
        const pid = node.parent;
        if (!pid || !byId?.has(pid)) {
            node.relativeX = Number(node.x) || 0;
            node.relativeY = Number(node.y) || 0;
            return;
        }
        const p = byId.get(pid);
        node.relativeX = (Number(node.x) || 0) - (Number(p.x) || 0);
        node.relativeY = (Number(node.y) || 0) - (Number(p.y) || 0);
    }

    /** containment 자식: relativeY 체인 또는 절대 y */
    function absoluteTop(el, byId) {
        if (!el) {
            return 0;
        }
        if (!el.parent || !byId.has(el.parent)) {
            return Number(el.y) || 0;
        }
        const ry = Number(el.relativeY);
        if (Number.isFinite(ry)) {
            return absoluteTop(byId.get(el.parent), byId) + ry;
        }
        return Number(el.y) || 0;
    }

    function absoluteBottom(el, byId) {
        const h = Number(el.height) || 60;
        return absoluteTop(el, byId) + h;
    }

    function elementOnSpineStack(el, byId) {
        let cur = el;
        while (cur) {
            if (cur._compactContainmentSpine || cur._containmentSpineChain) {
                return true;
            }
            const pid = cur.parent;
            if (!pid || !byId.has(pid)) {
                break;
            }
            cur = byId.get(pid);
        }
        return false;
    }

    function spineStackRootId(el, byId) {
        let cur = el;
        let rootId = el?.id;
        while (cur) {
            if (cur._compactContainmentSpine || cur._containmentSpineChain) {
                rootId = cur.id;
            }
            const pid = cur.parent;
            if (!pid || !byId.has(pid)) {
                break;
            }
            cur = byId.get(pid);
        }
        return rootId;
    }

    /** 스파인 spec — clearSpecWaypoints 직전, 평행 차선용 X·buffer 힌트 */
    function assignSpecSpineLaneOffsets(diagramData) {
        const connections = Array.isArray(diagramData?.connections)
            ? diagramData.connections
            : [];
        const elements = Array.isArray(diagramData?.elements)
            ? diagramData.elements
            : [];
        if (connections.length === 0) {
            return;
        }
        const byId = indexElements(elements);
        const laneStep =
            Number(NS.Editor?.config?.displaySettings?.edgeObstacle?.specSpineLaneStep) ||
            4;
        const groups = new Map();

        for (const conn of connections) {
            if (!isSpecKind(conn.kind || conn.type)) {
                continue;
            }
            const tgt = byId.get(conn.target);
            if (!tgt || !elementOnSpineStack(tgt, byId)) {
                delete conn.specLaneOffsetPx;
                delete conn.specObstacleBufferExtra;
                continue;
            }
            const key = spineStackRootId(tgt, byId);
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push({
                conn,
                depth: absoluteTop(tgt, byId),
                entryY: absoluteBottom(tgt, byId),
                id: String(conn.target),
            });
        }

        for (const [, arr] of groups) {
            if (arr.length <= 1) {
                delete arr[0].conn.specLaneOffsetPx;
                delete arr[0].conn.specObstacleBufferExtra;
                continue;
            }
            const targetIds = new Set(arr.map((x) => String(x.conn.target)));
            if (targetIds.size <= 1) {
                for (const x of arr) {
                    delete x.conn.specLaneOffsetPx;
                    delete x.conn.specObstacleBufferExtra;
                }
                continue;
            }
            arr.sort(
                (a, b) =>
                    a.depth - b.depth ||
                    a.entryY - b.entryY ||
                    a.id.localeCompare(b.id),
            );
            const n = arr.length;
            for (let i = 0; i < n; i++) {
                arr[i].conn.specLaneOffsetPx = (i - (n - 1) / 2) * laneStep;
                arr[i].conn.specObstacleBufferExtra = i * laneStep;
            }
        }
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
     * 부모(target) Y 밴드 < 자식(source) — spec 트리(숲)마다 독립 적용
     * (test-5: Signal·Bus·Transmitter·Receiver를 한 줄 Y에 몰지 않음)
     */
    function applySpecVerticalBands(diagramData, cfg) {
        const elements = Array.isArray(diagramData?.elements)
            ? diagramData.elements
            : [];
        const connections = Array.isArray(diagramData?.connections)
            ? diagramData.connections
            : [];
        if (elements.length === 0 || connections.length === 0) return;

        const visible = elements.filter((e) => e && !e.hidden && e.id);
        const byId = indexElements(elements);
        const childToParents = new Map();
        const childrenOf = new Map();
        const involved = new Set();

        for (const conn of connections) {
            if (!isSpecKind(conn.kind || conn.type)) continue;
            const childId = conn.source;
            const parentId = conn.target;
            if (!byId.has(childId) || !byId.has(parentId) || childId === parentId) {
                continue;
            }
            if (!childToParents.has(childId)) {
                childToParents.set(childId, []);
            }
            const plist = childToParents.get(childId);
            if (!plist.includes(parentId)) {
                plist.push(parentId);
            }
            if (!childrenOf.has(parentId)) {
                childrenOf.set(parentId, []);
            }
            const clist = childrenOf.get(parentId);
            if (!clist.includes(childId)) {
                clist.push(childId);
            }
            involved.add(childId);
            involved.add(parentId);
        }
        if (involved.size === 0) return;

        const layerGap = cfg.layerGap;

        function assignLayer(nodeId, layer) {
            if (layer.has(nodeId)) {
                return layer.get(nodeId);
            }
            const parents = childToParents.get(nodeId) || [];
            let value = 0;
            if (parents.length > 0) {
                value =
                    Math.max(...parents.map((p) => assignLayer(p, layer))) + 1;
            }
            layer.set(nodeId, value);
            return value;
        }

        function collectSpecSubtree(forestRootId) {
            const out = new Set([forestRootId]);
            const q = [forestRootId];
            while (q.length > 0) {
                const pid = q.shift();
                for (const cid of childrenOf.get(pid) || []) {
                    if (!out.has(cid)) {
                        out.add(cid);
                        q.push(cid);
                    }
                }
            }
            return out;
        }

        const forestRoots = [];
        for (const id of involved) {
            if (!childToParents.has(id)) {
                forestRoots.push(id);
            }
        }

        for (const forestRootId of forestRoots) {
            const subtree = collectSpecSubtree(forestRootId);
            const layer = new Map();
            for (const id of subtree) {
                assignLayer(id, layer);
            }

            const layerToNodes = new Map();
            for (const id of subtree) {
                const l = layer.get(id) ?? 0;
                if (!layerToNodes.has(l)) {
                    layerToNodes.set(l, []);
                }
                layerToNodes.get(l).push(id);
            }

            let bandY = Infinity;
            for (const id of subtree) {
                bandY = Math.min(bandY, Number(byId.get(id)?.y) || 0);
            }
            if (!Number.isFinite(bandY)) {
                bandY = 50;
            }

            const sortedLayers = [...layerToNodes.keys()].sort((a, b) => a - b);
            for (const l of sortedLayers) {
                const nodeIds = layerToNodes.get(l) || [];
                for (const id of nodeIds) {
                    const n = byId.get(id);
                    if (!n) {
                        continue;
                    }
                    // containment 안에 있는 노드는 컨테이너 좌표 유지 (test-2 Triangle@Layer)
                    if (n.parent && byId.has(n.parent)) {
                        continue;
                    }
                    const oldY = Number(n.y) || 0;
                    const dy = bandY - oldY;
                    if (Math.abs(dy) > 1) {
                        n.y = oldY + dy;
                        syncRelativeFromAbsolute(n, byId);
                        shiftDescendantsOf(n.id, 0, dy, visible, byId);
                    }
                }
                let layerBottom = bandY;
                for (const id of nodeIds) {
                    const n = byId.get(id);
                    if (!n) {
                        continue;
                    }
                    const bottom =
                        (Number(n.y) || 0) + (Number(n.height) || 60);
                    layerBottom = Math.max(layerBottom, bottom);
                }
                bandY = layerBottom + layerGap;
            }
        }
    }

    function buildSpecChildToParents(connections, byId) {
        const childToParents = new Map();
        for (const conn of connections) {
            if (!isSpecKind(conn.kind || conn.type)) {
                continue;
            }
            const childId = conn.source;
            const parentId = conn.target;
            if (!byId.has(childId) || !byId.has(parentId) || childId === parentId) {
                continue;
            }
            if (!childToParents.has(childId)) {
                childToParents.set(childId, []);
            }
            const plist = childToParents.get(childId);
            if (!plist.includes(parentId)) {
                plist.push(parentId);
            }
        }
        return childToParents;
    }

    /** UML: spec 부모(target)가 자식(source)보다 위 — containment 안 자식 절대 Y 기준 */
    function enforceSpecParentAboveChildren(diagramData, cfg) {
        const elements = Array.isArray(diagramData?.elements)
            ? diagramData.elements
            : [];
        const connections = Array.isArray(diagramData?.connections)
            ? diagramData.connections
            : [];
        if (elements.length === 0 || connections.length === 0) {
            return;
        }

        const visible = elements.filter((e) => e && !e.hidden && e.id);
        const byId = indexElements(elements);
        const childToParents = buildSpecChildToParents(connections, byId);
        const gap = Math.max(Number(cfg.corridorGap) + 20, 40);
        const MAX_PASS = 16;

        function shiftSpecAncestorsUp(nodeId, dy, visited) {
            if (!dy || visited.has(nodeId)) {
                return;
            }
            visited.add(nodeId);
            const n = byId.get(nodeId);
            if (!n) {
                return;
            }
            n.y = (Number(n.y) || 0) + dy;
            syncRelativeFromAbsolute(n, byId);
            // containment 자식(Channel 등)도 함께 이동 — 부모만 올리면 test-5 Bus·Channel 겹침
            shiftDescendantsOf(nodeId, 0, dy, visible, byId);
            for (const pid of childToParents.get(nodeId) || []) {
                shiftSpecAncestorsUp(pid, dy, visited);
            }
        }

        function shiftSpecChildDown(nodeId, dy, visited) {
            if (!dy || visited.has(nodeId)) {
                return;
            }
            visited.add(nodeId);
            const n = byId.get(nodeId);
            if (!n) {
                return;
            }
            n.y = (Number(n.y) || 0) + dy;
            syncRelativeFromAbsolute(n, byId);
            shiftDescendantsOf(nodeId, 0, dy, visible, byId);
            for (const conn of connections) {
                if (!isSpecKind(conn.kind || conn.type)) {
                    continue;
                }
                if (conn.target === nodeId) {
                    shiftSpecChildDown(conn.source, dy, visited);
                }
            }
        }

        for (let pass = 0; pass < MAX_PASS; pass++) {
            let moved = false;
            const requiredTopY = new Map();

            for (const conn of connections) {
                if (!isSpecKind(conn.kind || conn.type)) {
                    continue;
                }
                const child = byId.get(conn.source);
                const parent = byId.get(conn.target);
                if (!child || !parent || child.hidden || parent.hidden) {
                    continue;
                }
                const childTop = absoluteTop(child, byId);
                const parentH = Number(parent.height) || 60;
                const needY = childTop - gap - parentH;
                const pid = parent.id;
                const prev = requiredTopY.get(pid);
                requiredTopY.set(
                    pid,
                    prev == null ? needY : Math.min(prev, needY),
                );
            }

            for (const [parentId, needY] of requiredTopY) {
                const parent = byId.get(parentId);
                if (!parent) {
                    continue;
                }
                const py = absoluteTop(parent, byId);
                if (py > needY + 1) {
                    shiftSpecAncestorsUp(parentId, needY - py, new Set());
                    moved = true;
                }
            }

            for (const conn of connections) {
                if (!isSpecKind(conn.kind || conn.type)) {
                    continue;
                }
                const child = byId.get(conn.source);
                const parent = byId.get(conn.target);
                if (!child || !parent || child.hidden || parent.hidden) {
                    continue;
                }
                const childTop = absoluteTop(child, byId);
                const parentH = Number(parent.height) || 60;
                const minChildY = absoluteBottom(parent, byId) + gap;
                if (childTop < minChildY - 1) {
                    shiftSpecChildDown(
                        conn.source,
                        minChildY - childTop,
                        new Set(),
                    );
                    moved = true;
                }
            }

            if (!moved) {
                break;
            }
        }
    }

    function shiftDescendantsOf(parentId, dx, dy, visible, byId) {
        if (!dx && !dy) {
            return;
        }
        for (const d of visible) {
            if (String(d.parent) !== String(parentId)) {
                continue;
            }
            d.x = (Number(d.x) || 0) + dx;
            d.y = (Number(d.y) || 0) + dy;
            syncRelativeFromAbsolute(d, byId);
            shiftDescendantsOf(d.id, dx, dy, visible, byId);
        }
    }

    /** spec 형제 배치·겹침 방지용 — 자식 containment 반영된 가로 폭 */
    function layoutWidthForSpecSibling(node, visible) {
        const base = Number(node.width) || 120;
        const nx = Number(node.x) || 0;
        let maxR = base;
        for (const d of visible) {
            if (String(d.parent) !== String(node.id)) {
                continue;
            }
            const right =
                (Number(d.x) || 0) - nx + (Number(d.width) || 120);
            maxR = Math.max(maxR, right);
        }
        return maxR;
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
        const visible = elements.filter((e) => e && !e.hidden && e.id);
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
        const specRowPlaced = new Set();

        for (const [parentId, childIds] of specChildrenOf) {
            const parent = byId.get(parentId);
            if (!parent) continue;

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
            const childWidths = children.map((c) =>
                layoutWidthForSpecSibling(c, visible),
            );
            let rowW = 0;
            for (const cw of childWidths) {
                rowW += cw;
            }
            rowW += siblingGap * Math.max(0, children.length - 1);
            let cx = pcx - rowW / 2;
            for (let ci = 0; ci < children.length; ci++) {
                const c = children[ci];
                if (specRowPlaced.has(c.id)) {
                    cx += childWidths[ci] + siblingGap;
                    continue;
                }
                const cw = childWidths[ci];
                const oldX = Number(c.x) || 0;
                const oldY = Number(c.y) || 0;
                c.x = cx;
                c.y = belowY;
                syncRelativeFromAbsolute(c, byId);
                shiftDescendantsOf(
                    c.id,
                    c.x - oldX,
                    c.y - oldY,
                    visible,
                    byId,
                );
                specRowPlaced.add(c.id);
                cx += cw + siblingGap;
            }
            for (let i = 0; i < children.length - 1; i++) {
                const a = children[i];
                const b = children[i + 1];
                const aRight =
                    (Number(a.x) || 0) + layoutWidthForSpecSibling(a, visible);
                const minBx = aRight + siblingGap;
                const bx = Number(b.x) || 0;
                if (bx < minBx) {
                    const dx = minBx - bx;
                    const oldBx = bx;
                    b.x = minBx;
                    syncRelativeFromAbsolute(b, byId);
                    shiftDescendantsOf(b.id, b.x - oldBx, 0, visible, byId);
                    for (let j = i + 2; j < children.length; j++) {
                        const prevX = Number(children[j].x) || 0;
                        children[j].x = prevX + dx;
                        syncRelativeFromAbsolute(children[j], byId);
                        shiftDescendantsOf(children[j].id, dx, 0, visible, byId);
                    }
                }
            }
        }
    }

    function getCompactSpineCfg() {
        const bdd = NS.Editor?.config?.displaySettings?.bdd || {};
        const pad = bdd.compactSpinePad || {};
        const sc = bdd.singleChildContainmentPad || {};
        return {
            minChain: Number(bdd.compactSpineMinChain) || 3,
            labelTop: Number(bdd.compactSpineLabelTop) || 32,
            gap: Number(bdd.compactSpineGap) || 4,
            top: Number(pad.top) || 8,
            left: Number(pad.left) || 14,
            right: Number(pad.right) || 14,
            bottom: Number(pad.bottom) || 10,
            singleTop: Number(sc.top) || 8,
            singleLeft: Number(sc.left) || 6,
            singleRight: Number(sc.right) || 6,
            singleBottom: Number(sc.bottom) || 8,
            labelMinW: Number(bdd.singleChildLabelMinWidth) || 72,
            spineShallowSide: Number(bdd.spineShallowSidePad) || 16,
            spineDeepSide: Number(bdd.spineDeepSidePad) || 2,
            spineShallowBottom: Number(bdd.spineShallowBottomPad) || 10,
            spineDeepBottom: Number(bdd.spineDeepBottomPad) || 4,
        };
    }

    /** 스파인 체인 컨테이너 깊이 비율: 0=루트 부모, 1=말단 직전 부모 */
    function spineContainerDepthT(depthIndex, containerCount) {
        if (containerCount <= 1) {
            return 0;
        }
        return depthIndex / (containerCount - 1);
    }

    function lerpSpinePad(shallow, deep, t) {
        return Math.round(shallow + (deep - shallow) * Math.min(1, Math.max(0, t)));
    }

    function getSpineSidePadForDepth(depthIndex, chainLength, cfg) {
        const containerCount = Math.max(1, chainLength - 1);
        const t = spineContainerDepthT(depthIndex, containerCount);
        return lerpSpinePad(cfg.spineShallowSide, cfg.spineDeepSide, t);
    }

    function getSpineBottomPadForDepth(depthIndex, chainLength, cfg) {
        const containerCount = Math.max(1, chainLength - 1);
        const t = spineContainerDepthT(depthIndex, containerCount);
        return lerpSpinePad(cfg.spineShallowBottom, cfg.spineDeepBottom, t);
    }

    function estimateTitleMinWidth(node, minW) {
        const name = String(node?.name || node?.id || '');
        const charW = 7;
        return Math.max(minW, name.length * charW + 20);
    }

    function isTightSingleChildContainer(node) {
        return !!(node?._tightSingleChildContainer || node?._compactContainmentSpine);
    }

    function getContainmentPolicy() {
        return NS.Editor?.model?.containmentPolicy || null;
    }

    /** 직접 containment 자식 수 — elements·edges·borderNodes(포트) 반영 */
    function countDirectContainmentChildren(parentId, elements, connections) {
        const policy = getContainmentPolicy();
        let n = 0;
        if (policy?.countDirectContainmentTargets) {
            n = policy.countDirectContainmentTargets(
                parentId,
                elements,
                connections,
            );
        } else {
            const pid = String(parentId);
            for (const el of elements) {
                if (
                    el?.id != null &&
                    !el.hidden &&
                    el.parent != null &&
                    String(el.parent) === pid
                ) {
                    n++;
                }
            }
            if (Array.isArray(connections)) {
                for (const c of connections) {
                    const k = String(c?.kind || c?.type || '').toLowerCase();
                    if (!k.includes('contain')) {
                        continue;
                    }
                    if (String(c.source) === String(parentId)) {
                        n++;
                    }
                }
            }
        }
        const parentEl = elements.find(
            (e) => e?.id != null && String(e.id) === String(parentId),
        );
        const bn = parentEl?.borderNodes;
        if (Array.isArray(bn) && bn.length > 0) {
            n = Math.max(n, 1 + bn.length);
        }
        return n;
    }

    /** BDD 컨테이너 — 라벨·compartment(포트) 아래에 자식 블록 배치 */
    function getBddContainerPads(parent, elkCP) {
        const DS = NS.Editor?.config?.displaySettings;
        const CP = elkCP || DS?.elk?.containerPadding || {};
        const labelH =
            Number(parent._labelHeight) ||
            Number(DS?.label?.minHeight) ||
            35;
        let topPad = Number(parent._precomputedPaddingTop) || 0;
        if (!(topPad > 0)) {
            topPad = Math.max(Number(CP.top) || 48, labelH + 6);
            const metrics = NS.Editor?.metrics;
            const comps = parent.compartments;
            if (
                metrics?.calculateTotalCompartmentsHeight &&
                Array.isArray(comps) &&
                comps.length > 0
            ) {
                const compH = metrics.calculateTotalCompartmentsHeight(
                    comps,
                    false,
                    Number(parent.width) || 120,
                );
                topPad = Math.max(topPad, labelH + compH + 4);
            }
        }
        return {
            top: topPad,
            left: Number(CP.left) || 32,
            right: Number(CP.right) || 32,
            bottom: Number(CP.bottom) || 28,
        };
    }

    /**
     * 스파인·tight 단일자식 — 구조 블록 1개이면서 직접 자식도 1개일 때만
     * (test-5 Bus: Channel + ClockPort + DataBusPort → 스파인 금지)
     */
    function isSingleStructuralContainmentParent(parentId, elements, connections) {
        const kids = getStructuralChildIds(parentId, elements, connections);
        if (kids.length !== 1) {
            return false;
        }
        return countDirectContainmentChildren(parentId, elements, connections) <= 1;
    }

    function getStructuralChildIds(parentId, elements, connections) {
        const policy = getContainmentPolicy();
        if (policy?.getStructuralContainmentChildIds) {
            return policy.getStructuralContainmentChildIds(parentId, elements, connections);
        }
        const pid = String(parentId);
        const out = [];
        for (const el of elements) {
            if (el?.parent == null || String(el.parent) !== pid || el.id == null) {
                continue;
            }
            const kind = String(el.kind || el.type || '').toLowerCase();
            if (
                kind.includes('portdefinition') ||
                kind.includes('portusage') ||
                kind.includes('attributedefinition') ||
                kind.includes('attributeusage')
            ) {
                continue;
            }
            if (
                kind.includes('partdefinition') ||
                kind.includes('partusage') ||
                kind.includes('package') ||
                kind.includes('librarypackage')
            ) {
                out.push(String(el.id));
            }
        }
        if (Array.isArray(connections)) {
            for (const edge of connections) {
                const k = String(edge?.kind || edge?.type || '').toLowerCase();
                if (!k.includes('contain') || String(edge.source) !== pid || edge.target == null) {
                    continue;
                }
                const tid = String(edge.target);
                if (out.includes(tid)) {
                    continue;
                }
                const el = elements.find((e) => e?.id != null && String(e.id) === tid);
                const kind = String(el?.kind || el?.type || '').toLowerCase();
                if (
                    el &&
                    (kind.includes('partdefinition') ||
                        kind.includes('partusage') ||
                        kind.includes('package') ||
                        kind.includes('librarypackage'))
                ) {
                    out.push(tid);
                }
            }
        }
        return out;
    }

    function markCompactContainmentSpines(diagramData) {
        const elements = Array.isArray(diagramData?.elements)
            ? diagramData.elements
            : [];
        const connections = Array.isArray(diagramData?.connections)
            ? diagramData.connections
            : [];
        const policy = getContainmentPolicy();
        const cfg = getCompactSpineCfg();
        const byId = indexElements(elements);

        for (const el of elements) {
            if (!el?.id || el.hidden) {
                continue;
            }
            if (
                !isSingleStructuralContainmentParent(el.id, elements, connections)
            ) {
                continue;
            }
            el._tightSingleChildContainer = true;
            el._precomputedPaddingTop = cfg.labelTop;
        }

        if (policy?.markCompactContainmentSpines) {
            policy.markCompactContainmentSpines(elements, connections, cfg.minChain);
            return;
        }

        for (const start of elements) {
            if (
                !isSingleStructuralContainmentParent(start.id, elements, connections)
            ) {
                continue;
            }
            const kids = getStructuralChildIds(start.id, elements, connections);
            const chain = [start];
            let cur = byId.get(kids[0]);
            while (cur) {
                chain.push(cur);
                if (
                    !isSingleStructuralContainmentParent(
                        cur.id,
                        elements,
                        connections,
                    )
                ) {
                    break;
                }
                const nextKids = getStructuralChildIds(cur.id, elements, connections);
                if (nextKids.length !== 1) {
                    break;
                }
                cur = byId.get(nextKids[0]);
            }
            if (chain.length < cfg.minChain) {
                continue;
            }
            for (let i = 0; i < chain.length - 1; i++) {
                chain[i]._compactContainmentSpine = true;
                chain[i]._tightSingleChildContainer = true;
                chain[i]._precomputedPaddingTop = cfg.labelTop;
            }
        }
    }

    function shiftDescendantsAbsOnly(el, dx, dy, visible) {
        if (!dx && !dy) {
            return;
        }
        for (const c of visible) {
            if (String(c.parent) === String(el.id)) {
                c.x = (Number(c.x) || 0) + dx;
                c.y = (Number(c.y) || 0) + dy;
                shiftDescendantsAbsOnly(c, dx, dy, visible);
            }
        }
    }

    /** 부모→자식→… 단일 포함 체인 수집 (체인 시작 = 부모도 단일자식이 아닌 루트) */
    function collectContainmentSpineChains(visible, byId, elements, connections, minLen) {
        const chains = [];
        const claimed = new Set();

        for (const el of visible) {
            if (claimed.has(el.id)) {
                continue;
            }
            if (
                !isSingleStructuralContainmentParent(el.id, elements, connections)
            ) {
                continue;
            }
            if (el.parent) {
                const par = byId.get(el.parent);
                if (par) {
                    if (
                        isSingleStructuralContainmentParent(
                            par.id,
                            elements,
                            connections,
                        )
                    ) {
                        continue;
                    }
                }
            }

            const kids = getStructuralChildIds(el.id, elements, connections);
            const chain = [el];
            claimed.add(el.id);
            let cur = byId.get(kids[0]);
            while (cur && !cur.hidden) {
                chain.push(cur);
                claimed.add(cur.id);
                if (
                    !isSingleStructuralContainmentParent(
                        cur.id,
                        elements,
                        connections,
                    )
                ) {
                    break;
                }
                const nextKids = getStructuralChildIds(cur.id, elements, connections);
                if (nextKids.length !== 1) {
                    break;
                }
                cur = byId.get(nextKids[0]);
            }
            if (chain.length >= minLen) {
                chains.push(chain);
            }
        }
        return chains;
    }

    /**
     * test-4형 단일 체인 — 한 열 너비·세로 스파인·단계별 가로 중앙
     */
    function layoutContainmentSpineChain(chain, cfg, visible) {
        if (!chain || chain.length < 2) {
            return;
        }

        const topPad = cfg.labelTop;
        const n = chain.length;
        const leaf = chain[n - 1];
        const leafW = Number(leaf.width) || 120;
        const widths = new Array(n);

        widths[n - 1] = leafW;

        for (let i = n - 2; i >= 0; i--) {
            const sidePad = getSpineSidePadForDepth(i, n, cfg);
            const titleMin = estimateTitleMinWidth(chain[i], cfg.labelMinW);
            widths[i] = Math.max(titleMin, widths[i + 1] + sidePad * 2);
            chain[i]._spineSidePad = sidePad;
            chain[i]._spineBottomPad = getSpineBottomPadForDepth(i, n, cfg);
        }

        for (let i = 0; i < n - 1; i++) {
            const node = chain[i];
            node.width = widths[i];
            node._containmentSpineChain = true;
            node._tightSingleChildContainer = true;
            node._compactContainmentSpine = true;
            node._precomputedPaddingTop = topPad;
        }
        for (let i = 1; i < n - 1; i++) {
            chain[i].width = widths[i];
        }

        for (let i = n - 2; i >= 0; i--) {
            const parent = chain[i];
            const child = chain[i + 1];
            const ch = Number(child.height) || 60;
            const cw = Number(child.width) || 120;
            const sidePad = Number(parent._spineSidePad) || cfg.singleLeft;
            const bottomPad = Number(parent._spineBottomPad) || cfg.singleBottom;
            const footerH = Number(parent._featureUsageFooterHeight) || 0;
            const titleMin = estimateTitleMinWidth(parent, cfg.labelMinW);
            parent.width = Math.max(
                Number(parent.width) || 0,
                titleMin,
                cw + sidePad * 2,
            );
            parent.height = Math.max(
                Number(parent.height) || 0,
                topPad + ch + bottomPad + footerH,
            );
        }

        const root = chain[0];
        const rootX = Number(root.x) || 0;
        const rootY = Number(root.y) || 0;
        root.x = rootX;
        root.y = rootY;
        if (!root.parent) {
            root.relativeX = rootX;
            root.relativeY = rootY;
        }

        for (let i = 0; i < n - 1; i++) {
            const parent = chain[i];
            const child = chain[i + 1];
            const parentW = Number(parent.width) || widths[i];
            const childW = Number(child.width) || widths[i + 1];
            const relX = Math.max(0, (parentW - childW) / 2);
            const relY = topPad;
            const px = Number(parent.x) || 0;
            const py = Number(parent.y) || 0;
            const oldX = Number(child.x) || 0;
            const oldY = Number(child.y) || 0;
            child.relativeX = relX;
            child.relativeY = relY;
            child.x = px + relX;
            child.y = py + relY;
            shiftDescendantsAbsOnly(child, child.x - oldX, child.y - oldY, visible);
        }
    }

    function layoutSingleChildPair(parent, child, cfg, visible, useTight) {
        if (!parent || !child) {
            return;
        }
        const topPad = useTight
            ? Math.max(Number(parent._precomputedPaddingTop) || 0, cfg.labelTop)
            : Number(parent._precomputedPaddingTop) || cfg.labelTop;
        const sideL = useTight ? cfg.singleLeft : 12;
        const sideR = useTight ? cfg.singleRight : 12;
        const bottomPad = useTight ? cfg.singleBottom : 20;
        const cw = Number(child.width) || 120;
        const ch = Number(child.height) || 60;
        const footerH = Number(parent._featureUsageFooterHeight) || 0;
        const needW = Math.max(cw + sideL + sideR, estimateTitleMinWidth(parent, cfg.labelMinW));
        parent.width = needW;
        parent.height = topPad + ch + bottomPad + footerH;
        const relX = Math.max(0, (needW - cw) / 2);
        const relY = topPad;
        const px = Number(parent.x) || 0;
        const py = Number(parent.y) || 0;
        const oldX = Number(child.x) || 0;
        const oldY = Number(child.y) || 0;
        child.relativeX = relX;
        child.relativeY = relY;
        child.x = px + relX;
        child.y = py + relY;
        shiftDescendantsAbsOnly(child, child.x - oldX, child.y - oldY, visible);
    }

    /**
     * 직접 BDD 자식 1개 — 체인은 스파인 통합, 나머지는 쌍 단위 최소·중앙
     */
    function layoutTightSingleChildContainers(diagramData) {
        const elements = Array.isArray(diagramData?.elements)
            ? diagramData.elements
            : [];
        const connections = Array.isArray(diagramData?.connections)
            ? diagramData.connections
            : [];
        const visible = elements.filter((e) => e && !e.hidden && e.id);
        if (visible.length < 2) {
            return;
        }

        const byId = indexElements(elements);
        const cfg = getCompactSpineCfg();
        const minChain =
            Number(NS.Editor?.config?.displaySettings?.bdd?.containmentSpineMinChain) || 2;

        const chains = collectContainmentSpineChains(
            visible,
            byId,
            elements,
            connections,
            minChain,
        );
        try {
            if (chains.length > 0) {
                console.log(
                    '[bddLayout] spine chains:',
                    chains.length,
                    chains.map((c) => c.map((n) => n.id).join('→')).join(' | '),
                );
            }
        } catch (_) {}
        const inSpine = new Set();
        for (const chain of chains) {
            layoutContainmentSpineChain(chain, cfg, visible);
            for (const node of chain) {
                inSpine.add(node.id);
            }
        }

        for (const parent of visible) {
            if (inSpine.has(parent.id)) {
                continue;
            }
            if (
                !isSingleStructuralContainmentParent(
                    parent.id,
                    elements,
                    connections,
                )
            ) {
                continue;
            }
            const kids = getStructuralChildIds(parent.id, elements, connections);
            const child = byId.get(kids[0]);
            layoutSingleChildPair(
                parent,
                child,
                cfg,
                visible,
                isTightSingleChildContainer(parent),
            );
        }
    }

    function shouldPackContainmentChildrenHorizontally(parentEl) {
        if (!parentEl) return false;
        const t = String(parentEl.type || '').toLowerCase();
        if (t.includes('ifaction') || t === 'elseifaction' || t === 'elseaction') return false;
        if (t.includes('whileloop')) return false;
        if (t.includes('statemachine') || t.includes('activity')) return false;
        if (
            Array.isArray(parentEl.compartments) &&
            parentEl.compartments.some((c) => c && c.key === 'actionFlow')
        ) {
            return false;
        }
        return true;
    }

    /**
     * containment 부모 — 자식 bbox+패딩으로 width/height 확정 (test-5 Bus⊃Channel)
     * nodeTransformer 후 포트는 borderNodes만 남고 Channel만 자식 element인 경우 포함
     */
    function ensureContainmentParentsEncloseChildren(diagramData) {
        const elements = Array.isArray(diagramData?.elements)
            ? diagramData.elements
            : [];
        const visible = elements.filter((e) => e && !e.hidden && e.id);
        if (visible.length < 2) {
            return;
        }

        const byId = indexElements(elements);
        const CP = NS.Editor?.config?.displaySettings?.elk?.containerPadding || {};
        const rowGap =
            Number(NS.Editor?.config?.displaySettings?.bdd?.containmentRowGap) ||
            Number(NS.Editor?.config?.displaySettings?.elk?.containerChildSpacing) ||
            28;

        function shiftSubtreeRigid(el, dx, dy) {
            el.x = (Number(el.x) || 0) + dx;
            el.y = (Number(el.y) || 0) + dy;
            syncRelativeFromAbsolute(el, byId);
            for (const c of visible) {
                if (String(c.parent) === String(el.id)) {
                    shiftSubtreeRigid(c, dx, dy);
                }
            }
        }

        for (const parent of visible) {
            if (!shouldPackContainmentChildrenHorizontally(parent)) {
                continue;
            }
            const kids = visible.filter(
                (e) => String(e.parent) === String(parent.id),
            );
            if (kids.length === 0) {
                continue;
            }

            const pads = getBddContainerPads(parent, CP);
            const px = Number(parent.x) || 0;
            const py = Number(parent.y) || 0;
            const innerTop = py + pads.top;

            kids.sort((a, b) =>
                String(a.name || a.id).localeCompare(String(b.name || b.id)),
            );

            let totalW = 0;
            for (const k of kids) {
                totalW += Number(k.width) || 120;
            }
            totalW += rowGap * Math.max(0, kids.length - 1);

            const titleW = estimateTitleMinWidth(parent, 72);
            let needW = totalW + pads.left + pads.right;
            needW = Math.max(needW, titleW + pads.left + pads.right);

            let cx = px + pads.left;
            if (kids.length === 1) {
                const kw = Number(kids[0].width) || 120;
                cx = px + Math.max(pads.left, (needW - pads.left - pads.right - kw) / 2);
            } else {
                cx = px + Math.max(pads.left, (needW - totalW) / 2);
            }

            let maxBottom = innerTop;
            for (const k of kids) {
                const kw = Number(k.width) || 120;
                const kh = Number(k.height) || 60;
                const oldX = Number(k.x) || 0;
                const oldY = Number(k.y) || 0;
                k.x = cx;
                k.y = innerTop;
                syncRelativeFromAbsolute(k, byId);
                shiftDescendantsOf(k.id, k.x - oldX, k.y - oldY, visible, byId);
                maxBottom = Math.max(maxBottom, (Number(k.y) || 0) + kh);
                cx += kw + rowGap;
            }

            parent.width = needW;
            parent.height = maxBottom - py + pads.bottom;
            syncRelativeFromAbsolute(parent, byId);
            if (!parent.parent) {
                parent.relativeX = parent.x;
                parent.relativeY = parent.y;
            }
        }
    }

    /**
     * ELK layered는 컨테이너 안 association 등으로 자식이 세로 레이어로 쌓이기 쉬움.
     * BDD식 블록(액션 플로우 제외)의 직접 자식만 한 행으로 가로 배치.
     */
    function packContainmentChildrenHorizontally(diagramData) {
        const elements = Array.isArray(diagramData?.elements)
            ? diagramData.elements
            : [];
        const visible = elements.filter((e) => e && !e.hidden && e.id);
        if (visible.length < 2) return;

        const byId = indexElements(elements);
        const DS = NS.Editor?.config?.displaySettings;
        const CP = DS?.elk?.containerPadding || {};
        const gap =
            Number(DS?.bdd?.containmentRowGap) ||
            Number(DS?.elk?.containerChildSpacing) ||
            28;

        function shiftSubtreeRigid(el, dx, dy) {
            el.x = (Number(el.x) || 0) + dx;
            el.y = (Number(el.y) || 0) + dy;
            syncRelativeFromAbsolute(el, byId);
            for (const c of visible) {
                if (String(c.parent) === String(el.id)) {
                    shiftSubtreeRigid(c, dx, dy);
                }
            }
        }

        const childrenByParent = new Map();
        for (const el of visible) {
            const pid = el.parent ? String(el.parent) : '';
            if (!pid) continue;
            if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
            childrenByParent.get(pid).push(el);
        }

        for (const [parentId, kids] of childrenByParent) {
            if (kids.length === 0) continue;
            const parent = byId.get(parentId);
            if (!parent || !shouldPackContainmentChildrenHorizontally(parent)) continue;

            const pads = getBddContainerPads(parent, CP);
            const innerTop = (Number(parent.y) || 0) + pads.top;
            const px = Number(parent.x) || 0;

            const sorted = kids.slice().sort((a, b) => {
                const ay = Number(a.y) || 0;
                const by = Number(b.y) || 0;
                if (Math.abs(ay - by) > 5) return ay - by;
                return (Number(a.x) || 0) - (Number(b.x) || 0);
            });

            let totalW = 0;
            for (const k of sorted) {
                totalW += Number(k.width) || 120;
            }
            totalW += gap * Math.max(0, sorted.length - 1);

            const pw = Number(parent.width) || 120;
            const titleW = estimateTitleMinWidth(parent, 72);
            let needW = totalW + pads.left + pads.right;
            needW = Math.max(needW, titleW + pads.left + pads.right);
            parent.width = needW;

            const pw2 = Number(parent.width) || 120;
            let cx = px + Math.max(pads.left, (pw2 - totalW) / 2);
            for (const k of sorted) {
                const kw = Number(k.width) || 120;
                const dx = cx - (Number(k.x) || 0);
                const dy = innerTop - (Number(k.y) || 0);
                shiftSubtreeRigid(k, dx, dy);
                cx += kw + gap;
            }

            const maxBottom = sorted.reduce((m, k) => {
                const h = Number(k.height) || 60;
                return Math.max(m, (Number(k.y) || 0) + h);
            }, innerTop);
            parent.height = maxBottom - (Number(parent.y) || 0) + pads.bottom;
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
            return {
                x: Number(el.x) || 0,
                y: Number(el.y) || 0,
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

        const byIdOverlap = indexElements(elements);

        function shiftSubtree(el, dx, dy) {
            if (dx) {
                el.x = (Number(el.x) || 0) + dx;
            }
            if (dy) {
                el.y = (Number(el.y) || 0) + dy;
            }
            syncRelativeFromAbsolute(el, byIdOverlap);
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
                for (let i = 0; i < siblings.length; i++) {
                    for (let j = i + 1; j < siblings.length; j++) {
                        const a = bounds(siblings[i]);
                        const b = bounds(siblings[j]);
                        if (!overlaps(a, b)) {
                            continue;
                        }
                        const dx = a.x + a.w + GAP - b.x;
                        if (dx > 0) {
                            shiftSubtree(siblings[j], dx, 0);
                            moved = true;
                        }
                        const bb = bounds(siblings[j]);
                        const dy = a.y + a.h + GAP - bb.y;
                        if (
                            dy > 0 &&
                            Math.abs(a.x - bb.x) < GAP + Math.min(a.w, bb.w)
                        ) {
                            shiftSubtree(siblings[j], 0, dy);
                            moved = true;
                        }
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

        const byIdFit = indexElements(elements);

        function shiftSubtree(el) {
            el.x = (Number(el.x) || 0) + dx;
            el.y = (Number(el.y) || 0) + dy;
            syncRelativeFromAbsolute(el, byIdFit);
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
        markCompactContainmentSpines(diagramData);
        layoutTightSingleChildContainers(diagramData);
        packContainmentChildrenHorizontally(diagramData);
        applySpecChildrenSymmetric(diagramData, cfg);
        enforceSpecParentAboveChildren(diagramData, cfg);
        ensureContainmentParentsEncloseChildren(diagramData);
        fitDiagramToMargins(diagramData, cfg.margin);
        resolveSiblingOverlaps(diagramData, cfg.siblingPad);
        assignSpecSpineLaneOffsets(diagramData);
        clearSpecWaypoints(diagramData);
        try {
            const spineN = (diagramData.elements || []).filter(
                (e) => e && e._containmentSpineChain,
            ).length;
            if (spineN > 0) {
                console.log('[bddLayout] containment spine 적용:', spineN, '컨테이너');
            }
        } catch (_) {}
    }

    NS.Editor.layout.bdd = {
        isSpecKind,
        applyPostLayout,
        applySpecVerticalBands,
        enforceSpecParentAboveChildren,
        applySpecChildrenSymmetric,
        markCompactContainmentSpines,
        layoutTightSingleChildContainers,
        layoutContainmentSpineChains: layoutTightSingleChildContainers,
        layoutCompactContainmentSpines: layoutTightSingleChildContainers,
        packContainmentChildrenHorizontally,
        ensureContainmentParentsEncloseChildren,
        resolveSiblingOverlaps,
        fitDiagramToMargins,
        clearSpecWaypoints,
    };
})();
