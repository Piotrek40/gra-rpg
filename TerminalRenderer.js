export class TerminalRenderer {
    constructor() {
        this.colors = {
            reset: '\x1b[0m',
            green: '\x1b[32m',
            blue: '\x1b[34m',
            yellow: '\x1b[33m',
            red: '\x1b[31m',
            white: '\x1b[37m',
            gray: '\x1b[90m',
            cyan: '\x1b[36m',
            bgBlack: '\x1b[40m'
        };
    }

    render(ecs, gameState) {
        // Bufor ekranu (tablica stringów)
        // Renderujemy tylko widok kamery (np. 40x20 znaków)
        const viewWidth = 40;
        const viewHeight = 20;

        const buffer = [];

        // Wyśrodkowanie kamery na graczu
        const player = ecs.query(['player', 'position'])[0];
        let camX = 0;
        let camY = 0;

        if (player) {
            const pos = ecs.getComponent(player, 'position');
            // Konwersja pixeli na kafelki (zakładamy 1 tile = 1 znak)
            const tileX = Math.floor(pos.x / 32);
            const tileY = Math.floor(pos.y / 32);

            camX = tileX - Math.floor(viewWidth / 2);
            camY = tileY - Math.floor(viewHeight / 2);
        }

        // Rysowanie mapy
        for (let y = 0; y < viewHeight; y++) {
            let line = '';
            for (let x = 0; x < viewWidth; x++) {
                const mapX = camX + x;
                const mapY = camY + y;

                if (mapX >= 0 && mapX < gameState.mapWidth && mapY >= 0 && mapY < gameState.mapHeight) {
                    // Pobierz tile z mapy
                    const tile = gameState.map[mapY][mapX];
                    const type = tile.type || tile; // Obsługa obiektu lub stringa

                    line += this.getCharForTile(type);
                } else {
                    line += ' '; // Poza mapą
                }
            }
            buffer.push(line);
        }

        // Rysowanie encji (nadpisywanie bufora)
        const entities = ecs.query(['position', 'renderable']);
        entities.forEach(entity => {
            const pos = ecs.getComponent(entity, 'position');
            const render = ecs.getComponent(entity, 'renderable');

            const tileX = Math.floor(pos.x / 32);
            const tileY = Math.floor(pos.y / 32);

            const screenX = tileX - camX;
            const screenY = tileY - camY;

            if (screenX >= 0 && screenX < viewWidth && screenY >= 0 && screenY < viewHeight) {
                // Podmień znak w linii
                const char = this.getCharForEntity(render.type);
                const line = buffer[screenY];
                // Uwaga: to prosta podmiana, nie uwzględnia kodów kolorów w ciągu (dlatego lepiej budować bufor znaków a nie linii, ale spróbujmy tak)
                // Problem: jeśli linia ma kody kolorów, indeksowanie się psuje.
                // Rozwiązanie: Budujmy tablicę 2D znaków + kolorów.
            }
        });

        // Podejście 2: Tablica 2D obiektów {char, color}
        const grid = [];
        for (let y = 0; y < viewHeight; y++) {
            const row = [];
            for (let x = 0; x < viewWidth; x++) {
                row.push({ char: ' ', color: this.colors.reset });
            }
            grid.push(row);
        }

        // 1. Mapa
        for (let y = 0; y < viewHeight; y++) {
            for (let x = 0; x < viewWidth; x++) {
                const mapX = camX + x;
                const mapY = camY + y;

                if (mapX >= 0 && mapX < gameState.mapWidth && mapY >= 0 && mapY < gameState.mapHeight) {
                    const tile = gameState.map[mapY][mapX];
                    const type = tile.type || tile;
                    const style = this.getStyleForType(type);
                    grid[y][x] = style;
                }
            }
        }

        // 2. Encje
        entities.forEach(entity => {
            const pos = ecs.getComponent(entity, 'position');
            const render = ecs.getComponent(entity, 'renderable');

            const tileX = Math.floor(pos.x / 32);
            const tileY = Math.floor(pos.y / 32);

            const screenX = tileX - camX;
            const screenY = tileY - camY;

            if (screenX >= 0 && screenX < viewWidth && screenY >= 0 && screenY < viewHeight) {
                grid[screenY][screenX] = this.getStyleForType(render.type);
            }
        });

        // Renderowanie do stringa
        let output = '\x1b[2J\x1b[H'; // Clear screen & home cursor

        // UI Header
        if (player) {
            const stats = ecs.getComponent(player, 'stats');
            if (stats) {
                output += `${this.colors.white}HP: ${stats.hp}/${stats.maxHp} | XP: ${stats.xp} | Quest: Find Amulet${this.colors.reset}\n`;
                output += `${'-'.repeat(viewWidth)}\n`;
            }
        }

        for (let y = 0; y < viewHeight; y++) {
            for (let x = 0; x < viewWidth; x++) {
                const cell = grid[y][x];
                output += cell.color + cell.char;
            }
            output += this.colors.reset + '\n';
        }

        console.log(output);
    }

    getStyleForType(type) {
        switch (type) {
            case 'grass': return { char: '.', color: this.colors.green };
            case 'forest': return { char: 'T', color: this.colors.green };
            case 'tree': return { char: 'T', color: this.colors.green }; // Drzewo jako obiekt
            case 'water': return { char: '~', color: this.colors.blue };
            case 'sand': return { char: '.', color: this.colors.yellow };
            case 'mountain': return { char: '^', color: this.colors.gray };
            case 'snow': return { char: '*', color: this.colors.white };
            case 'wall': return { char: '#', color: this.colors.gray };
            case 'floor': return { char: '.', color: this.colors.gray };
            case 'player': return { char: '@', color: this.colors.cyan };
            case 'enemy': return { char: 'E', color: this.colors.red };
            default: return { char: '?', color: this.colors.white };
        }
    }

    getCharForTile(type) {
        // Legacy helper, unused in new approach
        return '?';
    }

    getCharForEntity(type) {
        // Legacy helper
        return '?';
    }
}
