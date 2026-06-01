import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// 纯文字回忆录窗口 —— 写/看文字回忆（当前 mock，本地 state，后端后接）

const TextPanel = () => {
    const [draft, setDraft] = useState('');
    const [notes, setNotes] = useState<string[]>([
        '今天她笑起来的样子，我想一直记得。'
    ]);

    const handleAdd = () => {
        const value = draft.trim();
        if (!value) return;
        setNotes((prev) => [value, ...prev]);
        setDraft('');
    };

    return (
        <div className="space-y-3">
            <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="写下此刻想记住的..."
                className="min-h-20 resize-none border-0 bg-stone-50 text-sm text-stone-700 placeholder:text-stone-300 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex justify-end">
                <Button
                    size="sm"
                    className="h-8 bg-stone-700 px-4 text-white shadow-sm hover:bg-stone-800"
                    onClick={handleAdd}
                    disabled={!draft.trim()}
                >
                    记下
                </Button>
            </div>

            <div className="space-y-2">
                {notes.map((note, i) => (
                    <div key={i} className="rounded-xl bg-stone-50 px-3 py-2 text-sm leading-relaxed text-stone-700">
                        {note}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TextPanel;