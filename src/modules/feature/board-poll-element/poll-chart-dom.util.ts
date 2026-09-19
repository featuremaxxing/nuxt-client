// Thin DOM-touching helper that pairs rendered chart <svg> elements with the question they
// belong to, by identity rather than by document order/position. PollChart.vue stamps each of
// its <svg> roots with data-poll-chart-element-id/data-poll-chart-question-id (see PollChart.vue
// and PollResults.vue), and this function is the single place that reads those attributes back.
//
// Why this exists: `document.querySelectorAll('[data-testid="poll-chart-svg"]')` is a GLOBAL
// query. Once more than one poll element - or more than one rendering of the same poll (e.g. a
// fullscreen analysis overlay rendered via VDialog's body-teleport, alongside the card view) - is
// on the page at once, a global query returns every chart SVG in the document, and pairing them
// with questions by array position silently produces wrong pairings. Scoping the query by
// elementId and keying the result by questionId removes the position dependency entirely.

export const collectCardChartSvgsByQuestionId = (elementId: string): Record<string, SVGSVGElement> => {
	const nodes = document.querySelectorAll<SVGSVGElement>(`[data-poll-chart-element-id="${elementId}"]`);

	const result: Record<string, SVGSVGElement> = {};
	nodes.forEach((node) => {
		const questionId = node.getAttribute("data-poll-chart-question-id");
		if (questionId) {
			result[questionId] = node;
		}
	});

	return result;
};
