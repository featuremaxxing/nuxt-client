import FileAreaLinkContentElement from "./FileAreaLinkContentElement.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { ContentElementType, FileAreaLinkTargetType } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { ref } from "vue";

const loadFile = vi.fn();
const loadFolders = vi.fn();
const listFileAreasOfRoom = vi.fn();

vi.mock("./file-area-link-api", () => ({
	useFileAreaLinkApi: () => ({ loadFile, loadFolders, listFileAreasOfRoom }),
}));
vi.mock("@data-board", () => ({
	useBoardFocusHandler: vi.fn(),
	useContentElementState: (props: { element: { content: object } }) => ({ modelValue: ref(props.element.content) }),
	useSharedBoardPageInformation: () => ({ roomId: ref("room") }),
}));
const openFilePreview = vi.fn();
vi.mock("./file-preview", () => ({ openFilePreview: (...args: unknown[]) => openFilePreview(...args) }));

vi.mock("@data-file", () => ({
	useFileStorageApi: () => ({ fetchFiles: vi.fn(), getFileRecordsByParentId: () => [] }),
}));

const folder = (id: string, parentId: string, title = id) => ({ id, parentId, title, createdAt: "", updatedAt: "" });

describe("FileAreaLinkContentElement", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
		listFileAreasOfRoom.mockResolvedValue([{ id: "area", title: "Dateien", isVisible: true }]);
		loadFolders.mockResolvedValue({ status: "ok", value: [] });
	});

	const setup = (content: object, isEditMode = false) =>
		mount(FileAreaLinkContentElement, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: {
					FileAreaLinkPickerDialog: true,
					RouterLink: { props: ["to"], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' },
				},
			},
			props: {
				element: {
					id: "element",
					type: ContentElementType.FILE_AREA_LINK,
					content: { title: "", ...content },
					timestamps: { createdAt: "", lastUpdatedAt: "" },
				},
				isEditMode,
			},
		});

	it("should offer to pick a target in edit mode", () => {
		const wrapper = setup({}, true);

		expect(wrapper.find("[data-testid=file-area-link-pick]").exists()).toBe(true);
	});

	it("should show a linked file with download", async () => {
		loadFile.mockResolvedValue({
			status: "ok",
			value: { id: "file", name: "aufgabe.pdf", size: 2048, url: "/file", previewStatus: "preview_not_possible" },
		});

		const wrapper = setup({ fileAreaId: "area", targetType: FileAreaLinkTargetType.FILE, targetId: "file" });
		await flushPromises();

		expect(loadFile).toHaveBeenCalledWith("file");
		expect(wrapper.find("[data-testid=file-area-link-file]").text()).toContain("aufgabe.pdf");
		expect(wrapper.find("[data-testid=file-area-link-download]").exists()).toBe(true);
	});

	it("should say when the linked file is gone", async () => {
		loadFile.mockResolvedValue({ status: "missing" });

		const wrapper = setup({
			fileAreaId: "area",
			targetType: FileAreaLinkTargetType.FILE,
			targetId: "file",
			title: "alt.pdf",
		});
		await flushPromises();

		expect(wrapper.find("[data-testid=file-area-link-missing]").exists()).toBe(true);
		expect(wrapper.text()).toContain("alt.pdf");
	});

	it("should say when the file area is not visible", async () => {
		loadFile.mockResolvedValue({ status: "forbidden" });

		const wrapper = setup({ fileAreaId: "area", targetType: FileAreaLinkTargetType.FILE, targetId: "file" });
		await flushPromises();

		expect(wrapper.find("[data-testid=file-area-link-forbidden]").exists()).toBe(true);
	});

	it("should show a linked folder as a tree", async () => {
		loadFolders.mockResolvedValue({ status: "ok", value: [folder("f", "area"), folder("sub", "f", "Unterordner")] });

		const wrapper = setup({ fileAreaId: "area", targetType: FileAreaLinkTargetType.FOLDER, targetId: "f" });
		await flushPromises();

		expect(wrapper.find("[data-testid='link-tree-folder-Unterordner']").exists()).toBe(true);
		expect(wrapper.find("[data-testid=file-area-link-too-large]").exists()).toBe(false);
		expect(wrapper.find("[data-testid=file-area-link-open]").exists()).toBe(true);
	});

	it("should show an error instead of a folder with too many subfolders", async () => {
		const folders = [folder("f", "area")];
		for (let i = 0; i < 60; i += 1) folders.push(folder(`s${i}`, "f"));
		loadFolders.mockResolvedValue({ status: "ok", value: folders });

		const wrapper = setup({ fileAreaId: "area", targetType: FileAreaLinkTargetType.FOLDER, targetId: "f" });
		await flushPromises();

		expect(wrapper.find("[data-testid=file-area-link-too-large]").exists()).toBe(true);
		expect(wrapper.find("[data-testid=file-area-link-open]").exists()).toBe(true);
	});

	it("should say when the linked folder was deleted", async () => {
		loadFolders.mockResolvedValue({ status: "ok", value: [folder("other", "area")] });

		const wrapper = setup({
			fileAreaId: "area",
			targetType: FileAreaLinkTargetType.FOLDER,
			targetId: "f",
			title: "Weg",
		});
		await flushPromises();

		expect(wrapper.find("[data-testid=file-area-link-missing]").exists()).toBe(true);
	});

	it("should show where a linked file lives and its full name", async () => {
		const longName = "0219CA48-6FE7-4E24-8B50-9D456A2373AB.pdf";
		loadFile.mockResolvedValue({
			status: "ok",
			value: {
				id: "file",
				name: longName,
				parentId: "f",
				size: 10,
				url: "/file",
				previewStatus: "preview_not_possible",
			},
		});
		loadFolders.mockResolvedValue({ status: "ok", value: [folder("f", "area", "Material")] });

		const wrapper = setup({
			fileAreaId: "area",
			targetType: FileAreaLinkTargetType.FILE,
			targetId: "file",
			title: longName,
		});
		await flushPromises();

		expect(wrapper.find("[data-testid=file-area-link-location]").text()).toEqual("Dateien › Material");
		expect(wrapper.find("[data-testid=file-area-link-file-name]").text()).toEqual(longName);
	});

	it("should show the path of a linked folder", async () => {
		loadFolders.mockResolvedValue({
			status: "ok",
			value: [folder("f", "area", "Material"), folder("sub", "f", "Woche 1")],
		});

		const wrapper = setup({ fileAreaId: "area", targetType: FileAreaLinkTargetType.FOLDER, targetId: "sub" });
		await flushPromises();

		expect(wrapper.find("[data-testid=file-area-link-location]").text()).toEqual("Dateien › Material › Woche 1");
	});

	it("should open a linked file in the preview and link the location into the file area", async () => {
		const file = {
			id: "file",
			name: "bild.png",
			parentId: "f",
			size: 10,
			url: "/file",
			previewStatus: "preview_possible",
		};
		loadFile.mockResolvedValue({ status: "ok", value: file });
		loadFolders.mockResolvedValue({ status: "ok", value: [folder("f", "area", "Material")] });

		const wrapper = setup({ fileAreaId: "area", targetType: FileAreaLinkTargetType.FILE, targetId: "file" });
		await flushPromises();
		await wrapper.find("[data-testid=file-area-link-open-file]").trigger("click");

		expect(openFilePreview).toHaveBeenCalledWith(file);
		expect(wrapper.find("[data-testid=file-area-link-location]").attributes("data-to")).toEqual(
			JSON.stringify({ path: "/boards/area", query: { path: "f" } })
		);
	});
});
