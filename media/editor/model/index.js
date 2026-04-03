/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * Model Layer 인덱스 - 모든 모델 관련 모듈을 로드
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.model = ns.Editor.model || {};

    // 모듈 로드 순서가 중요함 (의존성 순서)
    // 1. model-cache.js - 의존성 없음 (캐시 시스템)
    // 2. visibilityFilter.js - 의존성 없음
    // 3. nodeTransformer.js - visibilityFilter, model-cache 의존
    // 4. edgeTransformer.js - visibilityFilter, model-cache 의존
    // 5. normalizer.js - 모든 모듈 의존

    // 편의를 위한 단축 참조
    const model = ns.Editor.model;

    /**
     * Model Layer 초기화 확인
     * @returns {boolean} 모든 모듈이 로드되었는지 여부
     */
    function isReady() {
        return !!(model.ModelCache && model.buildModelCache && model.visibilityFilter && model.nodeTransformer && model.edgeTransformer && model.normalizer);
    }

    /**
     * normalizeModel 단축 접근
     */
    function normalizeModel(modelData, visibilityConfig) {
        if (!model.normalizer) {
            console.error('[model/index] normalizer 모듈이 로드되지 않았습니다.');
            return { elements: [], connections: [], allConnectionsForHierarchy: [] };
        }
        return model.normalizer.normalizeModel(modelData, visibilityConfig);
    }

    // 공개 API
    model.isReady = isReady;
    model.normalize = normalizeModel;
})();
