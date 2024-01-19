import { ChatClient } from '@twurple/chat/lib';
import { Login } from '../Login';
import { BotControl } from '../types/BotControl';
import apiCall from '../system/ApiCall';
import { backendBaseUrl, channel } from '../system/Constants';
import { Greeting } from '../types/Greeting';
import { ELogLevel } from '../types/ELogLevel';
import { getRandomInt, logger } from '../functions';
import { GreetingsData } from '../types/GreetingsData';

export class SpecialGreetings {
  private chatClient: ChatClient;
  private backendLogin: Login;
  private botControl: BotControl;
  private greetingList: GreetingsData = {};
  private isSpecialGreetingReady: boolean = false;

  constructor(chatClient: ChatClient, backendLogin: Login, botControl: BotControl) {
    this.chatClient = chatClient;
    this.backendLogin = backendLogin;
    this.botControl = botControl;
    this.init();
  }

  loadGreetings() {
    return apiCall.get(backendBaseUrl + '/greeting/all', this.backendLogin.token).then((list: Greeting[]) => {
      if (list?.length > 0) {
        // prepare GreetingsData
        list.forEach((greeting: Greeting) => {
          // add user if user is not in list and prepare object
          if (!Object.keys(this.greetingList).includes(greeting.username)) {
            this.greetingList[greeting.username] = {
              timestampLastMessage: 0,
              greetings: [],
            };
          }

          // now push specialGreeting to list of user
          if (Object.keys(this.greetingList).includes(greeting.username)) {
            this.greetingList[greeting.username].greetings.push(greeting);
          }
        });

        // after everything is done set ready flag to true
        this.isSpecialGreetingReady = true;
        logger('SpecialGreetings loaded.');
      }
    });
  }

  reloadGreetings() {
    try {
      this.greetingList = {};
      this.isSpecialGreetingReady = false;
      this.loadGreetings();
    } catch (error) {
      logger('SpecialGreetings reloadGreetings: ' + error, ELogLevel.ERROR);
    }
  }

  init = () => {
    try {
      this.loadGreetings().then(() => {
        this.chatClient.onMessage(async (channel, user) => {
          if (this.isSpecialGreetingReady && Object.keys(this.greetingList).includes(user)) {
            const now: number = Date.now();
            if (!(now - this.greetingList[user].timestampLastMessage >= 10800000)) {
              this.greetingList[user].timestampLastMessage = now;
              return;
            }

            let greetings: Greeting[] = this.greetingList[user].greetings;
            let greetingText: string = greetings[Math.floor(Math.random() * greetings.length)].greeting;

            if (user === 'eidechsenfalke') {
              // 10% chance to use alternativ message for Densie
              if (getRandomInt(0, 100) < 10) {
                const a: number = getRandomInt(0, 100);
                const b: number = getRandomInt(0, 100);
                const operators: string[] = ['+', '-', '*', '/'];
                const operator: string = operators[Math.floor(Math.random() * operators.length)];
                greetingText = `Ihr könnt eure Taschenrechner einpacken, Denise ist da! Kopfrechenaufgabe für alle ${a}${operator}${b}=?`;
              }
            }

            this.chatClient.say(channel, greetingText);

            this.greetingList[user].timestampLastMessage = now;
            logger(`First message for ${user}.`);
          }
        });
      });
    } catch (error) {
      logger('SpecialGreetings init: ' + error, ELogLevel.ERROR);
    }
  };
}
