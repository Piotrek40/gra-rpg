import { TerminalEngine } from './src/core/TerminalEngine.js';
import { TerminalRenderer } from './src/graphics/TerminalRenderer.js';
import { ECS } from './src/core/ECS.js';
import { WorldGenerator } from './src/world/WorldGenerator.js';
import { DungeonGenerator } from './src/world/DungeonGenerator.js';

const engine = new TerminalEngine();
const renderer = new TerminalRenderer();
const ecs = new ECS();

const TILE_SIZE = 32; // Zachowujemy logiczny rozmiar dla kompatybilności

// Stan Gry
const GameState = {
    map: [],
    mapWidth: 50,
    mapHeight: 40,
    location: 'overworld',
};

// System Ruchu
function MovementSystem(ecs, dt) {
    const entities = ecs.query(['position', 'player']);
    entities.forEach(entity => {
        const pos = ecs.getComponent(entity, 'position');
        // Ruch skokowy o 1 kafel (32px)
        // W terminalu lepiej ruszać się o 1 pole na naciśnięcie, ale engine daje ciągły input.
        // Zróbmy prosty cooldown lub sprawdzajmy naciśnięcie.
        // TerminalEngine resetuje klawisze po 100ms, więc powinno działać "tap-to-move".

        let dx = 0;
        let dy = 0;
        const moveSpeed = 32; // 1 tile

        // Pobierz input z silnika
        if (engine.keys['w'] || engine.keys['up']) dy -= moveSpeed;
        if (engine.keys['s'] || engine.keys['down']) dy += moveSpeed;
        if (engine.keys['a'] || engine.keys['left']) dx -= moveSpeed;
        if (engine.keys['d'] || engine.keys['right']) dx += moveSpeed;

        if (dx === 0 && dy === 0) return;

        // Prosta blokada "spamowania" ruchu (opcjonalne, na razie zostawmy płynne)

        const newX = Math.max(0, Math.min(pos.x + dx, GameState.mapWidth * TILE_SIZE - TILE_SIZE));
        const newY = Math.max(0, Math.min(pos.y + dy, GameState.mapHeight * TILE_SIZE - TILE_SIZE));

        const tileX = Math.floor((newX + 16) / TILE_SIZE);
        const tileY = Math.floor((newY + 16) / TILE_SIZE);

        // Kolizje z terenem
        if (tileY >= 0 && tileY < GameState.mapHeight && tileX >= 0 && tileX < GameState.mapWidth) {
            const tile = GameState.map[tileY][tileX];
            const type = tile.type || tile;

            let collision = false;
            if (type === 'water' || type === 'mountain' || type === 'wall') collision = true;

            // Kolizje z wrogami
            const enemies = ecs.query(['enemy', 'position']);
            let enemyCollision = null;
            enemies.forEach(eid => {
                const epos = ecs.getComponent(eid, 'position');
                // Sprawdź czy wchodzimy na pole wroga
                const eTileX = Math.floor(epos.x / TILE_SIZE);
                const eTileY = Math.floor(epos.y / TILE_SIZE);
                if (eTileX === tileX && eTileY === tileY) {
                    enemyCollision = eid;
                }
            });

            if (enemyCollision) {
                handleCombat(entity, enemyCollision);
                collision = true; // Zablokuj ruch
            }

            if (!collision) {
                pos.x = newX;
                pos.y = newY;
                // Wyczyść input żeby nie lecieć jak szalony (pseudo-turowo)
                engine.keys = {};
            }
        }

        // Wejście do lochu
        if (engine.keys['return'] && GameState.location === 'overworld') {
            loadDungeon();
            engine.keys['return'] = false;
        }
    });
}

function handleCombat(attackerId, defenderId) {
    const attackerStats = ecs.getComponent(attackerId, 'stats');
    const defenderStats = ecs.getComponent(defenderId, 'stats');

    if (attackerStats && defenderStats) {
        defenderStats.hp -= attackerStats.damage;
        // Logowanie walki (można dodać do renderera jako osobny bufor wiadomości)
        // Na razie console.log zepsuje render, więc pomijamy.

        if (defenderStats.hp <= 0) {
            ecs.destroyEntity(defenderId);
            if (attackerStats.xp !== undefined) {
                attackerStats.xp += 10;
            }
        }
    }
}

function loadDungeon() {
    GameState.location = 'dungeon';
    GameState.mapWidth = 40;
    GameState.mapHeight = 40;

    ecs.entities = [];
    ecs.components = {};

    const dungeonMap = DungeonGenerator.generate(GameState.mapWidth, GameState.mapHeight);
    GameState.map = dungeonMap;

    // W terminalu nie musimy tworzyć encji dla każdego kafelka podłogi/ściany, bo renderer czyta mapę bezpośrednio.
    // Ale dla spójności z ECS, możemy. Jednak renderer terminalowy czyta GameState.map dla tła.
    // Więc wystarczy stworzyć gracza i wrogów.

    createPlayer(GameState.mapWidth * TILE_SIZE / 2, GameState.mapHeight * TILE_SIZE / 2);

    // Wrogowie
    for (let i = 0; i < 10; i++) {
        let ex, ey;
        do {
            ex = Math.floor(Math.random() * GameState.mapWidth);
            ey = Math.floor(Math.random() * GameState.mapHeight);
        } while (dungeonMap[ey][ex] === 'wall');

        const enemyId = ecs.createEntity();
        ecs.addComponent(enemyId, 'position', { x: ex * TILE_SIZE, y: ey * TILE_SIZE });
        ecs.addComponent(enemyId, 'renderable', { type: 'enemy' });
        ecs.addComponent(enemyId, 'stats', { hp: 20, maxHp: 20, damage: 5 });
        ecs.addComponent(enemyId, 'enemy', {});
    }
}

function createPlayer(x, y) {
    const playerId = ecs.createEntity();
    ecs.addComponent(playerId, 'position', { x: x, y: y });
    ecs.addComponent(playerId, 'renderable', { type: 'player' });
    ecs.addComponent(playerId, 'stats', { hp: 100, maxHp: 100, damage: 10, xp: 0 });
    ecs.addComponent(playerId, 'player', {});
}

function initGame() {
    GameState.map = WorldGenerator.generate(GameState.mapWidth, GameState.mapHeight);
    createPlayer(100, 100);

    // Dodajmy trochę drzew jako encje
    GameState.map.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell.type === 'forest') {
                const treeId = ecs.createEntity();
                ecs.addComponent(treeId, 'position', { x: x * TILE_SIZE, y: y * TILE_SIZE });
                ecs.addComponent(treeId, 'renderable', { type: 'tree' });
            }
        });
    });

    ecs.addSystem(MovementSystem);

    engine.start((dt) => {
        ecs.update(dt);
        renderer.render(ecs, GameState);
    });
}

initGame();
