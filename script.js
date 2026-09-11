/* FIREWORK ENGINE
   Pure JavaScript + Canvas */

const canvas = document.getElementById("fireworksCanvas");
const ctx = canvas.getContext("2d");

let width = window.innerWidth;
let height = window.innerHeight;

let dpr = Math.min(window.devicePixelRatio || 1, 2);

let fireworks = [];
let particles = [];
let smokeParticles = [];
let stars = [];

let autoLaunch = true;
let soundEnabled = true;

let particleCount = 40;
let gravity = 0.04;

/* auto fire, random about 5-10 */
let fireworkAmountMin = 1;
let fireworkAmountMax = 3;

let lastAutoLaunch = 0;

/* BLOOM (glow fullscreen, optimize performance) */

const BLOOM_SCALE = 0.28;
const BLOOM_BLUR_PX = 8;
const BLOOM_ALPHA = 0.55;

const bloomCanvas = document.createElement("canvas");
const bloomCtx = bloomCanvas.getContext("2d");

let bloomEnabled = true;

let lastFrameTime = performance.now();
let lowFpsStreak = 0;

function resizeBloomCanvas() {

    bloomCanvas.width = Math.max( 1,
        Math.floor(width * BLOOM_SCALE)
    );

    bloomCanvas.height = Math.max( 1,
        Math.floor(height * BLOOM_SCALE)
    );
}

function drawBloom() {

    if (!bloomEnabled) {
        return;
    }

    bloomCtx.clearRect( 0, 0,
        bloomCanvas.width,
        bloomCanvas.height
    );

    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const alpha = Math.max(0, particle.alpha);
        if (alpha <= 0.05) {
            continue;
        }
        bloomCtx.beginPath();
        bloomCtx.arc(
            particle.x * BLOOM_SCALE,
            particle.y * BLOOM_SCALE,
            Math.max(1, particle.size * BLOOM_SCALE * 1.6), 0, Math.PI * 2
        );
        
        bloomCtx.fillStyle =
    `rgba(${particle.rgbStart.r}, ${particle.rgbStart.g}, ${particle.rgbStart.b}, ${alpha})`;

        bloomCtx.fill();
    }

    // for (let i = 0; i < fireworks.length; i++) {

    //     const firework = fireworks[i];

    //     bloomCtx.beginPath();

    //     bloomCtx.arc(
    //         firework.x * BLOOM_SCALE,
    //         firework.y * BLOOM_SCALE,
    //         3 * BLOOM_SCALE * 4,
    //         0,
    //         Math.PI * 2
    //     );

    //     bloomCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
    //     bloomCtx.fill();
    // }

    bloomCtx.filter = `blur(${BLOOM_BLUR_PX}px)`;

    bloomCtx.drawImage(bloomCanvas, 0, 0);

    bloomCtx.filter = "none";

    ctx.save();

    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = BLOOM_ALPHA;

    ctx.drawImage(
        bloomCanvas,
        0,
        0,
        bloomCanvas.width,
        bloomCanvas.height,
        0,
        0,
        width,
        height
    );

    ctx.restore();
}

function updateBloomQuality(time) {

    const delta = time - lastFrameTime;
    lastFrameTime = time;

    const fps = 1000 / delta;

    if (fps < 40) {
        lowFpsStreak++;
    } else {
        lowFpsStreak = 0;
    }

    if (lowFpsStreak > 60 && bloomEnabled) {
        bloomEnabled = false;
    }

    if (fps > 50 && !bloomEnabled) {
        lowFpsStreak = 0;
        bloomEnabled = true;
    }
}

/* CANVAS SETUP */

function resizeCanvas() {

    width = window.innerWidth;
    height = window.innerHeight;

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    createStars();

    resizeBloomCanvas();
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();

/* UTILITIES */

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

function distance(x1, y1, x2, y2) {

    const dx = x2 - x1;
    const dy = y2 - y1;

    return Math.sqrt(
        dx * dx + dy * dy
    );
}

/* COLOR */

function randomColor() {

    const colors = [
        "#ffffff",
        "#fff200",
        "#ff2d55",
        "#ff2df0",
        "#b026ff",
        "#00c3ff",
        "#00ffb3",
        "#00fff2",
        "#ffb300",
        "#39ff14"
    ];

    return colors[
        randomInt(0, colors.length - 1)
    ];
}

/* STARS */

function createStars() {

    stars = [];

    const amount = Math.floor(
        (width * height) / 9000
    );

    for (let i = 0; i < amount; i++) {

        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,

            radius: random(0.3, 1.4),

            alpha: random(0.15, 0.7),

            twinkle: random(0.005, 0.02),

            phase: Math.random() * Math.PI * 2
        });
    }
}

