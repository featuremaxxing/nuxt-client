import { useEnvConfig } from "@data-env";
import { io, type Socket } from "socket.io-client";
import { onBeforeUnmount, onMounted, type Ref } from "vue";

type Handlers = {
	onChanged: () => void;
	onBoardDeleted?: () => void;
};

/**
 * Live updates for an open learning path: the server tells the socket room of the board when
 * steps or arrows changed, the view then reloads. A reconnect reloads as well, since changes
 * may have been missed in between.
 */
export const useLearningPathSocket = (boardId: Ref<string>, handlers: Handlers) => {
	let socket: Socket | undefined;
	let hasConnectedBefore = false;

	onMounted(() => {
		socket = io(useEnvConfig().value.BOARD_COLLABORATION_URI, {
			path: "/board-collaboration",
			reconnection: true,
			reconnectionAttempts: 10,
			withCredentials: true,
			closeOnBeforeunload: true,
		});

		socket.on("connect", () => {
			socket?.emit("fetch-board-request", { boardId: boardId.value });
			if (hasConnectedBefore) handlers.onChanged();
			hasConnectedBefore = true;
		});

		socket.on("learning-path-changed", (payload: { boardId: string }) => {
			if (payload.boardId === boardId.value) handlers.onChanged();
		});

		socket.on("delete-board-success", (payload: { boardId?: string; isOwnAction?: boolean }) => {
			if (payload.boardId === boardId.value && !payload.isOwnAction) handlers.onBoardDeleted?.();
		});
	});

	onBeforeUnmount(() => {
		socket?.disconnect();
		socket = undefined;
	});
};
