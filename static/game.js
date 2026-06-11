'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

const GRID_SIZE   = 25;
const GRID_W      = 25;
const GRID_H      = 25;
const HUD_H       = 50;
const CANVAS_W    = GRID_W * GRID_SIZE;   // 625
const CANVAS_H    = GRID_H * GRID_SIZE + HUD_H; // 675
const TOTAL_TILES = GRID_W * GRID_H;
const BASE_FPS    = 10;
const MAX_FPS     = 20;
const SPECIAL_INTERVAL = 8000; // ms between special food spawns

const C = {
    bg:     '#18191b',
    grid:   '#23262b',
    text:   '#f0f0f0',
    muted:  '#8c9191',
    head:   '#2ecc71',
    body:   '#27ae60',
    border: '#10281a',
    food:   '#e74c3c',
    super:  '#f1c40f',
    poison: '#9b59b6',
    blink:  '#282828',
};

// ── Food classes ──────────────────────────────────────────────────────────────

class Food {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.color = color; this.baseColor = color;
    }
    update() { return true; }
}

class TimedFood extends Food {
    constructor(x, y, color, duration = 5000, blinkAt = 3000) {
        super(x, y, color);
        this.born = Date.now();
        this.duration = duration;
        this.blinkAt = blinkAt;
    }
    update() {
        const t = Date.now() - this.born;
        if (t >= this.duration) return false;
        if (t >= this.blinkAt) {
            this.color = Math.floor((t - this.blinkAt) / 200) % 2 === 0
                ? C.blink : this.baseColor;
        }
        return true;
    }
}

class NormalFood extends Food   { constructor(x, y) { super(x, y, C.food); } }
class SuperFood  extends TimedFood { constructor(x, y) { super(x, y, C.super); } }
class PoisonFood extends TimedFood { constructor(x, y) { super(x, y, C.poison); } }

// ── Snake ─────────────────────────────────────────────────────────────────────

class Snake {
    constructor(x, y) {
        this.body    = [[x, y], [x - 1, y], [x - 2, y]];
        this.dir     = [1, 0];
        this.nextDir = [1, 0];
    }

    changeDir([dx, dy]) {
        if (dx !== -this.dir[0] || dy !== -this.dir[1])
            this.nextDir = [dx, dy];
    }

    move(grow = 0, shrink = 0) {
        this.dir = [...this.nextDir];
        this.body.unshift([this.body[0][0] + this.dir[0], this.body[0][1] + this.dir[1]]);

        if (grow > 0) {
            // keep new head + grow-1 extra copies of tail
            for (let i = 0; i < grow - 1; i++)
                this.body.push([...this.body[this.body.length - 1]]);
        } else {
            this.body.pop(); // normal tail removal
            if (shrink > 0) {
                const n = Math.min(shrink, this.body.length - 1);
                this.body.splice(this.body.length - n, n);
            }
        }
    }

    collidesWithWall() {
        const [x, y] = this.body[0];
        return x < 0 || x >= GRID_W || y < 0 || y >= GRID_H;
    }

    collidesWithSelf() {
        const [hx, hy] = this.body[0];
        return this.body.slice(1).some(([x, y]) => x === hx && y === hy);
    }
}

// ── Game ──────────────────────────────────────────────────────────────────────

class Game {
    constructor(canvas, name) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.name   = name;

        this.snake       = new Snake(Math.floor(GRID_W / 2), Math.floor(GRID_H / 2));
        this.food        = null;
        this.specials    = [];
        this.score       = 0;
        this.paused      = false;
        this.over        = false;
        this.won         = false;
        this.lastSpecial = Date.now();
        this.lastTick    = 0;

        this._spawnFood();
        this._bindKeys();

        const tick = (ts) => {
            const fps = (this.over || this.won || this.paused)
                ? BASE_FPS
                : Math.min(BASE_FPS + Math.floor(this.snake.body.length / 5), MAX_FPS);

            if (!this.over && !this.won && !this.paused && ts - this.lastTick >= 1000 / fps) {
                this._update();
                this.lastTick = ts;
            }
            this._draw();
            this._raf = requestAnimationFrame(tick);
        };
        this._raf = requestAnimationFrame(tick);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    _vacantCells() {
        const occ = new Set([
            ...this.snake.body.map(([x, y]) => `${x},${y}`),
            ...(this.food ? [`${this.food.x},${this.food.y}`] : []),
            ...this.specials.map(f => `${f.x},${f.y}`),
        ]);
        const cells = [];
        for (let x = 0; x < GRID_W; x++)
            for (let y = 0; y < GRID_H; y++)
                if (!occ.has(`${x},${y}`)) cells.push([x, y]);
        return cells;
    }

