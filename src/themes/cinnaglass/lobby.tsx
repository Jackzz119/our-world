// The lobby previews the adopted room art before explicit world entry.
import '@/themes/cinnaglass/ui/ui-system.css';
import '@/themes/cinnaglass/entry.css';

export type LobbyStatus = 'loading' | 'ready' | 'error';

type LobbySceneProps = {
    status: LobbyStatus;
    hasWorld: boolean;
    error: string | null;
    busy: boolean;
    onEnter: () => void;
    onCreate: () => void;
};

// Loading, retry, enter and create remain separate outcomes of real world data.
export function LobbyScene({ status, hasWorld, error, busy, onEnter, onCreate }: LobbySceneProps) {
    return (
        <main className="ui-entry" aria-busy={status === 'loading' || busy}>
            <section className="ui-entry-card ui-surface" aria-label="世界大厅">
                <h1>Our World</h1>
                <div className="ui-entry-content ui-liner">
                    {status === 'loading' ? (
                        <p role="status">正在寻找你们的小世界…</p>
                    ) : status === 'error' ? (
                        <>
                            <h2>暂时没能进入大厅</h2>
                            <p className="ui-entry-error" role="alert">
                                {error || '连接出了点问题，请重试。'}
                            </p>
                            <button
                                type="button"
                                className="ui-button ui-button-primary"
                                onClick={onEnter}
                                disabled={busy}
                            >
                                重试
                            </button>
                        </>
                    ) : hasWorld ? (
                        <>
                            <h2>你们的小世界已就绪</h2>
                            <p>房间就在这里，回到熟悉的陪伴中。</p>
                            {error && (
                                <p className="ui-entry-error" role="alert">
                                    {error}
                                </p>
                            )}
                            <button
                                type="button"
                                className="ui-button ui-button-primary"
                                onClick={onEnter}
                                disabled={busy}
                            >
                                进入世界
                            </button>
                        </>
                    ) : (
                        <>
                            <h2>还没有你们的小世界</h2>
                            <p>创建一个世界，开始收藏你们的回忆。</p>
                            {error && (
                                <p className="ui-entry-error" role="alert">
                                    {error}
                                </p>
                            )}
                            <button
                                type="button"
                                className="ui-button ui-button-primary"
                                onClick={onCreate}
                                disabled={busy}
                            >
                                {busy ? '创建中…' : '创建世界'}
                            </button>
                            <button
                                type="button"
                                className="ui-button ui-entry-secondary"
                                onClick={onEnter}
                                disabled={busy}
                            >
                                已有世界？重新检查
                            </button>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}
