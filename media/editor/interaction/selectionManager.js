/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 선택 관리자 - 요소/연결 선택 상태 관리
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.interaction = ns.Editor.interaction || {};

    // 선택된 요소 ID 집합 (다중 선택 지원)
    const selectedIds = new Set();

    /**
     * 선택 상태 초기화
     */
    function clearSelection() {
        document.querySelectorAll('.diagram-element.selected').forEach((el) => el.classList.remove('selected'));
        document.querySelectorAll('.diagram-connection.selected').forEach((el) => el.classList.remove('selected'));
        selectedIds.clear();
    }

    /**
     * 요소 선택 추가
     * @param {string} id - 요소 ID
     */
    function addSelection(id) {
        selectedIds.add(id);
        const element = document.querySelector(`.diagram-element[data-id="${id}"]`);
        const connection = document.querySelector(`.diagram-connection[data-id="${id}"]`);
        if (element) element.classList.add('selected');
        if (connection) connection.classList.add('selected');
    }

    /**
     * 요소 선택 제거
     * @param {string} id - 요소 ID
     */
    function removeSelection(id) {
        selectedIds.delete(id);
        const element = document.querySelector(`.diagram-element[data-id="${id}"]`);
        const connection = document.querySelector(`.diagram-connection[data-id="${id}"]`);
        if (element) element.classList.remove('selected');
        if (connection) connection.classList.remove('selected');
    }

    /**
     * 요소가 선택되었는지 확인
     * @param {string} id - 요소 ID
     * @returns {boolean} 선택 여부
     */
    function isSelected(id) {
        return selectedIds.has(id);
    }

    /**
     * 현재 하나 이상의 요소가 선택되었는지 여부
     * @returns {boolean} 선택 존재 여부
     */
    function hasSelection() {
        return selectedIds.size > 0;
    }

    /**
     * 현재 선택된 요소의 ID를 반환 (첫 번째 선택된 요소)
     * @returns {string|null} 선택된 요소의 ID 또는 null
     */
    function getSelectedElementId() {
        return hasSelection() ? Array.from(selectedIds)[0] : null;
    }

    /**
     * 모든 선택된 요소 ID 반환
     * @returns {string[]} 선택된 요소 ID 배열
     */
    function getAllSelectedIds() {
        return Array.from(selectedIds);
    }

    /**
     * 선택된 요소 개수 반환
     * @returns {number} 선택된 요소 개수
     */
    function getSelectionCount() {
        return selectedIds.size;
    }

    /**
     * 선택 상태를 복원 (다이어그램 재렌더링 후 호출)
     */
    function restoreSelection() {
        if (selectedIds.size === 0) {
            return;
        }

        let restoredCount = 0;
        for (const id of selectedIds) {
            const element = document.querySelector(`.diagram-element[data-id="${id}"]`);
            const connection = document.querySelector(`.diagram-connection[data-id="${id}"]`);

            if (element) {
                element.classList.add('selected');
                restoredCount++;
            } else if (connection) {
                connection.classList.add('selected');
                restoredCount++;
            } else {
                console.warn('[selectionManager] Could not find element/connection for ID:', id);
            }
        }
    }

    /**
     * 클릭 이벤트 처리 - 요소/연결 선택
     * @param {MouseEvent} event - 클릭 이벤트
     * @param {Object} app - 앱 인스턴스
     */
    function handleClick(event, app) {
        const element = event.target.closest && event.target.closest('.diagram-element');
        const connection = event.target.closest && event.target.closest('.diagram-connection');
        const isMultiSelect = event.ctrlKey || event.metaKey;

        // Ctrl 키가 눌리지 않은 경우만 선택 해제
        if (!isMultiSelect) {
            clearSelection();
        }

        if (element) {
            const id = element.getAttribute('data-id');

            // 이미 선택된 요소를 Ctrl+클릭하면 선택 해제
            if (isMultiSelect && isSelected(id)) {
                removeSelection(id);
                
                // 마지막 선택된 요소를 속성 패널에 표시
                if (selectedIds.size > 0) {
                    const lastId = Array.from(selectedIds)[selectedIds.size - 1];
                    const lastNode = app.model.elements.find((e) => e.id === lastId);
                    if (lastNode) ns.Editor.attributes.render(app, lastNode);
                } else {
                    ns.Editor.attributes.render(app, null);
                }
            } else {
                addSelection(id);
                const node = app.model.elements.find((e) => e.id === id);
                if (node) ns.Editor.attributes.render(app, node);
            }
            return true;
        }

        if (connection) {
            const id = connection.getAttribute('data-id');

            if (isMultiSelect && isSelected(id)) {
                removeSelection(id);
                ns.Editor.attributes.render(app, null);
            } else {
                addSelection(id);
                ns.Editor.attributes.render(app, null);
            }
            return true;
        }

        // 빈 공간 클릭 시 속성 패널 초기화
        ns.Editor.attributes.render(app, null);
        return false;
    }

    // 모듈 내보내기
    ns.Editor.interaction.selectionManager = {
        clearSelection,
        addSelection,
        removeSelection,
        isSelected,
        getSelectedElementId,
        getAllSelectedIds,
        getSelectionCount,
        hasSelection,
        restoreSelection,
        handleClick,
        // 내부 상태 접근 (다른 모듈에서 필요시)
        _selectedIds: selectedIds,
    };
})();
