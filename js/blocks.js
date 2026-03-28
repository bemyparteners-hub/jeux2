/**
 * blocks.js - Définition des types de blocs et génération des textures
 */

// Identifiants des types de blocs
const BLOCK = {
    AIR:    0,
    GRASS:  1,
    DIRT:   2,
    STONE:  3,
    WOOD:   4,
    LEAVES: 5,
    SAND:   6,
    SNOW:   7,
};

// Noms affichés dans l'inventaire
const BLOCK_NAMES = {
    [BLOCK.GRASS]:  'Herbe',
    [BLOCK.DIRT]:   'Terre',
    [BLOCK.STONE]:  'Pierre',
    [BLOCK.WOOD]:   'Bois',
    [BLOCK.LEAVES]: 'Feuilles',
    [BLOCK.SAND]:   'Sable',
    [BLOCK.SNOW]:   'Neige',
};

/**
 * Génère une texture canvas de style pixelisé pour un type de bloc.
 * Chaque face est représentée par une couleur de base + bruit de pixel.
 */
function createBlockTexture(colors) {
    const SIZE = 16; // résolution en pixels
    const canvas = document.createElement('canvas');
    canvas.width  = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    // Fond de base
    ctx.fillStyle = colors.base;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Bruit pixel pour donner du grain
    for (let py = 0; py < SIZE; py++) {
        for (let px = 0; px < SIZE; px++) {
            const v = (Math.random() - 0.5) * colors.noise;
            const r = hexToRgb(colors.base);
            ctx.fillStyle = `rgba(${clamp(r.r + v, 0, 255)},${clamp(r.g + v, 0, 255)},${clamp(r.b + v, 0, 255)},1)`;
            ctx.fillRect(px, py, 1, 1);
        }
    }

    // Lignes sombres aux bords pour l'effet "bloc"
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, SIZE, 1);
    ctx.fillRect(0, 0, 1, SIZE);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, SIZE - 1, SIZE, 1);
    ctx.fillRect(SIZE - 1, 0, 1, SIZE);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : { r: 128, g: 128, b: 128 };
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

/**
 * Crée les matériaux Three.js pour chaque type de bloc.
 * BoxGeometry utilise 6 matériaux : [+x, -x, +y, -y, +z, -z]
 * Pour l'herbe : face du haut verte, faces latérales avec transition, bas = terre
 */
function buildBlockMaterials() {
    const mats = {};

    // Herbe : dessus vert, côtés marron-vert, dessous terre
    const grassTop  = createBlockTexture({ base: '#5d9e3c', noise: 30 });
    const grassSide = createBlockTexture({ base: '#7a5c36', noise: 25 });
    const dirtTex   = createBlockTexture({ base: '#8B6340', noise: 20 });
    mats[BLOCK.GRASS] = [
        new THREE.MeshLambertMaterial({ map: grassSide }),
        new THREE.MeshLambertMaterial({ map: grassSide }),
        new THREE.MeshLambertMaterial({ map: grassTop  }),
        new THREE.MeshLambertMaterial({ map: dirtTex   }),
        new THREE.MeshLambertMaterial({ map: grassSide }),
        new THREE.MeshLambertMaterial({ map: grassSide }),
    ];

    // Terre
    const dirtM = new THREE.MeshLambertMaterial({ map: dirtTex });
    mats[BLOCK.DIRT] = Array(6).fill(dirtM);

    // Pierre
    const stoneTex = createBlockTexture({ base: '#888', noise: 20 });
    const stoneM   = new THREE.MeshLambertMaterial({ map: stoneTex });
    mats[BLOCK.STONE] = Array(6).fill(stoneM);

    // Bois
    const woodTop  = createBlockTexture({ base: '#6b4c2a', noise: 18 });
    const woodSide = createBlockTexture({ base: '#9c7a4b', noise: 22 });
    mats[BLOCK.WOOD] = [
        new THREE.MeshLambertMaterial({ map: woodSide }),
        new THREE.MeshLambertMaterial({ map: woodSide }),
        new THREE.MeshLambertMaterial({ map: woodTop  }),
        new THREE.MeshLambertMaterial({ map: woodTop  }),
        new THREE.MeshLambertMaterial({ map: woodSide }),
        new THREE.MeshLambertMaterial({ map: woodSide }),
    ];

    // Feuilles (semi-transparent)
    const leavesTex = createBlockTexture({ base: '#2d7a2a', noise: 35 });
    const leavesM   = new THREE.MeshLambertMaterial({ map: leavesTex, transparent: true, opacity: 0.9 });
    mats[BLOCK.LEAVES] = Array(6).fill(leavesM);

    // Sable
    const sandTex = createBlockTexture({ base: '#d4b96a', noise: 18 });
    const sandM   = new THREE.MeshLambertMaterial({ map: sandTex });
    mats[BLOCK.SAND] = Array(6).fill(sandM);

    // Neige
    const snowTop  = createBlockTexture({ base: '#e8eef5', noise: 12 });
    const snowSide = createBlockTexture({ base: '#c8d4e0', noise: 12 });
    mats[BLOCK.SNOW] = [
        new THREE.MeshLambertMaterial({ map: snowSide }),
        new THREE.MeshLambertMaterial({ map: snowSide }),
        new THREE.MeshLambertMaterial({ map: snowTop  }),
        new THREE.MeshLambertMaterial({ map: snowSide }),
        new THREE.MeshLambertMaterial({ map: snowSide }),
        new THREE.MeshLambertMaterial({ map: snowSide }),
    ];

    return mats;
}

// Blocs disponibles dans l'inventaire du joueur
const INVENTORY_BLOCKS = [
    BLOCK.GRASS,
    BLOCK.DIRT,
    BLOCK.STONE,
    BLOCK.WOOD,
    BLOCK.LEAVES,
    BLOCK.SAND,
    BLOCK.SNOW,
];
