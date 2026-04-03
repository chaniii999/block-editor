/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxTypeUtils.js - mxGraph 공통 타입 체크 및 유틸리티 함수
 * 중복 로직 통합: isContainerLikeType, escapeHtml 등
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.typeUtils = ns.MxGraph.typeUtils || {};

    /**
     * typeRegistry 참조 헬퍼
     * @returns {Object}
     */
    function getTypeRegistry() {
        return ns.Editor?.config?.typeRegistry || {};
    }

    /**
     * 컨테이너 유사 타입 여부 판단 (compartment/fold 대상)
     * definition, usage 계열 타입들을 통합 체크
     * @param {string} typeLower - 소문자로 변환된 타입명
     * @returns {boolean}
     */
    function isContainerLikeType(typeLower) {
        if (!typeLower) return false;
        const typeReg = getTypeRegistry();

        // typeRegistry에 isContainerType이 있으면 우선 사용
        if (typeReg.isContainerType?.(typeLower)) return true;

        // 하드코딩된 타입 리스트 (SysML v2 표준 기반)
        return (
            typeLower.includes('definition') ||
            typeLower.includes('package') ||
            typeLower.includes('partusage') ||
            typeLower.includes('actionusage') ||
            typeLower.includes('calculationusage') ||
            typeLower.includes('requirementusage') ||
            typeLower.includes('caseusage') ||
            typeLower.includes('usecaseusage') ||
            typeLower.includes('concernusage') ||
            typeLower.includes('viewpointusage') ||
            typeLower.includes('viewusage') ||
            typeLower.includes('occurrenceusage') ||
            typeLower === 'usage'
        );
    }

    /**
     * 패키지 타입 여부 판단
     * @param {string} typeLower - 소문자로 변환된 타입명
     * @returns {boolean}
     */
    function isPackageType(typeLower) {
        if (!typeLower) return false;
        const typeReg = getTypeRegistry();
        return !!(typeReg.isPackageType?.(typeLower) || typeLower === 'package');
    }

    /**
     * 주석 타입 여부 판단
     * @param {string} typeLower - 소문자로 변환된 타입명
     * @returns {boolean}
     */
    function isAnnotationType(typeLower) {
        if (!typeLower) return false;
        const typeReg = getTypeRegistry();
        return !!(typeReg.isAnnotationType?.(typeLower) || 
            typeLower === 'comment' || 
            typeLower === 'documentation' ||
            typeLower === 'textualrepresentation');
    }

    /**
     * HTML 이스케이프 처리
     * @param {string} text - 원본 텍스트
     * @returns {string} 이스케이프된 텍스트
     */
    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * 노드 데이터에서 타입 문자열 추출 (소문자)
     * @param {Object} nodeData - 노드 데이터
     * @returns {string}
     */
    function getTypeLower(nodeData) {
        if (!nodeData) return '';
        return String(nodeData.type || nodeData.kind || '').toLowerCase();
    }

    /**
     * 요소 타입에 따른 아이콘 파일명 반환
     * @param {string} typeLower - 소문자로 변환된 타입명
     * @returns {string|null} 아이콘 파일명 (확장자 포함)
     */
    function getIconFilename(typeLower) {
        if (!typeLower) return null;

        let baseType = typeLower;
        let isDef = false;

        if (typeLower.endsWith('definition')) {
            baseType = typeLower.replace('definition', '');
            isDef = true;
        } else if (typeLower.endsWith('usage')) {
            baseType = typeLower.replace('usage', '');
        }

        // 특정 타입 매핑 보정
        const mapping = {
            'part': 'Part',
            'action': 'Action',
            'attribute': 'Attribute',
            'constraint': 'Constraint',
            'interface': 'Interface',
            'item': 'Item',
            'package': 'Package',
            'port': 'Port',
            'requirement': 'Requirement',
            'state': 'State',
            'usecase': 'Use Case',
            'folder': 'Folder',
            'librarypackage': 'Package' // LibraryPackage도 Package 아이콘 사용
        };

        const mapped = mapping[baseType];
        if (!mapped) return null;

        return isDef ? `${mapped}_Def.svg` : `${mapped}.svg`;
    }

    /**
     * 요소 타입에 따른 아이콘 파일명 반환
     * @returns {string|null} 아이콘 파일명 (확장자 포함)
     */
    function getIconFilename(nodeData) {
        if (!nodeData) return null;
        const typeLower = getTypeLower(nodeData);
        if (!typeLower) return null;

        let baseType = typeLower;
        let isDef = false;

        if (typeLower.endsWith('definition')) {
            baseType = typeLower.replace('definition', '').trim();
            isDef = true;
        } else if (typeLower.endsWith('usage')) {
            baseType = typeLower.replace('usage', '').trim();
        }

        // 특정 타입 매핑 보정
        const mapping = {
            'part': 'Part',
            'action': 'Action',
            'attribute': 'Attribute',
            'constraint': 'Constraint',
            'interface': 'Interface',
            'item': 'Item',
            'package': 'Package',
            'port': 'Port',
            'requirement': 'Requirement',
            'state': 'State',
            'usecase': 'Use Case',
            'folder': 'Folder',
            'librarypackage': 'Package'
        };

        const mapped = mapping[baseType];
        if (!mapped) return null;

        // Package는 Package_Def 아이콘이 없으므로 Package.svg로 통합 사용
        if (mapped === 'Package') return 'Package.svg';

        return isDef ? `${mapped}_Def.svg` : `${mapped}.svg`;
    }

    /**
     * 노드 데이터에서 역할 문자열 추출 (소문자)
     * @param {Object} nodeData - 노드 데이터
     * @returns {string}
     */
    function getRoleLower(nodeData) {
        if (!nodeData) return '';
        return String(nodeData.role || '').toLowerCase();
    }

    // Export
    ns.MxGraph.typeUtils.getTypeRegistry = getTypeRegistry;
    ns.MxGraph.typeUtils.isContainerLikeType = isContainerLikeType;
    ns.MxGraph.typeUtils.isPackageType = isPackageType;
    ns.MxGraph.typeUtils.isAnnotationType = isAnnotationType;
    ns.MxGraph.typeUtils.escapeHtml = escapeHtml;
    ns.MxGraph.typeUtils.getTypeLower = getTypeLower;
    ns.MxGraph.typeUtils.getRoleLower = getRoleLower;
    ns.MxGraph.typeUtils.getIconFilename = getIconFilename;

    console.log('[MxTypeUtils] 모듈 로드 완료');
})();
