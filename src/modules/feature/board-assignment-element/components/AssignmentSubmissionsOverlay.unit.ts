import AssignmentSubmissionsOverlay from "./AssignmentSubmissionsOverlay.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { assignmentElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { AssignmentStatus, AssignmentSubmissionResponse } from "@api-server";
import { mount } from "@vue/test-utils";

const { fetchSubmissionsMock, gradeSubmissionMock, returnSubmissionMock } = vi.hoisted(() => ({
	fetchSubmissionsMock: vi.fn(),
	gradeSubmissionMock: vi.fn(),
	returnSubmissionMock: vi.fn(),
}));

vi.mock("@data-assignment", () => ({
	useAssignmentApi: () => ({
		fetchSubmissions: fetchSubmissionsMock,
		gradeSubmission: gradeSubmissionMock,
		returnSubmission: returnSubmissionMock,
	}),
}));

vi.mock("@data-file", () => ({
	useFileStorageApi: () => ({
		fetchFiles: vi.fn(),
		getFileRecordsByParentId: vi.fn(() => []),
	}),
}));

const buildSubmission = (overrides: Partial<AssignmentSubmissionResponse> = {}): AssignmentSubmissionResponse => ({
	id: "submission-1",
	userId: "user-1",
	firstName: "Anna",
	lastName: "Admin",
	status: AssignmentStatus.SUBMITTED,
	submittedAt: "2099-01-15T10:00:00.000Z",
	isLate: false,
	file: { fileRecordId: "file-1", name: "essay.pdf" },
	points: null,
	feedbackComment: null,
	...overrides,
});

describe("AssignmentSubmissionsOverlay", () => {
	let element: AssignmentElement;

	beforeEach(() => {
		element = assignmentElementResponseFactory.build();
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [buildSubmission()],
		});
		gradeSubmissionMock.mockResolvedValue(undefined);
		returnSubmissionMock.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const setup = (isOpen = true) => {
		const wrapper = mount(AssignmentSubmissionsOverlay, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				// VDialog teleports into the document body - stub it to render inline
				stubs: {
					VDialog: { template: "<div><slot /></div>" },
					VCard: { template: "<div><slot /></div>" },
					VCardTitle: { template: "<div><slot /></div>" },
					VCardText: { template: "<div><slot /></div>" },
				},
			},
			props: { element, isOpen },
		});

		return { wrapper };
	};

	it("should load the submissions when the overlay opens", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(fetchSubmissionsMock).toHaveBeenCalledWith(element.id);
		expect(wrapper.findAll("[data-testid='submission-block']").length).toBeGreaterThan(0);
	});

	it("should not load while the overlay is closed", async () => {
		setup(false);

		await vi.dynamicImportSettled();

		expect(fetchSubmissionsMock).not.toHaveBeenCalled();
	});

	it("should show the student name, the file and the status", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='submission-name']").text()).toContain("Anna");
		expect(wrapper.find("[data-testid='submission-file-name']").text()).toContain("essay.pdf");
		expect(wrapper.find("[data-testid='submission-status']").exists()).toBe(true);
	});

	it("should save a draft grade via the grade endpoint", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		const pointsInput = wrapper.find("[data-testid='submission-points-input'] input");
		await pointsInput.setValue("7");
		await wrapper.find("[data-testid='submission-save-grade']").trigger("click");

		expect(gradeSubmissionMock).toHaveBeenCalledWith("submission-1", { points: 7, feedbackComment: null });
	});

	it("should return a submission via the return endpoint", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		const feedbackInput = wrapper.find("[data-testid='submission-feedback-input'] textarea");
		await feedbackInput.setValue("well done");
		await wrapper.find("[data-testid='submission-return']").trigger("click");

		expect(returnSubmissionMock).toHaveBeenCalledWith("submission-1", {
			points: undefined,
			feedbackComment: "well done",
		});
	});

	it("should show the student's comment when present", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [buildSubmission({ comment: "Bitteespitzen beachten" })],
		});
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='submission-comment']").text()).toContain("Bitteespitzen beachten");
	});

	it("should not show a comment row when there is no comment", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='submission-comment']").exists()).toBe(false);
	});

	it("should emit close when the close button is clicked", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();
		await wrapper.find("[data-testid='submissions-overlay-close']").trigger("click");

		expect(wrapper.emitted("close")).toHaveLength(1);
	});
});
