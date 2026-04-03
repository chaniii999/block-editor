/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 유스케이스 노드 렌더링 - UseCaseUsage
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.render = ns.Editor.render || {};
    ns.Editor.render.elements = ns.Editor.render.elements || {};

    const { drawTypeGlyph } = ns.Editor.render.elements;

    /**
     * 유스케이스 노드를 렌더링합니다 (둥근 모서리 사각형)
     * @param {SVGElement} group - SVG 그룹
     * @param {Object} element - 노드 데이터
     * @returns {boolean} 렌더링 성공 여부
     */
    function drawUseCaseNode(group, element) {
        const x = Number(element.x);
        const y = Number(element.y);
        const w = Math.max(120, Number(element.width));
        const h = Math.max(60, Number(element.height));
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Use Case: 둥근 모서리 사각형 (SysON 스타일)
        const usecaseRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        usecaseRect.setAttribute('x', String(x));
        usecaseRect.setAttribute('y', String(y));
        usecaseRect.setAttribute('width', String(w));
        usecaseRect.setAttribute('height', String(h));
        usecaseRect.setAttribute('rx', '12');
        usecaseRect.setAttribute('ry', '12');
        usecaseRect.setAttribute('class', 'diagram-node usecase-node');
        usecaseRect.style.fill = 'var(--vscode-editorWidget-background, #fff)';
        usecaseRect.style.stroke = 'var(--vscode-input-border, #888)';
        usecaseRect.style.strokeWidth = '2px';
        group.appendChild(usecaseRect);

        const typeText = ns.Editor.utils.getStereotypeText(element.type);
        if (typeText) {
            const stereo = ns.Editor.renderUtils.createSvgText(cx, cy - 10, 'diagram-label', typeText, {
                textAnchor: 'middle',
                role: 'type'
            });
            group.appendChild(stereo);
        }

        const nameLabel = ns.Editor.renderUtils.createSvgText(cx, cy + 8, 'diagram-label', String(element.name || ''), {
            textAnchor: 'middle',
            fontWeight: 'bold',
            role: 'name'
        });
        group.appendChild(nameLabel);

        // Type glyph (우상단 타입 표시)
        try {
            const gx = x + w - 14;
            const gy = y + 10;
            if (drawTypeGlyph) {
                drawTypeGlyph(group, element, gx, gy);
            }
        } catch {}

        return true;
    }

    /**
     * 유스케이스 노드 타입인지 확인합니다.
     * @param {string} role - 노드 역할
     * @param {string} typeLower - 소문자 타입
     * @returns {boolean} 유스케이스 노드 여부
     */
    function isUseCaseNodeType(role, typeLower) {
        return role === 'usecase' || (typeLower.includes('usecase') && !typeLower.includes('definition'));
    }

    // 모듈 내보내기
    ns.Editor.render.elements.drawUseCaseNode = drawUseCaseNode;
    ns.Editor.render.elements.isUseCaseNodeType = isUseCaseNodeType;
})();
