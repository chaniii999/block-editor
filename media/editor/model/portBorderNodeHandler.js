/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * Port / Border Node 처리 로직
 * - nodeTransformer.js에서 분리된 Port 표시, Border Node 판별/처리 모듈
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.model = ns.Editor.model || {};

    // typeRegistry 참조 (지연 바인딩)
    const getTypeRegistry = () => ns.Editor.config?.typeRegistry || {};

    // ========================================
    // Port 표시 설정 (displaySettings.js와 동일)
    // ========================================
    const PORT_DISPLAY_MODE = {
        BORDER_ONLY: 'border_only',
        COMPARTMENT_ONLY: 'compartment_only',
        BOTH: 'both',
        AUTO: 'auto',
    };

    /**
     * Border Node 타입 판별
     * @param {Object} element - 요소 객체
     * @param {Object} cache - 모델 캐시
     * @param {Object} settings - 표시 설정
     * @returns {boolean} border node 여부
     */
    function isBorderNodeType(element, cache, settings) {
        const kindLower = String(element.type || '').toLowerCase();

        const typeReg = getTypeRegistry();
        
        // Port 처리 (설정 기반)
        if (typeReg.isPortType?.(kindLower) || kindLower === 'portusage' || kindLower === 'portdefinition') {
            return shouldRenderPortAsBorderNode(element, cache, settings);
        }

        // ItemUsage는 ActionUsage의 parameter인 경우만 border node
        if (typeReg.isItemUsageType?.(kindLower) || kindLower === 'itemusage') {
            if (element.parent) {
                const parentEl = cache.getElement(element.parent);
                if (parentEl) {
                    const parentType = String(parentEl.type || '').toLowerCase();
                    return typeReg.isActionType?.(parentType) || parentType.includes('action');
                }
            }
        }

        // PartUsage: direction(in/out/inout)이 설정되면 부모의 border node
        if (kindLower === 'partusage') {
            const dir = String(element.direction || '').toLowerCase();
            if (dir === 'in' || dir === 'out' || dir === 'inout') {
                return true;
            }
        }

        return false;
    }

    /**
     * Port를 Border Node로 렌더링할지 결정
     * @param {Object} port - Port 요소
     * @param {Object} cache - 모델 캐시
     * @param {Object} settings - 표시 설정
     * @returns {boolean}
     */
    function shouldRenderPortAsBorderNode(port, cache, settings) {
        const mode = settings?.portDisplayMode || PORT_DISPLAY_MODE.BOTH;

        // nested port가 있는 end feature PortUsage → 독립 노드로 표시 (border node 아님)
        // 언어서버에서 borderNodes가 설정된 경우 = nested port를 가진 end feature
        if (Array.isArray(port.borderNodes) && port.borderNodes.length > 0) {
            return false;
        }

        // 부모가 Package인 경우 → 일반 노드로 표시 (border node 아님)
        if (port.parent) {
            const parentEl = cache.getElement(port.parent);
            if (parentEl) {
                const parentTypeLower = String(parentEl.type || '').toLowerCase();
                const typeReg = getTypeRegistry();
                if (typeReg.isPackageType?.(parentTypeLower) || parentTypeLower === 'package' || parentTypeLower.includes('package')) {
                    console.log(`[portBorderNodeHandler] Port "${port.name}": parent is Package → Regular node (not border)`);
                    return false;
                }
            }
        }

        // COMPARTMENT_ONLY: Border Node 사용 안 함
        if (mode === PORT_DISPLAY_MODE.COMPARTMENT_ONLY) {
            return false;
        }

        // BORDER_ONLY: 항상 Border Node
        if (mode === PORT_DISPLAY_MODE.BORDER_ONLY) {
            return true;
        }

        // BOTH: Border Node로 표시하되, Compartment에도 포함
        if (mode === PORT_DISPLAY_MODE.BOTH) {
            return true;
        }

        // AUTO: 컨텍스트 기반 결정
        if (mode === PORT_DISPLAY_MODE.AUTO) {
            return shouldRenderPortAsBorderNodeAuto(port, cache, settings);
        }

        // 기본값: Border Node
        return true;
    }

    /**
     * Auto 모드: Port를 Border Node로 렌더링할지 자동 결정
     * @param {Object} port - Port 요소
     * @param {Object} cache - 모델 캐시
     * @param {Object} settings - 표시 설정
     * @returns {boolean}
     */
    function shouldRenderPortAsBorderNodeAuto(port, cache, settings) {
        const autoRules = settings?.autoRules || {};

        // 1. 특정 타입은 항상 Border Node
        const alwaysBorderTypes = autoRules.alwaysBorderTypes || [];
        if (alwaysBorderTypes.includes(port.type)) {
            console.log(`[portBorderNodeHandler] Port "${port.name}" type "${port.type}" always border (alwaysBorderTypes)`);
            return true;
        }

        // 2. 부모의 Port 개수 확인
        if (port.parent) {
            const parentEl = cache.getElement(port.parent);

            if (parentEl) {
                // 부모의 모든 Port 찾기
                const typeReg = getTypeRegistry();
                const siblingPorts = cache.getChildrenByParent(port.parent).filter(e => {
                    const kindLower = String(e.type || '').toLowerCase();
                    const isPort = typeReg.isPortType?.(kindLower) || kindLower === 'portusage' || kindLower === 'portdefinition';
                    return isPort &&
                           (e.parent === port.parent ||
                            e.parent === parentEl.name ||
                            e.parent === parentEl.id);
                });

                const threshold = autoRules.portCountThreshold || 5;
                const useBorder = siblingPorts.length <= threshold;


                // Port 개수가 threshold 이하면 Border Node
                return useBorder;
            }
        }

        // 기본값: Border Node
        return true;
    }

    /**
     * Port를 부모 노드의 Compartment에 추가
     * @param {Array} portNodes - Port 노드 배열
     * @param {Object} cache - 모델 캐시
     * @param {Object} settings - 표시 설정
     */
    function processPortCompartments(portNodes, cache, settings) {
        const mode = settings?.portDisplayMode || PORT_DISPLAY_MODE.BOTH;

        // BORDER_ONLY 모드면 Compartment에 추가하지 않음
        if (mode === PORT_DISPLAY_MODE.BORDER_ONLY) {
            return;
        }

        // Compartment 표시 설정 확인
        if (!settings?.compartment?.showPortCompartment) {
            return;
        }


        // 포트 계층 구조 맵 생성 (id -> 포트, id -> 자식 배열)
        const portById = new Map();
        for (const port of portNodes) {
            if (port?.id) {
                portById.set(port.id, port);
            }
        }

        const INDENT_UNIT = '\u00A0\u00A0\u00A0\u00A0';
        const childrenByPortId = new Map();
        for (const port of portNodes) {
            const parentId = port?.parent;
            if (parentId && portById.has(parentId)) {
                if (!childrenByPortId.has(parentId)) {
                    childrenByPortId.set(parentId, []);
                }
                childrenByPortId.get(parentId).push(port);
            }
        }

        const addPortWithChildren = (compartment, port, depth = 0) => {
            const indent = depth === 0 ? '' : INDENT_UNIT.repeat(depth);
            const label = `${indent}${formatPortLabel(port)}`;
            compartment.items.push(label);
            compartment._nodes.push(port);

            const children = childrenByPortId.get(port.id) || [];
            for (let i = children.length - 1; i >= 0; i--) {
                addPortWithChildren(compartment, children[i], depth + 1);
            }
        };

        // 부모별 루트 포트 그룹화
        const rootPortsByParent = new Map();
        for (const port of portNodes) {
            if (!port?.parent) {
                console.warn(`[portBorderNodeHandler] ⚠️ Port "${port?.name}" has no parent, skipping compartment`);
                continue;
            }

            if (portById.has(port.parent)) {
                // 다른 포트의 자식
                continue;
            }

            if (!rootPortsByParent.has(port.parent)) {
                rootPortsByParent.set(port.parent, []);
            }
            rootPortsByParent.get(port.parent).push(port);
        }

        for (const [parentKey, rootPorts] of rootPortsByParent.entries()) {
            const parent = cache.getElement(parentKey);

            if (!parent) {
                console.warn(`[portBorderNodeHandler] ⚠️ Parent "${parentKey}" not found for ports`);
                continue;
            }

            // 부모가 Package인 경우 → compartment에 추가하지 않음 (일반 노드로 표시)
            const parentTypeLower = String(parent.type || '').toLowerCase();
            const typeReg = getTypeRegistry();
            if (typeReg.isPackageType?.(parentTypeLower) || parentTypeLower === 'package' || parentTypeLower.includes('package')) {
                console.log(`[portBorderNodeHandler] Parent "${parent.name}": Package → Skip compartment (regular node)`);
                continue;
            }

            if (!parent.compartments) {
                parent.compartments = [];
            }

            let portCompartment = parent.compartments.find(c =>
                c.key === 'ports' || c.key === 'ownedPort' || c.key === 'nestedPort'
            );

            if (!portCompartment) {
                const compartmentKey = 'ports';
                portCompartment = {
                    key: compartmentKey,
                    items: [],
                    collapsed: settings?.compartment?.collapsedByDefault || false,
                    _nodes: [],
                };
                parent.compartments.push(portCompartment);
            } else {
                portCompartment.items = [];
                portCompartment._nodes = [];
            }

            for (let i = rootPorts.length - 1; i >= 0; i--) {
                addPortWithChildren(portCompartment, rootPorts[i], 0);
            }

        }
    }

    /**
     * Port 레이블 포맷팅 (SysON 형식: "name : typeName")
     * @param {Object} port - Port 노드
     * @returns {string} 포맷된 레이블
     */
    function formatPortLabel(port) {
        let label = port.name || '';

        // 타입 정보
        if (port.declaredType || port.typeName) {
            label += ' : ' + (port.declaredType || port.typeName);
        }

        // 방향성 표시 (in/out/inout)
        if (port.direction) {
            const dir = String(port.direction).toLowerCase();
            if (dir === 'in') {
                label = '→ ' + label;
            } else if (dir === 'out') {
                label = '← ' + label;
            } else if (dir === 'inout') {
                label = '↔ ' + label;
            }
        }

        return label;
    }

    /**
     * ItemUsage를 부모 노드의 Compartment에 추가 (Port와 동일한 방식)
     * @param {Array} itemNodes - ItemUsage 노드 배열
     * @param {Object} cache - 모델 캐시
     * @param {Object} settings - 표시 설정
     */
    function processItemCompartments(itemNodes, cache, settings) {
        const mode = settings?.portDisplayMode || PORT_DISPLAY_MODE.BOTH;

        // BORDER_ONLY 모드면 Compartment에 추가하지 않음
        if (mode === PORT_DISPLAY_MODE.BORDER_ONLY) {
            return;
        }


        for (const item of itemNodes) {
            if (!item.parent) {
                console.warn(`[portBorderNodeHandler] ⚠️ Item "${item.name}" has no parent, skipping compartment`);
                continue;
            }

            const parent = cache.getElement(item.parent);

            if (!parent) {
                console.warn(`[portBorderNodeHandler] ⚠️ Item "${item.name}" parent "${item.parent}" not found`);
                continue;
            }

            // 부모가 Package인 경우 → compartment에 추가하지 않음 (일반 노드로 표시)
            const parentTypeLower = String(parent.type || '').toLowerCase();
            const typeReg = getTypeRegistry();
            if (typeReg.isPackageType?.(parentTypeLower) || parentTypeLower === 'package' || parentTypeLower.includes('package')) {
                console.log(`[portBorderNodeHandler] Item "${item.name}": parent is Package → Skip compartment (regular node)`);
                continue;
            }

            // Compartment 초기화
            if (!parent.compartments) {
                parent.compartments = [];
            }

            // 'items' compartment 찾기 또는 생성
            let itemCompartment = parent.compartments.find(c =>
                c.key === 'items' || c.key === 'parameter' || c.key === 'ownedItem'
            );

            if (!itemCompartment) {
                const compartmentKey = 'items';
                itemCompartment = {
                    key: compartmentKey,
                    items: [],
                    collapsed: settings?.compartment?.collapsedByDefault || false,
                    _nodes: [],
                };
                parent.compartments.push(itemCompartment);
            }

            // Item 레이블 생성: "direction name : typeName"
            const label = formatItemLabel(item);
            itemCompartment.items.push(label);
            itemCompartment._nodes.push(item);

        }
    }

    /**
     * ItemUsage 레이블 포맷팅 (SysON 형식: "direction name : typeName")
     * @param {Object} item - ItemUsage 노드
     * @returns {string} 포맷된 레이블
     */
    function formatItemLabel(item) {
        let label = item.name || '';

        // 타입 정보
        const itemTypeName = item.declaredType || item.typeName;
        const itemTypeLower = String(item.type || item.kind || item.nodeType || '').toLowerCase();
        const shouldShowItemTypeName = itemTypeName &&
            !((itemTypeLower === 'item' || itemTypeLower === 'itemusage' || itemTypeLower === 'directeditem') &&
                String(itemTypeName).toLowerCase() === 'item');
        if (shouldShowItemTypeName) {
            label += ' : ' + itemTypeName;
        }

        // 방향성 표시 (in/out/inout)
        if (item.direction) {
            const dir = String(item.direction).toLowerCase();
            if (dir === 'in') {
                label = '→ ' + label;
            } else if (dir === 'out') {
                label = '← ' + label;
            } else if (dir === 'inout') {
                label = '↔ ' + label;
            }
        }

        return label;
    }

    /**
     * AttributeDefinition 레이블 (compartment 텍스트)
     * @param {Object} attr - AttributeDefinition 노드
     * @returns {string}
     */
    function formatAttributeDefinitionLabel(attr) {
        let label = attr.name || attr.id || '';
        const nameAlreadyHasType = label && label.includes(' : ');
        if ((attr.declaredType || attr.typeName) && !nameAlreadyHasType) {
            label += ' : ' + (attr.declaredType || attr.typeName);
        }
        return label;
    }

    /**
     * AttributeDefinition을 부모 노드 attributes compartment 텍스트로 흡수 (독립 노드 미표시)
     * @param {Array} attributeDefNodes
     * @param {Object} cache
     */
    function processAttributeDefinitionCompartments(attributeDefNodes, cache) {
        if (!Array.isArray(attributeDefNodes) || attributeDefNodes.length === 0 || !cache) {
            return;
        }

        const attrsByParent = new Map();
        for (const attr of attributeDefNodes) {
            if (!attr?.parent) {
                console.warn(`[portBorderNodeHandler] AttributeDefinition "${attr?.name || attr?.id}" has no parent, skipping`);
                continue;
            }
            const parentKey = String(attr.parent);
            if (!attrsByParent.has(parentKey)) {
                attrsByParent.set(parentKey, []);
            }
            attrsByParent.get(parentKey).push(attr);
        }

        for (const [parentKey, attrs] of attrsByParent.entries()) {
            const parent = cache.getElement(parentKey);
            if (!parent) {
                console.warn(`[portBorderNodeHandler] Parent "${parentKey}" not found for AttributeDefinitions`);
                continue;
            }

            if (!parent.compartments) {
                parent.compartments = [];
            }

            let attrCompartment = parent.compartments.find((c) =>
                c.key === 'attributes' || c.key === 'ownedAttribute' || c.key === 'nestedAttribute'
            );

            if (!attrCompartment) {
                attrCompartment = {
                    key: 'attributes',
                    items: [],
                    collapsed: false,
                    _nodes: [],
                };
                parent.compartments.push(attrCompartment);
            } else {
                if (!Array.isArray(attrCompartment.items)) {
                    attrCompartment.items = [];
                }
                if (!Array.isArray(attrCompartment._nodes)) {
                    attrCompartment._nodes = [];
                }
            }

            const existingIds = new Set(
                (attrCompartment._nodes || []).map((n) => String(n?.id || '')).filter(Boolean)
            );
            const existingLabels = new Set(
                (attrCompartment.items || []).map((item) => String(typeof item === 'string' ? item : (item?.name || item?.label || '')))
            );

            const sorted = [...attrs].sort((a, b) =>
                String(a.name || a.id || '').localeCompare(String(b.name || b.id || ''))
            );

            for (const attr of sorted) {
                const aid = String(attr.id || '');
                if (aid && existingIds.has(aid)) {
                    continue;
                }
                const label = formatAttributeDefinitionLabel(attr);
                if (existingLabels.has(label)) {
                    continue;
                }
                attrCompartment.items.push(label);
                attrCompartment._nodes.push(attr);
                if (aid) {
                    existingIds.add(aid);
                }
                existingLabels.add(label);
            }
        }
    }

    /**
     * direction 값으로부터 side를 결정 (in→N, out→S, inout→N)
     * Language Server가 side를 명시한 경우 그 값을 우선 사용
     * @param {string|undefined} explicitSide - LS에서 온 side 값
     * @param {string|undefined} direction
     * @returns {string} 'N'|'S'|'E'|'W'
     */
    function determineSideFromDirection(explicitSide, direction) {
        if (explicitSide && explicitSide !== 'E') return explicitSide.toUpperCase();
        if (!direction) return explicitSide || 'E';
        const dir = String(direction).toLowerCase();
        if (dir === 'in' || dir === 'inout') return 'N';
        if (dir === 'out') return 'S';
        return explicitSide || 'E';
    }

    /**
     * Border Node 데이터 구조 생성
     * @param {Object} borderNode - 원본 border node
     * @returns {Object} border node 데이터
     */
    function createBorderNodeData(borderNode) {
        const rawBorderNodeType = String(borderNode.type || borderNode.kind || borderNode.nodeType || '').toLowerCase();
        const typeReg = getTypeRegistry();
        const isItemUsage = typeReg.isItemUsageType?.(rawBorderNodeType) ||
            rawBorderNodeType === 'itemusage' ||
            rawBorderNodeType === 'directeditem';
        const isPartUsage = rawBorderNodeType === 'partusage' || rawBorderNodeType === 'directedpart';
        const isParameterPin = borderNode.isParameter === true || String(borderNode.nodeType || '').toLowerCase() === 'parameter';

        // 방향성 추출
        let direction = borderNode.direction || borderNode.visibility || undefined;

        // 타입 정보 추출
        let typeName = undefined;
        if (borderNode.declaredType) {
            typeName = borderNode.declaredType;
        } else if (borderNode.heritage && borderNode.heritage.length > 0) {
            typeName = borderNode.heritage[0];
        }

        // direction으로 side 결정 (offset은 processBorderNodes에서 그룹 단위로 재계산)
        const side = determineSideFromDirection(borderNode.side, direction);

        const resolvedBorderNodeKind = borderNode.type ||
            borderNode.kind ||
            (isParameterPin ? 'Parameter' : (isItemUsage ? 'ItemUsage' : (isPartUsage ? 'PartUsage' : 'PortUsage')));

        return {
            id: borderNode.id,
            name: borderNode.name || borderNode.declaredName || '',
            type: resolvedBorderNodeKind,
            kind: resolvedBorderNodeKind,
            nodeType: isParameterPin ? 'parameter' : (isItemUsage ? 'item' : 'port'),
            isParameter: isParameterPin || undefined,
            typeName: typeName,
            declaredType: borderNode.declaredType || typeName,
            qualifiedName: borderNode.qualifiedName || borderNode.id,
            declaredName: borderNode.declaredName || borderNode.name || '',
            declaredShortName: borderNode.declaredShortName || undefined,
            elementId: borderNode.elementId || undefined,
            visibility: borderNode.visibility || undefined,
            direction: direction,
            side: side,
            offset: borderNode.offset ?? 0.5,
            x: 0,
            y: 0,
            width: 10,
            height: 10,
        };
    }

    /**
     * 같은 side 보더노드 배열에 대해 offset을 좌→우 균등 분배, 중앙(0.45~0.55) 회피
     * @param {Array} nodes - 같은 side의 border node 데이터 배열 (순서 유지)
     */
    function assignOffsets(nodes) {
        const n = nodes.length;
        if (n === 0) return;

        // 좌측 영역 [L_MIN, L_MAX], 우측 영역 [R_MIN, R_MAX]
        const L_MIN = 0.15, L_MAX = 0.45;
        const R_MIN = 0.55, R_MAX = 0.85;
        const leftLen = L_MAX - L_MIN;   // 0.30
        const rightLen = R_MAX - R_MIN;  // 0.30
        const totalLen = leftLen + rightLen; // 0.60

        if (n === 1) {
            nodes[0].offset = 0.25;
            return;
        }

        // n개를 가상 선분(0 ~ totalLen)에 균등 배치 후 실제 offset으로 변환
        for (let i = 0; i < n; i++) {
            const t = totalLen * (i / (n - 1));
            let offset;
            if (t <= leftLen) {
                offset = L_MIN + t;
            } else {
                offset = R_MIN + (t - leftLen);
            }
            nodes[i].offset = Math.round(offset * 1000) / 1000;
        }
    }

    /**
     * Border Node를 부모 노드에 연결하고, 같은 side끼리 offset을 자동 계산
     * @param {Array} borderNodes - border node 배열
     * @param {Object} cache - 모델 캐시
     */
    function processBorderNodes(borderNodes, cache) {
        // parentId → { side → borderNodeData[] } 매핑
        const parentSideMap = new Map();

        for (const borderNode of borderNodes) {
            if (!borderNode.parent) {
                continue;
            }

            const parent = cache.getElement(borderNode.parent);
            if (!parent) {
                continue;
            }

            // SysON 규칙: Definition과 InterfaceUsage에는 Border Node를 표시하지 않음
            const parentTypeLower = String(parent.type || '').toLowerCase();
            const parentKindLower = String(parent.kind || '').toLowerCase();
            const typeReg = getTypeRegistry();

            if (typeReg.isInterfaceType?.(parentTypeLower) || parentTypeLower === 'interfaceusage' || parentKindLower === 'interfaceusage') {
                continue;
            }

            if (typeReg.isInterfaceType?.(parentTypeLower) || parentTypeLower === 'interfacedefinition' || parentKindLower === 'interfacedefinition') {
                continue;
            }

            if (typeReg.isDefinitionType?.(parentTypeLower) || parentTypeLower.includes('definition')) {
                continue;
            }

            if (!parent.borderNodes) parent.borderNodes = [];

            const borderNodeData = createBorderNodeData(borderNode);
            parent.borderNodes.push(borderNodeData);

            // side별 그룹 수집 (offset 계산용)
            const pid = String(parent.id || parent.name || '');
            if (!parentSideMap.has(pid)) parentSideMap.set(pid, new Map());
            const sideMap = parentSideMap.get(pid);
            const side = borderNodeData.side;
            if (!sideMap.has(side)) sideMap.set(side, []);
            sideMap.get(side).push(borderNodeData);
        }

        // 같은 부모+side 그룹 단위로 offset 재계산
        for (const sideMap of parentSideMap.values()) {
            for (const nodes of sideMap.values()) {
                assignOffsets(nodes);
            }
        }
    }

    // 모듈 내보내기
    ns.Editor.model.portBorderNodeHandler = {
        PORT_DISPLAY_MODE,
        isBorderNodeType,
        shouldRenderPortAsBorderNode,
        shouldRenderPortAsBorderNodeAuto,
        processPortCompartments,
        formatPortLabel,
        processItemCompartments,
        formatItemLabel,
        processAttributeDefinitionCompartments,
        formatAttributeDefinitionLabel,
        createBorderNodeData,
        processBorderNodes,
        assignOffsets,
        determineSideFromDirection,
    };

})();
