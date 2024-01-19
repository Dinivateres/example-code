import { ApiClient, UserIdResolvable, HelixPaginatedResultWithTotal, HelixChatChatter } from '@twurple/api/lib';
import { logger } from '../functions';
import { ELogLevel } from '../types/ELogLevel';

/**
 * This class is for chaching the chatters List.
 */
export class ChatterList {
  private apiClient: ApiClient;
  private channelID: UserIdResolvable;
  private eirohbotID: UserIdResolvable;
  private bots: string[];
  private chatterSet: Set<string> = new Set();
  private chatterSetValidTimestamp: number = 0;

  constructor(apiClient: ApiClient, channelID: UserIdResolvable, eirohbotID: UserIdResolvable, bots: string[]) {
    this.apiClient = apiClient;
    this.channelID = channelID;
    this.eirohbotID = eirohbotID;
    this.bots = bots;
  }

  async getChattersSet(): Promise<Set<string>> {
    // If List is filled and timestamp is valid return cached list
    if (this.chatterSet.size > 0 && this.chatterSetValidTimestamp > Date.now()) {
      return this.chatterSet;
    }
    logger('GetChatterList - caching user List');
    // clear invalid set
    this.chatterSet.clear();
    try {
      let chattersList: HelixPaginatedResultWithTotal<HelixChatChatter> = await this.apiClient.chat.getChatters(
        this.channelID,
        this.eirohbotID,
        {limit: 1000}
      );
      chattersList.data.forEach((chatter) => this.chatterSet.add(chatter.userName));
      // let cursor: string = '';
      // while (cursor != chattersList.cursor) {
      //   cursor = chattersList.cursor;
      //   chattersList = await this.apiClient.chat.getChatters(this.channelID, this.eirohbotID, { after: cursor });
      //   chattersList.data.forEach((chatter) => this.chatterSet.add(chatter.userName));
      // }
      // remove bots
      for (const bot of this.bots) {
        this.chatterSet.delete(bot);
      }

      // set validity of list to now + 5 minutes
      this.chatterSetValidTimestamp = Date.now() + 1000 * 5 * 60;

      return this.chatterSet;
    } catch (err) {
      logger(`!getChatters(): ERROR! getChatters() [${err}]`, ELogLevel.ERROR);
      return new Set<string>();
    }
  }

  async getChattersList(): Promise<string[]> {
    return Array.from(await this.getChattersSet());
  }
}
