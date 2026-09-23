import PeerReviewAssignmentPanel from "./PeerReviewAssignmentPanel.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { AssignmentStatus, AssignmentSubmissionResponse, PeerReviewAssignmentResponse } from "@api-server";
import { mount } from "@vue/test-utils";

const { autoAssignMock, manualAssignMock, unassignMock, notifySuccessMock } = vi.hoisted(() => ({
	autoAssignMock: vi.fn(),
	manualAssignMock: vi.fn(),
	unassignMock: vi.fn(),
	notifySuccessMock: vi.fn(),
}));

vi.mock("@data-assignment", () => ({
	usePeerReviewApi: () => ({
		autoAssign: autoAssignMock,
		manualAssign: manualAssignMock,
		unassign: unassignMock,
	}),
}));

vi.mock("@data-app", () => ({
	notifySuccess: notifySuccessMock,
}));

const buildSubmission = (overrides: Partial<AssignmentSubmissionResponse> = {}): AssignmentSubmissionResponse => ({
	id: "submission-1",
	userId: "user-1",
	firstName: "Anna",
	lastName: "Admin",
	status: AssignmentStatus.SUBMITTED,
	submittedAt: "2099-01-15T10:00:00.000Z",
	isLate: false,
	points: null,
	feedbackComment: null,
	returnedAt: null,
	comment: null,
	feedbackAudio: null,
	...overrides,
});

const buildAssignment = (overrides: Partial<PeerReviewAssignmentResponse> = {}): PeerReviewAssignmentResponse => ({
	submissionId: "submission-1",
	reviewerUserId: "user-2",
	reviewerFirstName: "Bea",
	reviewerLastName: "Berg",
	assignmentMode: "manual",
	submittedAt: null,
	...overrides,
});

describe("PeerReviewAssignmentPanel", () => {
	const setupWrapper = (
		options: {
			mode?: "manual" | "auto";
			submissions?: AssignmentSubmissionResponse[];
			assignments?: PeerReviewAssignmentResponse[];
		} = {}
	) => {
		const wrapper = mount(PeerReviewAssignmentPanel, {
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
			props: {
				isOpen: true,
				elementId: "element-1",
				mode: options.mode ?? "manual",
				submissions: options.submissions ?? [
					buildSubmission({ id: "submission-1", userId: "user-1" }),
					buildSubmission({ id: "submission-2", userId: "user-2", firstName: "Bea", lastName: "Berg" }),
				],
				assignments: options.assignments ?? [],
			},
		});

		return { wrapper };
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	beforeEach(() => {
		manualAssignMock.mockResolvedValue({ assignedCount: 1 });
		autoAssignMock.mockResolvedValue({ assignedCount: 2 });
		unassignMock.mockResolvedValue(true);
	});

	it("emits close when the close button is clicked", async () => {
		const { wrapper } = setupWrapper();

		await wrapper.find("[data-testid='peer-review-panel-close']").trigger("click");

		expect(wrapper.emitted("close")).toHaveLength(1);
	});

	it("shows one row with a reviewer select per reviewable submission, in manual mode", () => {
		const { wrapper } = setupWrapper({
			submissions: [
				buildSubmission({ id: "submission-1", userId: "user-1" }),
				buildSubmission({ id: null, userId: "user-2" }), // not yet submitted - not reviewable
			],
		});

		const rows = wrapper.findAll("[data-testid='peer-review-assign-row']");
		expect(rows).toHaveLength(1);
		expect(rows[0].find("[data-testid='peer-review-reviewer-select']").exists()).toBe(true);
	});

	it("excludes the submission's own owner from the reviewer options", () => {
		const { wrapper } = setupWrapper();

		const select = wrapper.findComponent({ name: "VSelect" });
		const items = select.props("items") as { value: string }[];

		expect(items.map((item) => item.value)).not.toContain("user-1");
		expect(items.map((item) => item.value)).toContain("user-2");
	});

	it("excludes an already-assigned reviewer from the dropdown for that submission", () => {
		const { wrapper } = setupWrapper({
			submissions: [
				buildSubmission({ id: "submission-1", userId: "user-1" }),
				buildSubmission({ id: "submission-2", userId: "user-2" }),
				buildSubmission({ id: "submission-3", userId: "user-3" }),
			],
			assignments: [buildAssignment({ submissionId: "submission-1", reviewerUserId: "user-2" })],
		});

		const select = wrapper.findComponent({ name: "VSelect" });
		const items = select.props("items") as { value: string }[];

		expect(items.map((item) => item.value)).toEqual(["user-3"]);
	});

	it("assigns the selected reviewer and emits changed on success", async () => {
		const { wrapper } = setupWrapper();

		const select = wrapper.findComponent({ name: "VSelect" });
		await select.vm.$emit("update:modelValue", "user-2");

		expect(manualAssignMock).toHaveBeenCalledWith("element-1", [
			{ submissionId: "submission-1", reviewerUserId: "user-2" },
		]);
		expect(notifySuccessMock).toHaveBeenCalled();
		expect(wrapper.emitted("changed")).toHaveLength(1);
	});

	it("does not emit changed when assigning fails", async () => {
		manualAssignMock.mockResolvedValue(undefined);
		const { wrapper } = setupWrapper();

		const select = wrapper.findComponent({ name: "VSelect" });
		await select.vm.$emit("update:modelValue", "user-2");

		expect(wrapper.emitted("changed")).toBeUndefined();
	});

	it("shows an assigned reviewer as a chip with their name", () => {
		const { wrapper } = setupWrapper({
			assignments: [buildAssignment({ submissionId: "submission-1", reviewerUserId: "user-2" })],
		});

		const chip = wrapper.find("[data-testid='peer-review-assignment-chip']");
		expect(chip.text()).toContain("Berg, Bea");
	});

	it("removes an assignment and emits changed when its chip is closed", async () => {
		const { wrapper } = setupWrapper({
			assignments: [buildAssignment({ submissionId: "submission-1", reviewerUserId: "user-2" })],
		});

		const chip = wrapper.findComponent({ name: "VChip" });
		await chip.vm.$emit("click:close");

		expect(unassignMock).toHaveBeenCalledWith("element-1", "submission-1", "user-2");
		expect(wrapper.emitted("changed")).toHaveLength(1);
	});

	it("does not allow removing an assignment whose review was already submitted", () => {
		const { wrapper } = setupWrapper({
			assignments: [
				buildAssignment({
					submissionId: "submission-1",
					reviewerUserId: "user-2",
					submittedAt: "2099-01-01T00:00:00.000Z",
				}),
			],
		});

		const chip = wrapper.findComponent({ name: "VChip" });
		expect(chip.props("closable")).toBe(false);
	});

	describe("auto mode", () => {
		it("triggers auto-assign and emits changed on success", async () => {
			const { wrapper } = setupWrapper({ mode: "auto" });

			await wrapper.find("[data-testid='peer-review-auto-assign']").trigger("click");

			expect(autoAssignMock).toHaveBeenCalledWith("element-1");
			expect(wrapper.emitted("changed")).toHaveLength(1);
		});

		it("still shows existing assignments as chips", () => {
			const { wrapper } = setupWrapper({
				mode: "auto",
				assignments: [
					buildAssignment({ submissionId: "submission-1", reviewerUserId: "user-2", assignmentMode: "auto" }),
				],
			});

			expect(wrapper.find("[data-testid='peer-review-assignment-chip']").exists()).toBe(true);
		});
	});
});
