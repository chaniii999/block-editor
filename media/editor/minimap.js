/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
// Minimap module: overview rendering synced with app.viewport
(function () {
  const ns = (window.SELAB = window.SELAB || {});
  ns.Editor = ns.Editor || {};

  function ensureMinimapHost() {
    const host = document.querySelector('.diagram-editor');
    if (!host) return null;
    let container = host.querySelector('#minimapContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'minimapContainer';
      container.className = 'minimap';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('id', 'minimapSvg');
      svg.setAttribute('width', '200');
      svg.setAttribute('height', '140');
      container.appendChild(svg);
      host.appendChild(container);
    }
    return container;
  }

  function getContentBounds(elements) {
    if (!elements || elements.length === 0) return { x: 0, y: 0, w: 100, h: 100 };
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const e of elements) {
      const x1 = Number(e.x || 0);
      const y1 = Number(e.y || 0);
      const x2 = x1 + Number(e.width || 0);
      const y2 = y1 + Number(e.height || 0);
      if (x1 < minx) minx = x1; if (y1 < miny) miny = y1;
      if (x2 > maxx) maxx = x2; if (y2 > maxy) maxy = y2;
    }
    if (!Number.isFinite(minx) || !Number.isFinite(miny) || !Number.isFinite(maxx) || !Number.isFinite(maxy)) {
      return { x: 0, y: 0, w: 100, h: 100 };
    }
    const pad = 50;
    return { x: minx - pad, y: miny - pad, w: (maxx - minx) + pad * 2, h: (maxy - miny) + pad * 2 };
  }

  function worldToMini(pt, viewBox, miniW, miniH) {
    const sx = miniW / Math.max(1, viewBox.w);
    const sy = miniH / Math.max(1, viewBox.h);
    const s = Math.min(sx, sy);
    return { x: (pt.x - viewBox.x) * s, y: (pt.y - viewBox.y) * s, s };
  }

  function miniToWorld(pt, viewBox, miniW, miniH) {
    const sx = miniW / Math.max(1, viewBox.w);
    const sy = miniH / Math.max(1, viewBox.h);
    const s = Math.min(sx, sy);
    return { x: pt.x / s + viewBox.x, y: pt.y / s + viewBox.y };
  }

  function draw(app) {
    const container = ensureMinimapHost();
    if (!container) return;
    const svg = container.querySelector('#minimapSvg');
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const miniW = Number(svg.getAttribute('width')) || 200;
    const miniH = Number(svg.getAttribute('height')) || 140;

    const elements = Array.isArray(app?.model?.elements) ? app.model.elements : [];
    const viewBox = getContentBounds(elements);

    // Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', '0'); bg.setAttribute('y', '0');
    bg.setAttribute('width', String(miniW)); bg.setAttribute('height', String(miniH));
    bg.setAttribute('fill', 'var(--vscode-editor-background)');
    bg.setAttribute('stroke', 'var(--vscode-panel-border)');
    svg.appendChild(bg);

    // Draw nodes as mini rects
    for (const e of elements) {
      const p1 = worldToMini({ x: e.x, y: e.y }, viewBox, miniW, miniH);
      const w = Math.max(1, e.width * p1.s);
      const h = Math.max(1, e.height * p1.s);
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', String(p1.x)); r.setAttribute('y', String(p1.y));
      r.setAttribute('width', String(w)); r.setAttribute('height', String(h));
      r.setAttribute('fill', 'var(--vscode-editorWidget-background)');
      r.setAttribute('stroke', 'var(--vscode-input-border)');
      r.setAttribute('stroke-width', '0.5');
      svg.appendChild(r);
    }

    // Compute current viewport in world coords
    const svgMain = app?.dom?.svg || document.getElementById('diagramSvg');
    const rect = svgMain?.getBoundingClientRect?.();
    const scale = Math.max(0.0001, app?.viewport?.scale || 1);
    const worldX = - (app?.viewport?.x || 0) / scale;
    const worldY = - (app?.viewport?.y || 0) / scale;
    const worldW = (rect?.width || 800) / scale;
    const worldH = (rect?.height || 600) / scale;

    // Draw viewport box
    const tl = worldToMini({ x: worldX, y: worldY }, viewBox, miniW, miniH);
    const br = worldToMini({ x: worldX + worldW, y: worldY + worldH }, viewBox, miniW, miniH);
    const vrect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    vrect.setAttribute('x', String(Math.min(tl.x, br.x)));
    vrect.setAttribute('y', String(Math.min(tl.y, br.y)));
    vrect.setAttribute('width', String(Math.abs(br.x - tl.x)));
    vrect.setAttribute('height', String(Math.abs(br.y - tl.y)));
    vrect.setAttribute('class', 'minimap-viewport');
    vrect.setAttribute('fill', 'transparent');
    vrect.setAttribute('stroke', 'var(--vscode-focusBorder)');
    vrect.setAttribute('stroke-width', '1');
    svg.appendChild(vrect);

    // Click to navigate
    svg.addEventListener('click', (ev) => {
      const bbox = svg.getBoundingClientRect();
      const mx = ev.clientX - bbox.left; const my = ev.clientY - bbox.top;
      const world = miniToWorld({ x: mx, y: my }, viewBox, miniW, miniH);
      // Center viewport around clicked world point
      const mainRect = (app?.dom?.svg || document.getElementById('diagramSvg'))?.getBoundingClientRect?.() || { width: 800, height: 600 };
      const s = Math.max(0.0001, app?.viewport?.scale || 1);
      app.viewport.x = (mainRect.width / 2) - world.x * s;
      app.viewport.y = (mainRect.height / 2) - world.y * s;
      ns.Editor.render?.draw?.(app);
    }, { once: true });
  }

  ns.Editor.minimap = { draw };
})();
