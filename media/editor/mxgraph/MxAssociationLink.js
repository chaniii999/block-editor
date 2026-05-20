/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 연관관계 노드 라벨 옆 링크(🔗) — 클릭 시 AssociationListModal
 ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.associationLink = ns.MxGraph.associationLink || {};

    let endpointIds = new Set();
    let elementsById = new Map();

    function escapeAttr(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
    }

    function resolveLookupIds(nodeId) {
        const ids = new Set([String(nodeId)]);
        const el = elementsById.get(String(nodeId));
        if (!el) {
            return ids;
        }
        if (el._specCloneOf) {
            ids.add(String(el._specCloneOf));
        }
        for (const [, other] of elementsById) {
            if (other?._specCloneOf && String(other._specCloneOf) === String(nodeId)) {
                ids.add(String(other.id));
            }
        }
        return ids;
    }

    function prepareRenderContext(model) {
        endpointIds = new Set();
        elementsById = new Map();
        const elements = model?.elements || model?.nodes || [];
        const associations = model?.associations || [];
        for (const el of elements) {
            if (el?.id) {
                elementsById.set(String(el.id), el);
            }
        }
        for (const assoc of associations) {
            if (assoc?.source) {
                endpointIds.add(String(assoc.source));
            }
            if (assoc?.target) {
                endpointIds.add(String(assoc.target));
            }
        }
    }

    function hasNode(nodeId) {
        if (!nodeId || endpointIds.size === 0) {
            return false;
        }
        for (const id of resolveLookupIds(nodeId)) {
            if (endpointIds.has(id)) {
                return true;
            }
        }
        return false;
    }

    function appendLinkToNameHtml(displayName, nodeId) {
        if (!displayName || !nodeId) {
            return displayName;
        }
        const safeId = escapeAttr(nodeId);
        return (
            `${displayName}<span class="selab-assoc-link" data-assoc-node="${safeId}" title="연관관계 보기" role="button" style="cursor:pointer;margin-left:5px;user-select:none;text-decoration:none;">🔗</span>`
        );
    }

    function handleContainerClick(event) {
        const target = event.target?.closest?.('.selab-assoc-link');
        if (!target) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const nodeId = target.getAttribute('data-assoc-node');
        if (!nodeId) {
            return;
        }
        const graph = ns.Editor._mxGraph;
        const el = elementsById.get(String(nodeId));
        const name = el?.name || nodeId;
        if (ns.Editor?.associationList?.showForNode) {
            ns.Editor.associationList.showForNode(nodeId, graph, name);
        }
    }

    function initGraphClick(graph) {
        if (!graph?.container || graph._assocLinkClickBound) {
            return;
        }
        graph.container.addEventListener('click', handleContainerClick, true);
        graph._assocLinkClickBound = true;
    }

    ns.MxGraph.associationLink.prepareRenderContext = prepareRenderContext;
    ns.MxGraph.associationLink.hasNode = hasNode;
    ns.MxGraph.associationLink.appendLinkToNameHtml = appendLinkToNameHtml;
    ns.MxGraph.associationLink.initGraphClick = initGraphClick;
})();
