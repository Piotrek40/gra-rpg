export class FogOfWar {
    constructor(mapWidth, mapHeight, tileSize) {
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.tileSize = tileSize;
        this.viewRadius = 8; // Promień widzenia w kafelkach

        // Stany: 0 = nieodkryte, 1 = odkryte (ale poza zasięgiem), 2 = widoczne
        this.fogMap = [];
        this.reset(mapWidth, mapHeight);

        // Canvas dla mgły
        this.fogCanvas = document.createElement('canvas');
        this.fogCtx = this.fogCanvas.getContext('2d');
    }

    reset(mapWidth, mapHeight) {
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.fogMap = [];

        for (let y = 0; y < mapHeight; y++) {
            const row = [];
            for (let x = 0; x < mapWidth; x++) {
                row.push(0); // Wszystko nieodkryte
            }
            this.fogMap.push(row);
        }
    }

    update(playerX, playerY) {
        // Konwersja pozycji gracza na współrzędne kafelków
        const playerTileX = Math.floor(playerX / this.tileSize);
        const playerTileY = Math.floor(playerY / this.tileSize);

        // Najpierw ustaw wszystkie odkryte na "odkryte ale poza zasięgiem"
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.fogMap[y][x] === 2) {
                    this.fogMap[y][x] = 1;
                }
            }
        }

        // Odkryj obszar wokół gracza (koło)
        for (let dy = -this.viewRadius; dy <= this.viewRadius; dy++) {
            for (let dx = -this.viewRadius; dx <= this.viewRadius; dx++) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= this.viewRadius) {
                    const tileX = playerTileX + dx;
                    const tileY = playerTileY + dy;

                    if (tileX >= 0 && tileX < this.mapWidth &&
                        tileY >= 0 && tileY < this.mapHeight) {
                        this.fogMap[tileY][tileX] = 2; // Widoczne
                    }
                }
            }
        }
    }

    render(ctx, camera, screenWidth, screenHeight) {
        // Dopasuj rozmiar canvas mgły
        if (this.fogCanvas.width !== screenWidth || this.fogCanvas.height !== screenHeight) {
            this.fogCanvas.width = screenWidth;
            this.fogCanvas.height = screenHeight;
        }

        // Wyczyść canvas mgły
        this.fogCtx.clearRect(0, 0, screenWidth, screenHeight);

        // Rysuj mgłę dla każdego kafelka
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const screenX = x * this.tileSize - camera.x;
                const screenY = y * this.tileSize - camera.y;

                // Culling - pomiń kafelki poza ekranem
                if (screenX < -this.tileSize || screenX > screenWidth ||
                    screenY < -this.tileSize || screenY > screenHeight) {
                    continue;
                }

                const fogState = this.fogMap[y][x];

                if (fogState === 0) {
                    // Nieodkryte - pełna czarna mgła
                    this.fogCtx.fillStyle = 'rgba(0, 0, 0, 1)';
                    this.fogCtx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                } else if (fogState === 1) {
                    // Odkryte ale poza zasięgiem - półprzezroczysta mgła
                    this.fogCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    this.fogCtx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                }
                // fogState === 2 - widoczne, nie rysujemy mgły
            }
        }

        // Nałóż canvas mgły na główny canvas
        ctx.drawImage(this.fogCanvas, 0, 0);
    }

    // Sprawdź czy kafelek jest widoczny (dla ukrywania wrogów)
    isVisible(tileX, tileY) {
        if (tileX < 0 || tileX >= this.mapWidth ||
            tileY < 0 || tileY >= this.mapHeight) {
            return false;
        }
        return this.fogMap[tileY][tileX] === 2;
    }

    // Sprawdź czy kafelek został odkryty (widoczny lub już odkryty)
    isRevealed(tileX, tileY) {
        if (tileX < 0 || tileX >= this.mapWidth ||
            tileY < 0 || tileY >= this.mapHeight) {
            return false;
        }
        return this.fogMap[tileY][tileX] > 0;
    }
}
