import { canPreview, openFilePreview } from "./file-preview";
import { FileRecord } from "@/types/file/File";
import { downloadFile } from "@/utils/fileHelper";
import { LightBoxContentType } from "@ui-light-box";

const open = vi.fn();
vi.mock("@ui-light-box", async (importOriginal) => ({
	...(await importOriginal<typeof import("@ui-light-box")>()),
	useLightBox: () => ({ open }),
}));
vi.mock("@/utils/fileHelper", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/utils/fileHelper")>()),
	downloadFile: vi.fn(),
}));

const file = (mimeType: string, previewStatus = "preview_not_possible_wrong_mime_type") =>
	({ id: "f", name: "datei", url: "/api/v3/file/download/f/datei", mimeType, previewStatus }) as unknown as FileRecord;

describe("file preview", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should open a PDF in the light box", () => {
		openFilePreview(file("application/pdf"));

		expect(open).toHaveBeenCalledWith(expect.objectContaining({ type: LightBoxContentType.PDF }));
	});

	it("should open a video in the light box", () => {
		openFilePreview(file("video/mp4"));

		expect(open).toHaveBeenCalledWith(expect.objectContaining({ type: LightBoxContentType.VIDEO }));
	});

	it("should download files that cannot be shown", () => {
		const zip = file("application/zip");

		openFilePreview(zip);

		expect(canPreview(zip)).toBe(false);
		expect(open).not.toHaveBeenCalled();
		expect(downloadFile).toHaveBeenCalledWith(zip.url, zip.name);
	});
});
