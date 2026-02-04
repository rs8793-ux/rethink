// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('textInput');
const submitBtn = document.getElementById('submitBtn');

// Set canvas size
const canvasSize = 600;
canvas.width = canvasSize;
canvas.height = canvasSize;

// Circle properties
const centerX = canvasSize / 2;
const centerY = canvasSize / 2;
const circleRadius = 200;

// Array to store floating text objects
const floatingTexts = [];

// Text object class
class FloatingText {
    constructor(text) {
        this.text = text;
        this.x = centerX;
        this.y = centerY;

        // Random velocity for natural movement
        this.vx = (Math.random() - 0.5) * 2; // -1 to 1
        this.vy = (Math.random() - 0.5) * 2; // -1 to 1

        // Opacity starts at 1 and fades to 0
        this.opacity = 1.0;
        this.lifetime = 0;
        this.maxLifetime = 5000; // 5 seconds in milliseconds

        // Measure text dimensions
        ctx.font = '20px sans-serif';
        this.textMetrics = ctx.measureText(text);
        this.textWidth = this.textMetrics.width;
        this.textHeight = 20; // Approximate height
    }

    update(deltaTime) {
        // Update lifetime and opacity
        this.lifetime += deltaTime;
        this.opacity = Math.max(0, 1 - (this.lifetime / this.maxLifetime));

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Check boundaries and bounce if needed
        const distanceFromCenter = Math.sqrt(
            Math.pow(this.x - centerX, 2) + Math.pow(this.y - centerY, 2)
        );

        // Account for text dimensions when checking boundaries
        const maxDistance = circleRadius - Math.max(this.textWidth / 2, this.textHeight / 2);

        if (distanceFromCenter > maxDistance) {
            // Calculate angle from center
            const angle = Math.atan2(this.y - centerY, this.x - centerX);

            // Position at boundary
            this.x = centerX + Math.cos(angle) * maxDistance;
            this.y = centerY + Math.sin(angle) * maxDistance;

            // Reflect velocity (bounce)
            const normalX = Math.cos(angle);
            const normalY = Math.sin(angle);

            // Reflect velocity vector
            const dot = this.vx * normalX + this.vy * normalY;
            this.vx -= 2 * dot * normalX;
            this.vy -= 2 * dot * normalY;

            // Add slight damping for more natural movement
            this.vx *= 0.9;
            this.vy *= 0.9;
        }

        // Add slight random drift for natural movement
        this.vx += (Math.random() - 0.5) * 0.1;
        this.vy += (Math.random() - 0.5) * 0.1;

        // Limit velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 3) {
            this.vx = (this.vx / speed) * 3;
            this.vy = (this.vy / speed) * 3;
        }
    }

    draw() {
        if (this.opacity <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }

    isExpired() {
        return this.opacity <= 0;
    }
}

// Draw the circle
function drawCircle() {
    ctx.beginPath();
    ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 3;
    ctx.stroke();
}

// Animation loop
let lastTime = performance.now();

function animate(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw circle
    drawCircle();

    // Update and draw all floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const text = floatingTexts[i];
        text.update(deltaTime);
        text.draw();

        // Remove expired texts
        if (text.isExpired()) {
            floatingTexts.splice(i, 1);
        }
    }

    requestAnimationFrame(animate);
}

// Handle text submission
function addText() {
    const text = textInput.value.trim();
    if (text) {
        floatingTexts.push(new FloatingText(text));
        textInput.value = '';
        textInput.focus();
    }
}

// Event listeners
submitBtn.addEventListener('click', addText);
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addText();
    }
});

// Start animation
textInput.focus();
animate(performance.now());
