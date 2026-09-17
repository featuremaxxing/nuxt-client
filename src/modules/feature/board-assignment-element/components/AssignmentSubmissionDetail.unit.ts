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
				feedbackFiles: [],
				feedbackAudioUrl: undefined,
				maxPoints: 15,
				points: null,
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
});
