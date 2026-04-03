/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
// Inline editing overlay for node and edge labels
(function () {
  const ns = (window.SELAB = window.SELAB || {});
  ns.Editor = ns.Editor || {};

  function start(opts) {
    // opts: { containerEl, targetEl, initialText, onCommit(text), onCancel() }
    const container = opts?.containerEl || document.querySelector('.diagram-editor');
    const target = opts?.targetEl;
    if (!container || !target) return;

    const rect = target.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();

    const input = document.createElement('input');
    input.type = 'text';
    input.value = String(opts?.initialText ?? '');
    input.className = 'inline-editor';
    input.style.position = 'absolute';
    input.style.left = `${Math.max(0, rect.left - cRect.left - 2)}px`;
    input.style.top = `${Math.max(0, rect.top - cRect.top - 2)}px`;
    input.style.width = `${Math.max(40, rect.width + 8)}px`;
    input.style.height = `${Math.max(18, rect.height + 4)}px`;

    const cleanup = () => { try { container.removeChild(input); } catch {} };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = String(input.value || '').trim();
        cleanup();
        try { opts?.onCommit?.(text); } catch {}
      } else if (e.key === 'Escape') {
        cleanup();
        try { opts?.onCancel?.(); } catch {}
      }
    });
    input.addEventListener('blur', () => {
      const text = String(input.value || '').trim();
      cleanup();
      try { opts?.onCommit?.(text); } catch {}
    });

    container.appendChild(input);
    input.focus();
    input.select();
  }

  ns.Editor.inlineEdit = { start };
})();
