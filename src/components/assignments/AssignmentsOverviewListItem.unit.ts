import AssignmentsOverviewListItem from "./AssignmentsOverviewListItem.vue";
import { AssignmentListItemResponse, AssignmentStatus } from "@api-server";
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

describe("AssignmentsOverviewListItem", () => {
	const setup = (assignment: AssignmentListItemResponse = buildItem()) => {
		const wrapper = mount(AssignmentsOverviewListItem, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: { assignment },
		});

		return { wrapper };
	};

	it("should show the assignment title", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid='assignment-item-title']").text()).toContain("Essay: Goethe");
	});

	it("should show the due date chip", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid='assignment-item-due-date']").exists()).toBe(true);
	});

	it("should show the start date chip for not-yet-started assignments", () => {
		const { wrapper } = setup(buildItem({ startDate: "2099-01-10T09:00:00.000Z", isStarted: false, isSubmittable: false }));

		expect(wrapper.find("[data-testid='assignment-item-start-date']").exists()).toBe(true);
	});

	it("should show submission counts for teachers", () => {
		const { wrapper } = setup(buildItem({ submissionsSubmitted: 3, submissionsTotal: 5 }));

		expect(wrapper.find("[data-testid='assignment-item-submissions']").text()).toContain(
			"pages.assignments.submissions"
		);
	});

	it("should not show submission counts for students", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid='assignment-item-submissions']").exists()).toBe(false);
	});

	it("should show the student's own submission status with a late hint", () => {
		const { wrapper } = setup(
			buildItem({ ownSubmissionStatus: AssignmentStatus.SUBMITTED, ownSubmissionIsLate: true })
		);

		const status = wrapper.find("[data-testid='assignment-item-status']");
		expect(status.exists()).toBe(true);
		expect(status.text()).toContain("components.cardElement.assignmentElement.status.submitted");
		expect(status.text()).toContain("components.cardElement.assignmentElement.status.late");
	});

	it("should emit a click for navigation", async () => {
		const { wrapper } = setup();

		await wrapper.find("[data-testid='assignment-list-item']").trigger("click");

		expect(wrapper.emitted("click")).toHaveLength(1);
	});
});
