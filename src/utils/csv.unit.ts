import { escapeCsvFormulaInjection } from "./csv";

describe("escapeCsvFormulaInjection", () => {
	it.each(["=1+1", "+1+1", "-1+1", "@SUM(A1:A2)", "\tsneaky", "\rsneaky"])(
		"prefixes a value starting with %j with a single quote",
		(value) => {
			expect(escapeCsvFormulaInjection(value)).toBe(`'${value}`);
		}
	);

	it("leaves an ordinary value untouched", () => {
		expect(escapeCsvFormulaInjection("Ben Berger")).toBe("Ben Berger");
	});

	it("leaves an empty value untouched", () => {
		expect(escapeCsvFormulaInjection("")).toBe("");
	});

	it("only guards against a formula character at the very start", () => {
		expect(escapeCsvFormulaInjection("well done = great")).toBe("well done = great");
	});
});
