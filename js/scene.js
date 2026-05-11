import * as THREE from 'three';

export function createScene(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);
    scene.fog = new THREE.FogExp2(0x020208, 0.008);

    // FPS camera
    const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 3, 15);

    // Moody ambient
    const ambient = new THREE.AmbientLight(0x111122, 0.4);
    scene.add(ambient);

    // Main directional (moonlight)
    const dirLight = new THREE.DirectionalLight(0x4444aa, 0.6);
    dirLight.position.set(40, 60, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -80;
    dirLight.shadow.camera.right = 80;
    dirLight.shadow.camera.top = 80;
    dirLight.shadow.camera.bottom = -80;
    scene.add(dirLight);

    // Hemisphere light (sky/ground)
    const hemiLight = new THREE.HemisphereLight(0x0a0a2e, 0x0a0a0a, 0.3);
    scene.add(hemiLight);

    // Colored atmosphere lights
    const atmoLights = [
        { color: 0xff0066, pos: [-30, 15, -30], intensity: 1.5, dist: 50 },
        { color: 0x4488ff, pos: [30, 15, -30], intensity: 1.5, dist: 50 },
        { color: 0x00ff66, pos: [-30, 15, 30], intensity: 1.2, dist: 50 },
        { color: 0x8800ff, pos: [30, 15, 30], intensity: 1.5, dist: 50 },
        { color: 0xff3300, pos: [0, 20, 0], intensity: 1.0, dist: 40 },
    ];
    atmoLights.forEach(l => {
        const light = new THREE.PointLight(l.color, l.intensity, l.dist);
        light.position.set(...l.pos);
        scene.add(light);
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { renderer, scene, camera };
}
