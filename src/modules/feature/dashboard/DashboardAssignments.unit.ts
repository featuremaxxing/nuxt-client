import DashboardAssignments from "./DashboardAssignments.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { AssignmentListItemResponse } from "@api-server";
import { mount } from "@vue/test-utils";
import { Ref } from "vue";

const mocks = vi.hoisted(() => ({
	currentAssignments: { __v_isRef: true, value: [] } as unknown as Ref<AssignmentListItemResponse[]>,
	loading: { __v_isRef: true, value: false } as unknown as Ref<boolean>,
	push: vi.fn(),
}));

vi.mock("@data-assignment", () => ({
	useAssignmentsOfOverview: () => ({
		currentAssignments: mocks.currentAssignments,
		loading: mocks.loading,
	}),
}));

vi.mock("vue-router", () => ({
	useRouter: () => ({ push: mocks.push }),
}));

const buildAssignment = (overrides: Partial<AssignmentListItemResponse> = {}): AssignmentListItemResponse => ({
	id: "assignment-1",
	roomId: "room-1",
	boardId: "board-1",
	cardId: "card-1",
	title: "Current assignment",
	startDate: null,
	dueDate: null,
	lateUntil: null,
	isStarted: true,
	isSubmittable: true,
	maxPoints: null,
	submissionsSubmitted: null,
	submissionsTotal: null,
	ownSubmissionStatus: null,
	ownSubmissionIsLate: null,
	...overrides,
});

describe("DashboardAssignments", () => {
	const setup = () =>
		mount(DashboardAssignments, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
		});

	beforeEach(() => {
		mocks.currentAssignments.value = [];
		mocks.loading.value = false;
		mocks.push.mockReset();
	});

	it("is hidden when there are no current assignments", () => {
		const wrapper = setup();

		expect(wrapper.find("[data-testid='dashboard-assignments']").exists()).toBe(false);
	});

	it("shows current assignments and opens their board card", async () => {
		mocks.currentAssignments.value = [buildAssignment()];
		const wrapper = setup();

		expect(wrapper.findAll("[data-testid='assignment-list-item']")).toHaveLength(1);
		await wrapper.get("[data-testid='assignment-list-item']").trigger("click");
		expect(mocks.push).toHaveBeenCalledWith("/boards/board-1/cards/card-1");
	});
});
