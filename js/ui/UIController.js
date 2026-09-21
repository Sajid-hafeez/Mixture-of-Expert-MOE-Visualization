/**
 * UIController.js
 * Coordinates HUD controls, token selectors, camera mode triggers,
 * real-time Softmax distribution indicators, and mouse raycasting.
 */

import * as THREE from 'three';

export class UIController {
    constructor(engine, sceneManager, expertCluster, audioSynth) {
        this.engine = engine;
        this.sceneManager = sceneManager;
        this.expertCluster = expertCluster;
        this.audioSynth = audioSynth;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.setupDOMElements();
        this.bindEvents();
        this.subscribeEngine();
    }

    setupDOMElements() {
        // Preset chips
        this.chipsContainer = document.getElementById('token-chips');
        this.renderPresetChips();

        // Custom token input
        this.tokenInput = document.getElementById('custom-token-input');
        this.injectBtn = document.getElementById('btn-inject-token');

        // Playback controls
        this.btnPlayPause = document.getElementById('btn-play-pause');
        this.btnStep = document.getElementById('btn-step');
        this.speedSelect = document.getElementById('speed-select');

        // Sparsity / Top-K buttons
        this.topkButtons = document.querySelectorAll('.topk-btn');

        // Camera buttons
        this.camButtons = document.querySelectorAll('.cam-btn');

        // Audio toggle
        this.btnAudio = document.getElementById('btn-audio');

        // Metric badges
        this.metricSparsity = document.getElementById('metric-sparsity');
        this.metricFlops = document.getElementById('metric-flops');
        this.metricSpeedup = document.getElementById('metric-speedup');
        this.currentTokenLabel = document.getElementById('current-token-display');

        // Live Logits / Softmax bar container
        this.softmaxBarsContainer = document.getElementById('softmax-bars-container');
        this.renderSoftmaxBars();
    }

