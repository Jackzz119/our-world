import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Lock, EyeOff, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { CoupleFeedResponse, CoupleMeta, FeedPost, FeedProfile } from '@/types/feed';

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function getDaysTogether(createdAt: string): number {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

function formatRelativeTime(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} 天前`;
    return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return '今天';
    if (d.toDateString() === yesterday.toDateString()) return '昨天';
    return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function groupPostsByDate(posts: FeedPost[]): { dateKey: string; label: string; posts: FeedPost[] }[] {
    const map = new Map<string, FeedPost[]>();
    for (const post of posts) {
        const key = post.created_at.slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(post);
    }
    return Array.from(map.entries()).map(([dateKey, posts]) => ({
        dateKey,
        label: formatDateLabel(dateKey),
        posts
    }));
}

function getAvatarFallback(profile: FeedProfile): string {
    return profile.display_name.slice(0, 1).toUpperCase();
}

// ─── 子组件：情侣头部 ──────────────────────────────────────────────────────────

type CoupleHeaderProps = {
    couple: CoupleMeta;
};

const CoupleHeader = ({ couple }: CoupleHeaderProps) => {
    const days = getDaysTogether(couple.created_at);

    return (
        <Card className="border border-rose-100/60 shadow-sm overflow-hidden">
            {/* 顶部渐变装饰条 */}
            <div className="h-1 bg-linear-to-r from-rose-300 via-rose-400 to-rose-300" />
            <CardContent className="p-6">
                {/* 头像区 */}
                <div className="flex items-center justify-center gap-4 mb-5">
                    <div className="flex flex-col items-center gap-1.5">
                        <Avatar className="w-14 h-14 ring-2 ring-stone-200">
                            <AvatarImage src={couple.user1.avatar_url} alt={couple.user1.display_name} />
                            <AvatarFallback className="bg-stone-100 text-stone-600 text-lg font-semibold">
                                {getAvatarFallback(couple.user1)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-stone-500 font-medium">{couple.user1.display_name}</span>
                    </div>

                    <div className="flex flex-col items-center pb-5">
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-sm">
                            <Heart className="w-4 h-4 text-white fill-white" />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                        <Avatar className="w-14 h-14 ring-2 ring-rose-100">
                            <AvatarImage src={couple.user2.avatar_url} alt={couple.user2.display_name} />
                            <AvatarFallback className="bg-rose-50 text-rose-400 text-lg font-semibold">
                                {getAvatarFallback(couple.user2)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-stone-500 font-medium">{couple.user2.display_name}</span>
                    </div>
                </div>

                <Separator className="bg-stone-100 mb-4" />

                {/* 统计区 */}
                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="py-2.5 rounded-xl bg-stone-50">
                        <p className="text-xl font-semibold text-stone-700">{days}</p>
                        <p className="text-xs text-stone-400 mt-0.5">在一起的天数</p>
                    </div>
                    <div className="py-2.5 rounded-xl bg-rose-50">
                        <p className="text-xl font-semibold text-rose-400">{couple.intimacy_points}</p>
                        <p className="text-xs text-stone-400 mt-0.5">亲密值</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// ─── 子组件：普通 Post 卡片 ────────────────────────────────────────────────────

type PostCardProps = {
    post: FeedPost;
    isOwn: boolean;
};

const PostCard = ({ post, isOwn }: PostCardProps) => {
    const badge =
        post.privacy === 'private'
            ? { label: '仅自己可见', icon: <EyeOff className="w-3 h-3" /> }
            : post.privacy === 'locked'
              ? { label: '已解锁', icon: <Unlock className="w-3 h-3" /> }
              : null;

    return (
        <Card className="border border-stone-100 shadow-sm bg-[#fefcfb]">
            <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7">
                            <AvatarImage src={post.author.avatar_url} alt={post.author.display_name} />
                            <AvatarFallback
                                className={`text-xs font-medium ${isOwn ? 'bg-stone-100 text-stone-500' : 'bg-rose-50 text-rose-400'}`}
                            >
                                {getAvatarFallback(post.author)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <span className="text-sm font-medium text-stone-700">{post.author.display_name}</span>
                            <p className="text-xs text-stone-400">{formatRelativeTime(post.created_at)}</p>
                        </div>
                    </div>
                    {badge && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 border-stone-200 text-stone-400 gap-1">
                            {badge.icon}
                            {badge.label}
                        </Badge>
                    )}
                </div>

                {post.visible_content && (
                    <p className="text-sm text-stone-700 leading-relaxed">{post.visible_content}</p>
                )}
            </CardContent>
        </Card>
    );
};

// ─── 子组件：锁定占位卡片 ──────────────────────────────────────────────────────

type LockedPostCardProps = {
    post: FeedPost;
};

const LockedPostCard = ({ post }: LockedPostCardProps) => (
    <Card className="border border-rose-100 bg-[#fefcfb] overflow-hidden">
        <CardContent className="p-5">
            {/* 头部（可见） */}
            <div className="flex items-center gap-2.5 mb-3">
                <Avatar className="w-7 h-7">
                    <AvatarImage src={post.author.avatar_url} alt={post.author.display_name} />
                    <AvatarFallback className="bg-rose-50 text-rose-400 text-xs font-medium">
                        {getAvatarFallback(post.author)}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <span className="text-sm font-medium text-stone-700">{post.author.display_name}</span>
                    <p className="text-xs text-stone-400">{formatRelativeTime(post.created_at)}</p>
                </div>
            </div>

            {/* 模糊内容 + 遮罩 */}
            <div className="relative rounded-lg overflow-hidden">
                {/* 假文字行（blur 模拟内容） */}
                <div className="space-y-2 p-4 blur-sm select-none" aria-hidden>
                    <div className="h-3 bg-stone-300/50 rounded-full w-full" />
                    <div className="h-3 bg-stone-300/50 rounded-full w-10/12" />
                    <div className="h-3 bg-stone-300/50 rounded-full w-8/12" />
                </div>
                {/* 遮罩层 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-white/70 backdrop-blur-[2px]">
                    <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    <p className="text-xs text-stone-500">
                        需要 <span className="font-semibold text-rose-400">{post.unlock_cost}</span> 亲密值解锁
                    </p>
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-200 text-rose-400 hover:bg-rose-50 hover:text-rose-500 h-7 px-3 text-xs"
                        disabled
                    >
                        解锁
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
);

// ─── 子组件：Timeline Feed ────────────────────────────────────────────────────

type TimelineFeedProps = {
    posts: FeedPost[];
    currentUserId: string;
};

const TimelineFeed = ({ posts, currentUserId }: TimelineFeedProps) => {
    const groups = groupPostsByDate(posts);

    return (
        <div className="relative">
            {/* 竖线 */}
            <div className="absolute left-[10px] top-4 bottom-4 w-px bg-rose-100" />

            <div className="space-y-1">
                {groups.map((group) => (
                    <div key={group.dateKey}>
                        {/* 日期标签 */}
                        <div className="relative flex items-center gap-3 py-3">
                            <div className="w-5 h-5 rounded-full bg-white border border-rose-200 flex items-center justify-center z-10 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-300" />
                            </div>
                            <span className="text-xs font-medium text-stone-400 bg-transparent">{group.label}</span>
                        </div>

                        {/* 该日期下的 post */}
                        <div className="space-y-3">
                            {group.posts.map((post) => {
                                const isOwn = post.author_id === currentUserId;
                                return (
                                    <div key={post.post_id} className="relative flex items-start gap-3">
                                        {/* 圆点 */}
                                        <div
                                            className={`w-5 h-5 rounded-full border-2 bg-white z-10 shrink-0 mt-4 ${
                                                isOwn ? 'border-stone-300' : 'border-rose-300'
                                            }`}
                                        />
                                        {/* 卡片 */}
                                        <div className="flex-1 min-w-0">
                                            {post.is_placeholder ? (
                                                <LockedPostCard post={post} />
                                            ) : (
                                                <PostCard post={post} isOwn={isOwn} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── 主页面 ───────────────────────────────────────────────────────────────────

const CouplePage = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<CoupleFeedResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/mock/couple-feed.json')
            .then((res) => {
                if (!res.ok) throw new Error('加载失败');
                return res.json() as Promise<CoupleFeedResponse>;
            })
            .then(setData)
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-linear-to-br from-stone-50 via-rose-50/20 to-stone-100">
            {/* 顶部 Navbar */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-rose-100/60">
                <div className="max-w-4xl mx-auto px-4 h-[57px] flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-stone-400 hover:text-stone-600"
                        onClick={() => navigate('/')}
                        aria-label="返回"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-lg font-semibold tracking-tight text-stone-700">我们的空间</span>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {loading && (
                    <div className="py-24 flex flex-col items-center gap-2 text-rose-200">
                        <Heart className="w-6 h-6 animate-pulse" />
                        <p className="text-sm text-stone-400">加载中...</p>
                    </div>
                )}

                {!loading && error && <div className="py-12 text-center text-sm text-stone-400">{error}</div>}

                {!loading && data && (
                    <div className="md:grid md:grid-cols-[272px_1fr] md:gap-6 md:items-start">
                        {/* 左侧 sidebar */}
                        <aside className="md:sticky md:top-[57px] mb-6 md:mb-0">
                            <CoupleHeader couple={data.couple} />
                        </aside>

                        {/* 右侧 Timeline */}
                        <TimelineFeed posts={data.posts} currentUserId={data.current_user_id} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CouplePage;
