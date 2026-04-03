/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxContextMenuUtils.js - 컨텍스트 메뉴 유틸리티 함수
 *
 * MxContextMenu.js에서 분리된 유틸리티 모듈:
 * - 히스토리 관리
 * - ninja-keys 데이터 빌드
 * - 타입별 섹션 생성
 * - 셀 해석 유틸리티
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.contextMenuUtils = ns.MxGraph.contextMenuUtils || {};

    const LOG_PREFIX = '[MxContextMenuUtils]';
    function log(...args) {
        try { console.log(LOG_PREFIX, ...args); } catch (_) {}
    }

    // 데이터 모듈 참조 (로드 순서 보장 필요)
    function getData() {
        return ns.MxGraph.contextMenuData || {};
    }

    // ── 히스토리 관리 ──

    var _history = [];
    var HISTORY_MAX = 6;

    function pushHistory(action) {
        const ICONS = getData().ICONS || {};
        var key = (action._type || '') + '|' + (action._compartment || '');
        _history = _history.filter(function (h) { return h._historyKey !== key; });
        _history.unshift({
            id: 'history-' + key,
            title: action.title,
            icon: action.icon || ICONS.item,
            section: 'History',
            keywords: action.keywords || '',
            _type: action._type || '',
            _compartment: action._compartment || null,
            _historyKey: key,
        });
        _history = _history.slice(0, HISTORY_MAX);
    }

    function buildHistoryData() {
        return _history.map(function (h) {
            return {
                id: h.id,
                title: h.title,
                icon: h.icon,
                section: 'History',
                keywords: h.keywords,
                _type: h._type,
                _compartment: h._compartment,
            };
        });
    }

    function buildFullData(sections) {
        var historyData = buildHistoryData();
        var sectionData = buildNinjaDataFromSections(sections);
        return historyData.concat(sectionData);
    }

    function buildNinjaDataFromSections(sections) {
        const ICONS = getData().ICONS || {};
        var data = [];
        sections.forEach(function (section) {
            var sectionId = 'section-' + section.key;
            data.push({
                id: sectionId,
                title: section.label,
                icon: section.icon || '',
                section: 'Add Element',
                children: section.items.map(function (item) { return sectionId + '/' + item.key; }),
            });
            section.items.forEach(function (item) {
                data.push({
                    id: sectionId + '/' + item.key,
                    title: item.label,
                    icon: ICONS.item,
                    section: section.label,
                    parent: sectionId,
                    keywords: item.key,
                    _type: item.type || item.key,
                    _compartment: item.compartment || null,
                    _nameOverride: item.nameOverride || null,
                });
            });
        });
        return data;
    }

    // ── 타입별 동적 섹션 생성 ──

    function getAllowedCompartments(nodeType) {
        const data = getData();
        const COMPARTMENT_RULES = data.COMPARTMENT_RULES || {};
        const TYPE_INHERITANCE = data.TYPE_INHERITANCE || {};

        if (COMPARTMENT_RULES[nodeType]) {
            return COMPARTMENT_RULES[nodeType];
        }
        var parent = TYPE_INHERITANCE[nodeType];
        if (parent) {
            return getAllowedCompartments(parent);
        }
        return [];
    }

    function buildSectionsForNodeType(nodeType) {
        const data = getData();
        const COMPARTMENT_RULES = data.COMPARTMENT_RULES || {};
        const COMPARTMENT_CHILD_TYPES = data.COMPARTMENT_CHILD_TYPES || {};
        const COMPARTMENT_TO_SECTION = data.COMPARTMENT_TO_SECTION || {};
        const SECTION_ICONS = data.SECTION_ICONS || {};
        const NODE_EXTRA_TOOLS = data.NODE_EXTRA_TOOLS || {};

        var compartments = getAllowedCompartments(nodeType);
        var extraTools = NODE_EXTRA_TOOLS[nodeType] || {};
        var hasCompartments = compartments && compartments.length > 0;
        var hasExtras = Object.keys(extraTools).length > 0;

        if (!hasCompartments && !hasExtras) {
            return null;
        }

        var sectionMap = {};

        // 1) compartment 기반 항목
        compartments.forEach(function (compartment) {
            var sectionName = COMPARTMENT_TO_SECTION[compartment];
            if (!sectionName) return;

            var childItems = COMPARTMENT_CHILD_TYPES[compartment];
            if (!childItems || childItems.length === 0) return;

            if (!sectionMap[sectionName]) {
                sectionMap[sectionName] = [];
            }

            childItems.forEach(function (child) {
                var alreadyAdded = sectionMap[sectionName].some(function (i) { return i.label === child.label; });
                if (!alreadyAdded) {
                    sectionMap[sectionName].push({
                        key: child.type + '-' + compartment,
                        label: child.label,
                        type: child.type,
                        compartment: compartment,
                    });
                }
            });
        });

        // 2) NODE_EXTRA_TOOLS 항목 추가
        Object.keys(extraTools).forEach(function (sectionName) {
            if (!sectionMap[sectionName]) {
                sectionMap[sectionName] = [];
            }
            extraTools[sectionName].forEach(function (tool) {
                var alreadyAdded = sectionMap[sectionName].some(function (i) { return i.label === tool.label; });
                if (!alreadyAdded) {
                    sectionMap[sectionName].push({
                        key: tool.type + '-extra',
                        label: tool.label,
                        type: tool.type,
                        compartment: tool.compartment || null,
                        nameOverride: tool.nameOverride || null,
                    });
                }
            });
        });

        // 섹션 순서 고정
        var orderedSectionNames = ['Structure', 'Behavior', 'Requirements'];
        var sections = [];
        orderedSectionNames.forEach(function (name) {
            if (sectionMap[name] && sectionMap[name].length > 0) {
                var sortedItems = sectionMap[name].slice().sort(function (a, b) {
                    return a.label.localeCompare(b.label);
                });
                sections.push({
                    key: name.toLowerCase(),
                    label: name,
                    icon: SECTION_ICONS[name] || '',
                    items: sortedItems,
                });
            }
        });

        return sections.length > 0 ? sections : null;
    }

    // ── 타입 정규화 ──

    function normalizeCellType(rawType) {
        const data = getData();
        const COMPARTMENT_RULES = data.COMPARTMENT_RULES || {};
        const LOWERCASE_TO_PASCALCASE = data.LOWERCASE_TO_PASCALCASE || {};

        if (!rawType) return '';
        if (COMPARTMENT_RULES[rawType]) return rawType;
        var key = rawType.toLowerCase().replace(/\s+/g, '');
        return LOWERCASE_TO_PASCALCASE[key] || rawType;
    }

    // ── 이름 생성 유틸 ──

    function typeToBaseName(type) {
        var s = String(type || '').toLowerCase();
        var cleaned = s.replace(/\s+def\b/, '');
        var parts = cleaned.split(/\s+/).filter(Boolean);
        var camel = parts.map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join('');
        return camel || 'Element';
    }

    // ── 셀 해석 유틸리티 ──

    function resolvePopupNodeCell(graph, me) {
        var point = getPopupViewPoint(graph, me);
        if (point) {
            var hitCell = getVertexCellAtPoint(graph, point.x, point.y);
            var resolvedHitCell = normalizeNodeCell(graph, hitCell);
            if (resolvedHitCell) {
                return resolvedHitCell;
            }
        }
        var domCell = null;
        try { domCell = typeof me.getCell === 'function' ? me.getCell() : null; } catch (_) {}
        return normalizeNodeCell(graph, domCell);
    }

    function getPopupViewPoint(graph, me) {
        if (!graph || !me) return null;

        try {
            var event = typeof me.getEvent === 'function' ? me.getEvent() : null;
            if (event && graph.container) {
                var clientX = mxEvent.getClientX(event);
                var clientY = mxEvent.getClientY(event);
                var pt = mxUtils.convertPoint(graph.container, clientX, clientY);
                if (pt && pt.x != null && pt.y != null) {
                    return { x: pt.x, y: pt.y };
                }
            }
        } catch (_) {}

        try {
            var gx = typeof me.getGraphX === 'function' ? me.getGraphX() : me.graphX;
            var gy = typeof me.getGraphY === 'function' ? me.getGraphY() : me.graphY;
            if (gx != null && gy != null && graph.view) {
                var scale = Number(graph.view.scale) || 1;
                var tr = graph.view.translate || { x: 0, y: 0 };
                return { x: (gx + tr.x) * scale, y: (gy + tr.y) * scale };
            }
        } catch (_) {}

        return null;
    }

    function getVertexCellAtPoint(graph, x, y) {
        if (!graph || typeof graph.getCellAt !== 'function' || x == null || y == null) {
            return null;
        }

        try {
            var model = graph.getModel();
            var defaultParent = graph.getDefaultParent();
            var view = graph.getView();
            
            var bestCell = null;
            var bestDepth = -1;
            var bestArea = Infinity;

            function traverse(cell, depth) {
                if (!cell) return;
                
                if (cell !== defaultParent && cell !== model.getRoot() && model.isVertex(cell)) {
                    var state = view.getState(cell);
                    if (state) {
                        var isIgnored = !!(typeof cell.style === 'string' && cell.style.indexOf('selectable=0') >= 0);
                        if (!isIgnored) {
                            var x0 = state.x;
                            var y0 = state.y;
                            var w = state.width;
                            var h = state.height;
                            
                            if (x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h) {
                                var area = w * h;
                                if (depth > bestDepth || (depth === bestDepth && area < bestArea)) {
                                    bestCell = cell;
                                    bestDepth = depth;
                                    bestArea = area;
                                }
                            }
                        }
                    }
                }
                
                var childCount = model.getChildCount(cell);
                for (var i = 0; i < childCount; i++) {
                    traverse(model.getChildAt(cell, i), depth + 1);
                }
            }
            
            traverse(defaultParent, 0);
            if (bestCell) {
                return bestCell;
            }
        } catch (_) {}

        var ignoreFn = function (state) {
            var cell = state && state.cell;
            return !!(cell && typeof cell.style === 'string' && cell.style.indexOf('selectable=0') >= 0);
        };

        try {
            return graph.getCellAt(x, y, null, true, false, ignoreFn);
        } catch (_) {}

        try {
            return graph.getCellAt(x, y, null, null, null, ignoreFn);
        } catch (_) {}

        try {
            return graph.getCellAt(x, y);
        } catch (_) {}

        return null;
    }

    function normalizeNodeCell(graph, cell) {
        if (!graph || !cell) return null;

        var current = cell;
        var model = null;

        try {
            model = typeof graph.getModel === 'function' ? graph.getModel() : null;
        } catch (_) {}

        while (current) {
            var isEdge = false;
            try {
                isEdge = !!(model && typeof model.isEdge === 'function' && model.isEdge(current));
            } catch (_) {}

            var isNonSelectableUI = !!(typeof current.style === 'string' && current.style.indexOf('selectable=0') >= 0);
            if (current._isCompartmentItem || isNonSelectableUI) {
                current = current.parent || null;
                continue;
            }

            if (current._nodeData && !isEdge) {
                return current;
            }

            current = current.parent || null;
        }

        return null;
    }

    // Export
    ns.MxGraph.contextMenuUtils.pushHistory = pushHistory;
    ns.MxGraph.contextMenuUtils.buildHistoryData = buildHistoryData;
    ns.MxGraph.contextMenuUtils.buildFullData = buildFullData;
    ns.MxGraph.contextMenuUtils.buildNinjaDataFromSections = buildNinjaDataFromSections;
    ns.MxGraph.contextMenuUtils.getAllowedCompartments = getAllowedCompartments;
    ns.MxGraph.contextMenuUtils.buildSectionsForNodeType = buildSectionsForNodeType;
    ns.MxGraph.contextMenuUtils.normalizeCellType = normalizeCellType;
    ns.MxGraph.contextMenuUtils.typeToBaseName = typeToBaseName;
    ns.MxGraph.contextMenuUtils.resolvePopupNodeCell = resolvePopupNodeCell;
    ns.MxGraph.contextMenuUtils.getPopupViewPoint = getPopupViewPoint;
    ns.MxGraph.contextMenuUtils.getVertexCellAtPoint = getVertexCellAtPoint;
    ns.MxGraph.contextMenuUtils.normalizeNodeCell = normalizeNodeCell;

    console.log('[MxContextMenuUtils] 모듈 로드 완료');
})();
