/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
// Attribute panel rendering and visibility
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};

    function getPanelContainer(app) {
        const inner = app?.dom?.attrPanel || document.getElementById('attributePanel');
        return inner?.closest?.('.attributes-panel') || document.querySelector('.attributes-panel');
    }

    function isPanelVisible(app) {
        const container = getPanelContainer(app);
        if (!container) return false;
        return !container.classList.contains('hidden');
    }

    function setVisible(app, visible) {
        try {
            const container = getPanelContainer(app);
            if (!container) return;
            if (visible) container.classList.remove('hidden');
            else container.classList.add('hidden');
        } catch (e) {
            console.log('[Editor.attributes.setVisible] error', e);
        }
    }

    function render(app, node) {
        const container = app?.dom?.attrPanel || document.getElementById('attributePanel');
        if (!container) return;

        const isPanelOn = isPanelVisible(app);

        container.innerHTML = '';

        if (!node) {
            if (isPanelOn) {
                // 토글 ON: 빈 상태 메시지 표시, 패널 유지
                setVisible(app, true);
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'attr-empty-message';
                emptyMsg.style.cssText = 'padding: 24px 16px; color: var(--vscode-descriptionForeground); font-size: 13px; text-align: center; opacity: 0.7;';
                emptyMsg.textContent = '선택된 요소가 없습니다';
                container.appendChild(emptyMsg);
            } else {
                // 토글 OFF: 패널 숨김 (기존 동작)
                setVisible(app, false);
            }
            return;
        }

        // 노드가 있어도 토글 OFF이면 패널 표시 안 함
        if (!isPanelOn) {
            setVisible(app, false);
            return;
        }

        setVisible(app, true);

        const header = document.createElement('div');
        header.className = 'attr-header';
        header.textContent = `${node.type} • ${node.id}`;
        container.appendChild(header);

        const field = (labelText, inputEl) => {
            const group = document.createElement('div');
            group.className = 'attr-group';
            const label = document.createElement('label');
            label.textContent = labelText;
            group.appendChild(label);
            group.appendChild(inputEl);
            container.appendChild(group);
            return inputEl;
        };

        // Documentation/Comment 타입 특별 처리
        const nodeTypeLower = String(node.type || '').toLowerCase();
        if (nodeTypeLower === 'documentation' || nodeTypeLower === 'comment') {
            // Type 표시
            const typeDiv = document.createElement('div');
            typeDiv.className = 'attr-group';
            const typeLabel = document.createElement('label');
            typeLabel.textContent = 'Type';
            const typeValue = document.createElement('div');
            typeValue.textContent = node.type;
            typeValue.style.fontWeight = 'bold';
            typeDiv.appendChild(typeLabel);
            typeDiv.appendChild(typeValue);
            container.appendChild(typeDiv);

            // Name
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = node.name || '';
            nameInput.placeholder = 'Name (optional)';
            field('Name', nameInput);
            nameInput.addEventListener('blur', () => {
                node.name = nameInput.value;
                if (ns.Editor.render) ns.Editor.render.draw(app);
            });

            // Locale
            if (node.locale !== undefined) {
                const localeInput = document.createElement('input');
                localeInput.type = 'text';
                localeInput.value = node.locale || '';
                localeInput.placeholder = 'e.g., ko-KR, en-US';
                field('Locale', localeInput);
                localeInput.addEventListener('blur', () => {
                    node.locale = localeInput.value;
                    if (ns.Editor.render) ns.Editor.render.draw(app);
                });
            }

            // Body (multiline)
            const bodyGroup = document.createElement('div');
            bodyGroup.className = 'attr-group';
            const bodyLabel = document.createElement('label');
            bodyLabel.textContent = 'Body';
            const bodyTextarea = document.createElement('textarea');
            bodyTextarea.value = node.body || '';
            bodyTextarea.rows = 10;
            bodyTextarea.style.width = '100%';
            bodyTextarea.style.fontFamily = 'monospace';
            bodyTextarea.style.fontSize = '12px';
            bodyGroup.appendChild(bodyLabel);
            bodyGroup.appendChild(bodyTextarea);
            container.appendChild(bodyGroup);
            bodyTextarea.addEventListener('blur', () => {
                node.body = bodyTextarea.value;
                if (ns.Editor.render) ns.Editor.render.draw(app);
            });

            // Owner (read-only)
            if (node.parent) {
                const ownerDiv = document.createElement('div');
                ownerDiv.className = 'attr-group';
                const ownerLabel = document.createElement('label');
                ownerLabel.textContent = 'Owner';
                const ownerValue = document.createElement('div');
                ownerValue.textContent = node.parent;
                ownerValue.style.color = '#888';
                ownerDiv.appendChild(ownerLabel);
                ownerDiv.appendChild(ownerValue);
                container.appendChild(ownerDiv);
            }

            return; // Documentation/Comment는 여기서 종료
        }

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = node.name || '';
        nameInput.placeholder = 'Name';
        field('Name', nameInput);

        const typeSelect = document.createElement('select');
        const types = [
            // Definition 타입 (23종)
            'ActionDefinition',
            'AllocationDefinition',
            'AttributeDefinition',
            'CalculationDefinition',
            'CaseDefinition',
            'ConcernDefinition',
            'ConnectionDefinition',
            'ConstraintDefinition',
            'Definition',
            'EnumerationDefinition',
            'FlowConnectionDefinition',
            'InterfaceDefinition',
            'ItemDefinition',
            'MetadataDefinition',
            'OccurrenceDefinition',
            'PartDefinition',
            'PortDefinition',
            'RenderingDefinition',
            'RequirementDefinition',
            'StateDefinition',
            'UseCaseDefinition',
            'VerificationCaseDefinition',
            'ViewDefinition',
            'ViewpointDefinition',

            // Usage 타입 (28종)
            'AcceptActionUsage',
            'ActionUsage',
            'AllocationUsage',
            'AnalysisCaseUsage',
            'AssertConstraintUsage',
            'AssignmentActionUsage',
            'AttributeUsage',
            'CalculationUsage',
            'CaseUsage',
            'ConcernUsage',
            'ConnectionUsage',
            'ConstraintUsage',
            'EnumerationUsage',
            'EventOccurrenceUsage',
            'ExhibitStateUsage',
            'FlowConnectionUsage',
            'IncludeUseCaseUsage',
            'InterfaceUsage',
            'ItemUsage',
            'MetadataUsage',
            'OccurrenceUsage',
            'PartUsage',
            'PerformActionUsage',
            'PortUsage',
            'ReferenceUsage',
            'RenderingUsage',
            'RequirementUsage',
            'SatisfyRequirementUsage',
            'SendActionUsage',
            'StateUsage',
            'TerminateActionUsage',
            'Usage',
            'UseCaseUsage',
            'VerificationCaseUsage',
            'ViewUsage',
            'ViewpointUsage',

            // 기타
            'Package',
            'LibraryPackage',
            'Documentation',
            'Comment',
        ];
        types.sort(); // 알파벳 순 정렬

        types.forEach((t) => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            // 대소문자 구분 없이 비교
            if (String(node.type).toLowerCase() === t.toLowerCase()) opt.selected = true;
            typeSelect.appendChild(opt);
        });
        field('Type', typeSelect);

        // Store input elements for later use
        const xInput = document.createElement('input');
        xInput.type = 'number';
        xInput.value = Number(node.x || 0);
        const yInput = document.createElement('input');
        yInput.type = 'number';
        yInput.value = Number(node.y || 0);
        const wInput = document.createElement('input');
        wInput.type = 'number';
        wInput.value = Number(node.width || 120);
        const hInput = document.createElement('input');
        hInput.type = 'number';
        hInput.value = Number(node.height || 60);

        const propsContainer = document.createElement('div');
        propsContainer.className = 'attr-props';
        const propsHeader = document.createElement('div');
        propsHeader.className = 'attr-props-header';
        const propsTitle = document.createElement('span');
        propsTitle.textContent = 'Properties';
        const addPropBtn = document.createElement('button');
        addPropBtn.textContent = '+ Add';
        addPropBtn.className = 'btn-small';
        propsHeader.appendChild(propsTitle);
        propsHeader.appendChild(addPropBtn);
        propsContainer.appendChild(propsHeader);
        const list = document.createElement('div');
        list.className = 'attr-props-list';
        propsContainer.appendChild(list);
        container.appendChild(propsContainer);

        const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

        function renderProps() {
            list.innerHTML = '';
            (node.properties || []).forEach((p, idx) => {
                const row = document.createElement('div');
                row.className = 'attr-prop-row';
                const input = document.createElement('input');
                input.type = 'text';
                input.value = String(p);
                const delBtn = document.createElement('button');
                delBtn.textContent = '✕';
                delBtn.className = 'btn-icon';
                row.appendChild(input);
                row.appendChild(delBtn);
                list.appendChild(row);
                input.addEventListener('input', () => {
                    node.properties[idx] = input.value;
                });
                delBtn.addEventListener('click', () => {
                    node.properties.splice(idx, 1);
                    renderProps();
                });
            });
        }
        renderProps();
        addPropBtn.addEventListener('click', () => {
            if (!Array.isArray(node.properties)) node.properties = [];
            node.properties.push('');
            renderProps();
        });

        typeSelect.addEventListener('change', () => {
            const oldType = node.type;
            const newType = String(typeSelect.value);
            node.type = newType;
            if (ns.Editor.render) ns.Editor.render.draw(app);
            try {
                const payload = { type: 'update-element-type', id: node.id, name: node.name, oldType, newType };
                const post = window.SELAB?.Editor?.post;
                const api = window.SELAB?.Editor?.vscode || window.vscode || null;
                if (typeof post === 'function') {
                    post(payload);
                } else if (api && typeof api.postMessage === 'function') {
                    api.postMessage(payload);
                }
            } catch (e) {
                console.log('[Editor.attributes.render] typeSelect postMessage error', e);
            }
        });

        nameInput.addEventListener('blur', () => {
            const oldName = node.name;
            const newName = String(nameInput.value);

            if (!newName || oldName === newName) return;

            (app.model.connections || []).forEach((c) => {
                if (c.source === oldName) c.source = newName;
                if (c.target === oldName) c.target = newName;
            });

            node.name = newName;

            if (ns.Editor.render) ns.Editor.render.draw(app);

            try {
                const payload = { type: 'rename-element', oldName, newName, id: node.id, qualifiedName: node.id };
                setTimeout(() => {
                    try {
                        let subscribed = false;
                        const onReady = () => {
                            try {
                                const api = window.SELAB?.Editor?.vscode || window.vscode || null;
                                const post = window.SELAB?.Editor?.post;
                                if (typeof post === 'function') {
                                    post(payload);
                                    post({ type: 'log', tag: '[Editor.attributes.render]', message: `rename debug ${JSON.stringify(payload)}` });
                                    return;
                                }
                                if (api && typeof api.postMessage === 'function') {
                                    api.postMessage(payload);
                                    api.postMessage({ type: 'log', tag: '[Editor.attributes.render]', message: `rename debug ${JSON.stringify(payload)}` });
                                }
                            } catch {}
                        };
                        const send = (attempt) => {
                            const api = window.SELAB?.Editor?.vscode || window.vscode || null;
                            const post = window.SELAB?.Editor?.post;
                            if (typeof post === 'function') {
                                try {
                                    post(payload);
                                    post({ type: 'log', tag: '[Editor.attributes.render]', message: `rename debug ${JSON.stringify(payload)}` });
                                } catch {}
                                return;
                            }
                            if (api && typeof api.postMessage === 'function') {
                                api.postMessage(payload);
                                api.postMessage({ type: 'log', tag: '[Editor.attributes.render]', message: `rename debug ${JSON.stringify(payload)}` });
                                return;
                            }
                            if (!subscribed) {
                                try {
                                    window.addEventListener('selab:vscode-ready', onReady, { once: true });
                                } catch {}
                                subscribed = true;
                            }
                            if (attempt < 40) {
                                setTimeout(() => send(attempt + 1), 50);
                            } else {
                                console.log('[Editor.attributes.render] no vscode API available to post');
                            }
                        };
                        send(0);
                    } catch (err2) {
                        console.log('[Editor.attributes.render] deferred post failed', err2);
                    }
                }, 0);
            } catch (e) {
                console.log('[Editor.attributes.render] postMessage error', e);
            }
        });
        xInput.addEventListener('input', () => {
            node.x = num(xInput.value);
            if (ns.Editor.render) ns.Editor.render.draw(app);
        });
        yInput.addEventListener('input', () => {
            node.y = num(yInput.value);
            if (ns.Editor.render) ns.Editor.render.draw(app);
        });
        wInput.addEventListener('input', () => {
            node.width = Math.max(20, num(wInput.value));
            if (ns.Editor.render) ns.Editor.render.draw(app);
        });
        hInput.addEventListener('input', () => {
            node.height = Math.max(20, num(hInput.value));
            if (ns.Editor.render) ns.Editor.render.draw(app);
        });

        // Compartments UI
        // --------------------------------------------------------------------------------
        const compHeader = document.createElement('div');
        compHeader.className = 'attr-props-header';
        const compTitle = document.createElement('span');
        compTitle.textContent = 'Compartments';
        const addCompBtn = document.createElement('button');
        addCompBtn.textContent = '+ Add Compartment';
        addCompBtn.className = 'btn-small';
        compHeader.appendChild(compTitle);
        compHeader.appendChild(addCompBtn);
        container.appendChild(compHeader);

        const compList = document.createElement('div');
        compList.className = 'attr-props-list';
        container.appendChild(compList);

        node.compartments = Array.isArray(node.compartments) ? node.compartments : [];

        function renderCompartments() {
            compList.innerHTML = '';
            const comps = node.compartments || [];
            comps.forEach((comp, cidx) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'attr-group';
                wrapper.setAttribute('draggable', 'true');
                wrapper.setAttribute('data-cidx', String(cidx));

                const row = document.createElement('div');
                row.style.display = 'grid';
                row.style.gridTemplateColumns = '1fr auto auto auto';
                row.style.gap = '6px';

                const keyInput = document.createElement('input');
                keyInput.type = 'text';
                keyInput.value = String(comp.key || '');
                keyInput.placeholder = 'Compartment key (e.g., attributes)';
                const toggleBtn = document.createElement('button');
                toggleBtn.textContent = comp.collapsed ? 'Expand' : 'Collapse';
                toggleBtn.className = 'btn-small';
                const delBtn = document.createElement('button');
                delBtn.textContent = '✕';
                delBtn.title = 'Delete compartment';
                delBtn.className = 'btn-icon';
                const dragHandle = document.createElement('button');
                dragHandle.textContent = '↕';
                dragHandle.title = 'Drag to reorder';
                dragHandle.className = 'btn-icon';
                dragHandle.style.cursor = 'grab';

                row.appendChild(keyInput);
                row.appendChild(toggleBtn);
                row.appendChild(delBtn);
                row.appendChild(dragHandle);
                wrapper.appendChild(row);

                // Items list for this compartment
                const itemsList = document.createElement('div');
                itemsList.className = 'attr-props-list';
                wrapper.appendChild(itemsList);

                const itemsHeader = document.createElement('div');
                itemsHeader.className = 'attr-props-header';
                const itemsTitle = document.createElement('span');
                itemsTitle.textContent = 'Items';
                const addItemBtn = document.createElement('button');
                addItemBtn.textContent = '+ Add Item';
                addItemBtn.className = 'btn-small';
                itemsHeader.appendChild(itemsTitle);
                itemsHeader.appendChild(addItemBtn);
                wrapper.appendChild(itemsHeader);

                function renderItems() {
                    itemsList.innerHTML = '';
                    const arr = Array.isArray(comp.items) ? comp.items : [];
                    arr.forEach((it, iidx) => {
                        const itemRow = document.createElement('div');
                        itemRow.className = 'attr-prop-row';
                        itemRow.setAttribute('draggable', 'true');
                        itemRow.setAttribute('data-cidx', String(cidx));
                        itemRow.setAttribute('data-iidx', String(iidx));

                        const input = document.createElement('input');
                        input.type = 'text';
                        input.value = String(it ?? '');
                        const del = document.createElement('button');
                        del.textContent = '✕';
                        del.className = 'btn-icon';
                        itemRow.appendChild(input);
                        itemRow.appendChild(del);
                        itemsList.appendChild(itemRow);

                        input.addEventListener('input', () => {
                            try {
                                node.compartments[cidx].items[iidx] = input.value;
                            } catch {}
                            ns.Editor.render?.draw?.(app);
                        });
                        del.addEventListener('click', () => {
                            try {
                                node.compartments[cidx].items.splice(iidx, 1);
                            } catch {}
                            renderItems();
                            ns.Editor.render?.draw?.(app);
                        });

                        // Drag events for items
                        itemRow.addEventListener('dragstart', (ev) => {
                            ev.dataTransfer?.setData('text/plain', JSON.stringify({ kind: 'comp-item', cidx, iidx }));
                            ev.dataTransfer?.setDragImage?.(itemRow, 10, 10);
                        });
                        itemRow.addEventListener('dragover', (ev) => {
                            ev.preventDefault();
                        });
                        itemRow.addEventListener('drop', (ev) => {
                            ev.preventDefault();
                            try {
                                const data = JSON.parse(ev.dataTransfer?.getData('text/plain') || '{}');
                                if (data.kind === 'comp-item') {
                                    const fromC = Number(data.cidx);
                                    const fromI = Number(data.iidx);
                                    const toI = iidx;
                                    if (!Array.isArray(node.compartments[fromC]?.items)) return;
                                    const [moved] = node.compartments[fromC].items.splice(fromI, 1);
                                    if (!Array.isArray(node.compartments[cidx].items)) node.compartments[cidx].items = [];
                                    node.compartments[cidx].items.splice(toI, 0, moved);
                                    renderItems();
                                    ns.Editor.render?.draw?.(app);
                                }
                            } catch (e) {
                                console.log('[Editor.attributes] drop item error', e);
                            }
                        });
                    });
                }

                renderItems();
                addItemBtn.addEventListener('click', () => {
                    node.compartments[cidx].items = Array.isArray(node.compartments[cidx].items) ? node.compartments[cidx].items : [];
                    node.compartments[cidx].items.push('');
                    renderItems();
                    ns.Editor.render?.draw?.(app);
                });

                // Compartment field events
                keyInput.addEventListener('input', () => {
                    node.compartments[cidx].key = keyInput.value;
                    ns.Editor.render?.draw?.(app);
                });
                toggleBtn.addEventListener('click', () => {
                    node.compartments[cidx].collapsed = !node.compartments[cidx].collapsed;
                    toggleBtn.textContent = node.compartments[cidx].collapsed ? 'Expand' : 'Collapse';
                    ns.Editor.render?.draw?.(app);
                });
                delBtn.addEventListener('click', () => {
                    node.compartments.splice(cidx, 1);
                    renderCompartments();
                    ns.Editor.render?.draw?.(app);
                });

                // Drag events for compartments
                wrapper.addEventListener('dragstart', (ev) => {
                    ev.dataTransfer?.setData('text/plain', JSON.stringify({ kind: 'comp', cidx }));
                    ev.dataTransfer?.setDragImage?.(wrapper, 10, 10);
                });
                wrapper.addEventListener('dragover', (ev) => {
                    ev.preventDefault();
                });
                wrapper.addEventListener('drop', (ev) => {
                    ev.preventDefault();
                    try {
                        const data = JSON.parse(ev.dataTransfer?.getData('text/plain') || '{}');
                        if (data.kind === 'comp') {
                            const from = Number(data.cidx);
                            const to = cidx;
                            if (from === to) return;
                            const [moved] = node.compartments.splice(from, 1);
                            node.compartments.splice(to, 0, moved);
                            renderCompartments();
                            ns.Editor.render?.draw?.(app);
                        }
                    } catch (e) {
                        console.log('[Editor.attributes] drop comp error', e);
                    }
                });

                compList.appendChild(wrapper);
            });
        }

        renderCompartments();

        addCompBtn.addEventListener('click', () => {
            node.compartments.push({ key: 'compartment', items: [], collapsed: false });
            renderCompartments();
            ns.Editor.render?.draw?.(app);
        });

        // Advanced properties section at the bottom (고급 속성 섹션 - 하단에 배치)
        const advancedSection = document.createElement('div');
        advancedSection.className = 'attr-advanced-section';
        advancedSection.style.cssText = 'margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--vscode-panel-border);';

        const advancedToggle = document.createElement('button');
        advancedToggle.textContent = '▼ Show Advanced Properties';
        advancedToggle.className = 'btn-toggle-advanced';
        advancedToggle.style.cssText =
            'width: 100%; padding: 4px 8px; background: transparent; color: var(--vscode-descriptionForeground); border: none; cursor: pointer; font-size: 11px; text-align: left; opacity: 0.7; transition: opacity 0.2s;';
        advancedToggle.onmouseenter = () => {
            advancedToggle.style.opacity = '1';
        };
        advancedToggle.onmouseleave = () => {
            advancedToggle.style.opacity = '0.7';
        };

        const advancedContainer = document.createElement('div');
        advancedContainer.className = 'attr-advanced-container';
        advancedContainer.style.cssText =
            'display: none; margin-top: 12px; padding: 12px; background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 4px;';

        const advancedField = (label, input) => {
            const group = document.createElement('div');
            group.className = 'attr-field';
            group.style.cssText = 'margin-bottom: 8px;';
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            labelEl.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: var(--vscode-foreground); opacity: 0.9;';
            input.style.cssText =
                'width: 100%; padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; box-sizing: border-box;';
            group.appendChild(labelEl);
            group.appendChild(input);
            advancedContainer.appendChild(group);
        };

        advancedField('X', xInput);
        advancedField('Y', yInput);
        advancedField('Width', wInput);
        advancedField('Height', hInput);

        let advancedVisible = false;
        advancedToggle.addEventListener('click', () => {
            advancedVisible = !advancedVisible;
            advancedContainer.style.display = advancedVisible ? 'block' : 'none';
            advancedToggle.textContent = advancedVisible ? '▲ Hide Advanced Properties' : '▼ Show Advanced Properties';
        });

        advancedSection.appendChild(advancedToggle);
        advancedSection.appendChild(advancedContainer);
        container.appendChild(advancedSection);

        if (ns.Editor.ui && ns.Editor.ui.PropertyPanel) {
            // 기존 내용을 모두 지우고 PropertyPanel만 표시
            container.innerHTML = '';

            try {
                ns.Editor.ui.PropertyPanel.render(container, node, app);
            } catch (e) {
                console.error('[Editor.attributes] PropertyPanel render error', e);
                container.innerHTML = '<div class="property-error">속성 패널 로드 실패</div>';
            }
        } else {
            console.warn('[Editor.attributes] PropertyPanel NOT found!');
        }

        // 확장 포인트: 외부 extension이 attribute 패널을 확장할 수 있도록
        try {
            const event = new CustomEvent('selab:attributes-rendered', {
                detail: { container, node, app },
            });
            window.dispatchEvent(event);
        } catch (e) {}
    }

    ns.Editor.attributes = { render, setVisible };
})();
