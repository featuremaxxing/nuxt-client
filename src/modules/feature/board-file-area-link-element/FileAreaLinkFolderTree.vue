<template>
	<ul class="folder-tree" :class="{ 'folder-tree--nested': level > 0 }">
		<li v-for="folder in subfolders" :key="folder.id">
			<button
				type="button"
				class="folder-tree__row"
				:aria-expanded="expanded.has(folder.id)"
				:data-testid="`link-tree-folder-${folder.title}`"
				@click="toggle(folder.id)"
			>
				<VIcon size="18" :icon="expanded.has(folder.id) ? mdiFolderOpenOutline : mdiFolderOutline" />
				<span>{{ folder.title }}</span>
			</button>
			<FileAreaLinkFolderTree
				v-if="expanded.has(folder.id)"
				:folders="folders"
				:parent-id="folder.id"
				:level="level + 1"
			/>
		</li>
		<li v-for="file in files" :key="file.id">
			<button
				type="button"
				class="folder-tree__row"
				:data-testid="`link-tree-file-${file.name}`"
				@click="openFilePreview(file)"
			>
				<VIcon size="18" :icon="mdiFileDocumentOutline" />
				<span>{{ file.name }}</span>
			</button>
		</li>
		<li v-if="level === 0 && subfolders.length === 0 && files.length === 0" class="folder-tree__empty text-body-2">
			{{ t("components.cardElement.fileAreaLinkElement.emptyFolder") }}
		</li>
	</ul>
</template>

<script setup lang="ts">
import { openFilePreview } from "./file-preview";
import { childrenOf } from "./folder-tree";
import { FileRecordParent } from "@/types/file/File";
import type { FileAreaFolder } from "@data-board-file-area";
import { useFileStorageApi } from "@data-file";
import { mdiFileDocumentOutline, mdiFolderOpenOutline, mdiFolderOutline } from "@icons/material";
import { computed, onMounted, PropType, reactive } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	folders: { type: Array as PropType<FileAreaFolder[]>, required: true },
	parentId: { type: String, required: true },
	level: { type: Number, default: 0 },
});

const { t } = useI18n();
const { fetchFiles, getFileRecordsByParentId } = useFileStorageApi();

const expanded = reactive(new Set<string>());

const subfolders = computed(() => childrenOf(props.folders, props.parentId));
const files = computed(() =>
	getFileRecordsByParentId(props.parentId)
		.filter((file) => !file.isUploading)
		.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
);

const toggle = (folderId: string) => {
	if (expanded.has(folderId)) expanded.delete(folderId);
	else expanded.add(folderId);
};

// files of a folder are only loaded once it is opened
onMounted(async () => {
	try {
		await fetchFiles(props.parentId, FileRecordParent.BOARDNODES);
	} catch {
		// shown as an empty folder, the file storage already reported the error
	}
});
</script>

<style scoped>
.folder-tree {
	list-style: none;
	padding: 0;
	margin: 0;
}

.folder-tree--nested {
	padding-left: 20px;
}

.folder-tree__row {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 4px 0;
	text-align: left;
	background: none;
	border: none;
	cursor: pointer;
}

.folder-tree__row:hover span {
	text-decoration: underline;
}

.folder-tree__empty {
	color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
