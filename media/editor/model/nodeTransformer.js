/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 노드 변환 로직 - 원본 노드 데이터를 에디터용 요소로 변환
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.model = ns.Editor.model || {};

    const { shouldShowNodeInEditor } = ns.Editor.model.visibilityFilter;
    
    // typeRegistry 참조 (지연 바인딩)
    const getTypeRegistry = () => ns.Editor.config?.typeRegistry || {};

    // portBorderNodeHandler 참조 (지연 바인딩 — 로드 순서 유연성 확보)
    const getPortHandler = () => ns.Editor.model.portBorderNodeHandler || {};

    const DEFAULT_DISPLAY_SETTINGS = {
        portDisplayMode: 'both',
        autoRules: {
            portCountThreshold: 5,
            alwaysBorderTypes: ['PortDefinition'],
        },
        compartment: {
            showPortCompartment: true,
            collapsedByDefault: false,
        },
        borderNode: {
            showPortBorderNode: true,
            size: 10,
        },
    };

    /**
     * 노드의 doc compartment에서 documentation 텍스트를 추출
     * @param {Object} n - 원본 노드
     * @returns {string|undefined} documentation body 텍스트
     */
    function extractDocumentationFromCompartments(n) {
        const comps = n.compartments;
        if (!Array.isArray(comps)) return undefined;
        for (const comp of comps) {
            if (comp.key !== 'doc' || !Array.isArray(comp.items)) continue;
            const bodies = comp.items
                .map(item => (typeof item === 'object' ? item.body : String(item || '')))
                .filter(Boolean);
            if (bodies.length > 0) return bodies.join('\n');
        }
        return undefined;
    }

    /**
     * 단일 노드를 에디터 요소로 변환
     * @param {Object} n - 원본 노드
     * @param {Object} config - 가시성 설정
     * @param {Map} lastPositions - 마지막 위치 캐시
     * @returns {Object|null} 변환된 요소 또는 null
     */
    function transformNode(n, config, lastPositions) {
        const advanced = config?.advanced || {};
        const pos = lastPositions.get(n.name) || { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 };
        const kindLower = String(n.kind || '').toLowerCase();
        const visibleByConfig = shouldShowNodeInEditor(n?.kind, config);
        const hiddenByConfig = !visibleByConfig;

        // Documentation/Comment/Metadata 처리
        const typeReg = getTypeRegistry();
        if (typeReg.isAnnotationType?.(kindLower) || kindLower === 'documentation' || kindLower === 'comment' || kindLower === 'metadatausage') {
            if (hiddenByConfig && !advanced.showHiddenNodesAsGhost) {
                return null;
            }
            return {
                id: n.id || `${kindLower}_${n.name || Date.now()}`,
                type: kindLower,
                kind: n.kind,
                name: n.name || kindLower,
                body: n.body || '',
                locale: n.locale || undefined,
                range: n.range || undefined,
                parent: n.parent || undefined,
                visibility: n.visibility || undefined,
                x: pos.x,
                y: pos.y,
                width: 200,
                height: 100,
                properties: [],
                hidden: hiddenByConfig,
                _metadata: {
                    isAnnotation: true,
                    renderAsNote: true,
                },
            };
        }

        // Alias 노드 처리
        if (typeReg.isAliasType?.(n.type) || n.type === 'Alias') {
            return {
                id: n.id || `alias_${n.name || Date.now()}`,
                type: 'Alias',
                kind: n.kind || 'Alias',
                name: n.name || 'Alias',
                label: n.label || `«alias»\n${n.name}\nfor ${n.targetName || 'Unknown'}`,
                targetName: n.targetName || 'Unknown',
                range: n.range || undefined,
                parent: undefined,
                x: pos.x,
                y: pos.y,
                width: 150,
                height: 80,
                properties: [],
                hidden: false,
                _metadata: n.metadata || {
                    isAlias: true,
                    targetRef: n.targetName
                },
            };
        }

        // 내부 구현 노드만 숨김 (OccurrenceUsage, EventOccurrenceUsage는 표시)
        const hiddenByHeuristic = typeReg.isHiddenInternalType?.(kindLower) || (
            kindLower.includes('feature') ||
            kindLower.includes('itemflowend') ||
            kindLower.includes('flowend')
        );
        
        /*
        // action flow compartment 항목 필터링 제거 (2025-01-30)
        // StartAction/DoneAction을 독립적인 노드로 렌더링하여 레이아웃 엔진이 처리하도록 변경
        if (n.isActionFlowItem === true) {
            return null;
        }
        */
        
        const hidden = hiddenByConfig || hiddenByHeuristic;

        if (hidden && hiddenByConfig && !advanced.showHiddenNodesAsGhost) {
            return null;
        }

        // Phase 1: per-container diagram kind + control-node roles
        const nameLower = String(n.name || '').toLowerCase();
        const diagramKind = typeReg.isActionDefinitionType?.(kindLower) ? 'activity' : undefined;
        const defaultWidth = 180;
        const defaultHeight = 60;

        // typeRegistry의 determineNodeRole 함수 사용
        let role = typeReg.determineNodeRole?.(kindLower, nameLower) || undefined;

        // [2025-02-05] Snapshot/TimeSlice 노드는 이름이 'start', 'done'이어도
        // Initial/Final 노드 역할(동그라미)로 렌더링되지 않도록 role을 제거함
        if (n.isPortion === true || (n.isPortion && n.isPortion !== 'false') || n.portionKind) {
            role = undefined;
        }

        // 부모 참조 정규화: 객체/아이디/이름을 문자열로 통일
        const rawParent = n.parent || n.container || n.package || n.owner || n.namespace || undefined;
        let parentNorm = typeof rawParent === 'object' && rawParent !== null ? rawParent.id || rawParent.name || undefined : rawParent;
        // 힌트: 정규 이름에 '::'가 있을 경우, 앞부분을 부모로 간주
        if (!parentNorm) {
            const qn = String(n.id || n.name || '').trim();
            const QNU = window.SELAB.Editor.utils.QualifiedNameUtils;
            const parentPath = QNU.getParentQualifiedName(qn);
            if (parentPath) parentNorm = parentPath;
        }

        const isFixedDiamond = role === 'decision' || role === 'merge';
        let resolvedWidth = isFixedDiamond ? 72 : defaultWidth;
        let resolvedHeight = isFixedDiamond ? 72 : defaultHeight;

        if (role === 'fork' || role === 'join') {
            resolvedHeight = Math.max(defaultHeight * 2, 120);
        }

        // StartAction / DoneAction 크기 설정
        if (kindLower === 'startaction' || kindLower === 'initialnode' || (role === 'initial')) {
            resolvedWidth = 20;
            resolvedHeight = 20;
        } else if (kindLower === 'doneaction' || kindLower === 'finalnode' || (role === 'final')) {
            resolvedWidth = 24;
            resolvedHeight = 24;
        }

        return {
            id: n.id || `element_${n.name}`,
            type: (n.type || n.kind || 'element').toLowerCase(),
            kind: n.kind,
            // subsetting/redefinition 구문이 name에 포함된 경우 제거 (예: "smallEng :>eng" → "smallEng")
            name: (n.name && typeof n.name === 'string' && /\s*:>>?\s*/.test(n.name)) ? n.name.split(/\s*:>>?\s*/)[0].trim() : n.name,
            range: n.range || undefined,
            parent: parentNorm,
            visibility: n.visibility || undefined,
            direction: n.direction || undefined,
            multiplicity: n.multiplicity || undefined,
            declaredType: n.declaredType || undefined,
            until: n.until || undefined,
            body: n.body || undefined,
            guard: n.guard || undefined,
            thenBody: n.thenBody || undefined,
            elseBody: n.elseBody || undefined,
            compartments: n.compartments || undefined,
            borderNodes: n.borderNodes || undefined,  // Language Server에서 보낸 borderNodes 유지
            // SysON 스타일: isAbstract/isVariation/isIndividual 속성 전달
            isAbstract: n.isAbstract || undefined,
            isVariation: n.isVariation || undefined,
            isIndividual: n.isIndividual || undefined,
            // Language Extension 키워드 스테레오타입 전달
            // declaredShortName을 stereotype으로 사용 (예: #scenario, #cause, #situation 등)
            stereotype: n.stereotype || n.declaredShortName || undefined,
            // Snapshot/TimeSlice 식별을 위한 속성 전달
            isPortion: n.isPortion || undefined,
            portionKind: n.portionKind || undefined,
            // Import된 패키지 식별 (레이아웃 순서 결정에 사용)
            isImported: n.isImported || undefined,
            // PropertyPanel용 추가 SysML 속성
            elementId: n.elementId || undefined,
            qualifiedName: n.qualifiedName || undefined,
            declaredShortName: n.declaredShortName || undefined,
            declaredName: n.declaredName || undefined,
            isComposite: n.isComposite || undefined,
            isConjugated: n.isConjugated || undefined,
            isDerived: n.isDerived || undefined,
            isEnd: n.isEnd || undefined,
            isOrdered: n.isOrdered || undefined,
            isUnique: n.isUnique || undefined,
            isVariable: n.isVariable || undefined,
            isConstant: n.isConstant || undefined,
            isReference: n.isReference || undefined,
            mayTimeVary: n.mayTimeVary || undefined,
            isSufficient: n.isSufficient || undefined,
            isNonunique: n.isNonunique || undefined,
            isModelLevelEvaluable: n.isModelLevelEvaluable || undefined,
            isReadOnly: n.isReadOnly || undefined,
            reqId: n.reqId || undefined,
            value: n.value || undefined,
            isImpliedIncluded: n.isImpliedIncluded || undefined,
            isLibraryElement: n.isLibraryElement || undefined,
            comment: n.comment || undefined,
            documentation: n.documentation || extractDocumentationFromCompartments(n) || undefined,
            nestedSpecParentIds: n.nestedSpecParentIds || undefined,
            nestedSpecParentNames: n.nestedSpecParentNames || undefined,
            specializationTargets: n.specializationTargets || undefined,
            // PropertyJsonStore 오버라이드로 병합된 색상 속성
            fillColor: n.fillColor || undefined,
            strokeColor: n.strokeColor || undefined,
            x: pos.x,
            y: pos.y,
            width: resolvedWidth,
            height: resolvedHeight,
            properties: [],
            hidden: hidden,
            diagramKind,
            role,
        };
    }

    /**
     * 노드 배열을 에디터 요소로 변환하고 Border Node 처리
     * @param {Array} nodes - 원본 노드 배열
     * @param {Object} config - 가시성 설정
     * @returns {Object} { elements, cache }
     */
    function transformNodes(nodes, config) {
        const lastPositions = new Map();
        const settings = config?.displaySettings || DEFAULT_DISPLAY_SETTINGS;
        const ph = getPortHandler();

        // 1단계: 모든 노드를 요소로 변환
        const elements = nodes
            .map((n) => transformNode(n, config, lastPositions))
            .filter(Boolean)
            .filter((e) => !ns.Editor.utils.isRelationshipNode(e));
        
        // Language Server에서 이미 borderNodes를 보낸 요소 확인
        const elementsWithLSBorderNodes = new Set();
        for (const el of elements) {
            if (el.borderNodes && el.borderNodes.length > 0) {
                elementsWithLSBorderNodes.add(el.id);
            }
        }

        // 2단계: Port, ItemUsage, Border Node 분리 (캐시 없이 먼저 분류)
        const portNodes = [];
        const itemNodes = [];
        const attributeDefNodes = [];
        const borderNodes = [];
        const regularElements = [];

        for (const el of elements) {
            const kindLower = String(el.type || '').toLowerCase();

            const typeReg = getTypeRegistry();
            
            // InterfaceUsage/InterfaceDefinition의 자식 노드(source, target)는 완전히 숨김
            // 단, nested port가 있는 end feature(borderNodes 있음)는 독립 노드로 표시
            if (el.parent) {
                const parentEl = elements.find(e => e.id === el.parent || e.name === el.parent);
                if (parentEl) {
                    const parentTypeLower = String(parentEl.type || '').toLowerCase();
                    if (typeReg.isInterfaceType?.(parentTypeLower) || parentTypeLower === 'interfaceusage' || parentTypeLower === 'interfacedefinition') {
                        // nested port가 있는 end feature는 예외 처리 (독립 노드로 그림)
                        const hasNestedPorts = Array.isArray(el.borderNodes) && el.borderNodes.length > 0;
                        if (!hasNestedPorts) {
                            continue;
                        }
                    }
                }
            }

            // Port 처리
            const isPort = typeReg.isPortType?.(kindLower) || kindLower === 'portusage' || kindLower === 'portdefinition';
            // ItemUsage 처리 (Action의 in/out item 파라미터)
            const isItemUsage = typeReg.isItemUsageType?.(kindLower) || kindLower === 'itemusage';
            
            if (isPort) {
                const parentEl = el.parent ? elements.find(e => e.id === el.parent || e.name === el.parent) : null;
                const parentTypeLower = parentEl ? String(parentEl.type || '').toLowerCase() : '';
                const isParentPackage = typeReg.isPackageType?.(parentTypeLower) || parentTypeLower === 'package' || parentTypeLower.includes('package');
                
                if (isParentPackage) {
                    regularElements.push(el);
                } else {
                    if (parentEl && elementsWithLSBorderNodes.has(parentEl.id)) {
                        continue;
                    }
                    // nested port가 있는 end feature port → portNodes 대신 regularElements로 (compartment 중복 방지)
                    if (Array.isArray(el.borderNodes) && el.borderNodes.length > 0) {
                        regularElements.push(el);
                    } else {
                        portNodes.push(el);
                    }
                }
            } else if (isItemUsage) {
                const parentEl = el.parent ? elements.find(e => e.id === el.parent || e.name === el.parent) : null;
                const parentTypeLower = parentEl ? String(parentEl.type || '').toLowerCase() : '';
                const isParentPackage = typeReg.isPackageType?.(parentTypeLower) || parentTypeLower === 'package' || parentTypeLower.includes('package');
                
                if (isParentPackage) {
                    regularElements.push(el);
                } else {
                    itemNodes.push(el);
                }
            } else if (kindLower === 'attributedefinition') {
                if (!el.parent) {
                    regularElements.push(el);
                } else {
                    attributeDefNodes.push(el);
                }
            } else {
                regularElements.push(el);
            }
        }


        // 3단계: 캐시 생성 (regularElements로)
        const { buildModelCache } = ns.Editor.model;
        const finalCache = buildModelCache ? buildModelCache(regularElements, []) : null;

        // 4단계: Border Node 판별 (portBorderNodeHandler에 위임)
        if (finalCache) {
            for (const port of portNodes) {
                if (ph.shouldRenderPortAsBorderNode(port, finalCache, settings)) {
                    borderNodes.push(port);
                }
            }
            for (const item of itemNodes) {
                if (ph.isBorderNodeType(item, finalCache, settings)) {
                    borderNodes.push(item);
                }
            }
        }


        // 5단계: Port/Item Compartment + Border Node 연결 (portBorderNodeHandler에 위임)
        // border node로 판별된 item은 compartment에 중복 추가하지 않음
        const borderNodeIds = new Set(borderNodes.map(bn => bn.id));
        if (finalCache) {
            ph.processPortCompartments(portNodes, finalCache, settings);
            ph.processItemCompartments(itemNodes.filter(it => !borderNodeIds.has(it.id)), finalCache, settings);
            ph.processAttributeDefinitionCompartments(attributeDefNodes, finalCache);
            ph.processBorderNodes(borderNodes, finalCache);
        } else {
            console.warn('[nodeTransformer] ⚠️ ModelCache not available, using fallback');
        }

        // 6단계: LS에서 직접 온 borderNodes에 대해서도 direction→side 매핑 및 offset 재계산 적용
        // processBorderNodes는 LS borderNodes가 있는 요소를 건너뛰므로 여기서 별도 처리
        if (elementsWithLSBorderNodes.size > 0) {
            for (const el of regularElements) {
                if (!el.borderNodes || el.borderNodes.length === 0) continue;
                if (!elementsWithLSBorderNodes.has(el.id)) continue;

                // direction → side 재매핑
                for (const bn of el.borderNodes) {
                    bn.side = ph.determineSideFromDirection(bn.side, bn.direction);
                }

                // side별 그룹 단위 offset 재계산
                const sideGroups = new Map();
                for (const bn of el.borderNodes) {
                    const side = String(bn.side || 'E').toUpperCase();
                    if (!sideGroups.has(side)) sideGroups.set(side, []);
                    sideGroups.get(side).push(bn);
                }
                for (const group of sideGroups.values()) {
                    ph.assignOffsets(group);
                }
            }
        }

        // 최종 elements 확인
        for (const el of regularElements) {
        }

        return { elements: regularElements };
    }

    // 모듈 내보내기
    ns.Editor.model.nodeTransformer = {
        transformNode,
        transformNodes,
        // portBorderNodeHandler 위임 (하위 호환)
        get isBorderNodeType() { return getPortHandler().isBorderNodeType; },
        get shouldRenderPortAsBorderNode() { return getPortHandler().shouldRenderPortAsBorderNode; },
        get shouldRenderPortAsBorderNodeAuto() { return getPortHandler().shouldRenderPortAsBorderNodeAuto; },
        get processPortCompartments() { return getPortHandler().processPortCompartments; },
        get processAttributeDefinitionCompartments() { return getPortHandler().processAttributeDefinitionCompartments; },
        get formatPortLabel() { return getPortHandler().formatPortLabel; },
        get createBorderNodeData() { return getPortHandler().createBorderNodeData; },
        get processBorderNodes() { return getPortHandler().processBorderNodes; },
    };
})();
