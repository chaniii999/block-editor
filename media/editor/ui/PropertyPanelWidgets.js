/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * PropertyPanel 위젯 팩토리 - 속성 패널 입력 위젯 생성
 * PropertyPanel.js에서 분리
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.ui = ns.Editor.ui || {};
    ns.Editor.ui._widgets = ns.Editor.ui._widgets || {};

    const widgets = ns.Editor.ui._widgets;

    widgets.resizeTextareaElement = function (textarea) {
        if (!(textarea instanceof HTMLTextAreaElement)) {
            return;
        }

        const parentElement = textarea.parentElement;
        if (!textarea.isConnected || !parentElement) {
            return;
        }

        const textareaRect = textarea.getBoundingClientRect();
        const parentRect = parentElement.getBoundingClientRect();
        if (textareaRect.width <= 0 || parentRect.width <= 0) {
            return;
        }

        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    };

    widgets.resizeTextareasInContainer = function (container) {
        if (!(container instanceof HTMLElement)) {
            return;
        }

        const textareas = container.querySelectorAll('.property-textarea');
        textareas.forEach((textarea) => widgets.resizeTextareaElement(textarea));
    };

    widgets.translateOptionLabel = function (panel, propName, option) {
        return panel.t(`options.${propName}.${option}`, option);
    };

    widgets.resolveTypeSelectValue = function (value, localTypes, importTypes) {
        const currentValue = value !== undefined && value !== null ? String(value).trim() : '';
        if (!currentValue) {
            return '';
        }

        const normalizedLocalTypes = Array.isArray(localTypes)
            ? localTypes.map((typeName) => String(typeName).trim()).filter(Boolean)
            : [];
        const normalizedImportTypes = Array.isArray(importTypes)
            ? importTypes.map((typeName) => String(typeName).trim()).filter(Boolean)
            : [];

        if (normalizedLocalTypes.includes(currentValue) || normalizedImportTypes.includes(currentValue)) {
            return currentValue;
        }

        if (currentValue.includes('::')) {
            return '';
        }

        const matchingImportedTypes = normalizedImportTypes.filter((typeName) => {
            const segments = typeName.split('::');
            return segments[segments.length - 1] === currentValue;
        });

        if (matchingImportedTypes.length === 1) {
            return matchingImportedTypes[0];
        }

        return '';
    };

    /**
     * Text 위젯 생성
     */
    widgets.createTextWidget = function (panel, propName, value, editable, node, app) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'property-input';
        input.value = value !== undefined && value !== null ? String(value) : '';
        input.readOnly = !editable;

        if (!editable) {
            input.classList.add('property-readonly');
        }

        if (editable) {
            let lastCommittedValue = input.value;
            const commitChange = () => {
                if (input.value !== lastCommittedValue) {
                    lastCommittedValue = input.value;
                    panel.handlePropertyChange(node, propName, input.value, app);
                }
            };
            input.addEventListener('blur', commitChange);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commitChange();
                }
            });
        }

        return input;
    };

    /**
     * Multiplicity 위젯 생성
     * - 표시: "[0..5]" → "0..5" (brackets 제거)
     * - 저장: "0..5" → "[0..5]" (brackets 자동 래핑)
     */
    widgets.createMultiplicityWidget = function (panel, propName, value, editable, node, app) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'property-input';
        input.placeholder = '예: 0..1, *, 2..4';
        // 표시값: "[0..5]" → "0..5"
        const stripped = value ? String(value).replace(/^\[|\]$/g, '') : '';
        input.value = stripped;
        input.readOnly = !editable;

        if (!editable) {
            input.classList.add('property-readonly');
        }

        if (editable) {
            let lastCommittedValue = stripped;
            const normalizeMultiplicity = (raw) => {
                const trimmed = raw.trim();
                if (!trimmed) return '';
                // 이미 brackets로 감싸진 경우 그대로 반환
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) return trimmed;
                return `[${trimmed}]`;
            };
            const commitChange = () => {
                const normalized = normalizeMultiplicity(input.value);
                const displayVal = normalized.replace(/^\[|\]$/g, '');
                if (normalized !== normalizeMultiplicity(lastCommittedValue)) {
                    lastCommittedValue = displayVal;
                    input.value = displayVal;
                    panel.handlePropertyChange(node, propName, normalized, app);
                }
            };
            input.addEventListener('blur', commitChange);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commitChange();
                }
            });
        }

        return input;
    };

    /**
     * Checkbox 위젯 생성 (SysON 스타일: 체크박스와 레이블을 한 줄에)
     */
    widgets.createCheckboxWidget = function (panel, propName, value, editable, node, app, label) {
        const wrapper = document.createElement('label');
        wrapper.className = 'property-checkbox-wrapper';
        wrapper.style.cursor = editable ? 'pointer' : 'default';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'property-checkbox';
        checkbox.checked = value === true;
        checkbox.disabled = !editable;

        if (editable) {
            checkbox.addEventListener('change', () => {
                panel.handlePropertyChange(node, propName, checkbox.checked, app);
            });
        }

        const labelText = document.createElement('span');
        labelText.className = 'property-checkbox-label';
        labelText.textContent = label;

        wrapper.appendChild(checkbox);
        wrapper.appendChild(labelText);
        return wrapper;
    };

    /**
     * Radio 위젯 생성
     */
    widgets.createRadioWidget = function (panel, propName, value, options, editable, node, app) {
        const wrapper = document.createElement('div');
        wrapper.className = 'property-radio-group';

        options.forEach((option) => {
            const label = document.createElement('label');
            label.className = 'property-radio-label';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.className = 'property-radio';
            radio.name = `${node.id}_${propName}`;
            radio.value = option;
            // 값이 없거나 'none'이면 'unset' 선택
            radio.checked = value === option || ((!value || value === 'none') && option === 'unset');
            radio.disabled = !editable;

            if (editable) {
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        panel.handlePropertyChange(node, propName, option, app);
                    }
                });
            }

            label.appendChild(radio);
            label.appendChild(document.createTextNode(widgets.translateOptionLabel(panel, propName, option)));
            wrapper.appendChild(label);
        });

        return wrapper;
    };

    /**
     * Type Select 위젯 생성 (비동기로 타입 목록 로드)
     */
    widgets.createTypeSelectWidget = function (panel, propName, value, editable, node, app) {
        const wrapper = document.createElement('div');
        wrapper.className = 'property-select-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.width = '100%';

        const select = document.createElement('select');
        select.className = 'property-select';
        select.disabled = !editable;
        select.style.width = '100%';

        const loadingOption = document.createElement('option');
        loadingOption.textContent = panel.t('widgets.typeSelect.loading', '타입 로딩 중...');
        loadingOption.value = '';
        select.appendChild(loadingOption);

        if (!editable) {
            select.classList.add('property-readonly');
        }

        const messageHandler = (event) => {
            const message = event.data;
            if (message.type === 'response-available-types' && message.nodeId === node.id) {
                select.innerHTML = '';
                
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = panel.t('widgets.typeSelect.none', '(없음)');
                select.appendChild(defaultOption);

                if (message.localTypes && message.localTypes.length > 0) {
                    const groupTitle = document.createElement('optgroup');
                    groupTitle.label = panel.t('widgets.typeSelect.currentPackage', '현재 패키지');
                    message.localTypes.sort((a,b) => a.localeCompare(b)).forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t;
                        opt.textContent = t;
                        groupTitle.appendChild(opt);
                    });
                    select.appendChild(groupTitle);
                }

                if (message.importTypes && message.importTypes.length > 0) {
                    const groupTitle = document.createElement('optgroup');
                    groupTitle.label = panel.t('widgets.typeSelect.importedWorkspace', '가져온 항목 / 워크스페이스');
                    message.importTypes.sort((a,b) => a.localeCompare(b)).forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t;
                        opt.textContent = t;
                        groupTitle.appendChild(opt);
                    });
                    select.appendChild(groupTitle);
                }

                select.value = widgets.resolveTypeSelectValue(value, message.localTypes, message.importTypes);
                window.removeEventListener('message', messageHandler);
            }
        };

        window.addEventListener('message', messageHandler);

        try {
            const api = ns.Editor.vscode || window.vscode || null;
            const payload = {
                type: 'request-available-types',
                nodeId: node.id,
                nodeType: node.type || node.kind,
                qualifiedName: node.qualifiedName,
                declaredName: node.declaredName
            };
            if (api && typeof api.postMessage === 'function') {
                api.postMessage(payload);
            } else if (ns.Editor.post) {
                ns.Editor.post(payload);
            }
        } catch (e) {
            console.error('[PropertyPanelWidgets] request-available-types 오류:', e);
        }

        if (editable) {
            select.addEventListener('change', () => {
                panel.handlePropertyChange(node, propName, select.value, app);
            });
        }

        wrapper.appendChild(select);
        return wrapper;
    };

    /**
     * Textarea 위젯 생성
     */
    widgets.createTextareaWidget = function (panel, propName, value, editable, node, app) {
        const wrapper = document.createElement('div');
        wrapper.className = 'property-textarea-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '4px';
        wrapper.style.width = '100%';

        const textarea = document.createElement('textarea');
        textarea.className = 'property-textarea';
        textarea.value = value !== undefined && value !== null ? String(value) : '';
        textarea.rows = 1;
        textarea.readOnly = !editable;
        textarea.style.overflow = 'hidden';
        textarea.style.resize = 'none';

        // 초기 높이 설정
        requestAnimationFrame(() => {
            widgets.resizeTextareaElement(textarea);
        });

        // 입력 시 높이 자동 조절
        textarea.addEventListener('input', () => {
            widgets.resizeTextareaElement(textarea);
        });

        if (!editable) {
            textarea.classList.add('property-readonly');
        }

        wrapper.appendChild(textarea);

        if (editable) {
            let lastCommittedValue = textarea.value;
            const commitChange = (newValue) => {
                if (newValue !== lastCommittedValue) {
                    lastCommittedValue = newValue;
                    panel.handlePropertyChange(node, propName, newValue, app);
                }
            };

            if (propName === 'documentation' || propName === 'comment') {
                const btnGroup = document.createElement('div');
                btnGroup.className = 'property-textarea-buttons';
                btnGroup.style.display = 'flex';
                btnGroup.style.gap = '4px';
                btnGroup.style.justifyContent = 'flex-end';

                const doneBtn = document.createElement('button');
                doneBtn.textContent = panel.t('actions.done', 'Done');
                doneBtn.className = 'property-button';
                doneBtn.style.padding = '2px 8px';
                doneBtn.style.fontSize = '11px';
                doneBtn.style.cursor = 'pointer';

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = panel.t('actions.remove', 'Remove');
                deleteBtn.className = 'property-button';
                deleteBtn.style.padding = '2px 8px';
                deleteBtn.style.fontSize = '11px';
                deleteBtn.style.cursor = 'pointer';

                doneBtn.addEventListener('click', () => {
                    console.log(`[PropertyPanel] ${propName} 완료 버튼 클릭, value:`, textarea.value);
                    commitChange(textarea.value);
                });

                deleteBtn.addEventListener('click', () => {
                    console.log(`[PropertyPanel] ${propName} 제거 버튼 클릭`);
                    textarea.value = '';
                    commitChange('');
                });

                btnGroup.appendChild(doneBtn);
                btnGroup.appendChild(deleteBtn);
                wrapper.appendChild(btnGroup);
            } else {
                textarea.addEventListener('blur', () => commitChange(textarea.value));
                textarea.addEventListener('keydown', (e) => {
                    // Ctrl+Enter로 저장 (textarea는 Enter로 줄바꿈이므로)
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        commitChange(textarea.value);
                    }
                });
            }
        }

        return wrapper;
    };

    /**
     * Reference 위젯 생성 (읽기 전용 링크)
     */
    widgets.createReferenceWidget = function (panel, propName, value, editable, node, app) {
        const div = document.createElement('div');
        div.className = 'property-reference';
        div.textContent = value !== undefined && value !== null ? String(value) : panel.t('widgets.reference.none', '(없음)');

        if (value) {
            div.classList.add('property-reference-link');
            div.style.cursor = 'pointer';
            div.title = panel.t('widgets.reference.navigate', '클릭하여 이동');

            div.addEventListener('click', () => {
                // TODO: 참조 대상으로 이동하는 기능 구현
                console.log('[PropertyPanel] Navigate to reference:', value);
            });
        }

        return div;
    };

    /**
     * Edge Tag Select 위젯 생성 (Subset/Redefine 에지 생성·삭제용)
     * - mxGraph에서 기존 에지를 스캔하여 칩으로 표시
     * - 같은 종류의 Usage 노드를 드롭다운에 표시
     * - 선택 시 add-connection, 칩 ✕ 클릭 시 delete-connection 메시지 전송
     * @param {Object} panel - PropertyPanel 인스턴스
     * @param {string} propName - 속성명 (subsets, redefines)
     * @param {*} value - 현재 값 (미사용, mxGraph에서 직접 스캔)
     * @param {boolean} editable - 편집 가능 여부
     * @param {Object} node - 선택된 노드 데이터
     * @param {Object} app - 앱 인스턴스
     * @param {Object} metadata - 속성 메타데이터 (edgeType 포함)
     */
    widgets.createEdgeTagSelectWidget = function (panel, propName, value, editable, node, app, metadata) {
        const wrapper = document.createElement('div');
        wrapper.className = 'property-edge-tag-wrapper';

        const edgeType = metadata?.edgeType || propName;
        const nodeKind = node.type || node.kind || '';
        const nodeQN = node.qualifiedName || node.id || '';
        const nodeName = _lastSegment(nodeQN);

        // mxGraph 참조
        const graph = window.SELAB?.Editor?._mxGraph || window.__mxGraph;
        if (!graph) {
            wrapper.textContent = panel.t('widgets.edgeTagSelect.graphNotAvailable', '(그래프를 사용할 수 없음)');
            return wrapper;
        }

        console.log(`[EdgeTagSelect] init: nodeQN='${nodeQN}', nodeKind='${nodeKind}', edgeType='${edgeType}'`);

        // 기존 에지에서 연결된 타깃 수집
        const existingTargets = _findExistingEdgeTargets(graph, nodeQN, edgeType);
        console.log(`[EdgeTagSelect] existingTargets:`, JSON.stringify(existingTargets));

        // edgeType에 따라 후보 수집 (subset: 형제 feature, redefine: 상위 Definition feature)
        const candidates = _findRedefineSubsetCandidates(graph, nodeQN, existingTargets, edgeType);
        console.log(`[EdgeTagSelect] candidates:`, JSON.stringify(candidates));

        // 칩 컨테이너
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'property-edge-tags';
        wrapper.appendChild(tagsContainer);

        // 칩 렌더링 함수
        const renderTags = () => {
            tagsContainer.innerHTML = '';
            existingTargets.forEach(tgt => {
                const chip = document.createElement('span');
                chip.className = 'property-edge-tag';
                chip.textContent = tgt.label;

                if (editable) {
                    const removeBtn = document.createElement('span');
                    removeBtn.className = 'property-edge-tag-remove';
                    removeBtn.textContent = '×';
                    removeBtn.title = panel.t('widgets.edgeTagSelect.deleteConnection', '연결 삭제');
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        console.log(`[EdgeTagSelect] DELETE click: sourceQN='${nodeQN}', targetQN='${tgt.qn}', edgeType='${edgeType}'`);
                        _postDeleteConnection(nodeQN, tgt.qn, edgeType);
                        // 로컬 상태 갱신
                        const idx = existingTargets.indexOf(tgt);
                        if (idx >= 0) {
                            existingTargets.splice(idx, 1);
                            candidates.push(tgt);
                            candidates.sort((a, b) => a.label.localeCompare(b.label));
                        }
                        renderTags();
                        renderOptions();
                    });
                    chip.appendChild(removeBtn);
                }

                tagsContainer.appendChild(chip);
            });
        };

        // 드롭다운 생성
        const select = document.createElement('select');
        select.className = 'property-edge-tag-select';
        select.disabled = !editable;
        wrapper.appendChild(select);

        const renderOptions = () => {
            select.innerHTML = '';
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = candidates.length > 0
                ? panel.t('widgets.edgeTagSelect.selectableCount', '{count}개 선택 가능').replace('{count}', String(candidates.length))
                : panel.t('widgets.edgeTagSelect.noResults', '결과가 없습니다.');
            defaultOpt.disabled = true;
            defaultOpt.selected = true;
            select.appendChild(defaultOpt);

            candidates.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.qn;
                opt.textContent = c.label;
                select.appendChild(opt);
            });
        };

        if (editable) {
            select.addEventListener('change', () => {
                const selectedQN = select.value;
                if (!selectedQN) return;
                const idx = candidates.findIndex(c => c.qn === selectedQN);
                if (idx < 0) return;

                const selected = candidates.splice(idx, 1)[0];
                existingTargets.push(selected);

                _postAddConnection(nodeQN, selected.qn, edgeType, nodeKind);

                renderTags();
                renderOptions();
            });
        }

        renderTags();
        renderOptions();

        return wrapper;
    };

    // ========== Edge Tag Select 내부 헬퍼 ==========

    /** QN의 마지막 세그먼트 반환 */
    function _lastSegment(qn) {
        if (!qn) return '';
        const segs = String(qn).split('::');
        return segs[segs.length - 1].replace(/^['"]|['"]$/g, '').trim();
    }

    /** mxGraph에서 현재 노드와 연결된 특정 타입 에지의 타깃 목록 반환 */
    function _findExistingEdgeTargets(graph, nodeQN, edgeType) {
        const targets = [];
        const cells = graph.getModel().cells || {};
        const nodeQNLower = String(nodeQN).toLowerCase();

        for (const key of Object.keys(cells)) {
            const cell = cells[key];
            if (!cell._edgeData) continue;
            const ed = cell._edgeData;
            const kind = String(ed.type || ed.kind || '').toLowerCase();
            if (kind !== edgeType.toLowerCase()) continue;

            const srcQN = String(ed.source || '');
            const tgtQN = String(ed.target || '');

            if (srcQN.toLowerCase() === nodeQNLower && tgtQN) {
                // 라벨: ParentDef::featureName 형식 (예: Engine::cyl)
                const tgtParent = _parentSegment(tgtQN);
                const tgtName = _lastSegment(tgtQN);
                targets.push({
                    qn: tgtQN,
                    name: tgtName,
                    label: tgtParent ? `${tgtParent}::${tgtName}` : tgtName,
                });
            }
        }
        return targets;
    }

    /**
     * redefine/subset 후보 수집
     * - subsetting: 같은 컨테이너(Definition) 내 형제 feature (자기 자신 제외)
     * - redefinition: 상위 Definition(specialization/inheritance)의 자식 feature
     */
    function _findRedefineSubsetCandidates(graph, selfQN, existingTargets, edgeType) {
        const cells = graph.getModel().cells || {};
        const existingQNs = new Set(existingTargets.map(t => t.qn.toLowerCase()));
        const selfQNLower = String(selfQN).toLowerCase();

        const containerQN = _parentQN(selfQN);
        if (!containerQN) return [];

        // 후보 부모 QN Set 구성
        const candidateParentQNs = new Set();

        // subsetting일 때: 이미 subsetting 에지의 source인 feature QN 수집 (후보 제외용)
        let featuresAlreadySubsetting = null;
        if (edgeType === 'subsetting') {
            candidateParentQNs.add(containerQN.toLowerCase());
            featuresAlreadySubsetting = new Set();
            for (const key of Object.keys(cells)) {
                const cell = cells[key];
                if (!cell._edgeData) continue;
                const kind = String(cell._edgeData.type || cell._edgeData.kind || '').toLowerCase();
                if (kind !== 'subsetting') continue;
                const srcQN = String(cell._edgeData.source || '').toLowerCase();
                if (srcQN) featuresAlreadySubsetting.add(srcQN);
            }
        } else {
            // redefinition: 상위 Definition의 자식 feature
            const superDefQNs = _findSuperDefinitions(cells, containerQN);
            superDefQNs.forEach(q => candidateParentQNs.add(q.toLowerCase()));
        }

        if (candidateParentQNs.size === 0) return [];

        const candidates = [];
        for (const key of Object.keys(cells)) {
            const cell = cells[key];
            if (!cell._nodeData) continue;
            const nd = cell._nodeData;
            const cellQN = nd.qualifiedName || nd.id || '';
            if (!cellQN) continue;

            // 자기 자신 제외
            if (cellQN.toLowerCase() === selfQNLower) continue;

            const cellParentQN = _parentQN(cellQN);
            if (!cellParentQN || !candidateParentQNs.has(cellParentQN.toLowerCase())) continue;

            // 이미 연결된 타깃 제외
            if (existingQNs.has(cellQN.toLowerCase())) continue;

            // subsetting: 이미 다른 feature를 subset하는 feature 제외 (루트 collection만 허용)
            if (featuresAlreadySubsetting && featuresAlreadySubsetting.has(cellQN.toLowerCase())) continue;

            const parentName = _lastSegment(cellParentQN);
            const featureName = _lastSegment(cellQN);
            candidates.push({
                qn: cellQN,
                name: featureName,
                label: parentName ? `${parentName}::${featureName}` : featureName,
            });
        }
        candidates.sort((a, b) => a.label.localeCompare(b.label));
        return candidates;
    }

    /** specialization 에지를 따라 상위 Definition QN 목록 반환 (재귀) */
    function _findSuperDefinitions(cells, defQN) {
        const result = [];
        const visited = new Set();
        const queue = [defQN];

        while (queue.length > 0) {
            const current = queue.shift();
            const currentLower = current.toLowerCase();
            if (visited.has(currentLower)) continue;
            visited.add(currentLower);

            for (const key of Object.keys(cells)) {
                const cell = cells[key];
                if (!cell._edgeData) continue;
                const ed = cell._edgeData;
                const kind = String(ed.type || ed.kind || '').toLowerCase();
                if (kind !== 'specialization' && kind !== 'subclassification' && kind !== 'inheritance') continue;

                const srcQN = String(ed.source || '');
                const tgtQN = String(ed.target || '');

                // specialization: source :> target (source가 자식, target이 부모)
                if (srcQN.toLowerCase() === currentLower && tgtQN) {
                    result.push(tgtQN);
                    queue.push(tgtQN);
                }
            }
        }
        return result;
    }

    /** QN에서 부모 QN 반환 (예: A::B::C → A::B) */
    function _parentQN(qn) {
        if (!qn) return '';
        const s = String(qn);
        const idx = s.lastIndexOf('::');
        return idx > 0 ? s.substring(0, idx) : '';
    }

    /** QN에서 부모 세그먼트의 마지막 이름 반환 (예: A::B::C → B) */
    function _parentSegment(qn) {
        const pqn = _parentQN(qn);
        return pqn ? _lastSegment(pqn) : '';
    }

    /** connection-created 메시지 전송 (MxConnectionHandler.js와 동일한 패턴) */
    function _postAddConnection(sourceQN, targetQN, edgeType, nodeKind) {
        const payload = {
            type: 'connection-created',
            sourceId: sourceQN,
            targetId: targetQN,
            sourceName: _lastSegment(sourceQN),
            targetName: _lastSegment(targetQN),
            sourceKind: nodeKind,
            targetKind: nodeKind,
            edgeType: edgeType,
            edgeToolId: edgeType === 'redefinition' ? 'new_redefinition' : 'new_subsetting',
        };
        console.log('[PropertyPanelWidgets] connection-created:', payload);
        _postMessage(payload);
    }

    /** delete-connection 메시지 전송 (boot.js와 동일한 패턴) */
    function _postDeleteConnection(sourceQN, targetQN, edgeType) {
        const segs = sourceQN.split('::');
        const sourceName = segs.pop();
        const targetName = targetQN.split('::').pop();
        // anonymous redefine scoping을 위해 parent 전달
        const parentName = segs.length > 0
            ? segs[segs.length - 1].replace(/^['"]|['"]$/g, '')
            : undefined;
        const connection = { source: sourceName, target: targetName, type: edgeType };
        if (parentName) connection.parent = parentName;
        const payload = { type: 'delete-connection', connection };
        console.log('[PropertyPanelWidgets] delete-connection:', payload);
        _postMessage(payload);
    }

    /** 메시지 전송 헬퍼 */
    function _postMessage(payload) {
        if (typeof ns.Editor?.post === 'function') {
            ns.Editor.post(payload);
        } else {
            const api = ns.Editor?.vscode || window.vscode || null;
            if (api && typeof api.postMessage === 'function') {
                api.postMessage(payload);
            }
        }
    }

    console.log('[PropertyPanelWidgets] Module loaded');
})();
