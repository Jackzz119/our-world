// Timeline 窗口 —— 时间轴方式展示两人的回忆记录（当前 mock 数据）

type TimelineEntry = {
    id: number;
    date: string;
    text: string;
};

const MOCK_ENTRIES: TimelineEntry[] = [
    { id: 1, date: '2026-05-20', text: '一起在阳台看了日落，天空粉粉的。' },
    { id: 2, date: '2026-05-12', text: '第一次一起做饭，厨房差点烧了。' },
    { id: 3, date: '2026-04-30', text: '雨天窝在家里看老电影。' }
];

const TimelinePanel = () => {
    return (
        <ol className="relative space-y-5 pl-4">
            {/* 竖线 */}
            <span className="absolute left-[5px] top-1 bottom-1 w-px bg-stone-200" aria-hidden />
            {MOCK_ENTRIES.map((entry) => (
                <li key={entry.id} className="relative">
                    <span className="absolute -left-4 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-400 shadow-sm" />
                    <p className="text-xs font-medium text-stone-400">{entry.date}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-stone-700">{entry.text}</p>
                </li>
            ))}
        </ol>
    );
};

export default TimelinePanel;