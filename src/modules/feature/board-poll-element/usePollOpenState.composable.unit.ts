import { isPollOpenAt } from "./usePollOpenState.composable";
import { PollElement } from "@/types/board/ContentElement";
import { pollElementResponseFactory } from "@@/tests/test-utils";
import { PollStatus } from "@api-server";

const buildElement = (overrides: Partial<PollElement["content"]> = {}): PollElement =>
	pollElementResponseFactory.build({ content: { pollStatus: PollStatus.OPEN, ...overrides } });

describe("isPollOpenAt", () => {
	it("is open when the poll is OPEN and has no closesAt", () => {
		const element = buildElement({ closesAt: null });

		expect(isPollOpenAt(element, new Date())).toBe(true);
	});

	it("is open when the poll is OPEN and closesAt is still in the future", () => {
		const element = buildElement({ closesAt: "2099-01-01T00:00:00.000Z" });

		expect(isPollOpenAt(element, new Date("2026-01-01T00:00:00.000Z"))).toBe(true);
	});

	it("is not open once closesAt has passed, even though pollStatus is still OPEN", () => {
		const element = buildElement({ closesAt: "2026-01-01T00:00:00.000Z" });

		expect(isPollOpenAt(element, new Date("2026-01-01T00:00:01.000Z"))).toBe(false);
	});

	it("is not open exactly at closesAt (matches the server's >= check)", () => {
		const element = buildElement({ closesAt: "2026-01-01T00:00:00.000Z" });

		expect(isPollOpenAt(element, new Date("2026-01-01T00:00:00.000Z"))).toBe(false);
	});

	it.each([PollStatus.DRAFT, PollStatus.CLOSED])("is not open when pollStatus is %s", (pollStatus) => {
		const element = buildElement({ pollStatus, closesAt: null });

		expect(isPollOpenAt(element, new Date())).toBe(false);
	});
});
