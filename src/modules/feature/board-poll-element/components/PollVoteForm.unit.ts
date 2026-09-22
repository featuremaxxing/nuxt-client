import PollVoteForm from "./PollVoteForm.vue";
import { PollElement } from "@/types/board/ContentElement";
import { pollElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { PollAnswerMode, PollChartType, PollStatus } from "@api-server";
import { mount } from "@vue/test-utils";

const { applyOwnVoteMock, castVoteViaSocketMock } = vi.hoisted(() => ({
	applyOwnVoteMock: vi.fn(),
	castVoteViaSocketMock: vi.fn(),
}));

vi.mock("@data-poll", () => ({
	usePollsStore: () => ({ applyOwnVote: applyOwnVoteMock }),
	usePollSocketApi: () => ({ castVoteViaSocket: castVoteViaSocketMock }),
}));

describe("PollVoteForm", () => {
	const setupWrapper = (element?: PollElement, existingAnswers?: never) => {
		const usedElement =
			element ??
			pollElementResponseFactory.build({
				content: {
					pollStatus: PollStatus.OPEN,
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
				},
			});

		const wrapper = mount(PollVoteForm, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: { element: usedElement, existingAnswers },
		});

		return { wrapper, element: usedElement };
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders a radio group for a single-choice question", () => {
		const { wrapper } = setupWrapper();

		expect(wrapper.find("[data-testid='poll-vote-radio-group-q1']").exists()).toBe(true);
	});

	it("renders a checkbox per option for a multiple-choice question", () => {
		const element = pollElementResponseFactory.build({
			content: {
				pollStatus: PollStatus.OPEN,
				questions: [
					{
						id: "q1",
						text: "Which topics?",
						answerMode: PollAnswerMode.MULTIPLE,
						chartType: PollChartType.BAR,
						options: [
							{ id: "o1", text: "A" },
							{ id: "o2", text: "B" },
						],
					},
				],
			},
		});
		const { wrapper } = setupWrapper(element);

		expect(wrapper.find("[data-testid='poll-vote-checkbox-q1-o1']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='poll-vote-checkbox-q1-o2']").exists()).toBe(true);
	});

	it("renders a textarea for a free-text question", () => {
		const element = pollElementResponseFactory.build({
			content: {
				pollStatus: PollStatus.OPEN,
				questions: [
					{
						id: "q1",
						text: "Anything else?",
						answerMode: PollAnswerMode.TEXT,
						chartType: PollChartType.BAR,
						options: [],
					},
				],
			},
		});
		const { wrapper } = setupWrapper(element);

		expect(wrapper.find("[data-testid='poll-vote-textarea-q1']").exists()).toBe(true);
	});

	it("casts the vote via the socket, applies it to the local store optimistically, then emits 'voted'", async () => {
		const { wrapper, element } = setupWrapper();

		await wrapper.find("[data-testid='poll-vote-submit']").trigger("click");
		await wrapper.vm.$nextTick();

		expect(castVoteViaSocketMock).toHaveBeenCalledWith({ elementId: element.id, answers: expect.any(Array) });
		expect(applyOwnVoteMock).toHaveBeenCalledWith(element.id, expect.any(Array));
		expect(wrapper.emitted("voted")).toBeTruthy();
	});

	it("shows 'change vote' as the submit label when existing answers are passed", () => {
		const { wrapper } = setupWrapper(undefined, [{ questionId: "q1", selectedOptionIds: ["o1"] }] as never);

		expect(wrapper.find("[data-testid='poll-vote-submit']").text()).toContain("changeVote");
	});

	describe("a newly-added question after the voter already answered an earlier one", () => {
		const buildTwoQuestionElement = (allowVoteChange: boolean) =>
			pollElementResponseFactory.build({
				content: {
					pollStatus: PollStatus.OPEN,
					allowVoteChange,
					questions: [
						{
							id: "q1",
							text: "Already answered",
							answerMode: PollAnswerMode.SINGLE,
							chartType: PollChartType.BAR,
							options: [
								{ id: "o1", text: "Gut" },
								{ id: "o2", text: "Ging so" },
							],
						},
						{
							id: "q2",
							text: "Added afterwards",
							answerMode: PollAnswerMode.SINGLE,
							chartType: PollChartType.BAR,
							options: [
								{ id: "o3", text: "A" },
								{ id: "o4", text: "B" },
							],
						},
					],
				},
			});

		it("disables the already-answered question when allowVoteChange is off", () => {
			const element = buildTwoQuestionElement(false);
			const { wrapper } = setupWrapper(element, [{ questionId: "q1", selectedOptionIds: ["o1"] }] as never);

			expect(wrapper.find("[data-testid='poll-vote-radio-group-q1'] input").attributes("disabled")).toBeDefined();
		});

		it("keeps the newly-added question answerable when allowVoteChange is off", () => {
			const element = buildTwoQuestionElement(false);
			const { wrapper } = setupWrapper(element, [{ questionId: "q1", selectedOptionIds: ["o1"] }] as never);

			expect(wrapper.find("[data-testid='poll-vote-radio-group-q2'] input").attributes("disabled")).toBeUndefined();
		});

		it("does not disable the already-answered question when allowVoteChange is on", () => {
			const element = buildTwoQuestionElement(true);
			const { wrapper } = setupWrapper(element, [{ questionId: "q1", selectedOptionIds: ["o1"] }] as never);

			expect(wrapper.find("[data-testid='poll-vote-radio-group-q1'] input").attributes("disabled")).toBeUndefined();
		});

		it("submits the locked question's answer unchanged alongside the new answer", async () => {
			const element = buildTwoQuestionElement(false);
			const { wrapper } = setupWrapper(element, [{ questionId: "q1", selectedOptionIds: ["o1"] }] as never);

			await wrapper.find("[data-testid='poll-vote-radio-group-q2'] input").trigger("click");
			await wrapper.find("[data-testid='poll-vote-submit']").trigger("click");
			await wrapper.vm.$nextTick();

			expect(castVoteViaSocketMock).toHaveBeenCalledWith({
				elementId: element.id,
				answers: expect.arrayContaining([{ questionId: "q1", selectedOptionIds: ["o1"] }]),
			});
		});

		it("disables the submit button once every question is locked", () => {
			const element = pollElementResponseFactory.build({
				content: {
					pollStatus: PollStatus.OPEN,
					allowVoteChange: false,
					questions: [
						{
							id: "q1",
							text: "Already answered",
							answerMode: PollAnswerMode.SINGLE,
							chartType: PollChartType.BAR,
							options: [
								{ id: "o1", text: "Gut" },
								{ id: "o2", text: "Ging so" },
							],
						},
					],
				},
			});
			const { wrapper } = setupWrapper(element, [{ questionId: "q1", selectedOptionIds: ["o1"] }] as never);

			expect(wrapper.find("[data-testid='poll-vote-submit']").attributes("disabled")).toBeDefined();
		});
	});
});
