/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 컨트롤 노드 렌더링 - decision, fork, join, merge, initial, final
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.render = ns.Editor.render || {};
    ns.Editor.render.elements = ns.Editor.render.elements || {};

    /**
     * 컨트롤 노드를 렌더링합니다.
     * @param {SVGElement} group - SVG 그룹
     * @param {Object} element - 노드 데이터
     * @param {string} role - 노드 역할 (decision, fork, join, merge, initial, final)
     * @returns {boolean} 렌더링 성공 여부
     */
    function drawControlNode(group, element, role) {
        const x = Number(element.x);
        const y = Number(element.y);
        const w = Number(element.width);
        const h = Number(element.height);
        const cx = x + w / 2;
        const cy = y + h / 2;

        if (role === 'initial') {
            // 초기 노드: 작은 채워진 동그라미 (28x28)
            const r = 14;
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx', String(cx));
            c.setAttribute('cy', String(cy));
            c.setAttribute('r', String(r));
            c.setAttribute('class', 'act-initial');
            group.appendChild(c);
            
            // 라벨 추가: 원형 아래
            const nameLabel = ns.Editor.renderUtils.createSvgText(cx, cy + r + 14, 'diagram-label', String(element.name || ''), {
                textAnchor: 'middle',
                fontWeight: 'bold',
                role: 'name'
            });
            group.appendChild(nameLabel);
            return true;
        }

        if (role === 'final') {
            // 최종 노드: 이중 동그라미 (36x36)
            const outerR = 18;
            const innerR = 14;
            const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            outer.setAttribute('cx', String(cx));
            outer.setAttribute('cy', String(cy));
            outer.setAttribute('r', String(outerR));
            outer.setAttribute('class', 'act-final-outer');
            group.appendChild(outer);
            const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            inner.setAttribute('cx', String(cx));
            inner.setAttribute('cy', String(cy));
            inner.setAttribute('r', String(innerR));
            inner.setAttribute('class', 'act-final-inner');
            group.appendChild(inner);
            
            // 라벨 추가: 이중 원형 아래
            const nameLabel = ns.Editor.renderUtils.createSvgText(cx, cy + outerR + 14, 'diagram-label', String(element.name || ''), {
                textAnchor: 'middle',
                fontWeight: 'bold',
                role: 'name'
            });
            group.appendChild(nameLabel);
            return true;
        }

        if (role === 'decision' || role === 'merge') {
            // 다이아몬드 형태 (고정 크기 72x72)
            const size = Math.min(36, Math.min(w, h) / 2);
            const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} L ${cx - size} ${cy} Z`;
            diamond.setAttribute('d', d);
            diamond.setAttribute('class', role === 'decision' ? 'act-decision' : 'act-merge');
            group.appendChild(diamond);
            
            // 라벨 추가: 다이아몬드 아래
            const nameLabel = ns.Editor.renderUtils.createSvgText(cx, cy + size + 14, 'diagram-label', String(element.name || ''), {
                textAnchor: 'middle',
                fontWeight: 'bold',
                role: 'name'
            });
            group.appendChild(nameLabel);
            return true;
        }

        if (role === 'fork' || role === 'join') {
            // 수직 막대
            const pad = 12;
            const barHeight = Math.max(24, h - pad * 2);
            const barWidth = Math.max(6, Math.min(12, Math.floor(w * 0.3)));
            const barX = x + (w - barWidth) / 2;
            const barY = y + pad;
            const bar = ns.Editor.renderUtils.createSvgRect(barX, barY, barWidth, barHeight, role === 'fork' ? 'act-fork' : 'act-join');
            group.appendChild(bar);
            
            // 라벨 추가: 막대 아래
            const nameLabel = ns.Editor.renderUtils.createSvgText(cx, y + barHeight + pad + 14, 'diagram-label', String(element.name || ''), {
                textAnchor: 'middle',
                fontWeight: 'bold',
                role: 'name'
            });
            group.appendChild(nameLabel);
            return true;
        }

        return false;
    }

    /**
     * 컨트롤 노드 역할인지 확인합니다.
     * @param {string} role - 노드 역할
     * @returns {boolean} 컨트롤 노드 여부
     */
    function isControlNodeRole(role) {
        const validRoles = ['decision', 'fork', 'join', 'merge', 'final', 'initial'];
        return validRoles.includes(role);
    }

    // 모듈 내보내기
    ns.Editor.render.elements.drawControlNode = drawControlNode;
    ns.Editor.render.elements.isControlNodeRole = isControlNodeRole;
})();
