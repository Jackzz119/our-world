import type { Mood } from '@/themes/cinnaglass/tweaks';
import '@/themes/cinnaglass/shell/sunlit-letter.css';

const CAPTIONS: Record<Mood, string> = {
    golden: '有一句悄悄话，等你打开',
    twilight: '暮色里的一点暖意',
    night: '像留在夜里的一束阳光'
};

// A real unread conversation is the only production trigger; opening uses the existing chat/read flow.
export function SunlitLetter({ mood, visible, onOpen }: { mood: Mood; visible: boolean; onOpen: () => void }) {
    return (
        <aside className="letter-notice" hidden={!visible} aria-label="新来信">
            <button type="button" className="sunlit-letter" onClick={onOpen} aria-label="打开新来信">
                <span className="letter-fold" aria-hidden="true" />
                <span>
                    <b>有一封新来信</b>
                    <small>{CAPTIONS[mood]}</small>
                </span>
            </button>
        </aside>
    );
}
