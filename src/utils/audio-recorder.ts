// Small wrapper around the browser MediaRecorder API for teacher audio feedback.
// No external dependency; the produced blob is uploaded like any other file.
// Safari only supports audio/mp4 (no webm), so the first working mime type wins.
const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

export class AudioRecorder {
	private recorder: MediaRecorder | undefined;
	private chunks: Blob[] = [];
	private mimeType = "";

	static isSupported(): boolean {
		return typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
	}

	static getExtension(mimeType: string): string {
		if (mimeType.includes("mp4")) {
			return "m4a";
		}
		if (mimeType.includes("ogg")) {
			return "ogg";
		}
		return "webm";
	}

	async start(): Promise<void> {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		this.mimeType = PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
		this.chunks = [];
		this.recorder = new MediaRecorder(stream, this.mimeType ? { mimeType: this.mimeType } : undefined);
		this.recorder.addEventListener("dataavailable", (event) => {
			if (event.data.size > 0) {
				this.chunks.push(event.data);
			}
		});
		this.recorder.start();
	}

	async stop(): Promise<Blob> {
		const recorder = this.recorder;
		if (!recorder || recorder.state === "inactive") {
			throw new Error("AudioRecorder is not recording");
		}

		const stopped = new Promise<void>((resolve) => recorder.addEventListener("stop", () => resolve(), { once: true }));
		recorder.stop();
		await stopped;
		this.releaseStream(recorder);

		return new Blob(this.chunks, { type: this.mimeType || "audio/webm" });
	}

	// Releases the microphone even when a recording was never stopped normally - discarding a
	// still-running recording, or starting a second one that replaces this instance, must not
	// leave the browser's "microphone in use" indicator lit forever. Safe to call more than
	// once, and safe to call when start() was never called (no-op then).
	dispose(): void {
		if (!this.recorder) {
			return;
		}

		if (this.recorder.state !== "inactive") {
			this.recorder.stop();
		}
		this.releaseStream(this.recorder);
	}

	private releaseStream(recorder: MediaRecorder): void {
		recorder.stream.getTracks().forEach((track) => track.stop());
		this.recorder = undefined;
	}
}
