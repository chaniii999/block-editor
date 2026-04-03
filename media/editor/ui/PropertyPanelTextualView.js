/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * PropertyPanel Textual Editor - CodeMirror 6 기반 SysML 소스 코드 편집 탭
 * PropertyPanel.js에서 분리
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.ui = ns.Editor.ui || {};
    ns.Editor.ui._textualView = ns.Editor.ui._textualView || {};

    const tv = ns.Editor.ui._textualView;

    // ─── 자동완성 요청/응답 인프라 ───
    const _completionPending = new Map();
    let _completionNextId = 0;
    const COMPLETION_TIMEOUT_MS = 5000;

    // SysML 키워드 목록 (로컬 자동완성용)
    const SYSML_KEYWORD_COMPLETIONS = [
        // 정의 키워드
        { label: 'package', type: 'keyword' },
        { label: 'part', type: 'keyword' },
        { label: 'part def', type: 'keyword', detail: 'Part Definition' },
        { label: 'action', type: 'keyword' },
        { label: 'action def', type: 'keyword', detail: 'Action Definition' },
        { label: 'state', type: 'keyword' },
        { label: 'state def', type: 'keyword', detail: 'State Definition' },
        { label: 'item', type: 'keyword' },
        { label: 'item def', type: 'keyword', detail: 'Item Definition' },
        { label: 'port', type: 'keyword' },
        { label: 'port def', type: 'keyword', detail: 'Port Definition' },
        { label: 'attribute', type: 'keyword' },
        { label: 'attribute def', type: 'keyword', detail: 'Attribute Definition' },
        { label: 'connection', type: 'keyword' },
        { label: 'connection def', type: 'keyword', detail: 'Connection Definition' },
        { label: 'interface', type: 'keyword' },
        { label: 'interface def', type: 'keyword', detail: 'Interface Definition' },
        { label: 'allocation', type: 'keyword' },
        { label: 'allocation def', type: 'keyword', detail: 'Allocation Definition' },
        { label: 'requirement', type: 'keyword' },
        { label: 'requirement def', type: 'keyword', detail: 'Requirement Definition' },
        { label: 'constraint', type: 'keyword' },
        { label: 'constraint def', type: 'keyword', detail: 'Constraint Definition' },
        { label: 'use case', type: 'keyword' },
        { label: 'use case def', type: 'keyword', detail: 'Use Case Definition' },
        { label: 'actor', type: 'keyword' },
        { label: 'subject', type: 'keyword' },
        { label: 'concern', type: 'keyword' },
        { label: 'stakeholder', type: 'keyword' },
        { label: 'view', type: 'keyword' },
        { label: 'view def', type: 'keyword', detail: 'View Definition' },
        { label: 'viewpoint', type: 'keyword' },
        { label: 'viewpoint def', type: 'keyword', detail: 'Viewpoint Definition' },
        { label: 'enum', type: 'keyword' },
        { label: 'enum def', type: 'keyword', detail: 'Enumeration Definition' },
        { label: 'flow', type: 'keyword' },
        { label: 'calc', type: 'keyword' },
        { label: 'calc def', type: 'keyword', detail: 'Calculation Definition' },
        { label: 'metadata', type: 'keyword' },
        { label: 'metadata def', type: 'keyword', detail: 'Metadata Definition' },
        // 관계/에지 키워드
        { label: 'connect', type: 'keyword', detail: 'Connection Usage' },
        { label: 'succession', type: 'keyword', detail: 'Succession' },
        { label: 'first', type: 'keyword', detail: 'Succession (first A then B)' },
        { label: 'then', type: 'keyword' },
        { label: 'transition', type: 'keyword', detail: 'State Transition' },
        { label: 'succession flow', type: 'keyword', detail: 'Succession Flow' },
        { label: 'bind', type: 'keyword' },
        { label: 'message', type: 'keyword' },
        // 제한자/수식어
        { label: 'abstract', type: 'keyword' },
        { label: 'in', type: 'keyword', detail: 'Direction: in' },
        { label: 'out', type: 'keyword', detail: 'Direction: out' },
        { label: 'inout', type: 'keyword', detail: 'Direction: inout' },
        { label: 'ref', type: 'keyword' },
        { label: 'readonly', type: 'keyword' },
        { label: 'derived', type: 'keyword' },
        { label: 'end', type: 'keyword' },
        { label: 'variation', type: 'keyword' },
        { label: 'variant', type: 'keyword' },
        // 타이핑/특화
        { label: 'specializes', type: 'keyword' },
        { label: 'redefines', type: 'keyword' },
        { label: 'subsets', type: 'keyword' },
        { label: 'references', type: 'keyword' },
        { label: 'conjugates', type: 'keyword' },
        // import/alias
        { label: 'import', type: 'keyword' },
        { label: 'private import', type: 'keyword' },
        { label: 'alias', type: 'keyword' },
        // 상태/액션 제어
        { label: 'entry', type: 'keyword' },
        { label: 'exit', type: 'keyword' },
        { label: 'do', type: 'keyword' },
        { label: 'if', type: 'keyword' },
        { label: 'else', type: 'keyword' },
        { label: 'loop', type: 'keyword' },
        { label: 'while', type: 'keyword' },
        { label: 'until', type: 'keyword' },
        { label: 'decide', type: 'keyword' },
        { label: 'merge', type: 'keyword' },
        { label: 'fork', type: 'keyword' },
        { label: 'join', type: 'keyword' },
        { label: 'accept', type: 'keyword' },
        { label: 'send', type: 'keyword' },
        { label: 'terminate', type: 'keyword' },
        // 기타
        { label: 'satisfy', type: 'keyword' },
        { label: 'verify', type: 'keyword' },
        { label: 'expose', type: 'keyword' },
        { label: 'perform', type: 'keyword' },
        { label: 'include', type: 'keyword' },
        { label: 'exhibit', type: 'keyword' },
        { label: 'assert', type: 'keyword' },
        { label: 'doc', type: 'keyword', detail: 'Documentation' },
        { label: 'comment', type: 'keyword' },
        { label: 'library', type: 'keyword' },
        { label: 'namespace', type: 'keyword' },
    ];

    /**
     * 로컬 SysML 키워드 자동완성 소스 (동기, 즉시 반환)
     */
    function sysmlKeywordCompletionSource(ctx) {
        const word = ctx.matchBefore(/[\w\s]*/); 
        if (!word || word.from === word.to) {
            if (!ctx.explicit) return null;
        }
        // 실제 타이핑된 접두사만 추출 (앞의 공백 무시)
        const typed = (word ? ctx.state.doc.sliceString(word.from, ctx.pos) : '').trimStart();
        if (!typed && !ctx.explicit) return null;

        const from = typed ? ctx.pos - typed.length : ctx.pos;
        const lower = typed.toLowerCase();
        const options = SYSML_KEYWORD_COMPLETIONS.filter(k =>
            k.label.toLowerCase().startsWith(lower)
        );
        if (options.length === 0) return null;
        return { from, options, filter: true };
    }

    /**
     * 리모트 참조/타입 자동완성 소스 - Extension Host에 위임
     * @param {Object} panel - PropertyPanel 인스턴스 (클로저로 캡처)
     * @returns {Function} CodeMirror CompletionSource
     */
    function createSysmlRemoteCompletionSource(panel) {
        return function sysmlRemoteCompletionSource(ctx) {
            const word = ctx.matchBefore(/[\w:]*/); 
            if (!word && !ctx.explicit) return null;

            const post = ns.Editor?.post;
            const api = ns.Editor?.vscode || window.vscode || null;
            if (!post && !api) return null;

            // CM 커서 위치를 line/char로 변환
            const doc = ctx.state.doc;
            const line = doc.lineAt(ctx.pos);
            const cmLine = line.number - 1; // 0-indexed
            const cmChar = ctx.pos - line.from;

            // 트리거 문자 감지
            let triggerChar = undefined;
            if (ctx.pos > 0) {
                const charBefore = doc.sliceString(ctx.pos - 1, ctx.pos);
                if (':>.@#'.includes(charBefore)) {
                    triggerChar = charBefore;
                }
            }

            // 노드별 보기 범위 정보
            const range = panel._textualViewRange;
            const payload = {
                type: 'request-completion',
                id: _completionNextId++,
                cmLine,
                cmChar,
                triggerChar,
                rangeStartLine: range?.startLine ?? undefined,
                rangeStartChar: range?.startChar ?? undefined,
                baseIndentLength: panel._textualViewBaseIndent || 0,
            };

            return new Promise((resolve) => {
                const timer = setTimeout(() => {
                    _completionPending.delete(payload.id);
                    resolve(null);
                }, COMPLETION_TIMEOUT_MS);

                _completionPending.set(payload.id, { resolve, timer, from: word?.from ?? ctx.pos });

                if (typeof post === 'function') {
                    post(payload);
                } else if (api && typeof api.postMessage === 'function') {
                    api.postMessage(payload);
                }
            });
        };
    }

    /**
     * Extension Host에서 온 자동완성 응답 처리
     * @param {number} id - 요청 ID
     * @param {Array} items - 자동완성 항목 배열
     */
    tv.handleCompletionResponse = function (id, items) {
        const entry = _completionPending.get(id);
        if (!entry) return;

        clearTimeout(entry.timer);
        _completionPending.delete(id);

        if (!items || items.length === 0) {
            entry.resolve(null);
            return;
        }

        // CompletionItem.kind → CodeMirror type 매핑
        const kindMap = {
            1: 'text', 2: 'method', 3: 'function', 4: 'constructor',
            5: 'field', 6: 'variable', 7: 'class', 8: 'interface',
            9: 'module', 10: 'property', 12: 'value', 13: 'enum',
            14: 'keyword', 18: 'type',
        };

        const options = items.map(item => ({
            label: item.label,
            detail: item.detail || undefined,
            type: kindMap[item.kind] || 'text',
        }));

        entry.resolve({
            from: entry.from,
            options,
            filter: true,
        });
    };

    /**
     * CodeMirror EditorView에서 현재 소스 텍스트 추출
     * @param {Object} panel
     * @returns {string}
     */
    function getCmSource(panel) {
        return panel._cmEditor?.state?.doc?.toString() ?? '';
    }

    /**
     * CodeMirror EditorView 콘텐츠 교체 (전체 문서 replace)
     * @param {Object} panel
     * @param {string} source
     */
    function setCmSource(panel, source) {
        const editor = panel._cmEditor;
        if (!editor) return;
        const docLen = editor.state.doc.length;
        editor.dispatch({
            changes: { from: 0, to: docLen, insert: source },
        });
    }

    /**
     * CodeMirror 6 에디터 초기화
     * window.CM이 준비된 뒤 호출. 실패 시 textarea fallback.
     * @param {Object} panel
     * @param {HTMLElement} wrapper
     * @param {string} initialSource
     */
    function initCodeMirror(panel, wrapper, initialSource) {
        const CM = window.CM;
        if (!CM) {
            // fallback: textarea
            initTextareaFallback(panel, wrapper, initialSource);
            return;
        }

        const { EditorView, EditorState, basicSetup, keymap, defaultKeymap, indentWithTab, oneDark, sysmlLanguage, autocompletion } = CM;

        // Ctrl+S 저장 커맨드
        const saveKeymap = keymap.of([
            {
                key: 'Mod-s',
                run: () => { tv._applyEdit(panel); return true; },
            },
            indentWithTab,
            ...defaultKeymap,
        ]);

        // SysML 자동완성 extension (로컬 키워드 + 리모트 참조/타입)
        const completionExt = autocompletion
            ? autocompletion({ override: [sysmlKeywordCompletionSource, createSysmlRemoteCompletionSource(panel)] })
            : [];

        const state = EditorState.create({
            doc: initialSource,
            extensions: [
                basicSetup,
                oneDark,
                ...(sysmlLanguage ? [sysmlLanguage] : []),
                completionExt,
                saveKeymap,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        panel._textualIsEditing = true;
                        tv._showError(panel, null);
                    }
                }),
            ],
        });

        panel._cmEditor = new EditorView({ state, parent: wrapper });
    }

    /**
     * CodeMirror 로드 실패 시 textarea fallback
     * @param {Object} panel
     * @param {HTMLElement} wrapper
     * @param {string} initialSource
     */
    function initTextareaFallback(panel, wrapper, initialSource) {
        const textarea = document.createElement('textarea');
        textarea.className = 'textual-view-textarea';
        textarea.spellcheck = false;
        textarea.value = initialSource;

        textarea.addEventListener('input', () => {
            panel._textualIsEditing = true;
            tv._showError(panel, null);
        });
        textarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                tv._applyEdit(panel);
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                const s = textarea.selectionStart;
                const en = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, s) + '    ' + textarea.value.substring(en);
                textarea.selectionStart = textarea.selectionEnd = s + 4;
            }
        });

        panel._cmEditor = null;
        panel._textareaFallback = textarea;
        wrapper.appendChild(textarea);
    }

    /**
     * Textual Editor 렌더링
     * @param {Object} panel - PropertyPanel 인스턴스
     * @param {HTMLElement} container
     * @param {Object} node
     * @param {Object} app
     */
    tv.renderTextualView = function (panel, container, node, app) {
        panel._textualViewContainer = container;
        panel._currentTextualNode = node;
        panel._textualIsEditing = false;
        panel._cmEditor = null;
        panel._textareaFallback = null;
        panel._diagnosticAttachedEditor = null;

        // 상단 툴바
        const toolbar = document.createElement('div');
        toolbar.className = 'textual-view-toolbar';

        const titleRow = document.createElement('div');
        titleRow.className = 'textual-view-title-row';
        const title = document.createElement('span');
        title.className = 'textual-view-title';
        title.textContent = panel.t('textualView.title', '텍스트 편집기');
        titleRow.appendChild(title);
        const badge = document.createElement('span');
        badge.className = 'textual-view-badge';
        badge.textContent = panel.t('textualView.badge', '베타');
        titleRow.appendChild(badge);
        toolbar.appendChild(titleRow);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'textual-view-btn-group';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'textual-view-btn';
        copyBtn.title = panel.t('textualView.tooltips.copy', 'Copy');
        copyBtn.innerHTML = '&#x1F4CB;';
        copyBtn.addEventListener('click', () => {
            const src = panel._cmEditor ? getCmSource(panel) : (panel._textareaFallback?.value ?? '');
            navigator.clipboard.writeText(src).catch(() => {});
        });
        btnGroup.appendChild(copyBtn);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'textual-view-btn textual-view-btn--save';
        saveBtn.title = panel.t('textualView.tooltips.save', 'Save (Ctrl+S)');
        saveBtn.textContent = panel.t('textualView.actions.save', 'Save');
        saveBtn.addEventListener('click', () => tv._applyEdit(panel));
        btnGroup.appendChild(saveBtn);

        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'textual-view-btn';
        refreshBtn.title = panel.t('textualView.tooltips.refresh', 'Refresh (discard edits)');
        refreshBtn.innerHTML = '&#x21BB;';
        refreshBtn.addEventListener('click', () => {
            panel._textualIsEditing = false;
            tv.requestSysmlSource(panel);
        });
        btnGroup.appendChild(refreshBtn);

        toolbar.appendChild(btnGroup);
        container.appendChild(toolbar);

        // 에디터 래퍼
        const wrapper = document.createElement('div');
        wrapper.className = 'textual-view-wrapper';
        container.appendChild(wrapper);

        // 에러 배너 (기본 숨김)
        const errorBanner = document.createElement('div');
        errorBanner.className = 'textual-view-error-banner';
        errorBanner.style.display = 'none';

        // CodeMirror 로컬 번들은 동기 로드 - 즉시 초기화
        initCodeMirror(panel, wrapper, '');
        container.appendChild(errorBanner);
        // Extension에 소스 요청
        tv.requestSysmlSource(panel);
    };

    /**
     * Extension에 편집 내용 적용 요청
     * @param {Object} panel
     */
    tv._applyEdit = function (panel) {
        const newSource = panel._cmEditor
            ? getCmSource(panel)
            : (panel._textareaFallback?.value ?? '');
        if (!newSource) return;

        const node = panel._currentTextualNode;
        try {
            const post = ns.Editor?.post;
            const api = ns.Editor?.vscode || window.vscode || null;
            const payload = {
                type: 'update-sysml-source',
                source: newSource,
                id: node?.id,
                name: node?.qualifiedName || node?.name,
            };
            if (typeof post === 'function') {
                post(payload);
            } else if (api && typeof api.postMessage === 'function') {
                api.postMessage(payload);
            }
        } catch (err) {
            console.error('[PropertyPanelTextualView] _applyEdit 오류:', err);
        }
    };

    /**
     * Extension에 SysML 소스 요청
     * @param {Object} panel
     */
    tv.requestSysmlSource = function (panel) {
        try {
            const post = ns.Editor?.post;
            const api = ns.Editor?.vscode || window.vscode || null;
            const node = panel._currentTextualNode;
            const payload = {
                type: 'request-sysml-source',
                id: node?.id,
                name: node?.qualifiedName || node?.name,
            };
            if (typeof post === 'function') {
                post(payload);
            } else if (api && typeof api.postMessage === 'function') {
                api.postMessage(payload);
            }
        } catch (err) {
            console.error('[PropertyPanelTextualView] requestSysmlSource 오류:', err);
        }
    };

    /**
     * Textual Editor 소스 코드 업데이트 (Extension 응답 시 호출)
     * 편집 중(_textualIsEditing)이면 외부 갱신 무시
     * @param {Object} panel
     * @param {string} source
     * @param {Object} [range] 전체 문서에서의 해당 노드 범위 {start:{line, character}, end:{line, character}}
     * @param {number} [baseIndentLength] 제거된 들여쓰기 길이
     */
    tv.updateTextualView = function (panel, source, range, baseIndentLength) {
        if (panel._textualIsEditing) return;

        // 에러 위치 계산을 위해 범위와 들여쓰기 정보 저장
        panel._textualViewRange = range;
        panel._textualViewBaseIndent = baseIndentLength || 0;

        if (panel._cmEditor) {
            setCmSource(panel, source || '');
        } else if (panel._textareaFallback) {
            panel._textareaFallback.value = source || '';
        }

        if (Array.isArray(panel._lastDiagnostics)) {
            tv.applyDiagnostics(panel, panel._lastDiagnostics);
        }
    };

    /**
     * 에러 배너 표시/숨김
     * @param {Object} panel
     * @param {string|null} message - null이면 숨김
     */
    tv._showError = function (panel, message) {
        const banner = panel._textualViewContainer?.querySelector('.textual-view-error-banner');
        if (!banner) return;
        if (!message) {
            banner.style.display = 'none';
            banner.textContent = '';
        } else {
            banner.style.display = 'block';
            banner.textContent = message;
        }
    };

    /**
     * 편집 완료 후 플래그 초기화 (Extension 응답 시 호출)
     * @param {Object} panel
     * @param {boolean} success
     * @param {string} [errorMessage]
     */
    tv.onEditResult = function (panel, success, errorMessage) {
        if (success) {
            panel._textualIsEditing = false;
            tv._showError(panel, null);
        } else {
            tv._showError(panel, errorMessage || panel.t('textualView.messages.saveFailedSyntax', 'Save failed: SysML syntax error detected.'));
        }
    };

    /**
     * VS Code Diagnostics를 CodeMirror 에디터에 적용 (에러 하이라이팅 + 에러 목록)
     * @param {Object} panel
     * @param {Array<{message:string, startLine:number, startChar:number, endLine:number, endChar:number, severity:string}>} diagnostics
     */
    tv.applyDiagnostics = function (panel, diagnostics) {
        try {
            panel._lastDiagnostics = Array.isArray(diagnostics) ? diagnostics : [];
            const nodeRange = panel._textualViewRange; // 이제 { startLine, startChar, endLine, endChar } 형태
            const baseIndent = panel._textualViewBaseIndent || 0;

            let bannerDiagnostics = [];
            let cmDiagnostics = [];

            if (nodeRange && nodeRange.startLine !== undefined) {
                const cmLines = panel._cmEditor ? panel._cmEditor.state.doc.lines : 0;
                const maxLineIdx = Math.max(0, cmLines - 1);

                diagnostics.forEach(d => {
                    const relStart = d.startLine - nodeRange.startLine;
                    const relEnd = d.endLine - nodeRange.startLine;

                    // 파서 오류가 블록을 벗어나 보고되는 경우(예: '}' 다음 줄)를 위해 약간의 마진 허용
                    if (relStart >= -5 && relStart <= maxLineIdx + 10) {
                        
                        // 배너 표시용 (상대 라인 유지, 에디터를 벗어난 경우 알림)
                        bannerDiagnostics.push({
                            ...d,
                            startLine: relStart, // 클릭 시 이동할 위치
                            displayLine: (relStart >= 0 && relStart <= maxLineIdx) ? (relStart + 1) : `Ext(${d.startLine + 1})`
                        });

                        // CodeMirror 표시용 (화면 안으로 위치 클램핑)
                        const clampedStartLine = Math.max(0, Math.min(relStart, maxLineIdx));
                        const clampedEndLine = Math.max(0, Math.min(relEnd, maxLineIdx));
                        
                        // LSP 진단의 startChar/endChar는 원본 문서 기준이므로, 
                        // 첫 줄이 아닌 경우에만 baseIndent 보정 적용
                        const isFirstLine = (relStart === 0);
                        const adjustedStartChar = isFirstLine ? d.startChar : Math.max(0, d.startChar - baseIndent);
                        const adjustedEndChar = isFirstLine ? d.endChar : Math.max(0, d.endChar - baseIndent);

                        cmDiagnostics.push({
                            ...d,
                            startLine: clampedStartLine,
                            endLine: clampedEndLine,
                            startChar: (clampedStartLine === relStart) ? adjustedStartChar : 0,
                            endChar: (clampedEndLine === relEnd) ? adjustedEndChar : 999,
                        });
                    }
                });
            } else {
                bannerDiagnostics = diagnostics.map(d => ({ ...d, displayLine: d.startLine + 1 }));
                cmDiagnostics = diagnostics;
            }

            // 에러 목록 표시
            tv._showDiagnosticsList(panel, bannerDiagnostics);

            // CodeMirror 데코레이션 적용
            tv._applyCmDiagnostics(panel, cmDiagnostics);
        } catch (err) {
            console.error('[PropertyPanelTextualView] applyDiagnostics 오류:', err);
        }
    };

    /**
     * 에러 목록을 배너 영역에 표시
     * @param {Object} panel
     * @param {Array} diagnostics
     */
    tv._showDiagnosticsList = function (panel, diagnostics) {
        const banner = panel._textualViewContainer?.querySelector('.textual-view-error-banner');
        if (!banner) return;

        if (!diagnostics || diagnostics.length === 0) {
            banner.style.display = 'none';
            banner.innerHTML = '';
            return;
        }

        // 에러 목록 HTML 생성
        const errorItems = diagnostics.map((d, idx) => {
            const lineText = d.displayLine !== undefined ? d.displayLine : (d.startLine + 1);
            const shortMsg = d.message.length > 80 ? d.message.substring(0, 80) + '...' : d.message;
            return `<div class="diagnostic-item" data-index="${idx}" data-line="${Math.max(0, d.startLine)}" data-char="${d.startChar}">
                <span class="diagnostic-icon">⊗</span>
                <span class="diagnostic-location">Line ${lineText}:</span>
                <span class="diagnostic-message">${escapeHtml(shortMsg)}</span>
            </div>`;
        }).join('');

        banner.innerHTML = `
            <div class="diagnostic-header">
                <span class="diagnostic-count">${diagnostics.length} error(s) found</span>
            </div>
            <div class="diagnostic-list">${errorItems}</div>
        `;
        banner.style.display = 'block';

        // 에러 항목 클릭 시 해당 위치로 커서 이동
        banner.querySelectorAll('.diagnostic-item').forEach(item => {
            item.addEventListener('click', () => {
                const line = parseInt(item.dataset.line, 10);
                const char = parseInt(item.dataset.char, 10);
                tv._goToPosition(panel, line, char);
            });
        });
    };

    /**
     * CodeMirror 에디터에 에러 하이라이팅 적용
     * @param {Object} panel
     * @param {Array} diagnostics
     */
    tv._applyCmDiagnostics = function (panel, diagnostics) {
        const editor = panel._cmEditor;
        if (!editor) return;

        const CM = window.CM;
        if (!CM || !CM.EditorView || !CM.Decoration || !CM.StateField || !CM.StateEffect) return;

        const { EditorView, Decoration, StateField, StateEffect } = CM;

        // 기존 에러 데코레이션 제거를 위한 Effect 정의
        if (!panel._diagnosticEffect || !panel._diagnosticField) {
            panel._diagnosticEffect = StateEffect.define();
            panel._diagnosticField = StateField.define({
                create: () => Decoration.none,
                update: (decorations, tr) => {
                    for (const e of tr.effects) {
                        if (e.is(panel._diagnosticEffect)) {
                            return e.value;
                        }
                    }
                    return decorations.map(tr.changes);
                },
                provide: f => EditorView.decorations.from(f),
            });
        }

        if (panel._diagnosticAttachedEditor !== editor) {
            editor.dispatch({
                effects: CM.StateEffect.appendConfig.of(panel._diagnosticField),
            });
            panel._diagnosticAttachedEditor = editor;
        }

        // 에러 데코레이션 생성
        const doc = editor.state.doc;
        const decorations = [];

        for (const d of diagnostics) {
            try {
                // 줄 번호가 문서 범위 내인지 확인
                if (d.startLine < 0 || d.startLine >= doc.lines) continue;

                const startLineInfo = doc.line(d.startLine + 1); // 1-indexed
                const endLineInfo = d.endLine < doc.lines ? doc.line(d.endLine + 1) : startLineInfo;

                const from = Math.min(startLineInfo.from + d.startChar, startLineInfo.to);
                const to = Math.min(endLineInfo.from + d.endChar, endLineInfo.to);

                if (from <= to && from >= 0 && to <= doc.length) {
                    decorations.push(
                        Decoration.mark({
                            attributes: { 
                                title: d.message,
                                style: 'color: #ff0000 !important; font-weight: 900 !important; background-color: rgba(255,0,0,0.2);'
                            },
                        }).range(from, Math.max(from + 1, to))
                    );
                }
            } catch (err) {
                console.error('[PropertyPanelTextualView] 에러 데코레이션 생성 실패:', err);
            }
        }

        // 데코레이션 적용
        const decorationSet = Decoration.set(decorations, true);
        editor.dispatch({
            effects: panel._diagnosticEffect.of(decorationSet),
        });
    };

    /**
     * CodeMirror 에디터에서 특정 위치로 커서 이동
     * @param {Object} panel
     * @param {number} line - 0-indexed 줄 번호
     * @param {number} char - 0-indexed 문자 위치
     */
    tv._goToPosition = function (panel, line, char) {
        const editor = panel._cmEditor;
        if (!editor) return;

        try {
            const doc = editor.state.doc;
            if (line < 0 || line >= doc.lines) return;

            const lineInfo = doc.line(line + 1); // 1-indexed
            const pos = Math.min(lineInfo.from + char, lineInfo.to);

            editor.dispatch({
                selection: { anchor: pos },
                scrollIntoView: true,
            });
            editor.focus();
        } catch (err) {
            console.error('[PropertyPanelTextualView] 커서 이동 실패:', err);
        }
    };

    /**
     * HTML 이스케이프 유틸리티
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})();