    renderPresetChips() {
        if (!this.chipsContainer) return;
        this.chipsContainer.innerHTML = '';

        this.engine.presetTokens.forEach((item, idx) => {
            const btn = document.createElement('button');
            btn.className = `chip-btn ${idx === 0 ? 'active' : ''}`;
            btn.innerHTML = `<span class="chip-icon">${item.icon}</span> <span class="chip-label">${item.label}</span>`;
            btn.title = item.text;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.engine.setToken(item);
                this.audioSynth.playRoutingPulse(520);
            });
            this.chipsContainer.appendChild(btn);
        });
    }

    renderSoftmaxBars() {
        if (!this.softmaxBarsContainer) return;
        this.softmaxBarsContainer.innerHTML = '';

        this.expertBarElements = [];
        this.engine.experts.forEach(exp => {
            const row = document.createElement('div');
            row.className = 'expert-row';
            row.id = `softmax-row-${exp.id}`;

            row.innerHTML = `
                <div class="row-header">
                    <span class="exp-badge" style="background: ${exp.color}22; color: ${exp.color}; border: 1px solid ${exp.color}66;">
                        E${exp.id}
                    </span>
                    <span class="exp-name">${exp.shortName}</span>
                    <span class="exp-val" id="val-${exp.id}">0.0%</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" id="fill-${exp.id}" style="background: ${exp.color};"></div>
                </div>
            `;

            row.addEventListener('click', () => {
                const pos = this.expertCluster.getExpertPosition(exp.id);
                this.sceneManager.cameraController.focusExpert(pos);
                this.highlightCamBtn('expert');
            });

            this.softmaxBarsContainer.appendChild(row);
            this.expertBarElements.push({
                row,
                fill: row.querySelector(`#fill-${exp.id}`),
                val: row.querySelector(`#val-${exp.id}`)
            });
        });
    }

    bindEvents() {
        // Inject custom token
        if (this.injectBtn && this.tokenInput) {
            const handleCustom = () => {
                const val = this.tokenInput.value.trim();
                if (val) {
                    document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
                    this.engine.setCustomToken(val);
                    this.audioSynth.playRoutingPulse(600);
                }
            };
            this.injectBtn.addEventListener('click', handleCustom);
            this.tokenInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleCustom();
            });
        }

        // Play/Pause
        if (this.btnPlayPause) {
            this.btnPlayPause.addEventListener('click', () => {
                this.engine.togglePlay();
                this.btnPlayPause.innerHTML = this.engine.isPlaying ? '⏸' : '▶';
                this.btnPlayPause.title = this.engine.isPlaying ? 'Pause' : 'Play';
            });
        }

        // Step
        if (this.btnStep) {
            this.btnStep.addEventListener('click', () => {
                if (this.engine.isPlaying) {
                    this.engine.togglePlay();
                    this.btnPlayPause.innerHTML = '▶';
                }
                this.engine.update(0.2); // Manual step
                this.engine.notify();
            });
        }

        // Speed
        if (this.speedSelect) {
            this.speedSelect.addEventListener('change', (e) => {
                this.engine.setSpeed(e.target.value);
            });
        }

        // Top-K buttons
        this.topkButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.topkButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const k = parseInt(btn.dataset.k, 10);
                this.engine.setTopK(k);
                this.audioSynth.playRoutingPulse(480);
            });
        });

        // Camera buttons
        this.camButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.camButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const preset = btn.dataset.cam;

                if (preset === 'expert') {
                    // Zoom into first active expert
                    const activeIds = this.engine.activeExpertIds;
                    const focusId = (activeIds && activeIds.length > 0) ? activeIds[0] : 0;
                    const pos = this.expertCluster.getExpertPosition(focusId);
                    this.sceneManager.cameraController.focusExpert(pos);
                } else {
                    this.sceneManager.cameraController.setPreset(preset);
                }
            });
        });

        // Audio toggle
        if (this.btnAudio) {
            this.btnAudio.addEventListener('click', () => {
                const isEnabled = this.audioSynth.toggle();
                this.btnAudio.classList.toggle('active', isEnabled);
                this.btnAudio.innerHTML = isEnabled ? '🔊' : '🔇';
                this.btnAudio.title = isEnabled ? 'Audio On' : 'Muted';
            });
        }

        // Mouse click on 3D canvas for raycasting experts
        window.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    }

    highlightCamBtn(name) {
        this.camButtons.forEach(b => {
            b.classList.toggle('active', b.dataset.cam === name);
        });
    }

    onPointerDown(event) {
        // Ignore clicks on HUD overlay
        if (event.target.closest('#hud-overlay')) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        const intersects = this.raycaster.intersectObjects(this.expertCluster.expertMeshes);

        if (intersects.length > 0) {
            const expId = intersects[0].object.userData.expertId;
            const pos = this.expertCluster.getExpertPosition(expId);
            this.sceneManager.cameraController.focusExpert(pos);
            this.highlightCamBtn('expert');
            this.audioSynth.playRoutingPulse(650);
        }
    }

    subscribeEngine() {
        this.engine.subscribe(state => this.updateHUD(state));
    }

    updateHUD(state) {
        // Update metric badges
        if (this.metricSparsity) {
            this.metricSparsity.textContent = `${state.topK} / 8 (${state.activeParamsPercent}%)`;
        }
        if (this.metricFlops) {
            this.metricFlops.textContent = `${state.flopsSavedPercent}%`;
        }
        if (this.metricSpeedup) {
            this.metricSpeedup.textContent = `${state.speedupMultiplier}×`;
        }
        if (this.currentTokenLabel && state.currentToken) {
            this.currentTokenLabel.textContent = `"${state.currentToken.text}"`;
        }

        // Update Softmax probability distribution bars
        const activeIds = state.activeExpertIds || [];
        const probs = state.softmaxProbabilities || [];

        this.expertBarElements.forEach((elem, idx) => {
            const isActive = activeIds.includes(idx);
            const prob = probs[idx] || 0.0;
            const percent = (prob * 100).toFixed(1);

            elem.row.classList.toggle('active-expert', isActive);
            elem.fill.style.width = `${Math.max(3, percent)}%`;
            elem.val.textContent = `${percent}%`;

            if (isActive) {
                elem.val.style.color = '#ffffff';
                elem.fill.style.opacity = '1.0';
            } else {
                elem.val.style.color = 'rgba(255, 255, 255, 0.4)';
                elem.fill.style.opacity = '0.25';
            }
        });
    }
}
