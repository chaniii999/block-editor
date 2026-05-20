/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxEdgeBuilder.js — mxGraph 엣지·Border Node (직교 라우팅 단일 권한)
 *
 * README 직교 품질 기준:
 * - 직교(수평·수직)만, 꺾임 최소
 * - 종단은 노드 테두리에 명확히 연결
 * - 같은 면 다중 연결 시 테두리 중앙(단일) / 분산(복수)
 * - specialization: 부모 위·자식 아래 → 위(N) 출구, 아래(S) 진입
 * - BDD spec 라우팅: specEdgeRouter.js (배치: layout/bddLayout.js)
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.factory = ns.MxGraph.factory || {};

    const getTypeRegistry = () => ns.Editor?.config?.typeRegistry || {};

    const APPROACH_PAD = 16;
    const ALIGN_EPS = 2;
    const DEFAULT_FRAC = 0.5;

    const mxPt =
        typeof mxPoint !== 'undefined'
            ? mxPoint
            : typeof mx !== 'undefined' && mx.mxPoint
              ? mx.mxPoint
              : null;

    function log(prefix, ...args) {
        try {
            console.log(`[MxEdgeBuilder] ${prefix}`, ...args);
        } catch (_) {}
    }

    function clamp01(v) {
        return Math.max(0, Math.min(1, v));
    }

    function near(a, b) {
        return Math.abs(a - b) < ALIGN_EPS;
    }

    function dedupeMxOrthoPath(points) {
        if (!points || points.length < 2) {
            return points;
        }
        const out = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const p = points[i];
            const q = out[out.length - 1];
            if (Math.abs(p.x - q.x) > ALIGN_EPS || Math.abs(p.y - q.y) > ALIGN_EPS) {
                out.push(p);
            }
        }
        return out.length >= 2 ? out : points;
    }

    function isSpecializationHierarchyKind(kind) {
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

    function isHierarchicalEdgeKind(kind) {
        const typeReg = getTypeRegistry();
        if (typeReg.isHierarchicalEdgeKind) {
            return typeReg.isHierarchicalEdgeKind(kind);
        }
        if (!kind) return false;
        const k = String(kind).toLowerCase();
        if (k.includes('import') || k.includes('expose')) return false;
        if (isSpecializationHierarchyKind(kind)) return false;
        return (
            k.includes('contain') ||
            k.includes('own') ||
            k.includes('compose') ||
            k.includes('aggregate') ||
            k.includes('nest') ||
            k.includes('member') ||
            k.includes('usage') ||
            k.includes('perform') ||
            k.includes('include') ||
            k.includes('has')
        );
    }

    /** 절대 bbox (기본 parent 기준 누적) */
    function getCellAbsBounds(graph, cell) {
        if (!cell) return null;
        const model = graph.getModel();
        const defaultParent = graph.getDefaultParent();
        const g = model.getGeometry(cell);
        if (!g) return null;
        let x = g.x || 0;
        let y = g.y || 0;
        const w = g.width || 0;
        const h = g.height || 0;
        let p = cell.parent;
        while (p && p !== defaultParent && p !== model.getRoot()) {
            const pg = model.getGeometry(p);
            if (pg) {
                x += pg.x || 0;
                y += pg.y || 0;
            }
            p = p.parent;
        }
        return { x, y, w, h };
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

    /**
     * 출구·진입 면 (spec: 부모↑자식↓ → N/S 고정)
     */
    function resolveSides(srcB, tgtB, kind) {
        if (!srcB || !tgtB) {
            return { exitSide: 'N', entrySide: 'S' };
        }
        if (isSpecializationHierarchyKind(kind)) {
            return { exitSide: 'N', entrySide: 'S' };
        }
        const scx = srcB.x + srcB.w / 2;
        const scy = srcB.y + srcB.h / 2;
        const tcx = tgtB.x + tgtB.w / 2;
        const tcy = tgtB.y + tgtB.h / 2;
        const dx = tcx - scx;
        const dy = tcy - scy;
        if (Math.abs(dy) >= Math.abs(dx)) {
            return dy > 0
                ? { exitSide: 'S', entrySide: 'N' }
                : { exitSide: 'N', entrySide: 'S' };
        }
        return dx > 0
            ? { exitSide: 'E', entrySide: 'W' }
            : { exitSide: 'W', entrySide: 'E' };
    }

    function channelOutsideTarget(tgtB, entrySide) {
        switch (entrySide) {
            case 'S':
                return tgtB.y + tgtB.h + APPROACH_PAD;
            case 'N':
                return tgtB.y - APPROACH_PAD;
            case 'E':
                return tgtB.x + tgtB.w + APPROACH_PAD;
            case 'W':
                return tgtB.x - APPROACH_PAD;
            default:
                return tgtB.y + tgtB.h / 2;
        }
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

    /** 수직 직교: 두 노드 사이 갭 중앙 채널 (타깃 밖으로 돌지 않음) */
    function verticalChannelY(exitSide, entrySide, srcB, tgtB) {
        if (exitSide === 'N' && entrySide === 'S') {
            const parentBottom = tgtB.y + tgtB.h;
            const childTop = srcB.y;
            if (childTop > parentBottom + ALIGN_EPS) {
                return (parentBottom + childTop) / 2;
            }
            return parentBottom + APPROACH_PAD;
        }
        if (exitSide === 'S' && entrySide === 'N') {
            const parentTop = tgtB.y;
            const childBottom = srcB.y + srcB.h;
            if (parentTop > childBottom + ALIGN_EPS) {
                return (childBottom + parentTop) / 2;
            }
            return parentTop - APPROACH_PAD;
        }
        return channelOutsideTarget(tgtB, entrySide);
    }

    /** 수평 직교: 두 노드 사이 갭 중앙 채널 */
    function horizontalChannelX(exitSide, entrySide, srcB, tgtB) {
        if (exitSide === 'W' && entrySide === 'E') {
            const parentRight = tgtB.x + tgtB.w;
            const childLeft = srcB.x;
            if (childLeft > parentRight + ALIGN_EPS) {
                return (parentRight + childLeft) / 2;
            }
            return parentRight + APPROACH_PAD;
        }
        if (exitSide === 'E' && entrySide === 'W') {
            const parentLeft = tgtB.x;
            const childRight = srcB.x + srcB.w;
            if (parentLeft > childRight + ALIGN_EPS) {
                return (childRight + parentLeft) / 2;
            }
            return parentLeft - APPROACH_PAD;
        }
        return channelOutsideTarget(tgtB, entrySide);
    }

    /** ELK waypoint가 끝점 주변을 지나치게 벗어나면 Mx 직교로 폴백 */
    function isPathReasonable(path, srcB, tgtB) {
        if (!path || path.length < 2 || !srcB || !tgtB) return false;
        const minX = Math.min(srcB.x, tgtB.x);
        const minY = Math.min(srcB.y, tgtB.y);
        const maxX = Math.max(srcB.x + srcB.w, tgtB.x + tgtB.w);
        const maxY = Math.max(srcB.y + srcB.h, tgtB.y + tgtB.h);
        const span = Math.max(maxX - minX, maxY - minY, 80);
        const margin = span * 2 + APPROACH_PAD * 6;
        for (const p of path) {
            if (
                p.x < minX - margin ||
                p.x > maxX + margin ||
                p.y < minY - margin ||
                p.y > maxY + margin
            ) {
                return false;
            }
        }
        return true;
    }

    /**
     * 직교 최소 경로: 출구 법선 직선 → (필요 시) 갭/타깃 밖 채널 → 진입 법선
     */
    function buildOrthogonalPath(
        exitPt,
        entryPt,
        exitSide,
        entrySide,
        srcB,
        tgtB,
        obstacleCtx,
    ) {
        if (!exitPt || !entryPt) return [];
        const exitVert = exitSide === 'N' || exitSide === 'S';
        const entryVert = entrySide === 'N' || entrySide === 'S';

        if (exitVert && entryVert) {
            const util = getEdgeObstacleUtil();
            const obs = obstacleCtx?.obstacles;
            const buf = Number(obstacleCtx?.buffer) || 20;
            const straight = [exitPt, entryPt];
            const sameColumn = near(exitPt.x, entryPt.x);
            const straightBlocked =
                sameColumn &&
                obs?.length &&
                util?.countPathHits &&
                util.countPathHits(straight, obs, buf) > 0;
            if (sameColumn && !straightBlocked) {
                return straight;
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
            if (sameColumn && straightBlocked && util?.pickVerticalChannelX) {
                const ySpanMin = Math.min(exitPt.y, entryPt.y, yCh);
                const ySpanMax = Math.max(exitPt.y, entryPt.y, yCh);
                const candidates = [];
                for (const xv of [exitPt.x, exitPt.x - 240, exitPt.x + 240]) {
                    if (Number.isFinite(xv)) {
                        candidates.push(xv);
                    }
                }
                const clearX = util.pickVerticalChannelX(
                    candidates,
                    ySpanMin,
                    ySpanMax,
                    obs,
                    buf,
                    exitPt.x,
                );
                const stub = APPROACH_PAD + 10;
                const approachFromBelow = yCh > entryPt.y + ALIGN_EPS;
                const yStub = approachFromBelow
                    ? entryPt.y + stub
                    : entryPt.y - stub;
                const pathSix = dedupeMxOrthoPath([
                    exitPt,
                    { x: exitPt.x, y: yCh },
                    { x: clearX, y: yCh },
                    { x: clearX, y: yStub },
                    { x: entryPt.x, y: yStub },
                    entryPt,
                ]);
                if (pathSix.length >= 4) {
                    return pathSix;
                }
            }
            return [
                exitPt,
                { x: exitPt.x, y: yCh },
                { x: entryPt.x, y: yCh },
                entryPt,
            ];
        }
        if (!exitVert && !entryVert) {
            if (near(exitPt.y, entryPt.y)) {
                return [exitPt, entryPt];
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
            return [
                exitPt,
                { x: xCh, y: exitPt.y },
                { x: xCh, y: entryPt.y },
                entryPt,
            ];
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
            return [
                exitPt,
                { x: exitPt.x, y: yCh },
                { x: entryPt.x, y: yCh },
                entryPt,
            ];
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
        return [
            exitPt,
            { x: xCh, y: exitPt.y },
            { x: xCh, y: entryPt.y },
            entryPt,
        ];
    }

    function simplifyWaypoints(waypoints) {
        if (!waypoints || waypoints.length <= 2) return waypoints;
        const out = [waypoints[0]];
        for (let i = 1; i < waypoints.length - 1; i++) {
            const prev = out[out.length - 1];
            const cur = waypoints[i];
            const next = waypoints[i + 1];
            const colH = near(prev.y, cur.y) && near(cur.y, next.y);
            const colV = near(prev.x, cur.x) && near(cur.x, next.x);
            if (!colH && !colV) out.push(cur);
        }
        out.push(waypoints[waypoints.length - 1]);
        return out;
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

    function makePoint(x, y) {
        if (mxPt) return new mxPt(x, y);
        return { x, y };
    }

    function getSpecRouter() {
        return ns.MxGraph.specEdgeRouter;
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
        const defaultParent = graph.getDefaultParent();
        let p = cell.parent;
        while (p && p !== defaultParent && p !== model.getRoot()) {
            const nid = p._nodeData?.id || p.getId?.();
            if (nid) {
                ids.push(String(nid));
            }
            p = p.parent;
        }
        return ids;
    }

    function collectObstaclesForEdge(graph, sourceCell, targetCell) {
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
        return util.collectVertexObstacles(
            graph,
            [...exclude],
            (c) => getCellAbsBounds(graph, c),
        );
    }

    function pathObstacleHitCount(path, graph, sourceCell, targetCell) {
        const util = getEdgeObstacleUtil();
        if (!util?.countPathHits || !path || path.length < 2) {
            return 0;
        }
        const obstacles = collectObstaclesForEdge(
            graph,
            sourceCell,
            targetCell,
        );
        if (!obstacles.length) {
            return 0;
        }
        const buf = Number(getEdgeObstacleCfg().obstacleBuffer) || 20;
        return util.countPathHits(path, obstacles, buf);
    }

    function obstacleRefineOptions(cfg) {
        const c = cfg || getEdgeObstacleCfg();
        return {
            buffer: Number(c.obstacleBuffer) || 20,
            maxExtraBends: Number(c.maxExtraBends) ?? 8,
            maxIter: Number(c.maxAvoidIter) || 24,
            maxPoints: Number(c.maxPathPoints) || 22,
        };
    }

    /** N→S 4점 직교에서 마지막 수직이 장애물과 겹칠 때 옆 열로 우회 (spec과 동일 기하) */
    function fixMxNsFourPointLastVerticalThroughObstacles(
        path,
        exitSide,
        entrySide,
        graph,
        sourceCell,
        targetCell,
    ) {
        const obstacles = collectObstaclesForEdge(
            graph,
            sourceCell,
            targetCell,
        );
        const buf = Number(getEdgeObstacleCfg().obstacleBuffer) || 20;
        const util = getEdgeObstacleUtil();
        if (
            !path ||
            path.length !== 4 ||
            exitSide !== 'N' ||
            entrySide !== 'S' ||
            !obstacles.length ||
            !util?.pickVerticalChannelX ||
            !util.countPathHits
        ) {
            return path;
        }
        const p0 = path[0];
        const p1 = path[1];
        const p2 = path[2];
        const p3 = path[3];
        if (!p0 || !p1 || !p2 || !p3) {
            return path;
        }
        if (
            !near(p0.x, p1.x) ||
            !near(p1.y, p2.y) ||
            !near(p2.x, p3.x)
        ) {
            return path;
        }
        const hitsLast = util.countPathHits([p2, p3], obstacles, buf);
        if (hitsLast === 0) {
            return path;
        }
        const yMin = Math.min(p2.y, p3.y);
        const yMax = Math.max(p2.y, p3.y);
        const candidates = [];
        for (const x of [p3.x, p2.x, p1.x, p0.x]) {
            if (Number.isFinite(x)) {
                candidates.push(x);
            }
        }
        const clearX = util.pickVerticalChannelX(
            candidates,
            yMin,
            yMax,
            obstacles,
            buf,
            p3.x,
        );
        if (near(clearX, p3.x)) {
            return path;
        }
        const stub = APPROACH_PAD + 10;
        const approachFromBelow = p1.y > p3.y + ALIGN_EPS;
        const yStub = approachFromBelow ? p3.y + stub : p3.y - stub;
        const mid = makePoint(clearX, p1.y);
        const bend = makePoint(clearX, yStub);
        const pre = makePoint(p3.x, yStub);
        const out = dedupeMxOrthoPath([p0, p1, mid, bend, pre, p3]);
        return out.length >= 4 ? out : path;
    }

    /** 노드 관통 최소화 우선 — 교차 0 목표, 꺾임은 2차 */
    function refinePathAvoidingObstacles(path, graph, sourceCell, targetCell) {
        const util = getEdgeObstacleUtil();
        if (!util?.refineOrthogonalPath || !path || path.length < 2) {
            return path;
        }
        const obstacles = collectObstaclesForEdge(
            graph,
            sourceCell,
            targetCell,
        );
        if (!obstacles.length) {
            return path;
        }
        return util.refineOrthogonalPath(
            path,
            obstacles,
            obstacleRefineOptions(),
        );
    }

    function applyRouteStyle(model, edgeCell) {
        let st = model.getStyle(edgeCell) || '';
        st = st.replace(/edgeStyle=[^;]*/g, '');
        st = st.replace(/noEdgeStyle=[^;]*/g, '');
        st = st.replace(/rounded=\d+/g, 'rounded=0');
        st = st.replace(/orthogonalLoop=\d+/g, 'orthogonalLoop=0');
        st = st.replace(/jettySize=[^;]*/g, 'jettySize=12');
        if (st && !st.endsWith(';')) st += ';';
        st += 'edgeStyle=orthogonalEdgeStyle';
        model.setStyle(edgeCell, st);
    }

    /** mxGraph geometry.points 원점 (엣지 부모 체인; 소스 셀과 다름) */
    function edgeControlOrigin(graph, edgeCell) {
        if (!edgeCell) return { x: 0, y: 0 };
        const model = graph.getModel();
        const defaultParent = graph.getDefaultParent();
        const g = model.getGeometry(edgeCell);
        let x = g?.x || 0;
        let y = g?.y || 0;
        let p = edgeCell.parent;
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

    /** 계산 경로를 geometry·앵커에 반영 (spec 외·ELK 등) */
    function applyRoute(graph, edgeCell, pathAbs, exitSide, entrySide, sourceCell, targetCell) {
        if (!pathAbs || pathAbs.length < 2) return;
        const model = graph.getModel();
        const start = pathAbs[0];
        const end = pathAbs[pathAbs.length - 1];
        const ptOrigin = edgeControlOrigin(graph, edgeCell);
        const mid = pathAbs.slice(1, -1);
        const relMid = mid.map((p) =>
            makePoint(p.x - ptOrigin.x, p.y - ptOrigin.y),
        );

        model.beginUpdate();
        try {
            applyRouteStyle(model, edgeCell);
            const geo = model.getGeometry(edgeCell);
            if (geo) {
                const newGeo = geo.clone();
                newGeo.x = 0;
                newGeo.y = 0;
                newGeo.setTerminalPoint(null, true);
                newGeo.setTerminalPoint(null, false);
                newGeo.points = relMid.length > 0 ? relMid : null;
                model.setGeometry(edgeCell, newGeo);
            }

            if (!sourceCell._isBorderNode) {
                const exitFrac = fracOnSide(
                    getCellAbsBounds(graph, sourceCell),
                    exitSide,
                    start,
                );
                let st = model.getStyle(edgeCell) || '';
                st = replaceAnchorInStyle(st, 'exit', exitSide, exitFrac);
                model.setStyle(edgeCell, st);
            }
            if (!targetCell._isBorderNode) {
                const entryFrac = fracOnSide(
                    getCellAbsBounds(graph, targetCell),
                    entrySide,
                    end,
                );
                let st = model.getStyle(edgeCell) || '';
                st = replaceAnchorInStyle(st, 'entry', entrySide, entryFrac);
                model.setStyle(edgeCell, st);
            }
        } finally {
            model.endUpdate();
        }
        edgeCell._routed = true;
    }

    /**
     * 엣지 1개 라우팅 (createEdge·distribute 공통)
     */
    function routeEdge(graph, edgeCell, edgeData, sourceCell, targetCell) {
        if (!edgeCell?.source || !edgeCell?.target) return;

        const kind = String(
            edgeData?.kind || edgeData?.type || '',
        ).toLowerCase();
        const srcB = getCellAbsBounds(graph, sourceCell);
        const tgtB = getCellAbsBounds(graph, targetCell);
        if (!srcB || !tgtB) return;

        const isSpec = isSpecializationHierarchyKind(kind);
        const specRouter = getSpecRouter();
        if (isSpec && specRouter?.routeSpecEdge) {
            specRouter.routeSpecEdge(
                graph,
                edgeCell,
                edgeData,
                sourceCell,
                targetCell,
            );
            return;
        }

        const { exitSide, entrySide } = resolveSides(srcB, tgtB, kind);
        const model = graph.getModel();
        const style = model.getStyle(edgeCell) || '';

        if (!isSpec) {
            const elkWps = edgeData?.waypoints;
            const elkCandidate =
                elkWps &&
                Array.isArray(elkWps) &&
                elkWps.length >= 2 &&
                !sourceCell._isBorderNode &&
                !targetCell._isBorderNode;

            if (elkCandidate) {
                let path = simplifyWaypoints(elkWps);
                if (isPathReasonable(path, srcB, tgtB)) {
                    const hitsBefore = pathObstacleHitCount(
                        path,
                        graph,
                        sourceCell,
                        targetCell,
                    );
                    if (hitsBefore === 0) {
                        applyRoute(
                            graph,
                            edgeCell,
                            path,
                            exitSide,
                            entrySide,
                            sourceCell,
                            targetCell,
                        );
                        edgeCell._hasElkWaypoints = true;
                        return;
                    }
                    const refined = refinePathAvoidingObstacles(
                        path,
                        graph,
                        sourceCell,
                        targetCell,
                    );
                    const hitsAfter = pathObstacleHitCount(
                        refined,
                        graph,
                        sourceCell,
                        targetCell,
                    );
                    if (hitsAfter <= hitsBefore) {
                        path = simplifyWaypoints(refined);
                        applyRoute(
                            graph,
                            edgeCell,
                            path,
                            exitSide,
                            entrySide,
                            sourceCell,
                            targetCell,
                        );
                        edgeCell._hasElkWaypoints = true;
                        return;
                    }
                }
                delete edgeData.waypoints;
            }
        }

        const exitFrac = sourceCell._isBorderNode
            ? DEFAULT_FRAC
            : parseAnchorFrac(style, 'exit', exitSide);
        const entryFrac = targetCell._isBorderNode
            ? DEFAULT_FRAC
            : parseAnchorFrac(style, 'entry', entrySide);

        const exitPt = pointOnSide(srcB, exitSide, exitFrac);
        const entryPt = pointOnSide(tgtB, entrySide, entryFrac);
        const cfg = getEdgeObstacleCfg();
        const obstacleCtx = {
            obstacles: collectObstaclesForEdge(
                graph,
                sourceCell,
                targetCell,
            ),
            buffer: Number(cfg.obstacleBuffer) || 20,
        };
        let path = buildOrthogonalPath(
            exitPt,
            entryPt,
            exitSide,
            entrySide,
            srcB,
            tgtB,
            obstacleCtx,
        );
        path = refinePathAvoidingObstacles(
            path,
            graph,
            sourceCell,
            targetCell,
        );
        if (
            exitSide === 'N' &&
            entrySide === 'S' &&
            obstacleCtx.obstacles.length > 0
        ) {
            const hitsR1 = pathObstacleHitCount(
                path,
                graph,
                sourceCell,
                targetCell,
            );
            if (hitsR1 > 0) {
                path = fixMxNsFourPointLastVerticalThroughObstacles(
                    path,
                    exitSide,
                    entrySide,
                    graph,
                    sourceCell,
                    targetCell,
                );
                const hitsMid = pathObstacleHitCount(
                    path,
                    graph,
                    sourceCell,
                    targetCell,
                );
                if (hitsMid > 0) {
                    const refined2 = refinePathAvoidingObstacles(
                        path,
                        graph,
                        sourceCell,
                        targetCell,
                    );
                    const hits2 = pathObstacleHitCount(
                        refined2,
                        graph,
                        sourceCell,
                        targetCell,
                    );
                    if (hits2 <= hitsMid) {
                        path = refined2;
                    }
                }
            }
        }
        applyRoute(
            graph,
            edgeCell,
            path,
            exitSide,
            entrySide,
            sourceCell,
            targetCell,
        );
    }

    /** 노드 이동·guiData 복원 후 전 엣지 재라우팅 (spec → specEdgeRouter) */
    function rerouteAllEdges(graph) {
        if (!graph) return;
        const specRouter = getSpecRouter();
        const model = graph.getModel();
        const defaultParent = graph.getDefaultParent();

        function walk(cell) {
            const n = model.getChildCount(cell);
            for (let i = 0; i < n; i++) {
                const ch = model.getChildAt(cell, i);
                if (model.isEdge(ch) && ch.source && ch.target && ch._edgeData) {
                    const k = ch._edgeData.kind || ch._edgeData.type || '';
                    if (isSpecializationHierarchyKind(k)) {
                        if (specRouter?.routeSpecEdge) {
                            specRouter.routeSpecEdge(
                                graph,
                                ch,
                                ch._edgeData,
                                ch.source,
                                ch.target,
                            );
                        }
                    } else {
                        routeEdge(
                            graph,
                            ch,
                            ch._edgeData,
                            ch.source,
                            ch.target,
                        );
                    }
                } else if (model.isVertex(ch)) {
                    walk(ch);
                }
            }
        }
        walk(defaultParent);
    }

    function getBorderNodeExitStyle(cell) {
        if (!cell?._isBorderNode || !cell._nodeData) return '';
        const side = String(cell._nodeData.side || 'E').toUpperCase();
        return styleStringForAnchor('exit', side, DEFAULT_FRAC);
    }

    function getBorderNodeEntryStyle(cell) {
        if (!cell?._isBorderNode || !cell._nodeData) return '';
        const side = String(cell._nodeData.side || 'E').toUpperCase();
        return styleStringForAnchor('entry', side, DEFAULT_FRAC);
    }

    function isSpecEdgeCell(edgeCell) {
        const k = edgeCell?._edgeData?.kind || edgeCell?._edgeData?.type || '';
        return isSpecializationHierarchyKind(k);
    }

    function setEdgeAnchor(model, edgeCell, role, side, frac, touched) {
        let st = model.getStyle(edgeCell) || '';
        st = replaceAnchorInStyle(st, role, side, frac);
        model.setStyle(edgeCell, st);
        touched.add(edgeCell);
    }

    function isSpecTrunkPairEdge(edgeCell, byPair) {
        const pk = `${edgeCell.source.id}\x00${edgeCell.target.id}`;
        const arr = byPair.get(pk) || [];
        return arr.filter(isSpecEdgeCell).length > 1;
    }

    function readBddSpecLaneProximityPx() {
        const v = Number(ns.Editor?.config?.displaySettings?.bdd?.specLaneProximityPx);
        return Number.isFinite(v) && v > 0 ? v : 22;
    }

    function readBddSpecLaneMinSourceSpreadPx() {
        const g = Number(ns.Editor?.config?.displaySettings?.bdd?.specSiblingGap);
        const base = Number.isFinite(g) && g > 0 ? g : 120;
        return Math.max(40, Math.round(base * 0.42));
    }

    /**
     * 서로 다른 (source,target) spec이 출발·도착 중심이 가까우면 평행 차선(specLaneOffsetPx).
     * 동일 (source,target) 다중엣지는 규칙상 뼈대 공유 허용 → 여기서는 분리하지 않음.
     */
    function assignSpatiallyOverlappingSpecLaneOffsets(graph, allEdges) {
        const out = new Set();
        const STEP =
            Number(ns.Editor?.config?.displaySettings?.edgeObstacle?.specSpineLaneStep) ||
            6;
        const CLOSE = readBddSpecLaneProximityPx();
        const specEdges = allEdges.filter(isSpecEdgeCell);
        const n = specEdges.length;
        if (n < 2) {
            return out;
        }

        function centerOf(cell) {
            const b = getCellAbsBounds(graph, cell);
            if (!b) {
                return null;
            }
            return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
        }

        function geomClose(ei, ej) {
            const si = centerOf(ei.source);
            const ti = centerOf(ei.target);
            const sj = centerOf(ej.source);
            const tj = centerOf(ej.target);
            if (!si || !ti || !sj || !tj) {
                return false;
            }
            return (
                Math.abs(si.x - sj.x) < CLOSE &&
                Math.abs(si.y - sj.y) < CLOSE &&
                Math.abs(ti.x - tj.x) < CLOSE &&
                Math.abs(ti.y - tj.y) < CLOSE
            );
        }

        const parent = new Array(n);
        for (let i = 0; i < n; i++) {
            parent[i] = i;
        }

        function find(a) {
            if (parent[a] !== a) {
                parent[a] = find(parent[a]);
            }
            return parent[a];
        }

        function union(a, b) {
            const ra = find(a);
            const rb = find(b);
            if (ra !== rb) {
                parent[rb] = ra;
            }
        }

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const ei = specEdges[i];
                const ej = specEdges[j];
                if (ei.source === ej.source && ei.target === ej.target) {
                    continue;
                }
                if (geomClose(ei, ej)) {
                    union(i, j);
                }
            }
        }

        const groups = new Map();
        for (let i = 0; i < n; i++) {
            const r = find(i);
            if (!groups.has(r)) {
                groups.set(r, []);
            }
            groups.get(r).push(specEdges[i]);
        }

        for (const [, cluster] of groups) {
            if (cluster.length < 2) {
                continue;
            }
            const pairKeys = new Set(
                cluster.map((e) => `${e.source.id}\x00${e.target.id}`),
            );
            if (pairKeys.size <= 1) {
                continue;
            }
            cluster.sort((a, b) => {
                const ida = String(a._edgeData?.id || a.id || '');
                const idb = String(b._edgeData?.id || b.id || '');
                return ida.localeCompare(idb);
            });
            const m = cluster.length;
            for (let k = 0; k < m; k++) {
                const e = cluster[k];
                const ed = e._edgeData || {};
                e._edgeData = ed;
                ed.specLaneOffsetPx = (k - (m - 1) / 2) * STEP;
                out.add(e);
            }
        }
        return out;
    }

    /** 규칙1: 동일 부모 S면 분산, 자식 N은 중앙(공유 뼈대) */
    function spreadSpecEntriesOnTarget(graph, model, edges, touched, byPair) {
        const list = edges
            .filter(isSpecEdgeCell)
            .filter((e) => !isSpecTrunkPairEdge(e, byPair));
        if (list.length <= 1) {
            return;
        }
        list.sort((a, b) => {
            const ba = getCellAbsBounds(graph, a.source);
            const bb = getCellAbsBounds(graph, b.source);
            return ba.x + ba.w / 2 - (bb.x + bb.w / 2);
        });
        const n = list.length;
        const minSpread = readBddSpecLaneMinSourceSpreadPx();
        let minCx = Infinity;
        let maxCx = -Infinity;
        for (const e of list) {
            const b = getCellAbsBounds(graph, e.source);
            if (!b) {
                continue;
            }
            const cx = b.x + b.w / 2;
            minCx = Math.min(minCx, cx);
            maxCx = Math.max(maxCx, cx);
        }
        const needExitSpread =
            Number.isFinite(minCx) &&
            Number.isFinite(maxCx) &&
            maxCx - minCx < minSpread;
        for (let i = 0; i < n; i++) {
            const frac = (i + 1) / (n + 1);
            setEdgeAnchor(model, list[i], 'entry', 'S', frac, touched);
            setEdgeAnchor(
                model,
                list[i],
                'exit',
                'N',
                needExitSpread ? frac : DEFAULT_FRAC,
                touched,
            );
        }
    }

    /** 규칙1: 완전 동일 (source,target) 쌍 — 종단 entry만 분산 */
    function spreadSpecExactPairs(graph, model, byPair, touched) {
        for (const [, arr] of byPair) {
            const list = arr.filter(isSpecEdgeCell);
            if (list.length <= 1) {
                continue;
            }
            list.sort((a, b) => {
                const ida = String(a._edgeData?.id || a.id || '');
                const idb = String(b._edgeData?.id || b.id || '');
                return ida.localeCompare(idb);
            });
            const n = list.length;
            for (let i = 0; i < n; i++) {
                const frac = (i + 1) / (n + 1);
                setEdgeAnchor(model, list[i], 'entry', 'S', frac, touched);
                setEdgeAnchor(model, list[i], 'exit', 'N', DEFAULT_FRAC, touched);
                if (list[i]._edgeData) {
                    list[i]._edgeData._specShareTrunk = true;
                }
            }
        }
    }

    /** 규칙1: 한 자식 → 다중 부모 — exit(N) 분산, 타깃 중심이 좁으면 entry(S)도 동일 비율 분산(차선) */
    function spreadSpecExitsOnSource(graph, model, edges, touched) {
        const list = edges.filter(isSpecEdgeCell);
        const targets = new Set(list.map((e) => e.target?.id));
        if (list.length <= 1 || targets.size <= 1) {
            return;
        }
        list.sort((a, b) => {
            const ba = getCellAbsBounds(graph, a.target);
            const bb = getCellAbsBounds(graph, b.target);
            return ba.x + ba.w / 2 - (bb.x + bb.w / 2);
        });
        const n = list.length;
        const minSpread = readBddSpecLaneMinSourceSpreadPx();
        let minCx = Infinity;
        let maxCx = -Infinity;
        for (const e of list) {
            const b = getCellAbsBounds(graph, e.target);
            if (!b) {
                continue;
            }
            const cx = b.x + b.w / 2;
            minCx = Math.min(minCx, cx);
            maxCx = Math.max(maxCx, cx);
        }
        const needEntrySpread =
            Number.isFinite(minCx) &&
            Number.isFinite(maxCx) &&
            maxCx - minCx < minSpread;
        for (let i = 0; i < n; i++) {
            const frac = (i + 1) / (n + 1);
            setEdgeAnchor(model, list[i], 'exit', 'N', frac, touched);
            setEdgeAnchor(
                model,
                list[i],
                'entry',
                'S',
                needEntrySpread ? frac : DEFAULT_FRAC,
                touched,
            );
        }
    }

    /**
     * 같은 노드·같은 면: 단일=중앙(0.5), 복수=좌→우 분산
     * spec: 규칙1(뼈대 공유·종단 분리) / 비-spec: 기존 exit·entry 분산
     */
    function distributeOverlappingEdges(graph) {
        const specRouter = getSpecRouter();
        const model = graph.getModel();
        const defaultParent = graph.getDefaultParent();
        const allEdges = [];

        function collect(cell) {
            const n = model.getChildCount(cell);
            for (let i = 0; i < n; i++) {
                const ch = model.getChildAt(cell, i);
                if (model.isEdge(ch)) allEdges.push(ch);
                else if (model.isVertex(ch)) collect(ch);
            }
        }
        collect(defaultParent);
        if (allEdges.length === 0) return;

        function peerCenter(peer) {
            const b = getCellAbsBounds(graph, peer);
            return b
                ? { x: b.x + b.w / 2, y: b.y + b.h / 2 }
                : null;
        }

        const bySource = new Map();
        const byTarget = new Map();
        const byPair = new Map();
        for (const e of allEdges) {
            if (!e.source || !e.target) continue;
            if (!e.source._isBorderNode) {
                const k = e.source.id;
                if (!bySource.has(k)) bySource.set(k, []);
                bySource.get(k).push(e);
            }
            if (!e.target._isBorderNode) {
                const k = e.target.id;
                if (!byTarget.has(k)) byTarget.set(k, []);
                byTarget.get(k).push(e);
            }
            const pk = `${e.source.id}\x00${e.target.id}`;
            if (!byPair.has(pk)) byPair.set(pk, []);
            byPair.get(pk).push(e);
        }

        const touched = new Set();

        function spreadGroup(edges, role) {
            const bySide = {};
            for (const e of edges) {
                if (isSpecEdgeCell(e)) {
                    continue;
                }
                const src = e.source;
                const tgt = e.target;
                const edgeData = e._edgeData || {};
                const kind = edgeData.kind || edgeData.type || '';
                const srcB = getCellAbsBounds(graph, src);
                const tgtB = getCellAbsBounds(graph, tgt);
                const sides = resolveSides(srcB, tgtB, kind);
                const side = role === 'exit' ? sides.exitSide : sides.entrySide;
                const peer = role === 'exit' ? tgt : src;
                const pc = peerCenter(peer);
                if (!pc) continue;
                if (!bySide[side]) bySide[side] = [];
                bySide[side].push({
                    e,
                    sortKey: side === 'N' || side === 'S' ? pc.x : pc.y,
                });
            }
            for (const [side, arr] of Object.entries(bySide)) {
                arr.sort((a, b) => a.sortKey - b.sortKey);
                const n = arr.length;
                for (let i = 0; i < n; i++) {
                    const frac = n === 1 ? DEFAULT_FRAC : (i + 1) / (n + 1);
                    setEdgeAnchor(model, arr[i].e, role, side, frac, touched);
                }
            }
        }

        model.beginUpdate();
        try {
            spreadSpecExactPairs(graph, model, byPair, touched);
            for (const [, group] of byTarget) {
                spreadSpecEntriesOnTarget(graph, model, group, touched, byPair);
            }
            for (const [, group] of bySource) {
                spreadSpecExitsOnSource(graph, model, group, touched);
            }
            for (const c of assignSpatiallyOverlappingSpecLaneOffsets(
                graph,
                allEdges,
            )) {
                touched.add(c);
            }
            for (const [, group] of bySource) {
                spreadGroup(group, 'exit');
            }
            for (const [, group] of byTarget) {
                spreadGroup(group, 'entry');
            }
            for (const edgeCell of touched) {
                const edgeData = edgeCell._edgeData || {};
                const kind = edgeData.kind || edgeData.type || '';
                if (
                    isSpecializationHierarchyKind(kind) &&
                    specRouter?.routeSpecEdge
                ) {
                    specRouter.routeSpecEdge(
                        graph,
                        edgeCell,
                        edgeData,
                        edgeCell.source,
                        edgeCell.target,
                    );
                } else {
                    routeEdge(
                        graph,
                        edgeCell,
                        edgeData,
                        edgeCell.source,
                        edgeCell.target,
                    );
                }
            }
        } finally {
            model.endUpdate();
        }
        if (touched.size > 0) {
            log(`앵커 분산 후 재라우팅: ${touched.size}개`);
        }
    }

    function createEdge(graph, parent, edge, cellMap, borderNodeIds) {
        if (!graph || !edge) return null;

        const {
            id,
            source: sourceId,
            target: targetId,
            type = 'default',
            kind = '',
            label = '',
        } = edge;

        const edgeType = kind || type || 'default';
        const edgeTypeLower = edgeType.toLowerCase();

        let edgeLabel = label;
        if (
            !edgeLabel &&
            (edgeTypeLower.includes('import') ||
                edgeTypeLower.includes('expose'))
        ) {
            if (edgeTypeLower.includes('import')) {
                edgeLabel =
                    edgeTypeLower === 'namespaceimport'
                        ? '«import» *'
                        : '«import»';
            } else {
                edgeLabel = '«expose»';
            }
        }

        if (isHierarchicalEdgeKind(edgeType) && !edge.kindClass) {
            return null;
        }
        if (edgeTypeLower === 'containment') return null;
        if (edge.nestedSpecChrome === true) return null;

        const targetCellPreview = cellMap[targetId];
        if (
            edgeTypeLower === 'featuretyping' &&
            targetCellPreview?._nodeData?.featureTypingFooter?.length
        ) {
            return null;
        }
        if (id && String(id).startsWith('_implicit_')) return null;

        if (edgeTypeLower === 'featuretyping') {
            const sLast = String(sourceId).lastIndexOf('::');
            const tLast = String(targetId).lastIndexOf('::');
            const sParent = sLast > 0 ? sourceId.substring(0, sLast) : '';
            const tParent = tLast > 0 ? targetId.substring(0, tLast) : '';
            if (sParent !== tParent) {
                const sc = cellMap[sourceId];
                const srcType = String(
                    sc?._nodeData?.type || '',
                ).toLowerCase();
                if (srcType.includes('action') && !cellMap[targetId]) {
                    return null;
                }
            }
        }

        const sourceCell = cellMap[sourceId];
        const targetCell = cellMap[targetId];
        if (!sourceCell || !targetCell) {
            if (!borderNodeIds || !borderNodeIds.has(targetId)) {
                log(
                    '엣지 생성 실패',
                    id,
                    sourceId,
                    targetId,
                );
            }
            return null;
        }

        let style = ns.MxGraph.styles?.getEdgeStyle?.(edgeType) || '';

        const bnExit = getBorderNodeExitStyle(sourceCell);
        const bnEntry = getBorderNodeEntryStyle(targetCell);
        if (bnExit) style += `;${bnExit}`;
        if (bnEntry) style += `;${bnEntry}`;

        const edgeCell = graph.insertEdge(
            parent,
            id,
            edgeLabel,
            sourceCell,
            targetCell,
            style,
        );
        edgeCell._edgeData = edge;

        routeEdge(graph, edgeCell, edge, sourceCell, targetCell);

        return edgeCell;
    }

    function createBorderNode(
        graph,
        parentCell,
        borderNode,
        index,
        total,
        sideIndex,
        sideTotal,
    ) {
        if (!graph || !parentCell || !borderNode) return null;

        const parentGeo = parentCell.getGeometry();
        if (!parentGeo) return null;

        const DS_bn = window.SELAB?.Editor?.config?.displaySettings;
        const size = DS_bn?.borderNode?.size ?? 12;
        const dirLower = String(borderNode.direction || '').toLowerCase();
        const isParameterPin =
            borderNode.nodeType === 'parameter' ||
            borderNode.isParameter === true;

        const side = String(borderNode.side || 'E').toUpperCase();
        const hasPrecomputedOffset =
            typeof borderNode.offset === 'number' &&
            borderNode.offset !== 0.5;
        const computedOffset = hasPrecomputedOffset
            ? borderNode.offset
            : typeof sideIndex === 'number' &&
                typeof sideTotal === 'number' &&
                sideTotal > 0
              ? (sideIndex + 1) / (sideTotal + 1)
              : 0.25;
        const offset = Math.max(0, Math.min(1, computedOffset));

        let relativeX = 1;
        let relativeY = offset;
        let geoOffsetX = -size / 2;
        let geoOffsetY = -size / 2;
        let portConstraint = 'eastwest';

        switch (side) {
            case 'N':
                relativeX = offset;
                relativeY = 0;
                portConstraint = 'northsouth';
                break;
            case 'S':
                relativeX = offset;
                relativeY = 1;
                portConstraint = 'northsouth';
                break;
            case 'W':
                relativeX = 0;
                relativeY = offset;
                break;
            case 'E':
            default:
                relativeX = 1;
                relativeY = offset;
                break;
        }

        const isItem =
            borderNode.nodeType === 'item' ||
            borderNode.nodeType === 'directedItem';
        const isDark = ns.MxGraph.styleColors?.isDarkTheme?.() || false;
        const strokeColor = isItem ? '#4CAF50' : isDark ? '#999999' : '#333333';
        const bnFillColor = isDark ? '#2d2d2d' : '#FFFFFF';
        const bnFontColor = isDark ? '#e0e0e0' : '#333333';

        const bnSpTop = DS_bn?.borderNode?.spacingTop ?? 2;
        const bnSpBot = DS_bn?.borderNode?.spacingBottom ?? 2;
        let verticalLabelPosition = 'bottom';
        let verticalAlignValue = 'top';
        let spacingTopValue = bnSpTop;
        let spacingBottomValue = null;

        const isDirectedIn =
            dirLower === 'in' || dirLower.startsWith('in');
        const isDirectedOut =
            dirLower === 'out' || dirLower.startsWith('out');

        if ((isParameterPin || isItem) && isDirectedIn) {
            verticalLabelPosition = 'top';
            verticalAlignValue = 'bottom';
            spacingTopValue = null;
            spacingBottomValue = bnSpBot + 1;
        } else if ((isParameterPin || isItem) && isDirectedOut) {
            verticalLabelPosition = 'bottom';
            verticalAlignValue = 'top';
            spacingTopValue = bnSpTop - 2;
        }

        const styleParts = [
            'shape=rectangle',
            `fillColor=${bnFillColor}`,
            `strokeColor=${strokeColor}`,
            'strokeWidth=2',
            'fontSize=8',
            `fontColor=${bnFontColor}`,
            `portConstraint=${portConstraint}`,
            'labelPosition=center',
            `verticalLabelPosition=${verticalLabelPosition}`,
            'align=center',
            `verticalAlign=${verticalAlignValue}`,
        ];
        if (spacingTopValue !== null) {
            styleParts.push(`spacingTop=${spacingTopValue}`);
        }
        if (spacingBottomValue !== null) {
            styleParts.push(`spacingBottom=${spacingBottomValue}`);
        }

        let label = borderNode.name || '';
        const borderNodeTypeLower = String(
            borderNode.nodeType ||
                borderNode.type ||
                borderNode.kind ||
                '',
        ).toLowerCase();
        const shouldShowTypeName =
            !isParameterPin &&
            borderNode.typeName &&
            !(
                (borderNodeTypeLower === 'item' ||
                    borderNodeTypeLower === 'itemusage' ||
                    borderNodeTypeLower === 'directeditem') &&
                String(borderNode.typeName).toLowerCase() === 'item'
            );
        if (shouldShowTypeName) {
            label = `${label} : ${borderNode.typeName}`;
        }

        const borderCell = graph.insertVertex(
            parentCell,
            borderNode.id,
            label,
            relativeX,
            relativeY,
            size,
            size,
            styleParts.join(';'),
        );

        const geo = borderCell.getGeometry();
        if (geo) {
            geo.relative = true;
            if (mxPt) {
                geo.offset = new mxPt(geoOffsetX, geoOffsetY);
            } else {
                geo.offset = { x: geoOffsetX, y: geoOffsetY };
            }
        }

        borderCell._nodeData = borderNode;
        borderCell._isBorderNode = true;
        return borderCell;
    }

    ns.MxGraph.factory.createEdge = createEdge;
    ns.MxGraph.factory.createBorderNode = createBorderNode;
    ns.MxGraph.factory.distributeOverlappingEdges = distributeOverlappingEdges;
    ns.MxGraph.factory.rerouteAllEdges = rerouteAllEdges;
    ns.MxGraph.factory.isHierarchicalEdgeKind = isHierarchicalEdgeKind;
})();
