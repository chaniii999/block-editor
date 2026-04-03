/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxContextMenuData.js - 컨텍스트 메뉴 상수 및 데이터 정의
 *
 * MxContextMenu.js에서 분리된 데이터 모듈:
 * - SVG 아이콘
 * - 다이어그램 레벨 메뉴 섹션
 * - Compartment 규칙 및 타입 매핑
 * - 타입별 추가 도구
 * - 타입 상속 계층
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.contextMenuData = ns.MxGraph.contextMenuData || {};

    // ── SVG 아이콘 ──

    const ICONS = {
        requirement: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
        structure:   '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
        behavior:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
        analysis:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
        extension:   '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
        item:        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    };

    // ── 다이어그램 레벨(package/빈 캔버스) 전체 메뉴 ──

    const DIAGRAM_SECTIONS = [
        {
            key: 'requirements', label: 'Requirements', icon: ICONS.requirement,
            items: [
                { key: 'concern',          label: 'New Concern' },
                { key: 'concern def',      label: 'New Concern Def' },
                { key: 'requirement',      label: 'New Requirement' },
                { key: 'requirement def',  label: 'New Requirement Def' },
                { key: 'constraint',       label: 'New Constraint' },
                { key: 'constraint def',   label: 'New Constraint Def' },
            ],
        },
        {
            key: 'structure', label: 'Structure', icon: ICONS.structure,
            items: [
                { key: 'attribute',        label: 'New Attribute' },
                { key: 'attribute def',    label: 'New Attribute Def' },
                { key: 'interface',        label: 'New Interface' },
                { key: 'interface def',    label: 'New Interface Def' },
                { key: 'item',             label: 'New Item' },
                { key: 'item def',         label: 'New Item Def' },
                { key: 'enum def',         label: 'New Enumeration Def' },
                { key: 'package',          label: 'New Package' },
                { key: 'part',             label: 'New Part' },
                { key: 'part def',         label: 'New Part Def' },
                { key: 'port',             label: 'New Port' },
                { key: 'port def',         label: 'New Port Def' },
            ],
        },
        {
            key: 'behavior', label: 'Behavior', icon: ICONS.behavior,
            items: [
                { key: 'allocation',       label: 'New Allocation' },
                { key: 'allocation def',   label: 'New Allocation Def' },
                { key: 'accept action',    label: 'New Accept Action' },
                { key: 'action',           label: 'New Action' },
                { key: 'action def',       label: 'New Action Def' },
                { key: 'occurrence',       label: 'New Occurrence' },
                { key: 'occurrence def',   label: 'New Occurrence Def' },
                { key: 'state',            label: 'New State' },
                { key: 'state def',        label: 'New State Def' },
            ],
        },
        {
            key: 'analysis', label: 'Analysis', icon: ICONS.analysis,
            items: [
                { key: 'case',             label: 'New Case' },
                { key: 'case def',         label: 'New Case Def' },
                { key: 'use case',         label: 'New Use Case' },
                { key: 'use case def',     label: 'New Use Case Def' },
            ],
        },
        {
            key: 'extension', label: 'Extension', icon: ICONS.extension,
            items: [
                { key: 'metadata def',     label: 'New Metadata Def' },
            ],
        },
    ];

    // ── 타입별 compartment 규칙 ──

    const COMPARTMENT_RULES = {
        ActionDefinition:    ['ownedAttribute', 'ownedAction'],
        AllocationDefinition: [],
        AttributeDefinition: ['ownedAttribute'],
        CaseDefinition:      [],
        ConcernDefinition:   ['ownedAttribute', 'ownedRequirement', 'assumedConstraint', 'requiredConstraint'],
        ConnectionDefinition:['ownedAttribute', 'ownedPort'],
        ConstraintDefinition:['ownedConstraint'],
        EnumerationDefinition:['enumeratedValue'],
        InterfaceDefinition: ['ownedAttribute', 'ownedInterface', 'ownedPort'],
        ItemDefinition:      ['ownedAttribute', 'items'],
        MetadataDefinition:  ['ownedAttribute', 'ownedReference'],
        OccurrenceDefinition:['ownedAttribute', 'ownedOccurrence'],
        PartDefinition:      ['ownedAttribute', 'ownedPort', 'ownedAction', 'ownedState', 'parts', 'items'],
        PortDefinition:      ['ownedAttribute', 'ownedPort', 'ownedReference'],
        RequirementDefinition:['ownedAttribute', 'ownedRequirement', 'assumedConstraint', 'requiredConstraint'],
        StateDefinition:     ['ownedAction', 'ownedState'],
        UseCaseDefinition:   [],
        ActionUsage:         ['nestedAttribute', 'nestedAction', 'items', 'nestedPort'],
        AllocationUsage:     ['nestedAllocation'],
        AttributeUsage:      ['nestedAttribute', 'nestedReference'],
        CaseUsage:           ['nestedAttribute', 'nestedPort'],
        ConcernUsage:        ['nestedAttribute', 'assumedConstraint', 'requiredConstraint', 'nestedPort'],
        ConstraintUsage:     ['nestedAttribute', 'nestedConstraint', 'nestedPort'],
        InterfaceUsage:      ['nestedAttribute', 'nestedPort'],
        ItemUsage:           ['nestedAttribute', 'nestedPort', 'nestedReference'],
        OccurrenceUsage:     ['nestedOccurrence'],
        PartUsage:           ['nestedAttribute', 'nestedAction', 'nestedPort', 'nestedState'],
        PortUsage:           ['nestedAttribute', 'nestedReference', 'nestedPort'],
        RequirementUsage:    ['nestedAttribute', 'assumedConstraint', 'requiredConstraint', 'nestedPort'],
        StateUsage:          ['nestedAction', 'nestedState'],
        UseCaseUsage:        ['nestedAttribute', 'nestedPort'],
        AcceptActionUsage:   [],
        AssignmentActionUsage:[],
        ExhibitStateUsage:   ['nestedAction', 'nestedState'],
        PerformActionUsage:  ['items'],
        SatisfyRequirementUsage:['nestedAttribute', 'assumedConstraint', 'requiredConstraint', 'nestedPort'],
        IfActionUsage:         [],
    };

    // compartment → 추가 가능한 자식 타입 목록
    const COMPARTMENT_CHILD_TYPES = {
        ownedAttribute:   [{ type: 'attribute', label: 'New Attribute' }],
        nestedAttribute:  [{ type: 'attribute', label: 'New Attribute' }],
        ownedPort:        [{ type: 'port',      label: 'New Port' }],
        nestedPort:       [{ type: 'port',      label: 'New Port' }],
        ownedAction:      [{ type: 'action',    label: 'New Action' }, { type: 'accept action', label: 'New Accept Action' }, { type: 'assign', label: 'New Assignment Action' }],
        nestedAction:     [{ type: 'action',    label: 'New Action' }, { type: 'accept action', label: 'New Accept Action' }, { type: 'assign', label: 'New Assignment Action' }],
        ownedState:       [{ type: 'state',     label: 'New State' }],
        nestedState:      [{ type: 'state',     label: 'New State' }],
        ownedInterface:   [{ type: 'interface', label: 'New Interface' }],
        ownedReference:   [{ type: 'attribute', label: 'New Reference' }],
        nestedReference:  [{ type: 'attribute', label: 'New Reference' }],
        ownedOccurrence:  [{ type: 'occurrence',label: 'New Occurrence' }],
        nestedOccurrence: [{ type: 'occurrence',label: 'New Occurrence' }],
        ownedRequirement: [{ type: 'requirement',label: 'New Requirement' }],
        nestedAllocation: [{ type: 'allocation',label: 'New Allocation' }],
        ownedConstraint:  [{ type: 'constraint',label: 'New Constraint' }],
        nestedConstraint: [{ type: 'constraint',label: 'New Constraint' }],
        enumeratedValue:  [{ type: 'enum',      label: 'New Enumeration' }],
        assumedConstraint:[{ type: 'constraint',label: 'New Assumed Constraint' }],
        requiredConstraint:[{ type: 'constraint',label: 'New Required Constraint' }],
        parts:            [{ type: 'part',      label: 'New Part' }],
        items:            [{ type: 'item',      label: 'New Item' }],
    };

    // compartment → UI 섹션 매핑
    const COMPARTMENT_TO_SECTION = {
        ownedAttribute:    'Structure',
        nestedAttribute:   'Structure',
        ownedPort:         'Structure',
        nestedPort:        'Structure',
        ownedInterface:    'Structure',
        ownedReference:    'Structure',
        nestedReference:   'Structure',
        parts:             'Structure',
        items:             'Structure',
        enumeratedValue:   'Structure',
        ownedAction:       'Behavior',
        nestedAction:      'Behavior',
        ownedState:        'Behavior',
        nestedState:       'Behavior',
        ownedOccurrence:   'Behavior',
        nestedOccurrence:  'Behavior',
        nestedAllocation:  'Behavior',
        ownedRequirement:  'Requirements',
        ownedConstraint:   'Requirements',
        nestedConstraint:  'Requirements',
        assumedConstraint: 'Requirements',
        requiredConstraint:'Requirements',
    };

    // 섹션 키 → 아이콘
    const SECTION_ICONS = {
        Structure:    ICONS.structure,
        Behavior:     ICONS.behavior,
        Requirements: ICONS.requirement,
    };

    // ── 타입별 추가 도구 (syson SDVNodeToolSectionSwitch.java 기준) ──

    const NODE_EXTRA_TOOLS = {
        ActionDefinition: {
            Structure: [
                { type: 'item',       label: 'New Item' },
                { type: 'item in',    label: 'New Item In' },
                { type: 'item inout', label: 'New Item Inout' },
                { type: 'item out',   label: 'New Item Out' },
            ],
            Behavior: [
                { type: 'assign',   label: 'New Assignment Action', compartment: 'ownedAction' },
                { type: 'decide',   label: 'New Decision',          compartment: 'ownedAction' },
                { type: 'merge',    label: 'New Merge',             compartment: 'ownedAction' },
                { type: 'fork',     label: 'New Fork',              compartment: 'ownedAction' },
                { type: 'join',     label: 'New Join',              compartment: 'ownedAction' },
                { type: 'action',   label: 'New Start',             compartment: 'ownedAction', nameOverride: 'start' },
                { type: 'action',   label: 'New Done',              compartment: 'ownedAction', nameOverride: 'done' },
                { type: 'perform',  label: 'New Perform Action',    compartment: 'ownedAction' },
                { type: 'if',       label: 'New If Action',         compartment: 'ownedAction' },
            ],
        },
        ItemDefinition: {
            Structure: [
                { type: 'item',       label: 'New Item' },
                { type: 'item in',    label: 'New Item In' },
                { type: 'item inout', label: 'New Item Inout' },
                { type: 'item out',   label: 'New Item Out' },
            ],
        },
        OccurrenceDefinition: {
            Structure: [
                { type: 'part', label: 'New Part' },
            ],
        },
        PartDefinition: {
            Structure: [
                { type: 'action',     label: 'New Action' },
                { type: 'item',       label: 'New Item' },
                { type: 'item in',    label: 'New Item In' },
                { type: 'item inout', label: 'New Item Inout' },
                { type: 'item out',   label: 'New Item Out' },
            ],
            Behavior: [
                { type: 'assign',   label: 'New Assignment Action', compartment: 'ownedAction' },
                { type: 'decide',   label: 'New Decision',          compartment: 'ownedAction' },
                { type: 'merge',    label: 'New Merge',             compartment: 'ownedAction' },
                { type: 'fork',     label: 'New Fork',              compartment: 'ownedAction' },
                { type: 'join',     label: 'New Join',              compartment: 'ownedAction' },
                { type: 'action',   label: 'New Start',             compartment: 'ownedAction', nameOverride: 'start' },
                { type: 'action',   label: 'New Done',              compartment: 'ownedAction', nameOverride: 'done' },
                { type: 'perform',  label: 'New Perform Action',    compartment: 'ownedAction' },
                { type: 'if',       label: 'New If Action',         compartment: 'ownedAction' },
            ],
        },
        PortDefinition: {
            Structure: [
                { type: 'part',       label: 'New Part' },
                { type: 'item',       label: 'New Item' },
                { type: 'item in',    label: 'New Item In' },
                { type: 'item inout', label: 'New Item Inout' },
                { type: 'item out',   label: 'New Item Out' },
            ],
        },
        ActionUsage: {
            Structure: [
                { type: 'attribute',    label: 'New Attribute' },
                { type: 'part',         label: 'New Part' },
                { type: 'port',         label: 'New Port' },
                { type: 'port in',      label: 'New Port In' },
                { type: 'port inout',   label: 'New Port Inout' },
                { type: 'port out',     label: 'New Port Out' },
            ],
            Behavior: [
                { type: 'assign',   label: 'New Assignment Action', compartment: 'nestedAction' },
                { type: 'decide',   label: 'New Decision',          compartment: 'nestedAction' },
                { type: 'merge',    label: 'New Merge',             compartment: 'nestedAction' },
                { type: 'fork',     label: 'New Fork',              compartment: 'nestedAction' },
                { type: 'join',     label: 'New Join',              compartment: 'nestedAction' },
                { type: 'action',   label: 'New Start',             compartment: 'nestedAction', nameOverride: 'start' },
                { type: 'action',   label: 'New Done',              compartment: 'nestedAction', nameOverride: 'done' },
                { type: 'perform',  label: 'New Perform Action',    compartment: 'nestedAction' },
                { type: 'if',       label: 'New If Action',         compartment: 'nestedAction' },
            ],
        },
        IfActionUsage: {
            Behavior: [
                { type: 'else if',  label: 'Add Else If Branch' },
                { type: 'else',     label: 'Add Else Branch' },
            ],
        },
        CaseUsage: {
            Structure: [
                { type: 'attribute',    label: 'New Attribute' },
                { type: 'item',         label: 'New Item' },
                { type: 'item in',      label: 'New Item In' },
                { type: 'item inout',   label: 'New Item Inout' },
                { type: 'item out',     label: 'New Item Out' },
                { type: 'part',         label: 'New Part' },
                { type: 'port',         label: 'New Port' },
                { type: 'port in',      label: 'New Port In' },
                { type: 'port inout',   label: 'New Port Inout' },
                { type: 'port out',     label: 'New Port Out' },
            ],
        },
        ConcernUsage: {
            Structure: [
                { type: 'item',       label: 'New Item' },
                { type: 'item in',    label: 'New Item In' },
                { type: 'item inout', label: 'New Item Inout' },
                { type: 'item out',   label: 'New Item Out' },
                { type: 'part',       label: 'New Part' },
            ],
            Requirements: [
                { type: 'requirement', label: 'New Requirement' },
            ],
        },
        ConstraintUsage: {
            Structure: [
                { type: 'item',         label: 'New Item' },
                { type: 'item in',      label: 'New Item In' },
                { type: 'item inout',   label: 'New Item Inout' },
                { type: 'item out',     label: 'New Item Out' },
                { type: 'part',         label: 'New Part' },
                { type: 'port',         label: 'New Port' },
                { type: 'port in',      label: 'New Port In' },
                { type: 'port inout',   label: 'New Port Inout' },
                { type: 'port out',     label: 'New Port Out' },
            ],
        },
        ItemUsage: {
            Structure: [
                { type: 'item',       label: 'New Item' },
                { type: 'item in',    label: 'New Item In' },
                { type: 'item inout', label: 'New Item Inout' },
                { type: 'item out',   label: 'New Item Out' },
                { type: 'part',       label: 'New Part' },
            ],
        },
        PartUsage: {
            Structure: [
                { type: 'item',       label: 'New Item' },
                { type: 'item in',    label: 'New Item In' },
                { type: 'item inout', label: 'New Item Inout' },
                { type: 'item out',   label: 'New Item Out' },
                { type: 'part',       label: 'New Part' },
            ],
            Behavior: [
                { type: 'assign',   label: 'New Assignment Action', compartment: 'nestedAction' },
                { type: 'decide',   label: 'New Decision',          compartment: 'nestedAction' },
                { type: 'merge',    label: 'New Merge',             compartment: 'nestedAction' },
                { type: 'fork',     label: 'New Fork',              compartment: 'nestedAction' },
                { type: 'join',     label: 'New Join',              compartment: 'nestedAction' },
                { type: 'action',   label: 'New Start',             compartment: 'nestedAction', nameOverride: 'start' },
                { type: 'action',   label: 'New Done',              compartment: 'nestedAction', nameOverride: 'done' },
                { type: 'perform',  label: 'New Perform Action',    compartment: 'nestedAction' },
                { type: 'if',       label: 'New If Action',         compartment: 'nestedAction' },
            ],
        },
        PortUsage: {
            Structure: [
                { type: 'item',       label: 'New Item' },
                { type: 'item in',    label: 'New Item In' },
                { type: 'item inout', label: 'New Item Inout' },
                { type: 'item out',   label: 'New Item Out' },
                { type: 'part',       label: 'New Part' },
            ],
        },
        RequirementUsage: {
            Structure: [
                { type: 'item',       label: 'New Item' },
                { type: 'item in',    label: 'New Item In' },
                { type: 'item inout', label: 'New Item Inout' },
                { type: 'item out',   label: 'New Item Out' },
                { type: 'part',       label: 'New Part' },
            ],
            Requirements: [
                { type: 'requirement', label: 'New Requirement' },
            ],
        },
        StateDefinition: {
            Behavior: [
                { type: 'decide',   label: 'New Decision',  compartment: 'ownedAction' },
                { type: 'merge',    label: 'New Merge',     compartment: 'ownedAction' },
                { type: 'fork',     label: 'New Fork',      compartment: 'ownedAction' },
                { type: 'join',     label: 'New Join',      compartment: 'ownedAction' },
                { type: 'action',   label: 'New Start',     compartment: 'ownedAction', nameOverride: 'start' },
                { type: 'action',   label: 'New Done',      compartment: 'ownedAction', nameOverride: 'done' },
            ],
        },
        StateUsage: {
            Behavior: [
                { type: 'decide',   label: 'New Decision',  compartment: 'nestedAction' },
                { type: 'merge',    label: 'New Merge',     compartment: 'nestedAction' },
                { type: 'fork',     label: 'New Fork',      compartment: 'nestedAction' },
                { type: 'join',     label: 'New Join',      compartment: 'nestedAction' },
                { type: 'action',   label: 'New Start',     compartment: 'nestedAction', nameOverride: 'start' },
                { type: 'action',   label: 'New Done',      compartment: 'nestedAction', nameOverride: 'done' },
            ],
        },
        UseCaseUsage: {
            Structure: [
                { type: 'attribute',    label: 'New Attribute' },
                { type: 'item',         label: 'New Item' },
                { type: 'item in',      label: 'New Item In' },
                { type: 'item inout',   label: 'New Item Inout' },
                { type: 'item out',     label: 'New Item Out' },
                { type: 'part',         label: 'New Part' },
                { type: 'port',         label: 'New Port' },
                { type: 'port in',      label: 'New Port In' },
                { type: 'port inout',   label: 'New Port Inout' },
                { type: 'port out',     label: 'New Port Out' },
            ],
        },
    };

    // ── 타입 상속 계층 (fallback용) ──

    const TYPE_INHERITANCE = {
        ActionDefinition:    'OccurrenceDefinition',
        StateDefinition:     'ActionDefinition',
        CalculationDefinition:'ActionDefinition',
        CaseDefinition:      'CalculationDefinition',
        UseCaseDefinition:   'CaseDefinition',
        ConstraintDefinition:'OccurrenceDefinition',
        RequirementDefinition:'ConstraintDefinition',
        ConcernDefinition:   'RequirementDefinition',
        ItemDefinition:      'OccurrenceDefinition',
        PartDefinition:      'ItemDefinition',
        ConnectionDefinition:'PartDefinition',
        AllocationDefinition:'ConnectionDefinition',
        InterfaceDefinition: 'ConnectionDefinition',
        PortDefinition:      'OccurrenceDefinition',
        AttributeDefinition: 'OccurrenceDefinition',
        EnumerationDefinition:'AttributeDefinition',
        MetadataDefinition:  'ItemDefinition',
        ActionUsage:         'OccurrenceUsage',
        StateUsage:          'ActionUsage',
        CalculationUsage:    'ActionUsage',
        CaseUsage:           'CalculationUsage',
        UseCaseUsage:        'CaseUsage',
        ConstraintUsage:     'OccurrenceUsage',
        RequirementUsage:    'ConstraintUsage',
        ConcernUsage:        'RequirementUsage',
        SatisfyRequirementUsage:'RequirementUsage',
        ItemUsage:           'OccurrenceUsage',
        PartUsage:           'ItemUsage',
        ConnectionUsage:     'PartUsage',
        AllocationUsage:     'ConnectionUsage',
        InterfaceUsage:      'ConnectionUsage',
        PortUsage:           'OccurrenceUsage',
        AttributeUsage:      'OccurrenceUsage',
        EnumerationUsage:    'AttributeUsage',
        AcceptActionUsage:   'ActionUsage',
        AssignmentActionUsage:'ActionUsage',
        PerformActionUsage:  'ActionUsage',
        ExhibitStateUsage:   'StateUsage',
    };

    // ── 타입 정규화 매핑 ──

    const LOWERCASE_TO_PASCALCASE = {
        'actiondefinition':        'ActionDefinition',
        'allocationdefinition':    'AllocationDefinition',
        'attributedefinition':     'AttributeDefinition',
        'casedefinition':          'CaseDefinition',
        'concerndefinition':       'ConcernDefinition',
        'connectiondefinition':    'ConnectionDefinition',
        'constraintdefinition':    'ConstraintDefinition',
        'enumerationdefinition':   'EnumerationDefinition',
        'interfacedefinition':     'InterfaceDefinition',
        'itemdefinition':          'ItemDefinition',
        'metadatadefinition':      'MetadataDefinition',
        'occurrencedefinition':    'OccurrenceDefinition',
        'partdefinition':          'PartDefinition',
        'portdefinition':          'PortDefinition',
        'requirementdefinition':   'RequirementDefinition',
        'statedefinition':         'StateDefinition',
        'usecasedefinition':       'UseCaseDefinition',
        'actionusage':             'ActionUsage',
        'allocationusage':         'AllocationUsage',
        'attributeusage':          'AttributeUsage',
        'caseusage':               'CaseUsage',
        'concernusage':            'ConcernUsage',
        'constraintusage':         'ConstraintUsage',
        'interfaceusage':          'InterfaceUsage',
        'itemusage':               'ItemUsage',
        'occurrenceusage':         'OccurrenceUsage',
        'partusage':               'PartUsage',
        'portusage':               'PortUsage',
        'requirementusage':        'RequirementUsage',
        'stateusage':              'StateUsage',
        'usecaseusage':            'UseCaseUsage',
        'acceptactionusage':       'AcceptActionUsage',
        'assignmentactionusage':   'AssignmentActionUsage',
        'exhibitstateusage':       'ExhibitStateUsage',
        'performactionusage':      'PerformActionUsage',
        'satisfyrequirementusage': 'SatisfyRequirementUsage',
        'ifactionusage':           'IfActionUsage',
    };

    // ── 아이콘 툴바 SVG ──

    const TOOLBAR_ICONS = {
        edit: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
        trash: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
        // collapse: 가로선만 (expanded 상태 → collapse 가능)
        collapse: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" fill="transparent" stroke="currentColor" stroke-width="1.5" /><line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" stroke-width="1.5" /></svg>',
        // expand: 가로선 + 세로선 (collapsed 상태 → expand 가능)
        expand: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" fill="transparent" stroke="currentColor" stroke-width="1.5" /><line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" stroke-width="1.5" /><line x1="8" y1="5" x2="8" y2="11" stroke="currentColor" stroke-width="1.5" /></svg>',
    };

    // ── 아이콘 툴바 CSS ──

    const TOOLBAR_STYLES = `
        .ninja-toolbar {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px 12px;
            border-bottom: 1px solid var(--ninja-secondary-background-color, rgba(128,128,128,0.2));
        }
        .ninja-toolbar-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 6px;
            background: transparent;
            color: var(--ninja-text-color, inherit);
            cursor: pointer;
            transition: background 0.15s ease;
        }
        .ninja-toolbar-btn:hover {
            background: var(--ninja-selected-background, rgba(128,128,128,0.15));
        }
        .ninja-toolbar-btn:active {
            background: var(--ninja-accent-color, rgba(128,128,128,0.25));
        }
        .ninja-toolbar-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .ninja-toolbar-btn:disabled:hover {
            background: transparent;
        }
        .ninja-toolbar-btn svg {
            pointer-events: none;
        }
    `;

    // Export
    ns.MxGraph.contextMenuData.ICONS = ICONS;
    ns.MxGraph.contextMenuData.DIAGRAM_SECTIONS = DIAGRAM_SECTIONS;
    ns.MxGraph.contextMenuData.COMPARTMENT_RULES = COMPARTMENT_RULES;
    ns.MxGraph.contextMenuData.COMPARTMENT_CHILD_TYPES = COMPARTMENT_CHILD_TYPES;
    ns.MxGraph.contextMenuData.COMPARTMENT_TO_SECTION = COMPARTMENT_TO_SECTION;
    ns.MxGraph.contextMenuData.SECTION_ICONS = SECTION_ICONS;
    ns.MxGraph.contextMenuData.NODE_EXTRA_TOOLS = NODE_EXTRA_TOOLS;
    ns.MxGraph.contextMenuData.TYPE_INHERITANCE = TYPE_INHERITANCE;
    ns.MxGraph.contextMenuData.LOWERCASE_TO_PASCALCASE = LOWERCASE_TO_PASCALCASE;
    ns.MxGraph.contextMenuData.TOOLBAR_ICONS = TOOLBAR_ICONS;
    ns.MxGraph.contextMenuData.TOOLBAR_STYLES = TOOLBAR_STYLES;

    console.log('[MxContextMenuData] 모듈 로드 완료');
})();
