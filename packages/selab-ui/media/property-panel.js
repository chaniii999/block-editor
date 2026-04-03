// Copyright: SELab.AI (c) 2026

(function () {
    'use strict';

    function toTitleCase(value) {
        return String(value || '')
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/[_\-]+/g, ' ')
            .trim()
            .replace(/\b\w/g, (match) => match.toUpperCase());
    }

    function normalizeText(value) {
        if (value === undefined || value === null) {
            return '';
        }
        if (typeof value === 'string') {
            return value.trim();
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        return '';
    }

    function isRenderableValue(value) {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (typeof value === 'number' || typeof value === 'boolean') return true;
        return false;
    }

    function createElement(tagName, className, textContent) {
        const element = document.createElement(tagName);
        if (className) {
            element.className = className;
        }
        if (textContent !== undefined) {
            element.textContent = textContent;
        }
        return element;
    }

    function createGridRow(label, value) {
        const labelElement = createElement('div', 'selab-property-panel__label', label);
        const valueElement = createElement('div', 'selab-property-panel__value', value);
        return [labelElement, valueElement];
    }

    function appendGridSection(container, title, entries) {
        const validEntries = entries.filter((entry) => isRenderableValue(entry?.value));
        if (validEntries.length === 0) {
            return;
        }
        const section = createElement('section', 'selab-property-panel__section');
        section.appendChild(createElement('div', 'selab-property-panel__section-title', title));
        const grid = createElement('div', 'selab-property-panel__grid');
        validEntries.forEach((entry) => {
            const pair = createGridRow(entry.label, normalizeText(entry.value));
            grid.appendChild(pair[0]);
            grid.appendChild(pair[1]);
        });
        section.appendChild(grid);
        container.appendChild(section);
    }

    function appendPillSection(container, title, items) {
        const values = Array.isArray(items) ? items.map((item) => normalizeText(item)).filter(Boolean) : [];
        if (values.length === 0) {
            return;
        }
        const section = createElement('section', 'selab-property-panel__section');
        section.appendChild(createElement('div', 'selab-property-panel__section-title', title));
        const list = createElement('div', 'selab-property-panel__pill-list');
        values.forEach((value) => {
            list.appendChild(createElement('span', 'selab-property-panel__pill', value));
        });
        section.appendChild(list);
        container.appendChild(section);
    }

    function appendCompartmentSection(container, compartments) {
        const validCompartments = Array.isArray(compartments)
            ? compartments.filter((compartment) => compartment && Array.isArray(compartment.items) && compartment.items.length > 0)
            : [];
        if (validCompartments.length === 0) {
            return;
        }
        const section = createElement('section', 'selab-property-panel__section');
        section.appendChild(createElement('div', 'selab-property-panel__section-title', 'Compartments'));
        const list = createElement('div', 'selab-property-panel__list');

        validCompartments.forEach((compartment) => {
            const card = createElement('div', 'selab-property-panel__card');
            card.appendChild(createElement('div', 'selab-property-panel__card-title', toTitleCase(compartment.key || 'Items')));
            const items = createElement('div', 'selab-property-panel__list');
            compartment.items.forEach((item) => {
                const itemName = normalizeText(item?.declaredName) || normalizeText(item?.name) || normalizeText(item?.label);
                const itemType = normalizeText(item?.declaredType) || normalizeText(item?.type);
                const itemMeta = [itemType, normalizeText(item?.direction)].filter(Boolean).join(' · ');
                const itemCard = createElement('div', 'selab-property-panel__card');
                itemCard.appendChild(createElement('div', 'selab-property-panel__card-title', itemName || 'Unnamed'));
                if (itemMeta) {
                    itemCard.appendChild(createElement('div', 'selab-property-panel__card-meta', itemMeta));
                }
                if (normalizeText(item?.label) && normalizeText(item?.label) !== itemName) {
                    itemCard.appendChild(createElement('div', 'selab-property-panel__card-meta', normalizeText(item.label)));
                }
                items.appendChild(itemCard);
            });
            card.appendChild(items);
            list.appendChild(card);
        });

        section.appendChild(list);
        container.appendChild(section);
    }

    function buildHeaderTitle(data) {
        const name = normalizeText(data?.declaredName) || normalizeText(data?.name) || 'No selection';
        const kind = normalizeText(data?.type) || normalizeText(data?.kind);
        return {
            title: name,
            subtitle: kind ? toTitleCase(kind) : '',
        };
    }

    function renderEmptyState(root, message) {
        root.innerHTML = '';
        root.appendChild(createElement('div', 'selab-property-panel__empty', message));
    }

    function clampWidth(value, minWidth, maxWidth) {
        return Math.min(Math.max(value, minWidth), maxWidth);
    }

    function isDuplicateValue(left, right) {
        const normalizedLeft = normalizeText(left).toLowerCase();
        const normalizedRight = normalizeText(right).toLowerCase();
        return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
    }

    function createPanel(config) {
        const mount = typeof config?.mount === 'string' ? document.querySelector(config.mount) : config?.mount;
        if (!mount || typeof mount.appendChild !== 'function') {
            throw new Error('[SelabPropertyPanel] Invalid mount target');
        }

        const minWidth = Number.isFinite(config?.minWidth) ? Number(config.minWidth) : 280;
        const maxWidth = Number.isFinite(config?.maxWidth) ? Number(config.maxWidth) : 720;
        const initialWidth = Number.isFinite(config?.initialWidth) ? Number(config.initialWidth) : undefined;

        mount.innerHTML = '';
        if (initialWidth) {
            mount.style.width = `${clampWidth(initialWidth, minWidth, maxWidth)}px`;
            mount.style.flex = '0 0 auto';
        }

        const root = createElement('section', 'selab-property-panel');
        const resizeHandle = createElement('div', 'selab-property-panel__resize-handle');
        const header = createElement('header', 'selab-property-panel__header');
        const titleElement = createElement('div', 'selab-property-panel__title', 'Properties');
        const subtitleElement = createElement('div', 'selab-property-panel__subtitle', 'Select an element to inspect its properties');
        const body = createElement('div', 'selab-property-panel__body');

        const resizeState = {
            pointerId: null,
            startX: 0,
            startWidth: 0,
            active: false,
        };

        function ensureMountWidth() {
            const mountWidth = mount.getBoundingClientRect().width;
            const nextWidth = clampWidth(Math.round(mountWidth || initialWidth || minWidth), minWidth, maxWidth);
            mount.style.width = `${nextWidth}px`;
            mount.style.minWidth = `${minWidth}px`;
            mount.style.maxWidth = `${maxWidth}px`;
            mount.style.flex = '0 0 auto';
        }

        function finishResize() {
            if (!resizeState.active) return;
            resizeState.active = false;
            resizeState.pointerId = null;
            root.classList.remove('selab-property-panel--resizing');
            document.body.classList.remove('selab-property-panel--resizing');
        }

        function handleResizeMove(event) {
            if (!resizeState.active || event.pointerId !== resizeState.pointerId) return;
            const deltaX = resizeState.startX - event.clientX;
            const nextWidth = clampWidth(Math.round(resizeState.startWidth + deltaX), minWidth, maxWidth);
            mount.style.width = `${nextWidth}px`;
            mount.style.flex = '0 0 auto';
            event.preventDefault();
        }

        function handleResizeEnd(event) {
            if (!resizeState.active || event.pointerId !== resizeState.pointerId) return;
            try {
                resizeHandle.releasePointerCapture(event.pointerId);
            } catch {}
            finishResize();
        }

        function handleResizeStart(event) {
            if (event.button !== 0) return;
            ensureMountWidth();
            resizeState.pointerId = event.pointerId;
            resizeState.startX = event.clientX;
            resizeState.startWidth = mount.getBoundingClientRect().width || minWidth;
            resizeState.active = true;
            root.classList.add('selab-property-panel--resizing');
            document.body.classList.add('selab-property-panel--resizing');
            resizeHandle.setPointerCapture(event.pointerId);
            event.preventDefault();
        }

        root.appendChild(resizeHandle);
        header.appendChild(titleElement);
        header.appendChild(subtitleElement);
        root.appendChild(header);
        root.appendChild(body);
        mount.appendChild(root);

        ensureMountWidth();
        resizeHandle.addEventListener('pointerdown', handleResizeStart);
        resizeHandle.addEventListener('pointermove', handleResizeMove);
        resizeHandle.addEventListener('pointerup', handleResizeEnd);
        resizeHandle.addEventListener('pointercancel', handleResizeEnd);

        const api = {
            el: root,
            render(data) {
                if (!data) {
                    titleElement.textContent = 'Properties';
                    subtitleElement.textContent = 'Select an element to inspect its properties';
                    renderEmptyState(body, 'Select an element in the diagram to view its properties.');
                    return api;
                }

                const headerData = buildHeaderTitle(data);
                titleElement.textContent = headerData.title;
                subtitleElement.textContent = headerData.subtitle || normalizeText(data?.qualifiedName) || '';
                body.innerHTML = '';

                const overviewName = normalizeText(data?.name);
                const overviewDeclared = normalizeText(data?.declaredName);
                const overviewKind = toTitleCase(normalizeText(data?.kind));
                const overviewType = toTitleCase(normalizeText(data?.type));

                appendGridSection(body, 'Overview', [
                    { label: 'Name', value: overviewName },
                    { label: 'Declared', value: isDuplicateValue(overviewDeclared, overviewName) ? '' : overviewDeclared },
                    { label: 'Kind', value: overviewKind },
                    { label: 'Type', value: isDuplicateValue(overviewType, overviewKind) ? '' : overviewType },
                    { label: 'Qualified', value: normalizeText(data?.qualifiedName) || normalizeText(data?.id) },
                    { label: 'Element ID', value: normalizeText(data?.elementId) },
                    { label: 'Declared Type', value: normalizeText(data?.declaredType) },
                    { label: 'Direction', value: normalizeText(data?.direction) },
                    { label: 'Label', value: normalizeText(data?.label) },
                ]);

                if (data?.range?.start || data?.range?.end || normalizeText(data?.docUri) || normalizeText(data?.uri)) {
                    const start = data?.range?.start;
                    const end = data?.range?.end;
                    appendGridSection(body, 'Location', [
                        { label: 'Document', value: normalizeText(data?.docUri) || normalizeText(data?.uri) },
                        { label: 'Start', value: start ? `${Number(start.line) + 1}:${Number(start.character) + 1}` : '' },
                        { label: 'End', value: end ? `${Number(end.line) + 1}:${Number(end.character) + 1}` : '' },
                    ]);
                }

                appendPillSection(body, 'Specialization Targets', data?.specializationTargets);
                appendCompartmentSection(body, data?.compartments);
                return api;
            },
            clear() {
                return api.render(null);
            },
            setWidth(width) {
                const nextWidth = clampWidth(Number(width) || minWidth, minWidth, maxWidth);
                mount.style.width = `${nextWidth}px`;
                mount.style.flex = '0 0 auto';
                return api;
            },
            destroy() {
                finishResize();
                resizeHandle.removeEventListener('pointerdown', handleResizeStart);
                resizeHandle.removeEventListener('pointermove', handleResizeMove);
                resizeHandle.removeEventListener('pointerup', handleResizeEnd);
                resizeHandle.removeEventListener('pointercancel', handleResizeEnd);
                root.remove();
            },
        };

        api.clear();
        return api;
    }

    window.SelabPropertyPanel = { createPanel };
})();
