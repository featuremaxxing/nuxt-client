import AssignmentSubmissionDetail from "./AssignmentSubmissionDetail.vue";
import { FileRecord } from "@/types/file/File";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { AssignmentStatus, AssignmentSubmissionResponse } from "@api-server";
import { mount } from "@vue/test-utils";

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

const buildFileRecord = (overrides: Partial<FileRecord> = {}): FileRecord =>
	({
		id: "record-sub",
		name: "essay.pdf",
		url: "https://api/files/essay.pdf",
		mimeType: "application/pdf",
		previewStatus: "possible",
		...overrides,
	}) as FileRecord;

describe("AssignmentSubmissionDetail", () => {
	const defaultBusy = {
		saving: false,
		returning: false,
		downloading: false,
		annotating: false,
		uploadingAudio: false,
	};
	const defaultRecording = { isRecording: false, recorded: undefined };

	const setup = (propsOverrides: Record<string, unknown> = {}) => {
		const wrapper = mount(AssignmentSubmissionDetail, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: {
				submission: buildSubmission(),
				submissionFile: buildFileRecord(),
				previewUrl: undefined,
				fileVersions: [],
				selectedVersionId: null,
				feedbackFiles: [],
				feedbackAudioUrl: undefined,
				maxPoints: 15,
				points: null,
				criteria: [],
				criterionPoints: {},
				feedbackComment: "",
				isDirty: false,
				busy: defaultBusy,
				recording: defaultRecording,
				...propsOverrides,
			},
		});

		return { wrapper };
	};

	it("should label the submission section", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid='submission-section-submission']").text()).toContain("sectionSubmission");
	});

	it("should not show a correction section when there is no correction yet", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid='submission-section-correction']").exists()).toBe(false);
	});

	it("should show the correction section with a readable label instead of the raw file name", () => {
		const { wrapper } = setup({
			feedbackFiles: [buildFileRecord({ id: "fb-1", name: "feedback-pdf-1700000000000.pdf" })],
		});

		expect(wrapper.find("[data-testid='submission-section-correction']").exists()).toBe(true);
		const row = wrapper.find("[data-testid='submission-feedback-file']");
		expect(row.text()).not.toContain("feedback-pdf-1700000000000.pdf");
		expect(row.text()).toContain("correctionFile");
	});

	it("should fall back to the raw file name when no timestamp can be extracted", () => {
		const { wrapper } = setup({
			feedbackFiles: [buildFileRecord({ id: "fb-1", name: "custom-correction.pdf" })],
		});

		expect(wrapper.find("[data-testid='submission-feedback-file']").text()).toContain("custom-correction.pdf");
	});

	it("should offer view, correct and download in that order for the submission file", () => {
		const { wrapper } = setup();

		const buttons = wrapper.find("[data-testid='submission-file-row']").findAll("button");
		const testids = buttons.map((btn) => btn.attributes("data-testid"));

		expect(testids).toEqual(["submission-view", "submission-annotate", "submission-download"]);
	});

	it("should show an unsaved-changes hint only when dirty", () => {
		const { wrapper: clean } = setup({ isDirty: false });
		expect(clean.find("[data-testid='submission-unsaved']").exists()).toBe(false);

		const { wrapper: dirty } = setup({ isDirty: true });
		expect(dirty.find("[data-testid='submission-unsaved']").exists()).toBe(true);
	});

	it("should emit save and return", async () => {
		const { wrapper } = setup();

		await wrapper.find("[data-testid='submission-save-grade']").trigger("click");
		await wrapper.find("[data-testid='submission-return']").trigger("click");

		expect(wrapper.emitted("save")).toHaveLength(1);
		expect(wrapper.emitted("return")).toHaveLength(1);
	});

	describe("file preview", () => {
		it("shows the view button for a text submission file", () => {
			const { wrapper } = setup({
				submissionFile: buildFileRecord({ name: "notes.txt", mimeType: "text/plain" }),
			});

			expect(wrapper.find("[data-testid='submission-view']").exists()).toBe(true);
			// text is not annotatable, unlike pdf/image
			expect(wrapper.find("[data-testid='submission-annotate']").exists()).toBe(false);
		});

		it("hides the view button for an office document", () => {
			const { wrapper } = setup({
				submissionFile: buildFileRecord({
					name: "essay.docx",
					mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				}),
			});

			expect(wrapper.find("[data-testid='submission-view']").exists()).toBe(false);
		});

		it("shows the view button for a feedback file that is a text file", () => {
			const { wrapper } = setup({
				feedbackFiles: [buildFileRecord({ id: "fb-1", name: "feedback-pdf-1.txt", mimeType: "text/plain" })],
			});

			expect(wrapper.find("[data-testid='submission-feedback-file-view-fb-1']").exists()).toBe(true);
		});

		it("hides the view button for a feedback file that is an office document", () => {
			const { wrapper } = setup({
				feedbackFiles: [
					buildFileRecord({
						id: "fb-1",
						name: "feedback-pdf-1.docx",
						mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
					}),
				],
			});

			expect(wrapper.find("[data-testid='submission-feedback-file-view-fb-1']").exists()).toBe(false);
		});
	});

	describe("file versions", () => {
		it("shows no version switcher for a single version", () => {
			const { wrapper } = setup({
				fileVersions: [
					{ fileRecordId: "file-1", name: "essay.pdf", createdAt: "2026-01-02T00:00:00.000Z", version: 1 },
				],
			});

			expect(wrapper.find("[data-testid='submission-version-select']").exists()).toBe(false);
		});

		it("shows a version switcher once more than one version exists", () => {
			const { wrapper } = setup({
				fileVersions: [
					{ fileRecordId: "file-2", name: "essay-v2.pdf", createdAt: "2026-01-02T00:00:00.000Z", version: 2 },
					{ fileRecordId: "file-1", name: "essay-v1.pdf", createdAt: "2026-01-01T00:00:00.000Z", version: 1 },
				],
			});

			expect(wrapper.find("[data-testid='submission-version-select']").exists()).toBe(true);
		});

		it("emits select-version when an older version is picked", async () => {
			const { wrapper } = setup({
				fileVersions: [
					{ fileRecordId: "file-2", name: "essay-v2.pdf", createdAt: "2026-01-02T00:00:00.000Z", version: 2 },
					{ fileRecordId: "file-1", name: "essay-v1.pdf", createdAt: "2026-01-01T00:00:00.000Z", version: 1 },
				],
				selectedVersionId: "file-2",
			});

			// VSelect is a Vuetify component - drive it through its exposed vm rather than a raw DOM select
			await wrapper.findComponent({ name: "VSelect" }).vm.$emit("update:modelValue", "file-1");

			expect(wrapper.emitted("select-version")).toEqual([["file-1"]]);
		});
	});

	describe("rubric grading", () => {
		const criteria = [
			{ id: "c1", name: "Content", maxPoints: 6 },
			{ id: "c2", name: "Grammar", maxPoints: 4 },
		];

		it("shows the flat points field when no criteria are given", () => {
			const { wrapper } = setup();

			expect(wrapper.find("[data-testid='submission-points-input']").exists()).toBe(true);
			expect(wrapper.find("[data-testid='submission-criteria-points']").exists()).toBe(false);
		});

		it("shows one input per criterion instead of the flat field when criteria are given", () => {
			const { wrapper } = setup({ criteria, criterionPoints: { c1: 5, c2: 3 } });

			expect(wrapper.find("[data-testid='submission-points-input']").exists()).toBe(false);
			expect(wrapper.find("[data-testid='submission-criterion-points-c1']").exists()).toBe(true);
			expect(wrapper.find("[data-testid='submission-criterion-points-c2']").exists()).toBe(true);
			expect(wrapper.find("[data-testid='submission-criteria-total']").text()).toContain("8");
		});

		it("emits update:criterionPoints for the edited criterion only", async () => {
			const { wrapper } = setup({ criteria, criterionPoints: { c1: 5, c2: 3 } });

			await wrapper.find("[data-testid='submission-criterion-points-c2'] input").setValue("4");

			expect(wrapper.emitted("update:criterionPoints")).toEqual([["c2", "4"]]);
		});
	});

	describe("peer review summary", () => {
		it("shows nothing when there are no peer reviews", () => {
			const { wrapper } = setup();

			expect(wrapper.find("[data-testid='submission-peer-review-summary']").exists()).toBe(false);
		});

		it("shows the advisory summary with comments, average and an explicit disclaimer", () => {
			const { wrapper } = setup({
				submission: buildSubmission({
					peerReviews: { averagePoints: 7.5, count: 2, comments: ["well organized", "clear structure"] },
				}),
			});

			const summary = wrapper.find("[data-testid='submission-peer-review-summary']");
			expect(summary.exists()).toBe(true);
			expect(summary.text()).toContain("7.5");
			const comments = wrapper.findAll("[data-testid='submission-peer-review-comment']");
			expect(comments).toHaveLength(2);
			expect(summary.text()).toContain("advisoryNotice");
		});
	});

	describe("graded-by indicator", () => {
		it("shows nothing when no teacher has graded the submission yet", () => {
			const { wrapper } = setup();

			expect(wrapper.find("[data-testid='submission-graded-by']").exists()).toBe(false);
		});

		it("shows who graded the submission when the entry carries a name", () => {
			const { wrapper } = setup({
				submission: buildSubmission({ gradedByFirstName: "Ada", gradedByLastName: "Lovelace" }),
			});

			const gradedBy = wrapper.find("[data-testid='submission-graded-by']");
			expect(gradedBy.exists()).toBe(true);
			expect(gradedBy.text()).toContain("gradedBy");
		});
	});
});
