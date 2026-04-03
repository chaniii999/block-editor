/********************************************************************************
 * Copyright: SELab.AI (c) 2026
 ********************************************************************************/

const vscode = require("vscode");
const {
  createMessageHandler: createDiagramEditorMessageHandler,
} = require("../../packages/selab-diagram-editor/src/panel/PanelMessageHandler");
const { resolveBlockViewSessionTarget } = require("../BlockViewSession");

const BLOCK_MUTATION_MESSAGE_TYPES = new Set([
  "add",
  "connection-created",
  "add-connection",
  "delete-element",
  "delete-doc",
  "delete-connection",
  "rename-element",
  "update-guard",
  "update-element-type",
  "update-property",
  "update-color",
  "update-sysml-source",
  "undo",
  "redo",
]);

async function resolveCurrentBlockSession(panel) {
  const currentSession = await resolveBlockViewSessionTarget(
    panel?._blockViewSession || panel?.documentUri,
  );
  if (currentSession) {
    panel._blockViewSession = currentSession;
    panel.documentUri = currentSession.sourceUri || currentSession.viewUri;
  }
  return currentSession;
}

async function openCurrentBlockSourceDocument(panel) {
  const session = await resolveCurrentBlockSession(panel);
  if (!session?.sourceUri) return undefined;
  return vscode.workspace.openTextDocument(session.sourceUri);
}

async function ensureEditableBlockSourceDocument(panel) {
  const session = await resolveCurrentBlockSession(panel);
  if (!session?.sourceUri) return undefined;
  return vscode.workspace.openTextDocument(session.sourceUri);
}

async function dispatchBlockMessageToDiagramEditor(
  context,
  message,
  options = {},
) {
  const document =
    options.ensureSource === true
      ? await ensureEditableBlockSourceDocument(context.panel)
      : await openCurrentBlockSourceDocument(context.panel);
  if (!document) return false;
  const delegatedHandler = createDiagramEditorMessageHandler({
    ...context,
    document,
  });
  await delegatedHandler(message);
  return true;
}

function isBlockMutationMessageType(messageType) {
  return BLOCK_MUTATION_MESSAGE_TYPES.has(String(messageType || "").trim());
}

module.exports = {
  dispatchBlockMessageToDiagramEditor,
  ensureEditableBlockSourceDocument,
  isBlockMutationMessageType,
  openCurrentBlockSourceDocument,
  resolveCurrentBlockSession,
};
