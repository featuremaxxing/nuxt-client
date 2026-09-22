import AssignmentPdfAnnotator from "./AssignmentPdfAnnotator.vue";
import PeerReviewTaskList from "./PeerReviewTaskList.vue";
import { FileRecord } from "@/types/file/File";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { PeerReviewTaskResponse } from "@api-server";
import { mount } from "@vue/test-utils";

const {
	fetchMyTasksMock,
	submitReviewMock,
	ensureReviewFeedbackContainerMock,
	fetchFilesMock,
	getFileRecordsByParentIdMock,
	uploadMock,
	notifySuccessMock,
	downloadFileMock,
} = vi.hoisted(() => ({
	fetchMyTasksMock: vi.fn(),
	submitReviewMock: vi.fn(),
	ensureReviewFeedbackContainerMock: vi.fn(),
	fetchFilesMock: vi.fn(),
	getFileRecordsByParentIdMock: vi.fn(),
	uploadMock: vi.fn(),
	notifySuccessMock: vi.fn(),
	downloadFileMock: vi.fn(),
}));

vi.mock("@data-assignment", () => ({
	usePeerReviewApi: () => ({
		fetchMyTasks: fetchMyTasksMock,
		submitReview: submitReviewMock,
		ensureReviewFeedbackContainer: ensureReviewFeedbackContainerMock,
	}),
}));

vi.mock("@data-file", () => ({
	useFileStorageApi: () => ({
		fetchFiles: fetchFilesMock,
		getFileRecordsByParentId: getFileRecordsByParentIdMock,
		upload: uploadMock,
	}),
}));

vi.mock("@data-app", () => ({
	notifySuccess: notifySuccessMock,
}));

// isPdfMimeType stays real (it drives which button the component shows); only downloadFile is
// mocked so the test can assert it was called without touching the DOM/anchor click it performs.
vi.mock("@/utils/fileHelper", async () => {
	const actual = await vi.importActual<typeof import("@/utils/fileHelper")>("@/utils/fileHelper");
	return { ...actual, downloadFile: downloadFileMock };
});

const buildTask = (overrides: Partial<PeerReviewTaskResponse> = {}): PeerReviewTaskResponse => ({
	id: "review-1",
	submissionId: "submission-1",
	file: { fileRecordId: "file-1", name: "essay.pdf" },
	assignedAt: "2026-01-01T00:00:00.000Z",
	submittedAt: null,
	points: null,
	feedbackComment: null,
	...overrides,
});

const buildFileRecord = (overrides: Partial<FileRecord> = {}): FileRecord =>
	({
		id: "record-1",
		name: "essay.pdf",
		url: "https://api/files/essay.pdf",
		mimeType: "application/pdf",
		previewStatus: "possible",
		...overrides,
	}) as FileRecord;

describe("PeerReviewTaskList", () => {
	beforeEach(() => {
		fetchMyTasksMock.mockResolvedValue([buildTask()]);
		submitReviewMock.mockResolvedValue(buildTask({ submittedAt: "2026-01-02T00:00:00.000Z", points: 6 }));
		fetchFilesMock.mockResolvedValue(undefined);
		getFileRecordsByParentIdMock.mockReturnValue([buildFileRecord()]);
		ensureReviewFeedbackContainerMock.mockResolvedValue({ feedbackContainerId: "feedback-container-1" });
		uploadMock.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const setup = () => {
		const wrapper = mount(PeerReviewTaskList, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
		});

		return { wrapper };
	};

	it("shows an empty state when there are no tasks", async () => {
		fetchMyTasksMock.mockResolvedValue([]);
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='peer-review-no-tasks']").exists()).toBe(true);
	});

	it("lists every assigned task and auto-selects the first one", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(wrapper.findAll("[data-testid='peer-review-task-item']")).toHaveLength(1);
		expect(wrapper.find("[data-testid='peer-review-task-detail']").exists()).toBe(true);
	});

	it("submits the review with the entered points and comment", async () => {
		const { wrapper } = setup();
		await vi.dynamicImportSettled();

		await wrapper.find("[data-testid='peer-review-points-input'] input").setValue("6");
		await wrapper.find("[data-testid='peer-review-comment-input'] textarea").setValue("well organized");
		await wrapper.find("[data-testid='peer-review-submit']").trigger("click");
		await vi.dynamicImportSettled();

		expect(submitReviewMock).toHaveBeenCalledWith("review-1", { points: 6, feedbackComment: "well organized" });
		expect(notifySuccessMock).toHaveBeenCalled();
	});

	it("downloads the file instead of previewing it when it is not a pdf", async () => {
		getFileRecordsByParentIdMock.mockReturnValue([
			buildFileRecord({ name: "essay.docx", mimeType: "application/msword", url: "https://api/files/essay.docx" }),
		]);
		const { wrapper } = setup();
		await vi.dynamicImportSettled();

		await wrapper.find("[data-testid='peer-review-task-download']").trigger("click");

		expect(downloadFileMock).toHaveBeenCalledWith("https://api/files/essay.docx", "essay.docx");
	});

	describe("annotating the submission", () => {
		it("opens the annotator for the submission file and uploads the correction to the reviewer's own container", async () => {
			const { wrapper } = setup();
			await vi.dynamicImportSettled();

			await wrapper.find("[data-testid='peer-review-task-annotate']").trigger("click");
			const annotator = wrapper.findComponent(AssignmentPdfAnnotator);
			expect(annotator.exists()).toBe(true);

			const blob = new Blob(["annotated"], { type: "application/pdf" });
			annotator.vm.$emit("save", { blob, name: "feedback-pdf-1.pdf" });
			await vi.dynamicImportSettled();

			// never uploaded to the submission's own id - a reviewer only ever writes their own
			// container, see A1/the author-dimension review notes
			expect(ensureReviewFeedbackContainerMock).toHaveBeenCalledWith("review-1");
			expect(uploadMock).toHaveBeenCalledTimes(1);
			const [file, parentId] = uploadMock.mock.calls[0];
			expect(file.name).toBe("feedback-pdf-1.pdf");
			expect(parentId).toBe("feedback-container-1");
			expect(fetchMyTasksMock).toHaveBeenCalledTimes(2);
		});

		it("re-opens the annotator on an existing correction when continuing to edit it", async () => {
			fetchMyTasksMock.mockResolvedValue([buildTask({ feedbackContainerId: "feedback-container-1" })]);
			getFileRecordsByParentIdMock.mockImplementation((parentId: string) => {
				if (parentId === "feedback-container-1") {
					return [
						buildFileRecord({
							id: "correction-1",
							name: "feedback-pdf-1.pdf",
							url: "https://api/files/feedback-pdf-1.pdf",
						}),
					];
				}
				return [buildFileRecord()];
			});
			const { wrapper } = setup();
			await vi.dynamicImportSettled();

			expect(wrapper.find("[data-testid='peer-review-correction-file']").text()).toContain("feedback-pdf-1.pdf");
			await wrapper.find("[data-testid='peer-review-correction-annotate-correction-1']").trigger("click");

			const annotator = wrapper.findComponent(AssignmentPdfAnnotator);
			expect(annotator.props("source")).toMatchObject({ url: "https://api/files/feedback-pdf-1.pdf" });
		});
	});
});
