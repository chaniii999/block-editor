/*******************************************************************************
 * Copyright: SELab.AI (c) 2025
 * 블록 다이어그램 패널 - JSON 파일 기반 렌더링
 *******************************************************************************/

const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const { HtmlGenerator } = require("./HtmlGenerator");
const componentViewColumnManager = require("./componentViewColumnManager");
const { fetchBlockModel, createMessageHandler } = require("./panel");

function buildPanelTitle(uri) {
  const fileName = (uri?.path?.split("/").pop() || "")
    .replace(/\.json$/i, "")
    .trim();
  return `Block Diagram - ${fileName || "Untitled"}`;
}

function resolveUiMediaRoot(context) {
  const packagedUiRoot = vscode.Uri.joinPath(
    context.extensionUri,
    "node_modules",
    "selab-ui",
    "media",
  );
  if (fs.existsSync(packagedUiRoot.fsPath)) return packagedUiRoot;
  const workspaceUiRoot = vscode.Uri.file(
    path.resolve(context.extensionUri.fsPath, "..", "selab-ui", "media"),
  );
  if (fs.existsSync(workspaceUiRoot.fsPath)) return workspaceUiRoot;
  return packagedUiRoot;
}

class BlockDiagramPanel {
  static panels = new Map();
  static refreshTimers = new Map();
  static webviewReloadTimer = null;
  static activePanelKey = undefined;
  static activeWebviewUri = null;

  static _getOpenDocumentText(uri) {
    if (!uri) return undefined;
    const key = uri.toString();
    const doc = vscode.workspace.textDocuments.find(
      (d) => d.uri.toString() === key,
    );
    return doc?.getText();
  }

