// Copyright: SELab.AI (c) 2026

(function () {
    'use strict';

    const OVERLAY_ID = 'selab-spinner-overlay';

    function getOrCreateOverlay() {
        let overlay = document.getElementById(OVERLAY_ID);
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.className = 'selab-spinner-overlay';

        const card = document.createElement('div');
        card.className = 'selab-spinner-card';

        const ring = document.createElement('div');
        ring.className = 'selab-spinner-ring';

        const msg = document.createElement('div');
        msg.id = 'selab-spinner-message';
        msg.className = 'selab-spinner-message';

        card.appendChild(ring);
        card.appendChild(msg);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        return overlay;
    }

    function show(message) {
        const overlay = getOrCreateOverlay();
        const msg = overlay.querySelector('#selab-spinner-message');
        if (msg) msg.textContent = message || '';
        overlay.classList.add('selab-spinner-overlay--visible');
    }

    function hide() {
        const overlay = document.getElementById(OVERLAY_ID);
        if (overlay) overlay.classList.remove('selab-spinner-overlay--visible');
    }

    window.SelabSpinner = { show, hide };
})();
