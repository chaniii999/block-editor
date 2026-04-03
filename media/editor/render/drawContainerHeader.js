/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
// Renderer part: drawContainerHeader
(function () {
  const ns = (window.SELAB = window.SELAB || {});
  ns.Editor = ns.Editor || {};
  ns.Editor.render = ns.Editor.render || {};

  function drawContainerHeader(svg, info) {
    const padX = 8;
    const lineHeight = 14;
    const maxWidth = Math.max(10, info.width - (padX * 2));
    
    const isPackage = String(info.type || '').toLowerCase().includes('package');
    if (isPackage) {
      // UML-like package tab at top-left
      const tabH = 22;
      const name = String(info.name || '');
      const tabX = Number(info.x);
      const tabY = Number(info.y);
      const tabPadding = 40; // icon + gaps + side padding
      const measuredTextWidth = ns.Editor.renderUtils.measureText(name, 'container-title', {});
      const approx = Math.max(80, Math.min(Number(info.width) - 2, measuredTextWidth + tabPadding));

      // Cover to hide main box top border under the tab
      const cover = ns.Editor.renderUtils.createSvgRect(tabX, tabY, approx, tabH, '');
      try {
          cover.style.setProperty('fill', 'var(--vscode-editorWidget-background)');
          cover.style.setProperty('stroke', 'none');
      } catch {}
      svg.appendChild(cover);

      const tab = ns.Editor.renderUtils.createSvgRect(tabX, tabY, approx, tabH, '');
      try {
        tab.setAttribute('rx', '0');
        tab.setAttribute('ry', '0');
        tab.style.setProperty('fill', 'transparent');
        tab.style.setProperty('stroke', 'var(--vscode-focusBorder)');
        tab.style.setProperty('stroke-width', '1.5');
      } catch {}
      svg.appendChild(tab);

      // folder glyph inside tab
      try {
        const gx = tabX + 8; const gy = tabY + Math.floor(tabH / 2) + 1;
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const x0 = gx, y0 = gy - 6;
        const d = `M ${x0} ${y0 + 3} L ${x0 + 4} ${y0 + 3} L ${x0 + 6} ${y0} L ${x0 + 12} ${y0} L ${x0 + 12} ${y0 + 10} L ${x0} ${y0 + 10} Z`;
        p.setAttribute('d', d);
        p.setAttribute('class', 'type-glyph');
        svg.appendChild(p);
      } catch {}

      // package name inside tab
      const labelX = tabX + 28;
      const labelY = tabY + 5;

      // Iteratively truncate text until it fits
      const maxTextWidth = approx - (tabPadding / 2); // Give some padding
      let truncatedName = name;
      let textWidth = ns.Editor.renderUtils.measureText(truncatedName, 'container-title', {});

      while (textWidth > maxTextWidth && truncatedName.length > 3) {
          truncatedName = truncatedName.slice(0, -4) + '...';
          textWidth = ns.Editor.renderUtils.measureText(truncatedName, 'container-title', {});
      }
      if (textWidth > maxTextWidth) {
          truncatedName = '...';
      }

      const nameText = ns.Editor.renderUtils.createSvgText(labelX, labelY, 'container-title', truncatedName, {});
      nameText.style.pointerEvents = 'none';
      svg.appendChild(nameText);
      return; // do not render default header lines
    }
    const stereoText = ns.Editor.utils.getStereotypeText(info.type);
    const wrap = (ns.Editor.utils && ns.Editor.utils.wrapByWidth)
      ? ns.Editor.utils.wrapByWidth
      : (t, _w) => [String(t || '')];
    const linesType = stereoText ? wrap(stereoText, maxWidth, '12px sans-serif') : [];
    const visibilitySymbol = ns.Editor.utils.getVisibilitySymbol(info.visibility);
    const nameWithVisibility = visibilitySymbol ? `${visibilitySymbol} ${info.name || ''}` : String(info.name || '');
    
    const nameLinesSplit = nameWithVisibility.split('\n');
    let linesName = [];
    for (const line of nameLinesSplit) {
      const wrapped = wrap(line, maxWidth, '12px sans-serif');
      linesName = linesName.concat(wrapped);
    }
    // IfActionUsage / ElseIfAction의 guard 조건식 추가
    let linesGuard = [];
    const typeLower = String(info.type || '').toLowerCase();
    const isIfAction = typeLower.includes('ifaction') || typeLower === 'elseifaction' || typeLower === 'elseaction';
    if (isIfAction && info.guard) {
      const prefix = typeLower === 'elseifaction' ? 'else if' : 'if';
      const guardText = `${prefix} (${info.guard})`;
      const wrappedGuard = wrap(guardText, maxWidth, '11px sans-serif');
      linesGuard = wrappedGuard;
    }
    
    const totalLines = linesType.length + linesName.length + linesGuard.length;
    const headerH = Math.max(22, Math.ceil(totalLines * lineHeight + 8));
    const header = ns.Editor.renderUtils.createSvgRect(
      info.x + 1, info.y + 1, Math.max(0, info.width - 2), headerH, 'container-header'
    );
    header.style.pointerEvents = 'none';
    // Ensure header band never paints solid if CSS fails to load
    try { header.setAttribute('fill', 'transparent'); header.setAttribute('stroke', 'none'); } catch {}
    svg.appendChild(header);

    let y = info.y + 4;
    const leftX = Number(info.x) + padX;
    for (let i = 0; i < linesType.length; i++) {
      const t = ns.Editor.renderUtils.createSvgText(
        leftX, y + i * lineHeight, 'container-title', linesType[i], { textAnchor: 'start' }
      );
      t.style.pointerEvents = 'none';
      svg.appendChild(t);
    }
    y += linesType.length * lineHeight;
    for (let i = 0; i < linesName.length; i++) {
      const t = ns.Editor.renderUtils.createSvgText(
        leftX, y + i * lineHeight, 'container-title', linesName[i], { textAnchor: 'start' }
      );
      t.style.pointerEvents = 'none';
      svg.appendChild(t);
    }
    y += linesName.length * lineHeight;
    // IfActionUsage guard 조건식 렌더링 (회색, 이탤릭체)
    for (let i = 0; i < linesGuard.length; i++) {
      const t = ns.Editor.renderUtils.createSvgText(
        leftX, y + i * lineHeight, 'if-guard-text', linesGuard[i], { textAnchor: 'start' }
      );
      t.style.pointerEvents = 'none';
      t.setAttribute('font-size', '11px');
      t.setAttribute('font-style', 'italic');
      t.setAttribute('fill', '#888888');
      svg.appendChild(t);
    }
  }

  ns.Editor.render.drawContainerHeader = drawContainerHeader;
})();
