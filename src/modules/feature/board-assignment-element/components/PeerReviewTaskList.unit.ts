import PeerReviewTaskList from "./PeerReviewTaskList.vue";
import { FileRecord } from "@/types/file/File";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { PeerReviewTaskResponse } from "@api-server";
import { mount } from "@vue/test-utils";

const { fetchMyTasksMock, submitReviewMock, fetchFilesMock, getFileRecordsByParentIdMock, notifySuccessMock } =
	vi.hoisted(() => ({
		fetchMyTasksMock: vi.fn(),
		submitReviewMock: vi.fn(),
		fetchFilesMock: vi.fn(),
		getFileRecordsByParentIdMock: vi.fn(),
		notifySuccessMock: vi.fn(),
	}));

vi.mock("@data-assignment", () => ({
	usePeerReviewApi: () => ({
		fetchMyTasks: fetchMyTasksMock,
		submitReview: submitReviewMock,
	}),
}));

vi.mock("@data-file", () => ({
	useFileStorageApi: () => ({
		fetchFiles: fetchFilesMock,
		getFileRecordsByParentId: getFileRecordsByParentIdMock,
	}),
}));

vi.mock("@data-app", () => ({
	notifySuccess: notifySuccessMock,
}));

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
});
