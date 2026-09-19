// bubble-dust.ts — the delete effect: one message bubble dissolving into glass-star dust
// (telegram-style, D-7 ⑦). Pure canvas and DOM measurement, zero React, so it can be exercised on
// its own in a browser console. Split out of channel-screen.tsx; the hub still owns the canvas and
// the map of bubble elements, and only calls in once per vanishing message.

// Glass-dust palette for the delete effect.
const VANISH_COLORS = ['#9fd6f4', '#5fb0e2', '#f8c8d6', '#ef9db4', '#ffffff', '#fce7b0'];

// Dissolve one bubble into glass-star dust (telegram-style, D-7 ⑦): samples the element's box into
// a 7px particle grid on the hub-wide canvas and animates it left→right until every particle fades.
// Runs one rAF loop per call and clears the canvas when done.
export function explodeBubble(canvas: HTMLCanvasElement, host: HTMLElement, el: HTMLElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sr = host.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    canvas.width = sr.width;
    canvas.height = sr.height;
    const x0 = r.left - sr.left;
    const y0 = r.top - sr.top;
    type P = {
        x: number;
        y: number;
        vx: number;
        vy: number;
        r: number;
        a: number;
        da: number;
        c: string;
        delay: number;
    };
    const parts: P[] = [];
    const cols = Math.max(4, Math.floor(r.width / 7));
    const rows = Math.max(3, Math.floor(r.height / 7));
    for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++)
            parts.push({
                x: x0 + i * 7 + Math.random() * 4,
                y: y0 + j * 7 + Math.random() * 4,
                vx: (Math.random() - 0.3) * 1.6,
                vy: -Math.random() * 1.8 - 0.4,
                r: Math.random() * 2.2 + 0.8,
                a: 1,
                da: 0.012 + Math.random() * 0.02,
                c: VANISH_COLORS[Math.floor(Math.random() * VANISH_COLORS.length)],
                delay: (i / cols) * 18 // dissolve left→right
            });
    const tick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (const p of parts) {
            if (p.delay > 0) {
                p.delay--;
                alive = true;
                continue;
            }
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 0.01;
            p.a -= p.da;
            if (p.a <= 0) continue;
            alive = true;
            ctx.globalAlpha = p.a;
            ctx.fillStyle = p.c;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, 7);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (alive) requestAnimationFrame(tick);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    tick();
}
