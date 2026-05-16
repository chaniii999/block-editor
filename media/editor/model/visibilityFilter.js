/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 가시성 필터 로직 - 노드/엣지의 표시 여부를 결정하는 함수들
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.model = ns.Editor.model || {};

    /**
     * 캐시된 visibilityConfig를 반환하거나 localStorage에서 로드
     * @param {Object|null} input - 입력 설정
     * @returns {Object|null} 가시성 설정
     */
    function ensureVisibilityConfig(input) {
        if (input && typeof input === 'object') return input;
        try {
            return JSON.parse(window.localStorage.getItem('diagram-visibility-config-cache') || 'null') || null;
        } catch {
            return null;
        }
    }

    /**
     * 노드 kind에 따라 에디터에 표시할지 여부 결정
     * @param {string} kind - 노드 종류
     * @param {Object} config - 가시성 설정
     * @returns {boolean} 표시 여부
     */
    function shouldShowNodeInEditor(kind, config) {
        if (!kind) return true;
        const sections = config?.nodes;
        if (!sections) return true;
        for (const category of Object.values(sections)) {
            if (category && typeof category === 'object' && Object.prototype.hasOwnProperty.call(category, kind)) {
                return Boolean(category[kind]);
            }
        }
        return true;
    }

    /**
     * 엣지 kind/type에서 가시성 키 추출
     * @param {Object} conn - 연결 객체
     * @returns {string} 가시성 키 (소문자)
     */
    function deriveEdgeVisibilityKey(conn) {
        const raw = conn?.kind || conn?.type || '';
        return String(raw || '').toLowerCase();
    }

    /**
     * 엣지 kind에 따라 에디터에 표시할지 여부 결정
     * @param {string} kind - 엣지 종류
     * @param {Object} config - 가시성 설정
     * @returns {boolean} 표시 여부
     */
    function shouldShowEdgeInEditor(kind, config) {
        if (!kind) return true;
        const normalized = String(kind).toLowerCase();
        const isAssociation =
            normalized === 'association' || normalized.includes('association');
        const sections = config?.edges;
        // BDD 기본: 연관관계는 직교·계층 레이아웃 품질을 위해 미표시 (config로만 켤 수 있음)
        if (isAssociation && !sections) return false;
        if (!sections) return true;
        if (normalized === 'containment') {
            const cont = sections.containment;
            if (cont && typeof cont === 'object') return cont.containment !== false;
        }
        for (const category of Object.values(sections)) {
            if (category && typeof category === 'object' && Object.prototype.hasOwnProperty.call(category, normalized)) {
                return Boolean(category[normalized]);
            }
        }
        return true;
    }

    /**
     * 그래픽적으로 포함 관계에 있는지 확인 (SysON의 isAncestorOf 패턴)
     * @param {string} parentId - 부모 ID
     * @param {string} childId - 자식 ID
     * @param {Array} elements - 요소 배열
     * @returns {boolean} 포함 여부
     */
    function isGraphicallyContained(parentId, childId, elements) {
        const child = elements.find((e) => e.id === childId);
        if (!child || !child.parent) return false;
        if (child.parent === parentId) return true;
        const parent = elements.find((e) => e.id === child.parent);
        if (parent) return isGraphicallyContained(parentId, parent.id, elements);
        return false;
    }

    // 모듈 내보내기
    ns.Editor.model.visibilityFilter = {
        ensureVisibilityConfig,
        shouldShowNodeInEditor,
        deriveEdgeVisibilityKey,
        shouldShowEdgeInEditor,
        isGraphicallyContained,
    };
})();
