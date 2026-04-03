/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * PropertyPanel 제약조건 - 속성 간 연동 제약, 타입별 제약 적용
 * PropertyPanel.js에서 분리
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.ui = ns.Editor.ui || {};
    ns.Editor.ui._constraints = ns.Editor.ui._constraints || {};

    const constraints = ns.Editor.ui._constraints;

    /**
     * 초기 렌더링 시 현재 노드 상태에 따라 제약 조건 적용
     */
    constraints.applyInitialConstraints = function (panel, node, propertyRules) {
        const constraintDefs = propertyRules.PROPERTY_CONSTRAINTS;
        if (!constraintDefs) return;

        Object.entries(constraintDefs).forEach(([propName, constraint]) => {
            const currentValue = node[propName];
            const rule = currentValue === true ? constraint.whenTrue : constraint.whenFalse;
            if (!rule) return;

            if (rule.disable) {
                rule.disable.forEach(dep => constraints.setPropertyEnabled(panel, dep, false));
            }
            if (rule.enable) {
                rule.enable.forEach(dep => constraints.setPropertyEnabled(panel, dep, true));
            }
        });
    };

    /**
     * 타입별 초기값 강제 제약 적용 (TYPE_CONSTRAINTS 기반)
     */
    constraints.applyTypeConstraints = function (panel, node, propertyRules) {
        const typeConstraints = propertyRules.TYPE_CONSTRAINTS;
        if (!typeConstraints) return;

        const nodeType = node.type || node.kind;
        if (!nodeType) return;

        const rule = typeConstraints[nodeType];
        if (!rule) return;

        Object.entries(rule).forEach(([propName, cfg]) => {
            if (cfg.forceTrue && node[propName] !== true) {
                node[propName] = true;
                constraints._updateWidgetValue(panel, propName, true);
            }
            if (cfg.disable) {
                constraints.setPropertyEnabled(panel, propName, false);
            }
        });
    };

    /**
     * 타입별 항상 비활성화 속성 적용 (TYPE_DISABLED_PROPERTIES 기반)
     */
    constraints.applyTypeDisabledProperties = function (panel, node, propertyRules) {
        const typeDisabled = propertyRules.TYPE_DISABLED_PROPERTIES;
        if (!typeDisabled) return;

        const nodeType = node.type || node.kind;
        if (!nodeType) return;

        const disabledProps = typeDisabled[nodeType];
        if (!disabledProps) return;

        disabledProps.forEach(propName => {
            constraints.setPropertyEnabled(panel, propName, false);
        });
    };

    /**
     * 속성 변경 시 제약 조건 적용 (연동 속성 강제 변경 및 비활성화)
     */
    constraints.applyConstraints = function (panel, propName, newValue, node, app, propertyRules) {
        const constraintDefs = propertyRules.PROPERTY_CONSTRAINTS;
        if (!constraintDefs || !constraintDefs[propName]) return;

        const constraint = constraintDefs[propName];
        const rule = newValue === true ? constraint.whenTrue : constraint.whenFalse;
        if (!rule) return;

        // 강제 off: 연동 속성을 false로 변경 후 서버에 전송
        if (rule.forceOff) {
            rule.forceOff.forEach(dep => {
                if (node[dep] === true) {
                    const oldVal = node[dep];
                    node[dep] = false;
                    constraints.setPropertyValue(panel, dep, false);
                    panel.postPropertyChange(node, dep, oldVal, false);
                }
            });
        }

        // 강제 on: 연동 속성을 true로 변경 후 서버에 전송
        if (rule.forceOn) {
            rule.forceOn.forEach(dep => {
                if (node[dep] !== true) {
                    const oldVal = node[dep];
                    node[dep] = true;
                    constraints.setPropertyValue(panel, dep, true);
                    panel.postPropertyChange(node, dep, oldVal, true);
                }
            });
        }

        // 강제 값 설정: string/null 등 boolean 외 타입 강제
        if (rule.forceValue) {
            Object.entries(rule.forceValue).forEach(([dep, val]) => {
                if (node[dep] !== val) {
                    const oldVal = node[dep];
                    node[dep] = val;
                    constraints._updateWidgetValue(panel, dep, val);
                    panel.postPropertyChange(node, dep, oldVal, val);
                }
            });
        }

        // 비활성화
        if (rule.disable) {
            rule.disable.forEach(dep => constraints.setPropertyEnabled(panel, dep, false));
        }

        // 활성화
        if (rule.enable) {
            rule.enable.forEach(dep => constraints.setPropertyEnabled(panel, dep, true));
        }
    };

    /**
     * 특정 속성의 위젯 값을 UI에서 업데이트 (boolean 외 타입 포함)
     */
    constraints._updateWidgetValue = function (panel, propName, value) {
        const containers = [panel._coreContainer, panel._advancedContainer].filter(Boolean);
        containers.forEach(container => {
            const group = container.querySelector(`[data-prop="${propName}"]`);
            if (!group) return;
            if (value === true || value === false) {
                const checkbox = group.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.checked = value === true;
            } else {
                // radio: null/undefined이면 'unset' 선택, 아니면 해당 값 선택
                const radios = group.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => {
                    radio.checked = (value === null || value === undefined)
                        ? radio.value === 'unset'
                        : radio.value === String(value);
                });
            }
        });
    };

    /**
     * Core/Advanced 탭 모두에서 특정 속성 위젯 활성화/비활성화
     */
    constraints.setPropertyEnabled = function (panel, propName, enabled) {
        const containers = [panel._coreContainer, panel._advancedContainer].filter(Boolean);
        containers.forEach(container => {
            const group = container.querySelector(`[data-prop="${propName}"]`);
            if (!group) return;
            // checkbox
            const checkbox = group.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.disabled = !enabled;
                const wrapper = checkbox.closest('.property-checkbox-wrapper');
                if (wrapper) wrapper.style.cursor = enabled ? 'pointer' : 'default';
            }
            // radio
            group.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.disabled = !enabled;
            });
        });
    };

    /**
     * 특정 속성 값을 UI에 반영 (setPropertyValue alias)
     */
    constraints.setPropertyValue = function (panel, propName, value) {
        constraints._updateWidgetValue(panel, propName, value);
    };

    console.log('[PropertyPanelConstraints] Module loaded');
})();
