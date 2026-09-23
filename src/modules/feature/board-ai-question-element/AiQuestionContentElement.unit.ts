import AiQuestionContentElement from "./AiQuestionContentElement.vue";
import { aiQuestionElementResponseFactory } from "@@/tests/test-utils/factory/aiQuestionElementResponseFactory";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";
import { computed } from "vue";

const mocks = vi.hoisted(() => ({
	isStudent: { value: false },
	useBoardFocusHandler: vi.fn(),
}));

vi.mock("@data-app", () => ({
	useAppStoreRefs: () => ({ isStudent: mocks.isStudent }),
}));

vi.mock("@data-board", () => ({
	useBoardAllowedOperations: () => ({ allowedOperations: computed(() => ({ isBoardEditor: true })) }),
	useBoardFocusHandler: mocks.useBoardFocusHandler,
}));

describe("AiQuestionContentElement", () => {
	const setup = (isStudent: boolean, isEditMode = true) => {
		mocks.isStudent.value = isStudent;
		return mount(AiQuestionContentElement, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: {
					AiQuestionElementEdit: true,
					AiQuestionElementTeacherDisplay: true,
					AiQuestionElementStudentDisplay: true,
					BoardMenu: true,
				},
			},
			props: {
				element: aiQuestionElementResponseFactory.build(),
				isEditMode,
				columnIndex: 0,
				rowIndex: 0,
				elementIndex: 0,
			},
		});
	};

	it("allows a teacher with board edit rights to edit the element", () => {
		const wrapper = setup(false);

		expect(wrapper.findComponent({ name: "AiQuestionElementEdit" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "AiQuestionElementStudentDisplay" }).exists()).toBe(false);
	});

	it("never shows the editor to a student with board edit rights", () => {
		const wrapper = setup(true);

		expect(wrapper.findComponent({ name: "AiQuestionElementEdit" }).exists()).toBe(false);
		expect(wrapper.findComponent({ name: "AiQuestionElementStudentDisplay" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "BoardMenu" }).exists()).toBe(false);
	});
});
