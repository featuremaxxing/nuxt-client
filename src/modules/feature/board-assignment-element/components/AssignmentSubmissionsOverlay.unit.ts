import AssignmentPdfAnnotator from "./AssignmentPdfAnnotator.vue";
import AssignmentSubmissionsOverlay from "./AssignmentSubmissionsOverlay.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { FileRecordParent } from "@/types/file/File";
import { assignmentElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { AssignmentStatus, AssignmentSubmissionResponse } from "@api-server";
import { mount } from "@vue/test-utils";

const {
	fetchSubmissionsMock,
	gradeSubmissionMock,
	returnSubmissionMock,
	fetchFilesMock,
	getFileRecordsByParentIdMock,
	uploadMock,
} = vi.hoisted(() => ({
	fetchSubmissionsMock: vi.fn(),
	gradeSubmissionMock: vi.fn(),
	returnSubmissionMock: vi.fn(),
	fetchFilesMock: vi.fn(),
	getFileRecordsByParentIdMock: vi.fn(),
	uploadMock: vi.fn(),
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
		upload: uploadMock,
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
		uploadMock.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const setup = (isOpen = true) => {
		const wrapper = mount(AssignmentSubmissionsOverlay, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				// VDialog and VMenu teleport into the document body - stub them to render inline
				stubs: {
					VDialog: { template: "<div><slot /></div>" },
					VCard: { template: "<div><slot /></div>" },
					VCardTitle: { template: "<div><slot /></div>" },
					VCardText: { template: "<div><slot /></div>" },
					VMenu: { template: "<div><slot name='activator' :props='{}' /><slot /></div>" },
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
				buildSubmission({
					userId: "user-1",
					id: "submission-1",
					status: AssignmentStatus.OPEN,
					lastName: "Zimmermann",
				}),
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

	it("should keep feedback files out of the submission file slot and list them separately", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [
				buildSubmission({
					feedbackFiles: [{ fileRecordId: "record-fb", name: "feedback-pdf-1.pdf" }],
				}),
			],
		});
		getFileRecordsByParentIdMock.mockReturnValue([
			{
				id: "record-sub",
				name: "essay.pdf",
				url: "https://api/files/essay.pdf",
				mimeType: "application/pdf",
				previewStatus: "possible",
			},
			{
				id: "record-fb",
				name: "feedback-pdf-1.pdf",
				url: "https://api/files/feedback-pdf-1.pdf",
				mimeType: "application/pdf",
				previewStatus: "possible",
			},
		]);
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='submission-file-name']").text()).toContain("essay.pdf");
		const feedbackRows = wrapper.findAll("[data-testid='submission-feedback-file']");
		expect(feedbackRows).toHaveLength(1);
		// the raw file name is not shown to the teacher - only a readable "Korrektur (date)" label
		expect(feedbackRows[0].text()).not.toContain("feedback-pdf-1.pdf");
		expect(feedbackRows[0].find("[data-testid='submission-feedback-annotate-record-fb']").exists()).toBe(true);
	});

	it("should open the annotator for a pdf submission and upload the correction with a feedback prefix", async () => {
		getFileRecordsByParentIdMock.mockReturnValue([
			{
				id: "record-sub",
				name: "essay.pdf",
				url: "https://api/files/essay.pdf",
				mimeType: "application/pdf",
				previewStatus: "possible",
			},
		]);
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='submission-annotate']").exists()).toBe(true);
		await wrapper.find("[data-testid='submission-annotate']").trigger("click");

		const annotator = wrapper.findComponent(AssignmentPdfAnnotator);
		expect(annotator.exists()).toBe(true);

		const blob = new Blob(["annotated"], { type: "application/pdf" });
		annotator.vm.$emit("save", { blob, name: "feedback-pdf-123.pdf" });
		await vi.dynamicImportSettled();

		expect(uploadMock).toHaveBeenCalledTimes(1);
		const [file, parentId, parentType] = uploadMock.mock.calls[0];
		expect(file.name).toBe("feedback-pdf-123.pdf");
		expect(file.type).toBe("application/pdf");
		expect(parentId).toBe("submission-1");
		expect(parentType).toBe(FileRecordParent.BOARDNODES);
		// the overlay reloads so the new feedback file shows up
		expect(fetchSubmissionsMock).toHaveBeenCalledTimes(2);
	});

	it("should keep the annotator open and show an error when the upload fails", async () => {
		uploadMock.mockRejectedValue(new Error("storage broken"));
		getFileRecordsByParentIdMock.mockReturnValue([
			{
				id: "record-sub",
				name: "essay.pdf",
				url: "https://api/files/essay.pdf",
				mimeType: "application/pdf",
				previewStatus: "possible",
			},
		]);
		const { wrapper } = setup();

		await vi.dynamicImportSettled();
		await wrapper.find("[data-testid='submission-annotate']").trigger("click");

		const annotator = wrapper.findComponent(AssignmentPdfAnnotator);
		annotator.vm.$emit("save", { blob: new Blob(["x"]), name: "feedback-pdf-123.pdf" });
		await vi.dynamicImportSettled();

		expect(annotator.props("isOpen")).toBe(true);
		expect(annotator.props("errorMessage")).toBeTruthy();
		expect(fetchSubmissionsMock).toHaveBeenCalledTimes(1);
	});

	it("should pass the student name to the annotator", async () => {
		getFileRecordsByParentIdMock.mockReturnValue([
			{
				id: "record-sub",
				name: "essay.pdf",
				url: "https://api/files/essay.pdf",
				mimeType: "application/pdf",
				previewStatus: "possible",
			},
		]);
		const { wrapper } = setup();

		await vi.dynamicImportSettled();
		await wrapper.find("[data-testid='submission-annotate']").trigger("click");

		const annotator = wrapper.findComponent(AssignmentPdfAnnotator);
		expect(annotator.props("studentName")).toBe("Anna Admin");
	});

	it("should offer the newest correction per kind for further editing and hide older versions", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [
				buildSubmission({
					feedbackFiles: [
						{ fileRecordId: "record-pdf-2", name: "feedback-pdf-2.pdf" },
						{ fileRecordId: "record-pdf-1", name: "feedback-pdf-1.pdf" },
					],
				}),
			],
		});
		getFileRecordsByParentIdMock.mockReturnValue([
			{
				id: "record-sub",
				name: "essay.pdf",
				url: "https://api/files/essay.pdf",
				mimeType: "application/pdf",
				previewStatus: "possible",
			},
			{
				id: "record-pdf-1",
				name: "feedback-pdf-1.pdf",
				url: "https://api/files/feedback-pdf-1.pdf",
				mimeType: "application/pdf",
				previewStatus: "possible",
			},
			{
				id: "record-pdf-2",
				name: "feedback-pdf-2.pdf",
				url: "https://api/files/feedback-pdf-2.pdf",
				mimeType: "application/pdf",
				previewStatus: "possible",
			},
		]);
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		const rows = wrapper.findAll("[data-testid='submission-feedback-file']");
		expect(rows).toHaveLength(1);
		// only the newest correction (record-pdf-2) is offered - the raw name is never shown
		expect(rows[0].find("[data-testid='submission-feedback-annotate-record-pdf-2']").exists()).toBe(true);
		expect(rows[0].find("[data-testid='submission-feedback-annotate-record-pdf-1']").exists()).toBe(false);

		// "continue editing" opens the annotator with the existing correction
		await rows[0].find("[data-testid='submission-feedback-annotate-record-pdf-2']").trigger("click");
		const annotator = wrapper.findComponent(AssignmentPdfAnnotator);
		expect(annotator.props("source")).toMatchObject({
			kind: "pdf",
			url: "https://api/files/feedback-pdf-2.pdf",
		});

		annotator.vm.$emit("save", { blob: new Blob(["v3"], { type: "application/pdf" }), name: "feedback-pdf-3.pdf" });
		await vi.dynamicImportSettled();

		expect(uploadMock).toHaveBeenCalledTimes(1);
		expect(uploadMock.mock.calls[0][0].name).toBe("feedback-pdf-3.pdf");
		expect(fetchSubmissionsMock).toHaveBeenCalledTimes(2);
	});

	it("should not offer the annotate button for non-visual files", async () => {
		getFileRecordsByParentIdMock.mockReturnValue([
			{
				id: "record-sub",
				name: "notes.txt",
				url: "https://api/files/notes.txt",
				mimeType: "text/plain",
				previewStatus: "justified-impossible",
			},
		]);
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='submission-annotate']").exists()).toBe(false);
	});

	it("should auto-select the first submission and switch the detail when another student is picked", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [
				buildSubmission({ userId: "user-1", id: "submission-1", firstName: "Anna", lastName: "Adler" }),
				buildSubmission({ userId: "user-2", id: "submission-2", firstName: "Ben", lastName: "Berger" }),
			],
		});
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Adler");

		const blocks = wrapper.findAll("[data-testid='submission-block']");
		await blocks[1].trigger("click");

		expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Berger");
	});

	it("should show an empty state when the filter has no matches", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [buildSubmission({ status: AssignmentStatus.SUBMITTED })],
		});
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		const chips = wrapper.findAll("[data-testid='assignment-filter-chip']");
		const openChip = chips.find((chip) => chip.text().includes("filter.open"));
		await openChip?.trigger("click");

		expect(wrapper.text()).toContain("noSubmissionsForFilter");
		expect(wrapper.find("[data-testid='submission-detail-name']").exists()).toBe(false);
	});

	it("should show the graded/open progress summary", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [
				buildSubmission({ userId: "user-1", id: "submission-1", status: AssignmentStatus.RETURNED, points: 8 }),
				buildSubmission({ userId: "user-2", id: "submission-2", status: AssignmentStatus.SUBMITTED, points: null }),
			],
		});
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		const progress = wrapper.find("[data-testid='submissions-overlay-progress']").text();
		expect(progress).toContain("submissionsProgress");
	});
});
