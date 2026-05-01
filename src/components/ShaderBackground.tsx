import { useEffect, useRef, memo } from 'react';

declare global {
  interface Window {
    THREE: any;
  }
}

export const ShaderBackground = memo(function ShaderBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Detect mobile / low-power devices
    const isMobile =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(max-width: 768px)').matches ||
        /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent));

    // Honor reduced-motion preference: skip the animation entirely.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const initThreeJS = () => {
      if (!containerRef.current || !window.THREE || cancelled) return;
      const THREE = window.THREE;
      const container = containerRef.current;
      container.innerHTML = '';

      const camera = new THREE.Camera();
      camera.position.z = 1;
      const scene = new THREE.Scene();
      const geometry = new THREE.PlaneBufferGeometry(2, 2);

      const uniforms = {
        time: { type: 'f', value: 1.0 },
        resolution: { type: 'v2', value: new THREE.Vector2() },
      };

      const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;

      // New shader: smoother diagonal-pattern variant with slightly higher opacity (color * 1.15).
      const fragmentShader = `
        precision highp float;
        uniform vec2 resolution;
        uniform float time;

        void main(void) {
          vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
          float t = time * 0.05;
          float lineWidth = 0.0014;
          vec3 color = vec3(0.0);
          for (int j = 0; j < 3; j++) {
            for (int i = 0; i < 5; i++) {
              color[j] += lineWidth * float(i * i)
                / abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 5.0
                  - length(uv) + mod(uv.x + uv.y, 0.2));
            }
          }
          // Slightly higher opacity by boosting intensity
          gl_FragColor = vec4(color * 1.15, 1.0);
        }
      `;

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
      });

      scene.add(new THREE.Mesh(geometry, material));

      const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
      // Mobile: clamp pixel ratio harder to dramatically reduce GPU fragment cost.
      const maxRatio = isMobile ? 1 : 2;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxRatio));
      container.appendChild(renderer.domElement);

      const canvas = renderer.domElement;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      let animationId: number | null = null;

      // On mobile downscale internal resolution further (render at 60% size, CSS upscales).
      const renderScale = isMobile ? 0.6 : 1.0;

      const onResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth || window.innerWidth;
        const h = containerRef.current.clientHeight || window.innerHeight;
        renderer.setSize(Math.floor(w * renderScale), Math.floor(h * renderScale), false);
        // Make canvas fill the container visually
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        const ratio = Math.min(window.devicePixelRatio, maxRatio);
        uniforms.resolution.value.x = w * renderScale * ratio;
        uniforms.resolution.value.y = h * renderScale * ratio;
      };
      onResize();
      window.addEventListener('resize', onResize);
      const orientationHandler = () => setTimeout(onResize, 200);
      window.addEventListener('orientationchange', orientationHandler);

      // Cap FPS on mobile to ~30fps to save battery & reduce jank.
      const targetFrameMs = isMobile ? 1000 / 30 : 0;
      let lastFrame = 0;

      const animate = (now?: number) => {
        if (cancelled) return;
        animationId = requestAnimationFrame(animate);
        const t = now ?? performance.now();
        if (targetFrameMs > 0 && t - lastFrame < targetFrameMs) return;
        lastFrame = t;
        // Time advance: slightly slower on mobile so motion feels smooth at 30fps
        uniforms.time.value += isMobile ? 0.08 : 0.05;
        renderer.render(scene, camera);
      };
      animate();

      // Pause animation when page is hidden to save battery.
      const onVisibility = () => {
        if (document.hidden) {
          if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
          }
        } else if (!animationId) {
          animate();
        }
      };
      document.addEventListener('visibilitychange', onVisibility);

      cleanupRef.current = () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', orientationHandler);
        document.removeEventListener('visibilitychange', onVisibility);
        if (animationId) cancelAnimationFrame(animationId);
        renderer.dispose();
        geometry.dispose();
        material.dispose();
      };
    };

    const loadAndInit = () => {
      if (window.THREE) {
        initThreeJS();
        return;
      }
      const existingScript = document.querySelector('script[src*="three.min.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => initThreeJS());
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => initThreeJS();
        script.onerror = () => console.warn('ShaderBackground: Failed to load Three.js');
        document.head.appendChild(script);
      }
    };

    // Defer loading until after the main thread is idle.
    // Mobile waits longer so the dashboard becomes interactive first.
    const idleTimeout = isMobile ? 4500 : 3000;

    if ('requestIdleCallback' in window) {
      const idleId = (window as any).requestIdleCallback(
        () => {
          if (!cancelled) loadAndInit();
        },
        { timeout: idleTimeout }
      );
      return () => {
        cancelled = true;
        (window as any).cancelIdleCallback?.(idleId);
        cleanupRef.current?.();
        if (containerRef.current) containerRef.current.innerHTML = '';
      };
    } else {
      const timerId = setTimeout(() => {
        if (!cancelled) loadAndInit();
      }, isMobile ? 2500 : 1500);
      return () => {
        cancelled = true;
        clearTimeout(timerId);
        cleanupRef.current?.();
        if (containerRef.current) containerRef.current.innerHTML = '';
      };
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        opacity: 0.3,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    />
  );
});
