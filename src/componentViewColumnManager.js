/*******************************************************************************
 * Copyright: SELab.AI (c) 2026
 *******************************************************************************/

const STORE_STATE_KEY = '__selabBlockEditorViewColumnState__';

const isValidColumn = (column) => typeof column === 'number' && Number.isInteger(column);

if (!globalThis[STORE_STATE_KEY]) {
    const owners = new Map();
    let sequence = 0;
    let lastColumn;

    const manager = {
        get() {
            return isValidColumn(lastColumn) ? lastColumn : undefined;
        },
        set(column, ownerId) {
            if (!isValidColumn(column)) {
                return ownerId;
            }

            const id = typeof ownerId === 'string' && ownerId.length > 0 ? ownerId : `selab-block-editor-${Date.now()}-${sequence++}`;
            owners.set(id, column);
            lastColumn = column;
            return id;
        },
        clear(ownerId) {
            if (!ownerId) {
                owners.clear();
                lastColumn = undefined;
                return;
            }

            if (!owners.has(ownerId)) {
                return;
            }

            owners.delete(ownerId);

            if (owners.size === 0) {
                lastColumn = undefined;
                return;
            }

            const columns = Array.from(owners.values());
            lastColumn = columns[columns.length - 1];
        },
    };

    globalThis[STORE_STATE_KEY] = manager;
}

module.exports = globalThis[STORE_STATE_KEY];
