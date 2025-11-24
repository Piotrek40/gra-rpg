export const AssetGenerator = {
    cache: new Map(),
    animationFrame: 0,

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

    // Pobierz animowaną teksturę
    getAnimatedTexture: function(type, frame) {
        const key = `${type}_anim_${frame % 4}`;
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const texture = this.generateAnimated(type, frame % 4);
        this.cache.set(key, texture);
        return texture;
    },

    // Pomocnicze funkcje graficzne
    drawOutline: function(ctx, x, y, w, h, color = '#000', thickness = 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.strokeRect(x, y, w, h);
    },

    addNoise: function(ctx, size, intensity = 10) {
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * intensity;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);
    },

    drawShadow: function(ctx, x, y, w, h) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + w/2, y + h + 2, w/2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    },

    generate: function (type, params) {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (type === 'grass') {
            // Gradient tło
            const gradient = ctx.createLinearGradient(0, 0, 0, size);
            gradient.addColorStop(0, '#4a7c31');
            gradient.addColorStop(1, '#3d6828');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);

            // Dodaj teksturę szumu
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (Math.random() > 0.7) {
                        const l = 35 + Math.random() * 20;
                        ctx.fillStyle = `hsl(100, 55%, ${l}%)`;
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }

            // Kępki trawy (więcej szczegółów)
            for (let i = 0; i < 20; i++) {
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);
                const height = 3 + Math.floor(Math.random() * 5);

                ctx.strokeStyle = `hsl(${95 + Math.random() * 20}, 60%, ${45 + Math.random() * 15}%)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + (Math.random() - 0.5) * 4, y - height);
                ctx.stroke();
            }

            // Małe kwiatki
            if (Math.random() > 0.6) {
                for (let i = 0; i < 3; i++) {
                    const fx = 10 + Math.random() * 44;
                    const fy = 10 + Math.random() * 44;
                    ctx.fillStyle = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'][Math.floor(Math.random() * 4)];
                    ctx.beginPath();
                    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

        } else if (type === 'water') {
            // Statyczna woda - animowana osobno
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#1e88e5');
            gradient.addColorStop(0.5, '#2196f3');
            gradient.addColorStop(1, '#1565c0');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);

            // Fale
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 10 + i * 15);
                for (let x = 0; x < size; x += 8) {
                    ctx.quadraticCurveTo(x + 4, 6 + i * 15, x + 8, 10 + i * 15);
                }
                ctx.stroke();
            }

            // Odblaski
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(20, 25, 8, 3);
            ctx.fillRect(40, 45, 6, 2);

        } else if (type === 'sand') {
            const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 45);
            gradient.addColorStop(0, '#f4d03f');
            gradient.addColorStop(1, '#d4a937');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);

            // Ziarenka piasku
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                ctx.fillStyle = `hsl(45, ${50 + Math.random() * 20}%, ${65 + Math.random() * 20}%)`;
                ctx.fillRect(x, y, 1, 1);
            }

            // Małe kamyki
            for (let i = 0; i < 3; i++) {
                const cx = 10 + Math.random() * 44;
                const cy = 10 + Math.random() * 44;
                ctx.fillStyle = '#a0887a';
                ctx.beginPath();
                ctx.ellipse(cx, cy, 2 + Math.random() * 2, 1 + Math.random(), 0, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (type === 'snow') {
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#e3f2fd');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);

            // Tekstura śniegu
            for (let i = 0; i < 80; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                ctx.fillStyle = `rgba(200, 220, 255, ${0.3 + Math.random() * 0.3})`;
                ctx.beginPath();
                ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Cienie w śniegu
            ctx.fillStyle = 'rgba(150, 180, 220, 0.2)';
            ctx.beginPath();
            ctx.ellipse(20, 40, 12, 4, 0.3, 0, Math.PI * 2);
            ctx.fill();

        } else if (type === 'mountain') {
            // Skaliste tło
            ctx.fillStyle = '#5d5d5d';
            ctx.fillRect(0, 0, size, size);

            // Tekstura kamienia
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (Math.random() > 0.5) {
                        const l = 30 + Math.random() * 25;
                        ctx.fillStyle = `hsl(0, 0%, ${l}%)`;
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }

            // Góra 3D
            ctx.fillStyle = '#7a7a7a';
            ctx.beginPath();
            ctx.moveTo(32, 4);
            ctx.lineTo(58, 56);
            ctx.lineTo(6, 56);
            ctx.closePath();
            ctx.fill();

            // Cieniowanie
            ctx.fillStyle = '#5a5a5a';
            ctx.beginPath();
            ctx.moveTo(32, 4);
            ctx.lineTo(6, 56);
            ctx.lineTo(32, 56);
            ctx.closePath();
            ctx.fill();

            // Śnieżna czapa
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(32, 4);
            ctx.lineTo(42, 20);
            ctx.lineTo(22, 20);
            ctx.closePath();
            ctx.fill();

            // Outline
            ctx.strokeStyle = '#3d3d3d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(32, 4);
            ctx.lineTo(58, 56);
            ctx.lineTo(6, 56);
            ctx.closePath();
            ctx.stroke();

        } else if (type === 'tree') {
            ctx.clearRect(0, 0, size, size);

            // Cień
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.ellipse(32, 60, 18, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pień z teksturą
            const trunkGradient = ctx.createLinearGradient(22, 0, 42, 0);
            trunkGradient.addColorStop(0, '#3e2723');
            trunkGradient.addColorStop(0.5, '#6d4c41');
            trunkGradient.addColorStop(1, '#4e342e');
            ctx.fillStyle = trunkGradient;
            ctx.fillRect(26, 38, 12, 24);

            // Kora
            ctx.strokeStyle = '#2d1b16';
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(28 + i * 3, 40);
                ctx.lineTo(28 + i * 3, 58);
                ctx.stroke();
            }

            // Korona - wiele warstw
            const crownColors = ['#1b5e20', '#2e7d32', '#388e3c', '#43a047'];
            const circles = [
                { x: 32, y: 24, r: 18 },
                { x: 20, y: 32, r: 14 },
                { x: 44, y: 32, r: 14 },
                { x: 32, y: 14, r: 14 },
                { x: 26, y: 20, r: 12 },
                { x: 38, y: 20, r: 12 },
            ];

            circles.forEach((c, idx) => {
                // Cień liści
                ctx.fillStyle = '#0d3010';
                ctx.beginPath();
                ctx.arc(c.x + 2, c.y + 2, c.r, 0, Math.PI * 2);
                ctx.fill();

                // Liście
                ctx.fillStyle = crownColors[idx % crownColors.length];
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
                ctx.fill();
            });

            // Detale liści
            for (let i = 0; i < 30; i++) {
                const lx = 14 + Math.random() * 36;
                const ly = 6 + Math.random() * 36;
                ctx.fillStyle = Math.random() > 0.5 ? '#4caf50' : '#1b5e20';
                ctx.fillRect(lx, ly, 2, 2);
            }

            // Jabłka/owoce (losowo)
            if (Math.random() > 0.7) {
                for (let i = 0; i < 3; i++) {
                    ctx.fillStyle = '#e53935';
                    ctx.beginPath();
                    ctx.arc(20 + Math.random() * 24, 18 + Math.random() * 20, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

        } else if (type === 'player') {
            ctx.clearRect(0, 0, size, size);

            // Cień
            this.drawShadow(ctx, 16, 50, 32, 8);

            // Nogi
            ctx.fillStyle = '#37474f';
            ctx.fillRect(22, 48, 8, 14);
            ctx.fillRect(34, 48, 8, 14);

            // Buty
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(20, 58, 12, 6);
            ctx.fillRect(32, 58, 12, 6);

            // Ciało/Zbroja
            const armorGradient = ctx.createLinearGradient(18, 24, 46, 24);
            armorGradient.addColorStop(0, '#1565c0');
            armorGradient.addColorStop(0.5, '#1e88e5');
            armorGradient.addColorStop(1, '#1565c0');
            ctx.fillStyle = armorGradient;
            ctx.fillRect(18, 24, 28, 26);

            // Pas
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(18, 44, 28, 4);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(30, 44, 6, 4);

            // Ręce
            ctx.fillStyle = '#1e88e5';
            ctx.fillRect(12, 26, 6, 18);
            ctx.fillRect(46, 26, 6, 18);

            // Dłonie
            ctx.fillStyle = '#ffcc80';
            ctx.fillRect(12, 42, 6, 6);
            ctx.fillRect(46, 42, 6, 6);

            // Głowa
            ctx.fillStyle = '#ffcc80';
            ctx.beginPath();
            ctx.arc(32, 14, 10, 0, Math.PI * 2);
            ctx.fill();

            // Włosy
            ctx.fillStyle = '#5d4037';
            ctx.beginPath();
            ctx.arc(32, 10, 10, Math.PI, 2 * Math.PI);
            ctx.fill();
            ctx.fillRect(22, 8, 20, 6);

            // Oczy
            ctx.fillStyle = '#fff';
            ctx.fillRect(27, 12, 4, 4);
            ctx.fillRect(35, 12, 4, 4);
            ctx.fillStyle = '#1a237e';
            ctx.fillRect(28, 13, 2, 2);
            ctx.fillRect(36, 13, 2, 2);

            // Miecz
            ctx.fillStyle = '#b0bec5';
            ctx.fillRect(52, 16, 6, 32);
            ctx.fillStyle = '#eceff1';
            ctx.fillRect(53, 18, 4, 28);
            // Rękojeść
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(51, 46, 8, 8);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(52, 44, 6, 3);

            // Outline
            ctx.strokeStyle = '#0d47a1';
            ctx.lineWidth = 1;
            ctx.strokeRect(18, 24, 28, 26);

        } else if (type === 'enemy' || type === 'enemy_goblin') {
            // GOBLIN - mały, zielony, z dużymi uszami
            ctx.clearRect(0, 0, size, size);

            // Cień
            this.drawShadow(ctx, 14, 52, 36, 10);

            // Nogi
            ctx.fillStyle = '#33691e';
            ctx.fillRect(20, 46, 10, 16);
            ctx.fillRect(34, 46, 10, 16);

            // Ciało
            const bodyGradient = ctx.createLinearGradient(14, 20, 50, 20);
            bodyGradient.addColorStop(0, '#33691e');
            bodyGradient.addColorStop(0.5, '#558b2f');
            bodyGradient.addColorStop(1, '#33691e');
            ctx.fillStyle = bodyGradient;
            ctx.fillRect(14, 20, 36, 28);

            // Ręce
            ctx.fillStyle = '#558b2f';
            ctx.fillRect(6, 22, 10, 20);
            ctx.fillRect(48, 22, 10, 20);

            // Pazury
            ctx.fillStyle = '#212121';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(6 + i * 3, 40, 2, 4);
                ctx.fillRect(50 + i * 3, 40, 2, 4);
            }

            // Głowa
            ctx.fillStyle = '#558b2f';
            ctx.beginPath();
            ctx.arc(32, 12, 12, 0, Math.PI * 2);
            ctx.fill();

            // Uszy (duże, charakterystyczne dla goblina)
            ctx.fillStyle = '#33691e';
            ctx.beginPath();
            ctx.moveTo(18, 8);
            ctx.lineTo(14, 0);
            ctx.lineTo(22, 6);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(46, 8);
            ctx.lineTo(50, 0);
            ctx.lineTo(42, 6);
            ctx.fill();

            // Oczy (czerwone, groźne)
            ctx.fillStyle = '#b71c1c';
            ctx.beginPath();
            ctx.arc(26, 10, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(38, 10, 4, 0, Math.PI * 2);
            ctx.fill();

            // Źrenice
            ctx.fillStyle = '#fff';
            ctx.fillRect(25, 9, 2, 2);
            ctx.fillRect(37, 9, 2, 2);

            // Kły
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(26, 18);
            ctx.lineTo(28, 24);
            ctx.lineTo(30, 18);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(34, 18);
            ctx.lineTo(36, 24);
            ctx.lineTo(38, 18);
            ctx.fill();

            // Outline
            ctx.strokeStyle = '#1b5e20';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(32, 12, 12, 0, Math.PI * 2);
            ctx.stroke();

        } else if (type === 'enemy_orc') {
            // ORC - większy, szary/brązowy, z kłami i zbroją
            ctx.clearRect(0, 0, size, size);

            // Cień (większy)
            this.drawShadow(ctx, 10, 54, 44, 12);

            // Nogi (grubsze)
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(18, 44, 12, 18);
            ctx.fillRect(34, 44, 12, 18);

            // Buty
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(16, 58, 16, 6);
            ctx.fillRect(32, 58, 16, 6);

            // Ciało (większe, szaro-zielone)
            const orcBodyGradient = ctx.createLinearGradient(10, 18, 54, 18);
            orcBodyGradient.addColorStop(0, '#455a64');
            orcBodyGradient.addColorStop(0.5, '#607d8b');
            orcBodyGradient.addColorStop(1, '#455a64');
            ctx.fillStyle = orcBodyGradient;
            ctx.fillRect(10, 18, 44, 28);

            // Zbroja (naramienniki)
            ctx.fillStyle = '#795548';
            ctx.fillRect(6, 20, 8, 12);
            ctx.fillRect(50, 20, 8, 12);
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(8, 22, 4, 8);
            ctx.fillRect(52, 22, 4, 8);

            // Ręce
            ctx.fillStyle = '#607d8b';
            ctx.fillRect(4, 30, 10, 16);
            ctx.fillRect(50, 30, 10, 16);

            // Pięści
            ctx.fillStyle = '#78909c';
            ctx.fillRect(4, 44, 10, 8);
            ctx.fillRect(50, 44, 10, 8);

            // Głowa (większa)
            ctx.fillStyle = '#607d8b';
            ctx.beginPath();
            ctx.arc(32, 10, 14, 0, Math.PI * 2);
            ctx.fill();

            // Brwi (groźne)
            ctx.fillStyle = '#37474f';
            ctx.fillRect(20, 4, 10, 3);
            ctx.fillRect(34, 4, 10, 3);

            // Oczy (żółte)
            ctx.fillStyle = '#ffc107';
            ctx.beginPath();
            ctx.arc(24, 10, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(40, 10, 4, 0, Math.PI * 2);
            ctx.fill();

            // Źrenice
            ctx.fillStyle = '#000';
            ctx.fillRect(23, 9, 3, 3);
            ctx.fillRect(39, 9, 3, 3);

            // Kły (większe)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(22, 18);
            ctx.lineTo(25, 28);
            ctx.lineTo(28, 18);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(36, 18);
            ctx.lineTo(39, 28);
            ctx.lineTo(42, 18);
            ctx.fill();

            // Topór
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(56, 10, 4, 40);
            ctx.fillStyle = '#78909c';
            ctx.beginPath();
            ctx.moveTo(52, 8);
            ctx.lineTo(64, 16);
            ctx.lineTo(64, 8);
            ctx.lineTo(52, 0);
            ctx.fill();

        } else if (type === 'enemy_troll') {
            // TROLL - ogromny, niebieskoszary, z maczugą
            ctx.clearRect(0, 0, size, size);

            // Cień (największy)
            this.drawShadow(ctx, 6, 56, 52, 14);

            // Nogi (bardzo grube)
            ctx.fillStyle = '#546e7a';
            ctx.fillRect(14, 42, 14, 20);
            ctx.fillRect(36, 42, 14, 20);

            // Stopy
            ctx.fillStyle = '#455a64';
            ctx.fillRect(12, 58, 18, 6);
            ctx.fillRect(34, 58, 18, 6);

            // Ciało (ogromne)
            const trollBodyGradient = ctx.createLinearGradient(6, 14, 58, 14);
            trollBodyGradient.addColorStop(0, '#455a64');
            trollBodyGradient.addColorStop(0.5, '#78909c');
            trollBodyGradient.addColorStop(1, '#455a64');
            ctx.fillStyle = trollBodyGradient;
            ctx.fillRect(6, 14, 52, 32);

            // Brzuch (charakterystyczny dla trolla)
            ctx.fillStyle = '#90a4ae';
            ctx.beginPath();
            ctx.ellipse(32, 34, 16, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ręce (masywne)
            ctx.fillStyle = '#78909c';
            ctx.fillRect(0, 18, 12, 24);
            ctx.fillRect(52, 18, 12, 24);

            // Pięści
            ctx.fillStyle = '#90a4ae';
            ctx.beginPath();
            ctx.arc(6, 44, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(58, 44, 8, 0, Math.PI * 2);
            ctx.fill();

            // Głowa (mała w stosunku do ciała)
            ctx.fillStyle = '#78909c';
            ctx.beginPath();
            ctx.arc(32, 8, 10, 0, Math.PI * 2);
            ctx.fill();

            // Nos (duży)
            ctx.fillStyle = '#90a4ae';
            ctx.beginPath();
            ctx.arc(32, 12, 5, 0, Math.PI * 2);
            ctx.fill();

            // Oczy (małe, głupie)
            ctx.fillStyle = '#ffeb3b';
            ctx.fillRect(24, 4, 4, 4);
            ctx.fillRect(36, 4, 4, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(25, 5, 2, 2);
            ctx.fillRect(37, 5, 2, 2);

            // Zęby (krzywe)
            ctx.fillStyle = '#ffeb3b';
            ctx.fillRect(28, 16, 3, 4);
            ctx.fillRect(33, 16, 3, 4);
            ctx.fillRect(30, 14, 4, 3);

            // Maczuga
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(58, 2, 6, 44);
            ctx.fillStyle = '#4e342e';
            ctx.beginPath();
            ctx.arc(61, 4, 8, 0, Math.PI * 2);
            ctx.fill();
            // Ćwieki na maczudze
            ctx.fillStyle = '#9e9e9e';
            ctx.fillRect(56, 2, 3, 3);
            ctx.fillRect(64, 6, 3, 3);
            ctx.fillRect(58, 8, 3, 3);

        } else if (type === 'wall') {
            // Ciemne cegły
            ctx.fillStyle = '#37474f';
            ctx.fillRect(0, 0, size, size);

            // Cegły
            const brickColors = ['#455a64', '#546e7a', '#4a5c66'];
            for (let row = 0; row < 4; row++) {
                const offset = row % 2 === 0 ? 0 : 16;
                for (let col = -1; col < 3; col++) {
                    ctx.fillStyle = brickColors[Math.floor(Math.random() * brickColors.length)];
                    ctx.fillRect(col * 32 + offset + 1, row * 16 + 1, 30, 14);

                    // Cieniowanie
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(col * 32 + offset + 1, row * 16 + 12, 30, 3);

                    // Highlight
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    ctx.fillRect(col * 32 + offset + 1, row * 16 + 1, 30, 2);
                }
            }

            // Pęknięcia/mech
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(10, 30, 3, 8);
            ctx.fillRect(50, 10, 4, 6);

        } else if (type === 'floor') {
            // Kamienne płytki lochu
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(0, 0, size, size);

            // Płytki
            const tileSize = 32;
            for (let ty = 0; ty < 2; ty++) {
                for (let tx = 0; tx < 2; tx++) {
                    const gradient = ctx.createLinearGradient(tx * tileSize, ty * tileSize, tx * tileSize + tileSize, ty * tileSize + tileSize);
                    gradient.addColorStop(0, '#5d4037');
                    gradient.addColorStop(1, '#4e342e');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(tx * tileSize + 1, ty * tileSize + 1, tileSize - 2, tileSize - 2);
                }
            }

            // Fugi
            ctx.strokeStyle = '#2d1b16';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(32, 0);
            ctx.lineTo(32, 64);
            ctx.moveTo(0, 32);
            ctx.lineTo(64, 32);
            ctx.stroke();

            // Pęknięcia
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(8, 8);
            ctx.lineTo(18, 20);
            ctx.lineTo(14, 28);
            ctx.stroke();

        } else if (type === 'item') {
            ctx.clearRect(0, 0, size, size);

            // Glow effect
            const glowGradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 28);
            glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
            glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(32, 32, 28, 0, Math.PI * 2);
            ctx.fill();

            // Cień
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(32, 54, 14, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Worek
            const bagGradient = ctx.createLinearGradient(16, 20, 48, 20);
            bagGradient.addColorStop(0, '#6d4c41');
            bagGradient.addColorStop(0.5, '#8d6e63');
            bagGradient.addColorStop(1, '#5d4037');
            ctx.fillStyle = bagGradient;
            ctx.beginPath();
            ctx.ellipse(32, 38, 16, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // Góra worka
            ctx.fillStyle = '#8d6e63';
            ctx.beginPath();
            ctx.moveTo(18, 28);
            ctx.quadraticCurveTo(32, 14, 46, 28);
            ctx.fill();

            // Sznurek
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(26, 22);
            ctx.lineTo(38, 22);
            ctx.stroke();

            // Węzeł
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(32, 18, 4, 0, Math.PI * 2);
            ctx.fill();

            // Złote monety wystające
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(28, 20, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffb300';
            ctx.beginPath();
            ctx.arc(36, 18, 4, 0, Math.PI * 2);
            ctx.fill();

            // Błyski
            ctx.fillStyle = '#fff';
            ctx.fillRect(38, 32, 4, 4);
            ctx.fillRect(24, 40, 3, 3);

        } else if (type === 'npc_merchant') {
            ctx.clearRect(0, 0, size, size);
            this.drawShadow(ctx, 16, 52, 32, 8);

            // Nogi
            ctx.fillStyle = '#4a148c';
            ctx.fillRect(22, 48, 8, 14);
            ctx.fillRect(34, 48, 8, 14);

            // Szata
            const robeGradient = ctx.createLinearGradient(16, 24, 48, 24);
            robeGradient.addColorStop(0, '#6a1b9a');
            robeGradient.addColorStop(0.5, '#9c27b0');
            robeGradient.addColorStop(1, '#6a1b9a');
            ctx.fillStyle = robeGradient;
            ctx.fillRect(16, 24, 32, 28);

            // Ozdoby na szacie
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(16, 36, 32, 3);
            ctx.fillRect(30, 28, 4, 20);

            // Ręce
            ctx.fillStyle = '#7b1fa2';
            ctx.fillRect(10, 28, 8, 16);
            ctx.fillRect(46, 28, 8, 16);

            // Głowa
            ctx.fillStyle = '#ffcc80';
            ctx.beginPath();
            ctx.arc(32, 14, 10, 0, Math.PI * 2);
            ctx.fill();

            // Turban/kapelusz
            ctx.fillStyle = '#4a148c';
            ctx.beginPath();
            ctx.arc(32, 8, 12, Math.PI, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(32, 6, 4, 0, Math.PI * 2);
            ctx.fill();

            // Twarz
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(28, 16, 2, 4); // Wąsy
            ctx.fillRect(34, 16, 2, 4);

            // Oczy
            ctx.fillStyle = '#212121';
            ctx.fillRect(27, 12, 3, 3);
            ctx.fillRect(35, 12, 3, 3);

            // Worek ze złotem
            ctx.fillStyle = '#8d6e63';
            ctx.beginPath();
            ctx.ellipse(54, 44, 8, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(54, 40, 4, 0, Math.PI * 2);
            ctx.fill();

        } else if (type === 'npc_blacksmith') {
            ctx.clearRect(0, 0, size, size);
            this.drawShadow(ctx, 16, 52, 32, 8);

            // Nogi
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(22, 48, 8, 14);
            ctx.fillRect(34, 48, 8, 14);

            // Fartuch
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(18, 30, 28, 22);

            // Tors (mięśnie)
            const bodyGradient = ctx.createLinearGradient(16, 20, 48, 20);
            bodyGradient.addColorStop(0, '#d7a86e');
            bodyGradient.addColorStop(0.5, '#e8c49b');
            bodyGradient.addColorStop(1, '#d7a86e');
            ctx.fillStyle = bodyGradient;
            ctx.fillRect(18, 20, 28, 14);

            // Ramiona
            ctx.fillStyle = '#d7a86e';
            ctx.fillRect(8, 22, 12, 18);
            ctx.fillRect(44, 22, 12, 18);

            // Głowa
            ctx.fillStyle = '#e8c49b';
            ctx.beginPath();
            ctx.arc(32, 12, 10, 0, Math.PI * 2);
            ctx.fill();

            // Broda
            ctx.fillStyle = '#4e342e';
            ctx.beginPath();
            ctx.arc(32, 18, 8, 0, Math.PI);
            ctx.fill();

            // Oczy
            ctx.fillStyle = '#212121';
            ctx.fillRect(27, 10, 3, 3);
            ctx.fillRect(35, 10, 3, 3);

            // Młot (duży!)
            ctx.fillStyle = '#616161';
            ctx.fillRect(52, 8, 10, 48);
            ctx.fillStyle = '#9e9e9e';
            ctx.fillRect(48, 4, 18, 14);
            ctx.fillStyle = '#757575';
            ctx.fillRect(48, 4, 4, 14);

        } else if (type === 'npc_elder') {
            ctx.clearRect(0, 0, size, size);
            this.drawShadow(ctx, 16, 52, 32, 8);

            // Szata
            const robeGradient = ctx.createLinearGradient(14, 20, 50, 20);
            robeGradient.addColorStop(0, '#e0e0e0');
            robeGradient.addColorStop(0.5, '#fafafa');
            robeGradient.addColorStop(1, '#e0e0e0');
            ctx.fillStyle = robeGradient;
            ctx.fillRect(14, 20, 36, 42);

            // Pas
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(14, 38, 36, 4);

            // Rękawy
            ctx.fillStyle = '#eeeeee';
            ctx.fillRect(8, 24, 10, 20);
            ctx.fillRect(46, 24, 10, 20);

            // Dłonie
            ctx.fillStyle = '#d7ccc8';
            ctx.fillRect(8, 42, 8, 8);
            ctx.fillRect(48, 42, 8, 8);

            // Głowa
            ctx.fillStyle = '#d7ccc8';
            ctx.beginPath();
            ctx.arc(32, 12, 10, 0, Math.PI * 2);
            ctx.fill();

            // Siwa broda (długa)
            ctx.fillStyle = '#bdbdbd';
            ctx.beginPath();
            ctx.moveTo(24, 18);
            ctx.quadraticCurveTo(32, 36, 40, 18);
            ctx.fill();

            // Siwe włosy
            ctx.fillStyle = '#9e9e9e';
            ctx.beginPath();
            ctx.arc(32, 6, 10, Math.PI, 2 * Math.PI);
            ctx.fill();

            // Oczy (mądre)
            ctx.fillStyle = '#1565c0';
            ctx.fillRect(27, 10, 3, 3);
            ctx.fillRect(35, 10, 3, 3);

            // Laska
            ctx.fillStyle = '#6d4c41';
            ctx.fillRect(56, 6, 4, 56);
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(58, 6, 6, 0, Math.PI * 2);
            ctx.fill();

        } else if (type === 'village_house') {
            ctx.clearRect(0, 0, size, size);

            // Cień
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(6, 56, 52, 8);

            // Ściany
            const wallGradient = ctx.createLinearGradient(4, 24, 60, 24);
            wallGradient.addColorStop(0, '#8d6e63');
            wallGradient.addColorStop(0.5, '#a1887f');
            wallGradient.addColorStop(1, '#795548');
            ctx.fillStyle = wallGradient;
            ctx.fillRect(4, 24, 56, 38);

            // Drewniane belki
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(4, 24, 56, 3);
            ctx.fillRect(4, 24, 3, 38);
            ctx.fillRect(57, 24, 3, 38);
            ctx.fillRect(28, 24, 4, 38);

            // Dach
            ctx.fillStyle = '#4e342e';
            ctx.beginPath();
            ctx.moveTo(0, 26);
            ctx.lineTo(32, 0);
            ctx.lineTo(64, 26);
            ctx.closePath();
            ctx.fill();

            // Dach - cieniowanie
            ctx.fillStyle = '#3e2723';
            ctx.beginPath();
            ctx.moveTo(0, 26);
            ctx.lineTo(32, 0);
            ctx.lineTo(32, 26);
            ctx.closePath();
            ctx.fill();

            // Drzwi
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(24, 38, 16, 24);
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(36, 50, 2, 0, Math.PI * 2);
            ctx.fill();

            // Okna (świecące)
            ctx.fillStyle = '#ffeb3b';
            ctx.fillRect(8, 32, 12, 12);
            ctx.fillRect(44, 32, 12, 12);

            // Kraty okien
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(14, 32);
            ctx.lineTo(14, 44);
            ctx.moveTo(8, 38);
            ctx.lineTo(20, 38);
            ctx.moveTo(50, 32);
            ctx.lineTo(50, 44);
            ctx.moveTo(44, 38);
            ctx.lineTo(56, 38);
            ctx.stroke();

            // Komin
            ctx.fillStyle = '#795548';
            ctx.fillRect(46, 4, 8, 14);
            // Dym (opcjonalny)
            ctx.fillStyle = 'rgba(150,150,150,0.5)';
            ctx.beginPath();
            ctx.arc(50, 0, 4, 0, Math.PI * 2);
            ctx.fill();

        } else if (type === 'quest_marker') {
            ctx.clearRect(0, 0, size, size);

            // Animowany glow
            const glowGradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 24);
            glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            glowGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
            glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(32, 32, 24, 0, Math.PI * 2);
            ctx.fill();

            // Tło kółka
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(32, 32, 16, 0, Math.PI * 2);
            ctx.fill();

            // Outline
            ctx.strokeStyle = '#ff8f00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(32, 32, 16, 0, Math.PI * 2);
            ctx.stroke();

            // Wykrzyknik
            ctx.fillStyle = '#000';
            ctx.font = 'bold 28px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('!', 32, 32);
        }

        return canvas;
    },

    // Animowane tekstury (woda)
    generateAnimated: function(type, frame) {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (type === 'water') {
            // Tło wody
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#1565c0');
            gradient.addColorStop(0.5, '#1e88e5');
            gradient.addColorStop(1, '#1976d2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);

            // Animowane fale
            const waveOffset = frame * 4;
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;

            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                const yBase = 8 + i * 12 + (frame % 2) * 2;
                ctx.moveTo(-8, yBase);
                for (let x = -8; x <= size + 8; x += 8) {
                    const y = yBase + Math.sin((x + waveOffset + i * 8) * 0.1) * 3;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            // Odblaski (animowane)
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            const sparkleX = 15 + (frame * 12) % 34;
            const sparkleY = 20 + (frame * 8) % 24;
            ctx.fillRect(sparkleX, sparkleY, 6, 3);
            ctx.fillRect(sparkleX + 20, sparkleY + 15, 4, 2);
        }

        return canvas;
    }
};
