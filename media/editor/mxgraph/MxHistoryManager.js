/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxHistoryManager.js - mxGraph 실행 취소/다시 실행 관리자
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.history = ns.MxGraph.history || {};

    // 로그 함수
    function log(prefix, ...args) {
        try {
            console.log(`[MxHistoryManager] ${prefix}`, ...args);
        } catch (_) {}
    }

    let undoManager = null;
    let undoListener = null;

    /**
     * UndoManager 초기화
     * @param {mxGraph} graph - mxGraph 인스턴스
     */
    function init(graph) {
        if (!graph) return;

        // 기존 매니저가 있으면 정리
        if (undoManager) {
            destroy();
        }

        // mxUndoManager 생성
        undoManager = new mxUndoManager();
        
        // 커맨드 이벤트를 UndoManager에 연결
        undoListener = function(sender, evt) {
            undoManager.undoableEditHappened(evt.getProperty('edit'));
        };

        // 그래프 모델과 뷰의 이벤트 연결
        graph.getModel().addListener(mxEvent.UNDO, undoListener);
        graph.getView().addListener(mxEvent.UNDO, undoListener);

        log('UndoManager 초기화 완료');
    }

    /**
     * 실행 취소 (Undo)
     */
    function undo() {
        if (undoManager && undoManager.canUndo()) {
            undoManager.undo();
        }
    }

    /**
     * 다시 실행 (Redo)
     */
    function redo() {
        if (undoManager && undoManager.canRedo()) {
            undoManager.redo();
        }
    }

    /**
     * 실행 취소 가능 여부 확인
     * @returns {boolean}
     */
    function canUndo() {
        return undoManager ? undoManager.canUndo() : false;
    }

    /**
     * 다시 실행 가능 여부 확인
     * @returns {boolean}
     */
    function canRedo() {
        return undoManager ? undoManager.canRedo() : false;
    }

    /**
     * 히스토리 정리
     */
    function clear() {
        if (undoManager) {
            undoManager.clear();
            log('히스토리 초기화 완료');
        }
    }

    /**
     * 리소스 정리
     * @param {mxGraph} graph - 선택적 mxGraph 인스턴스 (리스너 제거용)
     */
    function destroy(graph) {
        if (graph && undoListener) {
            try {
                graph.getModel().removeListener(undoListener);
                graph.getView().removeListener(undoListener);
            } catch (_) {}
        }
        
        if (undoManager) {
            undoManager.clear();
            undoManager = null;
        }
        undoListener = null;
        log('UndoManager 리소스 정리 완료');
    }

    // 모듈 export
    ns.MxGraph.history.init = init;
    ns.MxGraph.history.undo = undo;
    ns.MxGraph.history.redo = redo;
    ns.MxGraph.history.canUndo = canUndo;
    ns.MxGraph.history.canRedo = canRedo;
    ns.MxGraph.history.clear = clear;
    ns.MxGraph.history.destroy = destroy;

    log('MxHistoryManager 모듈 로드 완료');
})();
