import { Engine } from './src/core/Engine.js';
import { AssetGenerator } from './src/graphics/AssetGenerator.js';
import { WorldGenerator } from './src/world/WorldGenerator.js';
import { DungeonGenerator } from './src/world/DungeonGenerator.js';
import { LightingSystem } from './src/graphics/LightingSystem.js';
import { ParticleSystem } from './src/graphics/ParticleSystem.js';
import { FogOfWar } from './src/graphics/FogOfWar.js';

const engine = new Engine('gameCanvas');
const TILE_SIZE = 64;

// Płynna kamera
const smoothCamera = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    lerp: function(current, target, factor) {
        return current + (target - current) * factor;
    },
    update: function(dt) {
        const lerpFactor = Math.min(1, dt * 8); // Płynność
        this.x = this.lerp(this.x, this.targetX, lerpFactor);
        this.y = this.lerp(this.y, this.targetY, lerpFactor);
    }
};

// System pogody
const WeatherSystem = {
    type: 'clear', // 'clear', 'rain', 'snow'
    particles: [],
    intensity: 100,

    init: function() {
        // Losowa pogoda
        const rand = Math.random();
        if (rand < 0.2) this.type = 'rain';
        else if (rand < 0.3) this.type = 'snow';
        else this.type = 'clear';
    },

    update: function(dt) {
        if (this.type === 'clear') return;

        // Dodaj nowe cząsteczki
        while (this.particles.length < this.intensity) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: -10,
                speed: this.type === 'rain' ? 400 + Math.random() * 200 : 50 + Math.random() * 50,
                size: this.type === 'rain' ? 2 : 3 + Math.random() * 2,
                drift: this.type === 'snow' ? (Math.random() - 0.5) * 30 : 0
            });
        }

        // Aktualizuj cząsteczki
        this.particles.forEach(p => {
            p.y += p.speed * dt;
            p.x += p.drift * dt;

            if (p.y > window.innerHeight) {
                p.y = -10;
                p.x = Math.random() * window.innerWidth;
            }
        });
    },

    render: function(ctx) {
        if (this.type === 'clear') return;

        ctx.save();
        if (this.type === 'rain') {
            ctx.strokeStyle = 'rgba(150, 200, 255, 0.6)';
            ctx.lineWidth = 1;
            this.particles.forEach(p => {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x, p.y + 10);
                ctx.stroke();
            });
        } else if (this.type === 'snow') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        ctx.restore();
    }
};

// Animacja wody
let waterAnimationFrame = 0;
let waterAnimationTimer = 0;

// Stan Gry
const GameState = {
    map: [],
    mapWidth: 50,
    mapHeight: 40,
    location: 'overworld', // 'overworld' or 'dungeon'
    camera: { x: 0, y: 0 },
    lighting: null,
    particles: null,
    fogOfWar: null,
    gameState: 'menu', // 'menu', 'playing', 'paused', 'gameover'
    menuSelection: 0,
    combatLog: [],
    gameOver: false
};

// Menu główne
const menuOptions = ['Nowa Gra', 'Sterowanie', 'O Grze'];
let showingInfo = null; // 'controls' lub 'about'
let showingInventory = false;
let inventorySelection = 0;

// System Questów
const QuestDatabase = {
    'kill_goblins': {
        id: 'kill_goblins',
        name: 'Polowanie na Gobliny',
        description: 'Zabij 5 goblinów zagrażających wiosce.',
        giver: 'elder',
        type: 'kill',
        target: 'goblin',
        required: 5,
        rewards: { xp: 100, gold: 50 },
        dialogue: {
            start: 'Gobliny terroryzują okolice! Pomożesz nam się ich pozbyć?',
            progress: 'Dziękuję za pomoc! Zostało jeszcze {remaining} goblinów.',
            complete: 'Wspaniale! Ocaliłeś naszą wioskę! Oto twoja nagroda.'
        }
    },
    'kill_orcs': {
        id: 'kill_orcs',
        name: 'Zagrożenie Orków',
        description: 'Pokonaj 3 orki w lochach.',
        giver: 'elder',
        type: 'kill',
        target: 'orc',
        required: 3,
        rewards: { xp: 200, gold: 100 },
        dialogue: {
            start: 'Orki w lochach stają się coraz silniejsze. Musisz ich powstrzymać!',
            progress: 'Zostało {remaining} orków do pokonania.',
            complete: 'Jesteś prawdziwym bohaterem! Przyjmij tę nagrodę.'
        }
    },
    'collect_gold': {
        id: 'collect_gold',
        name: 'Zbieracz Złota',
        description: 'Zbierz 100 złota.',
        giver: 'merchant',
        type: 'collect',
        target: 'gold',
        required: 100,
        rewards: { xp: 75, gold: 25 },
        rewardItem: 'health_potion',
        dialogue: {
            start: 'Potrzebuję złota na nowy towar. Przyniesiesz mi 100 sztuk?',
            progress: 'Masz {current}/{required} złota.',
            complete: 'Doskonale! Weź tę miksturę jako podziękowanie.'
        }
    },
    'explore_dungeon': {
        id: 'explore_dungeon',
        name: 'Odkrywca Lochów',
        description: 'Wejdź do lochu i przeżyj.',
        giver: 'blacksmith',
        type: 'visit',
        target: 'dungeon',
        required: 1,
        rewards: { xp: 50, gold: 30 },
        rewardItem: 'iron_sword',
        dialogue: {
            start: 'Słyszałem o starożytnych lochach. Zbadaj je i wróć cało!',
            progress: 'Musisz odwiedzić loch.',
            complete: 'Wróciłeś! Weź ten miecz, przyda ci się.'
        }
    }
};

// NPC Database
const NPCDatabase = {
    'elder': { name: 'Starzec Mędrzec', type: 'npc_elder', quests: ['kill_goblins', 'kill_orcs'] },
    'merchant': { name: 'Kupiec Marcus', type: 'npc_merchant', quests: ['collect_gold'], shop: true },
    'blacksmith': { name: 'Kowal Thorin', type: 'npc_blacksmith', quests: ['explore_dungeon'], shop: true }
};

// Stan questów
let playerQuests = {
    active: [],      // [{questId, progress}]
    completed: []    // [questId]
};

// UI dialogów i questów
let showingDialog = false;
let currentNPC = null;
let currentNPCId = null;
let dialogState = 'greeting'; // 'greeting', 'quest_offer', 'quest_progress', 'shop'
let dialogOptions = [];
let dialogSelection = 0;
let showingQuestLog = false;

// Wioska
let villageSpawned = false;
let villageCenter = { x: 0, y: 0 };

// Definicje przedmiotów
const ItemDatabase = {
    // Bronie
    'rusty_sword': { name: 'Zardzewiały Miecz', type: 'weapon', damage: 5, value: 10 },
    'iron_sword': { name: 'Żelazny Miecz', type: 'weapon', damage: 10, value: 50 },
    'steel_sword': { name: 'Stalowy Miecz', type: 'weapon', damage: 18, value: 150 },

    // Zbroje
    'leather_armor': { name: 'Skórzana Zbroja', type: 'armor', defense: 3, value: 30 },
    'chain_armor': { name: 'Kolczuga', type: 'armor', defense: 7, value: 100 },
    'plate_armor': { name: 'Zbroja Płytowa', type: 'armor', defense: 12, value: 300 },

    // Mikstury
    'health_potion': { name: 'Mikstura Zdrowia', type: 'consumable', healAmount: 30, value: 20 },
    'greater_health_potion': { name: 'Większa Mikstura Zdrowia', type: 'consumable', healAmount: 60, value: 50 },

    // Skarby
    'gold_coin': { name: 'Złota Moneta', type: 'treasure', value: 25 },
    'gem': { name: 'Klejnot', type: 'treasure', value: 100 }
};

