import PollVoteForm from "./PollVoteForm.vue";
import { PollElement } from "@/types/board/ContentElement";
import { PollAnswerMode, PollChartType, PollStatus } from "@api-server";
import { pollElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

const { fetchPollResultsMock, castVoteViaSocketMock } = vi.hoisted(() => ({
	fetchPollResultsMock: vi.fn().mockResolvedValue(undefined),
	castVoteViaSocketMock: vi.fn(),
}));

vi.mock("@data-poll", () => ({
	usePollsStore: () => ({ fetchPollResults: fetchPollResultsMock }),
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

	it("casts the vote via the socket, refreshes results via REST, then emits 'voted'", async () => {
		const { wrapper, element } = setupWrapper();

		await wrapper.find("[data-testid='poll-vote-submit']").trigger("click");
		await wrapper.vm.$nextTick();

		expect(castVoteViaSocketMock).toHaveBeenCalledWith({ elementId: element.id, answers: expect.any(Array) });
		expect(fetchPollResultsMock).toHaveBeenCalledWith(element.id);
		expect(wrapper.emitted("voted")).toBeTruthy();
	});

	it("shows 'change vote' as the submit label when existing answers are passed", () => {
		const { wrapper } = setupWrapper(undefined, [{ questionId: "q1", selectedOptionIds: ["o1"] }] as never);

		expect(wrapper.find("[data-testid='poll-vote-submit']").text()).toContain("changeVote");
	});
});
