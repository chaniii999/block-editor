/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * EdgeTypeMenu.js - edge-tool selection context menu
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};

    let _menuEl = null;
    let _keyHandler = null;
    let _outsideClickHandler = null;

    function _close() {
        if (_menuEl) {
            try {
                _menuEl.remove();
            } catch (_) {}
            _menuEl = null;
        }
        if (_keyHandler) {
            document.removeEventListener('keydown', _keyHandler, true);
            _keyHandler = null;
        }
        if (_outsideClickHandler) {
            document.removeEventListener('pointerdown', _outsideClickHandler, true);
            document.removeEventListener('mousedown', _outsideClickHandler, true);
            _outsideClickHandler = null;
        }
    }

    function _createEdgeIconSvg(edgeType) {
        let pathObj = '';
        let marker = '';

        switch (edgeType) {
            case 'specialization':
                pathObj = '<path d="M 0,8 L 10,8" stroke="currentColor" stroke-width="1.2"/>';
                marker = '<polygon points="10,4 16,8 10,12" fill="#fff" stroke="currentColor" stroke-width="1.2"/>';
                break;
            case 'composition':
                pathObj = '<path d="M 8,8 L 16,8" stroke="currentColor" stroke-width="1.2"/>';
                marker = '<polygon points="0,8 4,4 8,8 4,12" fill="currentColor" stroke="currentColor" stroke-width="1.2"/>';
                break;
            case 'dependency':
            case 'allocation':
            case 'redefinition':
            case 'subsetting':
                pathObj = '<path d="M 0,8 L 11,8" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3,3"/>';
                marker = '<path d="M 10,4 L 15,8 L 10,12" fill="none" stroke="currentColor" stroke-width="1.2"/>';
                break;
            case 'featuretyping':
                pathObj = '<path d="M 0,8 L 10,8" stroke="currentColor" stroke-width="1.2"/>';
                marker = '<path d="M 10,4 L 15,8 L 10,12 Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="6" r="1" fill="currentColor"/><circle cx="7" cy="10" r="1" fill="currentColor"/>';
                break;
            case 'succession':
            default:
                pathObj = '<path d="M 0,8 L 11,8" stroke="currentColor" stroke-width="1.2"/>';
                marker = '<path d="M 10,4 L 15,8 L 10,12" fill="none" stroke="currentColor" stroke-width="1.2"/>';
                break;
        }

        return `<svg width="18" height="16" viewBox="0 0 16 16" style="margin-right: 8px; flex-shrink: 0; display: inline-block; vertical-align: middle;">
            ${pathObj}
            ${marker}
        </svg>`;
    }

    /**
     * Show edge-tool context menu.
     * @param {Object} opts
     * @param {number} opts.x
     * @param {number} opts.y
     * @param {string} opts.sourceKind
     * @param {string} opts.targetKind
     * @param {Function} opts.onSelect - callback (selectedItem)
     * @param {Function} opts.onCancel
     */
    function show({ x = 300, y = 300, sourceKind, targetKind, onSelect, onCancel } = {}) {
        if (_menuEl) _close();

        const mapping = ns.MxGraph.edgeTypeMapping;
        const items = mapping
            ? mapping.getAvailableEdgeTypes(sourceKind, targetKind)
            : [{ id: 'new_dependency', type: 'new_dependency', edgeType: 'dependency', label: 'New Dependency', drawTemporaryEdge: true }];

        // 에지 타입이 1개면 메뉴 없이 바로 연결
        if (items.length === 1) {
            try { onSelect?.(items[0]); } catch (_) {}
            return;
        }

        const menu = document.createElement('div');
        menu.id = 'selab-edge-type-menu';
        Object.assign(menu.style, {
            position: 'fixed',
            zIndex: '99999',
            background: '#ffffff',
            border: '1px solid #cccccc',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            padding: '4px 0',
            minWidth: '220px',
            fontFamily: 'sans-serif',
            fontSize: '13px',
            userSelect: 'none',
        });

        const header = document.createElement('div');
        Object.assign(header.style, {
            padding: '6px 12px 4px',
            color: '#666666',
            fontSize: '11px',
            borderBottom: '1px solid #eeeeee',
            marginBottom: '2px',
        });
        header.textContent = 'Select edge tool';
        menu.appendChild(header);

        items.forEach((tool) => {
            const item = document.createElement('div');
            Object.assign(item.style, {
                display: 'flex',
                alignItems: 'center',
                padding: '7px 16px',
                cursor: 'pointer',
                color: '#222222',
                transition: 'background 0.12s',
            });
            item.innerHTML = _createEdgeIconSvg(tool.edgeType) + `<span>${tool.label}</span>`;
            item.setAttribute('data-edge-tool-id', tool.id || tool.type || '');

            item.addEventListener('mouseenter', () => {
                item.style.background = '#e8f0fe';
                item.style.color = '#1a73e8';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = '';
                item.style.color = '#222222';
            });

            item.addEventListener('mousedown', (ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                _close();
                try {
                    onSelect?.(tool);
                } catch (_) {}
            });

            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        _menuEl = menu;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const mw = menu.offsetWidth || 220;
        const mh = menu.offsetHeight || items.length * 32 + 40;

        let left = x + 4;
        let top = y + 4;

        if (left + mw > vw - 8) left = Math.max(8, x - mw - 4);
        if (top + mh > vh - 8) top = Math.max(8, y - mh - 4);

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;

        _keyHandler = (ev) => {
            if (ev.key === 'Escape') {
                ev.stopPropagation();
                _close();
                try {
                    onCancel?.();
                } catch (_) {}
            }
        };
        document.addEventListener('keydown', _keyHandler, true);

        setTimeout(() => {
            _outsideClickHandler = (ev) => {
                if (_menuEl && !_menuEl.contains(ev.target)) {
                    _close();
                    try {
                        onCancel?.();
                    } catch (_) {}
                }
            };
            document.addEventListener('pointerdown', _outsideClickHandler, true);
            document.addEventListener('mousedown', _outsideClickHandler, true);
        }, 10);
    }

    ns.MxGraph.edgeTypeMenu = {
        show,
        close: _close,
    };

    console.log('[EdgeTypeMenu] module loaded');
})();
