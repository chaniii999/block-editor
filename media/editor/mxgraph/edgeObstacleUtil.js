/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 직교 경로(H/V) — 노드 bbox 이격·교차 최소 (README: 엣지-노드 중첩 없음)
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};

    function inflateRect(rect, buffer) {
        const b = Number(buffer) || 0;
        return {
            x: rect.x - b,
            y: rect.y - b,
            w: rect.w + b * 2,
            h: rect.h + b * 2,
        };
    }

    /** 직교 세그먼트만 지원 */
    function segmentIntersectsRect(x1, y1, x2, y2, rect) {
        const min = (a, b) => (a < b ? a : b);
        const max = (a, b) => (a > b ? a : b);
        if (y1 === y2) {
            const y = y1;
            if (y < rect.y || y > rect.y + rect.h) {
                return false;
            }
            const r1 = min(x1, x2);
            const r2 = max(x1, x2);
            return !(r2 < rect.x || r1 > rect.x + rect.w);
        }
        if (x1 === x2) {
            const x = x1;
            if (x < rect.x || x > rect.x + rect.w) {
                return false;
            }
            const r1 = min(y1, y2);
            const r2 = max(y1, y2);
            return !(r2 < rect.y || r1 > rect.y + rect.h);
        }
        return false;
    }

    function dedupePoints(points) {
        if (!points || points.length === 0) {
            return [];
        }
        const out = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const p = points[i];
            const q = out[out.length - 1];
            if (!q || q.x !== p.x || q.y !== p.y) {
                out.push(p);
            }
        }
        return out;
    }

    function countSegmentHits(a, b, obstacles, buffer) {
        let n = 0;
        for (const o of obstacles) {
            const r = inflateRect(o, buffer);
            if (segmentIntersectsRect(a.x, a.y, b.x, b.y, r)) {
                n++;
            }
        }
        return n;
    }

    function countPathHits(path, obstacles, buffer) {
        if (!path || path.length < 2) {
            return 0;
        }
        let total = 0;
        for (let i = 0; i < path.length - 1; i++) {
            total += countSegmentHits(path[i], path[i + 1], obstacles, buffer);
        }
        return total;
    }

    function findFirstHitObstacle(a, b, obstacles, buffer) {
        for (const o of obstacles) {
            const r = inflateRect(o, buffer);
            if (segmentIntersectsRect(a.x, a.y, b.x, b.y, r)) {
                return o;
            }
        }
        return null;
    }

    function detourAroundObstacle(a, b, hit, buffer) {
        const buf = Number(buffer) || 12;
        if (a.y === b.y) {
            const above = hit.y - buf;
            const below = hit.y + hit.h + buf;
            const y =
                Math.abs(a.y - above) <= Math.abs(a.y - below) ? above : below;
            return [
                a,
                { x: a.x, y },
                { x: b.x, y },
                b,
            ];
        }
        if (a.x === b.x) {
            const left = hit.x - buf;
            const right = hit.x + hit.w + buf;
            const x =
                Math.abs(a.x - left) <= Math.abs(a.x - right) ? left : right;
            return [
                a,
                { x, y: a.y },
                { x, y: b.y },
                b,
            ];
        }
        return [a, b];
    }

    function avoidObstacles(path, obstacles, options) {
        const opts = options || {};
        const buffer = Number(opts.buffer) || 12;
        const maxIter = Number(opts.maxIter) || 20;
        const maxPoints = Number(opts.maxPoints) || 20;
        if (!path || path.length < 2 || !obstacles || obstacles.length === 0) {
            return path;
        }

        let current = dedupePoints(path.slice());

        for (let iter = 0; iter < maxIter; iter++) {
            let changed = false;
            const next = [];
            for (let i = 0; i < current.length - 1; i++) {
                const a = current[i];
                const b = current[i + 1];
                const hit = findFirstHitObstacle(a, b, obstacles, buffer);
                if (!hit) {
                    if (
                        next.length === 0 ||
                        next[next.length - 1].x !== a.x ||
                        next[next.length - 1].y !== a.y
                    ) {
                        next.push(a);
                    }
                    continue;
                }
                const detour = detourAroundObstacle(a, b, hit, buffer);
                for (let j = 0; j < detour.length; j++) {
                    const p = detour[j];
                    if (
                        next.length === 0 ||
                        next[next.length - 1].x !== p.x ||
                        next[next.length - 1].y !== p.y
                    ) {
                        next.push(p);
                    }
                }
                changed = true;
            }
            const last = current[current.length - 1];
            if (
                next.length === 0 ||
                next[next.length - 1].x !== last.x ||
                next[next.length - 1].y !== last.y
            ) {
                next.push(last);
            }
            current = dedupePoints(next);
            if (current.length > maxPoints) {
                break;
            }
            if (!changed) {
                break;
            }
        }
        return current;
    }

    /** 수평 세그먼트가 장애물과 겹치지 않도록 Y 한 칸 위/아래로 밀기 */
    function clearHorizontalY(y, xMin, xMax, obstacles, buffer) {
        const a = { x: xMin, y };
        const b = { x: xMax, y };
        if (countSegmentHits(a, b, obstacles, buffer) === 0) {
            return y;
        }
        let yAbove = y;
        let yBelow = y;
        for (const o of obstacles) {
            const r = inflateRect(o, buffer);
            if (!segmentIntersectsRect(xMin, y, xMax, y, r)) {
                continue;
            }
            yAbove = Math.min(yAbove, o.y - buffer);
            yBelow = Math.max(yBelow, o.y + o.h + buffer);
        }
        const hAbove = countSegmentHits(
            { x: xMin, y: yAbove },
            { x: xMax, y: yAbove },
            obstacles,
            buffer,
        );
        const hBelow = countSegmentHits(
            { x: xMin, y: yBelow },
            { x: xMax, y: yBelow },
            obstacles,
            buffer,
        );
        if (hAbove === 0) {
            return yAbove;
        }
        if (hBelow === 0) {
            return yBelow;
        }
        return hAbove <= hBelow ? yAbove : yBelow;
    }

    function clearVerticalX(x, yMin, yMax, obstacles, buffer) {
        const a = { x, y: yMin };
        const b = { x, y: yMax };
        if (countSegmentHits(a, b, obstacles, buffer) === 0) {
            return x;
        }
        let xLeft = x;
        let xRight = x;
        for (const o of obstacles) {
            const r = inflateRect(o, buffer);
            if (!segmentIntersectsRect(x, yMin, x, yMax, r)) {
                continue;
            }
            xLeft = Math.min(xLeft, o.x - buffer);
            xRight = Math.max(xRight, o.x + o.w + buffer);
        }
        const hLeft = countSegmentHits(
            { x: xLeft, y: yMin },
            { x: xLeft, y: yMax },
            obstacles,
            buffer,
        );
        const hRight = countSegmentHits(
            { x: xRight, y: yMin },
            { x: xRight, y: yMax },
            obstacles,
            buffer,
        );
        if (hLeft === 0) {
            return xLeft;
        }
        if (hRight === 0) {
            return xRight;
        }
        return hLeft <= hRight ? xLeft : xRight;
    }

    /**
     * 상속(N→S): 가로 통로 Y는 부모 하단~자식 상단 사이만 (위로 튀어 올라가지 않음)
     */
    function computeHorizontalChannelYBand(
        exitSide,
        entrySide,
        srcB,
        tgtB,
        approachPad,
    ) {
        const pad = Number(approachPad) || 16;
        const ALIGN_EPS = 2;
        if (exitSide === 'N' && entrySide === 'S') {
            const pb = tgtB.y + tgtB.h;
            const ct = srcB.y;
            if (ct > pb + ALIGN_EPS) {
                return {
                    minY: pb + pad,
                    maxY: ct - pad,
                    prefer: (pb + ct) / 2,
                };
            }
            return {
                minY: pb + pad,
                maxY: pb + pad + 120,
                prefer: pb + pad,
            };
        }
        if (exitSide === 'S' && entrySide === 'N') {
            const pt = tgtB.y;
            const cb = srcB.y + srcB.h;
            if (pt > cb + ALIGN_EPS) {
                return {
                    minY: cb + pad,
                    maxY: pt - pad,
                    prefer: (cb + pt) / 2,
                };
            }
            return {
                minY: pt - 120,
                maxY: pt - pad,
                prefer: pt - pad,
            };
        }
        return null;
    }

    function clampToBand(v, band) {
        if (!band || !Number.isFinite(v)) {
            return v;
        }
        return Math.max(band.minY, Math.min(band.maxY, v));
    }

    /**
     * spec / 직교 채널 Y 후보 (갭 중앙·접근 패드 — 통로 밴드 밖 후보 제외)
     */
    function verticalChannelYCandidates(
        exitSide,
        entrySide,
        srcB,
        tgtB,
        approachPad,
    ) {
        const pad = Number(approachPad) || 16;
        const ALIGN_EPS = 2;
        const out = [];

        function add(y) {
            if (Number.isFinite(y)) {
                out.push(y);
            }
        }

        if (exitSide === 'N' && entrySide === 'S') {
            const pb = tgtB.y + tgtB.h;
            const ct = srcB.y;
            if (ct > pb + ALIGN_EPS) {
                add((pb + ct) / 2);
                add(pb + pad);
                add(ct - pad);
            } else {
                add(pb + pad);
            }
        } else if (exitSide === 'S' && entrySide === 'N') {
            const pt = tgtB.y;
            const cb = srcB.y + srcB.h;
            if (pt > cb + ALIGN_EPS) {
                add((cb + pt) / 2);
            }
            add(pt - pad);
            add(cb + pad);
        } else {
            const pb = tgtB.y + tgtB.h;
            const ct = srcB.y;
            if (ct > pb + ALIGN_EPS) {
                add((pb + ct) / 2);
            }
            add(pb + pad);
            add(ct - pad);
        }
        return out;
    }

    function horizontalChannelXCandidates(
        exitSide,
        entrySide,
        srcB,
        tgtB,
        approachPad,
    ) {
        const pad = Number(approachPad) || 16;
        const ALIGN_EPS = 2;
        const out = [];

        function add(x) {
            if (Number.isFinite(x)) {
                out.push(x);
            }
        }

        if (exitSide === 'W' && entrySide === 'E') {
            const pr = tgtB.x + tgtB.w;
            const cl = srcB.x;
            if (cl > pr + ALIGN_EPS) {
                add((pr + cl) / 2);
            }
            add(pr + pad);
            add(cl - pad);
        } else if (exitSide === 'E' && entrySide === 'W') {
            const pl = tgtB.x;
            const cr = srcB.x + srcB.w;
            if (pl > cr + ALIGN_EPS) {
                add((cr + pl) / 2);
            }
            add(pl - pad);
            add(cr + pad);
        } else {
            add(tgtB.x + tgtB.w / 2);
            add(srcB.x + srcB.w / 2);
        }
        return out;
    }

    /**
     * 가로 통로 Y — 장애물 교차 0 우선, 없으면 최소 교차
     */
    function pickHorizontalChannelY(
        candidates,
        x1,
        x2,
        obstacles,
        buffer,
        preferY,
        yBand,
    ) {
        const prefer = Number.isFinite(preferY) ? preferY : candidates[0];
        if (!obstacles || obstacles.length === 0) {
            return clampToBand(prefer, yBand);
        }
        const buf = Number(buffer) || 20;
        const xMin = Math.min(x1, x2);
        const xMax = Math.max(x1, x2);

        function bandPenalty(y) {
            if (!yBand || !Number.isFinite(y)) {
                return 0;
            }
            if (y < yBand.minY) {
                return (yBand.minY - y) * 8000;
            }
            if (y > yBand.maxY) {
                return (y - yBand.maxY) * 8000;
            }
            return 0;
        }

        function collectExpanded(allowOutsideBand) {
            const expanded = new Set();
            for (const y0 of candidates || []) {
                expanded.add(y0);
                const cleared = clearHorizontalY(
                    y0,
                    xMin,
                    xMax,
                    obstacles,
                    buf,
                );
                expanded.add(cleared);
            }
            for (const o of obstacles) {
                const r = inflateRect(o, buf);
                if (r.x + r.w < xMin || r.x > xMax) {
                    continue;
                }
                const above = r.y - buf - 1;
                const below = r.y + r.h + buf + 1;
                if (
                    allowOutsideBand ||
                    !yBand ||
                    (above >= yBand.minY && above <= yBand.maxY)
                ) {
                    expanded.add(above);
                }
                if (
                    allowOutsideBand ||
                    !yBand ||
                    (below >= yBand.minY && below <= yBand.maxY)
                ) {
                    expanded.add(below);
                }
            }
            if (yBand) {
                expanded.add(yBand.minY);
                expanded.add(yBand.maxY);
                expanded.add(yBand.prefer);
            }
            return expanded;
        }

        function pickFrom(expanded) {
            let bestY = prefer;
            let bestScore = Infinity;
            for (const y of expanded) {
                if (!Number.isFinite(y)) {
                    continue;
                }
                const hits = countSegmentHits(
                    { x: xMin, y },
                    { x: xMax, y },
                    obstacles,
                    buf,
                );
                const dist = Number.isFinite(preferY)
                    ? Math.abs(y - preferY)
                    : 0;
                const score = hits * 100000 + bandPenalty(y) + dist;
                if (score < bestScore) {
                    bestScore = score;
                    bestY = y;
                }
            }
            return clampToBand(bestY, yBand);
        }

        let best = pickFrom(collectExpanded(false));
        const hitsInBand = countSegmentHits(
            { x: xMin, y: best },
            { x: xMax, y: best },
            obstacles,
            buf,
        );
        if (hitsInBand > 0) {
            best = pickFrom(collectExpanded(true));
        }
        return best;
    }

    function pickVerticalChannelX(
        candidates,
        y1,
        y2,
        obstacles,
        buffer,
        preferX,
    ) {
        if (!obstacles || obstacles.length === 0) {
            return Number.isFinite(preferX) ? preferX : candidates[0];
        }
        const buf = Number(buffer) || 20;
        const yMin = Math.min(y1, y2);
        const yMax = Math.max(y1, y2);
        const expanded = new Set();

        for (const x0 of candidates || []) {
            expanded.add(x0);
            expanded.add(clearVerticalX(x0, yMin, yMax, obstacles, buf));
        }
        for (const o of obstacles) {
            const r = inflateRect(o, buf);
            if (r.y + r.h < yMin || r.y > yMax) {
                continue;
            }
            expanded.add(r.x - buf - 1);
            expanded.add(r.x + r.w + buf + 1);
        }

        let bestX = Number.isFinite(preferX) ? preferX : candidates[0];
        let bestScore = Infinity;
        for (const x of expanded) {
            if (!Number.isFinite(x)) {
                continue;
            }
            const hits = countSegmentHits(
                { x, y: yMin },
                { x, y: yMax },
                obstacles,
                buf,
            );
            const dist = Number.isFinite(preferX)
                ? Math.abs(x - preferX)
                : 0;
            const score = hits * 100000 + dist;
            if (score < bestScore) {
                bestScore = score;
                bestX = x;
            }
        }
        return bestX;
    }

    /**
     * 노드 관통 최소화 우선 — 교차 0 될 때까지 우회, 꺾임은 maxExtraBends까지 허용
     */
    function refineOrthogonalPath(path, obstacles, options) {
        if (!path || path.length < 2) {
            return path;
        }
        const opts = options || {};
        let buffer = Number(opts.buffer) || 20;
        const maxExtra = Number(opts.maxExtraBends) ?? 8;
        const baseLen = path.length;

        let best = dedupePoints(path.slice());
        let bestHits = countPathHits(best, obstacles, buffer);

        if (bestHits === 0) {
            return best;
        }

        const tryRefine = (buf, maxIter, maxPts) => {
            const refined = avoidObstacles(best, obstacles, {
                buffer: buf,
                maxIter: maxIter || 24,
                maxPoints: maxPts || 22,
            });
            const hits = countPathHits(refined, obstacles, buf);
            if (
                hits < bestHits &&
                refined.length <= baseLen + maxExtra
            ) {
                best = dedupePoints(refined);
                bestHits = hits;
            }
        };

        tryRefine(buffer, opts.maxIter, opts.maxPoints);
        if (bestHits > 0) {
            tryRefine(buffer + 8, 28, 24);
        }
        if (bestHits > 0) {
            tryRefine(buffer + 16, 32, 26);
        }

        return best;
    }

    /** @deprecated — refineOrthogonalPath 사용 */
    function maybeRefinePath(path, obstacles, options) {
        return refineOrthogonalPath(path, obstacles, options);
    }

    function collectVertexObstacles(graph, excludeCellIds, getAbsBounds) {
        const obstacles = [];
        if (!graph || typeof getAbsBounds !== 'function') {
            return obstacles;
        }
        const exclude = new Set(
            (excludeCellIds || []).map((id) => String(id)),
        );
        const model = graph.getModel();
        const seen = new Set();

        function walk(cell) {
            if (!cell) {
                return;
            }
            if (model.isVertex(cell) && cell._nodeData) {
                if (
                    cell._isCompartmentItem ||
                    cell._isBorderNode ||
                    cell._isInteriorDecor ||
                    cell._isFeatureTypingFooter
                ) {
                    /* skip */
                } else {
                    const nid = String(
                        cell._nodeData.id || cell.getId?.() || '',
                    );
                    if (nid && !exclude.has(nid) && !seen.has(nid)) {
                        const b = getAbsBounds(cell);
                        if (b && b.w > 0 && b.h > 0) {
                            obstacles.push(b);
                            seen.add(nid);
                        }
                    }
                }
            }
            const n = model.getChildCount(cell);
            for (let i = 0; i < n; i++) {
                walk(model.getChildAt(cell, i));
            }
        }

        walk(model.getRoot());
        return obstacles;
    }

    ns.MxGraph.edgeObstacle = {
        inflateRect,
        segmentIntersectsRect,
        countPathHits,
        avoidObstacles,
        refineOrthogonalPath,
        maybeRefinePath,
        computeHorizontalChannelYBand,
        verticalChannelYCandidates,
        horizontalChannelXCandidates,
        pickHorizontalChannelY,
        pickVerticalChannelX,
        collectVertexObstacles,
    };
})();
