/*******************************************************************************
 * Copyright: SELab.AI (c) 2025
 *******************************************************************************/

const vscode = require("vscode");
const { BlockDiagramPanel } = require("./BlockDiagramPanel");
const componentViewColumnManager = require("./componentViewColumnManager");

function resolveActiveJsonUri() {
  const activeUri = vscode.window.activeTextEditor?.document?.uri;
  if (activeUri && activeUri.fsPath.endsWith(".json")) return activeUri;
  return null;
}

async function activate(context) {
  // 블록 다이어그램 옆에 열기 — 활성 JSON 파일 사용, 없으면 빈 다이어그램
  context.subscriptions.push(
    vscode.commands.registerCommand("selab.block.openBeside", async () => {
      const uri = resolveActiveJsonUri();
      const viewColumn =
        componentViewColumnManager.get() ?? vscode.ViewColumn.Beside;
      await BlockDiagramPanel.openForDocument(context, uri, viewColumn);
    }),
  );

  // 블록 다이어그램 열기 (URI 직접 전달 시 사용, 없으면 활성 JSON 파일)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "selab.block.openForDocument",
      async (commandArg) => {
        const uri =
          commandArg instanceof vscode.Uri
            ? commandArg
            : resolveActiveJsonUri();
        const viewColumn =
          componentViewColumnManager.get() ?? vscode.ViewColumn.Beside;
        await BlockDiagramPanel.openForDocument(context, uri, viewColumn);
      },
    ),
  );

  // 리프레시 커맨드
  context.subscriptions.push(
    vscode.commands.registerCommand("selab.block.refresh", async () => {
      try {
        await BlockDiagramPanel.refreshActive();
      } catch (err) {
        console.error("[activate] selab.block.refresh error:", err);
      }
    }),
  );

  // JSON 저장·편집 및(개발 시) media/editor 변경 시 자동 갱신
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.languageId !== "json") return;
      BlockDiagramPanel.scheduleRefreshForUri(document.uri, 0);
    }),
  );
  BlockDiagramPanel.installAutoRefresh(context);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
