import * as THREE from 'three';

export function createScene(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 60, 120);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 12, 20);

    // Lighting
    const ambient = new THREE.AmbientLight(0x334466, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(30, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0xff3366, 0.8, 40);
    pointLight1.position.set(-15, 8, -15);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4488ff, 0.8, 40);
    pointLight2.position.set(15, 8, 15);
    scene.add(pointLight2);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { renderer, scene, camera };
}
