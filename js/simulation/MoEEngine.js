/**
 * MoEEngine.js
 * Simulates Mixture of Experts (MoE) token dynamics, router weight projections,
 * Top-K sparse gating, and neural activation stages.
 */

export class MoEEngine {
    constructor() {
        // 8 Specialized Experts
        this.experts = [
            {
                id: 0,
                name: "Syntax & Grammar",
                shortName: "SYNTAX",
                domain: "Linguistics & Parsing",
                color: "#38bdf8", // Sky Blue
                hexColor: 0x38bdf8,
                dModel: 4096,
                dFFN: 14336,
                activation: "SwiGLU",
                affinityWeights: { code: 0.2, math: 0.1, literature: 0.85, translation: 0.75, logic: 0.3 }
            },
            {
                id: 1,
                name: "Logic & Deduction",
                shortName: "LOGIC",
                domain: "Formal Reasoning",
                color: "#818cf8", // Indigo
                hexColor: 0x818cf8,
                dModel: 4096,
                dFFN: 14336,
                activation: "SwiGLU",
                affinityWeights: { code: 0.6, math: 0.7, literature: 0.1, translation: 0.2, logic: 0.95 }
            },
            {
                id: 2,
                name: "Mathematical Core",
                shortName: "MATH",
                domain: "Calculus & Geometry",
                color: "#f59e0b", // Amber
                hexColor: 0xf59e0b,
                dModel: 4096,
                dFFN: 14336,
                activation: "SwiGLU",
                affinityWeights: { code: 0.5, math: 0.98, literature: 0.05, translation: 0.1, logic: 0.85 }
            },
            {
                id: 3,
                name: "Code & Algorithms",
                shortName: "CODE",
                domain: "Syntactic Execution",
                color: "#10b981", // Emerald
                hexColor: 0x10b981,
                dModel: 4096,
                dFFN: 14336,
                activation: "SwiGLU",
                affinityWeights: { code: 0.98, math: 0.6, literature: 0.05, translation: 0.15, logic: 0.7 }
            },
            {
                id: 4,
                name: "Creative & Stylistics",
                shortName: "CREATIVE",
                domain: "Nuance & Metaphor",
                color: "#ec4899", // Pink/Fuchsia
                hexColor: 0xec4899,
                dModel: 4096,
                dFFN: 14336,
                activation: "SwiGLU",
                affinityWeights: { code: 0.05, math: 0.05, literature: 0.96, translation: 0.4, logic: 0.15 }
            },
            {
                id: 5,
                name: "Knowledge Retrieval",
                shortName: "FACTS",
                domain: "Factual Memory",
                color: "#a855f7", // Purple
                hexColor: 0xa855f7,
                dModel: 4096,
                dFFN: 14336,
                activation: "SwiGLU",
                affinityWeights: { code: 0.4, math: 0.4, literature: 0.5, translation: 0.6, logic: 0.6 }
            },
            {
                id: 6,
                name: "Multilingual Latents",
                shortName: "TRANSLATE",
                domain: "Cross-Lingual Vectors",
                color: "#06b6d4", // Cyan
                hexColor: 0x06b6d4,
                dModel: 4096,
                dFFN: 14336,
                activation: "SwiGLU",
                affinityWeights: { code: 0.2, math: 0.1, literature: 0.6, translation: 0.98, logic: 0.2 }
            },
            {
                id: 7,
                name: "Context & Spatial",
                shortName: "CONTEXT",
                domain: "Long-Range Attention",
                color: "#22c55e", // Bright Green
                hexColor: 0x22c55e,
                dModel: 4096,
                dFFN: 14336,
                activation: "SwiGLU",
                affinityWeights: { code: 0.4, math: 0.3, literature: 0.4, translation: 0.3, logic: 0.5 }
            }
        ];

        // Simulation parameters
        this.topK = 2; // Default Top-2 sparse routing (Mixtral 8x7B style)
        this.speed = 1.0;
        this.isPlaying = true;

        // Current active state
        this.currentToken = null;
        this.rawLogits = new Float32Array(8);
        this.softmaxProbabilities = new Float32Array(8);
        this.activeExpertIds = []; // Indices of topK active experts
        this.activeWeights = [];    // Normalized gating weights (alpha_i)

        // Preset prompts with realistic token properties
        this.presetTokens = [
            {
                text: "def fibonacci(n):",
                category: "code",
                label: "Python Code",
                icon: "💻"
            },
            {
                text: "∇ × B = μ₀(J + ε₀ ∂E/∂t)",
                category: "math",
                label: "Maxwell's Equations",
                icon: "📐"
            },
            {
                text: "The twilight whispered to silent waters",
                category: "literature",
                label: "Poetic Prose",
                icon: "📜"
            },
            {
                text: "Bonjour! Comment allez-vous aujourd'hui?",
                category: "translation",
                label: "Multilingual",
                icon: "🌍"
            },
            {
                text: "If all P implies Q, and Q is false, then P is false",
                category: "logic",
                label: "Modus Tollens",
                icon: "🧠"
            }
        ];

        // Lifecycle progress of current token:
        // 0.0 to 0.2: Emitter -> Router
        // 0.2 to 0.3: Router Gating Calculation & Top-K Softmax selection
        // 0.3 to 0.7: Dispatched to Active Experts & MLP Synapse traversal
        // 0.7 to 0.9: Aggregation & Weighted Sum Recombination
        // 0.9 to 1.0: Residual Connection Merge & Output
        this.tokenProgress = 0.0;
        this.tokenCycleDuration = 4.0; // seconds for one full cycle at 1x speed

        // Listeners for state change
        this.listeners = [];

        // Set initial token
        this.setToken(this.presetTokens[0]);
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify() {
        const state = this.getState();
        for (const cb of this.listeners) {
            cb(state);
        }
    }

    setTopK(k) {
        this.topK = Math.min(Math.max(parseInt(k, 10), 1), 8);
        this.computeRouting();
        this.notify();
    }

    setSpeed(speedVal) {
        this.speed = parseFloat(speedVal);
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        this.notify();
    }

    setToken(tokenObj) {
        this.currentToken = tokenObj;
        this.computeRouting();
        this.tokenProgress = 0.0; // Reset cycle on new token
        this.notify();
    }

    setCustomToken(text) {
        if (!text || text.trim().length === 0) return;
        
        // Infer category based on text content heuristics
        const lower = text.toLowerCase();
        let category = "logic";
        if (/def |function|var |const |class |import |\{|\}|\(\)|=>|return/.test(text)) {
            category = "code";
        } else if (/\+|-|\*|\/|=|<|>|∫|∑|√|π|sin|cos|matrix|equation|\d+\s*[\+\-\*\/]/.test(text)) {
            category = "math";
        } else if (/bonjour|hola|ciao|danke|merci|gracias|der|die|das|le|la|les/.test(lower)) {
            category = "translation";
        } else if (/poem|whisper|love|twilight|stars|heart|dream|beauty|shadow/.test(lower)) {
            category = "literature";
        }

        const tokenObj = {
            text: text.length > 32 ? text.substring(0, 32) + "…" : text,
            category,
            label: "Custom Prompt",
            icon: "✨"
        };
        this.setToken(tokenObj);
    }

    /**
     * Computes realistic router logits:
     * h_i = x · W_g,i + noise
     * Followed by Top-K sparse masking and Softmax normalization
     */
    computeRouting() {
        if (!this.currentToken) return;

        const category = this.currentToken.category || "logic";

        // Seeded random variation based on token text
        let hash = 0;
        for (let i = 0; i < this.currentToken.text.length; i++) {
            hash = (hash << 5) - hash + this.currentToken.text.charCodeAt(i);
            hash |= 0;
        }

        for (let i = 0; i < 8; i++) {
            const exp = this.experts[i];
            const baseAffinity = exp.affinityWeights[category] || 0.3;
            // Deterministic micro-variance for this exact token
            const pseudoNoise = ((Math.sin(hash + i * 43.12) + 1) * 0.5) * 0.3 - 0.15;
            this.rawLogits[i] = Math.max(0.01, baseAffinity + pseudoNoise);
        }

        // Identify Top-K expert indices
        const indexedLogits = Array.from(this.rawLogits).map((logit, idx) => ({ idx, logit }));
        indexedLogits.sort((a, b) => b.logit - a.logit);

        const selected = indexedLogits.slice(0, this.topK);
        this.activeExpertIds = selected.map(item => item.idx);

        // Compute Softmax over the Top-K active logits
        // In MoE: non-top-k logits are set to -infinity, so Softmax is normalized strictly over selected K
        let sumExp = 0;
        const expVals = {};
        for (const item of selected) {
            const expVal = Math.exp(item.logit * 2.5); // Temperature scaling for distinct gating
            expVals[item.idx] = expVal;
            sumExp += expVal;
        }

        this.softmaxProbabilities.fill(0);
        this.activeWeights = [];

        for (let i = 0; i < 8; i++) {
            if (expVals[i] !== undefined) {
                const prob = expVals[i] / sumExp;
                this.softmaxProbabilities[i] = prob;
            } else {
                this.softmaxProbabilities[i] = 0;
            }
        }

        for (const expId of this.activeExpertIds) {
            this.activeWeights.push({
                expertId: expId,
                weight: this.softmaxProbabilities[expId]
            });
        }
    }

    update(deltaSeconds) {
        if (!this.isPlaying) return;

        const deltaProgress = (deltaSeconds * this.speed) / this.tokenCycleDuration;
        this.tokenProgress = (this.tokenProgress + deltaProgress) % 1.0;
    }

    getState() {
        return {
            experts: this.experts,
            currentToken: this.currentToken,
            presetTokens: this.presetTokens,
            topK: this.topK,
            speed: this.speed,
            isPlaying: this.isPlaying,
            tokenProgress: this.tokenProgress,
            rawLogits: Array.from(this.rawLogits),
            softmaxProbabilities: Array.from(this.softmaxProbabilities),
            activeExpertIds: this.activeExpertIds,
            activeWeights: this.activeWeights,
            // Metrics
            activeParamsPercent: Math.round((this.topK / 8) * 100),
            flopsSavedPercent: Math.round(((8 - this.topK) / 8) * 100),
            speedupMultiplier: (8 / this.topK).toFixed(1)
        };
    }
}
