// Copyright: SELab.AI (c) 2026

(function () {
    'use strict';

    function resolveToolbarMountTarget(mount) {
        if (!mount) return document.body;
        if (typeof mount === 'string') {
            return document.querySelector(mount) || document.body;
        }
        if (mount && typeof mount.appendChild === 'function') {
            return mount;
        }
        return document.body;
    }

    function normalizeToolbarItems(config) {
        if (Array.isArray(config.items)) return config.items;
        if (!Array.isArray(config.sections)) return [];

        const items = [];
        config.sections.forEach((section, index) => {
            const sectionItems = Array.isArray(section?.items) ? section.items.filter(Boolean) : [];
            if (sectionItems.length === 0) return;
            if (items.length > 0 && index > 0) {
                items.push({ type: 'separator' });
            }
            items.push(...sectionItems);
        });
        return items;
    }

    /**
     * SELab 공통 툴바 팩토리.
     *
     * @param {object} config
     * @param {string|HTMLElement} [config.mount]
     * @param {'top-right'|'top-left'|'bottom-center'} config.position
     * @param {Array<ToolbarItem>} config.items
     * @returns {SelabToolbar}
     *
     * ToolbarItem:
     *   { type: 'button',         id, label, title?, active? }
     *   { type: 'segment-group',  id, options: [{value, label, title?}], active? }
     *   { type: 'separator' }
     *   { type: 'label',          id, text }
     */
    function createToolbar(config) {
        const position = config.position || 'top-right';
        const items = normalizeToolbarItems(config);
        const mountTarget = resolveToolbarMountTarget(config.mount);

        const root = document.createElement('div');
        root.className = `selab-toolbar selab-toolbar--${position}`;

        // id → DOM 요소 매핑
        const elementMap = new Map();
        // id → 클릭 핸들러 목록
        const handlerMap = new Map();
        // segment-group id → 현재 활성 value
        const segmentActiveMap = new Map();

        const fireHandlers = (id, value) => {
            const handlers = handlerMap.get(id) || [];
            for (const fn of handlers) {
                try {
                    fn(value);
                } catch (e) {}
            }
        };

        for (const item of items) {
            const type = item.type || 'button';

            if (type === 'separator') {
                const sep = document.createElement('div');
                sep.className = 'selab-toolbar__separator';
                root.appendChild(sep);
                continue;
            }

            if (type === 'label') {
                const lbl = document.createElement('span');
                lbl.className = 'selab-toolbar__label';
                lbl.textContent = item.text || '';
                if (item.id) {
                    lbl.dataset.id = item.id;
                    elementMap.set(item.id, lbl);
                }
                root.appendChild(lbl);
                continue;
            }

            if (type === 'segment-group') {
                const group = document.createElement('div');
                group.className = 'selab-toolbar__segment-group';
                if (item.id) group.dataset.id = item.id;

                const options = Array.isArray(item.options) ? item.options : [];
                let activeValue = item.active || (options[0] && options[0].value);
                segmentActiveMap.set(item.id, activeValue);

                for (const opt of options) {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'selab-toolbar__btn';
                    btn.textContent = opt.label || opt.value;
                    if (opt.title) btn.title = opt.title;
                    btn.dataset.value = opt.value;
                    if (opt.value === activeValue) btn.classList.add('selab-toolbar__btn--active');

                    btn.addEventListener('click', () => {
                        const prev = segmentActiveMap.get(item.id);
                        if (prev === opt.value) return;
                        // 이전 활성 버튼 해제
                        group.querySelectorAll('.selab-toolbar__btn--active').forEach((b) => b.classList.remove('selab-toolbar__btn--active'));
                        btn.classList.add('selab-toolbar__btn--active');
                        segmentActiveMap.set(item.id, opt.value);
                        fireHandlers(item.id, opt.value);
                    });

                    group.appendChild(btn);
                }

                if (item.id) elementMap.set(item.id, group);
                root.appendChild(group);
                continue;
            }

            if (type === 'select') {
                const select = document.createElement('select');
                select.className = 'selab-toolbar__select';
                if (item.title) select.title = item.title;
                if (item.id) {
                    select.id = item.id;
                    select.dataset.id = item.id;
                    elementMap.set(item.id, select);
                }

                const options = Array.isArray(item.options) ? item.options : [];
                options.forEach((opt) => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label || opt.value;
                    if (opt.title) option.title = opt.title;
                    if (opt.value === item.value) option.selected = true;
                    select.appendChild(option);
                });

                select.addEventListener('change', () => {
                    fireHandlers(item.id, select.value);
                });

                root.appendChild(select);
                continue;
            }

            // 기본: button
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'selab-toolbar__btn';
            if (item.icon) {
                btn.innerHTML = item.icon;
            } else {
                btn.textContent = item.label || '';
            }
            if (item.title) btn.title = item.title;
            else if (item.icon && item.label) btn.title = item.label;
            if (item.id) {
                btn.id = item.id;
                btn.dataset.id = item.id;
                elementMap.set(item.id, btn);
            }
            if (item.active) btn.classList.add('selab-toolbar__btn--active');

            btn.addEventListener('click', () => {
                fireHandlers(item.id, item.label || '');
            });

            root.appendChild(btn);
        }

        mountTarget.appendChild(root);

        /** 공개 API */
        const toolbar = {
            el: root,

            /** 버튼/세그먼트 클릭 핸들러 등록 */
            on(id, handler) {
                if (!handlerMap.has(id)) handlerMap.set(id, []);
                handlerMap.get(id).push(handler);
                return toolbar;
            },

            /** 버튼 라벨 또는 레이블 텍스트 변경 */
            setLabel(id, text) {
                const el = elementMap.get(id);
                if (el) el.textContent = text;
                return toolbar;
            },

            setValue(id, value) {
                const el = elementMap.get(id);
                if (!el) return toolbar;
                if (el.tagName === 'SELECT') el.value = value;
                return toolbar;
            },

            getValue(id) {
                const el = elementMap.get(id);
                if (!el) return null;
                if (el.tagName === 'SELECT') return el.value;
                return null;
            },

            /** 버튼 active 클래스 토글 */
            setActive(id, active) {
                const el = elementMap.get(id);
                if (!el) return toolbar;
                if (active) el.classList.add('selab-toolbar__btn--active');
                else el.classList.remove('selab-toolbar__btn--active');
                return toolbar;
            },

            /** 버튼 비활성화 */
            setDisabled(id, disabled) {
                const el = elementMap.get(id);
                if (el && el.tagName === 'BUTTON') el.disabled = disabled;
                return toolbar;
            },

            /** 세그먼트 그룹의 활성 값을 프로그래매틱으로 변경 (이벤트 미발생) */
            setSegmentActive(groupId, value) {
                const group = elementMap.get(groupId);
                if (!group) return toolbar;
                group.querySelectorAll('.selab-toolbar__btn').forEach((btn) => {
                    if (btn.dataset.value === value) btn.classList.add('selab-toolbar__btn--active');
                    else btn.classList.remove('selab-toolbar__btn--active');
                });
                segmentActiveMap.set(groupId, value);
                return toolbar;
            },

            /** 세그먼트 그룹의 현재 활성 값 반환 */
            getSegmentActive(groupId) {
                return segmentActiveMap.get(groupId) ?? null;
            },

            /** 툴바 DOM 제거 */
            destroy() {
                root.remove();
            },
        };

        return toolbar;
    }

    window.SelabToolbar = { createToolbar };
})();
