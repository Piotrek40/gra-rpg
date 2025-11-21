export const DungeonGenerator = {
    generate: function (width, height) {
        // Inicjalizacja pustą mapą (ściany)
        const map = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push('wall');
            }
            map.push(row);
        }

        // Drunken Walk (Błądzenie losowe)
        let x = Math.floor(width / 2);
        let y = Math.floor(height / 2);
        let steps = 400; // Ilość kroków koparki

        while (steps > 0) {
            map[y][x] = 'floor';

            // Losowy ruch
            const dir = Math.floor(Math.random() * 4);
            if (dir === 0) y--; // Up
            else if (dir === 1) y++; // Down
            else if (dir === 2) x--; // Left
            else if (dir === 3) x++; // Right

            // Ograniczenie do mapy (z marginesem 1)
            x = Math.max(1, Math.min(x, width - 2));
            y = Math.max(1, Math.min(y, height - 2));

            steps--;
        }

        return map;
    }
};
