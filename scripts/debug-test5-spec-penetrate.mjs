'use strict';

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { buildBlockModel } from '../src/panel/BlockModelBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadModules() {
    const ctx = {
        window: {
            SELAB: {
                Editor: { config: {}, layout: {}, MxGraph: {} },
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
    vm.runInNewContext(
        fs.readFileSync(
            path.join(root, 'media/editor/mxgraph/edgeObstacleUtil.js'),
            'utf8',
        ),
        ctx,
    );
    vm.runInNewContext(
        fs.readFileSync(
            path.join(root, 'media/editor/mxgraph/specEdgeRouter.js'),
            'utf8',
        ),
        ctx,
    );
    return ctx.window.SELAB;
}

function box(el) {
    return {
        x: Number(el.x) || 0,
        y: Number(el.y) || 0,
        w: Number(el.width) || 120,
        h: Number(el.height) || 60,
    };
}

const selab = loadModules();
const bdd = selab.Editor.layout.bdd;
const util = selab.MxGraph.edgeObstacle;

const raw = JSON.parse(
    fs.readFileSync(path.join(root, 'tests/test-5.json'), 'utf8'),
);
const model = buildBlockModel(raw);
const diagram = {
    elements: model.nodes.map((n) => ({ ...n })),
    connections: model.edges.map((e) => ({ ...e })),
};

for (const el of diagram.elements) {
    el.x = Number(el.x) || 100;
    el.y = Number(el.y) || 100;
    el.width = Number(el.width) || 120;
    el.height = Number(el.height) || 56;
}
bdd.applyPostLayout(diagram, {});

const byId = new Map(diagram.elements.map((e) => [e.id, e]));
const uartSig = byId.get('UARTSignal');
const uartBus = byId.get('UARTBus');
const digital = byId.get('DigitalSignal');
const receiver = byId.get('Receiver');

console.log('=== bbox (bdd 후) ===');
console.log('UARTSignal', box(uartSig));
console.log('UARTBus   ', box(uartBus));
console.log('Digital   ', box(digital));
console.log('Receiver  ', box(receiver));

const buf = 20;
function collectObstaclesLikeRouter(sourceId, targetId) {
    const exclude = new Set([sourceId, targetId]);
    let p = byId.get(sourceId)?.parent;
    while (p) {
        exclude.add(p);
        p = byId.get(p)?.parent;
    }
    const obs = [];
    for (const el of diagram.elements) {
        if (!el.id || exclude.has(el.id) || el.hidden) continue;
        obs.push(box(el));
    }
    return obs;
}

const obstaclesRouter = collectObstaclesLikeRouter('UARTSignal', 'DigitalSignal');
const obstaclesAll = [];
const excludeEndpoints = new Set(['UARTSignal', 'DigitalSignal']);
for (const el of diagram.elements) {
    if (!el.id || excludeEndpoints.has(el.id) || el.hidden) continue;
    obstaclesAll.push(box(el));
}

const srcB = box(uartSig);
const tgtB = box(digital);
const exitPt = { x: srcB.x + srcB.w * 0.75, y: srcB.y };
const entryPt = { x: tgtB.x + tgtB.w * 0.8, y: tgtB.y + tgtB.h };
const yCh = (srcB.y + tgtB.y + tgtB.h) / 2;

const approachPad = 16;
const yBand = util.computeHorizontalChannelYBand(
    'N',
    'S',
    srcB,
    tgtB,
    approachPad,
);
const header = { x: uartBus.x, y: uartBus.y, w: uartBus.width, h: 43 };
let minY = yBand.minY;
let maxY = Math.min(yBand.maxY, srcB.y - approachPad);
const headerFloor = header.y + header.h + approachPad;
if (headerFloor <= srcB.y - approachPad + 2) {
    minY = Math.max(minY, headerFloor);
}
if (minY > maxY + 2) {
    minY = yBand.minY;
}
const yBandAdj = {
    minY,
    maxY,
    prefer: Math.min(Math.max(yBand.prefer, minY), maxY),
};
const defaultY = (srcB.y + tgtB.y + tgtB.h) / 2;
const yChPick = util.pickHorizontalChannelY(
    util.verticalChannelYCandidates('N', 'S', srcB, tgtB, approachPad),
    exitPt.x,
    entryPt.x,
    obstaclesRouter,
    buf + 8,
    defaultY,
    yBandAdj,
    true,
);
const pathOpts = {
    cornerClearance: 8,
    approachPad,
    yBand: yBandAdj,
    preferLowerInBand: true,
};

const pathLegacy = util.buildSpecVerticalNSPath(
    exitPt,
    entryPt,
    obstaclesAll,
    buf,
    yCh,
    pathOpts,
);
const pathRouter = util.buildSpecVerticalNSPath(
    exitPt,
    entryPt,
    obstaclesRouter,
    buf,
    yChPick,
    pathOpts,
);
console.log('yBandAdj', yBandAdj, 'yCh', yChPick);

function hitsReceiver(path, rec) {
    return util.countPathHits(path, [rec], buf);
}

const recB = box(receiver);
console.log('\n=== UARTSignal→DigitalSignal (spec) ===');
console.log('exit', exitPt, 'entry', entryPt);
console.log('\n구버전(종단만 제외, UARTBus=장애물):');
console.log(' path', pathLegacy);
console.log(' Receiver hits', hitsReceiver(pathLegacy, recB));
console.log('\n수정(소스 조상 UARTBus 제외):');
console.log(' path', pathRouter);
console.log(' Receiver hits', hitsReceiver(pathRouter, recB));

const recBetween = { x: 1550, y: 300, w: 184, h: 120 };
const pathLegacyMid = util.buildSpecVerticalNSPath(
    exitPt,
    entryPt,
    [...obstaclesAll, recBetween],
    buf,
    380,
    pathOpts,
);
const pathRouterMid = util.buildSpecVerticalNSPath(
    exitPt,
    entryPt,
    [...obstaclesRouter, recBetween],
    buf,
    380,
    pathOpts,
);
console.log('\n=== Receiver를 중간에 끼운 가상 레이아웃 (y≈300~420) ===');
console.log(' legacy hits', hitsReceiver(pathLegacyMid, recBetween));
console.log(' router hits', hitsReceiver(pathRouterMid, recBetween));
console.log(' legacy', pathLegacyMid);
console.log(' router', pathRouterMid);
