/*******************************************************************************
 * Copyright: SELab.AI (c) 2026
 *******************************************************************************/

const BLOCK_NODE_KINDS = new Set([
    'package',
    'librarypackage',
    'partdefinition',
    'partusage',
    'portdefinition',
    'portusage',
    'attributedefinition',
    'attributeusage',
    'interfacedefinition',
    'interfaceusage',
]);

const BLOCK_EDGE_KINDS = new Set([
    'containment',
    'specialization',
    'inheritance',
    'generalization',
    'association',
    'allocation',
    'dependency',
    'featuretyping',
    'typefeaturing',
    'subsetting',
    'redefinition',
    'connection',
    'binding',
]);

function normalizeText(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeKind(value) {
    return normalizeText(value).toLowerCase();
}

function normalizeEdgeKind(edge) {
    return normalizeKind(edge?.kind || edge?.type);
}

function getNodeKey(node) {
    return normalizeText(node?.id, normalizeText(node?.qualifiedName, normalizeText(node?.name)));
}

function isBlockNode(node) {
    const kind = normalizeKind(node?.kind || node?.type);
    return BLOCK_NODE_KINDS.has(kind);
}

function isBlockEdge(edge) {
    return BLOCK_EDGE_KINDS.has(normalizeEdgeKind(edge));
}

function isSpecEdgeKind(edgeKind) {
    const k = normalizeKind(edgeKind);
    return (
        k === 'specialization' ||
        k === 'inheritance' ||
        k === 'generalization' ||
        k.includes('specialzation')
    );
}

/** containment 부모 안에 있으면서 같은 부모에게 spec — UI는 헤더 크롬, 선 숨김 */
function applyNestedSpecChrome(nodes, edges) {
    const nodeById = new Map();
    for (const node of nodes) {
        if (node?.id) {
            nodeById.set(node.id, node);
        }
    }
    for (const edge of edges) {
        if (!isSpecEdgeKind(normalizeEdgeKind(edge))) {
            continue;
        }
        const child = nodeById.get(edge.source);
        const parentId = edge.target;
        if (!child || !parentId || String(child.parent) !== String(parentId)) {
            continue;
        }
        edge.nestedSpecChrome = true;
        if (!Array.isArray(child.nestedSpecParentIds)) {
            child.nestedSpecParentIds = [];
        }
        if (!Array.isArray(child.nestedSpecParentNames)) {
            child.nestedSpecParentNames = [];
        }
        if (!child.nestedSpecParentIds.includes(parentId)) {
            child.nestedSpecParentIds.push(parentId);
            const parentNode = nodeById.get(parentId);
            child.nestedSpecParentNames.push(
                normalizeText(parentNode?.name, parentId),
            );
        }
    }
}

function buildLookup(nodes) {
    const nodeByKey = new Map();
    const aliasMap = new Map();

    function addAlias(alias, key) {
        const normalizedAlias = normalizeText(alias);
        if (!normalizedAlias || !key) {
            return;
        }
        const existing = aliasMap.get(normalizedAlias) || new Set();
        existing.add(key);
        aliasMap.set(normalizedAlias, existing);
    }

    for (const node of nodes) {
        const key = getNodeKey(node);
        if (!key || nodeByKey.has(key)) {
            continue;
        }
        nodeByKey.set(key, node);
        addAlias(key, key);
        addAlias(node.id, key);
        addAlias(node.qualifiedName, key);
        addAlias(node.name, key);
        addAlias(node.declaredName, key);
    }

    function resolveNodeKey(value) {
        const candidate = normalizeText(value);
        if (!candidate) {
            return '';
        }
        if (nodeByKey.has(candidate)) {
            return candidate;
        }
        const exactMatches = aliasMap.get(candidate);
        if (exactMatches?.size === 1) {
            return Array.from(exactMatches)[0];
        }

        const unquoted = candidate.replace(/^['"]|['"]$/g, '');
        if (nodeByKey.has(unquoted)) {
            return unquoted;
        }
        const unquotedMatches = aliasMap.get(unquoted);
        if (unquotedMatches?.size === 1) {
            return Array.from(unquotedMatches)[0];
        }

        return '';
    }

    return {
        nodeByKey,
        resolveNodeKey,
    };
}

function extractExplicitParent(node) {
    const rawParent = node?.parent || node?.container || node?.package || node?.owner || node?.namespace;
    if (typeof rawParent === 'object' && rawParent !== null) {
        return normalizeText(rawParent.id, normalizeText(rawParent.qualifiedName, normalizeText(rawParent.name)));
    }
    return normalizeText(rawParent);
}

/** 동일 노드 id가 containment 상 서로 다른 부모에 묶일 때, 추가 인스턴스용 id */
function containmentCloneId(targetKey, parentKey) {
    return `${targetKey}__in__${parentKey}`;
}

/**
 * containment 엣지 순서대로 자식 id별 부모 id 목록(중복 부모 제거)
 * @returns {Map<string, string[]>}
 */
function collectContainmentParentsByTarget(edges, resolveNodeKey) {
    const parentsByTarget = new Map();
    for (const edge of edges) {
        if (normalizeEdgeKind(edge) !== 'containment') {
            continue;
        }
        const sourceKey = resolveNodeKey(edge.source);
        const targetKey = resolveNodeKey(edge.target);
        if (!sourceKey || !targetKey || sourceKey === targetKey) {
            continue;
        }
        if (!parentsByTarget.has(targetKey)) {
            parentsByTarget.set(targetKey, []);
        }
        const arr = parentsByTarget.get(targetKey);
        if (!arr.includes(sourceKey)) {
            arr.push(sourceKey);
        }
    }
    return parentsByTarget;
}

function buildDirectParentMap(nodes, edges, resolveNodeKey) {
    const directParentMap = new Map();
    const parentsByTarget = collectContainmentParentsByTarget(edges, resolveNodeKey);

    for (const [targetKey, parents] of parentsByTarget) {
        if (!parents.length) {
            continue;
        }
        directParentMap.set(targetKey, parents[0]);
        for (let i = 1; i < parents.length; i++) {
            directParentMap.set(containmentCloneId(targetKey, parents[i]), parents[i]);
        }
    }

    for (const node of nodes) {
        const nodeKey = getNodeKey(node);
        if (!nodeKey || directParentMap.has(nodeKey)) {
            continue;
        }
        const explicitParent = resolveNodeKey(extractExplicitParent(node));
        if (explicitParent && explicitParent !== nodeKey) {
            directParentMap.set(nodeKey, explicitParent);
            continue;
        }

        let candidate = nodeKey;
        while (candidate.includes('::')) {
            candidate = candidate.substring(0, candidate.lastIndexOf('::'));
            const resolvedCandidate = resolveNodeKey(candidate);
            if (resolvedCandidate && resolvedCandidate !== nodeKey) {
                directParentMap.set(nodeKey, resolvedCandidate);
                break;
            }
        }
    }

    return { directParentMap, parentsByTarget };
}

function findNearestKeptAncestor(nodeKey, keptNodeKeys, directParentMap, resolveNodeKey) {
    const visited = new Set([nodeKey]);
    let cursor = directParentMap.get(nodeKey) || '';

    while (cursor && !visited.has(cursor)) {
        if (keptNodeKeys.has(cursor)) {
            return cursor;
        }
        visited.add(cursor);
        cursor = directParentMap.get(cursor) || '';
    }

    let qualifiedCursor = nodeKey;
    while (qualifiedCursor.includes('::')) {
        qualifiedCursor = qualifiedCursor.substring(0, qualifiedCursor.lastIndexOf('::'));
        const resolvedCandidate = resolveNodeKey(qualifiedCursor);
        if (resolvedCandidate && keptNodeKeys.has(resolvedCandidate) && resolvedCandidate !== nodeKey) {
            return resolvedCandidate;
        }
    }

    return '';
}

function deduplicateEdges(edges) {
    const edgeMap = new Map();

    for (const edge of edges) {
        const key = [normalizeText(edge.source), normalizeText(edge.target), normalizeEdgeKind(edge), normalizeText(edge.label)].join('|');
        if (!edgeMap.has(key)) {
            edgeMap.set(key, edge);
        }
    }

    return Array.from(edgeMap.values());
}

function buildBlockModel(model) {
    const rawNodes = Array.isArray(model?.nodes) ? model.nodes : [];
    const rawEdges = Array.isArray(model?.edges) ? model.edges : [];
    const { nodeByKey, resolveNodeKey } = buildLookup(rawNodes);
    const { directParentMap, parentsByTarget } = buildDirectParentMap(rawNodes, rawEdges, resolveNodeKey);
    const keptNodeKeys = new Set();

    for (const node of rawNodes) {
        const nodeKey = getNodeKey(node);
        if (nodeKey && nodeByKey.has(nodeKey) && isBlockNode(node)) {
            keptNodeKeys.add(nodeKey);
        }
    }

    for (const [targetKey, parents] of parentsByTarget) {
        if (parents.length <= 1 || !keptNodeKeys.has(targetKey)) {
            continue;
        }
        for (let i = 1; i < parents.length; i++) {
            keptNodeKeys.add(containmentCloneId(targetKey, parents[i]));
        }
    }

    const filteredNodes = [];
    for (const nodeKey of keptNodeKeys) {
        const rawNode = nodeByKey.get(nodeKey);
        if (rawNode) {
            const nextNode = {
                ...rawNode,
                id: nodeKey,
            };
            const parentKey = findNearestKeptAncestor(nodeKey, keptNodeKeys, directParentMap, resolveNodeKey);
            if (parentKey) {
                nextNode.parent = parentKey;
            } else {
                delete nextNode.parent;
            }
            filteredNodes.push(nextNode);
            continue;
        }

        let templateKey = '';
        let fallbackParent = '';
        for (const [tKey, plist] of parentsByTarget) {
            if (plist.length <= 1 || !keptNodeKeys.has(tKey)) {
                continue;
            }
            for (let i = 1; i < plist.length; i++) {
                if (containmentCloneId(tKey, plist[i]) === nodeKey) {
                    templateKey = tKey;
                    fallbackParent = plist[i];
                    break;
                }
            }
            if (templateKey) {
                break;
            }
        }
        if (!templateKey) {
            continue;
        }
        const tpl = nodeByKey.get(templateKey);
        if (!tpl) {
            continue;
        }
        const nextNode = {
            ...tpl,
            id: nodeKey,
        };
        const parentKey = findNearestKeptAncestor(nodeKey, keptNodeKeys, directParentMap, resolveNodeKey);
        if (parentKey) {
            nextNode.parent = parentKey;
        } else {
            nextNode.parent = fallbackParent;
        }
        filteredNodes.push(nextNode);
    }

    const associations = [];
    for (const edge of rawEdges) {
        const edgeKind = normalizeEdgeKind(edge);
        if (edgeKind !== 'association') {
            continue;
        }
        const sourceKey = resolveNodeKey(edge.source);
        const targetKey = resolveNodeKey(edge.target);
        if (
            !sourceKey ||
            !targetKey ||
            sourceKey === targetKey ||
            !keptNodeKeys.has(sourceKey) ||
            !keptNodeKeys.has(targetKey)
        ) {
            continue;
        }
        associations.push({
            ...edge,
            source: sourceKey,
            target: targetKey,
            kind: 'association',
            type: 'association',
        });
    }

    const filteredEdges = [];
    for (const edge of rawEdges) {
        const edgeKind = normalizeEdgeKind(edge);
        if (!isBlockEdge(edge) || edgeKind === 'containment' || edgeKind === 'association') {
            continue;
        }

        const sourceKey = resolveNodeKey(edge.source);
        const targetKey = resolveNodeKey(edge.target);
        if (!keptNodeKeys.has(sourceKey) || !keptNodeKeys.has(targetKey) || sourceKey === targetKey) {
            continue;
        }

        filteredEdges.push({
            ...edge,
            source: sourceKey,
            target: targetKey,
            kind: edge.kind || edge.type || edgeKind,
            type: edge.type || edge.kind || edgeKind,
        });
    }

    for (const node of filteredNodes) {
        if (!node.parent) {
            continue;
        }
        filteredEdges.push({
            id: `block-containment:${node.parent}->${node.id}`,
            source: node.parent,
            target: node.id,
            kind: 'containment',
            type: 'containment',
        });
    }

    applyNestedSpecChrome(filteredNodes, filteredEdges);

    return {
        nodes: filteredNodes,
        edges: deduplicateEdges(filteredEdges),
        associations: deduplicateEdges(associations),
    };
}

module.exports = {
    buildBlockModel,
};
