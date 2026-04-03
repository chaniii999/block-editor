/*******************************************************************************
 * Copyright: SELab.AI (c) 2026
 *******************************************************************************/

const { fetchDiagramModel } = require("./LanguageServerBridge");
const { buildBlockModel } = require("./BlockModelBuilder");
const { createMessageHandler } = require("./PanelMessageHandler");

async function fetchBlockModel(uri) {
  const { model: rawModel, visibilityConfig } = await fetchDiagramModel(uri);
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
