/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxCompartmentHtml.js - Compartment HTML 빌드 유틸리티
 * MxCompartmentRenderer.js에서 분리된 HTML 생성 모듈
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.compartmentHtml = ns.MxGraph.compartmentHtml || {};

    /**
     * HTML 이스케이프 처리
     * @param {string} text - 원본 텍스트
     * @returns {string} 이스케이프된 텍스트
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Compartment 아이템을 포맷팅합니다.
     * @param {Object|string} item - compartment 아이템
     * @returns {string} 포맷된 문자열
     */
    function formatCompartmentItem(item) {
        if (typeof item !== 'object') {
            let text = String(item || '');
            return text;
        }

        let label = item.name || item.id || '';

        // PerformActionUsage 특별 처리
        if (item.kind === 'PerformActionUsage' && item.referencedAction) {
            const pureItemName = label.replace(/\[[^\]]+\]/g, '').replace(/\bordered\b/g, '').trim();
            if (item.referencedAction !== pureItemName) {
                label += '\n→ ' + item.referencedAction;
            }
        }

        // 타입 정보 추가
        const nameAlreadyHasType = label && (label.includes(' : ') || /\w:\w/.test(label));
        if ((item.declaredType || item.typeName) && !nameAlreadyHasType) {
            label += ' : ' + (item.declaredType || item.typeName);
        }

        // 방향성 표시
        if (item.direction) {
            const dir = String(item.direction).toLowerCase();
            if (dir === 'in') {
                label = '→ ' + label;
            } else if (dir === 'out') {
                label = '← ' + label;
            } else if (dir === 'inout') {
                label = '↔ ' + label;
            }
        }

        // 기본값 표시
        if (item.defaultValue !== undefined && item.defaultValue !== null) {
            label += ' = ' + item.defaultValue;
        }

        return label;
    }

    /**
     * Compartment 배열을 HTML 테이블로 변환합니다. (하위 호환용)
     * @param {Array} compartments - compartment 배열
     * @param {boolean} showSeparator - 구분선 표시 여부
     * @returns {Object} { html: string, height: number }
     */
    function buildCompartmentHtml(compartments, showSeparator) {
        let html = '';
        let totalHeight = 0;

        const DS = window.SELAB?.Editor?.config?.displaySettings;
        const HR_HEIGHT = DS?.compartment?.separatorHeight ?? 9;
        const HEADER_HEIGHT = DS?.compartment?.headerHeight ?? 20;
        const ITEM_HEIGHT = DS?.compartment?.itemHeight ?? 16;

        let lastRenderIndex = -1;
        for (let i = compartments.length - 1; i >= 0; i--) {
            const items = compartments[i].items;
            if ((items && items.length > 0) || compartments[i].headerOnly === true) {
                lastRenderIndex = i;
                break;
            }
        }

        for (let i = 0; i < compartments.length; i++) {
            const comp = compartments[i];
            const key = comp.key || 'compartment';
            const items = Array.isArray(comp.items) ? comp.items : [];
            const isHeaderOnly = comp.headerOnly === true;

            if (items.length === 0 && !isHeaderOnly) continue;

            html += '<hr style="margin:4px 0;border:none;border-top:1px solid #888;">';
            totalHeight += HR_HEIGHT;

            html += '<div style="text-align:left;padding:2px 4px;">';
            html += '<div style="font-weight:bold;">' + escapeHtml(key) + '</div>';
            totalHeight += HEADER_HEIGHT + 2;

            if (isHeaderOnly) {
                html += '</div>';
                if (i === lastRenderIndex && showSeparator) {
                    html += '<hr style="margin:4px 0;border:none;border-top:1px solid #888;">';
                    totalHeight += HR_HEIGHT;
                }
                continue;
            }

            for (const item of items) {
                let itemHtml = '';
                if ((key === 'doc' || key === 'constraints') && typeof item === 'object') {
                    if (key === 'constraints' && item.keyword) {
                        const keyword = escapeHtml(item.keyword);
                        const rawBody = (item.body || item.name || '');
                        const cleanBody = rawBody.replace(/\r\n/g, '\n').replace(/\t+/g, '    ');
                        const bodyLines = cleanBody.split('\n').map(l => l.trim()).filter(Boolean);
                        const bodyHtml = bodyLines.map(l => '&nbsp;&nbsp;&nbsp;&nbsp;' + escapeHtml(l)).join('<br/>');
                        itemHtml = '<b>' + keyword + '</b> {<br/>' + bodyHtml + '<br/>}';
                        const CHARS_PER_LINE = 25;
                        let wrapLines = 0;
                        for (const line of bodyLines) {
                            wrapLines += Math.max(1, Math.ceil(line.length / CHARS_PER_LINE));
                        }
                        totalHeight += (wrapLines + 2) * ITEM_HEIGHT;
                    } else if (key === 'constraints' && typeof item === 'object' && item.body) {
                        const rawBody = (item.body || '');
                        const cleanBody = rawBody.replace(/\r\n/g, '\n').replace(/\t+/g, '    ');
                        const bodyLines = cleanBody.split('\n').map(l => l.trim()).filter(Boolean);
                        itemHtml = bodyLines.map(l => escapeHtml(l)).join('<br/>');
                        const CHARS_PER_LINE2 = 25;
                        let wrapLines2 = 0;
                        for (const line of bodyLines) {
                            wrapLines2 += Math.max(1, Math.ceil(line.length / CHARS_PER_LINE2));
                        }
                        totalHeight += wrapLines2 * ITEM_HEIGHT;
                    } else {
                        itemHtml = escapeHtml(item.body || item.name || '');
                        const lines = (itemHtml.match(/\n/g) || []).length + 1;
                        totalHeight += lines * ITEM_HEIGHT;
                    }
                } else {
                    const displayText = (typeof item === 'object' && item.label)
                        ? item.label
                        : formatCompartmentItem(item);
                    itemHtml = escapeHtml(displayText);
                    totalHeight += ITEM_HEIGHT;
                }

                const style = (key === 'doc' || key === 'constraints')
                    ? 'word-wrap:break-word;overflow-wrap:break-word;max-width:100%;box-sizing:border-box;'
                    : 'word-wrap:break-word;overflow-wrap:break-word;word-break:break-all;max-width:100%;box-sizing:border-box;';
                html += '<div style="' + style + '">' + itemHtml + '</div>';
            }

            html += '</div>';

            if (i === lastRenderIndex && showSeparator) {
                html += '<hr style="margin:4px 0;border:none;border-top:1px solid #888;">';
                totalHeight += HR_HEIGHT;
            }
        }

        return { html, height: totalHeight };
    }

    // Export
    ns.MxGraph.compartmentHtml.escapeHtml = escapeHtml;
    ns.MxGraph.compartmentHtml.formatCompartmentItem = formatCompartmentItem;
    ns.MxGraph.compartmentHtml.buildCompartmentHtml = buildCompartmentHtml;

    console.log('[MxCompartmentHtml] 모듈 로드 완료');
})();
