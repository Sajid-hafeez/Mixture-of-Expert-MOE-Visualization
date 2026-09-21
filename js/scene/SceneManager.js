/**
 * SceneManager.js
 * Configures the Three.js WebGL renderer, cinematic lighting, cosmic neural starfield,
 * and UnrealBloom postprocessing pipeline.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CameraController } from './CameraController.js';

export class SceneManager {
    constructor(canvasContainer) {
        this.container = canvasContainer;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x06090e);
        this.scene.fog = new THREE.FogExp2(0x06090e, 0.007);

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.5,
            1000
        );

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            stencil: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.container.appendChild(this.renderer.domElement);

        this.cameraController = new CameraController(this.camera, this.renderer.domElement);

        this.setupLights();
        this.setupCosmicStarfield();
        this.setupPostprocessing();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLights() {
        // Ambient soft illumination
        const ambient = new THREE.AmbientLight(0x0f172a, 1.5);
        this.scene.add(ambient);

        // Key directional light with cool tint
        const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
        keyLight.position.set(40, 60, 50);
        this.scene.add(keyLight);

        // Rim fill light with violet tint
        const fillLight = new THREE.DirectionalLight(0xa855f7, 1.8);
        fillLight.position.set(-40, -30, -40);
        this.scene.add(fillLight);

        // Router Core glowing point light
        this.routerPointLight = new THREE.PointLight(0x00f0ff, 2.5, 50);
        this.routerPointLight.position.set(0, -15, 0);
        this.scene.add(this.routerPointLight);

        // Aggregator glowing point light
        this.aggPointLight = new THREE.PointLight(0x10b981, 2.5, 50);
        this.aggPointLight.position.set(0, 16, 0);
        this.scene.add(this.aggPointLight);
    }

    setupCosmicStarfield() {
        // Neural dust / latent space starfield
        const starCount = 1500;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        const palette = [
            new THREE.Color(0x38bdf8),
            new THREE.Color(0x818cf8),
            new THREE.Color(0xa855f7),
            new THREE.Color(0x0ea5e9)
        ];

        for (let i = 0; i < starCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 350;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 350;

            const c = palette[Math.floor(Math.random() * palette.length)];
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const starMat = new THREE.PointsMaterial({
            size: 0.9,
            vertexColors: true,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending
        });

        this.starfield = new THREE.Points(starGeo, starMat);
        this.scene.add(this.starfield);
    }

    setupPostprocessing() {
        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // UnrealBloomPass for glowing cyber/neural aesthetics
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.2,  // Bloom strength
            0.6,  // Bloom radius
            0.22  // Bloom threshold
        );
        this.composer.addPass(bloomPass);
    }

    onWindowResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
    }

    render(delta, time) {
        this.cameraController.update(delta);

        // Slow rotation of cosmic starfield
        if (this.starfield) {
            this.starfield.rotation.y += delta * 0.015;
        }

        this.composer.render();
    }
}
