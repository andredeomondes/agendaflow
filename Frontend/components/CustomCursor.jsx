'use client';
import React, { useEffect, useState, useRef } from 'react';

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const ringRef = useRef(null);
  const ringPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true);
      return;
    }
    const onMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    const onOver = (e) => {
      const target = e.target.closest('a, button, input, select, textarea, [data-cursor]');
      setHovering(!!target);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
    };
  }, []);

  useEffect(() => {
    if (isTouchDevice) return;
    let raf;
    const smoothFollow = () => {
      ringPos.current.x += (pos.x - ringPos.current.x) * 0.1;
      ringPos.current.y += (pos.y - ringPos.current.y) * 0.1;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringPos.current.x - 16}px, ${ringPos.current.y - 16}px)`;
      }
      raf = requestAnimationFrame(smoothFollow);
    };
    raf = requestAnimationFrame(smoothFollow);
    return () => cancelAnimationFrame(raf);
  }, [pos, isTouchDevice]);

  if (isTouchDevice) return null;

  return (
    <>
      <div
        className="custom-cursor-dot"
        style={{ left: pos.x, top: pos.y }}
      />
      <div
        ref={ringRef}
        className={`custom-cursor-ring ${hovering ? 'scale-up' : ''}`}
      />
    </>
  );
}
