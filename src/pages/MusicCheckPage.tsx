// MusicCheckPage.tsx — the music module's M0 device check (dev builds only, /dev/music-check).
// Upload a few files from a computer into your own scratch folder in the 'music' bucket, open the
// same page on a phone, tap through the tests, and copy the result text back into the
// conversation. Procedure and how to read the results: ai/features/music/m0.md.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { getMyWorld } from '@/lib/worlds';
import { listScratch, removeScratch, signAudioUrls, uploadScratch, type ScratchFile } from '@/lib/music/storage';
import {
    BackgroundProbe,
    deviceReport,
    outputReport,
    playbackProbe,
    prepareWebAudioProbe,
    rangeProbe,
    volumeLocked,
    type BackgroundReport,
    type DeviceReport,
    type OutputReport,
    type PlaybackReport,
    type RangeReport,
    type WebAudioReport
} from '@/lib/music/probe';
import styles from '@/pages/MusicCheckPage.module.css';

type FileResult = { running: boolean; playback?: PlaybackReport; webAudio?: WebAudioReport; range?: RangeReport };

const ACCEPT = 'audio/*,.flac,.m4a,.alac,.mp3,.wav,.aif,.aiff,.ogg,.opus,.webm,.wv,.ape,.dsf,.dff,.cue,.lrc';

const mb = (bytes: number): string => `${(bytes / 1e6).toFixed(1)} MB`;
const ms = (value: number | null | undefined): string => (value == null ? '—' : `${value} ms`);
const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// List the scratch files and sign them up front: iOS only plays inside a tap, so the URL must
// already exist when the tap happens (signing inside it would lose the gesture).
const loadScratch = async (worldId: string) => {
    const list = await listScratch(worldId);
    return { list, urls: await signAudioUrls(list.map((file) => file.path)) };
};

// The 4-minute fixture is the natural lock-screen candidate; otherwise the first file.
const defaultBackgroundPath = (list: ScratchFile[]): string =>
    (list.find((file) => /4min|long/i.test(file.name)) ?? list[0])?.path ?? '';

// Plain-text report to paste back into the conversation.
const summarize = (
    device: DeviceReport,
    volume: boolean | null,
    output: OutputReport | null,
    files: ScratchFile[],
    results: Record<string, FileResult>,
    background: BackgroundReport | null
): string => {
    const yes = (value: boolean | null) => (value === null ? '—' : value ? '是' : '否');
    const lines = [
        `【音乐 M0 真机验证】${new Date().toLocaleString('zh-CN')}`,
        `设备：${device.os} · HTTPS ${device.secureContext ? '是' : '否'}`,
        `UA：${device.userAgent}`,
        `canPlayType：${Object.entries(device.canPlay)
            .map(([label, answer]) => `${label}=${answer || '否'}`)
            .join('，')}`,
        `MSE：${Object.entries(device.mediaSource)
            .map(([label, value]) => `${label}=${yes(value)}`)
            .join('，')}`,
        `接口：${Object.entries(device.apis)
            .map(([label, value]) => `${label}=${value ? '有' : '无'}`)
            .join('，')}`,
        `脚本改音量：${volume === null ? '未测' : volume ? '被锁定' : '可以'}`,
        `系统输出采样率：${output ? `${output.sampleRate} Hz` : '未测'}`
    ];
    for (const file of files) {
        const result = results[file.path];
        if (!result || result.running) continue;
        const parts: string[] = [];
        const { playback, webAudio, range } = result;
        if (playback)
            parts.push(
                playback.ok
                    ? `出声 ✓（元数据 ${ms(playback.metadataMs)}，出声 ${ms(playback.playingMs)}，拖动 ${ms(playback.seekMs)}）`
                    : `播放 ✗（${playback.error}）`
            );
        if (webAudio)
            parts.push(
                webAudio.ok
                    ? `Web Audio ✓（RMS ${webAudio.peakRms}，${webAudio.contextRate} Hz）`
                    : `Web Audio ✗${webAudio.error ? `（${webAudio.error}）` : '（静音）'}`
            );
        if (range)
            parts.push(
                range.status
                    ? `Range ${range.status}${range.partial ? ' ✓' : ' ✗'}${range.contentRange ? `（${range.contentRange}）` : ''}`
                    : `Range ✗（${range.error}）`
            );
        lines.push(`文件 ${file.name}（${mb(file.size)}，${file.mime}）：${parts.join('；')}`);
    }
    if (background)
        lines.push(
            `锁屏：隐藏 ${background.hiddenSeconds} 秒，播放前进 ${background.advancedSeconds} 秒 → ${
                background.continued ? '继续播放 ✓' : '停了 ✗'
            }${background.pausedWhileHidden ? '（隐藏时收到暂停）' : ''}`
        );
    return lines.join('\n');
};

