import { BotControl } from './../types/BotControl';
import { ChatClient } from '@twurple/chat';
import { logger } from '../functions';
import { Login } from '../Login';
import apiCall from '../system/ApiCall';
import { backendBaseUrl, channel } from '../system/Constants';
import { ELogLevel } from '../types/ELogLevel';

/**
 * This class is for continuous actions for the Wer Überlebt event.
 */
export class WuMode {
  private wuModeActive = false;
  private chatClient: ChatClient;
  private backendLogin: Login;
  private botControl: BotControl;

  constructor(chatClient: ChatClient, backendLogin: Login, botControl: BotControl) {
    this.chatClient = chatClient;
    this.backendLogin = backendLogin;
    this.botControl = botControl;
  }

  activate() {
    this.chatClient.say(channel, 'Wer Überlebt Modus aktiviert!');
    this.wuModeActive = true;
    this.announceBingos();
    this.announceDeaths();

    // automatically deactivate after 8h
    setTimeout(() => {
      this.deactivate();
    }, 8 * 1000 * 60 * 60);
  }

  deactivate() {
    this.chatClient.say(channel, 'Wer Überlebt Modus deaktiviert!');
    this.wuModeActive = false;
  }

  announceDeaths() {
    setTimeout(() => {
      try {
        if (!this.wuModeActive) {
          return;
        }
        const announcement = [
          'ist von uns gegangen.',
          'hat ins Gras gebissen.',
          'schaut sich die Blumen von unten an.',
          'hat den Löffel abgegeben.',
          'ist in die ewigen Jagdgründe eingegangen.',
          'hat das Zeitliche gesegnet.',
          'hat sein Leben ausgehaucht.',
          'wurde dahingerafft.',
          'hat die Grätsche gemacht.',
          'ist von der Bühne des Lebens abgetreten.',
          'letztes Stündchen hat geschlagen.',
          'hat vergessen zu atmen.',
          'ist den letzten Gang gegangen.',
          'ist dahingeschieden.',
          'ist über den Jordan gegangen.',
          'hat die Augen für immer geschlossen ... hoffentlich.',
          'hat sich ein Zimmer im Würmerhotel gemietet.',
          'hat abgedankt.',
          'dient den Geiern als Nahrungsquelle.',
        ];
        apiCall.get(backendBaseUrl + '/wuparticipant/announcelist', this.backendLogin.token).then((list: string[]) => {
          if (list && list.length > 0) {
            list.forEach((deadSim) => {
              this.chatClient.say(
                channel,
                `${deadSim} ${announcement[Math.floor(Math.random() * announcement.length)]}`
              );
            });
          }
        });
      } catch (error) {
        logger('announceDeaths: ' + error, ELogLevel.ERROR);
      }

      this.announceDeaths();
    }, this.botControl.deathsFetchDelayInSeconds * 1000);
  }

  announceBingos() {
    setTimeout(() => {
      try {
        if (!this.wuModeActive) {
          return;
        }
        apiCall.get(backendBaseUrl + '/wubingo/announcelist', this.backendLogin.token).then((list: string[]) => {
          if (list && list.length > 0) {
            list.forEach((user) => {
              this.chatClient.say(channel, `@${user}: Bingo!`);
            });
          }
        });
      } catch (error) {
        logger('announceBingos: ' + error, ELogLevel.ERROR);
      }

      this.announceBingos();
    }, this.botControl.bingoFetchDelayInSeconds * 1000);
  }
}
