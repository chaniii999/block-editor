/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * 연결 생성기 - 포트 간 연결 생성
 * ********************************************************************************/
(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.interaction = ns.Editor.interaction || {};

    // 연결 상태
    let connecting = null; // { fromPort:{el,port,node}, ghostPath }
    let hoverTarget = null; // { el: groupEl, portEl, valid }

    /**
     * 포트에서 연결 시작
     * @param {Object} app - 앱 인스턴스
     * @param {Object} node - 소스 노드
     * @param {SVGElement} portEl - 포트 요소
     */
    function startConnect(app, node, portEl) {
        const svg = app?.dom?.svg || document.getElementById('diagramSvg');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'ghost-connection');
        svg.appendChild(path);
        connecting = { fromPort: { el: portEl, node }, ghostPath: path };
    }

    /**
     * 연결 중 마우스 이동 처리
     * @param {MouseEvent} ev - 마우스 이벤트
     * @param {Object} app - 앱 인스턴스
     * @returns {boolean} 연결 처리 여부
     */
    function handleConnectMove(ev, app) {
        if (!connecting) return false;
        
        const svg = app?.dom?.svg || document.getElementById('diagramSvg');
        const rect = svg.getBoundingClientRect();
        const scale = Math.max(0.0001, app?.viewport?.scale || 1);
        const ox = app?.viewport?.x || 0;
        const oy = app?.viewport?.y || 0;
        
        // 포트 중심 좌표 (월드 좌표)
        const x1 = Number(connecting.fromPort.el.getAttribute('cx')) || 0;
        const y1 = Number(connecting.fromPort.el.getAttribute('cy')) || 0;
        
        // 커서를 월드 좌표로 변환
        const x2 = (ev.clientX - rect.left - ox) / scale;
        const y2 = (ev.clientY - rect.top - oy) / scale;
        
        connecting.ghostPath.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);

        // 호버 타겟 및 유효성 검사
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const port = el && el.closest ? el.closest('.diagram-port') : null;
        const group = el && el.closest ? el.closest('.diagram-element') : null;
        
        if (group) {
            const id = group.getAttribute('data-id');
            const dst = app.model.elements.find((e) => e.id === id);
            const src = connecting.fromPort.node;
            const valid = validateConnection(src, dst, connecting.fromPort.el, port);
            setHoverTarget(group, port, valid);
        } else {
            clearHoverTarget();
        }
        
        return true;
    }

    /**
     * 연결 종료
     * @param {Object} app - 앱 인스턴스
     * @returns {boolean} 연결이 있었는지 여부
     */
    function endConnect(app) {
        const hadConnecting = !!connecting;
        
        if (connecting) {
            try {
                finalizeConnection(app);
                connecting.ghostPath?.remove?.();
            } catch {}
            clearHoverTarget();
            connecting = null;
        }
        
        return hadConnecting;
    }

    /**
     * 연결 중인지 확인
     * @returns {boolean} 연결 중 여부
     */
    function isConnecting() {
        return !!connecting;
    }

    /**
     * 연결 유효성 검사
     * @param {Object} srcNode - 소스 노드
     * @param {Object} dstNode - 대상 노드
     * @param {SVGElement} srcPortEl - 소스 포트 요소
     * @param {SVGElement} dstPortEl - 대상 포트 요소
     * @returns {boolean} 유효 여부
     */
    function validateConnection(srcNode, dstNode, srcPortEl, dstPortEl) {
        if (!srcNode || !dstNode) return false;
        if (srcNode.id === dstNode.id) return false;
        
        // 포트 간 연결 필요
        if (!srcPortEl || !dstPortEl) return false;
        
        // 포트 호환성 검사
        const srcPid = srcPortEl.getAttribute('data-port-id') || '';
        const dstPid = dstPortEl.getAttribute('data-port-id') || '';
        const srcPort = (Array.isArray(srcNode.ports) ? srcNode.ports : []).find((p) => String(p.id || p.name || '') === String(srcPid));
        const dstPort = (Array.isArray(dstNode.ports) ? dstNode.ports : []).find((p) => String(p.id || p.name || '') === String(dstPid));
        
        const normalizeKind = (k) => String(k || '').toLowerCase();
        const kindGroup = (k) => {
            const a = normalizeKind(k);
            if (!a) return '';
            if (['signal', 'data'].includes(a)) return 'info';
            if (['power', 'electrical'].includes(a)) return 'power';
            if (['mechanical'].includes(a)) return 'mechanical';
            if (['hydraulic'].includes(a)) return 'hydraulic';
            if (['flow'].includes(a)) return 'flow';
            return a;
        };
        
        if (srcPort && dstPort) {
            const sk = normalizeKind(srcPort.kind);
            const dk = normalizeKind(dstPort.kind);
            if (sk && dk) {
                const sg = kindGroup(sk);
                const dg = kindGroup(dk);
                const flowCompat = (sg === 'flow' && ['mechanical', 'hydraulic'].includes(dg)) ||
                                   (dg === 'flow' && ['mechanical', 'hydraulic'].includes(sg));
                if (sg !== dg && !flowCompat) return false;
            }
        }
        
        // 노드 타입별 허용 관계
        const t1 = String(srcNode.type || '').toLowerCase();
        const t2 = String(dstNode.type || '').toLowerCase();
        const isReq = (t) => t.includes('requirement');
        const isPkg = (t) => t.includes('package');
        
        // 패키지 간 직접 연결 불가
        if (isPkg(t1) || isPkg(t2)) return false;
        
        // 요구사항 간 연결 허용
        if (isReq(t1) && isReq(t2)) return true;
        
        return true;
    }

    /**
     * 호버 타겟 설정
     */
    function setHoverTarget(groupEl, portEl, valid) {
        if (hoverTarget && hoverTarget.el === groupEl && hoverTarget.valid === valid && hoverTarget.portEl === portEl) return;
        clearHoverTarget();
        hoverTarget = { el: groupEl, portEl, valid };
        if (valid) groupEl.classList.add('connect-valid');
        else groupEl.classList.add('connect-invalid');
    }

    /**
     * 호버 타겟 제거
     */
    function clearHoverTarget() {
        if (!hoverTarget) return;
        try {
            hoverTarget.el.classList.remove('connect-valid');
            hoverTarget.el.classList.remove('connect-invalid');
        } catch {}
        hoverTarget = null;
    }

    /**
     * 연결 확정
     * @param {Object} app - 앱 인스턴스
     */
    function finalizeConnection(app) {
        if (!hoverTarget) return;
        
        const el = hoverTarget.el;
        const id = el.getAttribute('data-id');
        const dst = app.model.elements.find((e) => e.id === id);
        const src = connecting.fromPort.node;
        const dstPortEl = hoverTarget.portEl;
        
        if (!validateConnection(src, dst, connecting.fromPort.el, dstPortEl)) return;
        
        // 모델에 연결 추가
        const conn = {
            id: `connection_${Date.now()}`,
            source: src.name,
            target: dst.name,
            type: 'association',
            sourcePort: connecting.fromPort.el.getAttribute('data-port-id') || undefined,
            targetPort: dstPortEl?.getAttribute('data-port-id') || undefined,
        };
        
        app.model.connections = Array.isArray(app.model.connections) ? app.model.connections : [];
        app.model.connections.push(conn);
        
        try {
            (ns.Editor.post || window.vscode)?.postMessage?.({
                type: 'add-connection',
                connection: { source: conn.source, target: conn.target, type: conn.type }
            });
        } catch {}
        
        ns.Editor.render.draw(app);
    }

    // 모듈 내보내기
    ns.Editor.interaction.connectionCreator = {
        startConnect,
        handleConnectMove,
        endConnect,
        isConnecting,
        validateConnection,
        setHoverTarget,
        clearHoverTarget,
    };
})();
