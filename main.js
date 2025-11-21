import { Engine } from './src/core/Engine.js';
import { AssetGenerator } from './src/graphics/AssetGenerator.js';
import { WorldGenerator } from './src/world/WorldGenerator.js';
import { DungeonGenerator } from './src/world/DungeonGenerator.js';
import { LightingSystem } from './src/graphics/LightingSystem.js';
import { ParticleSystem } from './src/graphics/ParticleSystem.js';

const engine = new Engine('gameCanvas');
const TILE_SIZE = 32;

// Stan Gry
const GameState = {
    map: [],
    mapWidth: 50,
    mapHeight: 40,
    location: 'overworld', // 'overworld' or 'dungeon'
    camera: { x: 0, y: 0 },
    lighting: null,
    particles: null
};

// Input
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// System Ruchu
function MovementSystem(ecs, dt) {
    const entities = ecs.query(['position', 'player']);
    entities.forEach(entity => {
        const pos = ecs.getComponent(entity, 'position');
        const speed = 150 * dt; // Pixels per second

        let dx = 0;
        let dy = 0;

        if (keys['w'] || keys['ArrowUp']) dy -= speed;
        if (keys['s'] || keys['ArrowDown']) dy += speed;
        if (keys['a'] || keys['ArrowLeft']) dx -= speed;
        if (keys['d'] || keys['ArrowRight']) dx += speed;

        const newX = Math.max(0, Math.min(pos.x + dx, GameState.mapWidth * TILE_SIZE - TILE_SIZE));
        const newY = Math.max(0, Math.min(pos.y + dy, GameState.mapHeight * TILE_SIZE - TILE_SIZE));

        // Sprawdzenie kolizji z terenem
        const tileX = Math.floor((newX + 16) / TILE_SIZE);
        const tileY = Math.floor((newY + 16) / TILE_SIZE);

        if (tileY >= 0 && tileY < GameState.mapHeight && tileX >= 0 && tileX < GameState.mapWidth) {
            const tile = GameState.map[tileY][tileX];
            const type = tile.type || tile;

            let collision = false;
            if (type === 'water' || type === 'mountain' || type === 'wall') collision = true;

            // Sprawdzenie kolizji z wrogami
            const enemies = ecs.query(['enemy', 'position']);
            let enemyCollision = null;
            enemies.forEach(eid => {
                const epos = ecs.getComponent(eid, 'position');
                if (Math.abs(epos.x - newX) < 16 && Math.abs(epos.y - newY) < 16) {
                    enemyCollision = eid;
                }
            });

            if (enemyCollision) {
                handleCombat(entity, enemyCollision);
                return; // Atak zamiast ruchu
            }

            if (!collision) {
                pos.x = newX;
                pos.y = newY;
            }
        }

        // Kamera podąża za graczem
        GameState.camera.x = pos.x - window.innerWidth / 2;
        GameState.camera.y = pos.y - window.innerHeight / 2;

        // Wejście do lochu
        if (keys['Enter'] && GameState.location === 'overworld') {
            loadDungeon();
        }
    });
}

function loadDungeon() {
    GameState.location = 'dungeon';
    GameState.mapWidth = 40;
    GameState.mapHeight = 40;

    // Wyczyść stare encje terenu (ale zostaw gracza)
    // To wymagałoby tagowania encji. Uprośćmy: resetujemy wszystko i tworzymy gracza na nowo.
    engine.ecs.entities = [];
    engine.ecs.components = {};

    const dungeonMap = DungeonGenerator.generate(GameState.mapWidth, GameState.mapHeight);
    GameState.map = dungeonMap; // Zapisz mapę do stanu

    // Tworzenie encji terenu
    dungeonMap.forEach((row, y) => {
        row.forEach((type, x) => {
            const id = engine.ecs.createEntity();
            engine.ecs.addComponent(id, 'position', { x: x * TILE_SIZE, y: y * TILE_SIZE });
            engine.ecs.addComponent(id, 'renderable', { type: type });
        });
    });

    // Gracz w środku
    createPlayer(GameState.mapWidth * TILE_SIZE / 2, GameState.mapHeight * TILE_SIZE / 2);
}

