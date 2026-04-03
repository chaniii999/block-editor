/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxStyleManager.js - SysML 요소별 mxGraph 스타일 정의
 *
 * 의존 모듈:
 * - MxStyleColors.js: 색상/스타일 상수
 * - MxStyleShapes.js: 커스텀 shape/marker 등록
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.styles = ns.MxGraph.styles || {};

    function log(prefix, ...args) {
        try {
            console.log(`[MxStyleManager] ${prefix}`, ...args);
        } catch (_) {}
    }

    // 색상/shape 모듈 참조
    function getColors() {
        return ns.MxGraph.styleColors || {};
    }
    function getShapes() {
        return ns.MxGraph.styleShapes || {};
    }

    /**
     * 요소 타입에 따른 스타일 문자열 생성
     * @param {string} elementType - SysML 요소 타입
     * @param {Object} [nodeData] - 노드 데이터 (사용자 지정 색상 포함)
     * @returns {string} mxGraph 스타일 문자열
     */
    function getVertexStyle(elementType, nodeData) {
        const SYSML_COLORS = getColors().SYSML_COLORS || {};
        const typeLower = String(elementType || '').toLowerCase().replace(/\s+/g, '');
        const baseColors = SYSML_COLORS[typeLower] || SYSML_COLORS.default || { fill: '#ffffff', stroke: '#000000', font: '#000000' };
        
        const colors = {
            fill:   (nodeData?.fillColor)   || baseColors.fill,
            stroke: (nodeData?.strokeColor) || baseColors.stroke,
            font:   baseColors.font,
        };

        // Comment/Documentation/Metadata는 노트 모양
        if (typeLower === 'comment' || typeLower === 'documentation' || typeLower === 'metadatausage') {
            return [
                'shape=note',
                'whiteSpace=wrap',
                'html=1',
                `fillColor=${colors.fill}`,
                `strokeColor=${colors.stroke}`,
                `fontColor=${colors.font}`,
                'fontSize=11',
                'strokeWidth=1',
                'align=left',
                'verticalAlign=top',
                'spacingLeft=12',
                'spacingRight=12',
                'spacingTop=10',
                'spacingBottom=10'
            ].join(';');
        }

        // Package: 둥근 모서리 컨테이너
        if (typeLower === 'package' || typeLower === 'librarypackage') {
            return [
                'shape=swimlane',
                'startSize=28',
                'horizontal=1',
                `swimlaneFillColor=${getColors().getSwimlaneFillColor?.() || '#f9fafb'}`,
                'whiteSpace=wrap',
                'html=1',
                'overflow=fill',
                `fillColor=${colors.fill}`,
                `strokeColor=${colors.stroke}`,
                `fontColor=${colors.font}`,
                'fontSize=13',
                'fontStyle=1',
                'align=left',
                'verticalAlign=top',
                'spacingLeft=8',
                'rounded=1',
                'arcSize=8',
                'shadow=0',
                'childLayout=stackLayout',
                'resizeParent=1',
                'resizeLast=0',
                'collapsible=0'
            ].join(';');
        }

        // StartAction (InitialNode)
        if (typeLower === 'startaction' || typeLower === 'initialnode') {
            return [
                'shape=ellipse',
                'whiteSpace=wrap',
                'html=1',
                'fillColor=#000000',
                'strokeColor=#000000',
                'perimeter=ellipsePerimeter'
            ].join(';');
        }

        // DoneAction (FinalNode)
        if (typeLower === 'doneaction' || typeLower === 'finalnode') {
            return [
                'shape=doubleCircle',
                'whiteSpace=wrap',
                'html=1',
                'fillColor=#000000',
                'strokeColor=#000000',
                'perimeter=ellipsePerimeter'
            ].join(';');
        }

        // ActorUsage
        if (typeLower === 'actorusage') {
            return [
                'shape=actorStickman',
                'whiteSpace=wrap',
                'html=1',
                'overflow=fill',
                `fillColor=${colors.fill}`,
                `strokeColor=${colors.stroke}`,
                `fontColor=${colors.font}`,
                'fontSize=12',
                'strokeWidth=1',
                'rounded=1',
                'absoluteArcSize=1',
                'arcSize=18',
                'align=center',
                'verticalAlign=middle',
            ].join(';');
        }

        // 모든 노드에 둥근 모서리 적용 (디자인 가이드)
        const style = [
            'rounded=1',
            'whiteSpace=wrap',
            'html=1',
            `fillColor=${colors.fill}`,
            `strokeColor=${colors.stroke}`,
            `fontColor=${colors.font}`,
            'fontSize=13',
            'strokeWidth=1',
            'align=center',
            'verticalAlign=middle',
            'arcSize=12',
            'shadow=0'
        ];

        // Definition 타입: 직각에 가까운 모서리
        const isDefinition = typeLower.endsWith('definition');
        if (isDefinition) {
            style.push('absoluteArcSize=1');
            // Definition은 약간 작은 radius
            style[style.indexOf('arcSize=12')] = 'arcSize=8';
        }

        // Usage 타입: 더 둥근 모서리
        const isUsage = typeLower.endsWith('usage');
        if (isUsage && !isDefinition) {
            style.push('absoluteArcSize=1');
            style[style.indexOf('arcSize=12')] = 'arcSize=14';
        }

        return style.join(';');
    }

    /**
     * 엣지 타입에 따른 스타일 문자열 생성
     * @param {string} edgeType - 엣지 타입
     * @returns {string} mxGraph 스타일 문자열
     */
    function getEdgeStyle(edgeType) {
        const EDGE_STYLES = getColors().EDGE_STYLES || {};
        const typeLower = String(edgeType || '').toLowerCase().replace(/\s+/g, '');
        
        let normalizedType = typeLower;
        if (typeLower.includes('binding')) {
            normalizedType = 'binding';
        }
        
        const edgeConfig = EDGE_STYLES[normalizedType] || EDGE_STYLES[typeLower] || EDGE_STYLES.default || { stroke: '#000000', dashed: false, arrow: 'classic' };

        const style = [
            'edgeStyle=orthogonalEdgeStyle',
            'rounded=1',
            'orthogonalLoop=1',
            'jettySize=auto',
            'html=1',
            `strokeColor=${edgeConfig.stroke}`,
            'strokeWidth=1.5',
            `dashed=${edgeConfig.dashed ? '1' : '0'}`,
            'verticalLabelPosition=bottom',
            'verticalAlign=top',
            'labelBackgroundColor=none'
        ];

        if (edgeConfig.startArrow !== undefined) {
            style.push(`startArrow=${edgeConfig.startArrow}`);
        } else {
            style.push('startArrow=none');
        }
        
        if (edgeConfig.startFill !== undefined) {
            style.push(`startFill=${edgeConfig.startFill}`);
        }
        
        if (edgeConfig.startSize !== undefined) {
            style.push(`startSize=${edgeConfig.startSize}`);
        }

        if (edgeConfig.arrow !== undefined) {
            style.push(`endArrow=${edgeConfig.arrow}`);
        } else {
            style.push('endArrow=none');
        }

        if (edgeConfig.endFill !== undefined) {
            style.push(`endFill=${edgeConfig.endFill}`);
        }
        
        if (edgeConfig.endSize !== undefined) {
            style.push(`endSize=${edgeConfig.endSize}`);
        }

        return style.join(';');
    }

    /**
     * 그래프에 SysML 스타일 등록
     * @param {mxGraph} graph
     */
    function registerStyles(graph) {
        if (!graph) return;

        const shapes = getShapes();
        const colors = getColors();
        const SYSML_COLORS = colors.SYSML_COLORS || {};
        const EDGE_STYLES = colors.EDGE_STYLES || {};

        // 커스텀 shape/marker 등록
        if (typeof shapes.registerCustomShapes === 'function') {
            shapes.registerCustomShapes();
        }
        if (typeof shapes.registerCustomMarkers === 'function') {
            shapes.registerCustomMarkers();
        }

        const stylesheet = graph.getStylesheet();

        // 각 요소 타입별 스타일 등록
        Object.keys(SYSML_COLORS).forEach(typeName => {
            if (typeName !== 'default') {
                stylesheet.putCellStyle(typeName, parseStyle(getVertexStyle(typeName)));
            }
        });

        // 각 엣지 타입별 스타일 등록
        Object.keys(EDGE_STYLES).forEach(typeName => {
            if (typeName !== 'default') {
                stylesheet.putCellStyle(`edge_${typeName}`, parseStyle(getEdgeStyle(typeName)));
            }
        });

        log('SysML 스타일 등록 완료. 버텍스:', Object.keys(SYSML_COLORS).length, '엣지:', Object.keys(EDGE_STYLES).length);
    }

    /**
     * 스타일 문자열을 객체로 파싱
     * @param {string} styleString
     * @returns {Object}
     */
    function parseStyle(styleString) {
        const result = {};
        const parts = styleString.split(';');
        parts.forEach(part => {
            const [key, value] = part.split('=');
            if (key && value !== undefined) {
                result[key] = value;
            }
        });
        return result;
    }

    /**
     * VS Code 테마에 따른 색상 조정
     * @param {string} theme - 'light' 또는 'dark'
     */
    function applyTheme(theme) {
        if (typeof mxConstants === 'undefined') return;

        if (theme === 'dark') {
            mxConstants.HANDLE_FILLCOLOR = '#29b6f2';
            mxConstants.HANDLE_STROKECOLOR = '#0088cf';
            mxConstants.VERTEX_SELECTION_COLOR = '#00a8ff';
            mxConstants.EDGE_SELECTION_COLOR = '#00a8ff';
            mxConstants.OUTLINE_COLOR = '#00a8ff';
            mxConstants.GUIDE_COLOR = '#0088cf';
            mxConstants.HIGHLIGHT_OPACITY = 30;
        } else {
            mxConstants.HANDLE_FILLCOLOR = '#ffffff';
            mxConstants.HANDLE_STROKECOLOR = '#00a8ff';
            mxConstants.VERTEX_SELECTION_COLOR = '#00a8ff';
            mxConstants.EDGE_SELECTION_COLOR = '#00a8ff';
            mxConstants.OUTLINE_COLOR = '#00a8ff';
            mxConstants.GUIDE_COLOR = '#0088cf';
            mxConstants.HIGHLIGHT_OPACITY = 60;
        }

        log('테마 적용:', theme);
    }

    // 모듈 export (하위 호환성 유지)
    const colors = getColors();
    ns.MxGraph.styles.SYSML_COLORS = colors.SYSML_COLORS;
    ns.MxGraph.styles.EDGE_STYLES = colors.EDGE_STYLES;
    ns.MxGraph.styles.getVertexStyle = getVertexStyle;
    ns.MxGraph.styles.getEdgeStyle = getEdgeStyle;
    ns.MxGraph.styles.registerStyles = registerStyles;
    ns.MxGraph.styles.applyTheme = applyTheme;

    log('MxStyleManager 모듈 로드 완료');
})();
