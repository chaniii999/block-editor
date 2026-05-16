/*******************************************************************************
 * Copyright: SELab.AI (c) 2025
 * JSON 파일 로더 - nodes/edges JSON 파일에서 다이어그램 모델 로드
 *******************************************************************************/

const fs = require("fs");

function parseDiagramJson(raw) {
  const data = JSON.parse(raw);
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const edges = Array.isArray(data.edges) ? data.edges : [];
  return { model: { nodes, edges }, visibilityConfig: null };
}

/**
 * JSON 파일에서 다이어그램 모델 로드
 * Expected format: { "nodes": [...], "edges": [...] }
 * @param {string} [rawText] 열려 있는 편집기 버퍼(미저장 변경 반영)
 */
async function fetchDiagramModel(uri, rawText) {
  try {
    const raw =
      typeof rawText === "string"
        ? rawText
        : fs.readFileSync(uri.fsPath, "utf8");
    return parseDiagramJson(raw);
  } catch (err) {
    console.log("[JsonLoader] fetchDiagramModel error:", err?.message);
    return { model: { nodes: [], edges: [] }, visibilityConfig: null };
  }
}

module.exports = {
  fetchDiagramModel,
};
