import AssignmentElementEdit from "./AssignmentElementEdit.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { assignmentElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";
import { reactive } from "vue";

const { useContentElementStateMock } = vi.hoisted(() => ({
	useContentElementStateMock: vi.fn(),
}));

vi.mock("@data-board", () => ({
	useContentElementState: useContentElementStateMock,
}));

describe("AssignmentElementEdit", () => {
	const setupWrapper = (element: AssignmentElement = assignmentElementResponseFactory.build()) => {
		const modelValue = reactive({ ...element.content });
		useContentElementStateMock.mockReturnValue({ modelValue });

		const wrapper = mount(AssignmentElementEdit, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: { DueDateTimeField: true, GraceMinutesSelect: true },
			},
			props: { element, isEditMode: true },
		});

		return { wrapper, modelValue };
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should render a start date field before the due date field", () => {
		const { wrapper } = setupWrapper();

		const startField = wrapper.find("[data-testid='assignment-start-date-time']");
		const dueField = wrapper.find("[data-testid='assignment-due-date-time']");

		expect(startField.exists()).toBe(true);
		expect(dueField.exists()).toBe(true);
		expect(startField.element.compareDocumentPosition(dueField.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it("should write an emitted start date into the content model", async () => {
		const { wrapper, modelValue } = setupWrapper();

		const startField = wrapper.findComponent({ name: "DueDateTimeField" });
		await startField.vm.$emit("update:modelValue", "2026-01-10T10:00:00.000Z");

		expect(modelValue.startDate).toEqual("2026-01-10T10:00:00.000Z");
	});

	it("should clear the start date when the field is emptied", async () => {
		const element = assignmentElementResponseFactory.build();
		element.content.startDate = "2026-01-10T10:00:00.000Z";
		const { wrapper, modelValue } = setupWrapper(element);

		const startField = wrapper.findComponent({ name: "DueDateTimeField" });
		await startField.vm.$emit("update:modelValue", undefined);

		expect(modelValue.startDate).toBeNull();
	});
});
