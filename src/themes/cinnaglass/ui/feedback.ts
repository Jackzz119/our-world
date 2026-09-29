// One-shot feedback that has no home in a stylesheet: particle bursts (a quick
// reaction, a favourite) and the failure headshake. Particles are plain DOM
// glyphs driven by the Web Animations API, so they run on the compositor, never
// take pointer events and remove themselves. Low motion turns them off.
import { motionReduced } from '@/themes/cinnaglass/ui/motion-preference';

type BurstOptions = {
    /** glyphs cycled through the particles, e.g. ['❤️'] or ['✦', '·'] */
    glyphs?: string[];
    count?: number;
    /** fan width in degrees, centred straight up */
    spread?: number;
    /** how far a particle travels, px */
    distance?: number;
    /** base font size, px */
    size?: number;
    color?: string;
};

// Fan a few glyphs up and out of an element (or a point) and let them fade.
export function burst(from: Element | { x: number; y: number }, options: BurstOptions = {}) {
    if (motionReduced()) return;
    const { glyphs = ['✦'], count = 7, spread = 110, distance = 64, size = 14, color } = options;
    const box = from instanceof Element ? from.getBoundingClientRect() : null;
    const x = box ? box.left + box.width / 2 : (from as { x: number }).x;
    const y = box ? box.top + box.height / 2 : (from as { y: number }).y;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('span');
        el.className = 'ow-particle';
        el.setAttribute('aria-hidden', 'true');
        el.textContent = glyphs[i % glyphs.length];
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.fontSize = `${Math.round(size * (0.7 + Math.random() * 0.6))}px`;
        if (color) el.style.color = color;
        document.body.appendChild(el);
        const angle = ((-90 + (Math.random() - 0.5) * spread) * Math.PI) / 180;
        const reach = distance * (0.6 + Math.random() * 0.6);
        const dx = Math.cos(angle) * reach;
        const dy = Math.sin(angle) * reach;
        const turn = (Math.random() - 0.5) * 70;
        const flight = el.animate(
            [
                { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
                {
                    transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.4}px)) scale(1.12) rotate(${turn / 2}deg)`,
                    opacity: 1,
                    offset: 0.28
                },
                {
                    transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.75) rotate(${turn}deg)`,
                    opacity: 0
                }
            ],
            { duration: 640 + Math.random() * 260, delay: i * 16, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
        );
        flight.onfinish = () => el.remove();
        flight.oncancel = () => el.remove();
    }
}

// The failure headshake (motion.css .ow-shake); restarts if it is already playing.
export function shake(el: Element | null) {
    if (!el) return;
    el.classList.remove('ow-shake');
    void (el as HTMLElement).offsetWidth;
    el.classList.add('ow-shake');
    el.addEventListener('animationend', () => el.classList.remove('ow-shake'), { once: true });
}
