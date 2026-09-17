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

	it("should show a loading skeleton before the submission counts arrive", () => {
		fetchSubmissionsMock.mockReturnValue(new Promise(() => undefined));
		const { wrapper } = setupWrapper();

		expect(wrapper.find("[data-testid='assignment-progress-skeleton']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='assignment-progress-label']").exists()).toBe(false);
	});

	it("should show submitted and graded counts once submissions are loaded", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [
				{ id: "1", userId: "u1", status: "returned", isLate: false, points: 8 },
				{ id: "2", userId: "u2", status: "submitted", isLate: false, points: null },
				{ id: "3", userId: "u3", status: "open", isLate: false, points: null },
			],
		});
		const { wrapper } = setupWrapper();

		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='assignment-progress-skeleton']").exists()).toBe(false);
		const label = wrapper.find("[data-testid='assignment-progress-label']").text();
		expect(label).toContain("submittedOf");
		expect(label).toContain("submissionsProgress");
	});
});
