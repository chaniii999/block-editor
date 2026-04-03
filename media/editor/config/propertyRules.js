/**
 * Copyright: SELab.AI (c) 2026
 *
 * SysML v2 노드 타입별 속성(Property) 규칙 정의
 * - 노드 선택 시 속성창(Details View)에 표시할 속성 목록 정의
 * - syson-main의 CoreFeaturesSwitch 및 DetailsViewService 기반으로 작성
 *
 * 구조:
 * - Core 탭: CoreFeaturesSwitch에서 정의한 핵심 속성 + Comment/Documentation/Visibility
 * - Advanced 탭: 전체 속성 - Core 속성 (EMF 메타모델의 모든 EStructuralFeature)
 */

(function() {
    'use strict';
    
    const ns = window.SELAB = window.SELAB || {};
    ns.Editor = ns.Editor || {};
    ns.Editor.config = ns.Editor.config || {};

// ========================================
// Core 탭 기본 속성 그룹 정의
// ========================================

/**
 * Element 기본 속성 (모든 요소 공통)
 */
const ELEMENT_CORE = [
  'declaredName',
  'qualifiedName',
  'declaredShortName',
  'elementId',
];

/**
 * Type 속성 (Definition 계열 기본)
 */
const TYPE_CORE = [
  ...ELEMENT_CORE,
  'isAbstract',
  'isVariation',
];

/**
 * Feature 속성 (Usage 계열 기본)
 */
const FEATURE_CORE = [
  ...ELEMENT_CORE,
  'direction',
  'multiplicity',
  'declaredType',
  'subsets',
  'redefines',
  'isVariation',
  'isComposite',
];

/**
 * OccurrenceDefinition 속성
 */
const OCCURRENCE_DEFINITION_CORE = [
  ...ELEMENT_CORE,
  'isAbstract',
  'isIndividual',
  'isVariation',
];

/**
 * OccurrenceUsage 속성
 */
const OCCURRENCE_USAGE_CORE = [
  ...FEATURE_CORE,
  'isIndividual',
];

/**
 * Membership 속성
 */
const MEMBERSHIP_CORE = [
  'visibility',
  'memberElement',
];

/**
 * Specialization 속성
 */
const SPECIALIZATION_CORE = [
  ...ELEMENT_CORE,
  'general',
  'specific',
];

/**
 * Subsetting 속성
 */
const SUBSETTING_CORE = [
  ...ELEMENT_CORE,
  'subsettedFeature',
  'subsettingFeature',
];

// ========================================
// Core 탭에 추가로 표시되는 공통 위젯 (모든 Element)
// - SysMLv2PropertiesConfigurer에서 별도로 추가됨
// ========================================
const COMMON_CORE_WIDGETS = [
  'comment',       // Comment 텍스트 영역
  'documentation', // Documentation 텍스트 영역
  'visibility',    // Visibility 라디오 버튼 (Membership에서)
];

// ========================================
// 타입별 Core Properties 규칙 (알파벳 순)
// - 속성창의 "Core" 탭에 표시되는 속성들
// - 공통 위젯(Comment, Documentation, Visibility)은 별도로 추가됨
// - CoreFeaturesSwitch의 상속 계층을 따름
//   - OccurrenceDefinition 계열: Element + isIndividual (isAbstract 없음)
//   - Type 계열: Element + isAbstract
// ========================================
const CORE_PROPERTIES = {
  // ========================================
  // Definition 계열
  // - OccurrenceDefinition 상속: isIndividual 포함, isAbstract는 Advanced로
  // - AttributeDefinition 등 Type 상속: isAbstract 포함
  // ========================================
  // OccurrenceDefinition 계열 (isIndividual 포함)
  ActionDefinition: [...OCCURRENCE_DEFINITION_CORE],
  AllocationDefinition: [...OCCURRENCE_DEFINITION_CORE],
  CaseDefinition: [...OCCURRENCE_DEFINITION_CORE],
  ConcernDefinition: [...OCCURRENCE_DEFINITION_CORE],
  ConnectionDefinition: [...OCCURRENCE_DEFINITION_CORE],
  ConstraintDefinition: [...OCCURRENCE_DEFINITION_CORE],
  InterfaceDefinition: [...OCCURRENCE_DEFINITION_CORE],
  ItemDefinition: [...OCCURRENCE_DEFINITION_CORE],
  OccurrenceDefinition: [...OCCURRENCE_DEFINITION_CORE],
  PartDefinition: [...OCCURRENCE_DEFINITION_CORE],
  PortDefinition: [...OCCURRENCE_DEFINITION_CORE],
  RequirementDefinition: [...OCCURRENCE_DEFINITION_CORE],
  StateDefinition: [...OCCURRENCE_DEFINITION_CORE, 'isParallel'],
  UseCaseDefinition: [...OCCURRENCE_DEFINITION_CORE],

  // Type 계열 (isAbstract 포함) - OccurrenceDefinition 상속 아님
  AttributeDefinition: [...TYPE_CORE],
  EnumerationDefinition: [...TYPE_CORE],
  MetadataDefinition: [...TYPE_CORE],

  // ========================================
  // Usage 계열
  // - OccurrenceUsage 상속: Feature + isIndividual
  // - PortUsage: Feature만 (isIndividual 제외 - CoreFeaturesSwitch 참고)
  // ========================================
  // OccurrenceUsage 계열 (isIndividual 포함)
  ActionUsage: [...OCCURRENCE_USAGE_CORE],
  AllocationUsage: [...OCCURRENCE_USAGE_CORE],
  CaseUsage: [...OCCURRENCE_USAGE_CORE],
  ConcernUsage: [...OCCURRENCE_USAGE_CORE],
  ConnectionUsage: [...OCCURRENCE_USAGE_CORE],
  ConstraintUsage: [...OCCURRENCE_USAGE_CORE],
  InterfaceUsage: [...OCCURRENCE_USAGE_CORE],
  ItemUsage: [...OCCURRENCE_USAGE_CORE],
  OccurrenceUsage: [...OCCURRENCE_USAGE_CORE],
  PartUsage: [...OCCURRENCE_USAGE_CORE],
  RequirementUsage: [...OCCURRENCE_USAGE_CORE, 'reqId'],
  StateUsage: [...OCCURRENCE_USAGE_CORE, 'isParallel'],
  UseCaseUsage: [...OCCURRENCE_USAGE_CORE],
  IncludeUseCaseUsage: [...OCCURRENCE_USAGE_CORE],
  ActorUsage: [...OCCURRENCE_USAGE_CORE],
  ViewUsage: [...OCCURRENCE_USAGE_CORE, 'exposedElement'],

  // Feature 계열 (isIndividual 없음)
  AttributeUsage: [...FEATURE_CORE],
  EnumerationUsage: [...FEATURE_CORE, 'value'], // EnumerationUsage: declaredType 다음에 value 표시
  PortUsage: [...FEATURE_CORE], // CoreFeaturesSwitch에서 별도 정의

  // ========================================
  // 특수 Usage 계열
  // ========================================
  AcceptActionUsage: [...FEATURE_CORE],
  AssignmentActionUsage: [...FEATURE_CORE],
  ExhibitStateUsage: [...FEATURE_CORE, 'isParallel'],
  PerformActionUsage: [...FEATURE_CORE],
  SatisfyRequirementUsage: [...FEATURE_CORE, 'reqId'],

  // ========================================
  // Literal 계열
  // ========================================
  LiteralBoolean: [...FEATURE_CORE, 'value'],
  LiteralInteger: [...FEATURE_CORE, 'value'],
  LiteralRational: [...FEATURE_CORE, 'value'],
  LiteralString: [...FEATURE_CORE, 'value'],

  // ========================================
  // Relationship 계열
  // ========================================
  Comment: [...ELEMENT_CORE, 'body'],
  Dependency: [...ELEMENT_CORE, 'client', 'supplier'],
  Documentation: [...ELEMENT_CORE, 'body'],
  FeatureTyping: [...SPECIALIZATION_CORE, 'type', 'typedFeature'],
  FeatureValue: [...MEMBERSHIP_CORE, 'isDefault', 'isInitial'],
  MembershipImport: ['importedMembership', 'isImportAll', 'isRecursive'],
  NamespaceImport: ['importedNamespace', 'isImportAll', 'isRecursive', 'visibility'],
  PortConjugation: [...ELEMENT_CORE, 'conjugatedType', 'originalPortDefinition'],
  Redefinition: [...SUBSETTING_CORE, 'redefinedFeature', 'redefiningFeature'],
  ReferenceSubsetting: [...ELEMENT_CORE, 'referencedFeature', 'referencingFeature'],
  RequirementConstraintMembership: ['visibility', 'kind'],
  StateSubactionMembership: [...MEMBERSHIP_CORE, 'kind'],
  Subclassification: [...SPECIALIZATION_CORE, 'subclassifier', 'superclassifier'],
  Subsetting: [...SUBSETTING_CORE],
  TextualRepresentation: [...ELEMENT_CORE, 'language', 'body'],

  // ========================================
  // 기타
  // ========================================
  Package: [...ELEMENT_CORE],
  Namespace: [...ELEMENT_CORE],
};

// ========================================
// Advanced 탭 속성 (EMF 메타모델 기반)
// - Core에 포함되지 않은 모든 EStructuralFeature
// - OccurrenceDefinition 계열: isAbstract가 Advanced에 포함
// - Type 계열 (AttributeDefinition 등): isAbstract가 Core에 있음
// ========================================
const ADVANCED_PROPERTIES = {
  // OccurrenceDefinition 계열 공통 Advanced 속성 (isAbstract 포함)
  _OccurrenceDefinitionCommon: [
    'isImpliedIncluded',
    'isLibraryElement',
    'name',
    'shortName',
    'isAbstract',     // Core에 없으므로 Advanced에 포함
    'isConjugated',
    'isSufficient',
    'isVariation',
  ],

  // Type 계열 Definition Advanced 속성 (isAbstract 없음 - Core에 있음)
  _TypeDefinitionCommon: [
    'isImpliedIncluded',
    'isLibraryElement',
    'name',
    'shortName',
    'isConjugated',
    'isSufficient',
    'isVariation',
  ],

  // OccurrenceUsage 계열 공통 Advanced 속성 (스크린샷 기준 정확한 순서)
  // - Feature 속성: isConstant, isDerived, isEnd, isNonunique, isOrdered, isPortion, isUnique, isVariable
  // - Usage 속성: isReference, isVariation, mayTimeVary
  // - OccurrenceUsage 속성: portionKind
  _OccurrenceUsageCommon: [
    'isImpliedIncluded',
    'isLibraryElement',
    'name',
    'shortName',
    'isAbstract',
    'isConjugated',
    'isSufficient',
    'isComposite',
    'isConstant',
    'isDerived',
    'isEnd',
    'isNonunique',
    'isOrdered',
    'isPortion',
    'isUnique',
    'isVariable',
    'isVariation',
    'mayTimeVary',
    'portionKind',
  ],

  // Feature 계열 Usage Advanced 속성 (isIndividual 포함 - Core에 없음)
  // PortUsage, AttributeUsage 등 OccurrenceUsage가 아닌 Usage
  _FeatureUsageCommon: [
    'isImpliedIncluded',
    'isLibraryElement',
    'name',
    'shortName',
    'isAbstract',
    'isConjugated',
    'isSufficient',
    'isComposite',
    'isConstant',
    'isDerived',
    'isEnd',
    'isIndividual',   // Core에 없으므로 Advanced에 포함
    'isNonunique',
    'isOrdered',
    'isPortion',
    'isUnique',
    'isVariable',
    'isVariation',
    'mayTimeVary',
  ],

  // 타입별 Advanced 속성
  // OccurrenceDefinition 계열
  CalculationDefinition: [
    'isImpliedIncluded',
    'isLibraryElement',
    'name',
    'shortName',
    'isAbstract',
    'isConjugated',
    'isSufficient',
    'isVariation',
    'isModelLevelEvaluable',
  ],
  ConstraintDefinition: [
    'isImpliedIncluded',
    'isLibraryElement',
    'name',
    'shortName',
    'isAbstract',
    'isConjugated',
    'isSufficient',
    'isVariation',
    'isModelLevelEvaluable',
  ],
  PartDefinition: [
    'isImpliedIncluded',
    'isLibraryElement',
    'name',
    'shortName',
    'isAbstract',     // Advanced에 포함
    'isConjugated',
    'isSufficient',
    'isVariation',
  ],

  // Type 계열 (isAbstract가 Core에 있음)
  EnumerationDefinition: [
    'isImpliedIncluded',
    'isLibraryElement',
    'name',
    'shortName',
    'isConjugated',
    'isSufficient',
    'isVariation',
  ],

  // Usage 계열
  CalculationUsage: [
    'isImpliedIncluded', // 암시적 관계(ownedRelationship.isImplied) 때문에 포함된 요소인지 표시 (SysON Element.isImpliedIncluded)
    'isLibraryElement', // 라이브러리 네임스페이스에 속한 파생 요소 여부 (SysON ElementImpl.isIsLibraryElement)
    'name', // 선언된 이름/QualifiedName을 기준으로 계산된 표시 이름 (SysON ElementImpl.getName)
    'shortName', // 선언된 단축 이름(ELEMENT__DECLARED_SHORT_NAME) 기반 별칭 (SysON ElementImpl.getDeclaredShortName)
    'isComposite', // 해당 Usage/Feature가 소유 요소를 구성(복합 소유권)하는지 여부 (SysON Feature.isIsComposite)
    'isConjugated', // Port/Type가 역방향(conjugator)을 통해 뒤집힌 인터페이스인지 여부 (SysON TypeImpl.isIsConjugated)
    'isDerived', // Feature 값이 다른 관계를 통해 계산되는 파생값인지 여부 (SysON Feature.isIsDerived)
    'isEnd', // 관계 끝단을 나타내는 Feature인지 여부 (SysON Feature.isIsEnd)
    'isOrdered', // 다중 값이 순서를 유지해야 하는지 여부 (SysON Feature.isIsOrdered)
    'isPortion', // Occurrence/Feature가 특정 PortionKind에 해당하는 부분인지 여부 (SysON Feature.isIsPortion)
    'isReadOnly', // 표준 라이브러리/읽기 전용 리소스에 속해 편집 불가인지 여부 (DetailsViewService.isReadOnly)
    'isSufficient', // Type이 해당 분류를 충분 조건으로 만드는지 여부 (SysON Type.isIsSufficient)
    'isUnique', // 컬렉션 값이 중복을 허용하지 않는지 여부 (SysON Feature.isIsUnique)
    'isVariation', // Definition/Type이 Variation(바리에이션) 패턴인지 표시 (예: EnumerationDefinition.isVariation)
    'isModelLevelEvaluable', // 식(Function/Expression)이 모델 레벨에서 평가 가능한지 여부 (SysML Expression.isModelLevelEvaluable)
  ],
  ConstraintUsage: [
    'isImpliedIncluded', // 암시적 관계를 포함해야 함을 표시 (Element.isImpliedIncluded)
    'isLibraryElement', // 라이브러리 네임스페이스로부터 상속된 파생 요소 여부 (ElementImpl.isIsLibraryElement)
    'name', // 선언/재정의된 이름 기반 표시 이름 (ElementImpl.getName)
    'shortName', // 선언된 단축 이름 (ElementImpl.getDeclaredShortName)
    'isComposite', // ConstraintUsage가 소유 타입을 구성하는지 여부 (Feature.isIsComposite)
    'isConjugated', // Conjugation 관계를 통해 역방향 포트/특징인지 여부 (TypeImpl.isIsConjugated)
    'isDerived', // 값이 파생(derived) Feature인지 여부 (Feature.isIsDerived)
    'isEnd', // 관계 끝단 Feature인지 여부 (Feature.isIsEnd)
    'isOrdered', // 값 목록이 순서를 유지해야 하는지 여부 (Feature.isIsOrdered)
    'isPortion', // PortionKind 기반 부분 사용인지 여부 (Feature.isIsPortion)
    'isReadOnly', // 읽기 전용 리소스/라이브러리인지 여부 (DetailsViewService.isReadOnly)
    'isSufficient', // 해당 Type이 충분 조건인지 여부 (Type.isIsSufficient)
    'isUnique', // 값 중복 허용 여부 (Feature.isIsUnique)
    'isVariation', // 바리에이션(Variation) 정의로 취급되는지 여부 (EnumerationDefinition.isVariation 등)
    'isModelLevelEvaluable', // 식이 모델 레벨에서 평가 가능한지 여부 (Expression/Function.isModelLevelEvaluable)
  ],
  PartUsage: [
    'isImpliedIncluded', // 암시 관계 포함 여부 (Element.isImpliedIncluded)
    'isLibraryElement', // 라이브러리 소속 파생 요소인지 여부 (ElementImpl.isIsLibraryElement)
    'name', // 계산된 표시 이름 (ElementImpl.getName)
    'shortName', // 선언된 단축 이름 (ElementImpl.getDeclaredShortName)
    'isComposite', // PartUsage가 소유 타입을 구성하는지 여부 (Feature.isIsComposite)
    'isConjugated', // Conjugation으로 역방향 포트인지 여부 (TypeImpl.isIsConjugated)
    'isDerived', // 파생 Feature인지 여부 (Feature.isIsDerived)
    'isEnd', // 관계 끝단인지 여부 (Feature.isIsEnd)
    'isOrdered', // 정렬된 컬렉션인지 여부 (Feature.isIsOrdered)
    'isPortion', // PortionKind 기반 부분인지 여부 (Feature.isIsPortion)
    'isReadOnly', // 읽기 전용 상태인지 여부 (DetailsViewService.isReadOnly)
    'isSufficient', // 충분 조건을 만족하는 타입인지 여부 (Type.isIsSufficient)
    'isUnique', // 중복 허용 여부 (Feature.isIsUnique)
    'isVariation', // Variation 정의인지 여부 (EnumerationDefinition.isVariation 등)
  ],

  // Feature 계열 (isIndividual이 Advanced에 포함)
  PortUsage: [
    'isImpliedIncluded',
    'isLibraryElement',
    'name',
    'shortName',
    'isComposite',
    'isConjugated',
    'isDerived',
    'isEnd',
    'isIndividual',   // Advanced에 포함
    'isOrdered',
    'isPortion',
    'isReadOnly',
    'isSufficient',
    'isUnique',
    'isVariation',
  ],

  // Function/Expression 개별 타입
  Expression: [
    'isImpliedIncluded',
    'isLibraryElement',
    'name',
    'shortName',
    'isConjugated',
    'isSufficient',
    'isVariation',
    'isModelLevelEvaluable',
  ],
  Function: [
    'isImpliedIncluded',
    'isLibraryElement',
    'name',
    'shortName',
    'isConjugated',
    'isSufficient',
    'isVariation',
    'isModelLevelEvaluable',
  ],
};

// ========================================
// 속성별 메타데이터 (위젯 타입, 레이블 등)
// ========================================
const PROPERTY_METADATA = {
  // Element 속성
  declaredName: {
    label: 'Name',
    type: 'text',
    editable: true,
    hidden: false,
  },
  qualifiedName: {
    label: 'Qualified Name',
    type: 'textarea',
    editable: false,
    hidden: false,
  },
  declaredShortName: {
    label: 'Short Name',
    type: 'text',
    editable: true,
    hidden: true,
  },

  // Type 속성
  isAbstract: {
    label: 'Abstract',
    type: 'checkbox',
    editable: true,
    hidden: false,
  },

  // Feature 속성
  direction: {
    label: 'Direction',
    type: 'radio',
    editable: true,
    options: ['in', 'inout', 'out', 'unset'],
    hidden: false,
  },
  multiplicity: {
    label: 'Multiplicity',
    type: 'multiplicity',
    editable: true,
    hidden: false,
  },

  // OccurrenceDefinition/Usage 속성
  isIndividual: {
    label: 'Individual',
    type: 'checkbox',
    editable: true,
    hidden: false,
  },

  // State 속성
  isParallel: {
    label: 'Parallel',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },

  // Requirement 속성
  reqId: {
    label: 'Requirement ID',
    type: 'text',
    editable: true,
    hidden: true,
  },

  // Literal 및 EnumerationUsage 속성
  value: {
    label: 'Value',
    type: 'text',
    editable: true,
    hidden: false,
  },

  // Comment/Documentation 속성
  body: {
    label: 'Body',
    type: 'textarea',
    editable: true,
    hidden: true,
  },

  // Feature 속성 추가
  declaredType: {
    label: 'Typed By',
    type: 'type-select',
    editable: true,
    hidden: false,
  },

  // Membership 속성
  visibility: {
    label: 'Visibility',
    type: 'radio',
    editable: true,
    options: ['public', 'private', 'protected'],
    hidden: false,
  },
  memberElement: {
    label: 'Member Element',
    type: 'reference',
    editable: true,
    hidden: true,
  },

  // FeatureValue 속성
  isDefault: {
    label: 'Default',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },
  isInitial: {
    label: 'Initial',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },

  // Import 속성
  isImportAll: {
    label: 'Import All',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },
  isRecursive: {
    label: 'Recursive',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },
  importedMembership: {
    label: 'Imported Membership',
    type: 'reference',
    editable: true,
    hidden: true,
  },
  importedNamespace: {
    label: 'Imported Namespace',
    type: 'reference',
    editable: true,
    hidden: true,
  },

  // Specialization 속성
  general: {
    label: 'General',
    type: 'reference',
    editable: true,
    hidden: true,
  },
  specific: {
    label: 'Specific',
    type: 'reference',
    editable: true,
    hidden: true,
  },

  // FeatureTyping 속성
  type: {
    label: 'Type',
    type: 'reference',
    editable: true,
    hidden: true,
  },
  typedFeature: {
    label: 'Typed Feature',
    type: 'reference',
    editable: true,
    hidden: true,
  },

  // Subsetting 속성
  subsettedFeature: {
    label: 'Subsetted Feature',
    type: 'reference',
    editable: true,
    hidden: true,
  },
  subsettingFeature: {
    label: 'Subsetting Feature',
    type: 'reference',
    editable: true,
    hidden: true,
  },

  // Redefinition 속성
  redefinedFeature: {
    label: 'Redefined Feature',
    type: 'reference',
    editable: true,
    hidden: true,
  },
  redefiningFeature: {
    label: 'Redefining Feature',
    type: 'reference',
    editable: true,
    hidden: true,
  },

  // Subclassification 속성
  subclassifier: {
    label: 'Subclassifier',
    type: 'reference',
    editable: true,
    hidden: true,
  },
  superclassifier: {
    label: 'Superclassifier',
    type: 'reference',
    editable: true,
    hidden: true,
  },

  // Dependency 속성
  client: {
    label: 'Client',
    type: 'reference',
    editable: true,
    hidden: true,
  },
  supplier: {
    label: 'Supplier',
    type: 'reference',
    editable: true,
    hidden: true,
  },

  // TextualRepresentation 속성
  language: {
    label: 'Language',
    type: 'text',
    editable: true,
    hidden: true,
  },

  // PortConjugation 속성
  conjugatedType: {
    label: 'Conjugated Type',
    type: 'reference',
    editable: true,
    hidden: true,
  },
  originalPortDefinition: {
    label: 'Original Port Definition',
    type: 'reference',
    editable: true,
    hidden: true,
  },

  // ReferenceSubsetting 속성
  referencedFeature: {
    label: 'Referenced Feature',
    type: 'reference',
    editable: true,
    hidden: true,
  },
  referencingFeature: {
    label: 'Referencing Feature',
    type: 'reference',
    editable: true,
    hidden: true,
  },

  // RequirementConstraintMembership 속성
  kind: {
    label: 'Kind',
    type: 'radio',
    editable: true,
    options: ['assumption', 'requirement'],
    hidden: true,
  },

  // 에지 생성 위젯 속성 (Usage 노드 전용)
  subsets: {
    label: 'Subset',
    type: 'edge-tag-select',
    edgeType: 'subsetting',
    editable: true,
    hidden: false,
  },
  redefines: {
    label: 'Redefine',
    type: 'edge-tag-select',
    edgeType: 'redefinition',
    editable: true,
    hidden: false,
  },

  // ViewUsage 속성
  exposedElement: {
    label: 'Exposed Element',
    type: 'reference',
    editable: true,
    hidden: true,
  },

  // ========================================
  // Advanced 탭 속성 메타데이터
  // ========================================

  // Element Advanced 속성
  elementId: {
    label: 'Element Id',
    type: 'inline',
    editable: false, // 읽기 전용 (시스템 생성)
    hidden: false,
  },
  isImpliedIncluded: {
    label: 'Is Implied Included',
    type: 'checkbox',
    editable: false, // 내부 시스템 속성 (암시적 관계 포함 여부), 사용자 편집 대상 아님
    hidden: true,
  },
  isLibraryElement: {
    label: 'Is Library Element',
    type: 'checkbox',
    editable: false, // 읽기 전용
    hidden: true,
  },
  name: {
    label: 'Name',
    type: 'inline',
    editable: false, // derived
    hidden: true,
  },
  shortName: {
    label: 'Short Name',
    type: 'label-only',
    editable: false, // derived - 값이 있을 때만 라벨 옆에 표시
    hidden: true,
  },

  // Type Advanced 속성
  isConjugated: {
    label: 'Is Conjugated',
    type: 'checkbox',
    editable: false, // 파생 속성: ownedConjugator != null 일 때 자동 true, 직접 설정 불가
    hidden: true,
  },
  isSufficient: {
    label: 'Is Sufficient',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },

  // Definition Advanced 속성
  isVariation: {
    label: 'Is Variation',
    type: 'checkbox',
    editable: true,
    hidden: false,
  },

  // Feature Advanced 속성
  isComposite: {
    label: 'Is Composite',
    type: 'checkbox',
    editable: true,
    hidden: false,
  },
  isConstant: {
    label: 'Is Constant',
    type: 'checkbox',
    editable: false, // isReadOnly(readonly 키워드)와 동일 개념. isReadOnly로 제어
    hidden: true,
  },
  isDerived: {
    label: 'Is Derived',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },
  isEnd: {
    label: 'Is End',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },
  isNonunique: {
    label: 'Is Nonunique',
    type: 'checkbox',
    editable: false, // derived (= !isUnique)
    hidden: true,
  },
  isOrdered: {
    label: 'Is Ordered',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },
  isPortion: {
    label: 'Is Portion',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },
  isReadOnly: {
    label: 'Is Read Only',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },
  isUnique: {
    label: 'Is Unique',
    type: 'checkbox',
    editable: true,
    hidden: true,
  },
  isVariable: {
    label: 'Is Variable',
    type: 'checkbox',
    editable: false, // 파생 속성 (mayTimeVary와 연관, 직접 설정 불가)
    hidden: true,
  },

  // Usage Advanced 속성
  isReference: {
    label: 'Is Reference',
    type: 'checkbox',
    editable: false, // 파생 속성: !isComposite. isComposite 변경 시 자동 반영
    hidden: true,
  },
  mayTimeVary: {
    label: 'May Time Vary',
    type: 'checkbox',
    editable: false, // derived (redefines isVariable)
    hidden: true,
  },

  // OccurrenceUsage Advanced 속성
  portionKind: {
    label: 'Portion Kind',
    type: 'radio',
    editable: true,
    options: ['snapshot', 'timeslice', 'unset'],
    hidden: true,
  },

  // Comment/Documentation 위젯 (Core 탭 공통)
  comment: {
    label: 'Comment',
    type: 'textarea',
    editable: true,
    hidden: false,
  },
  documentation: {
    label: 'Documentation',
    type: 'textarea',
    editable: true,
    hidden: false,
  },
};

// ========================================
// Advanced 탭 속성 그룹 정의 (UI 그룹핑)
// - 속성이 여러 그룹에 속할 수 있지만, 실제 표시는 advancedProps 목록 순서를 따름
// - 그룹 헤더는 해당 그룹의 첫 번째 속성이 렌더링될 때 삽입됨
// ========================================
const ADVANCED_PROPERTY_GROUPS = [
    {
        label: '시스템 정보',
        properties: ['name', 'shortName', 'isImpliedIncluded', 'isLibraryElement'],
    },
    {
        label: '소유 관계',
        properties: ['isComposite'],
    },
    {
        label: '기능 특성',
        properties: ['isDerived', 'isOrdered', 'isUnique', 'isNonunique', 'isEnd', 'isPortion', 'portionKind'],
    },
    {
        label: '접근 제어',
        properties: ['isReadOnly', 'isConstant', 'isVariable', 'mayTimeVary', 'isIndividual', 'isParallel', 'isModelLevelEvaluable'],
    },
];

// ========================================
// 속성 간 제약 조건 (SysML v2 메타모델 기반)
// Feature/Usage 레벨에서 정의되므로 모든 하위 타입에 자동 적용됨
// ========================================
const PROPERTY_CONSTRAINTS = {
    isEnd: {
        // isEnd=true이면 isDerived, isComposite, isPortion, isAbstract는 반드시 false + 비활성화
        // validateFeatureEndNotDerivedAbstractCompositeOrPortion (SysMLv2ValidationRules:304)
        // validateFeatureEndNoDirection (SysMLv2ValidationRules:303)
        whenTrue: {
            forceOff:   ['isDerived', 'isComposite', 'isPortion', 'isAbstract'],
            forceValue: { direction: null },
            disable:    ['isDerived', 'isComposite', 'isPortion', 'isAbstract', 'direction'],
        },
        // isEnd=false이면 제약 해제
        whenFalse: {
            enable: ['isDerived', 'isComposite', 'isPortion', 'isAbstract', 'direction'],
        },
    },
    isVariation: {
        // isVariation=true이면 isAbstract 반드시 true + 잠금
        // validateDefinitionVariationIsAbstract (SysMLv2ValidationRules:277)
        // validateUsageVariationIsAbstract (SysMLv2ValidationRules:408)
        whenTrue: {
            forceOn:  ['isAbstract'],
            disable:  ['isAbstract'],
        },
        // isVariation=false이면 isAbstract 잠금 해제
        whenFalse: {
            enable: ['isAbstract'],
        },
    },
    isAbstract: {
        // isAbstract=true이면 isVariation 비활성화 (상호배타: variation은 이미 추상 속성을 내포)
        whenTrue: {
            disable: ['isVariation'],
        },
        // isAbstract=false이면 isVariation 활성화
        whenFalse: {
            enable: ['isVariation'],
        },
    },
    isConstant: {
        // isConstant=true이면 isVariable도 true여야 함 (표시 강제)
        // validateFeatureConstantIsVariable (SysMLv2ValidationRules:298)
        whenTrue: {
            forceOn: ['isVariable'],
        },
    },
    isPortion: {
        // isPortion=true이면 isVariable은 false여야 함 (표시 강제)
        // validateFeaturePortionNotVariable (SysMLv2ValidationRules:309)
        whenTrue: {
            forceOff: ['isVariable'],
        },
    },
    isVariable: {
        // 파생 속성 (mayTimeVary와 연관, 직접 설정 불가)
        whenTrue: {
            disable: ['mayTimeVary'],
        },
        whenFalse: {
            enable: ['mayTimeVary'],
        },
    },
    isReadOnly: {
        // isReadOnly=true이면 isConstant도 true여야 함 (표시 강제)
        // validateFeatureReadOnlyIsConstant (SysMLv2ValidationRules:310)
        whenTrue: {
            forceOn: ['isConstant'],
        },
    },
};

// ========================================
// 타입별 초기값 강제 제약 (SysML v2 메타모델 기반)
// 특정 타입에서 항상 특정 값이어야 하는 속성을 정의
// ========================================
const TYPE_CONSTRAINTS = {
    // validateConnectionDefinitionIsSufficient (SysMLv2ValidationRules:263)
    ConnectionDefinition: {
        isSufficient: { forceTrue: true, disable: true },
    },
    // validateAttributeUsageIsReference (SysMLv2ValidationRules:249)
    AttributeUsage: {
        isReference: { forceTrue: true },
    },
    // validateReferenceUsageIsReference (SysMLv2ValidationRules:363)
    ReferenceUsage: {
        isReference: { forceTrue: true },
    },
    // validateEventOccurrenceUsageIsReference (SysMLv2ValidationRules:285)
    EventOccurrenceUsage: {
        isReference: { forceTrue: true },
    },
    // validateEnumerationDefinitionIsVariation (SysMLv2ValidationRules:284)
    EnumerationDefinition: {
        isVariation: { forceTrue: true, disable: true },
    },
};

// ========================================
// 타입별 항상 비활성화되는 속성 목록
// - enum def: SysML v2 사양에 따라 abstract/variation 키워드 사용 불가
// ========================================
const TYPE_DISABLED_PROPERTIES = {
    EnumerationDefinition: ['isAbstract', 'isVariation'],
};

// ========================================
// 타입 상속 계층 (Fallback용)
// ========================================
const TYPE_INHERITANCE = {
  // Definition 계열
  ActionDefinition: 'OccurrenceDefinition',
  AllocationDefinition: 'ConnectionDefinition',
  AttributeDefinition: 'Definition',
  CaseDefinition: 'CalculationDefinition',
  CalculationDefinition: 'ActionDefinition',
  ConcernDefinition: 'RequirementDefinition',
  ConnectionDefinition: 'PartDefinition',
  ConstraintDefinition: 'OccurrenceDefinition',
  EnumerationDefinition: 'AttributeDefinition',
  InterfaceDefinition: 'ConnectionDefinition',
  ItemDefinition: 'OccurrenceDefinition',
  MetadataDefinition: 'ItemDefinition',
  OccurrenceDefinition: 'Definition',
  PartDefinition: 'ItemDefinition',
  PortDefinition: 'OccurrenceDefinition',
  RequirementDefinition: 'ConstraintDefinition',
  StateDefinition: 'ActionDefinition',
  UseCaseDefinition: 'CaseDefinition',

  // Usage 계열
  ActionUsage: 'OccurrenceUsage',
  AllocationUsage: 'ConnectionUsage',
  AttributeUsage: 'Usage',
  CaseUsage: 'CalculationUsage',
  CalculationUsage: 'ActionUsage',
  ConcernUsage: 'RequirementUsage',
  ConnectionUsage: 'PartUsage',
  ConstraintUsage: 'OccurrenceUsage',
  InterfaceUsage: 'ConnectionUsage',
  ItemUsage: 'OccurrenceUsage',
  OccurrenceUsage: 'Usage',
  PartUsage: 'ItemUsage',
  PortUsage: 'OccurrenceUsage',
  RequirementUsage: 'ConstraintUsage',
  StateUsage: 'ActionUsage',
  UseCaseUsage: 'CaseUsage',
  ViewUsage: 'PartUsage',

  // 특수 Usage
  AcceptActionUsage: 'ActionUsage',
  AssignmentActionUsage: 'ActionUsage',
  ExhibitStateUsage: 'StateUsage',
  PerformActionUsage: 'ActionUsage',
  SatisfyRequirementUsage: 'RequirementUsage',
};

// ========================================
// 헬퍼 함수
// ========================================

/**
 * 타입에 해당하는 Core Properties 반환
 * - 정의된 규칙이 없으면 상속 계층을 따라 fallback
 * @param {string} type - 노드 타입
 * @returns {string[]} - 속성 이름 배열
 */
function getCoreProperties(type) {
  if (!type) return ELEMENT_CORE;

  // 대소문자 무시: 정확히 일치하는 키 찾기
  let matchedKey = Object.keys(CORE_PROPERTIES).find(
    key => key.toLowerCase() === type.toLowerCase()
  );

  // 직접 정의된 규칙이 있으면 반환
  if (matchedKey) {
    return CORE_PROPERTIES[matchedKey];
  }

  // 상속 계층을 따라 fallback (대소문자 무시)
  matchedKey = Object.keys(TYPE_INHERITANCE).find(
    key => key.toLowerCase() === type.toLowerCase()
  );
  const parentType = matchedKey ? TYPE_INHERITANCE[matchedKey] : null;
  if (parentType) {
    return getCoreProperties(parentType);
  }

  // 최종 fallback: Element 기본 속성
  return ELEMENT_CORE;
}

/**
 * 타입에 해당하는 Advanced Properties 반환
 * - Core에 포함되지 않은 모든 속성
 * @param {string} type - 노드 타입
 * @returns {string[]} - 속성 이름 배열
 */
function getAdvancedProperties(type) {
  if (!type) return [];

  // 대소문자 무시: 정확히 일치하는 키 찾기
  const matchedKey = Object.keys(ADVANCED_PROPERTIES).find(
    key => key.toLowerCase() === type.toLowerCase()
  );

  // 직접 정의된 규칙이 있으면 반환
  if (matchedKey) {
    return ADVANCED_PROPERTIES[matchedKey];
  }

  // Definition 계열
  if (isDefinition(type)) {
    // OccurrenceDefinition 계열인지 Type 계열인지 확인
    const occurrenceDefinitionTypes = [
      'ActionDefinition', 'AllocationDefinition', 'CaseDefinition',
      'ConcernDefinition', 'ConnectionDefinition', 'ConstraintDefinition',
      'InterfaceDefinition', 'ItemDefinition', 'OccurrenceDefinition',
      'PartDefinition', 'PortDefinition', 'RequirementDefinition',
      'StateDefinition', 'UseCaseDefinition',
    ];
    // 대소문자 무시 비교
    if (occurrenceDefinitionTypes.some(t => t.toLowerCase() === type.toLowerCase())) {
      return ADVANCED_PROPERTIES._OccurrenceDefinitionCommon || [];
    }
    return ADVANCED_PROPERTIES._TypeDefinitionCommon || [];
  }

  // Usage 계열
  if (isUsage(type)) {
    // OccurrenceUsage 계열인지 Feature 계열인지 확인
    const featureUsageTypes = ['AttributeUsage', 'PortUsage'];
    // 대소문자 무시 비교
    if (featureUsageTypes.some(t => t.toLowerCase() === type.toLowerCase())) {
      return ADVANCED_PROPERTIES._FeatureUsageCommon || [];
    }
    return ADVANCED_PROPERTIES._OccurrenceUsageCommon || [];
  }

  return [];
}

/**
 * Core 탭에 표시되는 공통 위젯 반환
 * - Comment, Documentation, Visibility
 * @returns {string[]}
 */
function getCommonCoreWidgets() {
  return COMMON_CORE_WIDGETS;
}

/**
 * 속성의 메타데이터 반환
 * @param {string} propertyName - 속성 이름
 * @returns {object} - 메타데이터 객체
 */
function getPropertyMetadata(propertyName) {
  return PROPERTY_METADATA[propertyName] || {
    label: propertyName,
    type: 'text',
    editable: true,
  };
}

/**
 * 타입이 Definition인지 확인
 * @param {string} type - 노드 타입
 * @returns {boolean}
 */
function isDefinition(type) {
  return type && type.endsWith('Definition');
}

/**
 * 타입이 Usage인지 확인
 * @param {string} type - 노드 타입
 * @returns {boolean}
 */
function isUsage(type) {
  return type && type.endsWith('Usage');
}

/**
 * 속성이 편집 가능한지 확인
 * @param {string} propertyName - 속성 이름
 * @returns {boolean}
 */
function isPropertyEditable(propertyName) {
  const metadata = getPropertyMetadata(propertyName);
  return metadata.editable !== false;
}

/**
 * 속성이 숨김 처리되어야 하는지 확인
 * @param {string} propertyName - 속성 이름
 * @returns {boolean} - hidden: true이면 true 반환
 */
function isPropertyHidden(propertyName) {
  const metadata = getPropertyMetadata(propertyName);
  return metadata.hidden === true;
}

/**
 * 속성의 위젯 타입 반환
 * @param {string} propertyName - 속성 이름
 * @returns {string} - 'text' | 'textarea' | 'checkbox' | 'radio' | 'reference'
 */
function getPropertyWidgetType(propertyName) {
  const metadata = getPropertyMetadata(propertyName);
  return metadata.type || 'text';
}

/**
 * 속성의 레이블 반환
 * @param {string} propertyName - 속성 이름
 * @returns {string}
 */
function getPropertyLabel(propertyName) {
  const metadata = getPropertyMetadata(propertyName);
  return metadata.label || propertyName;
}

/**
 * Radio/Select 타입 속성의 옵션 반환
 * @param {string} propertyName - 속성 이름
 * @returns {string[]} - 옵션 배열
 */
function getPropertyOptions(propertyName) {
  const metadata = getPropertyMetadata(propertyName);
  return metadata.options || [];
}

    // 네임스페이스에 등록
    ns.Editor.config.propertyRules = {
        CORE_PROPERTIES,
        ADVANCED_PROPERTIES,
        PROPERTY_METADATA,
        ADVANCED_PROPERTY_GROUPS,
        PROPERTY_CONSTRAINTS,
        TYPE_CONSTRAINTS,
        TYPE_INHERITANCE,
        getCoreProperties,
        getAdvancedProperties,
        getCommonCoreWidgets,
        getPropertyMetadata,
        isDefinition,
        isUsage,
        isPropertyEditable,
        isPropertyHidden,
        getPropertyWidgetType,
        getPropertyLabel,
        getPropertyOptions,
    };
})();
