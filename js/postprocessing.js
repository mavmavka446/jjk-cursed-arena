import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Custom Chromatic Aberration + Scanlines + Vignette shader
const CursedShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        aberrationAmount: { value: 0.003 },
        scanlineIntensity: { value: 0.08 },
        vignetteAmount: { value: 0.7 },
        noiseAmount: { value: 0.03 },
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
        uniform float scanlineIntensity;
        uniform float vignetteAmount;
        uniform float noiseAmount;
        uniform float pulseIntensity;
        uniform float hitFlash;
        uniform vec3 tintColor;
        varying vec2 vUv;

        float random(vec2 co) {
            return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
            vec2 uv = vUv;

            // Screen distortion pulse
            float pulse = sin(time * 3.0) * pulseIntensity;
            uv += vec2(sin(uv.y * 20.0 + time * 5.0) * pulse * 0.01, 0.0);

            // Chromatic aberration
            float aberration = aberrationAmount * (1.0 + pulse * 5.0);
            float r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;
            vec3 color = vec3(r, g, b);

            // Scanlines
            float scanline = sin(uv.y * 400.0 + time * 2.0) * 0.5 + 0.5;
            color -= scanline * scanlineIntensity;

            // Horizontal interference lines
            float interference = step(0.998, random(vec2(floor(uv.y * 200.0), floor(time * 10.0))));
            color += interference * 0.15;

            // Film grain noise
            float noise = random(uv + time) * noiseAmount;
            color += noise;

            // Vignette
            float dist = distance(uv, vec2(0.5));
            float vignette = smoothstep(0.7, 0.3, dist * vignetteAmount);
            color *= vignette;

            // Energy tint
            color += tintColor * 0.15;

            // Hit flash (red overlay)
            color = mix(color, vec3(1.0, 0.0, 0.0), hitFlash * 0.4);

            // Contrast boost
            color = pow(color, vec3(1.1));

            gl_FragColor = vec4(color, 1.0);
        }
    `
};

// Neon glow outline shader
const NeonEdgeShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(1, 1) },
        edgeColor: { value: new THREE.Vector3(1.0, 0.2, 0.4) },
        edgeStrength: { value: 1.5 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform vec3 edgeColor;
        uniform float edgeStrength;
        varying vec2 vUv;

        void main() {
            vec2 texel = vec2(1.0 / resolution.x, 1.0 / resolution.y);
            vec4 center = texture2D(tDiffuse, vUv);
            float lum = dot(center.rgb, vec3(0.299, 0.587, 0.114));

            float lumL = dot(texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
            float lumR = dot(texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
            float lumU = dot(texture2D(tDiffuse, vUv - vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
            float lumD = dot(texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));

            float edge = abs(lumL - lumR) + abs(lumU - lumD);
            edge = smoothstep(0.05, 0.2, edge) * edgeStrength;

            vec3 finalColor = center.rgb + edgeColor * edge * 0.3;
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};

export function setupPostProcessing(renderer, scene, camera) {
    const composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Bloom - intense glow
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.8,   // strength
        0.4,   // radius
        0.6    // threshold
    );
    composer.addPass(bloomPass);

    // Neon edge detection
    const neonPass = new ShaderPass(NeonEdgeShader);
    neonPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    composer.addPass(neonPass);

    // Cursed post-processing (chromatic aberration, scanlines, vignette, noise)
    const cursedPass = new ShaderPass(CursedShader);
    composer.addPass(cursedPass);

    // Output
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // Glitch pass (off by default, enabled on hit/ult)
    const glitchPass = new GlitchPass();
    glitchPass.enabled = false;
    composer.addPass(glitchPass);

    window.addEventListener('resize', () => {
        composer.setSize(window.innerWidth, window.innerHeight);
        bloomPass.setSize(window.innerWidth, window.innerHeight);
        neonPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    });

    return { composer, bloomPass, cursedPass, glitchPass, neonPass };
}