function drawStars(time) {

    for (const star of stars) {

        const alpha =
            star.alpha +
            Math.sin(
                time * star.twinkle +
                star.phase
            ) * 0.15;

        ctx.beginPath();

        ctx.arc(
            star.x,
            star.y,
            star.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            `rgba(255,255,255,${Math.max(
                0,
                alpha
            )})`;

        ctx.fill();
    }
}
/* FIREWORK ROCKET & SMOKE */
class Smoke {

    constructor(x, y) {

        this.x = x + random(-6, 6);
        this.y = y + random(-4, 4);

        this.radius = random(4, 9);
        this.growth = random(0.15, 0.35);

        this.alpha = random(0.12, 0.22);
        this.decay = random(0.003, 0.006);

        this.driftX = random(-0.3, 0.3);
        this.driftY = random(-0.4, -0.15);
    }

    update() {

        this.x += this.driftX;
        this.y += this.driftY;

        this.radius += this.growth;
        this.alpha -= this.decay;

        return this.alpha > 0;
    }

    draw() {

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            this.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            `rgba(190, 195, 205, ${Math.max(0, this.alpha)})`;

        ctx.fill();
    }
}

function spawnSmoke(x, y) {

    const count = randomInt(5, 9);

    for (let i = 0; i < count; i++) {

        smokeParticles.push(
            new Smoke(x, y)
        );
    }
}

class Firework {

    constructor(targetX, targetY) {

        this.x =
            targetX !== undefined
                ? random(width * 0.15, width * 0.85)
                : random(width * 0.1, width * 0.9);

        this.y = height + 15; //getWaterLine() nếu dùng water reflect

        this.targetX =
            targetX !== undefined
                ? targetX
                : random(width * 0.1, width * 0.9);

        this.targetY =
            targetY !== undefined
                ? targetY
                : random(
                    height * 0.12,
                    height * 0.58
                );

        this.speed = random(4, 6);

        this.angle =
            Math.atan2(
                this.targetY - this.y,
                this.targetX - this.x
            );

        this.velocityX =
            Math.cos(this.angle) * this.speed;

        this.velocityY =
            Math.sin(this.angle) * this.speed;

        this.trail = [];

        this.trailLength = 8;

        this.color = randomColor();

        this.exploded = false;

        spawnSmoke(this.x, this.y);
    }

    update() {

        this.trail.push({
            x: this.x,
            y: this.y
        });

        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }

        this.x += this.velocityX;
        this.y += this.velocityY;

        const reachedTarget =
            distance(
                this.x,
                this.y,
                this.targetX,
                this.targetY
            ) < 18;

        if (reachedTarget) {

            this.explode();

            this.exploded = true;
        }
    }

    draw() {
        /* Trail */
        for (
            let i = 0;
            i < this.trail.length;
            i++
        ) {

            const point = this.trail[i];

            const alpha =
                i / this.trail.length;

            ctx.beginPath();

            ctx.arc(
                point.x,
                point.y,
                1.2,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                this.color.replace(
                    ")",
                    `,${alpha})`
                );
            ctx.fillStyle =
                hexToRGBA(
                    this.color,
                    alpha
                );

            ctx.fill();
        }

        /* Rocket head */

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            2.4,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "#ffffff";

        ctx.fill();
    }

    explode() {

        createExplosion(
            this.x,
            this.y,
            this.color
        );

        playExplosionSound();
    }
}

/* PARTICLE */

class Particle {

    constructor() {
        this.alive = false;
    }
    init(
        x, y, color, angle, speed, size,
        gravityScale = 1,
        decayScale = 1
    ) {

        this.x = x;
        this.y = y;

        this.previousX = x;
        this.previousY = y;

        this.color = color;
        this.colorEnd = randomColor();

this.rgbStart = hexToRGB(color);         
    this.rgbEnd = hexToRGB(this.colorEnd);   

        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;

        this.friction = random(0.965, 0.985);
        this.gravity = gravity * gravityScale;

        this.alpha = 1;
        this.decay = random(0.009, 0.018) * decayScale;

        this.size = size;
        this.twinkle = Math.random() > 0.75;

        this.alive = true;

        return this;
    }

    update() {

        this.previousX = this.x;
        this.previousY = this.y;

        this.velocityX *= this.friction;
        this.velocityY *= this.friction;

        this.velocityY += this.gravity;

        this.x += this.velocityX;
        this.y += this.velocityY;

        this.alpha -= this.decay;

        return this.alpha > 0;
    }

    draw() {

    const alpha = Math.max(0, this.alpha);
    const progress = Math.min(1, 1 - this.alpha);

    const flicker =
        this.twinkle
            ? 0.4 + Math.random() * 0.6
            : 1;

    const displayAlpha = alpha * flicker;

    /* Particle trail */

    ctx.beginPath();
    ctx.moveTo(this.previousX, this.previousY);
    ctx.lineTo(this.x, this.y);

    ctx.lineWidth = this.size * 0.8;

    ctx.strokeStyle =
        lerpRGB(this.rgbStart, this.rgbEnd, progress, displayAlpha * 0.5);

    ctx.stroke();

    /* Particle */

    ctx.beginPath();

    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

    ctx.fillStyle =
        lerpRGB(this.rgbStart, this.rgbEnd, progress, displayAlpha);

    ctx.fill();
}
}

function lerpRGB(rgbA, rgbB, t, alpha) {

    const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * t);
    const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * t);
    const b = Math.round(rgbA.b + (rgbB.b - rgbA.b) * t);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
