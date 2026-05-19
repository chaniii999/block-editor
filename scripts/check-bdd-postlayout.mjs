'use strict';

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { buildBlockModel } from '../src/panel/BlockModelBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function toDiagramData(model) {
    return {
        elements: model.nodes.map((n) => ({ ...n })),
        connections: model.edges.map((e) => ({ ...e })),
    };
}

function loadBddLayout() {
    const code = fs.readFileSync(
        path.join(root, 'media/editor/layout/bddLayout.js'),
        'utf8',
    );
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
                            elk: { containerPadding: { top: 48, left: 32, right: 32, bottom: 28 } },
                        },
                    },
                    layout: {},
                },
            },
        },
        console,
    };
    vm.runInNewContext(code, ctx);
    return ctx.window.SELAB.Editor.layout.bdd;
}

const bdd = loadBddLayout();
const tests = ['test-3', 'test-6', 'test-7', 'test-8', 'test-9'];
let failed = 0;

for (const name of tests) {
    const raw = JSON.parse(
        fs.readFileSync(path.join(root, 'tests', `${name}.json`), 'utf8'),
    );
    const model = buildBlockModel(raw);
    const diagramData = toDiagramData(model);
    for (const el of diagramData.elements) {
        el.x = Number(el.x) || Math.random() * 400;
        el.y = Number(el.y) || Math.random() * 400;
        el.width = Number(el.width) || 120;
        el.height = Number(el.height) || 60;
        el.relativeX = el.parent ? 20 : el.x;
        el.relativeY = el.parent ? 40 : el.y;
    }
    try {
        bdd.applyPostLayout(diagramData, {});
        let minX = Infinity;
        let maxX = -Infinity;
        for (const el of diagramData.elements) {
            const x = Number(el.x) || 0;
            const y = Number(el.y) || 0;
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                throw new Error(`non-finite coord ${el.id}`);
            }
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
        }
        console.log(`[check-bdd] OK ${name} x=[${minX.toFixed(0)},${maxX.toFixed(0)}]`);
    } catch (err) {
        console.error(`[check-bdd] FAIL ${name}`, err.message);
        failed += 1;
    }
}

process.exit(failed ? 1 : 0);