// Input
const keys = {};
const keysPressed = {}; // Dla jednorazowych naciśnięć

window.addEventListener('keydown', e => {
    if (!keys[e.key]) {
        keysPressed[e.key] = true;
    }
    keys[e.key] = true;
});
window.addEventListener('keyup', e => {
    keys[e.key] = false;
    keysPressed[e.key] = false;
});

// Pomocnicza funkcja do jednorazowych naciśnięć
function consumeKey(key) {
    if (keysPressed[key]) {
        keysPressed[key] = false;
        return true;
    }
    return false;
}

// System Menu
function MenuSystem(ecs, dt) {
    if (GameState.gameState !== 'menu') return;

    const ctx = engine.ctx;

    // Tło
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Gwiazdy w tle
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 100; i++) {
        const x = (i * 137) % window.innerWidth;
        const y = (i * 97) % window.innerHeight;
        const size = (i % 3) + 1;
        ctx.fillRect(x, y, size, size);
    }

    // Tytuł
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AETHELGARD', window.innerWidth / 2, 150);

    ctx.fillStyle = '#aaa';
    ctx.font = '20px monospace';
    ctx.fillText('Procedural RPG Adventure', window.innerWidth / 2, 190);

    // Obsługa pokazywania info
    if (showingInfo) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(window.innerWidth / 2 - 250, 250, 500, 300);
        ctx.strokeStyle = '#FFD700';
        ctx.strokeRect(window.innerWidth / 2 - 250, 250, 500, 300);

        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';

        if (showingInfo === 'controls') {
            ctx.fillText('STEROWANIE', window.innerWidth / 2, 290);
            ctx.font = '14px monospace';
            ctx.textAlign = 'left';
            const controls = [
                'W/A/S/D lub Strzałki   - Ruch',
                'Enter                  - Wejdź do lochu',
                'E                      - Wyjdź z lochu',
                'I                      - Ekwipunek',
                'J                      - Dziennik questów',
                'F                      - Rozmawiaj z NPC',
                'ESC                    - Zamknij menu',
                '',
                'Znajdź wioskę i rozmawiaj z NPC!'
            ];
            controls.forEach((line, i) => {
                ctx.fillText(line, window.innerWidth / 2 - 220, 330 + i * 25);
            });
        } else if (showingInfo === 'about') {
            ctx.fillText('O GRZE', window.innerWidth / 2, 290);
            ctx.font = '14px monospace';
            ctx.textAlign = 'left';
            const about = [
                'Aethelgard to proceduralna gra RPG.',
                '',
                'Świat jest generowany za każdym razem',
                'na nowo przy użyciu algorytmów szumu.',
                '',
                'Eksploruj, walcz z wrogami, zdobywaj',
                'doświadczenie i rozwijaj postać!',
                '',
                'Wersja: 0.2.0 Alpha'
            ];
            about.forEach((line, i) => {
                ctx.fillText(line, window.innerWidth / 2 - 220, 330 + i * 25);
            });
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';
        ctx.fillText('Naciśnij ESC aby wrócić', window.innerWidth / 2, 530);

        if (consumeKey('Escape')) {
            showingInfo = null;
        }
        return;
    }

    // Opcje menu
    ctx.textAlign = 'center';
    menuOptions.forEach((option, i) => {
        const y = 300 + i * 60;
        const isSelected = i === GameState.menuSelection;

        if (isSelected) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
            ctx.fillRect(window.innerWidth / 2 - 150, y - 30, 300, 50);
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 28px monospace';
        } else {
            ctx.fillStyle = '#888';
            ctx.font = '24px monospace';
        }

        ctx.fillText(option, window.innerWidth / 2, y);
    });

    // Instrukcje
    ctx.fillStyle = '#666';
    ctx.font = '16px monospace';
    ctx.fillText('Użyj strzałek ↑↓ i Enter aby wybrać', window.innerWidth / 2, window.innerHeight - 50);

    ctx.textAlign = 'left';

    // Nawigacja menu
    if (consumeKey('ArrowUp') || consumeKey('w')) {
        GameState.menuSelection = (GameState.menuSelection - 1 + menuOptions.length) % menuOptions.length;
    }
    if (consumeKey('ArrowDown') || consumeKey('s')) {
        GameState.menuSelection = (GameState.menuSelection + 1) % menuOptions.length;
    }
    if (consumeKey('Enter')) {
        if (GameState.menuSelection === 0) {
            // Nowa Gra
            GameState.gameState = 'playing';
            startNewGame();
        } else if (GameState.menuSelection === 1) {
            showingInfo = 'controls';
        } else if (GameState.menuSelection === 2) {
            showingInfo = 'about';
        }
    }
}

function startNewGame() {
    // Reset stanu gry
    GameState.location = 'overworld';
    GameState.gameOver = false;
    GameState.combatLog = [];

    // Reset UI
    showingInventory = false;
    inventorySelection = 0;
    showingDialog = false;
    showingQuestLog = false;
    currentNPC = null;
    currentNPCId = null;

    // Reset questów
    playerQuests = { active: [], completed: [] };
    villageSpawned = false;

    // Wyczyść ECS
    engine.ecs.entities = [];
    engine.ecs.components = {};
    engine.ecs.nextEntityId = 1;

    // Generuj świat
    GameState.map = WorldGenerator.generate(GameState.mapWidth, GameState.mapHeight);

    // Inicjalizacja systemów graficznych
    GameState.lighting = new LightingSystem(window.innerWidth, window.innerHeight);
    GameState.particles = new ParticleSystem();
    GameState.fogOfWar = new FogOfWar(GameState.mapWidth, GameState.mapHeight, TILE_SIZE);

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
    spawnVillage();
    spawnEnemies();
    spawnItems();

    // Inicjalizacja kamery
    smoothCamera.x = 100 - window.innerWidth / 2;
    smoothCamera.y = 100 - window.innerHeight / 2;
    smoothCamera.targetX = smoothCamera.x;
    smoothCamera.targetY = smoothCamera.y;

    // Inicjalizacja pogody
    WeatherSystem.init();
    WeatherSystem.particles = [];

    // Odkryj początkowy obszar wokół gracza
    if (GameState.fogOfWar) {
        GameState.fogOfWar.update(100, 100);
    }

    GameState.combatLog.push('Witaj w Aethelgard!');
    GameState.combatLog.push('Znajdź wioskę [F] aby rozmawiać');

    // Info o pogodzie
    if (WeatherSystem.type !== 'clear') {
        const weatherNames = { rain: 'Pada deszcz', snow: 'Pada śnieg' };
        GameState.combatLog.push(weatherNames[WeatherSystem.type]);
    }
}

// System Ruchu
function MovementSystem(ecs, dt) {
    if (GameState.gameState !== 'playing' || GameState.gameOver) return;

    // Nie ruszaj się gdy ekwipunek, dialog lub quest log otwarty
    if (showingInventory || showingQuestLog) return;

    // Obsługa dialogu
    if (showingDialog) {
        if (consumeKey('ArrowUp') || consumeKey('w')) {
            dialogSelection = Math.max(0, dialogSelection - 1);
        }
        if (consumeKey('ArrowDown') || consumeKey('s')) {
            dialogSelection = Math.min(dialogOptions.length - 1, dialogSelection + 1);
        }
        if (consumeKey('Enter')) {
            handleDialogAction(dialogOptions[dialogSelection].action);
        }
        if (consumeKey('Escape')) {
            showingDialog = false;
            currentNPC = null;
            currentNPCId = null;
        }
        return;
    }

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

        // Kamera podąża za graczem (płynnie)
        smoothCamera.targetX = pos.x - window.innerWidth / 2;
        smoothCamera.targetY = pos.y - window.innerHeight / 2;

        // Aktualizuj fog of war
        if (GameState.fogOfWar) {
            GameState.fogOfWar.update(pos.x, pos.y);
        }

        // Podnoszenie przedmiotów
        const items = ecs.query(['item', 'position']);
        items.forEach(itemId => {
            const itemPos = ecs.getComponent(itemId, 'position');
            if (Math.abs(itemPos.x - pos.x) < 24 && Math.abs(itemPos.y - pos.y) < 24) {
                pickupItem(entity, itemId);
            }
        });

        // Wejście do lochu (overworld) lub wyjście z lochu (dungeon)
        if (consumeKey('Enter') && GameState.location === 'overworld') {
            loadDungeon();
        }
        if ((consumeKey('e') || consumeKey('E')) && GameState.location === 'dungeon') {
            exitDungeon();
        }

        // Otwórz/zamknij ekwipunek
        if (consumeKey('i') || consumeKey('I')) {
            showingInventory = !showingInventory;
            inventorySelection = 0;
        }

        // Otwórz/zamknij dziennik questów
        if (consumeKey('j') || consumeKey('J')) {
            showingQuestLog = !showingQuestLog;
        }

        // Interakcja z NPC (F)
        if (consumeKey('f') || consumeKey('F')) {
            const npcs = ecs.query(['npc', 'position']);
            let closestNPC = null;
            let closestDist = 64; // Maksymalna odległość interakcji

            npcs.forEach(npcId => {
                const npcPos = ecs.getComponent(npcId, 'position');
                const dist = Math.sqrt(
                    Math.pow(npcPos.x - pos.x, 2) +
                    Math.pow(npcPos.y - pos.y, 2)
                );
                if (dist < closestDist) {
                    closestDist = dist;
                    closestNPC = npcId;
                }
            });

            if (closestNPC) {
                interactWithNPC(closestNPC);
            }
        }
    });
}

function pickupItem(playerId, itemId) {
    const inventory = engine.ecs.getComponent(playerId, 'inventory');
    const item = engine.ecs.getComponent(itemId, 'item');

    if (!inventory || !item) return;

    // Złoto i skarby dodajemy bezpośrednio
    if (item.type === 'treasure') {
        inventory.gold += item.value;
        GameState.combatLog.push(`+${item.value} złota!`);
        // Aktualizuj postęp questów (collect gold)
        updateQuestProgress('collect', 'gold', item.value);
    } else {
        // Inne przedmioty do ekwipunku
        inventory.items.push({ ...item });
        GameState.combatLog.push(`Znaleziono: ${item.name}`);
    }

    engine.ecs.destroyEntity(itemId);
}

function useItem(playerId, itemIndex) {
    const inventory = engine.ecs.getComponent(playerId, 'inventory');
    const stats = engine.ecs.getComponent(playerId, 'stats');

    if (!inventory || !stats || itemIndex < 0 || itemIndex >= inventory.items.length) return;

    const item = inventory.items[itemIndex];

    if (item.type === 'consumable') {
        // Użyj mikstury
        if (item.healAmount) {
            const healAmount = Math.min(item.healAmount, stats.maxHp - stats.hp);
            stats.hp += healAmount;
            GameState.combatLog.push(`Wyleczono ${healAmount} HP!`);
        }
        inventory.items.splice(itemIndex, 1);
    } else if (item.type === 'weapon') {
        // Zdejmij stary, załóż nowy
        if (inventory.equippedWeapon) {
            inventory.items.push(inventory.equippedWeapon);
        }
        inventory.equippedWeapon = item;
        inventory.items.splice(itemIndex, 1);
        GameState.combatLog.push(`Wyekwipowano: ${item.name}`);
    } else if (item.type === 'armor') {
        if (inventory.equippedArmor) {
            inventory.items.push(inventory.equippedArmor);
        }
        inventory.equippedArmor = item;
        inventory.items.splice(itemIndex, 1);
        GameState.combatLog.push(`Założono: ${item.name}`);
    }

    // Przelicz statystyki
    recalculateStats(playerId);
}

function recalculateStats(playerId) {
    const stats = engine.ecs.getComponent(playerId, 'stats');
    const inventory = engine.ecs.getComponent(playerId, 'inventory');

    if (!stats || !inventory) return;

    // Bazowe statystyki (zależne od poziomu)
    const baseDamage = 15 + (stats.level - 1) * 3;
    const baseDefense = 5 + (stats.level - 1);

    // Dodaj bonusy z ekwipunku
    stats.damage = baseDamage + (inventory.equippedWeapon?.damage || 0);
    stats.defense = baseDefense + (inventory.equippedArmor?.defense || 0);
}

function loadDungeon() {
    // Zachowaj dane gracza przed resetem
    const players = engine.ecs.query(['player', 'stats']);
    let savedStats = null;
    let savedInventory = null;

    if (players.length > 0) {
        savedStats = { ...engine.ecs.getComponent(players[0], 'stats') };
        savedInventory = JSON.parse(JSON.stringify(engine.ecs.getComponent(players[0], 'inventory')));
    }

    GameState.location = 'dungeon';
    GameState.mapWidth = 40;
    GameState.mapHeight = 40;

    // Wyczyść ECS
    engine.ecs.entities = [];
    engine.ecs.components = {};
    engine.ecs.nextEntityId = 1;

    const dungeonMap = DungeonGenerator.generate(GameState.mapWidth, GameState.mapHeight);
    GameState.map = dungeonMap;

    // Tworzenie encji terenu
    dungeonMap.forEach((row, y) => {
        row.forEach((type, x) => {
            const id = engine.ecs.createEntity();
            engine.ecs.addComponent(id, 'position', { x: x * TILE_SIZE, y: y * TILE_SIZE });
            engine.ecs.addComponent(id, 'renderable', { type: type });
        });
    });

    // Gracz w środku z zachowanymi statystykami
    const playerX = GameState.mapWidth * TILE_SIZE / 2;
    const playerY = GameState.mapHeight * TILE_SIZE / 2;
    const playerId = engine.ecs.createEntity();
    engine.ecs.addComponent(playerId, 'position', { x: playerX, y: playerY });
    engine.ecs.addComponent(playerId, 'renderable', { type: 'player' });
    engine.ecs.addComponent(playerId, 'player', {});

    if (savedStats) {
        engine.ecs.addComponent(playerId, 'stats', savedStats);
    } else {
        engine.ecs.addComponent(playerId, 'stats', {
            hp: 100, maxHp: 100, damage: 15, defense: 5, xp: 0, xpToLevel: 100, level: 1
        });
    }

    if (savedInventory) {
        engine.ecs.addComponent(playerId, 'inventory', savedInventory);
    } else {
        engine.ecs.addComponent(playerId, 'inventory', {
            items: [], gold: 0, equippedWeapon: null, equippedArmor: null
        });
    }

    // Reset fog of war dla nowej mapy
    if (GameState.fogOfWar) {
        GameState.fogOfWar.reset(GameState.mapWidth, GameState.mapHeight);
        GameState.fogOfWar.update(playerX, playerY); // Odkryj początkową pozycję
    }

    // Spawn wrogów w lochu (więcej i silniejszych)
    spawnDungeonEnemies();

    // Spawn przedmiotów w lochu
    spawnDungeonItems();

    GameState.combatLog.push('Wszedłeś do mrocznego lochu!');
    GameState.combatLog.push('[E] aby wyjść');

    // Aktualizuj postęp questów (visit dungeon)
    updateQuestProgress('visit', 'dungeon');
}

