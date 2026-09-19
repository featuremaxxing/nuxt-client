import AssignmentElementEdit from "./AssignmentElementEdit.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { assignmentElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

const { useContentElementStateMock, updateSettingsMock } = vi.hoisted(() => ({
	useContentElementStateMock: vi.fn(),
	updateSettingsMock: vi.fn(),
}));

vi.mock("@data-board", () => ({
	useContentElementState: useContentElementStateMock,
}));

vi.mock("@data-assignment", () => ({
	usePeerReviewApi: () => ({ updateSettings: updateSettingsMock }),
}));

describe("AssignmentElementEdit", () => {
	const setupWrapper = (element: AssignmentElement = assignmentElementResponseFactory.build()) => {
		const modelValue = ref({ ...element.content });
		useContentElementStateMock.mockReturnValue({ modelValue });

		const wrapper = mount(AssignmentElementEdit, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: { DueDateTimeField: true, GraceMinutesSelect: true },
			},
			props: { element, isEditMode: true },
		});

		return { wrapper, modelValue, element };
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	beforeEach(() => {
		updateSettingsMock.mockResolvedValue(undefined);
	});

	it("should render a start date field before the due date field", () => {
		const { wrapper } = setupWrapper();

		const startField = wrapper.find("[data-testid='assignment-start-date-time']");
		const dueField = wrapper.find("[data-testid='assignment-due-date-time']");

		expect(startField.exists()).toBe(true);
		expect(dueField.exists()).toBe(true);
		expect(
			startField.element.compareDocumentPosition(dueField.element) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it("should write an emitted start date into the content model", async () => {
		const { wrapper, modelValue } = setupWrapper();

		const startField = wrapper.findComponent({ name: "DueDateTimeField" });
		await startField.vm.$emit("update:modelValue", "2026-01-10T10:00:00.000Z");

		expect(modelValue.value.startDate).toEqual("2026-01-10T10:00:00.000Z");
	});

	it("should clear the start date when the field is emptied", async () => {
		const element = assignmentElementResponseFactory.build();
		element.content.startDate = "2026-01-10T10:00:00.000Z";
		const { wrapper, modelValue } = setupWrapper(element);

		const startField = wrapper.findComponent({ name: "DueDateTimeField" });
		await startField.vm.$emit("update:modelValue", undefined);

		expect(modelValue.value.startDate).toBeNull();
	});

	describe("rubric", () => {
		it("shows the flat max-points field and hides the rubric editor when no criteria exist", () => {
			const { wrapper } = setupWrapper();

			expect(wrapper.find("[data-testid='assignment-max-points']").exists()).toBe(true);
			expect(wrapper.find("[data-testid='assignment-max-points-computed']").exists()).toBe(false);
			expect(wrapper.find("[data-testid='assignment-rubric-criterion-row']").exists()).toBe(false);
		});

		it("adds a first criterion and switches to the computed total when enabled", async () => {
			const { wrapper, modelValue } = setupWrapper();

			await wrapper.find("[data-testid='assignment-rubric-toggle'] input").setValue(true);

			expect(modelValue.value.criteria).toHaveLength(1);
			expect(wrapper.find("[data-testid='assignment-max-points']").exists()).toBe(false);
			expect(wrapper.find("[data-testid='assignment-max-points-computed']").exists()).toBe(true);
		});

		it("adds, edits and removes criteria, keeping maxPoints in sync with their sum", async () => {
			const { wrapper, modelValue } = setupWrapper();
			await wrapper.find("[data-testid='assignment-rubric-toggle'] input").setValue(true);

			const nameField = wrapper.find("[data-testid='assignment-rubric-criterion-name'] input");
			await nameField.setValue("Content");
			const pointsField = wrapper.find("[data-testid='assignment-rubric-criterion-max-points'] input");
			await pointsField.setValue("6");

			await wrapper.find("[data-testid='assignment-rubric-add-criterion']").trigger("click");
			const secondPointsField = wrapper.findAll("[data-testid='assignment-rubric-criterion-max-points'] input")[1];
			await secondPointsField.setValue("4");

			expect(modelValue.value.criteria).toHaveLength(2);
			expect(modelValue.value.maxPoints).toEqual(10);

			await wrapper.findAll("[data-testid='assignment-rubric-remove-criterion']")[1].trigger("click");

			expect(modelValue.value.criteria).toHaveLength(1);
			expect(modelValue.value.maxPoints).toEqual(6);
		});

		it("clears criteria and falls back to flat points when disabled again", async () => {
			const { wrapper, modelValue } = setupWrapper();
			await wrapper.find("[data-testid='assignment-rubric-toggle'] input").setValue(true);

			await wrapper.find("[data-testid='assignment-rubric-toggle'] input").setValue(false);

			expect(modelValue.value.criteria).toBeUndefined();
			expect(wrapper.find("[data-testid='assignment-max-points']").exists()).toBe(true);
		});
	});

	describe("peer review", () => {
		it("hides the mode/count fields until peer review is enabled", () => {
			const { wrapper } = setupWrapper();

			expect(wrapper.find("[data-testid='assignment-peer-review-mode']").exists()).toBe(false);
		});

		it("enables peer review and calls the dedicated settings endpoint", async () => {
			const { wrapper, element } = setupWrapper();

			await wrapper.find("[data-testid='assignment-peer-review-toggle'] input").setValue(true);

			expect(updateSettingsMock).toHaveBeenCalledWith(element.id, {
				enabled: true,
				mode: "manual",
				count: 1,
			});
			expect(wrapper.find("[data-testid='assignment-peer-review-mode']").exists()).toBe(true);
		});

		it("shows the reviewer-count field only in auto mode", async () => {
			const { wrapper } = setupWrapper();
			await wrapper.find("[data-testid='assignment-peer-review-toggle'] input").setValue(true);

			expect(wrapper.find("[data-testid='assignment-peer-review-count']").exists()).toBe(false);

			await wrapper.findComponent({ name: "VSelect" }).vm.$emit("update:modelValue", "auto");

			expect(wrapper.find("[data-testid='assignment-peer-review-count']").exists()).toBe(true);
		});
	});
});
