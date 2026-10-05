<template>
	<div
		ref="gridRef"
		role="application"
		class="room-grid mt-8"
		:class="{ 'is-dragging': isDragging }"
		:aria-label="t('pages.rooms.title')"
		@focusin.once="notifyOnScreenReader(t('common.instructions.orderBy.arrowKeys'))"
	>
		<template v-for="(entry, index) in entries" :key="entryKey(entry)">
			<div v-if="entry.type === 'room'" class="room-grid-tile" data-entry-type="room" :data-entry-id="entry.room.id">
				<RoomGridItem
					class="user-select-none room-grid-item cursor-grab"
					:room="entry.room"
					:index
					@contextmenu.prevent
					@click.capture="onItemClick"
					@focusin="rememberFocus"
					@keydown.up.down.left.right="onArrowKeyDown($event, index)"
				>
					<template #menu>
						<RoomCollectionMenu
							:room-name="entry.room.name"
							:collections
							@add-to="addToCollection(entry.room, $event)"
							@create="createCollectionWith(entry.room)"
						/>
					</template>
				</RoomGridItem>
				<span class="merge-slot" aria-hidden="true" />
				<span class="merge-hint" aria-hidden="true">{{ t("pages.rooms.collections.drop.create") }}</span>
			</div>
			<template v-else>
				<div class="room-grid-tile is-collection" data-entry-type="collection" :data-entry-id="entry.collection.id">
					<RoomCollectionGridItem
						class="user-select-none cursor-grab"
						:collection="entry.collection"
						:rooms="entry.rooms"
						:index
						:is-open="entry.collection.id === openCollectionId"
						tabindex="0"
						@click.capture="onItemClick"
						@click="toggleCollection(entry.collection.id)"
						@toggle="toggleCollection(entry.collection.id)"
						@keydown.enter.self="toggleCollection(entry.collection.id)"
						@focusin="rememberFocus"
						@keydown.up.down.left.right="onArrowKeyDown($event, index)"
					/>
					<span class="merge-hint" aria-hidden="true">
						{{ t("pages.rooms.collections.drop.add", { title: collectionTitle(entry.collection) }) }}
					</span>
				</div>
				<RoomCollectionPanel
					v-if="entry.collection.id === openCollectionId"
					ref="panel"
					:key="`panel-${entry.collection.id}`"
					:collection="entry.collection"
					:room-count="entry.rooms.length"
					:focus-title="entry.collection.id === focusTitleOfCollectionId"
					@rename="rename(entry.collection.id, $event)"
					@dissolve="dissolve(entry.collection)"
					@close="toggleCollection(entry.collection.id)"
				>
					<div
						v-for="(room, roomIndex) in entry.rooms"
						:key="room.id"
						class="room-grid-tile"
						data-entry-type="room"
						:data-entry-id="room.id"
					>
						<RoomGridItem
							class="user-select-none room-grid-item cursor-grab"
							:room
							:index="roomIndex"
							@contextmenu.prevent
							@click.capture="onItemClick"
							@focusin="rememberFocus"
							@keydown.up.down.left.right="onArrowKeyDownInCollection($event, entry.collection.id, roomIndex)"
						>
							<template #menu>
								<RoomCollectionMenu
									:room-name="room.name"
									:collections
									:current-collection="entry.collection"
									@take-out="takeOut(room, entry.collection)"
									@add-to="addToCollection(room, $event)"
									@create="createCollectionWith(room)"
								/>
							</template>
						</RoomGridItem>
					</div>
				</RoomCollectionPanel>
			</template>
		</template>
	</div>
	<VSnackbar v-model="undo.isVisible" :timeout="6000" location="bottom" data-testid="room-grid-undo-snackbar">
		{{ undo.text }}
		<template #actions>
			<VBtn variant="text" color="primary" data-testid="room-grid-undo" @click="revert">
				{{ t("pages.rooms.collections.undo") }}
			</VBtn>
		</template>
	</VSnackbar>
</template>