    _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    _spawnFood() {
        const v = this._vacantCells();
        if (v.length) { const [x, y] = this._pick(v); this.food = new NormalFood(x, y); }
    }

    _spawnSpecials() {
        const v = this._vacantCells();
        if (v.length < 2) return;
        const choice = this._pick(['SUPER', 'POISON', 'BOTH']);
        if (choice !== 'POISON') {
            const i = Math.floor(Math.random() * v.length);
            const [x, y] = v.splice(i, 1)[0];
            this.specials.push(new SuperFood(x, y));
        }
        if (choice !== 'SUPER' && v.length) {
            const [x, y] = this._pick(v);
            this.specials.push(new PoisonFood(x, y));
        }
    }

    _eatCheck(nx, ny) {
        if (this.food && this.food.x === nx && this.food.y === ny) {
            this._spawnFood();
            return [1, 0, 10];
        }
        const idx = this.specials.findIndex(f => f.x === nx && f.y === ny);
        if (idx === -1) return [0, 0, 0];
        const f = this.specials.splice(idx, 1)[0];
        if (f instanceof SuperFood)  return [3, 0, 50];
        if (f instanceof PoisonFood) return [0, Math.max(1, Math.floor(this.snake.body.length / 2)), 0];
        return [0, 0, 0];
    }

    // ── Update ───────────────────────────────────────────────────────────────

    _update() {
        this.specials = this.specials.filter(f => f.update());

        if (Date.now() - this.lastSpecial >= SPECIAL_INTERVAL) {
            this._spawnSpecials();
            this.lastSpecial = Date.now();
        }

        const [hx, hy] = this.snake.body[0];
        const [dx, dy] = this.snake.nextDir;
        const [grow, shrink, pts] = this._eatCheck(hx + dx, hy + dy);
        this.score += pts;
        this.snake.move(grow, shrink);

        if (this.snake.collidesWithWall() || this.snake.collidesWithSelf()) {
            this.over = true;
            this._saveScore();
        } else if (this.snake.body.length >= TOTAL_TILES) {
            this.won = true;
            this._saveScore();
        }
    }

