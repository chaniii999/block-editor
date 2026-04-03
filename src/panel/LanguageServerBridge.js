/*******************************************************************************
 * Copyright: SELab.AI (c) 2025
 * JSON 파일 로더 - nodes/edges JSON 파일에서 다이어그램 모델 로드
 *******************************************************************************/

const fs = require("fs");

/**
 * JSON 파일에서 다이어그램 모델 로드
 * Expected format: { "nodes": [...], "edges": [...] }
 */
async function fetchDiagramModel(uri) {
  try {
    const filePath = uri.fsPath;
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    const nodes = Array.isArray(data.nodes) ? data.nodes : [];
    const edges = Array.isArray(data.edges) ? data.edges : [];
    return { model: { nodes, edges }, visibilityConfig: null };
  } catch (err) {
    console.log("[JsonLoader] fetchDiagramModel error:", err?.message);
    return { model: { nodes: [], edges: [] }, visibilityConfig: null };
  }
}

module.exports = {
  fetchDiagramModel,
};
