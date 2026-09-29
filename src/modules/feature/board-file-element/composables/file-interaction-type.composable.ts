import { FileInteractionType } from "../shared/types/file-interaction-type";
import { getModel3dFormat, isAudioMimeType, isPdfMimeType, isVideoMimeType } from "@/utils/fileHelper";

type FileInteractionTypeInput = {
	hasFileRecord: boolean;
	isCollaboraEnabled: boolean;
	isCollaboraEditable: boolean;
	mimeType?: string;
	fileName?: string;
	hasPreviewUrl: boolean;
	isDownloadAllowed: boolean;
};

export const useFileInteractionType = (input: FileInteractionTypeInput) => {
	if (!input.hasFileRecord) {
		return FileInteractionType.None;
	}

	if (input.isCollaboraEnabled && input.isCollaboraEditable) {
		return FileInteractionType.Collabora;
	}

	if (!input.mimeType) {
		return FileInteractionType.None;
	}

	if (isPdfMimeType(input.mimeType)) {
		return FileInteractionType.Pdf;
	}

	if (input.hasPreviewUrl) {
		return FileInteractionType.Image;
	}

	if (isVideoMimeType(input.mimeType) || isAudioMimeType(input.mimeType)) {
		return FileInteractionType.None;
	}

	// 3D models are shown and rotated in place - dragging ends with a click on the card
	if (input.fileName !== undefined && getModel3dFormat(input.fileName, input.mimeType) !== undefined) {
		return FileInteractionType.None;
	}

	if (input.isDownloadAllowed) {
		return FileInteractionType.Download;
	}

	return FileInteractionType.None;
};
