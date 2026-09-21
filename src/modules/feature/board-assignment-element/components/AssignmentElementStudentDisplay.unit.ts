import AssignmentElementStudentDisplay from "./AssignmentElementStudentDisplay.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { assignmentElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { AssignmentStatus, AssignmentSubmissionResponse } from "@api-server";
import { mount } from "@vue/test-utils";

const {
	fetchSubmissionsMock,
	createOwnSubmissionMock,
	submitMock,
	uploadMock,
	fetchFilesMock,
	getFileRecordsByParentIdMock,
} = vi.hoisted(() => ({
	fetchSubmissionsMock: vi.fn(),
	createOwnSubmissionMock: vi.fn(),
	submitMock: vi.fn(),
	uploadMock: vi.fn(),
	fetchFilesMock: vi.fn(),
	getFileRecordsByParentIdMock: vi.fn(),
}));

vi.mock("@data-assignment", () => ({
	useAssignmentApi: () => ({
		fetchSubmissions: fetchSubmissionsMock,
		createOwnSubmission: createOwnSubmissionMock,
		submit: submitMock,
	}),
}));

vi.mock("@data-file", () => ({
	useFileStorageApi: () => ({
		upload: uploadMock,
		fetchFiles: fetchFilesMock,
		getFileRecordsByParentId: getFileRecordsByParentIdMock,
	}),
}));

const buildSubmission = (overrides: Partial<AssignmentSubmissionResponse> = {}): AssignmentSubmissionResponse => ({
	id: "submission-1",
	userId: "user-1",
	status: AssignmentStatus.OPEN,
	submittedAt: null,
	isLate: false,
	file: null,
	points: null,
	feedbackComment: null,
	returnedAt: null,
	comment: null,
	...overrides,
});

