// page-flip 2.0.7 ships no declarations. Keep our adapter's public surface
// explicit; stop() is supplied by the checked-in idle-renderer patch.
declare module 'page-flip' {
    export class PageFlip {
        constructor(element: HTMLElement, settings: Record<string, string | number | boolean>);
        loadFromHTML(pages: HTMLElement[]): void;
        destroy(): void;
        on(name: string, callback: (event: { data: unknown }) => void): void;
        getCurrentPageIndex(): number;
        getState(): string;
        getOrientation(): string;
        getSettings(): { flippingTime: number };
        getRender(): { start(): void; stop(): void; finishAnimation(): void };
        getUI(): { getDistElement(): HTMLElement };
        flipNext(corner?: 'top' | 'bottom'): void;
        flipPrev(corner?: 'top' | 'bottom'): void;
        turnToPage(page: number): void;
        startUserTouch(point: { x: number; y: number }): void;
        userMove(point: { x: number; y: number }, touch: boolean): void;
        userStop(point: { x: number; y: number }): void;
    }
}
