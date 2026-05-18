/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026)
 * README 직교 품질 — mxGraph 엣지 스타일·waypoint 단일 정책
 * (ELK edgeRouting ORTHOGONAL 은 ELK 그래프 엣지용; 화면 선은 여기서 강제)
 ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};

    const ALIGN_EPS = 2;

    const mxPt =
        typeof mxPoint !== 'undefined'
            ? mxPoint
            : typeof mx !== 'undefined' && mx.mxPoint
              ? mx.mxPoint
              : null;

    function cfg() {
        return ns.Editor?.config?.displaySettings?.edgeRouting || {};
    }

    /** false 로만 끔 — 기본 항상 직교 */
    function isForceOrthogonal() {
        return cfg().forceOrthogonal !== false;
    }

    function makePoint(x, y) {
        if (mxPt) return new mxPt(x, y);
        return { x, y };
    }

    function near(a, b) {
        return Math.abs(a - b) < ALIGN_EPS;
    }

    function stripRoutingStyle(st) {
        let s = st || '';
        s = s.replace(/edgeStyle=[^;]*/g, '');
        s = s.replace(/noEdgeStyle=[^;]*/g, '');
        s = s.replace(/rounded=\d+/g, '');
        s = s.replace(/orthogonalLoop=\d+/g, '');
        s = s.replace(/jettySize=[^;]*/g, '');
        if (s && !s.endsWith(';')) s += ';';
        return s;
    }

    /**
     * @param {'auto'|'segment'} mode
     *   auto — orthogonalEdgeStyle (경로 없을 때 mx 자동 직교)
     *   segment — segmentEdgeStyle + noEdgeStyle (명시 geometry.points)
     */
    function ensureStyle(style, mode) {
        if (!isForceOrthogonal()) return style || '';
        let st = stripRoutingStyle(style);
        if (mode === 'segment') {
            st +=
                'edgeStyle=segmentEdgeStyle;noEdgeStyle=1;rounded=0;orthogonalLoop=0;jettySize=0';
        } else {
            st +=
                'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto';
        }
        return st;
    }

    function baseEdgeStyleTokens() {
        if (!isForceOrthogonal()) {
            return [
                'edgeStyle=orthogonalEdgeStyle',
                'rounded=1',
                'orthogonalLoop=1',
                'jettySize=auto',
            ];
        }
        return [
            'edgeStyle=orthogonalEdgeStyle',
            'rounded=0',
            'orthogonalLoop=1',
            'jettySize=auto',
        ];
    }

    function inferOrthogonalCorner(start, end, exitSide) {
        if (near(start.x, end.x) || near(start.y, end.y)) return null;
        if (exitSide === 'N' || exitSide === 'S') {
            return { x: start.x, y: end.y };
        }
        if (exitSide === 'E' || exitSide === 'W') {
            return { x: end.x, y: start.y };
        }
        return { x: end.x, y: start.y };
    }

    /** geometry.points: 엣지 부모 원점 기준 (소스 셀 기준 아님) */
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

    /**
     * 절대 경로 → 상대 waypoint (대각선 방지: 2점만이면 L자 꺾임 삽입)
     */
    function pathToRelativeWaypoints(pathAbs, ptOrigin, exitSide) {
        if (!pathAbs || pathAbs.length < 2) return [];
        const start = pathAbs[0];
        const end = pathAbs[pathAbs.length - 1];
        let mids = pathAbs.slice(1, -1);
        if (isForceOrthogonal() && mids.length === 0) {
            const corner = inferOrthogonalCorner(start, end, exitSide);
            if (corner) mids = [corner];
        }
        return mids.map((p) =>
            makePoint(p.x - ptOrigin.x, p.y - ptOrigin.y),
        );
    }

    function applyModelStyle(model, edgeCell, mode) {
        const st = ensureStyle(model.getStyle(edgeCell) || '', mode);
        model.setStyle(edgeCell, st);
    }

    ns.MxGraph.edgeOrthogonal = {
        isForceOrthogonal,
        ensureStyle,
        baseEdgeStyleTokens,
        stripRoutingStyle,
        inferOrthogonalCorner,
        edgeControlOrigin,
        pathToRelativeWaypoints,
        applyModelStyle,
        near,
        makePoint,
    };
})();
