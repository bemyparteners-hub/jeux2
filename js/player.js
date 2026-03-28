/**
 * player.js - Physique, contrôles et caméra du joueur
 */

const PLAYER_HEIGHT  = 1.75;  // hauteur des yeux en blocs
const PLAYER_WIDTH   = 0.6;   // demi-largeur de la hitbox
const MOVE_SPEED     = 5.0;   // blocs/seconde
const JUMP_FORCE     = 7.0;   // vitesse verticale initiale
const GRAVITY        = 20.0;  // accélération gravitationnelle
const REACH          = 5.5;   // portée de l'interaction (blocs)

class Player {
    constructor(camera, world) {
        this.camera   = camera;
        this.world    = world;

        // Position (bas des pieds du joueur)
        this.pos = new THREE.Vector3(
            WORLD_W / 2,
            SEA_LEVEL + 10,
            WORLD_D / 2
        );

        this.vel      = new THREE.Vector3(0, 0, 0);
        this.onGround = false;

        // Angles de la caméra
        this.yaw   = 0;  // rotation horizontale (gauche/droite)
        this.pitch = 0;  // rotation verticale (haut/bas)

        // État des touches
        this.keys = {
            forward:  false, // Z ou W
            backward: false, // S
            left:     false, // Q ou A
            right:    false, // D
            jump:     false, // Espace
            sprint:   false, // Shift
        };

        this.mouseLocked = false;
        this._setupControls();
        this._updateCamera();
    }

    /** Branche les événements clavier et souris */
    _setupControls() {
        document.addEventListener('keydown', e => this._onKey(e, true));
        document.addEventListener('keyup',   e => this._onKey(e, false));
        document.addEventListener('mousemove', e => this._onMouse(e));

        document.addEventListener('pointerlockchange', () => {
            this.mouseLocked = document.pointerLockElement !== null;
        });
    }

    _onKey(e, down) {
        switch (e.code) {
            case 'KeyW': case 'KeyZ': this.keys.forward  = down; break;
            case 'KeyS':              this.keys.backward = down; break;
            case 'KeyA': case 'KeyQ': this.keys.left     = down; break;
            case 'KeyD':              this.keys.right    = down; break;
            case 'Space':             this.keys.jump     = down; e.preventDefault(); break;
            case 'ShiftLeft':         this.keys.sprint   = down; break;
        }
    }

    _onMouse(e) {
        if (!this.mouseLocked) return;
        const sens = 0.0022;
        this.yaw   -= e.movementX * sens;
        this.pitch -= e.movementY * sens;
        // Limite le pitch entre -89° et +89°
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    }

    /** Applique la physique et le déplacement sur dt secondes */
    update(dt) {
        // --- Déplacement horizontal ---
        const speed = this.keys.sprint ? MOVE_SPEED * 1.6 : MOVE_SPEED;

        // Direction relative à l'orientation du joueur (yaw uniquement)
        const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const rgt = new THREE.Vector3( Math.cos(this.yaw), 0, -Math.sin(this.yaw));

        const move = new THREE.Vector3(0, 0, 0);
        if (this.keys.forward)  move.addScaledVector(fwd,  1);
        if (this.keys.backward) move.addScaledVector(fwd, -1);
        if (this.keys.right)    move.addScaledVector(rgt,  1);
        if (this.keys.left)     move.addScaledVector(rgt, -1);

        if (move.lengthSq() > 0) {
            move.normalize().multiplyScalar(speed);
        }
        this.vel.x = move.x;
        this.vel.z = move.z;

        // --- Gravité ---
        this.vel.y -= GRAVITY * dt;

        // --- Saut ---
        if (this.keys.jump && this.onGround) {
            this.vel.y = JUMP_FORCE;
            this.onGround = false;
        }

        // --- Collision et déplacement ---
        this._moveWithCollision(dt);
        this._updateCamera();
    }

