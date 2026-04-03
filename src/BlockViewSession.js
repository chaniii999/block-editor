/********************************************************************************
 * Copyright: SELab.AI (c) 2026
 ********************************************************************************/

const path = require("path");
const {
  applyViewPresentation,
  listSessionRootModelRefs,
  listSessionSourceUris,
  mergeViewSourceRenderModels,
  persistViewData,
  readJsonFile,
  resolveViewSessionTarget,
  toUri,
} = require("selab-view-common/src");

const BLOCK_VIEW_EXTENSIONS = [".sls"];

function resolveStructureViewFileStem(session) {
  const targetUri = session?.viewUri || session?.sourceUri;
  if (!targetUri?.fsPath) return "StructureView";
  return (
    path.basename(targetUri.fsPath, path.extname(targetUri.fsPath)).trim() ||
    "StructureView"
  );
}

function resolveStructureRootElementId(session) {
  return resolveStructureViewFileStem(session);
}

async function resolveBlockViewSessionTarget(target) {
  return resolveViewSessionTarget(target, {
    viewExtensions: BLOCK_VIEW_EXTENSIONS,
  });
}

module.exports = {
  applyViewPresentation,
  listSessionRootModelRefs,
  listSessionSourceUris,
  mergeViewSourceRenderModels,
  persistViewData,
  readJsonFile,
  resolveBlockViewSessionTarget,
  resolveStructureRootElementId,
  resolveStructureViewFileStem,
  toUri,
};
