'use client';
import { useEffect, useRef } from 'react';

export default function DotField({ color = '130,87,229', dotSize = 1.5, spacing = 28, radius = 100, smooth = 0.12 }) {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: -9999, y: -9999 });
    const dotsRef = useRef([]);
    const currentRef = useRef(new Map());

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let raf = null;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = window.innerWidth;
            const h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.scale(dpr, dpr);

            const cols = Math.floor(w / spacing) + 2;
            const rows = Math.floor(h / spacing) + 2;
            const dots = [];
            const cur = new Map();
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const key = `${r}_${c}`;
                    dots.push({
                        x: c * spacing + ((r * 7 + c * 3) % spacing) * 0.3,
                        y: r * spacing + ((r * 5 + c * 11) % spacing) * 0.3,
                        baseSize: dotSize,
                        key,
                    });
                    cur.set(key, { size: dotSize, alpha: 0.15 });
                }
            }
            dotsRef.current = dots;
            currentRef.current = cur;
        };

        const draw = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            ctx.clearRect(0, 0, w, h);

            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;
            const cur = currentRef.current;

            for (const dot of dotsRef.current) {
                const dx = dot.x - mx;
                const dy = dot.y - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const influence = Math.max(0, 1 - dist / radius);
                const targetSize = dot.baseSize + influence * 3;
                const targetAlpha = 0.15 + influence * 0.5;

                const state = cur.get(dot.key);
                state.size += (targetSize - state.size) * smooth;
                state.alpha += (targetAlpha - state.alpha) * smooth;

                ctx.beginPath();
                ctx.arc(dot.x, dot.y, state.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${color}, ${state.alpha})`;
                ctx.fill();
            }

            raf = requestAnimationFrame(draw);
        };

        const handleMouse = (e) => {
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
        };
        const handleLeave = () => {
            mouseRef.current.x = -9999;
            mouseRef.current.y = -9999;
        };

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouse);
        window.addEventListener('mouseleave', handleLeave);
        raf = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouse);
            window.removeEventListener('mouseleave', handleLeave);
        };
    }, [color, dotSize, spacing, radius, smooth]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
        />
    );
}
