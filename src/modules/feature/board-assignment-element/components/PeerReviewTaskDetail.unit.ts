import PeerReviewTaskDetail from "./PeerReviewTaskDetail.vue";
import { FileRecord } from "@/types/file/File";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

const buildFileRecord = (overrides: Partial<FileRecord> = {}): FileRecord =>
	({
		id: "record-1",
		name: "essay.pdf",
		url: "https://api/files/essay.pdf",
		mimeType: "application/pdf",
		previewStatus: "possible",
		...overrides,
	}) as FileRecord;

describe("PeerReviewTaskDetail", () => {
	const setup = (propsOverrides: Record<string, unknown> = {}) => {
		const wrapper = mount(PeerReviewTaskDetail, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: {
				fileRecord: buildFileRecord(),
				points: null,
				feedbackComment: "",
				submitting: false,
				...propsOverrides,
			},
		});

		return { wrapper };
	};

	it("shows the file name and offers to view a pdf", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid='peer-review-task-file-row']").text()).toContain("essay.pdf");
		expect(wrapper.find("[data-testid='peer-review-task-view']").exists()).toBe(true);
	});

	it("does not offer a view button for a non-pdf file", () => {
		const { wrapper } = setup({ fileRecord: buildFileRecord({ mimeType: "image/png" }) });

		expect(wrapper.find("[data-testid='peer-review-task-view']").exists()).toBe(false);
	});

	it("emits view-file when clicked", async () => {
		const { wrapper } = setup();

		await wrapper.find("[data-testid='peer-review-task-view']").trigger("click");

		expect(wrapper.emitted("view-file")).toHaveLength(1);
	});

	it("emits update:points and update:feedbackComment on input", async () => {
		const { wrapper } = setup();

		await wrapper.find("[data-testid='peer-review-points-input'] input").setValue("6");
		await wrapper.find("[data-testid='peer-review-comment-input'] textarea").setValue("well done");

		expect(wrapper.emitted("update:points")).toEqual([["6"]]);
		expect(wrapper.emitted("update:feedbackComment")).toEqual([["well done"]]);
	});

	it("emits submit when the submit button is clicked", async () => {
		const { wrapper } = setup();

		await wrapper.find("[data-testid='peer-review-submit']").trigger("click");

		expect(wrapper.emitted("submit")).toHaveLength(1);
	});
});
