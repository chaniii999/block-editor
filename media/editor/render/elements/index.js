/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * Render Elements 인덱스 - 모든 요소 렌더링 모듈을 로드
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.render = ns.Editor.render || {};
    ns.Editor.render.elements = ns.Editor.render.elements || {};

    // 모듈 로드 순서가 중요함 (의존성 순서)
    // 1. drawTypeGlyph.js - 의존성 없음
    // 2. drawControlNode.js - renderUtils 의존
    // 3. drawActionNode.js - renderUtils, utils 의존
    // 4. drawCommentNode.js - 의존성 없음
    // 5. drawUseCaseNode.js - drawTypeGlyph 의존
    // 6. drawBorderNode.js - renderUtils 의존

    const elements = ns.Editor.render.elements;

    /**
     * Elements 모듈 초기화 확인
     * @returns {boolean} 모든 모듈이 로드되었는지 여부
     */
    function isReady() {
        return !!(
            elements.drawTypeGlyph &&
            elements.drawControlNode &&
            elements.drawActionNode &&
            elements.drawCommentNode &&
            elements.drawUseCaseNode &&
            elements.drawBorderNodes
        );
    }

    // 공개 API
    elements.isReady = isReady;
})();
