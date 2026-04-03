/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 액션 노드 렌더링 - AcceptAction, SendAction, TerminateAction
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.render = ns.Editor.render || {};
    ns.Editor.render.elements = ns.Editor.render.elements || {};

    /**
     * AcceptAction 노드를 렌더링합니다 (왼쪽에 V자 파인 오각형)
     * @param {SVGElement} group - SVG 그룹
     * @param {Object} element - 노드 데이터
     */
    function drawAcceptAction(group, element) {
        const x = Number(element.x);
        const y = Number(element.y);
        const w = Number(element.width);
        const h = Number(element.height);
        const cx = x + w / 2;
        const cy = y + h / 2;
        const indent = Math.max(10, Math.min(w * 0.25, 32));

        const pentagon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        // AcceptAction: 왼쪽 모서리에서 안쪽으로 V자 파고들어간 형태 (이벤트 수신 방향)
        const notchDepth = indent * 0.8;
        const d = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} L ${x + notchDepth} ${cy} Z`;
        pentagon.setAttribute('d', d);
        pentagon.setAttribute('class', 'accept-action-shape');
        pentagon.setAttribute('fill', 'var(--vscode-editor-background, #fff)');
        pentagon.setAttribute('stroke', 'orange');
        pentagon.setAttribute('stroke-width', '2');
        group.appendChild(pentagon);

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
    }

    /**
     * SendAction 노드를 렌더링합니다 (오른쪽에 화살표 모양 오각형)
     * @param {SVGElement} group - SVG 그룹
     * @param {Object} element - 노드 데이터
     */
    function drawSendAction(group, element) {
        const x = Number(element.x);
        const y = Number(element.y);
        const w = Number(element.width);
        const h = Number(element.height);
        const cy = y + h / 2;
        const indent = Math.max(10, Math.min(w * 0.25, 32));

        const pentagon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${x} ${y} L ${x + w - indent} ${y} L ${x + w} ${cy} L ${x + w - indent} ${y + h} L ${x} ${y + h} Z`;
        pentagon.setAttribute('d', d);
        pentagon.setAttribute('class', 'send-action-shape');
        pentagon.setAttribute('fill', 'var(--vscode-editor-background, #fff)');
        pentagon.setAttribute('stroke', 'orange');
        pentagon.setAttribute('stroke-width', '2');
        group.appendChild(pentagon);

        const labelCx = x + w / 2 + indent / 4;
        const typeText = ns.Editor.utils.getStereotypeText(element.type);
        if (typeText) {
            const stereo = ns.Editor.renderUtils.createSvgText(labelCx, cy - 10, 'diagram-label', typeText, {
                textAnchor: 'middle',
                role: 'type'
            });
            group.appendChild(stereo);
        }

        const nameLabel = ns.Editor.renderUtils.createSvgText(labelCx, cy + 8, 'diagram-label', String(element.name || ''), {
            textAnchor: 'middle',
            fontWeight: 'bold',
            role: 'name'
        });
        group.appendChild(nameLabel);
    }

    /**
     * TerminateAction 노드를 렌더링합니다 (X 표시가 있는 원)
     * @param {SVGElement} group - SVG 그룹
     * @param {Object} element - 노드 데이터
     */
    function drawTerminateAction(group, element) {
        const x = Number(element.x);
        const y = Number(element.y);
        const w = Number(element.width);
        const h = Number(element.height);
        const cx = x + w / 2;
        const cy = y + h / 2;
        const radius = 18;

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r', String(radius));
        circle.setAttribute('fill', 'var(--vscode-editor-background, #fff)');
        circle.setAttribute('stroke', 'red');
        circle.setAttribute('stroke-width', '2.5');
        group.appendChild(circle);

        const offset = radius * 0.65;
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', String(cx - offset));
        line1.setAttribute('y1', String(cy - offset));
        line1.setAttribute('x2', String(cx + offset));
        line1.setAttribute('y2', String(cy + offset));
        line1.setAttribute('stroke', 'red');
        line1.setAttribute('stroke-width', '2.5');
        group.appendChild(line1);

        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', String(cx + offset));
        line2.setAttribute('y1', String(cy - offset));
        line2.setAttribute('x2', String(cx - offset));
        line2.setAttribute('y2', String(cy + offset));
        line2.setAttribute('stroke', 'red');
        line2.setAttribute('stroke-width', '2.5');
        group.appendChild(line2);

        const typeText = ns.Editor.utils.getStereotypeText(element.type);
        if (typeText) {
            const stereo = ns.Editor.renderUtils.createSvgText(cx, cy - radius - 12, 'diagram-label', typeText, {
                textAnchor: 'middle',
                role: 'type'
            });
            group.appendChild(stereo);
        }

        const nameLabel = ns.Editor.renderUtils.createSvgText(cx, cy + radius, 'diagram-label', String(element.name || ''), {
            textAnchor: 'middle',
            fontWeight: 'bold',
            role: 'name'
        });
        group.appendChild(nameLabel);
    }

    /**
     * 액션 노드를 렌더링합니다.
     * @param {SVGElement} group - SVG 그룹
     * @param {Object} element - 노드 데이터
     * @param {string} role - 노드 역할
     * @param {string} typeLower - 소문자 타입
     * @returns {boolean} 렌더링 성공 여부
     */
    function drawActionNode(group, element, role, typeLower) {
        if (role === 'accept' || typeLower.includes('acceptaction')) {
            drawAcceptAction(group, element);
            return true;
        }
        if (role === 'send' || typeLower.includes('sendaction')) {
            drawSendAction(group, element);
            return true;
        }
        if (role === 'terminate' || typeLower.includes('terminateaction')) {
            drawTerminateAction(group, element);
            return true;
        }
        return false;
    }

    /**
     * 액션 노드 역할인지 확인합니다.
     * @param {string} role - 노드 역할
     * @param {string} typeLower - 소문자 타입
     * @returns {boolean} 액션 노드 여부
     */
    function isActionNodeRole(role, typeLower) {
        return role === 'accept' || role === 'send' || role === 'terminate' ||
               typeLower.includes('acceptaction') || typeLower.includes('sendaction') || typeLower.includes('terminateaction');
    }

    // 모듈 내보내기
    ns.Editor.render.elements.drawActionNode = drawActionNode;
    ns.Editor.render.elements.drawAcceptAction = drawAcceptAction;
    ns.Editor.render.elements.drawSendAction = drawSendAction;
    ns.Editor.render.elements.drawTerminateAction = drawTerminateAction;
    ns.Editor.render.elements.isActionNodeRole = isActionNodeRole;
})();
