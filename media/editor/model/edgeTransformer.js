/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 엣지 변환 로직 - 원본 엣지 데이터를 에디터용 연결로 변환
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.model = ns.Editor.model || {};

    const { deriveEdgeVisibilityKey, shouldShowEdgeInEditor, isGraphicallyContained } = ns.Editor.model.visibilityFilter;

    /**
     * 단일 엣지를 에디터 연결로 변환
     * @param {Object} e - 원본 엣지
     * @returns {Object} 변환된 연결
     */
    function transformEdge(e) {
        const kl = String(e.kind || e.type || '').toLowerCase();
        const isMessage = kl.includes('message');
        const isFlow = kl.includes('flow');
        const isTransition = kl.includes('transition');
        const isSuccession = !isTransition && (kl.includes('succession') || kl.includes('then'));
        const isControl = isSuccession || isTransition || kl.includes('control') || kl.includes('perform') || kl.includes('include') || isMessage;

        let kindClass = isFlow ? (kl.includes('object') ? 'object' : 'control') : isControl ? 'control' : undefined;
        let style = isFlow || isControl ? 'straight' : undefined;

        // Heuristic: dotted endpoint usually indicates feature/object flow between pins
        const hasDotted = String(e.source || '').includes('.') || String(e.target || '').includes('.');
        if (!kindClass && hasDotted) {
            kindClass = 'object';
            style = 'straight';
        }

        const connection = {
            id: e.id || `connection_${e.source}_${e.target}`,
            source: e.source,
            target: e.target,
            type: e.kind || e.type || 'association',
            kind: e.kind || e.type || undefined,
            kindClass,
            style,
        };

        if (typeof e.label === 'string' && e.label.trim().length > 0) {
            connection.label = e.label;
        }

        return connection;
    }

    /**
     * 엣지 배열을 에디터 연결로 변환
     * @param {Array} edges - 원본 엣지 배열
     * @returns {Array} 변환된 연결 배열
     */
    function transformEdges(edges) {
        // 디버그: succession/transition 엣지 확인
        const succTransEdges = edges.filter((e) => e.kind && (e.kind.includes('transition') || e.kind.includes('succession')));
        if (succTransEdges.length > 0) {
            console.error(
                '[edgeTransformer] 🎯🎯🎯 Succession/Transition edges:',
                succTransEdges.map((e) => `${e.source}->${e.target} kind="${e.kind}"`)
            );
        }

        return edges.map(transformEdge);
    }

    /**
     * SysON 스타일 엣지 필터링
     * @param {Array} connections - 연결 배열
     * @param {Object} cache - 모델 캐시
     * @param {Object} config - 가시성 설정
     * @returns {Object} { filteredConnections, allConnectionsForHierarchy, stats }
     */
    function filterEdges(connections, cache, config) {
        let containmentFiltered = 0;

        // containment 엣지를 필터링하기 전에 원본 저장 (hierarchy 계산용)
        const allConnectionsForHierarchy = connections.slice();

        const filteredConnections = connections.filter((conn) => {
            // self-loop 방지: source와 target이 같으면 필터링
            if (conn.source === conn.target) {
                return false;
            }
            
            const kl = deriveEdgeVisibilityKey(conn);

            // InterfaceUsage/InterfaceDefinition의 내부 end features에서 나가는 redefinition 엣지 숨김
            if (kl === 'redefinition') {
                const sourceSegments = String(conn.source || '').split('::');

                if (sourceSegments.length >= 2) {
                    const parentId = sourceSegments.slice(0, -1).join('::');
                    const parentEl = cache.getElementById(parentId);
                    if (parentEl) {
                        const parentType = String(parentEl.type || '').toLowerCase();
                        if (parentType === 'interfaceusage' || parentType === 'interfacedefinition') {
                            containmentFiltered++;
                            return false;
                        }
                    }
                }
            }

            // FeatureTyping 엣지 필터링 (Syson 스타일)
            // - ActionUsage/PartUsage → Definition: 표시 ✅
            // - ReferenceUsage/AttributeUsage → Definition: 숨김 ❌ (compartment 내부에만 표시)
            if (kl === 'featuretyping' || kl === 'typefeaturing') {
                const sourceEl = cache.getElementById(conn.source);
                if (sourceEl) {
                    const sourceType = String(sourceEl.type || '').toLowerCase();
                    // ReferenceUsage, AttributeUsage에서 나가는 FeatureTyping은 숨김
                    if (sourceType === 'referenceusage' || sourceType === 'attributeusage') {
                        containmentFiltered++;
                        return false;
                    }
                }
            }

            // SysON 기본 설정: Containment만 그래픽적으로 포함되면 숨김
            if (kl === 'containment') {
                if (!shouldShowEdgeInEditor('containment', config)) {
                    return false;
                }
                if (config?.edges?.containment?.hideIfGraphicallyContained && isGraphicallyContained(conn.source, conn.target, cache.elements)) {
                    containmentFiltered++;
                    return false;
                }
            }

            if (!shouldShowEdgeInEditor(kl, config)) {
                containmentFiltered++;
                return false;
            }

            return true;
        });

        return {
            filteredConnections,
            allConnectionsForHierarchy,
            stats: { containmentFiltered },
        };
    }

    /**
     * 중복 엣지 제거 (succession 우선)
     * @param {Array} connections - 연결 배열
     * @returns {Array} 중복 제거된 연결 배열
     */
    function deduplicateEdges(connections) {
        const edgeMap = new Map();

        for (const edge of connections) {
            const key = `${edge.source}→${edge.target}`;
            const existing = edgeMap.get(key);

            if (!existing) {
                edgeMap.set(key, edge);
            } else {
                // succession이 있으면 우선, 없으면 기존 유지
                if (edge.kind === 'succession' && existing.kind !== 'succession') {
                    edgeMap.set(key, edge);
                    console.log(`[edgeTransformer] 🔧 중복 엣지 제거: ${key} - ${existing.kind} 대신 ${edge.kind} 사용`);
                }
            }
        }

        const before = connections.length;
        const result = Array.from(edgeMap.values());
        const after = result.length;

        if (before !== after) {
            console.log(`[edgeTransformer] 중복 엣지 제거: ${before} → ${after} (${before - after}개 제거)`);
        }

        return result;
    }

    // 모듈 내보내기
    ns.Editor.model.edgeTransformer = {
        transformEdge,
        transformEdges,
        filterEdges,
        deduplicateEdges,
    };
})();
