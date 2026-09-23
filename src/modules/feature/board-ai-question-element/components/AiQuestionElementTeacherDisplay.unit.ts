import AiQuestionElementTeacherDisplay from "./AiQuestionElementTeacherDisplay.vue";
import { aiQuestionElementResponseFactory } from "@@/tests/test-utils/factory/aiQuestionElementResponseFactory";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

const testMessages = {
	"components.cardElement.aiQuestionElement.answersCount": "Answers ({count})",
	"components.cardElement.aiQuestionElement.attempt": "Attempt {count}",
	"components.cardElement.aiQuestionElement.answersEmpty": "No answers yet.",
};

const { fetchAnswersMock } = vi.hoisted(() => ({
	fetchAnswersMock: vi.fn(),
}));

vi.mock("@data-ai-question", () => ({
	useAiQuestionApi: () => ({ fetchAnswers: fetchAnswersMock }),
}));

describe("AiQuestionElementTeacherDisplay", () => {
	const setup = () => {
		const element = aiQuestionElementResponseFactory.build();
		const wrapper = mount(AiQuestionElementTeacherDisplay, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n({ locale: "en", messages: { en: testMessages } })],
			},
			props: { element },
		});

		return { wrapper, element };
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should show the question and load the answer list", async () => {
		fetchAnswersMock.mockResolvedValue({ answers: [] });
		const { wrapper, element } = setup();
		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='ai-question-teacher-question']").text()).toContain(element.content.question);
		expect(fetchAnswersMock).toHaveBeenCalledWith(element.id);
	});

	it("should list answers with the student's name and attempt count", async () => {
		fetchAnswersMock.mockResolvedValue({
			answers: [
				{
					id: "answer-1",
					userId: "user-1",
					answer: "Meine Antwort",
					aiResponse: "Richtig!",
					attemptCount: 2,
					firstName: "Anna",
					lastName: "Admin",
				},
			],
		});
		const { wrapper } = setup();
		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='ai-question-teacher-answers-toggle']").text()).toContain("Answers (1)");
		await wrapper.find("[data-testid='ai-question-teacher-answers-toggle']").trigger("click");

		const entry = wrapper.find("[data-testid='ai-question-teacher-answer-answer-1']");
		expect(entry.text()).toContain("Anna Admin");
		expect(entry.text()).toContain("Meine Antwort");
		expect(entry.find("[data-testid='ai-question-teacher-attempts']").text()).toContain("Attempt 2");
	});

	it("should show an empty hint when nobody answered", async () => {
		fetchAnswersMock.mockResolvedValue({ answers: [] });
		const { wrapper } = setup();
		await vi.dynamicImportSettled();

		// VExpansionPanelText renders its slot lazily - the panel must be opened first
		await wrapper.find("[data-testid='ai-question-teacher-answers-toggle']").trigger("click");

		expect(wrapper.find("[data-testid='ai-question-teacher-answers-empty']").exists()).toBe(true);
	});
});