    async _saveScore() {
        try {
            await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: this.name, score: this.score }),
            });
        } catch { /* network unavailable — score not saved */ }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────

    _draw() {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // HUD strip
        ctx.fillStyle = 'rgba(15,17,22,0.92)';
        ctx.fillRect(0, 0, CANVAS_W, HUD_H);
        ctx.fillStyle = C.text;
        ctx.font = '13px Consolas, monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(
            `${this.name}  │  Score: ${this.score}  │  Length: ${this.snake.body.length} / ${TOTAL_TILES}`,
            14, HUD_H / 2,
        );

        // Grid lines
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= GRID_W; x++) {
            ctx.beginPath();
            ctx.moveTo(x * GRID_SIZE, HUD_H);
            ctx.lineTo(x * GRID_SIZE, CANVAS_H);
            ctx.stroke();
        }
        for (let y = 0; y <= GRID_H; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * GRID_SIZE + HUD_H);
            ctx.lineTo(CANVAS_W, y * GRID_SIZE + HUD_H);
            ctx.stroke();
        }

        // Food
        if (this.food) this._drawFood(this.food, '🍎');
        this.specials.forEach(f =>
            this._drawFood(f, f instanceof SuperFood ? '⭐' : '💀'),
        );

        // Snake
        this.snake.body.forEach(([x, y], i) => {
            const px = x * GRID_SIZE + 1;
            const py = y * GRID_SIZE + HUD_H + 1;
            const s  = GRID_SIZE - 2;
            ctx.fillStyle = i === 0 ? C.head : C.body;
            _rrect(ctx, px, py, s, s, 3);
            ctx.fill();
            ctx.strokeStyle = C.border;
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Overlays
        if (this.paused) {
            this._overlay('PAUSED', 'Press P to resume', '#3498db');
        } else if (this.over) {
            this._overlay('GAME OVER', 'R to restart  ·  ESC for menu', '#e74c3c');
        } else if (this.won) {
            this._overlay('YOU WIN! 🎉', 'R to restart  ·  ESC for menu', '#2ecc71');
        }
    }

    _drawFood(food, emoji) {
        const ctx = this.ctx;
        const cx = food.x * GRID_SIZE + GRID_SIZE / 2;
        const cy = food.y * GRID_SIZE + GRID_SIZE / 2 + HUD_H;
        const r  = GRID_SIZE / 2 - 2;

        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r + 7);
        grd.addColorStop(0, food.color + '55');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = `${Math.floor(GRID_SIZE * 0.65)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, cx, cy + 1);
    }

    _overlay(title, subtitle, accent) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(16,18,23,0.82)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const pw = 400, ph = 150;
        const px = (CANVAS_W - pw) / 2, py = (CANVAS_H - ph) / 2;

        ctx.fillStyle = '#1a1e28';
        _rrect(ctx, px, py, pw, ph, 12); ctx.fill();
        ctx.strokeStyle = accent; ctx.lineWidth = 2;
        _rrect(ctx, px, py, pw, ph, 12); ctx.stroke();

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = accent;
        ctx.font = 'bold 22px Consolas, monospace';
        ctx.fillText(title, CANVAS_W / 2, py + 52);
        ctx.fillStyle = C.text;
        ctx.font = '13px Consolas, monospace';
        ctx.fillText(subtitle, CANVAS_W / 2, py + 100);
    }

    // ── Input ────────────────────────────────────────────────────────────────

    _bindKeys() {
        const DIRS = {
            ArrowUp: [0,-1], w: [0,-1], W: [0,-1],
            ArrowDown: [0,1], s: [0,1], S: [0,1],
            ArrowLeft: [-1,0], a: [-1,0], A: [-1,0],
            ArrowRight: [1,0], d: [1,0], D: [1,0],
        };
        this._onKey = e => {
            if (e.key === 'p' || e.key === 'P') {
                if (!this.over && !this.won) this.paused = !this.paused;
                return;
            }
            if (this.paused) return;
            if (DIRS[e.key]) { e.preventDefault(); this.snake.changeDir(DIRS[e.key]); }
        };
        document.addEventListener('keydown', this._onKey);
    }

    destroy() {
        cancelAnimationFrame(this._raf);
        document.removeEventListener('keydown', this._onKey);
    }
}

// ── Shared utility ────────────────────────────────────────────────────────────

function _rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
}

// ── App controller ────────────────────────────────────────────────────────────

let activeGame = null;
const $ = id => document.getElementById(id);

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

function startGame() {
    const name = $('name-input').value.trim() || 'Anonymous';
    if (activeGame) { activeGame.destroy(); activeGame = null; }
    showScreen('game-screen');
    activeGame = new Game($('game-canvas'), name);
}

async function openLeaderboard() {
    showScreen('leaderboard-screen');
    try {
        const res = await fetch('/api/scores');
        renderLeaderboard(await res.json());
    } catch {
        renderLeaderboard([]);
    }
}

function renderLeaderboard(records) {
    const el = $('lb-table');
    if (!records.length) {
        el.innerHTML = '<p class="lb-empty">No scores yet — be the first!</p>';
        return;
    }
    const rankClass = ['rank-1', 'rank-2', 'rank-3'];
    el.innerHTML =
        `<div class="lb-header"><span>Rank</span><span>Player</span><span>Score</span></div>` +
        records.slice(0, 8).map((r, i) =>
            `<div class="lb-row">
                <span class="lb-rank ${rankClass[i] || ''}">#${i + 1}</span>
                <span>${r.name.slice(0, 18)}</span>
                <span class="lb-score">${r.score} pts</span>
            </div>`,
        ).join('');
}

$('btn-start').addEventListener('click', startGame);
$('btn-leaderboard').addEventListener('click', openLeaderboard);
$('btn-back').addEventListener('click', () => showScreen('menu-screen'));
$('name-input').addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });

document.addEventListener('keydown', e => {
    if (!activeGame) return;
    if (e.key === 'Escape') {
        activeGame.destroy(); activeGame = null;
        showScreen('menu-screen');
    } else if ((e.key === 'r' || e.key === 'R') && (activeGame.over || activeGame.won)) {
        const name = activeGame.name;
        activeGame.destroy(); activeGame = null;
        showScreen('game-screen');
        activeGame = new Game($('game-canvas'), name);
    }
});
