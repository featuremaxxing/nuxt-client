<template>
	<button
		type="button"
		class="lp-tile"
		:class="[`lp-tile--${visualState}`, { 'lp-tile--selected': isSelected, 'lp-tile--text': step.isText }]"
		:aria-label="ariaLabel"
		:aria-disabled="!isEditor && !isOpenable"
		:aria-pressed="isEditor ? isSelected : undefined"
		:style="color ? { '--lp-color': color } : undefined"
		:title="hint || (isRework ? t('pages.learningPath.reworkHint') : undefined)"
		:data-testid="`learning-path-tile-${step.id}`"
	>
		<span class="lp-tile__head">
			<VIcon :icon="statusIcon" size="18" class="lp-tile__icon" aria-hidden="true" />
			<span class="lp-tile__title">{{ displayTitle }}</span>
			<LearningPathReworkMark
				v-if="isRework"
				:size="18"
				class="lp-tile__rework"
				data-testid="learning-path-tile-rework"
			/>
		</span>
		<span class="lp-tile__meta">
			<template v-if="isEditor">
				<span v-if="!step.isVisible && step.status !== 'unavailable'" class="lp-tile__chip">
					{{ t("common.words.draft") }}
				</span>
				<span v-if="step.lockUntilPrerequisitesDone" class="lp-tile__chip">
					<VIcon :icon="mdiLockOutline" size="12" aria-hidden="true" />
					{{ t("pages.learningPath.tile.locks") }}
				</span>
				<span v-if="step.linkedCardId" class="lp-tile__chip" data-testid="learning-path-tile-card">
					{{ t("components.boardCard") }}
				</span>
				<span v-if="step.isText" class="lp-tile__chip" data-testid="learning-path-tile-text">
					{{ t("pages.learningPath.text.label") }}
				</span>
				<span v-if="step.studentCount" data-testid="learning-path-tile-progress">
					{{ t("pages.learningPath.progress", { done: step.doneCount ?? 0, total: step.studentCount }) }}
				</span>
			</template>
			<span v-else-if="step.isText && step.status !== 'locked'" class="lp-tile__snippet">{{ snippet }}</span>
			<template v-else>{{ isRework ? t("pages.learningPath.rework") : statusText }}</template>
		</span>
		<template v-if="isEditor">
			<span
				v-for="side in SIDES"
				:key="side"
				class="lp-tile__handle"
				:class="`lp-tile__handle--${side}`"
				:title="t('pages.learningPath.connectHint')"
				:data-testid="`learning-path-tile-handle-${side}`"
				aria-hidden="true"
				@pointerdown.stop.prevent="emit('handle-pointerdown', $event, side)"
			/>
		</template>
	</button>
</template>

<script setup lang="ts">
import { type Side, SIDES } from "./canvas";
import { type LearningPathStep } from "@data-board-learning-path";
import {
	mdiCardTextOutline,
	mdiCheckCircle,
	mdiEyeOffOutline,
	mdiFormatText,
	mdiLockOutline,
	mdiMapMarkerPath,
	mdiViewDashboardOutline,
} from "@icons/material";
import { LearningPathReworkMark } from "@ui-room-details";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	step: { type: Object as PropType<LearningPathStep>, required: true },
	isEditor: { type: Boolean, default: false },
	isSelected: { type: Boolean, default: false },
	// the color of the learning path, as a css color
	color: { type: String, default: undefined },
	// why a locked step is locked
	hint: { type: String, default: "" },
});

const emit = defineEmits<{
	(e: "handle-pointerdown", event: PointerEvent, side: Side): void;
}>();

const { t } = useI18n();

const isOpenable = computed(() => props.step.status === "open" || props.step.status === "done");

// editors see every step as it is configured, students see their own state
const visualState = computed(() => (props.isEditor ? (props.step.isVisible ? "open" : "draft") : props.step.status));

const statusIcon = computed(() => {
	if (props.step.isText && (props.isEditor || props.step.status !== "locked")) return mdiFormatText;
	if (props.isEditor) return props.step.linkedCardId ? mdiCardTextOutline : mdiViewDashboardOutline;
	switch (props.step.status) {
		case "done":
			return mdiCheckCircle;
		case "locked":
			return mdiLockOutline;
		case "unavailable":
			return mdiEyeOffOutline;
		default:
			return mdiMapMarkerPath;
	}
});

