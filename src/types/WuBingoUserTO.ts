import { WuParticipantBotTO } from './WuParticipantBotTO';

export type WuBingoUserTO = {
  twitchuser: string;
  participants: WuParticipantBotTO[];
  dateOfBingo: Date | null;
};
