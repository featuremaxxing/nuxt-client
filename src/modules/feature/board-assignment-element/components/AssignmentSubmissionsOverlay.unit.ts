import AssignmentSubmissionsOverlay from "./AssignmentSubmissionsOverlay.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { assignmentElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { AssignmentStatus, AssignmentSubmissionResponse } from "@api-server";
import { mount } from "@vue/test-utils";

const { fetchSubmissionsMock, gradeSubmissionMock, returnSubmissionMock, fetchFilesMock, getFileRecordsByParentIdMock } =
	vi.hoisted(() => ({
		fetchSubmissionsMock: vi.fn(),
		gradeSubmissionMock: vi.fn(),
		returnSubmissionMock: vi.fn(),
		fetchFilesMock: vi.fn(),
		getFileRecordsByParentIdMock: vi.fn(),
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
		fetchFiles: fetchFilesMock,
		getFileRecordsByParentId: getFileRecordsByParentIdMock,
		upload: vi.fn(),
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
	returnedAt: null,
	comment: null,
	feedbackAudio: null,
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
		fetchFilesMock.mockResolvedValue(undefined);
		getFileRecordsByParentIdMock.mockReturnValue([]);
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

	it("should fetch the file records of every submission for previews and audio", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(fetchFilesMock).toHaveBeenCalledWith("submission-1", "boardnodes");
		expect(wrapper.find("[data-testid='submission-file-row']").exists()).toBe(true);
	});

	it("should filter submissions by status", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [
				buildSubmission({ userId: "user-1", id: "submission-1", status: AssignmentStatus.OPEN, lastName: "Zimmermann" }),
				buildSubmission({ userId: "user-2", id: "submission-2", status: AssignmentStatus.RETURNED, lastName: "Adler" }),
			],
		});
		const { wrapper } = setup();

		await vi.dynamicImportSettled();
		expect(wrapper.findAll("[data-testid='submission-block']")).toHaveLength(2);

		const chips = wrapper.findAll("[data-testid='assignment-filter-chip']");
		const returnedChip = chips.find((chip) => chip.text().includes("filter.returned"));
		await returnedChip?.trigger("click");

		const blocks = wrapper.findAll("[data-testid='submission-block']");
		expect(blocks).toHaveLength(1);
		expect(blocks[0].text()).toContain("Adler");
	});

	it("should sort submissions by name", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [
				buildSubmission({ userId: "user-1", id: "submission-1", firstName: "Zoe", lastName: "Zimmermann" }),
				buildSubmission({ userId: "user-2", id: "submission-2", firstName: "Anna", lastName: "Adler" }),
			],
		});
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		const names = wrapper.findAll("[data-testid='submission-name']").map((node) => node.text());
		expect(names[0]).toContain("Adler");
		expect(names[1]).toContain("Zimmermann");
	});

	it("should build a csv file with all submissions and download it", async () => {
		const originalCreateObjectUrl = URL.createObjectURL;
		let createdBlob: Blob | undefined;
		URL.createObjectURL = vi.fn((blob: Blob) => {
			createdBlob = blob;
			return "blob:csv";
		});

		try {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: [buildSubmission({ points: 7, comment: "Anmerkung", feedbackComment: "Gut" })],
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();
			await wrapper.find("[data-testid='assignment-csv-button']").trigger("click");

			expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
			expect(createdBlob).toBeInstanceOf(Blob);
			// Blob.text() strips a leading BOM, so the BOM is asserted on byte level
			const bytes = new Uint8Array(await createdBlob!.arrayBuffer());
			expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
			const csv = await createdBlob!.text();
			expect(csv).toContain("Admin, Anna");
			expect(csv).toContain("Gut");
			expect(csv).toContain("Anmerkung");
		} finally {
			URL.createObjectURL = originalCreateObjectUrl;
		}
	});

	it("should offer the archive download button", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='assignment-archive-button']").exists()).toBe(true);
	});
});
