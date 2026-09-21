/**
 * main.js
 * Application entry point: initializes 3D scene, MoE simulation engine,
 * components, and animation render loop.
 */

import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager.js';
import { MoEEngine } from './simulation/MoEEngine.js';
import { RouterCore } from './components/RouterCore.js';
import { ExpertCluster } from './components/ExpertCluster.js';
import { ParticleConduits } from './components/ParticleConduits.js';
import { ResidualRail } from './components/ResidualRail.js';
import { AudioSynth } from './ui/AudioSynth.js';
import { UIController } from './ui/UIController.js';

class MoEApplication {
    constructor() {
        this.container = document.getElementById('webgl-container');
        this.clock = new THREE.Clock();

        this.init();
    }

    init() {
        // 1. Simulation Engine
        this.engine = new MoEEngine();

        // 2. 3D Scene & Rendering System
        this.sceneManager = new SceneManager(this.container);

        // 3. 3D MoE Architecture Components
        this.expertCluster = new ExpertCluster(this.sceneManager.scene, this.engine.experts);
        this.routerCore = new RouterCore(this.sceneManager.scene, this.engine.experts);
        this.particleConduits = new ParticleConduits(this.sceneManager.scene, this.engine.experts);
        this.residualRail = new ResidualRail(this.sceneManager.scene);

        // 4. Audio & HUD Controller
        this.audioSynth = new AudioSynth();
        this.uiController = new UIController(
            this.engine,
            this.sceneManager,
            this.expertCluster,
            this.audioSynth
        );

        // Notify initial state
        this.engine.notify();

        // Remove loading overlay
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => loader.remove(), 600);
            }, 300);
        }

        // Start render loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    animate() {
        requestAnimationFrame(this.animate);

        const delta = Math.min(this.clock.getDelta(), 0.1);
        const time = this.clock.getElapsedTime();

        // Advance simulation
        this.engine.update(delta);
        const engineState = this.engine.getState();

        // Update 3D components
        this.routerCore.update(engineState, delta, time);
        this.expertCluster.update(engineState, delta, time);
        this.particleConduits.update(engineState, delta, time);
        this.residualRail.update(engineState, delta, time);

        // Render scene with bloom
        this.sceneManager.render(delta, time);
    }
}

// Instantiate immediately or on DOMContentLoaded
function startApp() {
    try {
        new MoEApplication();
    } catch (err) {
        console.error("MoE Application error:", err);
        const loaderText = document.querySelector('.loader-text');
        if (loaderText) {
            loaderText.textContent = "INITIALIZATION ERROR: " + err.message;
            loaderText.style.color = "#ef4444";
        }
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
