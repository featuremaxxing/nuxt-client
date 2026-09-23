import { PollElement } from "@/types/board/ContentElement";
import { PollStatus } from "@api-server";
import { computed, ComputedRef, onBeforeUnmount, onMounted, Ref, ref } from "vue";

const TICK_INTERVAL_MS = 30000;

// Mirrors the server's PollElement.isOpen(now) (poll-element.do.ts): a poll only accepts votes
// while explicitly opened and, if a start/deadline is set, within that window. Kept as a free
// function (not just inline in the composable) so PollContentElement's vote-form gating and
// PollStatusBar's "starts in.../closes in..." labels can never disagree about what "open" means.
export const isPollOpenAt = (element: PollElement, now: Date): boolean => {
	if (element.content.pollStatus !== PollStatus.OPEN) return false;

	const opensAt = element.content.opensAt;
	if (opensAt && now.getTime() < new Date(opensAt).getTime()) return false;

	const closesAt = element.content.closesAt;
	if (closesAt && now.getTime() >= new Date(closesAt).getTime()) return false;

	return true;
};

// Ticks `now` every 30s for as long as the calling component is mounted, and derives whether the
// poll is currently open from it - previously only PollStatusBar ran this ticker (to update its
// "closes in n min" label), so nothing on the client ever noticed a poll passing its closesAt:
// the vote form stayed open and submitting just failed with a generic error once the deadline had
// quietly passed server-side.
export const usePollOpenState = (element: Ref<PollElement>): { now: Ref<Date>; isOpen: ComputedRef<boolean> } => {
	const now = ref(new Date());
	let intervalId: ReturnType<typeof setInterval> | undefined;

	onMounted(() => {
		intervalId = setInterval(() => (now.value = new Date()), TICK_INTERVAL_MS);
	});
	onBeforeUnmount(() => {
		if (intervalId) clearInterval(intervalId);
	});

	const isOpen = computed(() => isPollOpenAt(element.value, now.value));

	return { now, isOpen };
};
