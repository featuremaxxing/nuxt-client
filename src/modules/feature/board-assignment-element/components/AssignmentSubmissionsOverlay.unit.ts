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
	ensureFeedbackContainerMock,
	gradeSubmissionMock,
	returnSubmissionMock,
	returnSubmissionsBatchMock,
	autoAssignMock,
	manualAssignMock,
	listAssignmentsMock,
	unassignMock,
	fetchFilesMock,
	getFileRecordsByParentIdMock,
	uploadMock,
} = vi.hoisted(() => ({
	fetchSubmissionsMock: vi.fn(),
	ensureFeedbackContainerMock: vi.fn(),
	gradeSubmissionMock: vi.fn(),
	returnSubmissionMock: vi.fn(),
	returnSubmissionsBatchMock: vi.fn(),
	autoAssignMock: vi.fn(),
	manualAssignMock: vi.fn(),
	listAssignmentsMock: vi.fn(),
	unassignMock: vi.fn(),
	fetchFilesMock: vi.fn(),
	getFileRecordsByParentIdMock: vi.fn(),
	uploadMock: vi.fn(),
}));

vi.mock("@data-assignment", () => ({
	useAssignmentApi: () => ({
		fetchSubmissions: fetchSubmissionsMock,
		ensureFeedbackContainer: ensureFeedbackContainerMock,
		gradeSubmission: gradeSubmissionMock,
		returnSubmission: returnSubmissionMock,
		returnSubmissionsBatch: returnSubmissionsBatchMock,
	}),
	usePeerReviewApi: () => ({
		autoAssign: autoAssignMock,
		manualAssign: manualAssignMock,
		listAssignments: listAssignmentsMock,
		unassign: unassignMock,
	}),
}));