const particlePool = [];

function spawnParticle(
    x, y, color, angle, speed, size,
    gravityScale = 1,
    decayScale = 1
) {

    const particle =
        particlePool.pop() || new Particle();

    particle.init(
        x, y, color, angle, speed, size,
        gravityScale, decayScale
    );

    particles.push(particle);
}
/* EXPLOSION */
const explosionStyles = [
    "peony", "ring", "willow", "chrysanthemum", "crossette",
    "heart", "star", "doubleCircle", "planet", "fullCircle",
    "doubleFullCircle", "randomBurst"
];

function createExplosion(
    x,
    y,
    color
) {

    const style =
        explosionStyles[
        randomInt(
            0,
            explosionStyles.length - 1
        )
        ];

    switch (style) {

        case "ring":
            explodeRing(x, y, color);
            break;

        case "willow":
            explodeWillow(x, y, color);
            break;

        case "chrysanthemum":
            explodeChrysanthemum(x, y, color);
            break;

        case "crossette":
            explodeCrossette(x, y, color);
            break;

        case "heart":
            explodeHeart(x, y, color);
            break;

        case "doubleCircle":
            explodeDoubleCircle(x, y, color);
            break;

        case "planet":
            explodePlanet(x, y, color);
            break;

        case "fullCircle":
            explodeFullCircle(x, y, color);
            break;

        case "doubleFullCircle":
            explodeDoubleFullCircle(x, y, color);
            break;

        case "randomBurst":
            explodeRandomBurst(x, y, color);
            break;
        case "star":
            explodeStar(x, y, color);
            break;

        default:
            explodePeony(x, y, color);
            break;
    }

    /* Secondary sparkle particles, shared by every style. */

    const extra =
        Math.floor(
            particleCount * 0.18
        );

    for (let i = 0; i < extra; i++) {

        const angle =
            Math.random() *
            Math.PI *
            2;

        spawnParticle(
                x,
                y,
                randomColor(),
                angle,
                random(1.5, 3.5),
                random(0.8, 1.8)
        );
    }
}

// Star
function explodeStar(x, y, color) {

    const count = particleCount;

    const spikes = 5;
    const outerRadius = 18;
    const innerRadius = 7;

    const totalPoints = spikes * 2;

    // Tính 10 đỉnh của ngôi sao (5 ngoài + 5 trong xen kẽ)
    const vertices = [];

    for (let i = 0; i < totalPoints; i++) {
        const angle = (Math.PI * i) / spikes - Math.PI / 2;
        const r = i % 2 === 0 ? outerRadius : innerRadius;

        vertices.push({
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r
        });
    }

    // Rải particle đều dọc theo các cạnh nối giữa các đỉnh
    for (let i = 0; i < count; i++) {
        const t = (i / count) * totalPoints;
        const index = Math.floor(t) % totalPoints;
        const nextIndex = (index + 1) % totalPoints;
        const localT = t - Math.floor(t);

        const vx = vertices[index].x + (vertices[nextIndex].x - vertices[index].x) * localT;
        const vy = vertices[index].y + (vertices[nextIndex].y - vertices[index].y) * localT;

        const angle = Math.atan2(vy, vx);
        const speed = distance(0, 0, vx, vy) * 0.22;

        spawnParticle(x, y, color, angle, speed, random(1.2, 2));
    }
}

