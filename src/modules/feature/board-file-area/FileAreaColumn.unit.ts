import FileAreaColumn from "./FileAreaColumn.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

vi.mock("@/utils/fileHelper", () => ({ extractFilesFromItems: vi.fn() }));

describe("FileAreaColumn", () => {
	const folder = { id: "f1", parentId: "board", title: "Arbeitsblätter", createdAt: "", updatedAt: "" };
	const file = { id: "file1", name: "aufgabe.pdf", parentId: "board" };

	const setup = (canEdit: boolean, column = { parentId: "board", folders: [folder], files: [file] }) => {
		const wrapper = mount(FileAreaColumn, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { column: column as never, columnIndex: 0, title: "Dateien", canEdit },
		});

		return { wrapper };
	};

	it("should list folders and files", () => {
		const { wrapper } = setup(true);

		expect(wrapper.text()).toContain("Arbeitsblätter");
		expect(wrapper.text()).toContain("aufgabe.pdf");
	});

	it("should open a folder on click", async () => {
		const { wrapper } = setup(false);

		await wrapper.find("[data-testid='file-area-folder-Arbeitsblätter']").trigger("click");

		expect(wrapper.emitted("open-folder")).toEqual([["f1"]]);
	});

	it("should select a file on click", async () => {
		const { wrapper } = setup(false);

		await wrapper.find("[data-testid='file-area-file-aufgabe.pdf']").trigger("click");

		expect(wrapper.emitted("select-file")).toEqual([["file1"]]);
	});

	it("should only show the editing buttons to editors", () => {
		expect(setup(true).wrapper.find("[data-testid=file-area-new-folder]").exists()).toBe(true);
		expect(setup(false).wrapper.find("[data-testid=file-area-new-folder]").exists()).toBe(false);
	});

	it("should ask to create a folder", async () => {
		const { wrapper } = setup(true);

		await wrapper.find("[data-testid=file-area-new-folder]").trigger("click");

		expect(wrapper.emitted("create-folder")).toEqual([["board"]]);
	});

	it("should move a dragged folder into the folder it is dropped on", async () => {
		const { wrapper } = setup(true);
		const dataTransfer = {
			getData: () => JSON.stringify({ type: "folder", id: "other" }),
			types: ["application/x-file-area-item"],
		};

		await wrapper.find("[data-testid='file-area-folder-Arbeitsblätter']").trigger("drop", { dataTransfer });

		expect(wrapper.emitted("move-folder")).toEqual([["other", "f1"]]);
	});

	it("should show an empty hint", () => {
		const { wrapper } = setup(false, { parentId: "board", folders: [], files: [] });

		expect(wrapper.find("[data-testid=file-area-empty]").exists()).toBe(true);
	});
});
