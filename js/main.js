/**
 * main.js - Initialisation du moteur Three.js et boucle de jeu principale
 */

// ─── Variables globales ─────────────────────────────────────────────────────
let renderer, scene, camera;
let world, player, ui;
let clock;
let paused = false;
let started = false;

// ─── Initialisation ─────────────────────────────────────────────────────────
function init() {
    // --- Renderer ---
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: false, // désactivé pour le style pixelisé
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87CEEB); // ciel bleu

    // --- Scène ---
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 30, 80); // brouillard doux

    // --- Caméra première personne ---
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

    // --- Lumières ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.0);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near   = 0.5;
    sun.shadow.camera.far    = 200;
    sun.shadow.camera.left   = -80;
    sun.shadow.camera.right  =  80;
    sun.shadow.camera.top    =  80;
    sun.shadow.camera.bottom = -80;
    scene.add(sun);

    // Lumière secondaire douce (ciel)
    const skyLight = new THREE.DirectionalLight(0xb0d8ff, 0.35);
    skyLight.position.set(-20, 40, -30);
    scene.add(skyLight);

    // --- Génération du monde ---
    console.log('Génération du monde…');
    const blockMaterials = buildBlockMaterials();
    world = new World(scene, blockMaterials);
    console.log('Monde généré.');

    // --- Joueur ---
    player = new Player(camera, world);

    // --- Interface ---
    ui = new UI(world, player);

    // --- Horloge ---
    clock = new THREE.Clock();

    // --- Interactions souris (clic) ---
    document.addEventListener('mousedown', onMouseDown);

    // --- Redimensionnement ---
    window.addEventListener('resize', onResize);
}

// ─── Lancement du jeu (après clic sur "Jouer") ──────────────────────────────
function startGame() {
    if (started) return;
    started = true;

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('crosshair').style.display    = 'block';
    document.getElementById('hud').style.display          = 'flex';
    document.getElementById('inventory').style.display    = 'flex';

    // Demande le verrouillage du pointeur
    document.getElementById('game-canvas').requestPointerLock();

    // Bouton Échap pour pause
    document.addEventListener('keydown', e => {
        if (e.code === 'Escape') togglePause();
    });

    // Reprendre via le canvas (re-lock)
    document.getElementById('game-canvas').addEventListener('click', () => {
        if (started && !paused) {
            document.getElementById('game-canvas').requestPointerLock();
        }
    });

    clock.start();
    animate();
}

// ─── Pause ───────────────────────────────────────────────────────────────────
function togglePause() {
    if (!started) return;
    paused = !paused;
    const screen = document.getElementById('pause-screen');
    screen.style.display = paused ? 'flex' : 'none';
    if (!paused) {
        document.getElementById('game-canvas').requestPointerLock();
    } else {
        document.exitPointerLock();
    }
}

// ─── Gestion du clic souris ─────────────────────────────────────────────────
function onMouseDown(e) {
    if (!player.mouseLocked) return;
    if (paused) return;

    const target = player.getTargetBlock();
    if (!target) return;

    if (e.button === 0) {
        // Clic gauche : casser un bloc
        const removed = world.removeBlock(target.blockX, target.blockY, target.blockZ);
        if (removed) UI.flash('Bloc cassé');
    } else if (e.button === 2) {
        // Clic droit : poser un bloc
        if (target.placeX === null || target.placeY === null || target.placeZ === null) return;

        // Vérifie que le bloc ne serait pas dans le joueur
        const bx = target.placeX, by = target.placeY, bz = target.placeZ;
        const hw = 0.4;
        if (
            bx + 1 > player.pos.x - hw && bx < player.pos.x + hw &&
            by + 1 > player.pos.y      && by < player.pos.y + PLAYER_HEIGHT &&
            bz + 1 > player.pos.z - hw && bz < player.pos.z + hw
        ) return; // évite de se murer dans un bloc

        const blockType = ui.getSelectedBlock();
        const placed = world.placeBlock(bx, by, bz, blockType);
        if (placed) UI.flash(`${BLOCK_NAMES[blockType]} posé`);
    }
}

// ─── Boucle d'animation ──────────────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);

    if (paused || !started) return;

    const dt = Math.min(clock.getDelta(), 0.05); // cap à 50ms pour éviter les sauts

    player.update(dt);
    ui.update();

    renderer.render(scene, camera);
}

// ─── Redimensionnement ───────────────────────────────────────────────────────
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ─── Point d'entrée ──────────────────────────────────────────────────────────
window.addEventListener('load', () => {
    init();
    // Le bouton "Jouer" lance la partie
    document.getElementById('btn-start').addEventListener('click', startGame);
});
