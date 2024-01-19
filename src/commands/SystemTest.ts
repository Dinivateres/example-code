import { ApiClient } from '@twurple/api/lib';
import { ChatClient } from '@twurple/chat/lib';
import { format } from 'date-fns';
import { logger } from '../functions';
import { Login } from '../Login';
import apiCall from '../system/ApiCall';
import { backendBaseUrl, botVersion, channel } from '../system/Constants';
import { BotControl } from '../types/BotControl';
import { ELogLevel } from '../types/ELogLevel';

export class SystemTest {
  private chatClient: ChatClient;
  private apiClient: ApiClient;
  private backendLogin: Login;
  private botControl: BotControl;

  constructor(chatClient: ChatClient, apiClient: ApiClient, backendLogin: Login, botControl: BotControl) {
    this.chatClient = chatClient;
    this.apiClient = apiClient;
    this.backendLogin = backendLogin;
    this.botControl = botControl;
  }

  getTimestamp(): string {
    return format(new Date(), 'dd.MM.yyyy HH:mm');
  }

  async test(user: string) {
    try {
      let statusMessage = `@${user} [${this.getTimestamp()}] Bot Status - Version: ${botVersion}`;
      const resultPing = await apiCall.get(backendBaseUrl + '/system/ping');
      // Use '=== true' to make sure that a real boolean was returned.
      statusMessage += ` | Backend erreichbar: ${resultPing === true ? 'true' : 'false'}`;
      let resultAuthenticated = false;
      if (resultPing === true) {
        resultAuthenticated = await apiCall.get(
          backendBaseUrl + '/system/authenticated/asmod',
          this.backendLogin.token
        );
        statusMessage += ` | authentifiziert: ${resultAuthenticated === true ? 'true' : 'false'}`;
        statusMessage += ` | Stream online: ${this.botControl.streamerOnline}`;
      }
      this.chatClient.say(channel, statusMessage);
    } catch (error) {
      this.chatClient.say(channel, `@${user} [${this.getTimestamp()}] Bot Test war fehlerhaft. Bitte ins Log schauen.`);
      logger('SystemTest: ' + error, ELogLevel.ERROR);
    }
    logger('Command !test was used.');
  }

  isStreamerOnlineCheck() {
    try {
      this.apiClient.streams.getStreamByUserName('xicanmeow').then((data) => {
        if (data) {
          this.botControl.streamerOnline = true;
        } else {
          this.botControl.streamerOnline = false;
        }
      });
      // .finally(() => {
      //   setTimeout(this.isStreamerOnlineCheck, 60 * 1000);
      // });
    } catch (e) {
      logger('isStreamerOnlineCheck failed to run - try again in 1 minute', ELogLevel.ERROR);
      // setTimeout(this.isStreamerOnlineCheck, 2 * 60 * 1000);
    }
  }

  loopStreamOnlineCheck = () => {
    this.isStreamerOnlineCheck();
    setTimeout(this.loopStreamOnlineCheck, 1 * 60 * 1000);
  };
}
