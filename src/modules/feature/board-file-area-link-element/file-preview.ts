import { FileRecord } from "@/types/file/File";
import {
	convertDownloadToPreviewUrl,
	downloadFile,
	isAudioMimeType,
	isPdfMimeType,
	isPreviewPossible,
	isTextMimeType,
	isVideoMimeType,
} from "@/utils/fileHelper";
import { LightBoxContentType, type LightBoxOptions, useLightBox } from "@ui-light-box";

const contentTypeOf = (file: FileRecord): LightBoxContentType | undefined => {
	if (isPdfMimeType(file.mimeType)) return LightBoxContentType.PDF;
	if (isPreviewPossible(file.previewStatus)) return LightBoxContentType.IMAGE;
	if (isVideoMimeType(file.mimeType)) return LightBoxContentType.VIDEO;
	if (isAudioMimeType(file.mimeType)) return LightBoxContentType.AUDIO;
	if (isTextMimeType(file.mimeType)) return LightBoxContentType.TEXT;

	return undefined;
};

export const canPreview = (file: FileRecord): boolean => contentTypeOf(file) !== undefined;

// Shows the file in the board's light box (image, PDF, video, audio, text). Anything else is
// downloaded, there is nothing to show in the browser.
export const openFilePreview = (file: FileRecord): void => {
	const type = contentTypeOf(file);
	if (!type) {
		downloadFile(file.url, file.name);
		return;
	}

	const options: LightBoxOptions = { type, downloadUrl: file.url, name: file.name, alt: file.name };
	if (type === LightBoxContentType.IMAGE) {
		options.previewUrl = convertDownloadToPreviewUrl(file.url);
	}

	useLightBox().open(options);
};
