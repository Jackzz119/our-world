// contacts.ts — mock DM contact list shared by the Chat float (conversation
// list) and the Sidebar (persistent DM section). Split from chat.tsx so that
// non-component exports don't break react-refresh there. Becomes real data
// when DMs land on the backend (see ai/Features/sidebar.md).
export type GroupMember = { n: string; c: string };
export type Contact = {
    id: string;
    name: string;
    ini: string;
    color: string;
    lover?: boolean;
    online?: boolean;
    status: string;
    group?: boolean;
    members?: Record<string, GroupMember>;
    replies: (string | { s: string; t: string })[];
};

export const CONTACTS: Contact[] = [
    {
        id: 'xm',
        name: '小满',
        ini: '满',
        color: 'linear-gradient(135deg,#F8C8D6,#EF9DB4)',
        lover: true,
        online: true,
        status: '在线 · 在想你',
        replies: ['在呢，刚刚还在想你', '今天也好想见你呀', '晚上一起看日落好不好', '我也是，远远地抱抱你', '嗯，都听你的', '在回家的路上啦，等我']
    },
    {
        id: 'mom',
        name: '妈妈',
        ini: '妈',
        color: 'linear-gradient(135deg,#FBE6A8,#F1C75A)',
        online: false,
        status: '30 分钟前在线',
        replies: ['吃饭了没？别老熬夜', '周末回来吃饭吗，给你们留门', '天凉了，记得加衣服', '钱够不够花，跟妈说']
    },
    {
        id: 'yue',
        name: '阿乐',
        ini: '乐',
        color: 'linear-gradient(135deg,#BFE6FA,#6FBCE8)',
        online: true,
        status: '在线',
        replies: ['哈哈哈太对了', '周末打球不？', '下次带嫂子一起呀', '我也刚到家', '可以可以，安排']
    },
    {
        id: 'grp',
        name: '周末野餐 🧺',
        ini: '餐',
        color: 'linear-gradient(135deg,#C9E8C2,#86C99A)',
        group: true,
        online: true,
        status: '5 人 · 3 人在线',
        members: { lin: { n: '林林', c: '#7CC6EC' }, ada: { n: '阿达', c: '#EF9DB4' }, yue: { n: '阿乐', c: '#86C99A' } },
        replies: [
            { s: 'lin', t: '那这周六老地方见！' },
            { s: 'ada', t: '我带三明治和气泡水～' },
            { s: 'yue', t: '我负责飞盘和音箱🎶' },
            { s: 'lin', t: '记得带防晒呀，太阳挺大' }
        ]
    }
];