'use strict';

/**
 * test-2 Ellipse→Drawable spec 경로: 앵커 분산·분기·장애물 hit 진단
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { buildBlockModel } from '../src/panel/BlockModelBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const ALIGN_EPS = 2;

function loadEdgeObstacleUtil() {
    const ctx = {
        window: { SELAB: { MxGraph: {} } },
        console,
    };
    vm.runInNewContext(
        fs.readFileSync(
            path.join(root, 'media/editor/mxgraph/edgeObstacleUtil.js'),
            'utf8',
        ),
        ctx,
    );
    return ctx.window.SELAB;
}

function loadBdd() {
    const ctx = {
        window: {
            SELAB: {
                Editor: {
                    config: {
                        displaySettings: {
                            bdd: {
                                specLayerGap: 120,
                                specSiblingGap: 120,
                                specCorridorGap: 44,
                                diagramMargin: 56,
                                siblingOverlapGap: 32,
                            },
                        },
                    },
                    layout: {},
                },
            },
        },
        console,
    };
    vm.runInNewContext(
        fs.readFileSync(
            path.join(root, 'media/editor/config/displaySettings.js'),
            'utf8',
        ),
        ctx,
    );
    vm.runInNewContext(
        fs.readFileSync(path.join(root, 'media/editor/layout/bddLayout.js'), 'utf8'),
        ctx,
    );
    return ctx.window.SELAB.Editor.layout.bdd;
}

function near(a, b) {
    return Math.abs(a - b) < ALIGN_EPS;
}

function pointOnSide(bounds, side, frac) {
    const f = frac;
    switch (side) {
        case 'N':
            return { x: bounds.x + bounds.w * f, y: bounds.y };
        case 'S':
            return { x: bounds.x + bounds.w * f, y: bounds.y + bounds.h };
        default:
            return { x: bounds.x + bounds.w * 0.5, y: bounds.y + bounds.h * 0.5 };
    }
}

function box(el) {
    return {
        x: Number(el.x) || 0,
        y: Number(el.y) || 0,
        w: Number(el.width) || 120,
        h: Number(el.height) || 60,
    };
}

const raw = JSON.parse(
    fs.readFileSync(path.join(root, 'tests/test-2.json'), 'utf8'),
);
const model = buildBlockModel(raw);
const diagram = {
    elements: model.nodes.map((n) => ({ ...n })),
    connections: model.edges.map((e) => ({ ...e })),
};

// ELK 없이 spec 후처리만: 대략적 초기 배치 (부모 위·자식 아래)
const byId = new Map(diagram.elements.map((e) => [e.id, e]));
const drawable = byId.get('Drawable');
const shape = byId.get('Shape');
const ellipse = byId.get('Ellipse');
const circle = byId.get('Circle');
const polygon = byId.get('Polygon');

if (drawable) {
    drawable.x = 400;
    drawable.y = 40;
    drawable.width = 140;
    drawable.height = 72;
}
if (shape) {
    shape.x = 400;
    shape.y = 200;
    shape.width = 140;
    shape.height = 90;
}
if (polygon) {
    polygon.x = 200;
    polygon.y = 320;
    polygon.width = 120;
    polygon.height = 56;
}
if (circle) {
    circle.x = 360;
    circle.y = 320;
    circle.width = 120;
    circle.height = 56;
}
if (ellipse) {
    ellipse.x = 520;
    ellipse.y = 320;
    ellipse.width = 120;
    ellipse.height = 56;
}

const bdd = loadBdd();
bdd.applyPostLayout(diagram, {});

const selab = loadEdgeObstacleUtil();
const util = selab.MxGraph.edgeObstacle;
const buf = 20;

const obstacles = [];
const exclude = new Set(['Ellipse', 'Drawable']);
for (const el of diagram.elements) {
    if (!el.id || exclude.has(el.id) || el.hidden) continue;
    const b = box(el);
    if (b.w > 0 && b.h > 0) obstacles.push(b);
}

const srcB = box(ellipse);
const tgtB = box(drawable);
const shapeB = box(shape);

console.log('\n=== test-2 bbox (bdd 후처리 후) ===');
console.log('Drawable', tgtB);
console.log('Shape   ', shapeB);
console.log('Ellipse ', srcB);

// spreadSpecEntriesOnTarget 시뮬: Drawable 타깃 spec 3개
const toDrawable = ['Polygon', 'Circle', 'Ellipse'];
toDrawable.sort((a, b) => {
    const ba = box(byId.get(a));
    const bb = box(byId.get(b));
    return ba.x + ba.w / 2 - (bb.x + bb.w / 2);
});
const n = toDrawable.length;
const entryFracs = {};
for (let i = 0; i < n; i++) {
    entryFracs[toDrawable[i]] = (i + 1) / (n + 1);
}

// spreadSpecExitsOnSource: Ellipse 출구 2개 (Shape, Drawable)
const fromEllipse = ['Shape', 'Drawable'];
fromEllipse.sort((a, b) => {
    const ba = box(byId.get(a));
    const bb = box(byId.get(b));
    return ba.x + ba.w / 2 - (bb.x + bb.w / 2);
});
const exitFracs = {};
for (let i = 0; i < fromEllipse.length; i++) {
    exitFracs[fromEllipse[i]] = (i + 1) / (fromEllipse.length + 1);
}

const exitFrac = exitFracs.Drawable;
const entryFrac = entryFracs.Ellipse;
const exitPt = pointOnSide(srcB, 'N', exitFrac);
const entryPt = pointOnSide(tgtB, 'S', entryFrac);

console.log('\n=== Ellipse→Drawable 앵커 (분산 후) ===');
console.log('exitFrac', exitFrac, 'entryFrac', entryFrac);
console.log('exitPt', exitPt);
console.log('entryPt', entryPt);
console.log('sameX column?', near(exitPt.x, entryPt.x), '|dx|=', Math.abs(exitPt.x - entryPt.x));

const yMin = Math.min(exitPt.y, entryPt.y);
const yMax = Math.max(exitPt.y, entryPt.y);
const path2 = [exitPt, entryPt];
const corridorHits = util.countPathHits(
    [
        { x: exitPt.x, y: yMin },
        { x: exitPt.x, y: yMax },
    ],
    obstacles,
    buf,
);
const straightHits = util.countPathHits(path2, obstacles, buf);

const defaultY = (srcB.y + tgtB.y + tgtB.h) / 2;
const yCh = util.pickHorizontalChannelY
    ? util.pickHorizontalChannelY(
          util.verticalChannelYCandidates('N', 'S', srcB, tgtB, 16),
          exitPt.x,
          entryPt.x,
          obstacles,
          buf,
          defaultY,
          util.computeHorizontalChannelYBand('N', 'S', srcB, tgtB, 16),
      )
    : defaultY;

const path4 = [
    exitPt,
    { x: exitPt.x, y: yCh },
    { x: entryPt.x, y: yCh },
    entryPt,
];
const hits4 = util.countPathHits(path4, obstacles, buf);
const hits2 = util.countPathHits(path2, obstacles, buf);

console.log('\n=== 장애물 (Shape 포함?) ===');
console.log('obstacle count', obstacles.length, 'Shape in list', obstacles.some((o) => o.x === shapeB.x && o.y === shapeB.y));

console.log('\n=== hit 검사 ===');
console.log('corridorBlocked @ exit.x', corridorHits > 0, 'hits', corridorHits);
console.log('straight 2pt hits', straightHits);
console.log('4pt path hits', hits4, 'yCh=', yCh);
console.log('2pt path hits', hits2);

function hitsShape(path, shapeBox) {
    const shapeObs = [shapeBox];
    return util.countPathHits(path, shapeObs, buf);
}

if (util.buildSpecVerticalNSPath) {
    const built = util.buildSpecVerticalNSPath(
        exitPt,
        entryPt,
        obstacles,
        buf,
        yCh,
    );
    const hitsB = util.countPathHits(built, obstacles, buf);
    const hitsShapeOnly = hitsShape(built, shapeB);
    console.log('\n=== buildSpecVerticalNSPath ===');
    console.log('points', built.length, built);
    console.log('hits(all)', hitsB, 'hits(Shape only)', hitsShapeOnly);
}

const trunkX = util.pickVerticalChannelX(
    [exitPt.x, entryPt.x],
    yMin,
    yMax,
    obstacles,
    buf,
    exitPt.x,
);
console.log('\n=== pickVerticalChannelX ===');
console.log('trunkX', trunkX, 'vs exit.x', exitPt.x, 'vs entry.x', entryPt.x);

if (util.refineOrthogonalPath) {
    const refined = util.refineOrthogonalPath(path4, obstacles, { buffer: buf });
    const hitsR = util.countPathHits(refined, obstacles, buf);
    console.log('\n=== refineOrthogonalPath(4pt) ===');
    console.log('points', refined.length, refined);
    console.log('hits after', hitsR);
}

console.log('\n=== 수직 스택 레이아웃 (스크린샷 유사) ===');
const stackExit = { x: 548, y: 350 };
const stackEntry = { x: 548, y: 122 };
const stackYch = 280;
const stackObs = [shapeB];
const stack4 = [
    stackExit,
    { x: stackExit.x, y: stackYch },
    { x: stackEntry.x, y: stackYch },
    stackEntry,
];
const stackBuilt = util.buildSpecVerticalNSPath(
    stackExit,
    stackEntry,
    [shapeB],
    buf,
    stackYch,
);
console.log('4pt hits Shape', hitsShape(stack4, shapeB));
console.log('NS  hits Shape', hitsShape(stackBuilt, shapeB), stackBuilt);

console.log('\n=== 결론 힌트 ===');
if (!near(exitPt.x, entryPt.x)) {
    console.log(
        '→ near(sameX)=FALSE: 이전 패치(buildVerticalAligned) 분기 미진입. 실제 경로는 4pt [exit,(exit.x,yCh),(entry.x,yCh),entry]',
    );
}
if (hits4 > 0) {
    console.log('→ 4pt 경로는 Shape hit 있음. refineOrthogonalPath가 routeSpecEdge에서 돌아야 함.');
} else {
    console.log('→ 4pt 경로 hit=0: refine 미호출 가능 — 세그먼트 float/좌표 문제 또는 yCh가 Shape 밖');
}
