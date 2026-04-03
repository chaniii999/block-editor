/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * PropertyPanel - SysML 노드 속성 표시 패널 (Core/Advanced 탭 구조)
 * 분리된 모듈: PropertyPanelWidgets, PropertyPanelEdge, PropertyPanelConstraints,
 *              PropertyPanelTextualView
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.ui = ns.Editor.ui || {};

    // 분리된 모듈 참조
    const widgets = ns.Editor.ui._widgets || {};
    const edgeMod = ns.Editor.ui._edge || {};
    const constraintsMod = ns.Editor.ui._constraints || {};
    const tvMod = ns.Editor.ui._textualView || {};

    const PropertyPanel = {
        _translations: null,
        _activeTab: 'core',

        setTranslations(translations = null) {
            this._translations = translations;
            console.log('[PropertyPanel] Translations updated:', translations?.locale);
        },

        t(key, fallback) {
            if (!this._translations) return fallback;
            const segments = key ? key.split('.') : [];
            let cursor = this._translations;
            for (const segment of segments) {
                if (cursor && typeof cursor === 'object' && segment in cursor) {
                    cursor = cursor[segment];
                } else {
                    return fallback;
                }
            }
            return typeof cursor === 'string' ? cursor : fallback;
        },

        getLabel(propName, metadata) {
            const translationKey = metadata?.translationKey || propName;
            const fallback = metadata?.label || propName;
            return this.t(`labels.${translationKey}`, fallback);
        },

        render(container, node, app) {
            if (!container) {
                console.warn('[PropertyPanel] Container not found');
                return;
            }
            container.innerHTML = '';

            if (!node) {
                const message = this.t('messages.selectNode', '노드를 선택하세요');
                container.innerHTML = `<div class="property-empty">${message}</div>`;
                return;
            }

            // 에지 선택 시 별도 패널 렌더링
            if (edgeMod.isEdgeData(node)) {
                edgeMod.renderEdgeProperties(this, container, node, app);
                return;
            }

            const propertyRules = this.getPropertyRules();
            if (!propertyRules) {
                console.warn('[PropertyPanel] propertyRules not loaded');
                const errorMessage = this.t('messages.loadError', '속성 규칙을 로드할 수 없습니다');
                container.innerHTML = `<div class="property-error">${errorMessage}</div>`;
                return;
            }

            this.renderHeader(container, node);

            // 탭 버튼 영역
            const tabButtons = document.createElement('div');
            tabButtons.className = 'property-tab-buttons';

            const coreTabBtn = document.createElement('button');
            coreTabBtn.className = `property-tab-button ${this._activeTab === 'core' ? 'active' : ''}`;
            coreTabBtn.textContent = this.t('tabs.core', 'Core');
            coreTabBtn.dataset.tab = 'core';

            const advancedTabBtn = document.createElement('button');
            advancedTabBtn.className = `property-tab-button ${this._activeTab === 'advanced' ? 'active' : ''}`;
            advancedTabBtn.textContent = this.t('tabs.advanced', 'Textual Editor');
            advancedTabBtn.dataset.tab = 'advanced';

            tabButtons.appendChild(coreTabBtn);
            tabButtons.appendChild(advancedTabBtn);
            container.appendChild(tabButtons);

            // 탭 콘텐츠 영역
            const tabContents = document.createElement('div');
            tabContents.className = 'property-tab-contents';

            // Core 탭
            const coreContent = document.createElement('div');
            coreContent.className = `property-tab-content ${this._activeTab === 'core' ? 'active' : ''}`;
            coreContent.dataset.tab = 'core';
            this.renderCoreProperties(coreContent, node, propertyRules, app);
            edgeMod.renderColorSection(this, coreContent, node);

            // Textual View 탭
            const advancedContent = document.createElement('div');
            advancedContent.className = `property-tab-content ${this._activeTab === 'advanced' ? 'active' : ''}`;
            advancedContent.dataset.tab = 'advanced';
            tvMod.renderTextualView(this, advancedContent, node, app);

            tabContents.appendChild(coreContent);
            tabContents.appendChild(advancedContent);
            container.appendChild(tabContents);

            this.setupTabSwitching(tabButtons, tabContents);
        },

        setupTabSwitching(tabButtonsContainer, tabContentsContainer) {
            const buttons = tabButtonsContainer.querySelectorAll('.property-tab-button');
            const contents = tabContentsContainer.querySelectorAll('.property-tab-content');
            const resizeActiveTabTextareas = (targetContent) => {
                if (!(targetContent instanceof HTMLElement)) {
                    return;
                }

                requestAnimationFrame(() => {
                    widgets.resizeTextareasInContainer(targetContent);
                });
            };

            buttons.forEach((button) => {
                button.addEventListener('click', () => {
                    const targetTab = button.dataset.tab;
                    this._activeTab = targetTab;

                    buttons.forEach((btn) => btn.classList.remove('active'));
                    contents.forEach((content) => content.classList.remove('active'));

                    button.classList.add('active');
                    const targetContent = tabContentsContainer.querySelector(`[data-tab="${targetTab}"]`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                        resizeActiveTabTextareas(targetContent);
                        if (targetTab === 'advanced') {
                            tvMod.requestSysmlSource(this);
                        }
                    }
                });
            });
        },

        renderHeader(container, node) {
            const header = document.createElement('div');
            header.className = 'property-header';
            const typeName = edgeMod.formatTypeName(node.type || node.kind);
            header.textContent = `${typeName} Properties`;
            container.appendChild(header);
        },

        renderCoreProperties(container, node, propertyRules, app) {
            this._coreContainer = container;
            const coreProps = propertyRules.getCoreProperties(node.type || node.kind);

            if (!coreProps || coreProps.length === 0) {
                const message = this.t('messages.noCoreProperties', 'Core 속성이 없습니다');
                container.innerHTML = `<div class="property-empty">${message}</div>`;
                return;
            }

            coreProps.forEach((propName) => {
                const metadata = propertyRules.getPropertyMetadata(propName);
                if (metadata.hidden === true) return;
                let value = node[propName];

                if (value === undefined || value === null) {
                    if (metadata.type === 'checkbox') {
                        value = false;
                    } else if (metadata.type === 'radio') {
                        value = (metadata.options && metadata.options.includes('unset')) ? 'none' : (metadata.options ? metadata.options[0] : '');
                    } else {
                        value = '';
                    }
                }

                if (propName === 'declaredType' && (!value || String(value).trim() === '')) {
                    return;
                }

                this.renderPropertyField(container, propName, value, metadata, node, app);
            });

            // 공통 Core 위젯 (Comment, Documentation, Visibility)
            const commonWidgets = propertyRules.getCommonCoreWidgets();
            commonWidgets.forEach((widgetName) => {
                if (!coreProps.includes(widgetName)) {
                    const metadata = propertyRules.getPropertyMetadata(widgetName);
                    if (metadata.hidden === true) return;
                    let value = node[widgetName];

                    if (value === undefined) {
                        if (metadata.type === 'checkbox') {
                            value = false;
                        } else if (metadata.type === 'radio') {
                            value = (metadata.options && metadata.options.includes('unset')) ? 'none' : (metadata.options ? metadata.options[0] : '');
                        } else {
                            value = '';
                        }
                    }

                    this.renderPropertyField(container, widgetName, value, metadata, node, app);
                }
            });
        },

        renderAdvancedProperties(container, node, propertyRules, app) {
            this._advancedContainer = container;
            const advancedProps = propertyRules.getAdvancedProperties(node.type || node.kind);

            if (!advancedProps || advancedProps.length === 0) {
                console.warn('[PropertyPanel] No advanced properties found for type:', node.type || node.kind);
                const message = this.t('messages.noAdvancedProperties', 'Advanced 속성이 없습니다');
                container.innerHTML = `<div class="property-empty">${message}</div>`;
                return;
            }

            const groups = propertyRules.ADVANCED_PROPERTY_GROUPS;
            if (groups && groups.length > 0) {
                const propGroupMap = {};
                groups.forEach((g, idx) => g.properties.forEach(p => { propGroupMap[p] = idx; }));

                let lastGroupIdx = -1;
                advancedProps.forEach((propName) => {
                    const metadata = propertyRules.getPropertyMetadata(propName);
                    if (metadata.hidden === true) return;

                    const groupIdx = propGroupMap[propName];
                    if (groupIdx !== undefined && groupIdx !== lastGroupIdx) {
                        lastGroupIdx = groupIdx;
                        const header = document.createElement('div');
                        header.className = 'property-group-header';
                        header.textContent = groups[groupIdx].label;
                        container.appendChild(header);
                    }

                    this.renderAdvancedProp(container, propName, node, propertyRules, app);
                });
            } else {
                advancedProps.forEach(propName => this.renderAdvancedProp(container, propName, node, propertyRules, app));
            }

            // 제약 조건 적용 (분리된 모듈에 위임)
            constraintsMod.applyInitialConstraints(this, node, propertyRules);
            constraintsMod.applyTypeConstraints(this, node, propertyRules);
            constraintsMod.applyTypeDisabledProperties(this, node, propertyRules);
        },

        renderPropertyField(container, propName, value, metadata, node, app) {
            const group = document.createElement('div');
            group.className = 'property-group';
            group.setAttribute('data-prop', propName);

            let widget;
            const widgetType = metadata.type || 'text';
            const editable = metadata.editable !== false;
            const labelText = this.getLabel(propName, metadata);

            switch (widgetType) {
                case 'checkbox':
                    widget = widgets.createCheckboxWidget(this, propName, value, editable, node, app, labelText);
                    break;
                case 'radio': {
                    const radioLabel = document.createElement('label');
                    radioLabel.className = 'property-label';
                    radioLabel.textContent = labelText;
                    group.appendChild(radioLabel);
                    widget = widgets.createRadioWidget(this, propName, value, metadata.options || [], editable, node, app);
                    break;
                }
                case 'textarea': {
                    const textareaLabel = document.createElement('label');
                    textareaLabel.className = 'property-label';
                    textareaLabel.textContent = labelText;
                    group.appendChild(textareaLabel);
                    widget = widgets.createTextareaWidget(this, propName, value, editable, node, app);
                    break;
                }
                case 'reference': {
                    const refLabel = document.createElement('label');
                    refLabel.className = 'property-label';
                    refLabel.textContent = labelText;
                    group.appendChild(refLabel);
                    widget = widgets.createReferenceWidget(this, propName, value, editable, node, app);
                    break;
                }
                case 'inline': {
                    const inlineWrapper = document.createElement('div');
                    inlineWrapper.className = 'property-inline';
                    const inlineLabel = document.createElement('span');
                    inlineLabel.className = 'property-label';
                    inlineLabel.textContent = labelText;
                    inlineWrapper.appendChild(inlineLabel);
                    const inlineValue = document.createElement('span');
                    inlineValue.className = 'property-inline-value';
                    inlineValue.textContent = value !== undefined && value !== null ? String(value) : '';
                    inlineWrapper.appendChild(inlineValue);
                    widget = inlineWrapper;
                    break;
                }
                case 'type-select': {
                    const tsLabel = document.createElement('label');
                    tsLabel.className = 'property-label';
                    tsLabel.textContent = labelText;
                    group.appendChild(tsLabel);
                    widget = widgets.createTypeSelectWidget(this, propName, value, editable, node, app);
                    break;
                }
                case 'label-only': {
                    const labelOnlyWrapper = document.createElement('div');
                    labelOnlyWrapper.className = 'property-inline';
                    const labelOnly = document.createElement('span');
                    labelOnly.className = 'property-label';
                    labelOnly.textContent = labelText;
                    labelOnlyWrapper.appendChild(labelOnly);
                    if (value) {
                        const labelOnlyValue = document.createElement('span');
                        labelOnlyValue.className = 'property-inline-value';
                        labelOnlyValue.textContent = String(value);
                        labelOnlyWrapper.appendChild(labelOnlyValue);
                    }
                    widget = labelOnlyWrapper;
                    break;
                }
                case 'multiplicity': {
                    const multLabel = document.createElement('label');
                    multLabel.className = 'property-label';
                    multLabel.textContent = labelText;
                    group.appendChild(multLabel);
                    widget = widgets.createMultiplicityWidget(this, propName, value, editable, node, app);
                    break;
                }
                case 'edge-tag-select': {
                    const etsLabel = document.createElement('label');
                    etsLabel.className = 'property-label';
                    etsLabel.textContent = labelText;
                    group.appendChild(etsLabel);
                    widget = widgets.createEdgeTagSelectWidget(this, propName, value, editable, node, app, metadata);
                    break;
                }
                case 'text':
                default: {
                    const textLabel = document.createElement('label');
                    textLabel.className = 'property-label';
                    textLabel.textContent = labelText;
                    group.appendChild(textLabel);
                    widget = widgets.createTextWidget(this, propName, value, editable, node, app);
                    break;
                }
            }

            group.appendChild(widget);
            container.appendChild(group);
        },

        renderAdvancedProp(container, propName, node, propertyRules, app) {
            const metadata = propertyRules.getPropertyMetadata(propName);
            if (metadata.hidden === true) return;
            let value = node[propName];

            if (propName === 'shortName' && !value) {
                value = node.declaredShortName || '';
            }

            if (value === undefined) {
                if (metadata.type === 'checkbox') {
                    value = false;
                } else if (metadata.type === 'radio') {
                    value = (metadata.options && metadata.options.includes('unset')) ? 'none' : (metadata.options ? metadata.options[0] : '');
                } else {
                    value = '';
                }
            }

            this.renderPropertyField(container, propName, value, metadata, node, app);
        },

        handlePropertyChange(node, propName, newValue, app) {
            const oldValue = node[propName];
            node[propName] = newValue;

            // 제약 조건 적용 (분리된 모듈에 위임)
            const propertyRules = ns.Editor.config && ns.Editor.config.propertyRules;
            if (propertyRules) {
                constraintsMod.applyConstraints(this, propName, newValue, node, app, propertyRules);
            }

            try {
                if (ns.Editor.render && typeof ns.Editor.render.draw === 'function') {
                    ns.Editor.render.draw(app);
                }
            } catch (drawErr) {
                console.error('[PropertyPanel] draw 오류 (저장은 계속 진행):', drawErr);
            }

            this.postPropertyChange(node, propName, oldValue, newValue);
        },

        postPropertyChange(node, propName, oldValue, newValue) {
            try {
                const nodeId = node?.id;
                const qualifiedName = node?.qualifiedName || node?.id || '';
                const payload = {
                    type: 'update-property',
                    id: nodeId,
                    elementId: node?.elementId || '',
                    qualifiedName,
                    propertyName: propName,
                    oldValue: oldValue,
                    newValue: newValue,
                };

                console.log('[PropertyPanel] postPropertyChange 호출:', {
                    propName, qualifiedName, oldValue, newValue, payload
                });

                const post = ns.Editor.post;
                const api = ns.Editor.vscode || window.vscode || null;

                if (typeof post === 'function') {
                    console.log('[PropertyPanel] ns.Editor.post로 메시지 전송');
                    post(payload);
                } else if (api && typeof api.postMessage === 'function') {
                    console.log('[PropertyPanel] vscode.postMessage로 메시지 전송');
                    api.postMessage(payload);
                } else {
                    console.warn('[PropertyPanel] No postMessage API available - 메시지 전송 불가!');
                }
            } catch (e) {
                console.error('[PropertyPanel] postPropertyChange error', e);
            }
        },

        // 하위 모듈 위임 (기존 API 호환)
        updateTextualView(source, range, baseIndentLength) {
            tvMod.updateTextualView(this, source, range, baseIndentLength);
        },

        // 제약조건 모듈 위임 (기존 API 호환)
        setPropertyEnabled(propName, enabled) {
            constraintsMod.setPropertyEnabled(this, propName, enabled);
        },

        _updateWidgetValue(propName, value) {
            constraintsMod._updateWidgetValue(this, propName, value);
        },

        setPropertyValue(propName, value) {
            constraintsMod.setPropertyValue(this, propName, value);
        },

        applyConstraints(propName, newValue, node, app, propertyRules) {
            constraintsMod.applyConstraints(this, propName, newValue, node, app, propertyRules);
        },

        applyInitialConstraints(node, propertyRules) {
            constraintsMod.applyInitialConstraints(this, node, propertyRules);
        },

        applyTypeConstraints(node, propertyRules) {
            constraintsMod.applyTypeConstraints(this, node, propertyRules);
        },

        applyTypeDisabledProperties(node, propertyRules) {
            constraintsMod.applyTypeDisabledProperties(this, node, propertyRules);
        },

        getPropertyRules() {
            const nsLocal = window.SELAB || {};
            const propertyRules = nsLocal.Editor?.config?.propertyRules;
            if (propertyRules) return propertyRules;
            console.error('[PropertyPanel] propertyRules NOT found in SELAB.Editor.config');
            return null;
        },
    };

    // 네임스페이스에 등록
    ns.Editor.ui.PropertyPanel = PropertyPanel;
    if (ns.Editor._pendingPropertyPanelTranslations) {
        PropertyPanel.setTranslations(ns.Editor._pendingPropertyPanelTranslations);
        delete ns.Editor._pendingPropertyPanelTranslations;
    }

    console.log('[PropertyPanel] Module loaded');
})();
