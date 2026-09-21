import PollElementEdit from "./PollElementEdit.vue";
import { PollElement } from "@/types/board/ContentElement";
import { pollElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardRoles, PollAnswerMode, PollAudience } from "@api-server";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

const { updateElementRequestMock, fetchPollResultsMock, getStateMock } = vi.hoisted(() => ({
	updateElementRequestMock: vi.fn(),
	fetchPollResultsMock: vi.fn(),
	getStateMock: vi.fn(() => ({ totalVotes: 0 })),
}));

vi.mock("@data-board", () => ({
	useContentElementState: (props: { element: PollElement }) => {
		const modelValue = ref(props.element.content);
		return {
			modelValue,
			computedElement: { value: props.element },
		};
	},
	useCardStore: () => ({ updateElementRequest: updateElementRequestMock }),
}));

vi.mock("@data-poll", () => ({
	usePollsStore: () => ({ getState: getStateMock, fetchPollResults: fetchPollResultsMock }),
}));

describe("PollElementEdit", () => {
	const setupWrapper = (element?: PollElement) => {
		const usedElement = element ?? pollElementResponseFactory.build();

		const wrapper = mount(PollElementEdit, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: { ClosesAtField: true },
			},
			props: {
				element: usedElement,
				isEditMode: true,
			},
		});

		return { wrapper, element: usedElement };
	};

	beforeEach(() => {
		getStateMock.mockReturnValue({ totalVotes: 0 });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders one question text field per question", () => {
		const { wrapper } = setupWrapper();

		expect(wrapper.find("[data-testid='poll-question-text-0']").exists()).toBe(true);
	});

	it("adds a new question when 'add question' is clicked", async () => {
		const { wrapper, element } = setupWrapper();
		const initialLength = element.content.questions.length;

		await wrapper.find("[data-testid='poll-add-question']").trigger("click");

		expect(element.content.questions.length).toBe(initialLength + 1);
	});

	it("does not allow removing the last remaining question", () => {
		const element = pollElementResponseFactory.build();
		element.content.questions = [element.content.questions[0]];
		const { wrapper } = setupWrapper(element);

		const removeButton = wrapper.find("[data-testid='poll-question-remove-0']");
		expect(removeButton.attributes("disabled")).toBeDefined();
	});

	it("adds an option to a question when 'add option' is clicked", async () => {
		const { wrapper, element } = setupWrapper();
		const initialOptionCount = element.content.questions[0].options.length;

		await wrapper.find("[data-testid='poll-add-option-0']").trigger("click");

		expect(element.content.questions[0].options.length).toBe(initialOptionCount + 1);
	});

	it("hides the options list for a free-text question", async () => {
		const element = pollElementResponseFactory.build();
		element.content.questions[0].answerMode = PollAnswerMode.TEXT;
		const { wrapper } = setupWrapper(element);

		expect(wrapper.find("[data-testid='poll-option-text-0-0']").exists()).toBe(false);
	});

	describe("audience", () => {
		it("shows the audience roles checkboxes only when audience is CUSTOM", () => {
			const element = pollElementResponseFactory.build();
			element.content.audience = PollAudience.STUDENTS;
			const { wrapper } = setupWrapper(element);

			expect(wrapper.find("[data-testid='poll-audience-role-editor']").exists()).toBe(false);
		});

		it("shows the audience roles checkboxes when audience is CUSTOM", () => {
			const element = pollElementResponseFactory.build();
			element.content.audience = PollAudience.CUSTOM;
			element.content.audienceRoles = [BoardRoles.EDITOR];
			const { wrapper } = setupWrapper(element);

			expect(wrapper.find("[data-testid='poll-audience-role-editor']").exists()).toBe(true);
		});

		it("is not disabled while no vote has been cast", () => {
			getStateMock.mockReturnValue({ totalVotes: 0 });
			const { wrapper } = setupWrapper();

			expect(wrapper.find("[data-testid='poll-audience-select']").attributes("disabled")).toBeUndefined();
		});

		it("is disabled once a vote has been cast", () => {
			getStateMock.mockReturnValue({ totalVotes: 1 });
			const { wrapper } = setupWrapper();

			// Vuetify renders VSelect's disabled state on an inner input, not the outer wrapper
			expect(wrapper.find("[data-testid='poll-audience-select'] input").attributes("disabled")).toBeDefined();
		});

		it("fetches poll results on mount to know whether the audience is locked", () => {
			setupWrapper();

			expect(fetchPollResultsMock).toHaveBeenCalled();
		});
	});
});
