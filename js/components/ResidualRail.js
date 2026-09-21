/**
 * ResidualRail.js
 * Visualizes:
 * - The Aggregator Node (Σ α_i · E_i(x)) at Y = +16
 * - The Residual / Skip-Connection Conduit bypassing the MoE layer (y = x + MoE(x))
 * - Input Emitter and Output Layer Ports
 */

import * as THREE from 'three';

export class ResidualRail {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.buildInputEmitter();
        this.buildAggregator();
        this.buildResidualConduit();
        this.buildOutputPort();
    }

    buildInputEmitter() {
        this.inputGroup = new THREE.Group();
        this.inputGroup.position.set(0, -28, 0);
        this.group.add(this.inputGroup);

        // Holographic ring emitter
        const ringGeo = new THREE.TorusGeometry(3.2, 0.12, 16, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        this.inputGroup.add(ring);

        // Concentric inner disc
        const discGeo = new THREE.RingGeometry(0.2, 2.5, 32);
        const discMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.rotation.x = Math.PI / 2;
        this.inputGroup.add(disc);

        // Title sprite
        const sprite = this.createTextSprite("INPUT EMBEDDING (x)", "x ∈ ℝ^{d_model}", "#00f0ff");
        sprite.position.set(0, -3.2, 0);
        this.inputGroup.add(sprite);
    }

    buildAggregator() {
        this.aggGroup = new THREE.Group();
        this.aggGroup.position.set(0, 16, 0);
        this.group.add(this.aggGroup);

        // Outer faceted collector sphere / octahedron
        const coreGeo = new THREE.OctahedronGeometry(2.4, 1);
        this.aggCoreMat = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.8
        });
        this.aggCore = new THREE.Mesh(coreGeo, this.aggCoreMat);
        this.aggGroup.add(this.aggCore);

        // Concentric convergence ring
        const ringGeo = new THREE.TorusGeometry(4.2, 0.1, 16, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.7 });
        this.aggRing = new THREE.Mesh(ringGeo, ringMat);
        this.aggRing.rotation.x = Math.PI / 2;
        this.aggGroup.add(this.aggRing);

        // Aggregator label sprite
        const sprite = this.createTextSprite("WEIGHTED AGGREGATOR", "y = ∑ αᵢ · Eᵢ(x)", "#10b981");
        sprite.position.set(0, 4.2, 0);
        this.aggGroup.add(sprite);
    }

    buildResidualConduit() {
        // Conduit curve bypassing the experts
        const pStart = new THREE.Vector3(0, -26, 0);
        const pOut1 = new THREE.Vector3(34, -20, 0);
        const pOut2 = new THREE.Vector3(36, 0, 0);
        const pOut3 = new THREE.Vector3(34, 14, 0);
        const pEnd = new THREE.Vector3(0, 18, 0);

        this.residualCurve = new THREE.CubicBezierCurve3(
            pStart,
            new THREE.Vector3(35, -15, 0),
            new THREE.Vector3(35, 15, 0),
            pEnd
        );

        // Subtle curved tube line
        const points = this.residualCurve.getPoints(50);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.35,
            linewidth: 2
        });
        this.residualLine = new THREE.Line(lineGeo, lineMat);
        this.group.add(this.residualLine);

        // Moving residual packet
        const packetGeo = new THREE.SphereGeometry(0.65, 16, 16);
        const packetMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x38bdf8,
            emissiveIntensity: 1.8,
            roughness: 0.2
        });
        this.residualPacket = new THREE.Mesh(packetGeo, packetMat);
        this.group.add(this.residualPacket);

        // Floating residual label billboard midway along curve
        const midPoint = this.residualCurve.getPoint(0.5);
        const resLabel = this.createTextSprite("RESIDUAL SKIP (+x)", "Identity connection", "#38bdf8");
        resLabel.position.copy(midPoint);
        resLabel.position.x += 4.5;
        this.group.add(resLabel);
    }

    buildOutputPort() {
        this.outputGroup = new THREE.Group();
        this.outputGroup.position.set(0, 28, 0);
        this.group.add(this.outputGroup);

        const ringGeo = new THREE.TorusGeometry(3.2, 0.12, 16, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        this.outputGroup.add(ring);

        const sprite = this.createTextSprite("NEXT TRANSFORMER LAYER", "Normalized tensor out", "#10b981");
        sprite.position.set(0, 3.2, 0);
        this.outputGroup.add(sprite);
    }

    createTextSprite(title, subtitle, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 384;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
        ctx.roundRect(4, 4, 376, 72, 16);
        ctx.fill();

        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 2;
        ctx.roundRect(4, 4, 376, 72, 16);
        ctx.stroke();

        ctx.font = 'bold 22px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, 192, 28);

        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillStyle = colorHex;
        ctx.fillText(subtitle, 192, 52);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(8.5, 2.0, 1);
        return sprite;
    }

    update(engineState, delta, time) {
        // Rotate aggregator octahedron
        this.aggCore.rotation.x += delta * 0.5;
        this.aggCore.rotation.y += delta * 0.7;
        this.aggRing.rotation.z -= delta * 0.4;

        // Flash aggregator when tokens are being collected (progress ~0.75 to 0.90)
        const isCollecting = engineState.tokenProgress >= 0.75 && engineState.tokenProgress <= 0.90;
        if (isCollecting) {
            const pulse = (Math.sin(time * 15) + 1) * 0.5;
            this.aggCoreMat.emissiveIntensity = 1.4 + pulse * 1.5;
            this.aggRing.scale.set(1.0 + pulse * 0.15, 1.0 + pulse * 0.15, 1.0 + pulse * 0.15);
        } else {
            this.aggCoreMat.emissiveIntensity = 0.6;
            this.aggRing.scale.set(1.0, 1.0, 1.0);
        }

        // Animate residual packet moving synchronously along the skip bypass (progress 0.10 to 0.88)
        if (engineState.tokenProgress >= 0.10 && engineState.tokenProgress <= 0.88) {
            this.residualPacket.visible = true;
            const t = (engineState.tokenProgress - 0.10) / 0.78;
            const pos = this.residualCurve.getPoint(t);
            this.residualPacket.position.copy(pos);
            const pulse = 1.0 + Math.sin(time * 12) * 0.2;
            this.residualPacket.scale.set(pulse, pulse, pulse);
        } else {
            this.residualPacket.visible = false;
        }
    }
}
