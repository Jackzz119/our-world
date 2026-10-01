// Isolated harness for the M0 device-check probes (src/lib/music/probe.ts): no account, no storage.
// scripts/check-music-probe.mjs serves the generated fixtures from a second origin and calls
// window.musicProbe from Playwright.
import {
    deviceReport,
    outputReport,
    playbackProbe,
    prepareWebAudioProbe,
    rangeProbe,
    volumeLocked
} from '@/lib/music/probe';

const run = async (url: string) => {
    const webAudio = prepareWebAudioProbe(url);
    const playback = await playbackProbe(url);
    return { playback, webAudio: await webAudio.run(), range: await rangeProbe(url) };
};

Object.assign(window, {
    musicProbe: { deviceReport, outputReport, volumeLocked, run, rangeProbe }
});
document.getElementById('status')!.textContent = 'ready';
