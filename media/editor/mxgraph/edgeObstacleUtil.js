/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 직교 경로(H/V 세그먼트)와 노드 bbox 교차 검사·보수적 우회
 * README: 엣지-노드 중첩 없음 — 기존 SVG renderUtils 로직을 mx 경로에 안전 적용
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

    /** 한 세그먼트를 장애물 한 면을 따라 우회 (직교 유지) */
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

    /**
     * @param {Array<{x:number,y:number}>} path
     * @param {Array<{x,y,w,h}>} obstacles
     * @param {{ buffer?: number, maxIter?: number, maxPoints?: number }} options
     */
    function avoidObstacles(path, obstacles, options) {
        const opts = options || {};
        const buffer = Number(opts.buffer) || 12;
        const maxIter = Number(opts.maxIter) || 12;
        const maxPoints = Number(opts.maxPoints) || 16;
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

    /**
     * 교차가 줄어들고 꺾임이 과도하지 않을 때만 우회 경로 채택
     */
    function maybeRefinePath(path, obstacles, options) {
        if (!path || path.length < 2) {
            return path;
        }
        const opts = options || {};
        const buffer = Number(opts.buffer) || 12;
        const maxExtra = Number(opts.maxExtraBends) || 4;
        const before = countPathHits(path, obstacles, buffer);
        if (before === 0) {
            return path;
        }
        const refined = avoidObstacles(path, obstacles, opts);
        const after = countPathHits(refined, obstacles, buffer);
        if (after >= before) {
            return path;
        }
        if (refined.length > path.length + maxExtra) {
            return path;
        }
        return dedupePoints(refined);
    }

    /**
     * 그래프 vertex 절대 bbox 수집 (src/tgt·decor 제외)
     * @param {mxGraph} graph
     * @param {string[]} excludeCellIds
     * @param {(cell: mxCell) => {x,y,w,h}|null} getAbsBounds
     */
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
        maybeRefinePath,
        collectVertexObstacles,
    };
})();
