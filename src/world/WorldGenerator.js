// Prosty moduł szumu (Value Noise)
const Noise = {
    seed: Math.random(),
    random: function (x, y) {
        const sin = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453;
        return sin - Math.floor(sin);
    },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    get: function (x, y) {
        const i = Math.floor(x);
        const j = Math.floor(y);
        const f = x - i;
        const g = y - j;
        const u = f * f * (3.0 - 2.0 * f);
        const v = g * g * (3.0 - 2.0 * g);
        return this.lerp(
            this.lerp(this.random(i, j), this.random(i + 1, j), u),
            this.lerp(this.random(i, j + 1), this.random(i + 1, j + 1), u),
            v
        );
    }
};

export const WorldGenerator = {
    generate: function (width, height) {
        const map = [];
        Noise.seed = Math.random();

        // Parametry generacji
        const scale = 0.1;

        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                // 1. Elevation (Wysokość)
                let e = Noise.get(x * scale, y * scale);
                // Dodaj oktawy dla detali
                e += 0.5 * Noise.get(x * scale * 2, y * scale * 2);
                e += 0.25 * Noise.get(x * scale * 4, y * scale * 4);
                e /= (1 + 0.5 + 0.25); // Normalizacja

                // 2. Moisture (Wilgotność) - przesunięty szum
                let m = Noise.get(x * scale + 100, y * scale + 100);

                // 3. Biome determination
                let type = 'ocean';

                if (e < 0.3) {
                    type = 'ocean';
                } else if (e < 0.35) {
                    type = 'sand'; // Plaża
                } else if (e > 0.8) {
                    if (m < 0.1) type = 'scorched';
                    else if (m < 0.2) type = 'bare';
                    else if (m < 0.5) type = 'tundra';
                    else type = 'snow';
                } else if (e > 0.6) {
                    if (m < 0.33) type = 'temperate_desert';
                    else if (m < 0.66) type = 'shrubland';
                    else type = 'taiga';
                } else { // Niziny (e 0.35 - 0.6)
                    if (m < 0.16) type = 'subtropical_desert';
                    else if (m < 0.33) type = 'grassland';
                    else if (m < 0.66) type = 'forest';
                    else type = 'rainforest';
                }

                // Uproszczenie typów do dostępnych assetów
                let finalType = 'grass';
                if (type.includes('ocean')) finalType = 'water';
                if (type.includes('sand') || type.includes('desert')) finalType = 'sand';
                if (type.includes('forest')) finalType = 'forest'; // Będziemy rysować drzewa na trawie
                if (type.includes('snow') || type.includes('tundra')) finalType = 'snow';
                if (type.includes('mountain') || e > 0.7) finalType = 'mountain'; // Dodajmy góry

                row.push({ type: finalType, biome: type, elevation: e });
            }
            map.push(row);
        }
        return map;
    }
};
