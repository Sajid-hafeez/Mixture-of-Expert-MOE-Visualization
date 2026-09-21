/**
 * ExpertCluster.js
 * Assembles and manages the 8 floating 3D neural expert sub-networks in spatial orbit.
 */

import * as THREE from 'three';
import { NeuralMLP } from './NeuralMLP.js';

export class ExpertCluster {
    constructor(scene, expertsData) {
        this.scene = scene;
        this.expertsData = expertsData;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.orbitRadius = 26.0;
        this.experts = [];
        this.expertMeshes = []; // For raycasting
        this.hoveredExpertId = null;

        this.buildCluster();
    }

    buildCluster() {
        const count = this.expertsData.length;

        for (let i = 0; i < count; i++) {
            const expData = this.expertsData[i];
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * this.orbitRadius;
            const z = Math.sin(angle) * this.orbitRadius;
            const y = 0;

            const expertContainer = new THREE.Group();
            expertContainer.position.set(x, y, z);

            // Rotate expert container so its front faces slightly toward center
            expertContainer.rotation.y = -angle + Math.PI / 2;

            // 1. The Neural MLP Core
            const mlp = new NeuralMLP(expData);
            expertContainer.add(mlp.group);

            // 2. Holographic Pedestal / Enclosure Ring
            const baseRingGeo = new THREE.CylinderGeometry(4.2, 4.2, 0.4, 32, 1, true);
            const baseRingMat = new THREE.MeshBasicMaterial({
                color: expData.hexColor,
                transparent: true,
                opacity: 0.25,
                wireframe: true
            });
            const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
            baseRing.position.y = -5.2;
            expertContainer.add(baseRing);

            // Top Header Ring
            const topRingGeo = new THREE.TorusGeometry(3.0, 0.05, 8, 32);
            const topRingMat = new THREE.MeshBasicMaterial({
                color: expData.hexColor,
                transparent: true,
                opacity: 0.25
            });
            const topRing = new THREE.Mesh(topRingGeo, topRingMat);
            topRing.position.y = 5.2;
            topRing.rotation.x = Math.PI / 2;
            expertContainer.add(topRing);

            // 3. Floating Label Canvas Billboard
            const labelSprite = this.createLabelSprite(expData);
            labelSprite.position.set(0, 7.2, 0);
            expertContainer.add(labelSprite);

            // 4. Floating Routing Weight Badge Billboard (displays α_i when active)
            const weightSprite = this.createWeightSprite(expData);
            weightSprite.position.set(0, -6.8, 0);
            weightSprite.visible = false;
            expertContainer.add(weightSprite);

            // 5. Invisible Hitbox for mouse interaction
            const hitboxGeo = new THREE.CylinderGeometry(4.5, 4.5, 14, 16);
            const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
            const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
            hitbox.userData = { expertId: i, name: expData.name };
            expertContainer.add(hitbox);
            this.expertMeshes.push(hitbox);

            this.group.add(expertContainer);

            this.experts.push({
                data: expData,
                container: expertContainer,
                mlp: mlp,
                baseRing: baseRing,
                baseRingMat: baseRingMat,
                topRingMat: topRingMat,
                labelSprite: labelSprite,
                weightSprite: weightSprite,
                hitbox: hitbox,
                basePosition: new THREE.Vector3(x, y, z),
                angle: angle
            });
        }
    }

    createLabelSprite(expData) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 72;
        const ctx = canvas.getContext('2d');

        // Draw pill background
        ctx.fillStyle = 'rgba(10, 15, 26, 0.75)';
        ctx.roundRect(4, 4, 248, 64, 16);
        ctx.fill();

        // Neon border
        ctx.strokeStyle = expData.color;
        ctx.lineWidth = 3;
        ctx.roundRect(4, 4, 248, 64, 16);
        ctx.stroke();

        // Text
        ctx.font = 'bold 24px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`E${expData.id}: ${expData.shortName}`, 128, 28);

        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillStyle = expData.color;
        ctx.fillText(expData.domain, 128, 50);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(7.5, 2.1, 1);
        return sprite;
    }

    createWeightSprite(expData) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(6.0, 1.5, 1);

        sprite.userData = {
            canvas: canvas,
            ctx: canvas.getContext('2d'),
            texture: texture,
            color: expData.color
        };
        return sprite;
    }

    updateWeightSprite(expert, weight) {
        const sprite = expert.weightSprite;
        const { canvas, ctx, texture, color } = sprite.userData;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Glass pill
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(4, 4, 248, 56, 14);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.roundRect(4, 4, 248, 56, 14);
        ctx.stroke();

        // Text: α = 0.68 (68%)
        ctx.font = 'bold 22px "JetBrains Mono", monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const percent = Math.round(weight * 100);
        ctx.fillText(`α = ${weight.toFixed(3)} (${percent}%)`, 128, 32);

        texture.needsUpdate = true;
    }

    update(engineState, delta, time) {
        const activeIds = engineState.activeExpertIds || [];
        const weightsMap = {};
        for (const item of engineState.activeWeights || []) {
            weightsMap[item.expertId] = item.weight;
        }

        const isProcessing = engineState.tokenProgress >= 0.25 && engineState.tokenProgress <= 0.75;

        this.experts.forEach(exp => {
            const isActive = activeIds.includes(exp.data.id);
            const weight = weightsMap[exp.data.id] || 0.0;

            // Animate MLP network
            exp.mlp.setActive(isActive && isProcessing, weight, engineState.tokenProgress);
            exp.mlp.update(delta, time);

            if (isActive && isProcessing) {
                exp.baseRingMat.opacity = 0.6 + weight * 0.4;
                exp.topRingMat.opacity = 0.6 + weight * 0.4;
                exp.weightSprite.visible = true;
                this.updateWeightSprite(exp, weight);

                // Subtle levitation bob
                exp.container.position.y = Math.sin(time * 2 + exp.data.id) * 0.3;
            } else {
                exp.baseRingMat.opacity = 0.12;
                exp.topRingMat.opacity = 0.12;
                exp.weightSprite.visible = false;
                exp.container.position.y = 0;
            }
        });
    }

    getExpertPosition(id) {
        if (id >= 0 && id < this.experts.length) {
            return this.experts[id].basePosition;
        }
        return new THREE.Vector3();
    }
}