<script setup lang="ts">
import RoomCollectionGridItem from "./RoomCollectionGridItem.vue";
import RoomCollectionMenu from "./RoomCollectionMenu.vue";
import RoomCollectionPanel from "./RoomCollectionPanel.vue";
import { RoomGridDropResult, useRoomGridDragAndDrop } from "./roomGridDragAndDrop.composable";
import RoomGridItem from "./RoomGridItem.vue";
import { useAriaLiveNotifier } from "@/composables/ariaLiveNotifier";
import { RoomItem } from "@/types/room/Room";
import {
	addRoomToCollection,
	applyDraggedOrder,
	ArrangementNode,
	buildArrangement,
	buildRoomGridEntries,
	createCollectionFromRooms,
	createCollectionWithRoom,
	dissolveCollection,
	moveNode,
	moveRoomInCollection,
	normalizeArrangement,
	renameCollection,
	RoomCollection,
	RoomGridEntry,
	suggestCollectionTitle,
	takeRoomOutOfCollection,
	useRoomStore,
} from "@data-room";
import { getGridContainerColumnsCount } from "@util-browser";
import { storeToRefs } from "pinia";
import { computed, nextTick, PropType, reactive, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	rooms: { type: Array as PropType<RoomItem[]>, required: true },
});

const { t } = useI18n();
const { notifyOnScreenReader } = useAriaLiveNotifier();
const roomStore = useRoomStore();
const { collections } = storeToRefs(roomStore);

const gridRef = useTemplateRef<HTMLElement>("gridRef");
const panel = useTemplateRef<InstanceType<typeof RoomCollectionPanel>[]>("panel");
const panelRef = computed(() => panel.value?.[0]?.container ?? undefined);

const openCollectionId = ref<string>();
const focusTitleOfCollectionId = ref<string>();
const focusedElement = ref<HTMLElement>();

const arrangement = computed(() => buildArrangement(props.rooms, collections.value));
const entries = computed(() => buildRoomGridEntries(arrangement.value, props.rooms));
const roomById = computed(() => new Map(props.rooms.map((room) => [room.id, room])));

const entryKey = (entry: RoomGridEntry) =>
	entry.type === "room" ? `room-${entry.room.id}` : `collection-${entry.collection.id}`;
const collectionTitle = (collection: RoomCollection) => collection.title || t("pages.rooms.collections.untitled");

const undo = reactive<{ isVisible: boolean; text: string; nodes?: ArrangementNode[] }>({
	isVisible: false,
	text: "",
});

/**
 * Shows and stores a new arrangement. Changes made without dragging are animated;
 * after a drop the cards already are where the user put them.
 */
const save = async (nodes: ArrangementNode[], message?: string, { animate = true } = {}) => {
	const before = arrangement.value;
	const normalized = normalizeArrangement(nodes, openCollectionId.value);
	if (openCollectionId.value && !normalized.some((node) => node.id === openCollectionId.value)) {
		openCollectionId.value = undefined;
	}

	// the store updates the rooms synchronously before it waits for the server
	let saving: Promise<void> = Promise.resolve();
	const update = () => {
		saving = roomStore.arrangeRooms(normalized);
		return nextTick();
	};
	if (animate && document.startViewTransition) {
		document.startViewTransition(update);
	} else {
		update();
	}
	await saving;

	if (message) {
		Object.assign(undo, { isVisible: true, text: message, nodes: before });
		notifyOnScreenReader(message);
	}
};

const revert = async () => {
	if (!undo.nodes) return;
	const nodes = undo.nodes;
	Object.assign(undo, { isVisible: false, nodes: undefined });
	await roomStore.arrangeRooms(nodes);
};

const newCollection = (title: string): RoomCollection => ({ id: crypto.randomUUID(), title });

const openNewCollection = (collection: RoomCollection) => {
	openCollectionId.value = collection.id;
	focusTitleOfCollectionId.value = collection.id;
};

// ---------- drag and drop ----------

const canMergeInto = (dragged: { type: string; id: string }, target: { type: string; id: string }) => {
	if (dragged.type !== "room") return false;
	if (target.type === "room") return target.id !== dragged.id;
	const node = arrangement.value.find((n) => n.type === "collection" && n.id === target.id);
	return node?.type === "collection" && !node.roomIds.includes(dragged.id);
};

