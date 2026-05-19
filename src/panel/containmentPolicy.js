/*******************************************************************************
 * Copyright: SELab.AI (c) 2026
 * BDD 포함관계 — 단순 화살표 vs nesting 판별
 *******************************************************************************/

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

/** containment 엣지 + element.parent 기준 직접 자식 id 집합 */
function getDirectContainmentTargetIds(parentId, nodes, connections) {
    const targets = new Set();
    const pid = String(parentId);
    for (const node of nodes) {
        if (node?.parent != null && String(node.parent) === pid && node.id != null) {
            targets.add(String(node.id));
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

function countDirectContainmentTargets(parentId, nodes, connections) {
    return getDirectContainmentTargetIds(parentId, nodes, connections).size;
}

function childHasAttributeOrPortBox(nodes, childId, connections) {
    const cid = String(childId);
    const child = nodes.find((n) => n?.id != null && String(n.id) === cid);
    if (child && nodeHasInlineCompartmentFeatures(child)) {
        return true;
    }
    for (const node of nodes) {
        if (node?.parent == null || String(node.parent) !== cid) {
            continue;
        }
        if (isAttributeOrPortKind(node)) {
            return true;
        }
    }
    if (Array.isArray(connections)) {
        for (const edge of connections) {
            if (!isContainmentEdge(edge) || String(edge.source) !== cid) {
                continue;
            }
            const target = nodes.find(
                (n) => n?.id != null && String(n.id) === String(edge.target),
            );
            if (target && isAttributeOrPortKind(target)) {
                return true;
            }
        }
    }
    return false;
}

function countDirectChildren(nodes, parentId, connections) {
    return countDirectContainmentTargets(parentId, nodes, connections);
}

/**
 * @param {Array<Object>} [connections] containment 집계용(웹뷰: compartment만 있는 자식 포함)
 */
function shouldUseSimpleContainmentArrow(nodes, parentId, childId, connections) {
    const parent = nodes.find((n) => n?.id === parentId);
    const child = nodes.find((n) => n?.id === childId);
    if (!isBddContainmentBlock(parent) || !isBddContainmentBlock(child)) {
        return false;
    }
    if (nodeHasInlineCompartmentFeatures(parent)) {
        return false;
    }
    if (countDirectContainmentTargets(parentId, nodes, connections) !== 1) {
        return false;
    }
    if (countDirectContainmentTargets(childId, nodes, connections) >= 2) {
        return false;
    }
    if (childHasAttributeOrPortBox(nodes, childId, connections)) {
        return false;
    }
    return true;
}

/**
 * @param {Array<Object>} nodes
 * @param {Array<Object>} [connections]
 */
/** unnest+화살표는 전역 배치를 깨므로 no-op — nesting 유지 */
function applySingleChildContainmentUnnest() {}

function getStructuralContainmentChildIds(parentId, nodes, connections) {
    const out = [];
    for (const id of getDirectContainmentTargetIds(parentId, nodes, connections)) {
        const node = nodes.find((n) => n?.id != null && String(n.id) === id);
        if (node && isBddContainmentBlock(node) && !isAttributeOrPortKind(node)) {
            out.push(id);
        }
    }
    return out;
}

function markCompactContainmentSpines(nodes, connections, minChainLength) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return;
    }
    const minLen = Number(minChainLength) > 1 ? Number(minChainLength) : 3;
    const byId = new Map();
    for (const node of nodes) {
        if (node?.id != null) {
            byId.set(String(node.id), node);
        }
    }
    const labelTop = 32;

    for (const start of nodes) {
        if (!start?.id || !isBddContainmentBlock(start)) {
            continue;
        }
        const kids = getStructuralContainmentChildIds(start.id, nodes, connections);
        if (kids.length !== 1) {
            continue;
        }
        const chain = [start];
        let cur = byId.get(kids[0]);
        while (cur) {
            chain.push(cur);
            const nextKids = getStructuralContainmentChildIds(cur.id, nodes, connections);
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
            node._precomputedPaddingTop = labelTop;
        }
    }
}

module.exports = {
    isBddContainmentBlock,
    shouldUseSimpleContainmentArrow,
    applySingleChildContainmentUnnest,
    getStructuralContainmentChildIds,
    markCompactContainmentSpines,
};
