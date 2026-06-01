import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';

type FloatingPanelProps = {
    title: string;
    icon?: ReactNode;
    zIndex: number;
    onClose: () => void;
    onFocus: () => void;
    initial?: { x: number; y: number };
    width?: number;
    children: ReactNode;
};

/**
 * 通用悬浮面板外壳：毛玻璃背景、标题栏作拖拽手柄、可关闭、点击置顶。
 * 数据内容由各 panel 子组件填充。
 */
const FloatingPanel = ({
    title,
    icon,
    zIndex,
    onClose,
    onFocus,
    initial = { x: 120, y: 100 },
    width = 360,
    children
}: FloatingPanelProps) => {
    const [pos, setPos] = useState(initial);
    const dragOffset = useRef<{ dx: number; dy: number } | null>(null);

    const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
        onFocus();
        dragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!dragOffset.current) return;
        setPos({ x: e.clientX - dragOffset.current.dx, y: e.clientY - dragOffset.current.dy });
    };

    const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
        dragOffset.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    return (
        <div
            className="pointer-events-auto fixed overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-xl backdrop-blur-md"
            style={{ left: pos.x, top: pos.y, width, zIndex }}
            onPointerDown={onFocus}
        >
            {/* 标题栏 —— 拖拽手柄 */}
            <div
                className="flex h-11 cursor-grab select-none items-center gap-2 border-b border-stone-100 bg-white/60 px-4 active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {icon}
                <span className="flex-1 truncate text-sm font-semibold text-stone-700">{title}</span>
                <button
                    type="button"
                    aria-label="关闭"
                    className="text-stone-400 transition-colors hover:text-stone-600"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* 内容区 */}
            <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
        </div>
    );
};

export default FloatingPanel;