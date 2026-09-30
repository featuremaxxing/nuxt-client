// Plays a Windows-95-style startup chime once per login session.
// The sound is synthesized via Web Audio (no copyrighted sample shipped).
// logout clears localStorage, so the marker resets on the next login.
const PLAYED_KEY = "kibox-startup-sound-played";

// Warm pad chord (Eb major add9) with a rising sparkle arpeggio on top
const PAD_FREQUENCIES = [155.56, 196.0, 233.08, 311.13, 349.23];
const SPARKLE_FREQUENCIES = [622.25, 783.99, 932.33, 1244.51];

const playTone = (
	ctx: AudioContext,
	destination: AudioNode,
	frequency: number,
	start: number,
	duration: number,
	peak: number,
	type: OscillatorNode["type"]
) => {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = type;
	osc.frequency.value = frequency;
	gain.gain.setValueAtTime(0, start);
	gain.gain.linearRampToValueAtTime(peak, start + duration * 0.3);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
	osc.connect(gain).connect(destination);
	osc.start(start);
	osc.stop(start + duration);
};

export const playStartupSound = async () => {
	const ctx = new AudioContext();
	await ctx.resume();

	const master = ctx.createGain();
	master.gain.value = 0.25;
	master.connect(ctx.destination);

	const now = ctx.currentTime;
	PAD_FREQUENCIES.forEach((f, i) => playTone(ctx, master, f, now + i * 0.08, 4.5, 0.18, "triangle"));
	SPARKLE_FREQUENCIES.forEach((f, i) => playTone(ctx, master, f, now + 0.6 + i * 0.35, 2.2, 0.08, "sine"));

	setTimeout(() => ctx.close(), 5000);
};

export const playStartupSoundOnFreshLogin = () => {
	try {
		if (localStorage.getItem(PLAYED_KEY)) return;
		localStorage.setItem(PLAYED_KEY, "1");
		// Browsers may block audio without prior user interaction; failing silently is fine
		playStartupSound().catch(() => undefined);
	} catch {
		// AudioContext or localStorage unavailable
	}
};
