'use client';
import { useRef, useEffect, useState } from 'react';

export default function BlurText({ children, className = '', delay = 0, duration = 0.8, blurAmount = 10 }) {
    const ref = useRef(null);
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => setRevealed(true), delay * 1000);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [delay]);

    return (
        <span
            ref={ref}
            className={className}
            style={{
                display: 'inline-block',
                filter: revealed ? 'blur(0px)' : `blur(${blurAmount}px)`,
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translateY(0)' : 'translateY(10px)',
                transition: `filter ${duration}s ease, opacity ${duration}s ease, transform ${duration}s ease`,
            }}
        >
            {children}
        </span>
    );
}
