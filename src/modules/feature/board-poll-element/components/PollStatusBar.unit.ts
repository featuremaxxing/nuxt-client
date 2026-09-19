import PollStatusBar from "./PollStatusBar.vue";
import { PollElement } from "@/types/board/ContentElement";
import { pollElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { PollAnswerMode, PollChartType, PollStatus } from "@api-server";
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";

const { updateElementRequestMock } = vi.hoisted(() => ({ updateElementRequestMock: vi.fn() }));
const { downloadBlobMock } = vi.hoisted(() => ({ downloadBlobMock: vi.fn() }));
const { buildPollResultsPdfMock } = vi.hoisted(() => ({
	buildPollResultsPdfMock: vi.fn().mockResolvedValue(new Blob()),
}));
const { svgToPngMock } = vi.hoisted(() => ({ svgToPngMock: vi.fn().mockResolvedValue(new Blob()) }));

vi.mock("@data-board", () => ({
	useCardStore: () => ({ updateElementRequest: updateElementRequestMock }),
}));

vi.mock("@/utils/fileHelper", () => ({
	downloadBlob: downloadBlobMock,
}));

vi.mock("../poll-export.util", async () => {
	const actual = await vi.importActual<typeof import("../poll-export.util")>("../poll-export.util");
	return {
		...actual,
		buildPollResultsPdf: buildPollResultsPdfMock,
	};
});

vi.mock("../svg-to-png.util", () => ({
	svgToPng: svgToPngMock,
}));

describe("PollStatusBar", () => {
	const setupWrapper = (options: { element?: PollElement; isEditor?: boolean; canOpenAnalysis?: boolean } = {}) => {
		const element = options.element ?? pollElementResponseFactory.build();

		const wrapper = mount(PollStatusBar, {
			attachTo: document.body,
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: {
				element,
				isEditor: options.isEditor ?? false,
				totalVotes: 3,
				participantCount: 5,
				results: [],
				canOpenAnalysis: options.canOpenAnalysis ?? false,
			},
		});

		return { wrapper, element };
	};

	afterEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = "";
	});

	const appendChartSvg = (elementId: string, questionId: string) => {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("data-testid", "poll-chart-svg");
		svg.setAttribute("data-poll-chart-element-id", elementId);
		svg.setAttribute("data-poll-chart-question-id", questionId);
		document.body.appendChild(svg);
		return svg;
	};

	it("shows the poll status", () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN } });
		const { wrapper } = setupWrapper({ element });

		expect(wrapper.find("[data-testid='poll-status-chip']").text()).toContain("open");
	});

	it("shows the participant count", () => {
		const { wrapper } = setupWrapper();

		expect(wrapper.find("[data-testid='poll-participant-count']").exists()).toBe(true);
	});

	it("does not show editor controls for a non-editor", () => {
		const { wrapper } = setupWrapper({ isEditor: false });

		expect(wrapper.find("[data-testid='poll-export-menu']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='poll-status-bar-open']").exists()).toBe(false);
	});

	it("shows the export menu and open/close controls for an editor", () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN } });
		const { wrapper } = setupWrapper({ element, isEditor: true });

		expect(wrapper.find("[data-testid='poll-export-menu']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='poll-status-bar-close']").exists()).toBe(true);
	});

	it("sends an update-element request to close the poll", async () => {
		const element = pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN } });
		const { wrapper } = setupWrapper({ element, isEditor: true });

		await wrapper.find("[data-testid='poll-status-bar-close']").trigger("click");

		expect(updateElementRequestMock).toHaveBeenCalledWith({
			element: expect.objectContaining({
				content: expect.objectContaining({ pollStatus: "closed" }),
			}),
		});
	});

	describe("analysis button", () => {
		it("is visible for an editor", () => {
			const { wrapper } = setupWrapper({ isEditor: true, canOpenAnalysis: true });

			expect(wrapper.find("[data-testid='poll-open-analysis']").exists()).toBe(true);
		});

		it("is visible for a student once the poll is closed (canOpenAnalysis=true)", () => {
			const { wrapper } = setupWrapper({ isEditor: false, canOpenAnalysis: true });

			expect(wrapper.find("[data-testid='poll-open-analysis']").exists()).toBe(true);
		});

		it("is hidden for a student while the poll is open (canOpenAnalysis=false)", () => {
			const { wrapper } = setupWrapper({ isEditor: false, canOpenAnalysis: false });

			expect(wrapper.find("[data-testid='poll-open-analysis']").exists()).toBe(false);
		});

		it("emits open:analysis when clicked", async () => {
			const { wrapper } = setupWrapper({ isEditor: true, canOpenAnalysis: true });

			await wrapper.find("[data-testid='poll-open-analysis']").trigger("click");

			expect(wrapper.emitted("open:analysis")).toHaveLength(1);
		});
	});

	describe("onExportPdf", () => {
		it("pairs each chart svg to its question by id, not by document position, even with a TEXT question interleaved between chart questions", async () => {
			const element = pollElementResponseFactory.build({
				content: {
					pollStatus: PollStatus.CLOSED,
					questions: [
						{
							id: "question-bar",
							text: "Bar question",
							answerMode: PollAnswerMode.SINGLE,
							chartType: PollChartType.BAR,
							options: [{ id: "option-1", text: "Good" }],
						},
						{
							id: "question-text",
							text: "Text question",
							answerMode: PollAnswerMode.TEXT,
							chartType: PollChartType.BAR,
							options: [],
						},
						{
							id: "question-column",
							text: "Column question",
							answerMode: PollAnswerMode.SINGLE,
							chartType: PollChartType.COLUMN,
							options: [{ id: "option-2", text: "Good" }],
						},
					],
				},
			});

			// Render the column chart's svg into the DOM before the bar chart's - the opposite of
			// question order - so a position-based pairing would mismatch them.
			appendChartSvg(element.id, "question-column");
			appendChartSvg(element.id, "question-bar");
			// A chart svg for a different poll element must never be picked up.
			appendChartSvg("some-other-element", "question-bar");

			const { wrapper } = setupWrapper({ element, isEditor: true });

			await wrapper.find("[data-testid='poll-export-menu']").trigger("click");
			await flushPromises();
			await new DOMWrapper(document.body).find("[data-testid='poll-export-pdf']").trigger("click");
			await flushPromises();

			expect(svgToPngMock).toHaveBeenCalledTimes(2);
			expect(buildPollResultsPdfMock).toHaveBeenCalledTimes(1);
			expect(downloadBlobMock).toHaveBeenCalledTimes(1);
		});

		it("skips a question that has no matching chart svg instead of pairing it with an unrelated one", async () => {
			const element = pollElementResponseFactory.build({
				content: {
					pollStatus: PollStatus.CLOSED,
					questions: [
						{
							id: "question-bar",
							text: "Bar question",
							answerMode: PollAnswerMode.SINGLE,
							chartType: PollChartType.BAR,
							options: [{ id: "option-1", text: "Good" }],
						},
					],
				},
			});
			// No matching svg appended for "question-bar".

			const { wrapper } = setupWrapper({ element, isEditor: true });

			await wrapper.find("[data-testid='poll-export-menu']").trigger("click");
			await flushPromises();
			await new DOMWrapper(document.body).find("[data-testid='poll-export-pdf']").trigger("click");
			await flushPromises();

			expect(svgToPngMock).not.toHaveBeenCalled();
			expect(buildPollResultsPdfMock).toHaveBeenCalledTimes(1);
			expect(downloadBlobMock).toHaveBeenCalledTimes(1);
		});
	});
});
