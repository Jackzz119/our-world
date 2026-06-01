import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 图片窗口 —— 上传/查看两个人的照片（当前本地 FileReader 预览，暂不上传后端）

const ImagePanel = () => {
    const [images, setImages] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const handlePick = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setImages((prev) => [reader.result as string, ...prev]);
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    return (
        <div className="space-y-3">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePick}
            />
            <Button
                size="sm"
                className="h-8 w-full bg-stone-700 text-white shadow-sm hover:bg-stone-800"
                onClick={() => inputRef.current?.click()}
            >
                <ImagePlus className="mr-1.5 h-4 w-4" />
                添加照片
            </Button>

            {images.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-stone-300">
                    <ImagePlus className="h-7 w-7 opacity-40" />
                    <p className="text-xs">还没有照片，点上面添加</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {images.map((src, i) => (
                        <img
                            key={i}
                            src={src}
                            alt={`照片 ${i + 1}`}
                            className="aspect-square w-full rounded-lg object-cover"
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImagePanel;