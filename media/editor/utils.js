/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * ********************************************************************************/
(function() {
  const ns = (window.SELAB = window.SELAB || {});
  ns.Editor = ns.Editor || {};

  function byIdOrName(list, ref) {
    if (!ref) return null;
    for (const e of list) { if (e.id === ref || e.name === ref) return e; }
    return null;
  }

  function computeChildrenMap(elements) {
    const map = new Map();
    for (const e of elements) {
      if (!e.parent) continue;
      if (!map.has(e.parent)) map.set(e.parent, []);
      map.get(e.parent).push(e.id);
    }
    return map;
  }

  function isRelationshipNode(node) {
    if (!node) return false;
    const t = String(node.type || '').toLowerCase();
    const n = String(node.name || '').toLowerCase();
    // Treat membership-like constructs as relationships (not primary boxes)
    if (t.includes('membership')) return true;
    if (n.startsWith('owning membership')) return true;
    return false;
  }

  function normalizeSelectionName(raw) {
    if (!raw) return raw;
    const s = String(raw).trim();
    const lower = s.toLowerCase();
    if (lower.startsWith('owning membership')) {
      // e.g., "owning membership Camera224" -> "Camera224"
      return s.substring('owning membership'.length).trim();
    }
    return s;
  }

  function shouldShowStereotypesInUi() {
    return ns.Editor?.config?.displaySettings?.labels?.showStereotypes !== false;
  }

  function getStereotypeText(s) {
    if (!shouldShowStereotypesInUi()) return '';
    const t = String(s || '').toLowerCase().replace(/\s+/g, '');
    
    // Definition 타입 (23종)
    const definitionKeywords = {
      'actiondefinition': 'action def',
      'allocationdefinition': 'allocation def',
      'attributedefinition': 'attribute def',
      'calculationdefinition': 'calc def',
      'casedefinition': 'case def',
      'concerndefinition': 'concern def',
      'connectiondefinition': 'connection def',
      'constraintdefinition': 'constraint def',
      'definition': 'def',
      'enumerationdefinition': 'enum def',
      'flowconnectiondefinition': 'flow def',
      'interfacedefinition': 'interface def',
      'itemdefinition': 'item def',
      'metadatadefinition': 'metadata def',
      'occurrencedefinition': 'occurrence def',
      'partdefinition': 'part def',
      'portdefinition': 'port def',
      'renderingdefinition': 'rendering def',
      'requirementdefinition': 'requirement def',
      'statedefinition': 'state def',
      'usecasedefinition': 'use case def',
      'verificationcasedefinition': 'verification def',
      'viewdefinition': 'view def',
      'viewpointdefinition': 'viewpoint def',
    };
    
    // Usage 타입 (28종)
    const usageKeywords = {
      'actorusage': 'actor',
      'acceptactionusage': 'accept',
      'actionusage': 'action',
      'allocationusage': 'allocation',
      'analysiscaseusage': 'analysis',
      'assertconstraintusage': 'assert',
      'assignmentactionusage': 'assign',
      'attributeusage': 'attribute',
      'calculationusage': 'calc',
      'caseusage': 'case',
      'concernusage': 'concern',
      'connectionusage': 'connection',
      'constraintusage': 'constraint',
      'enumerationusage': 'enum',
      'eventoccurrenceusage': 'event occurrence',
      'exhibitstateusage': 'exhibit',
      'flowconnectionusage': 'flow',
      'ifactionusage': 'if',
      'elseifaction': 'else if',
      'elseaction': 'else',
      'whileloopactionusage': 'loop',
      'forloopactionusage': 'loop',
      'includeusecaseusage': 'include',
      'interfaceusage': 'interface',
      'itemusage': 'item',
      'metadatausage': 'metadata',
      'occurrenceusage': 'occurrence',
      'partusage': 'part',
      'performactionusage': 'perform',
      'portusage': 'port',
      'referenceusage': 'ref',
      'renderingusage': 'rendering',
      'requirementusage': 'requirement',
      'satisfyrequirementusage': 'satisfy',
      'sendactionusage': 'send',
      'stateusage': 'state',
      'terminateactionusage': 'terminate',
      'usage': 'usage',
      'usecaseusage': 'use case',
      'verificationcaseusage': 'verification',
      'viewusage': 'view',
      'viewpointusage': 'viewpoint',
    };
    
    // 특수 케이스 - 키워드 표시하지 않음
    if (t === 'documentation' || t === 'comment') return '';

    // Block editor 전용 타입 — stereotype 표시하지 않음
    const blockUsageTypes = new Set([
      'partusage', 'packageusage', 'portusage', 'interfaceusage', 'usecaseusage',
    ]);
    if (blockUsageTypes.has(t) || t === 'package' || t === 'librarypackage') {
      return '';
    }

    // Definition 확인
    if (definitionKeywords[t]) {
      return `\u00AB${definitionKeywords[t]}\u00BB`;
    }

    // Usage 확인
    if (usageKeywords[t]) {
      return `\u00AB${usageKeywords[t]}\u00BB`;
    }

    // 매칭되지 않으면 원본 타입 반환
    return s ? `\u00AB${s}\u00BB` : '';
  }

  /**
   * Canvas API를 사용하여 텍스트의 실제 픽셀 폭 측정
   * @param {string} text - 측정할 텍스트
   * @param {string} font - CSS font 문자열 (예: '12px sans-serif')
   * @returns {number} 텍스트의 픽셀 폭
   */
  function measureTextWidth(text, font = '12px sans-serif') {
    if (!text) return 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = font;
    return ctx.measureText(String(text)).width;
  }

  /**
   * 텍스트를 최대 폭에 맞춰 단어 단위로 줄바꿈
   * @param {string} text - 원본 텍스트
   * @param {number} maxWidth - 최대 픽셀 폭
   * @param {string} font - CSS font 문자열
   * @returns {string[]} 줄바꿈된 텍스트 배열
   */
  function wrapTextToWidth(text, maxWidth, font = '12px sans-serif') {
    if (!text) return [''];
    const textStr = String(text);
    
    // 이미 줄바꿈이 있으면 각 줄을 개별 처리
    const existingLines = textStr.split('\n');
    const result = [];
    
    for (const line of existingLines) {
      if (!line.trim()) {
        result.push('');
        continue;
      }
      
      const lineWidth = measureTextWidth(line, font);
      if (lineWidth <= maxWidth) {
        result.push(line);
        continue;
      }
      
      // 단어 단위로 줄바꿈
      const words = line.split(/\s+/);
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = measureTextWidth(testLine, font);
        
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            result.push(currentLine);
          }
          currentLine = word;
        }
      }
      
      if (currentLine) {
        result.push(currentLine);
      }
    }
    
    return result.length > 0 ? result : [''];
  }

  /**
   * 줄바꿈된 텍스트 배열에서 가장 긴 줄의 폭 계산
   * @param {string[]} lines - 텍스트 줄 배열
   * @param {string} font - CSS font 문자열
   * @returns {number} 최대 폭 (픽셀)
   */
  function getMaxLineWidth(lines, font = '12px sans-serif') {
    if (!Array.isArray(lines) || lines.length === 0) return 0;
    let maxWidth = 0;
    for (const line of lines) {
      const width = measureTextWidth(line, font);
      if (width > maxWidth) maxWidth = width;
    }
    return maxWidth;
  }

  // Canvas-based word wrapping given a pixel width and font string
  function wrapByWidth(text) {
    // SELab: 텍스트 강제 줄바꿈 제거 - ELK에서 폭을 결정하도록 위임
    return [String(text ?? '')];
  }

  /**
   * visibility 값을 UML 기호로 변환
   * @param {string} visibility - 'private' | 'protected' | 'public' | undefined
   * @returns {string} UML visibility 기호 ('-', '#', '+', '')
   */
  function getVisibilitySymbol(visibility) {
    if (!visibility) return '';
    switch (visibility) {
      case 'private': return '-';
      case 'protected': return '#';
      case 'public': return '+';
      default: return '';
    }
  }

  ns.Editor.utils = { 
    byIdOrName, 
    computeChildrenMap, 
    isRelationshipNode, 
    normalizeSelectionName, 
    shouldShowStereotypesInUi,
    getStereotypeText, 
    wrapByWidth, 
    getVisibilitySymbol,
    measureTextWidth,
    wrapTextToWidth,
    getMaxLineWidth
  };
})();
