import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import { LogOut, Heart, ChevronRight, ImagePlus, Smile, BookOpen } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase.ts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface HomePageProps {
    session: Session;
}

// 情侣空间状态（Phase 3 实现前先用 mock）
type CoupleStatus = 'none' | 'pending' | 'active';

const COUPLE_STATUS_CONFIG: Record<CoupleStatus, { label: string; variant: 'outline' | 'secondary' | 'default' }> = {
    none: { label: '未创建', variant: 'outline' },
    pending: { label: '等待对方加入', variant: 'secondary' },
    active: { label: '已配对', variant: 'default' }
};

const COUPLE_STATUS_DESC: Record<CoupleStatus, string> = {
    none: '创建你们的专属空间',
    pending: '分享邀请码，等待对方加入',
    active: '查看你们的动态与记录'
};

const HomePage = ({ session }: HomePageProps) => {
    const navigate = useNavigate();
    const [signOutError, setSignOutError] = useState('');
    const [postContent, setPostContent] = useState('');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    // mock 数据，Phase 3 完成后替换为真实查询
    const coupleStatus = 'none' as CoupleStatus;
    const profile = {
        display_name:
            (session.user.user_metadata?.full_name as string | undefined) ??
            session.user.email?.split('@')[0] ??
            '用户',
        avatar_url: (session.user.user_metadata?.avatar_url as string | undefined) ?? '',
        bio: '点击编辑个人签名...'
    };

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) setSignOutError(error.message);
        else navigate('/login');
    };

    const handleCoupleEntry = () => {
        if (coupleStatus === 'none') {
            setCreateDialogOpen(true);
        } else {
            navigate('/couple');
        }
    };

    const handleCreateCouple = () => {
        // Phase 3：写入 couples 表
        setCreateDialogOpen(false);
        navigate('/couple');
    };

    const handlePostSubmit = () => {
        if (!postContent.trim()) return;
        // Phase 4：写入 posts 表
        setPostContent('');
    };

    const avatarFallback = profile.display_name.slice(0, 2).toUpperCase();

    // ─── 共用子组件（inline） ────────────────────────────────────────────

    const CoupleEntryCard = (
        <Card
            className="border border-stone-100 shadow-sm bg-white/90 cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleCoupleEntry}
        >
            <CardContent className="p-5">
                <div className="flex items-center gap-3">
                    {/* 情侣空间图标：爱情元素，保留玫瑰红渐变 */}
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-400 to-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Heart className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-stone-800">我们的空间</span>
                            <Badge
                                variant={COUPLE_STATUS_CONFIG[coupleStatus].variant}
                                className="text-xs px-1.5 py-0 border-stone-300 text-stone-500"
                            >
                                {COUPLE_STATUS_CONFIG[coupleStatus].label}
                            </Badge>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">{COUPLE_STATUS_DESC[coupleStatus]}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
                </div>
            </CardContent>
        </Card>
    );

    const PostComposer = (
        <Card className="border border-stone-100 shadow-sm bg-white/90">
            <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                        <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                        <AvatarFallback className="bg-stone-100 text-stone-600 text-xs font-medium">
                            {avatarFallback}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-stone-400">今天有什么想说的？</span>
                </div>

                <Textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="写点什么，只给自己看..."
                    className="resize-none border-0 bg-stone-50 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm min-h-20 text-stone-700 placeholder:text-stone-300"
                />

                <Separator className="bg-stone-100" />

                <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 px-2 h-8"
                            disabled
                        >
                            <ImagePlus className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 px-2 h-8"
                            disabled
                        >
                            <Smile className="w-4 h-4" />
                        </Button>
                    </div>
                    <Button
                        size="sm"
                        className="bg-stone-700 hover:bg-stone-800 text-white h-8 px-4 shadow-sm"
                        onClick={handlePostSubmit}
                        disabled={!postContent.trim()}
                    >
                        发布
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const FeedPlaceholder = (
        <div className="py-12 flex flex-col items-center gap-2 text-stone-300">
            <BookOpen className="w-8 h-8 opacity-40" />
            <p className="text-sm">你的动态将显示在这里</p>
        </div>
    );

    // ─── 移动端 Profile 卡（横向布局）───────────────────────────────────

    const MobileProfileCard = (
        <Card className="border border-stone-100 shadow-sm bg-white/90 md:hidden">
            <CardContent className="p-5">
                <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 ring-2 ring-stone-200 shrink-0">
                        <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                        <AvatarFallback className="bg-stone-100 text-stone-600 text-lg font-semibold">
                            {avatarFallback}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-stone-800 truncate">{profile.display_name}</p>
                        <p className="text-sm text-stone-400 mt-0.5 truncate">{profile.bio}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    // ─── 桌面端 Profile 侧边栏（竖向布局）──────────────────────────────

    const DesktopProfileSidebar = (
        <aside className="hidden md:block md:sticky md:top-[57px]">
            <Card className="border border-stone-100 shadow-sm bg-white/90">
                <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <Avatar className="w-20 h-20 ring-2 ring-stone-200">
                            <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                            <AvatarFallback className="bg-stone-100 text-stone-600 text-2xl font-semibold">
                                {avatarFallback}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <p className="text-base font-semibold text-stone-800">{profile.display_name}</p>
                            <p className="text-sm text-stone-400 leading-relaxed">{profile.bio}</p>
                        </div>

                        <Separator className="bg-stone-100 w-full" />

                        {/* 统计占位（Phase 后续接入） */}
                        <div className="w-full grid grid-cols-2 gap-3 text-center">
                            <div className="py-2 rounded-xl bg-stone-50">
                                <p className="text-lg font-semibold text-stone-700">—</p>
                                <p className="text-xs text-stone-400 mt-0.5">动态</p>
                            </div>
                            <div className="py-2 rounded-xl bg-rose-50">
                                <p className="text-lg font-semibold text-rose-400">—</p>
                                <p className="text-xs text-stone-400 mt-0.5">亲密值</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </aside>
    );

    // ────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-linear-to-br from-stone-50 via-stone-50 to-stone-100">
            {/* 顶部 Navbar */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-stone-200">
                <div className="max-w-4xl mx-auto px-4 h-[57px] flex items-center justify-between">
                    <span className="text-lg font-semibold tracking-tight text-stone-700">still</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-stone-400 hover:text-stone-600"
                        onClick={handleSignOut}
                        aria-label="退出登录"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* 主体：移动端单列 / 桌面端双列 */}
            <div className="max-w-4xl mx-auto px-4 py-6 md:grid md:grid-cols-[272px_1fr] md:gap-6 md:items-start">
                {/* 桌面端左侧边栏 */}
                {DesktopProfileSidebar}

                {/* 右侧主内容（移动端为全宽单列） */}
                <div className="space-y-4">
                    {/* 移动端专属 Profile 卡 */}
                    {MobileProfileCard}

                    {/* 情侣空间入口 */}
                    {CoupleEntryCard}

                    {/* 个人动态输入框 */}
                    {PostComposer}

                    {/* Feed 占位 */}
                    {FeedPlaceholder}
                </div>
            </div>

            {/* 错误提示 */}
            {signOutError && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-stone-800 text-stone-100 text-sm px-4 py-2 rounded-lg shadow-lg">
                    {signOutError}
                </div>
            )}

            {/* 创建情侣空间弹窗 */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <div className="flex justify-center mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-sm">
                                <Heart className="w-5 h-5 text-white fill-white" />
                            </div>
                        </div>
                        <DialogTitle className="text-center text-stone-800">创建你们的专属空间</DialogTitle>
                        <DialogDescription className="text-center text-stone-400">
                            创建后可邀请对方加入，开始记录你们的故事
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                        <Button
                            className="w-full bg-stone-700 hover:bg-stone-800 text-white shadow-sm"
                            onClick={handleCreateCouple}
                        >
                            立即创建
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-stone-400 hover:text-stone-600"
                            onClick={() => setCreateDialogOpen(false)}
                        >
                            取消
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HomePage;
