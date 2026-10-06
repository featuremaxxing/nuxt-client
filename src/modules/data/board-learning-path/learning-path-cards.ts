import type { LearningPathCardStep, LearningPathStep } from "./learning-path-api";
import { $axios } from "@/utils/api";
import type { BoardResponse, CardListResponse, CardResponse } from "@api-server";
import type { InjectionKey, Ref } from "vue";
import type { RouteLocationRaw } from "vue-router";

export type LearningPathPickableCard = { id: string; title: string };

export type LearningPathPickableColumn = { id: string; title: string; cards: LearningPathPickableCard[] };

// the card ids are sent in the query, a few at a time keeps the url short
const CARD_BATCH_SIZE = 20;

// What a card is called in a learning path: its title or - without one - what it links to or the
// start of its text (as the server names card steps).
export const cardDisplayTitle = (card: CardResponse): string => {
	if (card.title?.trim()) return card.title.trim();

	for (const element of card.elements) {
		const content = element.content as { title?: string; text?: string };
		if (element.type === "link" && content.title?.trim()) return content.title.trim();
	}
	const text = card.elements.find((element) => element.type === "richText")?.content as { text?: string } | undefined;
	const plain = (text?.text ?? "")
		.replace(/<[^>]*>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	return plain.length > 60 ? `${plain.slice(0, 57)}...` : plain;
};

// The columns of a board with their cards, to pick cards for a learning path.
export const fetchPickableCards = async (boardId: string): Promise<LearningPathPickableColumn[]> => {
	const board = (await $axios.get<BoardResponse>(`/v3/boards/${boardId}`)).data;
	const ids = board.columns.flatMap((column) => column.cards.map((card) => card.cardId));

	const cards = new Map<string, CardResponse>();
	for (let index = 0; index < ids.length; index += CARD_BATCH_SIZE) {
		const params = new URLSearchParams();
		ids.slice(index, index + CARD_BATCH_SIZE).forEach((id) => params.append("ids", id));
		const response = await $axios.get<CardListResponse>(`/v3/cards?${params.toString()}`);
		response.data.data.forEach((card) => cards.set(card.id, card));
	}

	return board.columns.map((column) => ({
		id: column.id,
		title: column.title,
		cards: column.cards
			.map((skeleton) => cards.get(skeleton.cardId))
			.filter((card): card is CardResponse => !!card)
			.map((card) => ({ id: card.id, title: cardDisplayTitle(card) })),
	}));
};

export type LearningPathStepLink = { boardId: string; cardId?: string };

const ID = "[0-9a-f]{24}";
const BOARD_LINK = new RegExp(`/boards/(${ID})(?:/cards/(${ID})|(?:#|%23)card-(${ID}))?`, "gi");

// The boards and cards that the pasted text links to, in order and each once: a board's link
// (/boards/<id>), a card's share link (/boards/<id>#card-<id>, also with an encoded #) or the
// card's detail view (/boards/<id>/cards/<id>). Whether they belong to the room is up to the server.
export const parseStepLinks = (text: string): LearningPathStepLink[] => {
	const links: LearningPathStepLink[] = [];
	const seen = new Set<string>();
	for (const match of text.matchAll(BOARD_LINK)) {
		const boardId = match[1].toLowerCase();
		const cardId = (match[2] ?? match[3])?.toLowerCase();
		const key = cardId ?? boardId;
		if (seen.has(key)) continue;
		seen.add(key);
		links.push(cardId ? { boardId, cardId } : { boardId });
	}

	return links;
};

// Where a step leads: the board, or a card step's card in the detail view, shown as part of the learning path.
export const stepRoute = (
	step: Pick<LearningPathStep, "linkedBoardId" | "linkedCardId">,
	pathId: string
): RouteLocationRaw =>
	step.linkedCardId
		? {
				name: "boards-card-detail",
				params: { boardId: step.linkedBoardId, cardId: step.linkedCardId },
				query: { learningPath: pathId },
			}
		: `/boards/${step.linkedBoardId}`;

// per card of the open board: the learning paths it is a step of (see useBoardLearningPathCards)
export const LEARNING_PATH_CARD_STEPS_KEY: InjectionKey<Ref<Record<string, LearningPathCardStep["paths"]>>> =
	Symbol("learningPathCardSteps");
