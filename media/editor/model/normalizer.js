/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 모델 정규화 - 원본 모델을 에디터용 데이터로 변환하는 메인 함수
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.model = ns.Editor.model || {};

    const { ensureVisibilityConfig } = ns.Editor.model.visibilityFilter;
    const { transformNodes } = ns.Editor.model.nodeTransformer;
    const { transformEdges, filterEdges, deduplicateEdges } = ns.Editor.model.edgeTransformer;
    const { buildModelCache } = ns.Editor.model;

    function log(prefix, ...args) {
        try {
            console.log(`[normalizer] ${prefix}`, ...args);
        } catch {}
    }

    /**
     * 원본 모델을 에디터용 데이터로 정규화
     * @param {Object} model - 원본 모델 { nodes, edges }
     * @param {Object} visibilityConfig - 가시성 설정
     * @returns {Object} { elements, connections, allConnectionsForHierarchy, cache }
     */
    function normalizeModel(model, visibilityConfig) {
        const config = ensureVisibilityConfig(visibilityConfig);
        const nodes = Array.isArray(model?.nodes) ? model.nodes : [];
        const edges = Array.isArray(model?.edges) ? model.edges : [];

        // 디버그용 원본 모델 저장
        window._lastModel = model;

        // 1단계: 노드 변환
        const { elements } = transformNodes(nodes, config);

        // 2단계: 엣지 변환
        const connections = transformEdges(edges);

        // 2.5단계: redefinition/subsetting 엣지가 있는 노드의 declaredType 제거 (엣지로 표시되므로 라벨 중복 방지)
        const edgeRelSources = new Set(
            connections.filter(c => c.type === 'redefinition' || c.type === 'subsetting' || c.type === 'featuretyping')
                       .map(c => c.source)
        );
        for (const el of elements) {
            if (edgeRelSources.has(el.id) && el.declaredType) {
                delete el.declaredType;
            }
        }

        // 3단계: 임시 캐시 생성 (엣지 필터링용)
        const tempCache = buildModelCache(elements, connections);
        
        // 4단계: 엣지 필터링 (캐시 사용)
        const { filteredConnections, allConnectionsForHierarchy, stats } = filterEdges(connections, tempCache, config);

        log(`SysON 필터링: containment=${stats.containmentFiltered}개 제거`);
        log(`전체 엣지: ${connections.length} → 필터링 후: ${filteredConnections.length}`);

        // 5단계: 중복 엣지 제거
        const finalConnections = deduplicateEdges(filteredConnections);

        log(`finalConnections=${finalConnections.length}`);

        // 6단계: 최종 모델 캐시 빌드 (O(1) 조회를 위한 인덱싱)
        const cache = buildModelCache(elements, finalConnections);
        log(`모델 캐시 빌드 완료: elements=${elements.length}, connections=${finalConnections.length}`);

        return {
            elements,
            connections: finalConnections,
            allConnectionsForHierarchy,
            cache, // 캐시 객체 추가
        };
    }

    // 모듈 내보내기
    ns.Editor.model.normalizer = {
        normalizeModel,
    };
})();
