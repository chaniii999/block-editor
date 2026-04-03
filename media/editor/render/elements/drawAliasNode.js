/********************************************************************************
 * Copyright: SELab.AI (c) 2026
 ********************************************************************************/

(function() {
    'use strict';
    
    const ns = window.SELAB || (window.SELAB = {});
    ns.Editor = ns.Editor || {};
    ns.Editor.render = ns.Editor.render || {};
    ns.Editor.render.elements = ns.Editor.render.elements || {};
    
    /**
     * Alias 노드를 렌더링합니다.
     * SysML v2 표준: «alias» 별칭이름 for 원본요소이름
     * 
     * @param {Object} graph - mxGraph 인스턴스
     * @param {Object} parent - 부모 셀
     * @param {Object} node - 노드 데이터
     * @param {number} x - X 좌표
     * @param {number} y - Y 좌표
     * @returns {Object} 생성된 mxCell
     */
    function drawAliasNode(graph, parent, node, x, y) {
        const width = 150;
        const height = 80;
        
        // 라벨 구성
        const label = node.label || `«alias»\n${node.name}\nfor ${node.targetName || 'Unknown'}`;
        
        // 스타일 설정
        const style = [
            'shape=rectangle',
            'rounded=1',
            'fillColor=#FFFACD',  // 연한 노란색
            'strokeColor=#000000',
            'strokeWidth=1',
            'fontFamily=Arial',
            'fontSize=11',
            'fontColor=#000000',
            'align=center',
            'verticalAlign=middle',
            'spacingTop=4',
            'spacingBottom=4'
        ].join(';');
        
        // 셀 생성
        const cell = graph.insertVertex(
            parent,
            node.id,
            label,
            x,
            y,
            width,
            height,
            style
        );
        
        // 메타데이터 저장
        cell.nodeData = node;
        
        console.log('[drawAliasNode] Rendered:', node.name);
        return cell;
    }
    
    ns.Editor.render.elements.drawAliasNode = drawAliasNode;
})();
