import { useEffect, useRef } from 'react';

/**
 * 占位 Canvas —— metaspace 的渲染底层。
 * 当前用 2D 绘制一个柔和的天空视角占位，Blender 模型导入后替换为 React Three Fiber 场景。
 */
const WorldCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;

            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // 天空视角占位：柔和的天空 → 暖粉渐变
            const sky = ctx.createLinearGradient(0, 0, 0, h);
            sky.addColorStop(0, '#bfe3ff');
            sky.addColorStop(1, '#fef0f3');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, w, h);

            // 占位提示
            ctx.fillStyle = 'rgba(120, 113, 108, 0.45)';
            ctx.textAlign = 'center';
            ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
            ctx.fillText('Our World', w / 2, h / 2 - 8);
            ctx.font = '400 13px "Segoe UI", system-ui, sans-serif';
            ctx.fillText('3D 场景占位 · Blender 模型导入后替换', w / 2, h / 2 + 16);
        };

        draw();
        window.addEventListener('resize', draw);
        return () => window.removeEventListener('resize', draw);
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 block" />;
};

export default WorldCanvas;