function spawnDungeonEnemies() {
    const enemyCount = 10;
    const enemyTypes = ['orc', 'orc', 'troll', 'troll'];

    for (let i = 0; i < enemyCount; i++) {
        let x, y;
        let attempts = 0;

        do {
            x = Math.floor(Math.random() * GameState.mapWidth);
            y = Math.floor(Math.random() * GameState.mapHeight);
            attempts++;
        } while (GameState.map[y][x] === 'wall' && attempts < 100);

        if (attempts < 100 && GameState.map[y][x] === 'floor') {
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            createEnemy(x * TILE_SIZE, y * TILE_SIZE, type);
        }
    }
}

function spawnDungeonItems() {
    const itemTypes = ['health_potion', 'greater_health_potion', 'iron_sword', 'steel_sword',
                       'chain_armor', 'plate_armor', 'gem', 'gem'];
    const itemCount = 8;

    for (let i = 0; i < itemCount; i++) {
        let x, y;
        let attempts = 0;

        do {
            x = Math.floor(Math.random() * GameState.mapWidth);
            y = Math.floor(Math.random() * GameState.mapHeight);
            attempts++;
        } while (GameState.map[y][x] === 'wall' && attempts < 100);

        if (attempts < 100 && GameState.map[y][x] === 'floor') {
            const itemId = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            createItem(x * TILE_SIZE, y * TILE_SIZE, itemId);
        }
    }
}

function exitDungeon() {
    // Zachowaj dane gracza
    const players = engine.ecs.query(['player', 'stats']);
    let savedStats = null;
    let savedInventory = null;

    if (players.length > 0) {
        savedStats = { ...engine.ecs.getComponent(players[0], 'stats') };
        savedInventory = JSON.parse(JSON.stringify(engine.ecs.getComponent(players[0], 'inventory')));
    }

    GameState.location = 'overworld';
    GameState.mapWidth = 50;
    GameState.mapHeight = 40;

    // Wyczyść ECS
    engine.ecs.entities = [];
    engine.ecs.components = {};
    engine.ecs.nextEntityId = 1;

    // Regeneruj świat
    GameState.map = WorldGenerator.generate(GameState.mapWidth, GameState.mapHeight);

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

    // Gracz z zachowanymi statystykami
    const playerId = engine.ecs.createEntity();
    engine.ecs.addComponent(playerId, 'position', { x: 100, y: 100 });
    engine.ecs.addComponent(playerId, 'renderable', { type: 'player' });
    engine.ecs.addComponent(playerId, 'player', {});

    if (savedStats) {
        engine.ecs.addComponent(playerId, 'stats', savedStats);
    }
    if (savedInventory) {
        engine.ecs.addComponent(playerId, 'inventory', savedInventory);
    }

    spawnEnemies();
    spawnItems();

    // Reset fog of war dla nowej mapy
    if (GameState.fogOfWar) {
        GameState.fogOfWar.reset(GameState.mapWidth, GameState.mapHeight);
        GameState.fogOfWar.update(100, 100); // Odkryj początkową pozycję
    }

    GameState.combatLog.push('Wróciłeś na powierzchnię!');
}

// System Środowiska (Czas, Cząsteczki, Pogoda, Kamera)
function EnvironmentSystem(ecs, dt) {
    if (GameState.gameState !== 'playing') return;

    if (GameState.lighting) GameState.lighting.update(dt);
    if (GameState.particles) GameState.particles.update(dt);

    // Płynna kamera
    smoothCamera.update(dt);
    GameState.camera.x = smoothCamera.x;
    GameState.camera.y = smoothCamera.y;

    // System pogody
    WeatherSystem.update(dt);

    // Animacja wody
    waterAnimationTimer += dt;
    if (waterAnimationTimer > 0.2) { // Co 200ms zmień klatkę
        waterAnimationTimer = 0;
        waterAnimationFrame = (waterAnimationFrame + 1) % 4;
    }
}

// System HUD
function HUDSystem(ecs, dt) {
    if (GameState.gameState !== 'playing') return;

    const ctx = engine.ctx;
    const players = ecs.query(['player', 'stats']);

    if (players.length === 0) return;

    const stats = ecs.getComponent(players[0], 'stats');
    if (!stats) return;

    ctx.save();

    // Tło HUD
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 320, 100);

    // Pasek HP
    ctx.fillStyle = '#333';
    ctx.fillRect(20, 25, 200, 20);
    const hpPercent = stats.hp / stats.maxHp;
    ctx.fillStyle = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FF9800' : '#F44336';
    ctx.fillRect(20, 25, 200 * hpPercent, 20);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(20, 25, 200, 20);

    // Tekst HP
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`HP: ${stats.hp}/${stats.maxHp}`, 25, 40);

    // Pasek XP
    ctx.fillStyle = '#333';
    ctx.fillRect(20, 50, 200, 15);
    const xpPercent = stats.xp / stats.xpToLevel;
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(20, 50, 200 * xpPercent, 15);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(20, 50, 200, 15);

    // Tekst Level/XP
    ctx.fillText(`Lvl ${stats.level} - XP: ${stats.xp}/${stats.xpToLevel}`, 25, 62);

    // Statystyki i złoto
    const inventory = ecs.getComponent(players[0], 'inventory');
    const gold = inventory ? inventory.gold : 0;
    ctx.fillText(`DMG: ${stats.damage}  DEF: ${stats.defense}  Złoto: ${gold}`, 20, 85);

    // Lokalizacja i podpowiedź
    const locationHint = GameState.location === 'dungeon' ? '[E] Wyjdź' : '[Enter] Loch';
    ctx.fillText(`Lokacja: ${GameState.location}  |  [I] Ekwip. [J] Questy [F] Rozm.  |  ${locationHint}`, 20, 100);

    // Combat Log (prawy górny róg)
    if (GameState.combatLog && GameState.combatLog.length > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(window.innerWidth - 260, 10, 250, 110);

        ctx.fillStyle = '#fff';
        ctx.font = '11px monospace';
        GameState.combatLog.forEach((msg, i) => {
            ctx.fillText(msg, window.innerWidth - 250, 30 + i * 20);
        });
    }

    // Game Over
    if (GameState.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        ctx.fillStyle = '#F44336';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', window.innerWidth / 2, window.innerHeight / 2);

        ctx.fillStyle = '#fff';
        ctx.font = '20px monospace';
        ctx.fillText('Naciśnij Enter aby wrócić do menu', window.innerWidth / 2, window.innerHeight / 2 + 50);
        ctx.textAlign = 'left';

        // Powrót do menu
        if (consumeKey('Enter') || consumeKey('Escape')) {
            GameState.gameState = 'menu';
            GameState.gameOver = false;
            GameState.menuSelection = 0;
        }
    }

    // Minimapa (prawy dolny róg)
    renderMinimap(ctx);

    // Ekwipunek
    if (showingInventory) {
        renderInventory(ctx, players[0]);
    }

    // Dialog z NPC
    renderDialog(ctx);

    // Dziennik questów
    renderQuestLog(ctx);

    ctx.restore();
}

