<template>
	<div v-if="value !== undefined && value !== ''" class="mb-4">
		<RenderHTML class="ck-content" :html="parts.intro" />
		<template v-if="parts.more">
			<RenderHTML
				v-show="isExpanded"
				:id="moreId"
				class="ck-content"
				:html="parts.more"
				data-testid="rich-text-read-more-content"
			/>
			<VBtn
				variant="text"
				color="primary"
				size="small"
				class="px-1 ml-n1"
				:append-icon="isExpanded ? mdiChevronUp : mdiChevronDown"
				:aria-expanded="isExpanded"
				:aria-controls="moreId"
				data-testid="rich-text-read-more-toggle"
				@click.stop="isExpanded = !isExpanded"
				@dblclick.stop
			>
				{{
					isExpanded
						? t("components.cardElement.richTextElement.showLess")
						: t("components.cardElement.richTextElement.showMore")
				}}
			</VBtn>
		</template>
	</div>
</template>

<script setup lang="ts">
import { splitAtReadMore } from "./split-at-read-more";
import { RenderHTML } from "@feature-render-html";
import { mdiChevronDown, mdiChevronUp } from "@icons/material";
import renderMathInElement from "katex/dist/contrib/auto-render.js";
import { computed, onMounted, ref, useId } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	value: {
		type: String,
		required: true,
	},
});

const { t } = useI18n();

const parts = computed(() => splitAtReadMore(props.value));
const isExpanded = ref(false);
const moreId = useId();

onMounted(() => {
	const mathElements = document.getElementsByClassName("math-tex");

	for (const element of mathElements) {
		renderMathInElement(element as HTMLElement);
	}
});
</script>
