import type { LearningPathStep } from "./learning-path-api";
import { cardDisplayTitle, fetchPickableCards, parseStepLinks, stepRoute } from "./learning-path-cards";
import type { CardResponse } from "@api-server";

const get = vi.fn();
vi.mock("@/utils/api", () => ({ $axios: { get: (...args: unknown[]) => get(...args) } }));

const card = (props: Partial<CardResponse> & { id: string }): CardResponse =>
	({ title: "", elements: [], height: 0, backgroundColor: "transparent", ...props }) as unknown as CardResponse;

describe("learning-path-cards", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("cardDisplayTitle", () => {
		it("should take the title of the card", () => {
			expect(cardDisplayTitle(card({ id: "k", title: " Was ist KI? " }))).toBe("Was ist KI?");
		});

		it("should fall back to what an untitled card links to, then to the start of its text", () => {
			const withLink = card({
				id: "k",
				elements: [{ id: "e", type: "link", content: { url: "u", title: "Karte: Funktionsweise" } }],
			} as never);
			const withText = card({
				id: "k",
				elements: [{ id: "e", type: "richText", content: { text: "<p>Large&nbsp;Language <b>Models</b></p>" } }],
			} as never);

			expect(cardDisplayTitle(withLink)).toBe("Karte: Funktionsweise");
			expect(cardDisplayTitle(withText)).toBe("Large Language Models");
			expect(cardDisplayTitle(card({ id: "k" }))).toBe("");
		});
	});

	describe("stepRoute", () => {
		it("should open a card step as part of the learning path and a board step as the board", () => {
			const cardStep: Pick<LearningPathStep, "linkedBoardId" | "linkedCardId"> = {
				linkedBoardId: "board-b",
				linkedCardId: "card-k",
			};

			expect(stepRoute(cardStep, "path")).toEqual({
				name: "boards-card-detail",
				params: { boardId: "board-b", cardId: "card-k" },
				query: { learningPath: "path" },
			});
			expect(stepRoute({ linkedBoardId: "board-b" }, "path")).toBe("/boards/board-b");
			expect(stepRoute({ id: "t", linkedBoardId: "", isText: true }, "path")).toEqual({
				path: "/boards/path",
				query: { step: "t" },
			});
		});
	});

	describe("fetchPickableCards", () => {
		it("should list the cards of a board by column, loaded in batches", async () => {
			const ids = Array.from({ length: 21 }, (_, index) => `card-${index}`);
			get.mockImplementation((url: string) => {
				if (url === "/v3/boards/board-b") {
					return Promise.resolve({
						data: {
							columns: [
								{ id: "col-1", title: "Modul 2", cards: ids.map((cardId) => ({ cardId })) },
								{ id: "col-2", title: "", cards: [] },
							],
						},
					});
				}
				const requested = new URLSearchParams(url.split("?")[1]).getAll("ids");
				return Promise.resolve({ data: { data: requested.map((id) => card({ id, title: id.toUpperCase() })) } });
			});

			const columns = await fetchPickableCards("board-b");

			expect(get).toHaveBeenCalledTimes(3);
			expect(columns[0]).toMatchObject({ id: "col-1", title: "Modul 2" });
			expect(columns[0].cards).toHaveLength(21);
			expect(columns[0].cards[20]).toEqual({ id: "card-20", title: "CARD-20" });
			expect(columns[1].cards).toEqual([]);
		});
	});

	describe("parseStepLinks", () => {
		const board = "6ac4c0a0a8195598eb6d5f44";
		const card = "6ac4c0b3a8195598eb6d5f78";

		it("should read the links of boards and cards in every form", () => {
			expect(parseStepLinks(`https://staging.kibox.online/boards/${board}`)).toEqual([{ boardId: board }]);
			expect(parseStepLinks(`https://kibox.online/boards/${board}#card-${card}`)).toEqual([
				{ boardId: board, cardId: card },
			]);
			expect(parseStepLinks(`https://kibox.online/boards/${board}/cards/${card}`)).toEqual([
				{ boardId: board, cardId: card },
			]);
			expect(parseStepLinks(`https://kibox.online/boards/${board}%23card-${card}`)).toEqual([
				{ boardId: board, cardId: card },
			]);
		});

		it("should read several links in order, each once", () => {
			const other = "6ac4c0b3a8195598eb6d5f79";
			const text = `https://x/boards/${board}#card-${other}\n https://x/boards/${board}#card-${card} https://x/boards/${board}#card-${other}`;

			expect(parseStepLinks(text)).toEqual([
				{ boardId: board, cardId: other },
				{ boardId: board, cardId: card },
			]);
		});

		it("should find nothing in text without a link", () => {
			expect(parseStepLinks("Modul 2, Karte 3")).toEqual([]);
			expect(parseStepLinks("https://example.org/rooms/123")).toEqual([]);
		});
	});
});
