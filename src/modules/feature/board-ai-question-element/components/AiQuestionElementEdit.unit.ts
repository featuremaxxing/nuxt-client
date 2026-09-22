import AiQuestionElementEdit from "./AiQuestionElementEdit.vue";
import { aiQuestionElementResponseFactory } from "@@/tests/test-utils/factory/aiQuestionElementResponseFactory";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

const { fetchConfigMock, useContentElementStateMock } = vi.hoisted(() => ({
	fetchConfigMock: vi.fn(),
	useContentElementStateMock: vi.fn(),
}));

vi.mock("@data-ai-question", () => ({
	useAiQuestionApi: () => ({ fetchConfig: fetchConfigMock }),
}));

vi.mock("@data-board", () => ({
	useContentElementState: useContentElementStateMock,
}));

describe("AiQuestionElementEdit", () => {
	const setup = () => {
		const element = aiQuestionElementResponseFactory.build();
		const modelValue = ref({ ...element.content });
		useContentElementStateMock.mockReturnValue({ modelValue });
		fetchConfigMock.mockResolvedValue({
			question: element.content.question,
			aiInstructions: "Streng bewerten",
			expectedAnswer: "4",
			allowMultipleAttempts: false,
		});

		const wrapper = mount(AiQuestionElementEdit, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { element, isEditMode: true },
		});

		return { wrapper, modelValue, element };
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should load the private config and include it in the autosaved model", async () => {
		const { wrapper, modelValue } = setup();
		await vi.dynamicImportSettled();

		expect(fetchConfigMock).toHaveBeenCalledWith(wrapper.vm.$props.element.id);

		const instructions = wrapper.find("[data-testid='ai-question-edit-instructions']");
		const expectedAnswer = wrapper.find("[data-testid='ai-question-edit-expected-answer']");
		expect((instructions.find("textarea").element as HTMLTextAreaElement).value).toBe("Streng bewerten");
		expect((expectedAnswer.find("textarea").element as HTMLTextAreaElement).value).toBe("4");

		// editing one private field must keep the other (both ride along in the autosave)
		await instructions.find("textarea").setValue("Netter bewerten");
		expect(modelValue.value).toMatchObject({ aiInstructions: "Netter bewerten", expectedAnswer: "4" });
	});

	it("should toggle the multiple-attempts switch on the model", async () => {
		const { wrapper, modelValue } = setup();
		await vi.dynamicImportSettled();

		await wrapper.find("[data-testid='ai-question-edit-multiple-attempts'] input").setValue(true);

		expect(modelValue.value.allowMultipleAttempts).toBe(true);
	});

	it("should keep the question editable when the config endpoint fails", async () => {
		fetchConfigMock.mockResolvedValue(undefined);
		const { wrapper, modelValue } = setup();
		await vi.dynamicImportSettled();

		await wrapper.find("[data-testid='ai-question-edit-question'] textarea").setValue("Neue Frage?");

		expect(modelValue.value.question).toBe("Neue Frage?");
	});
});