const statusText = computed(() => t(`pages.learningPath.status.${props.step.status}`));

const displayTitle = computed(() => {
	if (props.step.isText)
		return (
			props.step.title ||
			t(
				props.step.status === "locked" && !props.isEditor
					? "pages.learningPath.text.locked"
					: "pages.learningPath.text.label"
			)
		);
	return props.step.title || t("pages.learningPath.tile.unavailable");
});

// the start of a text tile's text, all of it opens with a click
const snippet = computed(() => (props.step.text ?? "").replace(/\s+/g, " ").trim());

const isRework = computed(() => !props.isEditor && !!props.step.reopened);

const ariaLabel = computed(() => {
	const parts = [displayTitle.value];
	if (props.step.linkedCardId && props.step.boardTitle) {
		parts.push(t("pages.learningPath.cards.from", { title: props.step.boardTitle }));
	}
	if (!props.isEditor) parts.push(isRework.value ? t("pages.learningPath.reworkHint") : statusText.value);
	if (props.hint) parts.push(props.hint);
	return parts.join(", ");
});
</script>

<style scoped>
.lp-tile {
	position: absolute;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	width: 220px;
	height: 96px;
	padding: 10px 14px;
	text-align: left;
	border-radius: 8px;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
	background: rgb(var(--v-theme-surface));
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
	cursor: pointer;
	user-select: none;
	touch-action: none;
}

.lp-tile::before {
	content: "";
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	width: 7px;
	border-radius: 8px 0 0 8px;
	background: var(--lp-color, transparent);
}

.lp-tile:focus-visible {
	outline: 2px solid rgb(var(--v-theme-primary));
	outline-offset: 2px;
}

.lp-tile--selected {
	border: 2px solid rgb(var(--v-theme-primary));
}

.lp-tile--done {
	border-color: rgb(var(--v-theme-success));
}

.lp-tile--done .lp-tile__icon {
	color: rgb(var(--v-theme-success));
}

.lp-tile--open .lp-tile__icon {
	color: rgb(var(--v-theme-primary));
}

.lp-tile--locked,
.lp-tile--unavailable {
	cursor: not-allowed;
	background: rgba(var(--v-theme-on-surface), 0.04);
	color: rgba(var(--v-theme-on-surface), 0.6);
}

.lp-tile--draft {
	border-style: dashed;
}

.lp-tile__head {
	display: flex;
	align-items: flex-start;
	gap: 6px;
}

.lp-tile__rework {
	margin-left: auto;
}

.lp-tile__title {
	font-weight: 700;
	line-height: 1.3;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.lp-tile__meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	font-size: 0.8125rem;
	color: rgba(var(--v-theme-on-surface), 0.7);
}

.lp-tile__chip {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	padding: 0 6px;
	border-radius: 10px;
	background: rgba(var(--v-theme-on-surface), 0.08);
}

.lp-tile__handle {
	position: absolute;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 2px solid rgb(var(--v-theme-surface));
	background: rgb(var(--v-theme-primary));
	cursor: crosshair;
	opacity: 0.35;
	transition: opacity 0.15s;
}

.lp-tile:hover .lp-tile__handle,
.lp-tile--selected .lp-tile__handle,
.lp-tile__handle:hover {
	opacity: 1;
}

.lp-tile__handle--top {
	top: -9px;
	left: calc(50% - 9px);
}

.lp-tile__handle--right {
	right: -9px;
	top: calc(50% - 9px);
}

.lp-tile__handle--bottom {
	bottom: -9px;
	left: calc(50% - 9px);
}

.lp-tile__handle--left {
	left: -9px;
	top: calc(50% - 9px);
}

/* a text tile: a note on the path, nothing to open */
.lp-tile--text {
	border-style: dashed;
	background: rgb(var(--v-theme-surface-light));
}

.lp-tile__snippet {
	display: block;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}
</style>