// System Środowiska (Czas, Cząsteczki)
function EnvironmentSystem(ecs, dt) {
    if (GameState.lighting) GameState.lighting.update(dt);
    if (GameState.particles) GameState.particles.update(dt);
}

// System Renderowania
function RenderSystem(ecs, dt) {
    const ctx = engine.ctx;
    const entities = ecs.query(['position', 'renderable']);

    // Sortowanie Y
    entities.sort((a, b) => {
        const posA = ecs.getComponent(a, 'position');
        const posB = ecs.getComponent(b, 'position');
        const typeA = ecs.getComponent(a, 'renderable').type;
        const typeB = ecs.getComponent(b, 'renderable').type;

        if (typeA === 'floor' || typeA === 'grass' || typeA === 'sand' || typeA === 'snow') return -1;
        if (typeB === 'floor' || typeB === 'grass' || typeB === 'sand' || typeB === 'snow') return 1;

        return posA.y - posB.y;
    });

    entities.forEach(entity => {
        const pos = ecs.getComponent(entity, 'position');
        const render = ecs.getComponent(entity, 'renderable');

        // Culling
        const screenX = pos.x - GameState.camera.x;
        const screenY = pos.y - GameState.camera.y;

        if (screenX > -TILE_SIZE && screenX < window.innerWidth && screenY > -TILE_SIZE && screenY < window.innerHeight) {
            const texture = AssetGenerator.getTexture(render.type);
            ctx.drawImage(texture, Math.floor(screenX), Math.floor(screenY));
        }
    });

    // Renderowanie Cząsteczek
    if (GameState.particles) {
        GameState.particles.render(ctx, GameState.camera);
    }

    // Renderowanie Oświetlenia (Overlay)
    if (GameState.lighting) {
        GameState.lighting.render(ctx, GameState.camera, entities, ecs);
    }
}

function createPlayer(x, y) {
    const playerId = engine.ecs.createEntity();
    engine.ecs.addComponent(playerId, 'position', { x: x, y: y });
    engine.ecs.addComponent(playerId, 'renderable', { type: 'player' });
    engine.ecs.addComponent(playerId, 'player', {}); // Tag
}

function handleCombat(player, enemy) {
    // Placeholder for combat
    console.log("Combat started!");
    if (GameState.particles) {
        const pos = engine.ecs.getComponent(enemy, 'position');
        GameState.particles.emit(pos.x, pos.y, 'hit');
    }
}

// Start Gry
function initGame() {
    GameState.map = WorldGenerator.generate(GameState.mapWidth, GameState.mapHeight);

    // Inicjalizacja Systemów Graficznych
    GameState.lighting = new LightingSystem(window.innerWidth, window.innerHeight);
    GameState.particles = new ParticleSystem();

    // Obsługa zmiany rozmiaru okna dla oświetlenia
    window.addEventListener('resize', () => {
        if (GameState.lighting) GameState.lighting.resize(window.innerWidth, window.innerHeight);
    });

    // Teren
    GameState.map.forEach((row, y) => {
        row.forEach((cell, x) => {
            const id = engine.ecs.createEntity();
            engine.ecs.addComponent(id, 'position', { x: x * TILE_SIZE, y: y * TILE_SIZE });

            let renderType = cell.type;
            if (cell.type === 'forest') renderType = 'grass';
            engine.ecs.addComponent(id, 'renderable', { type: renderType });

            if (cell.type === 'forest') {
                const treeId = engine.ecs.createEntity();
                engine.ecs.addComponent(treeId, 'position', { x: x * TILE_SIZE, y: y * TILE_SIZE });
                engine.ecs.addComponent(treeId, 'renderable', { type: 'tree' });
            }
        });
    });

    createPlayer(100, 100);

    engine.ecs.addSystem(MovementSystem);
    engine.ecs.addSystem(EnvironmentSystem);
    engine.ecs.addSystem(RenderSystem);
    engine.start();
}

try {
    initGame();
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
} catch (e) {
    alert("Critical Error: " + e.message + "\n" + e.stack);
    console.error(e);
}
