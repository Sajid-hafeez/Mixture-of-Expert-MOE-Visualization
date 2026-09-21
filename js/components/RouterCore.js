/**
 * RouterCore.js
 * Visualizes the Gating / Router Network (Sparse Dispatcher):
 * - Central icosahedral neural projection core (Wg)
 * - Softmax radar disk showing real-time logit bars and Top-K selection
 * - Laser gate emitters directing tokens to chosen experts
 */

import * as THREE from 'three';

export class RouterCore {
    constructor(scene, expertsData) {
        this.scene = scene;
        this.expertsData = expertsData;
        this.group = new THREE.Group();
        this.group.position.set(0, -15, 0);
        this.scene.add(this.group);

        this.radarBars = [];
        this.buildCore();
    }

    buildCore() {
        // 1. Inner Crystalline Core (Icosahedron)
        const innerGeo = new THREE.IcosahedronGeometry(2.4, 1);
        this.innerMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x0088ff,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.9,
            wireframe: false
        });
        this.innerCore = new THREE.Mesh(innerGeo, this.innerMat);
        this.group.add(this.innerCore);

        // 2. Outer Holographic Wireframe Cage (Dodecahedron)
        const outerGeo = new THREE.DodecahedronGeometry(3.6, 1);
        this.outerMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            wireframe: true,
            transparent: true,
            opacity: 0.35
        });
        this.outerCage = new THREE.Mesh(outerGeo, this.outerMat);
        this.group.add(this.outerCage);

        // 3. Rotating Projection Ring (representing Wg weight matrix)
        const ringGeo = new THREE.TorusGeometry(5.0, 0.08, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: 0.6
        });
        this.projRing1 = new THREE.Mesh(ringGeo, ringMat);
        this.projRing1.rotation.x = Math.PI / 2;
        this.group.add(this.projRing1);

        const ring2Geo = new THREE.TorusGeometry(5.6, 0.05, 16, 64);
        const ring2Mat = new THREE.MeshBasicMaterial({
            color: 0xa855f7,
            transparent: true,
            opacity: 0.4
        });
        this.projRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
        this.projRing2.rotation.y = Math.PI / 4;
        this.group.add(this.projRing2);

        // 4. Softmax Probability Radar Disk
        this.buildRadarDisk();

        // 5. Floating Router Title Badge
        this.buildTitleSprite();
    }

    buildRadarDisk() {
        const diskRadius = 7.0;
        this.radarGroup = new THREE.Group();
        this.radarGroup.position.y = 0;
        this.group.add(this.radarGroup);

        // Radar base circle
        const circleGeo = new THREE.RingGeometry(2.8, diskRadius + 1.2, 32);
        const circleMat = new THREE.MeshBasicMaterial({
            color: 0x0f172a,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const disk = new THREE.Mesh(circleGeo, circleMat);
        disk.rotation.x = Math.PI / 2;
        this.radarGroup.add(disk);

        // Circular grid lines
        for (let r = 4.0; r <= diskRadius; r += 1.8) {
            const gridRingGeo = new THREE.RingGeometry(r - 0.03, r + 0.03, 48);
            const gridRingMat = new THREE.MeshBasicMaterial({
                color: 0x334155,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            });
            const gridRing = new THREE.Mesh(gridRingGeo, gridRingMat);
            gridRing.rotation.x = Math.PI / 2;
            this.radarGroup.add(gridRing);
        }

        // 8 Radial Expert Spokes / Probability Bars
        const count = this.expertsData.length;
        for (let i = 0; i < count; i++) {
            const expData = this.expertsData[i];
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;

            // Spoke line
            const spokeGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(Math.cos(angle) * (diskRadius + 0.8), 0, Math.sin(angle) * (diskRadius + 0.8))
            ]);
            const spokeMat = new THREE.LineBasicMaterial({
                color: 0x1e293b,
                transparent: true,
                opacity: 0.6
            });
            const spoke = new THREE.Line(spokeGeo, spokeMat);
            this.radarGroup.add(spoke);

            // Logit amplitude cylinder / bar
            const barGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.0, 8);
            const barMat = new THREE.MeshStandardMaterial({
                color: expData.hexColor,
                emissive: expData.hexColor,
                emissiveIntensity: 0.3,
                roughness: 0.3
            });
            const bar = new THREE.Mesh(barGeo, barMat);
            bar.rotation.z = Math.PI / 2;
            bar.rotation.y = -angle;

            const targetPos = new THREE.Vector3(
                Math.cos(angle) * (diskRadius * 0.5),
                0.2,
                Math.sin(angle) * (diskRadius * 0.5)
            );
            bar.position.copy(targetPos);
            this.radarGroup.add(bar);

            this.radarBars.push({
                bar: bar,
                barMat: barMat,
                angle: angle,
                expertId: i,
                targetPos: targetPos,
                diskRadius: diskRadius
            });
        }
    }

    buildTitleSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 384;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
        ctx.roundRect(4, 4, 376, 72, 16);
        ctx.fill();

        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.roundRect(4, 4, 376, 72, 16);
        ctx.stroke();

        ctx.font = 'bold 24px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ROUTER / GATING NETWORK', 192, 28);

        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('Top-K Softmax(x · Wg)', 192, 52);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(9.0, 2.2, 1);
        sprite.position.set(0, -5.5, 0);
        this.group.add(sprite);
    }

    update(engineState, delta, time) {
        // Rotate internal crystalline core
        this.innerCore.rotation.x += delta * 0.4;
        this.innerCore.rotation.y += delta * 0.6;

        // Counter-rotate outer wireframe cage
        this.outerCage.rotation.x -= delta * 0.2;
        this.outerCage.rotation.y -= delta * 0.3;

        // Spin projection rings
        this.projRing1.rotation.z += delta * 0.5;
        this.projRing2.rotation.z -= delta * 0.4;

        // Router active pulse when token is at router (progress ~0.15 to 0.35)
        const isRoutingPhase = engineState.tokenProgress >= 0.15 && engineState.tokenProgress <= 0.35;
        const activeIds = engineState.activeExpertIds || [];
        const probs = engineState.softmaxProbabilities || [];

        if (isRoutingPhase) {
            const pulse = (Math.sin(time * 12) + 1) * 0.5;
            this.innerMat.emissiveIntensity = 1.0 + pulse * 1.5;
            this.outerMat.opacity = 0.6 + pulse * 0.3;
        } else {
            this.innerMat.emissiveIntensity = 0.4;
            this.outerMat.opacity = 0.25;
        }

        // Animate radar logit bars
        this.radarBars.forEach(item => {
            const isTopK = activeIds.includes(item.expertId);
            const prob = probs[item.expertId] || 0.0;
            const logit = engineState.rawLogits[item.expertId] || 0.1;

            // Height and distance based on logit value
            const length = Math.max(0.4, (isTopK ? 1.0 + prob * 3.5 : logit * 2.0));
            item.bar.scale.set(1.0, length, 1.0);

            const dist = 3.2 + length * 0.6;
            item.bar.position.x = Math.cos(item.angle) * dist;
            item.bar.position.z = Math.sin(item.angle) * dist;

            if (isTopK && isRoutingPhase) {
                item.barMat.emissiveIntensity = 1.8;
            } else if (isTopK) {
                item.barMat.emissiveIntensity = 0.9;
            } else {
                item.barMat.emissiveIntensity = 0.15;
            }
        });
    }

    getWorldPosition() {
        const v = new THREE.Vector3();
        this.group.getWorldPosition(v);
        return v;
    }
}
