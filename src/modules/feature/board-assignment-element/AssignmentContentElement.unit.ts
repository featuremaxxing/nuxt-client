import AssignmentContentElement from "./AssignmentContentElement.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { assignmentElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";
import { computed } from "vue";

const { useBoardAllowedOperationsMock, useBoardFocusHandlerMock } = vi.hoisted(() => ({
	useBoardAllowedOperationsMock: vi.fn(),
	useBoardFocusHandlerMock: vi.fn(),
}));

vi.mock("@data-board", () => ({
	useBoardAllowedOperations: useBoardAllowedOperationsMock,
	useBoardFocusHandler: useBoardFocusHandlerMock,
}));

describe("AssignmentContentElement", () => {
	const setupWrapper = (options: { isEditMode?: boolean; canEdit?: boolean; element?: AssignmentElement } = {}) => {
		useBoardAllowedOperationsMock.mockReturnValue({
			allowedOperations: computed(() => ({ updateElement: options.canEdit ?? false })),
		});

		const element = options.element ?? assignmentElementResponseFactory.build();

		const wrapper = mount(AssignmentContentElement, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: {
					AssignmentElementEdit: true,
					AssignmentElementTeacherDisplay: true,
					AssignmentElementStudentDisplay: true,
				},
			},
			props: {
				element,
				isEditMode: options.isEditMode ?? false,
				columnIndex: 0,
				rowIndex: 0,
				elementIndex: 0,
			},
		});

		return { wrapper };
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("shows the configuration form when the card is in edit mode", () => {
		const { wrapper } = setupWrapper({ isEditMode: true, canEdit: true });

		expect(wrapper.findComponent({ name: "AssignmentElementEdit" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "AssignmentElementTeacherDisplay" }).exists()).toBe(false);
		expect(wrapper.findComponent({ name: "AssignmentElementStudentDisplay" }).exists()).toBe(false);
	});

	it("shows the teacher tile for a user allowed to edit the board, outside edit mode", () => {
		const { wrapper } = setupWrapper({ isEditMode: false, canEdit: true });

		expect(wrapper.findComponent({ name: "AssignmentElementTeacherDisplay" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "AssignmentElementEdit" }).exists()).toBe(false);
		expect(wrapper.findComponent({ name: "AssignmentElementStudentDisplay" }).exists()).toBe(false);
	});

	it("shows the student submission UI for a user without edit rights", () => {
		const { wrapper } = setupWrapper({ isEditMode: false, canEdit: false });

		expect(wrapper.findComponent({ name: "AssignmentElementStudentDisplay" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "AssignmentElementEdit" }).exists()).toBe(false);
		expect(wrapper.findComponent({ name: "AssignmentElementTeacherDisplay" }).exists()).toBe(false);
	});

	it("shows the assignment title", () => {
		const element = assignmentElementResponseFactory.build({ content: { title: "Essay" } });
		const { wrapper } = setupWrapper({ element, canEdit: false });

		expect(wrapper.text()).toContain("Essay");
	});
});