  static installAutoRefresh(context) {
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId !== "json") return;
        BlockDiagramPanel.scheduleRefreshForUri(event.document.uri, 400);
      }),
    );

    if (context.extensionMode !== vscode.ExtensionMode.Development) return;

    const mediaPattern = new vscode.RelativePattern(
      context.extensionUri,
      "media/editor/**",
    );
    const watcher = vscode.workspace.createFileSystemWatcher(mediaPattern);
    const scheduleWebviewReload = () => {
      BlockDiagramPanel.scheduleWebviewReload(context, 350);
    };
    watcher.onDidChange(scheduleWebviewReload);
    watcher.onDidCreate(scheduleWebviewReload);
    watcher.onDidDelete(scheduleWebviewReload);
    context.subscriptions.push(watcher);
  }

  static scheduleWebviewReload(context, delayMs = 350) {
    if (BlockDiagramPanel.webviewReloadTimer) {
      clearTimeout(BlockDiagramPanel.webviewReloadTimer);
    }
    BlockDiagramPanel.webviewReloadTimer = setTimeout(() => {
      BlockDiagramPanel.webviewReloadTimer = null;
      for (const panel of BlockDiagramPanel.panels.values()) {
        try {
          panel.webview.html = HtmlGenerator.getHtml(context, panel.webview);
        } catch (err) {
          console.log("[BlockDiagramPanel] webview reload error", err);
        }
      }
    }, delayMs);
  }

  static async refreshActive() {
    const key = BlockDiagramPanel.activePanelKey;
    if (!key) return;
    const panel = BlockDiagramPanel.panels.get(key);
    if (!panel) return;
    await BlockDiagramPanel._handleRefresh(panel._extensionContext, panel);
  }

  static scheduleRefreshForUri(uri, delayMs = 200) {
    const key = uri?.toString?.();
    if (!key) return;
    let matchedKey = null;
    for (const [panelKey, panel] of BlockDiagramPanel.panels) {
      if (panelKey === key || panel.documentUri?.toString() === key) {
        matchedKey = panelKey;
        break;
      }
    }
    if (!matchedKey) return;
    const existingTimer = BlockDiagramPanel.refreshTimers.get(matchedKey);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => {
      BlockDiagramPanel.refreshTimers.delete(matchedKey);
      const panel = BlockDiagramPanel.panels.get(matchedKey);
      if (!panel) return;
      void BlockDiagramPanel._handleRefresh(panel._extensionContext, panel);
    }, delayMs);
    BlockDiagramPanel.refreshTimers.set(matchedKey, timer);
  }

  static async _handleRefresh(context, panel) {
    try {
      const uri = panel.documentUri;
      if (!uri) {
        try {
          panel.webview.postMessage({
            type: "model",
            model: { nodes: [], edges: [] },
            guiData: {},
            visibilityConfig: null,
            cycleId: Date.now(),
            counts: { nodes: 0, edges: 0 },
          });
        } catch {}
        return;
      }

      try {
        panel.webview.postMessage({
          type: "showSpinner",
          message: "Loading...",
        });
      } catch {}

      const rawText = BlockDiagramPanel._getOpenDocumentText(uri);
      const { model, visibilityConfig } = await fetchBlockModel(uri, rawText);

      panel.title = buildPanelTitle(uri);
      panel.webview.postMessage({
        type: "model",
        model: { ...model, sourceUri: uri.toString() },
        guiData: {},
        visibilityConfig,
        cycleId: Date.now(),
        counts: { nodes: model.nodes.length, edges: model.edges.length },
      });

      try {
        panel.webview.postMessage({ type: "hideSpinner" });
      } catch {}
    } catch (error) {
      console.log("[BlockDiagramPanel._handleRefresh] error", error);
      try {
        panel.webview.postMessage({ type: "hideSpinner" });
      } catch {}
      try {
        panel.webview.postMessage({
          type: "error",
          message: String(error?.message || error),
        });
      } catch {}
    }
  }

  static async openForDocument(context, uri, viewColumn) {
    const key = uri ? uri.toString() : "selab.block.diagram.blank";
    let panel = this.panels.get(key);
    if (!panel) {
      panel = this.createPanel(context, uri, viewColumn, key);
      this.setupMessageHandler(panel, context, key);
      void BlockDiagramPanel._handleRefresh(context, panel);
      BlockDiagramPanel.activePanelKey = key;
      BlockDiagramPanel.activeWebviewUri = uri;
    } else {
      panel._extensionContext = context;
      panel.title = buildPanelTitle(uri);
      panel.reveal(viewColumn, true);
      BlockDiagramPanel.activePanelKey = key;
      BlockDiagramPanel.activeWebviewUri = uri;
      void BlockDiagramPanel._handleRefresh(context, panel);
    }
  }

  static createPanel(context, uri, viewColumn, key) {
    const uiMediaRoot = resolveUiMediaRoot(context);
    const localResourceRoots = [
      vscode.Uri.joinPath(context.extensionUri, "media"),
      vscode.Uri.joinPath(context.extensionUri, "node_modules"),
      uiMediaRoot,
    ];

    const panel = vscode.window.createWebviewPanel(
      "selab.block.diagram",
      buildPanelTitle(uri),
      { viewColumn, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots,
      },
    );

    panel.documentUri = uri;
    panel._extensionContext = context;
    const ownerId = componentViewColumnManager.set(panel.viewColumn, key);
    panel._editorViewColumnOwnerId = ownerId;

    panel.onDidChangeViewState((event) => {
      const nextColumn = event?.webviewPanel?.viewColumn;
      if (nextColumn !== undefined) {
        panel._editorViewColumnOwnerId = componentViewColumnManager.set(
          nextColumn,
          panel._editorViewColumnOwnerId,
        );
      }
      if (event.webviewPanel.active) {
        BlockDiagramPanel.activePanelKey = key;
        if (panel.documentUri)
          BlockDiagramPanel.activeWebviewUri = panel.documentUri;
      }
    });

    panel.onDidDispose(() => {
      this.panels.delete(key);
      const timer = BlockDiagramPanel.refreshTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        BlockDiagramPanel.refreshTimers.delete(key);
      }
      if (BlockDiagramPanel.activePanelKey === key)
        BlockDiagramPanel.activePanelKey = undefined;
      if (panel._editorViewColumnOwnerId)
        componentViewColumnManager.clear(panel._editorViewColumnOwnerId);
    });

    panel.webview.html = HtmlGenerator.getHtml(context, panel.webview);
    this.panels.set(key, panel);
    BlockDiagramPanel.activeWebviewUri = uri;
    return panel;
  }

  static setupMessageHandler(panel, context, key) {
    panel.webview.onDidReceiveMessage(
      createMessageHandler({
        panel,
        sendModelForRendering: () =>
          BlockDiagramPanel._handleRefresh(context, panel),
      }),
    );
  }
}

module.exports = {
  BlockDiagramPanel,
};
