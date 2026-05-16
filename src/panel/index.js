/*******************************************************************************
 * Copyright: SELab.AI (c) 2026
 *******************************************************************************/

const { fetchDiagramModel } = require("./LanguageServerBridge");
const { buildBlockModel } = require("./BlockModelBuilder");
const { createMessageHandler } = require("./PanelMessageHandler");

async function fetchBlockModel(uri, rawText) {
  const { model: rawModel, visibilityConfig } = await fetchDiagramModel(
    uri,
    rawText,
  );
  const model = buildBlockModel(rawModel);
  return {
    model,
    visibilityConfig: visibilityConfig || null,
  };
}

module.exports = {
  fetchBlockModel,
  createMessageHandler,
};
