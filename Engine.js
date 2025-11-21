import { ECS } from './ECS.js';
import { StateManager } from './StateManager.js';

export class Engine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.ecs = new ECS();
        this.stateManager = new StateManager(this);
        this.lastTime = 0;
        this.isRunning = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx.imageSmoothingEnabled = false; // Pixel art style
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }

    stop() {
        this.isRunning = false;
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Wyczyść ekran
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Aktualizuj StateManager (który aktualizuje ECS jeśli stan to 'GAME')
        if (this.stateManager && this.stateManager.currentState) {
            this.stateManager.update(dt);
            this.stateManager.render(this.ctx);
        } else {
            // Fallback: bezpośredni update ECS (dla kompatybilności z main.js)
            this.ecs.update(dt);
        }

        requestAnimationFrame(t => this.loop(t));
    }
}
