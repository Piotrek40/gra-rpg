import readline from 'readline';

export class TerminalEngine {
    constructor() {
        this.lastTime = 0;
        this.isRunning = false;
        this.keys = {};
        this.intervalId = null;

        // Setup input
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }

        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'c') {
                process.exit();
            }

            // Mapowanie klawiszy na stan
            this.keys[key.name] = true;

            // Reset klawisza po krótkim czasie (symulacja keyup, bo terminal wysyła tylko keydown)
            setTimeout(() => {
                this.keys[key.name] = false;
            }, 100);
        });
    }

    start(loopCallback) {
        this.isRunning = true;
        this.lastTime = Date.now();

        // 30 FPS
        this.intervalId = setInterval(() => {
            const now = Date.now();
            const dt = (now - this.lastTime) / 1000;
            this.lastTime = now;

            loopCallback(dt);
        }, 1000 / 30);
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}
