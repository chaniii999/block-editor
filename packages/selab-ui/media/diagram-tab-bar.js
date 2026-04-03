// Copyright: SELab.AI (c) 2026

/**
 * DiagramTabBar — v3 .slb 파일의 diagrams 배열을 탭으로 렌더링.
 * model.diagrams 배열과 model.activeDiagramId를 읽어 탭 목록을 구성한다.
 * 탭 클릭 시 diagram-switch, 추가 버튼 클릭 시 diagram-add,
 * 탭 더블클릭 시 diagram-rename, 닫기 버튼 클릭 시 diagram-remove 메시지를 전송.
 */
(function () {
    'use strict';

    /**
     * @param {object} options
     * @param {HTMLElement} options.container - 탭 바를 삽입할 컨테이너 요소
     * @param {function} options.postMessage - VS Code webview postMessage 함수
     */
    function DiagramTabBar({ container, postMessage }) {
        this._container = container;
        this._postMessage = postMessage;
        this._diagrams = [];
        this._activeDiagramId = null;
        this._bar = null;
        this._init();
    }

    DiagramTabBar.prototype._init = function () {
        this._bar = document.createElement('div');
        this._bar.className = 'selab-diagram-tab-bar';
        this._container.appendChild(this._bar);
    };

    /**
     * model 수신 시 호출 — diagrams/activeDiagramId 변경 시 재렌더.
     * @param {object} model
     */
    DiagramTabBar.prototype.update = function (model) {
        const diagrams = Array.isArray(model?.diagrams) ? model.diagrams : [];
        const activeId = model?.activeDiagramId || (diagrams[0]?.diagramId ?? null);

        const changed =
            activeId !== this._activeDiagramId ||
            JSON.stringify(diagrams.map((d) => ({ id: d.diagramId, name: d.name, type: d.diagramType }))) !==
                JSON.stringify(this._diagrams.map((d) => ({ id: d.diagramId, name: d.name, type: d.diagramType })));

        this._diagrams = diagrams;
        this._activeDiagramId = activeId;

        if (changed) this._render();

        // v3가 아닌 경우(단일 presentation) 탭 바 숨김
        this._bar.style.display = diagrams.length > 0 ? 'flex' : 'none';
    };

    DiagramTabBar.prototype._render = function () {
        this._bar.innerHTML = '';

        for (const diagram of this._diagrams) {
            const tab = this._buildTab(diagram);
            this._bar.appendChild(tab);
        }

        const addBtn = document.createElement('button');
        addBtn.className = 'selab-diagram-tab-add';
        addBtn.title = 'Add new diagram';
        addBtn.textContent = '+';
        addBtn.addEventListener('click', () => {
            this._postMessage({ type: 'diagram-add', payload: { diagramType: 'EFFBD' } });
        });
        this._bar.appendChild(addBtn);
    };

    DiagramTabBar.prototype._buildTab = function (diagram) {
        const tab = document.createElement('div');
        tab.className = 'selab-diagram-tab' + (diagram.diagramId === this._activeDiagramId ? ' active' : '');
        tab.dataset.diagramId = diagram.diagramId;
        tab.title = diagram.name || diagram.diagramId;

        const label = document.createElement('span');
        label.className = 'selab-diagram-tab-label';
        label.textContent = diagram.name || diagram.diagramId;

        const typeTag = document.createElement('span');
        typeTag.className = 'selab-diagram-tab-type';
        typeTag.textContent = diagram.diagramType || '';

        const closeBtn = document.createElement('span');
        closeBtn.className = 'selab-diagram-tab-close';
        closeBtn.title = 'Remove diagram';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this._diagrams.length <= 1) return;
            if (!window.confirm(`Remove diagram "${diagram.name || diagram.diagramId}"?`)) return;
            this._postMessage({ type: 'diagram-remove', payload: { diagramId: diagram.diagramId } });
        });

        tab.appendChild(label);
        tab.appendChild(typeTag);
        tab.appendChild(closeBtn);

        // 단일 클릭 → 탭 전환
        tab.addEventListener('click', () => {
            if (diagram.diagramId === this._activeDiagramId) return;
            this._postMessage({ type: 'diagram-switch', payload: { diagramId: diagram.diagramId } });
        });

        // 더블클릭 → 이름 변경
        tab.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this._startRename(tab, diagram);
        });

        return tab;
    };

    DiagramTabBar.prototype._startRename = function (tab, diagram) {
        const label = tab.querySelector('.selab-diagram-tab-label');
        if (!label) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = diagram.name || '';
        input.style.cssText = [
            'font-size:11px',
            'padding:0 2px',
            'border:1px solid var(--vscode-focusBorder,#007acc)',
            'background:var(--vscode-input-background,#3c3c3c)',
            'color:var(--vscode-input-foreground,#ccc)',
            'width:100%',
            'outline:none',
        ].join(';');

        label.replaceWith(input);
        input.focus();
        input.select();

        const commit = () => {
            const newName = input.value.trim();
            if (newName && newName !== diagram.name) {
                this._postMessage({ type: 'diagram-rename', payload: { diagramId: diagram.diagramId, name: newName } });
            }
            input.replaceWith(label);
            label.textContent = newName || diagram.name || diagram.diagramId;
        };

        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = diagram.name || ''; input.blur(); }
        });
    };

    // 전역 노출
    window.DiagramTabBar = DiagramTabBar;
})();
