import { useFileAreaState } from "./file-area-state";
import { createTestingPinia } from "@pinia/testing";
import { setActivePinia } from "pinia";
import { ref } from "vue";

const listFolders = vi.fn();
const notifyFilesChanged = vi.fn();
const fetchFiles = vi.fn();

vi.mock("./file-area-api", () => ({
	useFileAreaApi: () => ({
		listFolders,
		createFolder: vi.fn(),
		renameFolder: vi.fn(),
		moveFolder: vi.fn(),
		deleteFolder: vi.fn(),
		notifyFilesChanged,
	}),
}));
vi.mock("@data-file", () => ({
	useFileStorageApi: () => ({
		getFileRecordsByParentId: () => [],
		fetchFiles,
		upload: vi.fn(),
		rename: vi.fn(),
		deleteFiles: vi.fn(),
	}),
}));
vi.mock("@data-app", () => ({ useAppStore: () => ({ school: { id: "school" } }) }));

const folder = (id: string, parentId: string, title: string) => ({ id, parentId, title, createdAt: "", updatedAt: "" });

describe("useFileAreaState", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
		listFolders.mockResolvedValue({
			boardId: "board",
			folders: [folder("a", "board", "B-Ordner"), folder("b", "a", "Unter"), folder("c", "board", "A-Ordner")],
			allowedOperations: { createFileElement: true },
		});
	});

	const setup = async () => {
		const state = useFileAreaState(ref("board"));
		await state.loadAll();

		return state;
	};

	it("should start with one column for the file area, folders sorted by name", async () => {
		const { columns, canEdit } = await setup();

		expect(columns.value).toHaveLength(1);
		expect(columns.value[0].folders.map((f) => f.title)).toEqual(["A-Ordner", "B-Ordner"]);
		expect(canEdit.value).toBe(true);
	});

	it("should add a column for every opened folder", async () => {
		const { columns, openFolder } = await setup();

		await openFolder(0, "a");

		expect(columns.value.map((column) => column.parentId)).toEqual(["board", "a"]);
		expect(columns.value[1].folders.map((f) => f.id)).toEqual(["b"]);
		expect(fetchFiles).toHaveBeenCalledWith("a", "boardnodes");
	});

	it("should drop the columns of a folder that was removed by someone else", async () => {
		const { path, openFolder, loadFolders } = await setup();
		await openFolder(0, "a");
		listFolders.mockResolvedValue({
			boardId: "board",
			folders: [folder("c", "board", "A-Ordner")],
			allowedOperations: {},
		});

		await loadFolders();

		expect(path.value).toEqual([]);
	});

	it("should restore a path from the url and ignore unknown ids", async () => {
		const { path, restorePath } = await setup();

		restorePath(["a", "b", "gone"]);

		expect(path.value).toEqual(["a", "b"]);
	});

	it("should only reload the visible levels when files changed", async () => {
		const { onChanged } = await setup();
		fetchFiles.mockClear();

		await onChanged({ boardId: "board", parentIds: ["board", "hidden"], kind: "files" });

		expect(fetchFiles).toHaveBeenCalledTimes(1);
		expect(fetchFiles).toHaveBeenCalledWith("board", "boardnodes");
	});
});
