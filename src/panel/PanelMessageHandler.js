/*******************************************************************************
 * Copyright: SELab.AI (c) 2026
 *******************************************************************************/

const vscode = require("vscode");

function createMessageHandler(context) {
  const { panel, sendModelForRendering } = context;

  return async (message) => {
    if (!message) return;

    switch (message.type) {
      case "ready":
      case "refresh":
        try {
          await sendModelForRendering();
        } catch (error) {
          console.log("[createMessageHandler] refresh error", error);
        }
        break;
      case "node-geometry":
        handleNodeGeometry(panel, message);
        break;
      case "render-complete":
      case "activated":
      case "log":
        break;
      default:
        break;
    }
  };
}

function handleNodeGeometry(panel, message) {
  try {
    const nodes = message.nodes;
    if (!Array.isArray(nodes) || nodes.length === 0) return;
    console.log("[handleNodeGeometry] node positions updated:", nodes.length);
  } catch (error) {
    console.log("[handleNodeGeometry] error", error);
  }
}

module.exports = {
  createMessageHandler,
};