const onDrop = ({ draggedType, draggedId, mergeTarget, mainOrder, panelRoomIds }: RoomGridDropResult) => {
	const ordered = applyDraggedOrder(arrangement.value, mainOrder, openCollectionId.value, panelRoomIds);
	const room = roomById.value.get(draggedId);

	if (mergeTarget && room && draggedType === "room") {
		if (mergeTarget.type === "collection") {
			const target = collections.value.find((collection) => collection.id === mergeTarget.id);
			save(
				addRoomToCollection(ordered, draggedId, mergeTarget.id),
				t("pages.rooms.collections.added", { name: room.name, title: target ? collectionTitle(target) : "" }),
				{ animate: false }
			);
			return;
		}
		const targetRoom = roomById.value.get(mergeTarget.id);
		const collection = newCollection(
			suggestCollectionTitle(targetRoom?.name ?? "", room.name, t("pages.rooms.collections.defaultTitle"))
		);
		openNewCollection(collection);
		save(
			createCollectionFromRooms(ordered, mergeTarget.id, draggedId, collection),
			t("pages.rooms.collections.created", { title: collection.title }),
			{ animate: false }
		);
		return;
	}

	const before = JSON.stringify(arrangement.value);
	if (JSON.stringify(ordered) === before) return;

	const wasInCollection = arrangement.value.find((n) => n.type === "collection" && n.roomIds.includes(draggedId));
	const isOnTopLevel = ordered.some((n) => n.type === "room" && n.id === draggedId);
	if (room && wasInCollection?.type === "collection" && isOnTopLevel) {
		save(
			ordered,
			t("pages.rooms.collections.takenOut", {
				name: room.name,
				title: wasInCollection.title || t("pages.rooms.collections.untitled"),
			}),
			{ animate: false }
		);
		return;
	}
	save(ordered, undefined, { animate: false });
};

const { isDragging } = useRoomGridDragAndDrop({ gridRef, panelRef, canMergeInto, onDrop });

// Fix for firefox: a drop must not open the room
const onItemClick = (evt: Event) => {
	if (isDragging.value) {
		evt.preventDefault();
		evt.stopPropagation();
	}
};

// ---------- actions without dragging ----------

const toggleCollection = (collectionId: string) => {
	if (isDragging.value) return;
	const wasOpen = openCollectionId.value === collectionId;
	openCollectionId.value = wasOpen ? undefined : collectionId;
	focusTitleOfCollectionId.value = undefined;

	// a collection with a single room dissolves once it is closed
	const node = arrangement.value.find((n) => n.id === collectionId);
	if (wasOpen && node?.type === "collection" && node.roomIds.length < 2) {
		save(arrangement.value);
	}
};

const addToCollection = (room: RoomItem, collectionId: string) => {
	const collection = collections.value.find((c) => c.id === collectionId);
	save(
		addRoomToCollection(arrangement.value, room.id, collectionId),
		t("pages.rooms.collections.added", { name: room.name, title: collection ? collectionTitle(collection) : "" })
	);
};

const createCollectionWith = (room: RoomItem) => {
	const collection = newCollection("");
	openNewCollection(collection);
	save(createCollectionWithRoom(arrangement.value, room.id, collection));
	notifyOnScreenReader(t("pages.rooms.collections.createdEmpty"));
};

const takeOut = (room: RoomItem, collection: RoomCollection) =>
	save(
		takeRoomOutOfCollection(arrangement.value, room.id),
		t("pages.rooms.collections.takenOut", { name: room.name, title: collectionTitle(collection) })
	);

const dissolve = (collection: RoomCollection) => {
	openCollectionId.value = undefined;
	save(
		dissolveCollection(arrangement.value, collection.id),
		t("pages.rooms.collections.dissolved", { title: collectionTitle(collection) })
	);
};

const rename = (collectionId: string, title: string) => save(renameCollection(arrangement.value, collectionId, title));

// ---------- keyboard ----------

const rememberFocus = (event: FocusEvent) => {
	focusedElement.value = event.target as HTMLElement;
};

const restoreFocus = async () => {
	await nextTick();
	focusedElement.value?.focus();
};

const targetIndex = (e: KeyboardEvent, index: number, count: number, container?: HTMLElement | null) => {
	const cols = getGridContainerColumnsCount(container ?? undefined);
	const step = { ArrowUp: -cols, ArrowDown: cols, ArrowLeft: -1, ArrowRight: 1 }[e.key] ?? 0;
	return Math.min(count - 1, Math.max(0, index + step));
};

const onArrowKeyDown = async (e: KeyboardEvent, index: number) => {
	if ((e.target as HTMLElement).closest(".no-drag")) return;
	const newIndex = targetIndex(e, index, arrangement.value.length, gridRef.value);
	if (newIndex === index) return;

	const entry = entries.value[index];
	await save(moveNode(arrangement.value, index, newIndex));
	notifyOnScreenReader(
		t("common.actions.moved", {
			elementName: entry.type === "room" ? entry.room.name : collectionTitle(entry.collection),
			position: newIndex + 1,
		})
	);
	await restoreFocus();
};

