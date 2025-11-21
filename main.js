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
    particles: null,
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
                'W / Strzałka w górę    - Ruch w górę',
                'S / Strzałka w dół     - Ruch w dół',
                'A / Strzałka w lewo    - Ruch w lewo',
                'D / Strzałka w prawo   - Ruch w prawo',
                'Enter                  - Wejdź do lochu',
                'ESC                    - Pauza',
                '',
                'Walka odbywa się automatycznie',
                'przy kontakcie z wrogiem.'
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

    // Wyczyść ECS
    engine.ecs.entities = [];
    engine.ecs.components = {};
    engine.ecs.nextEntityId = 1;

    // Generuj świat
    GameState.map = WorldGenerator.generate(GameState.mapWidth, GameState.mapHeight);

    // Inicjalizacja systemów graficznych (jeśli nie istnieją)
    if (!GameState.lighting) {
        GameState.lighting = new LightingSystem(window.innerWidth, window.innerHeight);
    }
    if (!GameState.particles) {
        GameState.particles = new ParticleSystem();
    }

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
    spawnEnemies();
    spawnItems();
}

// System Ruchu
function MovementSystem(ecs, dt) {
    if (GameState.gameState !== 'playing' || GameState.gameOver) return;

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

        // Podnoszenie przedmiotów
        const items = ecs.query(['item', 'position']);
        items.forEach(itemId => {
            const itemPos = ecs.getComponent(itemId, 'position');
            if (Math.abs(itemPos.x - pos.x) < 24 && Math.abs(itemPos.y - pos.y) < 24) {
                pickupItem(entity, itemId);
            }
        });

        // Wejście do lochu
        if (keys['Enter'] && GameState.location === 'overworld') {
            loadDungeon();
        }

        // Otwórz/zamknij ekwipunek
        if (consumeKey('i') || consumeKey('I')) {
            showingInventory = !showingInventory;
            inventorySelection = 0;
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
    if (GameState.gameState !== 'playing') return;

    if (GameState.lighting) GameState.lighting.update(dt);
    if (GameState.particles) GameState.particles.update(dt);
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
    ctx.fillRect(10, 10, 220, 100);

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
    ctx.fillText(`Lokacja: ${GameState.location}  |  [I] Ekwipunek`, 20, 100);

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
            const xpGain = defenderStats.xpReward || 25;
            attackerStats.xp += xpGain;
            GameState.combatLog.push(`+${xpGain} XP!`);

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
