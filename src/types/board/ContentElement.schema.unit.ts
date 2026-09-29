import { AnyContentElementSchema } from "./ContentElement.schema";
import { BoardRoles, ContentElementType, PollAudience } from "@api-server";

describe("socket content element parser", () => {
	it("preserves checkbox text and approval configuration from a create-element socket response", () => {
		const response = {
			id: "checkbox-id",
			type: ContentElementType.CHECKBOX,
			timestamps: { createdAt: "2026-01-01T00:00:00Z", lastUpdatedAt: "2026-01-01T00:00:00Z" },
			content: {
				text: "Read chapter",
				requireTeacherConfirmation: true,
				audience: PollAudience.CUSTOM,
				audienceRoles: [BoardRoles.READER, BoardRoles.EDITOR],
			},
		};
		expect(AnyContentElementSchema.parse(response).content).toEqual(response.content);
	});
});
