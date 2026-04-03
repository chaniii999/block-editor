/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
// Renderer part: drawContainerToggle
(function () {
  const ns = (window.SELAB = window.SELAB || {});
  ns.Editor = ns.Editor || {};
  ns.Editor.render = ns.Editor.render || {};

  function drawContainerToggle(svg, info) {
    const onClick = () => {
      try {
        ns.Editor.interactions?.toggleCompartment?.(info.nodeId, info.compIndex);
      } catch {}
    };
    const [hit, toggle] = ns.Editor.renderUtils.createToggleElement(
      info.x, info.y, info.glyph || '▾', onClick, { compIndex: info.compIndex }
    );
    svg.appendChild(hit);
    svg.appendChild(toggle);
  }

  ns.Editor.render.drawContainerToggle = drawContainerToggle;
})();