/* Classic round burst (the original style) */

function explodePeony(x, y, color) {

    const count = particleCount;

    for (let i = 0; i < count; i++) {

        const angle =
            (Math.PI * 2 * i) / count;

        spawnParticle(
                x,
                y,
                color,
                angle,
                random(1, 4.5),
                random(1, 2.4)
        );
    }
}

/* Thin, even ring — narrow speed band */

function explodeRing(x, y, color) {

    const count = particleCount;

    for (let i = 0; i < count; i++) {

        const angle =
            (Math.PI * 2 * i) / count;

        spawnParticle(
                x,
                y,
                color,
                angle,
                random(3, 3.8),
                random(1.2, 2)
        );
    }
}

/* Drooping willow — falls slowly with long trailing tails */

function explodeWillow(x, y, color) {

    const count =
        Math.floor(particleCount * 0.8);

    for (let i = 0; i < count; i++) {

        const angle =
            (Math.PI * 2 * i) / count;

        spawnParticle(
                x,
                y,
                color,
                angle,
                random(1, 2.6),
                random(1, 2),
                1.8,
                0.45
        );
    }
}

/* Two-layer burst — dense center + sparkling outer ring */

function explodeChrysanthemum(
    x,
    y,
    color
) {

    const inner =
        Math.floor(particleCount * 0.6);

    const outer =
        Math.floor(particleCount * 0.6);

    for (let i = 0; i < inner; i++) {

        const angle =
            (Math.PI * 2 * i) / inner;

        spawnParticle(
                x,
                y,
                color,
                angle,
                random(0.8, 1.8),
                random(1, 1.8)
        );
    }

    for (let i = 0; i < outer; i++) {

        const angle =
            (Math.PI * 2 * i) / outer +
            0.15;

        spawnParticle(
                x,
                y,
                randomColor(),
                angle,
                random(3, 5),
                random(1, 2),
                1,
                0.8
        );
    }
}

/* Crossette — splits into small bursts mid-flight */

function explodeCrossette(
    x,
    y,
    color
) {

    const count =
        Math.floor(particleCount * 0.5);

    for (let i = 0; i < count; i++) {

        const angle =
            (Math.PI * 2 * i) / count;

        const speed =
            random(2, 3.6);

        spawnParticle(
                x,
                y,
                color,
                angle,
                speed,
                random(1.4, 2.2)
        );

        const delay =
            random(250, 400);

        setTimeout(() => {

    const px = x + Math.cos(angle) * speed * 12;
    const py = y + Math.sin(angle) * speed * 12;

    for (let j = 0; j < 6; j++) {

        const subAngle = Math.random() * Math.PI * 2;

        spawnParticle(
            px, py, color, subAngle,
            random(1.5, 3), random(0.8, 1.4)
        );
    }

}, delay);
    }
}

/* Heart-shaped burst */

function explodeHeart(x, y, color) {

    const count = particleCount;

    for (let i = 0; i < count; i++) {

        const t =
            (Math.PI * 2 * i) / count;

        const hx =
            16 * Math.pow(Math.sin(t), 3);

        const hy =
            -(
                13 * Math.cos(t) -
                5 * Math.cos(2 * t) -
                2 * Math.cos(3 * t) -
                Math.cos(4 * t)
            );

        const angle =
            Math.atan2(hy, hx);

        const speed =
            distance(0, 0, hx, hy) * 0.22;

        spawnParticle(
                x,
                y,
                color,
                angle,
                speed,
                random(1.2, 2)
        );
    }
}

/* Double Circle — different color and speed*/

