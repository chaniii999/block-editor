/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * Interaction Layer 인덱스 - 모든 인터랙션 모듈을 로드
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.interaction = ns.Editor.interaction || {};

    // 모듈 로드 순서가 중요함 (의존성 순서)
    // 1. selectionManager.js - 의존성 없음
    // 2. dragHandler.js - utils 의존
    // 3. zoomPanHandler.js - 의존성 없음
    // 4. connectionCreator.js - render 의존
    // 5. lassoSelector.js - selectionManager 의존

    const interaction = ns.Editor.interaction;

    /**
     * Interaction 모듈 초기화 확인
     * @returns {boolean} 모든 모듈이 로드되었는지 여부
     */
    function isReady() {
        return !!(
            interaction.selectionManager &&
            interaction.dragHandler &&
            interaction.zoomPanHandler &&
            interaction.connectionCreator &&
            interaction.lassoSelector
        );
    }

    // 공개 API
    interaction.isReady = isReady;
})();
