import type { FileAreaFolder } from "@data-board-file-area";

// A linked folder is shown as a tree right on the card. Beyond these limits the card would get
// unwieldy, so it asks to open the folder in the file area instead.
export const MAX_FOLDER_TREE_DEPTH = 3;
export const MAX_FOLDER_TREE_SUBFOLDERS = 50;

export type FolderTreeCheck = { fits: true } | { fits: false; depth: number; subfolderCount: number };

export const childrenOf = (folders: FileAreaFolder[], parentId: string): FileAreaFolder[] =>
	folders
		.filter((folder) => folder.parentId === parentId)
		.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }));

export const checkFolderTree = (folders: FileAreaFolder[], rootId: string): FolderTreeCheck => {
	let subfolderCount = 0;
	let depth = 0;

	const walk = (parentId: string, level: number): void => {
		for (const child of childrenOf(folders, parentId)) {
			subfolderCount += 1;
			depth = Math.max(depth, level);
			walk(child.id, level + 1);
		}
	};
	walk(rootId, 1);

	if (depth > MAX_FOLDER_TREE_DEPTH || subfolderCount > MAX_FOLDER_TREE_SUBFOLDERS) {
		return { fits: false, depth, subfolderCount };
	}

	return { fits: true };
};

// the folder ids from the top of the file area down to the folder, as used in ?path= of the file area
export const pathTo = (folders: FileAreaFolder[], folderId: string): string[] => {
	const byId = new Map(folders.map((folder) => [folder.id, folder]));
	const path: string[] = [];
	let current = byId.get(folderId);
	while (current) {
		path.unshift(current.id);
		current = byId.get(current.parentId);
	}

	return path;
};
