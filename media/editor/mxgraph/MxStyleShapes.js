/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * MxStyleShapes.js - 커스텀 mxGraph shape 및 marker 등록
 * MxStyleManager.js에서 분리된 shape/marker 모듈
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};
    ns.MxGraph.styleShapes = ns.MxGraph.styleShapes || {};

    function log(prefix, ...args) {
        try {
            console.log(`[MxStyleShapes] ${prefix}`, ...args);
        } catch (_) {}
    }

    /**
     * 커스텀 shape 등록 (Comment/Documentation 노트 모양)
     */
    function registerCustomShapes() {
        if (typeof mxCellRenderer === 'undefined') return;

        // Note shape: 오른쪽 상단 모서리가 접힌 노트 형태
        function NoteShape() {
            mxRectangleShape.call(this);
        }
        mxUtils.extend(NoteShape, mxRectangleShape);

        NoteShape.prototype.paintBackground = function(c, x, y, w, h) {
            const foldSize = Math.min(15, w * 0.15, h * 0.15);
            
            c.begin();
            c.moveTo(x, y);
            c.lineTo(x + w - foldSize, y);
            c.lineTo(x + w, y + foldSize);
            c.lineTo(x + w, y + h);
            c.lineTo(x, y + h);
            c.close();
            c.fillAndStroke();
        };

        NoteShape.prototype.paintForeground = function(c, x, y, w, h) {
            const foldSize = Math.min(15, w * 0.15, h * 0.15);
            
            c.begin();
            c.moveTo(x + w - foldSize, y);
            c.lineTo(x + w - foldSize, y + foldSize);
            c.lineTo(x + w, y + foldSize);
            c.stroke();
        };

        mxCellRenderer.registerShape('note', NoteShape);
        log('커스텀 shape 등록 완료: note');

        // TerminateAction shape: 원형 + 대각선 X
        function TerminateActionShape() {
            mxEllipse.call(this);
        }
        mxUtils.extend(TerminateActionShape, mxEllipse);

        TerminateActionShape.prototype.paintVertexShape = function(c, x, y, w, h) {
            mxEllipse.prototype.paintVertexShape.call(this, c, x, y, w, h);
            const inset = Math.min(w, h) * 0.2;
            const left = x + inset;
            const right = x + w - inset;
            const top = y + inset;
            const bottom = y + h - inset;

            c.begin();
            c.moveTo(left, top);
            c.lineTo(right, bottom);
            c.moveTo(right, top);
            c.lineTo(left, bottom);
            c.stroke();
        };

        mxCellRenderer.registerShape('terminateAction', TerminateActionShape);
        log('커스텀 shape 등록 완료: terminateAction');

        // DoubleCircle shape: 이중 원 (DoneAction/FinalNode용)
        function DoubleCircleShape() {
            mxEllipse.call(this);
        }
        mxUtils.extend(DoubleCircleShape, mxEllipse);

        DoubleCircleShape.prototype.paintVertexShape = function(c, x, y, w, h) {
            const cx = x + w / 2;
            const cy = y + h / 2;
            const outerR = Math.min(w, h) / 2;
            const innerR = outerR * 0.7;

            c.begin();
            c.ellipse(x, y, w, h);
            c.stroke();

            const innerX = cx - innerR;
            const innerY = cy - innerR;
            const innerW = innerR * 2;
            const innerH = innerR * 2;
            c.begin();
            c.ellipse(innerX, innerY, innerW, innerH);
            c.fillAndStroke();
        };

        mxCellRenderer.registerShape('doubleCircle', DoubleCircleShape);
        log('커스텀 shape 등록 완료: doubleCircle');

        // ActorStickman shape: 둥근 사각형 배경 + 왼쪽 상단 사람 아이콘
        function ActorStickmanShape() {
            mxRectangleShape.call(this);
        }
        mxUtils.extend(ActorStickmanShape, mxRectangleShape);

        ActorStickmanShape.prototype.paintBackground = function(c, x, y, w, h) {
            const arcSize = Math.min(18, w * 0.15, h * 0.25);
            c.roundrect(x, y, w, h, arcSize, arcSize);
            c.fillAndStroke();
        };

        ActorStickmanShape.prototype.paintForeground = function(c, x, y, w, h) {
            const iconSize = Math.min(22, h * 0.6);
            const iconX = x + 6;
            const iconY = y + 5;
            const cx = iconX + iconSize * 0.5;

            c.setStrokeWidth(1.2);
            c.setFillColor('none');

            // 머리 (원)
            const headR = iconSize * 0.16;
            c.ellipse(cx - headR, iconY, headR * 2, headR * 2);
            c.stroke();

            // 몸통
            const bodyTop = iconY + headR * 2 + 1;
            const bodyLen = iconSize * 0.3;
            c.begin();
            c.moveTo(cx, bodyTop);
            c.lineTo(cx, bodyTop + bodyLen);
            c.stroke();

            // 팔
            const armY = bodyTop + bodyLen * 0.3;
            const armSpan = iconSize * 0.25;
            c.begin();
            c.moveTo(cx - armSpan, armY);
            c.lineTo(cx + armSpan, armY);
            c.stroke();

            // 다리
            const legTop = bodyTop + bodyLen;
            const legSpan = iconSize * 0.2;
            const legLen = iconSize * 0.25;
            c.begin();
            c.moveTo(cx, legTop);
            c.lineTo(cx - legSpan, legTop + legLen);
            c.moveTo(cx, legTop);
            c.lineTo(cx + legSpan, legTop + legLen);
            c.stroke();
        };

        mxCellRenderer.registerShape('actorStickman', ActorStickmanShape);
        log('커스텀 shape 등록 완료: actorStickman');
    }

    /**
     * 커스텀 마커 등록
     */
    function registerCustomMarkers() {
        if (typeof mxMarker === 'undefined') return;

        // closedArrowWithDots: 빈 삼각형 + 점 두 개 (FeatureTyping 엣지용)
        mxMarker.addMarker('closedArrowWithDots', function(canvas, shape, type, pe, unitX, unitY, size, source, sw, filled) {
            const nx = unitX * (size + sw + 1);
            const ny = unitY * (size + sw + 1);
            
            const p1x = pe.x - nx - ny / 2;
            const p1y = pe.y - ny + nx / 2;
            const p2x = pe.x - nx + ny / 2;
            const p2y = pe.y - ny - nx / 2;
            
            return function() {
                canvas.begin();
                canvas.moveTo(pe.x, pe.y);
                canvas.lineTo(p1x, p1y);
                canvas.lineTo(p2x, p2y);
                canvas.close();
                canvas.stroke();
                
                const dotRadius = 1;
                const dotOffsetX = -nx * 1.5;
                const dotOffsetY = -ny * 1.5;
                const dotSpacing = 4;
                
                const perpX = -ny / size * dotSpacing;
                const perpY = nx / size * dotSpacing;
                
                const dot1x = pe.x + dotOffsetX + perpX * 0.5;
                const dot1y = pe.y + dotOffsetY + perpY * 0.5;
                canvas.ellipse(dot1x - dotRadius, dot1y - dotRadius, dotRadius * 2, dotRadius * 2);
                canvas.fillAndStroke();
                
                const dot2x = pe.x + dotOffsetX - perpX * 0.5;
                const dot2y = pe.y + dotOffsetY - perpY * 0.5;
                canvas.ellipse(dot2x - dotRadius, dot2y - dotRadius, dotRadius * 2, dotRadius * 2);
                canvas.fillAndStroke();
            };
        });

        // closedArrowWithVerticalBar: 빈 삼각형 + 수직선 (Redefinition 엣지용)
        mxMarker.addMarker('closedArrowWithVerticalBar', function(canvas, shape, type, pe, unitX, unitY, size, source, sw, filled) {
            const nx = unitX * (size + sw + 1);
            const ny = unitY * (size + sw + 1);
            
            const p1x = pe.x - nx - ny / 2;
            const p1y = pe.y - ny + nx / 2;
            const p2x = pe.x - nx + ny / 2;
            const p2y = pe.y - ny - nx / 2;
            
            return function() {
                canvas.begin();
                canvas.moveTo(pe.x, pe.y);
                canvas.lineTo(p1x, p1y);
                canvas.lineTo(p2x, p2y);
                canvas.close();
                canvas.stroke();
                
                const GAP = 3;
                const centerX = pe.x - nx - (unitX * GAP);
                const centerY = pe.y - ny - (unitY * GAP);
                const barSize = size + sw + 1; 
                
                const perpX = -unitY * barSize / 2;
                const perpY = unitX * barSize / 2;
                
                canvas.begin();
                canvas.moveTo(centerX + perpX, centerY + perpY);
                canvas.lineTo(centerX - perpX, centerY - perpY);
                canvas.stroke();
            };
        });
        
        // compositionDiamond: 세로로 긴 채워진 다이아몬드 (Composition 엣지용)
        mxMarker.addMarker('compositionDiamond', function(canvas, shape, type, pe, unitX, unitY, size, source, sw, filled) {
            const nx = unitX * (size + sw + 1);
            const ny = unitY * (size + sw + 1);
            
            const lengthFactor = 1.5;
            const nxLong = nx * lengthFactor;
            const nyLong = ny * lengthFactor;
            
            const tipX = pe.x;
            const tipY = pe.y;
            
            const leftX = pe.x - nx / 2 - ny / 2;
            const leftY = pe.y - ny / 2 + nx / 2;
            const rightX = pe.x - nx / 2 + ny / 2;
            const rightY = pe.y - ny / 2 - nx / 2;
            
            const backX = pe.x - nxLong;
            const backY = pe.y - nyLong;
            
            return function() {
                canvas.begin();
                canvas.moveTo(tipX, tipY);
                canvas.lineTo(leftX, leftY);
                canvas.lineTo(backX, backY);
                canvas.lineTo(rightX, rightY);
                canvas.close();
                if (filled) {
                    canvas.fillAndStroke();
                } else {
                    const oldFill = canvas.state.fillColor;
                    canvas.setFillColor('#FFFFFF');
                    canvas.fillAndStroke();
                    canvas.setFillColor(oldFill);
                }
            };
        });
        
        log('커스텀 마커 등록 완료: closedArrowWithDots, closedArrowWithVerticalBar, compositionDiamond');
    }

    // Export
    ns.MxGraph.styleShapes.registerCustomShapes = registerCustomShapes;
    ns.MxGraph.styleShapes.registerCustomMarkers = registerCustomMarkers;

    console.log('[MxStyleShapes] 모듈 로드 완료');
})();
