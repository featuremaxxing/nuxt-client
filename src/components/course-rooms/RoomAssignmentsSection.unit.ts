import RoomAssignmentsSection from "./RoomAssignmentsSection.vue";
import { AssignmentListItemResponse } from "@api-server";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

const { listAssignmentsMock } = vi.hoisted(() => ({
	listAssignmentsMock: vi.fn(),
}));

vi.mock("@data-assignment", () => ({
	useAssignmentApi: () => ({
		listAssignments: listAssignmentsMock,
	}),
}));

const buildItem = (overrides: Partial<AssignmentListItemResponse> = {}): AssignmentListItemResponse => ({
	id: "assignment-1",
	roomId: "room-1",
	boardId: "board-1",
	cardId: "card-1",
	title: "Essay: Goethe",
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

describe("RoomAssignmentsSection", () => {
	const setup = async (assignments: AssignmentListItemResponse[] = []) => {
		listAssignmentsMock.mockResolvedValue({ assignments });

		const wrapper = mount(RoomAssignmentsSection, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: { roomId: "room-1" },
		});
		await vi.dynamicImportSettled();

		return { wrapper };
	};

	beforeEach(() => {
		listAssignmentsMock.mockClear();
	});

	it("should fetch the room's assignments on mount", async () => {
		const { wrapper } = await setup([buildItem()]);

		expect(listAssignmentsMock).toHaveBeenCalledWith("room-1");
		expect(wrapper.find("[data-testid='room-assignments-list']").exists()).toBe(true);
	});

	it("should render nothing when the room has no assignments", async () => {
		const { wrapper } = await setup([]);

		expect(wrapper.find("[data-testid='room-assignments-section']").exists()).toBe(false);
	});
});
