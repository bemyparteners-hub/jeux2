/**
 * world.js - Génération et gestion du monde voxel
 */

// Dimensions du monde
const WORLD_W  = 80;   // largeur (axe X)
const WORLD_D  = 80;   // profondeur (axe Z)
const WORLD_H  = 32;   // hauteur maximale (axe Y)
const SEA_LEVEL = 8;   // altitude de base du terrain

/**
 * Fonction de bruit simple basée sur plusieurs sinusoïdes.
 * Produit un relief cohérent et varié sans dépendance externe.
 */
function terrainNoise(x, z) {
    return (
        Math.sin(x * 0.10 + 1.3) * Math.cos(z * 0.09 + 0.7) * 5 +
        Math.sin(x * 0.05 + 0.4) * Math.cos(z * 0.06 + 1.9) * 3 +
        Math.sin(x * 0.20 + 2.1) * Math.cos(z * 0.18 + 0.3) * 2 +
        Math.sin(x * 0.35 + 0.9) * Math.cos(z * 0.30 + 1.1) * 1
    );
}

/**
 * Classe World : stocke les données du monde et gère le rendu Three.js.
 */
class World {
    constructor(scene, blockMaterials) {
        this.scene         = scene;
        this.blockMaterials = blockMaterials;
        // Tableau 3D [y][z][x] de types de blocs
        this.data          = null;
        // Meshes Three.js indexés par "x,y,z"
        this.meshes        = new Map();
        // Géométrie partagée pour tous les blocs (1x1x1)
        this.geo           = new THREE.BoxGeometry(1, 1, 1);

        this._generate();
        this._buildMeshes();
    }

    /** Génère la carte de hauteur et remplit le tableau 3D */
    _generate() {
        // Initialise tout à AIR
        this.data = Array.from({ length: WORLD_H }, () =>
            Array.from({ length: WORLD_D }, () =>
                new Uint8Array(WORLD_W)
            )
        );

        // Génère la hauteur de surface pour chaque colonne
        for (let z = 0; z < WORLD_D; z++) {
            for (let x = 0; x < WORLD_W; x++) {
                const h = Math.max(2, Math.min(WORLD_H - 4,
                    Math.round(SEA_LEVEL + terrainNoise(x, z))
                ));

                // Remplissage en couches
                for (let y = 0; y < h; y++) {
                    if (y === h - 1) {
                        // Couche de surface : herbe, sable ou neige selon altitude
                        if (h >= SEA_LEVEL + 8) {
                            this.data[y][z][x] = BLOCK.SNOW;
                        } else if (h <= SEA_LEVEL + 1) {
                            this.data[y][z][x] = BLOCK.SAND;
                        } else {
                            this.data[y][z][x] = BLOCK.GRASS;
                        }
                    } else if (y >= h - 4) {
                        this.data[y][z][x] = BLOCK.DIRT;  // couche de terre
                    } else {
                        this.data[y][z][x] = BLOCK.STONE; // pierre en profondeur
                    }
                }
            }
        }

        // Place des arbres aléatoirement sur les zones d'herbe
        this._generateTrees();
    }

    /** Place des arbres (troncs + feuillage) sur les blocs d'herbe */
    _generateTrees() {
        const rng = this._rng.bind(this);
        for (let attempt = 0; attempt < 200; attempt++) {
            const x = 3 + Math.floor(Math.random() * (WORLD_W - 6));
            const z = 3 + Math.floor(Math.random() * (WORLD_D - 6));

            // Trouve la surface
            let surfaceY = -1;
            for (let y = WORLD_H - 1; y >= 0; y--) {
                if (this.data[y][z][x] !== BLOCK.AIR) {
                    surfaceY = y;
                    break;
                }
            }
            if (surfaceY < 0) continue;

            // Arbre uniquement sur l'herbe et à altitude modérée
            if (this.data[surfaceY][z][x] !== BLOCK.GRASS) continue;
            if (surfaceY + 7 >= WORLD_H) continue;

            const trunkH = 4 + Math.floor(Math.random() * 2); // hauteur du tronc

            // Tronc
            for (let dy = 1; dy <= trunkH; dy++) {
                const wy = surfaceY + dy;
                if (wy < WORLD_H) this.data[wy][z][x] = BLOCK.WOOD;
            }

            // Feuillage sphérique
            const top = surfaceY + trunkH;
            for (let dy = -1; dy <= 2; dy++) {
                for (let dz = -2; dz <= 2; dz++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        if (dx === 0 && dz === 0 && dy <= 0) continue; // laisse de la place au tronc
                        const dist = Math.sqrt(dx*dx + dy*dy*0.8 + dz*dz);
                        if (dist > 2.3) continue;
                        const lx = x + dx, ly = top + dy, lz = z + dz;
                        if (lx < 0 || lx >= WORLD_W || ly < 0 || ly >= WORLD_H || lz < 0 || lz >= WORLD_D) continue;
                        if (this.data[ly][lz][lx] === BLOCK.AIR) {
                            this.data[ly][lz][lx] = BLOCK.LEAVES;
                        }
                    }
                }
            }
        }
    }

    _rng() { return Math.random(); }

    /** Crée un mesh Three.js pour chaque bloc solide visible */
    _buildMeshes() {
        for (let y = 0; y < WORLD_H; y++) {
            for (let z = 0; z < WORLD_D; z++) {
                for (let x = 0; x < WORLD_W; x++) {
                    const type = this.data[y][z][x];
                    if (type !== BLOCK.AIR) {
                        this._addMesh(x, y, z, type);
                    }
                }
            }
        }
    }

    /** Crée et ajoute un mesh pour le bloc en (x,y,z) */
    _addMesh(x, y, z, type) {
        const mats = this.blockMaterials[type];
        const mesh = new THREE.Mesh(this.geo, mats);
        mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
        mesh.castShadow    = true;
        mesh.receiveShadow = true;
        // Stocke les coordonnées pour le raycasting
        mesh.userData = { x, y, z, blockType: type };
        this.scene.add(mesh);
        this.meshes.set(`${x},${y},${z}`, mesh);
    }

    /** Retourne le type de bloc en (x,y,z), ou AIR si hors-monde */
    getBlock(x, y, z) {
        x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
        if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H || z < 0 || z >= WORLD_D) {
            return BLOCK.STONE; // bords du monde = solide
        }
        return this.data[y][z][x];
    }

    /** Vérifie si un bloc est solide (non-air, non-feuilles pour la physique) */
    isSolid(x, y, z) {
        const t = this.getBlock(x, y, z);
        return t !== BLOCK.AIR;
    }

    /** Supprime un bloc (le remplace par AIR) */
    removeBlock(x, y, z) {
        x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
        if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H || z < 0 || z >= WORLD_D) return false;
        if (this.data[y][z][x] === BLOCK.AIR) return false;

        this.data[y][z][x] = BLOCK.AIR;

        const key = `${x},${y},${z}`;
        const mesh = this.meshes.get(key);
        if (mesh) {
            this.scene.remove(mesh);
            this.meshes.delete(key);
        }
        return true;
    }

    /** Place un bloc d'un type donné */
    placeBlock(x, y, z, type) {
        x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
        if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H || z < 0 || z >= WORLD_D) return false;
        if (this.data[y][z][x] !== BLOCK.AIR) return false;

        this.data[y][z][x] = type;
        this._addMesh(x, y, z, type);
        return true;
    }
}