function explodeDoubleCircle(x, y, color) {

    const count = particleCount;

    for (let i = 0; i < count; i++) {

        const angle =
            (Math.PI * 2 * i) / count;

        spawnParticle(
                x,
                y,
                color,
                angle,
                random(3.5, 4.5),
                random(1, 2)
        );
    }

    const color2 = randomColor();

    for (let i = 0; i < count; i++) {

        const angle =
            (Math.PI * 2 * i) / count;

        spawnParticle(
                x,
                y,
                color2,
                angle,
                random(1.5, 3),
                random(1, 2)
        );
    }
}

/* Planet */

function explodePlanet(x, y, color) {

    const core = "#e74c4c";
    const count = particleCount;

    for (let i = 0; i < count; i++) {

        const angle =
            (Math.PI * 2 * i) / count;

        spawnParticle(
                x,
                y,
                core,
                angle,
                random(1.8, 2.6),
                random(1, 2)
        );
    }

    const scatterCount =
        Math.floor(count * 1.5);

    for (let i = 0; i < scatterCount; i++) {

        const angle =
            Math.random() * Math.PI * 2;

        const v =
            random(1.8, 2.6) *
            Math.random();

        spawnParticle(
                x,
                y,
                core,
                angle,
                v,
                random(1, 2)
        );
    }

    const ringCount =
        Math.floor(count * 0.8);

    const rotate =
        Math.random() * Math.PI * 2;

    const vx = random(2.5, 3.5);
    const vy = vx * 0.5;

    for (let i = 0; i < ringCount; i++) {

        const rad =
            (Math.PI * 2 * i) / ringCount;

        const cx = Math.cos(rad) * vx;
        const cy = Math.sin(rad) * vy;

        const rvx =
            cx * Math.cos(rotate) -
            cy * Math.sin(rotate);

        const rvy =
            cx * Math.sin(rotate) +
            cy * Math.cos(rotate);

        const angle =
            Math.atan2(rvy, rvx);

        const speed =
            distance(0, 0, rvx, rvy);

        spawnParticle(
                x,
                y,
                "#ffdd66",
                angle,
                speed,
                random(1, 2),
                0.6
        );
    }
}

/* Full Circle */

function explodeFullCircle(x, y, color) {

    const count = particleCount;

    for (let i = 0; i < count; i++) {

        const angle =
            (Math.PI * 2 * i) / count;

        spawnParticle(
                x,
                y,
                color,
                angle,
                random(4, 5),
                random(1, 2)
        );
    }

    const denseCount = count * 2;

    for (let i = 0; i < denseCount; i++) {

        const angle =
            (Math.PI * 2 * i) / denseCount;

        const v =
            random(4, 5) * Math.random();

        spawnParticle(
                x,
                y,
                color,
                angle,
                v,
                random(1, 2)
        );
    }
}

/* Double Full Circle */

function explodeDoubleFullCircle(
    x,
    y,
    color
) {

    const count = particleCount;

    for (let i = 0; i < count; i++) {

        const angle =
            (Math.PI * 2 * i) / count;

        spawnParticle(
                x,
                y,
                color,
                angle,
                random(4, 5),
                random(1, 2)
        );
    }

    const color2 = randomColor();
    const count2 = Math.floor(count * 0.7);

    for (let i = 0; i < count2; i++) {

        const angle =
            (Math.PI * 2 * i) / count2;

        spawnParticle(
                x,
                y,
                color2,
                angle,
                random(1.5, 3),
                random(1, 2)
        );
    }

    const denseCount = count * 1.5;

    for (let i = 0; i < denseCount; i++) {

        const angle =
            (Math.PI * 2 * i) / denseCount;

        const v =
            random(2, 4) * Math.random();

        spawnParticle(
                x,
                y,
                color2,
                angle,
                v,
                random(1, 2)
        );
    }
}

/* Random Burst */

function explodeRandomBurst(x, y, color) {

    const count = particleCount;

    for (let i = 0; i < count; i++) {

        const vx = random(-4, 4);
        const vy = random(-4, 1);

        const angle =
            Math.atan2(vy, vx);

        const speed =
            distance(0, 0, vx, vy);

        spawnParticle(
                x,
                y,
                color,
                angle,
                speed,
                random(1, 2)
        );
    }
}

/* LAUNCH */

function launchFirework(
    x,
    y
) {

    playLaunchSound();

    fireworks.push(
        new Firework(
            x,
            y
        )
    );
}

/* AUTO FIREWORK */

