/**
 * ParticleConduits.js
 * Renders glowing energy beams, laser conduits, and flowing token packets
 * connecting the Input, Router, Active Experts, Aggregator, and Output.
 */

import * as THREE from 'three';

export class ParticleConduits {
    constructor(scene, expertsData) {
        this.scene = scene;
        this.expertsData = expertsData;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Key pipeline node heights
        this.yInput = -28.0;
        this.yRouter = -15.0;
        this.yExpertBase = -5.0;
        this.yExpertTop = 5.0;
        this.yAggregator = 16.0;
        this.yOutput = 28.0;

        this.orbitRadius = 26.0;

        // Curve paths
        this.routerToExpertCurves = [];
        this.expertToAggCurves = [];

        this.laserBeams = [];
        this.flowParticles = [];

        this.buildStaticPathways();
        this.buildMovingTokenPackets();
    }

    buildStaticPathways() {
        const count = this.expertsData.length;

        // 1. Input to Router central tube
        const inputLineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, this.yInput, 0),
            new THREE.Vector3(0, this.yRouter, 0)
        ]);
        const inputLineMat = new THREE.LineBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.6
        });
        this.inputLine = new THREE.Line(inputLineGeo, inputLineMat);
        this.group.add(this.inputLine);

        // 2. Router -> Each Expert & Expert -> Aggregator Curves
        for (let i = 0; i < count; i++) {
            const exp = this.expertsData[i];
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const expX = Math.cos(angle) * this.orbitRadius;
            const expZ = Math.sin(angle) * this.orbitRadius;

            // Router -> Expert (Quadratic or Cubic Bezier curve)
            const rStart = new THREE.Vector3(0, this.yRouter + 1.0, 0);
            const rMid = new THREE.Vector3(expX * 0.35, (this.yRouter + this.yExpertBase) * 0.5, expZ * 0.35);
            const rEnd = new THREE.Vector3(expX, this.yExpertBase, expZ);
            const rCurve = new THREE.QuadraticBezierCurve3(rStart, rMid, rEnd);
            this.routerToExpertCurves.push(rCurve);

            // Expert -> Aggregator
            const aStart = new THREE.Vector3(expX, this.yExpertTop, expZ);
            const aMid = new THREE.Vector3(expX * 0.35, (this.yExpertTop + this.yAggregator) * 0.5, expZ * 0.35);
            const aEnd = new THREE.Vector3(0, this.yAggregator - 1.0, 0);
            const aCurve = new THREE.QuadraticBezierCurve3(aStart, aMid, aEnd);
            this.expertToAggCurves.push(aCurve);

            // Visual guide line for Router -> Expert
            const rPoints = rCurve.getPoints(24);
            const rGeo = new THREE.BufferGeometry().setFromPoints(rPoints);
            const rMat = new THREE.LineBasicMaterial({
                color: exp.hexColor,
                transparent: true,
                opacity: 0.15
            });
            const rLine = new THREE.Line(rGeo, rMat);
            this.group.add(rLine);

            // Visual guide line for Expert -> Aggregator
            const aPoints = aCurve.getPoints(24);
            const aGeo = new THREE.BufferGeometry().setFromPoints(aPoints);
            const aMat = new THREE.LineBasicMaterial({
                color: exp.hexColor,
                transparent: true,
                opacity: 0.15
            });
            const aLine = new THREE.Line(aGeo, aMat);
            this.group.add(aLine);

            this.laserBeams.push({
                expertId: i,
                rCurve: rCurve,
                aCurve: aCurve,
                rLine: rLine,
                rMat: rMat,
                aLine: aLine,
                aMat: aMat,
                color: exp.hexColor
            });
        }

        // 3. Aggregator to Output central tube
        const outputLineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, this.yAggregator, 0),
            new THREE.Vector3(0, this.yOutput, 0)
        ]);
        const outputLineMat = new THREE.LineBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.6
        });
        this.outputLine = new THREE.Line(outputLineGeo, outputLineMat);
        this.group.add(this.outputLine);
    }

    buildMovingTokenPackets() {
        // Main glowing input token packet
        const packetGeo = new THREE.SphereGeometry(0.85, 20, 20);
        this.packetMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 2.0,
            roughness: 0.1
        });
        this.mainPacket = new THREE.Mesh(packetGeo, this.packetMat);
        this.group.add(this.mainPacket);

        // Dispatched sub-packets (one for each of the active experts)
        this.subPackets = [];
        for (let i = 0; i < 8; i++) {
            const subGeo = new THREE.SphereGeometry(0.65, 16, 16);
            const subMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 1.5,
                roughness: 0.1
            });
            const subMesh = new THREE.Mesh(subGeo, subMat);
            subMesh.visible = false;
            this.group.add(subMesh);
            this.subPackets.push({ mesh: subMesh, mat: subMat });
        }

        // Output combined packet
        this.outputPacketMat = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x10b981,
            emissiveIntensity: 2.0,
            roughness: 0.1
        });
        this.outputPacket = new THREE.Mesh(packetGeo.clone(), this.outputPacketMat);
        this.outputPacket.visible = false;
        this.group.add(this.outputPacket);
    }

    update(engineState, delta, time) {
        const progress = engineState.tokenProgress; // 0.0 to 1.0
        const activeIds = engineState.activeExpertIds || [];
        const weightsMap = {};
        for (const item of engineState.activeWeights || []) {
            weightsMap[item.expertId] = item.weight;
        }

        // Update Laser Beam materials based on active state
        this.laserBeams.forEach(beam => {
            const isActive = activeIds.includes(beam.expertId);
            const weight = weightsMap[beam.expertId] || 0.0;

            if (isActive) {
                // Flash / illuminate conduits during router dispatch & aggregation
                const isDispatch = progress >= 0.22 && progress <= 0.45;
                const isCollect = progress >= 0.65 && progress <= 0.85;

                beam.rMat.opacity = isDispatch ? (0.7 + weight * 0.3) : 0.35;
                beam.aMat.opacity = isCollect ? (0.7 + weight * 0.3) : 0.35;
            } else {
                beam.rMat.opacity = 0.06;
                beam.aMat.opacity = 0.06;
            }
        });

        // Hide all subpackets by default
        this.subPackets.forEach(sp => { sp.mesh.visible = false; });
        this.mainPacket.visible = false;
        this.outputPacket.visible = false;

        // Stage 1: Input to Router (0.0 to 0.22)
        if (progress < 0.22) {
            this.mainPacket.visible = true;
            const t = progress / 0.22;
            const y = THREE.MathUtils.lerp(this.yInput, this.yRouter, t);
            this.mainPacket.position.set(0, y, 0);

            const pulse = 1.0 + Math.sin(time * 15) * 0.2;
            this.mainPacket.scale.set(pulse, pulse, pulse);
        }
        // Stage 2: Router Decision (0.22 to 0.30)
        else if (progress >= 0.22 && progress < 0.30) {
            this.mainPacket.visible = true;
            this.mainPacket.position.set(0, this.yRouter, 0);
            const burst = 1.0 + (progress - 0.22) * 8.0;
            this.mainPacket.scale.set(burst, burst, burst);
        }
        // Stage 3: Dispatched to Experts (0.30 to 0.50)
        else if (progress >= 0.30 && progress < 0.50) {
            const t = (progress - 0.30) / 0.20; // 0.0 to 1.0 along router -> expert curve

            activeIds.forEach((expId, idx) => {
                const sub = this.subPackets[idx];
                if (!sub) return;

                const curve = this.routerToExpertCurves[expId];
                if (curve) {
                    sub.mesh.visible = true;
                    const pos = curve.getPoint(t);
                    sub.mesh.position.copy(pos);

                    const exp = this.expertsData[expId];
                    sub.mat.color.set(exp.hexColor);
                    sub.mat.emissive.set(exp.hexColor);
                    const weight = weightsMap[expId] || 0.5;
                    const sz = 0.5 + weight * 0.4;
                    sub.mesh.scale.set(sz, sz, sz);
                }
            });
        }
        // Stage 4: Processing within Expert MLP (0.50 to 0.70)
        else if (progress >= 0.50 && progress < 0.70) {
            const t = (progress - 0.50) / 0.20; // 0.0 to 1.0 through MLP

            activeIds.forEach((expId, idx) => {
                const sub = this.subPackets[idx];
                if (!sub) return;

                const angle = (expId / this.expertsData.length) * Math.PI * 2 - Math.PI / 2;
                const expX = Math.cos(angle) * this.orbitRadius;
                const expZ = Math.sin(angle) * this.orbitRadius;
                const y = THREE.MathUtils.lerp(this.yExpertBase, this.yExpertTop, t);

                sub.mesh.visible = true;
                sub.mesh.position.set(expX, y, expZ);

                const exp = this.expertsData[expId];
                sub.mat.color.set(exp.hexColor);
                sub.mat.emissive.set(exp.hexColor);
            });
        }
        // Stage 5: Expert -> Aggregator (0.70 to 0.88)
        else if (progress >= 0.70 && progress < 0.88) {
            const t = (progress - 0.70) / 0.18; // 0.0 to 1.0 along expert -> aggregator curve

            activeIds.forEach((expId, idx) => {
                const sub = this.subPackets[idx];
                if (!sub) return;

                const curve = this.expertToAggCurves[expId];
                if (curve) {
                    sub.mesh.visible = true;
                    const pos = curve.getPoint(t);
                    sub.mesh.position.copy(pos);

                    const exp = this.expertsData[expId];
                    sub.mat.color.set(exp.hexColor);
                    sub.mat.emissive.set(exp.hexColor);
                    const weight = weightsMap[expId] || 0.5;
                    const sz = 0.5 + weight * 0.4;
                    sub.mesh.scale.set(sz, sz, sz);
                }
            });
        }
        // Stage 6: Aggregator Combined Output (0.88 to 1.0)
        else if (progress >= 0.88) {
            this.outputPacket.visible = true;
            const t = (progress - 0.88) / 0.12;
            const y = THREE.MathUtils.lerp(this.yAggregator, this.yOutput, t);
            this.outputPacket.position.set(0, y, 0);

            const pulse = 1.0 + Math.sin(time * 20) * 0.15;
            this.outputPacket.scale.set(pulse, pulse, pulse);
        }
    }
}
