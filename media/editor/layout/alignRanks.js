/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
// Post-layout processing step to align nodes horizontally based on topological rank.
// 개선된 버전: ELK spacing을 고려한 정렬, 성능 최적화, 가독성 향상
(function() {
  const NS = (window.SELAB = window.SELAB || {});

  // displaySettings에서 정렬 설정 참조
  const DS = window.SELAB?.Editor?.config?.displaySettings;

  // 상수 정의
  const CONSTANTS = {
    COMMENT_TYPE: 'comment',
    DOCUMENTATION_TYPE: 'documentation',
    CONTROL_FLOW_TYPES: ['control', 'flow', 'succession', 'transition'],
    QUALIFIED_NAME_SEPARATOR: '::',
    ELK_SPACING_TOLERANCE: DS?.alignment?.elkSpacingTolerance ?? 20
  };

  /**
   * 노드들을 위상적 순위에 따라 수평 정렬 (ELK spacing 고려)
   * @param {Object} diagramData - 다이어그램 데이터
   * @param {Array} diagramData.elements - 노드 배열
   * @param {Array} diagramData.connections - 연결 배열
   * @param {Object} options - 옵션
   * @param {boolean} options.debug - 디버그 모드
   * @param {boolean} options.preserveElkSpacing - ELK spacing 존중 여부
   */
  NS.alignRanks = function(diagramData, options = {}) {
    const debugMode = options.debug || false;
    const preserveElkSpacing = options.preserveElkSpacing !== false; // 기본값 true
    
    if (debugMode) console.log('[alignRanks] starting alignment', { preserveElkSpacing });
    
    // 입력 데이터 유효성 검증
    if (!diagramData) {
      console.warn('[alignRanks] Invalid diagram data');
      return;
    }
    
    const elements = Array.isArray(diagramData.elements) ? diagramData.elements : [];
    if (elements.length === 0) {
      if (debugMode) console.log('[alignRanks] No elements to process');
      return;
    }

    // 성능 최적화: 한 번의 순회로 필요한 Map들 생성
    const { byId, byName, childrenOf } = buildNodeMaps(elements, debugMode);
    
    // qualified name으로 parent 추론하는 함수
    const findQualifiedParent = (el) => {
      if (!el || !el.name) return null;
      const parts = String(el.name).split('::');
      if (parts.length <= 1) return null;
      for (let i = parts.length - 1; i > 0; i--) {
        const prefix = parts.slice(0, i).join('::');
        const p = byName.get(prefix);
        if (p) return p.id;
      }
      return null;
    };
    
    // 각 컨테이너별로 노드 정렬 처리
    let totalAlignedCount = 0;
    for (const [parentId, children] of childrenOf) {
      if (!children || children.length < 2) continue;
      
      const alignedCount = processContainerAlignment(
        parentId, 
        children, 
        diagramData, 
        byId, 
        childrenOf, 
        debugMode,
        preserveElkSpacing
      );
      totalAlignedCount += alignedCount;
    }
    
    if (debugMode) {
      console.log(`[alignRanks] finished alignment, ${totalAlignedCount} nodes moved.`);
    }
  };

  /**
   * 노드 맵들을 한 번의 순회로 생성하여 성능 최적화
   * @param {Array} elements - 노드 배열
   * @param {boolean} debugMode - 디버그 모드
   * @returns {Object} byId, byName, childrenOf 맵들
   */
  function buildNodeMaps(elements, debugMode = false) {
    const byId = new Map();
    const byName = new Map();
    const childrenOf = new Map();
    
    // 1st pass: 모든 노드를 맵에 등록 (순서 의존성 제거)
    for (const element of elements) {
      if (element.id) byId.set(element.id, element);
      if (element.name) byName.set(element.name, element);
    }
    
    // 2nd pass: 컨테이너-자식 관계 구축 (모든 노드가 맵에 있으므로 순서 무관)
    for (const element of elements) {
      const elementType = String(element.type || '').toLowerCase();
      if (elementType === CONSTANTS.COMMENT_TYPE || elementType === CONSTANTS.DOCUMENTATION_TYPE) {
        continue;
      }
      
      const parentId = findParentId(element, byId, byName);
      if (parentId && byId.has(parentId)) {
        if (!childrenOf.has(parentId)) {
          childrenOf.set(parentId, []);
        }
        childrenOf.get(parentId).push(element);
      }
    }
    
    if (debugMode) {
      logContainerHierarchy(childrenOf, byId);
    }
    
    return { byId, byName, childrenOf };
  }

  /**
   * 노드의 부모 ID를 찾음 (explicit parent 또는 qualified name 기반)
   * @param {Object} element - 노드 객체
   * @param {Map} byId - ID로 노드 찾는 맵
   * @param {Map} byName - 이름으로 노드 찾는 맵
   * @returns {string|null} 부모 ID
   */
  function findParentId(element, byId, byName) {
    let parentId = element.parent;
    
    // parent가 name으로 지정된 경우 id로 변환
    if (parentId && !byId.has(parentId)) {
      const parentByName = byName.get(parentId);
      if (parentByName) parentId = parentByName.id;
    }
    
    // parent가 없으면 qualified name으로 추론
    if (!parentId) {
      parentId = findQualifiedParent(element, byName);
    }
    
    return parentId;
  }

  /**
   * Qualified name을 기반으로 부모 노드 찾기
   * @param {Object} element - 노드 객체
   * @param {Map} byName - 이름으로 노드 찾는 맵
   * @returns {string|null} 부모 ID
   */
  function findQualifiedParent(element, byName) {
    if (!element || !element.name) return null;
    
    const parts = String(element.name).split(CONSTANTS.QUALIFIED_NAME_SEPARATOR);
    if (parts.length <= 1) return null;
    
    // 가장 긴 접두사부터 시도
    for (let i = parts.length - 1; i > 0; i--) {
      const prefix = parts.slice(0, i).join(CONSTANTS.QUALIFIED_NAME_SEPARATOR);
      const parent = byName.get(prefix);
      if (parent) return parent.id;
    }
    
    return null;
  }

  /**
   * 컨테이너 계층 구조 로깅
   * @param {Map} childrenOf - 자식 노드 맵
   * @param {Map} byId - ID로 노드 찾는 맵
   */
  function logContainerHierarchy(childrenOf, byId) {
    console.warn('[alignRanks] 📦 Container hierarchy:');
    for (const [parentId, children] of childrenOf) {
      const parentName = byId.get(parentId)?.name || parentId;
      const parentType = byId.get(parentId)?.type || '?';
      console.warn(
        `  📦 Container "${parentName}" (${parentId}, type: ${parentType}): ${children.length} children`,
        children.map(child => child.name)
      );
    }
  }

  /**
   * 개별 컨테이너의 노드 정렬 처리
   * @param {string} parentId - 부모 ID
   * @param {Array} children - 자식 노드 배열
   * @param {Object} diagramData - 다이어그램 데이터
   * @param {Map} byId - ID로 노드 찾는 맵
   * @param {Map} childrenOf - 자식 노드 맵
   * @param {boolean} debugMode - 디버그 모드
   * @param {boolean} preserveElkSpacing - ELK spacing 존중 여부
   * @returns {number} 정렬된 노드 수
   */
  function processContainerAlignment(parentId, children, diagramData, byId, childrenOf, debugMode, preserveElkSpacing) {
    if (debugMode) {
      console.log(
        `[alignRanks] Processing container ${parentId} with ${children.length} children:`,
        children.map(child => child.name)
      );
    }

    const { rank, nodesInFlow } = computeTopologicalRanks(children, diagramData, byId, debugMode);
    
    if (rank.size === 0) {
      if (debugMode) console.log(`[alignRanks] No control flow edges found in container ${parentId}`);
      return 0;
    }

    const alignedCount = alignNodesByRank(children, rank, nodesInFlow, childrenOf, debugMode, preserveElkSpacing);
    
    // Fork-Join 쌍 수평 중앙 정렬
    const forkJoinAligned = enforceForkJoinCentering(children, diagramData, byId, debugMode);
    
    return alignedCount + forkJoinAligned;
  }

  /**
   * 위상적 순위 계산 (Kahn's algorithm)
   * @param {Array} children - 자식 노드 배열
   * @param {Object} diagramData - 다이어그램 데이터
   * @param {Map} byId - ID로 노드 찾는 맵
   * @param {boolean} debugMode - 디버그 모드
   * @returns {Object} rank 맵과 control flow 참여 노드 집합
   */
  function computeTopologicalRanks(children, diagramData, byId, debugMode) {
    const childSet = new Set(children.map(child => child.id));
    const { indeg, adj, originalIndeg } = buildAdjacencyMaps(children, diagramData, childSet, byId, debugMode);
    
    // Kahn's algorithm으로 순위 계산
    const rank = new Map();
    const queue = [];
    
    // indegree가 0인 노드들로 초기화
    for (const childId of childSet) {
      if (indeg.get(childId) === 0) {
        queue.push(childId);
        rank.set(childId, 0);
      }
    }
    
    if (debugMode) {
      console.log(
        '[alignRanks] Initial queue (indegree=0):',
        queue.map(id => byId.get(id)?.name || id)
      );
    }

    // 위상 정렬 수행
    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentRank = rank.get(currentId) || 0;

      for (const neighborId of (adj.get(currentId) || [])) {
        // 각 노드의 rank는 선행 노드들의 최대 rank + 1
        const newRank = Math.max(currentRank + 1, rank.get(neighborId) || 0);
        rank.set(neighborId, newRank);
        
        indeg.set(neighborId, indeg.get(neighborId) - 1);
        if (indeg.get(neighborId) === 0) {
          queue.push(neighborId);
        }
      }
    }

    // 사이클 처리: ranked 노드에서 BFS로 unranked 후속 노드에 rank 전파
    const propagateQ = [];
    for (const childId of childSet) {
      if (rank.has(childId)) propagateQ.push(childId);
    }
    while (propagateQ.length > 0) {
      const u = propagateQ.shift();
      const ru = rank.get(u) || 0;
      for (const v of (adj.get(u) || [])) {
        if (!rank.has(v)) {
          rank.set(v, ru + 1);
          propagateQ.push(v);
        }
      }
    }
    
    if (debugMode) {
      console.log(
        '[alignRanks] Final ranks:',
        Array.from(rank.entries()).map(([id, r]) => `${byId.get(id)?.name || id}: ${r}`)
      );
    }

    // control flow에 참여하는 노드들 식별
    const nodesInFlow = new Set();
    for (const childId of childSet) {
      if ((adj.get(childId) || []).length > 0 || originalIndeg.get(childId) > 0) {
        nodesInFlow.add(childId);
      }
    }
    
    if (debugMode) {
      console.log(
        `[alignRanks] ${nodesInFlow.size} nodes participating in control flow:`,
        Array.from(nodesInFlow).map(id => byId.get(id)?.name || id)
      );
    }

    return { rank, nodesInFlow };
  }

  /**
   * 인접 맵들 생성 (성능 최적화를 위해 한 번에 처리)
   * @param {Array} children - 자식 노드 배열
   * @param {Object} diagramData - 다이어그램 데이터
   * @param {Set} childSet - 자식 노드 ID 집합
   * @param {Map} byId - ID로 노드 찾는 맵
   * @param {boolean} debugMode - 디버그 모드
   * @returns {Object} indeg, adj, originalIndeg 맵들
   */
  function buildAdjacencyMaps(children, diagramData, childSet, byId, debugMode) {
    const indeg = new Map();
    const adj = new Map();
    const originalIndeg = new Map();
    
    // 초기화
    for (const childId of childSet) {
      indeg.set(childId, 0);
      adj.set(childId, []);
      originalIndeg.set(childId, 0);
    }

    const connections = Array.isArray(diagramData.connections) ? diagramData.connections : [];
    let edgesChecked = 0;
    let edgesAdded = 0;

    // Fork 병렬 분기 감지: fork 후속 노드 간 flow 엣지는 순서 제약에서 제외
    const forkSuccessors = new Map();
    for (const conn of connections) {
      const k = String(conn.kind || conn.type || '').toLowerCase();
      if (!k.includes('succession') && !k.includes('then') && !k.includes('transition')) continue;
      const src = resolveNodeId(conn.source, byId, children);
      if (!src || !childSet.has(src)) continue;
      const srcNode = byId.get(src);
      const srcKind = String(srcNode?.kind || srcNode?.type || '').toLowerCase();
      if (!srcKind.includes('fork')) continue;
      const tgt = resolveNodeId(conn.target, byId, children);
      if (!tgt || !childSet.has(tgt)) continue;
      if (!forkSuccessors.has(src)) forkSuccessors.set(src, new Set());
      forkSuccessors.get(src).add(tgt);
    }
    function areForkSiblings(id1, id2) {
      for (const [, successors] of forkSuccessors) {
        if (successors.has(id1) && successors.has(id2)) return true;
      }
      return false;
    }
    
    for (const connection of connections) {
      edgesChecked++;
      const kind = String(connection.kind || connection.type || '').toLowerCase();
      
      // control flow 엣지만 필터링
      if (!CONSTANTS.CONTROL_FLOW_TYPES.some(type => kind.includes(type))) {
        continue;
      }
      
      const sourceId = resolveNodeId(connection.source, byId, children);
      const targetId = resolveNodeId(connection.target, byId, children);
      
      if (!sourceId || !targetId || sourceId === targetId || !childSet.has(sourceId) || !childSet.has(targetId)) {
        continue;
      }

      // fork 병렬 분기 간 flow 엣지는 순서 제약에서 제외
      if (kind.includes('flow') && areForkSiblings(sourceId, targetId)) {
        continue;
      }
      
      if (debugMode) {
        console.log(
          `[alignRanks] Found edge: ${connection.source} -> ${connection.target} (resolved: ${sourceId} -> ${targetId}, kind: ${kind})`
        );
      }
      
      adj.get(sourceId).push(targetId);
      indeg.set(targetId, indeg.get(targetId) + 1);
      originalIndeg.set(targetId, originalIndeg.get(targetId) + 1);
      edgesAdded++;
    }
    
    if (debugMode) {
      console.log(`[alignRanks] Checked ${edgesChecked} edges, added ${edgesAdded} control flow edges`);
    }
    
    return { indeg, adj, originalIndeg };
  }

  /**
   * 노드 ID 해석 (ID 또는 이름으로)
   * @param {string} ref - 참조 (ID 또는 이름)
   * @param {Map} byId - ID로 노드 찾는 맵
   * @param {Array} children - 자식 노드 배열
   * @returns {string|null} 해석된 ID
   */
  function resolveNodeId(ref, byId, children) {
    if (!ref) return null;
    if (byId.has(ref)) return ref;
    
    // 이름으로 찾기
    const byName = new Map(children.map(child => [child.name, child]));
    if (byName.has(ref)) return byName.get(ref).id;
    
    // Border node/port → 부모 노드로 해석
    let current = String(ref).trim();
    if (!current) return null;
    while (true) {
      const sepIdx = current.lastIndexOf(CONSTANTS.QUALIFIED_NAME_SEPARATOR);
      if (sepIdx <= 0) break;
      current = current.substring(0, sepIdx);
      if (byId.has(current)) return current;
      if (byName.has(current)) return byName.get(current).id;
    }
    
    // qualified name의 마지막 세그먼트로 찾기 (fallback)
    const refString = String(ref).trim();
    const lastSegment = refString.includes(CONSTANTS.QUALIFIED_NAME_SEPARATOR) 
      ? refString.split(CONSTANTS.QUALIFIED_NAME_SEPARATOR).pop() 
      : refString;
    
    for (const child of children) {
      if (String(child.name || '').toLowerCase().endsWith(CONSTANTS.QUALIFIED_NAME_SEPARATOR + lastSegment.toLowerCase())) {
        return child.id;
      }
    }
    
    return null;
  }

  /**
   * 순위별로 노드들을 정렬 (ELK spacing 고려)
   * @param {Array} children - 자식 노드 배열
   * @param {Map} rank - 순위 맵
   * @param {Set} nodesInFlow - control flow 참여 노드 집합
   * @param {Map} childrenOf - 자식 노드 맵
   * @param {boolean} debugMode - 디버그 모드
   * @param {boolean} preserveElkSpacing - ELK spacing 존중 여부
   * @returns {number} 정렬된 노드 수
   */
  function alignNodesByRank(children, rank, nodesInFlow, childrenOf, debugMode, preserveElkSpacing) {
    // 순위별로 노드 그룹화
    const ranks = new Map();
    for (const child of children) {
      const childRank = rank.get(child.id);
      if (childRank === undefined) continue;
      
      if (!ranks.has(childRank)) {
        ranks.set(childRank, []);
      }
      ranks.get(childRank).push(child);
    }
    
    let totalAlignedCount = 0;
    
    // 각 순위 그룹별로 정렬
    for (const [rankValue, nodes] of ranks) {
      if (!nodes || nodes.length < 2) continue;
      
      // control flow에 참여하는 노드만 필터링
      const flowNodes = nodes.filter(node => nodesInFlow.has(node.id));
      if (flowNodes.length < 2) {
        if (debugMode) {
          console.log(`[alignRanks] Skipping rank ${rankValue}: only ${flowNodes.length} nodes in control flow`);
        }
        continue;
      }
      
      totalAlignedCount += alignRankGroup(flowNodes, childrenOf, debugMode, preserveElkSpacing);
    }
    
    return totalAlignedCount;
  }

  /**
   * 특정 순위 그룹의 노드들을 정렬 (ELK spacing 고려)
   * @param {Array} flowNodes - 정렬할 노드 배열
   * @param {Map} childrenOf - 자식 노드 맵
   * @param {boolean} debugMode - 디버그 모드
   * @param {boolean} preserveElkSpacing - ELK spacing 존중 여부
   * @returns {number} 정렬된 노드 수
   */
  function alignRankGroup(flowNodes, childrenOf, debugMode, preserveElkSpacing) {
    if (debugMode) {
      console.log(
        `[alignRanks] Aligning nodes:`,
        flowNodes.map(node => `${node.name}(y=${node.y})`)
      );
    }
    
    // Y 좌표 계산
    const yCoordinates = flowNodes.map(node => Number(node.y || 0));
    let targetY = Math.round(yCoordinates.reduce((sum, y) => sum + y, 0) / yCoordinates.length);
    
    // ELK spacing을 존중하는 경우: 허용 오차 범위 내에서만 정렬
    if (preserveElkSpacing) {
      const minY = Math.min(...yCoordinates);
      const maxY = Math.max(...yCoordinates);
      const spread = maxY - minY;
      
      // 이미 ELK가 적절히 간격을 둔 경우 정렬하지 않음
      if (spread <= CONSTANTS.ELK_SPACING_TOLERANCE) {
        if (debugMode) {
          console.log(
            `[alignRanks] Skipping alignment - ELK spacing preserved (spread=${spread}px <= tolerance=${CONSTANTS.ELK_SPACING_TOLERANCE}px)`
          );
        }
        return 0;
      }
      
      // 허용 오차를 고려한 목표 Y 좌표 계산
      targetY = Math.round(minY + spread / 2);
    }
    
    if (debugMode) {
      console.log(
        `[alignRanks] Setting targetY=${targetY} (mean of ${yCoordinates.join(', ')})`,
        preserveElkSpacing ? `(ELK spacing preserved)` : `(forced alignment)`
      );
    }
    
    let alignedCount = 0;
    
    for (const node of flowNodes) {
      if (node.y !== targetY) {
        const deltaY = targetY - node.y;
        
        if (debugMode) {
          console.log(`[alignRanks] Moving ${node.name} from y=${node.y} to y=${targetY}`);
        }
        
        node.y = targetY;
        alignedCount++;
        
        // 컨테이너의 자식 노드들도 함께 이동
        moveChildrenOfNode(node, deltaY, childrenOf, debugMode);
      }
    }
    
    return alignedCount;
  }

  /**
   * Fork-Join 쌍의 수평 중앙 정렬
   * Fork 노드와 대응하는 Join 노드의 X 좌표를 일치시킴
   */
  function enforceForkJoinCentering(children, diagramData, byId, debugMode) {
    const childSet = new Set(children.map(c => c.id));
    const succOut = new Map();
    const succIn = new Map();
    for (const cid of childSet) { succOut.set(cid, []); succIn.set(cid, []); }
    
    const connections = Array.isArray(diagramData.connections) ? diagramData.connections : [];
    for (const conn of connections) {
      const kind = String(conn.kind || conn.type || '').toLowerCase();
      if (!kind.includes('succession') && !kind.includes('control') && !kind.includes('then')) continue;
      const src = resolveNodeId(conn.source, byId, children);
      const tgt = resolveNodeId(conn.target, byId, children);
      if (!src || !tgt || src === tgt || !childSet.has(src) || !childSet.has(tgt)) continue;
      succOut.get(src).push(tgt);
      succIn.get(tgt).push(src);
    }
    
    let count = 0;
    for (const child of children) {
      const role = String(child.role || '').toLowerCase();
      const type = String(child.type || '').toLowerCase();
      const outs = succOut.get(child.id) || [];
      if (!(role === 'fork' || type.includes('fork')) || outs.length < 2) continue;
      
      // fork의 분기들에서 수렴하는 join 노드 탐색
      const joinId = findJoinForFork(outs, succOut, succIn, childSet, children);
      if (!joinId) continue;
      
      const joinNode = byId.get(joinId);
      if (!joinNode) continue;
      
      const forkCX = (child.x || 0) + (child.width || 0) / 2;
      const joinCX = (joinNode.x || 0) + (joinNode.width || 0) / 2;
      const dx = forkCX - joinCX;
      if (Math.abs(dx) > 5) {
        joinNode.x = (joinNode.x || 0) + dx;
        count++;
        if (debugMode) {
          console.log(`[alignRanks] Fork-Join centering: ${child.name} -> ${joinNode.name}, dx=${Math.round(dx)}`);
        }
      }
    }
    return count;
  }

  /**
   * Fork의 분기들이 공통으로 수렴하는 Join 노드 탐색 (BFS)
   */
  function findJoinForFork(branches, succOut, succIn, nodeSet, children) {
    const visited = new Set();
    const queue = [...branches];
    while (queue.length > 0) {
      const curr = queue.shift();
      if (visited.has(curr)) continue;
      visited.add(curr);
      for (const next of (succOut.get(curr) || [])) {
        if (!nodeSet.has(next)) continue;
        const ins = succIn.get(next) || [];
        if (ins.length >= 2) {
          const node = children.find(c => c.id === next);
          const r = String(node?.role || '').toLowerCase();
          const t = String(node?.type || '').toLowerCase();
          if (r === 'join' || t.includes('join') || ins.length >= branches.length) return next;
        }
        if (!visited.has(next)) queue.push(next);
      }
    }
    return null;
  }

  /**
   * 노드의 자식들을 함께 이동
   * @param {Object} node - 이동할 노드
   * @param {number} deltaY - Y 좌표 변화량
   * @param {Map} childrenOf - 자식 노드 맵
   * @param {boolean} debugMode - 디버그 모드
   */
  function moveChildrenOfNode(node, deltaY, childrenOf, debugMode) {
    const children = childrenOf.get(node.id) || [];
    if (children.length === 0) return;
    
    if (debugMode) {
      console.log(`[alignRanks]   Moving ${children.length} children of ${node.name} by deltaY=${deltaY}`);
    }
    
    for (const child of children) {
      child.y = (child.y || 0) + deltaY;
      
      if (debugMode) {
        console.log(
          `[alignRanks]     ${child.name}: y=${child.y - deltaY} -> y=${child.y}`
        );
      }
    }
  }
})();