vi.mock("@data-app", () => ({
	notifySuccess: vi.fn(),
	notifyError: vi.fn(),
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
		returnSubmissionsBatchMock.mockResolvedValue({ returned: [], failed: [] });
		autoAssignMock.mockResolvedValue({ assignedCount: 0 });
		manualAssignMock.mockResolvedValue({ assignedCount: 1 });
		listAssignmentsMock.mockResolvedValue([]);
		unassignMock.mockResolvedValue(true);
		fetchFilesMock.mockResolvedValue(undefined);
		getFileRecordsByParentIdMock.mockReturnValue([]);
		uploadMock.mockResolvedValue(undefined);
		ensureFeedbackContainerMock.mockResolvedValue({ feedbackContainerId: "feedback-container-1" });
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

		expect(gradeSubmissionMock).toHaveBeenCalledWith("submission-1", { points: 7, feedbackComment: undefined });
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

	it("neutralizes a formula-injection payload in a student's comment before exporting to csv", async () => {
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
				submissions: [buildSubmission({ comment: '=1+1;=cmd|"/c calc"!A1' })],
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();
			await wrapper.find("[data-testid='assignment-csv-button']").trigger("click");

			const csv = await createdBlob!.text();
			// still legible as the original text (quoted, not stripped) but no longer parsed as a
			// formula by a spreadsheet app opening the export
			expect(csv).toContain("'=1+1;=cmd");
			expect(csv).not.toMatch(/;"=1\+1/);
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
					feedbackContainerId: "feedback-container-1",
					feedbackFiles: [{ fileRecordId: "record-fb", name: "feedback-pdf-1.pdf" }],
				}),
			],
		});
		// the submission's own file and its feedback now list under two different parent ids
		getFileRecordsByParentIdMock.mockImplementation((parentId: string) => {
			if (parentId === "feedback-container-1") {
				return [
					{
						id: "record-fb",
						name: "feedback-pdf-1.pdf",
						url: "https://api/files/feedback-pdf-1.pdf",
						mimeType: "application/pdf",
						previewStatus: "possible",
					},
				];
			}
			return [
				{
					id: "record-sub",
					name: "essay.pdf",
					url: "https://api/files/essay.pdf",
					mimeType: "application/pdf",
					previewStatus: "possible",
				},
			];
		});
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

		// a container is created (or reused) for this submission before the upload, never
		// uploaded to the submission's own id - see A1 in the review notes
		expect(ensureFeedbackContainerMock).toHaveBeenCalledWith("submission-1");
		expect(uploadMock).toHaveBeenCalledTimes(1);
		const [file, parentId, parentType] = uploadMock.mock.calls[0];
		expect(file.name).toBe("feedback-pdf-123.pdf");
		expect(file.type).toBe("application/pdf");
		expect(parentId).toBe("feedback-container-1");
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
					feedbackContainerId: "feedback-container-1",
					feedbackFiles: [
						{ fileRecordId: "record-pdf-2", name: "feedback-pdf-2.pdf" },
						{ fileRecordId: "record-pdf-1", name: "feedback-pdf-1.pdf" },
					],
				}),
			],
		});
		getFileRecordsByParentIdMock.mockImplementation((parentId: string) => {
			if (parentId === "feedback-container-1") {
				return [
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
				];
			}
			return [
				{
					id: "record-sub",
					name: "essay.pdf",
					url: "https://api/files/essay.pdf",
					mimeType: "application/pdf",
					previewStatus: "possible",
				},
			];
		});
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

	// Regression coverage for the "can't switch students" bug: the teacher list contains
	// one row per course member, and several of them can have id === null (no submission
	// yet) at the same time. Selection must key on userId (always present, always unique),
	// never on id.
	describe("selection with several submissions missing (id === null)", () => {
		const buildThreeStudents = () => [
			buildSubmission({
				userId: "user-1",
				id: null,
				firstName: "Anna",
				lastName: "Adler",
				status: AssignmentStatus.OPEN,
				file: null,
			}),
			buildSubmission({
				userId: "user-2",
				id: null,
				firstName: "Ben",
				lastName: "Berger",
				status: AssignmentStatus.OPEN,
				file: null,
			}),
			buildSubmission({
				userId: "user-3",
				id: "submission-3",
				firstName: "Clara",
				lastName: "Cortez",
				status: AssignmentStatus.SUBMITTED,
			}),
		];

		it("selects the actually clicked row, even when it is the second row without a submission", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: buildThreeStudents(),
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			const blocks = wrapper.findAll("[data-testid='submission-block']");
			await blocks[1].trigger("click");

			expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Berger");
		});

		it("never marks two rows active at once", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: buildThreeStudents(),
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			const blocks = wrapper.findAll("[data-testid='submission-block']");
			await blocks[1].trigger("click");

			const activeBlocks = wrapper
				.findAll("[data-testid='submission-block']")
				.filter((block) => block.classes().includes("v-list-item--active"));
			expect(activeBlocks).toHaveLength(1);
			expect(activeBlocks[0].text()).toContain("Berger");
		});

		it("pages through every row in order via next/previous, including across rows without a submission", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: buildThreeStudents(),
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Adler");

			await wrapper.find("[data-testid='submission-next']").trigger("click");
			expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Berger");

			await wrapper.find("[data-testid='submission-next']").trigger("click");
			expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Cortez");
			expect(wrapper.find("[data-testid='submission-next']").attributes("disabled")).toBeDefined();

			await wrapper.find("[data-testid='submission-previous']").trigger("click");
			expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Berger");

			await wrapper.find("[data-testid='submission-previous']").trigger("click");
			expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Adler");
			expect(wrapper.find("[data-testid='submission-previous']").attributes("disabled")).toBeDefined();
		});

		it("auto-selects the first row on open even when it has no submission", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: buildThreeStudents(),
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Adler");
		});

		it("moves the selection with the arrow keys, but not while typing in a field", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: buildThreeStudents(),
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
			await wrapper.vm.$nextTick();
			expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Berger");

			// only the third row (Cortez) has an actual submission and thus a points field -
			// select it to prove a keydown originating from an input field is ignored
			await wrapper.find("[data-testid='submission-next']").trigger("click");
			expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Cortez");

			const input = wrapper.get("[data-testid='submission-points-input'] input");
			input.element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
			await wrapper.vm.$nextTick();

			expect(wrapper.find("[data-testid='submission-detail-name']").text()).toContain("Cortez");
		});

		it("shows a hint instead of grading fields for a row without a submission", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: buildThreeStudents(),
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			expect(wrapper.find("[data-testid='submission-none']").exists()).toBe(true);
			expect(wrapper.find("[data-testid='submission-points-input']").exists()).toBe(false);
			expect(wrapper.find("[data-testid='submission-save-grade']").exists()).toBe(false);
		});
	});

	describe("peer review panel", () => {
		it("does not show the manage button when peer review is disabled", async () => {
			const { wrapper } = setup();
			await vi.dynamicImportSettled();

			expect(wrapper.find("[data-testid='peer-review-manage-button']").exists()).toBe(false);
		});

		it("opens the panel and auto-assigns reviewers", async () => {
			element.content.peerReviewEnabled = true;
			element.content.peerReviewMode = "auto";
			const { wrapper } = setup();

			await vi.dynamicImportSettled();
			await wrapper.find("[data-testid='peer-review-manage-button']").trigger("click");
			await wrapper.find("[data-testid='peer-review-auto-assign']").trigger("click");

			expect(autoAssignMock).toHaveBeenCalledWith(element.id);
		});

		// Regression: the button used to be an unlabeled icon, easy to miss entirely - it now
		// carries a label and a counter reflecting the actual assignment state.
		it("shows a labeled button with a count of assigned submissions", async () => {
			element.content.peerReviewEnabled = true;
			element.content.peerReviewMode = "manual";
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: [
					buildSubmission({ userId: "user-1", id: "submission-1" }),
					buildSubmission({ userId: "user-2", id: "submission-2" }),
					buildSubmission({ userId: "user-3", id: null }), // not yet submitted - not reviewable
				],
			});
			listAssignmentsMock.mockResolvedValue([
				{
					submissionId: "submission-1",
					reviewerUserId: "user-2",
					reviewerFirstName: "Ben",
					reviewerLastName: "Berger",
					assignmentMode: "manual",
					submittedAt: null,
				},
			]);
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			const button = wrapper.find("[data-testid='peer-review-manage-button']");
			expect(button.text()).toContain("components.cardElement.assignmentElement.peerReview.manageButton");
			expect(wrapper.find("[data-testid='peer-review-manage-button-count']").text()).toContain("1/2");
		});

		it("refetches assignments (updating the counter) after a change in the panel", async () => {
			element.content.peerReviewEnabled = true;
			element.content.peerReviewMode = "auto";
			listAssignmentsMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
				{
					submissionId: "submission-1",
					reviewerUserId: "user-2",
					assignmentMode: "auto",
					submittedAt: null,
				},
			]);
			const { wrapper } = setup();
			await vi.dynamicImportSettled();

			expect(listAssignmentsMock).toHaveBeenCalledTimes(1);

			await wrapper.find("[data-testid='peer-review-manage-button']").trigger("click");
			await wrapper.find("[data-testid='peer-review-auto-assign']").trigger("click");
			await vi.dynamicImportSettled();

			expect(listAssignmentsMock).toHaveBeenCalledTimes(2);
		});

		it("manually assigns a reviewer to a submission", async () => {
			element.content.peerReviewEnabled = true;
			element.content.peerReviewMode = "manual";
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: [
					buildSubmission({ userId: "user-1", id: "submission-1" }),
					buildSubmission({ userId: "user-2", id: "submission-2", firstName: "Ben", lastName: "Berger" }),
				],
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();
			await wrapper.find("[data-testid='peer-review-manage-button']").trigger("click");
			const select = wrapper
				.findAllComponents({ name: "VSelect" })
				.find((candidate) => candidate.attributes("data-testid") === "peer-review-reviewer-select")!;
			await select.vm.$emit("update:modelValue", "user-2");

			expect(manualAssignMock).toHaveBeenCalledWith(element.id, [
				{ submissionId: "submission-1", reviewerUserId: "user-2" },
			]);
		});
	});

	describe("rubric grading", () => {
		const criteria = [
			{ id: "c1", name: "Content", maxPoints: 6 },
			{ id: "c2", name: "Grammar", maxPoints: 4 },
		];

		beforeEach(() => {
			element.content.criteria = criteria;
		});

		it("sends summed criterionPoints instead of a flat points value", async () => {
			const { wrapper } = setup();
			await vi.dynamicImportSettled();

			await wrapper.find("[data-testid='submission-criterion-points-c1'] input").setValue("5");
			await wrapper.find("[data-testid='submission-criterion-points-c2'] input").setValue("3");
			await wrapper.find("[data-testid='submission-save-grade']").trigger("click");

			expect(gradeSubmissionMock).toHaveBeenCalledWith("submission-1", {
				feedbackComment: undefined,
				criterionPoints: [
					{ criterionId: "c1", points: 5 },
					{ criterionId: "c2", points: 3 },
				],
			});
		});

		it("keeps a criterion's already-saved points when only a different criterion is edited", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: [
					buildSubmission({
						criterionPoints: [
							{ criterionId: "c1", points: 5 },
							{ criterionId: "c2", points: 3 },
						],
					}),
				],
			});
			const { wrapper } = setup();
			await vi.dynamicImportSettled();

			// only c2 is touched - c1's saved value of 5 must survive into the saved body untouched
			await wrapper.find("[data-testid='submission-criterion-points-c2'] input").setValue("4");
			await wrapper.find("[data-testid='submission-save-grade']").trigger("click");

			expect(gradeSubmissionMock).toHaveBeenCalledWith("submission-1", {
				feedbackComment: undefined,
				criterionPoints: [
					{ criterionId: "c1", points: 5 },
					{ criterionId: "c2", points: 4 },
				],
			});
		});

		it("omits criterionPoints entirely (not zeroed) when saving without having touched any criterion", async () => {
			const { wrapper } = setup();
			await vi.dynamicImportSettled();

			// no criterion input touched at all
			await wrapper.find("[data-testid='submission-save-grade']").trigger("click");

			expect(gradeSubmissionMock).toHaveBeenCalledWith("submission-1", {
				feedbackComment: undefined,
			});
		});
	});

	describe("file versions", () => {
		it("passes the submission's fileVersions through to the detail view", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: [
					buildSubmission({
						fileVersions: [
							{ fileRecordId: "file-2", name: "essay-v2.pdf", createdAt: "2026-01-02T00:00:00.000Z", version: 2 },
							{ fileRecordId: "file-1", name: "essay-v1.pdf", createdAt: "2026-01-01T00:00:00.000Z", version: 1 },
						],
					}),
				],
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			expect(wrapper.find("[data-testid='submission-version-select']").exists()).toBe(true);
		});
	});

	describe("batch return", () => {
		const buildGradedAndUngraded = () => [
			buildSubmission({
				userId: "user-1",
				id: "submission-1",
				firstName: "Anna",
				lastName: "Adler",
				status: AssignmentStatus.IN_REVIEW,
				points: 8,
			}),
			buildSubmission({
				userId: "user-2",
				id: "submission-2",
				firstName: "Ben",
				lastName: "Berger",
				status: AssignmentStatus.IN_REVIEW,
				points: 5,
			}),
			buildSubmission({
				userId: "user-3",
				id: "submission-3",
				firstName: "Clara",
				lastName: "Cortez",
				status: AssignmentStatus.SUBMITTED,
			}),
		];

		it("only offers the batch checkbox for already-graded submissions", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: buildGradedAndUngraded(),
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			expect(wrapper.findAll("[data-testid='submission-batch-checkbox']")).toHaveLength(2);
		});

		it("shows the batch return button once a submission is selected, and hides it again once deselected", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: buildGradedAndUngraded(),
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();
			expect(wrapper.find("[data-testid='batch-return-button']").exists()).toBe(false);

			const checkbox = wrapper.find("[data-testid='submission-batch-checkbox'] input");
			await checkbox.setValue(true);
			expect(wrapper.find("[data-testid='batch-return-button']").exists()).toBe(true);

			await checkbox.setValue(false);
			expect(wrapper.find("[data-testid='batch-return-button']").exists()).toBe(false);
		});

		it("selects every graded submission via 'select all graded'", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: buildGradedAndUngraded(),
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();
			await wrapper.find("[data-testid='select-all-graded']").trigger("click");

			expect(wrapper.find("[data-testid='batch-return-button']").exists()).toBe(true);
		});

		it("returns the selected submissions and reloads on confirm", async () => {
			returnSubmissionsBatchMock.mockResolvedValue({
				returned: [buildSubmission({ userId: "user-1", id: "submission-1", status: AssignmentStatus.RETURNED })],
				failed: [],
			});
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: buildGradedAndUngraded(),
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();
			await wrapper.find("[data-testid='select-all-graded']").trigger("click");
			await wrapper.find("[data-testid='batch-return-button']").trigger("click");
			await wrapper.find("[data-testid='batch-return-confirm']").trigger("click");
			await vi.dynamicImportSettled();

			expect(returnSubmissionsBatchMock).toHaveBeenCalledWith(["submission-1", "submission-2"]);
			expect(fetchSubmissionsMock).toHaveBeenCalledTimes(2);
			expect(wrapper.find("[data-testid='batch-return-button']").exists()).toBe(false);
		});

		it("cancels without calling the batch endpoint", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: 10,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: buildGradedAndUngraded(),
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();
			await wrapper.find("[data-testid='select-all-graded']").trigger("click");
			await wrapper.find("[data-testid='batch-return-button']").trigger("click");
			await wrapper.find("[data-testid='batch-return-cancel']").trigger("click");

			expect(returnSubmissionsBatchMock).not.toHaveBeenCalled();
		});
	});
});
