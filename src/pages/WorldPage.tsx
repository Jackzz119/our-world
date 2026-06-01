import { useState, type ComponentType, type ReactNode } from 'react';
import { Clock, FileText, Image as ImageIcon } from 'lucide-react';
import WorldCanvas from '@/components/world/WorldCanvas';
import FloatingMenu from '@/components/world/FloatingMenu';
import FloatingPanel from '@/components/world/FloatingPanel';
import TimelinePanel from '@/components/world/panels/TimelinePanel';
import TextPanel from '@/components/world/panels/TextPanel';
import ImagePanel from '@/components/world/panels/ImagePanel';

export type PanelKey = 'timeline' | 'text' | 'image';

const PANELS: Record<PanelKey, { title: string; Icon: ComponentType<{ className?: string }>; Content: ComponentType }> = {
    timeline: { title: 'Timeline', Icon: Clock, Content: TimelinePanel },
    text: { title: '文字回忆', Icon: FileText, Content: TextPanel },
    image: { title: '照片', Icon: ImageIcon, Content: ImagePanel }
};

/**
 * 世界空间主页：占位 Canvas 铺底 + 悬浮 UI 覆盖层。
 * openPanels 数组顺序即堆叠层级（最后的在最上层），支持多开 / 置顶。
 */
const WorldPage = () => {
    const [openPanels, setOpenPanels] = useState<PanelKey[]>([]);

    // 打开 / 置顶：把 key 移到数组末尾（最上层）
    const openOrFocus = (key: PanelKey) => setOpenPanels((prev) => [...prev.filter((k) => k !== key), key]);
    const closePanel = (key: PanelKey) => setOpenPanels((prev) => prev.filter((k) => k !== key));

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            <WorldCanvas />

            {openPanels.map((key, i) => {
                const { title, Icon, Content } = PANELS[key];
                const icon: ReactNode = <Icon className="h-4 w-4 text-rose-400" />;
                return (
                    <FloatingPanel
                        key={key}
                        title={title}
                        icon={icon}
                        zIndex={30 + i}
                        initial={{ x: 120 + i * 32, y: 96 + i * 32 }}
                        onClose={() => closePanel(key)}
                        onFocus={() => openOrFocus(key)}
                    >
                        <Content />
                    </FloatingPanel>
                );
            })}

            <FloatingMenu onOpen={openOrFocus} />
        </div>
    );
};

export default WorldPage;