import { AudioRecorder } from "./audio-recorder";

// jsdom has no MediaRecorder/getUserMedia implementation, so both are stubbed here just enough
// to drive AudioRecorder's own state machine - this is a unit test of AudioRecorder itself, not
// of real microphone/codec behavior.
class FakeMediaRecorder {
	state: "inactive" | "recording" = "recording";
	stream: MediaStream;
	private listeners: Record<string, (() => void)[]> = {};

	constructor(stream: MediaStream) {
		this.stream = stream;
	}

	addEventListener(event: string, listener: () => void) {
		this.listeners[event] ??= [];
		this.listeners[event].push(listener);
	}

	start() {
		this.state = "recording";
	}

	stop() {
		this.state = "inactive";
		(this.listeners.stop ?? []).forEach((listener) => listener());
	}
}

describe("AudioRecorder", () => {
	let tracks: { stop: ReturnType<typeof vi.fn> }[];
	let stream: MediaStream;

	beforeEach(() => {
		tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
		stream = { getTracks: () => tracks } as unknown as MediaStream;

		vi.stubGlobal("navigator", {
			mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
		});
		vi.stubGlobal(
			"MediaRecorder",
			Object.assign(FakeMediaRecorder, { isTypeSupported: vi.fn().mockReturnValue(true) })
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("stop", () => {
		it("should release every track of the stream", async () => {
			const recorder = new AudioRecorder();
			await recorder.start();

			await recorder.stop();

			tracks.forEach((track) => expect(track.stop).toHaveBeenCalledTimes(1));
		});
	});

	describe("dispose", () => {
		it("should release the microphone for a recording that was never stopped", async () => {
			const recorder = new AudioRecorder();
			await recorder.start();

			recorder.dispose();

			tracks.forEach((track) => expect(track.stop).toHaveBeenCalledTimes(1));
		});

		it("should be a no-op when start() was never called", () => {
			const recorder = new AudioRecorder();

			expect(() => recorder.dispose()).not.toThrow();
		});

		it("should be safe to call after stop() already released the stream", async () => {
			const recorder = new AudioRecorder();
			await recorder.start();
			await recorder.stop();

			recorder.dispose();

			tracks.forEach((track) => expect(track.stop).toHaveBeenCalledTimes(1));
		});

		it("should be safe to call twice in a row", async () => {
			const recorder = new AudioRecorder();
			await recorder.start();

			recorder.dispose();
			recorder.dispose();

			tracks.forEach((track) => expect(track.stop).toHaveBeenCalledTimes(1));
		});
	});
});
