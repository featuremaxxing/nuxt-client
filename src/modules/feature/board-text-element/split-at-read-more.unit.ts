import { splitAtReadMore } from "./split-at-read-more";

const MARKER = '<figure class="read-more"></figure>';

describe("splitAtReadMore", () => {
	it("should keep everything in intro when there is no marker", () => {
		expect(splitAtReadMore("<p>a</p><p>b</p>")).toEqual({ intro: "<p>a</p><p>b</p>", more: "" });
	});

	it("should split at the marker and drop it", () => {
		expect(splitAtReadMore(`<p>a</p>${MARKER}<p>b</p><p>c</p>`)).toEqual({
			intro: "<p>a</p>",
			more: "<p>b</p><p>c</p>",
		});
	});

	it("should have no hidden part when the marker is the last block", () => {
		expect(splitAtReadMore(`<p>a</p>${MARKER}`)).toEqual({ intro: "<p>a</p>", more: "" });
	});

	it("should only split at the first marker", () => {
		expect(splitAtReadMore(`<p>a</p>${MARKER}<p>b</p>${MARKER}<p>c</p>`)).toEqual({
			intro: "<p>a</p>",
			more: `<p>b</p>${MARKER}<p>c</p>`,
		});
	});

	it("should ignore other figures such as tables", () => {
		const html = '<p>a</p><figure class="table"><table><tbody><tr><td>x</td></tr></tbody></table></figure>';
		expect(splitAtReadMore(html)).toEqual({ intro: html, more: "" });
	});
});
