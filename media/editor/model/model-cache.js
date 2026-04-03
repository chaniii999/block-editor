/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * model-cache.js - 다이어그램 모델 데이터 캐시 시스템
 * 
 * 목적: 랭섭에서 받은 모델 데이터를 한 번만 인덱싱하여 O(1) 조회 성능 보장
 * 
 * 캐시 구조:
 * - byId: id → element/connection 매핑 (Map)
 * - byName: name → element 매핑 (Map)
 * - byType: type → [elements] 매핑 (Map)
 * - byParent: parentId → [children] 매핑 (Map)
 * - edgesBySource: sourceId → [edges] 매핑 (Map)
 * - edgesByTarget: targetId → [edges] 매핑 (Map)
 * - edgesByKind: kind → [edges] 매핑 (Map)
 * 
 * 사용 패턴:
 * 1. normalizeModel()에서 buildModelCache() 호출하여 캐시 생성
 * 2. 모든 transformer/renderer에서 cache.getElementById() 등으로 O(1) 조회
 * 3. find/filter 대신 캐시 조회 사용
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.model = ns.Editor.model || {};

    /**
     * 모델 캐시 클래스
     */
    class ModelCache {
        constructor() {
            // 노드 인덱스
            this.byId = new Map();           // id → element
            this.byName = new Map();         // name → element
            this.byType = new Map();         // type → [elements]
            this.byParent = new Map();       // parentId → [children]
            
            // 엣지 인덱스
            this.edgesById = new Map();      // id → edge
            this.edgesBySource = new Map();  // sourceId → [edges]
            this.edgesByTarget = new Map();  // targetId → [edges]
            this.edgesByKind = new Map();    // kind → [edges]
            
            // 원본 데이터 참조
            this.elements = [];
            this.connections = [];
        }

        /**
         * 노드를 캐시에 추가
         * @param {Object} element - 노드 요소
         */
        addElement(element) {
            if (!element) return;

            // ID 인덱스
            if (element.id) {
                this.byId.set(element.id, element);
            }

            // Name 인덱스
            if (element.name) {
                this.byName.set(element.name, element);
            }

            // Type 인덱스
            const type = String(element.type || element.kind || '').toLowerCase();
            if (type) {
                if (!this.byType.has(type)) {
                    this.byType.set(type, []);
                }
                this.byType.get(type).push(element);
            }

            // Parent 인덱스
            if (element.parent) {
                const parentKey = String(element.parent);
                if (!this.byParent.has(parentKey)) {
                    this.byParent.set(parentKey, []);
                }
                this.byParent.get(parentKey).push(element);
            }

            this.elements.push(element);
        }

        /**
         * 엣지를 캐시에 추가
         * @param {Object} edge - 엣지 연결
         */
        addEdge(edge) {
            if (!edge) return;

            // ID 인덱스
            if (edge.id) {
                this.edgesById.set(edge.id, edge);
            }

            // Source 인덱스
            if (edge.source) {
                const sourceKey = String(edge.source);
                if (!this.edgesBySource.has(sourceKey)) {
                    this.edgesBySource.set(sourceKey, []);
                }
                this.edgesBySource.get(sourceKey).push(edge);
            }

            // Target 인덱스
            if (edge.target) {
                const targetKey = String(edge.target);
                if (!this.edgesByTarget.has(targetKey)) {
                    this.edgesByTarget.set(targetKey, []);
                }
                this.edgesByTarget.get(targetKey).push(edge);
            }

            // Kind 인덱스
            const kind = String(edge.kind || edge.type || '').toLowerCase();
            if (kind) {
                if (!this.edgesByKind.has(kind)) {
                    this.edgesByKind.set(kind, []);
                }
                this.edgesByKind.get(kind).push(edge);
            }

            this.connections.push(edge);
        }

        /**
         * ID로 요소 조회 (O(1))
         * @param {string} id - 요소 ID
         * @returns {Object|null} 요소 또는 null
         */
        getElementById(id) {
            if (!id) return null;
            return this.byId.get(String(id)) || null;
        }

        /**
         * Name으로 요소 조회 (O(1))
         * @param {string} name - 요소 이름
         * @returns {Object|null} 요소 또는 null
         */
        getElementByName(name) {
            if (!name) return null;
            return this.byName.get(String(name)) || null;
        }

        /**
         * ID 또는 Name으로 요소 조회 (O(1))
         * @param {string} idOrName - 요소 ID 또는 이름
         * @returns {Object|null} 요소 또는 null
         */
        getElement(idOrName) {
            if (!idOrName) return null;
            const key = String(idOrName);
            return this.byId.get(key) || this.byName.get(key) || null;
        }

        /**
         * Type으로 요소 배열 조회 (O(1))
         * @param {string} type - 요소 타입
         * @returns {Array} 요소 배열
         */
        getElementsByType(type) {
            if (!type) return [];
            const key = String(type).toLowerCase();
            return this.byType.get(key) || [];
        }

        /**
         * Parent ID로 자식 요소 배열 조회 (O(1))
         * @param {string} parentId - 부모 ID
         * @returns {Array} 자식 요소 배열
         */
        getChildrenByParent(parentId) {
            if (!parentId) return [];
            const key = String(parentId);
            return this.byParent.get(key) || [];
        }

        /**
         * Source ID로 나가는 엣지 배열 조회 (O(1))
         * @param {string} sourceId - 소스 ID
         * @returns {Array} 엣지 배열
         */
        getEdgesBySource(sourceId) {
            if (!sourceId) return [];
            const key = String(sourceId);
            return this.edgesBySource.get(key) || [];
        }

        /**
         * Target ID로 들어오는 엣지 배열 조회 (O(1))
         * @param {string} targetId - 타겟 ID
         * @returns {Array} 엣지 배열
         */
        getEdgesByTarget(targetId) {
            if (!targetId) return [];
            const key = String(targetId);
            return this.edgesByTarget.get(key) || [];
        }

        /**
         * Kind로 엣지 배열 조회 (O(1))
         * @param {string} kind - 엣지 종류
         * @returns {Array} 엣지 배열
         */
        getEdgesByKind(kind) {
            if (!kind) return [];
            const key = String(kind).toLowerCase();
            return this.edgesByKind.get(key) || [];
        }

        /**
         * 두 노드 사이의 엣지 조회 (O(1))
         * @param {string} sourceId - 소스 ID
         * @param {string} targetId - 타겟 ID
         * @returns {Array} 엣지 배열
         */
        getEdgesBetween(sourceId, targetId) {
            if (!sourceId || !targetId) return [];
            const sourceEdges = this.getEdgesBySource(sourceId);
            const targetKey = String(targetId);
            return sourceEdges.filter(e => String(e.target) === targetKey);
        }

        /**
         * 요소의 부모 조회 (O(1))
         * @param {Object} element - 요소
         * @returns {Object|null} 부모 요소 또는 null
         */
        getParent(element) {
            if (!element || !element.parent) return null;
            return this.getElement(element.parent);
        }

        /**
         * 캐시 통계 정보
         * @returns {Object} 통계 객체
         */
        getStats() {
            return {
                elements: this.elements.length,
                connections: this.connections.length,
                byId: this.byId.size,
                byName: this.byName.size,
                byType: this.byType.size,
                byParent: this.byParent.size,
                edgesBySource: this.edgesBySource.size,
                edgesByTarget: this.edgesByTarget.size,
                edgesByKind: this.edgesByKind.size,
            };
        }

        /**
         * 캐시 초기화
         */
        clear() {
            this.byId.clear();
            this.byName.clear();
            this.byType.clear();
            this.byParent.clear();
            this.edgesById.clear();
            this.edgesBySource.clear();
            this.edgesByTarget.clear();
            this.edgesByKind.clear();
            this.elements = [];
            this.connections = [];
        }
    }

    /**
     * 모델 데이터로부터 캐시 빌드
     * @param {Array} elements - 노드 배열
     * @param {Array} connections - 엣지 배열
     * @returns {ModelCache} 빌드된 캐시
     */
    function buildModelCache(elements, connections) {
        const cache = new ModelCache();

        // 노드 인덱싱
        if (Array.isArray(elements)) {
            for (const element of elements) {
                cache.addElement(element);
            }
        }

        // 엣지 인덱싱
        if (Array.isArray(connections)) {
            for (const edge of connections) {
                cache.addEdge(edge);
            }
        }

        const stats = cache.getStats();
        console.log('[model-cache] 캐시 빌드 완료:', stats);

        return cache;
    }

    // 모듈 export
    ns.Editor.model.ModelCache = ModelCache;
    ns.Editor.model.buildModelCache = buildModelCache;

    console.log('[model-cache] 모듈 로드 완료');
})();
