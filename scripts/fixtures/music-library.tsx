// Harness for the music library (ai/features/music/impl.md): the production player — desktop dock
// or phone sheet — over a still of the study, with an in-memory backend instead of Supabase.
// Uploads go through the real pipeline (parsers, hashing, CUE, covers, compact copies).
//   ?seed=1          ingest part of the test corpus (tmp/music-fixtures: lyrics/, gapless/ with its
//                    CUE, two formats) and one song "uploaded by the partner"
//   ?mood=golden | twilight | night      ?look=porcelain      ?motion=reduced
//   ?speed=<bytes/s> pretend upload speed (default instant)
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MusicMini } from '@/themes/cinnaglass/shell/floaters';
import { TWEAK_DEFAULTS, type Tweaks } from '@/themes/cinnaglass/tweaks';
import { useMotionPreference } from '@/themes/cinnaglass/ui/motion-preference';
import { applyLook } from '@/themes/cinnaglass/ui/look';
import { useUiEnvironment } from '@/themes/cinnaglass/ui/use-ui-environment';
import { useUiViewport } from '@/themes/cinnaglass/ui/use-ui-viewport';
import { createFakeMusicBackend, type FakeMusic } from './music-fake-backend';
import '@/index.css';
import '@fontsource/zcool-xiaowei/400.css';
import '@/themes/cinnaglass/cinnaglass.css';
import '@/themes/cinnaglass/ui/ui-system.css';
import '@/themes/cinnaglass/shell/shell-layout.css';

const WORLD = 'fixture-world';
const PLATES: Record<string, string> = {
    golden: '/rooms/study/plate-golden-on.webp',
    twilight: '/rooms/study/plate-twilight-on.webp',
    night: '/rooms/study/plate-night-on-dry.webp'
};
const SEED: string[] = [
    'lyrics/雨天的窗边.flac',
    'lyrics/雨天的窗边.lrc',
    'lyrics/云朵上的下午.flac',
    'lyrics/云朵上的下午.lrc',
    'lyrics/暖灯电台.flac',
    'lyrics/暖灯电台.lrc',
    'lyrics/一起散步.flac',
    'lyrics/一起散步.lrc',
    'lyrics/列车清晨.flac',
    'gapless/album.flac',
    'gapless/album.cue',
    'gapless/cover.jpg',
    'formats/02-flac-24-96.flac',
    'formats/07-mp3-320-gbk-tags.mp3'
];

declare global {
    interface Window {
        __music?: { fake: FakeMusic; seeded: boolean; seedErrors: string[] };
    }
}

// Fetch corpus files from the dev server as Files with their folder paths.
const corpus = async (paths: string[]) =>
    Promise.all(
        paths.map(async (p) => {
            const res = await fetch(`/tmp/music-fixtures/${p}`);
            if (!res.ok)
                throw new Error(`missing tmp/music-fixtures/${p} — run python3 scripts/make-music-fixtures.py`);
            return { file: new File([await res.blob()], p.split('/').pop() as string), path: p };
        })
    );

// Run the real upload pipeline on corpus files (no copies: the fixture keeps the seed quick).
const seed = async (fake: FakeMusic, errors: string[]) => {
    const [{ planIngest }, { analyzeItem, uploadDraft }] = await Promise.all([
        import('@/lib/music/ingest-plan'),
        import('@/lib/music/ingest')
    ]);
    const ingest = async (paths: string[]) => {
        const plan = await planIngest(await corpus(paths));
        for (const item of plan.items) {
            const draft = await analyzeItem(item);
            if (draft.status === 'failed') {
                errors.push(`${item.audio.path}: ${draft.error}`);
                continue;
            }
            await uploadDraft(draft, {
                backend: fake.backend,
                worldId: WORLD,
                visibility: 'world',
                copyFormat: null,
                onPhase: () => {}
            }).catch((e: unknown) => errors.push(`${item.audio.path}: ${e instanceof Error ? e.message : String(e)}`));
        }
    };
    fake.actAs('fixture-partner');
    await ingest(['lyrics/列车清晨.flac']);
    fake.actAs('fixture-me');
    await ingest(SEED.filter((p) => !p.includes('列车清晨')));
};

const query = new URLSearchParams(location.search);

export function Harness() {
    useUiViewport();
    const mood = (query.get('mood') as Tweaks['mood']) || TWEAK_DEFAULTS.mood;
    useMotionPreference(query.get('motion') === 'reduced' ? 'reduced' : 'system');
    const ref = useUiEnvironment(mood, true);
    const [open, setOpen] = useState(query.get('open') !== '0');
    const fake = useMemo(() => createFakeMusicBackend({ bytesPerSecond: Number(query.get('speed') || 0) }), []);
    const [ready, setReady] = useState(!query.get('seed'));

    useEffect(() => {
        const state = { fake, seeded: !query.get('seed'), seedErrors: [] as string[] };
        window.__music = state;
        if (!query.get('seed')) return;
        void seed(fake, state.seedErrors).then(() => {
            state.seeded = true;
            setReady(true);
        });
    }, [fake]);

    return (
        <div
            ref={ref}
            className="app ui-environment"
            data-mood={mood}
            data-music-open={open}
            style={{ position: 'fixed', inset: 0, background: `#111 url(${PLATES[mood]}) center / cover` }}
        >
            {ready && (
                <MusicMini
                    spaceName="我们的小屋"
                    worldId={WORLD}
                    backend={fake.backend}
                    open={open}
                    setOpen={setOpen}
                />
            )}
            {!ready && <p style={{ position: 'fixed', left: 16, top: 16, color: '#fff' }}>正在准备曲库…</p>}
        </div>
    );
}

applyLook();
createRoot(document.getElementById('root')!).render(<Harness />);
