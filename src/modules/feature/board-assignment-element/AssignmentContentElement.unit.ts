import AssignmentContentElement from "./AssignmentContentElement.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { dateFromToday } from "@/utils/date-time.utils";
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
	const setupWrapper = (
		options: {
			isEditMode?: boolean;
			canEdit?: boolean;
			element?: AssignmentElement;
			// override for the exact scenario allowedOperations.updateElement can lie about (a
			// reader on a readersCanEdit board) - see the isBoardEditor regression test below
			allowedOperations?: Record<string, boolean>;
		} = {}
	) => {
		useBoardAllowedOperationsMock.mockReturnValue({
			allowedOperations: computed(() => options.allowedOperations ?? { isBoardEditor: options.canEdit ?? false }),
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

	// Regression test: on a board with readersCanEdit, allowedOperations.updateElement is true
	// for a plain reader too (that's the whole point of the setting) - but the assignment's
	// manage/teacher view must not follow updateElement, only isBoardEditor (see the doc comment
	// on canManageAssignments). A reader must see their own submission UI, not the teacher view.
	it("does not treat updateElement:true as canManageAssignments - only isBoardEditor decides", () => {
		const { wrapper } = setupWrapper({
			isEditMode: false,
			allowedOperations: { updateElement: true, isBoardEditor: false },
		});

		expect(wrapper.findComponent({ name: "AssignmentElementStudentDisplay" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "AssignmentElementTeacherDisplay" }).exists()).toBe(false);
	});

	it("shows the assignment title", () => {
		const element = assignmentElementResponseFactory.build({ content: { title: "Essay" } });
		const { wrapper } = setupWrapper({ element, canEdit: false });

		expect(wrapper.text()).toContain("Essay");
	});

	it("hides the element completely for students before the start date", () => {
		const element = assignmentElementResponseFactory.build();
		element.content.startDate = dateFromToday(1, "day");
		const { wrapper } = setupWrapper({ element, canEdit: false });

		expect(wrapper.find("[data-testid='board-assignment-element']").exists()).toBe(false);
	});

	it("shows the element for students once the start date has passed", () => {
		const element = assignmentElementResponseFactory.build();
		element.content.startDate = dateFromToday(-1, "day");
		const { wrapper } = setupWrapper({ element, canEdit: false });

		expect(wrapper.find("[data-testid='board-assignment-element']").exists()).toBe(true);
	});

	it("always shows the element for teachers, even before the start date", () => {
		const element = assignmentElementResponseFactory.build();
		element.content.startDate = dateFromToday(1, "day");
		const { wrapper } = setupWrapper({ element, canEdit: true });

		expect(wrapper.find("[data-testid='board-assignment-element']").exists()).toBe(true);
	});
});
