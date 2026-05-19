/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * specialization 직교 라우터 (test-2: 컨테이너 내부 → 외부 부모)
 * - 상속 앵커: 전부 자식 N(상단 중앙) → 부모 S(하단 중앙) 고정 (E/W 동적 탈출 비활성)
 * - segmentEdgeStyle + 명시 points (2점만일 때 직각 꺾임 1점 주입)
 ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};

    const APPROACH_PAD = 16;
    const ALIGN_EPS = 2;
    const DEFAULT_FRAC = 0.5;

    const mxPt =
        typeof mxPoint !== 'undefined'
            ? mxPoint
            : typeof mx !== 'undefined' && mx.mxPoint
              ? mx.mxPoint
              : null;

    const mxConn =
        typeof mxConnectionConstraint !== 'undefined'
            ? mxConnectionConstraint
            : typeof mx !== 'undefined' && mx.mxConnectionConstraint
              ? mx.mxConnectionConstraint
              : null;

    function isSpecKind(kind) {
        const bdd = ns.Editor?.layout?.bdd;
        if (bdd?.isSpecKind) return bdd.isSpecKind(kind);
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

    function near(a, b) {
        return Math.abs(a - b) < ALIGN_EPS;
    }

    function clamp01(v) {
        return Math.max(0, Math.min(1, v));
    }

    function makePoint(x, y) {
        if (mxPt) return new mxPt(x, y);
        return { x, y };
    }

    function isNestedVertex(graph, cell) {
        if (!cell) return false;
        const model = graph.getModel();
        const dp = graph.getDefaultParent();
        return (
            cell.parent &&
            cell.parent !== dp &&
            cell.parent !== model.getRoot() &&
            model.isVertex(cell.parent)
        );
    }

    function modelTopLeft(graph, cell) {
        if (!cell) return null;
        const model = graph.getModel();
        const defaultParent = graph.getDefaultParent();
        const g = model.getGeometry(cell);
        if (!g) return null;
        let x = g.x || 0;
        let y = g.y || 0;
        let p = cell.parent;
        while (p && p !== defaultParent && p !== model.getRoot()) {
            const pg = model.getGeometry(p);
            if (pg) {
                x += pg.x || 0;
                y += pg.y || 0;
            }
            p = p.parent;
        }
        return { x, y };
    }

    function cellOrigin(graph, cell) {
        return modelTopLeft(graph, cell);
    }

    /**
     * mxGraph geometry.points 기준 원점 (엣지 state.origin, ≈ defaultParent 절대좌표)
     * 소스 셀 기준으로 빼면 빈 공간·왼쪽 버스로 그려짐 (transformControlPoint)
     */
    function edgeControlOrigin(graph, edgeCell) {
        if (!edgeCell) return { x: 0, y: 0 };
        const model = graph.getModel();
        const dp = graph.getDefaultParent();
        const g = model.getGeometry(edgeCell);
        let x = g?.x || 0;
        let y = g?.y || 0;
        let p = edgeCell.parent;
        while (p && p !== dp && p !== model.getRoot()) {
            const pg = model.getGeometry(p);
            if (pg) {
                x += pg.x || 0;
                y += pg.y || 0;
            }
            p = p.parent;
        }
        return { x, y };
    }

    function cellBounds(graph, cell) {
        if (!cell) return null;
        const model = graph.getModel();
        const g = model.getGeometry(cell);
        if (!g) return null;
        const origin = cellOrigin(graph, cell);
        if (!origin) return null;
        return {
            x: origin.x,
            y: origin.y,
            w: g.width || 0,
            h: g.height || 0,
        };
    }

    /** 가장 바깥 컨테이너(루트 직하) bbox */
    function outerContainerBounds(graph, cell) {
        if (!isNestedVertex(graph, cell)) return null;
        const model = graph.getModel();
        const dp = graph.getDefaultParent();
        let p = cell.parent;
        let outer = p;
        while (p && p !== dp && p !== model.getRoot()) {
            if (model.isVertex(p)) outer = p;
            p = p.parent;
        }
        return outer ? cellBounds(graph, outer) : null;
    }

    function pointOutsideBox(box, other) {
        if (!box || !other) return true;
        return (
            other.x + other.w < box.x - ALIGN_EPS ||
            other.x > box.x + box.w + ALIGN_EPS ||
            other.y + other.h < box.y - ALIGN_EPS ||
            other.y > box.y + box.h + ALIGN_EPS
        );
    }

    /**
     * 출구·진입: 상속 전부 자식 상단 중앙(N) → 부모 하단 중앙(S) 고정
     * (동적 E/W 탈출 비활성 — 유턴·앵커 불일치 방지)
     */
    function resolveSpecSides() {
        return { exitSide: 'N', entrySide: 'S' };
    }

    function pointOnSide(bounds, side, frac) {
        const f = frac == null ? DEFAULT_FRAC : frac;
        switch (side) {
            case 'W':
                return { x: bounds.x, y: bounds.y + bounds.h * f };
            case 'E':
                return { x: bounds.x + bounds.w, y: bounds.y + bounds.h * f };
            case 'N':
                return { x: bounds.x + bounds.w * f, y: bounds.y };
            case 'S':
                return { x: bounds.x + bounds.w * f, y: bounds.y + bounds.h };
            default:
                return {
                    x: bounds.x + bounds.w * DEFAULT_FRAC,
                    y: bounds.y + bounds.h * DEFAULT_FRAC,
                };
        }
    }

    function fracOnSide(bounds, side, pt) {
        if (!bounds || !pt) return DEFAULT_FRAC;
        if (side === 'N' || side === 'S') {
            return clamp01((pt.x - bounds.x) / (bounds.w || 1));
        }
        return clamp01((pt.y - bounds.y) / (bounds.h || 1));
    }

    function getEdgeObstacleUtil() {
        return ns.MxGraph.edgeObstacle;
    }

    function getEdgeObstacleCfg() {
        return ns.Editor?.config?.displaySettings?.edgeObstacle || {};
    }

    function collectMxAncestorNodeIds(graph, cell) {
        const ids = [];
        if (!cell) {
            return ids;
        }
        const model = graph.getModel();
        const dp = graph.getDefaultParent();
        let p = cell.parent;
        while (p && p !== dp && p !== model.getRoot()) {
            const nid = p._nodeData?.id || p.getId?.();
            if (nid) {
                ids.push(String(nid));
            }
            p = p.parent;
        }
        return ids;
    }

    function collectSpecObstacles(graph, sourceCell, targetCell) {
        const util = getEdgeObstacleUtil();
        if (!util?.collectVertexObstacles) {
            return [];
        }
        const sid = String(
            sourceCell?._nodeData?.id || sourceCell?.getId?.() || '',
        );
        const tid = String(
            targetCell?._nodeData?.id || targetCell?.getId?.() || '',
        );
        const exclude = new Set([sid, tid]);
        for (const id of collectMxAncestorNodeIds(graph, sourceCell)) {
            exclude.add(id);
        }
        for (const id of collectMxAncestorNodeIds(graph, targetCell)) {
            exclude.add(id);
        }
        return util.collectVertexObstacles(graph, [...exclude], (c) =>
            cellBounds(graph, c),
        );
    }

    function resolveVerticalChannelY(
        exitSide,
        entrySide,
        srcB,
        tgtB,
        exitPt,
        entryPt,
        obstacleCtx,
    ) {
        const defaultY = verticalChannelY(exitSide, entrySide, srcB, tgtB);
        const util = getEdgeObstacleUtil();
        if (
            !obstacleCtx?.obstacles?.length ||
            !util?.pickHorizontalChannelY ||
            !exitPt ||
            !entryPt
        ) {
            return defaultY;
        }
        const buf = Number(obstacleCtx.buffer) || 20;
        const candidates = util.verticalChannelYCandidates
            ? util.verticalChannelYCandidates(
                  exitSide,
                  entrySide,
                  srcB,
                  tgtB,
                  APPROACH_PAD,
              )
            : [defaultY];
        const yBand = util.computeHorizontalChannelYBand
            ? util.computeHorizontalChannelYBand(
                  exitSide,
                  entrySide,
                  srcB,
                  tgtB,
                  APPROACH_PAD,
              )
            : null;
        return util.pickHorizontalChannelY(
            candidates,
            exitPt.x,
            entryPt.x,
            obstacleCtx.obstacles,
            buf,
            defaultY,
            yBand,
        );
    }

    function resolveHorizontalChannelX(
        exitSide,
        entrySide,
        srcB,
        tgtB,
        exitPt,
        entryPt,
        obstacleCtx,
    ) {
        const defaultX = horizontalChannelX(exitSide, entrySide, srcB, tgtB);
        const util = getEdgeObstacleUtil();
        if (
            !obstacleCtx?.obstacles?.length ||
            !util?.pickVerticalChannelX ||
            !exitPt ||
            !entryPt
        ) {
            return defaultX;
        }
        const buf = Number(obstacleCtx.buffer) || 20;
        const candidates = util.horizontalChannelXCandidates
            ? util.horizontalChannelXCandidates(
                  exitSide,
                  entrySide,
                  srcB,
                  tgtB,
                  APPROACH_PAD,
              )
            : [defaultX];
        return util.pickVerticalChannelX(
            candidates,
            exitPt.y,
            entryPt.y,
            obstacleCtx.obstacles,
            buf,
            defaultX,
        );
    }

    function verticalChannelY(exitSide, entrySide, srcB, tgtB) {
        if (exitSide === 'N' && entrySide === 'S') {
            const pb = tgtB.y + tgtB.h;
            const ct = srcB.y;
            if (ct > pb + ALIGN_EPS) return (pb + ct) / 2;
            return pb + APPROACH_PAD;
        }
        if (exitSide === 'S' && entrySide === 'N') {
            const pt = tgtB.y;
            const cb = srcB.y + srcB.h;
            if (pt > cb + ALIGN_EPS) return (cb + pt) / 2;
            return pt - APPROACH_PAD;
        }
        const pb = tgtB.y + tgtB.h;
        const ct = srcB.y;
        if (ct > pb + ALIGN_EPS) return (pb + ct) / 2;
        return pb + APPROACH_PAD;
    }

    function horizontalChannelX(exitSide, entrySide, srcB, tgtB) {
        if (exitSide === 'W' && entrySide === 'E') {
            const pr = tgtB.x + tgtB.w;
            const cl = srcB.x;
            if (cl > pr + ALIGN_EPS) return (pr + cl) / 2;
            return pr + APPROACH_PAD;
        }
        if (exitSide === 'E' && entrySide === 'W') {
            const pl = tgtB.x;
            const cr = srcB.x + srcB.w;
            if (pl > cr + ALIGN_EPS) return (cr + pl) / 2;
            return pl - APPROACH_PAD;
        }
        return tgtB.x + tgtB.w / 2;
    }

    /**
     * 루트 자식이 부모 아래에 있을 때: 자식 중심 X 열로 수직 연결 (Car/Truck→Vehicle)
     */
    function isRootChildBelowParent(graph, sourceCell, targetCell, srcB, tgtB) {
        if (isNestedVertex(graph, sourceCell) || isNestedVertex(graph, targetCell)) {
            return false;
        }
        const scy = srcB.y + srcB.h / 2;
        const tcy = tgtB.y + tgtB.h / 2;
        return scy >= tcy - ALIGN_EPS;
    }

    /**
     * 루트(아래) → 컨테이너 안 부모: 수직 통로를 컨테이너 bbox 밖(아래)으로 밀어 관통 방지
     */
    function buildRootToNestedTargetPath(srcB, tgtB, blockB) {
        const scx = srcB.x + srcB.w / 2;
        const tcx = tgtB.x + tgtB.w / 2;
        const entryFrac = clamp01((tcx - tgtB.x) / (tgtB.w || 1));
        const exitPt = { x: scx, y: srcB.y };
        const entryPt = {
            x: tgtB.x + tgtB.w * entryFrac,
            y: tgtB.y + tgtB.h,
        };
        let yCh = (srcB.y + entryPt.y) / 2;
        if (blockB) {
            const inBlock =
                yCh > blockB.y - ALIGN_EPS &&
                yCh < blockB.y + blockB.h + ALIGN_EPS;
            if (inBlock && srcB.y >= blockB.y + blockB.h - ALIGN_EPS) {
                yCh = blockB.y + blockB.h + APPROACH_PAD;
            } else if (inBlock) {
                yCh = blockB.y - APPROACH_PAD;
            }
        }
        if (near(exitPt.x, entryPt.x)) {
            return {
                path: [exitPt, entryPt],
                exitSide: 'N',
                entrySide: 'S',
                exitFrac: DEFAULT_FRAC,
                entryFrac,
            };
        }
        return {
            path: [
                exitPt,
                { x: scx, y: yCh },
                { x: entryPt.x, y: yCh },
                entryPt,
            ],
            exitSide: 'N',
            entrySide: 'S',
            exitFrac: DEFAULT_FRAC,
            entryFrac,
        };
    }

    /** 컨테이너 내부 소스 → 바깥 부모: E/W로 껍질 밖에서 상승 (상단 버스 방지) */
    function buildNestedEscapePath(
        srcB,
        tgtB,
        contB,
        exitSide,
        entrySide,
        exitFrac,
        entryFrac,
    ) {
        if (!contB) return null;
        const pad = APPROACH_PAD;
        const exitPt = pointOnSide(srcB, exitSide, exitFrac);
        const entryPt = pointOnSide(tgtB, entrySide, entryFrac);

        if (exitSide !== 'E' && exitSide !== 'W') return null;

        const xShell =
            exitSide === 'E' ? contB.x + contB.w + pad : contB.x - pad;
        const path = [exitPt, { x: xShell, y: exitPt.y }];

        if (entrySide === 'S' || entrySide === 'N') {
            const yRun =
                entrySide === 'S'
                    ? tgtB.y + tgtB.h + pad
                    : tgtB.y - pad;
            path.push({ x: xShell, y: yRun });
            if (!near(xShell, entryPt.x)) {
                path.push({ x: entryPt.x, y: yRun });
            }
            path.push(entryPt);
        } else {
            const xRun =
                entrySide === 'E'
                    ? tgtB.x + tgtB.w + pad
                    : tgtB.x - pad;
            path.push({ x: xShell, y: entryPt.y });
            if (!near(xRun, xShell)) {
                path.push({ x: xRun, y: entryPt.y });
            }
            path.push(entryPt);
        }

        return { path, exitSide, entrySide, exitFrac, entryFrac };
    }

    function buildColumnSpecPath(srcB, tgtB) {
        const cx = srcB.x + srcB.w / 2;
        const entryFrac = clamp01((cx - tgtB.x) / (tgtB.w || 1));
        const exitPt = { x: cx, y: srcB.y };
        const entryPt = {
            x: tgtB.x + tgtB.w * entryFrac,
            y: tgtB.y + tgtB.h,
        };
        if (near(exitPt.x, entryPt.x)) {
            return {
                path: [exitPt, entryPt],
                exitSide: 'N',
                entrySide: 'S',
                exitFrac: DEFAULT_FRAC,
                entryFrac,
            };
        }
        const yCh = (tgtB.y + tgtB.h + srcB.y) / 2;
        return {
            path: [
                exitPt,
                { x: exitPt.x, y: yCh },
                { x: entryPt.x, y: yCh },
                entryPt,
            ],
            exitSide: 'N',
            entrySide: 'S',
            exitFrac: DEFAULT_FRAC,
            entryFrac,
        };
    }

    function buildSpecPath(
        srcB,
        tgtB,
        exitSide,
        entrySide,
        exitFrac,
        entryFrac,
        obstacleCtx,
    ) {
        const exitPt = pointOnSide(srcB, exitSide, exitFrac);
        const entryPt = pointOnSide(tgtB, entrySide, entryFrac);
        const exitVert = exitSide === 'N' || exitSide === 'S';
        const entryVert = entrySide === 'N' || entrySide === 'S';

        if (exitVert && entryVert) {
            if (near(exitPt.x, entryPt.x)) {
                return { path: [exitPt, entryPt], exitSide, entrySide };
            }
            const yCh = resolveVerticalChannelY(
                exitSide,
                entrySide,
                srcB,
                tgtB,
                exitPt,
                entryPt,
                obstacleCtx,
            );
            return {
                path: [
                    exitPt,
                    { x: exitPt.x, y: yCh },
                    { x: entryPt.x, y: yCh },
                    entryPt,
                ],
                exitSide,
                entrySide,
            };
        }
        if (!exitVert && !entryVert) {
            if (near(exitPt.y, entryPt.y)) {
                return { path: [exitPt, entryPt], exitSide, entrySide };
            }
            const xCh = resolveHorizontalChannelX(
                exitSide,
                entrySide,
                srcB,
                tgtB,
                exitPt,
                entryPt,
                obstacleCtx,
            );
            return {
                path: [
                    exitPt,
                    { x: xCh, y: exitPt.y },
                    { x: xCh, y: entryPt.y },
                    entryPt,
                ],
                exitSide,
                entrySide,
            };
        }
        if (exitVert) {
            const yCh = resolveVerticalChannelY(
                exitSide,
                entrySide,
                srcB,
                tgtB,
                exitPt,
                entryPt,
                obstacleCtx,
            );
            return {
                path: [
                    exitPt,
                    { x: exitPt.x, y: yCh },
                    { x: entryPt.x, y: yCh },
                    entryPt,
                ],
                exitSide,
                entrySide,
            };
        }
        const xCh = resolveHorizontalChannelX(
            exitSide,
            entrySide,
            srcB,
            tgtB,
            exitPt,
            entryPt,
            obstacleCtx,
        );
        return {
            path: [
                exitPt,
                { x: xCh, y: exitPt.y },
                { x: xCh, y: entryPt.y },
                entryPt,
            ],
            exitSide,
            entrySide,
        };
    }

    function styleStringForAnchor(role, side, frac) {
        const f = frac.toFixed(3);
        const px = role === 'exit' ? 'exitX' : 'entryX';
        const py = role === 'exit' ? 'exitY' : 'entryY';
        const perim = role === 'exit' ? 'exitPerimeter' : 'entryPerimeter';
        switch (side) {
            case 'W':
                return `${px}=0;${py}=${f};${perim}=0`;
            case 'E':
                return `${px}=1;${py}=${f};${perim}=0`;
            case 'N':
                return `${px}=${f};${py}=0;${perim}=0`;
            case 'S':
                return `${px}=${f};${py}=1;${perim}=0`;
            default:
                return `${px}=0.5;${py}=0.5;${perim}=0`;
        }
    }

    function replaceAnchorInStyle(style, role, side, frac) {
        const prefix = role === 'exit' ? 'exit' : 'entry';
        let st = style || '';
        st = st.replace(new RegExp(`${prefix}X=[^;]*`, 'g'), '');
        st = st.replace(new RegExp(`${prefix}Y=[^;]*`, 'g'), '');
        st = st.replace(new RegExp(`${prefix}Perimeter=[^;]*`, 'g'), '');
        if (st && !st.endsWith(';')) st += ';';
        return st + styleStringForAnchor(role, side, frac);
    }

    function parseAnchorFrac(style, role, side) {
        const st = style || '';
        const xKey = role === 'exit' ? 'exitX' : 'entryX';
        const yKey = role === 'exit' ? 'exitY' : 'entryY';
        const xM = st.match(new RegExp(`${xKey}=([\\d.]+)`));
        const yM = st.match(new RegExp(`${yKey}=([\\d.]+)`));
        if (side === 'N' || side === 'S') {
            return xM ? clamp01(parseFloat(xM[1])) : DEFAULT_FRAC;
        }
        return yM ? clamp01(parseFloat(yM[1])) : DEFAULT_FRAC;
    }

    function constraintPoint(side, frac) {
        const f = frac;
        switch (side) {
            case 'N':
                return makePoint(f, 0);
            case 'S':
                return makePoint(f, 1);
            case 'W':
                return makePoint(0, f);
            case 'E':
                return makePoint(1, f);
            default:
                return makePoint(0.5, 0.5);
        }
    }

    function applyConnectionConstraints(
        graph,
        edgeCell,
        sourceCell,
        targetCell,
        exitSide,
        entrySide,
        exitFrac,
        entryFrac,
    ) {
        if (!graph.setConnectionConstraint || !mxConn) return;
        try {
            graph.setConnectionConstraint(
                edgeCell,
                sourceCell,
                true,
                new mxConn(constraintPoint(exitSide, exitFrac), false),
            );
            graph.setConnectionConstraint(
                edgeCell,
                targetCell,
                false,
                new mxConn(constraintPoint(entrySide, entryFrac), false),
            );
        } catch (_) {}
    }

    function applyExplicitRoute(
        graph,
        edgeCell,
        pathAbs,
        exitSide,
        entrySide,
        sourceCell,
        targetCell,
    ) {
        if (!pathAbs || pathAbs.length < 2) return false;

        const model = graph.getModel();
        const start = pathAbs[0];
        const end = pathAbs[pathAbs.length - 1];
        const ptOrigin = edgeControlOrigin(graph, edgeCell);
        let interiorAbs = pathAbs.slice(1, -1);
        if (
            pathAbs.length === 2 &&
            exitSide === 'N' &&
            entrySide === 'S' &&
            !near(start.x, end.x) &&
            !near(start.y, end.y)
        ) {
            interiorAbs = [makePoint(start.x, end.y)];
        }
        const relMid = interiorAbs.map((p) =>
            makePoint(p.x - ptOrigin.x, p.y - ptOrigin.y),
        );

        model.beginUpdate();
        try {
            let st = model.getStyle(edgeCell) || '';
            st = st.replace(/edgeStyle=[^;]*/g, '');
            st = st.replace(/rounded=\d+/g, 'rounded=0');
            st = st.replace(/orthogonalLoop=\d+/g, 'orthogonalLoop=0');
            st = st.replace(/jettySize=[^;]*/g, 'jettySize=0');
            if (st && !st.endsWith(';')) st += ';';
            st +=
                'edgeStyle=segmentEdgeStyle;noEdgeStyle=1;bendable=0;editable=0';
            model.setStyle(edgeCell, st);

            const geo = model.getGeometry(edgeCell);
            if (geo) {
                const newGeo = geo.clone();
                newGeo.x = 0;
                newGeo.y = 0;
                newGeo.points = relMid.length > 0 ? relMid : null;
                if (newGeo.setTerminalPoint) {
                    newGeo.setTerminalPoint(null, true);
                    newGeo.setTerminalPoint(null, false);
                }
                model.setGeometry(edgeCell, newGeo);
            }

            const srcB = cellBounds(graph, sourceCell);
            const tgtB = cellBounds(graph, targetCell);
            let exitFrac = DEFAULT_FRAC;
            let entryFrac = DEFAULT_FRAC;
            if (srcB && !sourceCell._isBorderNode) {
                exitFrac = fracOnSide(srcB, exitSide, start);
                st = replaceAnchorInStyle(
                    model.getStyle(edgeCell),
                    'exit',
                    exitSide,
                    exitFrac,
                );
                model.setStyle(edgeCell, st);
            }
            if (tgtB && !targetCell._isBorderNode) {
                entryFrac = fracOnSide(tgtB, entrySide, end);
                st = replaceAnchorInStyle(
                    model.getStyle(edgeCell),
                    'entry',
                    entrySide,
                    entryFrac,
                );
                model.setStyle(edgeCell, st);
            }
            applyConnectionConstraints(
                graph,
                edgeCell,
                sourceCell,
                targetCell,
                exitSide,
                entrySide,
                exitFrac,
                entryFrac,
            );
        } finally {
            model.endUpdate();
        }
        if (graph.view?.invalidate) {
            try {
                graph.view.invalidate(edgeCell, false, false);
            } catch (_) {}
        }
        edgeCell._routed = true;
        edgeCell._hasElkWaypoints = false;
        return true;
    }

    function routeSpecEdge(graph, edgeCell, edgeData, sourceCell, targetCell) {
        if (!edgeCell?.source || !edgeCell?.target) return;
        if (edgeData) delete edgeData.waypoints;

        const srcB = cellBounds(graph, sourceCell);
        const tgtB = cellBounds(graph, targetCell);
        if (!srcB || !tgtB) return;

        const sides = resolveSpecSides();
        const exitFrac = DEFAULT_FRAC;
        const entryFrac = DEFAULT_FRAC;

        const cfg = getEdgeObstacleCfg();
        const obstacleCtx = {
            obstacles: collectSpecObstacles(graph, sourceCell, targetCell),
            buffer: Number(cfg.obstacleBuffer) || 20,
        };

        const built = buildSpecPath(
            srcB,
            tgtB,
            sides.exitSide,
            sides.entrySide,
            exitFrac,
            entryFrac,
            obstacleCtx,
        );

        let path = built.path;
        const util = getEdgeObstacleUtil();
        const hitsBefore =
            util?.countPathHits && obstacleCtx.obstacles.length
                ? util.countPathHits(
                      path,
                      obstacleCtx.obstacles,
                      obstacleCtx.buffer,
                  )
                : 0;
        if (
            util?.refineOrthogonalPath &&
            obstacleCtx.obstacles.length &&
            hitsBefore > 0
        ) {
            const refined = util.refineOrthogonalPath(
                path,
                obstacleCtx.obstacles,
                {
                    buffer: obstacleCtx.buffer,
                    maxExtraBends: Number(cfg.maxExtraBends) ?? 8,
                    maxIter: Number(cfg.maxAvoidIter) || 24,
                    maxPoints: Number(cfg.maxPathPoints) || 22,
                },
            );
            const hitsAfter = util.countPathHits(
                refined,
                obstacleCtx.obstacles,
                obstacleCtx.buffer,
            );
            if (hitsAfter <= hitsBefore) {
                path = refined;
            }
        }

        applyExplicitRoute(
            graph,
            edgeCell,
            path,
            built.exitSide,
            built.entrySide,
            sourceCell,
            targetCell,
        );
    }

    function collectSpecEdges(graph) {
        const model = graph.getModel();
        const defaultParent = graph.getDefaultParent();
        const out = [];

        function walk(cell) {
            const n = model.getChildCount(cell);
            for (let i = 0; i < n; i++) {
                const ch = model.getChildAt(cell, i);
                if (model.isEdge(ch) && ch.source && ch.target && ch._edgeData) {
                    const kind = ch._edgeData.kind || ch._edgeData.type || '';
                    if (isSpecKind(kind)) out.push(ch);
                } else if (model.isVertex(ch)) {
                    walk(ch);
                }
            }
        }
        walk(defaultParent);
        return out;
    }

    function spreadAnchorGroup(model, items, role) {
        for (const [, arr] of items) {
            arr.sort((a, b) => a.sortKey - b.sortKey);
            const n = arr.length;
            for (let i = 0; i < n; i++) {
                const frac = n === 1 ? DEFAULT_FRAC : (i + 1) / (n + 1);
                const { edge, side } = arr[i];
                let st = model.getStyle(edge) || '';
                st = replaceAnchorInStyle(st, role, side, frac);
                model.setStyle(edge, st);
            }
        }
    }

    /** 루트→부모 아래: 진입점을 자식 중심 X에 맞춤 (Truck 열 분리) */
    function alignRootBelowParentAnchors(graph, entries) {
        const model = graph.getModel();
        model.beginUpdate();
        try {
            for (const item of entries) {
                const { edge, srcB, tgtB, sides } = item;
                if (
                    !isRootChildBelowParent(
                        graph,
                        edge.source,
                        edge.target,
                        srcB,
                        tgtB,
                    ) ||
                    sides.exitSide !== 'N' ||
                    sides.entrySide !== 'S'
                ) {
                    continue;
                }
                const cx = srcB.x + srcB.w / 2;
                const entryFrac = clamp01((cx - tgtB.x) / (tgtB.w || 1));
                let st = model.getStyle(edge) || '';
                st = replaceAnchorInStyle(st, 'exit', 'N', DEFAULT_FRAC);
                st = replaceAnchorInStyle(st, 'entry', 'S', entryFrac);
                model.setStyle(edge, st);
            }
        } finally {
            model.endUpdate();
        }
    }

    /** 앵커 분산 비활성화 — 상속은 전부 N/S 0.5 고정 후 routeSpecEdge에서 재설정 */
    function distributeSpecEdges(graph) {
        rerouteAllSpecEdges(graph);
    }

    function rerouteAllSpecEdges(graph) {
        for (const e of collectSpecEdges(graph)) {
            routeSpecEdge(
                graph,
                e,
                e._edgeData || {},
                e.source,
                e.target,
            );
        }
    }

    function isEdgeOrthogonal(graph, edgeCell) {
        if (typeof graph.isOrthogonal === 'function') {
            try {
                return graph.isOrthogonal(edgeCell);
            } catch (_) {
                return false;
            }
        }
        const st = graph.getModel().getStyle(edgeCell) || '';
        return (
            st.includes('segmentEdgeStyle') ||
            st.includes('orthogonalEdgeStyle')
        );
    }

    ns.MxGraph.specEdgeRouter = {
        isSpecKind,
        routeSpecEdge,
        distributeSpecEdges,
        rerouteAllSpecEdges,
        resolveSpecSides,
        buildSpecPath,
        cellBounds,
        isEdgeOrthogonal,
    };
})();
