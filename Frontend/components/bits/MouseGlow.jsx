'use client';
import { useEffect, useRef } from 'react';

export default function MouseGlow({ color = '130,87,229', size = 500 }) {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const handleMouse = (e) => {
            el.style.setProperty('--mx', `${e.clientX}px`);
            el.style.setProperty('--my', `${e.clientY}px`);
        };
        window.addEventListener('mousemove', handleMouse);
        return () => window.removeEventListener('mousemove', handleMouse);
    }, []);

    return (
        <div
            ref={ref}
            className="fixed inset-0 pointer-events-none"
            style={{
                zIndex: 0,
                background: `radial-gradient(${size}px circle at var(--mx, 50%) var(--my, 50%), rgba(${color},0.12), transparent 60%)`,
                transition: 'background 0.1s ease-out',
            }}
        />
    );
}
