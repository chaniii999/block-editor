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

    function isFeatureTypingKind(kind) {
        const k = String(kind || '').toLowerCase();
        return k === 'featuretyping' || k === 'typefeaturing';
    }

    function normalizeKindKey(kind) {
        return String(kind || '').toLowerCase().replace(/\s+/g, '');
    }

    function isFeatureTypingUsageSource(el) {
        const k = normalizeKindKey(el?.type || el?.kind);
        return (
            k === 'partusage' ||
            k === 'portusage' ||
            k === 'attributeusage' ||
            k === 'interfaceusage'
        );
    }

    function isFeatureTypingFooterTarget(el) {
        const k = normalizeKindKey(el?.type || el?.kind);
        return k.endsWith('definition') || k === 'part' || k === 'port' || k === 'item';
    }

    function computeFeatureUsageFooterHeight(nameCount) {
        const DS = ns.Editor?.config?.displaySettings;
        const hr = Number(DS?.compartment?.separatorHeight ?? 9);
        const itemH = Number(DS?.compartment?.itemHeight ?? 16);
        const pad = Number(DS?.featureUsageSlot?.paddingBottom ?? 8);
        return hr + Math.max(0, nameCount) * itemH + pad;
    }

    /**
     * featuretyping: source(usage) → target(definition) — 타겟 푸터에 소스 id 텍스트
     */
    function applyFeatureTypingFooters(elements, connections) {
        if (!Array.isArray(elements) || !Array.isArray(connections)) return;
        const byId = new Map();
        for (const el of elements) {
            if (el?.id != null) byId.set(String(el.id), el);
        }

        const footerByTarget = new Map();
        const sourcesToHide = new Set();

        for (const c of connections) {
            if (!isFeatureTypingKind(c.type || c.kind)) continue;
            const src = byId.get(String(c.source));
            const tgt = byId.get(String(c.target));
            if (!src || !tgt) continue;
            if (!isFeatureTypingUsageSource(src)) continue;
            if (!isFeatureTypingFooterTarget(tgt)) continue;

            const label = String(src.id || src.name || '').trim();
            if (!label) continue;
            const tid = String(tgt.id);
            if (!footerByTarget.has(tid)) footerByTarget.set(tid, []);
            const list = footerByTarget.get(tid);
            if (!list.includes(label)) list.push(label);
            sourcesToHide.add(String(src.id));
        }

        for (const [tid, names] of footerByTarget) {
            const el = byId.get(tid);
            if (!el) continue;
            names.sort((a, b) => a.localeCompare(b));
            el.featureTypingFooter = names;
            el._featureUsageFooterHeight = computeFeatureUsageFooterHeight(names.length);
        }

        for (const sid of sourcesToHide) {
            const el = byId.get(sid);
            if (el) el.hidden = true;
        }
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
        const associations = Array.isArray(model?.associations)
            ? model.associations
            : [];

        // 디버그용 원본 모델 저장
        window._lastModel = model;

        // 1단계: 노드 변환
        const { elements } = transformNodes(nodes, config);

        // 2단계: 엣지 변환
        const connections = transformEdges(edges);

        // 2.4단계: FeatureTyping → 타겟 푸터 텍스트·소스 usage 숨김
        applyFeatureTypingFooters(elements, connections);

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
            associations,
            cache, // 캐시 객체 추가
        };
    }

    // 모듈 내보내기
    ns.Editor.model.normalizer = {
        normalizeModel,
    };
})();
