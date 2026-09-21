/**
 * CameraController.js
 * Manages Three.js OrbitControls, smooth transitions between camera presets,
 * and cinematic camera motion.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.controls = new OrbitControls(this.camera, this.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 160;
        this.controls.maxPolarAngle = Math.PI * 0.95;

        // Camera presets
        this.presets = {
            overview: {
                position: new THREE.Vector3(42, 10, 52),
                target: new THREE.Vector3(0, 0, 0)
            },
            router: {
                position: new THREE.Vector3(12, -10, 16),
                target: new THREE.Vector3(0, -15, 0)
            },
            expert: {
                // Focuses on Expert 2 / Active Expert
                position: new THREE.Vector3(26, 3, 20),
                target: new THREE.Vector3(22, 0, 12)
            },
            aggregator: {
                position: new THREE.Vector3(14, 22, 18),
                target: new THREE.Vector3(0, 16, 0)
            },
            cinematic: {
                position: new THREE.Vector3(48, 12, 48),
                target: new THREE.Vector3(0, 0, 0)
            }
        };

        this.currentMode = "overview";
        this.isTransitioning = false;
        this.transitionProgress = 1.0;
        this.transitionDuration = 1.5; // seconds

        this.startPos = new THREE.Vector3();
        this.startTarget = new THREE.Vector3();
        this.endPos = new THREE.Vector3();
        this.endTarget = new THREE.Vector3();

        // Initial setup
        this.setPreset("overview", false);
    }

    setPreset(presetName, animate = true, customTarget = null, customPos = null) {
        this.currentMode = presetName;

        let targetPos, targetLookAt;
        if (customPos && customTarget) {
            targetPos = customPos;
            targetLookAt = customTarget;
        } else if (this.presets[presetName]) {
            targetPos = this.presets[presetName].position;
            targetLookAt = this.presets[presetName].target;
        } else {
            return;
        }

        if (!animate) {
            this.camera.position.copy(targetPos);
            this.controls.target.copy(targetLookAt);
            this.controls.update();
            this.isTransitioning = false;
            return;
        }

        this.startPos.copy(this.camera.position);
        this.startTarget.copy(this.controls.target);
        this.endPos.copy(targetPos);
        this.endTarget.copy(targetLookAt);

        this.transitionProgress = 0.0;
        this.isTransitioning = true;
    }

    focusExpert(expertPos) {
        const offset = new THREE.Vector3(12, 3, 14);
        const targetPos = expertPos.clone().add(offset);
        this.setPreset("custom", true, expertPos, targetPos);
    }

    update(delta) {
        if (this.isTransitioning) {
            this.transitionProgress += delta / this.transitionDuration;
            if (this.transitionProgress >= 1.0) {
                this.transitionProgress = 1.0;
                this.isTransitioning = false;
            }

            // Smooth cubic ease-in-out
            const t = this.transitionProgress;
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            this.camera.position.lerpVectors(this.startPos, this.endPos, ease);
            this.controls.target.lerpVectors(this.startTarget, this.endTarget, ease);
        } else if (this.currentMode === "cinematic") {
            // Gentle continuous orbital drift
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 0.8;
        } else {
            this.controls.autoRotate = false;
        }

        this.controls.update();
    }
}
