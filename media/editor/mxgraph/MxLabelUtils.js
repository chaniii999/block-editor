/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxLabelUtils.js - 라벨 포맷팅 및 스타일 유틸리티
 * MxCellFactory에서 분리된 라벨/스타일 관련 함수들
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.labelUtils = ns.MxGraph.labelUtils || {};

    const NESTED_SPEC_HEADER_EMOJI = '🔼';

    // 로그 함수
    function log(prefix, ...args) {
        try {
            console.log(`[MxLabelUtils] ${prefix}`, ...args);
        } catch (_) {}
    }

    /**
     * 텍스트를 최대 글자 수에 맞게 줄바꿈
     * @param {string} text - 원본 텍스트
     * @param {number} maxChars - 한 줄 최대 글자 수
     * @returns {string} 줄바꿈된 텍스트
     */
    function wrapTextByMaxWidth(text, maxChars = 25) {
        // SELab: 텍스트 강제 줄바꿈 제거 - ELK에서 폭을 결정하도록 위임
        return text || '';
    }

    /**
     * 라벨 포맷팅
     * @param {string} name - 요소 이름
     * @param {string} type - 요소 타입
     * @param {Object} [options] - 추가 옵션 (isAbstract, isVariation 등)
     * @returns {string} 포맷된 라벨
     */
    function formatLabel(name, type, options = {}) {
        const {
            isAbstract,
            isVariation,
            isIndividual,
            declaredType,
            stereotype: customStereotype,
            specializationTargets,
            nestedSpecParentNames,
            nodeId,
            hasAssociations,
        } = options;

        const withAssocLink = (displayText) => {
            if (!hasAssociations || !nodeId) {
                return displayText;
            }
            const append = ns.MxGraph.associationLink?.appendLinkToNameHtml;
            return append ? append(displayText, nodeId) : displayText;
        };
        
        const typeLower = String(type || '').toLowerCase();
        
        // EnumerationDefinition은 abstract/variation 키워드를 표시하지 않음
        const isEnumDef = typeLower === 'enumerationdefinition' || typeLower.includes('enum');
        
        // SysON 스타일: abstract/variation/individual은 스테레오타입 안에 포함
        // 예: «abstract part def», «variation part def», «individual occurrence def»
        // 우선순위: individual > variation > abstract (SysON 규칙)
        // 단, individual occurrence의 경우 «individual occurrence»가 아닌 «individual»만 표시 (occurrence 중복 방지)
        let keywordPrefix = '';
        if (!isEnumDef) {
            if (isIndividual === true) {
                keywordPrefix = 'individual ';
            } else if (isVariation === true) {
                keywordPrefix = 'variation ';
            } else if (isAbstract === true) {
                keywordPrefix = 'abstract ';
            }
        }
        
        // Package는 이름만 표시 (swimlane 헤더에 표시됨)
        // library package도 일반 package로 처리
        if (typeLower === 'package' || typeLower === 'librarypackage') {
            return withAssocLink(name);
        }
        
        // SysML v2: Usage 타입은 "name : TypeName" 형식으로 표시
        // 예: occurrence1 : OccurrenceDef1
        // 단, EventOccurrenceUsage는 타입 정보 표시하지 않음 (syson 스타일)
        // 이미 name에 타입 정보가 포함되어 있으면 (': ' 포함) 중복 추가하지 않음
        // ActionUsage의 경우 기본 타입(Action)은 표시하지 않음 (SysON 스타일)
        let displayName = name;
        const nameAlreadyHasType = name && (name.includes(' : ') || /\w:\w/.test(name));
        // 기본 타입 목록: 해당 Usage의 기본 Definition 타입이면 표시하지 않음
        const defaultTypeMap = {
            'actionusage': 'Action',
            'partusage': 'Part',
            'itemusage': 'Item',
            'portusage': 'Port',
            'stateusage': 'State',
            'attributeusage': null,  // attribute는 타입 표시
            'occurrenceusage': 'Occurrence'
        };
        const defaultType = defaultTypeMap[typeLower];
        const isDefaultType = defaultType && declaredType === defaultType;
        
        // Portion (snapshot/timeslice)인 경우 declaredType을 붙이지 않음 (이름만 표시)
        const isPortionNode = options.isPortion === true || (options.portionKind && options.portionKind !== 'unset');
        
        if (declaredType && typeLower.endsWith('usage') && typeLower !== 'eventoccurrenceusage' && !nameAlreadyHasType && !isDefaultType && !isPortionNode) {
            displayName = `${name} : ${declaredType}`;
        }
        
        // containment 부모 = spec 부모: 상속선 대신 헤더 이모지 (선택 시 부모 하이라이트)
        if (
            Array.isArray(nestedSpecParentNames) &&
            nestedSpecParentNames.length > 0
        ) {
            const tip = `포함 부모 타입 상속: ${nestedSpecParentNames.join(', ')}`;
            displayName = `<span title="${tip}">${NESTED_SPEC_HEADER_EMOJI}</span> ${displayName}`;
        } else if (
            Array.isArray(specializationTargets) &&
            specializationTargets.length > 0 &&
            typeLower.endsWith('definition')
        ) {
            // SysOn 스타일: "TrafficLightGo :> TrafficLight"
            displayName = `${displayName} :> ${specializationTargets.join(', ')}`;
        }
        
        // 최대 너비 제한: 텍스트가 너무 길면 줄바꿈 추가
        displayName = wrapTextByMaxWidth(displayName, 25);
        
        // comment/documentation은 별도 처리 (상위에서 이미 body 사용)
        
        const utils = ns.Editor?.utils;
        if (utils?.shouldShowStereotypesInUi?.() === false) {
            return withAssocLink(displayName);
        }

        // Language Extension 키워드의 경우 customStereotype 우선 사용
        const stereotype = customStereotype || utils?.getStereotypeText?.(type);
        if (stereotype) {
            // 스테레오타입에 abstract/variation 키워드 포함
            // 예: «part def» → «abstract part def»
            // Language Extension 키워드(«#scenario» 등)는 keywordPrefix를 추가하지 않음
            const isLanguageExtension = customStereotype && customStereotype.includes('#');
            const modifiedStereotype = (keywordPrefix && !isLanguageExtension)
                ? stereotype.replace('«', `«${keywordPrefix}`)
                : stereotype;
            return `<div style="text-align:center;">${modifiedStereotype}</div>${withAssocLink(displayName)}`;
        }
        
        // fallback: type 키워드 포맷
        const typeKeyword = getTypeKeyword(type, options);
        if (typeKeyword) {
            // 스테레오타입에 abstract/variation 키워드 포함
            return `<div style="text-align:center;">«${keywordPrefix}${typeKeyword}»</div>${withAssocLink(displayName)}`;
        }
        // typeKeyword가 없고 keywordPrefix만 있는 경우 (individual occurrence)
        if (keywordPrefix) {
            return `<div style="text-align:center;">«${keywordPrefix.trim()}»</div>${withAssocLink(displayName)}`;
        }
        return withAssocLink(displayName);
    }

    /**
     * 타입에서 키워드 추출
     * @param {string} type
     * @param {Object} [options] - 추가 옵션 (isIndividual 등)
     * @returns {string}
     */
    function getTypeKeyword(type, options = {}) {
        if (ns.Editor?.utils?.shouldShowStereotypesInUi?.() === false) {
            return '';
        }
        const rawType = String(type || '');
        const normalized = rawType.toLowerCase().replace(/\s+/g, '');
        const { isIndividual } = options;
        
        // Block editor 전용 usage 타입 — stereotype 표시하지 않음
        const blockUsageNoStereotype = new Set([
            'partusage', 'portusage', 'interfaceusage', 'usecaseusage',
            'package', 'librarypackage',
        ]);
        if (blockUsageNoStereotype.has(normalized)) {
            return '';
        }

        const special = {
            'comment': 'comment',
            'actorusage': 'actor',
        };

        if (special[normalized]) {
            return special[normalized];
        }

        const replaceSuffix = (value, suffix) => {
            const regex = new RegExp(`${suffix}$`, 'i');
            return value.replace(regex, '');
        };

        const toPretty = (value) => value.replace(/([a-z])([A-Z])/g, '$1 $2').trim().toLowerCase();
        const ensureKeyword = (word) => {
            const trimmed = String(word || '').trim();
            return trimmed.length > 0 ? trimmed : '';
        };

        // Definition 계열: «xxx def»
        if (normalized.endsWith('definition')) {
            const root = replaceSuffix(rawType, 'Definition');
            return `${ensureKeyword(toPretty(root))} def`.trim();
        }

        // Usage 계열
        if (normalized.endsWith('usage')) {
            let root = replaceSuffix(rawType, 'Usage');

            // conjugatedXUsage → «conjugated x»
            if (/conjugated[a-z]+usage$/i.test(normalized)) {
                root = replaceSuffix(root, 'Conjugated');
                return `conjugated ${ensureKeyword(toPretty(root))}`.trim();
            }

            // includeUseCaseUsage → «include use case»
            if (/includeusecaseusage$/i.test(normalized)) {
                return 'include use case';
            }

            // individual occurrence의 경우 occurrence 키워드 제거 (중복 방지)
            if (isIndividual === true && normalized === 'occurrenceusage') {
                return '';
            }

            // default Usage: «xxx»
            return ensureKeyword(toPretty(root));
        }

        // 포트/커넥터 등 특정 타입
        if (normalized.includes('port')) return 'port';
        if (normalized.includes('connector')) return 'connector';
        if (normalized.includes('item')) return 'item';

        return '';
    }

    /**
     * 역할별 스타일 오버라이드
     * @param {string} role - 역할 (initial, final, decision, merge, fork, join)
     * @param {string} typeLower - 소문자 타입
     * @param {Object} base - 기본 스타일 정보 { style, label, name, width, height }
     * @returns {Object} 오버라이드된 스타일 정보
     */
    function getRoleStyleOverrides(role, typeLower, base) {
        const result = {
            style: base.style,
            label: base.label,
            width: base.width,
            height: base.height,
            roleLabel: null
        };
        const plainName = base.name || '';

        if (role === 'initial') {
            result.style = [
                'shape=ellipse',
                'perimeter=ellipsePerimeter',
                'whiteSpace=wrap',
                'html=1',
                'fillColor=#111111',
                'strokeColor=#111111',
                'strokeWidth=2',
                'align=center',
                'verticalAlign=middle',
                'fontColor=#ffffff'
            ].join(';');
            result.width = 28;
            result.height = 28;
            result.roleLabel = plainName;
            result.label = '';
            return result;
        }

        if (role === 'final') {
            result.style = [
                'shape=doubleEllipse',
                'perimeter=ellipsePerimeter',
                'whiteSpace=wrap',
                'html=1',
                'fillColor=#ffffff',
                'strokeColor=#111111',
                'strokeWidth=2',
                'align=center',
                'verticalAlign=middle',
                'fontColor=#000000'
            ].join(';');
            result.width = 34;
            result.height = 34;
            result.roleLabel = plainName;
            result.label = '';
            return result;
        }

        if (role === 'decision' || role === 'merge') {
            result.style = [
                'shape=rhombus',
                'perimeter=rhombusPerimeter',
                'whiteSpace=wrap',
                'html=0',
                'fillColor=#ffffff',
                'strokeColor=#111111',
                'strokeWidth=2',
                'align=center',
                'verticalAlign=middle'
            ].join(';');
            result.width = 72;
            result.height = 72;
            result.roleLabel = plainName;
            result.label = '';
            return result;
        }

        // SysML v2 표준: terminate 액션은 둥근 모서리 사각형 (일반 ActionUsage와 동일)
        // «terminate» 스테레오타입 + 대상 이름 표시
        if (role === 'terminate') {
            result.style = [
                'shape=rectangle',
                'rounded=1',
                'arcSize=20',
                'whiteSpace=wrap',
                'html=0',
                'fillColor=#ffffff',
                'strokeColor=#FF8C00',
                'strokeWidth=1.5',
                'align=center',
                'verticalAlign=middle',
                'resizable=1',
                'movable=1',
                'connectable=1'
            ].join(';');
            result.width = 120;
            result.height = 50;
            // 노드 아래 별도 라벨 제거 (노드 내부에 이미 표시됨)
            result.roleLabel = null;
            return result;
        }

        if (role === 'fork' || role === 'join') {
            const isFork = role === 'fork';
            result.style = [
                'shape=rectangle',
                'whiteSpace=wrap',
                'html=0',
                `fillColor=${isFork ? '#111111' : '#111111'}`,
                'strokeColor=#111111',
                'strokeWidth=2',
                'align=center',
                'verticalAlign=middle'
            ].join(';');
            result.width = Math.max(80, base.width);
            result.height = 20;
            console.log(`[MxLabelUtils] fork/join 스타일 적용: role=${role}, width=${result.width}, height=${result.height}, base.width=${base.width}, base.height=${base.height}`);
            result.roleLabel = plainName;
            result.label = '';
            return result;
        }

        return result;
    }

    /**
     * 역할 라벨 셀 생성
     * @param {mxGraph} graph - mxGraph 인스턴스
     * @param {mxCell} parentCell - 부모 셀
     * @param {string} text - 라벨 텍스트
     */
    function createRoleLabelCell(graph, parentCell, text) {
        if (!graph || !parentCell || !text) return;
        const labelStyle = [
            'shape=label',
            'html=1',
            'fontStyle=1',
            'fontSize=12',
            'align=center',
            'verticalAlign=top',
            'strokeColor=none',
            'fillColor=none'
        ].join(';');

        const labelCell = graph.insertVertex(
            parentCell,
            `${parentCell.id}::roleLabel`,
            text,
            0.5,
            1,
            0,
            0,
            labelStyle
        );

        const geo = labelCell.getGeometry();
        if (geo) {
            geo.relative = true;
            geo.offset = new mxPoint(0, 8);
        }

        labelCell.setConnectable(false);
    }

    // 모듈 export
    ns.MxGraph.labelUtils.wrapTextByMaxWidth = wrapTextByMaxWidth;
    ns.MxGraph.labelUtils.formatLabel = formatLabel;
    ns.MxGraph.labelUtils.getTypeKeyword = getTypeKeyword;
    ns.MxGraph.labelUtils.getRoleStyleOverrides = getRoleStyleOverrides;
    ns.MxGraph.labelUtils.createRoleLabelCell = createRoleLabelCell;

    log('MxLabelUtils 모듈 로드 완료');
})();
