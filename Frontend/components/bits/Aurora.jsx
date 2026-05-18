'use client';
import { useEffect, useRef } from 'react';

export default function Aurora({ colors = ['#8257e5', '#633bbc', '#996dff'], speed = 0.3 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let time = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            time += speed * 0.005;
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            for (let i = 0; i < 3; i++) {
                const x = w / 2 + Math.sin(time + i * 2) * w * 0.35;
                const y = h / 2 + Math.cos(time * 0.7 + i * 1.5) * h * 0.2;
                const r = w * 0.3 + Math.sin(time * 0.5 + i) * w * 0.1;

                const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
                const c = colors[i % colors.length];
                grad.addColorStop(0, c + '60');
                grad.addColorStop(0.5, c + '20');
                grad.addColorStop(1, c + '00');

                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }
            animId = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, [colors, speed]);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.6 }} />;
}
