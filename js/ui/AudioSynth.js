/**
 * AudioSynth.js
 * Generates ambient synthesizer soundscapes and neural activation chimes
 * using pure Web Audio API (zero external assets).
 */

export class AudioSynth {
    constructor() {
        this.ctx = null;
        this.isEnabled = false;
        this.masterGain = null;
        this.droneOsc = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.startAmbientDrone();
    }

    toggle() {
        if (!this.ctx) {
            this.init();
        }

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.isEnabled = !this.isEnabled;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.isEnabled ? 0.08 : 0.0, this.ctx.currentTime, 0.1);
        }
        return this.isEnabled;
    }

    startAmbientDrone() {
        if (!this.ctx) return;

        // Sub harmonic drone
        this.droneOsc = this.ctx.createOscillator();
        this.droneOsc.type = 'sine';
        this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(160, this.ctx.currentTime);

        this.droneOsc.connect(filter);
        filter.connect(this.masterGain);
        this.droneOsc.start();
    }

    playRoutingPulse(frequency = 440) {
        if (!this.isEnabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }
}
