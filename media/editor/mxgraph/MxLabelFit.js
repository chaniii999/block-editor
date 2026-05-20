/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxLabelFit.js — 노드 헤더 라벨(이름+연관 링크)과 접기 버튼 겹침 방지
 ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.labelFit = ns.MxGraph.labelFit || {};

    const ASSOC_LINK_RE = /<span class="selab-assoc-link"[\s\S]*?<\/span>\s*$/i;
    const STEREOTYPE_DIV_RE = /^(\s*<div[^>]*>[\s\S]*?<\/div>)/i;

    function getNodeLabelSettings() {
        return ns.Editor?.config?.displaySettings?.nodeLabel || {};
    }

    function getFoldReservePx() {
        const fold = ns.MxGraph.fold;
        if (fold?.getButtonReservePx) {
            return fold.getButtonReservePx();
        }
        const nl = getNodeLabelSettings();
        if (nl.foldButtonReservePx != null) {
            return nl.foldButtonReservePx;
        }
        const off = nl.foldOverlayOffsetX ?? 13;
        const size = nl.foldIconSize ?? 16;
        const gap = nl.foldGapPx ?? 4;
        return off + size + gap;
    }

    function getAssocLinkReservePx() {
        const nl = getNodeLabelSettings();
        if (nl.assocLinkReservePx != null) {
            return nl.assocLinkReservePx;
        }
        return (nl.assocLinkMarginPx ?? 5) + (nl.assocLinkIconPx ?? 14);
    }

    function measureText(text, font) {
        const utils = ns.Editor?.utils;
        if (utils?.measureTextWidth) {
            return utils.measureTextWidth(text, font);
        }
        const NP = ns.Editor?.config?.displaySettings?.nodePrecompute;
        const charW = NP?.charWidthEstimate ?? 7;
        return String(text || '').length * charW;
    }

    function stripHtml(html) {
        return String(html || '').replace(/<[^>]*>/g, '').replace(/\n/g, ' ').trim();
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function parseLabelParts(labelHtml) {
        const html = String(labelHtml || '');
        let assocSuffix = '';
        let body = html;
        const assocMatch = html.match(ASSOC_LINK_RE);
        if (assocMatch) {
            assocSuffix = assocMatch[0];
            body = html.slice(0, html.length - assocSuffix.length);
        }
        let prefix = '';
        const stereoMatch = body.match(STEREOTYPE_DIV_RE);
        if (stereoMatch) {
            prefix = stereoMatch[1];
            body = body.slice(prefix.length);
        }
        return { prefix, bodyHtml: body, assocSuffix, titlePlain: stripHtml(body) };
    }

    function truncateToWidth(plainText, maxWidthPx, font) {
        const text = plainText || '';
        if (maxWidthPx <= 0) {
            return '';
        }
        if (measureText(text, font) <= maxWidthPx) {
            return text;
        }
        const ell = '...';
        const ellW = measureText(ell, font);
        let lo = 0;
        let hi = text.length;
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            const slice = text.substring(0, mid);
            if (measureText(slice, font) + ellW <= maxWidthPx) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        }
        if (lo <= 0) {
            return ell;
        }
        return text.substring(0, lo) + ell;
    }

    /**
     * 이름(+연관 링크)에 쓸 수 있는 최대 폭(px)
     * @param {number} cellWidth
     * @param {{ hasFold?: boolean, hasAssocLink?: boolean, spacingLeft?: number, spacingRight?: number }} options
     */
    function computeAvailableTitleWidth(cellWidth, options) {
        const spacingLeft = options.spacingLeft ?? 8;
        const spacingRight = options.spacingRight ?? 8;
        let reservedRight = spacingRight;
        if (options.hasFold) {
            reservedRight += getFoldReservePx();
        }
        const available = Math.max(0, cellWidth - spacingLeft - reservedRight);
        const assocReserve = options.hasAssocLink ? getAssocLinkReservePx() : 0;
        return Math.max(0, available - assocReserve);
    }

    /**
     * HTML 라벨에서 이름만 잘라 접기 버튼·링크와 겹치지 않게 함
     */
    function fitLabelInNodeBox(labelHtml, cellWidth, options) {
        if (!labelHtml || !cellWidth || cellWidth < 40) {
            return labelHtml;
        }
        const maxTitle = computeAvailableTitleWidth(cellWidth, options);
        if (maxTitle <= 0) {
            return labelHtml;
        }

        const font = options.font || '13px sans-serif';
        const { prefix, bodyHtml, assocSuffix, titlePlain } = parseLabelParts(labelHtml);
        if (!titlePlain) {
            return labelHtml;
        }
        if (measureText(titlePlain, font) <= maxTitle) {
            return labelHtml;
        }

        const truncated = truncateToWidth(titlePlain, maxTitle, font);
        const escaped = escapeHtml(truncated).replace(/\n/g, '<br/>');
        const newBody = bodyHtml.includes('<') ? escaped : truncated;
        return prefix + newBody + assocSuffix;
    }

    function truncatePlainForCollapsed(plainText, cellWidth, options) {
        const maxTitle = computeAvailableTitleWidth(cellWidth, options);
        return truncateToWidth(plainText, maxTitle, options.font || '13px sans-serif');
    }

    ns.MxGraph.labelFit.fitLabelInNodeBox = fitLabelInNodeBox;
    ns.MxGraph.labelFit.truncatePlainForCollapsed = truncatePlainForCollapsed;
    ns.MxGraph.labelFit.computeAvailableTitleWidth = computeAvailableTitleWidth;
    ns.MxGraph.labelFit.getFoldReservePx = getFoldReservePx;
    ns.MxGraph.labelFit.getAssocLinkReservePx = getAssocLinkReservePx;
})();
