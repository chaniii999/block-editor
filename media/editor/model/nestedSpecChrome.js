/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026)
 * containment 부모 = spec 부모 — 헤더 크롬·상속선 숨김
 ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.model = ns.Editor.model || {};

    function isSpecKind(kind) {
        const k = String(kind || '').toLowerCase();
        return (
            k.includes('specialization') ||
            k.includes('specialzation') ||
            k.includes('generalization') ||
            k.includes('inheritance') ||
            k === 'subclassification'
        );
    }

    function applyNestedSpecChrome(elements, connections) {
        if (!Array.isArray(elements) || !Array.isArray(connections)) {
            return;
        }
        const byId = new Map();
        for (const el of elements) {
            if (el?.id) {
                byId.set(String(el.id), el);
            }
        }
        for (const conn of connections) {
            if (!isSpecKind(conn.kind || conn.type)) {
                continue;
            }
            const child = byId.get(String(conn.source));
            const parentId = String(conn.target || '');
            if (!child || !parentId || String(child.parent) !== parentId) {
                continue;
            }
            conn.nestedSpecChrome = true;
            if (!Array.isArray(child.nestedSpecParentIds)) {
                child.nestedSpecParentIds = [];
            }
            if (!Array.isArray(child.nestedSpecParentNames)) {
                child.nestedSpecParentNames = [];
            }
            if (!child.nestedSpecParentIds.includes(parentId)) {
                child.nestedSpecParentIds.push(parentId);
                const parentEl = byId.get(parentId);
                child.nestedSpecParentNames.push(
                    String(parentEl?.name || parentId),
                );
            }
        }
    }

    ns.Editor.model.nestedSpecChrome = {
        isSpecKind,
        applyNestedSpecChrome,
    };
})();
