<template>
	<VCard
		class="room-tag-stack d-flex flex-column"
		:class="{ 'is-open': isOpen }"
		:data-testid="`room-tag-stack-${index}`"
		:ripple="false"
		variant="elevated"
	>
		<VCardItem class="d-block flex-grow-1">
			<div class="room-tag-stack-content">
				<div class="room-tag-stack-fan" :style="{ marginInline: `${fanPadding}px` }" aria-hidden="true">
					<VAvatar
						v-for="(room, i) in fanRooms"
						:key="room.id"
						rounded="lg"
						class="room-tag-stack-avatar"
						:class="`room-color--${room.color}`"
						:style="{ '--angle': `${fanAngles[i]}deg` }"
					>
						<span class="text-h1 text-white">{{ room.name.slice(0, 2) }}</span>
					</VAvatar>
				</div>
				<div>
					<VCardTitle class="mb-1">
						<h2 class="text-break text-body-1 font-weight-bold ma-0" :data-testid="`room-tag-stack-name-${index}`">
							{{ tag.name }}
						</h2>
					</VCardTitle>
					<VChip size="small" :prepend-icon="mdiTagOutline" :data-testid="`room-tag-stack-count-${index}`">
						{{ t("pages.rooms.tags.roomCount", { count: rooms.length }, rooms.length) }}
					</VChip>
				</div>
			</div>
		</VCardItem>
		<VCardActions class="justify-end pr-4">
			<VBtn
				variant="text"
				color="primary"
				:aria-expanded="isOpen"
				:data-testid="`room-tag-stack-toggle-${index}`"
				@click.stop="$emit('toggle')"
			>
				{{ isOpen ? t("pages.rooms.tags.close") : t("pages.rooms.tags.open") }}
			</VBtn>
		</VCardActions>
	</VCard>
</template>

<script setup lang="ts">
import { RoomItem } from "@/types/room/Room";
import { RoomTag } from "@data-room";
import { mdiTagOutline } from "@icons/material";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

/** Angle between two fanned rooms, chosen with the click prototype. */
const FAN_ANGLE = 10;
const AVATAR_SIZE = 80;
/** The fan rotates around a point below the avatars, so it opens like a hand of cards. */
const PIVOT_OFFSET = AVATAR_SIZE * 1.15;
/** Hovering the stack opens the fan a little further. */
const MAX_SPREAD_FACTOR = 1.15;

const props = defineProps({
	tag: { type: Object as PropType<RoomTag>, required: true },
	rooms: { type: Array as PropType<RoomItem[]>, required: true },
	index: { type: Number, required: true },
	isOpen: { type: Boolean, default: false },
});

defineEmits<{ (e: "toggle"): void }>();

const { t } = useI18n();

// the alphabetically first room lies on top
const fanRooms = computed(() => props.rooms.slice(0, 3).reverse());
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
.room-tag-stack {
	overflow: visible;
	cursor: pointer;

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

.room-tag-stack-content {
	display: flex;
	flex-direction: row;
	gap: 16px;

	.v-card-title {
		line-height: 1.5 !important;
		white-space: normal;
	}
}

.room-tag-stack-fan {
	position: relative;
	flex: none;
	width: 5em;
	height: 5em;
}

.room-tag-stack-avatar {
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

.room-tag-stack:hover .room-tag-stack-avatar {
	transform: rotate(calc(var(--angle) * 1.15));
}

@media (prefers-reduced-motion: reduce) {
	.room-tag-stack-avatar {
		transition: none;
	}
}
</style>