function autoLaunchFireworks(time) {

    if (!autoLaunch) {
        return;
    }

    //Launch every ~1000ms
    if (
        time - lastAutoLaunch >
        1000
    ) {

        const amount =
            randomInt(
                fireworkAmountMin,
                fireworkAmountMax
            );

        for (
            let i = 0;
            i < amount;
            i++
        ) {

            setTimeout(() => {

                const targetX =
                    random(
                        width * 0.1,
                        width * 0.9
                    );

                const targetY =
                    random(
                        height * 0.12,
                        height * 0.60
                    );

                launchFirework(
                    targetX,
                    targetY
                );

            }, i * random(30, 90));
        }

        lastAutoLaunch = time;
    }
}

/* MOUSE / TOUCH */

canvas.addEventListener(
    "pointerdown",
    event => {

        initAudio();

        const rect =
            canvas.getBoundingClientRect();

        const x =
            event.clientX -
            rect.left;

        const y =
            event.clientY -
            rect.top;

        launchFirework(
            x,
            y
        );
    }
);

/* AUDIO */

let audioContext = null;
let explosionBuffer = null;
let explosionBufferLoading = false;

function initAudio() {

    if (!audioContext) {

        audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();
    }

    if (
        audioContext.state ===
        "suspended"
    ) {

        audioContext.resume();
    }

    /* Load file explosion sound */

    if (
        !explosionBuffer &&
        !explosionBufferLoading
    ) {

        explosionBufferLoading = true;

        /* fetch("sound/firework.wav")
             .then(response => response.arrayBuffer())
             .then(data => audioContext.decodeAudioData(data))
             .then(buffer => {
                 explosionBuffer = buffer;
             })
             .catch(error => {
                 explosionBufferLoading = false;
                 console.error("Không giải mã được firework.wav:", error);
             }); */
    }
}

function playExplosionSound() {

    if (!soundEnabled) {
        return;
    }

    initAudio();

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    oscillator.type = "sine";

    oscillator.frequency.setValueAtTime(
        random(90, 160),
        audioContext.currentTime
    );

    oscillator.frequency.exponentialRampToValueAtTime(
        45,
        audioContext.currentTime + 0.25
    );

    gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.12,
        audioContext.currentTime + 0.01
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.3
    );

    oscillator.connect(gain);

    gain.connect(
        audioContext.destination
    );

    oscillator.start();

    oscillator.stop(
        audioContext.currentTime + 0.3
    );
}

function playLaunchSound() {

    if (!soundEnabled) {
        return;
    }

    initAudio();

    const bufferSize =
        audioContext.sampleRate * 0.4;

    const noiseBuffer =
        audioContext.createBuffer(
            1,
            bufferSize,
            audioContext.sampleRate
        );

    const data =
        noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {

        data[i] =
            Math.random() * 2 - 1;
    }

    const noise =
        audioContext.createBufferSource();

    noise.buffer = noiseBuffer;

    const filter =
        audioContext.createBiquadFilter();

    filter.type = "bandpass";

    filter.frequency.setValueAtTime(
        1800,
        audioContext.currentTime
    );

    filter.frequency.exponentialRampToValueAtTime(
        400,
        audioContext.currentTime + 0.4
    );

    filter.Q.value = 0.8;

    const gain =
        audioContext.createGain();

    gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.18,
        audioContext.currentTime + 0.05
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.4
    );

    noise.connect(filter);
    filter.connect(gain);

    gain.connect(
        audioContext.destination
    );

    noise.start();

    noise.stop(
        audioContext.currentTime + 0.4
    );
}

/* CLEAR */

function clearFireworks() {

    fireworks = [];
    particles = [];
}

/* COLOR HELPER */

function hexToRGB(hex) {

    const clean =
        hex.replace("#", "");

    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16)
    };
}

function lerpColor(hexA, hexB, t, alpha) {

    const a = hexToRGB(hexA);
    const b = hexToRGB(hexB);

    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bch = Math.round(a.b + (b.b - a.b) * t);

    return `rgba(${r}, ${g}, ${bch}, ${alpha})`;
}

function hexToRGBA(
    hex,
    alpha
) {

    const clean =
        hex.replace("#", "");

    const r =
        parseInt(
            clean.substring(0, 2),
            16
        );

    const g =
        parseInt(
            clean.substring(2, 4),
            16
        );

    const b =
        parseInt(
            clean.substring(4, 6),
            16
        );

    return `rgba(
        ${r},
        ${g},
        ${b},
        ${alpha}
    )`;
}

