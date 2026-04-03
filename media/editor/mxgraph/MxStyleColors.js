/* ********************************************************************************
 * Copyright: SELab.AI (c) 2025
 * MxStyleColors.js - 블록 에디터 전용 색상 및 엣지 스타일 정의
 * VSCode 테마 자동 감지 (body.vscode-dark / body.vscode-light)
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.styleColors = ns.MxGraph.styleColors || {};

    // ═══════════════════════════════════════════════════════════════
    // 라이트 테마 색상
    // ═══════════════════════════════════════════════════════════════
    // 디자인 가이드 색상: 모노톤 회색 계열
    const LIGHT_NODE = { fill: '#ffffff', stroke: '#e0e0e0', font: '#333333' };
    const LIGHT_CONTAINER = { fill: '#f5f5f5', stroke: '#e0e0e0', font: '#333333' };
    const LIGHT_COLORS = {
        partDefinition:        LIGHT_CONTAINER,
        actionDefinition:      LIGHT_CONTAINER,
        requirementDefinition: LIGHT_CONTAINER,
        stateDefinition:       LIGHT_CONTAINER,
        portDefinition:        LIGHT_NODE,
        interfaceDefinition:   LIGHT_CONTAINER,
        useCaseDefinition:     LIGHT_CONTAINER,
        attributeDefinition:   LIGHT_NODE,

        partUsage:        LIGHT_NODE,
        actionUsage:      LIGHT_NODE,
        requirementUsage: LIGHT_NODE,
        stateUsage:       LIGHT_NODE,
        portUsage:        LIGHT_NODE,
        interfaceUsage:   LIGHT_NODE,
        useCaseUsage:     LIGHT_NODE,
        attributeUsage:   LIGHT_NODE,

        package:       { fill: '#f0f0f0', stroke: '#e0e0e0', font: '#333333' },
        librarypackage:{ fill: '#f0f0f0', stroke: '#e0e0e0', font: '#333333' },
        comment:       { fill: '#fafafa', stroke: '#e0e0e0', font: '#666666' },
        metadatausage: { fill: '#fafafa', stroke: '#e0e0e0', font: '#666666' },
        constraint:    { fill: '#fafafa', stroke: '#e0e0e0', font: '#666666' },
        default:       LIGHT_NODE,
    };

    // 디자인 가이드: 연한 회색 엣지
    const LE = '#bdbdbd';
    const LD = '#d0d0d0';
    const LIGHT_EDGES = {
        containment:    { stroke: LD, dashed: false, arrow: 'none' },
        composition:    { stroke: LE, dashed: false, startArrow: 'compositionDiamond', startFill: 1, startSize: 7 },
        shared:         { stroke: LE, dashed: false, startArrow: 'compositionDiamond', startFill: 0, startSize: 7 },
        dependency:     { stroke: LD, dashed: true, arrow: 'open' },
        generalization: { stroke: LE, dashed: false, arrow: 'block', endFill: 0 },
        inheritance:    { stroke: LE, dashed: false, arrow: 'block', endFill: 0 },
        redefinition:   { stroke: LE, dashed: false, arrow: 'closedArrowWithVerticalBar', endFill: 0 },
        featuretyping:  { stroke: LE, dashed: false, arrow: 'closedArrowWithDots', endFill: 0 },
        subsetting:     { stroke: LE, dashed: false, arrow: 'block', endFill: 0 },
        specialization: { stroke: LE, dashed: false, arrow: 'block', endFill: 0 },
        realization:    { stroke: LE, dashed: true, arrow: 'block', endFill: 0 },
        association:    { stroke: LE, dashed: false, arrow: 'none' },
        connector:      { stroke: LE, dashed: false, arrow: 'classic' },
        allocation:     { stroke: LD, dashed: true, arrow: 'open' },
        flow:           { stroke: LE, dashed: false, arrow: 'classic' },
        succession:     { stroke: LE, dashed: false, arrow: 'open' },
        message:        { stroke: LE, dashed: true, arrow: 'classic' },
        eventreference: { stroke: LE, dashed: false, arrow: 'open' },
        referencesubsetting: { stroke: LE, dashed: false, arrow: 'open' },
        annotation:     { stroke: LD, dashed: true, arrow: 'none' },
        comment:        { stroke: LD, dashed: true, arrow: 'none' },
        connection:     { stroke: LE, dashed: false, arrow: 'none' },
        binding:        { stroke: LE, dashed: false, arrow: 'none' },
        membershipimport:  { stroke: LD, dashed: true, arrow: 'open' },
        namespaceimport:   { stroke: LD, dashed: true, arrow: 'open' },
        import:            { stroke: LD, dashed: true, arrow: 'open' },
        membershipexpose:  { stroke: LD, dashed: true, arrow: 'open' },
        namespaceexpose:   { stroke: LD, dashed: true, arrow: 'open' },
        expose:            { stroke: LD, dashed: true, arrow: 'open' },
        default:           { stroke: LE, dashed: false, arrow: 'classic' },
    };

    // ═══════════════════════════════════════════════════════════════
    // 다크 테마 색상
    // ═══════════════════════════════════════════════════════════════
    // 다크 테마: 모노톤 (라이트의 반전)
    const DARK_NODE = { fill: '#2d2d2d', stroke: '#4a4a4a', font: '#e0e0e0' };
    const DARK_CONTAINER = { fill: '#252525', stroke: '#4a4a4a', font: '#e0e0e0' };
    const DARK_COLORS = {
        partDefinition:        DARK_CONTAINER,
        actionDefinition:      DARK_CONTAINER,
        requirementDefinition: DARK_CONTAINER,
        stateDefinition:       DARK_CONTAINER,
        portDefinition:        DARK_NODE,
        interfaceDefinition:   DARK_CONTAINER,
        useCaseDefinition:     DARK_CONTAINER,
        attributeDefinition:   DARK_NODE,

        partUsage:        DARK_NODE,
        actionUsage:      DARK_NODE,
        requirementUsage: DARK_NODE,
        stateUsage:       DARK_NODE,
        portUsage:        DARK_NODE,
        interfaceUsage:   DARK_NODE,
        useCaseUsage:     DARK_NODE,
        attributeUsage:   DARK_NODE,

        package:       { fill: '#1e1e1e', stroke: '#4a4a4a', font: '#d0d0d0' },
        librarypackage:{ fill: '#1e1e1e', stroke: '#4a4a4a', font: '#d0d0d0' },
        comment:       { fill: '#2a2a2a', stroke: '#4a4a4a', font: '#999999' },
        metadatausage: { fill: '#2a2a2a', stroke: '#4a4a4a', font: '#999999' },
        constraint:    { fill: '#2a2a2a', stroke: '#4a4a4a', font: '#999999' },
        default:       DARK_NODE,
    };

    const DE = '#666666';
    const DD = '#555555';
    const DARK_EDGES = {
        containment:    { stroke: DD, dashed: false, arrow: 'none' },
        composition:    { stroke: DE, dashed: false, startArrow: 'compositionDiamond', startFill: 1, startSize: 7 },
        shared:         { stroke: DE, dashed: false, startArrow: 'compositionDiamond', startFill: 0, startSize: 7 },
        dependency:     { stroke: DD, dashed: true, arrow: 'open' },
        generalization: { stroke: DE, dashed: false, arrow: 'block', endFill: 0 },
        inheritance:    { stroke: DE, dashed: false, arrow: 'block', endFill: 0 },
        redefinition:   { stroke: DE, dashed: false, arrow: 'closedArrowWithVerticalBar', endFill: 0 },
        featuretyping:  { stroke: DE, dashed: false, arrow: 'closedArrowWithDots', endFill: 0 },
        subsetting:     { stroke: DE, dashed: false, arrow: 'block', endFill: 0 },
        specialization: { stroke: DE, dashed: false, arrow: 'block', endFill: 0 },
        realization:    { stroke: DE, dashed: true, arrow: 'block', endFill: 0 },
        association:    { stroke: DE, dashed: false, arrow: 'none' },
        connector:      { stroke: DE, dashed: false, arrow: 'classic' },
        allocation:     { stroke: DD, dashed: true, arrow: 'open' },
        flow:           { stroke: DE, dashed: false, arrow: 'classic' },
        succession:     { stroke: DE, dashed: false, arrow: 'open' },
        message:        { stroke: DE, dashed: true, arrow: 'classic' },
        eventreference: { stroke: DE, dashed: false, arrow: 'open' },
        referencesubsetting: { stroke: DE, dashed: false, arrow: 'open' },
        annotation:     { stroke: DD, dashed: true, arrow: 'none' },
        comment:        { stroke: DD, dashed: true, arrow: 'none' },
        connection:     { stroke: DE, dashed: false, arrow: 'none' },
        binding:        { stroke: DE, dashed: false, arrow: 'none' },
        membershipimport:  { stroke: DD, dashed: true, arrow: 'open' },
        namespaceimport:   { stroke: DD, dashed: true, arrow: 'open' },
        import:            { stroke: DD, dashed: true, arrow: 'open' },
        membershipexpose:  { stroke: DD, dashed: true, arrow: 'open' },
        namespaceexpose:   { stroke: DD, dashed: true, arrow: 'open' },
        expose:            { stroke: DD, dashed: true, arrow: 'open' },
        default:           { stroke: DE, dashed: false, arrow: 'classic' },
    };

    // ═══════════════════════════════════════════════════════════════
    // 테마 감지 및 팔레트 전환
    // ═══════════════════════════════════════════════════════════════

    function isDarkTheme() {
        return document.body.classList.contains('vscode-dark') ||
               document.body.classList.contains('vscode-high-contrast');
    }

    function getActiveColors() {
        return isDarkTheme() ? DARK_COLORS : LIGHT_COLORS;
    }

    function getActiveEdgeStyles() {
        return isDarkTheme() ? DARK_EDGES : LIGHT_EDGES;
    }

    // 다이어그램 배경색 반환
    function getDiagramBackground() {
        return isDarkTheme() ? '#1e1e1e' : '#f8f8f8';
    }

    // 컨테이너(swimlane) 내부 배경색
    function getSwimlaneFillColor() {
        return isDarkTheme() ? '#222222' : '#f5f5f5';
    }

    // Export: getter 함수로 항상 현재 테마 색상 반환
    Object.defineProperty(ns.MxGraph.styleColors, 'SYSML_COLORS', {
        get: getActiveColors,
        enumerable: true,
    });
    Object.defineProperty(ns.MxGraph.styleColors, 'EDGE_STYLES', {
        get: getActiveEdgeStyles,
        enumerable: true,
    });

    ns.MxGraph.styleColors.isDarkTheme = isDarkTheme;
    ns.MxGraph.styleColors.getDiagramBackground = getDiagramBackground;
    ns.MxGraph.styleColors.getSwimlaneFillColor = getSwimlaneFillColor;
    ns.MxGraph.styleColors.LIGHT_COLORS = LIGHT_COLORS;
    ns.MxGraph.styleColors.DARK_COLORS = DARK_COLORS;
    ns.MxGraph.styleColors.LIGHT_EDGES = LIGHT_EDGES;
    ns.MxGraph.styleColors.DARK_EDGES = DARK_EDGES;

    console.log('[MxStyleColors] 모듈 로드 완료 (테마 자동 감지)');
})();
