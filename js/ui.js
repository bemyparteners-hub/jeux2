/**
 * ui.js - Interface utilisateur : inventaire, HUD, highlight de bloc
 */

class UI {
    constructor(world, player) {
        this.world  = world;
        this.player = player;

        // Inventaire
        this.selectedSlot = 0;
        this.slots        = INVENTORY_BLOCKS;

        // Surbrillance du bloc visé
        this.highlight = this._createHighlight();
        world.scene.add(this.highlight);

        this._buildInventoryDOM();
        this._setupSlotKeys();
    }

    /** Crée le wireframe de surbrillance (cube légèrement agrandi) */
    _createHighlight() {
        const geo  = new THREE.BoxGeometry(1.02, 1.02, 1.02);
        const mat  = new THREE.MeshBasicMaterial({
            color: 0x000000,
            wireframe: true,
            transparent: true,
            opacity: 0.4,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        return mesh;
    }

    /** Génère les slots d'inventaire dans le DOM */
    _buildInventoryDOM() {
        const container = document.getElementById('inventory');
        container.innerHTML = '';

        this.slots.forEach((blockType, i) => {
            const slot = document.createElement('div');
            slot.className = 'inv-slot' + (i === 0 ? ' selected' : '');
            slot.dataset.index = i;

            // Numéro de slot
            const num = document.createElement('span');
            num.className = 'slot-number';
            num.textContent = i + 1;
            slot.appendChild(num);

            // Icône (canvas miniature)
            const icon = this._makeBlockIcon(blockType);
            icon.className = 'block-icon';
            slot.appendChild(icon);

            // Nom du bloc
            const label = document.createElement('span');
            label.className = 'slot-label';
            label.textContent = BLOCK_NAMES[blockType];
            slot.appendChild(label);

            // Clic sur le slot
            slot.addEventListener('click', () => this.selectSlot(i));
            container.appendChild(slot);
        });
    }

    /** Crée une icône canvas 32x32 pour un type de bloc */
    _makeBlockIcon(blockType) {
        const canvas = document.createElement('canvas');
        canvas.width  = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Couleurs par bloc (représentation isométrique simplifiée)
        const colors = {
            [BLOCK.GRASS]:  { top: '#5d9e3c', side: '#7a5c36', dark: '#5c4428' },
            [BLOCK.DIRT]:   { top: '#8B6340', side: '#7a5530', dark: '#6a4520' },
            [BLOCK.STONE]:  { top: '#999',    side: '#777',    dark: '#555'    },
            [BLOCK.WOOD]:   { top: '#6b4c2a', side: '#9c7a4b', dark: '#7a5c34' },
            [BLOCK.LEAVES]: { top: '#2d7a2a', side: '#256020', dark: '#1a4a18' },
            [BLOCK.SAND]:   { top: '#d4b96a', side: '#c4a855', dark: '#a08840' },
            [BLOCK.SNOW]:   { top: '#e8eef5', side: '#c8d4e0', dark: '#a0b0c0' },
        };

        const c = colors[blockType] || { top: '#888', side: '#666', dark: '#444' };

        // Face du dessus
        ctx.fillStyle = c.top;
        ctx.beginPath();
        ctx.moveTo(16,  4); ctx.lineTo(30, 12);
        ctx.lineTo(16, 20); ctx.lineTo( 2, 12);
        ctx.closePath();
        ctx.fill();

        // Face gauche
        ctx.fillStyle = c.side;
        ctx.beginPath();
        ctx.moveTo( 2, 12); ctx.lineTo(16, 20);
        ctx.lineTo(16, 30); ctx.lineTo( 2, 22);
        ctx.closePath();
        ctx.fill();

        // Face droite (plus sombre)
        ctx.fillStyle = c.dark;
        ctx.beginPath();
        ctx.moveTo(16, 20); ctx.lineTo(30, 12);
        ctx.lineTo(30, 22); ctx.lineTo(16, 30);
        ctx.closePath();
        ctx.fill();

        return canvas;
    }

    /** Sélectionne un slot d'inventaire par index */
    selectSlot(index) {
        if (index < 0 || index >= this.slots.length) return;
        const container = document.getElementById('inventory');
        container.querySelectorAll('.inv-slot').forEach((el, i) => {
            el.classList.toggle('selected', i === index);
        });
        this.selectedSlot = index;
    }

    /** Retourne le type de bloc actuellement sélectionné */
    getSelectedBlock() {
        return this.slots[this.selectedSlot];
    }

    /** Raccourcis clavier 1-7 pour les slots */
    _setupSlotKeys() {
        document.addEventListener('keydown', e => {
            const n = parseInt(e.key);
            if (n >= 1 && n <= this.slots.length) this.selectSlot(n - 1);
        });

        // Molette de la souris pour changer de slot
        document.addEventListener('wheel', e => {
            if (!this.player.mouseLocked) return;
            const dir = e.deltaY > 0 ? 1 : -1;
            const next = (this.selectedSlot + dir + this.slots.length) % this.slots.length;
            this.selectSlot(next);
        });
    }

    /**
     * Met à jour chaque frame :
     * - surbrillance du bloc visé
     * - coordonnées HUD
     */
    update() {
        const target = this.player.getTargetBlock();

        if (target) {
            this.highlight.visible = true;
            this.highlight.position.set(
                target.blockX + 0.5,
                target.blockY + 0.5,
                target.blockZ + 0.5
            );
        } else {
            this.highlight.visible = false;
        }

        // Coordonnées
        const coordsEl = document.getElementById('coords');
        if (coordsEl) coordsEl.textContent = this.player.getCoordsString();
    }

    /** Affiche un message éphémère en haut de l'écran */
    static flash(msg) {
        const el = document.getElementById('flash-msg');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(UI._flashTimer);
        UI._flashTimer = setTimeout(() => el.classList.remove('show'), 1800);
    }
}
