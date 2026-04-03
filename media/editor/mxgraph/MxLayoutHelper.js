/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxLayoutHelper.js - 레이아웃 관리 유틸리티
 * MxCellFactory에서 분리된 레이아웃 관련 함수들
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.layoutHelper = ns.MxGraph.layoutHelper || {};

    // 로그 함수
    function log(prefix, ...args) {
        try {
            console.log(`[MxLayoutHelper] ${prefix}`, ...args);
        } catch (_) {}
    }

    /**
     * 셀의 높이를 재계산하여 업데이트
     * [리팩토링] ELK가 이미 노드 크기를 계산했으므로 이 함수는 더 이상 사용하지 않음
     * 하위 호환성을 위해 함수는 유지하되 no-op으로 변경
     * @param {mxGraph} graph
     * @param {mxCell} cell
     */
    function refreshCellHeight(graph, cell) {
        // [리팩토링] ELK 결과를 신뢰하므로 높이 재계산 비활성화
        // ELK가 compartment 높이를 고려하여 노드 크기를 이미 계산함
        return;
    }

    /**
     * 컨테이너 노드를 자식들을 포함하도록 확장
     * [리팩토링] ELK가 이미 컨테이너 크기를 계산했으므로 이 함수는 더 이상 사용하지 않음
     * 하위 호환성을 위해 함수는 유지하되 no-op으로 변경
     * @param {mxGraph} graph
     * @param {mxCell} parentCell
     */
    function expandContainerToFitChildren(graph, parentCell) {
        // [리팩토링] ELK 결과를 신뢰하므로 컨테이너 확장 비활성화
        // ELK가 자식 노드를 포함하도록 컨테이너 크기를 이미 계산함
        return;
    }

    /**
     * Bottom-up 방식으로 레이아웃 조정 (리프 → 부모 → 부모의 부모)
     * [리팩토링] ELK가 이미 레이아웃을 계산했으므로 이 함수는 더 이상 사용하지 않음
     * 하위 호환성을 위해 함수는 유지하되 no-op으로 변경
     * @param {mxGraph} graph
     * @param {mxCell} parent
     * @param {Object} cellMap - id → mxCell 매핑
     * @param {Array} nodes - 노드 데이터 배열
     */
    function processBottomUp(graph, parent, cellMap, nodes) {
        // [리팩토링] ELK 결과를 신뢰하므로 bottom-up 레이아웃 조정 비활성화
        // ELK가 노드 간 간격과 컨테이너 크기를 이미 계산함
        return;
    }

    /**
     * 형제 노드 간 겹침을 해결 (같은 부모를 가진 노드들을 세로로 재배치)
     * [리팩토링] ELK가 이미 노드 간 간격을 계산했으므로 이 함수는 더 이상 사용하지 않음
     * 하위 호환성을 위해 함수는 유지하되 no-op으로 변경
     * @param {mxGraph} graph
     * @param {mxCell} parent
     * @param {Object} cellMap - id → mxCell 매핑
     * @param {Array} nodes - 노드 데이터 배열
     */
    function adjustSiblingPositions(graph, parent, cellMap, nodes) {
        // [리팩토링] ELK 결과를 신뢰하므로 형제 노드 겹침 해결 비활성화
        // ELK가 노드 간 간격을 이미 계산함
        return;
    }

    /**
     * 전역 노드 겹침 감지 및 해결 (모든 노드 쌍을 확인)
     * [리팩토링] ELK가 이미 노드 간 간격을 계산했으므로 이 함수는 더 이상 사용하지 않음
     * 하위 호환성을 위해 함수는 유지하되 no-op으로 변경
     * @param {mxGraph} graph
     * @param {Object} cellMap - id → mxCell 매핑
     * @param {Array} nodes - 노드 데이터 배열
     */
    function resolveGlobalOverlaps(graph, cellMap, nodes) {
        // [리팩토링] ELK 결과를 신뢰하므로 전역 겹침 해결 비활성화
        // ELK가 노드 간 간격을 이미 계산함
        return;
    }

    // 모듈 export
    ns.MxGraph.layoutHelper.refreshCellHeight = refreshCellHeight;
    ns.MxGraph.layoutHelper.expandContainerToFitChildren = expandContainerToFitChildren;
    ns.MxGraph.layoutHelper.processBottomUp = processBottomUp;
    ns.MxGraph.layoutHelper.adjustSiblingPositions = adjustSiblingPositions;
    ns.MxGraph.layoutHelper.resolveGlobalOverlaps = resolveGlobalOverlaps;

    log('MxLayoutHelper 모듈 로드 완료');
})();
