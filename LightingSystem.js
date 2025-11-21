export class LightingSystem {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.time = 0; // 0.0 to 1.0 (0 = midnight, 0.5 = noon)
        this.dayDuration = 60; // seconds per day

        this.lightCanvas = document.createElement('canvas');
        this.lightCanvas.width = width;
        this.lightCanvas.height = height;
        this.ctx = this.lightCanvas.getContext('2d');
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.lightCanvas.width = width;
        this.lightCanvas.height = height;
    }

    update(dt) {
        this.time += dt / this.dayDuration;
        if (this.time >= 1.0) this.time = 0;
    }

    render(mainCtx, camera, entities, ecs) {
        // Calculate darkness based on time
        let darkness = 0;
        if (this.time < 0.25) darkness = 0.9 - (this.time * 3.6); // Dawn
        else if (this.time > 0.75) darkness = (this.time - 0.75) * 3.6; // Dusk
        else darkness = 0; // Day

        // Clamp darkness
        darkness = Math.max(0, Math.min(0.9, darkness));

        if (darkness < 0.05) return; // Don't render if it's bright

        // Clear light map with darkness color
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = `rgba(0, 0, 15, ${darkness})`;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw lights
        this.ctx.globalCompositeOperation = 'destination-out';

        // Player light
        const players = ecs.query(['player', 'position']);
        players.forEach(id => {
            const pos = ecs.getComponent(id, 'position');
            const screenX = pos.x - camera.x + 16;
            const screenY = pos.y - camera.y + 16;

            const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, 150);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 150, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Apply light map to main canvas
        mainCtx.save();
        mainCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform just in case
        mainCtx.drawImage(this.lightCanvas, 0, 0);
        mainCtx.restore();
    }
}