    /**
     * Déplace le joueur avec résolution de collisions AABB simplifiée.
     * Chaque axe est traité séparément.
     */
    _moveWithCollision(dt) {
        const hw = PLAYER_WIDTH / 2;

        // Déplacement axe X
        this.pos.x += this.vel.x * dt;
        if (this._checkCollision()) {
            this.pos.x -= this.vel.x * dt;
            this.vel.x = 0;
        }

        // Déplacement axe Z
        this.pos.z += this.vel.z * dt;
        if (this._checkCollision()) {
            this.pos.z -= this.vel.z * dt;
            this.vel.z = 0;
        }

        // Déplacement axe Y
        const prevY = this.pos.y;
        this.pos.y += this.vel.y * dt;

        if (this._checkCollision()) {
            if (this.vel.y < 0) {
                // Collision par le bas → on est au sol
                this.onGround = true;
                // Snapper aux coordonnées entières
                this.pos.y = Math.ceil(prevY + this.vel.y * dt);
            } else {
                // Collision par le haut → rebond nul
            }
            this.vel.y = 0;
        } else {
            this.onGround = false;
        }

        // Sécurité : ne pas tomber sous le monde
        if (this.pos.y < 0) {
            this.pos.y = SEA_LEVEL + 5;
            this.vel.y = 0;
        }
    }

    /**
     * Teste si la hitbox du joueur intersecte un bloc solide.
     * Hitbox : boîte centrée en (pos.x, pos.y + height/2, pos.z).
     */
    _checkCollision() {
        const hw  = PLAYER_WIDTH / 2;
        const EPS = 0.001;
        const minX = this.pos.x - hw + EPS;
        const maxX = this.pos.x + hw - EPS;
        const minY = this.pos.y          + EPS;
        const maxY = this.pos.y + PLAYER_HEIGHT - EPS;
        const minZ = this.pos.z - hw + EPS;
        const maxZ = this.pos.z + hw - EPS;

        for (let bx = Math.floor(minX); bx <= Math.floor(maxX); bx++) {
            for (let by = Math.floor(minY); by <= Math.floor(maxY); by++) {
                for (let bz = Math.floor(minZ); bz <= Math.floor(maxZ); bz++) {
                    if (this.world.isSolid(bx, by, bz)) return true;
                }
            }
        }
        return false;
    }

    /** Synchronise la caméra Three.js avec la position du joueur */
    _updateCamera() {
        // Les yeux sont en haut de la hitbox
        this.camera.position.set(
            this.pos.x,
            this.pos.y + PLAYER_HEIGHT - 0.1,
            this.pos.z
        );

        // Rotation de la caméra : d'abord yaw, puis pitch
        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
    }

    /**
     * Raycasting : retourne le bloc visé et la face touchée.
     * @returns {{ hitPos, faceNormal, blockX, blockY, blockZ } | null}
     */
    getTargetBlock() {
        const dir = new THREE.Vector3(0, 0, -1)
            .applyQuaternion(this.camera.quaternion);

        const origin = this.camera.position.clone();
        const STEP   = 0.05;
        const steps  = Math.ceil(REACH / STEP);

        let prevBx = null, prevBy = null, prevBz = null;

        for (let i = 1; i <= steps; i++) {
            const p = origin.clone().addScaledVector(dir, i * STEP);
            const bx = Math.floor(p.x);
            const by = Math.floor(p.y);
            const bz = Math.floor(p.z);

            if (bx === prevBx && by === prevBy && bz === prevBz) continue;

            if (this.world.isSolid(bx, by, bz)) {
                return {
                    blockX: bx,
                    blockY: by,
                    blockZ: bz,
                    // Position adjacente (pour poser un bloc)
                    placeX: prevBx,
                    placeY: prevBy,
                    placeZ: prevBz,
                };
            }
            prevBx = bx; prevBy = by; prevBz = bz;
        }
        return null;
    }

    /** Coordonnées lisibles pour l'affichage HUD */
    getCoordsString() {
        return `X:${this.pos.x.toFixed(1)}  Y:${this.pos.y.toFixed(1)}  Z:${this.pos.z.toFixed(1)}`;
    }
}
