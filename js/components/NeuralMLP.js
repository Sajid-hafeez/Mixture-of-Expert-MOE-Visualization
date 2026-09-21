/**
 * NeuralMLP.js
 * Renders a 3D neural network Multi-Layer Perceptron (MLP) for an MoE Expert:
 * - Layer 1: Input / Gate Projection (d_model)
 * - Layer 2: Hidden Expansion Layer with SwiGLU Activation (d_ffn = 3.5x d_model)
 * - Layer 3: Down Projection Layer (d_model)
 * - Interconnecting synaptic lines that pulse with activation waves
 */

import * as THREE from 'three';

export class NeuralMLP {
    constructor(expertData, options = {}) {
        this.data = expertData;
        this.group = new THREE.Group();
        this.color = new THREE.Color(expertData.hexColor);
        this.dimColor = new THREE.Color(0x1e293b); // Slate-800 dormant color

        this.isActive = false;
        this.activationProgress = 0.0;
        this.glowIntensity = 0.0;

        // Configuration
        this.layerSpacing = 4.0; // Distance along local Y
        this.neurons = [];
        this.synapseLines = null;
        this.synapsePositions = [];
        this.synapseColors = [];

        this.buildNetwork();
    }

    buildNetwork() {
        // Representative 3D neural layer sizes
        const layerDefs = [
            { count: 4, label: "Input / Gate (d_model: 4096)", radius: 2.2, y: -this.layerSpacing },
            { count: 8, label: "SwiGLU Core (d_ffn: 14336)", radius: 3.6, y: 0.0 },
            { count: 4, label: "Down-Proj (d_model: 4096)", radius: 2.2, y: this.layerSpacing }
        ];

        this.layers = [];
        const neuronSphereGeo = new THREE.SphereGeometry(0.35, 16, 16);

        // Materials
        this.activeNeuronMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.8
        });

        this.dormantNeuronMaterial = new THREE.MeshStandardMaterial({
            color: 0x334155,
            emissive: 0x0f172a,
            emissiveIntensity: 0.1,
            roughness: 0.8,
            metalness: 0.2,
            transparent: true,
            opacity: 0.4
        });

        // Generate layers & neuron positions
        layerDefs.forEach((def, layerIdx) => {
            const layerNeurons = [];
            for (let i = 0; i < def.count; i++) {
                const angle = (i / def.count) * Math.PI * 2;
                const x = Math.cos(angle) * def.radius;
                const z = Math.sin(angle) * def.radius;
                const y = def.y;

                const mesh = new THREE.Mesh(neuronSphereGeo, this.dormantNeuronMaterial.clone());
                mesh.position.set(x, y, z);
                mesh.userData = {
                    baseScale: 1.0,
                    layerIdx: layerIdx,
                    angle: angle
                };

                this.group.add(mesh);
                layerNeurons.push(mesh);
                this.neurons.push(mesh);
            }
            this.layers.push(layerNeurons);
        });

        // Add SwiGLU Activation Torus around Layer 2 (Hidden Layer)
        const torusGeo = new THREE.TorusGeometry(3.9, 0.08, 12, 48);
        this.activationRingMat = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.15,
            wireframe: true
        });
        this.activationRing = new THREE.Mesh(torusGeo, this.activationRingMat);
        this.activationRing.rotation.x = Math.PI / 2;
        this.group.add(this.activationRing);

        // Build Synaptic Connections between Layer 0 -> Layer 1 and Layer 1 -> Layer 2
        this.buildSynapses();
    }

    buildSynapses() {
        const linePositions = [];
        const lineColors = [];

        // Connect Layer 0 to Layer 1 (Up-Projection)
        for (const n0 of this.layers[0]) {
            for (const n1 of this.layers[1]) {
                linePositions.push(n0.position.x, n0.position.y, n0.position.z);
                linePositions.push(n1.position.x, n1.position.y, n1.position.z);

                lineColors.push(0.1, 0.15, 0.22);
                lineColors.push(0.1, 0.15, 0.22);
            }
        }

        // Connect Layer 1 to Layer 2 (Down-Projection)
        for (const n1 of this.layers[1]) {
            for (const n2 of this.layers[2]) {
                linePositions.push(n1.position.x, n1.position.y, n1.position.z);
                linePositions.push(n2.position.x, n2.position.y, n2.position.z);

                lineColors.push(0.1, 0.15, 0.22);
                lineColors.push(0.1, 0.15, 0.22);
            }
        }

        const synapseGeo = new THREE.BufferGeometry();
        synapseGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        synapseGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

        this.synapseMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
            linewidth: 1
        });

        this.synapseLines = new THREE.LineSegments(synapseGeo, this.synapseMaterial);
        this.group.add(this.synapseLines);
    }

    setActive(active, weight = 1.0, progress = 0.0) {
        this.isActive = active;
        this.weight = weight;
        this.activationProgress = progress;

        const colorsAttr = this.synapseLines.geometry.attributes.color;
        const positionsAttr = this.synapseLines.geometry.attributes.position;
        const totalVertices = positionsAttr.count;

        if (active) {
            // Brighter activation proportional to routing weight
            const targetEmissive = 0.6 + weight * 0.8;
            this.activationRingMat.opacity = 0.3 + weight * 0.5;
            this.activationRingMat.wireframe = false;
            this.synapseMaterial.opacity = 0.4 + weight * 0.5;

            // Wave phase through layers: Layer 0 -> Layer 1 -> Layer 2
            // progress maps within [0.3, 0.7] of the token cycle
            const wavePhase = (progress - 0.3) / 0.4; // 0.0 to 1.0
            const waveLayer = wavePhase * 3.0; // 0 to 3

            this.layers.forEach((layer, lIdx) => {
                const layerDist = Math.abs(waveLayer - lIdx);
                const layerWave = Math.max(0, 1.0 - layerDist * 1.2);

                layer.forEach(neuron => {
                    neuron.material = this.activeNeuronMaterial;
                    const pulse = Math.sin(Date.now() * 0.006 + neuron.userData.angle) * 0.15 + 0.85;
                    const scale = (1.0 + layerWave * 0.6) * pulse;
                    neuron.scale.set(scale, scale, scale);
                    neuron.material.emissiveIntensity = targetEmissive * (1.0 + layerWave * 1.5);
                });
            });

            // Animate synapse colors with electric flow
            for (let i = 0; i < totalVertices; i += 2) {
                const y1 = positionsAttr.getY(i);
                const tNorm = (y1 + this.layerSpacing) / (2 * this.layerSpacing);
                const spark = Math.sin(tNorm * 10 - Date.now() * 0.015) > 0.4 ? 1.0 : 0.2;

                const r = this.color.r * spark * (0.5 + weight * 0.8);
                const g = this.color.g * spark * (0.5 + weight * 0.8);
                const b = this.color.b * spark * (0.5 + weight * 0.8);

                colorsAttr.setXYZ(i, r, g, b);
                colorsAttr.setXYZ(i + 1, r, g, b);
            }

            // Spin activation torus
            this.activationRing.rotation.z += 0.02 * (1.0 + weight);
        } else {
            // Dormant / Gated state: 0 FLOPs
            this.activationRingMat.opacity = 0.06;
            this.activationRingMat.wireframe = true;
            this.synapseMaterial.opacity = 0.08;

            this.neurons.forEach(neuron => {
                neuron.material = this.dormantNeuronMaterial;
                neuron.scale.set(1.0, 1.0, 1.0);
            });

            // Dim synapse lines to deep navy/black
            for (let i = 0; i < totalVertices; i++) {
                colorsAttr.setXYZ(i, 0.04, 0.08, 0.12);
            }
        }

        colorsAttr.needsUpdate = true;
    }

    update(delta, time) {
        if (this.isActive) {
            this.group.rotation.y += delta * 0.3;
        } else {
            this.group.rotation.y += delta * 0.05;
        }
    }
}
