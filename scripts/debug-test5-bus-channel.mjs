'use strict';

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { buildBlockModel } from '../src/panel/BlockModelBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function createCtx() {
    return {
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
                                containmentRowGap: 28,
                            },
                            elk: {
                                containerPadding: {
                                    top: 48,
                                    left: 32,
                                    right: 32,
                                    bottom: 28,
                                },
                                nodeNodeBetweenLayers: 96,
                                nodeNodeSpacing: 88,
                            },
                        },
                    },
                    layout: {},
                },
            },
            ELK: null,
        },
        console,
    };
}

function loadScript(ctx, rel) {
    const code = fs.readFileSync(path.join(root, rel), 'utf8');
    vm.runInNewContext(code, ctx);
}

function overlap(a, b) {
    const G = 4;
    return (
        a.x < b.x + b.w + G &&
        a.x + a.w + G > b.x &&
        a.y < b.y + b.h + G &&
        a.y + a.h + G > b.y
    );
}

function bbox(el) {
    return {
        id: el.id,
        x: Number(el.x) || 0,
        y: Number(el.y) || 0,
        w: Number(el.width) || 120,
        h: Number(el.height) || 60,
        parent: el.parent || null,
        rx: el.relativeX,
        ry: el.relativeY,
    };
}

async function main() {
    const raw = JSON.parse(
        fs.readFileSync(path.join(root, 'tests/test-5.json'), 'utf8'),
    );
    const model = buildBlockModel(raw);
    const diagramData = {
        elements: model.nodes.map((n) => ({ ...n })),
        connections: model.edges.map((e) => ({ ...e })),
    };

    const ch = diagramData.elements.find((e) => e.id === 'Channel');
    const bus = diagramData.elements.find((e) => e.id === 'Bus');
    console.log('[model] Channel.parent=', ch?.parent, 'Bus.parent=', bus?.parent);

    const ctx = createCtx();
    const ELK = (await import('elkjs/lib/main.js')).default;
    ctx.window.ELK = ELK;
    loadScript(ctx, 'media/editor/layout/bddLayout.js');
    loadScript(ctx, 'media/editor/layout/elkLayout.js');
    const applyElk = ctx.window.SELAB.applyElkLayout;
    if (typeof applyElk !== 'function') {
        console.error('applyElkLayout missing');
        process.exit(1);
    }

    await applyElk(diagramData);

    const busA = bbox(bus);
    const chA = bbox(ch);
    console.log('[after elk+bdd] Bus', busA);
    console.log('[after elk+bdd] Channel', chA);

    if (ch?.parent === 'Bus') {
        const rel = {
            x: chA.x - busA.x,
            y: chA.y - busA.y,
            w: chA.w,
            h: chA.h,
        };
        const margin = 8;
        const inside =
            rel.y >= margin &&
            rel.x >= margin &&
            rel.y + rel.h <= busA.h - margin &&
            rel.x + rel.w <= busA.w - margin;
        const headerClear = rel.y >= 40;
        console.log('[Channel in Bus]', rel, 'inside=', inside, 'belowHeader=', headerClear);
        console.log('[Bus encloses Channel]', inside && headerClear ? 'OK' : 'FAIL');
        process.exit(inside && headerClear ? 0 : 1);
    }
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
