<template>
	<VCard
		class="room-grid-item d-flex flex-column"
		:data-testid="`board-grid-item-${index}`"
		:ripple="false"
		variant="elevated"
	>
		<VCardItem class="d-block flex-grow-1">
			<RouterLink tabindex="-1" :to="roomPath" class="room-link-item overflow-visible">
				<VBadge :model-value="room.isLocked" bordered :icon="mdiLock" :data-testid="`room-badge-lock-${index}`">
					<VAvatar rounded="lg" :class="avatarColor" class="room-grid-avatar" :data-testid="`room-avatar-${index}`">
						<span class="text-h1 text-white text-decoration-none" :data-testid="`room-short-title-${index}`">
							{{ roomShortName }}
						</span>
					</VAvatar>
				</VBadge>
				<div>
					<VCardTitle class="mb-1" :data-testid="`room--title-${index}`">
						<h2 class="text-break text-body-1 font-weight-bold ma-0">{{ room.name }}</h2>
					</VCardTitle>
					<div class="d-flex ga-2">
						<VChip
							size="small"
							:prepend-icon="mdiAccountMultipleOutline"
							class="text-decoration-none"
							:data-testid="`room--member-count-${index}`"
						>
							{{ room.totalMembers }} {{ t("common.words.member", room.totalMembers) }}
						</VChip>
						<VChip
							v-if="isExternalSchool"
							size="small"
							class="text-decoration-none"
							:data-testid="`room--external-school-${index}`"
						>
							{{ t("common.words.external") }}
						</VChip>
					</div>
				</div>
			</RouterLink>
		</VCardItem>
		<div class="room-grid-item-menu">
			<RoomTagMenu :room :current-tag />
		</div>
		<VCardActions class="pl-4 pr-4 align-end">
			<div v-if="roomTags.length" class="room-grid-item-tags d-flex flex-wrap ga-1" :data-testid="`room-tags-${index}`">
				<VChip
					v-for="tag in visibleTags"
					:key="tag.id"
					size="small"
					variant="tonal"
					:prepend-icon="mdiTagOutline"
					:aria-label="t('pages.rooms.tags.chip.ariaLabel', { name: tag.name })"
					@click.stop.prevent="showTag(tag.id)"
				>
					{{ tag.name }}
				</VChip>
				<VChip v-if="hiddenTagCount" size="small" variant="text" @click.stop.prevent="editTags(room)">
					+{{ hiddenTagCount }}
				</VChip>
			</div>
			<VSpacer />
			<VBtn
				:data-testid="`room-open-button-${index}`"
				:disabled="room.isLocked"
				variant="text"
				color="primary"
				:to="roomPath"
				:aria-label="roomAriaLabel"
			>
				{{ t("pages.room.boardCard.label.openItem") }}
			</VBtn>
		</VCardActions>
	</VCard>
</template>

<script setup lang="ts">
import { useRoomsView } from "./roomsView.composable";
import RoomTagMenu from "./RoomTagMenu.vue";
import { RoomItem } from "@/types/room/Room";
import { useSchoolStoreRefs } from "@data-app";
import { RoomTag, tagsOfRoom, useRoomStore } from "@data-room";
import { mdiAccountMultipleOutline, mdiLock, mdiTagOutline } from "@icons/material";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	room: {
		type: Object as PropType<RoomItem>,
		required: true,
	},
	index: { type: Number, required: true },
	/** Set when the card is shown inside the rooms of a tag. */
	currentTag: { type: Object as PropType<RoomTag>, default: undefined },
});

const { t } = useI18n();

const { schoolDetails } = useSchoolStoreRefs();

const isExternalSchool = computed(() => schoolDetails.value?.id !== props.room.schoolId);

const roomPath = computed(() => `/rooms/${props.room.id}`);
const roomShortName = computed(() => props.room?.name?.slice(0, 2) ?? "");
const MAX_VISIBLE_TAGS = 3;
const roomStore = useRoomStore();
const { showTag, editTags } = useRoomsView();
const roomTags = computed(() => tagsOfRoom(props.room, roomStore.tags));
const visibleTags = computed(() => roomTags.value.slice(0, MAX_VISIBLE_TAGS));
const hiddenTagCount = computed(() => roomTags.value.length - visibleTags.value.length);

const avatarColor = computed(() => `room-color--${props.room.color}`);
const roomAriaLabel = computed(() => `${t("common.labels.room")} ${props.room.name}`);
</script>

<style lang="scss" scoped>
.room-grid-item:focus-within {
	outline: auto;
}

:deep(.v-card-item__content) {
	overflow: visible;
}

.room-link-item {
	display: flex;
	flex-direction: row;
	gap: 16px;
	color: inherit;
	text-decoration: none;

	.v-card-title {
		line-height: 1.5 !important;
		white-space: normal;
	}

	&:hover {
		.v-card-title {
			text-decoration: underline;
		}
	}
}

// keep the title clear of the menu button
.room-link-item {
	padding-right: 28px;
}

.room-grid-item-menu {
	position: absolute;
	top: 4px;
	right: 4px;
}

.room-grid-item-tags {
	min-width: 0;
	padding-bottom: 6px;
}

.room-grid-avatar {
	width: 5em;
	height: 5em;
	user-select: none;
	transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	transition-property: width, height;
}
</style>
