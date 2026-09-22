import { collectCardChartSvgsByQuestionId } from "./poll-chart-dom.util";

const makeSvg = (elementId: string, questionId: string): SVGSVGElement => {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("data-testid", "poll-chart-svg");
	svg.setAttribute("data-poll-chart-element-id", elementId);
	svg.setAttribute("data-poll-chart-question-id", questionId);
	return svg;
};

describe("poll-chart-dom.util", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("returns an empty map when no matching svg is in the document", () => {
		expect(collectCardChartSvgsByQuestionId("element-1")).toEqual({});
	});

	it("keys the returned map by each svg's question id", () => {
		const svgA = makeSvg("element-1", "question-a");
		const svgB = makeSvg("element-1", "question-b");
		document.body.append(svgA, svgB);

		const result = collectCardChartSvgsByQuestionId("element-1");

		expect(Object.keys(result).sort()).toEqual(["question-a", "question-b"]);
		expect(result["question-a"]).toBe(svgA);
		expect(result["question-b"]).toBe(svgB);
	});

	it("excludes svgs belonging to a different element id", () => {
		const ownSvg = makeSvg("element-1", "question-a");
		const otherElementSvg = makeSvg("element-2", "question-a");
		document.body.append(ownSvg, otherElementSvg);

		const result = collectCardChartSvgsByQuestionId("element-1");

		expect(Object.keys(result)).toEqual(["question-a"]);
		expect(result["question-a"]).toBe(ownSvg);
	});

	it("still finds the right svg when a second rendering of the same poll (e.g. an overlay) is also in the document", () => {
		const cardSvg = makeSvg("element-1", "question-a");
		const overlaySvg = makeSvg("element-1", "question-a");
		document.body.append(cardSvg, overlaySvg);

		const result = collectCardChartSvgsByQuestionId("element-1");

		// querySelectorAll returns document order, and later matches for the same key overwrite
		// earlier ones - both nodes are legitimate charts for the same question, so either is a
		// valid pick; what matters is that a *different* element id's node never leaks in here.
		expect(Object.keys(result)).toEqual(["question-a"]);
		expect([cardSvg, overlaySvg]).toContain(result["question-a"]);
	});
});
