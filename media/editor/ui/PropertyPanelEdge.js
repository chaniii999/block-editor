/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * PropertyPanel 에지/색상 - 에지 속성 패널 및 색상 지정 기능
 * PropertyPanel.js에서 분리
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.ui = ns.Editor.ui || {};
    ns.Editor.ui._edge = ns.Editor.ui._edge || {};

    const edge = ns.Editor.ui._edge;

    /**
     * 에지 데이터 여부 확인
     * @param {Object} data
     * @returns {boolean}
     */
    edge.isEdgeData = function (data) {
        return Boolean(data && (data.source !== undefined || data.target !== undefined) && (data.kind !== undefined || data.type !== undefined) && !data.declaredName && !data.elementId);
    };

    /**
     * 에지(연결선) 속성 패널 렌더링
     * @param {HTMLElement} container
     * @param {Object} edgeData - 에지 데이터
     * @param {Object} app
     */
    edge.renderEdgeProperties = function (panel, container, edgeData, app) {
        const header = document.createElement('div');
        header.className = 'property-header';
        header.textContent = panel.t('edge.header', '연결 속성');
        container.appendChild(header);

        const content = document.createElement('div');
        content.style.padding = '12px';
        container.appendChild(content);

        // QN 마지막 세그먼트 추출
        const lastName = (qn) => {
            if (!qn) return '';
            const segs = String(qn).split('::');
            return segs[segs.length - 1].trim();
        };

        // Source/Target 행 생성 헬퍼
        const addNodeRow = (labelText, nodeId) => {
            const group = document.createElement('div');
            group.className = 'property-group';

            const label = document.createElement('label');
            label.className = 'property-label';
            label.textContent = labelText;
            group.appendChild(label);

            const row = document.createElement('div');
            row.className = 'property-edge-node-row';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'property-edge-node-name';
            nameSpan.textContent = lastName(nodeId) || panel.t('widgets.reference.none', '(없음)');
            row.appendChild(nameSpan);

            if (nodeId) {
                const navBtn = document.createElement('button');
                navBtn.className = 'property-edge-nav-btn';
                navBtn.textContent = '→';
                navBtn.title = panel.t('edge.navigateToNode', '해당 노드로 이동');
                navBtn.addEventListener('click', () => {
                    edge.navigateToCellByNodeId(nodeId);
                });
                row.appendChild(navBtn);
            }

            group.appendChild(row);
            content.appendChild(group);
        };

        addNodeRow(panel.t('edge.source', '출발'), edgeData.source);
        addNodeRow(panel.t('edge.target', '도착'), edgeData.target);

        // Type 행
        const typeGroup = document.createElement('div');
        typeGroup.className = 'property-group';
        const typeLabel = document.createElement('label');
        typeLabel.className = 'property-label';
        typeLabel.textContent = panel.t('edge.type', '타입');
        typeGroup.appendChild(typeLabel);
        const typeValue = document.createElement('div');
        typeValue.className = 'property-inline-value';
        typeValue.textContent = edgeData.type || edgeData.kind || '';
        typeGroup.appendChild(typeValue);
        content.appendChild(typeGroup);
    };

    /**
     * ID로 mxGraph 셀을 찾아 해당 위치로 카메라 이동 및 선택
     * @param {string} nodeId - 노드 QN 또는 ID
     */
    edge.navigateToCellByNodeId = function (nodeId) {
        const graph = window.SELAB?.Editor?._mxGraph;
        if (!graph || !nodeId) return;
        try {
            const cells = Object.values(graph.getModel().cells || {});
            const targetCell = cells.find(c =>
                c._nodeData?.id === nodeId ||
                c._nodeData?.qualifiedName === nodeId
            );
            if (targetCell) {
                graph.scrollCellToVisible(targetCell, true);
                graph.setSelectionCell(targetCell);
                console.log('[PropertyPanel] navigateToCellByNodeId:', nodeId);
            } else {
                console.warn('[PropertyPanel] navigateToCellByNodeId: 셀을 찾을 수 없음:', nodeId);
            }
        } catch (err) {
            console.error('[PropertyPanel] navigateToCellByNodeId 오류:', err);
        }
    };

    /**
     * 노드 색상 지정 섹션 렌더링 (Core 탭 하단)
     * @param {HTMLElement} container
     * @param {Object} node
     */
    edge.renderColorSection = function (panel, container, node) {
        const section = document.createElement('div');
        section.className = 'property-color-section';

        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'property-group-header';
        sectionHeader.textContent = panel.t('edge.appearance', '표시');
        section.appendChild(sectionHeader);

        const addColorRow = (labelText, colorKey, currentValue) => {
            const group = document.createElement('div');
            group.className = 'property-group property-color-row';

            const label = document.createElement('label');
            label.className = 'property-label';
            label.textContent = labelText;
            group.appendChild(label);

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.className = 'property-color-input';
            colorInput.value = currentValue || '#ffffff';

            colorInput.addEventListener('change', () => {
                edge.handleColorChange(node, colorKey, colorInput.value);
            });

            group.appendChild(colorInput);
            section.appendChild(group);
        };

        addColorRow(panel.getLabel('fillColor', { label: '채우기 색상' }), 'fillColor', node.fillColor);

        container.appendChild(section);
    };

    /**
     * 노드 색상 변경 핸들러
     * @param {Object} node
     * @param {string} colorKey - 'fillColor' | 'strokeColor'
     * @param {string} colorValue - hex 색상값
     */
    edge.handleColorChange = function (node, colorKey, colorValue) {
        const post = ns.Editor?.post;
        const api = ns.Editor?.vscode || window.vscode || null;
        const payload = {
            type: 'update-color',
            id: node.id,
            elementId: node.elementId || '',
            qualifiedName: node.qualifiedName || node.id || '',
            [colorKey]: colorValue,
        };
        // mxGraph 셀 스타일 즉시 업데이트
        edge._applyColorToCell(node.id, colorKey, colorValue);

        if (typeof post === 'function') {
            post(payload);
        } else if (api && typeof api.postMessage === 'function') {
            api.postMessage(payload);
        } else {
            console.warn('[PropertyPanel] handleColorChange: 메시지 전송 API 없음');
        }
    };

    /**
     * mxGraph 셀의 fillColor/strokeColor 즉시 적용
     * @param {string} nodeId
     * @param {string} colorKey
     * @param {string} colorValue
     */
    edge._applyColorToCell = function (nodeId, colorKey, colorValue) {
        try {
            const graph = window.__mxGraph;
            if (!graph) {
                console.warn('[PropertyPanel] _applyColorToCell: window.__mxGraph 없음');
                return;
            }

            const model = graph.getModel();
            const cells = Object.values(model.cells || {});

            const targetCell = cells.find(c => c._nodeData?.id === nodeId);
            if (!targetCell) {
                // _nodeData.qualifiedName으로 fallback 검색
                const fallback = cells.find(c => c._nodeData?.qualifiedName === nodeId);
                if (!fallback) {
                    console.warn('[PropertyPanel] _applyColorToCell: 셀을 찾을 수 없음. nodeId=', nodeId);
                    return;
                }
                const mxKeyFb = colorKey === 'fillColor' ? 'fillColor' : 'strokeColor';
                let styleStrFb = fallback.style || '';
                styleStrFb = styleStrFb.replace(new RegExp(`${mxKeyFb}=[^;]*`, 'g'), `${mxKeyFb}=${colorValue}`);
                if (!styleStrFb.includes(`${mxKeyFb}=`)) {
                    styleStrFb = styleStrFb.replace(/;$/, '') + `;${mxKeyFb}=${colorValue}`;
                }
                model.beginUpdate();
                try { model.setStyle(fallback, styleStrFb); } finally { model.endUpdate(); }
                graph.refresh(fallback);
                return;
            }

            const mxKey = colorKey === 'fillColor' ? 'fillColor' : 'strokeColor';
            // 현재 스타일 문자열에서 해당 색상 키를 교체하거나 추가
            let styleStr = targetCell.style || '';
            if (styleStr.includes(`${mxKey}=`)) {
                styleStr = styleStr.replace(new RegExp(`${mxKey}=[^;]*`, 'g'), `${mxKey}=${colorValue}`);
            } else {
                styleStr = styleStr.replace(/;$/, '') + `;${mxKey}=${colorValue}`;
            }

            model.beginUpdate();
            try {
                model.setStyle(targetCell, styleStr);
            } finally {
                model.endUpdate();
            }
            graph.refresh(targetCell);
        } catch (e) {
            console.error('[PropertyPanel] _applyColorToCell 오류:', e);
        }
    };

    /**
     * PascalCase 타입명을 사람이 읽기 쉬운 형태로 변환
     */
    edge.formatTypeName = function (type) {
        if (!type) return 'Unknown';
        const keywords = [
            'Enumeration', 'Allocation', 'Calculation', 'Documentation',
            'Occurrence', 'Requirement', 'Connection', 'Constraint',
            'Definition', 'Interface', 'Attribute', 'Metadata', 'Concern',
            'Package', 'Comment', 'Action', 'State', 'Usage', 'Part',
            'Item', 'Port', 'Case', 'View', 'Use',
            'Accept', 'Assign', 'Assignment', 'Exhibit', 'Perform', 'Satisfy',
        ];
        const pattern = new RegExp(`(${keywords.join('|')})`, 'gi');
        const parts = type.match(pattern);
        if (parts && parts.length > 0) {
            return parts.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
        // fallback: PascalCase 분리
        return type.replace(/([a-z])([A-Z])/g, '$1 $2')
                   .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    console.log('[PropertyPanelEdge] Module loaded');
})();
