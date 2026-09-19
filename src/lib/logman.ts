// logman.ts — tiny console wrapper for the project log convention:
// `[domain][runtime][module]` tag, then the message on its own line so the
// Console's collapsed view stays readable. Domain tags are listed in
// ai/PROJECT.md §已有功能资产's tag pool; runtime here is always `web`.
// log() is dev-only; warn()/error() always print.
// Convention: only modules with UI context log. lib/* data access throws instead, so a failure is
// reported once, where there is something to tell the user.
export const Logman = {
    log: (tag: string, msg: string, ...rest: unknown[]): void => {
        if (!import.meta.env.PROD) console.log(`${tag}\n${msg}`, ...rest);
    },
    warn: (tag: string, msg: string, ...rest: unknown[]): void => {
        console.warn(`${tag}\n${msg}`, ...rest);
    },
    error: (tag: string, msg: string, ...rest: unknown[]): void => {
        console.error(`${tag}\n${msg}`, ...rest);
    }
};