function renderInventory(ctx, playerId) {
    const inventory = engine.ecs.getComponent(playerId, 'inventory');
    if (!inventory) return;

    const width = 400;
    const height = 450;
    const x = (window.innerWidth - width) / 2;
    const y = (window.innerHeight - height) / 2;

    // Tło
    ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Tytuł
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EKWIPUNEK', x + width / 2, y + 35);

    // Złoto
    ctx.fillStyle = '#FFD700';
    ctx.font = '16px monospace';
    ctx.fillText(`Złoto: ${inventory.gold}`, x + width / 2, y + 60);

    // Wyekwipowane przedmioty
    ctx.textAlign = 'left';
    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText('Wyekwipowane:', x + 20, y + 90);

    ctx.fillStyle = '#fff';
    const weaponText = inventory.equippedWeapon ? `${inventory.equippedWeapon.name} (+${inventory.equippedWeapon.damage} DMG)` : '(brak)';
    const armorText = inventory.equippedArmor ? `${inventory.equippedArmor.name} (+${inventory.equippedArmor.defense} DEF)` : '(brak)';
    ctx.fillText(`Broń: ${weaponText}`, x + 20, y + 110);
    ctx.fillText(`Zbroja: ${armorText}`, x + 20, y + 130);

    // Lista przedmiotów
    ctx.fillStyle = '#aaa';
    ctx.fillText('Przedmioty (Enter = użyj):', x + 20, y + 165);

    if (inventory.items.length === 0) {
        ctx.fillStyle = '#666';
        ctx.fillText('(pusty)', x + 20, y + 190);
    } else {
        inventory.items.forEach((item, i) => {
            const itemY = y + 190 + i * 25;
            const isSelected = i === inventorySelection;

            if (isSelected) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.fillRect(x + 15, itemY - 15, width - 30, 22);
            }

            ctx.fillStyle = isSelected ? '#FFD700' : '#fff';
            ctx.font = isSelected ? 'bold 14px monospace' : '14px monospace';

            let itemInfo = item.name;
            if (item.type === 'weapon') itemInfo += ` (+${item.damage} DMG)`;
            if (item.type === 'armor') itemInfo += ` (+${item.defense} DEF)`;
            if (item.type === 'consumable') itemInfo += ` (+${item.healAmount} HP)`;

            ctx.fillText(`${i + 1}. ${itemInfo}`, x + 20, itemY);
        });
    }

    // Instrukcje
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('↑↓ = wybierz | Enter = użyj/załóż | I/ESC = zamknij', x + width / 2, y + height - 20);

    ctx.textAlign = 'left';

    // Nawigacja ekwipunku
    if (consumeKey('ArrowUp') || consumeKey('w')) {
        inventorySelection = Math.max(0, inventorySelection - 1);
    }
    if (consumeKey('ArrowDown') || consumeKey('s')) {
        inventorySelection = Math.min(inventory.items.length - 1, inventorySelection + 1);
    }
    if (consumeKey('Enter') && inventory.items.length > 0) {
        useItem(playerId, inventorySelection);
        if (inventorySelection >= inventory.items.length) {
            inventorySelection = Math.max(0, inventory.items.length - 1);
        }
    }
    if (consumeKey('Escape')) {
        showingInventory = false;
    }
}

function renderMinimap(ctx) {
    const minimapSize = 150;
    const minimapX = window.innerWidth - minimapSize - 10;
    const minimapY = window.innerHeight - minimapSize - 10;
    const tileSize = minimapSize / GameState.mapWidth;

    // Tło minimapy
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(minimapX - 5, minimapY - 5, minimapSize + 10, minimapSize + 10);

    // Rysuj mapę
    GameState.map.forEach((row, y) => {
        row.forEach((cell, x) => {
            const type = cell.type || cell;
            let color = '#4CAF50'; // grass
            if (type === 'water') color = '#2196F3';
            if (type === 'sand') color = '#FFC107';
            if (type === 'mountain') color = '#607D8B';
            if (type === 'snow') color = '#ECEFF1';
            if (type === 'forest') color = '#2E7D32';
            if (type === 'wall') color = '#424242';
            if (type === 'floor') color = '#795548';

            ctx.fillStyle = color;
            ctx.fillRect(minimapX + x * tileSize, minimapY + y * tileSize, tileSize + 0.5, tileSize + 0.5);
        });
    });

    // Wrogowie na minimapie
    const enemies = engine.ecs.query(['enemy', 'position']);
    ctx.fillStyle = '#F44336';
    enemies.forEach(id => {
        const pos = engine.ecs.getComponent(id, 'position');
        const mx = minimapX + (pos.x / TILE_SIZE) * tileSize;
        const my = minimapY + (pos.y / TILE_SIZE) * tileSize;
        ctx.fillRect(mx - 1, my - 1, 3, 3);
    });

    // NPC na minimapie (niebieskie)
    const npcs = engine.ecs.query(['npc', 'position']);
    ctx.fillStyle = '#2196F3';
    npcs.forEach(id => {
        const pos = engine.ecs.getComponent(id, 'position');
        const mx = minimapX + (pos.x / TILE_SIZE) * tileSize;
        const my = minimapY + (pos.y / TILE_SIZE) * tileSize;
        ctx.fillRect(mx - 1, my - 1, 4, 4);
    });

    // Gracz na minimapie
    const players = engine.ecs.query(['player', 'position']);
    ctx.fillStyle = '#FFEB3B';
    players.forEach(id => {
        const pos = engine.ecs.getComponent(id, 'position');
        const mx = minimapX + (pos.x / TILE_SIZE) * tileSize;
        const my = minimapY + (pos.y / TILE_SIZE) * tileSize;
        ctx.fillRect(mx - 2, my - 2, 5, 5);
    });

    // Ramka minimapy
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(minimapX - 5, minimapY - 5, minimapSize + 10, minimapSize + 10);
}

function renderDialog(ctx) {
    if (!showingDialog || !currentNPC) return;

    const width = 500;
    const height = 250;
    const x = (window.innerWidth - width) / 2;
    const y = window.innerHeight - height - 50;

    // Tło dialogu
    ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Imię NPC
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(currentNPC.name, x + width / 2, y + 30);

    // Tekst dialogu
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';

    const dialogText = getDialogText();
    const words = dialogText.split(' ');
    let lines = [];
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + word).length > 55) {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    });
    if (currentLine.trim()) lines.push(currentLine.trim());

    lines.forEach((line, i) => {
        ctx.fillText(line, x + 20, y + 60 + i * 20);
    });

    // Opcje dialogowe
    const optionsStartY = y + 140;
    dialogOptions.forEach((option, i) => {
        const isSelected = i === dialogSelection;

        if (isSelected) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.fillRect(x + 15, optionsStartY + i * 30 - 15, width - 30, 25);
        }

        ctx.fillStyle = isSelected ? '#FFD700' : '#aaa';
        ctx.font = isSelected ? 'bold 14px monospace' : '14px monospace';
        ctx.fillText(`> ${option.text}`, x + 25, optionsStartY + i * 30);
    });

    // Instrukcje
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('↑↓ = wybierz | Enter = potwierdź | ESC = zamknij', x + width / 2, y + height - 15);
    ctx.textAlign = 'left';
}