describe("AssignmentElementStudentDisplay", () => {
	let element: AssignmentElement;

	beforeEach(() => {
		element = assignmentElementResponseFactory.build();
		// the server always returns one placeholder row (id: null) for the student's own view
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: null,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [buildSubmission({ id: null })],
		});
		createOwnSubmissionMock.mockResolvedValue(buildSubmission({ id: "new-submission" }));
		submitMock.mockResolvedValue(buildSubmission());
		uploadMock.mockResolvedValue(undefined);
		fetchFilesMock.mockResolvedValue(undefined);
		getFileRecordsByParentIdMock.mockReturnValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const setup = () => {
		const wrapper = mount(AssignmentElementStudentDisplay, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: { element },
		});

		return { wrapper };
	};

	it("should show the assignment description", () => {
		element.content.text = "Bitte bis Freitag abgeben.";
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid='assignment-description']").exists()).toBe(true);
	});

	it("should show an optional comment field for open submissions", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		expect(wrapper.find("[data-testid='assignment-comment-input']").exists()).toBe(true);
	});

	it("should send the comment along with the submission", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		const commentInput = wrapper.find("[data-testid='assignment-comment-input'] textarea");
		await commentInput.setValue("Meine Anmerkung");

		const fileInput = wrapper.findComponent({ name: "VFileInput" });
		await fileInput.vm.$emit("update:modelValue", new File([""], "a.txt"));

		await vi.dynamicImportSettled();

		expect(createOwnSubmissionMock).toHaveBeenCalledWith(element.id);
		expect(uploadMock).toHaveBeenCalled();
		expect(submitMock).toHaveBeenCalledWith("new-submission", { comment: "Meine Anmerkung" });
	});

	it("should submit without a comment when the field is empty", async () => {
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		const fileInput = wrapper.findComponent({ name: "VFileInput" });
		await fileInput.vm.$emit("update:modelValue", new File([""], "a.txt"));

		await vi.dynamicImportSettled();

		expect(submitMock).toHaveBeenCalledWith("new-submission", {});
	});

	it("should prefill the comment from an existing submission", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: null,
			dueDate: null,
			lateUntil: null,
			isSubmittable: true,
			submissions: [buildSubmission({ comment: "bereits eingegeben" })],
		});
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		const commentInput = wrapper.find("[data-testid='assignment-comment-input'] textarea");
		expect((commentInput.element as HTMLTextAreaElement).value).toBe("bereits eingegeben");
	});

	it("should label the teacher's feedback after the submission was returned", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: false,
			submissions: [
				buildSubmission({
					id: "submission-1",
					status: AssignmentStatus.RETURNED,
					returnedAt: "2099-01-20T10:00:00.000Z",
					points: 8,
					feedbackComment: "Gut strukturiert!",
				}),
			],
		});
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		const feedback = wrapper.find("[data-testid='assignment-teacher-comment']");
		expect(feedback.exists()).toBe(true);
		expect(feedback.text()).toContain("Gut strukturiert!");

		expect(wrapper.find("[data-testid='assignment-feedback-heading']").text()).toContain(
			"components.cardElement.assignmentElement.feedbackHeading"
		);
	});

	it("should show the teacher's feedback files after the return", async () => {
		fetchSubmissionsMock.mockResolvedValue({
			maxPoints: 10,
			dueDate: null,
			lateUntil: null,
			isSubmittable: false,
			submissions: [
				buildSubmission({
					id: "submission-1",
					status: AssignmentStatus.RETURNED,
					returnedAt: "2099-01-20T10:00:00.000Z",
					feedbackFiles: [
						{ fileRecordId: "record-fb", name: "feedback-pdf-1.pdf" },
						{ fileRecordId: "record-img", name: "feedback-img-1.png" },
					],
				} as AssignmentSubmissionResponse),
			],
		});
		getFileRecordsByParentIdMock.mockReturnValue([
			{
				id: "record-fb",
				name: "feedback-pdf-1.pdf",
				url: "https://api/files/feedback-pdf-1.pdf",
				mimeType: "application/pdf",
				previewStatus: "possible",
			},
			{
				id: "record-img",
				name: "feedback-img-1.png",
				url: "https://api/files/feedback-img-1.png",
				mimeType: "image/png",
				previewStatus: "justified-impossible",
			},
		]);
		const { wrapper } = setup();

		await vi.dynamicImportSettled();

		const rows = wrapper.findAll("[data-testid='assignment-feedback-file']");
		expect(rows).toHaveLength(2);

		// pdf: viewable via the pdf lightbox; image without preview: download only
		expect(rows[0].find("[data-testid='assignment-feedback-file-view-record-fb']").exists()).toBe(true);
		expect(rows[1].find("[data-testid='assignment-feedback-file-view-record-img']").exists()).toBe(false);
		expect(rows[1].find("[data-testid='assignment-feedback-file-download-record-img']").exists()).toBe(true);
	});

	it("should not show feedback files before the submission is returned", async () => {
		getFileRecordsByParentIdMock.mockReturnValue([
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

		expect(wrapper.findAll("[data-testid='assignment-feedback-file']")).toHaveLength(0);
	});

	describe("own submission file", () => {
		it("makes the own file name clickable when it can be previewed", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: null,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: [buildSubmission({ id: "submission-1", file: { fileRecordId: "record-own", name: "essay.pdf" } })],
			});
			getFileRecordsByParentIdMock.mockReturnValue([
				{ id: "record-own", name: "essay.pdf", url: "https://api/files/essay.pdf", mimeType: "application/pdf" },
			]);
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			expect(wrapper.find("[data-testid='assignment-own-file-name']").exists()).toBe(true);
			expect(wrapper.find("[data-testid='assignment-own-file-download']").exists()).toBe(true);
		});

		it("fetches the own file before the submission is returned", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: null,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: [buildSubmission({ id: "submission-1", file: { fileRecordId: "record-own", name: "essay.pdf" } })],
			});
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			expect(fetchFilesMock).toHaveBeenCalledWith("submission-1", "boardnodes");
			expect(wrapper.find("[data-testid='assignment-own-file']").exists()).toBe(true);
		});

		it("shows the own file name as plain text when it cannot be previewed", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: null,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: [
					buildSubmission({ id: "submission-1", file: { fileRecordId: "record-own", name: "archive.zip" } }),
				],
			});
			getFileRecordsByParentIdMock.mockReturnValue([
				{ id: "record-own", name: "archive.zip", url: "https://api/files/archive.zip", mimeType: "application/zip" },
			]);
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			expect(wrapper.find("[data-testid='assignment-own-file-name']").exists()).toBe(false);
			expect(wrapper.find("[data-testid='assignment-own-file']").text()).toContain("archive.zip");
			expect(wrapper.find("[data-testid='assignment-own-file-download']").exists()).toBe(true);
		});

		it("still shows the file name even when no matching record was found", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: null,
				dueDate: null,
				lateUntil: null,
				isSubmittable: true,
				submissions: [buildSubmission({ id: "submission-1", file: { fileRecordId: "record-own", name: "essay.pdf" } })],
			});
			getFileRecordsByParentIdMock.mockReturnValue([]);
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			expect(wrapper.find("[data-testid='assignment-own-file']").text()).toContain("essay.pdf");
			expect(wrapper.find("[data-testid='assignment-own-file-download']").exists()).toBe(false);
		});
	});

	describe("feedback audio download hurdle", () => {
		it("blocks the browser's native download affordance on the feedback audio player", async () => {
			fetchSubmissionsMock.mockResolvedValue({
				maxPoints: null,
				dueDate: null,
				lateUntil: null,
				isSubmittable: false,
				submissions: [
					buildSubmission({
						id: "submission-1",
						status: AssignmentStatus.RETURNED,
						returnedAt: "2099-01-20T10:00:00.000Z",
						feedbackAudio: { fileRecordId: "record-audio", name: "feedback-audio-1.mp3" },
					} as AssignmentSubmissionResponse),
				],
			});
			getFileRecordsByParentIdMock.mockReturnValue([
				{ id: "record-audio", name: "feedback-audio-1.mp3", url: "https://api/files/feedback-audio-1.mp3" },
			]);
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			const audio = wrapper.find("[data-testid='assignment-feedback-audio']");
			expect(audio.exists()).toBe(true);
			expect(audio.attributes("controlslist")).toContain("nodownload");
		});

		it("does not show the feedback audio before the submission is returned", async () => {
			getFileRecordsByParentIdMock.mockReturnValue([
				{ id: "record-audio", name: "feedback-audio-1.mp3", url: "https://api/files/feedback-audio-1.mp3" },
			]);
			const { wrapper } = setup();

			await vi.dynamicImportSettled();

			expect(wrapper.find("[data-testid='assignment-feedback-audio']").exists()).toBe(false);
		});
	});
});