/* BACKGROUND */

function drawBackground() {

    /*
     * Instead of clearing completely,
     * paint a transparent dark layer.
     *
     * This creates the beautiful
     * firework trail effect.
     *
     * With many rockets launching at once
     * (10-15 per burst), a very low alpha
     * here lets trails overlap and linger,
     * leaving a ghostly "fern/leaf" residue
     * instead of a clean black starry sky.
     * A higher alpha clears each frame faster
     * so the background stays pure black
     * (with stars) right after fireworks
     * explode and rise, while still keeping
     * a short, crisp trail per rocket.
     */

    ctx.fillStyle =
        "rgba(1, 3, 12, 1)";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );
}

// /*/ Water Reflect*/
// function getWaterLine() {
//     return height - height * 0.2;
// }


// function drawWaterReflection() {

//     const bandHeight = height * 0.2;
//     const waterLine = getWaterLine();

//     /*
//      * Chụp lại đúng dải khung hình
//      * ngay phía trên mặt nước (cao
//      * bằng mặt nước) rồi lật xuống,
//      * để phản chiếu toàn bộ pháo hoa,
//      * vệt bay, tia lửa và cả sao trời
//      * đang hiển thị phía trên — không
//      * chỉ riêng particle.
//      */

//     ctx.save();

//     ctx.beginPath();

//     ctx.rect(
//         0,
//         waterLine,
//         width,
//         bandHeight
//     );

//     ctx.clip();

//     ctx.globalAlpha = 0.4;

//     ctx.translate(
//         0,
//         waterLine + bandHeight
//     );

//     ctx.scale(1, -1);

//     ctx.drawImage(
//         canvas,
//         0,
//         waterLine - bandHeight,
//         width,
//         bandHeight,
//         0,
//         0,
//         width,
//         bandHeight
//     );

//     ctx.restore();

//     /* Water surface tint */

//     const gradient =
//         ctx.createLinearGradient(
//             0,
//             waterLine,
//             0,
//             height
//         );

//     gradient.addColorStop(
//         0,
//         "rgba(3, 10, 25, 0.25)"
//     );

//     gradient.addColorStop(
//         1,
//         "rgba(1, 3, 12, 0.7)"
//     );

//     ctx.fillStyle = gradient;

//     ctx.fillRect(
//         0,
//         waterLine,
//         width,
//         bandHeight
//     );

//     /* Đường viền sáng nhẹ ở mép nước */

//     ctx.fillStyle =
//         "rgba(255, 255, 255, 0.08)";

//     ctx.fillRect(
//         0,
//         waterLine,
//         width,
//         1.5
//     );
// }

/* MAIN */

function animate(time) {

    requestAnimationFrame(
        animate
    );

    updateBloomQuality(time);

    drawBackground();

    drawStars(time);

    /* LAUNCH SMOKE */

    for (
        let i = smokeParticles.length - 1;
        i >= 0;
        i--
    ) {

        const smoke =
            smokeParticles[i];

        const alive =
            smoke.update();

        if (!alive) {

            smokeParticles.splice(
                i,
                1
            );

            continue;
        }

        smoke.draw();
    }

    autoLaunchFireworks(time);

    /* FIREWORK ROCKETS */

    for (
        let i = fireworks.length - 1;
        i >= 0;
        i--
    ) {

        const firework =
            fireworks[i];

        firework.update();

        if (
            firework.exploded
        ) {

            fireworks.splice(
                i,
                1
            );

            continue;
        }

        firework.draw();
    }

    /* PARTICLES */

    const MAX_PARTICLES = 300;

    if (particles.length > MAX_PARTICLES) {

        particles.splice(
            0,
            particles.length - MAX_PARTICLES
        );
    }

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const particle =
            particles[i];

        const alive =
            particle.update();

        if (!alive) {

            particles.splice(
                i,
                1
            );

            continue;
        }

        particle.draw();
    }

    drawBloom();
}

/* START */

createStars();

initAudio();

requestAnimationFrame(
    animate
);

/* Initial fireworks */

setTimeout(() => {

    launchFirework(
        width * 0.35,
        height * 0.3
    );

}, 500);

setTimeout(() => {

    launchFirework(
        width * 0.65,
        height * 0.25
    );

}, 900);