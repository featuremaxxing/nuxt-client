import AssignmentElementTeacherDisplay from "./AssignmentElementTeacherDisplay.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { assignmentElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

const { fetchSubmissionsMock } = vi.hoisted(() => ({
	fetchSubmissionsMock: vi.fn(),
}));

vi.mock("@data-assignment", () => ({
	useAssignmentApi: () => ({
		fetchSubmissions: fetchSubmissionsMock,
	}),
}));

vi.mock("@data-file", () => ({
	useFileStorageApi: () => ({
		fetchFiles: vi.fn(),
		getFileRecordsByParentId: vi.fn(() => []),
	}),
}));

describe("AssignmentElementTeacherDisplay", () => {
	const setupWrapper = (element: AssignmentElement = assignmentElementResponseFactory.build()) => {
		const wrapper = mount(AssignmentElementTeacherDisplay, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: { element },
		});

		return { wrapper };
	};

	beforeEach(() => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: null,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should show a start date chip when a start date is set", () => {
		const element = assignmentElementResponseFactory.build();
		element.content.startDate = "2099-01-10T10:00:00.000Z";
		const { wrapper } = setupWrapper(element);

		const chip = wrapper.find("[data-testid='assignment-start-date-chip']");
		expect(chip.exists()).toBe(true);
		expect(chip.text()).toContain("components.cardElement.assignmentElement.startDateLabel");
	});

	it("should not show a start date chip when there is no start date", () => {
		const { wrapper } = setupWrapper();

		expect(wrapper.find("[data-testid='assignment-start-date-chip']").exists()).toBe(false);
	});
});
