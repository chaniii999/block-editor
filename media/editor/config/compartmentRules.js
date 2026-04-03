/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 
 * SysML v2 Compartment 규칙 정의 (Webview용)
 * - 부모 타입별로 허용되는 Compartment(자식 항목) 목록을 정의
 * - syson-main의 COMPARTMENTS_WITH_LIST_ITEMS 기반으로 작성
 * - src/config/compartmentRules.js와 동기화 필요
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.config = ns.Editor.config || {};

    /**
     * 부모 타입별 허용 Compartment 규칙
     */
    const COMPARTMENT_RULES = {
        // Definition 계열
        // ActionDefinition: ownedAction은 자식 노드로 표시되므로 compartment에서 제외
        ActionDefinition: ['doc'],
        AllocationDefinition: ['doc', 'ends'],
        AttributeDefinition: ['doc', 'ownedAttribute'],
        CaseDefinition: ['doc', 'subject'],
        ConcernDefinition: ['doc', 'subject', 'ownedAttribute', 'ownedRequirement', 'assumedConstraint', 'requiredConstraint', 'constraints'],
        ConnectionDefinition: ['doc', 'ends', 'ownedAttribute', 'ownedPort'],
        ConstraintDefinition: ['doc', 'ownedConstraint'],
        EnumerationDefinition: ['doc', 'enumeratedValue'],
        InterfaceDefinition: ['doc', 'ends', 'ownedAttribute', 'ownedInterface', 'ownedPort'],
        ItemDefinition: ['doc', 'ownedAttribute'],
        MetadataDefinition: ['doc', 'ownedAttribute', 'ownedReference'],
        OccurrenceDefinition: ['doc', 'ownedAttribute', 'ownedOccurrence'],
        // PartDefinition: ownedAction은 자식 노드로 표시되므로 compartment에서 제외
        PartDefinition: ['doc', 'ownedAttribute', 'ownedPort', 'ownedState'],
        PortDefinition: ['doc', 'ownedAttribute', 'ownedPort', 'ownedReference'],
        RequirementDefinition: ['doc', 'subject', 'ownedAttribute', 'ownedRequirement', 'assumedConstraint', 'requiredConstraint', 'constraints'],
        // StateDefinition: ownedAction은 자식 노드로 표시되므로 compartment에서 제외
        StateDefinition: ['doc', 'ownedState'],
        UseCaseDefinition: ['doc', 'subject'],
        ViewpointDefinition: ['doc', 'constraints'],

        // Usage 계열
        // ActionUsage: nestedAction은 자식 노드로 표시되므로 compartment에서 제외
        ActionUsage: ['doc', 'nestedAttribute', 'items', 'nestedPort'],
        CalculationUsage: ['doc', 'attributes', 'parameters', 'nestedAttribute', 'items', 'nestedPort'],
        AllocationUsage: ['doc', 'nestedAllocation'],
        AttributeUsage: ['doc', 'nestedAttribute', 'nestedReference'],
        CaseUsage: ['doc', 'subject', 'nestedAttribute', 'nestedPort'],
        ConcernUsage: ['doc', 'subject', 'nestedAttribute', 'assumedConstraint', 'requiredConstraint', 'nestedPort', 'constraints'],
        ConstraintUsage: ['doc', 'nestedAttribute', 'nestedConstraint', 'nestedPort'],
        InterfaceUsage: ['doc', 'nestedAttribute', 'nestedPort'],
        ItemUsage: ['doc', 'nestedAttribute', 'nestedPort', 'nestedReference'],
        OccurrenceUsage: ['doc', 'nestedOccurrence'],
        // PartUsage: nestedAction은 자식 노드로 표시되므로 compartment에서 제외
        PartUsage: ['doc', 'nestedAttribute', 'nestedPort', 'nestedState'],
        PortUsage: ['doc', 'nestedAttribute', 'nestedReference', 'nestedPort'],
        RequirementUsage: ['doc', 'subject', 'nestedAttribute', 'assumedConstraint', 'requiredConstraint', 'nestedPort', 'constraints'],
        // StateUsage: nestedAction은 자식 노드로 표시되므로 compartment에서 제외
        StateUsage: ['doc', 'nestedState'],
        UseCaseUsage: ['doc', 'subject', 'nestedAttribute', 'nestedPort'],
        ViewpointUsage: ['concern', 'constraints'],
        Usage: ['doc', 'nestedAttribute', 'constraints'],

        // 특수 Usage 계열
        AcceptActionUsage: ['doc'],
        AssignmentActionUsage: ['doc'],
        // ExhibitStateUsage: nestedAction은 자식 노드로 표시되므로 compartment에서 제외
        ExhibitStateUsage: ['doc', 'nestedState'],
        // PerformActionUsage: nestedAction은 자식 노드로 표시되므로 compartment에서 제외
        PerformActionUsage: ['doc', 'items'],
        SatisfyRequirementUsage: ['doc', 'nestedAttribute', 'assumedConstraint', 'requiredConstraint', 'nestedPort'],
        ViewUsage: ['doc'],
    };

    /**
     * Compartment 타입별 표시 레이블
     */
    const COMPARTMENT_LABELS = {
        doc: 'doc',
        subject: 'subject',
        ends: 'ends',
        ownedAttribute: 'attributes',
        ownedPort: 'ports',
        ownedAction: 'actions',
        ownedState: 'states',
        ownedInterface: 'interfaces',
        ownedReference: 'references',
        ownedOccurrence: 'occurrences',
        ownedRequirement: 'requirements',
        ownedConstraint: 'constraints',
        enumeratedValue: 'enumeratedValues',
        nestedAttribute: 'attributes',
        nestedPort: 'ports',
        nestedAction: 'actions',
        nestedState: 'states',
        items: 'items',
        nestedReference: 'references',
        nestedOccurrence: 'occurrences',
        nestedAllocation: 'allocations',
        nestedConstraint: 'constraints',
        assumedConstraint: 'assume',
        requiredConstraint: 'require',
        concern: 'concerns',
        constraints: 'constraints',
        references: 'references',  // 랭섭에서 사용하는 references key 지원
        attributes: 'attributes',  // 랭섭에서 사용하는 attributes key 지원
    };

    /**
     * Compartment 타입별 허용되는 자식 요소 타입
     */
    const COMPARTMENT_CHILD_TYPES = {
        ownedAttribute: ['AttributeUsage'],
        ownedPort: ['PortUsage'],
        ownedAction: ['ActionUsage', 'AcceptActionUsage', 'AssignmentActionUsage', 'PerformActionUsage'],
        ownedState: ['StateUsage', 'ExhibitStateUsage'],
        ownedInterface: ['InterfaceUsage'],
        ownedReference: ['ReferenceUsage'],
        ownedOccurrence: ['OccurrenceUsage'],
        ownedRequirement: ['RequirementUsage'],
        ownedConstraint: ['ConstraintUsage'],
        enumeratedValue: ['EnumerationUsage'],
        nestedAttribute: ['AttributeUsage'],
        nestedPort: ['PortUsage'],
        nestedAction: ['ActionUsage', 'AcceptActionUsage', 'AssignmentActionUsage', 'PerformActionUsage'],
        nestedState: ['StateUsage', 'ExhibitStateUsage'],
        items: ['ItemUsage'],
        nestedReference: ['ReferenceUsage'],
        nestedOccurrence: ['OccurrenceUsage'],
        nestedAllocation: ['AllocationUsage'],
        nestedConstraint: ['ConstraintUsage'],
        doc: ['Documentation'],  // Comment는 독립 노드로 표시되므로 제외
        assumedConstraint: ['ConstraintUsage'],
        requiredConstraint: ['ConstraintUsage'],
    };

    /**
     * 타입 상속 계층 (Fallback용)
     */
    const TYPE_INHERITANCE = {
        // Definition 계열
        ActionDefinition: 'OccurrenceDefinition',
        CalculationDefinition: 'ActionDefinition',
        CaseDefinition: 'CalculationDefinition',
        AnalysisCaseDefinition: 'CaseDefinition',
        UseCaseDefinition: 'CaseDefinition',
        VerificationCaseDefinition: 'CaseDefinition',
        StateDefinition: 'ActionDefinition',
        ConstraintDefinition: 'OccurrenceDefinition',
        RequirementDefinition: 'ConstraintDefinition',
        ConcernDefinition: 'RequirementDefinition',
        ViewpointDefinition: 'RequirementDefinition',
        ItemDefinition: 'OccurrenceDefinition',
        PartDefinition: 'ItemDefinition',
        ConnectionDefinition: 'PartDefinition',
        AllocationDefinition: 'ConnectionDefinition',
        FlowDefinition: 'ConnectionDefinition',
        InterfaceDefinition: 'ConnectionDefinition',
        RenderingDefinition: 'PartDefinition',
        ViewDefinition: 'PartDefinition',
        PortDefinition: 'OccurrenceDefinition',
        ConjugatedPortDefinition: 'PortDefinition',
        AttributeDefinition: 'Definition',
        EnumerationDefinition: 'AttributeDefinition',
        MetadataDefinition: 'ItemDefinition',

        // Usage 계열
        ActionUsage: 'OccurrenceUsage',
        CalculationUsage: 'OccurrenceUsage',
        CaseUsage: 'CalculationUsage',
        AnalysisCaseUsage: 'CaseUsage',
        UseCaseUsage: 'CaseUsage',
        VerificationCaseUsage: 'CaseUsage',
        StateUsage: 'ActionUsage',
        ConstraintUsage: 'OccurrenceUsage',
        RequirementUsage: 'ConstraintUsage',
        ConcernUsage: 'RequirementUsage',
        ViewpointUsage: 'RequirementUsage',
        ItemUsage: 'OccurrenceUsage',
        PartUsage: 'ItemUsage',
        ConnectionUsage: 'PartUsage',
        AllocationUsage: 'ConnectionUsage',
        FlowUsage: 'ConnectionUsage',
        InterfaceUsage: 'ConnectionUsage',
        RenderingUsage: 'PartUsage',
        ViewUsage: 'PartUsage',
        PortUsage: 'OccurrenceUsage',
        ConjugatedPortUsage: 'PortUsage',
        AttributeUsage: 'Usage',
        EnumerationUsage: 'AttributeUsage',
        AcceptActionUsage: 'ActionUsage',
        AssignmentActionUsage: 'ActionUsage',
        PerformActionUsage: 'ActionUsage',
        ExhibitStateUsage: 'StateUsage',
        SatisfyRequirementUsage: 'RequirementUsage',
        IncludeUseCaseUsage: 'UseCaseUsage',
        TriggerInvocationExpression: 'ActionUsage',
    };

    // ========================================
    // 헬퍼 함수
    // ========================================

    function isDefinition(type) {
        return type && type.endsWith('Definition');
    }

    function isUsage(type) {
        return type && type.endsWith('Usage');
    }

    /**
     * 부모 타입에 허용된 Compartment 목록 반환 (상속 계층 fallback 포함)
     */
    function getAllowedCompartments(parentType) {
        if (COMPARTMENT_RULES[parentType]) {
            return COMPARTMENT_RULES[parentType];
        }

        const parentOfType = TYPE_INHERITANCE[parentType];
        if (parentOfType) {
            return getAllowedCompartments(parentOfType);
        }

        if (isDefinition(parentType)) {
            return ['doc', 'ownedAttribute'];
        }
        if (isUsage(parentType)) {
            return ['doc', 'nestedAttribute'];
        }

        return ['doc'];
    }

    /**
     * Compartment 타입의 표시 레이블 반환
     */
    function getCompartmentLabel(compartmentType) {
        return COMPARTMENT_LABELS[compartmentType] || compartmentType;
    }

    /**
     * 자식 노드의 kind로부터 compartmentKey를 찾음
     */
    function getCompartmentKeyForChild(childKind, parentKind) {
        const allowedCompartments = getAllowedCompartments(parentKind);

        for (const compartmentKey of allowedCompartments) {
            const allowedChildTypes = COMPARTMENT_CHILD_TYPES[compartmentKey];
            if (allowedChildTypes && allowedChildTypes.includes(childKind)) {
                return compartmentKey;
            }
        }

        return null;
    }

    /**
     * containment 엣지와 노드 목록으로부터 부모별 compartment 구조 생성
     * @param {string} parentId - 부모 노드 ID
     * @param {string} parentKind - 부모 노드 kind
     * @param {Array} edges - 전체 엣지 목록
     * @param {Array} nodes - 전체 노드 목록
     * @returns {Object} - { compartmentKey: [childNodes], ... }
     */
    function buildCompartmentsForParent(parentId, parentKind, edges, nodes) {
        const compartments = {};
        const nodeMap = new Map(nodes.map((n) => [n.id, n]));

        const childEdges = edges.filter(
            (e) => e.source === parentId && e.kind === 'containment'
        );

        for (const edge of childEdges) {
            const childNode = nodeMap.get(edge.target);
            if (!childNode) continue;

            const childKind = childNode.kind || childNode.type;
            const compartmentKey = getCompartmentKeyForChild(childKind, parentKind);

            if (compartmentKey) {
                if (!compartments[compartmentKey]) {
                    compartments[compartmentKey] = [];
                }
                compartments[compartmentKey].push(childNode);
            }
        }

        return compartments;
    }

    /**
     * 부모 노드에 대한 compartment 렌더링 데이터 생성
     * @param {string} parentId - 부모 노드 ID
     * @param {string} parentKind - 부모 노드 kind
     * @param {Array} edges - 전체 엣지 목록
     * @param {Array} nodes - 전체 노드 목록
     * @returns {Array} - [{ key, label, items: [childNodes] }, ...]
     */
    function getCompartmentRenderData(parentId, parentKind, edges, nodes) {
        const compartments = buildCompartmentsForParent(parentId, parentKind, edges, nodes);
        const allowedOrder = getAllowedCompartments(parentKind);

        const result = [];
        for (const key of allowedOrder) {
            if (compartments[key] && compartments[key].length > 0) {
                result.push({
                    key,
                    label: getCompartmentLabel(key),
                    items: compartments[key],
                });
            }
        }

        return result;
    }

    // Export to namespace
    ns.Editor.config.compartmentRules = {
        COMPARTMENT_RULES,
        COMPARTMENT_LABELS,
        COMPARTMENT_CHILD_TYPES,
        TYPE_INHERITANCE,
        isDefinition,
        isUsage,
        getAllowedCompartments,
        getCompartmentLabel,
        getCompartmentKeyForChild,
        buildCompartmentsForParent,
        getCompartmentRenderData,
    };
})();
