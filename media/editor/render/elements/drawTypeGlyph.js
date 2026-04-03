/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 타입별 아이콘(Glyph) 렌더링 - 노드 우상단에 표시되는 타입 아이콘
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.render = ns.Editor.render || {};
    ns.Editor.render.elements = ns.Editor.render.elements || {};

    /**
     * 타입별 아이콘을 그립니다.
     * @param {SVGElement} group - 아이콘을 추가할 SVG 그룹
     * @param {Object} element - 노드 데이터
     * @param {number} gx - 아이콘 x 좌표
     * @param {number} gy - 아이콘 y 좌표
     */
    function drawTypeGlyph(group, element, gx, gy) {
        const t = String(element.type || '').toLowerCase();
        
        // Package 타입 (폴더 아이콘)
        if (t.includes('package')) {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const x0 = gx - 10, y0 = gy - 6;
            const d = `M ${x0} ${y0 + 3} L ${x0 + 4} ${y0 + 3} L ${x0 + 6} ${y0} L ${x0 + 12} ${y0} L ${x0 + 12} ${y0 + 10} L ${x0} ${y0 + 10} Z`;
            p.setAttribute('d', d);
            p.setAttribute('class', 'type-glyph type-package');
            group.appendChild(p);
            return;
        }
        
        // Definition 타입 아이콘 (각진 사각형 기본)
        if (t.includes('definition')) {
            if (t.includes('action')) {
                // ActionDefinition: 둥근 사각형, 오렌지
                const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                r.setAttribute('x', String(gx - 10));
                r.setAttribute('y', String(gy - 6));
                r.setAttribute('width', '12');
                r.setAttribute('height', '10');
                r.setAttribute('rx', '2');
                r.setAttribute('class', 'type-glyph type-action-definition');
                group.appendChild(r);
            }
            else if (t.includes('requirement')) {
                // RequirementDefinition: 이중 사각형
                const r1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                r1.setAttribute('x', String(gx - 10));
                r1.setAttribute('y', String(gy - 6));
                r1.setAttribute('width', '12');
                r1.setAttribute('height', '10');
                r1.setAttribute('class', 'type-glyph type-requirement-definition');
                group.appendChild(r1);
                const r2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                r2.setAttribute('x', String(gx - 9));
                r2.setAttribute('y', String(gy - 5));
                r2.setAttribute('width', '10');
                r2.setAttribute('height', '8');
                r2.setAttribute('class', 'type-glyph');
                group.appendChild(r2);
            }
            else if (t.includes('interface')) {
                // InterfaceDefinition: 육각형
                const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const x0 = gx - 10, y0 = gy - 6, w = 12, h = 10;
                const d = `M ${x0 + 3} ${y0} L ${x0 + w - 3} ${y0} L ${x0 + w} ${y0 + h/2} L ${x0 + w - 3} ${y0 + h} L ${x0 + 3} ${y0 + h} L ${x0} ${y0 + h/2} Z`;
                p.setAttribute('d', d);
                p.setAttribute('class', 'type-glyph type-interface-definition');
                group.appendChild(p);
            }
            else if (t.includes('constraint')) {
                // ConstraintDefinition: 중괄호 기호
                const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const x0 = gx - 10, y0 = gy - 6, w = 12, h = 10;
                const d = `M ${x0} ${y0} L ${x0 + w} ${y0} M ${x0} ${y0 + h} L ${x0 + w} ${y0 + h} M ${x0 + 3} ${y0} L ${x0 + 3} ${y0 + h} M ${x0 + w - 3} ${y0} L ${x0 + w - 3} ${y0 + h}`;
                p.setAttribute('d', d);
                p.setAttribute('class', 'type-glyph type-constraint-definition');
                group.appendChild(p);
            }
            else {
                // 기타 Definition: 각진 사각형
                const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                r.setAttribute('x', String(gx - 10));
                r.setAttribute('y', String(gy - 6));
                r.setAttribute('width', '12');
                r.setAttribute('height', '10');
                r.setAttribute('rx', '0');
                r.setAttribute('class', 'type-glyph type-definition');
                group.appendChild(r);
            }
            return;
        }
        
        // Usage 타입 아이콘 (둥근 사각형 기본)
        if (t.includes('usage')) {
            if (t.includes('action')) {
                // ActionUsage: 둥근 사각형, 오렌지
                const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                r.setAttribute('x', String(gx - 10));
                r.setAttribute('y', String(gy - 6));
                r.setAttribute('width', '12');
                r.setAttribute('height', '10');
                r.setAttribute('rx', '4');
                r.setAttribute('class', 'type-glyph type-action-usage');
                group.appendChild(r);
            }
            else if (t.includes('requirement')) {
                // RequirementUsage: 이중 둥근 사각형
                const r1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                r1.setAttribute('x', String(gx - 10));
                r1.setAttribute('y', String(gy - 6));
                r1.setAttribute('width', '12');
                r1.setAttribute('height', '10');
                r1.setAttribute('rx', '3');
                r1.setAttribute('class', 'type-glyph type-requirement-usage');
                group.appendChild(r1);
                const r2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                r2.setAttribute('x', String(gx - 9));
                r2.setAttribute('y', String(gy - 5));
                r2.setAttribute('width', '10');
                r2.setAttribute('height', '8');
                r2.setAttribute('rx', '2');
                r2.setAttribute('class', 'type-glyph');
                group.appendChild(r2);
            }
            else if (t.includes('interface')) {
                // InterfaceUsage: 둥근 육각형
                const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const x0 = gx - 10, y0 = gy - 6, w = 12, h = 10;
                const d = `M ${x0 + 3} ${y0} L ${x0 + w - 3} ${y0} L ${x0 + w} ${y0 + h/2} L ${x0 + w - 3} ${y0 + h} L ${x0 + 3} ${y0 + h} L ${x0} ${y0 + h/2} Z`;
                p.setAttribute('d', d);
                p.setAttribute('class', 'type-glyph type-interface-usage');
                group.appendChild(p);
            }
            else if (t.includes('part')) {
                // PartUsage: 둥근 사각형
                const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                r.setAttribute('x', String(gx - 10));
                r.setAttribute('y', String(gy - 6));
                r.setAttribute('width', '12');
                r.setAttribute('height', '10');
                r.setAttribute('rx', '3');
                r.setAttribute('class', 'type-glyph type-part-usage');
                group.appendChild(r);
            }
            else if (t.includes('usecase')) {
                // UseCaseUsage: 타원형 (특별 케이스)
                const e = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                e.setAttribute('cx', String(gx - 4));
                e.setAttribute('cy', String(gy));
                e.setAttribute('rx', '6');
                e.setAttribute('ry', '4');
                e.setAttribute('class', 'type-glyph type-usage');
                group.appendChild(e);
            }
            else {
                // 기타 Usage: 둥근 사각형
                const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                r.setAttribute('x', String(gx - 10));
                r.setAttribute('y', String(gy - 6));
                r.setAttribute('width', '12');
                r.setAttribute('height', '10');
                r.setAttribute('rx', '3');
                r.setAttribute('class', 'type-glyph type-usage');
                group.appendChild(r);
            }
            return;
        }
    }

    // 모듈 내보내기
    ns.Editor.render.elements.drawTypeGlyph = drawTypeGlyph;
})();
