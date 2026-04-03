/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
// Editor namespace bootstrap
(function () {
  const ns = (window.SELAB = window.SELAB || {});
  ns.Editor = ns.Editor || {};
  ns.Editor._queue = ns.Editor._queue || [];
  ns.Editor.post = ns.Editor.post || ((payload) => { try { ns.Editor._queue.push(payload); } catch {} });

  try {
    const attach = (api) => {
      if (!api) return;
      ns.Editor.vscode = api;
      window.vscode = api;
      const q = Array.isArray(ns.Editor._queue) ? ns.Editor._queue.splice(0) : [];
      ns.Editor.post = (payload) => { try { api.postMessage(payload); } catch {} };
      try { q.forEach((m) => api.postMessage(m)); } catch {}
      try { window.dispatchEvent(new CustomEvent('selab:vscode-ready')); } catch {}
    };

    if (!ns.Editor.vscode && !window.vscode) {
      const acquired = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
      if (acquired) attach(acquired);
    } else {
      const existing = ns.Editor.vscode || window.vscode;
      attach(existing);
    }
  } catch {}
})();
