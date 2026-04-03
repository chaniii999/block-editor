/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * interactions.js - 인터랙션 라우터
 * 각 기능별 로직은 interaction/ 디렉터리의 모듈로 분리됨
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};

    // 분리된 모듈 참조
    const interaction = ns.Editor.interaction || {};

    /**
     * requestAnimationFrame 기반으로 draw 호출을 한 프레임에 한 번으로 제한
     */
    function scheduleDraw(app) {
        if (app._rafPending) return;
        app._rafPending = true;
        window.requestAnimationFrame(() => {
            try {
                ns.Editor.render.draw(app);
                // 선택 상태 복원
                if (interaction.selectionManager) {
                    interaction.selectionManager.restoreSelection();
                }
            } finally {
                app._rafPending = false;
            }
        });
    }

    /**
     * 이벤트 경로에서 클래스 찾기
     */
    function findInEventPath(event, className) {
        try {
            const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
            for (const n of path) {
                if (n && n.classList && n.classList.contains(className)) return n;
            }
        } catch {}
        try {
            return event.target && event.target.closest ? event.target.closest('.' + className) : null;
        } catch {
            return null;
        }
    }

    /**
     * 인터랙션 바인딩
     * @param {Object} app - 앱 인스턴스
     */
    function bind(app) {
        const svg = app?.dom?.svg || document.getElementById('diagramSvg');
        if (!svg) return;

        // 설정 초기화
        app.settings = Object.assign({
            snap: true,
            grid: 10,
            guides: true,
            guidesThrottleMs: 80,
            guidesMaxOthers: 200
        }, app.settings || {});
        app.viewport = app.viewport || { x: 0, y: 0, scale: 1 };

        // 클릭 이벤트
        svg.addEventListener('click', (ev) => onClick(ev, app));
        svg.addEventListener('click', (ev) => onToggleClickCapture(ev, app), true);
        svg.addEventListener('dblclick', (ev) => onDblClick(ev, app));
        
        // 드래그 및 라쏘
        svg.addEventListener('mousedown', (ev) => onMouseDown(ev, app));
        window.addEventListener('mousemove', (ev) => onMouseMove(ev, app));
        window.addEventListener('mouseup', (ev) => onMouseUp(ev, app));
        
        // 줌 & 팬
        svg.addEventListener('wheel', (ev) => onWheel(ev, app), { passive: false });
        svg.addEventListener('mousedown', (ev) => onPanStart(ev, app));
        window.addEventListener('mousemove', (ev) => onPanMove(ev, app));
        window.addEventListener('mouseup', () => onPanEnd(app));

        // Escape 키 처리 (라쏘 취소용)
        window.addEventListener('keydown', (e) => {
            const t = e.target;
            const editable = !!(t && ((t.matches && t.matches('input, textarea, [contenteditable="true"]')) ||
                                      (t.closest && t.closest('input, textarea, [contenteditable="true"]'))));
            if (editable) return;
            if (e.code === 'Escape') {
                if (interaction.lassoSelector) {
                    interaction.lassoSelector.cancelLasso(app);
                }
            }
        });
    }

    /**
     * Compartment 토글 클릭 처리 (캡처 단계)
     */
    function onToggleClickCapture(event, app) {
        const toggle = findInEventPath(event, 'comp-toggle');
        if (!toggle) return;
        const group = toggle.closest && toggle.closest('.diagram-element');
        if (!group) return;
        const id = group.getAttribute('data-id');
        const node = app.model.elements.find((e) => e.id === id);
        const idx = Number(toggle.getAttribute('data-comp-index') || -1);
        if (node && Array.isArray(node.compartments) && idx >= 0) {
            node.compartments[idx].collapsed = !node.compartments[idx].collapsed;
            ns.Editor.render.draw(app);
        }
        event.stopPropagation();
        event.preventDefault();
    }

    /**
     * 클릭 이벤트 처리
     */
    function onClick(event, app) {
        const compToggle = findInEventPath(event, 'comp-toggle');
        const portEl = event.target.closest && event.target.closest('.diagram-port');
        const isMultiSelect = event.ctrlKey || event.metaKey;

        // Ctrl 키가 눌리지 않은 경우만 선택 해제
        if (!isMultiSelect && interaction.selectionManager) {
            interaction.selectionManager.clearSelection();
        }

        if (compToggle) {
            const group = compToggle.closest('.diagram-element');
            const id = group?.getAttribute('data-id');
            const node = app.model.elements.find((e) => e.id === id);
            const idx = Number(compToggle.getAttribute('data-comp-index') || -1);
            if (node && Array.isArray(node.compartments) && idx >= 0) {
                node.compartments[idx].collapsed = !node.compartments[idx].collapsed;
                ns.Editor.render.draw(app);
            }
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        if (portEl) {
            const group = portEl.closest('.diagram-element');
            const id = group?.getAttribute('data-id');
            const node = app.model.elements.find((e) => e.id === id);
            if (event.altKey && node && interaction.connectionCreator) {
                interaction.connectionCreator.startConnect(app, node, portEl);
                return;
            }
        }

        // 선택 처리 위임
        if (interaction.selectionManager) {
            interaction.selectionManager.handleClick(event, app);
        }
    }

    /**
     * 마우스 다운 이벤트 처리
     */
    function onMouseDown(event, app) {
        if (event.button !== 0) return;
        
        
        // 엣지 라벨 드래그
        const label = event.target.closest('.edge-label');
        if (label && interaction.dragHandler) {
            interaction.dragHandler.startDragEdgeLabel(app, label, event);
            return;
        }
        
        // Compartment 토글/아이템 클릭 시 드래그 시작 안함
        const toggle = findInEventPath(event, 'comp-toggle');
        const compItem = findInEventPath(event, 'comp-item');
        if (toggle || compItem) {
            event.stopPropagation();
            return;
        }
        
        if (app && app._panToolActive) return;
        
        const element = event.target.closest('.diagram-element');
        if (!element) {
            // Shift + 클릭으로 라쏘 시작
            if (event.shiftKey && interaction.lassoSelector) {
                interaction.lassoSelector.startLasso(app, event);
            }
            return;
        }
        
        
        const id = element.getAttribute('data-id');
        const node = app.model.elements.find((e) => e.id === id);
        if (!node) return;
        
        if (interaction.dragHandler) {
            interaction.dragHandler.startDrag(node, app, event);
        }
        
        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * 더블클릭 이벤트 처리
     */
    function onDblClick(event, app) {
        const nameText = event.target.closest('text[data-role="name"]');
        const typeText = event.target.closest('text[data-role="type"]');
        const compItem = event.target.closest('.comp-item');
        const edgeLbl = event.target.closest('.edge-label');
        const container = document.querySelector('.diagram-editor');
        
        if (nameText || typeText) {
            const group = (nameText || typeText).closest('.diagram-element');
            const id = group?.getAttribute('data-id');
            const node = app.model.elements.find((e) => e.id === id);
            if (!node) return;
            const initial = nameText ? node.name : node.type;
            ns.Editor.inlineEdit?.start?.({
                containerEl: container,
                targetEl: nameText || typeText,
                initialText: initial,
                onCommit: (text) => {
                    const old = nameText ? node.name : node.type;
                    if (!text || text === old) return;
                    if (nameText) {
                        (app.model.connections || []).forEach((c) => {
                            if (c.source === node.name) c.source = text;
                            if (c.target === node.name) c.target = text;
                        });
                        node.name = text;
                        try {
                            const payload = { type: 'rename-element', oldName: old, newName: text, id: node.id, qualifiedName: node.id };
                            if (typeof ns.Editor.post === 'function') ns.Editor.post(payload);
                            else window.vscode?.postMessage?.(payload);
                        } catch {}
                    } else {
                        node.type = text;
                    }
                    ns.Editor.render.draw(app);
                },
            });
            return;
        }
        if (compItem) {
            const group = compItem.closest('.diagram-element');
            const id = group?.getAttribute('data-id');
            const node = app.model.elements.find((e) => e.id === id);
            const ci = Number(compItem.getAttribute('data-comp-index') || -1);
            const ii = Number(compItem.getAttribute('data-item-index') || -1);
            if (!node || ci < 0 || ii < 0) return;
            ns.Editor.inlineEdit?.start?.({
                containerEl: container,
                targetEl: compItem,
                initialText: String(node.compartments[ci].items[ii] ?? ''),
                onCommit: (text) => {
                    node.compartments[ci].items[ii] = text;
                    ns.Editor.render.draw(app);
                },
            });
            return;
        }
        if (edgeLbl) {
            const connId = edgeLbl.getAttribute('data-id');
            const conn = (app.model.connections || []).find((c) => String(c.id) === String(connId));
            if (!conn) return;
            ns.Editor.inlineEdit?.start?.({
                containerEl: container,
                targetEl: edgeLbl,
                initialText: String(conn.label || ''),
                onCommit: (text) => {
                    conn.label = text;
                    ns.Editor.render.draw(app);
                },
            });
            return;
        }
    }

    /**
     * 마우스 이동 이벤트 처리
     */
    function onMouseMove(ev, app) {
        // 라벨 드래그
        if (interaction.dragHandler && interaction.dragHandler.isLabelDragging()) {
            if (interaction.dragHandler.handleLabelDragMove(ev, app)) {
                scheduleDraw(app);
            }
            return;
        }
        
        // 연결 중
        if (interaction.connectionCreator && interaction.connectionCreator.isConnecting()) {
            interaction.connectionCreator.handleConnectMove(ev, app);
            return;
        }
        
        // 라쏘
        if (interaction.lassoSelector && interaction.lassoSelector.isLassoing()) {
            interaction.lassoSelector.handleLassoMove(ev, app);
        }
        
        // 노드 드래그
        if (interaction.dragHandler && interaction.dragHandler.isDragging()) {
            if (interaction.dragHandler.handleDragMove(ev, app)) {
                scheduleDraw(app);
            }
        }
    }

    /**
     * 마우스 업 이벤트 처리
     */
    function onMouseUp(ev, app) {
        let needRedraw = false;
        
        // 노드 드래그 종료
        if (interaction.dragHandler) {
            needRedraw = interaction.dragHandler.endDrag(app) || needRedraw;
            needRedraw = interaction.dragHandler.endLabelDrag() || needRedraw;
        }
        
        // 라쏘 종료
        if (interaction.lassoSelector) {
            needRedraw = interaction.lassoSelector.endLasso(app) || needRedraw;
        }
        
        // 연결 종료
        if (interaction.connectionCreator) {
            needRedraw = interaction.connectionCreator.endConnect(app) || needRedraw;
        }
        
        if (needRedraw) {
            scheduleDraw(app);
        }
    }

    /**
     * 휠 이벤트 처리
     */
    function onWheel(ev, app) {
        if (interaction.zoomPanHandler) {
            interaction.zoomPanHandler.handleWheel(ev, app);
        }
    }

    /**
     * 팬 시작
     */
    function onPanStart(ev, app) {
        if (interaction.zoomPanHandler) {
            interaction.zoomPanHandler.startPan(ev, app);
        }
    }

    /**
     * 팬 이동
     */
    function onPanMove(ev, app) {
        if (interaction.zoomPanHandler) {
            interaction.zoomPanHandler.handlePanMove(ev, app);
        }
    }

    /**
     * 팬 종료
     */
    function onPanEnd(app) {
        if (interaction.zoomPanHandler) {
            interaction.zoomPanHandler.endPan();
        }
    }

    /**
     * Compartment 토글
     */
    function toggleCompartment(nodeId, compIndex) {
        try {
            const app = ns.Editor._app;
            if (!app) return;
            const idx = Number(compIndex);
            const node = (app.model.elements || []).find((e) => String(e.id) === String(nodeId));
            if (!node || !Array.isArray(node.compartments) || idx < 0 || idx >= node.compartments.length) return;
            node.compartments[idx].collapsed = !node.compartments[idx].collapsed;
            if (ns.Editor.render) ns.Editor.render.draw(app);
        } catch {}
    }

    /**
     * 현재 선택된 요소의 ID를 반환
     */
    function getSelectedElementId() {
        if (interaction.selectionManager) {
            return interaction.selectionManager.getSelectedElementId();
        }
        return null;
    }

    /**
     * 선택 상태 복원
     */
    function restoreSelection() {
        if (interaction.selectionManager) {
            interaction.selectionManager.restoreSelection();
        }
    }

    ns.Editor.interactions = { bind, toggleCompartment, getSelectedElementId, restoreSelection };
})();
