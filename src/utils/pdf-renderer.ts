// Thin, lazily-loaded wrapper around pdfjs-dist. The library (and its worker) is
// only fetched when a PDF is actually viewed or annotated, keeping it out of the
// application's main bundle.

import type { PDFDocumentProxy } from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

export const MAX_RENDER_DIMENSION = 2400;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | undefined;

const getPdfjs = (): Promise<typeof import("pdfjs-dist")> => {
	pdfjsPromise ??= import("pdfjs-dist").then((lib) => {
		// the worker runs as a bundled Vite chunk (correct js mime type); serving the
		// raw .mjs via nginx would fail the browser's strict module mime check
		lib.GlobalWorkerOptions.workerPort = new PdfWorker();

		return lib;
	});

	return pdfjsPromise;
};

export const loadPdf = async (data: ArrayBuffer): Promise<PDFDocumentProxy> => {
	const lib = await getPdfjs();

	return lib.getDocument({ data }).promise;
};

export interface RenderedPageSize {
	width: number;
	height: number;
}

// Renders one page (1-based, pdfjs convention) into the canvas, sized to the device
// pixel ratio but capped so large pages do not exceed iOS canvas memory limits.
export const renderPdfPageToCanvas = async (
	pdf: PDFDocumentProxy,
	pageNumber: number,
	canvas: HTMLCanvasElement
): Promise<RenderedPageSize> => {
	const page = await pdf.getPage(pageNumber);
	const baseViewport = page.getViewport({ scale: 1 });
	const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
	const scale = Math.min(
		MAX_RENDER_DIMENSION / baseViewport.width,
		MAX_RENDER_DIMENSION / baseViewport.height,
		2 * dpr
	);
	const viewport = page.getViewport({ scale });

	canvas.width = Math.floor(viewport.width);
	canvas.height = Math.floor(viewport.height);

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("canvas 2d context unavailable");
	}

	await page.render({ canvasContext: context, viewport }).promise;

	return { width: canvas.width, height: canvas.height };
};
