/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
// Renderer entrypoint: draws nodes and edges into SVG using split modules
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.render = ns.Editor.render || {};

    // drawContainerToggle and drawEdge are provided by separate modules

    function draw(app) {
        const svg = app?.dom?.svg || document.getElementById('diagramSvg');
        if (!svg) return;

        let pass = 0;
        let shouldRedraw = false;
        const maxPasses = 5;
        do {
            app._layoutChanged = false;
            while (svg.firstChild) svg.removeChild(svg.firstChild);

            const defs = ns.Editor.renderUtils.createMarkerDefinitions();
            svg.appendChild(defs);

            const v = app.viewport || { x: 0, y: 0, scale: 1 };
            const viewport = ns.Editor.renderUtils.createViewportGroup(v);
            svg.appendChild(viewport);

            // Replace elements with filtered elements
            const allElements = app.model.elements || [];
            const elements = allElements.filter((e) => !e?.hidden);

            // ?? �����: ForLoop/WhileLoop ��� Ȯ��
            const loopElements = elements.filter((e) => {
                const type = String(e.type || '').toLowerCase();
                return type.includes('forloop') || type.includes('whileloop');
            });
            console.log('[render.draw] ?? Total elements:', allElements.length);
            console.log('[render.draw] ?? Visible elements:', elements.length);
            console.log(
                '[render.draw] ?? Loop elements:',
                loopElements.length,
                loopElements.map((e) => ({ name: e.name, type: e.type }))
            );

            // ?? PerformActionUsage Ȯ��
            const performElements = elements.filter((e) => {
                const type = String(e.type || '').toLowerCase();
                return type.includes('perform');
            });
            console.warn('[render.draw] ?? PerformActionUsage elements:', performElements.length);
            performElements.forEach((e) => {
                console.warn(`  ?? ${e.name} (parent: ${e.parent}, x: ${e.x}, y: ${e.y}, w: ${e.width}, h: ${e.height})`);
            });

            app._visibleElements = elements;

            if (elements.length === 0) {
                const text = ns.Editor.renderUtils.createEmptyDiagramMessage();
                svg.appendChild(text);
                return;
            }

            const childrenOf = ns.Editor.utils.computeChildrenMap(elements);
            const containerHeaders = [];
            const containerToggles = [];

            const depthOf = (el) => {
                const byId = new Map(elements.map((e) => [e.id, e]));
                const byName = new Map(elements.map((e) => [e.name, e]));
                let d = 0;
                const seen = new Set();
                let c = el;
                while (c && (c.parent || String(c.name).includes('::'))) {
                    if (seen.has(c.id)) break;
                    seen.add(c.id);
                    if (c.parent) {
                        const p = byId.get(c.parent) || byName.get(String(c.parent));
                        if (!p) break;
                        d += 1;
                        c = p;
                    } else {
                        const parts = String(c.name).split('::');
                        if (parts.length <= 1) break;
                        parts.pop();
                        const p = byName.get(parts.join('::'));
                        if (!p) break;
                        d += 1;
                        c = p;
                    }
                }
                return d;
            };

            const sorted = [...elements].sort((a, b) => {
                const da = depthOf(a),
                    db = depthOf(b);
                if (da !== db) return da - db;
                const ta = String(a.type || '').toLowerCase() === 'package' ? 0 : 1;
                const tb = String(b.type || '').toLowerCase() === 'package' ? 0 : 1;
                if (ta !== tb) return ta - tb;
                return String(a.name).localeCompare(String(b.name));
            });

            for (const el of sorted) {
                ns.Editor.render.drawElement(viewport, app, el, childrenOf, containerHeaders, containerToggles);
            }

            const edges = app.model.connections || [];
            try {
                console.log('[render.draw] edges total', edges.length);
            } catch {}
            const renderable = edges.filter((c) => c && (c.kindClass ? true : !ns.Editor.hierarchy.isHierarchicalEdgeKind(c.kind || c.type)));
            try {
                console.log('[render.draw] edges after filter', renderable.length);
            } catch {}
            renderable.forEach((c) => ns.Editor.render.drawEdge(viewport, app, c));

            for (const h of containerHeaders) ns.Editor.render.drawContainerHeader(viewport, h);
            for (const t of containerToggles) ns.Editor.render.drawContainerToggle(viewport, t);

            shouldRedraw = !!app._layoutChanged;
            pass += 1;
        } while (shouldRedraw && pass < maxPasses);
    }

    ns.Editor.render.draw = draw;
})();
