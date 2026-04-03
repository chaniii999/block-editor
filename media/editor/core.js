/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
// Core app: state, lifecycle, services registry
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};

    class EditorApp {
        constructor() {
            this.model = { elements: [], connections: [] };
            this.dom = { svg: null, attrPanel: null };
            this.services = {};
            this.selectedId = null;
        }

        mount({ svg, attrPanel }) {
            this.dom.svg = svg;
            this.dom.attrPanel = attrPanel;
            if (ns.Editor.interactions && typeof ns.Editor.interactions.bind === 'function') {
                ns.Editor.interactions.bind(this);
            }
            return this;
        }

        use(name, service) {
            this.services[name] = service;
            return this;
        }

        setModel(model) {
            this.model = model || { elements: [], connections: [] };
            return this;
        }

        async layout() {
            // layout.js의 run 함수를 사용 (precomputeNodeSizes 포함)
            if (ns.Editor.layout && typeof ns.Editor.layout.run === 'function') {
                await ns.Editor.layout.run(this.model);
            } else if (ns.applyElkLayout) {
                // Fallback: applyElkLayout 직접 호출
                await ns.applyElkLayout(this.model);
            }
            return this;
        }

        deriveHierarchy() {
            if (ns.Editor.hierarchy && typeof ns.Editor.hierarchy.derive === 'function') {
                ns.Editor.hierarchy.derive(this.model);
            }
            return this;
        }

        render() {
            if (ns.Editor.render && typeof ns.Editor.render.draw === 'function') {
                ns.Editor.render.draw(this);
                // Restore selection after re-render (선택 상태 복원)
                if (ns.Editor.interactions && typeof ns.Editor.interactions.restoreSelection === 'function') {
                    ns.Editor.interactions.restoreSelection();
                }
            }
            return this;
        }

        select(target) {
            if (!target) {
                this.selectedId = null;
                return this;
            }
            const els = Array.isArray(this.model?.elements) ? this.model.elements : [];
            const byId = new Map(els.map((e) => [e.id, e]));
            const byName = new Map(els.map((e) => [e.name, e]));
            const node = byId.get(target.id || target) || byName.get(target.name || target);
            this.selectedId = node ? node.id : null;
            return this;
        }
    }

    ns.Editor.App = EditorApp;
})();
