import { useState, type ComponentType } from 'react';
import { Clock, FileText, Image as ImageIcon, Plus, X } from 'lucide-react';
import type { PanelKey } from '@/pages/WorldPage';

type FloatingMenuProps = {
    onOpen: (key: PanelKey) => void;
};

const ITEMS: { key: PanelKey; label: string; Icon: ComponentType<{ className?: string }> }[] = [
    { key: 'timeline', label: 'Timeline', Icon: Clock },
    { key: 'text', label: '文字回忆', Icon: FileText },
    { key: 'image', label: '照片', Icon: ImageIcon }
];

/** 悬浮按钮选单：右下角主按钮展开三个入口，触发打开对应悬浮窗口。 */
const FloatingMenu = ({ onOpen }: FloatingMenuProps) => {
    const [expanded, setExpanded] = useState(false);

    const handlePick = (key: PanelKey) => {
        onOpen(key);
        setExpanded(false);
    };

    return (
        <div className="pointer-events-auto fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {expanded &&
                ITEMS.map(({ key, label, Icon }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => handlePick(key)}
                        className="flex items-center gap-2 rounded-full border border-white/60 bg-white/80 py-2 pl-3 pr-4 text-sm font-medium text-stone-700 shadow-md backdrop-blur-md transition-colors hover:bg-white"
                    >
                        <Icon className="h-4 w-4 text-rose-400" />
                        {label}
                    </button>
                ))}

            <button
                type="button"
                aria-label={expanded ? '收起菜单' : '打开菜单'}
                onClick={() => setExpanded((v) => !v)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-rose-400 to-rose-600 text-white shadow-lg transition-transform hover:scale-105"
            >
                {expanded ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </button>
        </div>
    );
};

export default FloatingMenu;