// One file's outcome, worded the way the result text words it.
const ResultLines = ({ result, onWebAudio }: { result?: FileResult; onWebAudio: () => void }) => {
    if (!result) return null;
    if (result.running)
        return (
            <p className={styles.result} role="status">
                测试中：先出声几秒并拖到中间，再静音测 Web Audio…
            </p>
        );
    const { playback, webAudio, range } = result;
    return (
        <div className={styles.result} role="status">
            {playback && (
                <p className={playback.ok ? styles.pass : styles.fail}>
                    {playback.ok
                        ? `能播放 · 元数据 ${ms(playback.metadataMs)} · 出声 ${ms(playback.playingMs)} · 拖动后恢复 ${ms(playback.seekMs)}`
                        : `播放失败：${playback.error}`}
                </p>
            )}
            {webAudio && (
                <p className={webAudio.ok ? styles.pass : styles.fail}>
                    {webAudio.ok
                        ? `Web Audio 有信号（RMS ${webAudio.peakRms}，上下文 ${webAudio.contextRate} Hz）`
                        : `Web Audio 没有信号${webAudio.error ? `：${webAudio.error}` : '（静音：缺 CORS 头，或此格式进不了 Web Audio）'}`}
                    {!webAudio.ok && (
                        <button type="button" className={styles.inline} onClick={onWebAudio}>
                            单独再测
                        </button>
                    )}
                </p>
            )}
            {range && (
                <p className={range.partial ? styles.pass : styles.fail}>
                    {range.status
                        ? `两字节 Range 请求：${range.status}${range.contentRange ? ` · ${range.contentRange}` : ''}${
                              range.acceptRanges ? ` · Accept-Ranges ${range.acceptRanges}` : ''
                          }`
                        : `Range 请求失败：${range.error}`}
                </p>
            )}
        </div>
    );
};

