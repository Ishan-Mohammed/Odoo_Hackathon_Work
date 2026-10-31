import { useState, useEffect, useRef } from 'react';

export function useMouseGlow() {
  const containerRef = useRef(null);
  const [coords, setCoords] = useState({ x: 50, y: 50, tiltX: 0, tiltY: 0, parallaxX: 0, parallaxY: 0 });

  const targetCoords = useRef({ x: 50, y: 50, tiltX: 0, tiltY: 0, parallaxX: 0, parallaxY: 0 });
  const currentCoords = useRef({ x: 50, y: 50, tiltX: 0, tiltY: 0, parallaxX: 0, parallaxY: 0 });
  const animationFrameId = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const animate = () => {
      currentCoords.current.x = lerp(currentCoords.current.x, targetCoords.current.x, 0.08);
      currentCoords.current.y = lerp(currentCoords.current.y, targetCoords.current.y, 0.08);
      currentCoords.current.tiltX = lerp(currentCoords.current.tiltX, targetCoords.current.tiltX, 0.1);
      currentCoords.current.tiltY = lerp(currentCoords.current.tiltY, targetCoords.current.tiltY, 0.1);
      currentCoords.current.parallaxX = lerp(currentCoords.current.parallaxX, targetCoords.current.parallaxX, 0.08);
      currentCoords.current.parallaxY = lerp(currentCoords.current.parallaxY, targetCoords.current.parallaxY, 0.08);

      setCoords({
        x: currentCoords.current.x,
        y: currentCoords.current.y,
        tiltX: currentCoords.current.tiltX,
        tiltY: currentCoords.current.tiltY,
        parallaxX: currentCoords.current.parallaxX,
        parallaxY: currentCoords.current.parallaxY,
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      const pctX = Math.max(0, Math.min(100, (relX / rect.width) * 100));
      const pctY = Math.max(0, Math.min(100, (relY / rect.height) * 100));

      // Calculate tilt angles (max 6 deg)
      // mouse on right -> tilt positive Y, mouse on bottom -> tilt negative X
      const normX = (relX / rect.width - 0.5) * 2; // -1 to 1
      const normY = (relY / rect.height - 0.5) * 2; // -1 to 1

      const tiltY = normX * 6;
      const tiltX = -normY * 6;

      // Parallax for blobs (max 12px)
      const parallaxX = normX * 12;
      const parallaxY = normY * 12;

      targetCoords.current = {
        x: pctX,
        y: pctY,
        tiltX,
        tiltY,
        parallaxX,
        parallaxY,
      };
    };

    const handleMouseLeave = () => {
      targetCoords.current = {
        x: 50,
        y: 50,
        tiltX: 0,
        tiltY: 0,
        parallaxX: 0,
        parallaxY: 0,
      };
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return {
    containerRef,
    spotlightStyle: {
      background: `radial-gradient(600px circle at ${coords.x}% ${coords.y}%, rgba(99, 102, 241, 0.15), transparent 70%)`,
    },
    cardTiltStyle: {
      transform: `perspective(1000px) rotateX(${coords.tiltX.toFixed(2)}deg) rotateY(${coords.tiltY.toFixed(2)}deg)`,
    },
    parallaxStyle: {
      transform: `translate3d(${coords.parallaxX.toFixed(1)}px, ${coords.parallaxY.toFixed(1)}px, 0)`,
    },
  };
}
