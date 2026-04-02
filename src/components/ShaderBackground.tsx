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

      const fragmentShader = `
        precision highp float;
        uniform vec2 resolution;
        uniform float time;

        float random(in float x) { return fract(sin(x) * 1e4); }

        void main(void) {
          vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
          vec2 fMosaicScal = vec2(4.0, 2.0);
          vec2 vScreenSize = vec2(256.0, 256.0);
          uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
          uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);

          float t = time * 0.06 + random(uv.x) * 0.4;
          float lineWidth = 0.0008;
          vec3 color = vec3(0.0);
          for (int j = 0; j < 3; j++) {
            for (int i = 0; i < 5; i++) {
              color[j] += lineWidth * float(i * i) / abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 1.0 - length(uv));
            }
          }
          gl_FragColor = vec4(color.b, color.g, color.r, 1.0);
        }
      `;

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
      });

      scene.add(new THREE.Mesh(geometry, material));

      const renderer = new THREE.WebGLRenderer();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      container.appendChild(renderer.domElement);

      let animationId: number | null = null;

      const onResize = () => {
        if (!containerRef.current) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        uniforms.resolution.value.x = renderer.domElement.width;
        uniforms.resolution.value.y = renderer.domElement.height;
      };
      onResize();
      window.addEventListener('resize', onResize);

      const animate = () => {
        if (cancelled) return;
        animationId = requestAnimationFrame(animate);
        uniforms.time.value += 0.05;
        renderer.render(scene, camera);
      };
      animate();

      cleanupRef.current = () => {
        window.removeEventListener('resize', onResize);
        if (animationId) cancelAnimationFrame(animationId);
        renderer.dispose();
      };
    };

    // Load Three.js if not already loaded
    if (window.THREE) {
      initThreeJS();
    } else {
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
    }

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.12 }}
    />
  );
});