function renderQuestLog(ctx) {
    if (!showingQuestLog) return;

    const width = 450;
    const height = 400;
    const x = (window.innerWidth - width) / 2;
    const y = (window.innerHeight - height) / 2;

    // Tło
    ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Tytuł
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DZIENNIK QUESTÓW', x + width / 2, y + 35);

    ctx.textAlign = 'left';
    let currentY = y + 70;

    // Aktywne questy
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Aktywne zadania:', x + 20, currentY);
    currentY += 25;

    if (playerQuests.active.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '14px monospace';
        ctx.fillText('Brak aktywnych zadań', x + 30, currentY);
        currentY += 30;
    } else {
        playerQuests.active.forEach(aq => {
            const quest = QuestDatabase[aq.questId];
            if (!quest) return;

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px monospace';
            ctx.fillText(quest.name, x + 30, currentY);
            currentY += 18;

            ctx.fillStyle = '#aaa';
            ctx.font = '12px monospace';
            ctx.fillText(quest.description, x + 30, currentY);
            currentY += 18;

            // Postęp
            const progressText = `Postęp: ${aq.progress}/${quest.required}`;
            const isComplete = aq.progress >= quest.required;
            ctx.fillStyle = isComplete ? '#4CAF50' : '#FF9800';
            ctx.fillText(progressText + (isComplete ? ' (Gotowy!)' : ''), x + 30, currentY);
            currentY += 25;
        });
    }

    // Ukończone questy
    currentY += 10;
    ctx.fillStyle = '#888';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Ukończone:', x + 20, currentY);
    currentY += 25;

    if (playerQuests.completed.length === 0) {
        ctx.fillStyle = '#555';
        ctx.font = '14px monospace';
        ctx.fillText('Brak ukończonych zadań', x + 30, currentY);
    } else {
        playerQuests.completed.forEach(qId => {
            const quest = QuestDatabase[qId];
            if (!quest) return;

            ctx.fillStyle = '#666';
            ctx.font = '14px monospace';
            ctx.fillText(`✓ ${quest.name}`, x + 30, currentY);
            currentY += 20;
        });
    }

    // Instrukcje
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('J/ESC = zamknij', x + width / 2, y + height - 15);
    ctx.textAlign = 'left';

    // Obsługa zamknięcia
    if (consumeKey('Escape') || consumeKey('j') || consumeKey('J')) {
        showingQuestLog = false;
    }
}

// System Renderowania
function RenderSystem(ecs, dt) {
    if (GameState.gameState !== 'playing') return;

    const ctx = engine.ctx;
    const entities = ecs.query(['position', 'renderable']);

    // Sortowanie Y
    entities.sort((a, b) => {
        const posA = ecs.getComponent(a, 'position');
        const posB = ecs.getComponent(b, 'position');
        const typeA = ecs.getComponent(a, 'renderable').type;
        const typeB = ecs.getComponent(b, 'renderable').type;

        if (typeA === 'floor' || typeA === 'grass' || typeA === 'sand' || typeA === 'snow' || typeA === 'water') return -1;
        if (typeB === 'floor' || typeB === 'grass' || typeB === 'sand' || typeB === 'snow' || typeB === 'water') return 1;

        return posA.y - posB.y;
    });

    entities.forEach(entity => {
        const pos = ecs.getComponent(entity, 'position');
        const render = ecs.getComponent(entity, 'renderable');

        // Culling
        const screenX = pos.x - GameState.camera.x;
        const screenY = pos.y - GameState.camera.y;

        if (screenX > -TILE_SIZE && screenX < window.innerWidth && screenY > -TILE_SIZE && screenY < window.innerHeight) {
            let texture;

            // Animowana woda
            if (render.type === 'water') {
                texture = AssetGenerator.getAnimatedTexture('water', waterAnimationFrame);
            } else {
                texture = AssetGenerator.getTexture(render.type);
            }

            ctx.drawImage(texture, Math.floor(screenX), Math.floor(screenY));
        }
    });

    // Renderowanie Cząsteczek
    if (GameState.particles) {
        GameState.particles.render(ctx, GameState.camera);
    }

    // Renderowanie Oświetlenia (Overlay) - tylko w nocy
    if (GameState.lighting) {
        GameState.lighting.render(ctx, GameState.camera, entities, ecs);
    }

    // Renderowanie Fog of War
    if (GameState.fogOfWar) {
        GameState.fogOfWar.render(ctx, GameState.camera, window.innerWidth, window.innerHeight);
    }

    // Renderowanie Pogody
    WeatherSystem.render(ctx);
}

function createPlayer(x, y) {
    const playerId = engine.ecs.createEntity();
    engine.ecs.addComponent(playerId, 'position', { x: x, y: y });
    engine.ecs.addComponent(playerId, 'renderable', { type: 'player' });
    engine.ecs.addComponent(playerId, 'player', {}); // Tag
    engine.ecs.addComponent(playerId, 'stats', {
        hp: 100,
        maxHp: 100,
        damage: 15,
        defense: 5,
        xp: 0,
        xpToLevel: 100,
        level: 1
    });
    engine.ecs.addComponent(playerId, 'inventory', {
        items: [],
        gold: 0,
        equippedWeapon: null,
        equippedArmor: null
    });
}

function createItem(x, y, itemId) {
    const item = ItemDatabase[itemId];
    if (!item) return null;

    const id = engine.ecs.createEntity();
    engine.ecs.addComponent(id, 'position', { x: x, y: y });
    engine.ecs.addComponent(id, 'renderable', { type: 'item' });
    engine.ecs.addComponent(id, 'item', { itemId: itemId, ...item });
    return id;
}

function createNPC(x, y, npcKey) {
    const npcData = NPCDatabase[npcKey];
    if (!npcData) return null;

    const id = engine.ecs.createEntity();
    engine.ecs.addComponent(id, 'position', { x: x, y: y });
    engine.ecs.addComponent(id, 'renderable', { type: npcData.type });
    engine.ecs.addComponent(id, 'npc', {
        key: npcKey,
        name: npcData.name,
        quests: npcData.quests || [],
        shop: npcData.shop || false
    });
    return id;
}

