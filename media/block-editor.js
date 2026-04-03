/* Copyright: SELab.AI (c) 2026 */

(function bootstrapBlockEditor() {
    const vscode = window.__SELAB_BLOCK_EDITOR_BOOT__?.vscode;
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const diagramCanvas = document.getElementById('diagramCanvas');
    const inspectorContent = document.getElementById('inspectorContent');
    const diagramStats = document.getElementById('diagramStats');
    const refreshButton = document.getElementById('refreshButton');
    const state = {
        model: { nodes: [], edges: [], rootIds: [] },
        selectedId: null,
    };

    function postMessage(payload) {
        if (!vscode || !payload) {
            return;
        }
        vscode.postMessage(payload);
    }

    function clearCanvas() {
        while (diagramCanvas.firstChild) {
            diagramCanvas.removeChild(diagramCanvas.firstChild);
        }
    }

    function createSvgElement(tagName, attributes) {
        const element = document.createElementNS(svgNamespace, tagName);
        Object.entries(attributes || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                element.setAttribute(key, String(value));
            }
        });
        return element;
    }

    function findNodeById(id) {
        return state.model.nodes.find((node) => node.id === id) || null;
    }

    function renderInspector(node) {
        if (!node) {
            inspectorContent.textContent = 'Select a block to inspect its SysML metadata.';
            return;
        }

        const rows = [
            ['Name', node.name],
            ['Kind', node.kind],
            ['Type', node.typeLabel],
            ['Qualified Name', node.qualifiedName],
            ['Multiplicity', node.multiplicity || '-'],
            ['Composite', String(Boolean(node.isComposite))],
            ['Reference', String(Boolean(node.isReference))],
            ['Children', String(node.children?.length || 0)],
        ];

        inspectorContent.innerHTML = rows.map(([key, value]) => `
            <div class="inspector-row">
                <div class="inspector-key">${escapeHtml(key)}</div>
                <div class="inspector-value">${escapeHtml(value)}</div>
            </div>
        `).join('');
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getNodeCenter(node) {
        return {
            x: node.x + (node.width / 2),
            y: node.y + 20,
        };
    }

    function renderEdges() {
        state.model.edges.forEach((edge) => {
            const source = findNodeById(edge.source);
            const target = findNodeById(edge.target);
            if (!source || !target || edge.kind === 'containment') {
                return;
            }

            const sourceCenter = getNodeCenter(source);
            const targetCenter = getNodeCenter(target);
            const path = createSvgElement('path', {
                d: `M ${sourceCenter.x} ${sourceCenter.y} C ${sourceCenter.x + 80} ${sourceCenter.y}, ${targetCenter.x - 80} ${targetCenter.y}, ${targetCenter.x} ${targetCenter.y}`,
                fill: 'none',
                stroke: edge.kind === 'specialization' || edge.kind === 'inheritance' ? '#4fc1ff' : '#c586c0',
                'stroke-width': 2,
                'stroke-dasharray': edge.kind === 'binding' ? '6 4' : undefined,
            });
            diagramCanvas.appendChild(path);

            const label = createSvgElement('text', {
                x: (sourceCenter.x + targetCenter.x) / 2,
                y: (sourceCenter.y + targetCenter.y) / 2 - 8,
                fill: '#9cdcfe',
                'font-size': 12,
                'text-anchor': 'middle',
            });
            label.textContent = edge.label || edge.kind;
            diagramCanvas.appendChild(label);
        });
    }

    function renderNode(node) {
        const group = createSvgElement('g', {
            class: 'block-node',
            'data-node-id': node.id,
        });
        const isSelected = state.selectedId === node.id;
        const rect = createSvgElement('rect', {
            x: node.x,
            y: node.y,
            rx: 10,
            ry: 10,
            width: node.width,
            height: node.height,
            fill: node.category === 'definition' ? '#264f78' : '#333333',
            stroke: isSelected ? '#ffd700' : '#5a5a5a',
            'stroke-width': isSelected ? 3 : 1.5,
        });
        const title = createSvgElement('text', {
            x: node.x + 16,
            y: node.y + 26,
            fill: '#ffffff',
            'font-size': 14,
            'font-weight': '600',
        });
        title.textContent = `${node.name}`;

        const subtitle = createSvgElement('text', {
            x: node.x + 16,
            y: node.y + 46,
            fill: '#d7ba7d',
            'font-size': 12,
        });
        subtitle.textContent = `${node.kind}${node.declaredType ? ` : ${node.declaredType}` : ''}`;

        group.appendChild(rect);
        group.appendChild(title);
        group.appendChild(subtitle);

        let currentY = node.y + 68;
        currentY = renderSection(group, node.x, currentY, 'parts', node.parts);
        currentY = renderSection(group, node.x, currentY, 'ports', node.ports);
        renderSection(group, node.x, currentY, 'attributes', node.attributes);

        group.addEventListener('click', () => {
            state.selectedId = node.id;
            renderDiagram();
            renderInspector(node);
        });
        group.addEventListener('dblclick', () => {
            postMessage({
                type: 'select',
                id: node.id,
                name: node.name,
                range: node.range,
            });
        });

        diagramCanvas.appendChild(group);
    }

    function renderSection(group, x, startY, title, ids) {
        if (!Array.isArray(ids) || !ids.length) {
            return startY;
        }

        const titleNode = createSvgElement('text', {
            x: x + 16,
            y: startY,
            fill: '#9cdcfe',
            'font-size': 11,
            'font-weight': '600',
        });
        titleNode.textContent = title.toUpperCase();
        group.appendChild(titleNode);

        let currentY = startY + 16;
        ids.forEach((id) => {
            const child = findNodeById(id);
            if (!child) {
                return;
            }
            const line = createSvgElement('text', {
                x: x + 24,
                y: currentY,
                fill: '#d4d4d4',
                'font-size': 11,
            });
            line.textContent = `${child.name}${child.declaredType ? ` : ${child.declaredType}` : ''}`;
            group.appendChild(line);
            currentY += 14;
        });
        return currentY + 6;
    }

    function updateCanvasSize() {
        const nodes = state.model.nodes || [];
        const maxWidth = nodes.reduce((accumulator, node) => Math.max(accumulator, node.x + node.width + 64), 960);
        const maxHeight = nodes.reduce((accumulator, node) => Math.max(accumulator, node.y + node.height + 64), 720);
        diagramCanvas.setAttribute('viewBox', `0 0 ${maxWidth} ${maxHeight}`);
        diagramCanvas.setAttribute('width', String(maxWidth));
        diagramCanvas.setAttribute('height', String(maxHeight));
    }

    function renderDiagram() {
        clearCanvas();
        updateCanvasSize();
        renderEdges();
        (state.model.nodes || []).forEach(renderNode);
        const counts = {
            nodes: Array.isArray(state.model.nodes) ? state.model.nodes.length : 0,
            edges: Array.isArray(state.model.edges) ? state.model.edges.length : 0,
        };
        diagramStats.textContent = `${counts.nodes} blocks, ${counts.edges} relationships`;
        renderInspector(findNodeById(state.selectedId));
    }

    window.addEventListener('message', (event) => {
        const payload = event.data || {};
        if (payload.type === 'model') {
            state.model = payload.model || { nodes: [], edges: [], rootIds: [] };
            if (state.selectedId && !findNodeById(state.selectedId)) {
                state.selectedId = null;
            }
            renderDiagram();
            return;
        }
        if (payload.type === 'warn') {
            diagramStats.textContent = payload.message || 'Warning';
        }
    });

    refreshButton?.addEventListener('click', () => {
        postMessage({ type: 'refresh' });
    });

    postMessage({ type: 'ready' });
}());
