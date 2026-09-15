import AssignmentElementStudentDisplay from "./AssignmentElementStudentDisplay.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { assignmentElementResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { AssignmentStatus, AssignmentSubmissionResponse } from "@api-server";
import { mount } from "@vue/test-utils";

const { fetchSubmissionsMock, createOwnSubmissionMock, submitMock, uploadMock } = vi.hoisted(() => ({
	fetchSubmissionsMock: vi.fn(),
	createOwnSubmissionMock: vi.fn(),
	submitMock: vi.fn(),
	uploadMock: vi.fn(),
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
});
