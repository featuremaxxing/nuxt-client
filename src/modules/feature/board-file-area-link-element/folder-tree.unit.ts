import { checkFolderTree, MAX_FOLDER_TREE_DEPTH, MAX_FOLDER_TREE_SUBFOLDERS, pathTo } from "./folder-tree";

const folder = (id: string, parentId: string) => ({ id, parentId, title: id, createdAt: "", updatedAt: "" });

describe("folder tree", () => {
	it("should accept a small tree", () => {
		const folders = [folder("a", "area"), folder("b", "a"), folder("c", "b")];

		expect(checkFolderTree(folders, "a")).toEqual({ fits: true });
	});

	it("should refuse a tree deeper than the limit", () => {
		const folders = [folder("root", "area")];
		for (let level = 1; level <= MAX_FOLDER_TREE_DEPTH + 1; level += 1) {
			folders.push(folder(`l${level}`, level === 1 ? "root" : `l${level - 1}`));
		}

		expect(checkFolderTree(folders, "root")).toEqual({
			fits: false,
			depth: MAX_FOLDER_TREE_DEPTH + 1,
			subfolderCount: MAX_FOLDER_TREE_DEPTH + 1,
		});
	});

	it("should refuse a tree with too many subfolders", () => {
		const folders = [folder("root", "area")];
		for (let i = 0; i <= MAX_FOLDER_TREE_SUBFOLDERS; i += 1) folders.push(folder(`f${i}`, "root"));

		expect(checkFolderTree(folders, "root").fits).toBe(false);
	});

	it("should build the path from the top of the file area", () => {
		const folders = [folder("a", "area"), folder("b", "a"), folder("c", "b")];

		expect(pathTo(folders, "c")).toEqual(["a", "b", "c"]);
	});
});