const onArrowKeyDownInCollection = async (e: KeyboardEvent, collectionId: string, index: number) => {
	if ((e.target as HTMLElement).closest(".no-drag")) return;
	const node = arrangement.value.find((n) => n.id === collectionId);
	if (node?.type !== "collection") return;
	const newIndex = targetIndex(e, index, node.roomIds.length, panelRef.value);
	if (newIndex === index) return;

	await save(moveRoomInCollection(arrangement.value, collectionId, index, newIndex));
	notifyOnScreenReader(
		t("common.actions.moved", {
			elementName: roomById.value.get(node.roomIds[index])?.name ?? "",
			position: newIndex + 1,
		})
	);
	await restoreFocus();
};
</script>

<style lang="scss" scoped>
.room-grid {
	display: grid;
	grid-gap: 16px;
	grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
	// rooms after an open collection fill up its row, the panel follows below that row
	grid-auto-flow: row dense;
}

.room-grid-tile {
	position: relative;
	isolation: isolate;
	view-transition-name: match-element;

	> :first-child {
		height: 100%;
	}
}

// two sheets peeking out behind the card mark a collection as a stack
.room-grid-tile.is-collection::before,
.room-grid-tile.is-collection::after {
	content: "";
	position: absolute;
	inset: 0;
	border-radius: 4px;
	background: rgb(var(--v-theme-surface));
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
	z-index: -1;
}

.room-grid-tile.is-collection::before {
	transform: translate(5px, 5px);
}

.room-grid-tile.is-collection::after {
	transform: translate(10px, 10px);
	opacity: 0.6;
}

// ---------- feedback while dragging onto a card ----------

.room-grid-tile > :first-child {
	transition:
		box-shadow 400ms ease,
		transform 160ms ease;
}

.room-grid-tile.merge-pending > :first-child {
	box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.25);
}

.room-grid-tile.merge-ready {
	z-index: 3;

	> :first-child {
		box-shadow:
			0 0 0 3px rgb(var(--v-theme-primary)),
			0 12px 28px rgba(0, 0, 0, 0.22);
		transform: scale(1.03);
		transition:
			box-shadow 120ms ease,
			transform 160ms ease;
	}
}

.room-grid-tile.merge-ready :deep(.room-grid-avatar) {
	transform: rotate(-5deg);
	transform-origin: 50% 115%;
	transition: transform 200ms ease;
}

.room-grid-tile.merge-ready :deep(.room-collection-fan-avatar) {
	transform: rotate(calc(var(--angle) * 1.25));
}

.merge-slot {
	display: none;
	position: absolute;
	left: 16px;
	top: 16px;
	width: 5em;
	height: 5em;
	border-radius: 8px;
	border: 2px dashed rgb(var(--v-theme-primary));
	background: rgba(var(--v-theme-primary), 0.12);
	transform-origin: 50% 115%;
	transform: rotate(5deg) scale(1.03);
	pointer-events: none;
}

.room-grid-tile.merge-ready .merge-slot {
	display: block;
}

.merge-hint {
	display: none;
	position: absolute;
	left: 50%;
	top: -13px;
	translate: -50% 0;
	max-width: calc(100% - 20px);
	padding: 4px 10px;
	border-radius: 999px;
	background: rgb(var(--v-theme-primary));
	color: rgb(var(--v-theme-on-primary));
	font-size: 0.8125rem;
	font-weight: bold;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	pointer-events: none;
}

.room-grid-tile.merge-ready .merge-hint {
	display: block;
}

// the dragged card shrinks a little when it would be collected
:global(.room-grid-tile.sortable-fallback) {
	rotate: 2deg;
	transition:
		scale 160ms ease,
		opacity 160ms ease;
}

:global(.room-grid-tile.sortable-fallback.over-merge) {
	scale: 0.82;
	opacity: 0.85;
}

:global(.room-grid-tile.sortable-fallback .merge-hint),
:global(.room-grid-tile.sortable-fallback .room-grid-item-menu) {
	display: none;
}

::view-transition-group(*) {
	animation-duration: 250ms;
	animation-timing-function: cubic-bezier(1, 0, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
	.room-grid-tile > :first-child,
	.room-grid-tile.merge-ready :deep(.room-grid-avatar) {
		transition: none;
	}
}
</style>
