// Single shared implementation of voter display-name formatting, used by PollResults.vue,
// poll-export.util.ts and PollParticipantsTable.vue so the three never drift apart (see the
// plan's "Vollbild-Auswertung" section). PollVoterResponse.firstName/lastName are optional -
// a voter who has since left the room has neither, in which case callers must show a neutral
// placeholder, NEVER the raw userId (a Mongo ObjectId, meaningless to end users).
export interface VoterNameSource {
	firstName?: string;
	lastName?: string;
	userId: string;
}

export const formatVoterName = (voter: VoterNameSource, fallbackLabel: string): string => {
	const name = [voter.firstName, voter.lastName].filter(Boolean).join(" ");
	return name.length > 0 ? name : fallbackLabel;
};
