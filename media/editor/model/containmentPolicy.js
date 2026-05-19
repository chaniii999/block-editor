/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.model = ns.Editor.model || {};

    function normalizeKind(node) {
        return String(node?.kind || node?.type || '').toLowerCase();
    }

    function isContainmentEdge(edge) {
        const k = String(edge?.kind || edge?.type || '').toLowerCase();
        return k.includes('contain');
    }

    function isBddContainmentBlock(node) {
        if (!node) {
            return false;
        }
        const kind = normalizeKind(node);
        if (kind.includes('portdefinition') || kind.includes('portusage')) {
            return false;
        }
        if (kind.includes('attributedefinition') || kind.includes('attributeusage')) {
            return false;
        }
        return (
            kind.includes('partdefinition') ||
            kind.includes('partusage') ||
            kind.includes('package') ||
            kind.includes('librarypackage')
        );
    }

    function isAttributeOrPortKind(node) {
        const kind = normalizeKind(node);
        return (
            kind.includes('portdefinition') ||
            kind.includes('portusage') ||
            kind.includes('attributedefinition') ||
            kind.includes('attributeusage')
        );
    }

    function nodeHasInlineCompartmentFeatures(node) {
        const comps = node?.compartments;
        if (!Array.isArray(comps)) {
            return false;
        }
        for (const comp of comps) {
            const key = String(comp?.key || '').toLowerCase();
            if (key !== 'attributes' && key !== 'ports' && key !== 'attribute' && key !== 'port') {
                continue;
            }
            if (Array.isArray(comp.items) && comp.items.length > 0) {
                return true;
            }
        }
        return false;
    }

    function getDirectContainmentTargetIds(parentId, elements, connections) {
        const targets = new Set();
        const pid = String(parentId);
        for (const el of elements) {
            if (el?.parent != null && String(el.parent) === pid && el.id != null) {
                targets.add(String(el.id));
            }
        }
        if (Array.isArray(connections)) {
            for (const edge of connections) {
                if (!isContainmentEdge(edge)) {
                    continue;
                }
                if (String(edge.source) === pid && edge.target != null) {
                    targets.add(String(edge.target));
                }
            }
        }
        return targets;
    }

    function countDirectContainmentTargets(parentId, elements, connections) {
        return getDirectContainmentTargetIds(parentId, elements, connections).size;
    }

    function childHasAttributeOrPortBox(elements, childId, connections) {
        const cid = String(childId);
        const child = elements.find((el) => el?.id != null && String(el.id) === cid);
        if (child && nodeHasInlineCompartmentFeatures(child)) {
            return true;
        }
        for (const el of elements) {
            if (el?.parent == null || String(el.parent) !== cid) {
                continue;
            }
            if (isAttributeOrPortKind(el)) {
                return true;
            }
        }
        if (Array.isArray(connections)) {
            for (const edge of connections) {
                if (!isContainmentEdge(edge) || String(edge.source) !== cid) {
                    continue;
                }
                const target = elements.find(
                    (el) => el?.id != null && String(el.id) === String(edge.target),
                );
                if (target && isAttributeOrPortKind(target)) {
                    return true;
                }
            }
        }
        return false;
    }

    function shouldUseSimpleContainmentArrow(elements, parentId, childId, connections) {
        const parent = elements.find((el) => el?.id === parentId);
        const child = elements.find((el) => el?.id === childId);
        if (!isBddContainmentBlock(parent) || !isBddContainmentBlock(child)) {
            return false;
        }
        if (nodeHasInlineCompartmentFeatures(parent)) {
            return false;
        }
        if (countDirectContainmentTargets(parentId, elements, connections) !== 1) {
            return false;
        }
        if (countDirectContainmentTargets(childId, elements, connections) >= 2) {
            return false;
        }
        if (childHasAttributeOrPortBox(elements, childId, connections)) {
            return false;
        }
        return true;
    }

    /** unnest+화살표는 ELK/도메인 배치를 깨므로 사용하지 않음 — nesting 유지 */
    function applySingleChildContainmentUnnest() {}

    function getStructuralContainmentChildIds(parentId, elements, connections) {
        const out = [];
        for (const id of getDirectContainmentTargetIds(parentId, elements, connections)) {
            const el = elements.find((e) => e?.id != null && String(e.id) === id);
            if (el && isBddContainmentBlock(el) && !isAttributeOrPortKind(el)) {
                out.push(id);
            }
        }
        return out;
    }

    /**
     * 직접 자식이 1개뿐인 BDD 포함 체인 — 러시아 인형 외곽을 얇은 스파인 프레임으로 표시
     * @param {number} [minChainLength] 스파인 적용 최소 깊이(기본 3)
     */
    function markCompactContainmentSpines(elements, connections, minChainLength) {
        if (!Array.isArray(elements) || elements.length === 0) {
            return;
        }
        const minLen = Number(minChainLength) > 1 ? Number(minChainLength) : 3;
        const byId = new Map();
        for (const el of elements) {
            if (el?.id != null) {
                byId.set(String(el.id), el);
            }
        }
        const labelTop =
            Number(ns.Editor?.config?.displaySettings?.bdd?.compactSpineLabelTop) || 32;

        for (const start of elements) {
            if (!start?.id || !isBddContainmentBlock(start)) {
                continue;
            }
            const kids = getStructuralContainmentChildIds(start.id, elements, connections);
            if (kids.length !== 1) {
                continue;
            }
            const chain = [start];
            let cur = byId.get(kids[0]);
            while (cur) {
                chain.push(cur);
                const nextKids = getStructuralContainmentChildIds(cur.id, elements, connections);
                if (nextKids.length !== 1) {
                    break;
                }
                cur = byId.get(nextKids[0]);
            }
            if (chain.length < minLen) {
                continue;
            }
            for (let i = 0; i < chain.length - 1; i++) {
                const node = chain[i];
                node._compactContainmentSpine = true;
                node._tightSingleChildContainer = true;
                node._precomputedPaddingTop = labelTop;
            }
        }
    }

    ns.Editor.model.containmentPolicy = {
        isBddContainmentBlock,
        isAttributeOrPortKind,
        shouldUseSimpleContainmentArrow,
        applySingleChildContainmentUnnest,
        getStructuralContainmentChildIds,
        markCompactContainmentSpines,
    };
})();
