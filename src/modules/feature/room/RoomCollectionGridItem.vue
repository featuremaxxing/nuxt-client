<template>
	<VCard
		class="room-collection-grid-item d-flex flex-column"
		:class="{ 'is-open': isOpen }"
		:data-testid="`room-collection-${index}`"
		:ripple="false"
		variant="elevated"
	>
		<VCardItem class="d-block flex-grow-1">
			<div class="room-collection-content">
				<div class="room-collection-fan" :style="{ marginInline: `${fanPadding}px` }" aria-hidden="true">
					<VAvatar
						v-for="(room, i) in fanRooms"
						:key="room.id"
						rounded="lg"
						class="room-collection-fan-avatar"
						:class="`room-color--${room.color}`"
						:style="{ '--angle': `${fanAngles[i]}deg` }"
					>
						<span class="text-h1 text-white">{{ room.name.slice(0, 2) }}</span>
					</VAvatar>
				</div>
				<div>
					<VCardTitle class="mb-1">
						<h2 class="text-break text-body-1 font-weight-bold ma-0" :data-testid="`room-collection-title-${index}`">
							{{ collectionTitle }}
						</h2>
					</VCardTitle>
					<VChip size="small" :prepend-icon="mdiLayersOutline" :data-testid="`room-collection-count-${index}`">
						{{ t("pages.rooms.collections.roomCount", { count: rooms.length }, rooms.length) }}
					</VChip>
				</div>
			</div>
		</VCardItem>
		<VCardActions class="justify-end pr-4">
			<VBtn
				variant="text"
				color="primary"
				:aria-expanded="isOpen"
				:data-testid="`room-collection-toggle-${index}`"
				@click.stop="$emit('toggle')"
			>
				{{ isOpen ? t("pages.rooms.collections.close") : t("pages.rooms.collections.open") }}
			</VBtn>
		</VCardActions>
	</VCard>
</template>

<script setup lang="ts">
import { RoomItem } from "@/types/room/Room";
import { RoomCollection } from "@data-room";
import { mdiLayersOutline } from "@icons/material";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

/** Angle between two fanned rooms, chosen with the click prototype. */
const FAN_ANGLE = 10;
const AVATAR_SIZE = 80;
/** The fan rotates around a point below the avatars, so it opens like a hand of cards. */
const PIVOT_OFFSET = AVATAR_SIZE * 1.15;
/** Hovering or dropping onto the stack opens the fan a little further. */
const MAX_SPREAD_FACTOR = 1.25;

const props = defineProps({
	collection: { type: Object as PropType<RoomCollection>, required: true },
	rooms: { type: Array as PropType<RoomItem[]>, required: true },
	index: { type: Number, required: true },
	isOpen: { type: Boolean, default: false },
});

defineEmits<{ (e: "toggle"): void }>();

const { t } = useI18n();

const collectionTitle = computed(() => props.collection.title || t("pages.rooms.collections.untitled"));

const fanRooms = computed(() => props.rooms.slice(-3));
const fanAngles = computed(() => fanRooms.value.map((_, i) => (i - (fanRooms.value.length - 1) / 2) * FAN_ANGLE));

// keep the outermost rotated corner clear of the title and the card's edge
const fanPadding = computed(() => {
	const maxAngle = Math.max(0, ...fanAngles.value.map(Math.abs)) * MAX_SPREAD_FACTOR;
	const radians = (maxAngle * Math.PI) / 180;
	const half = AVATAR_SIZE / 2;
	return Math.max(0, Math.ceil(half * Math.cos(radians) + PIVOT_OFFSET * Math.sin(radians) - half));
});
</script>

<style lang="scss" scoped>
.room-collection-grid-item {
	overflow: visible;

	&.is-open {
		outline: 2px solid rgb(var(--v-theme-primary));
	}

	&:focus-within {
		outline: auto;
	}
}

:deep(.v-card-item__content) {
	overflow: visible;
}

.room-collection-content {
	display: flex;
	flex-direction: row;
	gap: 16px;

	.v-card-title {
		line-height: 1.5 !important;
		white-space: normal;
	}
}

.room-collection-fan {
	position: relative;
	flex: none;
	width: 5em;
	height: 5em;
}

.room-collection-fan-avatar {
	position: absolute;
	inset: 0;
	width: 5em;
	height: 5em;
	border: 2px solid rgb(var(--v-theme-surface));
	transform-origin: 50% 115%;
	transform: rotate(var(--angle));
	transition: transform 260ms cubic-bezier(0.3, 1.4, 0.5, 1);
	user-select: none;
}

.room-collection-grid-item:hover .room-collection-fan-avatar {
	transform: rotate(calc(var(--angle) * 1.15));
}

@media (prefers-reduced-motion: reduce) {
	.room-collection-fan-avatar {
		transition: none;
	}
}
</style>
