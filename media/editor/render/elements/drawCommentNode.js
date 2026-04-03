/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 코멘트/문서 노드 렌더링 - Documentation, Comment
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.render = ns.Editor.render || {};
    ns.Editor.render.elements = ns.Editor.render.elements || {};

    /**
     * 코멘트/문서 노드를 렌더링합니다 (노트 모양)
     * @param {SVGElement} group - SVG 그룹
     * @param {Object} element - 노드 데이터
     * @returns {boolean} 렌더링 성공 여부
     */
    function drawCommentNode(group, element) {
        const elementTypeLower = String(element.type || '').toLowerCase();
        if (elementTypeLower !== 'documentation' && elementTypeLower !== 'comment') {
            return false;
        }

        const x = Number(element.x);
        const y = Number(element.y);
        const w = Number(element.width);
        const h = Number(element.height);
        const noteSize = 12;
        
        // 노트 모양의 사각형 (오른쪽 상단 모서리 접힘)
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 
            `M ${x},${y} L ${x + w - noteSize},${y} ` +
            `L ${x + w},${y + noteSize} L ${x + w},${y + h} ` +
            `L ${x},${y + h} Z`
        );
        path.setAttribute('class', elementTypeLower === 'documentation' ? 'node-documentation' : 'node-comment');
        path.setAttribute('fill', elementTypeLower === 'documentation' ? '#fff9e6' : '#f0f0f0');
        path.setAttribute('stroke', '#666');
        path.setAttribute('stroke-width', '1.5');
        group.appendChild(path);
        
        // 접힌 모서리 표시
        const fold = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        fold.setAttribute('d', 
            `M ${x + w - noteSize},${y} L ${x + w - noteSize},${y + noteSize} L ${x + w},${y + noteSize}`
        );
        fold.setAttribute('fill', 'none');
        fold.setAttribute('stroke', '#666');
        fold.setAttribute('stroke-width', '1');
        group.appendChild(fold);
        
        // 타입 표시
        const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        typeText.setAttribute('x', String(x + 8));
        typeText.setAttribute('y', String(y + 16));
        typeText.setAttribute('class', 'annotation-type');
        typeText.setAttribute('font-size', '10');
        typeText.setAttribute('font-style', 'italic');
        typeText.setAttribute('fill', '#666');
        typeText.textContent = `«${elementTypeLower}»`;
        group.appendChild(typeText);
        
        // 이름 표시
        if (element.name && element.name !== 'doc' && element.name !== 'comment') {
            const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            nameText.setAttribute('x', String(x + 8));
            nameText.setAttribute('y', String(y + 32));
            nameText.setAttribute('class', 'element-name');
            nameText.setAttribute('font-size', '12');
            nameText.setAttribute('font-weight', 'bold');
            nameText.textContent = element.name;
            group.appendChild(nameText);
        }
        
        // body 미리보기 (첫 줄만)
        if (element.body) {
            const bodyPreview = element.body
                .replace(/\/\*|\*\//g, '')
                .trim()
                .split('\n')[0]
                .substring(0, 30);
            
            const bodyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            bodyText.setAttribute('x', String(x + 8));
            bodyText.setAttribute('y', String(y + 48));
            bodyText.setAttribute('class', 'annotation-body-preview');
            bodyText.setAttribute('font-size', '10');
            bodyText.setAttribute('fill', '#666');
            bodyText.textContent = bodyPreview + (element.body.length > 30 ? '...' : '');
            group.appendChild(bodyText);
        }

        return true;
    }

    /**
     * 코멘트 노드 타입인지 확인합니다.
     * @param {string} typeLower - 소문자 타입
     * @returns {boolean} 코멘트 노드 여부
     */
    function isCommentNodeType(typeLower) {
        return typeLower === 'documentation' || typeLower === 'comment';
    }

    // 모듈 내보내기
    ns.Editor.render.elements.drawCommentNode = drawCommentNode;
    ns.Editor.render.elements.isCommentNodeType = isCommentNodeType;
})();
