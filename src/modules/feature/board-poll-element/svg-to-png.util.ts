// Rasterizes an inline <svg> element (as produced by PollChart.vue) to a PNG Blob, for the PDF
// export (poll-export.util.ts embeds the PNG via pdf-lib's embedPng - pdf-lib can't embed SVG
// directly). No new dependency and no network access needed: the SVG is serialized to a
// data:image/svg+xml URL, which does not taint the canvas, so canvas.toBlob() works without any
// CORS concerns.
//
// Deliberately not unit-tested: jsdom doesn't implement canvas 2d context or Image decoding in a
// way that would make a test here meaningful (see the plan's explicit "no unit test" call for
// this file). Manually verified in a real browser instead.

const RENDER_SCALE = 2;

export const svgToPng = (svg: SVGSVGElement): Promise<Blob> => {
	const width = svg.width.baseVal.value || Number(svg.getAttribute("width")) || 320;
	const height = svg.height.baseVal.value || Number(svg.getAttribute("height")) || 180;

	const serializer = new XMLSerializer();
	const svgString = serializer.serializeToString(svg);
	const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;

	return new Promise<Blob>((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = width * RENDER_SCALE;
			canvas.height = height * RENDER_SCALE;

			const context = canvas.getContext("2d");
			if (!context) {
				reject(new Error("Canvas 2D context is not available"));
				return;
			}

			context.scale(RENDER_SCALE, RENDER_SCALE);
			context.drawImage(image, 0, 0, width, height);

			canvas.toBlob((blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("Canvas could not be converted to a PNG blob"));
				}
			}, "image/png");
		};
		image.onerror = () => reject(new Error("Could not load the SVG as an image for rasterization"));
		image.src = svgDataUrl;
	});
};
