// chat-composer.tsx — the chat hub's input row: the 😊 palette button, the text field and the send
// button. It owns the draft text and the caret, nothing else; the hub keeps the palette's open flag
// because clicking the message area has to close it. Named ChatComposer rather than Composer because
// screens.tsx already exports a Composer (the journal editor).
// Split out of channel-screen.tsx. Specs: ai/features/chat.md §三.
import { useRef, useState } from 'react';
import { ISend } from './icons';
import { EmotePicker } from './emote-picker';
import type { EmoteView } from './chat-data';
import type { EmoteSearchResult } from '@/types/chat.ts';

// The hub mounts this with key={convId}, so switching conversations drops the unsent draft.
type ChatComposerProps = {
    placeholder: string;
    onSubmit: (text: string) => void;
    paletteOpen: boolean; // the 😊 palette — hub-owned, since a click on the message list closes it
    onPaletteToggle: () => void;
    onPaletteClose: () => void;
    emotes: EmoteView[];
    canImport: boolean; // the library is world-scoped — no world, no importing
    onSendSticker: (emote: EmoteView) => void;
    onSearchWeb: (q: string) => Promise<EmoteSearchResult[]>;
    onImportUrl: (url: string, name: string) => Promise<void>;
    onImportFile: (file: File, name: string) => Promise<void>;
    onRemoveEmote: (id: string) => void;
};

// The input row. Sending hands the raw text up and clears the draft — the hook keeps a failed
// message's content in its own bubble, so nothing is lost when the write does not land.
export function ChatComposer({
    placeholder,
    onSubmit,
    paletteOpen,
    onPaletteToggle,
    onPaletteClose,
    emotes,
    canImport,
    onSendSticker,
    onSearchWeb,
    onImportUrl,
    onImportFile,
    onRemoveEmote
}: ChatComposerProps) {
    const [text, setText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Send the composer's text and close the emoji palette; the draft clears even if the write
    // fails, because the failed bubble keeps the content.
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(text);
        setText('');
        onPaletteClose();
    };

    // insert an emoji at the composer caret, keep typing position; the
    // picker stays open for multi-pick (click outside / send to dismiss)
    const insertEmoji = (em: string) => {
        const el = inputRef.current;
        const pos = el?.selectionStart ?? text.length;
        setText(text.slice(0, pos) + em + text.slice(pos));
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(pos + em.length, pos + em.length);
        });
    };

    return (
        <form className="chsc-input" onSubmit={submit}>
            <button type="button" className="chsc-emo" title="表情" onClick={onPaletteToggle}>
                😊
            </button>
            {paletteOpen && (
                <div className="chsc-pop for-input" onClick={(e) => e.stopPropagation()}>
                    <EmotePicker
                        mode="composer"
                        emotes={emotes}
                        canImport={canImport}
                        onPickEmoji={insertEmoji}
                        onPickSticker={(emote) => {
                            onSendSticker(emote);
                            onPaletteClose();
                        }}
                        onSearchWeb={onSearchWeb}
                        onImportUrl={onImportUrl}
                        onImportFile={onImportFile}
                        onRemoveEmote={onRemoveEmote}
                    />
                </div>
            )}
            <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                maxLength={500}
                spellCheck={false}
                autoFocus
            />
            <button type="submit" aria-label="发送">
                <ISend size={17} />
            </button>
        </form>
    );
}
