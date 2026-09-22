import AssignmentsOverview from "./AssignmentsOverview.vue";
import { AssignmentListItemResponse } from "@api-server";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

const buildItem = (overrides: Partial<AssignmentListItemResponse> = {}): AssignmentListItemResponse => ({
	id: "assignment-1",
	roomId: "room-1",
	boardId: "board-1",
	cardId: "card-1",
	title: "Essay: Goethe",
	startDate: null,
	dueDate: "2099-01-20T10:00:00.000Z",
	lateUntil: null,
	isStarted: true,
	isSubmittable: true,
	maxPoints: 10,
	submissionsSubmitted: null,
	submissionsTotal: null,
	ownSubmissionStatus: null,
	ownSubmissionIsLate: null,
	...overrides,
});

describe("AssignmentsOverview", () => {
	const setup = ({
		assignments = [] as AssignmentListItemResponse[],
		currentAssignments = [] as AssignmentListItemResponse[],
		pastAssignments = [] as AssignmentListItemResponse[],
		loading = false,
	} = {}) => {
		const wrapper = mount(AssignmentsOverview, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: {
				loading,
				assignments,
				currentAssignments,
				pastAssignments,
			},
		});

		return { wrapper };
	};

	it("should show a loading indicator while loading", () => {
		const { wrapper } = setup({ loading: true });

		expect(wrapper.find("[data-testid='assignments-loading']").exists()).toBe(true);
	});

	it("should show an empty state when there are no assignments", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid='assignments-empty']").exists()).toBe(true);
	});

	it("should list current and past assignments in separate sections", () => {
		const current = buildItem({ id: "current-1" });
		const past = buildItem({ id: "past-1" });

		const { wrapper } = setup({
			assignments: [current, past],
			currentAssignments: [current],
			pastAssignments: [past],
		});

		const currentItems = wrapper.findAll("[data-testid='assignments-current-list'] [data-testid='assignment-list-item']");
		const pastItems = wrapper.findAll("[data-testid='assignments-past-list'] [data-testid='assignment-list-item']");

		expect(currentItems).toHaveLength(1);
		expect(pastItems).toHaveLength(1);
	});
});
