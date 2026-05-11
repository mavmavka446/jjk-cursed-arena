import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Lightweight post-processing: subtle chromatic aberration + vignette + hit flash
const CursedShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        aberrationAmount: { value: 0.001 },
        vignetteAmount: { value: 0.5 },
        pulseIntensity: { value: 0.0 },
        hitFlash: { value: 0.0 },
        tintColor: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float aberrationAmount;
        uniform float vignetteAmount;
        uniform float pulseIntensity;
        uniform float hitFlash;
        uniform vec3 tintColor;
        varying vec2 vUv;

        void main() {
            vec2 uv = vUv;

            // Subtle chromatic aberration (only on pulse/hit)
            float aberration = aberrationAmount * (1.0 + pulseIntensity * 3.0);
            float r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;
            vec3 color = vec3(r, g, b);

            // Soft vignette
            float dist = distance(uv, vec2(0.5));
            float vignette = smoothstep(0.8, 0.35, dist * vignetteAmount);
            color *= vignette;

            // Subtle energy tint
            color += tintColor * 0.08;

            // Hit flash (red overlay)
            color = mix(color, vec3(1.0, 0.05, 0.05), hitFlash * 0.3);

            gl_FragColor = vec4(color, 1.0);
        }
    `
};

export function setupPostProcessing(renderer, scene, camera) {
    const composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Bloom — toned down
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,   // strength (was 1.8)
        0.5,   // radius
        0.75   // threshold (higher = less bloom on dark objects)
    );
    composer.addPass(bloomPass);

    // Cursed pass (lightweight: aberration + vignette + hit flash only)
    const cursedPass = new ShaderPass(CursedShader);
    composer.addPass(cursedPass);

    // Output
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    window.addEventListener('resize', () => {
        composer.setSize(window.innerWidth, window.innerHeight);
        bloomPass.setSize(window.innerWidth, window.innerHeight);
    });

    return { composer, bloomPass, cursedPass };
}