function spawnVillage() {
    // Znajdź odpowiednie miejsce na wioskę (trawa)
    let villageX, villageY;
    let attempts = 0;

    do {
        villageX = 10 + Math.floor(Math.random() * (GameState.mapWidth - 20));
        villageY = 10 + Math.floor(Math.random() * (GameState.mapHeight - 20));
        attempts++;
    } while (
        (GameState.map[villageY][villageX].type !== 'grass' &&
         GameState.map[villageY][villageX].type !== 'sand') &&
        attempts < 100
    );

    if (attempts >= 100) {
        villageX = 15;
        villageY = 15;
    }

    villageCenter = { x: villageX * TILE_SIZE, y: villageY * TILE_SIZE };
    villageSpawned = true;

    // Twórz domy wioski (5 domów w okolicy)
    const housePositions = [
        { dx: -2, dy: -2 }, { dx: 2, dy: -2 },
        { dx: 0, dy: 0 },
        { dx: -2, dy: 2 }, { dx: 2, dy: 2 }
    ];

    housePositions.forEach(offset => {
        const hx = villageX + offset.dx;
        const hy = villageY + offset.dy;

        if (hx >= 0 && hx < GameState.mapWidth && hy >= 0 && hy < GameState.mapHeight) {
            const houseId = engine.ecs.createEntity();
            engine.ecs.addComponent(houseId, 'position', { x: hx * TILE_SIZE, y: hy * TILE_SIZE });
            engine.ecs.addComponent(houseId, 'renderable', { type: 'village_house' });
        }
    });

    // Spawn NPC
    createNPC((villageX - 1) * TILE_SIZE, villageY * TILE_SIZE, 'elder');
    createNPC((villageX + 1) * TILE_SIZE, villageY * TILE_SIZE, 'merchant');
    createNPC(villageX * TILE_SIZE, (villageY + 1) * TILE_SIZE, 'blacksmith');

    // Dodaj markery questów dla NPC z questami
    updateQuestMarkers();
}

function updateQuestMarkers() {
    // Usuń istniejące markery
    const markers = engine.ecs.query(['quest_marker']);
    markers.forEach(id => engine.ecs.destroyEntity(id));

    // Dodaj markery dla NPC z dostępnymi questami
    const npcs = engine.ecs.query(['npc', 'position']);
    npcs.forEach(npcId => {
        const npc = engine.ecs.getComponent(npcId, 'npc');
        const pos = engine.ecs.getComponent(npcId, 'position');

        // Sprawdź czy NPC ma quest do dania
        const availableQuest = npc.quests.find(qId =>
            !playerQuests.completed.includes(qId) &&
            !playerQuests.active.find(aq => aq.questId === qId)
        );

        if (availableQuest) {
            const markerId = engine.ecs.createEntity();
            engine.ecs.addComponent(markerId, 'position', { x: pos.x + 8, y: pos.y - 20 });
            engine.ecs.addComponent(markerId, 'renderable', { type: 'quest_marker' });
            engine.ecs.addComponent(markerId, 'quest_marker', { npcId: npcId });
        }
    });
}

// System interakcji z NPC
function interactWithNPC(npcId) {
    const npc = engine.ecs.getComponent(npcId, 'npc');
    if (!npc) return;

    currentNPC = npc;
    currentNPCId = npcId;
    showingDialog = true;
    dialogSelection = 0;

    // Sprawdź stan questów dla tego NPC
    const activeQuest = playerQuests.active.find(aq =>
        QuestDatabase[aq.questId]?.giver === npc.key
    );

    if (activeQuest) {
        const quest = QuestDatabase[activeQuest.questId];
        // Sprawdź czy quest jest ukończony
        if (isQuestComplete(activeQuest)) {
            dialogState = 'quest_complete';
        } else {
            dialogState = 'quest_progress';
        }
    } else {
        // Sprawdź czy NPC ma nowy quest
        const availableQuest = npc.quests.find(qId =>
            !playerQuests.completed.includes(qId) &&
            !playerQuests.active.find(aq => aq.questId === qId)
        );

        if (availableQuest) {
            dialogState = 'quest_offer';
        } else {
            dialogState = 'greeting';
        }
    }

    updateDialogOptions();
}

function updateDialogOptions() {
    dialogOptions = [];

    if (dialogState === 'greeting') {
        dialogOptions.push({ text: 'Do widzenia', action: 'close' });
    } else if (dialogState === 'quest_offer') {
        dialogOptions.push({ text: 'Przyjmuję zadanie!', action: 'accept_quest' });
        dialogOptions.push({ text: 'Może później...', action: 'close' });
    } else if (dialogState === 'quest_progress') {
        dialogOptions.push({ text: 'Rozumiem', action: 'close' });
    } else if (dialogState === 'quest_complete') {
        dialogOptions.push({ text: 'Oddaj nagrodę', action: 'complete_quest' });
    }

    dialogSelection = 0;
}

function getDialogText() {
    if (!currentNPC) return '';

    const activeQuest = playerQuests.active.find(aq =>
        QuestDatabase[aq.questId]?.giver === currentNPC.key
    );

    if (dialogState === 'greeting') {
        return `Witaj, wędrowcze! Jestem ${currentNPC.name}.`;
    } else if (dialogState === 'quest_offer') {
        const availableQuestId = currentNPC.quests.find(qId =>
            !playerQuests.completed.includes(qId) &&
            !playerQuests.active.find(aq => aq.questId === qId)
        );
        const quest = QuestDatabase[availableQuestId];
        return quest ? quest.dialogue.start : 'Nie mam dla ciebie zadań.';
    } else if (dialogState === 'quest_progress' && activeQuest) {
        const quest = QuestDatabase[activeQuest.questId];
        let text = quest.dialogue.progress;
        text = text.replace('{remaining}', quest.required - activeQuest.progress);
        text = text.replace('{current}', activeQuest.progress);
        text = text.replace('{required}', quest.required);
        return text;
    } else if (dialogState === 'quest_complete' && activeQuest) {
        const quest = QuestDatabase[activeQuest.questId];
        return quest.dialogue.complete;
    }

    return 'Nie mam nic do powiedzenia.';
}

function handleDialogAction(action) {
    if (action === 'close') {
        showingDialog = false;
        currentNPC = null;
        currentNPCId = null;
    } else if (action === 'accept_quest') {
        const availableQuestId = currentNPC.quests.find(qId =>
            !playerQuests.completed.includes(qId) &&
            !playerQuests.active.find(aq => aq.questId === qId)
        );

        if (availableQuestId) {
            playerQuests.active.push({ questId: availableQuestId, progress: 0 });
            const quest = QuestDatabase[availableQuestId];
            GameState.combatLog.push(`Nowy quest: ${quest.name}`);
            updateQuestMarkers();
        }

        showingDialog = false;
        currentNPC = null;
        currentNPCId = null;
    } else if (action === 'complete_quest') {
        const activeQuest = playerQuests.active.find(aq =>
            QuestDatabase[aq.questId]?.giver === currentNPC.key
        );

        if (activeQuest && isQuestComplete(activeQuest)) {
            completeQuest(activeQuest.questId);
        }

        showingDialog = false;
        currentNPC = null;
        currentNPCId = null;
    }
}

function isQuestComplete(activeQuest) {
    const quest = QuestDatabase[activeQuest.questId];
    if (!quest) return false;

    if (quest.type === 'kill' || quest.type === 'collect' || quest.type === 'visit') {
        return activeQuest.progress >= quest.required;
    }
    return false;
}

