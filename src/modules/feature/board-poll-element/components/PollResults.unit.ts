import PollResults from "./PollResults.vue";
import { PollElement } from "@/types/board/ContentElement";
import { pollElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { PollAnswerMode, PollChartType, PollQuestionResultResponse, PollVoterResponse } from "@api-server";
import { mount } from "@vue/test-utils";

describe("PollResults", () => {
	const buildElement = (overrides: Partial<PollElement["content"]> = {}): PollElement =>
		pollElementResponseFactory.build({
			content: {
				isAnonymous: true,
				questions: [
					{
						id: "q1",
						text: "Wie fandet ihr die Stunde?",
						answerMode: PollAnswerMode.SINGLE,
						chartType: PollChartType.BAR,
						options: [
							{ id: "o1", text: "Gut" },
							{ id: "o2", text: "Ging so" },
						],
					},
				],
				...overrides,
			},
		});

	const setupWrapper = (options: {
		element?: PollElement;
		results?: PollQuestionResultResponse[];
		voters?: PollVoterResponse[];
		isEditor?: boolean;
	}) => {
		const wrapper = mount(PollResults, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: {
				element: options.element ?? buildElement(),
				results: options.results,
				voters: options.voters,
				isEditor: options.isEditor ?? false,
			},
		});

		return { wrapper };
	};

	it("shows the numeric breakdown per option via the chart labels", () => {
		const { wrapper } = setupWrapper({
			results: [
				{
					questionId: "q1",
					counts: [
						{ optionId: "o1", count: 8 },
						{ optionId: "o2", count: 2 },
					],
				},
			],
		});

		expect(wrapper.text()).toContain("Gut");
		expect(wrapper.text()).toContain("8 (80%)");
	});

	it("shows a plain answer list for a free-text question instead of a chart", () => {
		const element = buildElement({
			questions: [
				{
					id: "q1",
					text: "Was hat gefehlt?",
					answerMode: PollAnswerMode.TEXT,
					chartType: PollChartType.BAR,
					options: [],
				},
			],
		});

		const { wrapper } = setupWrapper({
			element,
			results: [{ questionId: "q1", counts: [], textAnswers: ["mehr Beispiele", "Tempo"] }],
		});

		expect(wrapper.text()).toContain("mehr Beispiele");
		expect(wrapper.text()).toContain("Tempo");
		expect(wrapper.findComponent({ name: "PollChart" }).exists()).toBe(false);
	});

	it("does not show a per-option voter list for anonymous polls, even for an editor", () => {
		const { wrapper } = setupWrapper({
			results: [{ questionId: "q1", counts: [{ optionId: "o1", count: 1 }] }],
			voters: [{ userId: "u1", answers: [{ questionId: "q1", selectedOptionIds: ["o1"] }] }],
			isEditor: true,
		});

		expect(wrapper.findComponent({ name: "VExpansionPanels" }).exists()).toBe(false);
	});

	it("shows a per-option voter list for non-anonymous polls for an editor, with the resolved name and never the raw userId", async () => {
		const element = buildElement({ isAnonymous: false });

		const { wrapper } = setupWrapper({
			element,
			results: [{ questionId: "q1", counts: [{ optionId: "o1", count: 1 }] }],
			voters: [
				{
					userId: "u1",
					firstName: "Anna",
					lastName: "Beispiel",
					answers: [{ questionId: "q1", selectedOptionIds: ["o1"] }],
				},
			],
			isEditor: true,
		});

		expect(wrapper.findComponent({ name: "VExpansionPanels" }).exists()).toBe(true);

		await wrapper.find("[data-testid='poll-voter-list-toggle-q1-o1']").trigger("click");

		expect(wrapper.text()).toContain("Anna Beispiel");
		expect(wrapper.text()).not.toContain("u1");
	});

	it("falls back to a neutral placeholder (never the raw userId) when a voter has no name", async () => {
		const element = buildElement({ isAnonymous: false });

		const { wrapper } = setupWrapper({
			element,
			results: [{ questionId: "q1", counts: [{ optionId: "o1", count: 1 }] }],
			voters: [{ userId: "u1", answers: [{ questionId: "q1", selectedOptionIds: ["o1"] }] }],
			isEditor: true,
		});

		await wrapper.find("[data-testid='poll-voter-list-toggle-q1-o1']").trigger("click");

		expect(wrapper.text()).toContain("components.cardElement.pollElement.unknownUser");
		expect(wrapper.text()).not.toContain("u1");
	});

	it("does not show the voter list for a non-editor even on a non-anonymous poll", () => {
		const element = buildElement({ isAnonymous: false });

		const { wrapper } = setupWrapper({
			element,
			results: [{ questionId: "q1", counts: [{ optionId: "o1", count: 1 }] }],
			voters: [{ userId: "u1", answers: [{ questionId: "q1", selectedOptionIds: ["o1"] }] }],
			isEditor: false,
		});

		expect(wrapper.findComponent({ name: "VExpansionPanels" }).exists()).toBe(false);
	});
});
