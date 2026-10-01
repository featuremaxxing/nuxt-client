<template>
	<span
		class="lp-rework"
		:style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.75)}px` }"
		:role="label ? 'img' : undefined"
		:aria-label="label || undefined"
		:aria-hidden="label ? undefined : 'true'"
		data-testid="learning-path-rework"
	>
		!
	</span>
</template>

<script setup lang="ts">
// A yellow "!": the board was completed, but something new came up. It never blocks anything. It
// comes with a text, or with a label for screen readers.
withDefaults(defineProps<{ size?: number; label?: string }>(), { size: 18, label: "" });
</script>

<style scoped>
.lp-rework {
	flex: none;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: #fdd835;
	color: #212121;
	font-weight: 800;
	line-height: 1;
	border: 1px solid rgba(0, 0, 0, 0.35);
	user-select: none;
}
</style>