function completeQuest(questId) {
    const quest = QuestDatabase[questId];
    if (!quest) return;

    // Usuń z aktywnych
    playerQuests.active = playerQuests.active.filter(aq => aq.questId !== questId);
    playerQuests.completed.push(questId);

    // Daj nagrody
    const players = engine.ecs.query(['player', 'stats']);
    if (players.length > 0) {
        const stats = engine.ecs.getComponent(players[0], 'stats');
        const inventory = engine.ecs.getComponent(players[0], 'inventory');

        if (quest.rewards.xp) {
            stats.xp += quest.rewards.xp;
            GameState.combatLog.push(`+${quest.rewards.xp} XP!`);
            checkLevelUp(players[0]);
        }

        if (quest.rewards.gold && inventory) {
            inventory.gold += quest.rewards.gold;
            GameState.combatLog.push(`+${quest.rewards.gold} złota!`);
        }

        // Przedmiot nagrody
        if (quest.rewardItem && inventory) {
            const item = ItemDatabase[quest.rewardItem];
            if (item) {
                inventory.items.push({ ...item, itemId: quest.rewardItem });
                GameState.combatLog.push(`Otrzymano: ${item.name}`);
            }
        }
    }

    GameState.combatLog.push(`Quest ukończony: ${quest.name}`);
    updateQuestMarkers();
}

function updateQuestProgress(type, target, amount = 1) {
    playerQuests.active.forEach(aq => {
        const quest = QuestDatabase[aq.questId];
        if (quest && quest.type === type && quest.target === target) {
            aq.progress += amount;
            if (aq.progress >= quest.required) {
                GameState.combatLog.push(`Quest "${quest.name}" gotowy do oddania!`);
            }
        }
    });
}

function spawnItems() {
    const itemTypes = ['health_potion', 'health_potion', 'gold_coin', 'gold_coin', 'gold_coin',
                       'rusty_sword', 'leather_armor', 'iron_sword', 'gem'];
    const itemCount = 12;

    for (let i = 0; i < itemCount; i++) {
        let x, y, tile;
        let attempts = 0;

        do {
            x = Math.floor(Math.random() * GameState.mapWidth);
            y = Math.floor(Math.random() * GameState.mapHeight);
            tile = GameState.map[y][x];
            attempts++;
        } while (
            (tile.type === 'water' || tile.type === 'mountain') &&
            attempts < 100
        );

        if (attempts < 100) {
            const itemId = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            createItem(x * TILE_SIZE, y * TILE_SIZE, itemId);
        }
    }
}

function createEnemy(x, y, type = 'goblin') {
    const enemyId = engine.ecs.createEntity();
    engine.ecs.addComponent(enemyId, 'position', { x: x, y: y });
    engine.ecs.addComponent(enemyId, 'renderable', { type: 'enemy' });
    engine.ecs.addComponent(enemyId, 'enemy', { type: type });

    // Statystyki zależne od typu wroga
    const enemyStats = {
        goblin: { hp: 30, maxHp: 30, damage: 8, defense: 2, xpReward: 25 },
        orc: { hp: 50, maxHp: 50, damage: 12, defense: 5, xpReward: 50 },
        troll: { hp: 80, maxHp: 80, damage: 18, defense: 8, xpReward: 100 }
    };

    engine.ecs.addComponent(enemyId, 'stats', enemyStats[type] || enemyStats.goblin);
    return enemyId;
}

function handleCombat(attackerId, defenderId) {
    const attackerStats = engine.ecs.getComponent(attackerId, 'stats');
    const defenderStats = engine.ecs.getComponent(defenderId, 'stats');

    if (!attackerStats || !defenderStats) return;

    // Oblicz obrażenia (damage - defense, minimum 1)
    const damage = Math.max(1, attackerStats.damage - defenderStats.defense);
    defenderStats.hp -= damage;

    // Efekt cząsteczkowy
    if (GameState.particles) {
        const pos = engine.ecs.getComponent(defenderId, 'position');
        GameState.particles.emit(pos.x + 16, pos.y + 16, 'hit');
    }

    // Komunikat o walce
    GameState.combatLog = GameState.combatLog || [];
    GameState.combatLog.push(`Zadano ${damage} obrażeń!`);
    if (GameState.combatLog.length > 5) GameState.combatLog.shift();

    // Sprawdź śmierć
    if (defenderStats.hp <= 0) {
        // Jeśli zginął wróg - daj XP
        if (engine.ecs.hasComponent(defenderId, 'enemy')) {
            const enemy = engine.ecs.getComponent(defenderId, 'enemy');
            const xpGain = defenderStats.xpReward || 25;
            attackerStats.xp += xpGain;
            GameState.combatLog.push(`+${xpGain} XP!`);

            // Aktualizuj postęp questów (kill)
            if (enemy && enemy.type) {
                updateQuestProgress('kill', enemy.type);
            }

            // Sprawdź levelowanie
            checkLevelUp(attackerId);
        }

        // Jeśli zginął gracz
        if (engine.ecs.hasComponent(defenderId, 'player')) {
            GameState.gameOver = true;
            GameState.combatLog.push('GAME OVER!');
        }

        engine.ecs.destroyEntity(defenderId);
    } else {
        // Kontratak wroga
        if (engine.ecs.hasComponent(defenderId, 'enemy') && engine.ecs.hasComponent(attackerId, 'player')) {
            const counterDamage = Math.max(1, defenderStats.damage - attackerStats.defense);
            attackerStats.hp -= counterDamage;
            GameState.combatLog.push(`Wróg kontratakuje: -${counterDamage} HP`);

            if (attackerStats.hp <= 0) {
                GameState.gameOver = true;
                GameState.combatLog.push('GAME OVER!');
            }
        }
    }
}

function checkLevelUp(entityId) {
    const stats = engine.ecs.getComponent(entityId, 'stats');
    if (!stats) return;

    while (stats.xp >= stats.xpToLevel) {
        stats.xp -= stats.xpToLevel;
        stats.level++;
        stats.xpToLevel = Math.floor(stats.xpToLevel * 1.5);

        // Bonusy za level
        stats.maxHp += 10;
        stats.hp = stats.maxHp; // Pełne leczenie
        stats.damage += 3;
        stats.defense += 1;

        GameState.combatLog.push(`LEVEL UP! Poziom ${stats.level}!`);
    }
}

// Start Gry
function initGame() {
    // Obsługa zmiany rozmiaru okna dla oświetlenia
    window.addEventListener('resize', () => {
        if (GameState.lighting) GameState.lighting.resize(window.innerWidth, window.innerHeight);
    });

    // Rejestruj systemy (menu jako pierwszy!)
    engine.ecs.addSystem(MenuSystem);
    engine.ecs.addSystem(MovementSystem);
    engine.ecs.addSystem(EnvironmentSystem);
    engine.ecs.addSystem(RenderSystem);
    engine.ecs.addSystem(HUDSystem);

    // Start silnika - gra zaczyna w menu
    GameState.gameState = 'menu';
    engine.start();
}

function spawnEnemies() {
    const enemyCount = 15;
    const enemyTypes = ['goblin', 'goblin', 'goblin', 'orc', 'orc', 'troll'];

    for (let i = 0; i < enemyCount; i++) {
        let x, y, tile;
        let attempts = 0;

        // Szukaj odpowiedniego miejsca (trawa, piasek - nie woda/góry)
        do {
            x = Math.floor(Math.random() * GameState.mapWidth);
            y = Math.floor(Math.random() * GameState.mapHeight);
            tile = GameState.map[y][x];
            attempts++;
        } while (
            (tile.type === 'water' || tile.type === 'mountain' || tile.type === 'snow') &&
            attempts < 100
        );

        if (attempts < 100) {
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            createEnemy(x * TILE_SIZE, y * TILE_SIZE, type);
        }
    }
}

try {
    initGame();
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
} catch (e) {
    alert("Critical Error: " + e.message + "\n" + e.stack);
    console.error(e);
}
