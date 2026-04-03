/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * typeRegistry.js - 에디터 측 타입 판단 로직 중앙화
 * 
 * 모든 타입 판단 기준을 한 곳에서 관리하여 중복 정의 방지 및 일관성 유지
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.config = ns.Editor.config || {};

    // ========================================
    // 타입 상수 정의
    // ========================================

    // Definition 타입 (Usage와 구분)
    const DEFINITION_TYPES = new Set([
        'partdefinition',
        'actiondefinition',
        'itemdefinition',
        'portdefinition',
        'attributedefinition',
        'connectiondefinition',
        'interfacedefinition',
        'allocationdefinition',
        'requirementdefinition',
        'constraintdefinition',
        'statedefinition',
        'usecasedefinition',
        'enumerationdefinition',
        'flowconnectiondefinition',
        'occurrencedefinition',
    ]);

    // Usage 타입
    const USAGE_TYPES = new Set([
        'partusage',
        'actionusage',
        'itemusage',
        'portusage',
        'attributeusage',
        'connectionusage',
        'interfaceusage',
        'allocationusage',
        'requirementusage',
        'constraintusage',
        'stateusage',
        'usecaseusage',
        'enumerationusage',
        'flowconnectionusage',
        'occurrenceusage',
        'referenceusage',
        'performactionusage',
        'actorusage',
    ]);

    // Control Node 타입 (Activity Diagram)
    const CONTROL_NODE_TYPES = new Set([
        'forknode',
        'joinnode',
        'decisionnode',
        'mergenode',
        'startaction',
        'doneaction',
        'finalnode',
    ]);

    // Action Flow 타입 (compartment에서 렌더링)
    const ACTION_FLOW_TYPES = new Set([
        'assignmentactionusage',
        'whileloopactionusage',
        'forloopactionusage',
        'ifactionusage',
        'acceptactionusage',
        'sendactionusage',
        'terminateactionusage',
    ]);

    // 컨테이너 타입 (자식을 포함할 수 있는 노드)
    const CONTAINER_TYPES = new Set([
        'package',
        'partdefinition',
        'partusage',
        'actiondefinition',
        'actionusage',
        'connectiondefinition',
        'allocationdefinition',
        'interfacedefinition',
        'flowconnectiondefinition',
    ]);

    // Annotation 타입 (Comment, Documentation, Metadata)
    const ANNOTATION_TYPES = new Set([
        'comment',
        'documentation',
        'doc',
        'metadatausage',
    ]);

    // Alias 타입
    const ALIAS_TYPE = 'Alias';

    // Port 타입
    const PORT_TYPES = new Set([
        'portusage',
        'portdefinition',
    ]);

    // Border Node로 렌더링될 수 있는 타입
    const BORDER_NODE_CANDIDATE_TYPES = new Set([
        'portusage',
        'portdefinition',
        'itemusage',
    ]);

    // 특수 이름 (action flow에서 skip)
    const SKIP_NAMES = new Set([
        'start',
        'done',
        'finalize',
    ]);

    // ========================================
    // 타입 판단 함수
    // ========================================

    /**
     * Definition 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isDefinitionType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return DEFINITION_TYPES.has(t) || t.includes('definition');
    }

    /**
     * Usage 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isUsageType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return USAGE_TYPES.has(t) || (t.includes('usage') && !t.includes('definition'));
    }

    /**
     * Control Node 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isControlNodeType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return CONTROL_NODE_TYPES.has(t) || 
               t.includes('forknode') || 
               t.includes('joinnode') || 
               t.includes('decisionnode') || 
               t.includes('mergenode');
    }

    /**
     * Action Flow 타입인지 확인 (compartment에서 렌더링)
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isActionFlowType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return ACTION_FLOW_TYPES.has(t);
    }

    /**
     * 컨테이너 타입인지 확인 (자식을 포함할 수 있는 노드)
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isContainerType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return CONTAINER_TYPES.has(t) || 
               t.includes('definition') || 
               t.includes('package') ||
               t.includes('partusage') ||
               t.includes('actionusage');
    }

    /**
     * Annotation 타입인지 확인 (Comment, Documentation)
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isAnnotationType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return ANNOTATION_TYPES.has(t) || t === 'comment' || t === 'documentation';
    }

    /**
     * Alias 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isAliasType(type) {
        if (!type) return false;
        return String(type) === ALIAS_TYPE || String(type).toLowerCase() === 'alias';
    }

    /**
     * Port 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isPortType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return PORT_TYPES.has(t) || t === 'portusage' || t === 'portdefinition';
    }

    /**
     * Package 타입인지 확인
     * library package도 일반 package로 처리 (재사용 가능한 라이브러리 모델 선언)
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isPackageType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t === 'package' || t === 'librarypackage' || t.includes('package');
    }

    /**
     * Action 타입인지 확인 (Definition 제외)
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isActionType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t.includes('action') && !t.includes('definition');
    }

    /**
     * ActionDefinition 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isActionDefinitionType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t === 'actiondefinition' || t.includes('actiondefinition');
    }

    /**
     * ActionUsage 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isActionUsageType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t === 'actionusage' || (t.includes('actionusage') && !t.includes('definition'));
    }

    /**
     * UseCase 타입인지 확인 (Definition 제외)
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isUseCaseType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t.includes('usecase') && !t.includes('definition');
    }

    /**
     * Interface 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isInterfaceType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t === 'interfaceusage' || t === 'interfacedefinition';
    }

    /**
     * ItemUsage 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isItemUsageType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t === 'itemusage';
    }

    /**
     * Actor 타입인지 확인 (ActorUsage)
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isActorType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t === 'actorusage';
    }

    /**
     * Border Node 후보 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isBorderNodeCandidateType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return BORDER_NODE_CANDIDATE_TYPES.has(t);
    }

    /**
     * 특수 이름인지 확인 (start, done, finalize)
     * @param {string} name - 이름 문자열
     * @returns {boolean}
     */
    function isSkipName(name) {
        if (!name) return false;
        return SKIP_NAMES.has(String(name).toLowerCase());
    }

    /**
     * StartAction 타입인지 확인
     * @param {string} type - 타입 문자열
     * @param {string} role - role 문자열
     * @returns {boolean}
     */
    function isStartActionType(type, role) {
        const t = String(type || '').toLowerCase();
        const r = String(role || '').toLowerCase();
        return t === 'startaction' || r === 'initial';
    }

    /**
     * DoneAction 타입인지 확인
     * @param {string} type - 타입 문자열
     * @param {string} role - role 문자열
     * @returns {boolean}
     */
    function isDoneActionType(type, role) {
        const t = String(type || '').toLowerCase();
        const r = String(role || '').toLowerCase();
        return t === 'doneaction' || r === 'final';
    }

    /**
     * AssignmentActionUsage 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isAssignmentActionType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t === 'assignmentactionusage';
    }

    /**
     * Loop 타입인지 확인 (WhileLoop, ForLoop)
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isLoopActionType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t === 'whileloopactionusage' || 
               t === 'forloopactionusage' || 
               t === 'loop' ||
               t.includes('loopaction');
    }

    /**
     * IfAction 타입인지 확인 (ElseIfAction, ElseAction 포함)
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isIfActionType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t === 'ifactionusage' || t.includes('ifaction') || t === 'elseifaction' || t === 'elseaction';
    }

    /**
     * ElseIfAction 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isElseIfActionType(type) {
        if (!type) return false;
        return String(type).toLowerCase() === 'elseifaction';
    }

    /**
     * ElseAction 타입인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isElseActionType(type) {
        if (!type) return false;
        return String(type).toLowerCase() === 'elseaction';
    }

    /**
     * TerminateAction 타입인지 확인
     * @param {string} type - 타입 문자열
     * @param {string} role - role 문자열
     * @returns {boolean}
     */
    function isTerminateActionType(type, role) {
        const t = String(type || '').toLowerCase();
        const r = String(role || '').toLowerCase();
        return t.includes('terminateaction') || r === 'terminate';
    }

    /**
     * Fork 노드인지 확인
     * @param {string} type - 타입 문자열
     * @param {string} role - role 문자열
     * @param {string} name - 이름 문자열
     * @returns {boolean}
     */
    function isForkNode(type, role, name) {
        const t = String(type || '').toLowerCase();
        const r = String(role || '').toLowerCase();
        const n = String(name || '').toLowerCase();
        return t.includes('fork') || r === 'fork' || n === 'forknode' || n === 'fork';
    }

    /**
     * Join 노드인지 확인
     * @param {string} type - 타입 문자열
     * @param {string} role - role 문자열
     * @param {string} name - 이름 문자열
     * @returns {boolean}
     */
    function isJoinNode(type, role, name) {
        const t = String(type || '').toLowerCase();
        const r = String(role || '').toLowerCase();
        const n = String(name || '').toLowerCase();
        return t.includes('join') || r === 'join' || n === 'joinnode' || n === 'join';
    }

    /**
     * Decision 노드인지 확인
     * @param {string} type - 타입 문자열
     * @param {string} role - role 문자열
     * @param {string} name - 이름 문자열
     * @returns {boolean}
     */
    function isDecisionNode(type, role, name) {
        const t = String(type || '').toLowerCase();
        const r = String(role || '').toLowerCase();
        const n = String(name || '').toLowerCase();
        return t.includes('decision') || r === 'decision' || n === 'decisionnode' || n === 'decision';
    }

    /**
     * Merge 노드인지 확인
     * @param {string} type - 타입 문자열
     * @param {string} role - role 문자열
     * @param {string} name - 이름 문자열
     * @returns {boolean}
     */
    function isMergeNode(type, role, name) {
        const t = String(type || '').toLowerCase();
        const r = String(role || '').toLowerCase();
        const n = String(name || '').toLowerCase();
        return t.includes('merge') || r === 'merge' || n === 'mergenode' || n === 'merge';
    }

    /**
     * Diamond 형태 노드인지 확인 (Decision, Merge)
     * @param {string} role - role 문자열
     * @returns {boolean}
     */
    function isDiamondNode(role) {
        const r = String(role || '').toLowerCase();
        return r === 'decision' || r === 'merge';
    }

    /**
     * 계층적 엣지 타입인지 확인
     * @param {string} kind - 엣지 타입
     * @returns {boolean}
     */
    function isHierarchicalEdgeKind(kind) {
        if (!kind) return false;
        const k = String(kind).toLowerCase();
        // Import/Expose 엣지는 계층적 엣지가 아님
        if (k.includes('import') || k.includes('expose')) {
            return false;
        }
        // Inheritance/Specialization/Generalization은 계층적 엣지가 아님
        if (k.includes('inheritance') || k.includes('specialization') || k.includes('generalization')) {
            return false;
        }
        return (
            k.includes('contain') ||
            k.includes('own') ||
            k.includes('compose') ||
            k.includes('aggregate') ||
            k.includes('nest') ||
            k.includes('member') ||
            k.includes('usage') ||
            k.includes('perform') ||
            k.includes('include') ||
            k.includes('has')
        );
    }

    /**
     * Annotation 엣지 타입인지 확인
     * @param {string} kind - 엣지 타입
     * @returns {boolean}
     */
    function isAnnotationEdgeKind(kind) {
        if (!kind) return false;
        const k = String(kind).toLowerCase();
        return k === 'annotation';
    }

    /**
     * 숨겨야 할 내부 구현 노드인지 확인
     * @param {string} type - 타입 문자열
     * @returns {boolean}
     */
    function isHiddenInternalType(type) {
        if (!type) return false;
        const t = String(type).toLowerCase();
        return t.includes('feature') || 
               t.includes('itemflowend') || 
               t.includes('flowend');
    }

    /**
     * 노드의 role을 타입과 이름으로부터 결정
     * @param {string} type - 타입 문자열
     * @param {string} name - 이름 문자열
     * @returns {string|undefined} role 문자열
     */
    function determineNodeRole(type, name) {
        const kindLower = String(type || '').toLowerCase();
        const nameLower = String(name || '').toLowerCase();
        const isControlNodeKind = kindLower.includes('node');

        // ActionUsage 계열 타입만 이름으로 Start/Finalize 판별
        // item def Start 등은 제외 (ActionUsage, AcceptActionUsage, StartAction 등만 해당)
        const isActionType = kindLower.includes('action') || kindLower === 'startaction' || kindLower === 'doneaction';
        
        if (isActionType && (nameLower === 'start' || nameLower.startsWith('start '))) return 'initial';
        if (isActionType && (nameLower === 'finalize' || nameLower.includes('finalize'))) return 'final';
        if (kindLower.includes('acceptaction') || nameLower.includes('accept')) return 'accept';
        if (kindLower.includes('sendaction') || nameLower.includes('send')) return 'send';
        if (kindLower.includes('terminateaction')) return 'terminate';
        if (kindLower.includes('usecase') && !kindLower.includes('definition')) return 'usecase';
        if (kindLower.includes('decision') || nameLower === 'decisionnode' || nameLower === 'decision' || 
            (isControlNodeKind && nameLower.startsWith('d'))) return 'decision';
        if (kindLower.includes('fork') || nameLower === 'forknode' || nameLower === 'fork' || 
            (isControlNodeKind && nameLower.startsWith('f'))) return 'fork';
        if (kindLower.includes('join') || nameLower === 'joinnode' || nameLower === 'join' || 
            (isControlNodeKind && nameLower.startsWith('j'))) return 'join';
        if (kindLower.includes('merge') || nameLower === 'mergenode' || nameLower === 'merge' || 
            (isControlNodeKind && nameLower.startsWith('m'))) return 'merge';
        if (kindLower.includes('final') || nameLower === 'done' || nameLower === 'final') return 'final';

        return undefined;
    }

    // ========================================
    // 모듈 내보내기
    // ========================================
    ns.Editor.config.typeRegistry = {
        // 상수
        DEFINITION_TYPES,
        USAGE_TYPES,
        CONTROL_NODE_TYPES,
        ACTION_FLOW_TYPES,
        CONTAINER_TYPES,
        ANNOTATION_TYPES,
        PORT_TYPES,
        BORDER_NODE_CANDIDATE_TYPES,
        SKIP_NAMES,

        // 기본 타입 판단 함수
        isDefinitionType,
        isUsageType,
        isControlNodeType,
        isActionFlowType,
        isContainerType,
        isAnnotationType,
        isPortType,
        isPackageType,
        isActionType,
        isActionDefinitionType,
        isActionUsageType,
        isUseCaseType,
        isInterfaceType,
        isItemUsageType,
        isActorType,
        isBorderNodeCandidateType,
        isSkipName,
        isHiddenInternalType,

        // Alias 타입
        ALIAS_TYPE,
        isAliasType,

        // Action Flow 세부 타입 판단 함수
        isStartActionType,
        isDoneActionType,
        isAssignmentActionType,
        isLoopActionType,
        isIfActionType,
        isElseIfActionType,
        isElseActionType,
        isTerminateActionType,

        // Control Node 세부 타입 판단 함수
        isForkNode,
        isJoinNode,
        isDecisionNode,
        isMergeNode,
        isDiamondNode,

        // 엣지 타입 판단 함수
        isHierarchicalEdgeKind,
        isAnnotationEdgeKind,

        // 유틸리티 함수
        determineNodeRole,
    };

    console.log('[typeRegistry] ✅ Type registry initialized');
})();