const MusicCheckPage = () => {
    const device = useMemo(deviceReport, []);
    const [worldId, setWorldId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [volume, setVolume] = useState<boolean | null>(null);
    const [output, setOutput] = useState<OutputReport | null>(null);
    const [files, setFiles] = useState<ScratchFile[]>([]);
    const [urls, setUrls] = useState<Record<string, string>>({});
    const [results, setResults] = useState<Record<string, FileResult>>({});
    const [busy, setBusy] = useState<string | null>(null);
    const [backgroundPath, setBackgroundPath] = useState('');
    const [background, setBackground] = useState<BackgroundReport | null>(null);
    const [backgroundLog, setBackgroundLog] = useState<string[]>([]);
    const [copied, setCopied] = useState('');
    const backgroundProbe = useRef<BackgroundProbe | null>(null);
    const summaryField = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        void volumeLocked().then(setVolume);
    }, []);

    // Find the world, then list and pre-sign the scratch files; stop any lock-screen test on leave.
    useEffect(() => {
        let cancelled = false;
        getMyWorld()
            .then(async ({ world }) => {
                if (cancelled) return;
                if (!world) {
                    setError('这个账号还没有世界：先回主页进入或创建世界。');
                    return;
                }
                setWorldId(world.id);
                const { list, urls: signed } = await loadScratch(world.id);
                if (cancelled) return;
                setFiles(list);
                setUrls(signed);
                setBackgroundPath(defaultBackgroundPath(list));
            })
            .catch((err) => {
                if (!cancelled) setError(`读不到音乐存储：${message(err)}（迁移跑过了吗？见 m0.md）`);
            });
        return () => {
            cancelled = true;
            backgroundProbe.current?.stop();
        };
    }, []);

    // Re-list after an upload or delete, keeping the lock-screen choice when the file still exists.
    const reload = async (id: string) => {
        const { list, urls: signed } = await loadScratch(id);
        setFiles(list);
        setUrls(signed);
        setBackgroundPath((current) =>
            list.some((file) => file.path === current) ? current : defaultBackgroundPath(list)
        );
    };

    const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
        const picked = [...(event.target.files ?? [])];
        event.target.value = '';
        if (!worldId || !picked.length) return;
        setError(null);
        try {
            for (const [index, file] of picked.entries()) {
                setBusy(`上传 ${index + 1}/${picked.length}：${file.name}（${mb(file.size)}）`);
                await uploadScratch(worldId, file);
            }
            await reload(worldId);
        } catch (err) {
            setError(`上传失败：${message(err)}（Free 计划单文件上限 50 MB）`);
        } finally {
            setBusy(null);
        }
    };

    const onDelete = async (paths: string[]) => {
        if (!worldId) return;
        setBusy('删除中…');
        try {
            await removeScratch(paths);
            setResults((current) =>
                Object.fromEntries(Object.entries(current).filter(([path]) => !paths.includes(path)))
            );
            await reload(worldId);
        } catch (err) {
            setError(`删除失败：${message(err)}`);
        } finally {
            setBusy(null);
        }
    };

    // Everything that makes sound starts synchronously inside this tap; the rest follows in order.
    const runTest = (file: ScratchFile) => {
        const url = urls[file.path];
        if (!url) return;
        const webAudio = prepareWebAudioProbe(url);
        const playback = playbackProbe(url);
        setResults((current) => ({ ...current, [file.path]: { running: true } }));
        void (async () => {
            const playbackResult = await playback;
            const webAudioResult = await webAudio.run();
            const rangeResult = await rangeProbe(url);
            setResults((current) => ({
                ...current,
                [file.path]: { running: false, playback: playbackResult, webAudio: webAudioResult, range: rangeResult }
            }));
        })();
    };

    // Web Audio alone, for when the browser refused the unlocked second element in runTest.
    const runWebAudio = (file: ScratchFile) => {
        const url = urls[file.path];
        if (!url) return;
        void prepareWebAudioProbe(url)
            .run()
            .then((webAudioResult) =>
                setResults((current) => ({
                    ...current,
                    [file.path]: { ...current[file.path], running: false, webAudio: webAudioResult }
                }))
            );
    };

    const startBackground = () => {
        const file = files.find((item) => item.path === backgroundPath);
        const url = file && urls[file.path];
        if (!file || !url) return;
        backgroundProbe.current?.stop();
        setBackground(null);
        setBackgroundLog([]);
        const probe = new BackgroundProbe((report, line) => {
            setBackground(report);
            setBackgroundLog((log) => [...log, line]);
        });
        backgroundProbe.current = probe;
        probe.start(url, file.name).then(
            () => setBackgroundLog((log) => [...log, '在放了：现在锁屏，等 20 秒左右再解锁回到这一页']),
            (err) => setBackgroundLog((log) => [...log, `没能开始播放：${message(err)}`])
        );
    };

    const stopBackground = () => {
        backgroundProbe.current?.stop();
        backgroundProbe.current = null;
        setBackgroundLog((log) => [...log, '已停止']);
    };

    const summary = summarize(device, volume, output, files, results, background);

    const onCopy = () => {
        const selectInstead = () => {
            summaryField.current?.select();
            setCopied('已选中全文，长按或 Ctrl+C 复制。');
        };
        if (!navigator.clipboard?.writeText) return selectInstead();
        navigator.clipboard.writeText(summary).then(() => setCopied('已复制，粘贴回对话即可。'), selectInstead);
    };

    return (
        <main className={styles.page}>
            <div className={styles.column}>
                <header className={styles.head}>
                    <h1>音乐 M0 · 真机验证</h1>
                    <p>
                        先在电脑上传几首测试文件，再用手机打开这一页，逐个点「测试」，最后点「复制结果」贴回对话。文件放在你自己的临时目录，只有你能看到，随时可删。
                    </p>
                    {error && (
                        <p className={styles.error} role="alert">
                            {error}
                        </p>
                    )}
                </header>

                <section className={styles.card} aria-labelledby="mc-device">
                    <h2 id="mc-device">1 · 这台设备</h2>
                    <dl className={styles.facts}>
                        <dt>系统</dt>
                        <dd>
                            {device.os}
                            {device.secureContext ? '' : '（不是 HTTPS：锁屏控制条和一键复制不可用，其余照常）'}
                        </dd>
                        <dt>脚本改音量</dt>
                        <dd>{volume === null ? '检测中…' : volume ? '被锁定（iPhone 的正常现象）' : '可以'}</dd>
                        <dt>系统输出采样率</dt>
                        <dd>
                            {output ? (
                                `${output.sampleRate} Hz`
                            ) : (
                                <button
                                    type="button"
                                    className={styles.inline}
                                    onClick={() => void outputReport().then(setOutput)}
                                >
                                    点一下检测
                                </button>
                            )}
                        </dd>
                    </dl>
                    <h3>能直接放的格式</h3>
                    <ul className={styles.chips}>
                        {Object.entries(device.canPlay).map(([label, answer]) => (
                            <li key={label} className={answer ? styles.on : styles.off}>
                                {label}
                                <small>{answer || '否'}</small>
                            </li>
                        ))}
                    </ul>
                    <h3>流式播放（MSE）与接口</h3>
                    <ul className={styles.chips}>
                        {Object.entries(device.mediaSource).map(([label, value]) => (
                            <li key={label} className={value ? styles.on : styles.off}>
                                {label}
                                <small>{value === null ? '—' : value ? '是' : '否'}</small>
                            </li>
                        ))}
                        {Object.entries(device.apis).map(([label, value]) => (
                            <li key={label} className={value ? styles.on : styles.off}>
                                {label}
                                <small>{value ? '有' : '无'}</small>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className={styles.card} aria-labelledby="mc-files">
                    <h2 id="mc-files">2 · 测试文件</h2>
                    <p className={styles.hint}>
                        建议从 <code>tmp/music-fixtures/formats</code> 选 01、03、04、07、11、15、16
                        号，再加一首你自己的 FLAC。每个「测试」会出声几秒。
                    </p>
                    <label className={styles.picker}>
                        选择文件上传…
                        <input type="file" multiple accept={ACCEPT} onChange={onPick} disabled={!worldId || !!busy} />
                    </label>
                    {busy && (
                        <p className={styles.hint} role="status">
                            {busy}
                        </p>
                    )}
                    <ul className={styles.files}>
                        {files.map((file) => (
                            <li key={file.path}>
                                <div className={styles.fileHead}>
                                    <b>{file.name}</b>
                                    <span>
                                        {mb(file.size)} · {file.mime}
                                    </span>
                                </div>
                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        onClick={() => runTest(file)}
                                        disabled={!urls[file.path] || results[file.path]?.running}
                                    >
                                        测试
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.quiet}
                                        onClick={() => void onDelete([file.path])}
                                    >
                                        删除
                                    </button>
                                </div>
                                <ResultLines result={results[file.path]} onWebAudio={() => runWebAudio(file)} />
                            </li>
                        ))}
                    </ul>
                    {!files.length && worldId && <p className={styles.hint}>还没有测试文件。</p>}
                    {files.length > 1 && (
                        <button
                            type="button"
                            className={styles.quiet}
                            onClick={() => void onDelete(files.map((file) => file.path))}
                        >
                            清空全部测试文件
                        </button>
                    )}
                </section>

                <section className={styles.card} aria-labelledby="mc-background">
                    <h2 id="mc-background">3 · 锁屏后台播放</h2>
                    <p className={styles.hint}>
                        选一首（推荐 4 分钟那首），点开始，听到声音后锁屏，20 秒左右再解锁回到这一页。
                    </p>
                    <div className={styles.actions}>
                        <select
                            aria-label="锁屏测试用的文件"
                            value={backgroundPath}
                            onChange={(event) => setBackgroundPath(event.target.value)}
                        >
                            {files.map((file) => (
                                <option key={file.path} value={file.path}>
                                    {file.name}
                                </option>
                            ))}
                        </select>
                        <button type="button" onClick={startBackground} disabled={!backgroundPath}>
                            开始
                        </button>
                        <button type="button" className={styles.quiet} onClick={stopBackground}>
                            停止
                        </button>
                    </div>
                    {background && (
                        <p className={background.continued ? styles.pass : styles.fail} role="status">
                            {background.continued ? '锁屏后继续播放' : '锁屏后停了'}：隐藏 {background.hiddenSeconds}{' '}
                            秒，播放前进 {background.advancedSeconds} 秒
                            {background.pausedWhileHidden ? '，隐藏时收到暂停' : ''}
                        </p>
                    )}
                    <ul className={styles.log}>
                        {backgroundLog.map((line, index) => (
                            <li key={index}>{line}</li>
                        ))}
                    </ul>
                </section>

                <section className={styles.card} aria-labelledby="mc-summary">
                    <h2 id="mc-summary">4 · 结果</h2>
                    <textarea
                        ref={summaryField}
                        className={styles.summary}
                        readOnly
                        value={summary}
                        rows={12}
                        aria-label="结果文本"
                    />
                    <div className={styles.actions}>
                        <button type="button" onClick={onCopy}>
                            复制结果
                        </button>
                        <span className={styles.hint} role="status">
                            {copied}
                        </span>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default MusicCheckPage;
