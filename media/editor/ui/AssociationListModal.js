/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 연관관계(association) 목록 모달 — 노드 선택 시 연결된 노드 리스트 표시
 ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.associationList = ns.Editor.associationList || {};

    let rootEl = null;
    let listEl = null;
    let titleEl = null;
    let emptyEl = null;
    /** 같은 클릭의 mouseup이 백드롭에 잡혀 바로 닫히는 것 방지 */
    let suppressBackdropCloseUntil = 0;
    let pinnedNodeId = null;

    function getModel() {
        const app = ns.Editor._app;
        if (app?.model?.associations) {
            return app.model;
        }
        return ns.Editor._lastNormalizedModel || null;
    }

    function resolveNodeIdsForLookup(nodeId, elements) {
        const ids = new Set([String(nodeId)]);
        for (const el of elements || []) {
            if (!el?.id) {
                continue;
            }
            if (el._specCloneOf && String(el._specCloneOf) === String(nodeId)) {
                ids.add(String(el.id));
            }
            if (String(el.id) === String(nodeId) && el._specCloneOf) {
                ids.add(String(el._specCloneOf));
            }
        }
        return ids;
    }

    function collectAssociationsForNode(nodeId, model) {
        const elements = model?.elements || [];
        const associations = model?.associations || [];
        const lookupIds = resolveNodeIdsForLookup(nodeId, elements);
        const byId = new Map();
        for (const el of elements) {
            if (el?.id) {
                byId.set(String(el.id), el);
            }
        }

        const rows = [];
        const seen = new Set();

        for (const assoc of associations) {
            const src = String(assoc.source || '');
            const tgt = String(assoc.target || '');
            const srcHit = lookupIds.has(src);
            const tgtHit = lookupIds.has(tgt);
            if (!srcHit && !tgtHit) {
                continue;
            }

            let direction = '';
            let otherId = '';
            if (srcHit && tgtHit) {
                direction = '↔';
                otherId = src === tgt ? src : tgt;
            } else if (srcHit) {
                direction = '→';
                otherId = tgt;
            } else {
                direction = '←';
                otherId = src;
            }

            const key = [src, tgt, direction].join('|');
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);

            const other = byId.get(otherId);
            rows.push({
                id: assoc.id || key,
                direction,
                otherId,
                otherName: other?.name || otherId,
                otherKind: other?.type || other?.kind || '',
            });
        }

        rows.sort((a, b) => {
            const d = a.direction.localeCompare(b.direction);
            if (d !== 0) {
                return d;
            }
            return String(a.otherName).localeCompare(String(b.otherName));
        });

        return rows;
    }

    function ensureDom() {
        if (rootEl) {
            return;
        }
        rootEl = document.createElement('div');
        rootEl.className = 'association-modal';
        rootEl.setAttribute('role', 'dialog');
        rootEl.setAttribute('aria-modal', 'true');
        rootEl.hidden = true;

        const backdrop = document.createElement('div');
        backdrop.className = 'association-modal__backdrop';
        backdrop.addEventListener('click', handleBackdropClick);

        const panel = document.createElement('div');
        panel.className = 'association-modal__panel';

        const header = document.createElement('div');
        header.className = 'association-modal__header';

        titleEl = document.createElement('h3');
        titleEl.className = 'association-modal__title';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'association-modal__close';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', '닫기');
        closeBtn.addEventListener('click', hide);

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        listEl = document.createElement('ul');
        listEl.className = 'association-modal__list';
        listEl.addEventListener('click', handleAssociationListDelegatedClick);

        emptyEl = document.createElement('p');
        emptyEl.className = 'association-modal__empty';
        emptyEl.textContent = '연관관계가 없습니다.';

        panel.appendChild(header);
        panel.appendChild(listEl);
        panel.appendChild(emptyEl);

        rootEl.appendChild(backdrop);
        rootEl.appendChild(panel);
        document.body.appendChild(rootEl);

        document.addEventListener('keydown', handleKeyDown);
    }

    function handleKeyDown(event) {
        if (event.key === 'Escape' && rootEl && !rootEl.hidden) {
            hide();
        }
    }

    function handleBackdropClick(event) {
        if (Date.now() < suppressBackdropCloseUntil) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        hide();
    }

    function focusNodeInGraph(otherId, graph) {
        if (!graph || !otherId) {
            return;
        }
        const pick = ns.MxGraph?.selection?.selectById;
        if (pick) {
            pick(graph, otherId);
            return;
        }
        try {
            const cell = graph.getModel().getCell(otherId);
            if (cell) {
                graph.setSelectionCell(cell);
                graph.scrollCellToVisible(cell);
            }
        } catch (_) {}
    }

    function handleAssociationListDelegatedClick(event) {
        const link = event.target.closest('.association-modal__link');
        if (!link || !listEl || !listEl.contains(link)) {
            return;
        }
        const otherId = link.getAttribute('data-assoc-other-id');
        const graph = listEl._assocGraphForModal || ns.Editor._mxGraph;
        if (otherId) {
            focusNodeInGraph(otherId, graph);
        }
        hide();
    }

    function renderList(rows, graph) {
        listEl.innerHTML = '';
        listEl._assocGraphForModal = graph || null;
        const hasRows = rows.length > 0;
        listEl.hidden = !hasRows;
        emptyEl.hidden = hasRows;

        for (const row of rows) {
            const li = document.createElement('li');
            li.className = 'association-modal__item';

            const dir = document.createElement('span');
            dir.className = 'association-modal__dir';
            dir.textContent = row.direction;

            const label = document.createElement('button');
            label.type = 'button';
            label.className = 'association-modal__link';
            label.textContent = row.otherName;
            label.title = row.otherId;
            label.setAttribute('data-assoc-other-id', row.otherId);

            const kind = document.createElement('span');
            kind.className = 'association-modal__kind';
            kind.textContent = row.otherKind;

            li.appendChild(dir);
            li.appendChild(label);
            if (row.otherKind) {
                li.appendChild(kind);
            }
            listEl.appendChild(li);
        }
    }

    function showForNode(nodeId, graph, nodeName) {
        const model = getModel();
        if (!model || !nodeId) {
            return false;
        }
        const rows = collectAssociationsForNode(nodeId, model);
        if (rows.length === 0) {
            hide();
            return false;
        }

        ensureDom();
        const displayName = nodeName || nodeId;
        titleEl.textContent = `${displayName} — 연관관계 (${rows.length})`;
        renderList(rows, graph);
        pinnedNodeId = String(nodeId);
        suppressBackdropCloseUntil = Date.now() + 400;
        rootEl.hidden = false;
        return true;
    }

    function hide() {
        pinnedNodeId = null;
        if (rootEl) {
            rootEl.hidden = true;
        }
    }

    function isPinned() {
        return Boolean(pinnedNodeId);
    }

    function hasAssociations(nodeId) {
        const model = getModel();
        if (!model || !nodeId) {
            return false;
        }
        return collectAssociationsForNode(nodeId, model).length > 0;
    }

    ns.Editor.associationList = {
        showForNode,
        hide,
        isPinned,
        hasAssociations,
        collectAssociationsForNode,
    };
})();
