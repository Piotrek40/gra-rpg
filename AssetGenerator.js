export const AssetGenerator = {
    cache: new Map(),

    // Pobierz teksturę (z cache lub wygeneruj)
    getTexture: function (type, params = {}) {
        const key = `${type}_${JSON.stringify(params)}`;
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        const texture = this.generate(type, params);
        this.cache.set(key, texture);
        return texture;
    },

    generate: function (type, params) {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Funkcja pomocnicza do szumu
        const noise = () => Math.random() * 20 - 10;

        if (type === 'grass') {
            // Baza
            const baseColor = { h: 100, s: 60, l: 40 };
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    ctx.fillStyle = `hsl(${baseColor.h}, ${baseColor.s}%, ${baseColor.l + noise()}%)`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
            // Kępki trawy
            for (let i = 0; i < 8; i++) {
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);
                ctx.fillStyle = `hsl(${baseColor.h}, ${baseColor.s}%, ${baseColor.l + 15}%)`;
                ctx.fillRect(x, y, 1, 2);
            }
        } else if (type === 'water') {
            const baseColor = { h: 210, s: 70, l: 50 };
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    let lOffset = 0;
                    if ((x + y) % 5 === 0) lOffset = 10; // Fale
                    ctx.fillStyle = `hsl(${baseColor.h}, ${baseColor.s}%, ${baseColor.l + noise() + lOffset}%)`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        } else if (type === 'sand') {
            const baseColor = { h: 40, s: 60, l: 70 };
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    ctx.fillStyle = `hsl(${baseColor.h}, ${baseColor.s}%, ${baseColor.l + noise()}%)`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        } else if (type === 'snow') {
            const baseColor = { h: 200, s: 20, l: 90 };
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    ctx.fillStyle = `hsl(${baseColor.h}, ${baseColor.s}%, ${baseColor.l + noise()}%)`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        } else if (type === 'mountain') {
            // Skaliste tło
            const baseColor = { h: 0, s: 0, l: 40 };
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    ctx.fillStyle = `hsl(${baseColor.h}, ${baseColor.s}%, ${baseColor.l + noise()}%)`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
            // Szczyt (trójkąt)
            ctx.fillStyle = '#e0e0e0';
            ctx.beginPath();
            ctx.moveTo(size / 2, 2);
            ctx.lineTo(size - 4, size - 4);
            ctx.lineTo(4, size - 4);
            ctx.fill();
        } else if (type === 'tree') {
            // Drzewo (większe i bardziej szczegółowe)
            // Uwaga: tutaj rysujemy na 32x32, ale w demo było 64x64. Dostosujmy skalę.
            ctx.fillStyle = '#5D4037'; // Pień
            ctx.fillRect(12, 20, 8, 12);

            // Cieniowanie pnia
            ctx.fillStyle = '#3E2723';
            ctx.fillRect(12, 20, 2, 12);

            // Korona (złożona z kółek)
            ctx.fillStyle = '#2E7D32';
            const circles = [
                { x: 16, y: 14, r: 10 },
                { x: 10, y: 18, r: 8 },
                { x: 22, y: 18, r: 8 },
                { x: 16, y: 8, r: 8 }
            ];
            circles.forEach(c => {
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
                ctx.fill();
                // Detale liści
                for (let i = 0; i < 5; i++) {
                    ctx.fillStyle = '#1B5E20';
                    ctx.fillRect(c.x + (Math.random() * 10 - 5), c.y + (Math.random() * 10 - 5), 2, 2);
                    ctx.fillStyle = '#2E7D32';
                }
            });
        } else if (type === 'player') {
            // Gracz RPG
            ctx.fillStyle = '#1565C0'; // Zbroja
            ctx.fillRect(10, 12, 12, 14);

            ctx.fillStyle = '#FFCC80'; // Głowa
            ctx.fillRect(11, 4, 10, 8);

            ctx.fillStyle = '#5D4037'; // Włosy
            ctx.fillRect(11, 2, 10, 4);

            ctx.fillStyle = '#424242'; // Nogi
            ctx.fillRect(11, 26, 4, 6);
            ctx.fillRect(17, 26, 4, 6);

            // Miecz
            ctx.fillStyle = '#BDBDBD';
            ctx.fillRect(22, 14, 4, 12);
            ctx.fillStyle = '#8D6E63';
            ctx.fillRect(22, 26, 4, 4);
        } else if (type === 'enemy') {
            // Wróg (Orc/Goblin)
            ctx.fillStyle = '#2E7D32'; // Skóra
            ctx.fillRect(8, 8, 16, 20);

            ctx.fillStyle = '#D32F2F'; // Oczy
            ctx.fillRect(10, 12, 4, 2);
            ctx.fillRect(18, 12, 4, 2);

            ctx.fillStyle = '#1B5E20'; // Cienie
            ctx.fillRect(8, 8, 2, 20);
        } else if (type === 'wall') {
            // Cegły
            ctx.fillStyle = '#424242';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#616161';
            for (let y = 0; y < size; y += 8) {
                for (let x = 0; x < size; x += 8) {
                    if ((x + y) % 16 === 0) ctx.fillRect(x, y, 7, 7);
                }
            }
        } else if (type === 'floor') {
            // Płytki
            ctx.fillStyle = '#212121';
            ctx.fillRect(0, 0, size, size);
            ctx.strokeStyle = '#424242';
            ctx.strokeRect(0, 0, size, size);
            // Pęknięcia
            ctx.beginPath();
            ctx.moveTo(4, 4);
            ctx.lineTo(10, 10);
            ctx.stroke();
        }

        return canvas;
    }
};
