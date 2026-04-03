/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * drawElement - 요소 렌더링 라우터
 * 각 요소 타입별 렌더링은 elements/ 디렉터리의 모듈로 분리됨
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.render = ns.Editor.render || {};

    // 분리된 모듈 참조
    const elements = ns.Editor.render.elements || {};

    /**
     * 요소를 렌더링합니다 (라우터 역할)
     * @param {SVGElement} svg - SVG 루트 요소
     * @param {Object} app - 앱 인스턴스
     * @param {Object} element - 노드 데이터
     * @param {Map} childrenOf - 자식 맵
     * @param {Array} containerHeaders - 컨테이너 헤더 배열
     * @param {Array} containerToggles - 컨테이너 토글 배열
     */
    function drawElement(svg, app, element, childrenOf, containerHeaders, containerToggles) {
        console.log('[drawElement] Rendering:', element.name, 'type:', element.type);
        
        const dragging = !!(app && app.isDragging);
        const getChildIds = (el) => ns.Editor.renderUtils.getElementChildIds(
            el,
            childrenOf,
            (app && Array.isArray(app._visibleElements)) ? app._visibleElements : (app?.model?.elements || [])
        );
        
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'diagram-element');
        group.setAttribute('data-id', element.id);
        if (app && app.selectedId === element.id) group.classList.add('selected');

        const elementTypeLower = String(element.type || '').toLowerCase();
        const typeLower = elementTypeLower;
        const normalizedType = typeLower.replace(/\s+/g, '');
        
        // 역할 감지
        let role = String(element.role || '').toLowerCase().replace(/\s+/g, '');
        const nameLower = String(element.name || '').toLowerCase();
        
        // ActionUsage 계열 타입만 이름으로 Start/Finalize 판별
        // item def Start 등은 제외 (ActionUsage, AcceptActionUsage 등만 해당)
        const isActionType = normalizedType.includes('action') || element.kind === 'StartAction' || element.kind === 'DoneAction';
        
        if (!role && isActionType && (nameLower === 'start' || nameLower.includes('initial'))) {
            role = 'initial';
        }
        if (!role && isActionType && (nameLower === 'finalize' || nameLower === 'done' || nameLower.includes('final'))) {
            role = 'final';
        }

        // 1. 코멘트/문서 노드
        if (elements.isCommentNodeType && elements.isCommentNodeType(elementTypeLower)) {
            if (elements.drawCommentNode(group, element)) {
                svg.appendChild(group);
                return;
            }
        }

        // 2. Alias 노드
        const typeReg = ns.Editor.config?.typeRegistry || {};
        if (typeReg.isAliasType && typeReg.isAliasType(element.type)) {
            if (elements.drawAliasNode) {
                const aliasRect = ns.Editor.renderUtils.createSvgRect(
                    element.x, 
                    element.y, 
                    element.width || 150, 
                    element.height || 80, 
                    'alias-node'
                );
                aliasRect.setAttribute('rx', '8');
                aliasRect.setAttribute('ry', '8');
                aliasRect.style.fill = '#FFFACD';
                aliasRect.style.stroke = '#000000';
                aliasRect.style.strokeWidth = '1';
                
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', Number(element.x) + (element.width || 150) / 2);
                text.setAttribute('y', Number(element.y) + (element.height || 80) / 2);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.style.fontSize = '11px';
                text.style.fontFamily = 'Arial';
                text.textContent = element.label || `«alias»\n${element.name}\nfor ${element.targetName || 'Unknown'}`;
                
                group.appendChild(aliasRect);
                group.appendChild(text);
                svg.appendChild(group);
                return;
            }
        }

        // 기본 사각형 생성
        const isPackage = typeLower.includes('package');
        const tabH = 22;
        const mainBoxY = isPackage ? Number(element.y) + tabH : Number(element.y);
        const mainBoxH = isPackage ? Number(element.height) - tabH : Number(element.height);
        const rect = ns.Editor.renderUtils.createSvgRect(element.x, mainBoxY, element.width, mainBoxH, '');
        
        const childIds = getChildIds(element);
        const isContainer = childIds.length > 0;

        // 특수 형태 노드 확인
        const isSpecialShape = (
            role === 'accept' || normalizedType.includes('acceptaction') ||
            role === 'send' || normalizedType.includes('sendaction') ||
            role === 'terminate' || normalizedType.includes('terminateaction') ||
            role === 'usecase' || normalizedType.includes('usecase') ||
            role === 'decision' || role === 'fork' || role === 'join' || role === 'merge' || role === 'final' || role === 'initial'
        );

        const typeLowerForCheck = element.type ? element.type.toLowerCase() : '';
        const forceContainer = typeLowerForCheck.includes('part') || 
                               typeLowerForCheck.includes('loop') || 
                               typeLowerForCheck.includes('ifaction') ||
                               typeLowerForCheck === 'elseifaction' ||
                               typeLowerForCheck === 'elseaction';
        const actualContainer = !isSpecialShape && (isContainer || forceContainer);

        // 클래스 설정
        let className = actualContainer ? 'diagram-node container' : 'diagram-node';
        if (typeLower.includes('referenceusage')) className += ' reference-usage-node';
        if (typeLower.includes('actiondefinition')) className += ' action-definition-node';
        if (typeLower.includes('actionusage')) className += ' action-usage-node';
        rect.setAttribute('class', className);

        // 스타일 설정
        applyNodeStyles(rect, element, typeLower, actualContainer);

        // 2. 비컨테이너 노드 렌더링
        if (!actualContainer) {
            // 투명 히트 영역으로 rect 추가
            try {
                rect.style.stroke = 'transparent';
                rect.style.fill = 'transparent';
            } catch {}
            group.appendChild(rect);

            // 2a. 액션 노드 (accept, send, terminate)
            if (elements.isActionNodeRole && elements.isActionNodeRole(role, typeLower)) {
                if (elements.drawActionNode(group, element, role, typeLower)) {
                    svg.appendChild(group);
                    return;
                }
            }

            // 2b. 유스케이스 노드
            if (elements.isUseCaseNodeType && elements.isUseCaseNodeType(role, typeLower)) {
                if (elements.drawUseCaseNode(group, element)) {
                    svg.appendChild(group);
                    return;
                }
            }

            // 2c. 컨트롤 노드 (decision, fork, join, merge, initial, final)
            if (elements.isControlNodeRole && elements.isControlNodeRole(role)) {
                if (elements.drawControlNode(group, element, role)) {
                    svg.appendChild(group);
                    return;
                }
            }

            // 2d. 일반 리프 노드
            drawLeafNode(group, rect, element, app, dragging, isPackage, tabH);
        } else {
            // 3. 컨테이너 노드 렌더링
            drawContainerNode(group, rect, element, app, childrenOf, containerHeaders, dragging, getChildIds, typeLower);
        }

        // 4. 보더 노드 렌더링
        if (elements.drawBorderNodes) {
            elements.drawBorderNodes(group, element);
        }

        svg.appendChild(group);
    }

    /**
     * 노드 스타일을 적용합니다.
     */
    function applyNodeStyles(rect, element, typeLower, actualContainer) {
        try {
            rect.style.fill = 'var(--vscode-editorWidget-background, transparent)';
            const isDefinition = typeLower.includes('definition');
            const isPackageNode = typeLower.includes('package');
            const isActionDefinition = typeLower.includes('actiondefinition');
            const isActionUsage = typeLower.includes('actionusage');
            const rxVal = (isDefinition || isPackageNode) ? '0' : '6';
            rect.setAttribute('rx', rxVal);
            rect.setAttribute('ry', rxVal);
            try { rect.style.setProperty('rx', rxVal + 'px'); rect.style.setProperty('ry', rxVal + 'px'); } catch {}
            
            if (actualContainer) {
                rect.style.stroke = 'var(--vscode-focusBorder, #4FC3F7)';
                rect.style.strokeWidth = '2px';
            } else {
                rect.style.stroke = 'var(--vscode-input-border, #888)';
                rect.style.strokeWidth = '1.5px';
            }
            
            // ActionDefinition, ActionUsage, Loop, IfActionUsage, ElseIfAction, ElseAction 등은 주황색 테두리
            const isLoopOrIf = typeLower.includes('loop') || typeLower.includes('ifaction') || typeLower === 'elseifaction' || typeLower === 'elseaction';
            if (isActionDefinition || isActionUsage || isLoopOrIf) {
                rect.style.stroke = 'orange';
                rect.style.strokeWidth = '2px';
            }
            if (typeLower.includes('referenceusage')) {
                rect.style.stroke = 'var(--vscode-input-border, #888)';
                rect.style.strokeWidth = '1.5px';
                rect.style.strokeDasharray = '6,3';
            }
        } catch {}
    }

    /**
     * 일반 리프 노드를 렌더링합니다.
     */
    function drawLeafNode(group, rect, element, app, dragging, isPackage, tabH) {
        const lineHeight = 14;
        const padX = 12; // 좌우 여백 증가 (layout.js의 padX/2와 일치)
        const padY = 10; // 상하 여백도 약간 증가
        const startY = element.y + padY;

        // 사전 계산된 줄바꿈 텍스트 사용 (없으면 기본 splitLines 사용)
        const typeLines = element._wrappedStereotype || splitLines(ns.Editor.utils.getStereotypeText(element.type));
        const nameLines = element._wrappedName || splitLines(element.name, { preserveEmpty: true });

        // rect 스타일 복원 및 추가
        try {
            rect.style.fill = 'var(--vscode-editorWidget-background, transparent)';
            rect.style.stroke = 'var(--vscode-input-border, #888)';
            rect.style.strokeWidth = '1.5px';
        } catch {}
        group.appendChild(rect);

        // Type glyph overlay (top-right)
        try {
            const gx = element.x + element.width - 14;
            const gy = element.y + 10;
            if (!isPackage && ns.Editor.render.elements.drawTypeGlyph) {
                ns.Editor.render.elements.drawTypeGlyph(group, element, gx, gy);
            }
        } catch {}

        // Package 탭 렌더링
        if (isPackage) {
            drawPackageTab(group, element, tabH);
        }

        // 텍스트 렌더링
        let idx = 0;
        const typeLower = String(element.type || '').toLowerCase();
        
        if (!isPackage) {
            const isAssignmentAction = typeLower.includes('assignmentaction');
            
            if (isAssignmentAction) {
                idx = drawAssignmentActionText(group, element, startY, lineHeight, padX);
            } else {
                idx = drawStandardNodeText(group, element, typeLines, nameLines, startY, lineHeight, padX);
            }
        }

        // Compartments 렌더링 (분리된 모듈 사용)
        if (elements.drawCompartments) {
            elements.drawCompartments(group, rect, element, app, startY, idx, lineHeight, padX, dragging);
        }
    }

    /**
     * Package 탭을 렌더링합니다.
     */
    function drawPackageTab(group, element, tabH) {
        const name = String(element.name || '');
        const tabX = Number(element.x);
        const tabY = Number(element.y);
        const tabPadding = 40;
        const measuredTextWidth = ns.Editor.renderUtils.measureText(name, 'container-title', {});
        const approx = Math.max(80, Math.min(Number(element.width) - 2, measuredTextWidth + tabPadding));

        // Cover
        const cover = ns.Editor.renderUtils.createSvgRect(tabX, tabY, approx, tabH, '');
        try {
            cover.style.setProperty('fill', 'var(--vscode-editorWidget-background)');
            cover.style.setProperty('stroke', 'none');
        } catch {}
        group.appendChild(cover);

        // Tab
        const tab = ns.Editor.renderUtils.createSvgRect(tabX, tabY, approx, tabH, '');
        try {
            tab.setAttribute('rx', '0');
            tab.setAttribute('ry', '0');
            tab.style.setProperty('fill', 'transparent');
            tab.style.setProperty('stroke', 'var(--vscode-focusBorder)');
            tab.style.setProperty('stroke-width', '1.5');
        } catch {}
        group.appendChild(tab);

        // Folder glyph
        try {
            const gx = tabX + 8;
            const gy = tabY + Math.floor(tabH / 2) + 1;
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const x0 = gx, y0 = gy - 6;
            const d = `M ${x0} ${y0 + 3} L ${x0 + 4} ${y0 + 3} L ${x0 + 6} ${y0} L ${x0 + 12} ${y0} L ${x0 + 12} ${y0 + 10} L ${x0} ${y0 + 10} Z`;
            p.setAttribute('d', d);
            p.setAttribute('class', 'type-glyph');
            group.appendChild(p);
        } catch {}

        // Package name
        const labelX = tabX + 28;
        const labelY = tabY + 5;
        const maxTextWidth = approx - (tabPadding / 2);
        let truncatedName = name;
        let textWidth = ns.Editor.renderUtils.measureText(truncatedName, 'container-title', {});

        while (textWidth > maxTextWidth && truncatedName.length > 3) {
            truncatedName = truncatedName.slice(0, -4) + '...';
            textWidth = ns.Editor.renderUtils.measureText(truncatedName, 'container-title', {});
        }
        if (textWidth > maxTextWidth) {
            truncatedName = '...';
        }

        const nameText = ns.Editor.renderUtils.createSvgText(labelX, labelY, 'container-title', truncatedName, {});
        group.appendChild(nameText);
    }

    /**
     * AssignmentAction 텍스트를 렌더링합니다.
     */
    function drawAssignmentActionText(group, element, startY, lineHeight, padX) {
        const leftX = Number(element.x) + padX;
        
        const assignStereotype = ns.Editor.renderUtils.createSvgText(leftX, startY, 'diagram-label', '«assign»', { 
            role: 'type', 
            textAnchor: 'start',
            fontStyle: 'italic'
        });
        group.appendChild(assignStereotype);
        
        let assignmentText = String(element.name || '');
        if (assignmentText.startsWith('assign ')) {
            assignmentText = assignmentText.substring(7);
        }
        
        const assignmentLabel = ns.Editor.renderUtils.createSvgText(leftX, startY + lineHeight, 'diagram-label', assignmentText, {
            role: 'name',
            fontWeight: 'bold',
            textAnchor: 'start'
        });
        group.appendChild(assignmentLabel);
        
        return 2;
    }

    /**
     * 표준 노드 텍스트를 렌더링합니다.
     */
    function drawStandardNodeText(group, element, typeLines, nameLines, startY, lineHeight, padX) {
        const leftX = Number(element.x) + padX;
        const nextY1 = ns.Editor.renderUtils.renderTextLines(group, typeLines, leftX, startY, lineHeight, 'diagram-label', { role: 'type', textAnchor: 'start' });
        let idx = Math.ceil((nextY1 - startY) / lineHeight);
        
        const finalNameLines = nameLines;
        const nextY2 = ns.Editor.renderUtils.renderTextLines(group, finalNameLines, leftX, startY + idx * lineHeight, lineHeight, 'diagram-label', { role: 'name', fontWeight: 'bold', textAnchor: 'start' });
        idx = Math.ceil((nextY2 - startY) / lineHeight);
        
        return idx;
    }

    // NOTE: drawCompartments 함수는 elements/drawCompartment.js로 분리됨

    /**
     * 컨테이너 노드를 렌더링합니다.
     */
    function drawContainerNode(group, rect, element, app, childrenOf, containerHeaders, dragging, getChildIds, typeLower) {
        group.appendChild(rect);

        containerHeaders.push({
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            type: element.type,
            name: element.name,
            visibility: element.visibility,
            guard: element.guard || element.condition,
        });

        // 자식 요소에 맞게 크기 확장
        if (!dragging) {
            expandContainerToFitChildren(rect, element, app, childrenOf, getChildIds);
        }

        // Compartments 렌더링 (분리된 모듈 사용)
        const padX = 8;
        const lineHeight = 14;
        if (elements.drawContainerCompartments) {
            elements.drawContainerCompartments(group, rect, element, app, padX, lineHeight, dragging, typeLower);
        }

        // Type glyph
        drawContainerTypeGlyph(group, element, padX, lineHeight, typeLower);

        // IfActionUsage 라벨
        if (typeLower.includes('ifaction')) {
            drawIfActionLabels(group, element, app, getChildIds);
        }

        // WhileLoop until 조건
        if (element.until) {
            drawWhileLoopUntil(group, element, dragging);
        }
        
        // Loop body (perform 문 등)
        if (element.body) {
            drawLoopBody(group, element, dragging);
        }
    }

    /**
     * 컨테이너를 자식에 맞게 확장합니다.
     */
    function expandContainerToFitChildren(rect, element, app, childrenOf, getChildIds) {
        try {
            const padRight = 16;
            const padBottom = 16;
            const childrenIds = (function getIds() {
                const a = childrenOf.get(element.id) || [];
                const b = childrenOf.get(element.name) || [];
                return Array.from(new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]));
            })();

            let rightMost = element.x + element.width;
            let bottomMost = element.y + element.height;

            for (const cid of childrenIds) {
                const child = app.model.elements.find((e) => String(e.id) === String(cid));
                if (child) {
                    const r = Number(child.x || 0) + Number(child.width || 0) + padRight;
                    const b = Number(child.y || 0) + Number(child.height || 0) + padBottom;
                    if (r > rightMost) rightMost = r;
                    if (b > bottomMost) bottomMost = b;
                }
            }

            const newWidth = Math.max(element.width, rightMost - element.x);
            const newHeight = Math.max(element.height, bottomMost - element.y);

            if (newWidth !== element.width) {
                element.width = newWidth;
                rect.setAttribute('width', String(newWidth));
                try { app._layoutChanged = true; } catch {}
            }
            if (newHeight !== element.height) {
                element.height = newHeight;
                rect.setAttribute('height', String(newHeight));
                try { app._layoutChanged = true; } catch {}
            }
        } catch {}
    }

    // NOTE: drawContainerCompartments 함수는 elements/drawCompartment.js로 분리됨

    /**
     * 컨테이너 Type Glyph를 렌더링합니다.
     */
    function drawContainerTypeGlyph(group, element, padX, lineHeight, typeLower) {
        try {
            const typeText3 = ns.Editor.utils.getStereotypeText(element.type);
            const headerLinesType2 = splitLines(typeText3);
            const headerLinesName2 = splitLines(element.name, { preserveEmpty: true });
            const isPackageH = typeLower.includes('package');
            const headerH2 = isPackageH ? 24 : Math.max(22, Math.ceil((headerLinesType2.length + headerLinesName2.length) * lineHeight + 8));
            const gx2 = element.x + element.width - 14;
            const gy2 = element.y + Math.min(10, headerH2 - 6);
            if (!isPackageH && ns.Editor.render.elements.drawTypeGlyph) {
                ns.Editor.render.elements.drawTypeGlyph(group, element, gx2, gy2);
            }
        } catch {}
    }

    /**
     * IfActionUsage 라벨을 렌더링합니다.
     */
    function drawIfActionLabels(group, element, app, getChildIds) {
        try {
            const childrenIds = getChildIds(element);
            if (childrenIds.length > 0 && Array.isArray(app?.model?.elements)) {
                const children = childrenIds
                    .map(cid => app.model.elements.find(e => String(e.id) === String(cid)))
                    .filter(c => c != null)
                    .sort((a, b) => Number(a.y || 0) - Number(b.y || 0));
                
                if (children.length >= 1) {
                    const firstChild = children[0];
                    const thenLabel = ns.Editor.renderUtils.createSvgText(
                        Number(firstChild.x) + 8,
                        Number(firstChild.y) - 18,
                        'if-branch-label',
                        'then:',
                        { fontSize: '11px', fontWeight: 'bold', fill: '#FFA500' }
                    );
                    thenLabel.setAttribute('fill', '#FFA500');
                    group.appendChild(thenLabel);
                }
                
                if (children.length >= 2) {
                    const secondChild = children[1];
                    const elseLabel = ns.Editor.renderUtils.createSvgText(
                        Number(secondChild.x) + 8,
                        Number(secondChild.y) - 18,
                        'if-branch-label',
                        'else:',
                        { fontSize: '11px', fontWeight: 'bold', fill: '#FFA500' }
                    );
                    elseLabel.setAttribute('fill', '#FFA500');
                    group.appendChild(elseLabel);
                }
            }
        } catch (e) {
            console.warn('[drawElement] IfActionUsage label rendering failed:', e);
        }
    }

    /**
     * Loop body (perform 문 등)를 렌더링합니다.
     */
    function drawLoopBody(group, element, dragging) {
        try {
            const padX = 8;
            const lineHeight = 14;
            // 헤더 아래에 body 표시 (name 줄 수 + 여백)
            const nameLineCount = splitLines(element.name, { preserveEmpty: true }).length;
            const headerHeight = 30 + nameLineCount * lineHeight;
            const startY = Number(element.y) + headerHeight;
            
            const maxWidth = Math.max(10, element.width - padX * 2);
            const wrap = ns.Editor.utils && ns.Editor.utils.wrapByWidth ? ns.Editor.utils.wrapByWidth : (t, _w) => [String(t || '')];
            const bodyLines = String(element.body).split('\n');
            
            let currentY = startY;
            for (const line of bodyLines) {
                const wrappedLines = wrap(line, maxWidth, '10px sans-serif');
                for (const wl of wrappedLines) {
                    const label = ns.Editor.renderUtils.createSvgText(
                        Number(element.x) + padX,
                        currentY,
                        'loop-body-label',
                        wl,
                        { fontSize: '10px', fill: '#666666' }
                    );
                    label.setAttribute('fill', '#666666');
                    group.appendChild(label);
                    currentY += lineHeight;
                }
            }
        } catch (e) {
            console.warn('[drawElement] Loop body rendering failed:', e);
        }
    }

    /**
     * WhileLoop until 조건을 렌더링합니다.
     */
    function drawWhileLoopUntil(group, element, dragging) {
        try {
            const padX = 8;
            const bottomMargin = 15;
            const textY = Number(element.y) + Number(element.height) - bottomMargin;
            
            const untilLines = splitLines(element.until, { preserveEmpty: true });
            
            const lineHeight = 14;
            const startY = textY - (untilLines.length - 1) * lineHeight;
            
            for (let i = 0; i < untilLines.length; i++) {
                const line = untilLines[i];
                const label = ns.Editor.renderUtils.createSvgText(
                    Number(element.x) + padX,
                    startY + i * lineHeight,
                    'loop-condition-label',
                    line,
                    { fontSize: '11px', fontWeight: 'bold', fill: '#FFA500' }
                );
                label.setAttribute('fill', '#FFA500');
                group.appendChild(label);
            }
        } catch (e) {
            console.warn('[drawElement] WhileLoop until label rendering failed:', e);
        }
    }

    /**
     * 문자열을 줄 배열로 분해합니다.
     */
    function splitLines(value, options = {}) {
        const text = value == null ? '' : String(value);
        if (!text) {
            return options.preserveEmpty ? [''] : [];
        }
        return text.split('\n');
    }

    ns.Editor.render.drawElement = drawElement;
})();
