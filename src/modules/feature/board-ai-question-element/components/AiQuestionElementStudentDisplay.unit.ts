import AiQuestionElementStudentDisplay from "./AiQuestionElementStudentDisplay.vue";
import { aiQuestionElementResponseFactory } from "@@/tests/test-utils/factory/aiQuestionElementResponseFactory";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { flushPromises, mount } from "@vue/test-utils";

const testMessages = {
	"components.cardElement.aiQuestionElement.attempt": "Attempt {count}",
	"components.cardElement.aiQuestionElement.points": "{points} of {maxPoints} points",
};

const { fetchOwnAnswerMock, setAnswerFlagMock, submitAnswerMock } = vi.hoisted(() => ({
	fetchOwnAnswerMock: vi.fn(),
	setAnswerFlagMock: vi.fn(),
	submitAnswerMock: vi.fn(),
}));

vi.mock("@data-ai-question", () => ({
	useAiQuestionApi: () => ({
		fetchOwnAnswer: fetchOwnAnswerMock,
		setAnswerFlag: setAnswerFlagMock,
		submitAnswer: submitAnswerMock,
	}),
}));

describe("AiQuestionElementStudentDisplay", () => {
	const setup = (allowMultipleAttempts = false) => {
		const element = aiQuestionElementResponseFactory.build();
		element.content.allowMultipleAttempts = allowMultipleAttempts;
		const wrapper = mount(AiQuestionElementStudentDisplay, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n({ locale: "en", messages: { en: testMessages } })],
			},
			props: { element },
		});

		return { wrapper, element };
	};

	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	beforeEach(() => {
		fetchOwnAnswerMock.mockResolvedValue({ answer: null });
		setAnswerFlagMock.mockResolvedValue(undefined);
		submitAnswerMock.mockResolvedValue({
			id: "answer-1",
			userId: "user-1",
			answer: "4",
			aiResponse: "Richtig!",
			answeredAt: new Date().toISOString(),
			attemptCount: 1,
		});
	});

	it("should show the question and the answer form when not answered yet", async () => {
		const { wrapper } = setup();
		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='ai-question-student-question']").text()).toContain("Was ist 2+2?");
		expect(wrapper.find("[data-testid='ai-question-student-answer']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='ai-question-student-ai-response']").exists()).toBe(false);
	});

	it("should submit the trimmed answer and show the AI response", async () => {
		const { wrapper } = setup();
		await vi.dynamicImportSettled();

		await wrapper.find("[data-testid='ai-question-student-answer'] textarea").setValue("  4  ");
		await wrapper.find("[data-testid='ai-question-student-submit']").trigger("click");
		await vi.dynamicImportSettled();

		expect(submitAnswerMock).toHaveBeenCalledWith(wrapper.vm.$props.element.id, { answer: "4" }, { silent: true });
		expect(wrapper.find("[data-testid='ai-question-student-ai-response']").text()).toContain("Richtig!");
		expect(wrapper.find("[data-testid='ai-question-student-attempt']").text()).toContain("Attempt 1");
	});

	it("should show an inline error and keep the input when the AI call fails", async () => {
		vi.useFakeTimers();
		submitAnswerMock.mockResolvedValue("error");
		fetchOwnAnswerMock.mockResolvedValue({ answer: null });
		const { wrapper } = setup();
		await vi.dynamicImportSettled();

		await wrapper.find("[data-testid='ai-question-student-answer'] textarea").setValue("4");
		await wrapper.find("[data-testid='ai-question-student-submit']").trigger("click");
		await flushPromises();

		await wrapper.find("[data-testid='ai-question-student-submit']").trigger("click");
		expect(submitAnswerMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(28_000);
		await flushPromises();

		expect(fetchOwnAnswerMock).toHaveBeenCalledTimes(9);
		expect(wrapper.find("[data-testid='ai-question-student-error']").exists()).toBe(true);
		expect(
			(wrapper.find("[data-testid='ai-question-student-answer'] textarea").element as HTMLTextAreaElement).value
		).toBe("4");
	});

	// Self-heal regression: a proxy timeout during the slow AI call can make the POST fail
	// (408) even though the server stored the answer afterwards - the retry then hits the
	// "already answered" conflict. Instead of an error, the stored response must be shown.
	it("should recover the stored AI response when a failed POST turns out to be saved", async () => {
		submitAnswerMock.mockResolvedValue("error");
		fetchOwnAnswerMock.mockResolvedValueOnce({ answer: null }).mockResolvedValue({
			answer: {
				id: "answer-1",
				userId: "user-1",
				answer: "4",
				aiResponse: "Richtig (nachgeladen)!",
				answeredAt: new Date().toISOString(),
				attemptCount: 1,
			},
		});
		const { wrapper } = setup();
		await vi.dynamicImportSettled();

		await wrapper.find("[data-testid='ai-question-student-answer'] textarea").setValue("4");
		await wrapper.find("[data-testid='ai-question-student-submit']").trigger("click");
		await vi.dynamicImportSettled();

		expect(fetchOwnAnswerMock).toHaveBeenCalledTimes(2);
		expect(wrapper.find("[data-testid='ai-question-student-ai-response']").text()).toContain("Richtig (nachgeladen)!");
		expect(wrapper.find("[data-testid='ai-question-student-error']").exists()).toBe(false);
	});

	// The assessment often lands several seconds after the connection was cut - the client
	// must keep polling instead of giving up after the first refetch.
	it("should poll for the stored answer until it appears", async () => {
		vi.useFakeTimers();
		submitAnswerMock.mockResolvedValue("error");
		fetchOwnAnswerMock
			.mockResolvedValueOnce({ answer: null })
			.mockResolvedValueOnce({ answer: null })
			.mockResolvedValueOnce({ answer: null })
			.mockResolvedValue({
				answer: {
					id: "answer-1",
					userId: "user-1",
					answer: "4",
					aiResponse: "spät, aber da",
					answeredAt: new Date().toISOString(),
					attemptCount: 1,
				},
			});
		const { wrapper } = setup();
		await vi.dynamicImportSettled();

		await wrapper.find("[data-testid='ai-question-student-answer'] textarea").setValue("4");
		await wrapper.find("[data-testid='ai-question-student-submit']").trigger("click");
		await flushPromises();

		// The mount request and first poll return empty; the fourth request recovers the answer.
		await vi.advanceTimersByTimeAsync(8000);
		await flushPromises();

		expect(fetchOwnAnswerMock).toHaveBeenCalledTimes(4);
		expect(wrapper.find("[data-testid='ai-question-student-ai-response']").text()).toContain("spät, aber da");
	});

	it("should ignore the previous attempt while recovering a timed-out re-submission", async () => {
		vi.useFakeTimers();
		submitAnswerMock.mockResolvedValue("error");
		const previousAnswer = {
			id: "answer-1",
			userId: "user-1",
			answer: "erste Antwort",
			aiResponse: "Feedback aus Versuch 1",
			answeredAt: new Date().toISOString(),
			attemptCount: 1,
		};
		const updatedAnswer = {
			...previousAnswer,
			answer: "zweite Antwort",
			aiResponse: "Feedback aus Versuch 2",
			attemptCount: 2,
		};
		fetchOwnAnswerMock
			.mockResolvedValueOnce({ answer: previousAnswer })
			.mockResolvedValueOnce({ answer: previousAnswer })
			.mockResolvedValueOnce({ answer: previousAnswer })
			.mockResolvedValue({ answer: updatedAnswer });
		const { wrapper } = setup(true);
		await vi.dynamicImportSettled();

		await wrapper.find("[data-testid='ai-question-student-resubmit']").trigger("click");
		await wrapper.find("[data-testid='ai-question-student-answer'] textarea").setValue("zweite Antwort");
		await wrapper.find("[data-testid='ai-question-student-submit']").trigger("click");
		await flushPromises();

		expect(wrapper.find("[data-testid='ai-question-student-ai-response']").exists()).toBe(false);
		await vi.advanceTimersByTimeAsync(8000);
		await flushPromises();

		expect(fetchOwnAnswerMock).toHaveBeenCalledTimes(4);
		expect(wrapper.find("[data-testid='ai-question-student-ai-response']").text()).toContain("Feedback aus Versuch 2");
		expect(wrapper.find("[data-testid='ai-question-student-ai-response']").text()).not.toContain(
			"Feedback aus Versuch 1"
		);
	});

	it("should show points and allow the student to flag the assessment", async () => {
		const answer = {
			id: "answer-1",
			userId: "user-1",
			answer: "4",
			aiResponse: "Teilweise richtig",
			answeredAt: new Date().toISOString(),
			attemptCount: 1,
			points: 7,
			maxPoints: 10,
			aiFlagged: false,
			aiFlagReason: null,
			studentFlagged: false,
		};
		fetchOwnAnswerMock.mockResolvedValue({ answer });
		setAnswerFlagMock.mockResolvedValue({ ...answer, studentFlagged: true });
		const { wrapper, element } = setup();
		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='ai-question-student-points']").text()).toContain("7");
		await wrapper.find("[data-testid='ai-question-student-flag']").trigger("click");
		await vi.dynamicImportSettled();

		expect(setAnswerFlagMock).toHaveBeenCalledWith(element.id, true);
		expect(wrapper.find("[data-testid='ai-question-student-flagged']").exists()).toBe(true);
	});

	it("should show the stored AI response instead of the form once answered", async () => {
		fetchOwnAnswerMock.mockResolvedValue({
			answer: {
				id: "answer-1",
				userId: "user-1",
				answer: "4",
				aiResponse: "Richtig!",
				answeredAt: new Date().toISOString(),
				attemptCount: 1,
			},
		});
		const { wrapper } = setup();
		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='ai-question-student-ai-response']").text()).toContain("Richtig!");
		expect(wrapper.find("[data-testid='ai-question-student-answer']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='ai-question-student-resubmit']").exists()).toBe(false);
	});

	it("should offer re-answering when the element allows multiple attempts", async () => {
		const element = aiQuestionElementResponseFactory.build({ content: { allowMultipleAttempts: true } });
		fetchOwnAnswerMock.mockResolvedValue({
			answer: {
				id: "answer-1",
				userId: "user-1",
				answer: "4",
				aiResponse: "Richtig!",
				answeredAt: new Date().toISOString(),
				attemptCount: 2,
			},
		});
		const wrapper = mount(AiQuestionElementStudentDisplay, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n({ locale: "en", messages: { en: testMessages } })],
			},
			props: { element },
		});
		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='ai-question-student-resubmit']").exists()).toBe(true);
		await wrapper.find("[data-testid='ai-question-student-resubmit']").trigger("click");

		expect(wrapper.find("[data-testid='ai-question-student-answer']").exists()).toBe(true);
	});
});
