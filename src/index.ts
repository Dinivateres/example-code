//start: npm run start
//compile: npm run tsc
//update packages: npm update

//ctrl + k, ctrl + c: comment
//ctrl + k, ctrl + u: uncomment

//Formatieren: Shift + Alt + F

import { ApiClient, ChattersList, HelixChatChatter, HelixPaginatedResultWithTotal, HelixUser } from '@twurple/api';
import { AccessToken, ClientCredentialsAuthProvider, exchangeCode, getAppToken, RefreshingAuthProvider } from '@twurple/auth';
import { ChatClient, UserNotice } from '@twurple/chat';
import { EventSubChannelFollowEvent, EventSubChannelHypeTrainBeginEvent } from '@twurple/eventsub';
import axios from 'axios';
import { createObjectCsvWriter } from 'csv-writer';
import { format, getISODay, isBefore } from 'date-fns';
import { th } from 'date-fns/locale';
import fs from 'fs';
import { MongoClient } from 'mongodb';
import { CommandHandler } from './commandHandler_v2';
import { SpecialGreetings } from './commands/SpecialGreetings';
import { SystemTest } from './commands/SystemTest';
import { WuMode } from './commands/WuMode';
import { XMas2022Rentier } from './commands/XMas2022Rentier';
import { Huhnwarts2023Helper } from './commandsHelper/Huhnwarts2023Helper';
import { XMas2022Helper } from './commandsHelper/XMas2022Helper';
import {
  achievementsFunction,
  capitalizeFirstLetter,
  getCombinations,
  getRandomInt,
  hasDuplicates,
  highscore,
  listMaker,
  logger,
  msToTime,
  multiAction,
  multiSay,
  mythicAnnouncement,
  pickRandom,
  pickRandoms,
  readFiles,
  replaceAt,
  size,
  Timer,
  Verlosung,
  ObjectOrCard
} from './functions';
import { Login } from './Login';
import { backendBaseUrl } from './system/Constants';
import { BotControl } from './types/BotControl';
import { ELogLevel } from './types/ELogLevel';
import { AngelListe, FischListe } from './types/GameTypesAngeln';
import { foundThing, Huhnwarts2023LostopfFile, huhnwarts2023PeevesAttackInterval, huhnwarts2023PeevesProtectionTime, huhnwarts2023PeevesSearchChance, huhnwarts2023Rarities, huhnwarts2023rarityPoints, HuhnwartsAchievementsFile, HuhnwartsBegleittierFile, HuhnwartsBegleittierTypeFile, HuhnwartsBohnenFile, HuhnwartsBohnenInventoryFile, HuhnwartsDuellFile, HuhnwartsObjectFile, HuhnwartsObjectInventoryFile, HuhnwartsOrteFile, HuhnwartsPeevesInventoryFile, HuhnwartsSchokofroschkartenFile, HuhnwartsSfkInventoryFile, HuhnwartsUserAchievementsFile, HuhnwartsUserFile, HuhnwartsUserSearchedPlacesFile, userFileReadout } from './types/GameTypesHuhnwarts2023';
import { Eiersuche, Ostereier } from './types/GameTypesOstern';
import { School, SchoolScore, SchulraudiMessages, SchulraudiSafety } from './types/GameTypesSchool';
import { GewinnerFile, WeihnachtsGegenstaende, WeihnachtsUser } from './types/GameTypesXMas2022';
import { QuoteList } from './types/QuoteList';
import { SimsDeathInfo } from './types/SimsDeathInfo';
import { ViewerTrackingUser } from './types/ViewerTrackingUser';
import { WuBingoUserTO } from './types/WuBingoUserTO';
import { WuParticipantBotTO } from './types/WuParticipantBotTO';
import { ChatterList } from './commands/ChatterList';

const TWENTYFOUR_HOURS_IN_MS = 86400000;
const channel: string = 'xicanmeow';
const channelID: number = 117483174;

const bots: string[] = ['nightbot', 'streamelements', 'eirohbot', 'soundalerts', 'fossabot', 'commanderroot']; //bots

const mods: string[] = [
  'xicanmeow',
  'dinivateres',
  'benniblanco80',
  'mssummersun',
  'grischeee',
  'ma1ubi',
  'tbi994',
  'derelky',
  'eidechsefalke',
  'furiouspeet',
  `dameya`
]; //mods

// CHANGE IF NECESSARY //
const statisticsPath: string = '/home/eirohbot/twitchbot/statistics/';
const backendLogin = new Login();

// This contains the state of bot controls
// bingoOpen is closed by default and needs to be opened after bot start.
// bingoFetchAnnouncement is off by default and needs to be activated.
// bingoFetchDelayInSeconds is 20 by default. This means if bingoFetchAnnouncement is true fetch bingo announcements every 20s.
const botControl: BotControl = {
  bingoOpen: false,
  bingoFetchAnnouncement: false,
  bingoFetchDelayInSeconds: 20,
  deathsFetchDelayInSeconds: 15,
  streamerOnline: false,
};

async function main() {
  //#region Twitch Connection
  //client data & app secret
  logger('readFile ./JSON/auth/env.json');
  const env: {
    userCredentials: {
      clientID: string;
      clientSecret: string;
    };
    appCredentials: {
      secret: string;
    };
  } = JSON.parse(await fs.promises.readFile('./JSON/auth/env.json', 'utf8'));

  try {
    await backendLogin.login();
  } catch (error) {
    logger('Error while log in backend: ' + error, ELogLevel.ERROR);
  }

  const clientId: string = env.userCredentials.clientID;
  const clientSecret: string = env.userCredentials.clientSecret;

  //DinivateresAI authentification
  logger('readFile ./JSON/auth/tokens.json');

  try {
    var tokenData: AccessToken = JSON.parse(await fs.promises.readFile('./JSON/auth/tokens.json', 'utf8'));
  } catch (error) {
    logger('Error during getting AccesToken from file: ' + error)
    //tokenData = await getAppToken(clientId, clientSecret);
    tokenData = await exchangeCode(clientId, clientSecret, 'ely0sxlwjvdqoxg35j9y1qv1qsggvz', 'http://localhost');
    logger('writeFile exchangeCode ./JSON/auth/tokens.json');
    fs.promises.writeFile('./JSON/auth/tokens.json', JSON.stringify(tokenData, null, 4), 'utf8');
  }

  const authProvider: RefreshingAuthProvider = new RefreshingAuthProvider(
    {
      clientId,
      clientSecret,
      onRefresh: (newTokenData) => {
        logger('writeFile authProvider ./JSON/auth/tokens.json');
        fs.promises.writeFile('./JSON/auth/tokens.json', JSON.stringify(newTokenData, null, 4), 'utf8');
      },
    },
    tokenData
  );

  const appAuthProvider = new ClientCredentialsAuthProvider(clientId, clientSecret);

  //xicanmeow authentification
  logger('readFile ./JSON/auth/xicanmeowTokens.json');
  var xicanmeowTokenData: AccessToken = JSON.parse(
    await fs.promises.readFile('./JSON/auth/xicanmeowTokens.json', 'utf8')
  );

  if (xicanmeowTokenData.accessToken == '') {
    tokenData = await exchangeCode(clientId, clientSecret, 'd4abemcpzfakux3if5kj44wrzhw6lr', 'http://localhost');
    logger('writeFile exchangeCode2 ./JSON/auth/tokens.json');
    fs.promises.writeFile('./JSON/auth/tokens.json', JSON.stringify(tokenData, null, 4), 'utf8');
  }

  const xicanmeowAuthProvider: RefreshingAuthProvider = new RefreshingAuthProvider(
    {
      clientId,
      clientSecret,
      onRefresh: (xicanmeowNewTokenData) => {
        logger('writeFile ./JSON/auth/xicanmeowTokens.json');
        fs.promises.writeFile(
          './JSON/auth/xicanmeowTokens.json',
          JSON.stringify(xicanmeowNewTokenData, null, 4),
          'utf8'
        );
      },
    },
    xicanmeowTokenData
  );

  //chatClient & apiClient & appClient
  const chatClient = new ChatClient({
    authProvider: authProvider,
    logger: {
      minLevel: `info`,
      // minLevel: "debug",
    },
    channels: [channel],
    isAlwaysMod: true,
  });

  const apiClient = new ApiClient({ authProvider });
  const appApiClient = new ApiClient({ authProvider: appAuthProvider });
  const xicanmeowApiClient = new ApiClient({
    authProvider: xicanmeowAuthProvider,
  });

  //channelID
  const channelIDHelix: HelixUser | null = await apiClient.users.getUserByName(channel);
  const channelID: string = channelIDHelix?.id!;

  //eirohbotID
  const eirohbotIDHelix: HelixUser | null = await apiClient.users.getUserByName("eirohbot");
  const eirohbotID: string = eirohbotIDHelix?.id!;

  //listener
  // const adapter = new DirectConnectionAdapter({
  //   hostName: 'derelky.com',
  //   sslCert: {
  //     key: await fs.promises.readFile('/home/twitchbot/.ssl/cert/privkey.pem', 'utf8'),
  //     cert: await fs.promises.readFile('/home/twitchbot/.ssl/cert/fullchain.pem', 'utf8'),
  //   },
  // });

  //   const listener = new EventSubListener({
  //     apiClient: appApiClient,
  //     adapter: adapter,
  //     secret: env.appCredentials.secret,
  //     logger: {
  //       minLevel: `info`,
  //       // minLevel: "debug",
  //     },
  //   });

  // const listener = new EventSubListener({
  //   apiClient: appApiClient,
  //   adapter: new NgrokAdapter(),
  //   secret: env.appCredentials.secret,
  //   logger: {
  //     // minLevel: `info`,
  //     minLevel: 'debug',
  //   },
  //   // strictHostCheck: true
  // });
  //#endregion Twitch Connection

  //#region Command Objects
  const wuMode = new WuMode(chatClient, backendLogin, botControl);
  const specialGreetings = new SpecialGreetings(chatClient, backendLogin, botControl);
  const systemTest = new SystemTest(chatClient, apiClient, backendLogin, botControl);
  const xMas2022Rentier = new XMas2022Rentier(chatClient);
  let chatterList = new ChatterList(apiClient, channelID, eirohbotID, bots);
  //#endregion Command Objects

  //#region System
  systemTest.loopStreamOnlineCheck();
  //#endregion System

  //#region Command Handling
  //commandHandler
  const commandHandler = new CommandHandler(chatClient, '!');
  chatClient.onMessage(commandHandler.onMessage.bind(commandHandler));

  //activate
  commandHandler.addCommand('activate', true, 3, 0, ({ args }) => {
    const names: string = commandHandler.activateCommand(args[0]);
    chatClient.action(channel, `${names} activated.`);
  });

  //deactivate
  commandHandler.addCommand('deactivate', true, 3, 0, ({ args }) => {
    const names: string = commandHandler.deactivateCommand(args[0]);
    chatClient.action(channel, `${names} deactivated.`);
  });

  //!reset
  function reset() {
    const commands: string[] = [
      'teecount',
      'klo',
      'rage',
      'tot',
      'revolution',
      // "simcount",
      'mundseife',
    ];

    commands.map((command) => {
      setTimeout(function () {
        chatClient.say(channel, `!editcom !${command} -c=0`);
      }, commands.indexOf(command) * 6000);
    });
  }

  commandHandler.addCommand('reset', true, 3, 0, async ({}) => {
    reset();
    logger('reset');
  });
  //#endregion Command Handling

  //#region base commands

  //!test - this is only a test command to check if bot is online and working.
  commandHandler.addCommand(['test'], true, 0, 2, async ({ user, msg, args }) => {
    if (msg.userInfo.isBroadcaster || msg.userInfo.isMod || msg.userInfo.displayName === 'illnux') {
      systemTest.test(user);
    }
  });

  commandHandler.addCommand(['chatterlistreset'], true, 0, 2, async ({ user, msg, args }) => {
    if (msg.userInfo.isBroadcaster || msg.userInfo.isMod || msg.userInfo.displayName === 'illnux') {
      chatterList = new ChatterList(apiClient, channelID, eirohbotID, bots);
    }
  });

  //!relogin - this is for trying to log in into the backend again.
  commandHandler.addCommand(['relogin'], true, 0, 2, async ({ user, msg, args }) => {
    if (msg.userInfo.isBroadcaster || msg.userInfo.isMod || msg.userInfo.displayName === 'illnux') {
      try {
        await backendLogin.login();
      } catch (error) {
        logger('Error while log in backend: ' + error, ELogLevel.ERROR);
      }
    }
  });

  //!wuMode
  commandHandler.addCommand(['wuMode'], true, 0, 2, async ({ user, msg, args }) => {
    /***
     * wuModue an- und ausschalten
     */
    if (
      (msg.userInfo.isBroadcaster || msg.userInfo.isMod || msg.userInfo.displayName === 'illnux') &&
      args[0] == 'on'
    ) {
      wuMode.activate();
      logger('wuMode on');
      return;
    }
    if (
      (msg.userInfo.isBroadcaster || msg.userInfo.isMod || msg.userInfo.displayName === 'illnux') &&
      args[0] == 'off'
    ) {
      wuMode.deactivate();
      logger('wuMode off');
      return;
    }
  });
  //!kiosk
  commandHandler.addCommand('kiosk', true, 0, 3, ({ args, user }) => {
    if (args.length == 0) {
      chatClient.say(channel, `@${user} Was möchtest du kaufen?`);
      logger('kiosk');
    } else {
      let target: boolean = false;
      let targetName: string = '';
      let output: string[] = args;
      for (let i: number = 0; i < args.length; i++) {
        if (args[i].startsWith('@')) {
          target = true;
          targetName = args[i].slice(1);
          output.splice(i, 1);
          break;
        }
      }
      if (target) {
        chatClient.say(channel, `@${targetName} Frisch für dich: ${output.join(' ')}!`);
      } else {
        chatClient.say(channel, `@${user} Frisch für dich: ${args.join(' ')}!`);
      }
      logger('kiosk');
    }
  });

  //!glückskeks
  commandHandler.addCommand('glückskeks', true, 0, 5, async ({}) => {
    logger('readFile ./JSON/glueckskekse.json');
    const glueckskeksAnswers: string[] = JSON.parse(await fs.promises.readFile('./JSON/glueckskekse.json', 'utf8'));
    chatClient.say(channel, glueckskeksAnswers[Math.floor(Math.random() * glueckskeksAnswers.length)]);
    logger('glückskeks');
  });

  //!job
  commandHandler.addCommand('job', true, 0, 0, async ({ args, user, msg }) => {
    logger('readFile ./JSON/jobList.json');
    const jobs: {
      jobs: string[];
      assignments: {
        [key: string]: {
          job: string;
          timestamp: string | number;
          userName: string;
        };
      };
    } = JSON.parse(await fs.promises.readFile('./JSON/jobList.json', 'utf8'));

    const hasJob = jobs.assignments[msg.userInfo.userId!] != null;
    if (args.length == 0) {
      if (hasJob) {
        chatClient.say(channel, `@${user} Dein aktueller Job ist: ${jobs.assignments[msg.userInfo.userId!].job}!`);
        logger('job');
      } else {
        chatClient.say(channel, `@${user} Du hast leider noch keinen Job!`);
        logger('job');
      }
    } else {
      const operation = args[0];
      switch (operation) {
        case 'new':
        case 'newjob':
        case 'neu':
        case 'neuer-job':
          const onTimeout = !hasJob
            ? false
            : Date.now() - TWENTYFOUR_HOURS_IN_MS <
              Date.parse(jobs.assignments[msg.userInfo.userId!].timestamp.toString());
          if (!onTimeout) {
            const newJob = jobs.jobs[Math.floor(Math.random() * jobs.jobs.length)];
            jobs.assignments[msg.userInfo.userId!] = {
              job: newJob,
              timestamp: new Date().toISOString(),
              userName: user,
            };
            logger('writeFile ./JSON/jobList.json');
            await fs.promises.writeFile('./JSON/jobList.json', JSON.stringify(jobs, null, 4), 'utf8');
            chatClient.say(channel, `@${user} ist nun:  ${newJob}`);
            logger('job');
          } else {
            chatClient.say(channel, `@${user} Du kannst nur alle 24h deinen Job bearbeiten!`);
            logger('job');
          }
          break;
        default:
          const choosenUserName = args[0].toLowerCase();
          const allUserNames = Object.values(jobs.assignments).map((a) => a.userName);
          if (!allUserNames.includes(choosenUserName.startsWith('@') ? choosenUserName.slice(1) : choosenUserName))
            chatClient.say(
              channel,
              `@${user} Der Benutzer @${
                choosenUserName.startsWith('@') ? choosenUserName.slice(1) : choosenUserName
              } existiert nicht oder ist arbeitslos.`
            );
          else
            chatClient.say(
              channel,
              `@${user} Der Benutzer @${
                choosenUserName.startsWith('@') ? choosenUserName.slice(1) : choosenUserName
              } ist: ${
                Object.values(jobs.assignments).find(
                  (val) =>
                    val.userName == (choosenUserName.startsWith('@') ? choosenUserName.slice(1) : choosenUserName)
                )?.job
              }`
            );
      }
    }
  });

  //!subs
  commandHandler.addCommand('subs', true, 3, 0, async ({}) => {
    const subs: number = (await xicanmeowApiClient.subscriptions.getSubscriptions(channelID)).total;
    chatClient.say(channel, `Iken hat derzeit ${subs} Subs.`);
    logger(`subs: ${subs}`);
  });

  //!game
  commandHandler.addCommand('game', true, 0, 5, async ({ args, msg }) => {
    if ((await apiClient.streams.getStreamByUserId(channelID))?.id === undefined) {
      chatClient.say(channel, `Derzeit läuft kein Stream.`);
      return; //stream offline
    }
    if (args.length == 0) {
      const channelInfo = await apiClient.channels.getChannelInfo(channelID);
      const currentGame = channelInfo?.gameName;
      chatClient.say(channel, `Das aktuelle Spiel ist ${currentGame}`);
    } else {
      if (!msg.userInfo.isMod && !msg.userInfo.isBroadcaster) return;
      const newGame: string = args.join(' ');
      const gameId: string | undefined = (await apiClient.games.getGameByName(newGame))?.id;
      xicanmeowApiClient.channels.updateChannelInfo(channelID, { gameId: gameId }).then(
        (success) => {
          chatClient.say(channel, `neues Spiel: ${newGame}`);
        },
        (error) => {
          chatClient.say(channel, `Error: dieses Spiel konnte nicht gefunden werden.`);
          console.log(error);
        }
      );
    }
    logger(`game`);
  });
  //#endregion base commands

  //#region Quotes
  //!quote
  commandHandler.addCommand('quote', true, 0, 1, async ({ args, user }) => {
    logger('readFile ./JSON/quotes/quoteList.json');
    let quoteList: QuoteList = JSON.parse(await fs.promises.readFile('./JSON/quotes/quoteList.json', 'utf8'));

    if (!isNaN(Number(args[0])) && Number.isInteger(Number(args[0]))) {
      //user input: number
      const index: number = Number(args[0]);
      if (quoteList.quotes[index - 1] == null) {
        //index out of bounds
        chatClient.say(channel, `@${user} dieses Zitat scheint leider nicht zu existieren.`);
        logger(`quote: out of bounds [${index}]`);
        return;
      }
      const quote: string = quoteList.quotes[index - 1];
      chatClient.action(channel, `${index}. ${quote}`);
      logger(`quote [${index}]`);
      return;
    } else if (args.length == 0) {
      //no user input
      let quote: string = '';
      while (quote == '') {
        quote = quoteList.quotes[Math.floor(Math.random() * quoteList.quotes.length)];
      }
      const index: number = quoteList.quotes.indexOf(quote);
      chatClient.action(channel, `${index + 1}. ${quote}`);
      logger(`quote rnd [${index + 1}]`);
      return;
    } else {
      //user input: search term
      const searchTerm: string = args.join(' ').toLowerCase();
      let matchingQuotes: string[] = [];
      quoteList.quotes.forEach((quote) => {
        if (quote.toLowerCase().includes(searchTerm)) {
          matchingQuotes.push(quote);
        }
      });
      if (matchingQuotes.length == 0) {
        //no matching quotes
        chatClient.say(channel, `@${user} es scheint kein passendes Zitat zu geben...`);
        logger(`quote: no match`);
        return;
      } else {
        //matching quotes
        const quote: string = matchingQuotes[Math.floor(Math.random() * matchingQuotes.length)];
        const index: number = quoteList.quotes.indexOf(quote);
        chatClient.action(channel, `${index + 1}. ${quote}`);
        logger(`quote match ${args.join(' ')} [${index + 1}]`);
        return;
      }
    }
  });

  //!addquote
  commandHandler.addCommand('addquote', true, 3, 0, async ({ args }) => {
    logger('readFile ./JSON/quotes/quoteList.json');
    let quoteList: QuoteList = JSON.parse(await fs.promises.readFile('./JSON/quotes/quoteList.json', 'utf8'));

    const emptyIndex: number = quoteList.quotes.indexOf('');
    if (emptyIndex == -1) {
      // kein leerer Slot
      quoteList.quotes.push(args.join(' '));
      chatClient.say(channel, `Zitat hinzugefügt:`);
      chatClient.action(channel, `${quoteList.quotes.length}. ${args.join(' ')}`);
    } else {
      //leerer Slot
      quoteList.quotes[emptyIndex] = args.join(' ');
      chatClient.say(channel, `Zitat hinzugefügt:`);
      chatClient.action(channel, `${emptyIndex + 1}. ${args.join(' ')}`);
    }
    logger('writeFile ./JSON/quotes/quoteList.json');
    await fs.promises.writeFile('./JSON/quotes/quoteList.json', JSON.stringify(quoteList, null, 4), 'utf8');
    logger(`addquote ${quoteList.quotes.length}`);
  });

  //!editquote
  commandHandler.addCommand('editquote', true, 3, 0, async ({ args, user }) => {
    logger('readFile ./JSON/quotes/quoteList.json');
    let quoteList: QuoteList = JSON.parse(await fs.promises.readFile('./JSON/quotes/quoteList.json', 'utf8'));

    if (!isNaN(Number(args[0])) && Number.isInteger(Number(args[0]))) {
      //number input
      if (quoteList.quotes[Number(args[0]) - 1] == null) {
        //quote does not exist
        chatClient.say(channel, `@${user} dieses Zitat scheint nicht zu existieren...`);
        logger(`editquote: out of bounds`);
        return;
      }

      const index: number = Number(args[0]);
      const quote: string = args.slice(1).join(' ');
      quoteList.quotes[index - 1] = quote;
      chatClient.say(channel, `Zitat Nr. ${index} editiert:`);
      chatClient.action(channel, `${index}. ${quote}`);

      logger('writeFile ./JSON/quotes/quoteList.json');
      await fs.promises.writeFile('./JSON/quotes/quoteList.json', JSON.stringify(quoteList, null, 4), 'utf8');
      logger(`editquote [${index}]`);
    } else {
      //missing number
      chatClient.say(channel, `@${user} bitte benutze das Format "!editquote [number] [text]".`);
      logger(`editquote: missing number`);
    }
  });

  //!deletequote
  commandHandler.addCommand('deletequote', true, 3, 0, async ({ args, user }) => {
    logger('readFile ./JSON/quotes/quoteList.json');
    let quoteList: QuoteList = JSON.parse(await fs.promises.readFile('./JSON/quotes/quoteList.json', 'utf8'));

    if (!isNaN(Number(args[0])) && Number.isInteger(Number(args[0]))) {
      //number input
      if (quoteList.quotes[Number(args[0]) - 1] == null) {
        //quote does not exist
        chatClient.say(channel, `@${user} dieses Zitat scheint nicht zu existieren...`);
        logger(`deletequote: out of bounds`);
        return;
      }

      const index: number = Number(args[0]);
      quoteList.quotes[index - 1] = '';
      chatClient.say(channel, `Zitat Nr. ${index} gelöscht.`);

      logger('writeFile ./JSON/quotes/quoteList.json');
      await fs.promises.writeFile('./JSON/quotes/quoteList.json', JSON.stringify(quoteList, null, 4), 'utf8');
      logger(`deletequote [${index}]`);
    } else {
      //missing number
      chatClient.say(channel, `@${user} bitte benutze das Format "!deletequote [number]".`);
      logger(`editquote: missing number`);
    }
  });

  //!allquotes [word]
  commandHandler.addCommand('allquotes', true, 3, 0, async ({ args, user }) => {
    logger('readFile ./JSON/quotes/quoteList.json');
    let quoteList: QuoteList = JSON.parse(await fs.promises.readFile('./JSON/quotes/quoteList.json', 'utf8'));

    if (args.length == 0) {
      chatClient.say(channel, `@${user} bitte gib einen Suchbegriff an.`);
      logger(`allquotes: no search term`);
      return;
    }

    const searchTerm: string = args.join(' ').toLowerCase();
    let matchingQuotes: string[] = [];
    quoteList.quotes.forEach((quote) => {
      if (quote.toLowerCase().includes(searchTerm)) {
        matchingQuotes.push(String(quoteList.quotes.indexOf(quote) + 1) + '. ' + quote);
      }
    });

    if (matchingQuotes.length == 0) {
      //no matching quotes
      chatClient.say(channel, `@${user} leider scheinen keine Zitate zu deinem Suchbegriff zu existieren...`);
      logger(`allquotes, no match`);
      return;
    }

    const message: string = matchingQuotes.join(' | ');
    multiAction(channel, chatClient, '|', message);
    logger(`allquotes [${args.join(' ')}]`);
  });
  //#endregion Quotes

  //#region Schubsen

  var monsterTimerStart: NodeJS.Timeout;
  var monsterTimerStop: NodeJS.Timeout;

  var ölkanne: boolean = false;
  //!schubsenan
  commandHandler.addCommand(
    'schubsenan',
    true,
    3,
    0,
    async ({}) => {
      commandHandler.activateCommand('schubsen');
      commandHandler.activateCommand('sammeln');
      commandHandler.activateCommand('rucksack');
      commandHandler.activateCommand('benutzen');
      commandHandler.activateCommand('inventar');
      commandHandler.activateCommand('drop');
      commandHandler.activateCommand('gift');
      commandHandler.activateCommand('rucksackmonster');
      commandHandler.activateCommand('essen');
      // commandHandler.activateCommand("geld");
      commandHandler.activateCommand('kaufen');

      var lootableItems: string[] = [];
      for (const property in schubsListe.rucksackmonster.list) {
        if (schubsListe.rucksackmonster.list[property].available == true) {
          lootableItems.push(property);
        }
      }

      if (lootableItems.length > 0) {
        const lootItemProperty: string = lootableItems[Math.floor(Math.random() * lootableItems.length)];
        const lootableItem: string = schubsListe.rucksackmonster.list[lootItemProperty].name;
        const lootablePurpose: string = schubsListe.rucksackmonster.list[lootItemProperty].purpose;
        const probSuccess: number = 0.75; //0.75
        const rndNumber: number = Math.random();
        var outcome: boolean = false;
        if (rndNumber <= probSuccess) outcome = true;

        if (outcome) {
          // ---------- Rucksackmonster taucht auf ----------
          const waitTime = (getRandomInt(20, 300) / 10) * 60 * 1000; //rndm Zeit zwischen 2 & 30 min in MS
          logger(`Rucksackmonster aktiv in ${waitTime / 1000 / 60} Minuten.`);

          monsterTimerStart = setTimeout(async function () {
            schubsListe.rucksackmonster.active = true;
            schubsListe.rucksackmonster.item.name = lootableItem;
            schubsListe.rucksackmonster.item.purpose = lootablePurpose;
            schubsListe.rucksackmonster.list[lootItemProperty].available = false;

            logger('writeFile ./JSON/schubsen/schubsListe.json');
            await fs.promises.writeFile(
              './JSON/schubsen/schubsListe.json',
              JSON.stringify(schubsListe, null, 4),
              'utf8'
            );

            logger(`Rucksackmonster aktiv!`);

            chatClient.action(channel, `Ein Rucksackmonster rennt durch den Chat! Schnell! Schubst es!`);
          }, waitTime);

          monsterTimerStop = setTimeout(async function () {
            schubsListe.rucksackmonster.active = false;
            schubsListe.rucksackmonster.item.name = '';
            schubsListe.rucksackmonster.item.purpose = '';
            schubsListe.rucksackmonster.list[lootItemProperty].available = true;

            logger('writeFile ./JSON/schubsen/schubsListe.json');
            await fs.promises.writeFile(
              './JSON/schubsen/schubsListe.json',
              JSON.stringify(schubsListe, null, 4),
              'utf8'
            );

            logger('Das Rucksackmonster ist verschwunden.');

            chatClient.action(channel, `Das Rucksackmonster schlüpft aus dem Chat. Zu spät...`);
          }, waitTime + 10000);
        } else {
          logger('Kein Rucksackmoster erscheint...');
        }
      } else {
        logger('Kein legendäres Item frei...');
      }

      chatClient.action(channel, `Schubsen ist jetzt an!`);
      chatClient.say(
        channel,
        `Erfahre mehr mit !info [Begriff]. Begriffe: !schubsen, domino, !sammeln, !kaufen, !geld, !benutzen, !inventar, !rucksäcke, !drop, !schenken, !achievements, !rang, Rucksackmonster, 
        Joghurt, Bueno, Rucksackfinder, sowie die legendären Gegenstände, Achievements und Ränge.`
      );
      logger('Schubsen aktiviert!');
    },
    3
  );

  //!schubsenaus
  commandHandler.addCommand(
    'schubsenaus',
    true,
    3,
    0,
    ({}) => {
      commandHandler.deactivateCommand('schubsen');
      commandHandler.deactivateCommand('sammeln');
      commandHandler.deactivateCommand('rucksack');
      commandHandler.deactivateCommand('benutzen');
      commandHandler.deactivateCommand('inventar');
      commandHandler.deactivateCommand('drop');
      commandHandler.deactivateCommand('gift');
      commandHandler.deactivateCommand('rucksackmonster');
      commandHandler.deactivateCommand('essen');
      // commandHandler.deactivateCommand("geld");
      commandHandler.deactivateCommand('kaufen');

      clearTimeout(monsterTimerStart);
      clearTimeout(monsterTimerStop);

      chatClient.action(channel, `Schubsen ist jetzt aus!`);
      logger('Schubsen deaktiviert!');
    },
    3
  );

  //Schubsen Data
  const unschubsbar: string[] = [
    'nightbot',
    'streamelements',
    'dinivateresai',
    'soundalerts',
    'fossabot',
    'commanderroot',
  ]; //bots

  logger('readFile ./JSON/schubsen/schubsListe.json');
  var schubsListe: {
    rucksackmonster: {
      active: boolean;
      item: {
        name: string;
        purpose: string;
      };
      list: {
        [key: string]: {
          name: string;
          purpose: string;
          available: boolean;
          [key: string]: any;
        };
      };
    };
    index: {
      [key: string]: {
        timestamp: string;
        consecutiveDays: number;
        userName: string;
        ownId: string;
        money: number;
        ownedItems: {
          [key: string]: any;
        };
        defensiveItems: string[];
        offensiveItems: string[];
        passiveItems: string[];
        inventar: string[];
        cooldownSchubsen: number;
        cooldownSammeln: number;
        safe: string[];
        [key: string]: any;
      };
    };
    floor: string[];
  } = JSON.parse(await fs.promises.readFile('./JSON/schubsen/schubsListe.json', 'utf8'));

  logger('readFile ./JSON/schubsen/schubsConsumables.json');
  const schubsConsumables: {
    money: number[];
    items: {
      [key: string]: {
        [key: string]: any;
      };
    };
    legendaryItems: {
      [key: string]: {
        [key: string]: any;
      };
    };
  } = JSON.parse(await fs.promises.readFile('./JSON/schubsen/schubsConsumables.json', 'utf8'));

  //!schubsen
  commandHandler.addCommand('schubsen', false, 0, 0, async ({ args, user, msg }) => {
    const viewers: string[] = (await apiClient.unsupported.getChatters(channel)).allChatters;
    //excludes bots
    for (var i = 0; i < unschubsbar.length; i++) {
      var index = viewers.indexOf(unschubsbar[i]);
      if (index !== -1) {
        viewers.splice(index, 1);
      }
    }

    //setup Variables
    const probSuccess: number = 0.6; //0.6
    const probDomino: number = 0.15; //0.15
    const dominoMinLength: number = 3;
    const dominoMaxLength: number = 8;
    const cooldown: number = 180000; //300000 = 5 min, 180000 3 min

    const userId: string = msg.userInfo.userId!;
    var highscoreIDs: string[] = [];

    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }

    var target: boolean;
    args.length != 0 ? (target = true) : (target = false);
    var targetName: string = '';

    if (target) {
      targetName = args[0].toLowerCase();
      if (targetName.startsWith('@')) {
        targetName = targetName.slice(1);
      }
      //--------------------------------Rucksackmonster--------------------------------
      if (targetName == 'rucksackmonster') {
        if (schubsListe.rucksackmonster.active == true) {
          const item: string = schubsListe.rucksackmonster.item.name;
          schubsListe.index[userId][schubsListe.rucksackmonster.item.purpose].splice(
            0,
            0,
            schubsListe.rucksackmonster.item.name
          );
          schubsListe.rucksackmonster.item.name = '';
          schubsListe.rucksackmonster.item.purpose = '';
          schubsListe.rucksackmonster.active = false;

          clearTimeout(monsterTimerStop);

          chatClient.action(
            channel,
            `@${user} schubst das Rucksackmonster! @${user} erhält das legendäre Item ${item}! (Infos zum Item unter !info ${item})`
          );

          // -------- Highscore/Achievements --------
          achievementsFunction(userId, user, 'Masterlooter:in', chatClient, schubsListe, item);

          logger(`Rucksackmonster geschubst durch ${user}.`);
        }
        return;
      }
    } else {
      //--------------------------------wählt random Viewer--------------------------------
      targetName = viewers[Math.floor(Math.random() * (viewers.length - 1))];
      while (unschubsbar.includes(targetName) || targetName == user || unschubsbar.includes(targetName)) {
        targetName = viewers[Math.floor(Math.random() * (viewers.length - 1))];
      }
    }

    var onCooldown: boolean;
    const now: number = Date.now();
    schubsListe.index[userId].cooldownSchubsen + cooldown < now ? (onCooldown = false) : (onCooldown = true);
    if (!onCooldown) {
      //--------------------------------kein Cooldown--------------------------------
      schubsListe.index[userId].cooldownSchubsen = now; //setzt neuen Cooldown

      const targetHelix = await apiClient.users.getUserByName(targetName);
      const targetId = targetHelix?.id!;

      if (schubsListe.index[targetId] == null) {
        //fügt neuen Chatter ein
        await addBackpack(targetId);
      }
      if (unschubsbar.includes(targetName)) {
        // User schubst Bot
        chatClient.say(channel, `Du kannst @${targetName} nicht schubsen.`);
        logger('schubsenBot');
      } else if (viewers.includes(targetName)) {
        //User schubst vorhandenen Chatter

        var rndNumber: number = Math.random();
        var outcome: boolean;
        rndNumber > probSuccess ? (outcome = false) : (outcome = true); //würfelt, ob Schubsen Erfolg hat

        if (outcome) {
          // Schubsen erfolgreich
          var defenciveItem: boolean;
          var failedDefence: boolean = false;
          var failedBanane: boolean = false;
          schubsListe.index[targetId].defensiveItems.length != 0 ? (defenciveItem = true) : (defenciveItem = false);

          if (defenciveItem) {
            //----- Target hat Verteidigungs-Item -----
            var rndNumber: number = Math.random();
            var protectiveItem: string = schubsListe.index[targetId].defensiveItems[0]; //selektiert erstes defensives Item (specials sind immer zuerst)
            const re: RegExp = / /gi;
            protectiveItem = protectiveItem.replace(re, `_`).toLowerCase(); //ersetzt Leerzeichen mit _

            var protectiveItemProtection: number = 0;
            var type: string = '';
            if (schubsConsumables.items[protectiveItem].protection != null) {
              type = 'items';
              protectiveItemProtection = schubsConsumables.items[protectiveItem].protection;
            } else if (schubsConsumables.legendaryItems[protectiveItem].protection != null) {
              schubsConsumables.legendaryItems[protectiveItem].protection;
              type = 'legendaryItems';
            } else {
              logger(`ERROR: protective item undefined: ${protectiveItem}`);
            }

            var defence: boolean;
            rndNumber < protectiveItemProtection ? (defence = true) : (defence = false);
            var banane: boolean;
            protectiveItem == 'banane' ? (banane = true) : (banane = false);

            if (!defence && banane) failedBanane = true;

            if (defence) {
              // ----- Verteidigung erfolgreich -----

              if (type == 'items') {
                chatClient.say(
                  channel,
                  `@${targetName} schützt sich erfolgreich mit ${schubsConsumables.items[protectiveItem].artikel} ${schubsConsumables.items[protectiveItem].name}.`
                );
              } else if (type == 'legendaryItems') {
                chatClient.say(
                  channel,
                  `@${targetName} schützt sich erfolgreich mit ${schubsConsumables.legendaryItems[protectiveItem].artikel} ${schubsConsumables.legendaryItems[protectiveItem].name}.`
                );
              } else {
                logger(`error: defence item unkown: ${protectiveItem}`);
              }
              //--------------------------------Designer Tasche--------------------------------
              if (protectiveItem == 'gefälschte_designer_tasche') {
                chatClient.say(
                  channel,
                  `Die gefälschte Designer Tasche zerbröselt in @${user}'s Fingern. Was ein Müll!`
                );
                schubsListe.rucksackmonster.list.gefälschte_designer_tasche.available = true;
              }
              //--------------------------------UNO Karte--------------------------------
              else if (protectiveItem == 'abgenutzte_uno_karte') {
                chatClient.say(
                  channel,
                  `Oh Nein! Die abgenutzte UNO Karte von @${targetName} beginnt zu leuchten und klaut einen Rucksack von @${user}!`
                );

                const inventorySizeUser: number = schubsListe.index[userId].inventar.length;
                if (inventorySizeUser > 0) {
                  //hat min. einen Rucksack zum verlieren
                  const lostBackpack: number = getRandomInt(0, inventorySizeUser); //wählt zufälligen Rucksack aus
                  const lostBackpackName: string = schubsListe.index[userId].inventar[lostBackpack];
                  schubsListe.index[targetId].inventar.push(lostBackpackName); //Überträgt Rucksack

                  schubsListe.index[userId].inventar.splice(lostBackpack, 1); //entfernt Rucksack aus dem Inventar des Opfers
                  const lostBackpackHelix = await apiClient.users.getUserByName(lostBackpackName);
                  const lostBackpackId: string | undefined = lostBackpackHelix?.id;
                  schubsListe.index[lostBackpackId!].ownId = targetId; //vermerkt Rucksackort

                  // -------- Highscore/Achievements --------
                  highscoreIDs.push(userId, targetId);
                  achievementsFunction(targetId, targetName, 'Grosshändler:in', chatClient, schubsListe);

                  chatClient.say(
                    channel,
                    `@${targetName} erhält den Rucksack von ${lostBackpackName}. Die UNO Karte zerbröselt.`
                  );
                  logger('UNOSuccess');
                } else {
                  //Inventar leer
                  chatClient.say(channel, `@${user} hat keine Rucksäcke... Die UNO Karte zerbröselt.`);
                  logger('UNOfail');
                }
                schubsListe.rucksackmonster.list.abgenutzte_uno_karte.available = true;
              }
              //--------------------------------Banane--------------------------------
              else if (protectiveItem == 'banane') {
                const inventorySizeUser: number = schubsListe.index[userId].inventar.length;
                if (inventorySizeUser > 0) {
                  //hat min. einen Rucksack zum verlieren
                  const lostBackpack: number = getRandomInt(0, inventorySizeUser); //wählt zufälligen Rucksack aus
                  const lostBackpackName: string = schubsListe.index[userId].inventar[lostBackpack];
                  schubsListe.floor.push(lostBackpackName); //Schmeisst Rucksack auf den Boden
                  schubsListe.index[userId].inventar.splice(lostBackpack, 1); //entfernt Rucksack aus dem Inventar des Opfers
                  const lostBackpackHelix = await apiClient.users.getUserByName(lostBackpackName);
                  const lostBackpackId: string | undefined = lostBackpackHelix?.id;
                  schubsListe.index[lostBackpackId!].ownId = 'floor'; //vermerkt Rucksackort

                  // -------- Highscore/Achievements --------
                  highscoreIDs.push(userId);
                  achievementsFunction(targetId, targetName, 'Affenkönig:in', chatClient, schubsListe);

                  chatClient.say(
                    channel,
                    `@${user} rutscht auf der Bananenschale aus und verliert den Rucksack von ${lostBackpackName}.`
                  );
                  logger(`schubsenBanane`);
                } else {
                  // -------- Highscore/Achievements --------
                  achievementsFunction(targetId, targetName, 'Affenkönig:in', chatClient, schubsListe);

                  chatClient.say(
                    channel,
                    `@${user} rutscht auf der Bananenschale aber hat keinen Rucksack zum Verlieren.`
                  );
                  logger(`schubsenBanane`);
                }
              }
              //--------------------------------Joghurt--------------------------------
              else if (schubsListe.index[targetId].defensiveItems[0] == 'joghurt') {
                //no action needed
              }
              //--------------------------------Bueno--------------------------------
              else if (schubsListe.index[targetId].defensiveItems[0] == 'bueno') {
                //no action needed
              }
              schubsListe.index[targetId].defensiveItems.shift(); // löscht erstes Item
              if (type == 'items') {
                schubsListe.index[targetId].ownedItems[protectiveItem] -= 1;
              }
            } else {
              schubsListe.index[targetId].defensiveItems.shift(); // löscht erstes Item
              if (type == 'items') {
                schubsListe.index[targetId].ownedItems[protectiveItem] -= 1;
              }
              failedDefence = true;
            }
          }

          if (!defenciveItem || failedDefence) {
            //----- keine Verteidigung -----
            //--------------------- Banane --------------------
            if (failedBanane) {
              const inventorySizeTarget: number = schubsListe.index[targetId].inventar.length;
              if (inventorySizeTarget > 0) {
                //hat min. einen Rucksack zum verlieren
                const lostBackpack: number = getRandomInt(0, inventorySizeTarget); //wählt zufälligen Rucksack aus
                const lostBackpackName: string = schubsListe.index[targetId].inventar[lostBackpack];
                schubsListe.floor.push(lostBackpackName); //Schmeisst Rucksack auf den Boden
                schubsListe.index[targetId].inventar.splice(lostBackpack, 1); //entfernt Rucksack aus dem Inventar des Opfers
                const lostBackpackHelix = await apiClient.users.getUserByName(lostBackpackName);
                const lostBackpackId: string | undefined = lostBackpackHelix?.id;
                schubsListe.index[lostBackpackId!].ownId = 'floor'; //vermerkt Rucksackort

                // -------- Highscore/Achievements --------
                highscoreIDs.push(targetId);
                achievementsFunction(targetId, targetName, 'Bananen Slider', chatClient, schubsListe);

                chatClient.say(
                  channel,
                  `@${target} rutscht auf der eigenen Bananenschale aus und verliert den Rucksack von ${lostBackpackName}.`
                );
                logger(`schubsenBananeOwn`);
              } else {
                // -------- Highscore/Achievements --------
                achievementsFunction(targetId, targetName, 'Bananen Slider', chatClient, schubsListe);

                chatClient.say(
                  channel,
                  `@${target} rutscht auf der eigenen Bananenschale aber hat keinen Rucksack zum Verlieren.`
                );
                logger(`schubsenBananeOwn`);
              }
            }

            var rndNumber: number = Math.random();
            var domino: boolean;
            rndNumber > probDomino ? (domino = false) : (domino = true); //würfelt, ob Domino Erfolg hat
            if (domino) {
              //Domino findet statt
              var dominoLength: number = getRandomInt(dominoMinLength, dominoMaxLength); //Länge der Dominoreihe
              if (dominoLength > viewers.length) {
                dominoLength = viewers.length;
              } //falls wenig Zuschauer
              var dominoMembers: number[] = [];
              dominoMembers[0] = viewers.indexOf(targetName);
              while (dominoMembers.length < dominoLength) {
                //wählt zufällige Opfer
                var r = Math.floor(Math.random() * (viewers.length - 1));
                if (dominoMembers.indexOf(r) === -1) dominoMembers.push(r);
              }

              var backpackDropCount: number = 0;
              var dominoMemberNames: string[] = [];
              for (var i: number = 0; i < dominoLength; i++) {
                const targetNameDomino: string = viewers[dominoMembers[i]];

                const targetHelixDomino = await apiClient.users.getUserByName(targetNameDomino);
                const targetIdDomino = targetHelixDomino?.id!;

                if (schubsListe.index[targetIdDomino] == null) {
                  //fügt neuen Chatter ein
                  await addBackpack(targetIdDomino);
                }

                const inventorySizeVictim: number = schubsListe.index[targetIdDomino].inventar.length;
                if (inventorySizeVictim > 0) {
                  //hat min. einen Rucksack zum verlieren
                  const lostBackpack: number = getRandomInt(0, inventorySizeVictim); //wählt zufälligen Rucksack aus
                  const lostBackpackName: string = schubsListe.index[targetIdDomino].inventar[lostBackpack];
                  schubsListe.floor.push(lostBackpackName); //Schmeisst gewählten Rucksack auf den Boden
                  schubsListe.index[targetIdDomino].inventar.splice(lostBackpack, 1); //entfernt Rucksack aus dem Inventar des Opfers
                  const lostBackpackHelix = await apiClient.users.getUserByName(lostBackpackName);
                  const lostBackpackId: string | undefined = lostBackpackHelix?.id;
                  schubsListe.index[lostBackpackId!].ownId = 'floor'; //vermerkt Rucksackort

                  // -------- Highscore/Achievements --------
                  highscoreIDs.push(targetIdDomino);

                  dominoMemberNames.push(targetNameDomino);
                  backpackDropCount += 1;
                } else {
                  //Inventar leer
                  dominoMemberNames.push(targetNameDomino);
                }
              }

              var dominoMembersOutput: string = '';

              for (var i = 0; i < dominoMemberNames.length; i++) {
                if (i == 0) {
                  dominoMembersOutput = dominoMembersOutput.concat('@', dominoMemberNames[i]);
                } else if (i == dominoMemberNames.length - 1) {
                  dominoMembersOutput = dominoMembersOutput.concat(' und @', dominoMemberNames[i]);
                } else {
                  dominoMembersOutput = dominoMembersOutput.concat(', @', dominoMemberNames[i]);
                }
              }

              if (backpackDropCount == 0) {
                chatClient.say(
                  channel,
                  `Dominoschubsen! ${dominoMembersOutput} werden geschubst. Kein Rucksack fällt auf den Boden.`
                );
              } else if (backpackDropCount == 1) {
                chatClient.say(
                  channel,
                  `Dominoschubsen! ${dominoMembersOutput} werden geschubst. ${backpackDropCount} Rucksack fällt auf den Boden.`
                );
              } else {
                chatClient.say(
                  channel,
                  `Dominoschubsen! ${dominoMembersOutput} werden geschubst. ${backpackDropCount} Rucksäcke fallen auf den Boden.`
                );
              }
              logger('schubsenDomino');
            } else {
              //kein Domino
              const inventorySizeVictim: number = schubsListe.index[targetId].inventar.length;
              if (inventorySizeVictim > 0) {
                //hat min. einen Rucksack zum verlieren
                const lostBackpack: number = getRandomInt(0, inventorySizeVictim); //wählt zufälligen Rucksack aus
                const lostBackpackName: string = schubsListe.index[targetId].inventar[lostBackpack];
                schubsListe.index[userId].inventar.push(lostBackpackName); //Überträgt Rucksack

                schubsListe.index[targetId].inventar.splice(lostBackpack, 1); //entfernt Rucksack aus dem Inventar des Opfers
                const lostBackpackHelix = await apiClient.users.getUserByName(lostBackpackName);
                const lostBackpackId: string | undefined = lostBackpackHelix?.id;
                schubsListe.index[lostBackpackId!].ownId = userId; //vermerkt Rucksackort
                chatClient.say(
                  channel,
                  `@${user} schubst @${targetName} und klaut den Rucksack von ${lostBackpackName}.`
                );

                // -------- Highscore/Achievements --------
                highscoreIDs.push(userId, targetId);
                achievementsFunction(userId, user, 'Grosshändler:in', chatClient, schubsListe);

                logger('schubsenSuccess');
              } else {
                //Inventar leer
                chatClient.say(
                  channel,
                  `@${user} schubst @${targetName}, aber @${targetName} hat keine Rucksäcke zum Klauen.`
                );
                logger('schubsenSuccess');
              }
            }
          }
        } else {
          //Schubsen fehlgeschlagen
          const inventorySize: number = schubsListe.index[userId].inventar.length;
          if (inventorySize > 0) {
            //hat min. einen Rucksack zum verlieren
            const lostBackpack: number = getRandomInt(0, inventorySize); //wählt zufälligen Rucksack aus
            const lostBackpackName: string = schubsListe.index[userId].inventar[lostBackpack];
            schubsListe.floor.push(lostBackpackName); //Schmeisst gewählten Rucksack auf den Boden
            schubsListe.index[userId].inventar.splice(lostBackpack, 1); //entfernt Rucksack aus dem Inventar
            const lostBackpackHelix = await apiClient.users.getUserByName(lostBackpackName);
            const lostBackpackId: string | undefined = lostBackpackHelix?.id;
            schubsListe.index[lostBackpackId!].ownId = 'floor'; //vermerkt Rucksackort

            highscoreIDs.push(userId);

            logger('writeFile ./JSON/schubsen/schubsListe.json');
            await fs.promises.writeFile(
              './JSON/schubsen/schubsListe.json',
              JSON.stringify(schubsListe, null, 4),
              'utf8'
            );
            chatClient.say(
              channel,
              `Du noob! @${user} stolpert und verfehlt @${targetName}. @${user} verliert den Rucksack von @${lostBackpackName}.`
            );
            logger('schubsenFail');
          } else {
            //Inventar leer
            chatClient.say(
              channel,
              `Du noob! @${user} stolpert und verfehlt @${targetName}. @${user} hat keine Rucksäcke zum Verlieren.`
            );
            logger('schubsenFail');
          }
        }
      } else {
        chatClient.say(channel, `Dein Schubsopfer ist momentan nicht da...`);
        logger('schubsenAway');
      }
      logger('writeFile ./JSON/schubsen/schubsListe.json');
      await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');
    } else {
      const cooldownLeft: number = Math.floor((cooldown - (now - schubsListe.index[userId].cooldownSchubsen)) / 1000);
      chatClient.say(channel, `@${user} du kannst in ${cooldownLeft} Sekunden wieder schubsen.`);
      logger('schubsenTimeout');
    }
    highscore(highscoreIDs, chatClient, schubsListe);
  });

  //!sammeln
  commandHandler.addCommand('sammeln', false, 0, 0, async ({ user, msg }) => {
    const userId: string = msg.userInfo.userId!;
    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }

    var highscoreIDs: string[] = [];

    const cooldown: number = 5000;
    var onCooldown: boolean;
    const now: number = Date.now();
    schubsListe.index[userId].cooldownSammeln + cooldown < now ? (onCooldown = false) : (onCooldown = true);
    if (!onCooldown) {
      schubsListe.index[userId].cooldownSammeln = now; //setzt neuen Cooldown
      logger('writeFile sammeln ./JSON/schubsen/schubsListe.json');
      await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');
      if (ölkanne) {
        var rndNumber: number = Math.random();
        if (rndNumber < schubsConsumables.items.ölkanne.effectiveness) {
          //rutscht aus
          const inventorySizeUser: number = schubsListe.index[userId].inventar.length;
          if (inventorySizeUser > 0) {
            //hat min. einen Rucksack zum verlieren
            const lostBackpack: number = getRandomInt(0, inventorySizeUser); //wählt zufälligen Rucksack aus
            const lostBackpackName: string = schubsListe.index[userId].inventar[lostBackpack];
            schubsListe.floor.push(lostBackpackName); //Schmeisst Rucksack auf den Boden
            schubsListe.index[userId].inventar.splice(lostBackpack, 1); //entfernt Rucksack aus dem Inventar des Opfers
            const lostBackpackHelix = await apiClient.users.getUserByName(lostBackpackName);
            const lostBackpackId: string | undefined = lostBackpackHelix?.id;
            schubsListe.index[lostBackpackId!].ownId = 'floor'; //vermerkt Rucksackort

            // -------- Highscore/Achievements --------
            highscoreIDs.push(userId);

            chatClient.say(
              channel,
              `@${user} rutscht auf der Öllache aus und verliert den Rucksack von ${lostBackpackName}.`
            );
          } else {
            chatClient.say(channel, `@${user} rutscht auf der Öllache aus, aber hat keinen Rucksack zum Verlieren.`);
          }
          logger('writeFile ./JSON/schubsen/schubsListe.json');
          await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');
          highscore(highscoreIDs, chatClient, schubsListe);
          logger(`sammelnÖl`);
          return;
        }
      }
      const floorSize: number = schubsListe.floor.length;
      if (floorSize != 0) {
        const inventorySize: number = schubsListe.index[userId].inventar.length;
        const backpackName: string = schubsListe.floor[floorSize - 1];
        schubsListe.index[userId].inventar[inventorySize] = schubsListe.floor[floorSize - 1]; //Gibt User den letzten Rucksack vom Boden

        // -------- Highscore/Achievements --------
        highscoreIDs.push(userId);
        achievementsFunction(userId, user, 'Grosshändler:in', chatClient, schubsListe);

        schubsListe.floor.pop(); //entfernt den letzten Rucksack vom Boden

        const backpackHelix = await apiClient.users.getUserByName(backpackName);
        const backpackId = backpackHelix?.id;
        schubsListe.index[backpackId!].ownId = userId; //vermerkt neuen Standort

        logger('writeFile ./JSON/schubsen/schubsListe.json');
        await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');
        chatClient.say(channel, `@${user} hebt den Rucksack von @${backpackName} auf.`);
        logger('sammeln');
      } else {
        chatClient.say(channel, `Aber es liegt doch gar nichts auf dem Boden...`);
        logger('sammelnLeer');
      }
    } else {
      const cooldownLeft: number = Math.floor((cooldown - (now - schubsListe.index[userId].cooldownSammeln)) / 1000);
      chatClient.say(channel, `@${user} du kannst in ${cooldownLeft} Sekunden wieder sammeln.`);
      logger('sammelnTimeout');
    }
    highscore(highscoreIDs, chatClient, schubsListe);
  });

  //!benutzen
  commandHandler.addCommand('benutzen', false, 0, 0, async ({ args, user, msg }) => {
    const userId: string = msg.userInfo.userId!;
    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }

    var query: string = '';
    var target: boolean = false;
    var targetName: string = '';
    for (var i: number = 0; i < args.length; i++) {
      if (args[i].startsWith('@')) {
        target = true;
        targetName = args[i].substring(1).toLowerCase();
        break;
      } else if (i == 0) {
        query = query.concat(args[i].toLowerCase());
      } else {
        query = query.concat('_', args[i].toLowerCase());
      }
    }

    switch (query) {
      case 'rucksackfinder':
        if (!schubsListe.index[userId].passiveItems.includes('Rucksackfinder')) {
          chatClient.say(channel, `@${user} du besitzt leider keinen Rucksackfinder...`);
          logger(`benutzen: doesntOwn ${query}`);
          return;
        }
        if (schubsListe.index[userId].ownedRucksackfinder != 0) {
          const ownerId: string = schubsListe.index[userId].ownId;
          if (ownerId === 'floor') {
            chatClient.say(channel, `Dein Rucksack liegt derzeit auf dem Boden. Schnapp ihn dir!`);
            logger('benutzen: Rucksackfinder');
          } else {
            const ownerHelix = await apiClient.users.getUserById(ownerId);
            const ownerName = ownerHelix?.name;

            chatClient.say(channel, `Dein Rucksack befindet sich derzeit bei @${ownerName}`);
          }
          schubsListe.index[userId].ownedItems[query] -= 1; //verbraucht Finder
          const index: number = schubsListe.index[userId].passiveItems.indexOf('Rucksackfinder');
          schubsListe.index[userId].passiveItems.splice(index, 1); //entfernt Finder aus Items
          logger('writeFile ./JSON/schubsen/schubsListe.json');
          await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');
        } else {
          chatClient.say(channel, `@${user} du hast derzeit keinen Rucksackfinder...`);
        }
        logger(`benutzen: ${query}`);
        break;
      case 'ölkanne':
        if (!schubsListe.index[userId].offensiveItems.includes('Ölkanne')) {
          chatClient.say(channel, `@${user} du besitzt leider keine Ölkanne...`);
          logger(`benutzen: doesntOwn ${query}`);
          return;
        }
        if (ölkanne) {
          chatClient.say(channel, `Der Boden ist schon voller Öl.`);
          break;
        }
        ölkanne = true;
        schubsListe.index[userId].ownedItems[query] -= 1; //verbraucht Ölkanne
        const index: number = schubsListe.index[userId].offensiveItems.indexOf('Ölkanne');
        schubsListe.index[userId].offensiveItems.splice(index, 1); //entfernt Ölkanne aus Items

        // -------- Highscore/Achievements --------
        achievementsFunction(userId, user, 'Ölbaron:ess', chatClient, schubsListe);

        chatClient.say(channel, `@${user} verschüttet eine Kanne Öl auf dem Boden. Alles ist glitschig.`);
        setTimeout(function () {
          ölkanne = false;
          chatClient.say(
            channel,
            `Das Öl versickert im Boden. Schubser:innen haben wieder festen Halt unter den Füssen.`
          );
          logger(`Öl Ende`);
        }, schubsConsumables.items.ölkanne.duration * 60 * 1000); //120 Minuten
        break;
      case 'wildgewordene_katze':
        if (!schubsListe.index[userId].offensiveItems.includes('wildgewordene Katze')) {
          chatClient.say(channel, `@${user} du besitzt leider keine wildgewordene Katze...`);
          logger(`benutzen: doesntOwn ${query}`);
          return;
        }
        if (!target) {
          chatClient.say(channel, `@${user} bitte gib ein Opfer an. (!benutzen wildgewordene Katze @[name])`);
          logger('benutzen: noTarget');
          return;
        }
        var viewers: string[] = (await apiClient.unsupported.getChatters(channel)).allChatters;

        var targetHelix = await apiClient.users.getUserByName(targetName);
        var targetId = targetHelix?.id!;
        if (schubsListe.index[targetId] == null) {
          //fügt neuen Chatter ein
          await addBackpack(targetId);
        }
        if (unschubsbar.includes(targetName)) {
          // User schubst Bot
          chatClient.say(
            channel,
            `@${targetName} ist ein Bot und spielt nicht mit. Deine Katze kommt enttäuscht zurück.`
          );
          logger('benutzen: Bot');
        } else if (viewers.includes(targetName)) {
          if (schubsListe.index[targetId].inventar.length == 0) {
            chatClient.say(channel, `@${user} dein Ziel hat keine Rucksäcke... Deine Katze kommt enttäuscht zurück.`);
            logger('benutzen: Katze, noBackpacks');
            return;
          }
          var droppedBackpackCount: number = 3;
          if (schubsListe.index[targetId].inventar.length < droppedBackpackCount)
            droppedBackpackCount = schubsListe.index[targetId].inventar.length;
          var backpackDropped: string[] = [];
          var highscoreIDs: string[] = [];

          for (var i: number = 0; i < droppedBackpackCount; i++) {
            const backpackDropIndex: number = Math.floor(Math.random() * schubsListe.index[targetId].inventar.length);
            backpackDropped[i] = schubsListe.index[targetId].inventar[backpackDropIndex];
            schubsListe.index[targetId].inventar.splice(backpackDropIndex, 1); //entfernt Rucksack
            schubsListe.floor.push(backpackDropped[i]); //schmeisst Rucksack auf den Boden

            const backpackHelix = await apiClient.users.getUserByName(backpackDropped[i]);
            const backpackId = backpackHelix?.id!;
            schubsListe.index[backpackId].ownId = 'floor'; //vermerkt neuen Rucksackort

            // -------- Highscore/Achievements --------
            highscoreIDs.push(targetId);
          }

          var itemIndex: number = schubsListe.index[userId].offensiveItems.indexOf('wildgewordene Katze');
          schubsListe.index[userId].offensiveItems.splice(itemIndex, 1); //entfernt die Katze
          schubsListe.rucksackmonster.list[query].available = true; //schmeisst Katze zurück in den Lootpool

          highscore(highscoreIDs, chatClient, schubsListe);

          logger('writeFile ./JSON/schubsen/schubsListe.json');
          await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');

          var output: string = '';
          switch (droppedBackpackCount) {
            case 1:
              output = output.concat(backpackDropped[0]);
              break;
            case 2:
              output = output.concat(backpackDropped[0], ' und ', backpackDropped[1]);
              break;
            case 3:
              output = output.concat(backpackDropped[0], ', ', backpackDropped[1], ' und ', backpackDropped[2]);
              break;
          }

          chatClient.say(
            channel,
            `Die wildgewordene Katze springt @${targetName} an. @${targetName} lässt die Rucksäcke von ${output} fallen. Die Katze zieht beleidigt von dannen.`
          );
          logger('benutzen: Katze');
        }
        break;
      case 'adressbuch':
        if (!schubsListe.index[userId].passiveItems.includes('Adressbuch')) {
          chatClient.say(channel, `@${user} du besitzt leider kein Adressbuch...`);
          logger(`benutzen: doesntOwn ${query}`);
          return;
        }
        if (!target) {
          chatClient.say(channel, `@${user} bitte gib ein Opfer an. (!benutzen Adressbuch @[name])`);
          logger('benutzen: noTarget');
          return;
        }
        var viewers: string[] = (await apiClient.unsupported.getChatters(channel)).allChatters;

        var targetHelix = await apiClient.users.getUserByName(targetName);
        var targetId = targetHelix?.id!;
        if (schubsListe.index[targetId] == null) {
          //fügt neuen Chatter ein
          await addBackpack(targetId);
        }
        if (unschubsbar.includes(targetName)) {
          // User schubst Bot
          chatClient.say(
            channel,
            `@${targetName} ist ein Bot und spielt nicht mit. Du klappst das Adressbuch wieder zu.`
          );
          logger('benutzen: Bot');
          return;
        }

        var backpackLocationId: string = schubsListe.index[targetId].ownId;
        var output: string = '';
        if (backpackLocationId == 'floor') {
          output = 'auf dem Boden';
        } else {
          const ownerHelix = await apiClient.users.getUserById(backpackLocationId);
          const backpackLocationName = ownerHelix?.name;
          output = output.concat('bei @', backpackLocationName!);
        }
        chatClient.say(
          channel,
          `Der Rucksack von @${targetName} befindet sich ${output}. Das Adressbuch zerfällt zu Asche.`
        );
        logger('benutzen: Adressbuch');

        var itemIndex: number = schubsListe.index[userId].passiveItems.indexOf('Adressbuch');
        schubsListe.index[userId].passiveItems.splice(itemIndex, 1); //entfernt das Adressbuch
        schubsListe.rucksackmonster.list[query].available = true; //schmeisst Adressbuch zurück in den Lootpool

        logger('writeFile ./JSON/schubsen/schubsListe.json');
        await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');
        break;
      case 'kanne_schwarztee':
        if (!schubsListe.index[userId].passiveItems.includes('Kanne Schwarztee')) {
          chatClient.say(channel, `@${user} du besitzt leider keine Kanne Schwarztee...`);
          logger(`benutzen: doesntOwn ${query}`);
          return;
        }
        schubsListe.index[userId].cooldownSchubsen = 1234;
        chatClient.say(
          channel,
          `@${user} trinkt die ganze Kanne Schwarztee in einem Zug. Der Schubscooldown wurde zurückgesetzt. Fröhliches Schubsen!`
        );
        logger('benutzen: Kanne Schwarztee');

        var itemIndex: number = schubsListe.index[userId].passiveItems.indexOf('Kanne Schwarztee');
        schubsListe.index[userId].passiveItems.splice(itemIndex, 1); //entfernt die Kanne Schwarztee
        schubsListe.rucksackmonster.list[query].available = true; //schmeisst die Kanne Schwarztee zurück in den Lootpool

        break;
      case 'brustgurt':
        if (!schubsListe.index[userId].passiveItems.includes('Brustgurt')) {
          chatClient.say(channel, `@${user} du besitzt leider keinen Brustgurt...`);
          logger(`benutzen: doesntOwn ${query}`);
          return;
        }
        if (!target) {
          chatClient.say(
            channel,
            `@${user} bitte gib einen Rucksack zum festschnallen an. (!benutzen Brustgurt @[name])`
          );
          logger('benutzen: noTarget');
          return;
        }
        var targetHelix = await apiClient.users.getUserByName(targetName);
        var targetId = targetHelix?.id!;
        if (!schubsListe.index[userId].inventar.includes(targetName)) {
          chatClient.say(
            channel,
            `@${user} du scheinst den Rucksack von @${targetName} nicht zu besitzen. Versuche es erneut mit einem deiner !rucksäcke.`
          );
          console.log('benutzen: brustgurtUngültig');
          return;
        }

        var targetIndex: number = schubsListe.index[userId].inventar.indexOf(targetName);
        schubsListe.index[userId].inventar.splice(targetIndex, 1); //entfernt Rucksack aus dem Inventar
        schubsListe.index[userId].safe.push(targetName); //fügt ihn bei "safe" ein.

        chatClient.say(channel, `@${user} du hast erfolgreich den Rucksack von ${targetName} festgeschnallt.`);

        var itemIndex: number = schubsListe.index[userId].passiveItems.indexOf('Brustgurt');
        schubsListe.index[userId].passiveItems.splice(itemIndex, 1); //entfernt den Brustgurt
        schubsListe.rucksackmonster.list[query].available = true; //schmeisst den Brustgurt zurück in den Lootpool

        logger('writeFile ./JSON/schubsen/schubsListe.json');
        await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');
        break;
      default:
        chatClient.say(
          channel,
          `@${user} du kannst das leider nicht benutzen. versuche es mit "Rucksackfinder", "Ölkanne", oder einem der legendären Gegenstände.`
        );
        break;
    }
  });

  //!rucksack
  commandHandler.addCommand(['rucksack', 'rucksäcke'], false, 0, 0, async ({ user, msg }) => {
    const userId: string = msg.userInfo.userId!;
    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }

    const inventorySize: number = schubsListe.index[userId].inventar.length + schubsListe.index[userId].safe.length;

    if (inventorySize != 0) {
      var inventoryOutput: string = '';
      const inventar: string[] = schubsListe.index[userId].inventar.concat(schubsListe.index[userId].safe);
      for (var i = 0; i < inventorySize; i++) {
        if (i == 0) {
          inventoryOutput = inventoryOutput.concat('@', inventar[i]);
        } else if (i == inventorySize - 1) {
          inventoryOutput = inventoryOutput.concat(' und @', inventar[i]);
        } else {
          inventoryOutput = inventoryOutput.concat(', @', inventar[i]);
        }
      }
      if (inventorySize == 1) {
        chatClient.say(channel, `@${user}, du hast derzeit den Rucksack von ${inventoryOutput}.`);
      } else {
        multiSay(channel, chatClient, ',', `@${user}, du hast derzeit die Rucksäcke von ${inventoryOutput}.`);
      }
      logger('rucksack');
    } else {
      chatClient.say(channel, `Du hast derzeit keine Rucksäcke.`);
      logger('rucksackLeer');
    }
  });

  //!inventar
  commandHandler.addCommand('inventar', false, 0, 0, async ({ user, msg }) => {
    const userId: string = msg.userInfo.userId!;
    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }

    var defensiveItems: string = '';
    var offensiveItems: string = '';
    var passiveItems: string = '';

    var itemNumber: number =
      schubsListe.index[userId].defensiveItems.length +
      schubsListe.index[userId].offensiveItems.length +
      schubsListe.index[userId].passiveItems.length;
    var itemIndex: number = 1;

    if (itemNumber == 1) {
      if (schubsListe.index[userId].defensiveItems.length != 0) {
        defensiveItems = defensiveItems.concat(schubsListe.index[userId].defensiveItems[0], '.');
      } else if (schubsListe.index[userId].offensiveItems.length != 0) {
        offensiveItems = offensiveItems.concat(schubsListe.index[userId].offensiveItems[0], '.');
      } else if (schubsListe.index[userId].passiveItems.length != 0) {
        passiveItems = passiveItems.concat(schubsListe.index[userId].passiveItems[0], '.');
      }
    } else {
      if (schubsListe.index[userId].defensiveItems.length != 0) {
        for (var i: number = 0; i < schubsListe.index[userId].defensiveItems.length; i++) {
          if (itemIndex == 1) {
            defensiveItems = defensiveItems.concat(schubsListe.index[userId].defensiveItems[i]);
          } else if (itemIndex == itemNumber) {
            defensiveItems = defensiveItems.concat(' und ', schubsListe.index[userId].defensiveItems[i], '.');
          } else {
            defensiveItems = defensiveItems.concat(', ', schubsListe.index[userId].defensiveItems[i]);
          }
          itemIndex += 1;
        }
      }
      if (schubsListe.index[userId].offensiveItems.length != 0) {
        for (var i: number = 0; i < schubsListe.index[userId].offensiveItems.length; i++) {
          if (itemIndex == 1) {
            offensiveItems = offensiveItems.concat(schubsListe.index[userId].offensiveItems[i]);
          } else if (itemIndex == itemNumber) {
            offensiveItems = offensiveItems.concat(' und ', schubsListe.index[userId].offensiveItems[i], '.');
          } else {
            offensiveItems = offensiveItems.concat(', ', schubsListe.index[userId].offensiveItems[i]);
          }
          itemIndex += 1;
        }
      }
      if (schubsListe.index[userId].passiveItems.length != 0) {
        for (var i: number = 0; i < schubsListe.index[userId].passiveItems.length; i++) {
          if (itemIndex == 1) {
            passiveItems = passiveItems.concat(schubsListe.index[userId].passiveItems[i]);
          } else if (itemIndex == itemNumber) {
            passiveItems = passiveItems.concat(' und ', schubsListe.index[userId].passiveItems[i], '.');
          } else {
            passiveItems = passiveItems.concat(', ', schubsListe.index[userId].passiveItems[i]);
          }
          itemIndex += 1;
        }
      }
    }

    var outputItems: string = '';
    outputItems = outputItems.concat(defensiveItems, offensiveItems, passiveItems);

    if (itemNumber == 0) {
      chatClient.say(channel, `@${user} in deinem Inventar befindet sich derzeit nichts...`);
    } else if (itemNumber == 1) {
      chatClient.say(
        channel,
        `@${user} in deinem Inventar befindet sich: ${outputItems} Infos zu deinem Item mit !info [Item Name].`
      );
    } else {
      chatClient.say(
        channel,
        `@${user} in deinem Inventar befinden sich: ${outputItems} Infos zu deinen Items mit !info [Item Name].`
      );
    }

    logger('inventar');
  });

  //!geld
  commandHandler.addCommand('geld', true, 0, 0, async ({ user, msg }) => {
    const userId: string = msg.userInfo.userId!;
    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }
    var today: Date | string = new Date();
    today.setHours(0, 0, 0, 0);
    today = today.toString();

    if (schubsListe.index[userId].timestamp == today) {
      //Hat heute schon gesammelt
      const money: number = schubsListe.index[userId].money;
      chatClient.say(channel, `@${user} du hast derzeit €${money}.- Du kannst morgen mehr sammeln!`);
      logger('geldStatus');
    } else {
      //hat heute noch nicht gesammelt
      var yesterday: Date | string = new Date();
      yesterday.setHours(0, 0, 0, 0);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday = yesterday.toString();

      if (schubsListe.index[userId].timestamp == yesterday) {
        //hat zuletzt gestern gesammelt
        schubsListe.index[userId].consecutiveDays += 1;
        var consecutiveDays: number = schubsListe.index[userId].consecutiveDays;
        if (consecutiveDays > 5) {
          consecutiveDays = 5;
        }
        const moneyAdd: number = schubsConsumables.money[consecutiveDays - 1];
        if (schubsListe.index[userId].money + moneyAdd > 500) {
          //würde über 500 gehen
          schubsListe.index[userId].money = 500;
          chatClient.say(
            channel,
            `Maximaler Geldbetrag erreicht. @${user} hat €500.- Tage in Folge: ${schubsListe.index[userId].consecutiveDays}.`
          );
          logger('geldMax');
        } else {
          schubsListe.index[userId].money = schubsListe.index[userId].money + moneyAdd;
          chatClient.say(
            channel,
            `@${user} hat €${moneyAdd} gesammelt für ein Total von €${schubsListe.index[userId].money}. Tage in Folge: ${schubsListe.index[userId].consecutiveDays}.`
          );
          logger('geld');
        }
      } else {
        //hat gestern nicht gesammelt
        schubsListe.index[userId].consecutiveDays = 1;
        const moneyAdd: number = schubsConsumables.money[0];
        if (schubsListe.index[userId].money + moneyAdd > 500) {
          //würde über 500 gehen
          schubsListe.index[userId].money = 500;
          chatClient.say(channel, `Maximaler Geldbetrag erreicht. @${user} hat €500.-`);
          logger('geldMax');
        } else {
          schubsListe.index[userId].money = schubsListe.index[userId].money + moneyAdd;
          chatClient.say(
            channel,
            `@${user} hat €${moneyAdd} gesammelt für ein Total von €${schubsListe.index[userId].money}. Tage in Folge: ${schubsListe.index[userId].consecutiveDays}.`
          );
          logger('geld');
        }
      }
      schubsListe.index[userId].timestamp = today;
      logger('writeFile ./JSON/schubsen/schubsListe.json');
      await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');
    }
  });

  //!kaufen
  commandHandler.addCommand('kaufen', false, 0, 0, async ({ args, user, msg }) => {
    const userId: string = msg.userInfo.userId!;
    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }
    const itemInventoryCapacity: {
      [key: string]: any;
    } = {
      joghurt: 1,
      bueno: 2,
      banane: 1,
      ölkanne: 1,
      rucksackfinder: 1,
    };
    var query: string = args[0];
    if (args[0] != null) query = args[0].toLowerCase();
    if (schubsConsumables.items[query] == null) {
      //Gegenstand steht nicht zum Verkauf
      chatClient.say(
        channel,
        `Dieser Gegenstand ist leider nicht im Angebot @${user}. Versuche es mit "Joghurt", "Bueno", "Banane", "Ölkanne", oder "Rucksackfinder".`
      );
      logger(`kaufenFailed: ${query}`);
      return;
    }
    const price: number = schubsConsumables.items[query].price;
    const money: number = schubsListe.index[userId].money;

    if (price > money) {
      //kostet zu viel
      chatClient.say(
        channel,
        `@${user} du kannst dir das leider nicht leisten... Kosten ${args[0]}: €${schubsConsumables.items[query].price}. Dein Geld: €${money}.-`
      );
      logger('kaufenExpensive');
      return;
    } else {
      if (schubsListe.index[userId].ownedItems[query] >= itemInventoryCapacity[query]) {
        //Inventar voll
        chatClient.say(
          channel,
          `@${user} du hast bereits die maximale Menge dieses Gegenstandes in deinen Taschen. (Max: ${itemInventoryCapacity[query]})`
        );
        logger('kaufenInventoryFull');
        return;
      }
    }
    schubsListe.index[userId].money -= price;
    schubsListe.index[userId].ownedItems[query] += 1;
    const capitalizedQuery: string = capitalizeFirstLetter(query);
    switch (query) {
      case 'joghurt':
        //Joghurts vor Buenos
        if (schubsListe.index[userId].defensiveItems.length == 0) {
          //noch keine defensiven Items
          schubsListe.index[userId].defensiveItems.push(capitalizedQuery);
        } else {
          for (var i: number = 0; i < schubsListe.index[userId].defensiveItems.length; i++) {
            if (schubsListe.index[userId].defensiveItems[i] == 'Bueno' && i == 0) {
              schubsListe.index[userId].defensiveItems.unshift(capitalizedQuery);
              break;
            } else if (schubsListe.index[userId].defensiveItems[i] == 'Bueno') {
              const front: string[] = schubsListe.index[userId].defensiveItems.slice(0, i - 1);
              const end: string[] = schubsListe.index[userId].defensiveItems.slice(i);
              schubsListe.index[userId].defensiveItems = front.concat(capitalizedQuery, end);
              break;
            } else if (i == schubsListe.index[userId].defensiveItems.length - 1) {
              schubsListe.index[userId].defensiveItems.push(capitalizedQuery);
            }
          }
        }
        chatClient.say(
          channel,
          `@${user} hat einen Joghurt gekauft! Verbleibendes Geld: €${schubsListe.index[userId].money}.- Anzahl Joghurts: ${schubsListe.index[userId].ownedItems[query]}`
        );
        break;
      case 'bueno':
        //Buenos immer zuletzt
        schubsListe.index[userId].defensiveItems.push(capitalizedQuery);
        chatClient.say(
          channel,
          `@${user} hat ein Bueno gekauft! Verbleibendes Geld: €${schubsListe.index[userId].money}.- Anzahl Buenos: ${schubsListe.index[userId].ownedItems[query]}`
        );
        break;
      case 'banane':
        //Bananen vor Joghurts und Buenos
        if (schubsListe.index[userId].defensiveItems.length == 0) {
          //noch keine defensiven Items
          schubsListe.index[userId].defensiveItems.push(capitalizedQuery);
        } else {
          for (var i: number = 0; i < schubsListe.index[userId].defensiveItems.length; i++) {
            if (
              (schubsListe.index[userId].defensiveItems[i] == 'Bueno' && i == 0) ||
              (schubsListe.index[userId].defensiveItems[i] == 'Joghurt' && i == 0)
            ) {
              schubsListe.index[userId].defensiveItems.unshift(capitalizedQuery);
              break;
            } else if (
              schubsListe.index[userId].defensiveItems[i] == 'Bueno' ||
              schubsListe.index[userId].defensiveItems[i] == 'Joghurt'
            ) {
              const front: string[] = schubsListe.index[userId].defensiveItems.slice(0, i - 1);
              const end: string[] = schubsListe.index[userId].defensiveItems.slice(i);
              schubsListe.index[userId].defensiveItems = front.concat(capitalizedQuery, end);
              break;
            } else if (i == schubsListe.index[userId].defensiveItems.length - 1) {
              schubsListe.index[userId].defensiveItems.push(capitalizedQuery);
            }
          }
        }
        chatClient.say(
          channel,
          `@${user} hat eine Banane gekauft! Verbleibendes Geld: €${schubsListe.index[userId].money}.- Anzahl Bananen: ${schubsListe.index[userId].ownedItems[query]}`
        );
        break;
      case 'ölkanne':
        schubsListe.index[userId].offensiveItems.push(capitalizedQuery);
        chatClient.say(
          channel,
          `@${user} hat eine Ölkanne gekauft! Verbleibendes Geld: €${schubsListe.index[userId].money}.- Anzahl Ölkannen: ${schubsListe.index[userId].ownedItems[query]}`
        );
        break;
      case 'rucksackfinder':
        schubsListe.index[userId].passiveItems.push(capitalizedQuery);
        chatClient.say(
          channel,
          `@${user} hat einen Rucksackfinder gekauft! Verbleibendes Geld: €${schubsListe.index[userId].money}.- Anzahl Finder: ${schubsListe.index[userId].ownedItems[query]}`
        );
        break;
      default:
        logger(`kaufen error. invalid query: ${query}`);
        return;
    }

    logger('writeFile ./JSON/schubsen/schubsListe.json');
    await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');
    logger(`kaufen: ${query}`);
  });

  //!drop
  commandHandler.addCommand('drop', false, 0, 0, async ({ args, user, msg }) => {
    const userId: string = msg.userInfo.userId!;
    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }
    if (schubsListe.index[userId].inventar.length == 0 && schubsListe.index[userId].safe.length == 0) {
      chatClient.say(channel, `@${user} du hast leider keine !rucksäcke zum Fallen lassen.`);
      logger('dropEmpty');
      return;
    }

    var highscoreIDs: string[] = [];

    if (args.length == 0) {
      //drop random
      if (schubsListe.index[userId].inventar.length == 0) {
        chatClient.say(channel, `@${user} du hast leider keine ungesicherten !rucksäcke zum Fallen lassen.`);
        logger(`dropRnd, only safe`);
        return;
      }
      const inventorySize: number = schubsListe.index[userId].inventar.length;
      const droppedBackpack: string = schubsListe.index[userId].inventar[Math.floor(Math.random() * inventorySize)];

      const droppedbackpackIndex = schubsListe.index[userId].inventar.indexOf(droppedBackpack);
      schubsListe.index[userId].inventar.splice(droppedbackpackIndex, 1); //entfernt Rucksack aus Inventar
      schubsListe.floor.push(droppedBackpack); //schmeisst Rucksack auf den boden

      const droppedHelix = await apiClient.users.getUserByName(droppedBackpack);
      const droppedId: string = droppedHelix?.id!;

      schubsListe.index[droppedId].ownId = 'floor'; //vermerkt neuen Ort

      highscoreIDs.push(userId);

      chatClient.say(channel, `@${user} lässt den Rucksack von @${droppedBackpack} fallen.`);
      logger('dropRnd');
    } else if (args.length == 1) {
      //drop specific
      var target: string = args[0].toLowerCase();
      if (target.startsWith('@')) target = target.substring(1);
      if (!schubsListe.index[userId].inventar.includes(target) && !schubsListe.index[userId].safe.includes(target)) {
        //besitzt Rucksack nicht
        chatClient.say(channel, `@${user} du scheinst den Rucksack von ${target} nicht zu besitzen.`);
        logger('dropTargetError');
      } else {
        //besitzt Rucksack
        if (schubsListe.index[userId].safe.includes(target)) {
          const droppedbackpackIndex = schubsListe.index[userId].safe.indexOf(target);
          schubsListe.index[userId].safe.splice(droppedbackpackIndex, 1); //entfernt Rucksack aus Inventar
        } else {
          const droppedbackpackIndex = schubsListe.index[userId].inventar.indexOf(target);
          schubsListe.index[userId].inventar.splice(droppedbackpackIndex, 1); //entfernt Rucksack aus Inventar
        }

        schubsListe.floor.push(target); //schmeisst Rucksack auf den boden

        const droppedHelix = await apiClient.users.getUserByName(target);
        const droppedId: string = droppedHelix?.id!;

        schubsListe.index[droppedId].ownId = 'floor'; //vermerkt neuen Ort

        highscoreIDs.push(userId);

        chatClient.say(channel, `@${user} lässt den Rucksack von @${target} fallen.`);
        logger('dropSpecific');
      }
    } else {
      chatClient.say(channel, `@${user} bitte gib einen, oder keinen Namen nach !drop an.`);
      logger('dropArgsError');
    }
    logger('writeFile ./JSON/schubsen/schubsListe.json');
    await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');

    highscore(highscoreIDs, chatClient, schubsListe);
  });

  //!gift
  commandHandler.addCommand(['gift', 'schenken'], false, 0, 0, async ({ args, user, msg }) => {
    const userId: string = msg.userInfo.userId!;
    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }
    if (schubsListe.index[userId].inventar.length == 0 && schubsListe.index[userId].safe.length == 0) {
      chatClient.say(channel, `@${user} du hast leider keine !rucksäcke zum schenken.`);
      logger('giftEmpty');
      return;
    }
    const viewers: string[] = (await apiClient.unsupported.getChatters(channel)).allChatters;

    var highscoreIDs: string[] = [];

    if (args.length == 1) {
      //gift random
      var target: string = args[0].toLowerCase();
      if (target.startsWith('@')) target = target.substring(1);

      if (unschubsbar.includes(target)) {
        // User gifted Bot
        chatClient.say(channel, `@${target} ist ein Bot und kann keine Rucksäcke annehmen.`);
        logger('giftBot');
        return;
      } else if (!viewers.includes(target)) {
        chatClient.say(channel, `Deine Zielperson scheint nicht im Chat zu sein. versuche es später nochmal.`);
        logger('giftAway');
        return;
      }

      if (schubsListe.index[userId].inventar.length == 0) {
        chatClient.say(
          channel,
          `@${user} du hast leider keine ungesicherten !rucksäcke die du zufällig verschenken kannst.`
        );
        logger(`giftRnd, only safe`);
        return;
      }

      const inventorySize: number = schubsListe.index[userId].inventar.length;
      const giftedBackpack: string = schubsListe.index[userId].inventar[Math.floor(Math.random() * inventorySize)];

      const giftedbackpackIndex = schubsListe.index[userId].inventar.indexOf(giftedBackpack);
      schubsListe.index[userId].inventar.splice(giftedbackpackIndex, 1); //entfernt Rucksack aus Inventar

      const targetHelix = await apiClient.users.getUserByName(target);
      const targetId: string = targetHelix?.id!;

      schubsListe.index[targetId].inventar.push(giftedBackpack); //fügt Rucksack bei target ein

      const giftedHelix = await apiClient.users.getUserByName(giftedBackpack);
      const giftedId: string = giftedHelix?.id!;

      schubsListe.index[giftedId].ownId = targetId; //vermerkt neuen Ort

      // -------- Highscore/Achievements --------
      highscoreIDs.push(userId, targetId);
      achievementsFunction(userId, user, 'Gönner:in', chatClient, schubsListe);

      chatClient.say(channel, `@${user} schenkt @${target} den Rucksack von @${giftedBackpack}.`);
      logger('giftRnd');
    } else if (args.length == 2) {
      //gift specific
      var target: string = args[0].toLowerCase();
      if (target.startsWith('@')) target = target.substring(1);
      var giftedBackpack: string = args[1].toLowerCase();
      if (giftedBackpack.startsWith('@')) giftedBackpack = giftedBackpack.substring(1);

      if (unschubsbar.includes(target)) {
        // User gifted Bot
        chatClient.say(channel, `@${target} ist ein Bot und kann keine Rucksäcke annehmen.`);
        logger('giftBot');
        return;
      } else if (!viewers.includes(target)) {
        chatClient.say(channel, `Deine Zielperson scheint nicht im Chat zu sein. versuche es später nochmal.`);
        logger('giftAway');
        return;
      }

      if (
        !schubsListe.index[userId].inventar.includes(giftedBackpack) &&
        !schubsListe.index[userId].safe.includes(giftedBackpack)
      ) {
        //besitzt Rucksack nicht
        chatClient.say(channel, `@${user} du scheinst den Rucksack von ${giftedBackpack} nicht zu besitzen.`);
        logger('giftGiftedError');
      } else {
        //besitzt Rucksack
        if (schubsListe.index[userId].safe.includes(giftedBackpack)) {
          const droppedbackpackIndex = schubsListe.index[userId].safe.indexOf(giftedBackpack);
          schubsListe.index[userId].safe.splice(droppedbackpackIndex, 1); //entfernt Rucksack aus Inventar
        } else {
          const droppedbackpackIndex = schubsListe.index[userId].inventar.indexOf(giftedBackpack);
          schubsListe.index[userId].inventar.splice(droppedbackpackIndex, 1); //entfernt Rucksack aus Inventar
        }

        const targetHelix = await apiClient.users.getUserByName(target);
        const targetId: string = targetHelix?.id!;

        schubsListe.index[targetId].inventar.push(giftedBackpack); //fügt Rucksack bei target ein

        const giftedHelix = await apiClient.users.getUserByName(giftedBackpack);
        const giftedId: string = giftedHelix?.id!;

        schubsListe.index[giftedId].ownId = targetId; //vermerkt neuen Ort

        // -------- Highscore/Achievements --------
        highscoreIDs.push(userId, targetId);
        achievementsFunction(userId, user, 'Gönner:in', chatClient, schubsListe);

        chatClient.say(channel, `@${user} schenkt @${target} den Rucksack von ${giftedBackpack}.`);
        logger('giftSpecific');
      }
    } else {
      chatClient.say(
        channel,
        `@${user} bitte gib einen, oder zwei Namen nach !gift an. (!gift [Empfänger:in] [Geschenk])`
      );
      logger('giftArgsError');
    }
    logger('writeFile ./JSON/schubsen/schubsListe.json');
    await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');

    highscore(highscoreIDs, chatClient, schubsListe);
  });

  //!info
  commandHandler.addCommand('info', true, 0, 0, ({ args }) => {
    var query: string = '';
    for (var i: number = 0; i < args.length; i++) {
      if (i == 0) {
        query = query.concat(args[i].toLowerCase());
      } else {
        query = query.concat(' ', args[i].toLowerCase());
      }
    }
    if (query.startsWith('!')) {
      query = query.substring(1);
    }

    switch (query) {
      case 'schubsen':
        chatClient.say(
          channel,
          `Mit !schubsen könnt ihr andere Menschen im Chat schubsen und ihre Rucksäcke klauen. Ihr könnt zufällig schubsen (!schubsen), oder spezifisch, z.B. !schubsen @Maxmustermann.
           Andere Spieler:innen können sich mit Joghurts, Buenos, oder legendären Items schützen. Wenn du daneben schubst verlierst du selber einen Rucksack. Manchmal löst du auch ein Dominoschubsen aus! !sammeln hat einen drei Minuten Cooldown.`
        );
        break;
      case 'sammeln':
        chatClient.say(
          channel,
          `Mit !sammeln kannst du Rucksäcke aufsammeln, die auf den Boden gefallen sind. Sei schnell, wer zuerst sammelt, sammelt mehr! !sammeln hat einen fünf Sekunden Cooldown.`
        );
        break;
      case 'domino':
      case 'dominoschubsen':
        chatClient.say(
          channel,
          `Wenn jemand geschubst wird kann es passieren, dass ein Dominoschubsen ausgelöst wird. Dabei rempeln sich mehrere Personen an und können Rucksäcke fallen lassen. Sammle sie schnell mit !sammeln auf!`
        );
        break;
      case 'kaufen':
        chatClient.say(
          channel,
          `Mit !kaufen kannst du Gegenstände mit deinem Geld kaufen. Derzeit gibt es Joghurts, Buenos und Rucksackfinder im Angebot. Du kannst von jedem Gegenstand nur eine begrenzte Anzahl tragen.
           Joghurts und Buenos werden automatisch ausgerüstet, Rucksackfinder müssen benutzt werden (!benutzen).`
        );
        break;
      case 'geld':
        chatClient.say(
          channel,
          `Mit !geld kannst du dir einmal täglich dein Taschengeld abholen. Wenn du an mehreren Tagen nacheinander dein Geld abholst, erhöht sich der erhaltene Betrag. Insgesamt kannst du 500€ tragen.
           Du kannst dir von deinem Geld nützliche Gegenstände kaufen (!kaufen).`
        );
        break;
      case 'benutzen':
        chatClient.say(
          channel,
          `Mit !benutzen kannst du gewisse Gegenstände einsetzen. Defensive Items wie Joghurts und Buenos werden automatisch ausgerüstet. Andere wie der Rucksackfinder müssen manuell benutzt werden.`
        );
        break;
      case 'inventar':
        chatClient.say(
          channel,
          `Mit !inventar zeigst du dein Gegenstandsinventar an. Hier findest du alle Joghurts, Buenos, Rucksackfinders und legendäre Gegenstände, die du besitzt.`
        );
        break;
      case 'rucksack':
      case 'rucksäcke':
        chatClient.say(
          channel,
          `Mit !rucksack/!rucksäcke zeigst du alle Rucksäcke an, die sich derzeit in deinem Besitz befinden.`
        );
        break;
      case 'drop':
        chatClient.say(
          channel,
          `Mit !drop kannst du einen Rucksack aus deinem Inventar auf den Boden fallen lassen. Du kannst entweder einen zufälligen Rucksack fallen lassen (!drop), oder einen spezifischen, z.B. !drop @Cleobeispiel.`
        );
        break;
      case 'gift':
      case 'schenken':
        chatClient.say(
          channel,
          `Mit !gift/!schenken kannst du einer anderen Person im Chat einen deiner Rucksäcke schenken.
           Du kannst entweder einen zufälligen Rucksack aus deinem Inventar verschenken (!gift @Ramonaglücklich), oder einen spezifischen, z.B. !gift @Ramonaglücklich @Stephangenerisch.`
        );
        break;
      case 'rucksackmonster':
      case 'monster':
        chatClient.say(
          channel,
          `Das Rucksackmonster lässt sich ab und zu sehen, wenn geschubst wird. Schubse es am Schnellsten und gewinne ein legendäres Item!`
        );
        break;
      case 'joghurt':
      case 'jogurt':
        chatClient.say(
          channel,
          `Ein Joghurt in der Hand schützt dich mit einer 75% Wahrscheinlichkeit, wenn du geschubst wirst. Du kannst dir einen Joghurt für 100€ mit !kaufen Joghurt kaufen und hast maximal Platz für einen Joghurt in deinem Inventar. 
          Joghurts werden automatisch ausgerüstet und vor Buenos aber nach Bananen und legendären Gegenständen verwendet.`
        );
        break;
      case 'bueno':
        chatClient.say(
          channel,
          `Ein Bueno in der Hand schützt dich mit einer 50% Wahrscheinlichkeit, wenn du geschubst wirst. Du kannst dir ein Bueno für 50€ mit !kaufen Bueno kaufen und hast maximal Platz für zwei Buenos in deinem Inventar. 
          Buenos werden automatisch ausgerüstet und nach Joghurts und legendären Gegenständen verwendet.`
        );
        break;
      case 'rucksackfinder':
      case 'finder':
        chatClient.say(
          channel,
          `Ein Rucksackfinder erlaubt es dir den Standort deines eigenen Rucksackes ausfindig zu machen. Du kannst ihn für 250€ !kaufen und anschliessend !benutzen. 
            Du kannst zu jedem Zeitpunkt nur einen Rucksackfinder in deinem inventar tragen.`
        );
        break;
      case 'legendäre Gegenstände':
        chatClient.say(
          channel,
          `Legendäre Gegenstände werden vom Rucksackmonster fallen gelassen und haben verschiedenste Effekte. Wenn du einen Gegenstand erhältst, kannst du ihn mit !info nachschlagen.`
        );
        break;
      case 'gefälschte designer tasche':
      case 'gefälschte designertasche':
      case 'designer tasche':
      case 'designertasche':
      case 'tasche':
        chatClient.say(
          channel,
          `Die gefälschte Designertasche ist ein legendärer Gegenstand, der vom Rucksackmonster fallengelassen werden kann. Sie schützt dich mit 100%iger Wahrscheinlichkeit, wenn du geschubst wirst. Nach einer Benutzung zerfällt sie allerdings. 
          Die gefälschte Designertasche wird automatisch bei Erhalt ausgerüstet und immer zuerst verbraucht.`
        );
        break;
      case 'abgenutzte uno karte':
      case 'uno karte':
      case 'uno':
      case 'karte':
        chatClient.say(
          channel,
          `Die abgenutzte UNO Karte ist ein legendärer Gegenstand, der vom Rucksackmonster fallengelassen werden kann. Hältst du sie in der Hand und wirst geschubst, klaust stattdessen du einen Rucksack von deinem Angreifer! 
          Nach einer Benutzung zerfällt sie allerdings. Die abgenutzte UNO Karte wird automatisch bei Erhalt ausgerüstet und immer zuerst verbraucht.`
        );
        break;
      case 'kanne schwarztee':
      case 'kanne':
      case 'schwarztee':
      case 'tee':
        chatClient.say(
          channel,
          `Die Kanne Schwarztee ist ein legendärer Gegenstand, der vom Rucksackmonster fallengelassen werden kann. Du kannst sie !benutzen um deinen Schubs-Cooldown sofort auf Null zu setzen. 
          Nach einem Gebrauch ist die Kanne leer und nutzlos...`
        );
        break;
      case 'adressbuch':
        chatClient.say(
          channel,
          `Das Adressbuch ist ein legendärer Gegenstand, der vom Rucksackmonster fallengelassen werden kann. Du kannst es !benutzen um den Ort eines beliebigen Rucksacks nachzuschlagen, 
          z.B. !benutzen Adressbuch @KabelJau. Nach einem Gebrauch zerfällt das Adressbuch leider zu Asche.`
        );
        break;
      case 'wildgewordene katze':
      case 'katze':
        chatClient.say(
          channel,
          `Die wildgewordene Katze ist ein legendärer Gegenstand, der vom Rucksackmonster fallengelassen werden kann.
           Du kannst sie mit !benutzen auf eine andere Person im Chat werfen, woraufhin dein Ziel bis zu drei Rucksäcke auf den Boden fallen lässt. Nach einem Gebrauch läuft die Katze beleidigt weg.`
        );
        break;
      case 'brustgurt':
        chatClient.say(
          channel,
          `Der Brustgurt ist ein legendärer Gegenstand, der vom Rucksackmonster fallengelassen werden kann.
        Du kannst ihn mit !benutzen @name verwenden, um einen Rucksack in deinem Besitz festzuschnallen und vor dem Fallen lassen zu schützen. Festgeschnallte Rucksäcke können nur freiwillig mit !drop oder !gift abgegeben werden.`
        );
        break;
      case 'banane':
      case 'bananenschale':
        chatClient.say(
          channel,
          `Eine Banane in der Hand schützt dich mit einer 90% Wahrscheinlichkeit, wenn du geschubst wirst. Wenn der Schutz fehlschlägt, rutscht du aber auf deiner eigenen Bananenschale aus.
         Du kannst dir einen Banane für 200€ mit !kaufen Banane kaufen und hast maximal Platz für eine Banane in deinem Inventar. 
        Bananen werden automatisch ausgerüstet und vor Buenos und Joghurts aber nach legendären Gegenständen verwendet.`
        );
        break;
      case 'ölkanne':
      case 'öl':
        chatClient.say(
          channel,
          `Du kannst eine Ölkanne mit !benutzen Ölkanne auf dem Boden ausleeren um alles glitschig zu machen. Wenn Öl auf dem Boden verteilt wurde, besteht eine 50%ige Wahrscheinlichkeit für alle,
         beim !sammeln auszurutschen und einen Rucksack zu verlieren. Das Öl verschwindet nach zehn Minuten.
         Du kannst dir eine Ölkanne für 500€ mit !kaufen Ölkanne kaufen und hast maximal Platz für eine Ölkanne in deinem Inventar.  `
        );
        break;
      case 'achievement':
      case 'achievements':
      case 'achivement':
      case 'achivements':
        chatClient.say(
          channel,
          `Du kannst folgende Achievements erhalten: Klohocker:in, Affenkönig:in, Ölbaron:ess, Bananen Slider, Grosshändler:in, Masterlooter und Gönner:in. Um zu sehen, welche Achievements du bereits hast, benutze !achievements.`
        );
        break;
      case 'klohocker:in':
      case 'klohocker':
      case 'klohockerin':
        chatClient.say(channel, `[verstecktes Achievement]`);
        break;
      case 'affenkönig:in':
      case 'affenkönig':
      case 'affenkönigin':
        chatClient.say(channel, `Wehre zehn Schubser mit Bananenschalen ab.`);
        break;
      case 'ölbaron:ess':
      case 'ölbaron:esse':
      case 'ölbaron':
      case 'ölbaroness':
      case 'ölbaronesse':
        chatClient.say(channel, `Benutze fünf Ölkannen.`);
        break;
      case 'bananen slider':
        chatClient.say(channel, `Rutsche auf deiner eigenen Bananenschale aus.`);
        break;
      case 'grosshändler:in':
      case 'grosshändler':
      case 'grosshändlerin':
      case 'großhändler:in':
      case 'großhändler':
      case 'großhändlerin':
        chatClient.say(channel, `Besitze mehr als 20 Rucksäcke auf ein Mal.`);
        break;
      case 'masterlooter':
        chatClient.say(channel, `Besitze alle legendären gegenstände mindestens ein Mal.`);
        break;
      case 'gönner:in':
      case 'gönner':
      case 'gönnerin':
        chatClient.say(channel, `Verschenke 20 Rucksäcke.`);
        break;
      case 'rang':
      case 'ränge':
        chatClient.say(
          channel,
          `Dein Rang sagt dir, wie viele Rucksäcke du derzeit besitzt. Ränge: Schulschwänzer:in, Schulkind, Streber:in, Rucksack Horter:in, Schulkind Ausstatter:in, Angeber:in und Schwarzmarkt Besitzer:in.
         Um deinen aktuellen Rang zu sehen benutze !rang.`
        );
        break;
      case 'schulschwänzer:in':
      case 'schulschwänzer':
      case 'schulschwänzerin':
        chatClient.say(channel, `Besitze keinen einzigen Rucksack.`);
        break;
      case 'schulkind':
        chatClient.say(channel, `Besitze 1-4 Rucksäcke.`);
        break;
      case 'streber:in':
      case 'streber':
      case 'streberin':
        chatClient.say(channel, `Besitze 5-9 Rucksäcke.`);
        break;
      case 'rucksack horter:in':
      case 'rucksack horter':
      case 'rucksack horterin':
      case 'rucksackhorter:in':
      case 'rucksackhorter':
      case 'rucksackhorterin':
        chatClient.say(channel, `Besitze 10-14 Rucksäcke.`);
        break;
      case 'schulkind ausstatter:in':
      case 'schulkind ausstatter':
      case 'schulkind ausstatterin':
      case 'schulkindausstatter:in':
      case 'schulkindausstatter':
      case 'schulkindausstatterin':
        chatClient.say(channel, `Besitze 15-19 Rucksäcke.`);
        break;
      case 'angeber:in':
      case 'angeber':
      case 'angeberin':
        chatClient.say(channel, `Besitze 20 Rucksäcke.`);
        break;
      case 'schwarzmarkt besitzer:in':
      case 'schwarzmarkt besitzer':
      case 'schwarzmarkt besitzerin':
      case 'schwarzmarktbesitzer:in':
      case 'schwarzmarktbesitzer':
      case 'schwarzmarktbesitzerin':
        chatClient.say(channel, `Besitze mehr als 20 Rucksäcke.`);
        break;
      // case "":
      //   chatClient.say(channel, ``);
      //   break;
      default:
        chatClient.say(
          channel,
          `Bitte gib einen Begriff ein, zu dem du etwas wissen möchtest. Begriffe: !schubsen, domino, !sammeln, !kaufen, !geld, !benutzen, !inventar, !rucksäcke, !drop, !schenken, !achievements, !rang, Rucksackmonster, 
          Joghurt, Bueno, Rucksackfinder, sowie die legendären Gegenstände, Achievements und Ränge.`
        );
        break;
    }
    logger(`info: ${query}`);
  });

  //!highscore
  commandHandler.addCommand(
    'highscore',
    true,
    2,
    5,
    async ({ args, msg }) => {
      logger('readFile ./JSON/schubsen/highscores.json');
      var highscores: {
        monthlyScores: {
          [key: string]: {
            1: {
              name: string;
              score: number;
            };
            2: {
              name: string;
              score: number;
            };
            3: {
              name: string;
              score: number;
            };
            [key: string]: any;
          };
        };
        globalScores: {
          maxOwned: {
            1: {
              name: string;
              score: number;
              date: string;
            };
            2: {
              name: string;
              score: number;
              date: string;
            };
            3: {
              name: string;
              score: number;
              date: string;
            };
          };
        };
      } = JSON.parse(await fs.promises.readFile('./JSON/schubsen/highscores.json', 'utf8'));

      if (args.length == 0) {
        chatClient.say(
          channel,
          `Bitte gib entwerder "global" oder einen vorhandenen Monat ein, z.B. "Januar_2021_max"/"Januar_2021_current".`
        );
        logger('highscore');
        return;
      }

      var query: string = args[0].toLowerCase();
      if (query == 'global') {
        chatClient.say(channel, `Die globale Highscore ist:`);
        chatClient.say(
          channel,
          `1: ${highscores.globalScores.maxOwned[1].name} mit ${highscores.globalScores.maxOwned[1].score} Rucksäcken am ${highscores.globalScores.maxOwned[1].date}!`
        );
        chatClient.say(
          channel,
          `2: ${highscores.globalScores.maxOwned[2].name} mit ${highscores.globalScores.maxOwned[2].score} Rucksäcken am ${highscores.globalScores.maxOwned[2].date}!`
        );
        chatClient.say(
          channel,
          `3: ${highscores.globalScores.maxOwned[3].name} mit ${highscores.globalScores.maxOwned[3].score} Rucksäcken am ${highscores.globalScores.maxOwned[3].date}!`
        );
      } else if (highscores.monthlyScores[query] != null) {
        chatClient.say(channel, `Die Highscore für ${query} ist:`);
        chatClient.say(
          channel,
          `1: ${highscores.monthlyScores[query][1].name} mit ${highscores.monthlyScores[query][1].score} Rucksäcken!`
        );
        chatClient.say(
          channel,
          `2: ${highscores.monthlyScores[query][2].name} mit ${highscores.monthlyScores[query][2].score} Rucksäcken!`
        );
        chatClient.say(
          channel,
          `3: ${highscores.monthlyScores[query][3].name} mit ${highscores.monthlyScores[query][3].score} Rucksäcken!`
        );
      } else {
        chatClient.say(
          channel,
          `Bitte gib entwerder "global" oder einen vorhandenen Monat ein, z.B. "2021_Januar_max"/"2021_Januar_current".`
        );
      }
      logger('highscore');
    },
    3
  );

  //!rang
  commandHandler.addCommand('rang', true, 0, 0, async ({ user, msg }) => {
    const userId: string = msg.userInfo.userId!;
    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }
    const inventorySize: number = schubsListe.index[userId].inventar.length + schubsListe.index[userId].safe.length;
    switch (true) {
      case inventorySize == 0:
        // 0
        chatClient.say(channel, `@${user} dein aktueller Rang ist: Schulschwänzer:in. (Rucksäcke: ${inventorySize})`);
        break;
      case inventorySize >= 1 && inventorySize < 5:
        // 1-4
        chatClient.say(channel, `@${user} dein aktueller Rang ist: Schulkind. (Rucksäcke: ${inventorySize})`);
        break;
      case inventorySize >= 5 && inventorySize < 10:
        // 5-9
        chatClient.say(channel, `@${user} dein aktueller Rang ist: Streber:in. (Rucksäcke: ${inventorySize})`);
        break;
      case inventorySize >= 10 && inventorySize < 15:
        // 10-14
        chatClient.say(channel, `@${user} dein aktueller Rang ist: Rucksack Horter:in. (Rucksäcke: ${inventorySize})`);
        break;
      case inventorySize >= 15 && inventorySize < 20:
        // 15-19
        chatClient.say(
          channel,
          `@${user} dein aktueller Rang ist: Schulkind Ausstatter:in. (Rucksäcke: ${inventorySize})`
        );
        break;
      case inventorySize == 20:
        // 20
        chatClient.say(channel, `@${user} dein aktueller Rang ist: Angeber:in. (Rucksäcke: ${inventorySize})`);
        break;
      case inventorySize > 20:
        // >20
        chatClient.say(
          channel,
          `@${user} dein aktueller Rang ist: Schwarzmarkt Besitzer:in. (Rucksäcke: ${inventorySize})`
        );
        break;
      default:
        logger(`!rang: inventory size not handled: ${inventorySize}`);
        break;
    }
    logger(`!rang: ${user}`);
  });

  //!achievement
  commandHandler.addCommand(
    ['achievement', 'achievment', 'achievements', 'achivements'],
    true,
    0,
    0,
    async ({ user, msg }) => {
      const userId: string = msg.userInfo.userId!;
      if (schubsListe.index[userId] == null) {
        //fügt User ein
        await addBackpack(userId);
      }

      logger('readFile ./JSON/schubsen/achievements.json');
      const achievements: {
        achievements: [
          'Klohocker:in',
          'Affenkönig:in',
          'Ölbaron:ess',
          'Bananen Slider',
          'Grosshändler:in',
          'Masterlooter:in',
          'Gönner:in'
        ];
        index: {
          [key: string]: {
            userName: string;
            achievements: string[];
            legendaryItemsOwned: string[];
            bananaSuccess: number;
            oilcannsUsed: number;
            giftedBackpacks: number;
            [key: string]: any;
          };
        };
      } = JSON.parse(await fs.promises.readFile('./JSON/schubsen/achievements.json', 'utf8'));

      var userAchievements: string[] = achievements.index[userId].achievements;
      if (userAchievements.length == 0) {
        chatClient.say(channel, `@${user} du hast noch keine Achievements.`);
      } else {
        var output: string = '';
        for (var i: number = 0; i < userAchievements.length; i++) {
          if (i == 0) {
            output = userAchievements[i];
          } else if (i == userAchievements.length - 1) {
            output.concat(' und ', userAchievements[i]);
          } else {
            output.concat(', ', userAchievements[i]);
          }
        }
        chatClient.say(channel, `@${user} deine Achievements: ${output}.`);
      }
      logger(`!achievement: ${user}`);
    }
  );

  //!baron:ess
  commandHandler.addCommand(['baron', 'baroness', 'baronesse', 'baron:ess'], true, 0, 0, async ({ msg }) => {
    const userId: string = msg.userInfo.userId!;
    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }

    logger('readFile ./JSON/schubsen/highscores.json');
    const highscores: {
      monthlyScores: {
        [key: string]: {
          1: {
            name: string;
            score: number;
          };
          2: {
            name: string;
            score: number;
          };
          3: {
            name: string;
            score: number;
          };
          [key: string]: any;
        };
      };
      globalScores: {
        maxOwned: {
          1: {
            name: string;
            score: number;
            date: string;
          };
          2: {
            name: string;
            score: number;
            date: string;
          };
          3: {
            name: string;
            score: number;
            date: string;
          };
        };
      };
    } = JSON.parse(await fs.promises.readFile('./JSON/schubsen/highscores.json', 'utf8'));

    const monthNames: string[] = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ];

    const today: Date = new Date();
    const monthName: string = monthNames[today.getMonth()];
    const year: string = String(today.getFullYear());
    const monthNameCurrent: string = monthName.concat('_', year, '_current').toLowerCase();

    const baronName: string = highscores.monthlyScores[monthNameCurrent][1].name;
    const baronScore: number = highscores.monthlyScores[monthNameCurrent][1].score;

    if (baronName == '') {
      chatClient.say(channel, `Es gibt derzeit noch keine:n Rucksack Baron:ess.`);
    } else {
      if (baronScore == 1) {
        chatClient.say(channel, `Derzeitige:r Rucksack Baron:ess ist @${baronName} mit einem Rucksack.`);
      } else {
        chatClient.say(channel, `Derzeitige:r Rucksack Baron:ess ist @${baronName} mit ${baronScore} Rucksäcken.`);
      }
    }
    logger(`!baron:ess`);
  });

  //!rucksackmonster
  commandHandler.addCommand(
    'rucksackmonster',
    false,
    3,
    0,
    async ({ args }) => {
      if (args.length == 0 || isNaN(Number(args[0]))) {
        chatClient.say(channel, `Bitte gib eine Minutenzahl ein.`);
      } else {
        var lootableItems: string[] = [];
        for (const property in schubsListe.rucksackmonster.list) {
          if (schubsListe.rucksackmonster.list[property].available == true) {
            lootableItems.push(property);
          }
        }

        if (lootableItems.length > 0) {
          const lootItemProperty: string = lootableItems[Math.floor(Math.random() * lootableItems.length)];
          const lootableItem: string = schubsListe.rucksackmonster.list[lootItemProperty].name;
          const lootablePurpose: string = schubsListe.rucksackmonster.list[lootItemProperty].purpose;

          const waitTime = getRandomInt(10000, Number(args[0]) * 60000); //rndm Zeit zwischen 10 Sekunden & Input min in MS
          chatClient.say(channel, `Ein Rucksackmonster hat sich auf den Weg gemacht,`);
          logger(`Rucksackmonster aktiv in ${waitTime / 1000 / 60} Minuten.`);

          monsterTimerStart = setTimeout(async function () {
            schubsListe.rucksackmonster.active = true;
            schubsListe.rucksackmonster.item.name = lootableItem;
            schubsListe.rucksackmonster.item.purpose = lootablePurpose;
            schubsListe.rucksackmonster.list[lootItemProperty].available = false;

            logger('writeFile ./JSON/schubsen/schubsListe.json');
            await fs.promises.writeFile(
              './JSON/schubsen/schubsListe.json',
              JSON.stringify(schubsListe, null, 4),
              'utf8'
            );

            logger(`Rucksackmonster aktiv!`);

            chatClient.action(channel, `Ein Rucksackmonster rennt durch den Chat! Schnell! Schubst es!`);
          }, waitTime);

          monsterTimerStop = setTimeout(async function () {
            schubsListe.rucksackmonster.active = false;
            schubsListe.rucksackmonster.item.name = '';
            schubsListe.rucksackmonster.item.purpose = '';
            schubsListe.rucksackmonster.list[lootItemProperty].available = true;

            logger('writeFile ./JSON/schubsen/schubsListe.json');
            await fs.promises.writeFile(
              './JSON/schubsen/schubsListe.json',
              JSON.stringify(schubsListe, null, 4),
              'utf8'
            );

            logger('Das Rucksackmonster ist verschwunden.');

            chatClient.action(channel, `Das Rucksackmonster schlüpft aus dem Chat. Zu spät...`);
          }, waitTime + 10000);
        } else {
          chatClient.say(channel, `Derzeit gibt es keine freien legendären Gegenstände...`);
          logger(`!rucksackmonster: keine Items verfügbar.`);
        }
      }
    },
    3
  );

  //!essen
  commandHandler.addCommand('essen', false, 0, 0, async ({ args, user, msg }) => {
    const userId: string = msg.userInfo.userId!;
    if (schubsListe.index[userId] == null) {
      //fügt User ein
      await addBackpack(userId);
    }
    if (args[0].toLowerCase() == 'joghurt') {
      achievementsFunction(userId, user, 'Klohocker:in', chatClient, schubsListe);
    }
    logger(`!essen: ${args[0]}`);
  });

  //!schubsenreset
  commandHandler.addCommand(
    'schubsenreset',
    false,
    3,
    0,
    async ({}) => {
      var cleanSchubsListe: {
        rucksackmonster: {
          active: boolean;
          item: {
            name: string;
            purpose: string;
          };
          list: {
            [key: string]: {
              purpose: string;
              available: boolean;
              [key: string]: any;
            };
          };
        };
        index: {};
        floor: [];
      } = {
        rucksackmonster: {
          active: false,
          item: {
            name: '',
            purpose: '',
          },
          list: {
            brustgurt: {
              name: 'Brustgurt',
              purpose: 'passiveItems',
              available: true,
            },
            kanne_schwarztee: {
              name: 'Kanne Schwarztee',
              purpose: 'passiveItems',
              available: true,
            },
            wildgewordene_katze: {
              name: 'wildgewordene Katze',
              purpose: 'offensiveItems',
              available: true,
            },
            abgenutzte_uno_karte: {
              name: 'abgenutzte UNO Karte',
              purpose: 'defensiveItems',
              available: true,
            },
            adressbuch: {
              name: 'Adressbuch',
              purpose: 'passiveItems',
              available: true,
            },
            gefälschte_designer_tasche: {
              name: 'gefäschte Designer Tasche',
              purpose: 'defensiveItems',
              available: true,
            },
          },
        },
        index: {},
        floor: [],
      };

      logger('writeFile ./JSON/schubsen/schubsListe.json');
      await fs.promises.writeFile(
        './JSON/schubsen/schubsListe.json',
        JSON.stringify(cleanSchubsListe, null, 4),
        'utf8'
      );

      logger('readFile ./JSON/schubsen/schubsListe.json');
      schubsListe = JSON.parse(await fs.promises.readFile('./JSON/schubsen/schubsListe.json', 'utf8'));

      chatClient.say(channel, `Die Schubsliste wurde zurückgesetzt.`);
      logger('schubsreset');
    },
    3
  );

  async function addBackpack(id: string) {
    const userNameHelix = await apiClient.users.getUserById(id);
    const userName = userNameHelix?.name;
    var inventar: string[] = [];
    const day: string = new Date(1991, 8, 24).toString();
    inventar[0] = userName!;
    schubsListe.index[id!] = {
      timestamp: day,
      consecutiveDays: 1,
      userName: userName!,
      ownId: id,
      money: 0,
      ownedItems: {
        bueno: 0,
        joghurt: 0,
        banane: 0,
        ölkanne: 0,
        rucksackfinder: 0,
      },
      defensiveItems: [],
      offensiveItems: [],
      passiveItems: [],
      inventar: inventar,
      cooldownSchubsen: 0,
      cooldownSammeln: 0,
      safe: [],
    };
    logger('writeFile ./JSON/schubsen/schubsListe.json');
    await fs.promises.writeFile('./JSON/schubsen/schubsListe.json', JSON.stringify(schubsListe, null, 4), 'utf8');
  }
  //#endregion Schubsen

  //#region Sims

  //!simliste
  commandHandler.addCommand(
    ['simliste', 'simsliste'],
    true,
    2,
    3,
    async ({}) => {
      let simList: SimsDeathInfo[] | null = null;
      try {
        const response = await axios.get(backendBaseUrl + '/wuevent/wueventdeathinfobot', {
          headers: {
            Authorization: `Bearer ${backendLogin.token}`,
          },
        });
        simList = response.data;
      } catch (error) {
        logger('!simliste: ' + error, ELogLevel.ERROR);
        chatClient.action(channel, 'Ohoh, der Bot hat sich verschluckt.');
      }

      if (simList === null) {
        logger('!simliste: Liste konnte nicht gelesen werden.', ELogLevel.ERROR);
        return;
      }

      if (simList.length === 0) {
        chatClient.action(channel, 'Es ist noch niemand gestorben.');
        logger('simliste');
        return;
      }

      // check simList for Sims that died and collect them in a list
      const deadSims: SimsDeathInfo[] = simList.filter((sim: SimsDeathInfo) => sim.causeOfDeath !== null);

      let deadSimsText: string = '';
      for (let i = 0; i < deadSims.length; i++) {
        if (i === 0) {
          deadSimsText = deadSimsText.concat(deadSims[i].nameOfSim);
        } else if (i === deadSims.length - 1) {
          deadSimsText = deadSimsText.concat(' und ', deadSims[i].nameOfSim);
        } else {
          deadSimsText = deadSimsText.concat(', ', deadSims[i].nameOfSim);
        }
      }
      if (deadSims.length === 0) {
        chatClient.action(channel, `Es ist leider noch niemand gestorben.`);
      } else if (deadSims.length === 1) {
        chatClient.action(channel, `Bereits gestorben ist: [${deadSims.length}] ${deadSimsText}`);
      } else {
        multiAction(channel, chatClient, ',', `Bereits gestorben sind: [${deadSims.length}] ${deadSimsText}.`);
      }
      logger('simliste');
    },
    3
  );

  //!bingo
  commandHandler.addCommand(['bingo'], true, 0, 0, async ({ user, msg, args }) => {
    /***
     * Bingo an- und ausschalten
     */
    if (
      (msg.userInfo.isBroadcaster || msg.userInfo.isMod || msg.userInfo.displayName === 'illnux') &&
      args[0] == 'close'
    ) {
      botControl.bingoOpen = false;
      // simsBingo.status = false;
      chatClient.say(channel, `@${user} Das Bingobüro wurde geschlossen.`);

      logger(`bingo: close`);
      return;
    }

    if (
      (msg.userInfo.isBroadcaster || msg.userInfo.isMod || msg.userInfo.displayName === 'illnux') &&
      args[0] == 'open'
    ) {
      botControl.bingoOpen = true;
      // simsBingo.status = true;
      chatClient.say(channel, `@${user} Das Bingobüro wurde geöffnet.`);

      logger(`bingo: open`);
      return;
    }

    if (
      (msg.userInfo.isBroadcaster || msg.userInfo.isMod || msg.userInfo.displayName === 'illnux') &&
      args[0] == 'list'
    ) {
      let bingoList: WuBingoUserTO[] | null = null;
      try {
        const responseBingoList = await axios.get(backendBaseUrl + '/wubingo/bingolist', {
          headers: {
            Authorization: `Bearer ${backendLogin.token}`,
          },
        });
        bingoList = responseBingoList.data;
      } catch (error) {
        logger('!bingo list: ' + error, ELogLevel.ERROR);
        chatClient.action(channel, 'Ohoh, der Bot hat sich verschluckt.');
        return;
      }
      let bingoText = 'Bisher gibt es keine Bingos.';
      if (bingoList && bingoList.length > 0) {
        bingoText = 'Bisher gibt es folgende Bingos: ';
        bingoList.map((bingo) => {
          bingoText += '@' + bingo.twitchuser + ', ';
        });
        bingoText = bingoText.trim().slice(0, -1); // remove last comma
      }

      chatClient.say(channel, bingoText);
      logger(`bingo: list`);
      return;
    }

    /**
     * Zeige Bingo des Users an
     */
    const userName: string = msg.userInfo.displayName;
    let bingo: WuBingoUserTO | null = null;
    try {
      const responseUserBingo = await axios.get(backendBaseUrl + '/wubingo/bingo/' + userName, {
        headers: {
          Authorization: `Bearer ${backendLogin.token}`,
        },
      });
      bingo = responseUserBingo.data;
    } catch (error) {
      logger('!bingo Zeige Bingo des Users an: ' + error, ELogLevel.ERROR);
      chatClient.action(channel, 'Ohoh, der Bot hat sich verschluckt.');
      return;
    }

    if (bingo) {
      let bingoString = `@${bingo.twitchuser} dein Bingo: `;
      bingo.participants.map((participant: WuParticipantBotTO) => {
        bingoString += participant.nameOfSim + ', ';
      });
      bingoString = bingoString.trim().slice(0, -1);

      if (bingo.dateOfBingo !== null) {
        bingoString += '. Glückwunsch, die Sims auf deiner Liste sind alle tot. Bingo!';
      }

      chatClient.say(channel, bingoString);

      logger(`bingo: ${userName}`);
      return;
    }

    /**
     * Füge ein Bingo für den User hinzu
     */
    if (!botControl.bingoOpen) {
      chatClient.say(channel, 'Die Anmeldung für neue Bingos ist leider geschlossen...');
      logger('bingo: closed');
      return;
    }

    let bingoAdded: WuBingoUserTO | null = null;
    try {
      const responseAddBingo = await axios.get(backendBaseUrl + '/wubingo/addbingo/' + userName, {
        headers: {
          Authorization: `Bearer ${backendLogin.token}`,
        },
      });
      bingoAdded = responseAddBingo.data;
    } catch (error) {
      logger('!bingo add bingo: ' + error, ELogLevel.ERROR);
      chatClient.action(channel, 'Ohoh, der Bot hat sich verschluckt.');
      return;
    }

    if (bingoAdded) {
      let bingoString = `@${bingoAdded.twitchuser} dein Bingo: `;
      bingoAdded.participants.map((participant: WuParticipantBotTO) => {
        bingoString += participant.nameOfSim + ', ';
      });
      bingoString = bingoString.trim().slice(0, -1);

      chatClient.say(channel, bingoString + '. Viel Glück!');
      logger(`bingo: ${userName}`);
      return;
    }
  });

  //!wetten
  let qualifiedUsers: string[] = [];
  let lostopfAlert: boolean = false;

  commandHandler.addCommand(['wetten', 'wette', 'bet'], false, 0, 0, async ({ args, user, msg }) => {
    logger('readFile ./JSON/sims/simsBets.json');
    const simsBets: {
      status: boolean;
      names: string[];
      winners: string[];
      ziel: string[];
      entries: {
        [key: string]: {
          names: string[];
        };
      };
    } = JSON.parse(await fs.promises.readFile('./JSON/sims/simsBets.json', 'utf8'));

    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && args[0] == 'close') {
      simsBets.status = false;
      logger('writeFile ./JSON/sims/simsBets.json');
      await fs.promises.writeFile('./JSON/sims/simsBets.json', JSON.stringify(simsBets, null, 4), 'utf8');

      chatClient.action(channel, `Das Wettbüro ist nun geschlossen!`);
      logger(`wetten: closed`);
      return;
    }

    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && args[0] == 'auswertung') {
      if (simsBets.ziel.length == 0) {
        chatClient.say(channel, `@${user} bitte trage zuerst Sims per !wetten ziel [nummer/n] ein.`);
        logger(`wetten: auswertung, Ziel error`);
        return;
      }
      Object.keys(simsBets.entries).forEach((name) => {
        simsBets.entries[name].names.forEach((entry) => {
          if (simsBets.ziel.includes(entry)) {
            qualifiedUsers.push(name);
          }
        });
      });
      if (simsBets.winners.length != 0) {
        simsBets.winners.forEach((winner) => {
          if (qualifiedUsers.includes(winner)) {
            while (qualifiedUsers.indexOf(winner) != -1) {
              const index: number = qualifiedUsers.indexOf(winner);
              qualifiedUsers.splice(index, 1);
            }
          }
        });
      }

      let qualifiedUsersUnique: string[] = [];
      qualifiedUsers.forEach((name) => {
        if (!qualifiedUsersUnique.includes(name)) qualifiedUsersUnique.push(name);
      });
      if (qualifiedUsersUnique.length == 0) {
        chatClient.say(channel, `Leider scheint niemand teilnahmeberechtigt zu sein... RIP`);
        logger(`wetten AuswertungNoPossibleWinners`);
      } else {
        let message: string = 'Teilnahmeberechtigt sind: ';
        for (let i = 0; i < qualifiedUsersUnique.length; i++) {
          if (i == 0) {
            message = message.concat(`@${qualifiedUsersUnique[i]}`);
          } else if (i == qualifiedUsersUnique.length - 1) {
            message = message.concat(` und @${qualifiedUsersUnique[i]}`);
          } else {
            message = message.concat(`, @${qualifiedUsersUnique[i]}`);
          }
        }
        multiSay(channel, chatClient, ' ', message);
        logger(`wetten Auswertung`);
      }
      return;
    }

    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && args[0] == 'start') {
      if (simsBets.winners.length != 0) {
        simsBets.winners.forEach((winner) => {
          if (qualifiedUsers.includes(winner)) {
            while (qualifiedUsers.indexOf(winner) != -1) {
              const index: number = qualifiedUsers.indexOf(winner);
              qualifiedUsers.splice(index, 1);
            }
          }
        });
      }
      if (qualifiedUsers.length == 0) {
        chatClient.say(
          channel,
          `@${user} es gibt keine Teilnahmeberechtigten. Bitte gib zuerst "!wetten auswertung" ein.`
        );
        return;
      }
      const winner: string = qualifiedUsers[Math.floor(Math.random() * qualifiedUsers.length)];
      logger(`wetten: winner [${winner}]`);

      const mysticWords_1: string = mysticWords[Math.floor(Math.random() * mysticWords.length)];
      let mysticWords_2: string = mysticWords[Math.floor(Math.random() * mysticWords.length)];
      while (mysticWords_1 == mysticWords_2) {
        mysticWords_2 = mysticWords[Math.floor(Math.random() * mysticWords.length)];
      }
      chatClient.say(channel, `Und gewonnen hat:`);

      setTimeout(() => {
        chatClient.action(channel, mysticWords_1);
      }, 1500);

      setTimeout(() => {
        chatClient.action(channel, mysticWords_2);
      }, 7500);

      setTimeout(() => {
        chatClient.say(channel, `@${winner}! Gratulation!`);
      }, 14000);

      simsBets.winners.push(winner);
      logger('writeFile ./JSON/sims/simsBets.json');
      await fs.promises.writeFile('./JSON/sims/simsBets.json', JSON.stringify(simsBets, null, 4), 'utf8');
      return;
    }

    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && args[0] == 'ziel') {
      if (args[1] == 'delete') {
        if (simsBets.ziel.includes(args.slice(2).join(' '))) {
          const index: number = simsBets.ziel.indexOf(args.slice(2).join(' '));
          simsBets.ziel.splice(index, 1);
          chatClient.say(channel, `@${user} "${args.slice(2).join(' ')}" erfolgreich aus dem Ziel gelöscht.`);
          logger('writeFile ./JSON/sims/simsBets.json');
          await fs.promises.writeFile('./JSON/sims/simsBets.json', JSON.stringify(simsBets, null, 4), 'utf8');
          logger(`wetten: Ziel, delete: ${args.slice(2).join(' ')}`);
        } else {
          chatClient.say(
            channel,
            `@${user} "${args.slice(2).join(' ')}" scheint nicht zu existieren. Bitte überprüfe die Schreibweise.`
          );
          logger(`wetten: Ziel, delete Error`);
        }
        return;
      } else if (args.length > 1) {
        let errorZiel: boolean = false;
        args.slice(1).forEach((number) => {
          if (isNaN(Number(number))) {
            errorZiel = true;
          }
        });
        if (errorZiel) {
          chatClient.say(channel, `@${user} bitte gib die Nummern des Zieleintrags/des Sim ein.`);
          logger(`wetten: error Ziel`);
          return;
        } else {
          args.slice(1).forEach((number) => {
            if (!simsBets.ziel.includes(simsBets.names[Number(number) - 1])) {
              simsBets.ziel.push(simsBets.names[Number(number) - 1]);
            }
          });
          let message: string =
            args.slice(1).length == 1 ? 'Eingetragen für das Ziel ist: ' : 'Eingetragen für das Ziel sind: ';
          for (let i = 0; i < args.slice(1).length; i++) {
            if (i == 0) {
              message = message.concat(`${simsBets.names[Number(args[i + 1]) - 1]}`);
            } else if (i == qualifiedUsers.length - 1) {
              message = message.concat(` und ${simsBets.names[Number(args[i + 1]) - 1]}`);
            } else {
              message = message.concat(`, ${simsBets.names[Number(args[i + 1]) - 1]}`);
            }
          }

          let lostopf: string[] = [];
          Object.keys(simsBets.entries).forEach((name) => {
            let qualified: boolean = false;
            simsBets.entries[name].names.forEach((entry) => {
              if (simsBets.ziel.includes(entry)) qualified = true;
            });
            if (qualified && !simsBets.winners.includes(name)) lostopf.push(name);
          });
          lostopf.length == 1
            ? (message = message.concat(`. Im Lostopf ist ${lostopf.length} Person.`))
            : (message = message.concat(`. Im Lostopf sind ${lostopf.length} Personen.`));

          chatClient.say(channel, message);
          if (lostopf.length >= 10 && lostopfAlert == false) {
            chatClient.action(channel, `HYPEE CATDANCE es sind zehn oder mehr Personen im Lostopf! CATDANCE HYPEE`);
            lostopfAlert = true;
          }

          logger('writeFile ./JSON/sims/simsBets.json');
          await fs.promises.writeFile('./JSON/sims/simsBets.json', JSON.stringify(simsBets, null, 4), 'utf8');
          logger(`wetten: Ziel`);
          return;
        }
      } else {
        let message: string = '';
        if (simsBets.ziel.length == 0) {
          message = 'Im Ziel ist niemand...';
        } else if (simsBets.ziel.length == 1) {
          message = `Im Ziel ist: ${simsBets.ziel[0]}`;
        } else {
          message = 'Im Ziel sind: ';
          for (let i = 0; i < simsBets.ziel.length; i++) {
            if (i == 0) {
              message = message.concat(`${simsBets.ziel[i]}`);
            } else if (i == simsBets.ziel.length - 1) {
              message = message.concat(` und ${simsBets.ziel[i]}.`);
            } else {
              message = message.concat(`, ${simsBets.ziel[i]}`);
            }
          }
        }
        chatClient.say(channel, message);
        logger(`wetten: Ziel`);
        return;
      }
    }

    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && args[0] == 'counter') {
      const bets: number = Object.keys(simsBets.entries).length;
      chatClient.say(channel, `Derzeit gibt es ${bets} Wetten.`);
      logger(`wetten: counter`);
      return;
    }

    if (simsBets.status) {
      //Wettbüro offen
      if (simsBets.entries[user] != null) {
        //hat schon gewettet
        if (args.length == 0) {
          chatClient.say(
            channel,
            `@${user} deine Wette: ${simsBets.entries[user].names[0]}, ${simsBets.entries[user].names[1]} und ${simsBets.entries[user].names[2]}.`
          );
        } else {
          chatClient.say(
            channel,
            `@${user} du hast schon eine Wette abgeschlossen: ${simsBets.entries[user].names[0]}, ${simsBets.entries[user].names[1]} und ${simsBets.entries[user].names[2]}.`
          );
        }
        logger(`wetten: alreadyBet`);
        return;
      }

      if (args.length != 3) {
        if (
          args.length == 1 &&
          (args[0].toLowerCase() == 'zufall' ||
            args[0].toLowerCase() == 'zufällig' ||
            args[0].toLowerCase() == 'random' ||
            args[0].toLowerCase() == 'rnd')
        ) {
          //neue Wette
          simsBets.entries[user] = { names: [] };
          let numbers: number[] = [];
          while (numbers.length < 3) {
            const number: number = getRandomInt(0, simsBets.names.length);
            if (!numbers.includes(number)) numbers.push(number);
          }
          numbers.forEach((number) => {
            simsBets.entries[user].names.push(simsBets.names[Number(number)]);
          });
          chatClient.say(
            channel,
            `@${user} deine Wette ist eingetragen: ${simsBets.entries[user].names[0]}, ${simsBets.entries[user].names[1]} und ${simsBets.entries[user].names[2]}. Viel Glück!`
          );
          logger(`wetten: newEntry [${user}]`);
          logger('writeFile ./JSON/sims/simsBets.json');
          await fs.promises.writeFile('./JSON/sims/simsBets.json', JSON.stringify(simsBets, null, 4), 'utf8');
          return;
        } else {
          chatClient.say(channel, `@${user} bitte gib drei Zahlen zwischen 1-${simsBets.names.length} ein.`);
          logger(`wetten: argsErrorLength`);
          return;
        }
      }

      let argsErrorNumber: boolean = false;
      let argsErrorInteger: boolean = false;
      let argsErrorRange: boolean = false;
      args.forEach((number) => {
        if (isNaN(Number(number))) {
          argsErrorNumber = true;
        } else if (!Number.isInteger(Number(number))) {
          argsErrorInteger = true;
        } else if (Number(number) < 1 || Number(number) > simsBets.names.length) {
          argsErrorRange = true;
        }
      });
      if (argsErrorNumber || argsErrorRange) {
        chatClient.say(channel, `@${user} bitte gib drei Zahlen zwischen 1-${simsBets.names.length} ein.`);
        logger(`wetten: argsError`);
        return;
      } else if (argsErrorInteger) {
        chatClient.say(channel, `@${user} bitte gib drei ganze Zahlen zwischen 1-${simsBets.names.length} ein.`);
        logger(`wetten: argsError`);
        return;
      }

      //neue Wette
      simsBets.entries[user] = { names: [] };
      args.forEach((number) => {
        simsBets.entries[user].names.push(simsBets.names[Number(number) - 1]);
      });
      chatClient.say(
        channel,
        `@${user} deine Wette ist eingetragen: ${simsBets.entries[user].names[0]}, ${simsBets.entries[user].names[1]} und ${simsBets.entries[user].names[2]}. Viel Glück!`
      );
      logger(`wetten: newEntry [${user}]`);
      logger('writeFile ./JSON/sims/simsBets.json');
      await fs.promises.writeFile('./JSON/sims/simsBets.json', JSON.stringify(simsBets, null, 4), 'utf8');
    } else {
      //Wettbüro geschlossen
      if (simsBets.entries[user] != null) {
        //hat gewettet
        if (simsBets.ziel.some((name) => simsBets.entries[user].names.includes(name))) {
          chatClient.say(
            channel,
            `@${user} du bist im Lostopf HYPEE mit deinen  Wett-Sims: ${simsBets.entries[user].names[0]}, ${simsBets.entries[user].names[1]} und ${simsBets.entries[user].names[2]}`
          );
          logger(`wetten: [${user}]`);
        } else {
          chatClient.say(
            channel,
            `@${user} deine  Wett-Sims sind: ${simsBets.entries[user].names[0]}, ${simsBets.entries[user].names[1]} und ${simsBets.entries[user].names[2]}`
          );
          logger(`wetten: [${user}]`);
        }
      } else {
        chatClient.say(
          channel,
          `@${user} leider scheinst du keinen Eintrag zu haben und das Wettbüro ist bereits geschlossen.`
        );
        logger(`wetten: closed [${user}]`);
      }
    }
  });
  //#endregion Sims

  //#region Chat Events
  chatClient.onSub((channel, user) => {
    chatClient.say(channel, `@${user} ist jetzt ein Ehrenhuhn:Hahn!`);
    logger(`sub [${user}, 1]`);
  });

  chatClient.onResub((channel, user, subInfo) => {
    chatClient.say(channel, `@${user} ist schon ${subInfo.months} Monate Ehrenhuhn:Hahn! <3`);
    logger(`reSub [${user}, ${subInfo.months}]`);
  });

  const giftCounts = new Map<string | undefined, number>();

  chatClient.onCommunitySub((channel, user, subInfo) => {
    const previousGiftCount = giftCounts.get(user) ?? 0;
    giftCounts.set(user, previousGiftCount + subInfo.count);
    if (subInfo.count == 1) {
      chatClient.say(channel, `Vielen Dank an @${user} für ${subInfo.count} geschenktes Federkleid!`);
    } else {
      chatClient.say(channel, `Vielen Dank an @${user} für ${subInfo.count} geschenkte Federkleider!`);
    }
    logger(`giftRnd [${user}, ${subInfo.count}]`);
  });

  chatClient.onSubGift((channel, recipient, subInfo) => {
    let gifter: string = '';
    subInfo.gifter === undefined ? (gifter = 'ananonymousgifter') : (gifter = subInfo.gifter);
    const previousGiftCount = giftCounts.get(gifter) ?? 0;
    if (previousGiftCount > 0) {
      giftCounts.set(gifter, previousGiftCount - 1);
    } else {
      if (subInfo.gifter === undefined) {
        chatClient.say(channel, `Vielen Dank an das anonyme Huhn für das geschenkte Federkleid an @${recipient}!`);
        logger(`giftOne [anonym]`);
      } else {
        chatClient.say(channel, `Vielen Dank an @${subInfo.gifter} für das geschenkte Federkleid an @${recipient}!`);
        logger(`giftOne [${subInfo.gifter!}]`);
      }
    }
  });

  chatClient.onGiftPaidUpgrade((channel, user, subInfo) => {
    chatClient.say(channel, `@${user} verlängert das geschenkte Federkleid von @${subInfo.gifter}! <3`);
    logger(` [${user} by ${subInfo.gifter}]`);
  });

  chatClient.onRaid((channel, user, raidInfo) => {
    let welcomeText: string = '';
    switch (user) {
      case 'h3adless':
        welcomeText = `Haltet eure Köpfe fest! Danke an @${raidInfo.displayName} für den Raid mit ${raidInfo.viewerCount} kopflosen Hühnchen! Ihr findet ${raidInfo.displayName} unter www.twitch.tv/${user} <3`;
        break;
      case 'op_tim_al':
        welcomeText = `Tim, Tim, Tim, Tim, Tim! Danke an @${raidInfo.displayName} für den Raid mit ${raidInfo.viewerCount} optimierten Hühnchen! Ihr findet ${raidInfo.displayName} unter www.twitch.tv/${user} <3`;
        break;
      default:
        welcomeText = `Vielen lieben Dank an @${raidInfo.displayName} für den Raid mit ${raidInfo.viewerCount} Hühnchen! Ihr findet ${raidInfo.displayName} unter www.twitch.tv/${user} <3`;
        break;
    }
    setTimeout(function () {
      chatClient.action(channel, welcomeText);
    }, 8000);
    if (raidInfo.viewerCount >= 3) {
      setTimeout(function () {
        chatClient.action(channel, `!so @${raidInfo.displayName}`);
      }, 15000);
      setTimeout(function () {
        chatClient.say(channel, `!name`);
      }, 20000);
    }
    logger(`raid by ${raidInfo.displayName} [${raidInfo.viewerCount}]`);
  });
  //#endregion Chat Events

  //#region Followers

  var currentFollowers: number = (await apiClient.users.getFollows({ followedUser: channelID })).total;
  logger(`followers: ${currentFollowers}`);

  const bannableNames: string[] = ['hoss', '00312', 'blueberrydogs'];

  const replaceableLetters: string[] = ['b', 'e', 'i', 'l', 'o', 's', 't'];
  var bannableVariations: string[] = [];
  bannableVariations = bannableVariations.concat(bannableNames);

  for (let i = 0; i < bannableNames.length; i++) {
    const name: string = bannableNames[i];
    let replaceableLetterIndexes: number[] = [];
    for (let letterIndex = 0; letterIndex < name.length; letterIndex++) {
      if (replaceableLetters.includes(name[letterIndex])) {
        replaceableLetterIndexes.push(letterIndex);
      }
    }
    const code: string[] = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n',
      'o',
      'p',
      'q',
      'r',
      's',
      't',
      'u',
      'v',
      'w',
      'x',
      'y',
      'z',
    ];
    let replaceableLetterIndexesCode: string[] = [];
    for (let letterIndex = 0; letterIndex < name.length; letterIndex++) {
      if (replaceableLetterIndexes.includes(letterIndex)) {
        replaceableLetterIndexesCode.push(code[letterIndex]);
      }
    }
    const combinations: string[] = getCombinations(replaceableLetterIndexesCode);
    for (let j = 0; j < combinations.length; j++) {
      const combinationArgs: string[] = combinations[j].split('');
      let combinationArray: number[] = [];
      for (let k = 0; k < combinationArgs.length; k++) {
        combinationArray.push(code.indexOf(combinationArgs[k]));
      }
      let newVariant: string = name;
      for (let l = 0; l < combinationArray.length; l++) {
        let letterToReplace: string = name[combinationArray[l]];
        let replacement: string = '';
        switch (letterToReplace) {
          case 'b':
            replacement = '8';
            break;
          case 'e':
            replacement = '3';
            break;
          case 'i':
            replacement = '1';
            break;
          case 'l':
            replacement = '1';
            break;
          case 'o':
            replacement = '0';
            break;
          case 's':
            replacement = '5';
            break;
          case 't':
            replacement = '7';
            break;
        }
        newVariant = replaceAt(newVariant, combinationArray[l], replacement);
      }
      bannableVariations.push(newVariant);
    }
  }

  // const followerSubscription = await listener.subscribeToChannelFollowEvents(
  //   channelID,
  //   async (e) => {
  //     logger(`${e.userDisplayName} ist gefolgt.`);
  //     if (
  //       bannableVariations.some((userName) =>
  //         e.userDisplayName.toLowerCase().includes(userName)
  //       )
  //     ) {
  //       chatClient.ban(
  //         channel,
  //         e.userDisplayName,
  //         `Automatischer Ban wegen Verdacht auf "Hoss" Account. Bitte benutze die Anfrage zur Aufhebung einer Sperre, solltest du ein echter Mensch sein.`
  //       );
  //       logger(`BAN: hoss? ${e.userDisplayName}`);
  //     }
  //     currentFollowers = (
  //       await apiClient.users.getFollows({ followedUser: channelID })
  //     ).total;
  //     logger(`new followers: ${currentFollowers}`);
  //     if (currentFollowers % 100 == 0) {
  //       chatClient.action(
  //         channel,
  //         `Neuer Followermeilenstein! Iken hat ${currentFollowers} Follower!`
  //       );
  //     }
  //     followerStatistic(e);
  //   }
  // );
  //#endregion Followers

  //#region timer
  const timer = new Timer(chatClient, channel);
  commandHandler.addCommand('timer', true, 3, 0, ({ args, user }) => {
    switch (args[0]) {
      case 'absolut':
        if (timer.timerStatus == true) {
          chatClient.say(channel, `Es läuft bereits ein Timer.`);
          logger('timer [already running]');
          return;
        }
        if (isNaN(Number(args[1]))) {
          chatClient.say(channel, `@${user} bitte eine Zahl [Minuten] eingeben.`);
          logger('timer invalid');
          return;
        }
        var duration: number = Number(args[1]) * 60 * 1000;
        var text: string[] = args.slice(2);
        timer.an(duration, text);
        break;
      case 'bis':
        if (timer.timerStatus == true) {
          chatClient.say(channel, `Es läuft bereits ein Timer.`);
          logger('timer [already running]');
        }
        const endpointSplit: string[] = args[1].split(':');
        if (endpointSplit.length != 3) {
          chatClient.say(channel, `@${user} bitte eine Zeit hh:mm:ss eingeben.`);
          logger('timer invalid');
          return;
        }
        const timecode: number[] = [
          Number(args[1].split(':')[0]),
          Number(args[1].split(':')[1]),
          Number(args[1].split(':')[2]),
        ];
        let endpointDate = new Date();
        endpointDate.setHours(timecode[0]);
        endpointDate.setMinutes(timecode[1]);
        endpointDate.setSeconds(timecode[2]);
        const endpointTime = endpointDate.getTime();
        var duration: number = endpointTime - Date.now();
        if (duration <= 0) {
          chatClient.say(channel, `Bitte wähle eine Zeit in der Zukunft.`);
          logger('timer [invalid]');
          return;
        }
        var text: string[] = args.slice(2);
        timer.an(duration, text);
        logger(`timeran`);
        break;
      case 'aus':
        timer.aus();
        logger('timeraus');
        break;
      default:
        chatClient.say(channel, `@${user} "absolut", "bis, oder "aus" eingeben.`);
        logger('timer invalid');
        break;
    }
  });

  //!time
  commandHandler.addCommand('time', true, 0, 5, ({ user }) => {
    if (!timer.timerStatus) {
      chatClient.say(channel, `@${user} derzeit ist kein Timer aktiv.`);
      logger('timer invalid');
      return;
    }
    const now: number = Date.now();

    let timeLeft: number = (timer.length - (now - timer.start)) / 60000;
    let minutes: number = Math.floor(timeLeft);
    let minText: string = 'Minuten';
    if (minutes == 1) minText = 'Minute';
    let seconds: number = Math.floor((timeLeft % 1) * 60);
    let secText: string = 'Sekunden';
    if (seconds == 1) secText = 'Sekunde';

    chatClient.say(channel, `Verbleibende Zeit: ${minutes} ${minText} und ${seconds} ${secText}.`);
    logger(`time: ${minutes} ${minText} & ${seconds} ${secText}`);
  });
  //#endregion timer

  //#region Verlosung
  logger('readFile ./JSON/mysticWords.json');
  const mysticWords: string[] = JSON.parse(await fs.promises.readFile('./JSON/mysticWords.json', 'utf8'))[
    'mysticWords'
  ];
  const verlosung = new Verlosung(chatClient, channel, mysticWords);
  //!einzelverlosung
  commandHandler.addCommand(
    'einzelverlosung',
    true,
    3,
    0,
    ({ args, user }) => {
      if (verlosung.timerStatus) {
        chatClient.say(channel, `Es läuft bereits eine Verlosung. (!verlosungsstop zum abbrechen.)`);
        return;
      }
      if (isNaN(Number(args[0]))) {
        chatClient.say(channel, `@${user} bitte gib eine Zeit in Minuten an.`);
        return;
      }
      const timeMin: number = Number(args[0]);
      const timeMS: number = timeMin * 60 * 1000;
      const textArgs: string[] = args.slice(1);
      const text: string = textArgs.join(' ');

      verlosung.an(timeMS, text, 1);
      logger(`einzelverlosung gestartet [${timeMin}]`);
    },
    3
  );

  //!multiverlosung
  /**
   * !multiverlosung [min] [winners] [text]
   */
  commandHandler.addCommand(
    'multiverlosung',
    true,
    3,
    1,
    ({ args, user }) => {
      if (verlosung.timerStatus) {
        chatClient.say(channel, `Es läuft bereits eine Verlosung. (!verlosungsstop zum abbrechen.)`);
        return;
      }
      if (isNaN(Number(args[0]))) {
        chatClient.say(channel, `@${user} bitte gib eine Zeit in Minuten an.`);
        return;
      }
      if (isNaN(Number(args[1]))) {
        chatClient.say(channel, `@${user} bitte gib eine Anzahl Gewinner:innen an.`);
        return;
      }
      const timeMin: number = Number(args[0]);
      const timeMS: number = timeMin * 60 * 1000;
      const winnerNumber: number = Number(args[1]);
      const textArgs: string[] = args.slice(2);
      const text: string = textArgs.join(' ');

      verlosung.an(timeMS, text, winnerNumber);
      logger(`multiverlosung gestartet [${timeMin}]`);
    },
    3
  );

  //!join
  commandHandler.addCommand('join', true, 0, 0, ({ user }) => {
    if (!verlosung.timerStatus) return;
    verlosung.join(user);
  });

  //!verlosungsstop
  commandHandler.addCommand(['verlosungsstop', 'verlosungstop', 'verlosungstop'], true, 3, 0, ({}) => {
    verlosung.aus();
    logger(`!verlosungsstop`);
  });

  //!verlosung
  commandHandler.addCommand('verlosung', true, 0, 5, ({}) => {
    if (!verlosung.timerStatus) {
      chatClient.say(channel, `Derzeit läuft keine Verlosung.`);
      logger(`!verlosung`);
      return;
    }
    const now: number = Date.now();
    const timeLeft: number = (verlosung.start + verlosung.length - now) / 60000;
    let minutes: string = Math.floor(timeLeft) < 10 ? `0${Math.floor(timeLeft)}` : `${Math.floor(timeLeft)}`;
    let seconds: string =
      Math.floor((timeLeft % 1) * 60) < 10
        ? `0${Math.floor((timeLeft % 1) * 60)}`
        : `${Math.floor((timeLeft % 1) * 60)}`;
    chatClient.say(
      channel,
      `Zu gewinnen gibt es ${verlosung.text}! Du hast noch ${minutes}:${seconds} Minuten Zeit, um mit !join bei der Verlosung teilzunehmen. Viel Glück!`
    );
    logger(`!verlosung`);
  });
  //#endregion verlosung

  //#region Security
  //!bantest
  commandHandler.addCommand(
    'bantest',
    true,
    3,
    0,
    async ({ args, user }) => {
      const startTime = new Date();
      startTime.setMilliseconds(0);
      const endTime = new Date();
      endTime.setMilliseconds(0);

      switch (args.length) {
        case 4:
          for (let i = 0; i < 4; i++) {
            if (isNaN(Number(args[i]))) {
              chatClient.say(channel, `@${user} bitte Nummern eingeben.`);
              logger('banInvalid');
              return;
            }
          }
          startTime.setHours(Number(args[0]));
          startTime.setMinutes(Number(args[1]));
          startTime.setSeconds(0);

          endTime.setHours(Number(args[2]));
          endTime.setMinutes(Number(args[3]));
          endTime.setSeconds(0);
          break;
        case 6:
          for (let i = 0; i < 6; i++) {
            if (isNaN(Number(args[i]))) {
              chatClient.say(channel, `@${user} bitte Nummern eingeben.`);
              logger('banInvalid');
              return;
            }
          }
          startTime.setHours(Number(args[0]));
          startTime.setMinutes(Number(args[1]));
          startTime.setSeconds(Number(args[2]));

          endTime.setHours(Number(args[3]));
          endTime.setMinutes(Number(args[4]));
          endTime.setSeconds(Number(args[5]));

          break;
        case 8:
          for (let i = 0; i < 8; i++) {
            if (isNaN(Number(args[i]))) {
              chatClient.say(channel, `@${user} bitte Nummern eingeben.`);
              logger('banInvalid');
              return;
            }
          }
          startTime.setDate(Number(args[0]));
          startTime.setMonth(Number(args[1]) - 1);
          startTime.setHours(Number(args[2]));
          startTime.setMinutes(Number(args[3]));
          startTime.setSeconds(0);

          endTime.setDate(Number(args[4]));
          endTime.setMonth(Number(args[5]) - 1);
          endTime.setHours(Number(args[6]));
          endTime.setMinutes(Number(args[7]));
          endTime.setSeconds(0);
          break;
        case 10:
          for (let i = 0; i < 10; i++) {
            if (isNaN(Number(args[i]))) {
              chatClient.say(channel, `@${user} bitte Nummern eingeben.`);
              logger('banInvalid');
              return;
            }
          }
          startTime.setDate(Number(args[0]));
          startTime.setMonth(Number(args[1]) - 1);
          startTime.setHours(Number(args[2]));
          startTime.setMinutes(Number(args[3]));
          startTime.setSeconds(Number(args[4]));

          endTime.setDate(Number(args[5]));
          endTime.setMonth(Number(args[6]) - 1);
          endTime.setHours(Number(args[7]));
          endTime.setMinutes(Number(args[8]));
          endTime.setSeconds(Number(args[9]));
          break;
        default:
          chatClient.say(
            channel,
            `@${user} ungültiges Format. Erlaubt: [sStd] [sMin] [eStd] [eMin] / [sStd] [sMin] [sSek] [eStd] [eMin] [eSek] / [sMon] [sTag] [sStd] [sMin] [eMon] [eTag] [eStd] [eMin] / [sMon] [sTag] [sStd] [sMin] [sSek] [eMon] [eTag] [eStd] [eMin] [eSek]`
          );
          logger('banInvalid');
          return;
      }

      const followersListHelix = apiClient.users.getFollowsPaginated({
        followedUser: channelID,
      });
      const followersList = await followersListHelix.getAll();
      const banList = followersList.filter((follow) => follow.followDate >= startTime && follow.followDate <= endTime);

      if (banList.length > 0) {
        chatClient.say(
          channel,
          `${size(banList)} User für den Zeitraum gefunden, von ${followersList[0].userName} bis ${
            followersList[size(banList) - 1].userName
          }.`
        );
      } else {
        chatClient.say(channel, 'Für den angegeben Zeitraum konnten keine follows gefunden werden.');
      }
      logger(`bantest [${banList.length}]`);
    },
    3
  );

  //!ban
  commandHandler.addCommand(
    'ban',
    false,
    3,
    0,
    async ({ args, user }) => {
      const startTime = new Date();
      startTime.setMilliseconds(0);
      const endTime = new Date();
      endTime.setMilliseconds(0);

      switch (args.length) {
        case 4:
          for (let i = 0; i < 4; i++) {
            if (isNaN(Number(args[i]))) {
              chatClient.say(channel, `@${user} bitte Nummern eingeben.`);
              logger('banInvalid');
              return;
            }
          }
          startTime.setHours(Number(args[0]));
          startTime.setMinutes(Number(args[1]));
          startTime.setSeconds(0);

          endTime.setHours(Number(args[2]));
          endTime.setMinutes(Number(args[3]));
          endTime.setSeconds(0);
          break;
        case 6:
          for (let i = 0; i < 6; i++) {
            if (isNaN(Number(args[i]))) {
              chatClient.say(channel, `@${user} bitte Nummern eingeben.`);
              logger('banInvalid');
              return;
            }
          }
          startTime.setHours(Number(args[0]));
          startTime.setMinutes(Number(args[1]));
          startTime.setSeconds(Number(args[2]));

          endTime.setHours(Number(args[3]));
          endTime.setMinutes(Number(args[4]));
          endTime.setSeconds(Number(args[5]));

          break;
        case 8:
          for (let i = 0; i < 8; i++) {
            if (isNaN(Number(args[i]))) {
              chatClient.say(channel, `@${user} bitte Nummern eingeben.`);
              logger('banInvalid');
              return;
            }
          }
          startTime.setDate(Number(args[0]));
          startTime.setMonth(Number(args[1]) - 1);
          startTime.setHours(Number(args[2]));
          startTime.setMinutes(Number(args[3]));
          startTime.setSeconds(0);

          endTime.setDate(Number(args[4]));
          endTime.setMonth(Number(args[5]) - 1);
          endTime.setHours(Number(args[6]));
          endTime.setMinutes(Number(args[7]));
          endTime.setSeconds(0);
          break;
        case 10:
          for (let i = 0; i < 10; i++) {
            if (isNaN(Number(args[i]))) {
              chatClient.say(channel, `@${user} bitte Nummern eingeben.`);
              logger('banInvalid');
              return;
            }
          }
          startTime.setDate(Number(args[0]));
          startTime.setMonth(Number(args[1]) - 1);
          startTime.setHours(Number(args[2]));
          startTime.setMinutes(Number(args[3]));
          startTime.setSeconds(Number(args[4]));

          endTime.setDate(Number(args[5]));
          endTime.setMonth(Number(args[6]) - 1);
          endTime.setHours(Number(args[7]));
          endTime.setMinutes(Number(args[8]));
          endTime.setSeconds(Number(args[9]));
          break;
        default:
          chatClient.say(
            channel,
            `@${user} ungültiges Format. Erlaubt: [sStd] [sMin] [eStd] [eMin] / [sStd] [sMin] [sSek] [eStd] [eMin] [eSek] / [sMon] [sTag] [sStd] [sMin] [eMon] [eTag] [eStd] [eMin] / [sMon] [sTag] [sStd] [sMin] [sSek] [eMon] [eTag] [eStd] [eMin] [eSek]`
          );
          logger('banInvalid');
          return;
      }
      const followersListHelix = apiClient.users.getFollowsPaginated({
        followedUser: channelID,
      });
      const followersList = await followersListHelix.getAll();

      const banList = followersList.filter((user) => user.followDate >= startTime && user.followDate <= endTime);

      const massBanEvent = banList.map(async (ban) => {
        await chatClient
          .ban(channel, ban.userName, 'Während Follower-Bot gefollowed. Falls du ein echter Mensch bist, bitte melden.')
          .then(() => console.log(`${ban.userName} wurde gebannt.`))
          .catch((error) => console.log(`${ban.userName} ist bereits gebannt.`));
      });
      chatClient.say(channel, `Es wurden ${size(banList)} Bots gebannt.`);
      if (size(banList) > 0) chatClient.say(channel, `CATDANCE Bite my shiny metal ass! CATDANCE`);
      logger('ban');
    },
    3
  );

  //!panic
  commandHandler.addCommand(
    ['panic', 'panik'],
    true,
    3,
    1,
    async ({}) => {
      await chatClient.clear(channel);
      await chatClient.enableSubsOnly(channel);
      chatClient.action(channel, 'Safe mode engaged');
      logger(`PANIC MODE ENGAGED`);
    },
    3
  );
  //#endregion Security

  //#region Special Greetings
  commandHandler.addCommand(['specialGreetings'], true, 0, 2, async ({ user, msg, args }) => {
    if (msg.userInfo.isBroadcaster || msg.userInfo.isMod || msg.userInfo.displayName === 'illnux') {
      if (args[0] === 'reload') {
        specialGreetings.reloadGreetings();
      }
    }
  });
  //#endregion Special Greetings

  //#region Statistics
  // // Viewers
  // logger('readFile ./statistics/viewers.json');
  // const viewers: {
  //   viewers: [
  //     {
  //       date: string;
  //       time: string;
  //       game: string | undefined;
  //       viewers: number;
  //     }
  //   ];
  // } = JSON.parse(await fs.promises.readFile('./statistics/viewers.json', 'utf8'));
  // const csvWriterViewers = createObjectCsvWriter({
  //   path: statisticsPath + 'viewers.csv',
  //   header: [
  //     { id: 'date', title: 'date' },
  //     { id: 'time', title: 'time' },
  //     { id: `game`, title: `game` },
  //     { id: 'viewers', title: 'viewers' },
  //   ],
  //   append: false,
  // });
  // setInterval(async function () {
  //   if ((await apiClient.streams.getStreamByUserId(channelID))?.id === undefined) return; //stream offline
  //   const currentViewers: number = (await apiClient.streams.getStreamByUserId(channelID))!.viewers;
  //   const now: Date = new Date();
  //   const d: string = now.getDate() < 10 ? `0${now.getDate()}` : `${now.getDate()}`;
  //   const mo: string = now.getMonth() < 9 ? `0${now.getMonth() + 1}` : `${now.getMonth() + 1}`;
  //   const y: number = now.getFullYear();
  //   const date: string = `${d}.${mo}.${y}`;
  //   const h: string = now.getHours() < 10 ? `0${now.getHours()}` : `${now.getHours()}`;
  //   const mi: string = now.getMinutes() < 10 ? `0${now.getMinutes()}` : `${now.getMinutes()}`;
  //   const time: string = `${h}:${mi}`;
  //   const currentGameHelix = await apiClient.channels.getChannelInfo(channelID);
  //   const currentGame: string | undefined = currentGameHelix?.gameName;
  //   const viewerData = {
  //     date: date,
  //     time: time,
  //     game: currentGame,
  //     viewers: currentViewers,
  //   };
  //   viewers.viewers.push(viewerData);
  //   await csvWriterViewers.writeRecords(viewers.viewers);
  //   logger('writeFile ./statistics/viewers.json');
  //   await fs.promises.writeFile('./statistics/viewers.json', JSON.stringify(viewers, null, 4), 'utf8');
  // }, 600000);

  // //Raids
  // logger('readFile ./statistics/raids.json');
  // const raids: {
  //   raids: [
  //     {
  //       date: string;
  //       time: string;
  //       game: string | undefined;
  //       name: string;
  //       addedViewers: number;
  //     }
  //   ];
  // } = JSON.parse(await fs.promises.readFile('./statistics/raids.json', 'utf8'));
  // const csvWriterRaids = createObjectCsvWriter({
  //   path: statisticsPath + 'raids.csv',
  //   header: [
  //     { id: 'date', title: 'date' },
  //     { id: 'time', title: 'time' },
  //     { id: `game`, title: `game` },
  //     { id: 'name', title: 'name' },
  //     { id: 'addedViewers', title: 'addedViewers' },
  //   ],
  //   append: false,
  // });
  // chatClient.onRaid(async (channel, user, raidInfo, msg) => {
  //   const now: Date = new Date();
  //   const d: string = now.getDate() < 10 ? `0${now.getDate()}` : `${now.getDate()}`;
  //   const mo: string = now.getMonth() < 9 ? `0${now.getMonth() + 1}` : `${now.getMonth() + 1}`;
  //   const y: number = now.getFullYear();
  //   const date: string = `${d}.${mo}.${y}`;
  //   const h: string = now.getHours() < 10 ? `0${now.getHours()}` : `${now.getHours()}`;
  //   const mi: string = now.getMinutes() < 10 ? `0${now.getMinutes()}` : `${now.getMinutes()}`;
  //   const time: string = `${h}:${mi}`;
  //   const currentGameHelix = await apiClient.channels.getChannelInfo(channelID);
  //   const currentGame: string | undefined = currentGameHelix?.gameName;
  //   const raidData = {
  //     date: date,
  //     time: time,
  //     game: currentGame,
  //     name: raidInfo.displayName,
  //     addedViewers: raidInfo.viewerCount,
  //   };
  //   raids.raids.push(raidData);
  //   csvWriterRaids.writeRecords(raids.raids);
  //   logger('writeFile ./statistics/raids.json');
  //   await fs.promises.writeFile('./statistics/raids.json', JSON.stringify(raids, null, 4), 'utf8');
  // });

  // //Follows
  // logger('readFile ./statistics/followers.json');
  // const followers: {
  //   follows: [
  //     {
  //       date: string;
  //       time: string;
  //       game: string | undefined;
  //       name: string;
  //       totalFollowers: number;
  //     }
  //   ];
  // } = JSON.parse(await fs.promises.readFile('./statistics/followers.json', 'utf8'));
  // const csvWriterFollows = createObjectCsvWriter({
  //   path: statisticsPath + 'follows.csv',
  //   header: [
  //     { id: 'date', title: 'date' },
  //     { id: 'time', title: 'time' },
  //     { id: `game`, title: `game` },
  //     { id: 'name', title: 'name' },
  //     { id: `totalFollowers`, title: `totalFollowers` },
  //   ],
  //   append: false,
  // });
  // const followerStatistic = async function (e: EventSubChannelFollowEvent) {
  //   const now: Date = new Date();
  //   const date: string = format(now, 'dd.MM.yyyy');

  //   const time: string = format(now, 'HH:mm');
  //   const currentGameHelix = await apiClient.channels.getChannelInfo(channelID);
  //   const currentGame: string | undefined = currentGameHelix?.gameName;
  //   const currentFollowers: number = (await apiClient.users.getFollows({ followedUser: channelID })).total;
  //   const followData = {
  //     date: date,
  //     time: time,
  //     game: currentGame,
  //     name: e.userDisplayName,
  //     totalFollowers: currentFollowers,
  //   };
  //   followers.follows.push(followData);
  //   csvWriterFollows.writeRecords(followers.follows);
  //   logger('writeFile ./statistics/followers.json');
  //   await fs.promises.writeFile('./statistics/followers.json', JSON.stringify(followers, null, 4), 'utf8');
  // };

  // //Subscriptions
  // logger('readFile ./statistics/subscriptions.json');
  // const subscriptions: {
  //   subs: [
  //     {
  //       date: string;
  //       time: string;
  //       game: string | undefined;
  //       name: string;
  //       tier: string;
  //       isGift: boolean;
  //       gifter: string;
  //     }
  //   ];
  //   gifts: [
  //     {
  //       name: string;
  //       gifts: {
  //         1000: number;
  //         2000: number;
  //         3000: number;
  //       };
  //     }
  //   ];
  // } = JSON.parse(await fs.promises.readFile('./statistics/subscriptions.json', 'utf8'));
  // const csvWriterSubscriptions = createObjectCsvWriter({
  //   path: statisticsPath + 'subscriptions.csv',
  //   header: [
  //     { id: 'date', title: 'date' },
  //     { id: 'time', title: 'time' },
  //     { id: `game`, title: `game` },
  //     { id: 'name', title: 'name' },
  //     { id: 'tier', title: 'tier' },
  //     { id: 'isGift', title: 'isGift' },
  //     { id: 'gifter', title: 'gifter' },
  //   ],
  //   append: false,
  // });

  // chatClient.onSub(async (channel, user, subInfo, msg) => {
  //   const now: Date = new Date();
  //   const d: string = now.getDate() < 10 ? `0${now.getDate()}` : `${now.getDate()}`;
  //   const mo: string = now.getMonth() < 9 ? `0${now.getMonth() + 1}` : `${now.getMonth() + 1}`;
  //   const y: number = now.getFullYear();
  //   const date: string = `${d}.${mo}.${y}`;
  //   const h: string = now.getHours() < 10 ? `0${now.getHours()}` : `${now.getHours()}`;
  //   const mi: string = now.getMinutes() < 10 ? `0${now.getMinutes()}` : `${now.getMinutes()}`;
  //   const time: string = `${h}:${mi}`;
  //   const currentGameHelix = await apiClient.channels.getChannelInfo(channelID);
  //   const currentGame: string | undefined = currentGameHelix?.gameName;
  //   const subData = {
  //     date: date,
  //     time: time,
  //     game: currentGame,
  //     name: user,
  //     tier: subInfo.plan,
  //     isGift: false,
  //     gifter: '',
  //   };
  //   subscriptions.subs.push(subData);
  //   csvWriterSubscriptions.writeRecords(subscriptions.subs);
  //   logger('writeFile ./statistics/subscriptions.json');
  //   await fs.promises.writeFile('./statistics/subscriptions.json', JSON.stringify(subscriptions, null, 4), 'utf8');
  // });
  // chatClient.onResub(async (channel, user, subInfo, msg) => {
  //   const now: Date = new Date();
  //   const d: string = now.getDate() < 10 ? `0${now.getDate()}` : `${now.getDate()}`;
  //   const mo: string = now.getMonth() < 9 ? `0${now.getMonth() + 1}` : `${now.getMonth() + 1}`;
  //   const y: number = now.getFullYear();
  //   const date: string = `${d}.${mo}.${y}`;
  //   const h: string = now.getHours() < 10 ? `0${now.getHours()}` : `${now.getHours()}`;
  //   const mi: string = now.getMinutes() < 10 ? `0${now.getMinutes()}` : `${now.getMinutes()}`;
  //   const time: string = `${h}:${mi}`;
  //   const currentGameHelix = await apiClient.channels.getChannelInfo(channelID);
  //   const currentGame: string | undefined = currentGameHelix?.gameName;
  //   const subData = {
  //     date: date,
  //     time: time,
  //     game: currentGame,
  //     name: user,
  //     tier: subInfo.plan,
  //     isGift: false,
  //     gifter: '',
  //   };
  //   subscriptions.subs.push(subData);
  //   csvWriterSubscriptions.writeRecords(subscriptions.subs);
  //   logger('writeFile ./statistics/subscriptions.json');
  //   await fs.promises.writeFile('./statistics/subscriptions.json', JSON.stringify(subscriptions, null, 4), 'utf8');
  // });
  // chatClient.onSubGift(async (channel, user, subInfo, msg) => {
  //   const now: Date = new Date();
  //   const d: string = now.getDate() < 10 ? `0${now.getDate()}` : `${now.getDate()}`;
  //   const mo: string = now.getMonth() < 9 ? `0${now.getMonth() + 1}` : `${now.getMonth() + 1}`;
  //   const y: number = now.getFullYear();
  //   const date: string = `${d}.${mo}.${y}`;
  //   const h: string = now.getHours() < 10 ? `0${now.getHours()}` : `${now.getHours()}`;
  //   const mi: string = now.getMinutes() < 10 ? `0${now.getMinutes()}` : `${now.getMinutes()}`;
  //   const time: string = `${h}:${mi}`;
  //   const currentGameHelix = await apiClient.channels.getChannelInfo(channelID);
  //   const currentGame: string | undefined = currentGameHelix?.gameName;
  //   let gifter: string = '';
  //   subInfo.gifter === undefined ? (gifter = 'ananonymousgifter') : (gifter = subInfo.gifter);
  //   const subData = {
  //     date: date,
  //     time: time,
  //     game: currentGame,
  //     name: user,
  //     tier: subInfo.plan,
  //     isGift: true,
  //     gifter: gifter,
  //   };
  //   subscriptions.subs.push(subData);

  //   let exists: boolean = false;
  //   subscriptions.gifts.map((entry) => {
  //     if (entry.name == subData.gifter) {
  //       switch (subInfo.plan) {
  //         case '1000':
  //           entry.gifts[1000] += 1;
  //           break;
  //         case '2000':
  //           entry.gifts[2000] += 1;
  //           break;
  //         case '3000':
  //           entry.gifts[3000] += 1;
  //           break;
  //       }
  //       exists = true;
  //     }
  //   });
  //   if (!exists) {
  //     switch (subInfo.plan) {
  //       case '1000':
  //         subscriptions.gifts.push({
  //           name: gifter,
  //           gifts: {
  //             1000: 1,
  //             2000: 0,
  //             3000: 0,
  //           },
  //         });
  //         break;
  //       case '2000':
  //         subscriptions.gifts.push({
  //           name: gifter,
  //           gifts: {
  //             1000: 0,
  //             2000: 1,
  //             3000: 0,
  //           },
  //         });
  //         break;
  //       case '3000':
  //         subscriptions.gifts.push({
  //           name: gifter,
  //           gifts: {
  //             1000: 0,
  //             2000: 0,
  //             3000: 1,
  //           },
  //         });
  //         break;
  //     }
  //   }

  //   csvWriterSubscriptions.writeRecords(subscriptions.subs);
  //   logger('writeFile ./statistics/subscriptions.json');
  //   await fs.promises.writeFile('./statistics/subscriptions.json', JSON.stringify(subscriptions, null, 4), 'utf8');
  // });

  // //bits
  // logger('readFile ./statistics/bits.json');
  // const bits: {
  //   perUser: [
  //     {
  //       name: string;
  //       amount: number;
  //     }
  //   ];
  //   timeline: [
  //     {
  //       date: string;
  //       time: string;
  //       name: string;
  //       amount: number;
  //       game: string | undefined;
  //     }
  //   ];
  // } = JSON.parse(await fs.promises.readFile('./statistics/bits.json', 'utf8'));
  // //bits per user
  // const csvWriterBitsPerUser = createObjectCsvWriter({
  //   path: statisticsPath + 'bitsPerUser.csv',
  //   header: [
  //     { id: 'name', title: 'name' },
  //     { id: 'amount', title: 'amount' },
  //   ],
  //   append: false,
  // });

  // chatClient.onMessage(async (channel, user, message, msg) => {
  //   if (msg.isCheer) {
  //     const newEntry = {
  //       name: user,
  //       amount: msg.bits,
  //     };
  //     let exists: boolean = false;
  //     bits.perUser.map((entry) => {
  //       if (entry.name == newEntry.name) {
  //         entry.amount += newEntry.amount;
  //         exists = true;
  //       }
  //     });
  //     if (!exists) bits.perUser.push(newEntry);

  //     await csvWriterBitsPerUser.writeRecords(bits.perUser);

  //     logger('writeFile ./statistics/bits.json');
  //     await fs.promises.writeFile('./statistics/bits.json', JSON.stringify(bits, null, 4), 'utf8');
  //   }
  // });
  // chatClient.onMessage(async (channel, user, message, msg) => {
  //   if (user == 'soundalerts') {
  //     const args: string[] = message.split(' ');
  //     const bitsIndex: number = args.indexOf('Bits');
  //     const bitAmount: number = Number(args[bitsIndex - 1]);
  //     const userName: string = args[0];

  //     const newEntry = {
  //       name: userName,
  //       amount: bitAmount,
  //     };

  //     let exists: boolean = false;
  //     bits.perUser.map((entry) => {
  //       if (entry.name == newEntry.name) {
  //         entry.amount += newEntry.amount;
  //         exists = true;
  //       }
  //     });
  //     if (!exists) bits.perUser.push(newEntry);

  //     await csvWriterBitsPerUser.writeRecords(bits.perUser);

  //     logger('writeFile ./statistics/bits.json');
  //     await fs.promises.writeFile('./statistics/bits.json', JSON.stringify(bits, null, 4), 'utf8');
  //   }
  // });

  // //bits timeline
  // const csvWriterBitsTimeline = createObjectCsvWriter({
  //   path: statisticsPath + 'bitsTimeline.csv',
  //   header: [
  //     { id: 'date', title: 'date' },
  //     { id: 'time', title: 'time' },
  //     { id: 'name', title: 'name' },
  //     { id: 'amount', title: 'amount' },
  //     { id: `game`, title: `game` },
  //   ],
  //   append: false,
  // });

  // chatClient.onMessage(async (channel, user, message, msg) => {
  //   if (msg.isCheer) {
  //     const now: Date = new Date();
  //     const d: string = now.getDate() < 10 ? `0${now.getDate()}` : `${now.getDate()}`;
  //     const mo: string = now.getMonth() < 9 ? `0${now.getMonth() + 1}` : `${now.getMonth() + 1}`;
  //     const y: number = now.getFullYear();
  //     const date: string = `${d}.${mo}.${y}`;
  //     const h: string = now.getHours() < 10 ? `0${now.getHours()}` : `${now.getHours()}`;
  //     const mi: string = now.getMinutes() < 10 ? `0${now.getMinutes()}` : `${now.getMinutes()}`;
  //     const time: string = `${h}:${mi}`;
  //     const currentGameHelix = await apiClient.channels.getChannelInfo(channelID);
  //     const currentGame: string | undefined = currentGameHelix?.gameName;
  //     bits.timeline.push({
  //       date: date,
  //       time: time,
  //       name: user,
  //       amount: msg.bits,
  //       game: currentGame,
  //     });

  //     await csvWriterBitsTimeline.writeRecords(bits.timeline);

  //     logger('writeFile ./statistics/bits.json');
  //     await fs.promises.writeFile('./statistics/bits.json', JSON.stringify(bits, null, 4), 'utf8');
  //   }
  // });
  // chatClient.onMessage(async (channel, user, message, msg) => {
  //   if (user == 'soundalerts') {
  //     const args: string[] = message.split(' ');
  //     const bitsIndex: number = args.indexOf('Bits');
  //     const bitAmount: number = Number(args[bitsIndex - 1]);
  //     const userName: string = args[0];
  //     const now: Date = new Date();
  //     const d: string = now.getDate() < 10 ? `0${now.getDate()}` : `${now.getDate()}`;
  //     const mo: string = now.getMonth() < 9 ? `0${now.getMonth() + 1}` : `${now.getMonth() + 1}`;
  //     const y: number = now.getFullYear();
  //     const date: string = `${d}.${mo}.${y}`;
  //     const h: string = now.getHours() < 10 ? `0${now.getHours()}` : `${now.getHours()}`;
  //     const mi: string = now.getMinutes() < 10 ? `0${now.getMinutes()}` : `${now.getMinutes()}`;
  //     const time: string = `${h}:${mi}`;
  //     const currentGameHelix = await apiClient.channels.getChannelInfo(channelID);
  //     const currentGame: string | undefined = currentGameHelix?.gameName;
  //     bits.timeline.push({
  //       date: date,
  //       time: time,
  //       name: userName,
  //       amount: bitAmount,
  //       game: currentGame,
  //     });

  //     await csvWriterBitsTimeline.writeRecords(bits.timeline);

  //     logger('writeFile ./statistics/bits.json');
  //     await fs.promises.writeFile('./statistics/bits.json', JSON.stringify(bits, null, 4), 'utf8');
  //   }
  // });

  // //chatactivity
  // logger('readFile ./statistics/chatactivity.json');
  // const chatactivity: {
  //   messages: [
  //     {
  //       date: string;
  //       time: string;
  //       game: string | undefined;
  //       messagesPer10Minutes: number;
  //     }
  //   ];
  // } = JSON.parse(await fs.promises.readFile('./statistics/chatactivity.json', 'utf8'));
  // const csvWriterChatactivity = createObjectCsvWriter({
  //   path: statisticsPath + 'chatactivity.csv',
  //   header: [
  //     { id: 'date', title: 'date' },
  //     { id: 'time', title: 'time' },
  //     { id: `game`, title: `game` },
  //     { id: 'messagesPer10Minutes', title: 'messagesPer10Minutes' },
  //   ],
  //   append: false,
  // });

  // var messagesPer10Minutes: number = 0;
  // chatClient.onMessage(async (channel, user, message, msg) => {
  //   messagesPer10Minutes += 1;
  // });

  // setInterval(async function () {
  //   if ((await apiClient.streams.getStreamByUserId(channelID))?.id === undefined) {
  //     messagesPer10Minutes = 0;
  //     return; //stream offline
  //   }
  //   const now: Date = new Date();
  //   const d: string = now.getDate() < 10 ? `0${now.getDate()}` : `${now.getDate()}`;
  //   const mo: string = now.getMonth() < 9 ? `0${now.getMonth() + 1}` : `${now.getMonth() + 1}`;
  //   const y: number = now.getFullYear();
  //   const date: string = `${d}.${mo}.${y}`;
  //   const h: string = now.getHours() < 10 ? `0${now.getHours()}` : `${now.getHours()}`;
  //   const mi: string = now.getMinutes() < 10 ? `0${now.getMinutes()}` : `${now.getMinutes()}`;
  //   const time: string = `${h}:${mi}`;
  //   const currentGameHelix = await apiClient.channels.getChannelInfo(channelID);
  //   const currentGame: string | undefined = currentGameHelix?.gameName;
  //   const newEntry = {
  //     date: date,
  //     time: time,
  //     game: currentGame,
  //     messagesPer10Minutes: messagesPer10Minutes,
  //   };
  //   chatactivity.messages.push(newEntry);

  //   await csvWriterChatactivity.writeRecords(chatactivity.messages);
  //   logger('writeFile ./statistics/chatactivity.json');
  //   await fs.promises.writeFile('./statistics/chatactivity.json', JSON.stringify(chatactivity, null, 4), 'utf8');

  //   messagesPer10Minutes = 0;
  // }, 600000);

  //#endregion Statistics

  //#region Special Events
  //Weihnachts 7-Tage Stream

  logger('readFile ./JSON/specialEvents/viewerTracking.json');
  var viewerTracking: {
    winners: string[];
    tracking: {
      [key: string]: ViewerTrackingUser;
    };
  } = JSON.parse(await fs.promises.readFile('./JSON/specialEvents/viewerTracking.json', 'utf8'));
  const chatterInterval: number = 1000 * 60; //60 Sekunden

  var trigger: string = '';
  var winner = '';
  const winningTime: number = 1000 * 60 * 60 * 12; //12h

  commandHandler.addCommand(['auswertung', 'auswerten'], true, 3, 0, async ({ user }) => {
    let candidates: string[] = [];
    // const date: Date = new Date;
    // const hour: number = date.getHours();
    // let day: number = date.getDate();
    // hour >= 15 ? day = day - 1 : true;
    // const month: number = date.getMonth() + 1;
    // const year: number = date.getFullYear();
    // const dateStamp: string = year.toString().concat(".", month.toString(), ".", day.toString());
    const dateStamp: string = '2021.12.30';
    Object.keys(viewerTracking.tracking[dateStamp]).forEach((name) => {
      if (viewerTracking.tracking[dateStamp][name].totalTime >= winningTime && !viewerTracking.winners.includes(name)) {
        candidates.push(name);
      }
    });

    let candidateMessage: string = 'Teilnahmeberechtigt sind: ';
    for (let i = 0; i < candidates.length; i++) {
      if (i == 0) {
        candidateMessage = candidateMessage.concat('@', candidates[i]);
      } else if (i == candidates.length - 1) {
        candidateMessage = candidateMessage.concat(' und @', candidates[i], '.');
      } else {
        candidateMessage = candidateMessage.concat(', @', candidates[i]);
      }
    }
    multiSay(channel, chatClient, ' ', candidateMessage);

    winner = candidates[Math.floor(Math.random() * candidates.length)];
    viewerTracking.winners.push(winner);
    trigger = user;
    logger('writeFile ./JSON/specialEvents/viewerTracking.json');
    await fs.promises.writeFile(
      './JSON/specialEvents/viewerTracking.json',
      JSON.stringify(viewerTracking, null, 4),
      'utf8'
    );
    logger(`auswertung`);
  });

  chatClient.onMessage((channel, user, message, msg) => {
    if (user == trigger) {
      if (message.toLowerCase() == 'start') {
        const mysticWords_1: string = mysticWords[Math.floor(Math.random() * mysticWords.length)];
        var mysticWords_2: string = mysticWords[Math.floor(Math.random() * mysticWords.length)];
        while (mysticWords_1 == mysticWords_2) {
          mysticWords_2 = mysticWords[Math.floor(Math.random() * mysticWords.length)];
        }
        chatClient.say(channel, `Und gewonnen hat:`);
        chatClient.action(channel, mysticWords_1);
        setTimeout(() => {
          chatClient.action(channel, mysticWords_2);
        }, 6000);
        setTimeout(() => {
          chatClient.action(channel, `@${winner}! Gratulation!`);
          winner = '';
          trigger = '';
        }, 12000);

        logger(`auswertung winner: ${winner}`);
      }
    }
  });

  var topTenTrigger: string = '';
  var topTenWinner: string = '';

  commandHandler.addCommand(
    'topTen',
    true,
    3,
    0,
    ({ user }) => {
      let allViewers: { [key: string]: number } = {};
      Object.keys(viewerTracking.tracking).forEach((date) => {
        Object.keys(viewerTracking.tracking[date]).forEach((name) => {
          let userTime: number = viewerTracking.tracking[date][name].totalTime;
          if (Object.keys(allViewers).includes(name)) {
            allViewers[name] += userTime;
          } else {
            allViewers[name] = userTime;
          }
        });
      });
      let allViewersSortable: [string, number][] = [];
      for (const [key, value] of Object.entries(allViewers)) {
        allViewersSortable.push([key, value]);
      }
      allViewersSortable.sort(function (a, b) {
        return a[1] - b[1];
      });
      let topTen: [string, number][] = allViewersSortable.slice(-10);
      let candidateMessage: string = 'Teilnahmeberechtigt sind: ';
      for (let i = 0; i < topTen.length; i++) {
        if (i == 0) {
          candidateMessage = candidateMessage.concat(
            '@',
            topTen[i][0],
            ': ',
            msToTime(topTen[i][1])[0].toString(),
            ':',
            msToTime(topTen[i][1])[1].toString(),
            ' [hh:mm]'
          );
        } else if (i == topTen.length - 1) {
          candidateMessage = candidateMessage.concat(
            ' und @',
            topTen[i][0],
            ': ',
            msToTime(topTen[i][1])[0].toString(),
            ':',
            msToTime(topTen[i][1])[1].toString(),
            ' [hh:mm]',
            '.'
          );
        } else {
          candidateMessage = candidateMessage.concat(
            ', @',
            topTen[i][0],
            ': ',
            msToTime(topTen[i][1])[0].toString(),
            ':',
            msToTime(topTen[i][1])[1].toString(),
            ' [hh:mm]'
          );
        }
      }
      chatClient.say(channel, candidateMessage);
      let candidates: string[] = [];
      for (let i = 0; i < topTen.length; i++) {
        candidates.push(topTen[i][0]);
      }
      topTenWinner = candidates[Math.floor(Math.random() * candidates.length)];
      //topTenTrigger = user;
      logger(`topTen: ${user}`);
      console.log(topTen);
    },
    3
  );

  chatClient.onMessage((channel, user, message, msg) => {
    if (user == topTenTrigger) {
      if (message.toLowerCase() == 'start') {
        const mysticWords_1: string = mysticWords[Math.floor(Math.random() * mysticWords.length)];
        var mysticWords_2: string = mysticWords[Math.floor(Math.random() * mysticWords.length)];
        while (mysticWords_1 == mysticWords_2) {
          mysticWords_2 = mysticWords[Math.floor(Math.random() * mysticWords.length)];
        }
        chatClient.say(channel, `Und gewonnen hat:`);
        chatClient.action(channel, mysticWords_1);
        setTimeout(() => {
          chatClient.action(channel, mysticWords_2);
        }, 6000);
        setTimeout(() => {
          chatClient.action(channel, `@${topTenWinner}! Gratulation!`);
          topTenWinner = '';
        }, 12000);

        logger(`topTen winner: ${topTenWinner}`);
        topTenTrigger = '';
      }
    }
  });

  commandHandler.addCommand('spezialZeit', true, 0, 1, ({ user, msg }) => {
    if (msg.userInfo.isMod) {
      chatClient.say(channel, `Du bist Mod @${user} Kappa`);
      return;
    }
    let userExists: boolean = false;
    Object.keys(viewerTracking.tracking).forEach((date) => {
      if (Object.keys(viewerTracking.tracking[date]).includes(user)) {
        userExists = true;
        return;
      }
    });
    if (userExists) {
      let userTime: number = 0;
      Object.keys(viewerTracking.tracking).forEach((date) => {
        Object.keys(viewerTracking.tracking[date]).forEach((userName) => {
          if (userName == user) {
            userTime += viewerTracking.tracking[date][userName].totalTime;
            return;
          }
        });
      });
      const userTimeTotal: number[] = msToTime(userTime);
      chatClient.say(channel, `@${user} deine Zeit: ${userTimeTotal[0]}:${userTimeTotal[1]} [hh:mm].`);
    } else {
      chatClient.say(channel, `@${user} ich habe leider keine Daten zu dir...`);
    }
    logger(`spezialZeit: ${user}`);
  });

  commandHandler.addCommand('tageszeit', false, 0, 3, ({ user, msg }) => {
    let userExists: boolean = false;
    Object.keys(viewerTracking.tracking).forEach((date) => {
      if (Object.keys(viewerTracking.tracking[date]).includes(user)) {
        userExists = true;
        return;
      }
    });
    if (userExists) {
      const date: Date = new Date();
      const hour: number = date.getHours();
      let day: number = date.getDate();
      hour >= 15 ? true : (day = day - 1);
      const month: number = date.getMonth() + 1;
      const year: number = date.getFullYear();
      const dateStamp: string = year.toString().concat('.', month.toString(), '.', day.toString());

      let dayMS: number = 0;
      if (Object.keys(viewerTracking.tracking).includes(dateStamp)) {
        if (Object.keys(viewerTracking.tracking[dateStamp]).includes(user)) {
          dayMS = viewerTracking.tracking[dateStamp][user].totalTime;
        }
      }

      const dayTime: number[] = msToTime(dayMS);
      const dayHoursValue: string = dayTime[0] < 10 ? '0'.concat(dayTime[0].toString()) : dayTime[0].toString();
      const dayHoursName: string = dayHoursValue == '01' ? 'Stunde' : 'Stunden';
      const dayMinutesValue: string = dayTime[1] < 10 ? '0'.concat(dayTime[1].toString()) : dayTime[1].toString();
      const dayMinutesName: string = dayMinutesValue == '01' ? 'Minute' : 'Minuten';

      let totalMS: number = 0;
      Object.keys(viewerTracking.tracking).forEach((date) => {
        if (Object.keys(viewerTracking.tracking[date]).includes(user)) {
          totalMS += viewerTracking.tracking[date][user].totalTime;
        }
      });
      const totalTime: number[] = msToTime(totalMS);
      const totalHoursValue: string = totalTime[0] < 10 ? '0'.concat(totalTime[0].toString()) : totalTime[0].toString();
      const totalHoursName: string = totalHoursValue == '01' ? 'Stunde' : 'Stunden';
      const totalMinutesValue: string =
        totalTime[1] < 10 ? '0'.concat(totalTime[1].toString()) : totalTime[1].toString();
      const totalMinutesName: string = totalMinutesValue == '01' ? 'Minute' : 'Minuten';

      chatClient.say(
        channel,
        `@${user} du hast ${dayHoursValue} ${dayHoursName} und ${dayMinutesValue} ${dayMinutesName} seit 15 Uhr geschaut und ${totalHoursValue} ${totalHoursName} und ${totalMinutesValue} ${totalMinutesName} seit Streamstart.`
      );
    } else if (msg.userInfo.isMod) {
      chatClient.say(channel, `@${user} du bist ein Mod. 24/7 natürlich!`);
    } else {
      chatClient.say(channel, `@${user} du hast derzeit noch keine volle Minute geschaut.`);
    }
    logger(`tageszeit: ${user}`);
  });

  ////////////

  //!angeln
  let angelstatus: boolean = false;

  let angelInterval: NodeJS.Timeout | null = null;

  logger('readFile ./JSON/specialEvents/angelListe.json');
  let angelListe: AngelListe = JSON.parse(await fs.promises.readFile('./JSON/specialEvents/angelListe.json', 'utf8'));

  commandHandler.addCommand('angeln', true, 0, 0, async ({ args, msg, user }) => {
    //
    logger('readFile ./JSON/specialEvents/fischListe.json');
    const fischListe: FischListe = JSON.parse(
      await fs.promises.readFile('./JSON/specialEvents/fischListe.json', 'utf8')
    );

    // an
    if (args[0] == 'an' && (msg.userInfo.isBroadcaster || msg.userInfo.isMod)) {
      angelstatus = true;
      logger('readFile ./JSON/specialEvents/angelListe.json');
      angelListe = JSON.parse(await fs.promises.readFile('./JSON/specialEvents/angelListe.json', 'utf8'));
      chatClient.say(channel, `/announce Das Floss macht einen Stop. Schnell, werft eure Angeln mit !angeln aus!`);
      logger(`!angeln an`);
      setTimeout(async () => {
        angelstatus = false;
        for (const user in angelListe) {
          angelListe[user].angelt = false;
        }
        logger('writeFile ./JSON/specialEvents/angelListe.json');
        await fs.promises.writeFile(
          './JSON/specialEvents/angelListe.json',
          JSON.stringify(angelListe, null, 4),
          'utf8'
        );
        chatClient.say(channel, `/announce Das Floss fährt weiter. Alle Angelschnüre reissen...`);
        logger(`!angeln fertig`);
      }, 1000 * 60 * 5); // 5min

      angelInterval = setInterval(async () => {
        angelstatus = true;
        logger('readFile ./JSON/specialEvents/angelListe.json');
        angelListe = JSON.parse(await fs.promises.readFile('./JSON/specialEvents/angelListe.json', 'utf8'));
        chatClient.say(channel, `/announce Das Floss macht einen Stop. Schnell, werft eure Angeln mit !angeln aus!`);
        logger(`!angeln an`);
        setTimeout(async () => {
          angelstatus = false;
          for (const user in angelListe) {
            angelListe[user].angelt = false;
          }
          logger('writeFile ./JSON/specialEvents/angelListe.json');
          await fs.promises.writeFile(
            './JSON/specialEvents/angelListe.json',
            JSON.stringify(angelListe, null, 4),
            'utf8'
          );
          chatClient.say(channel, `/announce Das Floss fährt weiter. Alle Angelschnüre reissen...`);
          logger(`!angeln fertig`);
        }, 1000 * 60 * 5); // 5min
      }, 1000 * 60 * 60); // 1h
      return;
    }

    // aus
    if (args[0] == 'aus' && (msg.userInfo.isBroadcaster || msg.userInfo.isMod)) {
      angelstatus = false;
      if (angelInterval != null) {
        clearInterval(angelInterval);
        angelInterval = null;
      }
      chatClient.say(channel, `Angeln ist jetzt aus.`);
      logger(`!angeln aus`);
      return;
    }

    if (angelstatus == false) return;

    logger(`!angeln [${user}]`);

    //angeln
    // neuer User
    if (angelListe[user] == null) {
      angelListe[user] = {
        angelt: false,
        fische: [],
        punkte: 0,
      };
    }

    if (angelListe[user].angelt == true) return; // am angeln

    chatClient.say(channel, `@${user} du wirfst deine Angel aus. Was da wohl anbeissen wird...?`);
    angelListe[user].angelt = true;

    const angelDauer: number = getRandomInt(5, 46); // 5-45 Sekunden

    setTimeout(
      () => {
        if (!angelstatus) return;

        let angelGlück: [number, number, number, number] = [1, 0, 0, 0];
        switch (true) {
          case angelDauer >= 40:
            angelGlück = [0, 0.1, 0.3, 0.6];
            break;
          case angelDauer >= 35:
            angelGlück = [0, 0.15, 0.5, 0.35];
            break;
          case angelDauer >= 30:
            angelGlück = [0.1, 0.25, 0.5, 0.15];
            break;
          case angelDauer >= 25:
            angelGlück = [0.2, 0.3, 0.4, 0.1];
            break;
          case angelDauer >= 20:
            angelGlück = [0.3, 0.4, 0.25, 0.05];
            break;
          case angelDauer >= 15:
            angelGlück = [0.4, 0.4, 0.15, 0.05];
            break;
          case angelDauer >= 10:
            angelGlück = [0.5, 0.4, 0.1, 0];
            break;
          default:
            angelGlück = [0.6, 0.4, 0, 0];
            break;
        }
        const rndNumber: number = getRandomInt(0, 101) / 100;
        const fischGrösse: 'müll' | 'klein' | 'mittel' | 'gross' =
          rndNumber <= angelGlück[0]
            ? 'müll'
            : rndNumber <= angelGlück[1] + angelGlück[0]
            ? 'klein'
            : rndNumber <= angelGlück[2] + angelGlück[1] + angelGlück[0]
            ? 'mittel'
            : 'gross';

        const fisch: string = pickRandom(fischListe[fischGrösse]);
        angelListe[user].fische.push(fisch);
        angelListe[user].angelt = false;
        angelListe[user].punkte += fischListe.points[fisch];

        chatClient.say(
          channel,
          `@${user} fängt eine:n ${fisch}!${
            fischListe.phrases[fisch] != null ? ' '.concat(fischListe.phrases[fisch]) : ''
          } [${fischListe.points[fisch]} Punkte]`
        );
        logger(`!angeln complete [${user}] [${fisch}]`);
      },
      angelDauer * 1000,
      user
    );
  });

  //!eimer
  commandHandler.addCommand('eimer', true, 0, 0, async ({ user }) => {
    //if(!angelstatus) return;

    if (angelListe[user] == null) {
      // User existiert nicht
      chatClient.say(channel, `@${user} dein Eimer ist noch leer...`);
    } else {
      // User existiert
      let userFischeListe: string[] = [];
      let userFischeCounter: number[] = [];

      angelListe[user].fische.forEach((fisch) => {
        if (!userFischeListe.includes(fisch)) {
          // neuer Fisch
          userFischeListe.push(fisch);
          userFischeCounter.push(1);
        } else {
          // alter Fisch
          userFischeCounter[userFischeListe.indexOf(fisch)] += 1;
        }
      });

      let userFischeOutput: string[] = [];
      userFischeListe.forEach((fisch) => {
        userFischeOutput.push(fisch + ' [' + userFischeCounter[userFischeListe.indexOf(fisch)] + ']');
      });
      multiSay(
        channel,
        chatClient,
        ',',
        `@${user} in deinem Eimer ${angelListe[user].fische.length == 1 ? 'befindet' : 'befinden'}  sich: ${listMaker(
          userFischeOutput
        )} [${angelListe[user].punkte} ${angelListe[user].punkte == 1 ? 'Punkt' : 'Punkte'}]`
      );
    }
    logger(`!eimer [${user}]`);
  });

  //!angelchampion
  commandHandler.addCommand(['angelchampion', 'angelchampions'], true, 2, 0, async ({ args, msg }) => {
    logger('readFile ./JSON/specialEvents/fischListe.json');
    const fischListe: FischListe = JSON.parse(
      await fs.promises.readFile('./JSON/specialEvents/fischListe.json', 'utf8')
    );
    logger('readFile ./JSON/specialEvents/angelListe.json');
    angelListe = JSON.parse(await fs.promises.readFile('./JSON/specialEvents/angelListe.json', 'utf8'));

    let sortable: [string, number][] = [];
    for (let user in angelListe) {
      sortable.push([user, angelListe[user].punkte]);
    }
    sortable.sort(function (a, b) {
      return a[1] - b[1];
    });

    sortable.reverse();

    if (args[0] == 'final' && (msg.userInfo.isBroadcaster || msg.userInfo.isMod)) {
      sortable = sortable.slice(0, 3);

      chatClient.say(channel, `/announce Unsere Angelchampions sind:`);
      setTimeout(() => {
        chatClient.say(channel, `/announce 3: ${sortable[2][0]} [${sortable[2][1]}]`);
      }, 3000);
      setTimeout(() => {
        chatClient.say(channel, `/announce 2: ${sortable[1][0]} [${sortable[1][1]}]`);
      }, 8000);
      setTimeout(() => {
        chatClient.say(channel, `/announce 1: ${sortable[0][0]} [${sortable[0][1]}]`);
      }, 18000);
      logger(
        `!angelchampions final [${sortable[2][0]} [${sortable[2][1]}], ${sortable[1][0]} [${sortable[1][1]}], ${sortable[0][0]} [${sortable[0][1]}]]`
      );
    } else {
      sortable = sortable.slice(0, 10);

      let i: number = 1;
      let message: string = `${i}: ${sortable[i - 1][0]} [${sortable[i - 1][1]}]`;

      while (i < sortable.length) {
        i++;
        message = message.concat(` | ${i}: ${sortable[i - 1][0]} [${sortable[i - 1][1]}]`);
      }

      chatClient.say(channel, `/announce ${message}`);
      logger('!angelchampions');
    }
  });

  //!müllchampion
  commandHandler.addCommand(['müllchampion', 'müllchampions'], true, 2, 0, async ({ args, msg }) => {
    logger('readFile ./JSON/specialEvents/fischListe.json');
    const fischListe: FischListe = JSON.parse(
      await fs.promises.readFile('./JSON/specialEvents/fischListe.json', 'utf8')
    );
    logger('readFile ./JSON/specialEvents/angelListe.json');
    angelListe = JSON.parse(await fs.promises.readFile('./JSON/specialEvents/angelListe.json', 'utf8'));

    let müllListe: {
      [key: string]: number;
    } = {};
    for (const user in angelListe) {
      angelListe[user].fische.forEach((fisch) => {
        if (fischListe.müll.includes(fisch)) {
          if (müllListe[user] == null) {
            müllListe[user] = 1;
          } else {
            müllListe[user] += 1;
          }
        }
      });
    }

    let sortable: [string, number][] = [];
    for (let user in müllListe) {
      sortable.push([user, müllListe[user]]);
    }
    sortable.sort(function (a, b) {
      return a[1] - b[1];
    });

    sortable.reverse();

    if (args[0] == 'final' && (msg.userInfo.isBroadcaster || msg.userInfo.isMod)) {
      sortable = sortable.slice(0, 3);

      chatClient.say(channel, `/announce Unsere Müllchampions sind:`);
      setTimeout(() => {
        chatClient.say(channel, `/announce 3: ${sortable[2][0]} [${sortable[2][1]}]`);
      }, 3000);
      setTimeout(() => {
        chatClient.say(channel, `/announce 2: ${sortable[1][0]} [${sortable[1][1]}]`);
      }, 8000);
      setTimeout(() => {
        chatClient.say(channel, `/announce 1: ${sortable[0][0]} [${sortable[0][1]}]`);
      }, 18000);
      logger(
        `!müllchampions final [${sortable[2][0]} [${sortable[2][1]}], ${sortable[1][0]} [${sortable[1][1]}], ${sortable[0][0]} [${sortable[0][1]}]]`
      );
    } else {
      sortable = sortable.slice(0, 10);

      let i: number = 1;
      let message: string = `${i}: ${sortable[i - 1][0]} [${sortable[i - 1][1]}]`;

      while (i < sortable.length) {
        i++;
        message = message.concat(` | ${i}: ${sortable[i - 1][0]} [${sortable[i - 1][1]}]`);
      }

      chatClient.say(channel, `/announce ${message}`);
      logger('!müllchampions');
    }
  });

  //#endregion Special Events

  //#region Beleidigungsfechten

  logger('readFile ./JSON/monkeyIsland.json');
  let beleidigungsFechten: {
    insults: {
      [key: string]: string;
    };
    defaultAnswers: string[];
    players: {
      [key: string]: {
        insult: string;
        nextInsult: 'player' | 'bot';
        scorePlayer: number;
        scoreBot: number;
      };
    };
  } = JSON.parse(await fs.promises.readFile('./JSON/monkeyIsland.json', 'utf8'));

  chatClient.onMessage((channel, user, message, msg) => {
    for (let insult of Object.keys(beleidigungsFechten.insults)) {
      if (
        insult.toLowerCase() == message.toLowerCase() ||
        beleidigungsFechten.insults[insult].toLowerCase() == message.toLowerCase() ||
        (beleidigungsFechten.players[user] != null && beleidigungsFechten.players[user].nextInsult == 'bot')
      ) {
        //Nachricht ist Beleidigung oder Konter
        if (beleidigungsFechten.players[user] == null) {
          //neues Spiel
          beleidigungsFechten.players[user] = {
            insult: insult,
            nextInsult: 'player',
            scorePlayer: 0,
            scoreBot: 0,
          };
        }

        if (beleidigungsFechten.players[user].nextInsult == 'player') {
          //User an der Reihe mit neuer Beleidigung
          if (insult.toLowerCase() == message.toLowerCase()) {
            //neue Beleidigung
            const possibleAnswers: string[] = beleidigungsFechten.defaultAnswers.concat(
              beleidigungsFechten.insults[insult],
              beleidigungsFechten.insults[insult]
            );
            const answer: string = possibleAnswers[Math.floor(Math.random() * possibleAnswers.length)];

            chatClient.action(channel, answer);

            if (answer != beleidigungsFechten.insults[insult]) {
              //User gewinnt Runde
              beleidigungsFechten.players[user].scorePlayer += 1;
              chatClient.action(channel, `Uff. Punkt für dich @${user}.`);
              beleidigungsFechten.players[user].insult = insult;
              beleidigungsFechten.players[user].nextInsult = 'player';

              if (beleidigungsFechten.players[user].scorePlayer == 3) {
                //User gewinnt Match
                chatClient.say(channel, `Arg! Ich gebe auf. Du gewinnst @${user}. Nimm dir meine Beute.`);
                delete beleidigungsFechten.players[user];
              }
            } else {
              //Bot gewinnt Runde
              beleidigungsFechten.players[user].scoreBot += 1;
              chatClient.action(channel, `Muhahaha. Punkt für mich @${user}!`);
              if (beleidigungsFechten.players[user].scoreBot == 3) {
                //Bot gewinnt Match
                chatClient.say(channel, `Ha! Mach, dass du von meinem Schiff kommst @${user}!`);
                delete beleidigungsFechten.players[user];
              } else {
                //neue Beleidigung
                let counterInsult: string = insult;
                while (counterInsult == insult || counterInsult == beleidigungsFechten.players[user].insult) {
                  counterInsult = Object.keys(beleidigungsFechten.insults)[
                    Math.floor(Math.random() * Object.keys(beleidigungsFechten.insults).length)
                  ];
                }

                chatClient.say(channel, `@${user} ${counterInsult}`);
                beleidigungsFechten.players[user].insult = counterInsult;
                beleidigungsFechten.players[user].nextInsult = 'bot';
              }
            }
          } else {
            //nix. Warte auf Beleidigung
          }
        } else {
          //Bot an der Reihe mit neuer Beleidigung
          if (
            beleidigungsFechten.insults[beleidigungsFechten.players[user].insult].toLowerCase() == message.toLowerCase()
          ) {
            //richtige Antwort
            beleidigungsFechten.players[user].scorePlayer += 1;
            chatClient.action(channel, `Uff. Punkt für dich @${user}.`);
            beleidigungsFechten.players[user].insult = insult;
            beleidigungsFechten.players[user].nextInsult = 'player';

            if (beleidigungsFechten.players[user].scorePlayer == 3) {
              //User gewinnt Match
              chatClient.say(channel, `Arg! Ich gebe auf. Du gewinnst @${user}. Nimm dir meine Beute.`);
              delete beleidigungsFechten.players[user];
            }
          } else {
            //falsche Antwort
            beleidigungsFechten.players[user].scoreBot += 1;
            chatClient.action(channel, `Muhahaha. Punkt für mich @${user}!`);
            if (beleidigungsFechten.players[user].scoreBot == 3) {
              //Bot gewinnt Match
              chatClient.say(channel, `Ha! Mach, dass du von meinem Schiff kommst @${user}!`);
              delete beleidigungsFechten.players[user];
            } else {
              //neue Beleidigung
              let counterInsult: string = insult;
              while (counterInsult == insult || counterInsult == beleidigungsFechten.players[user].insult) {
                counterInsult = Object.keys(beleidigungsFechten.insults)[
                  Math.floor(Math.random() * Object.keys(beleidigungsFechten.insults).length)
                ];
              }

              chatClient.say(channel, `@${user} ${counterInsult}`);
              beleidigungsFechten.players[user].insult = counterInsult;
              beleidigungsFechten.players[user].nextInsult = 'bot';
            }
          }
        }

        logger('writeFile ./JSON/monkeyIsland.json');
        fs.promises.writeFile('./JSON/monkeyIsland.json', JSON.stringify(beleidigungsFechten, null, 4), 'utf8');
        logger(`Beleidigungsfechten mit ${user}`);
        break;
      }
    }
  });
  //#endregion Beleidigungsfechten

  //#region Ostereier
  let eiersuchStatus: boolean = false;
  logger('readFile ./JSON/Ostern/ostereier.json');
  let ostereier: Ostereier = JSON.parse(await fs.promises.readFile('./JSON/Ostern/ostereier.json', 'utf8'));

  const versteckerFunction = async () => {
    logger('readFile ./JSON/Ostern/ostereier.json');
    ostereier = JSON.parse(await fs.promises.readFile('./JSON/Ostern/ostereier.json', 'utf8'));

    let newEggs: string[] = [];
    let oldEggs: string[] = Object.values(ostereier.ostereier);

    while (oldEggs.length != 0) {
      const eggIndex: number = oldEggs.indexOf(oldEggs[Math.floor(Math.random() * oldEggs.length)]);
      newEggs.push(oldEggs[eggIndex]);
      oldEggs.splice(eggIndex, 1);
    }

    let hiddenEggs: {
      [key: string]: string;
    } = {};

    for (let i = 0; i < ostereier.orte.length; i++) {
      hiddenEggs[ostereier.orte[i]] = newEggs[i];
    }

    const hidingspotList: string = listMaker(ostereier.orte);
    chatClient.say(channel, `/announce 30 Ostereier wurden an diesen 50 Orten versteckt:`);
    multiSay(channel, chatClient, ',', hidingspotList);
    chatClient.say(channel, 'Benutze `!eiersuche OrtA OrtB OrtC` um nach Eiern zu suchen. Viel Glück!');

    eiersuchStatus = true;

    logger(`Neue Eier versteckt.`);

    //Ende Eiersuche
    setTimeout(async () => {
      logger('readFile ./JSON/Ostern/eiersuche.json');
      let eiersuche: Eiersuche = JSON.parse(await fs.promises.readFile('./JSON/Ostern/eiersuche.json', 'utf8'));

      eiersuchStatus = false;

      let eiersuchePunkte: string[] = [];
      Object.keys(ostereier.players).forEach((user) => {
        let userEintrag: string[] = [];
        let userPunkte: number = 0;
        for (let ort of ostereier.players[user]) {
          userEintrag.push(hiddenEggs[ort] + ` [${ostereier.ostereierWerte[hiddenEggs[ort]]}]`);
          userPunkte += ostereier.ostereierWerte[hiddenEggs[ort]];
        }
        eiersuchePunkte.push(user + ': ' + listMaker(userEintrag, ' + ', '', '', ' + ') + ' = ' + userPunkte);

        if (eiersuche.users[user] == null) {
          eiersuche.users[user] = userPunkte;
        } else {
          eiersuche.users[user] += userPunkte;
        }
      });

      chatClient.say(channel, `/announce Die Eiersuche ist geschlossen. Hier sind eure Punkte für diese Runde:`);

      const message: string = listMaker(eiersuchePunkte, ' | ', '@', '', ' | ');
      multiSay(channel, chatClient, '|', message);

      ostereier.players = {};

      logger('writeFile ./JSON/Ostern/eiersuche.json');
      fs.promises.writeFile('./JSON/Ostern/eiersuche.json', JSON.stringify(eiersuche, null, 4), 'utf8');

      logger(`Eiersuche geschlossen.`);
    }, 5 * 60 * 1000); //5*60*1000
  };

  let verstecker: NodeJS.Timeout | null = null;

  commandHandler.addCommand('eiersuche', true, 0, 0, async ({ user, args, msg }) => {
    //Eiersuche An
    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && (args[0] == 'an' || args[0] == 'ein')) {
      if (verstecker == null) {
        verstecker = setInterval(versteckerFunction, 30 * 60 * 1000); //30*60*1000;
        versteckerFunction();
      } else {
        chatClient.say(
          channel,
          `@${user}, es läuft bereits eine Eiersuche. Benutze zuerst "!eiersuche aus" um die alte Suche zu stoppen.`
        );
      }

      logger('Verstecker an');
      return;
    }

    //Eiersuche Aus
    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && args[0] == 'aus') {
      if (verstecker != null) {
        clearTimeout(verstecker);
        verstecker = null;
      }
      eiersuchStatus = false;
      chatClient.say(channel, `Eiersuche ist aus`);

      logger('Verstecker aus');
      return;
    }

    //Auswertung
    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && args[0] == 'auswertung') {
      logger('readFile ./JSON/Ostern/eiersuche.json');
      const eiersuche: Eiersuche = JSON.parse(await fs.promises.readFile('./JSON/Ostern/eiersuche.json', 'utf8'));

      let qualified: string[] = [];

      for (let user in eiersuche.users) {
        if (eiersuche.users[user] >= 200 && !eiersuche.winners.includes(user)) {
          let i: number = 1;
          while (eiersuche.users[user] >= (i <= 2 ? 200 + i * 50 : 100 + i * 100)) {
            i++;
          }
          qualified.push(user.concat(` x${i} [${eiersuche.users[user]}]`));
        }
      }

      let message: string = listMaker(qualified, ', ', '@', '.', ' und ');
      chatClient.say(channel, `/announce Im Osterlostopf sind:`);
      multiSay(channel, chatClient, ',', message);

      logger(`Eiersuche Auswertung`);
      return;
    }

    //start
    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && args[0] == 'start') {
      logger('readFile ./JSON/Ostern/eiersuche.json');
      const eiersuche: Eiersuche = JSON.parse(await fs.promises.readFile('./JSON/Ostern/eiersuche.json', 'utf8'));

      let qualified: string[] = [];

      for (let user in eiersuche.users) {
        if (eiersuche.users[user] >= 200 && !eiersuche.winners.includes(user)) {
          qualified.push(user);
          let i: number = 1;
          while (eiersuche.users[user] >= (i <= 2 ? 200 + i * 50 : 100 + i * 100)) {
            qualified.push(user);
            i++;
          }
        }
      }

      const winner: string = pickRandom(qualified);
      eiersuche.winners.push(winner);

      logger('writeFile ./JSON/Ostern/eiersuche.json');
      fs.promises.writeFile('./JSON/Ostern/eiersuche.json', JSON.stringify(eiersuche, null, 4), 'utf8');

      const mysticWords_1: string = pickRandom(mysticWords);
      let mysticWords_2: string = pickRandom(mysticWords);
      while (mysticWords_1 == mysticWords_2) {
        mysticWords_2 = pickRandom(mysticWords);
      }
      chatClient.say(channel, `/announce Und gewonnen hat:`);

      setTimeout(() => {
        chatClient.action(channel, mysticWords_1);
      }, 1500);

      setTimeout(() => {
        chatClient.action(channel, mysticWords_2);
      }, 7500);

      setTimeout(() => {
        chatClient.say(channel, `/announce @${winner}! Gratulation!`);
      }, 14000);

      logger(`Eiersuche winner: ${winner}`);
    }

    //Eiersuche
    //Suche ist an
    if (eiersuchStatus == true) {
      //user hat schon gesucht
      if (ostereier.players[user] != null) {
        logger(`Eiersuche [${user}]: schon gesucht`);
        return;
      }

      //delete empty args
      for (let cell of args) {
        if (cell == '' || cell == ' ') {
          args.splice(args.indexOf(cell), 1);
        }
      }

      //keine 3 orte
      if (args.length != 3) {
        chatClient.say(channel, `@${user}, bitte gib drei Orte im Format "!eiersuche OrtA OrtB OrtC" an.`);

        logger(`Eiersuche [${user}]: args.length ERROR | ${args} | ${args.length}`);
        return;
      }

      //falsche Orte
      for (let ort of args) {
        if (ostereier.orte.indexOf(ort) == -1) {
          chatClient.say(channel, `@${user}, bitte wähle drei Orte von der Liste (!versteckliste). [Problem: ${ort}]`);

          logger(`Eiersuche [${user}]: ort ERROR | ${args} | ${ort}`);
          return;
        }
      }

      //mehrmals selben Ort
      if (hasDuplicates(args)) {
        chatClient.say(channel, `@${user}, bitte wähle drei verschiedene Orte von der Liste (!versteckliste).`);

        logger(`Eiersuche [${user}]: duplicates ERROR | ${args}`);
        return;
      }

      ostereier.players[user] = args;
      chatClient.say(channel, `@${user} Suche eingetragen. Viel Glück!`);

      logger(`Eiersuche [${user}]`);
    }
  });

  // commandHandler.addCommand("versteckliste", true, 0, 5, async({}) => {
  //   const ostereier: Ostereier  = JSON.parse(
  //     await fs.promises.readFile(
  //       "./JSON/Ostern/ostereier.json",
  //       "utf8"
  //     )
  //   );
  //   multiSay(channel, chatClient, ",", listMaker(ostereier.orte));
  //   logger("versteckliste");
  // });

  commandHandler.addCommand('eierpunkte', true, 0, 0, async ({ user }) => {
    logger('readFile ./JSON/Ostern/eiersuche.json');
    const eiersuche: Eiersuche = JSON.parse(await fs.promises.readFile('./JSON/Ostern/eiersuche.json', 'utf8'));
    //user hat noch keine Punkte
    if (eiersuche.users[user] == null) {
      chatClient.say(channel, `@${user}, du hast noch keine Punkte.`);
    }
    //user hat Punkte
    else {
      const punkteText: string = eiersuche.users[user] == 1 ? ' Punkt.' : ' Punkte.';
      chatClient.say(channel, `@${user}, du hast derzeit ` + eiersuche.users[user] + punkteText);
    }

    logger(`eierpunkte [${user}]`);
  });

  commandHandler.addCommand('topeier', true, 3, 3, async ({}) => {
    logger('readFile ./JSON/Ostern/eiersuche.json');
    const eiersuche: Eiersuche = JSON.parse(await fs.promises.readFile('./JSON/Ostern/eiersuche.json', 'utf8'));

    let sortable: [string, number][] = [];
    for (let user in eiersuche.users) {
      sortable.push([user, eiersuche.users[user]]);
    }

    sortable.sort(function (a, b) {
      return a[1] - b[1];
    });

    sortable.reverse();
    sortable = sortable.slice(0, 10);

    let i: number = 1;
    let message: string = `${i}: ${sortable[i - 1][0]} [${sortable[i - 1][1]}]`;

    while (i < sortable.length) {
      i++;
      message = message.concat(` | ${i}: ${sortable[i - 1][0]} [${sortable[i - 1][1]}]`);
    }

    chatClient.say(channel, `/announce ${message}`);
    logger('topeier');
  });

  //#endregion Ostereier

  //#region Schulspiel
  let schoolBreak: boolean = false;
  logger('readFile ./JSON/Schulspiel/school.json');
  let school: School = JSON.parse(await fs.promises.readFile('./JSON/Schulspiel/school.json', 'utf8'));

  logger('readFile ./JSON/Schulspiel/school.json');
  let schoolScore: SchoolScore = JSON.parse(await fs.promises.readFile('./JSON/Schulspiel/schoolScore.json', 'utf8'));

  let schulraudiSafety: SchulraudiSafety = [];

  logger('readFile ./JSON/Schulspiel/schulraudiMessages.json');
  let schulraudiMessages: SchulraudiMessages = JSON.parse(
    await fs.promises.readFile('./JSON/Schulspiel/schulraudiMessages.json', 'utf8')
  );

  let schulraudi: [boolean, string] = [false, ''];
  let schulraudiFound: boolean = false;

  const schoolBreakFunction = async () => {
    logger('readFile ./JSON/Schulspiel/school.json');
    school = JSON.parse(await fs.promises.readFile('./JSON/Schulspiel/school.json', 'utf8'));

    //choose Objects to hide
    let schoolObjectsToHide: string[] = [];
    Object.keys(school.objects).forEach((object) => {
      const rndNumber: number = getRandomInt(1, 101);
      if (rndNumber <= school.objects[object].probability) schoolObjectsToHide.push(object);
    });

    let extraSchoolObject: string = '';

    if (schoolObjectsToHide.length < school.places.length) {
      //less objects than hiding places
      while (schoolObjectsToHide.length < school.places.length) {
        schoolObjectsToHide.push(pickRandom(school.zeroPoints));
      }
      if (schoolObjectsToHide.includes('Schulraudi')) extraSchoolObject = pickRandom(school.zeroPoints);
    } else if (schoolObjectsToHide.length > school.places.length) {
      //more objects than hinding places
      schoolObjectsToHide.splice(schoolObjectsToHide.indexOf(pickRandom(schoolObjectsToHide)), 1);
      if (schoolObjectsToHide.includes('Schulraudi')) {
        extraSchoolObject = pickRandom(Object.keys(school.objects));
        while (schoolObjectsToHide.includes(extraSchoolObject)) {
          extraSchoolObject = pickRandom(Object.keys(school.objects));
        }
      }
    }

    let hiddenSchoolObjects: string[] = [];

    while (schoolObjectsToHide.length != 0) {
      const schoolObjektIndex: number = schoolObjectsToHide.indexOf(pickRandom(schoolObjectsToHide));
      hiddenSchoolObjects.push(schoolObjectsToHide[schoolObjektIndex]);
      schoolObjectsToHide.splice(schoolObjektIndex, 1);
    }

    const hidingspotList: string = listMaker(school.places);
    chatClient.say(
      channel,
      `/announce Die Grosse Pause beginnt! An diesen ${school.places.length} Orten wurden Gegenstände verteilt:`
    );
    multiSay(channel, chatClient, ',', hidingspotList);
    chatClient.say(channel, 'Benutze `!grossepause OrtA OrtB OrtC` um nach Objekten zu suchen. Viel Glück!');

    schoolBreak = true;

    logger(`Grosse Pause gestartet.`);

    //Ende Grosse Pause
    setTimeout(async () => {
      schoolBreak = false;

      chatClient.say(channel, `/announce Die Grosse Pause ist vorbei.`);

      let schoolFinds: {
        [key: string]: [string, string, string, number];
      } = {};
      Object.keys(school.players).forEach((user) => {
        let objects: [string, string, string] = [
          hiddenSchoolObjects[school.places.indexOf(school.players[user][0])],
          hiddenSchoolObjects[school.places.indexOf(school.players[user][1])],
          hiddenSchoolObjects[school.places.indexOf(school.players[user][2])],
        ];
        if (objects.includes('Schulraudi')) {
          if (!schulraudi[0]) {
            schulraudi = [true, user];
          } else {
            objects[objects.indexOf('Schulraudi')] = extraSchoolObject;
          }
        }
        let points: number =
          school.objects[objects[0]].value + school.objects[objects[1]].value + school.objects[objects[2]].value;
        schoolFinds[user] = [objects[0], objects[1], objects[2], points];
      });

      if (schulraudi[0] == true) {
        //Schulraudi was found
        schulraudiSafety = [];
        schulraudiFound = true;
        chatClient.action(
          channel,
          `Oh nein! @${schulraudi[1]} hat den Schulraudi gefunden! Versteckt euch mit *!verstecken*, oder er nimmt euch alle Gegenstände ab!`
        );

        setTimeout(() => {
          chatClient.action(channel, `Schnell! Versteckt euch! [!verstecken] Der Raudi kommt schon um die Ecke!`);
        }, 5 * 1000); //20 seconds

        setTimeout(async () => {
          schulraudi = [false, ''];
          let schulraudiVictims: string[] = [];
          Object.keys(schoolFinds).forEach((player) => {
            if (!schulraudiSafety.includes(player)) schulraudiVictims.push(player);
          });

          if (schulraudiVictims.length == 0) {
            //all safe
            chatClient.say(channel, `Alle haben sich erfolgreich vor dem Schulraudi versteckt.`);
          } else {
            const safeVictim: string = pickRandom(schulraudiVictims);
            schulraudiVictims.splice(schulraudiVictims.indexOf(safeVictim), 1);

            let safeMessage: string = pickRandom(schulraudiMessages.safeTexts);
            let xyIndex: number = safeMessage.indexOf('XY');
            while (xyIndex != -1) {
              safeMessage = safeMessage.replace('XY', `@${safeVictim}`);
              xyIndex = safeMessage.indexOf('XY');
            }
            chatClient.say(channel, safeMessage);

            if (schulraudiVictims.length == 0) {
              //all safe
              chatClient.say(channel, `Alle anderen haben sich erfolgreich vor dem Schulraudi versteckt.`);
            } else {
              schulraudiVictims.forEach((victim) => {
                let schulraudiMessage: string = pickRandom(schulraudiMessages.victimTexts);
                let xyIndex: number = schulraudiMessage.indexOf('XY');
                while (xyIndex != -1) {
                  schulraudiMessage = schulraudiMessage.replace('XY', `@${victim}`);
                  xyIndex = schulraudiMessage.indexOf('XY');
                }
                schulraudiMessage = schulraudiMessage.replace(
                  'ABC',
                  `${schoolFinds[victim][0]}, ${schoolFinds[victim][1]} und ${schoolFinds[victim][2]}`
                );
                chatClient.say(channel, schulraudiMessage);
                schoolFinds[victim] = ['geklaut', 'geklaut', 'geklaut', 0];
              });
            }
          }

          let schoolPoints: string[] = [];
          Object.keys(schoolFinds).forEach((player) => {
            schoolPoints.push(`${player}: 
            ${schoolFinds[player][0]} [${school.objects[schoolFinds[player][0]].value}],
             ${schoolFinds[player][1]} [${school.objects[schoolFinds[player][1]].value}]
              und ${schoolFinds[player][2]} [${school.objects[schoolFinds[player][2]].value}]:
               [${schoolFinds[player][3]}]`);
            if (schoolScore.users[player] == null) {
              //new player
              schoolScore.users[player] = schoolFinds[player][3];
            } else {
              schoolScore.users[player] += schoolFinds[player][3];
            }
          });

          logger('writeFile ./JSON/Schulspiel/schoolScore.json');
          await fs.promises.writeFile(
            './JSON/Schulspiel/schoolScore.json',
            JSON.stringify(schoolScore, null, 4),
            'utf8'
          );

          setTimeout(() => {
            schulraudiFound = false;
            chatClient.action(channel, `Hier sind eure Punkte für diese Runde:`);

            const message: string = listMaker(schoolPoints, ' | ', '', '', ' | ');
            multiSay(channel, chatClient, '|', message);

            school.players = {};
            logger(`Grosse Pause zu Ende.`);
          }, 20 * 1000); //20 seconds
        }, 40 * 1000); //40 seconds
      } else {
        let schoolPoints: string[] = [];
        Object.keys(schoolFinds).forEach((player) => {
          schoolPoints.push(`${player}: 
          ${schoolFinds[player][0]} [${school.objects[schoolFinds[player][0]].value}],
           ${schoolFinds[player][1]} [${school.objects[schoolFinds[player][1]].value}]
            und ${schoolFinds[player][2]} [${school.objects[schoolFinds[player][2]].value}]:
             [${schoolFinds[player][3]}]`);
          if (schoolScore.users[player] == null) {
            //new player
            schoolScore.users[player] = schoolFinds[player][3];
          } else {
            schoolScore.users[player] += schoolFinds[player][3];
          }
        });

        logger('writeFile ./JSON/Schulspiel/schoolScore.json');
        await fs.promises.writeFile('./JSON/Schulspiel/schoolScore.json', JSON.stringify(schoolScore, null, 4), 'utf8');

        chatClient.action(channel, `Hier sind eure Punkte für diese Runde:`);

        const message: string = listMaker(schoolPoints, ' | ', '', '', ' | ');
        multiSay(channel, chatClient, '|', message);

        school.players = {};
        logger(`Grosse Pause zu Ende.`);
      }
    }, 5 * 60 * 1000); //5 minutes
  };

  let schoolGame: NodeJS.Timeout | null = null;

  commandHandler.addCommand(['grossepause', 'großepause'], true, 0, 0, async ({ user, args, msg }) => {
    //Grosse Pause An
    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && (args[0] == 'an' || args[0] == 'ein')) {
      if (schoolGame == null) {
        schoolGame = setInterval(schoolBreakFunction, 60 * 60 * 1000); //60 Minuten;
        schoolBreakFunction();
      } else {
        chatClient.say(
          channel,
          `@${user}, es läuft bereits eine Grosse Pause. Benutze zuerst "!grossepause aus" um die alte Pause zu stoppen.`
        );
      }

      logger('Grosse Pause an');
      return;
    }

    //Grosse Pause Aus
    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && args[0] == 'aus') {
      if (schoolGame != null) {
        clearTimeout(schoolGame);
        schoolGame = null;
      }
      schoolBreak = false;
      chatClient.say(channel, `Grosse Pause ist aus`);

      logger('Grosse Pause aus');
      return;
    }

    //Auswertung
    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && args[0] == 'auswertung') {
      logger('readFile ./JSON/Schulspiel/schoolScore.json');
      const schoolScore: SchoolScore = JSON.parse(
        await fs.promises.readFile('./JSON/Schulspiel/schoolScore.json', 'utf8')
      );

      let qualified: string[] = [];

      for (let user in schoolScore.users) {
        if (schoolScore.users[user] >= 150 && !schoolScore.winners.includes(user)) {
          let i: number = 1;
          while (schoolScore.users[user] >= (i < 2 ? 250 : 150 + i * 100)) {
            i++;
          }
          qualified.push(user.concat(` x${i} [${schoolScore.users[user]}]`));
        }
      }

      let message: string = listMaker(qualified, ', ', '@', '.', ' und ');
      chatClient.say(channel, `/announce Im Pausenlostopf sind:`);
      multiSay(channel, chatClient, ',', message);

      logger(`Grosse Pause Auswertung`);
      return;
    }

    //start
    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && args[0] == 'start') {
      logger('readFile ./JSON/Schulspiel/schoolScore.json');
      const schoolScore: SchoolScore = JSON.parse(
        await fs.promises.readFile('./JSON/Schulspiel/schoolScore.json', 'utf8')
      );

      let qualified: string[] = [];

      for (let user in schoolScore.users) {
        if (schoolScore.users[user] >= 200 && !schoolScore.winners.includes(user)) {
          let i: number = 1;
          while (schoolScore.users[user] >= (i < 2 ? 250 : 150 + i * 100)) {
            qualified.push(user);
            i++;
          }
        }
      }

      const winner: string = pickRandom(qualified);
      schoolScore.winners.push(winner);

      logger('writeFile ./JSON/Schulspiel/schoolScore.json');
      fs.promises.writeFile('./JSON/Schulspiel/schoolScore.json', JSON.stringify(schoolScore, null, 4), 'utf8');

      const mysticWords_1: string = pickRandom(mysticWords);
      let mysticWords_2: string = pickRandom(mysticWords);
      while (mysticWords_1 == mysticWords_2) {
        mysticWords_2 = pickRandom(mysticWords);
      }
      chatClient.say(channel, `/announce Und gewonnen hat:`);

      setTimeout(() => {
        chatClient.action(channel, mysticWords_1);
      }, 1500);

      setTimeout(() => {
        chatClient.action(channel, mysticWords_2);
      }, 7500);

      setTimeout(() => {
        chatClient.say(channel, `/announce @${winner}! Gratulation!`);
      }, 14000);

      logger(`Grosse Pause winner: ${winner}`);
    }

    //Grosse Pause
    //Suche ist an
    if (schoolBreak == true) {
      //user hat schon gesucht
      if (school.players[user] != null) {
        logger(`Grosse Pause [${user}]: schon gesucht`);
        return;
      }

      //delete empty args
      for (let cell of args) {
        if (cell == '' || cell == ' ') {
          args.splice(args.indexOf(cell), 1);
        }
      }

      //keine 3 orte
      if (args.length != 3) {
        chatClient.say(channel, `@${user}, bitte gib drei Orte im Format "!grossepause OrtA OrtB OrtC" an.`);

        logger(`Grosse Pause [${user}]: args.length ERROR | ${args} | ${args.length}`);
        return;
      }

      //falsche Orte
      for (let ort of args) {
        if (school.places.indexOf(ort) == -1) {
          chatClient.say(channel, `@${user}, bitte wähle drei Orte von der Liste (!versteckliste). [Problem: ${ort}]`);

          logger(`Grosse Pause [${user}]: ort ERROR | ${args} | ${ort}`);
          return;
        }
      }

      //mehrmals selben Ort
      if (hasDuplicates(args)) {
        chatClient.say(channel, `@${user}, bitte wähle drei verschiedene Orte von der Liste (!versteckliste).`);

        logger(`Grosse Pause [${user}]: duplicates ERROR | ${args}`);
        return;
      }

      school.players[user] = [args[0], args[1], args[2]];
      chatClient.say(channel, `@${user} Suche eingetragen. Viel Glück!`);

      logger(`Grosse Pause [${user}]`);
    }
  });

  commandHandler.addCommand('versteckliste', true, 0, 5, async ({}) => {
    multiSay(channel, chatClient, ',', listMaker(school.places));
    logger('versteckliste');
  });

  commandHandler.addCommand(['pausenpunkte', 'pausepunkte'], true, 0, 0, async ({ user }) => {
    //user hat noch keine Punkte
    if (schoolScore.users[user] == null) {
      chatClient.say(channel, `@${user}, du hast noch keine Punkte.`);
    }
    //user hat Punkte
    else {
      chatClient.say(
        channel,
        `@${user}, du hast derzeit ${schoolScore.users[user]} ${schoolScore.users[user] == 1 ? ' Punkt.' : ' Punkte.'}`
      );
    }

    logger(`Grosse Pause Punkte [${user}]`);
  });

  commandHandler.addCommand('toppause', true, 3, 3, async ({}) => {
    let sortable: [string, number][] = [];
    for (let user in schoolScore.users) {
      sortable.push([user, schoolScore.users[user]]);
    }

    sortable.sort(function (a, b) {
      return a[1] - b[1];
    });

    sortable.reverse();
    sortable = sortable.slice(0, 10);

    let i: number = 1;
    let message: string = `${i}: ${sortable[i - 1][0]} [${sortable[i - 1][1]}]`;

    while (i < sortable.length) {
      i++;
      message = message.concat(` | ${i}: ${sortable[i - 1][0]} [${sortable[i - 1][1]}]`);
    }

    chatClient.say(channel, `/announce ${message}`);
    logger('toppause');
  });

  commandHandler.addCommand('verstecken', true, 0, 0, ({ user }) => {
    if (!schulraudi[0]) return;

    if (!schulraudiSafety.includes(user)) schulraudiSafety.push(user);
  });

  //#endregion Subathon 2022 Spiel

  //#region Weihnachtsspiel 2022

  // //!rentier
  // commandHandler.addCommand('rentier', true, 0, 0, async ({ user, args }) => {
  //   // if stream is not online return
  //   if (!botControl.streamerOnline) return;
  //   const userFile: WeihnachtsUser | false = await XMas2022Helper.getUserFile(user);
  //   if (userFile === false) {
  //     return;
  //   }

  //   //!rentier
  //   if (args.length === 0) {
  //     xMas2022Rentier.sendOutRentier(userFile, user);
  //     return;
  //   }

  //   //!rentier kaufen
  //   if (args[0].toLowerCase() === 'kaufen') {
  //     xMas2022Rentier.buyRentier(userFile, user);
  //     return;
  //   }

  //   //!rentier name
  //   if (args[0].toLowerCase() === 'name') {
  //     xMas2022Rentier.nameRentier(userFile, user, args);
  //     return;
  //   }

  //   //!rentier rename
  //   if (args[0].toLowerCase() === 'rename') {
  //     xMas2022Rentier.renameRentier(userFile, user, args);
  //     return;
  //   }

  //   //!rentier beschreibung
  //   if (args[0].toLowerCase() === 'beschreibung') {
  //     xMas2022Rentier.describeRentier(userFile, user);
  //   }
  // });

  // //!türchen
  // commandHandler.addCommand('türchen', true, 0, 0, async ({ user, args }) => {
  //   let userFile: WeihnachtsUser | false = await XMas2022Helper.getUserFile(user);
  //   if (userFile == false) return;
  //   const tag: number = new Date().getDate();

  //   //kein Tag angegeben
  //   if (args.length == 0) {
  //     chatClient.say(
  //       channel,
  //       `@${user} bitte gib eine Türchenzahl an. Du kannst Türchen bis um 23:59 Uhr am nächsten Tag öffnen.`
  //     );
  //     logger(`!türchen [${user}] missing arguments`);
  //     return;
  //   } else if (isNaN(Number(args[0]))) {
  //     chatClient.say(
  //       channel,
  //       `@${user} bitte gib eine Türchenzahl an. Du kannst Türchen bis um 23:59 Uhr am nächsten Tag öffnen.`
  //     );
  //     logger(`!türchen [${user}] keine Nummer angegeben`);
  //     return;
  //   }

  //   //Ausserhalb des erlaubten Rahmens [1-24]/keine ganze Nummer
  //   if (Number(args[0]) < 1 || Number(args[0]) > 24) {
  //     chatClient.say(
  //       channel,
  //       `@${user} bitte gib eine gültige Türchenzahl an [1-24]. Du kannst Türchen bis um 23:59 Uhr am nächsten Tag öffnen.`
  //     );
  //     logger(`!türchen [${user}] [${Number(args[0])}] ungültige Nummer angegeben`);
  //     return;
  //   } else if (!Number.isInteger(Number(args[0]))) {
  //     chatClient.say(
  //       channel,
  //       `@${user} bitte gib eine gültige Türchenzahl an [1-24]. Du kannst Türchen bis um 23:59 Uhr am nächsten Tag öffnen.`
  //     );
  //     logger(`!türchen [${user}] [${Number(args[0])}] ungültige Nummer angegeben (kein Integer)`);
  //     return;
  //   }

  //   //!türchen [nummer]
  //   const türchenNummer: number = Number(args[0]);

  //   //Türchen bereits geöffnet
  //   if (userFile.tuerchen.includes(türchenNummer)) {
  //     chatClient.say(channel, `@${user} du hast dieses Türchen bereits geöffnet.`);
  //     logger(`!türchen [${user}] [${türchenNummer}] bereits geöffnet`);
  //     return;
  //   }

  //   //Türchen Öffnungsfenster abgelaufen/zu früh
  //   if (türchenNummer < tag - 1) {
  //     chatClient.say(
  //       channel,
  //       `@${user} dieses Türchen ist leider abgelaufen. Du kannst Türchen bis um 23:59 Uhr am nächsten Tag öffnen.`
  //     );
  //     logger(`!türchen [${user}] [${türchenNummer}] zu spät`);
  //     return;
  //   } else if (türchenNummer > tag) {
  //     chatClient.say(channel, `@${user} dieses Türchen ist noch nicht offen.`);
  //     logger(`!türchen [${user}] [${türchenNummer}] zu früh`);
  //     return;
  //   }

  //   //öffne Türchen
  //   try {
  //     let gewinnerFile: GewinnerFile = JSON.parse(
  //       await fs.promises.readFile(`./JSON/Weihnachten 2022/gewinnerFile.json`, 'utf8')
  //     );

  //     //heute noch keine Postkarte gefunden
  //     if (gewinnerFile.postkarten.tage[türchenNummer] == null) {
  //       const rnd: number = getRandomInt(0, 101) / 100;
  //       if (rnd <= gewinnerFile.postkarten.postkartenWahrscheinlichkeit) {
  //         gewinnerFile.postkarten.tage[türchenNummer] = user;
  //         userFile.postkarten += 1;
  //         userFile.tuerchen.push(türchenNummer);

  //         //write gewinnerFile
  //         try {
  //           await fs.promises.writeFile(
  //             `./JSON/Weihnachten 2022/gewinnerFile.json`,
  //             JSON.stringify(gewinnerFile, null, 4),
  //             'utf8'
  //           );
  //           logger(`gewinnerFile saved`);
  //         } catch {
  //           logger(`gewinnerFile save failed.`);
  //           return;
  //         }

  //         //write userFile
  //         if (!XMas2022Helper.saveUserFile(userFile, user)) {
  //           return;
  //         }

  //         chatClient.action(channel, `Gratulation @${user}! xicanmHyped Du gewinnst die heutige Postkarte!`);
  //         logger(`!türchen -> Postkarte für ${user}`);
  //         return;
  //       }
  //     }

  //     //reguläres Türchen
  //     try {
  //       const weihnachtsGegenstaende: WeihnachtsGegenstaende = JSON.parse(
  //         await fs.promises.readFile(`./JSON/Weihnachten 2022/weihnachtsGegenstaende.json`, 'utf8')
  //       );

  //       const türchenGegenstand: string = pickRandom(weihnachtsGegenstaende.stufe3);

  //       const türchenRentierfutter: string[] = pickRandoms(weihnachtsGegenstaende.rentierFutter, getRandomInt(3, 6));
  //       const türchenDeko: string[] = pickRandoms(weihnachtsGegenstaende.deko, getRandomInt(1, 6));

  //       //schliesse Türchen
  //       userFile.tuerchen.push(türchenNummer);

  //       //Füge Objekte zu User hinzu
  //       if (userFile.objekte.gefunden[türchenGegenstand] == null) {
  //         userFile.objekte.gefunden[türchenGegenstand] = 2;
  //       } else {
  //         userFile.objekte.gefunden[türchenGegenstand] += 2;
  //       }

  //       //Füge Futter zu User hinzu
  //       userFile.rentier.futter += türchenRentierfutter.length;

  //       //Füge Deko zu User hinzu
  //       türchenDeko.forEach((dekoGegenstand) => {
  //         if (userFile == false) return;
  //         if (userFile.deko[dekoGegenstand] == null) {
  //           userFile.deko[dekoGegenstand] = 1;
  //         } else {
  //           userFile.deko[dekoGegenstand] += 1;
  //         }
  //       });

  //       //speicher userFile
  //       if (!XMas2022Helper.saveUserFile(userFile, user)) {
  //         return;
  //       }

  //       chatClient.say(
  //         channel,
  //         `@${user} du findest in deinem Türchen: 2x ${türchenGegenstand}, ${
  //           türchenRentierfutter.length
  //         } Rentierfutter und ${
  //           türchenDeko.length == 1
  //             ? `diesen Dekogegenstand: ${türchenDeko}`
  //             : `diese Dekogegenstände: ${listMaker(türchenDeko)}`
  //         }`
  //       );
  //       logger(`!türchen [${user}] [${türchenNummer}]`);
  //       return;
  //     } catch {
  //       logger(`weihnachtsGegenstaende failed to read file`);
  //       return;
  //     }
  //   } catch {
  //     logger(`ERROR failed to read gewinnerFile.`);
  //     return;
  //   }
  // });

  // //!elfenhelfen
  // commandHandler.addCommand('elfenhelfen', true, 0, 0, async ({ user }) => {
  //   // if stream is not online return
  //   if (!botControl.streamerOnline) return;
  //   let userFile: WeihnachtsUser | false = await XMas2022Helper.getUserFile(user);
  //   if (userFile == false) return;

  //   const now: number = Date.now();
  //   const oneHourMS: number = 60 * 60 * 1000;
  //   const timeLeft: number = oneHourMS - (now - userFile.elfenhefen.lastUsed);

  //   //user noch auf Cooldown
  //   if (now - userFile.elfenhefen.lastUsed < oneHourMS) {
  //     chatClient.say(
  //       channel,
  //       `@${user} du kannst in ${
  //         msToTime(timeLeft)[1] > 0
  //           ? msToTime(timeLeft)[1] == 1
  //             ? `${msToTime(timeLeft)[1]} Minute und `
  //             : `${msToTime(timeLeft)[1]} Minuten und `
  //           : ''
  //       }${
  //         msToTime(timeLeft)[2] == 1 ? `${msToTime(timeLeft)[2]} Sekunde` : `${msToTime(timeLeft)[2]} Sekunden`
  //       } wieder deine Elfen los schicken.`
  //     );
  //     logger(`!elfenhelfen ${user} on Cooldown`);
  //     return;
  //   }

  //   //User kann Elfen los schicken
  //   try {
  //     const weihnachtsGegenstaende: WeihnachtsGegenstaende = JSON.parse(
  //       await fs.promises.readFile(`./JSON/Weihnachten 2022/weihnachtsGegenstaende.json`, 'utf8')
  //     );

  //     const elfenGegenstand: string = pickRandom(weihnachtsGegenstaende.stufe1.concat(weihnachtsGegenstaende.stufe2));
  //     const rnd: number = getRandomInt(0, 101) / 100;
  //     const elfenFutter: number = rnd <= 0.2 ? 1 : 0;
  //     const elfenDeko: string[] = pickRandoms(weihnachtsGegenstaende.deko, getRandomInt(1, 3));

  //     //Elfen benutzen
  //     userFile.elfenhefen.lastUsed = now;

  //     //Füge Objekte zu User hinzu
  //     if (userFile.objekte.gefunden[elfenGegenstand] == null) {
  //       userFile.objekte.gefunden[elfenGegenstand] = 1;
  //     } else {
  //       userFile.objekte.gefunden[elfenGegenstand] += 1;
  //     }

  //     //Füge Deko zu User hinzu
  //     elfenDeko.forEach((dekoGegenstand) => {
  //       if (userFile == false) return;
  //       if (userFile.deko[dekoGegenstand] == null) {
  //         userFile.deko[dekoGegenstand] = 1;
  //       } else {
  //         userFile.deko[dekoGegenstand] += 1;
  //       }
  //     });

  //     //Fügt Futter zu User hinzu
  //     userFile.rentier.futter += elfenFutter;

  //     //speicher userFile
  //     if (!XMas2022Helper.saveUserFile(userFile, user)) {
  //       return;
  //     }

  //     chatClient.say(
  //       channel,
  //       `@${user} deine Elfen finden: 1x ${elfenGegenstand}${elfenFutter == 1 ? ', 1x Futter' : ''} und ${
  //         elfenDeko.length == 1
  //           ? `diesen Dekogegenstand: ${elfenDeko}`
  //           : `diese Dekogegenstände: ${listMaker(elfenDeko)}`
  //       }`
  //     );
  //     logger(`!elfenhelfen [${user}]`);
  //     return;
  //   } catch {
  //     logger(`weihnachtsGegenstaende failed to read file`);
  //     return;
  //   }
  // });

  // //!wichteln
  // commandHandler.addCommand('wichteln', true, 0, 0, async ({ user, args, msg }) => {
  //   if ((msg.userInfo.isMod || msg.userInfo.isBroadcaster) && args.length > 0) {
  //     //!wichteln lostopf
  //     if (args[0].toLowerCase() == 'lostopf') {
  //       const allUserData: {
  //         [key: string]: WeihnachtsUser;
  //       } = await readFiles('./JSON/Weihnachten 2022/users/');

  //       let qualifiedUsers: string[] = [];
  //       Object.keys(allUserData).forEach((user) => {
  //         //add if >= 250 Wichtelpunkte
  //         if (allUserData[user].wichtelpunkte >= 250) {
  //           const userName: string = user.split('.')[0];
  //           qualifiedUsers.push(`${userName} [${allUserData[user].wichtelpunkte}]`);
  //         }
  //       });

  //       //check if 0 qualified
  //       if (qualifiedUsers.length == 0) {
  //         chatClient.say(channel, `Es hat sich leider niemand qualifiziert...`);
  //         logger(`!wichteln lostopf - niemand qualifiziert`);
  //         return;
  //       }

  //       //say in chat
  //       chatClient.announce(
  //         channel,
  //         `Im Lostopf für die Wichtelpunkte [>=250] ${qualifiedUsers.length == 1 ? 'ist' : 'sind'}:`
  //       );
  //       multiSay(channel, chatClient, ',', listMaker(qualifiedUsers));
  //       logger(`!wichteln lostopf`);
  //       return;
  //     }

  //     //!wichteln verlosung
  //     if (args[0].toLowerCase() == 'verlosung' || args[0].toLowerCase() == 'auslosung') {
  //       try {
  //         let gewinnerFile: GewinnerFile = JSON.parse(
  //           await fs.promises.readFile(`./JSON/Weihnachten 2022/gewinnerFile.json`, 'utf8')
  //         );

  //         const allUserData: {
  //           [key: string]: WeihnachtsUser;
  //         } = await readFiles('./JSON/Weihnachten 2022/users/');

  //         let qualifiedUsers: string[] = [];
  //         Object.keys(allUserData).forEach((user) => {
  //           //add if >= 250 Wichtelpunkte && not yet won
  //           const userName: string = user.split('.')[0];
  //           if (allUserData[user].wichtelpunkte >= 250 && !gewinnerFile.wichtelpunkte.includes(userName)) {
  //             qualifiedUsers.push(userName);
  //             //300 = 2x, 400 = 3x, etc.
  //             for (let i = 3; i <= Math.floor(allUserData[user].wichtelpunkte / 100); i++) {
  //               qualifiedUsers.push(userName);
  //             }
  //           }
  //         });

  //         //check if 0 qualified
  //         if (qualifiedUsers.length == 0) {
  //           chatClient.say(channel, `Es hat sich leider niemand qualifiziert...`);
  //           logger(`!wichteln lostopf - niemand qualifiziert`);
  //           return;
  //         }

  //         const winner: string = pickRandom(qualifiedUsers).split(' ')[0];

  //         gewinnerFile.wichtelpunkte.push(winner);

  //         //write gewinnerFile
  //         try {
  //           await fs.promises.writeFile(
  //             `./JSON/Weihnachten 2022/gewinnerFile.json`,
  //             JSON.stringify(gewinnerFile, null, 4),
  //             'utf8'
  //           );
  //           logger(`gewinnerFile saved`);
  //         } catch {
  //           logger(`gewinnerFile save failed.`);
  //           return;
  //         }

  //         //say in chat
  //         chatClient.announce(channel, `Und gewonnen hat:`);
  //         // chatClient.say(channel, winner);
  //         mythicAnnouncement(chatClient, channel, mysticWords, '', `@${winner} xicanmHyped Gratulation!`);
  //         logger(`!wichteln verlosung [${winner}]`);
  //         return;
  //       } catch {
  //         logger(`ERROR failed to read gewinnerFile.`);
  //         return;
  //       }
  //     }

  //     //!wichteln top
  //     if (args[0].toLowerCase() == 'top') {
  //       const allUserData: {
  //         [key: string]: WeihnachtsUser;
  //       } = await readFiles('./JSON/Weihnachten 2022/users/');

  //       let allUsers: [string, number][] = [];
  //       Object.keys(allUserData).forEach((user) => {
  //         const userName: string = user.split('.')[0];
  //         allUsers.push([userName, allUserData[user].wichtelpunkte]);
  //       });

  //       //sort users
  //       allUsers.sort(function (a, b) {
  //         return a[1] - b[1];
  //       });

  //       //create top 10
  //       const topTenData: [string, number][] = allUsers.slice(-10).reverse();
  //       let topTenText: string[] = [];
  //       topTenData.forEach((entry) => {
  //         topTenText.push(`${topTenData.indexOf(entry) + 1}: ${entry[0]} [${entry[1]}]`);
  //       });

  //       //tell Chat
  //       chatClient.announce(channel, `Die Top 10 für die Wichtelpunkte:`);
  //       chatClient.say(channel, listMaker(topTenText));
  //       logger(`!wichteln top`);
  //       return;
  //     }
  //   }

  //   // if stream is not online return
  //   if (!botControl.streamerOnline) return;
  //   let userFile: WeihnachtsUser | false = await XMas2022Helper.getUserFile(user);
  //   if (userFile == false) return;

  //   //bots
  //   const bots: string[] = ['nightbot', 'streamelements', 'eirohbot', 'soundalerts', 'fossabot', 'commanderroot'];

  //   //!wichteln
  //   if (args.length == 0) {
  //     let wichtelbareGegenstände: string[] = [];
  //     Object.entries(userFile.objekte.gefunden).forEach((objekt) => {
  //       if (objekt[1] > 1) wichtelbareGegenstände.push(objekt[0]);
  //     });

  //     if (wichtelbareGegenstände.length == 0) {
  //       chatClient.say(channel, `@${user} du hast derzeit keine Gegenstände, die du wichteln kannst.`);
  //     } else {
  //       multiSay(
  //         channel,
  //         chatClient,
  //         ",",
  //         `@${user} du kannst ${
  //           wichtelbareGegenstände.length == 1 ? `diesen Gegenstand` : `diese Gegenstände`
  //         } wichteln: ${listMaker(wichtelbareGegenstände)}`
  //       );
  //     }

  //     logger(`!wichteln [${user}]`);
  //     return;
  //   }

  //   //!wichteln punkte
  //   if (args[0].toLowerCase() == 'punkte') {
  //     //hat noch keine Punkte
  //     if (userFile.wichtelpunkte == 0) {
  //       chatClient.say(
  //         channel,
  //         `@${user} du hast noch keine Wichtelpunkte. Benutze "!wichteln" um zu sehen, welche Gegenstände du wichteln kannst.`
  //       );
  //       logger(`!wichteln punkte [${user}] hat keine Punkte`);
  //       return;
  //     }

  //     //hat Punkte
  //     chatClient.say(
  //       channel,
  //       `@${user} du hast derzeit ${
  //         userFile.wichtelpunkte == 1 ? `einen Wichtelpunkt` : `${userFile.wichtelpunkte} Wichtelpunkte`
  //       }.`
  //     );
  //     logger(`!wichteln punkte [${user}]`);
  //     return;
  //   }

  //   //!wichteln [User] [Gegenstand]
  //   if (args[0].startsWith('@')) {
  //     let chatters: string[] = (await xicanmeowApiClient.unsupported.getChatters('xicanmeow'))!.allChatters;
  //     const wichtelGegenstand: string = args.slice(1).join(' ');
  //     let wichtelbareGegenstände: string[] = [];
  //     Object.entries(userFile.objekte.gefunden).forEach((objekt) => {
  //       if (objekt[1] > 1) wichtelbareGegenstände.push(objekt[0]);
  //     });

  //     let target: string = args[0].toLowerCase();
  //     if (target.startsWith('@')) target = target.slice(1);

  //     //selftarget
  //     if (target == user) {
  //       chatClient.say(channel, `Nice Try @${user}... Aber nicht mit mir! :P`);
  //       logger(`!wichteln selftarget`);
  //       return;
  //     }

  //     //target == bot
  //     if (bots.includes(target)) {
  //       chatClient.say(channel, `@${user} du kannst den Bots leider nichts wichteln.`);
  //       logger(`!wichteln bot`);
  //       return;
  //     }

  //     //target nicht im Chat
  //     if (!chatters.includes(target)) {
  //       chatClient.say(
  //         channel,
  //         `@${user} dein Ziel scheint derzeit nicht im Chat zu sein. (Twitch ist etwas langsam mit dem aktualisieren der Liste. Versuche es evtl. in einer Minute nochmal.)`
  //       );
  //       logger(`!wichteln @${target} nicht im Chat`);
  //       return;
  //     }

  //     //kein valider Gegenstand
  //     try {
  //       const weihnachtsGegenstaende: WeihnachtsGegenstaende = JSON.parse(
  //         await fs.promises.readFile(`./JSON/Weihnachten 2022/weihnachtsGegenstaende.json`, 'utf8')
  //       );

  //       if (
  //         !weihnachtsGegenstaende.stufe1
  //           .concat(weihnachtsGegenstaende.stufe2, weihnachtsGegenstaende.stufe3)
  //           .includes(wichtelGegenstand)
  //       ) {
  //         chatClient.say(
  //           channel,
  //           `@${user} bitte gib einen gültigen Gegenstand an. Benutze "!wichteln" um zu sehen, welche Gegenstände du wichteln kannst.`
  //         );
  //         logger(`!wichteln [${wichtelGegenstand}] [${user}] ungültiger Gegenstand`);
  //         return;
  //       }
  //     } catch {
  //       logger(`weihnachtsGegenstaende failed to read file`);
  //       return;
  //     }

  //     //nicht wichtelbar
  //     if (!wichtelbareGegenstände.includes(wichtelGegenstand)) {
  //       chatClient.say(
  //         channel,
  //         `@${user} bitte gib einen Gegenstand an, von dem du mindestens zwei Exemplare besitzt. Benutze "!wichteln" um zu sehen, welche Gegenstände du wichteln kannst.`
  //       );
  //       logger(`!wichteln [${wichtelGegenstand}] [${user}] Gegenstand nicht wichtelbar`);
  //       return;
  //     }

  //     //kann gewichtelt werden
  //     //remove & add object
  //     let targetFile: WeihnachtsUser | false = await XMas2022Helper.getUserFile(target);
  //     if (targetFile == false) return;

  //     userFile.objekte.gefunden[wichtelGegenstand] -= 1;
  //     if (targetFile.objekte.gewichtelt[wichtelGegenstand] == null) {
  //       targetFile.objekte.gewichtelt[wichtelGegenstand] = 1;
  //     } else {
  //       targetFile.objekte.gewichtelt[wichtelGegenstand] += 1;
  //     }

  //     //Wichtelpunkte
  //     let wichtelPunkte: number = 0;
  //     try {
  //       const weihnachtsGegenstaende: WeihnachtsGegenstaende = JSON.parse(
  //         await fs.promises.readFile(`./JSON/Weihnachten 2022/weihnachtsGegenstaende.json`, 'utf8')
  //       );

  //       if (weihnachtsGegenstaende.stufe1.includes(wichtelGegenstand)) {
  //         userFile.wichtelpunkte += 1;
  //         wichtelPunkte = 1;
  //       } else if (weihnachtsGegenstaende.stufe2.includes(wichtelGegenstand)) {
  //         userFile.wichtelpunkte += 3;
  //         wichtelPunkte = 3;
  //       } else if (weihnachtsGegenstaende.stufe3.includes(wichtelGegenstand)) {
  //         userFile.wichtelpunkte += 5;
  //         wichtelPunkte = 5;
  //       }
  //     } catch {
  //       logger(`weihnachtsGegenstaende failed to read file`);
  //       return;
  //     }

  //     chatClient.say(
  //       channel,
  //       `@${user} wichtelt @${target} dieses tolle Ding: ${wichtelGegenstand} [+${wichtelPunkte} Wichtelpunkte]`
  //     );
  //     logger(`!wichteln ${user} -> ${target}: ${wichtelGegenstand}`);

  //     //speicher userFile
  //     if (!XMas2022Helper.saveUserFile(userFile, user)) {
  //       return;
  //     }

  //     //speicher targetFile
  //     try {
  //       await fs.promises.writeFile(
  //         `./JSON/Weihnachten 2022/users/${target}.json`,
  //         JSON.stringify(targetFile, null, 4),
  //         'utf8'
  //       );
  //       logger(`targetFile [${target}] saved`);
  //     } catch {
  //       logger(`targetFile [${target}] save failed.`);
  //       return;
  //     }
  //     return;
  //   }

  //   //!wichteln [Gegenstand]
  //   const wichtelGegenstand: string = args.join(' ');
  //   let wichtelbareGegenstände: string[] = [];
  //   Object.entries(userFile.objekte.gefunden).forEach((objekt) => {
  //     if (objekt[1] > 1) wichtelbareGegenstände.push(objekt[0]);
  //   });

  //   //kein valider Gegenstand
  //   try {
  //     const weihnachtsGegenstaende: WeihnachtsGegenstaende = JSON.parse(
  //       await fs.promises.readFile(`./JSON/Weihnachten 2022/weihnachtsGegenstaende.json`, 'utf8')
  //     );

  //     if (
  //       !weihnachtsGegenstaende.stufe1
  //         .concat(weihnachtsGegenstaende.stufe2, weihnachtsGegenstaende.stufe3)
  //         .includes(wichtelGegenstand)
  //     ) {
  //       chatClient.say(
  //         channel,
  //         `@${user} bitte gib einen gültigen Gegenstand an. Benutze "!wichteln" um zu sehen, welche Gegenstände du wichteln kannst.`
  //       );
  //       logger(`!wichteln [${wichtelGegenstand}] [${user}] ungültiger Gegenstand`);
  //       return;
  //     }
  //   } catch {
  //     logger(`weihnachtsGegenstaende failed to read file`);
  //     return;
  //   }

  //   //nicht wichtelbar
  //   if (!wichtelbareGegenstände.includes(wichtelGegenstand)) {
  //     chatClient.say(
  //       channel,
  //       `@${user} bitte gib einen Gegenstand an, von dem du mindestens zwei Exemplare besitzt. Benutze "!wichteln" um zu sehen, welche Gegenstände du wichteln kannst.`
  //     );
  //     logger(`!wichteln [${wichtelGegenstand}] [${user}] Gegenstand nicht wichtelbar`);
  //     return;
  //   }

  //   //kann gewichtelt werden
  //   let chatters: string[] = (await xicanmeowApiClient.unsupported.getChatters('xicanmeow'))!.allChatters;
  //   if (chatters.includes(user)) chatters.splice(chatters.indexOf(user), 1);
  //   //remove bots
  //   for (const bot of bots) {
  //     if (chatters.includes(bot)) {
  //       chatters.splice(chatters.indexOf(bot), 1);
  //     }
  //   }

  //   //no targets
  //   if (chatters.length == 0) {
  //     chatClient.say(
  //       channel,
  //       `@${user} es scheint sich sonst kein Mensch im Chat zu befinden... Versuche es doch später noch einmal. (Twitch ist etwas langsam mit dem aktualisieren der Liste. Versuche es evtl. in einer Minute nochmal.)`
  //     );
  //     logger(`!wichteln [gegenstand]: no valid targets`);
  //     return;
  //   }

  //   const target: string = pickRandom(chatters);

  //   //remove & add object
  //   let targetFile: WeihnachtsUser | false = await XMas2022Helper.getUserFile(target);
  //   if (targetFile == false) return;

  //   userFile.objekte.gefunden[wichtelGegenstand] -= 1;
  //   if (targetFile.objekte.gewichtelt[wichtelGegenstand] == null) {
  //     targetFile.objekte.gewichtelt[wichtelGegenstand] = 1;
  //   } else {
  //     targetFile.objekte.gewichtelt[wichtelGegenstand] += 1;
  //   }

  //   //Wichtelpunkte
  //   let wichtelPunkte: number = 0;
  //   try {
  //     const weihnachtsGegenstaende: WeihnachtsGegenstaende = JSON.parse(
  //       await fs.promises.readFile(`./JSON/Weihnachten 2022/weihnachtsGegenstaende.json`, 'utf8')
  //     );

  //     if (weihnachtsGegenstaende.stufe1.includes(wichtelGegenstand)) {
  //       userFile.wichtelpunkte += 1;
  //       wichtelPunkte = 1;
  //     } else if (weihnachtsGegenstaende.stufe2.includes(wichtelGegenstand)) {
  //       userFile.wichtelpunkte += 3;
  //       wichtelPunkte = 3;
  //     } else if (weihnachtsGegenstaende.stufe3.includes(wichtelGegenstand)) {
  //       userFile.wichtelpunkte += 5;
  //       wichtelPunkte = 5;
  //     }
  //   } catch {
  //     logger(`weihnachtsGegenstaende failed to read file`);
  //     return;
  //   }

  //   chatClient.say(
  //     channel,
  //     `@${user} wichtelt @${target} dieses tolle Ding: ${wichtelGegenstand} [+${wichtelPunkte} Wichtelpunkte]`
  //   );
  //   logger(`!wichteln ${user} -> ${target}: ${wichtelGegenstand}`);

  //   //speicher userFile
  //   if (!XMas2022Helper.saveUserFile(userFile, user)) {
  //     return;
  //   }

  //   //speicher targetFile
  //   try {
  //     await fs.promises.writeFile(
  //       `./JSON/Weihnachten 2022/users/${target}.json`,
  //       JSON.stringify(targetFile, null, 4),
  //       'utf8'
  //     );
  //     logger(`targetFile [${target}] saved`);
  //   } catch {
  //     logger(`targetFile [${target}] save failed.`);
  //     return;
  //   }
  // });

  // commandHandler.addCommand('wichtelpunkte', true, 0, 0, async ({ user }) => {
  //   let userFile: WeihnachtsUser | false = await XMas2022Helper.getUserFile(user);
  //   if (userFile == false) return;

  //   //hat noch keine Punkte
  //   if (userFile.wichtelpunkte == 0) {
  //     chatClient.say(
  //       channel,
  //       `@${user} du hast noch keine Wichtelpunkte. Benutze "!wichteln" um zu sehen, welche Gegenstände du wichteln kannst.`
  //     );
  //     logger(`!wichteln punkte [${user}] hat keine Punkte`);
  //     return;
  //   }

  //   //hat Punkte
  //   chatClient.say(
  //     channel,
  //     `@${user} du hast derzeit ${
  //       userFile.wichtelpunkte == 1 ? `einen Wichtelpunkt` : `${userFile.wichtelpunkte} Wichtelpunkte`
  //     }.`
  //   );
  //   logger(`!wichteln punkte [${user}]`);
  //   return;
  // });

  // //inventar

  // //!gegenstände
  // commandHandler.addCommand('gegenstände', true, 0, 0, async ({ user, args, msg }) => {
  //   if ((msg.userInfo.isMod || msg.userInfo.isBroadcaster) && args.length > 0) {
  //     //!gegenstände lostopf
  //     if (args[0].toLowerCase() == 'lostopf') {
  //       const allUserData: {
  //         [key: string]: WeihnachtsUser;
  //       } = await readFiles('./JSON/Weihnachten 2022/users/');

  //       let qualifiedUsers: string[] = [];
  //       Object.keys(allUserData).forEach((user) => {
  //         const gefundeneGegenstände: { [key: string]: number } = allUserData[user].objekte.gefunden;
  //         const gewichtelteGegenstände: { [key: string]: number } = allUserData[user].objekte.gewichtelt;

  //         //Anzahl uniquer Gegenstände
  //         const uniqueGegenstände: number = [
  //           ...new Set(Object.keys(gefundeneGegenstände).concat(Object.keys(gewichtelteGegenstände))),
  //         ].length;

  //         //add if >= 80
  //         if (uniqueGegenstände >= 80) {
  //           const userName: string = user.split('.')[0];
  //           qualifiedUsers.push(`${userName} [${uniqueGegenstände}]`);
  //         }
  //       });

  //       //check if 0 qualified
  //       if (qualifiedUsers.length == 0) {
  //         chatClient.say(channel, `Es hat sich leider niemand qualifiziert...`);
  //         logger(`!gegenstände lostopf - niemand qualifiziert`);
  //         return;
  //       }

  //       //say in chat
  //       chatClient.announce(
  //         channel,
  //         `Im Lostopf für [80/200] Gegenständen ${qualifiedUsers.length == 1 ? 'ist' : 'sind'}:`
  //       );
  //       multiSay(channel, chatClient, ',', listMaker(qualifiedUsers));
  //       logger(`!gegenstände lostopf`);
  //       return;
  //     }

  //     //!gegenstände verlosung
  //     if (args[0].toLowerCase() == 'verlosung' || args[0].toLowerCase() == 'auslosung') {
  //       try {
  //         let gewinnerFile: GewinnerFile = JSON.parse(
  //           await fs.promises.readFile(`./JSON/Weihnachten 2022/gewinnerFile.json`, 'utf8')
  //         );

  //         const allUserData: {
  //           [key: string]: WeihnachtsUser;
  //         } = await readFiles('./JSON/Weihnachten 2022/users/');

  //         let qualifiedUsers: string[] = [];
  //         Object.keys(allUserData).forEach((user) => {
  //           const gefundeneGegenstände: { [key: string]: number } = allUserData[user].objekte.gefunden;
  //           const gewichtelteGegenstände: { [key: string]: number } = allUserData[user].objekte.gewichtelt;

  //           //Anzahl uniquer Gegenstände
  //           const uniqueGegenstände: number = [
  //             ...new Set(Object.keys(gefundeneGegenstände).concat(Object.keys(gewichtelteGegenstände))),
  //           ].length;

  //           //add if >= 80 && not yet won
  //           const userName: string = user.split('.')[0];
  //           if (uniqueGegenstände >= 80 && !gewinnerFile.gegenstände.includes(userName)) {
  //             qualifiedUsers.push(`${userName} [${uniqueGegenstände}]`);
  //           }
  //         });

  //         //check if 0 qualified
  //         if (qualifiedUsers.length == 0) {
  //           chatClient.say(channel, `Es hat sich leider niemand qualifiziert...`);
  //           logger(`!gegenstände verlosung - niemand qualifiziert`);
  //           return;
  //         }

  //         const winner: string = pickRandom(qualifiedUsers).split(' ')[0];

  //         gewinnerFile.gegenstände.push(winner);

  //         //write gewinnerFile
  //         try {
  //           await fs.promises.writeFile(
  //             `./JSON/Weihnachten 2022/gewinnerFile.json`,
  //             JSON.stringify(gewinnerFile, null, 4),
  //             'utf8'
  //           );
  //           logger(`gewinnerFile saved`);
  //         } catch {
  //           logger(`gewinnerFile save failed.`);
  //           return;
  //         }

  //         //say in chat
  //         chatClient.announce(channel, `Und gewonnen hat:`);
  //         // chatClient.say(channel, winner);
  //         mythicAnnouncement(chatClient, channel, mysticWords, '', `@${winner} xicanmHyped Gratulation!`);
  //         logger(`!gegenstände verlosung [${winner}]`);
  //         return;
  //       } catch {
  //         logger(`ERROR failed to read gewinnerFile.`);
  //         return;
  //       }
  //     }

  //     //!gegenstände top
  //     if (args[0].toLowerCase() == 'top') {
  //       const allUserData: {
  //         [key: string]: WeihnachtsUser;
  //       } = await readFiles('./JSON/Weihnachten 2022/users/');

  //       let allUsers: [string, number][] = [];
  //       Object.keys(allUserData).forEach((user) => {
  //         const gefundeneGegenstände: { [key: string]: number } = allUserData[user].objekte.gefunden;
  //         const gewichtelteGegenstände: { [key: string]: number } = allUserData[user].objekte.gewichtelt;

  //         //Anzahl uniquer Gegenstände
  //         const uniqueGegenstände: number = [
  //           ...new Set(Object.keys(gefundeneGegenstände).concat(Object.keys(gewichtelteGegenstände))),
  //         ].length;

  //         const userName: string = user.split('.')[0];
  //         allUsers.push([userName, uniqueGegenstände]);
  //       });

  //       //sort users
  //       allUsers.sort(function (a, b) {
  //         return a[1] - b[1];
  //       });

  //       //create top 10
  //       const topTenData: [string, number][] = allUsers.slice(-10).reverse();
  //       let topTenText: string[] = [];
  //       topTenData.forEach((entry) => {
  //         topTenText.push(`${topTenData.indexOf(entry) + 1}: ${entry[0]} [${entry[1]}]`);
  //       });

  //       //tell Chat
  //       chatClient.announce(channel, `Die Top 10 für die Gegenstände:`);
  //       chatClient.say(channel, listMaker(topTenText));
  //       logger(`!gegenstände top`);
  //       return;
  //     }
  //   }

  //   //!gegenstände
  //   let userFile: WeihnachtsUser | false = await XMas2022Helper.getUserFile(user);
  //   if (userFile == false) return;

  //   const gefundeneGegenstände: { [key: string]: number } = userFile.objekte.gefunden;
  //   const gewichtelteGegenstände: { [key: string]: number } = userFile.objekte.gewichtelt;

  //   let gefundeneGegenständeText: string[] = [];
  //   Object.entries(gefundeneGegenstände).forEach((entry) => {
  //     const entryText: string = `${entry[0]} [${entry[1]}]`;
  //     gefundeneGegenständeText.push(entryText);
  //   });

  //   let gewichtelteGegenständeText: string[] = [];
  //   Object.entries(gewichtelteGegenstände).forEach((entry) => {
  //     const entryText: string = `${entry[0]} [${entry[1]}]`;
  //     gewichtelteGegenständeText.push(entryText);
  //   });

  //   //Liste aller besessenen Gegenstände
  //   const uniqueGegenstände: string[] = [
  //     ...new Set(Object.keys(gefundeneGegenstände).concat(Object.keys(gewichtelteGegenstände))),
  //   ];

  //   //hat noch keine Gegenstände
  //   if (uniqueGegenstände.length == 0) {
  //     chatClient.say(
  //       channel,
  //       `@${user} du hast noch keine Gegenstände gefunden. Öffne doch ein Türchen mit "!türchen [tag]".`
  //     );
  //     logger(`!gegenstände [${user}] hat keine Gegenstände`);
  //     return;
  //   }

  //   //hat Gegenstände
  //   multiSay(
  //     channel,
  //     chatClient,
  //     ' ',
  //     `@${user} du hast folgende Gegenstände [${uniqueGegenstände.length}/200]: Gefunden: ${listMaker(
  //       gefundeneGegenständeText
  //     )} | Gewichtelt: ${listMaker(gewichtelteGegenständeText)}`
  //   );
  //   logger(`!gegenstände [${user}]`);
  //   return;
  // });

  // //!futter
  // commandHandler.addCommand('futter', true, 0, 0, async ({ user }) => {
  //   let userFile: WeihnachtsUser | false = await XMas2022Helper.getUserFile(user);
  //   if (userFile == false) return;

  //   chatClient.say(channel, `@${user} du hast derzeit ${userFile.rentier.futter} Futter.`);
  //   logger(`!futter [${user}]`);
  // });

  // //!deko
  // commandHandler.addCommand('deko', true, 0, 0, async ({ user, args, msg }) => {
  //   if ((msg.userInfo.isMod || msg.userInfo.isBroadcaster) && args.length > 0) {
  //     //!deko lostopf
  //     if (args[0].toLowerCase() == 'lostopf') {
  //       const allUserData: {
  //         [key: string]: WeihnachtsUser;
  //       } = await readFiles('./JSON/Weihnachten 2022/users/');

  //       let qualifiedUsers: string[] = [];
  //       Object.keys(allUserData).forEach((user) => {
  //         //add if >= 150 Dekogegenstände
  //         let dekoSumme: number = Object.values(allUserData[user].deko).reduce((a: number, b: number) => a + b, 0);
  //         if (dekoSumme >= 150) {
  //           const userName: string = user.split('.')[0];
  //           qualifiedUsers.push(`${userName} [${dekoSumme}]`);
  //         }
  //       });

  //       //check if 0 qualified
  //       if (qualifiedUsers.length == 0) {
  //         chatClient.say(channel, `Es hat sich leider niemand qualifiziert...`);
  //         logger(`!deko lostopf - niemand qualifiziert`);
  //         return;
  //       }

  //       //say in chat
  //       chatClient.announce(
  //         channel,
  //         `Im Lostopf für [>=150] Dekogegenstände ${qualifiedUsers.length == 1 ? 'ist' : 'sind'}:`
  //       );
  //       multiSay(channel, chatClient, ',', listMaker(qualifiedUsers));
  //       logger(`!deko lostopf`);
  //       return;
  //     }

  //     //!deko verlosung
  //     if (args[0].toLowerCase() == 'verlosung' || args[0].toLowerCase() == 'auslosung') {
  //       try {
  //         let gewinnerFile: GewinnerFile = JSON.parse(
  //           await fs.promises.readFile(`./JSON/Weihnachten 2022/gewinnerFile.json`, 'utf8')
  //         );

  //         const allUserData: {
  //           [key: string]: WeihnachtsUser;
  //         } = await readFiles('./JSON/Weihnachten 2022/users/');

  //         let qualifiedUsers: string[] = [];
  //         Object.keys(allUserData).forEach((user) => {
  //           //add if >= 150 Dekogegenstände && not yet won
  //           let dekoSumme: number = Object.values(allUserData[user].deko).reduce((a: number, b: number) => a + b, 0);
  //           const userName: string = user.split('.')[0];
  //           if (dekoSumme >= 150 && !gewinnerFile.deko.includes(userName)) {
  //             qualifiedUsers.push(userName);
  //             //200 = 2x, 300 = 3x, etc.
  //             for (let i = 2; i <= Math.floor(dekoSumme / 100); i++) {
  //               qualifiedUsers.push(userName);
  //             }
  //           }
  //         });

  //         //check if 0 qualified
  //         if (qualifiedUsers.length == 0) {
  //           chatClient.say(channel, `Es hat sich leider niemand qualifiziert...`);
  //           logger(`!deko lostopf - niemand qualifiziert`);
  //           return;
  //         }

  //         const winner: string = pickRandom(qualifiedUsers);

  //         gewinnerFile.deko.push(winner);

  //         //write gewinnerFile
  //         try {
  //           await fs.promises.writeFile(
  //             `./JSON/Weihnachten 2022/gewinnerFile.json`,
  //             JSON.stringify(gewinnerFile, null, 4),
  //             'utf8'
  //           );
  //           logger(`gewinnerFile saved`);
  //         } catch {
  //           logger(`gewinnerFile save failed.`);
  //           return;
  //         }

  //         //say in chat
  //         chatClient.announce(channel, `Und gewonnen hat:`);
  //         // chatClient.say(channel, winner);
  //         mythicAnnouncement(chatClient, channel, mysticWords, '', `@${winner} xicanmHyped Gratulation!`);
  //         logger(`!deko verlosung [${winner}]`);
  //         return;
  //       } catch {
  //         logger(`ERROR failed to read gewinnerFile.`);
  //         return;
  //       }
  //     }

  //     //!deko top
  //     if (args[0].toLowerCase() == 'top') {
  //       const allUserData: {
  //         [key: string]: WeihnachtsUser;
  //       } = await readFiles('./JSON/Weihnachten 2022/users/');

  //       let allUsers: [string, number][] = [];
  //       Object.keys(allUserData).forEach((user) => {
  //         let dekoSumme: number = Object.values(allUserData[user].deko).reduce((a: number, b: number) => a + b, 0);
  //         const userName: string = user.split('.')[0];
  //         allUsers.push([userName, dekoSumme]);
  //       });

  //       //sort users
  //       allUsers.sort(function (a, b) {
  //         return a[1] - b[1];
  //       });

  //       //create top 10
  //       const topTenData: [string, number][] = allUsers.slice(-10).reverse();
  //       let topTenText: string[] = [];
  //       topTenData.forEach((entry) => {
  //         topTenText.push(`${topTenData.indexOf(entry) + 1}: ${entry[0]} [${entry[1]}]`);
  //       });

  //       //tell Chat
  //       chatClient.announce(channel, `Die Top 10 für die Deko:`);
  //       chatClient.say(channel, listMaker(topTenText));
  //       logger(`!deko top`);
  //       return;
  //     }
  //   }

  //   let userFile: WeihnachtsUser | false = await XMas2022Helper.getUserFile(user);
  //   if (userFile == false) return;

  //   //hat keine Deko
  //   if (Object.keys(userFile.deko).length == 0) {
  //     chatClient.say(
  //       channel,
  //       `@${user} du hast derzeit keine Dekogegenstände. Öffne doch ein Türchen mit "!türchen [tag]".`
  //     );
  //     logger(`!deko [${user}] hat keine Deko`);
  //     return;
  //   }

  //   //hat Deko
  //   const deko: { [key: string]: number } = userFile.deko;
  //   const dekoSumme: number = Object.values(userFile.deko).reduce((a: number, b: number) => a + b, 0);

  //   let dekoText: string[] = [];
  //   Object.entries(deko).forEach((entry) => {
  //     const entryText: string = `${entry[0]} [${entry[1]}]`;
  //     dekoText.push(entryText);
  //   });

  //   multiSay(
  //     channel,
  //     chatClient,
  //     ' ',
  //     `@${user} du hast folgende Dekogegenstände [${dekoSumme}]: ${listMaker(dekoText)}`
  //   );
  //   logger(`!deko [${user}]`);
  //   return;
  // });

  //#endregion Weihnachtsspiel 2022

  // //#region Hogwarts Legacy
  // //#region Häuser
  // // !sprechenderhut
  // commandHandler.addCommand("sprechenderhut", true, 0, 0, async ({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!sprechenderhut: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //new User
  //   if(userFile == null) userFile = await Huhnwarts2023Helper.newUser(userId, apiClient);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!sprechenderhut: ERROR! newUser [${user}]`);
  //     return;
  //   }

  //   //user already has a house//
  //   if(userFile.HausID != 0) {
  //     const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(userFile.HausID);
  //     //ERROR
  //     if(hausName == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!sprechenderhut: ERROR! getHaus`);
  //       return;
  //     }
  //     //Haus does not exist ---- should never happen
  //     if(hausName == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!sprechenderhut: Haus Nr. ${userFile.HausID} existiert nicht.`);
  //       return;
  //     }

  //     //say in chat//
  //     chatClient.say(channel, `@${user} du bist bereits Teil des Hauses ${hausName}.`);
  //     logger(`!sprechenderhut: @${user} - ${hausName}`);
  //     return;
  //   }

  //   //choose house//
  //   const hausID: number = getRandomInt(1, 6); // 1|2|3|4|5
  //   userFile.HausID = hausID;
  //   const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(hausID);
  //   //ERROR
  //   if(hausName == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!sprechenderhut: ERROR! getHaus`);
  //     return;
  //   }
  //   //Haus does not exist ---- should never happen
  //   if(hausName == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!sprechenderhut: Haus Nr. ${hausID} existiert nicht.`);
  //     return;
  //   }

  //   //write user file//
  //   const writeFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!sprechenderhut: ERROR! writeUserFile`);
  //     return;
  //   }

  //   //say in chat//
  //   chatClient.say(channel, `@${user} Gratulation! Du bist nun Teil des Hauses ${hausName}!`);
  //   logger(`!sprechenderhut: @${user} new ${hausName}`);
  // });

  // //!hausgryffindor
  // commandHandler.addCommand("hausgryffindor", true, 0, 0, async ({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
      
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausgryffindor: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //new User
  //   if(userFile == null) userFile = await Huhnwarts2023Helper.newUser(userId, apiClient);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausgryffindor: ERROR! newUser [${user}]`);
  //     return;
  //   }

  //   //user already has a house//
  //   if(userFile.HausID != 0) {
  //     const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(userFile.HausID);
  //     //ERROR
  //     if(hausName == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!hausgryffindor: ERROR! getHaus`);
  //       return;
  //     }
  //     //Haus does not exist ---- should never happen
  //     if(hausName == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!hausgryffindor: Haus Nr. ${userFile.HausID} existiert nicht.`);
  //       return;
  //     }

  //     //say in chat//
  //     chatClient.say(channel, `@${user} du bist bereits Teil des Hauses ${hausName}.`);
  //     logger(`!hausgryffindor: @${user} - ${hausName}`);
  //     return;
  //   }

  //   //choose house//
  //   const hausID: number = 1; //Gryffindor
  //   userFile.HausID = hausID;
  //   const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(hausID);
  //   //ERROR
  //   if(hausName == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausgryffindor: ERROR! getHaus`);
  //     return;
  //   }
  //   //Haus does not exist ---- should never happen
  //   if(hausName == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausgryffindor: Haus Nr. ${hausID} existiert nicht.`);
  //     return;
  //   }

  //   //write user file//
  //   const writeFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausgryffindor: ERROR! writeUserFile`);
  //     return;
  //   }

  //   //say in chat//
  //   chatClient.say(channel, `@${user} Gratulation! Du bist nun Teil des Hauses ${hausName}!`);
  //   logger(`!hausgryffindor: @${user} new ${hausName}`);
  // });

  // //!hausslytherin
  // commandHandler.addCommand("hausslytherin", true, 0, 0, async ({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
      
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausslytherin: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //new User
  //   if(userFile == null) userFile = await Huhnwarts2023Helper.newUser(userId, apiClient);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausslytherin: ERROR! newUser [${user}]`);
  //     return;
  //   }

  //   //user already has a house//
  //   if(userFile.HausID != 0) {
  //     const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(userFile.HausID);
  //     //ERROR
  //     if(hausName == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!hausslytherin: ERROR! getHaus`);
  //       return;
  //     }
  //     //Haus does not exist ---- should never happen
  //     if(hausName == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!hausslytherin: Haus Nr. ${userFile.HausID} existiert nicht.`);
  //       return;
  //     }

  //     //say in chat//
  //     chatClient.say(channel, `@${user} du bist bereits Teil des Hauses ${hausName}.`);
  //     logger(`!hausslytherin: @${user} - ${hausName}`);
  //     return;
  //   }

  //   //choose house//
  //   const hausID: number = 4; // Slytherin
  //   userFile.HausID = hausID;
  //   const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(hausID);
  //   //ERROR
  //   if(hausName == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausslytherin: ERROR! getHaus`);
  //     return;
  //   }
  //   //Haus does not exist ---- should never happen
  //   if(hausName == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausslytherin: Haus Nr. ${hausID} existiert nicht.`);
  //     return;
  //   }

  //   //write user file//
  //   const writeFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausslytherin: ERROR! writeUserFile`);
  //     return;
  //   }

  //   //say in chat//
  //   chatClient.say(channel, `@${user} Gratulation! Du bist nun Teil des Hauses ${hausName}!`);
  //   logger(`!hausslytherin: @${user} new ${hausName}`);
  // });
  
  // //!hausravenclaw
  // commandHandler.addCommand("hausravenclaw", true, 0, 0, async ({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
      
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausravenclaw: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //new User
  //   if(userFile == null) userFile = await Huhnwarts2023Helper.newUser(userId, apiClient);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausravenclaw: ERROR! newUser [${user}]`);
  //     return;
  //   }

  //   //user already has a house//
  //   if(userFile.HausID != 0) {
  //     const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(userFile.HausID);
  //     //ERROR
  //     if(hausName == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!hausravenclaw: ERROR! getHaus`);
  //       return;
  //     }
  //     //Haus does not exist ---- should never happen
  //     if(hausName == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!hausravenclaw: Haus Nr. ${userFile.HausID} existiert nicht.`);
  //       return;
  //     }
  //     //say in chat//
  //     chatClient.say(channel, `@${user} du bist bereits Teil des Hauses ${hausName}.`);
  //     logger(`!hausravenclaw: @${user} - ${hausName}`);
  //     return;
  //   }

  //   //choose house//
  //   const hausID: number = 2; // Ravenclaw
  //   userFile.HausID = hausID;
  //   const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(hausID);
  //   //ERROR
  //   if(hausName == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausravenclaw: ERROR! getHaus`);
  //     return;
  //   }
  //   //Haus does not exist ---- should never happen
  //   if(hausName == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausravenclaw: Haus Nr. ${hausID} existiert nicht.`);
  //     return;
  //   }

  //   //write user file//
  //   const writeFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!hausravenclaw: ERROR! writeUserFile`);
  //     return;
  //   }

  //   //say in chat//
  //   chatClient.say(channel, `@${user} Gratulation! Du bist nun Teil des Hauses ${hausName}!`);
  //   logger(`!hausravenclaw: @${user} new ${hausName}`);
  // });

  // //!haushufflepuff
  // commandHandler.addCommand("haushufflepuff", true, 0, 0, async ({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
      
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!haushufflepuff: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //new User
  //   if(userFile == null) userFile = await Huhnwarts2023Helper.newUser(userId, apiClient);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!haushufflepuff: ERROR! newUser [${user}]`);
  //     return;
  //   }

  //   //user already has a house//
  //   if(userFile.HausID != 0) {
  //     const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(userFile.HausID);
  //     //ERROR
  //     if(hausName == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!haushufflepuff: ERROR! getHaus`);
  //       return;
  //     }
  //     //Haus does not exist ---- should never happen
  //     if(hausName == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!haushufflepuff: Haus Nr. ${userFile.HausID} existiert nicht.`);
  //       return;
  //     }
  //     //say in chat//
  //     chatClient.say(channel, `@${user} du bist bereits Teil des Hauses ${hausName}.`);
  //     logger(`!haushufflepuff: @${user} - ${hausName}`);
  //     return;
  //   }

  //   //choose house//
  //   const hausID: number = 3; // Hufflepuff
  //   userFile.HausID = hausID;
  //   const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(hausID);
  //   //ERROR
  //   if(hausName == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!haushufflepuff: ERROR! getHaus`);
  //     return;
  //   }
  //   //Haus does not exist ---- should never happen
  //   if(hausName == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!haushufflepuff: Haus Nr. ${hausID} existiert nicht.`);
  //     return;
  //   }

  //   //write user file//
  //   const writeFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!haushufflepuff: ERROR! writeUserFile`);
  //     return;
  //   }

  //   //say in chat//
  //   chatClient.say(channel, `@${user} Gratulation! Du bist nun Teil des Hauses ${hausName}!`);
  //   logger(`!haushufflepuff: @${user} new ${hausName}`);
  // });

  // //!haushuhnington
  // commandHandler.addCommand("haushuhnington", true, 0, 0, async ({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
      
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!huhnington: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //new User
  //   if(userFile == null) userFile = await Huhnwarts2023Helper.newUser(userId, apiClient);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!huhnington: ERROR! newUser [${user}]`);
  //     return;
  //   }

  //   //user already has a house//
  //   if(userFile.HausID != 0) {
  //     const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(userFile.HausID);
  //     //ERROR
  //     if(hausName == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnington: ERROR! getHaus`);
  //       return;
  //     }
  //     //Haus does not exist ---- should never happen
  //     if(hausName == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnington: Haus Nr. ${userFile.HausID} existiert nicht.`);
  //       return;
  //     }
  //     //say in chat//
  //     chatClient.say(channel, `@${user} du bist bereits Teil des Hauses ${hausName}.`);
  //     logger(`!huhnington: @${user} - ${hausName}`);
  //     return;
  //   }

  //   //choose house//
  //   const hausID: number = 5; //Muggle
  //   userFile.HausID = hausID;
  //   const hausName: string | false | null = await Huhnwarts2023Helper.getHaus(hausID);
  //   //ERROR
  //   if(hausName == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!huhnington: ERROR! getHaus`);
  //     return;
  //   }
  //   //Haus does not exist ---- should never happen
  //   if(hausName == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!huhnington: Haus Nr. ${hausID} existiert nicht.`);
  //     return;
  //   }

  //   //write user file//
  //   const writeFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!huhnington: ERROR! writeUserFile`);
  //     return;
  //   }

  //   //say in chat//
  //   chatClient.say(channel, `@${user} Gratulation! Du bist nun Teil des Hauses ${hausName}!`);
  //   logger(`!huhnington: @${user} new ${hausName}`);
  // });

  // //#endregion Haeuser

  // //#region Teams
  // //!teamgryffindor
  // commandHandler.addCommand("teamgryffindor", true, 0, 10, async ({channel}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   //get members//
  //   const teamFile: string[] | false | null = await Huhnwarts2023Helper.getHausMembers(1);
  //   //ERROR
  //   if(teamFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!teamgryffindor: ERROR! readHausUsersFile`);
  //     return;
  //   }
  //   //Haus has no members
  //   if(teamFile == null) {
  //     chatClient.say(channel, `Das Haus Gryffindor hat noch keine Mitglieder.`);
  //     logger(`!teamgryffindor: no members.`);
  //     return;
  //   }

  //   //say in chat//
  //   multiSay(channel, chatClient, " ", `Im Hause Gryffindor ${teamFile.length == 1 ? "ist" : "sind"}: ${listMaker(teamFile, ", ", "@")}`);
  //   logger(`!teamgryffindor`);
  // });

  // //!teamslytherin
  // commandHandler.addCommand("teamslytherin", true, 0, 10, async ({channel}) => {
  //   if(!botControl.streamerOnline) return;
        
  //   //get members//
  //   const teamFile: string[] | false | null = await Huhnwarts2023Helper.getHausMembers(4);
  //   //ERROR
  //   if(teamFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!teamslytherin: ERROR! readHausUsersFile`);
  //     return;
  //   }
  //   //Haus has no members
  //   if(teamFile == null) {
  //     chatClient.say(channel, `Das Haus Slytherin hat noch keine Mitglieder.`);
  //     logger(`!teamslytherin: no members.`);
  //     return;
  //   }

  //   //say in chat//
  //   multiSay(channel, chatClient, " ", `Im Hause Slytherin ${teamFile.length == 1 ? "ist" : "sind"}: ${listMaker(teamFile, ", ", "@")}`);
  //   logger(`!teamslytherin`);
  // });

  // //!teamravenclaw
  // commandHandler.addCommand("teamravenclaw", true, 0, 10, async ({channel}) => {
  //   if(!botControl.streamerOnline) return;
        
  //   //get members//
  //   const teamFile: string[] | false | null = await Huhnwarts2023Helper.getHausMembers(2);
  //   //ERROR
  //   if(teamFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!teamravenclaw: ERROR! readHausUsersFile`);
  //     return;
  //   }
  //   //Haus has no members
  //   if(teamFile == null) {
  //     chatClient.say(channel, `Das Haus Ravenclaw hat noch keine Mitglieder.`);
  //     logger(`!teamravenclaw: no members.`);
  //     return;
  //   }

  //   //say in chat//
  //   multiSay(channel, chatClient, " ", `Im Hause Ravenclaw ${teamFile.length == 1 ? "ist" : "sind"}: ${listMaker(teamFile, ", ", "@")}`);
  //   logger(`!teamravenclaw`);
  // });

  // //!teamhufflepuff
  // commandHandler.addCommand("teamhufflepuff", true, 0, 10, async ({channel}) => {
  //   if(!botControl.streamerOnline) return;
      
  //   //get members//
  //   const teamFile: string[] | false | null = await Huhnwarts2023Helper.getHausMembers(3);
  //   //ERROR
  //   if(teamFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!teamhufflepuff: ERROR! readHausUsersFile`);
  //     return;
  //   }
  //   //Haus has no members
  //   if(teamFile == null) {
  //     chatClient.say(channel, `Das Haus Hufflepuff hat noch keine Mitglieder.`);
  //     logger(`!teamhufflepuff: no members.`);
  //     return;
  //   }

  //   //say in chat//
  //   multiSay(channel, chatClient, " ", `Im Hause Hufflepuff ${teamFile.length == 1 ? "ist" : "sind"}: ${listMaker(teamFile, ", ", "@")}`);
  //   logger(`!teamhufflepuff`);
  // });

  // //!teamhuhnington
  // commandHandler.addCommand("teamhuhnington", true, 0, 10, async ({channel}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   //get members//
  //   const teamFile: string[] | false | null = await Huhnwarts2023Helper.getHausMembers(5);
  //   //ERROR
  //   if(teamFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!teamhuhnington: ERROR! readHausUsersFile`);
  //     return;
  //   }
  //   //Haus has no members
  //   if(teamFile == null) {
  //     chatClient.say(channel, `Es gibt noch keine Huhningtons.`);
  //     logger(`!teamhuhnington: no members.`);
  //     return;
  //   }

  //   //say in chat//
  //   multiSay(channel, chatClient, " ", `Im Hause Huhnington ${teamFile.length == 1 ? "ist" : "sind"}: ${listMaker(teamFile, ", ", "@")}`);
  //   logger(`!teamhuhnington`);
  // });

  // //#endregion Teams

  // //#region get things & trade
  // //!raumderwünsche
  // commandHandler.addCommand(["raumderwünsche", "raumderwuensche"], true, 0, 0, async ({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!raumderwünsche: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //new User
  //   if(userFile == null) userFile = await Huhnwarts2023Helper.newUser(userId, apiClient);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!raumderwünsche: ERROR! newUser [${user}]`);
  //     return;
  //   }

  //   //user does not belong to a house yet//
  //   if(userFile.HausID == 0) {
  //     chatClient.say(channel, `@${user}, du musst zuerst einem Haus beitreten.`);
  //     logger(`!raumderwünsche: user has no house [${user}]`);
  //     return;
  //   }

  //   //user has already used today//
  //   const date: Date = new Date();
  //   const today: number = Number(date.getFullYear().toString().concat((date.getMonth()+1).toString(), date.getDate().toString()));
  //   if(userFile.lastTimestampRDW.includes(today)) {
  //     chatClient.say(channel, `@${user}, du hast heute schon im Raum der Wünsche gesucht. Versuche es morgen wieder.`);
  //     logger(`!raumderwünsche: already searched [${user}]`);
  //     return;
  //   }

  //   //user searches//
  //   const futterFound: number = getRandomInt(10,21);
  //   //const futterFound: number = getRandomInt(50,100);
  //   const geisterschutztrankFound: number = getRandomInt(0,2);

  //   //save these
  //   userFile.countFutter += futterFound;
  //   userFile.countTrank += geisterschutztrankFound;

  //   //Bohnen
  //   const bohnenFound: number = getRandomInt(1,4);

  //   const bohnenIDs: number[] | false = await Huhnwarts2023Helper.getAllBohnenIDs();
  //   //ERROR
  //   if(bohnenIDs == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!raumderwünsche: ERROR! bohnenIDs`);
  //     return;
  //   }

  //   const foundBohnenIDs: number[] = pickRandoms(bohnenIDs, bohnenFound);
  //   for(const bohnenID of foundBohnenIDs) {
  //     let bohnenInventoryFile: HuhnwartsBohnenInventoryFile | false = await Huhnwarts2023Helper.readBohnenInventoryFile(userId, bohnenID);
  //     //ERROR
  //     if(bohnenInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!raumderwünsche: ERROR! bohnenInventoryFile`);
  //       return;
  //     }
  //     bohnenInventoryFile.Anzahl += 1;
  //     const writeBohnenInventoryFile: boolean = await Huhnwarts2023Helper.writeBohnenInventoryFile(bohnenInventoryFile);
  //     //ERROR
  //     if(writeBohnenInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!raumderwünsche: ERROR! writeBohnenInventoryFile`);
  //       return;
  //     }
  //   }

  //   //object/card
  //   const thingsFound: number = getRandomInt(1,3);
  //   let thing1: foundThing = {"type": ObjectOrCard(), "id": 0, "name": "", "punkte": 0};
  //   let thing2: foundThing = {"type": thingsFound == 2 ? ObjectOrCard() : "-", "id": 0, "name": "", "punkte": 0};

  //   for(const thing of [thing1, thing2]) {
  //     if(thing.type == "Gegenstand") {
  //       //get objectIDs
  //       const objectIDs: number[] | false = await Huhnwarts2023Helper.getObjectIDs();
  //       //ERROR
  //       if(objectIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!raumderwünsche: ERROR! objectIDs`);
  //         return;
  //       }

  //       //pick object
  //       thing.id = pickRandom(objectIDs);    

  //       //get object name
  //       const objectFile: HuhnwartsObjectFile | false = await Huhnwarts2023Helper.readObjectFileByID(thing.id);
  //       //ERROR
  //       if(objectFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!raumderwünsche: ERROR! objectFile`);
  //         return;
  //       }
  //       thing.name = objectFile.Name;

  //       //thing points
  //       thing.punkte = 1;

  //       //fetch user object inventory
  //       const userObjectInventory: HuhnwartsObjectInventoryFile | false = await Huhnwarts2023Helper.readObjectInventoryFile(userId, thing.id);
  //       //ERROR
  //       if(userObjectInventory == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!raumderwünsche: ERROR! userObjectInventory`);
  //         return;
  //       }
    
  //       //write new user object inventory
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] Anzahl BEFORE: ${userObjectInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] gefundene Anzahl BEFORE: ${userObjectInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] tauschbare Anzahl BEFORE: ${userObjectInventory.TauschbareAnzahl}`);
  //       userObjectInventory.Anzahl += 1;
  //       userObjectInventory.GefundeneAnzahl += 1;
  //       if(userObjectInventory.Anzahl > 1) userObjectInventory.TauschbareAnzahl += 1; //wenn es nicht das erste Objekt war
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] Anzahl AFTER: ${userObjectInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] gefundene Anzahl AFTER: ${userObjectInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] tauschbare Anzahl AFTER: ${userObjectInventory.TauschbareAnzahl}`);

  //       const writeObjectInventoryFile: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(userObjectInventory);
  //       //ERROR
  //       if(writeObjectInventoryFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!raumderwünsche: ERROR! writeObjectInventoryFile`);
  //         return;
  //       }
  //     } else if(thing.type == "Karte") {

  //       //pick rarity
  //       let huhnwarts2023RaritiesList: number[] = []
  //       Object.keys(huhnwarts2023Rarities).forEach(rarity => {
  //         for(let i = 1; i <= huhnwarts2023Rarities[rarity]*10; i++) {
  //           huhnwarts2023RaritiesList.push(Number(rarity));
  //         }
  //       });
  //       const rarity: 1|2|3|4|5 = pickRandom(huhnwarts2023RaritiesList);

  //       //get sfkIDs
  //       const sfkIDs: number[] | false | null = await Huhnwarts2023Helper.getSfkIDs(0, rarity);
  //       //ERROR
  //       if(sfkIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!raumderwünsche: ERROR! sfkIDs`);
  //         return;
  //       }
  
  //       //pick card
  //       if(sfkIDs == null) {
  //         //no cards of that rarity at this location | impossible here 
  //         const raritySfkIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByRarity(rarity);
  //         //ERROR
  //         if(raritySfkIDs == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!suchen: ERROR! raritySfkIDs`);
  //           return;
  //         }
  //         thing.id = pickRandom(raritySfkIDs);
  //       } else {
  //         thing.id = pickRandom(sfkIDs);
  //       }

  //       //get card name
  //       const cardFile: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(thing.id);
  //       //ERROR
  //       if(cardFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!raumderwünsche: ERROR! cardFile`);
  //         return;
  //       }
  //       thing.name = cardFile.Name;

  //       //fetch user SFK inventory
  //       const userSfkInventory: HuhnwartsSfkInventoryFile | false = await Huhnwarts2023Helper.readSfkInventoryFile(userId, thing.id);
  //       //ERROR
  //       if(userSfkInventory == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!raumderwünsche: ERROR! userSfkInventory`);
  //         return;
  //       }
    
  //       //write new user object inventory
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] Anzahl BEFORE: ${userSfkInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] gefundene Anzahl BEFORE: ${userSfkInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] tauschbare Anzahl BEFORE: ${userSfkInventory.TauschbareAnzahl}`);
  //       userSfkInventory.Anzahl += 1;
  //       userSfkInventory.GefundeneAnzahl += 1;
  //       if(userSfkInventory.Anzahl > 1) userSfkInventory.TauschbareAnzahl += 1; //wenn es nicht die erste Karte war
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] Anzahl AFTER: ${userSfkInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] gefundene Anzahl AFTER: ${userSfkInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] tauschbare Anzahl AFTER: ${userSfkInventory.TauschbareAnzahl}`);

  //       //thing points
  //       thing.punkte = huhnwarts2023rarityPoints[rarity];
  //       if(userSfkInventory.Anzahl == 1) userFile.punkteSFK += thing.punkte;
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: huhnwarts2023rarityPoints [Karte Nr. ${userSfkInventory.SchokofroschID}]: ${huhnwarts2023rarityPoints}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: rarity [Karte Nr. ${userSfkInventory.SchokofroschID}]: ${rarity}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: thing.punkte [Karte Nr. ${userSfkInventory.SchokofroschID}]: ${thing.punkte}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: raumderwünsche: userSfkInventory.Anzahl [Karte Nr. ${userSfkInventory.SchokofroschID}]: ${userSfkInventory.Anzahl}`);

  //       const writeUserSfkInventory: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(userSfkInventory);
  //       //ERROR
  //       if(writeUserSfkInventory == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!raumderwünsche: ERROR! writeUserSfkInventory`);
  //         return;
  //       }
  //     }
  //   }

  //   //save timestamp//
  //   userFile.lastTimestampRDW.push(today);
  //   const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeUserFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!raumderwünsche: ERROR: writeUserFile [${user}]`);
  //     return;
  //   }

  //   //announce in chat//
  //   chatClient.say(channel, `@${user}, du findest folgende Dinge: ${thing2.type == "-" ? `${thing1.name} [${thing1.type} ${thing1.punkte == 0 ? "doppelt" : `+${thing1.punkte}`}]` : `${thing1.name} [${thing1.type} ${thing1.punkte == 0 ? "doppelt" : `+${thing1.punkte}`}], ${thing2.name} [${thing2.type} ${thing2.punkte == 0 ? "doppelt" : `+${thing2.punkte}`}]`}, ${bohnenFound} ${bohnenFound == 1 ? "Bohne" : "Bohnen"}${geisterschutztrankFound == 0 ? ` und` : `,`} ${futterFound} Futter${geisterschutztrankFound != 0 ? ` und einen Geisterschutztrank.` : `.`}`);
  //   logger(`!raumderwünsche: [${user}] successfull`);

  //   //check for SFK achievements//
  //   if(thing1.type == "Karte" || thing2.type == "Karte") await huhnwarts2023checkSfkAchievements(userId, user);

  //   //check for object achievements//
  //   if(thing1.type == "Gegenstand" || thing2.type == "Gegenstand") await huhnwarts2023checkObjectAchievements(userId, user);

  //   //check for Futter achievements//
  //   await huhnwarts2023checkFutterAchievements(userId, user);
  // });

  // //!suchen
  // const searchPeevesEvent = async (user: string, userID: number, userFile: HuhnwartsUserFile, thingID: number, thingType: "Gegenstand" | "Karte", tierfutterFound: number): Promise<"Geisterschutz" | "Success" | "Error"> => {
  //   const now: number = Date.now();
  //   ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //   logger(`BUG-LOGGING: searchPeeves: ${userFile.name}.geisterschutz = ${userFile.geisterschutz}`);

  //   //check for Geisterschutz//
  //   if(userFile.geisterschutz == true) {
  //     userFile.geisterschutz = false;

  //     const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //     //ERROR
  //     if(writeUserFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`searchPeeves: ERROR! writeUserFile`);
  //       return "Error";
  //     }
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: searchPeeves: ${userFile.name}.geisterschutz CONSUMED: ${userFile.name}.geisterschutz = ${userFile.geisterschutz}`);
  //     logger(`searchPeeves: Geisterschutz [${userFile.name}]`);
  //     return "Geisterschutz";
  //   }
  //   ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //   logger(`BUG-LOGGING: searchPeeves: ${userFile.name}.geisterschutz NOT CONSUMED: ${userFile.name}.geisterschutz = ${userFile.geisterschutz}`);

  //   if(thingType == "Gegenstand") {
  //     //transfer object
  //     let peevesFile: HuhnwartsPeevesInventoryFile = {
  //       UserID: userID,
  //       ThingID: thingID,
  //       ThingType: "Gegenstand",
  //       timestampFound: now,
  //       canFilch: false,
  //       wasTraded: false
  //     }

  //     const writePeevesInventoryFile: boolean = await Huhnwarts2023Helper.writePeevesInventoryFile(peevesFile);
  //     //ERROR
  //     if(writePeevesInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`searchPeeves: ERROR! writePeevesInventoryFile`);
  //       return "Error";
  //     }

  //     //get object name
  //     const readObjectFileByID: HuhnwartsObjectFile | false = await Huhnwarts2023Helper.readObjectFileByID(thingID);
  //     //ERROR
  //     if(readObjectFileByID == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`rndPeeves: ERROR! readObjectFileByID`);
  //       return "Error";
  //     }

  //     //check if object would be new
  //     const readUserObjectInventoryFile: HuhnwartsObjectInventoryFile | false = await Huhnwarts2023Helper.readObjectInventoryFile(userID, thingID);
  //     //ERROR
  //     if(readUserObjectInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`rndPeeves: ERROR! readUserObjectInventoryFile`);
  //       return "Error";
  //     }

  //     //say in chat//
  //     chatClient.say(channel, `@${user}, du findest ${tierfutterFound != 0 ? `${tierfutterFound} Futter und ` : ` `}diesen Gegenstand: ${readObjectFileByID.Name} [${readUserObjectInventoryFile.Anzahl == 0 ? "neu" : "doppelt"}]. Aber Peeves taucht auf und schnappt ihn dir weg! xicanmAaaaaah Schnell! Schicke dein Tier mit !peevesjagen nach ihm!`);
  //     logger(`!rndPeeves: [${user}] Peeves`);   
  //   } else {
  //     // thing is card
  //     //transfer card
  //     let peevesFile: HuhnwartsPeevesInventoryFile = {
  //       UserID: userID,
  //       ThingID: thingID,
  //       ThingType: "Karte",
  //       timestampFound: now,
  //       canFilch: false,
  //       wasTraded: false
  //     }

  //     const writePeevesInventoryFile: boolean = await Huhnwarts2023Helper.writePeevesInventoryFile(peevesFile);
  //     //ERROR
  //     if(writePeevesInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`rndPeeves: ERROR! writePeevesInventoryFile`);
  //       return "Error";
  //     }

  //     //get card name
  //     const readSfkFileByID: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(thingID);
  //     //ERROR
  //     if(readSfkFileByID == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`rndPeeves: ERROR! readSfkFileByID`);
  //       return "Error";
  //     }

  //     //say in chat//
  //     chatClient.say(channel, `@${user}, du findest ${tierfutterFound != 0 ? `${tierfutterFound} Futter und ` : ` `}diese Karte: ${readSfkFileByID.Name} [${huhnwarts2023rarityPoints[readSfkFileByID.seltenheit] == 0 ? "doppelt" : `+${huhnwarts2023rarityPoints[readSfkFileByID.seltenheit]}`}]. Aber Peeves taucht auf und schnappt sie dir weg! xicanmAaaaaah Schnell! Schicke dein Tier mit !peevesjagen nach ihm!`);
  //     logger(`!rndPeeves: [${user}] Peeves`); 
  //   }

  //   //save timestamp//
  //   userFile.lastTimestampSuchen = now;
  //   const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeUserFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!rndPeeves: ERROR: writeUserFile [${user}]`);
  //     return "Error";
  //   }
  //   return "Success";
  // }

  // commandHandler.addCommand("suchen", true, 0, 0, async ({channel, user, args, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!suchen: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //new User
  //   if(userFile == null) userFile = await Huhnwarts2023Helper.newUser(userId, apiClient);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!suchen: ERROR! newUser [${user}]`);
  //     return;
  //   }

  //   //user does not belong to a house yet//
  //   if(userFile.HausID == 0) {
  //     chatClient.say(channel, `@${user}, du musst zuerst einem Haus beitreten.`);
  //     logger(`!suchen: user has no house [${user}]`);
  //     return;
  //   }

  //   //user has already searched within the last hour//
  //   const now: number = Date.now();
  //   if(userFile.lastTimestampSuchen > now - (1000*60*30)) {
  //     const timeDifference: number[] = msToTime((userFile.lastTimestampSuchen + (1000*60*30)) - now);
  //     const minuteneText: string = timeDifference[1] == 1 ? 'Minute' : 'Minuten';
  //     const sekundenText: string = timeDifference[2] == 1 ? 'Sekunde' : 'Sekunden';
  //     chatClient.say(channel, `@${user}, du kannst in ${timeDifference[1]} ${minuteneText} und ${timeDifference[2]} ${sekundenText} wieder suchen.`);
  //     logger(`!suchen: already searched [${user}]`);
  //     return;
  //   }

  //   let placeID: number = 0;
  //   if(args.length != 0) {
  //     const searchQuery: string | number = isNaN(Number(args[0])) ? args.join(" ") : Number(args[0]);
  //     const placeInfo: HuhnwartsOrteFile | false | null = typeof searchQuery == "string" ? await Huhnwarts2023Helper.readPlaceInfoByName(searchQuery) : await Huhnwarts2023Helper.readPlaceInfoByID(searchQuery);
  //     //ERROR
  //     if(placeInfo == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!suchen: ERROR! placeInfo`);
  //       return;
  //     }
  //     //invalid place
  //     if(placeInfo == null) {
  //       chatClient.say(channel, `@${user}, bitte gib einen gültigen Ort an.`)
  //       logger(`!suchen: [${user}] ungültiger Ort`);
  //       return;
  //     }
  //     placeID = placeInfo.OrtID;
  //   }

  //   //user searches//
  //   const tierfutterWahrscheinlichkeit: number = 33;//%
  //   const tierfutterFound: number = getRandomInt(0,101) <= tierfutterWahrscheinlichkeit ? getRandomInt(1,11) : 0;//1-10
    
  //   //save these
  //   userFile.countFutter += tierfutterFound;

  //   //object/card//
  //   //set up Peeves
  //   let peevesOutcome: "Geisterschutz" | "Success" | "Error" = "Geisterschutz";
  //   let peevesAttack: boolean = false;
    
  //   let thing: foundThing = {"type": ObjectOrCard(), "id": 0, "name": "", "punkte": 0};
    
  //   if(thing.type == "Gegenstand") {
  //     //get objectIDs
  //     const objectIDs: number[] | false = await Huhnwarts2023Helper.getObjectIDs();
  //     //ERROR
  //     if(objectIDs == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!suchen: ERROR! objectIDs`);
  //       return;
  //     }

  //     //pick object
  //     thing.id = pickRandom(objectIDs);    

  //     //get object name
  //     const objectFile: HuhnwartsObjectFile | false = await Huhnwarts2023Helper.readObjectFileByID(thing.id);
  //     //ERROR
  //     if(objectFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!suchen: ERROR! objectFile`);
  //       return;
  //     }
  //     thing.name = objectFile.Name;

  //     //check for Peeves//
  //     peevesAttack = getRandomInt(0, 101) <= huhnwarts2023PeevesSearchChance ? true : false;

  //     if(peevesAttack == true) {
  //       peevesOutcome = await searchPeevesEvent(user, userId, userFile, thing.id, "Gegenstand", tierfutterFound);
  //       if(peevesOutcome == "Error") {
  //         return;
  //       } else if(peevesOutcome == "Success") {
  //         //check for Spitzensucher [2] achievement//
  //         if(placeID != 0) {
  //           await huhnwarts2023checkSuchenAchievements(userId, user, placeID);
  //         }
  //         return;
  //       }
  //     }

  //     //no Peeves
  //     //fetch user object inventory
  //     const userObjectInventory: HuhnwartsObjectInventoryFile | false = await Huhnwarts2023Helper.readObjectInventoryFile(userId, thing.id);
  //     //ERROR
  //     if(userObjectInventory == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!suchen: ERROR! userObjectInventory`);
  //       return;
  //     }
    
  //     //write new user object inventory
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] Anzahl BEFORE: ${userObjectInventory.Anzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] gefundene Anzahl BEFORE: ${userObjectInventory.GefundeneAnzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] tauschbare Anzahl BEFORE: ${userObjectInventory.TauschbareAnzahl}`);
  //     userObjectInventory.Anzahl += 1;
  //     userObjectInventory.GefundeneAnzahl += 1;
  //     if(userObjectInventory.Anzahl > 1) userObjectInventory.TauschbareAnzahl += 1; //wenn es nicht das erste Objekt war
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] Anzahl AFTER: ${userObjectInventory.Anzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] gefundene Anzahl AFTER: ${userObjectInventory.GefundeneAnzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] tauschbare Anzahl AFTER: ${userObjectInventory.TauschbareAnzahl}`);

  //     //object points
  //     if(userObjectInventory.Anzahl == 1) thing.punkte = 1;      

  //     const writeObjectInventoryFile: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(userObjectInventory);
  //     //ERROR
  //     if(writeObjectInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!suchen: ERROR! writeObjectInventoryFile`);
  //       return;
  //     }
  //   } else if(thing.type == "Karte") {

  //     //pick rarity
  //     let huhnwarts2023RaritiesList: number[] = []
  //     Object.keys(huhnwarts2023Rarities).forEach(rarity => {
  //       for(let i = 1; i <= huhnwarts2023Rarities[rarity]*10; i++) {
  //         huhnwarts2023RaritiesList.push(Number(rarity));
  //       }
  //     });
  //     const rarity: 1|2|3|4|5 = pickRandom(huhnwarts2023RaritiesList);

  //     //get sfkIDs
  //     const sfkIDs: number[] | false | null = args.length != 0 ? await Huhnwarts2023Helper.getSfkIDs(placeID, rarity) : await Huhnwarts2023Helper.getSfkIDs(0, rarity);
  //     //ERROR
  //     if(sfkIDs == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!suchen: ERROR! sfkIDs`);
  //       return;
  //     }

  //     //pick card
  //     if(sfkIDs == null) {
  //       //no cards of that rarity at this location
  //       const raritySfkIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByRarity(rarity);
  //       //ERROR
  //       if(raritySfkIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!suchen: ERROR! raritySfkIDs`);
  //         return;
  //       }
  //       thing.id = pickRandom(raritySfkIDs);
  //     } else {
  //       thing.id = pickRandom(sfkIDs);
  //     }

  //     //get card name
  //     const cardFile: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(thing.id);
  //     //ERROR
  //     if(cardFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!suchen: ERROR! cardFile`);
  //       return;
  //     }
  //     thing.name = cardFile.Name;

  //     //check for Peeves//
  //     peevesAttack = getRandomInt(0, 101) <= huhnwarts2023PeevesSearchChance ? true : false;

  //     if(peevesAttack == true) {
  //       peevesOutcome = await searchPeevesEvent(user, userId, userFile, thing.id, "Karte", tierfutterFound);
  //       if(peevesOutcome == "Error") {
  //         return;
  //       } else if(peevesOutcome == "Success") {
  //         //check for Spitzensucher [2] achievement//
  //         if(placeID != 0) {
  //           await huhnwarts2023checkSuchenAchievements(userId, user, placeID);
  //         }
  //         return;
  //       }
  //     }

  //     //no Peeves
  //     //fetch user SFK inventory
  //     const userSfkInventory: HuhnwartsSfkInventoryFile | false = await Huhnwarts2023Helper.readSfkInventoryFile(userId, thing.id);
  //     //ERROR
  //     if(userSfkInventory == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!suchen: ERROR! userSfkInventory`);
  //       return;
  //     }
    
  //     //write new user object inventory
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] Anzahl BEFORE: ${userSfkInventory.Anzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] gefundene Anzahl BEFORE: ${userSfkInventory.GefundeneAnzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] tauschbare Anzahl BEFORE: ${userSfkInventory.TauschbareAnzahl}`);
  //     userSfkInventory.Anzahl += 1;
  //     userSfkInventory.GefundeneAnzahl += 1;
  //     if(userSfkInventory.Anzahl > 1) userSfkInventory.TauschbareAnzahl += 1; //wenn es nicht die erste Karte war
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] Anzahl AFTER: ${userSfkInventory.Anzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] gefundene Anzahl AFTER: ${userSfkInventory.GefundeneAnzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: suchen: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] tauschbare Anzahl AFTER: ${userSfkInventory.TauschbareAnzahl}`);

  //     //card points
  //     if(userSfkInventory.Anzahl == 1) {
  //       thing.punkte =  huhnwarts2023rarityPoints[cardFile.seltenheit];
  //       userFile.punkteSFK += thing.punkte;
  //     }

  //     const writeUserSfkInventory: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(userSfkInventory);
  //     //ERROR
  //     if(writeUserSfkInventory == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!suchen: ERROR! writeUserSfkInventory`);
  //       return;
  //     }
  //   }

  //   //save timestamp//
  //   userFile.lastTimestampSuchen = now;
  //   const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeUserFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!suchen: ERROR: writeUserFile [${user}]`);
  //     return;
  //   }

  //   //announce in chat//
  //   if(peevesOutcome == "Geisterschutz" && peevesAttack == true) {
  //     chatClient.say(channel, `@${user}, du findest ${thing.type == "Gegenstand" ? `diesen Gegenstand: ${thing.name} [${thing.punkte == 0 ? "doppelt" : `+${thing.punkte}`}]` : `diese Karte: ${thing.name} [${thing.punkte == 0 ? "doppelt" : `+${thing.punkte}`}]`}${tierfutterFound != 0 ? ` und ${tierfutterFound} Futter.` : `. Peeves ist aufgetaucht aber wurde von deinem Geisterschutztrank abgehalten.`}`);
  //   } else {
  //     chatClient.say(channel, `@${user}, du findest ${thing.type == "Gegenstand" ? `diesen Gegenstand: ${thing.name} [${thing.punkte == 0 ? "doppelt" : `+${thing.punkte}`}]` : `diese Karte: ${thing.name} [${thing.punkte == 0 ? "doppelt" : `+${thing.punkte}`}]`}${tierfutterFound != 0 ? ` und ${tierfutterFound} Futter.` : `.`}`);      
  //   }
  //   logger(`!suchen: [${user}] successfull`);   

  //   //check for Spitzensucher [2] achievement//
  //   if(placeID != 0) {
  //     await huhnwarts2023checkSuchenAchievements(userId, user, placeID);
  //   }
  //   //check for SFK achievements//
  //   if(thing.type == "Karte") await huhnwarts2023checkSfkAchievements(userId, user);

  //   //check for object achievements//
  //   if(thing.type == "Gegenstand") await huhnwarts2023checkObjectAchievements(userId, user);

  //   //check for Futter achievements//
  //   if(tierfutterFound != 0) await huhnwarts2023checkFutterAchievements(userId, user);
  // });

  // //!tauschen @spieler (Kartenname) / !tauschen (Kartenname) / !tauschen @spieler (Gerät) / !tauschen (Gerät)
  // commandHandler.addCommand("tauschen", true, 0, 0, async ({channel, user, args, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tauschen: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //new User
  //   if(userFile == null) userFile = await Huhnwarts2023Helper.newUser(userId, apiClient);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tauschen: ERROR! newUser [${user}]`);
  //     return;
  //   }

  //   //user does not belong to a house yet//
  //   if(userFile.HausID == 0) {
  //     chatClient.say(channel, `@${user}, du musst zuerst einem Haus beitreten.`);
  //     logger(`!tauschen: user has no house [${user}]`);
  //     return;
  //   }

  //   //no arguments//
  //   if(args.length == 0) {
  //     chatClient.say(channel, `@${user}, bitte gib eine andere Person und/oder eine Karte/einen Gegenstand, welche:n du tauschen möchtest.`);
  //     logger(`!tauschen: no thing`);
  //     return;
  //   }

  //   //select target//
  //   //check if target is online
  //   let chatters: string[] = [];

  //   let chattersSet: Set<string> | undefined = await chatterList.getChattersSet()

  //   if (chattersSet === undefined) {
  //     logger(`!tauschen: Chatters empty`)
  //     chatClient.say(channel, `something went wrong...`);
  //     return;
  //   }
  //     //remove self
  //   //chattersSet.delete(user);

  //   chatters = Array.from(chattersSet);
  //   logger(`!tauschen: Chatters: ${chatters}`)

  //   //get valid targets
  //   const usersWithHouse: string[] | false | null = await Huhnwarts2023Helper.getUserNamesWithHouse();
  //   //ERROR
  //   if(usersWithHouse == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tauschen: ERROR! usersWithHouse`);
  //     return;
  //   }
  //   //no one is in a house
  //   if(usersWithHouse == null) {
  //     chatClient.say(channel, `@${user}, es hat noch niemand ausser dir ein Haus. Versuche es später nochmal.`);
  //     logger(`!tauschen: no usersWithHouse`);
  //     return;
  //   }
  //   const usersWithHouseLowercase: string[] = usersWithHouse.map(element => {
  //     return element.toLowerCase();
  //   });

  //   let validTargets: string[] = chatters.filter((chatter) => {
  //     return usersWithHouseLowercase.includes(chatter);
  //   });
  //   //no valid targets
  //   if(validTargets.length == 0 && !args[0].startsWith("@")) {
  //     chatClient.say(channel, `@${user}, wir konnten keine:n gültige:n Handelspartner:in für dich finden. Versuche es später nochmal.`);
  //     logger(`!tauschen: no target found in chat`);
  //     return;
  //   }
  //   let targetUser: string = args[0].startsWith("@") ? args[0].slice(1) : pickRandom(validTargets);

  //   //specific target
  //   if(args[0].startsWith("@")) {
  //     //target is bot
  //     if(bots.includes(targetUser.toLowerCase())) {
  //       chatClient.say(channel, `@${user}, ${targetUser} ist ein Bot. Bitte wähle eine:n menschliche:n Zuschauer:in :P`);
  //       logger(`!tauschen: [${user}] target ${targetUser} is a bot`);
  //       return;
  //     }
  
  //     //target not online
  //     if(!chatters.includes(targetUser.toLowerCase())) {
  //       chatClient.say(channel, `@${user}, ${targetUser} scheint nicht im Chat zu sein. (Twitch updatet die Chatterliste sehr langsam, versuche es in einer Minute nochmal.)`);
  //       logger(`!tauschen: [${user}] target ${targetUser} not online`);
  //       return;
  //     }
      
  //     //target does not belong to a house yet//
  //     if(!validTargets.includes(targetUser.toLowerCase())) {
  //       chatClient.say(channel, `@${user}, ${targetUser} muss zuerst einem Haus beitreten, um etwas getauscht zu bekommen.`);
  //       logger(`!tauschen: [${user}] target has no house [${targetUser}]`);
  //       return;
  //     }
  //   }
    
  //   //get target file//   
  //   const targetIdHelix: HelixUser | null = await apiClient.users.getUserByName(targetUser.toLowerCase());
  //   //ERROR
  //   if(targetIdHelix == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tauschen: ERROR! targetIdHelix`);
  //     return;
  //   }
  //   const targetId: number = Number(targetIdHelix.id);
  //   //read target file
  //   let targetFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(targetId);
  //   //ERROR
  //   if(targetFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tauschen: ERROR! readtargetFile [${targetId}]`);
  //     return;
  //   }
  //   //new user (should never happen)
  //   if(targetFile == null) targetFile = await Huhnwarts2023Helper.newUser(targetId, apiClient);
  //   //ERROR
  //   if(targetFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tauschen: ERROR! newUser [${targetUser}]`);
  //     return;
  //   }

  //   //check Thing//
  //   const tradeThing: string = args[0].startsWith("@") ? args.slice(1).join(" ") : args.join(" ");

  //   const readObjectFileByName: HuhnwartsObjectFile | false | null = await Huhnwarts2023Helper.readObjectFileByName(tradeThing);
  //   //ERROR
  //   if(readObjectFileByName == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tauschen: ERROR! readObjectFileByName`);
  //     return;
  //   }

  //   const readSfkFileByName: HuhnwartsSchokofroschkartenFile | false | null = await Huhnwarts2023Helper.readSchokofroschkartenFileByName(tradeThing);
  //   //ERROR
  //   if(readSfkFileByName == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tauschen: ERROR! readSfkFileByName`);
  //     return;
  //   }

  //   //not a valid thing
  //   if(readObjectFileByName == null && readSfkFileByName == null) {
  //     chatClient.say(channel, `@${user}, dieses Ding scheint nicht zu existieren. Bitte vergewissere dich, dass du es richtig geschrieben hast.`);
  //     logger(`!tauschen [${user}] invalid thing ${tradeThing}`);
  //     return;
  //   }

  //   //check if user owns & can trade thing//
  //   let doesOwn: boolean = false;
  //   let canTrade: boolean = false;
  //   if(readSfkFileByName != null) {
  //     const userSfkInventoryFile: HuhnwartsSfkInventoryFile | false = await Huhnwarts2023Helper.readSfkInventoryFile(userId, readSfkFileByName.KartenID);
  //     //ERROR
  //     if(userSfkInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tauschen: ERROR! userSfkInventoryFile`);
  //       return;
  //     }

  //     if(userSfkInventoryFile.Anzahl > 0) doesOwn = true;
  //     if(userSfkInventoryFile.TauschbareAnzahl > 0) canTrade = true;

  //     //check if it's a mod card
  //     if(doesOwn == true && readSfkFileByName.kategorie == "Mods") {
  //       chatClient.say(channel, `@${user}, du kannst Modkarten nicht tauschen.`);
  //       logger(`!tauschen: [${user}] can't trade Mod cards`);
  //       return;       
  //     }

  //     //trade
  //     if(doesOwn == true && canTrade == true) {
  //       //remove from user
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Karte Nr. ${userSfkInventoryFile.SchokofroschID}] Anzahl BEFORE: ${userSfkInventoryFile.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Karte Nr. ${userSfkInventoryFile.SchokofroschID}] gefundene Anzahl BEFORE: ${userSfkInventoryFile.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Karte Nr. ${userSfkInventoryFile.SchokofroschID}] tauschbare Anzahl BEFORE: ${userSfkInventoryFile.TauschbareAnzahl}`);
  //       userSfkInventoryFile.Anzahl -= 1;
  //       userSfkInventoryFile.GefundeneAnzahl -= 1;
  //       userSfkInventoryFile.TauschbareAnzahl -= 1; //ist immer -1, da ja eine davon weggegeben wird
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Karte Nr. ${userSfkInventoryFile.SchokofroschID}] Anzahl AFTER: ${userSfkInventoryFile.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Karte Nr. ${userSfkInventoryFile.SchokofroschID}] gefundene Anzahl AFTER: ${userSfkInventoryFile.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Karte Nr. ${userSfkInventoryFile.SchokofroschID}] tauschbare Anzahl AFTER: ${userSfkInventoryFile.TauschbareAnzahl}`);

  //       //give points to user
  //       const points: number = Huhnwarts2023Helper.calculatePointsByHouseIDs(userFile.HausID, targetFile.HausID);
  //       userFile.punkteTauschen += points;
  //       userFile.countTauschen += 1;

  //       //add to target
  //       const targetSfkInventoryFile: HuhnwartsSfkInventoryFile | false = await Huhnwarts2023Helper.readSfkInventoryFile(targetId, readSfkFileByName.KartenID);
  //       //ERROR
  //       if(targetSfkInventoryFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tauschen: ERROR! targetSfkInventoryFile`);
  //         return;
  //       }
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Karte Nr. ${targetSfkInventoryFile.SchokofroschID}] Anzahl BEFORE: ${userSfkInventoryFile.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Karte Nr. ${targetSfkInventoryFile.SchokofroschID}] gefundene Anzahl BEFORE: ${userSfkInventoryFile.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Karte Nr. ${targetSfkInventoryFile.SchokofroschID}] tauschbare Anzahl BEFORE: ${userSfkInventoryFile.TauschbareAnzahl}`);
  //       targetSfkInventoryFile.Anzahl += 1;
  //       targetSfkInventoryFile.TauschbareAnzahl = targetSfkInventoryFile.GefundeneAnzahl; //da keine von den gefundenen mehr behalten werden muss
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Karte Nr. ${targetSfkInventoryFile.SchokofroschID}] Anzahl AFTER: ${userSfkInventoryFile.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Karte Nr. ${targetSfkInventoryFile.SchokofroschID}] gefundene Anzahl AFTER: ${userSfkInventoryFile.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Karte Nr. ${targetSfkInventoryFile.SchokofroschID}] tauschbare Anzahl AFTER: ${userSfkInventoryFile.TauschbareAnzahl}`);

  //       //SFK points
  //       const cardPoints: number =  huhnwarts2023rarityPoints[readSfkFileByName.seltenheit];
  //       if(userSfkInventoryFile.Anzahl == 0) userFile.punkteSFK -= cardPoints;
  //       if(targetSfkInventoryFile.Anzahl == 1) targetFile.punkteSFK += cardPoints;

  //       //write files
  //       const userFileWriter: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //       //ERROR
  //       if(userFileWriter == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tauschen: ERROR! userFileWriter`);
  //         return;
  //       }
  //       const userSfkWriter: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(userSfkInventoryFile);
  //       //ERROR
  //       if(userSfkWriter == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tauschen: ERROR! userSfkWriter`);
  //         return;
  //       }
  //       const targetFileWriter: boolean = await Huhnwarts2023Helper.writeUserFile(targetFile);
  //       //ERROR
  //       if(targetFileWriter == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tauschen: ERROR! targetFileWriter`);
  //         return;
  //       }
  //       const targetSfkWriter: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(targetSfkInventoryFile);
  //       //ERROR
  //       if(targetSfkWriter == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tauschen: ERROR! targetSfkWriter`);
  //         return;
  //       }

  //       //anounce in chat
  //       chatClient.say(channel, `@${user} gibt @${targetUser} diese Schokofroschkarte: ${tradeThing} [+${points}]`);
  //       logger(`!tauschen: [${user}] -> ${tradeThing} -> [${targetUser}]`);

  //       //check for SFK achievements//
  //       await huhnwarts2023checkSfkAchievements(targetId, targetUser);

  //       //check for tauschen achievements//
  //       await huhnwarts2023checkTauschenAchievements(userId, user);
  //       return;
  //     }

  //   } else if(readObjectFileByName != null) {
  //     const userObjectInventoryFile: HuhnwartsObjectInventoryFile | false = await Huhnwarts2023Helper.readObjectInventoryFile(userId, readObjectFileByName.GegenstandID);
  //     //ERROR
  //     if(userObjectInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tauschen: ERROR! userObjectInventoryFile`);
  //       return;
  //     }
  //     if(userObjectInventoryFile.Anzahl != 0) doesOwn = true;
  //     if(userObjectInventoryFile.TauschbareAnzahl != 0) canTrade = true;

  //     //trade
  //     if(doesOwn == true && canTrade == true) {
  //       //remove from user
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] Anzahl BEFORE: ${userObjectInventoryFile.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] gefundene Anzahl BEFORE: ${userObjectInventoryFile.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] tauschbare Anzahl BEFORE: ${userObjectInventoryFile.TauschbareAnzahl}`);

  //       userObjectInventoryFile.Anzahl -= 1;
  //       userObjectInventoryFile.GefundeneAnzahl -= 1;
  //       userObjectInventoryFile.TauschbareAnzahl -= 1; //ist immer -1, da ja eins davon weggegeben wird
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] Anzahl AFTER: ${userObjectInventoryFile.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] gefundene Anzahl AFTER: ${userObjectInventoryFile.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] tauschbare Anzahl After: ${userObjectInventoryFile.TauschbareAnzahl}`);
  

  //       //give points to user
  //       const points: number = Huhnwarts2023Helper.calculatePointsByHouseIDs(userFile.HausID, targetFile.HausID);
  //       userFile.punkteTauschen += points;
  //       userFile.countTauschen += 1;

  //       //add to target
  //       const targetObjectInventoryFile: HuhnwartsObjectInventoryFile | false = await Huhnwarts2023Helper.readObjectInventoryFile(targetId, readObjectFileByName.GegenstandID);
  //       //ERROR
  //       if(targetObjectInventoryFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tauschen: ERROR! targetObjectInventoryFile`);
  //         return;
  //       }
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Objekt Nr. ${targetObjectInventoryFile.GegenstandID}] Anzahl BEFORE: ${targetObjectInventoryFile.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Objekt Nr. ${targetObjectInventoryFile.GegenstandID}] gefundene Anzahl BEFORE: ${targetObjectInventoryFile.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Objekt Nr. ${targetObjectInventoryFile.GegenstandID}] tauschbare Anzahl BEFORE: ${targetObjectInventoryFile.TauschbareAnzahl}`);
        
  //       targetObjectInventoryFile.Anzahl += 1;
  //       targetObjectInventoryFile.TauschbareAnzahl = targetObjectInventoryFile.GefundeneAnzahl; //da keins von den gefundenen mehr behalten werden muss
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Objekt Nr. ${targetObjectInventoryFile.GegenstandID}] Anzahl AFTER: ${targetObjectInventoryFile.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Objekt Nr. ${targetObjectInventoryFile.GegenstandID}] gefundene Anzahl AFTER: ${targetObjectInventoryFile.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tauschen: target ${targetUser} [Objekt Nr. ${targetObjectInventoryFile.GegenstandID}] tauschbare Anzahl AFTER: ${targetObjectInventoryFile.TauschbareAnzahl}`);

  //       //write files
  //       const userFileWriter: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //       //ERROR
  //       if(userFileWriter == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tauschen: ERROR! userFileWriter`);
  //         return;
  //       }
  //       const userObjectWriter: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(userObjectInventoryFile);
  //       //ERROR
  //       if(userObjectWriter == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tauschen: ERROR! userObjectWriter`);
  //         return;
  //       }
  //       const targetObjectkWriter: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(targetObjectInventoryFile);
  //       //ERROR
  //       if(targetObjectkWriter == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tauschen: ERROR! targetObjectkWriter`);
  //         return;
  //       }

  //       //anounce in chat
  //       chatClient.say(channel, `@${user} gibt @${targetUser} diesen Gegenstand: ${tradeThing} [+${points} Tauschpunkte]`);
  //       logger(`!tauschen: [${user}] -> ${tradeThing} -> [${targetUser}]`);

  //       //check for object achievements//
  //       await huhnwarts2023checkObjectAchievements(targetId, targetUser);

  //       //check for tauschen achievements//
  //       await huhnwarts2023checkTauschenAchievements(userId, user);
  //       return;
  //     }
  //   }

  //   //user doesn't own thing
  //   if(doesOwn == false) {
  //     chatClient.say(channel, `@${user}, du scheinst ${readObjectFileByName != null ? `den Gegenstand "${readObjectFileByName.Name}"` : readSfkFileByName != null ? `die Karte "${readSfkFileByName.Name}"` : ""} nicht zu besitzen.`);
  //     logger(`!tauschen: [${user}] does not own ${readObjectFileByName != null ? `"${readObjectFileByName.Name}"` : readSfkFileByName != null ? `"${readSfkFileByName.Name}"` : ""}`);
  //     return;
  //   }

  //   //user can't trade thing
  //   if(canTrade == false) {
  //     chatClient.say(channel, `@${user}, du kannst ${readObjectFileByName != null ? `den Gegenstand "${readObjectFileByName.Name}"` : readSfkFileByName != null ? `die Karte "${readSfkFileByName.Name}"` : ""} nicht tauschen. Du musst zuerst ein weiteres Exemplar selber finden.`);
  //     logger(`!tauschen: [${user}] can't trade ${readObjectFileByName != null ? `"${readObjectFileByName.Name}"` : readSfkFileByName != null ? `"${readSfkFileByName.Name}"` : ""}`);
  //     return;
  //   }
  // });

  // //#endregion get things & trade

  // //#region Peeves
  // //random Peeves Event
  // let timeToNextPeevesAttack: number = getRandomInt(0, huhnwarts2023PeevesAttackInterval.randomIntervalMax*60*1000 + 1);
  // // let timeToNextPeevesAttack: number = 15*1000;
  // logger(`next Peeves attack at ${new Date(Date.now() + timeToNextPeevesAttack)}`);

  // let peevesSaveBonusTime: number = 0;

  // const rndPeevesEvent = async () => {
  //   //ignore if stream is offline//
  //   if(botControl.streamerOnline) {

  //     const now: number = Date.now();
  //     const peevesStart: number = Date.now();
  //     //select targets//
  //     //check if target is online
  //     let chatters: string[] = [];
      
  //     let chattersSet: Set<string> | undefined = await chatterList.getChattersSet()

  //     if (chattersSet === undefined) {
  //       logger(`!tauschen: Chatters empty`)
  //       chatClient.say(channel, `something went wrong...`);
  //       return;
  //     }

  //     chatters = Array.from(chattersSet);

  //     //get valid targets
  //     const usersWithHouse: string[] | false | null = await Huhnwarts2023Helper.getUserNamesWithHouse();
  //     //ERROR
  //     if(usersWithHouse == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`rndPeeves: ERROR! usersWithHouse`);
  //       return;
  //     }
  //     //no one is in a house
  //     if(usersWithHouse == null) {
  //       logger(`rndPeeves: no usersWithHouse`);
  //       return;
  //     }
  //     const usersWithHouseLowercase: string[] = usersWithHouse.map(element => {
  //       return element.toLowerCase();
  //     });
  
  //     let validTargets: string[] = chatters.filter((chatter) => {
  //       return usersWithHouseLowercase.includes(chatter);
  //     });
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: rndPeeves: validTargets: ${validTargets}`);
  
  //     //set up chat message
  //     let peevesMessage: string[] = [];
  
  //     //make list of victims
  //     let peevesVictimsBefore: string[] = [];
  
  //     //pick one thing per user//
  //     for(const user of validTargets) {
  //       //get user files//   
  //       //get user ID
  //       const userIdHelix: HelixUser | null = await apiClient.users.getUserByName(user);
  //       //ERROR
  //       if(userIdHelix == null) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`rndPeeves: ERROR! userIdHelix`);
  //         return;
  //       }
  //       const userId: number = Number(userIdHelix.id);
  
  //       //get user object files
  //       const userObjectFiles: HuhnwartsObjectInventoryFile[] | false | null = await Huhnwarts2023Helper.readObjectInventoryFilesByUserID(userId);
  //       //ERROR
  //       if(userObjectFiles == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`rndPeeves: ERROR! userObjectFiles`);
  //         return;
  //       }
  
  //       //get user Sfk files
  //       const userSfkFiles: HuhnwartsSfkInventoryFile[] | false | null = await Huhnwarts2023Helper.readSfkInventoryFilesByUserID(userId);
  //       //ERROR
  //       if(userSfkFiles == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`rndPeeves: ERROR! userSfkFiles`);
  //         return;
  //       }
  
  //       //user has things
  //       if(userObjectFiles != null || userSfkFiles != null) {
  //         //check Geisterschutztrank
  //         let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //         //ERROR
  //         if(userFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`rndPeeves: ERROR! readUserFile`);
  //           return;
  //         }
  //         //ERROR
  //         if(userFile == null) { //can never happen
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`rndPeeves: ERROR! no readUserFile`);
  //           return;
  //         }
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: rndPeeves: ${userFile.name}.geisterschutz = ${userFile.geisterschutz}`);
  //         if(userFile.geisterschutz == true) {
  //           //user is protected
  //           userFile.geisterschutz = false;
  
  //           const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //           //ERROR
  //           if(writeUserFile == false) {
  //             chatClient.say(channel, `something went wrong...`);
  //             logger(`rndPeeves: ERROR! writeUserFile`);
  //             return;
  //           }
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: ${userFile.name}.geisterschutz CONSUMED: ${userFile.name}.geisterschutz = ${userFile.geisterschutz}`);
  //           logger(`rndPeeves: [${user}] is protected`);
  //           continue;
  //         }
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: rndPeeves: ${userFile.name}.geisterschutz NOT CONSUMED: ${userFile.name}.geisterschutz = ${userFile.geisterschutz}`);
  
  //         let allThings: Array<HuhnwartsObjectInventoryFile | HuhnwartsSfkInventoryFile> = [];
  //         if(userObjectFiles != null) allThings = allThings.concat(userObjectFiles);
  //         if(userSfkFiles != null) allThings = allThings.concat(userSfkFiles);
  
  //         //pick thing
  //         const stolenThing: HuhnwartsObjectInventoryFile | HuhnwartsSfkInventoryFile = pickRandom(allThings);
  
  //         //transfer thing
  //         function isHuhnwartsObjectInventoryFile(thing : HuhnwartsObjectInventoryFile | HuhnwartsSfkInventoryFile): thing is HuhnwartsObjectInventoryFile{
  //           return (thing as HuhnwartsObjectInventoryFile).GegenstandID !== undefined;
  //         }
  
  //         if(isHuhnwartsObjectInventoryFile(stolenThing)) {
  //           //thing is an object
  //           //pick one of the owned objects, if multiple owned
  //           let ownedObjects: Array<"tauschbar" | "getauscht"> = [];
  //           for(let i = 1; i <= stolenThing.TauschbareAnzahl; i++) {
  //             ownedObjects.push("tauschbar");
  //           }
  //           for(let i = 1; i <= stolenThing.Anzahl - stolenThing.TauschbareAnzahl; i++) {
  //             ownedObjects.push("getauscht");
  //           }
  
  //           const stolenThingGefunden: boolean = pickRandom([true, false]);
  
  //           //transfer object
  //           let peevesFile: HuhnwartsPeevesInventoryFile = {
  //             UserID: userId,
  //             ThingID: stolenThing.GegenstandID,
  //             ThingType: "Gegenstand",
  //             timestampFound: now,
  //             canFilch: true,
  //             wasTraded: false
  //           }
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] Anzahl BEFORE: ${stolenThing.Anzahl}`);
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] gefundene Anzahl BEFORE: ${stolenThing.GefundeneAnzahl}`);
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] tauschbare Anzahl BEFORE: ${stolenThing.TauschbareAnzahl}`);
  //           if(stolenThingGefunden == true) {
  //             stolenThing.Anzahl -= 1;
  //             stolenThing.GefundeneAnzahl -= 1;
  //             if(stolenThing.TauschbareAnzahl > 0) stolenThing.TauschbareAnzahl -= 1; //wenn es tauschbare Objekte gab            
  //           } else {
  //             stolenThing.Anzahl -= 1;
  //             if((stolenThing.Anzahl == stolenThing.GefundeneAnzahl) && stolenThing.TauschbareAnzahl != 0) stolenThing.TauschbareAnzahl -= 1; //wenn nur noch gefundene Objekte übrig sind und es nicht das letzte war
  //             peevesFile.wasTraded = true;
  //           }
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] Anzahl AFTER: ${stolenThing.Anzahl}`);
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] gefundene AFTER BEFORE: ${stolenThing.GefundeneAnzahl}`);
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] tauschbare AFTER BEFORE: ${stolenThing.TauschbareAnzahl}`);
  
  //           //write/delte userObjectInventoryFile
  //           if(stolenThing.Anzahl == 0) {
  //             //delete
  //             const deleteObjectInventoryFile: boolean = await Huhnwarts2023Helper.deleteObjectInventoryFile(stolenThing);
  //             //ERROR
  //             if(deleteObjectInventoryFile == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`rndPeeves: ERROR! deleteObjectInventoryFile`);
  //               return;
  //             }
  //           } else {
  //             const writeObjectInventoryFile: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(stolenThing);
  //             //ERROR
  //             if(writeObjectInventoryFile == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`rndPeeves: ERROR! writeObjectInventoryFile`);
  //               return;
  //             }
  //           }
  
  //           //write pevvesInventoryFile
  //           const writePeevesInventoryFile: boolean = await Huhnwarts2023Helper.writePeevesInventoryFile(peevesFile);
  //           //ERROR
  //           if(writePeevesInventoryFile == false) {
  //             chatClient.say(channel, `something went wrong...`);
  //             logger(`rndPeeves: ERROR! writePeevesInventoryFile`);
  //             return;
  //           }
  
  //           //get object name
  //           const readObjectFileByID: HuhnwartsObjectFile | false = await Huhnwarts2023Helper.readObjectFileByID(stolenThing.GegenstandID);
  //           //ERROR
  //           if(readObjectFileByID == false) {
  //             chatClient.say(channel, `something went wrong...`);
  //             logger(`rndPeeves: ERROR! readObjectFileByID`);
  //             return;
  //           }
  
  //           //add to chat message
  //           peevesMessage.push(`${user}: ${readObjectFileByID.Name} [${peevesFile.ThingType}]`); 
            
  //           //add to victim list
  //           peevesVictimsBefore.push(user);
  //         } else {
  //           //thing is a card
  //           //pick one of the ownedcards, if multiple owned
  //           let ownedCards: Array<"tauschbar" | "getauscht"> = [];
  //           for(let i = 1; i <= stolenThing.TauschbareAnzahl; i++) {
  //             ownedCards.push("tauschbar");
  //           }
  //           for(let i = 1; i <= stolenThing.Anzahl - stolenThing.TauschbareAnzahl; i++) {
  //             ownedCards.push("getauscht");
  //           }
  
  //           const stolenThingGefunden: boolean = pickRandom([true, false]);
  
  //           //transfer object
  //           let peevesFile: HuhnwartsPeevesInventoryFile = {
  //             UserID: userId,
  //             ThingID: stolenThing.SchokofroschID,
  //             ThingType: "Karte",
  //             timestampFound: now,
  //             canFilch: true,
  //             wasTraded: false
  //           }
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] Anzahl BEFORE: ${stolenThing.Anzahl}`);
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] gefundene Anzahl BEFORE: ${stolenThing.GefundeneAnzahl}`);
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] tauschbare Anzahl BEFORE: ${stolenThing.TauschbareAnzahl}`);
  //           if(stolenThingGefunden == true) {
  //             stolenThing.Anzahl -= 1;
  //             stolenThing.GefundeneAnzahl -= 1;
  //             if(stolenThing.TauschbareAnzahl > 0) stolenThing.TauschbareAnzahl -= 1; //wenn es tauschbare Karten gab              
  //           } else {
  //             stolenThing.Anzahl -= 1;
  //             if((stolenThing.Anzahl == stolenThing.GefundeneAnzahl) && stolenThing.TauschbareAnzahl != 0) stolenThing.TauschbareAnzahl -= 1; //wenn nur noch gefundene Karten übrig sind und es nicht die letzte war
  //             peevesFile.wasTraded = true;
  //           }
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] Anzahl AFTER: ${stolenThing.Anzahl}`);
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] gefundene AFTER BEFORE: ${stolenThing.GefundeneAnzahl}`);
  //           ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //           logger(`BUG-LOGGING: rndPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] tauschbare AFTER BEFORE: ${stolenThing.TauschbareAnzahl}`);
  
  //           //SFK Punkte
  //           if(stolenThing.Anzahl == 0) {
  //             const schokofroschFile: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(stolenThing.SchokofroschID);
  //             //ERROR
  //             if(schokofroschFile == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`rndPeeves: ERROR! schokofroschFile`);
  //               return;
  //             }
  //             const cardPoints: number = huhnwarts2023rarityPoints[schokofroschFile.seltenheit];
  //             userFile.punkteSFK -= cardPoints;

  //             //write user file
  //             const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //             //ERROR
  //             if(writeUserFile == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`rndPeeves: ERROR! writeUserFile`);
  //               return;
  //             }
  //           }
  
  //           //write/delte userObjectInventoryFile
  //           if(stolenThing.Anzahl == 0) {
  //             //delete
  //             const deleteSfkInventoryFile: boolean = await Huhnwarts2023Helper.deleteSfkInventoryFile(stolenThing);
  //             //ERROR
  //             if(deleteSfkInventoryFile == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`rndPeeves: ERROR! deleteSfkInventoryFile`);
  //               return;
  //             }
  //           } else {
  //             const writeSfkInventoryFile: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(stolenThing);
  //             //ERROR
  //             if(writeSfkInventoryFile == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`rndPeeves: ERROR! writeSfkInventoryFile`);
  //               return;
  //             }
  //           }
  
  //           const writePeevesInventoryFile: boolean = await Huhnwarts2023Helper.writePeevesInventoryFile(peevesFile);
  //           //ERROR
  //           if(writePeevesInventoryFile == false) {
  //             chatClient.say(channel, `something went wrong...`);
  //             logger(`rndPeeves: ERROR! writePeevesInventoryFile`);
  //             return;
  //           }
  
  //           //get object name
  //           const readSfkFileByID: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(stolenThing.SchokofroschID);
  //           //ERROR
  //           if(readSfkFileByID == false) {
  //             chatClient.say(channel, `something went wrong...`);
  //             logger(`rndPeeves: ERROR! readSfkFileByID`);
  //             return;
  //           }
  
  //           //add to chat message
  //           peevesMessage.push(`${user}: ${readSfkFileByID.Name} [${peevesFile.ThingType}]`);  
            
  //           //add to victim list
  //           peevesVictimsBefore.push(user);
  //         }
  //       }
  //     }
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: rndPeeves: victim list: ${peevesVictimsBefore}`);
  
  //     //announce in Chat//
  //     //apiClient.chat.sendAnnouncement(channelID, 143972045, {message: `Peeves erscheint! xicanmAaaaaah`});
  //     chatClient.announce(channel, `Peeves erscheint! xicanmAaaaaah`);
  //     multiAction(channel, chatClient, " ", `Peeves klaut folgende Dinge: ${listMaker(peevesMessage, " | ", "@", ".", " | ")}`);
  //     logger(`rndPeeves: succesfully stole ${peevesMessage.length} things.`);

  //     const peevesEnd: number = Date.now();
  //     peevesSaveBonusTime = peevesEnd - peevesStart;
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: rndPeeves: peevesStart: ${peevesStart}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: rndPeeves: peevesEnd: ${peevesEnd}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: rndPeeves: peevesSaveBonusTime: ${peevesSaveBonusTime}`);
  
  //     //next Peeves attack//
  //     timeToNextPeevesAttack = huhnwarts2023PeevesAttackInterval.cooldown*60*1000 + getRandomInt(0, huhnwarts2023PeevesAttackInterval.randomIntervalMax*60*1000 + 1);
  
  //     //trigger next Peeves attack
  //     setTimeout(rndPeevesEvent, timeToNextPeevesAttack);
  //     logger(`next Peeves attack at ${new Date(now + timeToNextPeevesAttack)}`);
  
  //     //filch saves//
  //     setTimeout(async(now: number, peevesVictimsBefore: string[]) => {
  //       const peevesVictimsAfter: HuhnwartsPeevesInventoryFile[] | false | null = await Huhnwarts2023Helper.readPeevesInventoryFilesByTimestamp(now);
  //       //ERROR
  //       if(peevesVictimsAfter == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`rndPeeves: ERROR! peevesVictimsAfter`);
  //         return;
  //       }
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: rndPeeves: peevesVictimsAfter: ${peevesVictimsAfter}`);
  
  //       //all are safe
  //       if(peevesVictimsAfter == null) {
  //         chatClient.action(channel, `Filch hat alle Dinge zurückbekommen.`);
  //         logger(`rndPeeves: all saved by Filch`);
  //         return;
  //       }
  
  //       //get user IDs
  //       const notSavedUserIDs: number[] = peevesVictimsAfter.map(user => {
  //         return user.UserID;
  //       });
  
  //       //get user names
  //       let notSavedUserNames: string[] = [];
  //       for(const userID of notSavedUserIDs) {
  //         const userNameHelix: HelixUser | null = await apiClient.users.getUserById(userID);
  //         //ERROR
  //         if(userNameHelix == null) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`rndPeeves: ERROR! userNameHelix`);
  //           return;
  //         }
  //         notSavedUserNames.push(userNameHelix.name);
  //       }
  
  //       //make saved list
  //       let savedUsers: string[] = peevesVictimsBefore.filter((entry) => {
  //         return !notSavedUserNames.includes(entry);
  //       });
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: rndPeeves: savedUsers: ${savedUsers}`);
  
  //       //announce in chat
  //       //apiClient.chat.sendAnnouncement(channelID, 143972045, {message: `Peeves erscheint! xicanmAaaaaah`});
  //       chatClient.announce(channel, `Filch ist zurück! xicanmHyped`);
  //       multiAction(channel, chatClient, " ", `Filch rettet die Dinge von ${listMaker(savedUsers)}`);
  //       logger(`rndPeeves: Filch recovered ${savedUsers.length} things.`);
  //     }, 1000*31, now, peevesVictimsBefore);//31 sekunden

  //   } else {
  //     const now: number = Date.now();
  
  //     //next Peeves attack//
  //     timeToNextPeevesAttack = huhnwarts2023PeevesAttackInterval.cooldown*60*1000 + getRandomInt(0, huhnwarts2023PeevesAttackInterval.randomIntervalMax*60*1000 + 1);
  
  //     //trigger next Peeves attack
  //     setTimeout(rndPeevesEvent, timeToNextPeevesAttack);
  //     logger(`stream offline. next Peeves attack at ${new Date(now + timeToNextPeevesAttack)}`);

  //   }
  // }

  // setTimeout(rndPeevesEvent, timeToNextPeevesAttack);
  
  // //!schutz
  // commandHandler.addCommand("schutz", true, 0, 0, async ({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //get user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!schutz: ERROR! readUserFile`);
  //     return;
  //   }
  //   //user does not exist
  //   if(userFile == null) {
  //     logger(`!schutz: no UserFile [${user}]`);
  //     return;
  //   }

  //   //user bereits geschützt//
  //   if(userFile.geisterschutz == true) {
  //     chatClient.say(channel, `@${user}, du hast bereits einen aktiven Geisterschutz.`);
  //     logger(`!schutz: [${user}] bereits geschützt`);
  //     return;
  //   }

  //   //user hat keinen Trank//
  //   if(userFile.countTrank == 0) {
  //     chatClient.say(channel, `@${user}, du hast leider keinen Geisterschutztrank.`);
  //     logger(`!schutz: [${user}] kiene Tränke`);
  //     return;
  //   }

  //   //user trinkt Trank//
  //   userFile.countTrank -= 1;
  //   userFile.geisterschutz = true;

  //   //save user file
  //   const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeUserFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!schutz: ERROR! writeUserFile`);
  //     return;
  //   }

  //   //say in chat
  //   chatClient.say(channel, `@${user}, du trinkst einen Geisterschutztrank und bist nun vor Peeves geschützt.`);
  //   logger(`!schutz: [${user}]`);
  // });

  // //!filch
  // commandHandler.addCommand("filch", true, 0, 0, async ({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read users Peeves files
  //   const userPeevesFiles: HuhnwartsPeevesInventoryFile[] | false | null = await Huhnwarts2023Helper.readPeevesInventoryFilesByID(userId);
  //   //ERROR
  //   if(userPeevesFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!filch: ERROR! userPeevesFiles`);
  //     return;
  //   }
  //   //no files
  //   if(userPeevesFiles == null) {
  //     logger(`!filch: no files found`);
  //     return;
  //   }
  //   ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //   logger(`BUG-LOGGING: filch: ${user} peevesFiles: ${userPeevesFiles.length}`);

  //   //check if within timeframe
  //   const now: number = Date.now();
  //   for(const peevesFile of userPeevesFiles) {
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: filch: [${user}] peevesFile.timestampFound: ${peevesFile.timestampFound}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: filch: [${user}] now - huhnwarts2023PeevesProtectionTime*1000 - peevesSaveBonusTime: ${now - huhnwarts2023PeevesProtectionTime*1000 - peevesSaveBonusTime}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: filch: [${user}] peevesFile.canFilch: ${peevesFile.canFilch}`);
  //     if(peevesFile.timestampFound > now - huhnwarts2023PeevesProtectionTime*1000 - peevesSaveBonusTime && peevesFile.canFilch == true) {
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: filch: ${user} savedPeevesFile: ${peevesFile}`);
  //       //fetch user thing inventory
  //       if(peevesFile.ThingType == "Gegenstand") {
  //         //thing is object
  //         let userObjectInventoryFile: HuhnwartsObjectInventoryFile | false = await Huhnwarts2023Helper.readObjectInventoryFile(userId, peevesFile.ThingID);
  //         //ERROR
  //         if(userObjectInventoryFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!filch: ERROR! userObjectInventoryFile`);
  //           return;
  //         }

  //         //add object back
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] Anzahl BEFORE: ${userObjectInventoryFile.Anzahl}`);
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] gefundene Anzahl BEFORE: ${userObjectInventoryFile.GefundeneAnzahl}`);
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] tauschbare Anzahl BEFORE: ${userObjectInventoryFile.TauschbareAnzahl}`);
  //         userObjectInventoryFile.Anzahl += 1;
  //         if(peevesFile.wasTraded == false) {
  //           userObjectInventoryFile.GefundeneAnzahl += 1;
  //           if(userObjectInventoryFile.Anzahl > 1) userObjectInventoryFile.TauschbareAnzahl += 1; //wenn das nicht das einzige Objekt ist
  //         } else {
  //           if(userObjectInventoryFile.GefundeneAnzahl > 0 && userObjectInventoryFile.Anzahl == userObjectInventoryFile.GefundeneAnzahl + 1) userObjectInventoryFile.TauschbareAnzahl += 1; //wenn es gefundene Objekte gibt und das das einzige getauschte ist
  //         }
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] Anzahl AFTER: ${userObjectInventoryFile.Anzahl}`);
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] gefundene Anzahl AFTER: ${userObjectInventoryFile.GefundeneAnzahl}`);
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] tauschbare Anzahl AFTER: ${userObjectInventoryFile.TauschbareAnzahl}`);

  //         //save user file
  //         const writeuserObjectInventoryFile: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(userObjectInventoryFile);
  //         //ERROR
  //         if(writeuserObjectInventoryFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!filch: ERROR! writeuserObjectInventoryFile`);
  //           return;
  //         }

  //         //delete peeves file
  //         const deletePeevesFile: boolean = await Huhnwarts2023Helper.deletePeevesInventoryFile(userId, peevesFile.timestampFound);
  //         //ERROR
  //         if(deletePeevesFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!filch: ERROR! deletePeevesFile`);
  //           return;
  //         }
  //         logger(`!filch: got back ${peevesFile.ThingID} [${peevesFile.ThingType}] from [${user}]`);
  //       } else {
  //         //thing is card
  //         let userCardInventoryFile: HuhnwartsSfkInventoryFile | false = await Huhnwarts2023Helper.readSfkInventoryFile(userId, peevesFile.ThingID);
  //         //ERROR
  //         if(userCardInventoryFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!filch: ERROR! userCardInventoryFile`);
  //           return;
  //         }

  //         //add card back
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] Anzahl BEFORE: ${userCardInventoryFile.Anzahl}`);
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] gefundene Anzahl BEFORE: ${userCardInventoryFile.GefundeneAnzahl}`);
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] tauschbare Anzahl BEFORE: ${userCardInventoryFile.TauschbareAnzahl}`);
  //         userCardInventoryFile.Anzahl += 1;
  //         if(peevesFile.wasTraded == false) {
  //           userCardInventoryFile.GefundeneAnzahl += 1;
  //           if(userCardInventoryFile.Anzahl > 1) userCardInventoryFile.TauschbareAnzahl += 1; //wenn das nicht die einzige Karte ist
  //         } else {
  //           if(userCardInventoryFile.GefundeneAnzahl > 0 && userCardInventoryFile.Anzahl == userCardInventoryFile.GefundeneAnzahl + 1) userCardInventoryFile.TauschbareAnzahl += 1; //wenn es gefundene Karten gibt und das die einzige getauschte ist
  //         }
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] Anzahl AFTER: ${userCardInventoryFile.Anzahl}`);
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] gefundene Anzahl AFTER: ${userCardInventoryFile.GefundeneAnzahl}`);
  //         ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //         logger(`BUG-LOGGING: filch: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] tauschbare Anzahl AFTER: ${userCardInventoryFile.TauschbareAnzahl}`);

  //         //get user file
  //         let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //         //ERROR
  //         if(userFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!filch: ERROR! readUserFile`);
  //           return;
  //         }
  //         //user does not exist
  //         if(userFile == null) {
  //           logger(`!filch: no UserFile [${user}]`);
  //           return;
  //         }

  //         //get card file
  //         let cardFile: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(peevesFile.ThingID);
  //         //ERROR
  //         if(cardFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!filch: ERROR! readCardFile`);
  //           return;
  //         }

  //         //SFK points
  //         const cardPoints: number =  huhnwarts2023rarityPoints[cardFile.seltenheit];
  //         if(userCardInventoryFile.Anzahl == 1) userFile.punkteSFK += cardPoints;

  //         //save user inventory file
  //         const writeUserSfkInventoryFile: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(userCardInventoryFile);
  //         //ERROR
  //         if(writeUserSfkInventoryFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!filch: ERROR! writeUserSfkInventoryFile`);
  //           return;
  //         }

  //         //save user file
  //         const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //         //ERROR
  //         if(writeUserFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!filch: ERROR! writeUserFile`);
  //           return;
  //         }

  //         //delete peeves file
  //         const deletePeevesFile: boolean = await Huhnwarts2023Helper.deletePeevesInventoryFile(userId, peevesFile.timestampFound);
  //         //ERROR
  //         if(deletePeevesFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!filch: ERROR! deletePeevesFile`);
  //           return;
  //         }
  //         logger(`!filch: got back ${peevesFile.ThingID} [${peevesFile.ThingType}] from [${user}]`);
  //       }
  //     }
  //   }
  // });

  // //#endregion Peeves

  // //#region Begleittiere
  // //!begleittiere
  // commandHandler.addCommand("begleittiere", true, 0, 10, async ({channel}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const begleittierNamen: string[] | false = await Huhnwarts2023Helper.getBegleittierTypeNames();
  //   //ERROR
  //   if(begleittierNamen == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!begleittiere: ERROR! begleittierNamen`);
  //     return;
  //   }

  //   chatClient.action(channel, `Es gibt folgende Begleittiere: ${listMaker(begleittierNamen)}`);
  //   logger(`!begleittiere`);
  // });

  // //!kaufen(art des begleitieres)
  // commandHandler.addCommand("kaufen", true, 0, 0, async ({channel, user, args, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //missing args
  //   if(args.length == 0) {
  //     chatClient.say(channel, `@${user}, bitte gib ein Tier an, welches du kaufen möchtest.`);
  //     logger(`!kaufen: no arguments`);
  //     return;
  //   }

  //   //get animal file//
  //   const queryAnimal: string = args.join(" ");
  //   const begleittierFile: HuhnwartsBegleittierTypeFile | false  | null = await Huhnwarts2023Helper.getBegleittierTypeByName(queryAnimal);
  //   //ERROR
  //   if(begleittierFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!kaufen: ERROR! begleittierNamen`);
  //     return;
  //   }
  //   //invalid animal
  //   if(begleittierFile == null) {
  //     chatClient.say(channel, `@${user}, dieses Begleittier scheint nicht zu existieren. Bitte überprüfe die Schreibweise.`);
  //     logger(`!kaufen: invalid animal "${queryAnimal}"`);
  //     return;
  //   }

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!kaufen: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //user does not exist
  //   if(userFile == null) {
  //     chatClient.say(channel, `@${user}, du musst zuerst einem Haus beitreten und Futter sammeln, bevor du dir ein Tier kaufen kannst.`);
  //     logger(`!kaufen: no user file [${user}]`);
  //     return;
  //   }
    
  //   //check food//
  //   if(userFile.countFutter < 10) {
  //     //user has not enough food
  //     chatClient.say(channel, `@${user}, du hast leider nicht genügend Futter für ein Tier... [${userFile.countFutter}/10]`);
  //     logger(`!kaufen: not enough food [${user}]`);
  //     return;
  //   }

  //   //check if user already ownes this animal//
  //   const userBegleittierFiles: HuhnwartsBegleittierFile[] | false | null = await Huhnwarts2023Helper.readBegleittierFilesByBesitzer(userId);
  //   //ERROR
  //   if(userBegleittierFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!kaufen: ERROR! userBegleittierFiles [${user}]`);
  //     return;
  //   }

  //   //user already owns all animal types
  //   if(userBegleittierFiles != null && userBegleittierFiles.length == 17) {
  //     chatClient.say(channel, `@${user}, du besitzt bereits alle Tierarten. Gratulation!`);
  //     logger(`!kaufen: [${user}] already owns all animal types`);
  //     return;
  //   }

  //   let alreadOwns: boolean = false;
  //   if(userBegleittierFiles != null) {
  //     for(const begleittierFile of userBegleittierFiles) {
  //       if(begleittierFile.typ.toLowerCase() == queryAnimal.toLowerCase()) alreadOwns = true;
  //     }
  //   }

  //   //user already owns this animal type
  //   if(alreadOwns == true) {
  //     chatClient.say(channel, `@${user}, du besitzt bereits ein Tier des Typen "${queryAnimal}". Suche dir doch ein anderes aus.`);
  //     logger(`!kaufen:[${user}] already owns a ${queryAnimal}`);
  //     return;
  //   }

  //   //user can buy animal//
  //   let begleittierEigenschaften: string[] = [begleittierFile.Satzteil1, " ", pickRandom(begleittierFile.Fellfarbe), " "];
  //   begleittierEigenschaften = begleittierEigenschaften.concat(getRandomInt(0, 101) <= begleittierFile.FellfarbeWar ? [begleittierFile.SatzteilOpt1, " ", pickRandom(begleittierFile.FellfarbeOpt1), " "] : []);
  //   begleittierEigenschaften.push(begleittierFile.Satzteil2, " ", pickRandom(begleittierFile.Fellstruktur), " ", begleittierFile.Satzteil2Suf, ". ",begleittierFile.Satzteil3Pre, " ", pickRandom(begleittierFile.Augenfarbe), ". ");
  //   begleittierEigenschaften = begleittierEigenschaften.concat(getRandomInt(0, 101) <= begleittierFile.Satzteil4War ? [begleittierFile.Satzteil4Opt, " ", pickRandom(begleittierFile.Eigenschaft), "."] : []);

  //   const newBegleittier: HuhnwartsBegleittierFile = {
  //     id: begleittierFile.BegleittiertypID,
  //     name: '',
  //     eigenschaften: begleittierEigenschaften,
  //     besitzer: userId,
  //     typ: begleittierFile.Begleittiertyp,
  //     awayUntil: 0,
  //     activity: null
  //   }

  //   //write Begleittier file
  //   const writeBegleittierFile: boolean = await Huhnwarts2023Helper.writeBegleittierFile(newBegleittier);
  //   //ERROR
  //   if(writeBegleittierFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!kaufen: ERROR! writeBegleittierFile [${user}]`);
  //     return;
  //   }

  //   //subtract food//
  //   userFile.countFutter -= 10;
  //   const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeUserFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!kaufen: ERROR! writeUserFile [${user}]`);
  //     return;
  //   }

  //   //say in chat
  //   chatClient.say(channel, `@${user}, Gratulation! xicanmHyped Du hast dir erfolgreich ein neues Tier gekauft. ${newBegleittier.eigenschaften.join("")}`);
  //   logger(`!kaufen: [${user}] buys new ${newBegleittier.typ}`);

  //   await huhnwarts2023checkBegleittierAchievements(userId, user);
  // });

  // //!tiersuche
  // commandHandler.addCommand("tiersuche", true, 0, 0, async ({channel, user, args, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tiersuche: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //user does not exist
  //   if(userFile == null) {
  //     chatClient.say(channel, `@${user}, du musst zuerst einem Haus beitreten und ein Tier kaufen, bevor du das tun kannst.`);
  //     logger(`!tiersuche: no user file [${user}]`);
  //     return;
  //   }

  //   //check if user has animals//
  //   const begleittierFiles: HuhnwartsBegleittierFile[] | false | null = await Huhnwarts2023Helper.readBegleittierFilesByBesitzer(userId);
  //   //ERROR
  //   if(begleittierFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tiersuche: ERROR! begleittierFiles [${user}]`);
  //     return;
  //   }
  //   //user has no animals
  //   if(begleittierFiles == null) {
  //     chatClient.say(channel, `@${user}, du musst zuerst ein Tier kaufen, bevor du das tun kannst.`);
  //     logger(`!tiersuche: no Begleittier files [${user}]`);
  //     return;
  //   }

  //   //check if user has free animal//
  //   const now: number = Date.now();
  //   let availableBegleittiere: HuhnwartsBegleittierFile[] = [];
  //   let nonAvailableBegleittiere: HuhnwartsBegleittierFile[] = [];
  //   for(const begleittierFile of begleittierFiles) {
  //     if(begleittierFile.awayUntil <= now) {
  //       availableBegleittiere.push(begleittierFile);
  //     } else {
  //       nonAvailableBegleittiere.push(begleittierFile);
  //     }
  //   }
  //   nonAvailableBegleittiere.sort(function (a, b) {
  //     return a.awayUntil - b.awayUntil;
  //   });

  //   if(availableBegleittiere.length == 0) {
  //     const nextAvailableDate: Date = new Date(nonAvailableBegleittiere[0].awayUntil);

  //     let sentBegleittierTypeFile: HuhnwartsBegleittierTypeFile | false | null = await Huhnwarts2023Helper.getBegleittierTypeByName(nonAvailableBegleittiere[0].typ);
  //     //ERROR
  //     if(sentBegleittierTypeFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //     }
  //     //type does not exist
  //     if(sentBegleittierTypeFile == null) {
  //       sentBegleittierTypeFile = await Huhnwarts2023Helper.getBonustierTypeByName(nonAvailableBegleittiere[0].typ);
  //       //ERROR
  //       if(sentBegleittierTypeFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //         return;
  //       }
  //       //type does not exist | impossible
  //       if(sentBegleittierTypeFile == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //       }
  //     }
  //     const artikel1: "dein" | "deine" = sentBegleittierTypeFile.Gender == "F" ? "deine" : "dein";

  //     chatClient.say(channel, `@${user}, keines deiner Tiere ist derzeit verfügbar. Als nächstes ist ${artikel1} ${nonAvailableBegleittiere[0].typ}${nonAvailableBegleittiere[0].name != `` ? ` "${nonAvailableBegleittiere[0].name}"` : ``} um ${nextAvailableDate.getHours()}:${nextAvailableDate.getMinutes()} Uhr verfügbar.`);
  //     logger(`!tiersuche: no available Begleittier [${user}]`);
  //     return;
  //   }

  //   //check if user has enough food//
  //   if(userFile.countFutter < 3) {
  //     chatClient.say(channel, `@${user}, du hast nicht genügend Futter um das zu tun. [${userFile.countFutter}/3]`);
  //     logger(`!tiersuche: not enough food [${user}]`);
  //     return;
  //   }

  //   //---user can send animal---///
  //   //check for args
  //   if(args.length == 0) {
  //       chatClient.say(channel, `@${user}, bitte gib einen Ort an, zu dem du dein Tier schicken willst.`);
  //       logger(`!tiersuche: no place [${user}]`);
  //       return;
  //   }

  //   //args > 0
  //   const searchQuery: string | number = isNaN(Number(args[0])) ? args.join(" ") : Number(args[0]);
  //   const placeInfo: HuhnwartsOrteFile | false | null = typeof searchQuery == "string" ? await Huhnwarts2023Helper.readPlaceInfoByName(searchQuery) : await Huhnwarts2023Helper.readPlaceInfoByID(searchQuery);
  //   //ERROR
  //   if(placeInfo == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tiersuche: ERROR! placeInfo [${user}]`);
  //     return;
  //   }
  //   //invalid place
  //   if(placeInfo == null) {
  //     chatClient.say(channel, `@${user}, diesen Ort scheint es nicht zu geben. Bitte überprüfe deine Schreibweise.`);
  //     logger(`!tiersuche: invalid place (${searchQuery}) [${user}]`);
  //     return;
  //   }

  //   //user has already sent out one Begelittier to search
  //   if(nonAvailableBegleittiere.filter(tier => tier.activity == "tiersuche").length != 0) {
  //     nonAvailableBegleittiere = nonAvailableBegleittiere.filter(tier => tier.activity == "tiersuche");
  //     const lastBegleittierBack: HuhnwartsBegleittierFile = nonAvailableBegleittiere[nonAvailableBegleittiere.length-1];
  //     const lastDateBack: Date = new Date(lastBegleittierBack.awayUntil);

  //     let sentBegleittierTypeFile: HuhnwartsBegleittierTypeFile | false | null = await Huhnwarts2023Helper.getBegleittierTypeByName(lastBegleittierBack.typ);
  //     //ERROR
  //     if(sentBegleittierTypeFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //     }
  //     //type does not exist
  //     if(sentBegleittierTypeFile == null) {
  //       sentBegleittierTypeFile = await Huhnwarts2023Helper.getBonustierTypeByName(lastBegleittierBack.typ);
  //       //ERROR
  //       if(sentBegleittierTypeFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //         return;
  //       }
  //       //type does not exist | impossible
  //       if(sentBegleittierTypeFile == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //       }
  //     }
  //     const artikel1: "Dein" | "Deine" = sentBegleittierTypeFile.Gender == "F" ? "Deine" : "Dein";

  //     chatClient.say(channel, `@${user}, du hast bereits ein Tier, das für dich unterwegs ist. ${artikel1} ${lastBegleittierBack.typ}${lastBegleittierBack.name != `` ? ` "${lastBegleittierBack.name}"` : ``} ist um ${lastDateBack.getHours()}:${lastDateBack.getMinutes() < 10 ? `0${lastDateBack.getMinutes()}` : lastDateBack.getMinutes()} Uhr zurück.`);
  //     logger(`!tiersuche: [${user}] already has Begleittier searching`);
  //     return;
  //   }

  //   //pick Begleittier
  //   let sentBegleittier: HuhnwartsBegleittierFile = pickRandom(availableBegleittiere);
    
  //   setTimeout(async (sentBegleittier: HuhnwartsBegleittierFile, args: string[], userId: number, placeInfo: HuhnwartsOrteFile) => {
  //     //userFile
  //     const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userId);
  //     //ERROR
  //     if(userFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tiersuche: ERROR! userFile`);
  //       return;
  //     }
  //     //null
  //     if(userFile == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tiersuche: ERROR! userFile`);
  //       return;
  //     }

  //     //object/card
  //     let thing: foundThing = {"type": ObjectOrCard(), "id": 0, "name": "", "punkte": 0};

  //     if(thing.type == "Gegenstand") {
  //       //get objectIDs
  //       const objectIDs: number[] | false = await Huhnwarts2023Helper.getObjectIDs();
  //       //ERROR
  //       if(objectIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! objectIDs`);
  //         return;
  //       }

  //       //pick object
  //       thing.id = pickRandom(objectIDs);    

  //       //get object name
  //       const objectFile: HuhnwartsObjectFile | false = await Huhnwarts2023Helper.readObjectFileByID(thing.id);
  //       //ERROR
  //       if(objectFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! objectFile`);
  //         return;
  //       }
  //       thing.name = objectFile.Name;

  //       //fetch user object inventory
  //       const userObjectInventory: HuhnwartsObjectInventoryFile | false = await Huhnwarts2023Helper.readObjectInventoryFile(userId, thing.id);
  //       //ERROR
  //       if(userObjectInventory == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! userObjectInventory`);
  //         return;
  //       }
      
  //       //write new user object inventory
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] Anzahl BEFORE: ${userObjectInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] gefundene Anzahl BEFORE: ${userObjectInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] tauschbare Anzahl BEFORE: ${userObjectInventory.TauschbareAnzahl}`);
  //       userObjectInventory.Anzahl += 1;
  //       userObjectInventory.GefundeneAnzahl += 1;
  //       if(userObjectInventory.Anzahl > 1) userObjectInventory.TauschbareAnzahl += 1; //wenn das nicht das erste Objekt war
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] Anzahl AFTER: ${userObjectInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] gefundene Anzahl AFTER: ${userObjectInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] tauschbare Anzahl AFTER: ${userObjectInventory.TauschbareAnzahl}`);

  //       const writeObjectInventoryFile: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(userObjectInventory);
  //       //ERROR
  //       if(writeObjectInventoryFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! writeObjectInventoryFile`);
  //         return;
  //       }

  //       //thing.punkte
  //       if(userObjectInventory.Anzahl == 1) thing.punkte = 1;
  //     } else if(thing.type == "Karte") {

  //       //pick rarity
  //       let huhnwarts2023RaritiesList: number[] = []
  //       Object.keys(huhnwarts2023Rarities).forEach(rarity => {
  //         for(let i = 1; i <= huhnwarts2023Rarities[rarity]*10; i++) {
  //           huhnwarts2023RaritiesList.push(Number(rarity));
  //         }
  //       });
  //       const rarity: 1|2|3|4|5 = pickRandom(huhnwarts2023RaritiesList);

  //       //get sfkIDs
  //       const sfkIDs: number[] | false | null = args.length != 0 ? await Huhnwarts2023Helper.getSfkIDs(placeInfo.OrtID, rarity) : await Huhnwarts2023Helper.getSfkIDs(0, rarity);
  //       //ERROR
  //       if(sfkIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! sfkIDs`);
  //         return;
  //       }
  
  //       //pick card
  //       if(sfkIDs == null) {
  //         //no cards of that rarity at this location
  //         const raritySfkIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByRarity(rarity);
  //         //ERROR
  //         if(raritySfkIDs == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!tiersuche: ERROR! raritySfkIDs`);
  //           return;
  //         }
  //         thing.id = pickRandom(raritySfkIDs);
  //       } else {
  //         thing.id = pickRandom(sfkIDs);
  //       }

  //       //get card name
  //       const cardFile: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(thing.id);
  //       //ERROR
  //       if(cardFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! cardFile`);
  //         return;
  //       }
  //       thing.name = cardFile.Name;

  //       //fetch user SFK inventory
  //       const userSfkInventory: HuhnwartsSfkInventoryFile | false = await Huhnwarts2023Helper.readSfkInventoryFile(userId, thing.id);
  //       //ERROR
  //       if(userSfkInventory == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! userSfkInventory`);
  //         return;
  //       }
      
  //       //write user sfk inventory//
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] Anzahl BEFORE: ${userSfkInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] gefundene Anzahl BEFORE: ${userSfkInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] tauschbare Anzahl BEFORE: ${userSfkInventory.TauschbareAnzahl}`);
  //       userSfkInventory.Anzahl += 1;
  //       userSfkInventory.GefundeneAnzahl += 1;
  //       if(userSfkInventory.Anzahl > 1) userSfkInventory.TauschbareAnzahl += 1; //wenn das nicht die erste Karte war
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] Anzahl AFTER: ${userSfkInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] gefundene Anzahl AFTER: ${userSfkInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: tiersuche: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] tauschbare Anzahl AFTER: ${userSfkInventory.TauschbareAnzahl}`);

  //       //SFK points
  //       const cardPoints: number =  huhnwarts2023rarityPoints[cardFile.seltenheit];
  //       if(userSfkInventory.Anzahl == 1) {
  //         userFile.punkteSFK += cardPoints;
  //         thing.punkte = cardPoints;
  //       }

  //       const writeUserSfkInventory: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(userSfkInventory);
  //       //ERROR
  //       if(writeUserSfkInventory == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! writeUserSfkInventory`);
  //         return;
  //       }

  //       //write user file
  //       const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //       //ERROR
  //       if(writeUserFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! writeUserFile [${user}]`);
  //         return;
  //       }
  //     }

  //     let sentBegleittierTypeFile: HuhnwartsBegleittierTypeFile | false | null = await Huhnwarts2023Helper.getBegleittierTypeByName(sentBegleittier.typ);
  //     //ERROR
  //     if(sentBegleittierTypeFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //     }
  //     //type does not exist
  //     if(sentBegleittierTypeFile == null) {
  //       sentBegleittierTypeFile = await Huhnwarts2023Helper.getBonustierTypeByName(sentBegleittier.typ);
  //       //ERROR
  //       if(sentBegleittierTypeFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //         return;
  //       }
  //       //type does not exist | impossible
  //       if(sentBegleittierTypeFile == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //       }
  //     }
  //     const artikel1: "dein" | "deine" = sentBegleittierTypeFile.Gender == "F" ? "deine" : "dein";

  //     //announce in chat//
  //     chatClient.say(channel, `@${user}, ${artikel1} ${sentBegleittier.typ}${sentBegleittier.name != `` ? ` "${sentBegleittier.name}"` : ``} findet ${thing.type == "Gegenstand" ? `diesen Gegenstand: ${thing.name} [${thing.punkte == 0 ? "doppelt" : `+${thing.punkte}`}]` : `diese Karte: ${thing.name} [${thing.punkte == 0 ? "doppelt" : `+${thing.punkte}`}]`}.`);
  //     logger(`!tiersuche: [${user}] ${thing.name} [${thing.type}]`);  

  //     //check for SFK achievements//
  //     if(thing.type == "Karte") await huhnwarts2023checkSfkAchievements(userId, user); 

  //     //check for object achievements//
  //     if(thing.type == "Gegenstand") await huhnwarts2023checkObjectAchievements(userId, user);
  //   }, 10*60*1000, sentBegleittier, args, userId, placeInfo); //15 min 

  //   //send Begleittier//
  //   sentBegleittier.awayUntil = now + 60*60*1000;
  //   sentBegleittier.activity = "tiersuche";
  //   userFile.countFutter -= 3;

  //   //write Begleittier file
  //   const writeBegleittierFile: boolean = await Huhnwarts2023Helper.writeBegleittierFile(sentBegleittier);
  //   //ERROR
  //   if(writeBegleittierFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tiersuche: ERROR! writeBegleittierFile [${user}]`);
  //     return;
  //   }

  //   //write user file
  //   const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeUserFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tiersuche: ERROR! writeUserFile [${user}]`);
  //     return;
  //   }

  //   let sentBegleittierTypeFile: HuhnwartsBegleittierTypeFile | false | null = await Huhnwarts2023Helper.getBegleittierTypeByName(sentBegleittier.typ);
  //   //ERROR
  //   if(sentBegleittierTypeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //     return;
  //   }
  //   //type does not exist
  //   if(sentBegleittierTypeFile == null) {
  //     sentBegleittierTypeFile = await Huhnwarts2023Helper.getBonustierTypeByName(sentBegleittier.typ);
  //     //ERROR
  //     if(sentBegleittierTypeFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //     }
  //     //type does not exist | impossible
  //     if(sentBegleittierTypeFile == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //     return;
  //     }
  //   }
  //   const artikel1: "dein" | "deine" | "deinen" = sentBegleittierTypeFile.Gender == "M" ? "deinen" : sentBegleittierTypeFile.Gender == "F" ? "deine" : "dein";
  //   const artikel2: "er" | "sie" | "es" = sentBegleittierTypeFile.Gender == "M" ? "er" : sentBegleittierTypeFile.Gender == "F" ? "sie" : "es";

  //   //announce in chat//
  //   chatClient.say(channel, `@${user}, du sendest ${artikel1} ${sentBegleittier.typ}${sentBegleittier.name != `` ? ` "${sentBegleittier.name}"` : ``} los zum Suchen. Was ${artikel2} wohl finden wird...?`);
  //   logger(`!tiersuche: [${user}] sends ${sentBegleittier.name} [${sentBegleittier.typ}]`);   

  //   //check for Spitzensucher [2] Achievement//
  //   await huhnwarts2023checkSuchenAchievements(userId, user, placeInfo.OrtID);
  // });

  // //!peevesjagen
  // commandHandler.addCommand(["peevesjagen", "peevesjagt"], true, 0, 0, async ({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!peevesjagen: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //user does not exist
  //   if(userFile == null) {
  //     chatClient.say(channel, `@${user}, du musst zuerst einem Haus beitreten und ein Tier kaufen, bevor du das tun kannst.`);
  //     logger(`!peevesjagen: no user file [${user}]`);
  //     return;
  //   }

  //   //check if user has animals//
  //   const begleittierFiles: HuhnwartsBegleittierFile[] | false | null = await Huhnwarts2023Helper.readBegleittierFilesByBesitzer(userId);
  //   //ERROR
  //   if(begleittierFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!peevesjagen: ERROR! begleittierFiles [${user}]`);
  //     return;
  //   }
  //   //user has no animals
  //   if(begleittierFiles == null) {
  //     chatClient.say(channel, `@${user}, du musst zuerst ein Tier kaufen, bevor du das tun kannst.`);
  //     logger(`!peevesjagen: no Begleittier files [${user}]`);
  //     return;
  //   }

  //   //check if user has free animal//
  //   const now: number = Date.now();
  //   let availableBegleittiere: HuhnwartsBegleittierFile[] = [];
  //   let nonAvailableBegleittiere: HuhnwartsBegleittierFile[] = [];
  //   for(const begleittierFile of begleittierFiles) {
  //     if(begleittierFile.awayUntil <= now) {
  //       availableBegleittiere.push(begleittierFile);
  //     } else {
  //       nonAvailableBegleittiere.push(begleittierFile);
  //     }
  //   }
  //   nonAvailableBegleittiere.sort(function (a, b) {
  //     return a.awayUntil - b.awayUntil;
  //   });

  //   //user has no free animal
  //   if(availableBegleittiere.length == 0) {
  //     const nextAvailableDate: Date = new Date(nonAvailableBegleittiere[0].awayUntil);
  //     chatClient.say(channel, `@${user}, keines deiner Tiere ist derzeit verfügbar. Dein nächstes Tier ist um ${nextAvailableDate.getHours()}:${nextAvailableDate.getMinutes() < 10 ? `0${nextAvailableDate.getMinutes()}` : nextAvailableDate.getMinutes()} Uhr verfügbar (${nonAvailableBegleittiere[0].name != `` ? nonAvailableBegleittiere[0].name : nonAvailableBegleittiere[0].typ}).`);
  //     logger(`!peevesjagen: no available Begleittier [${user}]`);
  //     return;
  //   }

  //   //check if user has enough food//
  //   if(userFile.countFutter < 3) {
  //     chatClient.say(channel, `@${user}, du hast nicht genügend Futter um das zu tun. [${userFile.countFutter}/3]`);
  //     logger(`!peevesjagen: not enough food [${user}]`);
  //     return;
  //   }

  //   //---user can send animal---//
  //   //check for Peeves//
  //   const userPeevesFiles: HuhnwartsPeevesInventoryFile[] | false | null = await Huhnwarts2023Helper.readPeevesInventoryFilesByID(userId);
  //   //ERROR
  //   if(userPeevesFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!peevesjagen: ERROR! userPeevesFiles [${user}]`);
  //     return;
  //   }
  //   //user has no Peeves files
  //   if(userPeevesFiles == null) {
  //     chatClient.say(channel, `@${user}, du scheinst nicht von Peeves angegriffen worden zu sein.`);
  //     logger(`!peevesjagen: no peeves file [${user}]`);
  //     return;
  //   }
  //   //user has Peeves files
  //   let protectedPeevesFile: HuhnwartsPeevesInventoryFile | null = null;
  //   for(const peevesFile of userPeevesFiles) {
  //     if(peevesFile.timestampFound > now - huhnwarts2023PeevesProtectionTime*1000 && peevesFile.canFilch == false) {
  //       //valid Peeves file
  //       protectedPeevesFile = peevesFile;
  //       break;
  //     }
  //   }
  //   //user has Peeves files, but no protected Peeves files
  //   if(protectedPeevesFile == null) {
  //     userPeevesFiles.sort(function (a, b) {
  //       return a.timestampFound - b.timestampFound;
  //     });
  //     const lastEntry: HuhnwartsPeevesInventoryFile = userPeevesFiles[userPeevesFiles.length-1];
  //     const lastEntryDate: Date = new Date(lastEntry.timestampFound);
  //     chatClient.say(channel, `@${user}, leider bist du zu spät. Du hast nach einem Peeves Angriff 30 Sekunden Zeit um ein Tier hinter ihm herzuschicken. (Letzter Angriff: ${lastEntryDate.getHours() < 10 ? `0${lastEntryDate.getHours()}` : lastEntryDate.getHours()}:${lastEntryDate.getMinutes() < 10 ? `0${lastEntryDate.getMinutes()}` : lastEntryDate.getMinutes()}.${lastEntryDate.getSeconds() < 10 ? `0${lastEntryDate.getSeconds()}` : lastEntryDate.getSeconds()} [hh:mm.ss])`);
  //     logger(`!peevesjagen: too late [${user}] (${msToTime(lastEntry.timestampFound)[0]}:${msToTime(lastEntry.timestampFound)[1]}.${msToTime(lastEntry.timestampFound)[2]}[hh:mm.ss]))`);
  //     return;
  //   }
  //   //user has protected Peeves files
  //   if(protectedPeevesFile.ThingType == "Gegenstand") {
  //     //thing is object
  //     let userObjectInventoryFile: HuhnwartsObjectInventoryFile | false = await Huhnwarts2023Helper.readObjectInventoryFile(userId, protectedPeevesFile.ThingID);
  //     //ERROR
  //     if(userObjectInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!peevesjagen: ERROR! userObjectInventoryFile`);
  //       return;
  //     }

  //     //add object back
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] Anzahl BEFORE: ${userObjectInventoryFile.Anzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] gefundene Anzahl BEFORE: ${userObjectInventoryFile.GefundeneAnzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] tauschbare Anzahl BEFORE: ${userObjectInventoryFile.TauschbareAnzahl}`);
  //     userObjectInventoryFile.Anzahl += 1;
  //     userObjectInventoryFile.GefundeneAnzahl += 1;
  //     if(userObjectInventoryFile.Anzahl > 1) userObjectInventoryFile.TauschbareAnzahl += 1; //wenn das nicht das erste Objekt war
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] Anzahl AFTER: ${userObjectInventoryFile.Anzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] gefundene Anzahl AFTER: ${userObjectInventoryFile.GefundeneAnzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Objekt Nr. ${userObjectInventoryFile.GegenstandID}] tauschbare Anzahl AFTER: ${userObjectInventoryFile.TauschbareAnzahl}`);

  //     //save user file
  //     const writeuserObjectInventoryFile: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(userObjectInventoryFile);
  //     //ERROR
  //     if(writeuserObjectInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!peevesjagen: ERROR! writeuserObjectInventoryFile`);
  //       return;
  //     }

  //     //delete peeves file
  //     const deletePeevesFile: boolean = await Huhnwarts2023Helper.deletePeevesInventoryFile(userId, protectedPeevesFile.timestampFound);
  //     //ERROR
  //     if(deletePeevesFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!peevesjagen: ERROR! deletePeevesFile`);
  //       return;
  //     }
  //     logger(`!peevesjagen: got back ${protectedPeevesFile.ThingID} [${protectedPeevesFile.ThingType}] from [${user}]`);

  //     //check for object achievements//
  //     await huhnwarts2023checkObjectAchievements(userId, user);
  //   } else {
  //     //thing is card
  //     let userCardInventoryFile: HuhnwartsSfkInventoryFile | false = await Huhnwarts2023Helper.readSfkInventoryFile(userId, protectedPeevesFile.ThingID);
  //     //ERROR
  //     if(userCardInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!peevesjagen: ERROR! userCardInventoryFile`);
  //       return;
  //     }

  //     //add card back
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] Anzahl BEFORE: ${userCardInventoryFile.Anzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] gefundene Anzahl BEFORE: ${userCardInventoryFile.GefundeneAnzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] tauschbare Anzahl BEFORE: ${userCardInventoryFile.TauschbareAnzahl}`);
  //     userCardInventoryFile.Anzahl += 1;
  //     userCardInventoryFile.GefundeneAnzahl += 1;
  //     if(userCardInventoryFile.Anzahl > 1) userCardInventoryFile.TauschbareAnzahl += 1; //wenn das nicht die erste Karte war
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] Anzahl AFTER: ${userCardInventoryFile.Anzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] gefundene Anzahl AFTER: ${userCardInventoryFile.GefundeneAnzahl}`);
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: peevesjagen: user ${user} [Karte Nr. ${userCardInventoryFile.SchokofroschID}] tauschbare Anzahl AFTER: ${userCardInventoryFile.TauschbareAnzahl}`);

  //     //get card file
  //     let cardFile: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(protectedPeevesFile.ThingID);
  //     //ERROR
  //     if(cardFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!peevesjagen: ERROR! readCardFile`);
  //       return;
  //     }

  //     //SFK points
  //     const cardPoints: number =  huhnwarts2023rarityPoints[cardFile.seltenheit];
  //     if(userCardInventoryFile.Anzahl == 1) userFile.punkteSFK += cardPoints;

  //     //save user file
  //     const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //     //ERROR
  //     if(writeUserFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!peevesjagen: ERROR! writeUserFile`);
  //       return;
  //     }

  //     //save user inventory file
  //     const writeUserSfkInventoryFile: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(userCardInventoryFile);
  //     //ERROR
  //     if(writeUserSfkInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!peevesjagen: ERROR! writeUserSfkInventoryFile`);
  //       return;
  //     }

  //     //delete peeves file
  //     const deletePeevesFile: boolean = await Huhnwarts2023Helper.deletePeevesInventoryFile(userId, protectedPeevesFile.timestampFound);
  //     //ERROR
  //     if(deletePeevesFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!peevesjagen: ERROR! deletePeevesFile`);
  //       return;
  //     }
  //     logger(`!peevesjagen: got back ${protectedPeevesFile.ThingID} [${protectedPeevesFile.ThingType}] from [${user}]`);
  //   }

  //   //send Begleittier//
  //   let sentBegleittier: HuhnwartsBegleittierFile = pickRandom(availableBegleittiere);
  //   sentBegleittier.awayUntil = now + 4*60*60*1000;
  //   userFile.countFutter -= 3;
  //   sentBegleittier.activity = "peevsjagen";

  //   //write Begleittier file
  //   const writeBegleittierFile: boolean = await Huhnwarts2023Helper.writeBegleittierFile(sentBegleittier);
  //   //ERROR
  //   if(writeBegleittierFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!peevesjagen: ERROR! writeBegleittierFile [${user}]`);
  //     return;
  //   }

  //   //write user file
  //   const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeUserFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!peevesjagen: ERROR! writeUserFile [${user}]`);
  //     return;
  //   }

  //   let sentBegleittierTypeFile: HuhnwartsBegleittierTypeFile | false | null = await Huhnwarts2023Helper.getBegleittierTypeByName(sentBegleittier.typ);
  //   //ERROR
  //   if(sentBegleittierTypeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!peevesjagen: ERROR! sentBegleittierTypeFile [${user}]`);
  //     return;
  //   }
  //   //type does not exist
  //   if(sentBegleittierTypeFile == null) {
  //     sentBegleittierTypeFile = await Huhnwarts2023Helper.getBonustierTypeByName(sentBegleittier.typ);
  //     //ERROR
  //     if(sentBegleittierTypeFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!peevesjagen: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //     }
  //     //type does not exist | impossible
  //     if(sentBegleittierTypeFile == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!peevesjagen: ERROR! sentBegleittierTypeFile [${user}]`);
  //     return;
  //     }
  //   }
  //   const artikel1: "dein" | "deine" | "deinen" = sentBegleittierTypeFile.Gender == "M" ? "deinen" : sentBegleittierTypeFile.Gender == "F" ? "deine" : "dein";


  //   //say in chat
  //   chatClient.say(channel, `@${user}, du sendest ${artikel1} ${sentBegleittier.name != `` ? `${sentBegleittier.typ} "${sentBegleittier.name}"` : sentBegleittier.typ} hinter Peeves her und kriegst ${protectedPeevesFile.ThingType == "Gegenstand" ? `deinen Gegenstand` : `deine Karte`} zurück.`);
  //   logger(`!peevesjagen: Peeves [${user}]`);
  //   //check for SFK achievements//
  //   if(protectedPeevesFile.ThingType == "Karte") await huhnwarts2023checkSfkAchievements(userId, user);
  //   return;

  // });

  // //!tier (art des Begleiters) (Name)
  // commandHandler.addCommand("tier", true, 0, 0, async ({channel, user, args, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //no args
  //   if(args.length == 0) {
  //     chatClient.say(channel, `@${user}, bitte gib ein Tier und/oder einen Namen an.`);
  //     logger(`!tier: missing args`);
  //     return;
  //   }

  //   const tierType: string = args[0];
  //   const tierName1: string = args.join(" ");
  //   const tierName2: string = args.slice(1).join(" ");
  //   let gotByName: boolean = false;

  //   //check Tier//
  //   let begleittierType: HuhnwartsBegleittierTypeFile | false | null = await Huhnwarts2023Helper.getBegleittierTypeByName(tierType);
  //   //ERROR
  //   if(begleittierType == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tier: ERROR! begleittierType`);
  //     return;
  //   }

  //   if(begleittierType == null) {
  //     //try Huhn
  //     begleittierType = await Huhnwarts2023Helper.getBonustierTypeByName(tierType);
  //     //ERROR
  //     if(begleittierType == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tier: ERROR! begleittierType`);
  //       return;
  //     }
  //   }

  //   //fetch Begleittier file//
  //   //by type
  //   let begleittierFile: HuhnwartsBegleittierFile | false | null = await Huhnwarts2023Helper.readUserBegleittierFileWithType(userId, tierType);
  //   //ERROR
  //   if(begleittierFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tier: ERROR! begleittierFile`);
  //     return;
  //   }

  //   //does not own this animal
  //   if(begleittierFile == null) {
  //     //by name
  //     begleittierFile = await Huhnwarts2023Helper.readUserBegleittierFileWithName(userId, tierName1);
  //     //ERROR
  //     if(begleittierFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tier: ERROR! begleittierFile`);
  //       return;
  //     }
  //     //does not own this animal
  //     if(begleittierFile == null) {
  //       //invalid animal
  //       if(begleittierType == null) {
  //         chatClient.say(channel, `@${user}, dieses Begleittier scheint nicht zu existieren. Bitte überprüfe die Schreibweise.`);
  //         logger(`!tier: invalid animal "${tierType}"`);
  //         return;
  //       }
  //       chatClient.say(channel, `@${user}, du scheinst diese Art Tier nicht zu besitzen.`);
  //       logger(`!tier: [${user}] does not own "${begleittierType.Begleittiertyp}"`);
  //       return;
  //     }
  //     gotByName = true;
  //   }

  //   //no name -> description//
  //   if(args.length == 1 || gotByName == true) {
  //     chatClient.say(channel, `@${user}, ${begleittierFile.name != `` ? `${begleittierFile.name} ist ${begleittierFile.eigenschaften.slice(1).join("")}` : begleittierFile.eigenschaften.join("")}`);
  //     logger(`!tier: [${user}] Begleittier description`);
  //     return;
  //   }

  //   //name//
  //   begleittierFile.name = tierName2;

  //   //write file
  //   const writeBegleittierFile: boolean = await Huhnwarts2023Helper.writeBegleittierFile(begleittierFile);
  //   //ERROR
  //   if(writeBegleittierFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tier: ERROR! writeBegleittierFile`);
  //     return;
  //   }

  //   let begleittierTypeFile: HuhnwartsBegleittierTypeFile | false | null = await Huhnwarts2023Helper.getBegleittierTypeByName(begleittierFile.typ);
  //   //ERROR
  //   if(begleittierTypeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tier: ERROR! begleittierTypeFile [${user}]`);
  //     return;
  //   }
  //   //type does not exist
  //   if(begleittierTypeFile == null) {
  //     begleittierTypeFile = await Huhnwarts2023Helper.getBonustierTypeByName(begleittierFile.typ);
  //     //ERROR
  //     if(begleittierTypeFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tier: ERROR! begleittierTypeFile [${user}]`);
  //       return;
  //     }
  //     //type does not exist | impossible
  //     if(begleittierTypeFile == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tier: ERROR! begleittierTypeFile [${user}]`);
  //     return;
  //     }
  //   }
  //   const artikel1: "dein" | "deine" = begleittierTypeFile.Gender == "F" ? "deine" : "dein";

  //   //say in chat
  //   chatClient.say(channel, `@${user}, ${artikel1} ${begleittierFile.typ} heisst jetzt ${begleittierFile.name}. xicanmHyped`);
  //   logger(`!tier: [${user}] Begleittier [${begleittierFile.typ}] name ${begleittierFile.name}`);
  // });

  // //!schnüffeln
  // commandHandler.addCommand(["schnüffeln", "schnueffeln"], true, 0, 0, async({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!schnüffeln: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //user does not exist
  //   if(userFile == null) {
  //     chatClient.say(channel, `@${user}, du musst zuerst einem Haus beitreten und ein Tier kaufen, bevor du das tun kannst.`);
  //     logger(`!schnüffeln: no user file [${user}]`);
  //     return;
  //   }

  //   //check if user has animals//
  //   const begleittierFiles: HuhnwartsBegleittierFile[] | false | null = await Huhnwarts2023Helper.readBegleittierFilesByBesitzer(userId);
  //   //ERROR
  //   if(begleittierFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!schnüffeln: ERROR! begleittierFiles [${user}]`);
  //     return;
  //   }
  //   //user has no animals
  //   if(begleittierFiles == null) {
  //     chatClient.say(channel, `@${user}, du musst zuerst ein Tier kaufen, bevor du das tun kannst.`);
  //     logger(`!schnüffeln: no Begleittier files [${user}]`);
  //     return;
  //   }

  //   //check if user has animals//
  //   const now: number = Date.now();
  //   let availableBegleittiere: HuhnwartsBegleittierFile[] = [];
  //   let nonAvailableBegleittiere: HuhnwartsBegleittierFile[] = [];
  //   for(const begleittierFile of begleittierFiles) {
  //     if(begleittierFile.awayUntil <= now) {
  //       availableBegleittiere.push(begleittierFile);
  //     } else {
  //       nonAvailableBegleittiere.push(begleittierFile);
  //     }
  //   }
  //   nonAvailableBegleittiere.sort(function (a, b) {
  //     return a.awayUntil - b.awayUntil;
  //   });

  //   if(availableBegleittiere.length == 0) {
  //     const nextAvailableDate: Date = new Date(nonAvailableBegleittiere[0].awayUntil);

  //     let sentBegleittierTypeFile: HuhnwartsBegleittierTypeFile | false | null = await Huhnwarts2023Helper.getBegleittierTypeByName(nonAvailableBegleittiere[0].typ);
  //     //ERROR
  //     if(sentBegleittierTypeFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!schnüffeln: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //     }
  //     //type does not exist
  //     if(sentBegleittierTypeFile == null) {
  //       sentBegleittierTypeFile = await Huhnwarts2023Helper.getBonustierTypeByName(nonAvailableBegleittiere[0].typ);
  //       //ERROR
  //       if(sentBegleittierTypeFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!schnüffeln: ERROR! sentBegleittierTypeFile [${user}]`);
  //         return;
  //       }
  //       //type does not exist | impossible
  //       if(sentBegleittierTypeFile == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!schnüffeln: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //      }
  //     }
  //     const artikel1: "dein" | "deine" = sentBegleittierTypeFile.Gender == "F" ? "deine" : "dein";

  //     chatClient.say(channel, `@${user}, keines deiner Tiere ist derzeit verfügbar. Als nächstes ist ${artikel1} ${nonAvailableBegleittiere[0].typ}${nonAvailableBegleittiere[0].name != `` ? ` "${nonAvailableBegleittiere[0].name}"` : ``} um ${nextAvailableDate.getHours()}:${nextAvailableDate.getMinutes() < 10 ? `0${nextAvailableDate.getMinutes()}` : nextAvailableDate.getMinutes()} Uhr verfügbar.`);
  //     logger(`!schnüffeln: no available Begleittier [${user}]`);
  //     return;
  //   }

  //   //check if user has enough food//
  //   if(userFile.countFutter < 1) {
  //     chatClient.say(channel, `@${user}, du hast nicht genügend Futter um das zu tun. [${userFile.countFutter}/1]`);
  //     logger(`!schnüffeln: not enough food [${user}]`);
  //     return;
  //   }

  //   //---user can send animal---//
  //   //user has already sent out one Begelittier
  //   if(nonAvailableBegleittiere.filter(tier => tier.activity == "schnueffeln").length != 0) {
  //     nonAvailableBegleittiere = nonAvailableBegleittiere.filter(tier => tier.activity == "schnueffeln");
  //     const lastBegleittierBack: HuhnwartsBegleittierFile = nonAvailableBegleittiere[nonAvailableBegleittiere.length-1];
  //     const lastDateBack: Date = new Date(lastBegleittierBack.awayUntil);

  //     let sentBegleittierTypeFile: HuhnwartsBegleittierTypeFile | false | null = await Huhnwarts2023Helper.getBegleittierTypeByName(lastBegleittierBack.typ);
  //     //ERROR
  //     if(sentBegleittierTypeFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!schnüffeln: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //     }
  //     //type does not exist
  //     if(sentBegleittierTypeFile == null) {
  //       sentBegleittierTypeFile = await Huhnwarts2023Helper.getBonustierTypeByName(lastBegleittierBack.typ);
  //       //ERROR
  //       if(sentBegleittierTypeFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!schnüffeln: ERROR! sentBegleittierTypeFile [${user}]`);
  //         return;
  //       }
  //       //type does not exist | impossible
  //       if(sentBegleittierTypeFile == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!schnüffeln: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //       }
  //     }
  //     const artikel1: "Dein" | "Deine" = sentBegleittierTypeFile.Gender == "F" ? "Deine" : "Dein";

  //     chatClient.say(channel, `@${user}, du hast bereits ein Tier, das für dich am Schnüffeln ist. ${artikel1} ${lastBegleittierBack.typ}${lastBegleittierBack.name != `` ? ` "${lastBegleittierBack.name}"` :``} ist um ${lastDateBack.getHours()}:${lastDateBack.getMinutes() <  10 ? `0${lastDateBack.getMinutes()}` : lastDateBack.getMinutes()} Uhr zurück.`);
  //     logger(`!schnüffeln: [${user}] already has Begleittier schnüffeling`);
  //     return;
  //   }

  //   //pick Begleittier
  //   let sentBegleittier: HuhnwartsBegleittierFile = pickRandom(availableBegleittiere);
    
  //   setTimeout(async(userId: number, user: string, sentBegleittier: HuhnwartsBegleittierFile) => {
  //     //userFile
  //     const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userId);
  //     //ERROR
  //     if(userFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tiersuche: ERROR! userFile`);
  //       return;
  //     }
  //     //null
  //     if(userFile == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!tiersuche: ERROR! userFile`);
  //       return;
  //     }
  //     //object/card
  //     let thing: foundThing = {"type": ObjectOrCard(), "id": 0, "name": "", "punkte": 0};
  //     if(thing.type == "Gegenstand") {
  //       //get objectIDs
  //       const objectIDs: number[] | false = await Huhnwarts2023Helper.getObjectIDs();
  //       //ERROR
  //       if(objectIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!schnüffeln: ERROR! objectIDs`);
  //         return;
  //       }
  
  //       //pick object
  //       thing.id = pickRandom(objectIDs);    
  
  //       //get object name
  //       const objectFile: HuhnwartsObjectFile | false = await Huhnwarts2023Helper.readObjectFileByID(thing.id);
  //       //ERROR
  //       if(objectFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!schnüffeln: ERROR! objectFile`);
  //         return;
  //       }
  //       thing.name = objectFile.Name;
  
  //       //fetch user object inventory
  //       const userObjectInventory: HuhnwartsObjectInventoryFile | false = await Huhnwarts2023Helper.readObjectInventoryFile(userId, thing.id);
  //       //ERROR
  //       if(userObjectInventory == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!schnüffeln: ERROR! userObjectInventory`);
  //         return;
  //       }
      
  //       //write new user object inventory
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] Anzahl BEFORE: ${userObjectInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] gefundene Anzahl BEFORE: ${userObjectInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] tauschbare Anzahl BEFORE: ${userObjectInventory.TauschbareAnzahl}`);
  //       userObjectInventory.Anzahl += 1;
  //       userObjectInventory.GefundeneAnzahl += 1;
  //       if(userObjectInventory.Anzahl > 1) userObjectInventory.TauschbareAnzahl += 1; //wenn das nicht das erste Objekt ist
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] Anzahl AFTER: ${userObjectInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] gefundene Anzahl AFTER: ${userObjectInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Objekt Nr. ${userObjectInventory.GegenstandID}] tauschbare Anzahl AFTER: ${userObjectInventory.TauschbareAnzahl}`);

  //       const writeObjectInventoryFile: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(userObjectInventory);
  //       //ERROR
  //       if(writeObjectInventoryFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!schnüffeln: ERROR! writeObjectInventoryFile`);
  //         return;
  //       }

  //       //thing.punkte
  //       if(userObjectInventory.Anzahl == 1) thing.punkte = 1;
  //     } else if(thing.type == "Karte") {
  
  //       //pick rarity
  //       let huhnwarts2023RaritiesList: number[] = []
  //       Object.keys(huhnwarts2023Rarities).forEach(rarity => {
  //         for(let i = 1; i <= huhnwarts2023Rarities[rarity]*10; i++) {
  //           huhnwarts2023RaritiesList.push(Number(rarity));
  //         }
  //       });
  //       const rarity: 1|2|3|4|5 = pickRandom(huhnwarts2023RaritiesList);
  
  //       //get sfkIDs
  //       const sfkIDs: number[] | false | null = await Huhnwarts2023Helper.getSfkIDs(0, rarity);
  //       //ERROR
  //       if(sfkIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!schnüffeln: ERROR! sfkIDs`);
  //         return;
  //       }
  
  //       //pick card
  //       if(sfkIDs == null) {
  //         //no cards of that rarity at this location
  //         const raritySfkIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByRarity(rarity);
  //         //ERROR
  //         if(raritySfkIDs == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!schnüffeln: ERROR! raritySfkIDs`);
  //           return;
  //         }
  //         thing.id = pickRandom(raritySfkIDs);
  //       } else {
  //         thing.id = pickRandom(sfkIDs);
  //       }
  
  //       //get card name
  //       const cardFile: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(thing.id);
  //       //ERROR
  //       if(cardFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!schnüffeln: ERROR! cardFile`);
  //         return;
  //       }
  //       thing.name = cardFile.Name;
  
  //       //card points
  //       thing.punkte =  huhnwarts2023rarityPoints[cardFile.seltenheit];
  
  //       //fetch user SFK inventory
  //       const userSfkInventory: HuhnwartsSfkInventoryFile | false = await Huhnwarts2023Helper.readSfkInventoryFile(userId, thing.id);
  //       //ERROR
  //       if(userSfkInventory == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!schnüffeln: ERROR! userSfkInventory`);
  //         return;
  //       }
      
  //       //write new user object inventory
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] Anzahl BEFORE: ${userSfkInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] gefundene Anzahl BEFORE: ${userSfkInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] tauschbare Anzahl BEFORE: ${userSfkInventory.TauschbareAnzahl}`);
  //       userSfkInventory.Anzahl += 1;
  //       userSfkInventory.GefundeneAnzahl += 1;
  //       if(userSfkInventory.Anzahl > 1) userSfkInventory.TauschbareAnzahl += 1; //wenn das nicht die erste Karte war
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] Anzahl AFTER: ${userSfkInventory.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] gefundene Anzahl AFTER: ${userSfkInventory.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: schnüffeln: user ${user} [Karte Nr. ${userSfkInventory.SchokofroschID}] tauschbare Anzahl AFTER: ${userSfkInventory.TauschbareAnzahl}`);

  //       //SFK points
  //       const cardPoints: number =  huhnwarts2023rarityPoints[cardFile.seltenheit];
  //       if(userSfkInventory.Anzahl == 1) {
  //         userFile.punkteSFK += cardPoints;
  //         thing.punkte = cardPoints;
  //       }

  //       const writeUserSfkInventory: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(userSfkInventory);
  //       //ERROR
  //       if(writeUserSfkInventory == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!schnüffeln: ERROR! writeUserSfkInventory`);
  //         return;
  //       }

  //       //write user file
  //       const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //       //ERROR
  //       if(writeUserFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!tiersuche: ERROR! writeUserFile [${user}]`);
  //         return;
  //       }
  //     }

  //     let sentBegleittierTypeFile: HuhnwartsBegleittierTypeFile | false | null = await Huhnwarts2023Helper.getBegleittierTypeByName(sentBegleittier.typ);
  //     //ERROR
  //     if(sentBegleittierTypeFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!schnüffeln: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //     }
  //     //type does not exist
  //     if(sentBegleittierTypeFile == null) {
  //       sentBegleittierTypeFile = await Huhnwarts2023Helper.getBonustierTypeByName(sentBegleittier.typ);
  //       //ERROR
  //       if(sentBegleittierTypeFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!schnüffeln: ERROR! sentBegleittierTypeFile [${user}]`);
  //         return;
  //       }
  //       //type does not exist | impossible
  //       if(sentBegleittierTypeFile == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!schnüffeln: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //       }
  //     }
  //     const artikel1: "dein" | "deine" = sentBegleittierTypeFile.Gender == "F" ? "deine" : "dein";
    
  //     //say in chat
  //     chatClient.say(channel, `@${user}, ${artikel1} ${sentBegleittier.typ}${sentBegleittier.name != `` ? ` "${sentBegleittier.name}"` : ``} erschnüffelt ${thing.type == "Gegenstand" ? `diesen Gegenstand: ${thing.name} [${thing.punkte == 0 ? "doppelt" : `+${thing.punkte}`}]` : `diese Karte: ${thing.name} [${thing.punkte == 0 ? "doppelt" : `+${thing.punkte}`}]`}.`); 
  //     logger(`!schnüffeln: [${user}] ${thing.name} [${thing.type}]`);
      
  //     //check for SFK achievements//
  //     if(thing.type == "Karte") await huhnwarts2023checkSfkAchievements(userId, user); 

  //     //check for object achievements//
  //     if(thing.type == "Gegenstand") await huhnwarts2023checkObjectAchievements(userId, user);
  //   }, 10*60*1000, userId, user, sentBegleittier); // 10 min

  //   //send Begleittier//
  //   sentBegleittier.awayUntil = now + 30*60*1000;
  //   sentBegleittier.activity = "schnueffeln";
  //   userFile.countFutter -= 1;

  //   //write Begleittier file
  //   const writeBegleittierFile: boolean = await Huhnwarts2023Helper.writeBegleittierFile(sentBegleittier);
  //   //ERROR
  //   if(writeBegleittierFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!schnüffeln: ERROR! writeBegleittierFile [${user}]`);
  //     return;
  //   }

  //   //write user file
  //   const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeUserFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!schnüffeln: ERROR! writeUserFile [${user}]`);
  //     return;
  //   }

  //   let sentBegleittierTypeFile: HuhnwartsBegleittierTypeFile | false | null = await Huhnwarts2023Helper.getBegleittierTypeByName(sentBegleittier.typ);
  //   //ERROR
  //   if(sentBegleittierTypeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!tiersuche: ERROR! sentBegleittierTypeFile [${user}]`);
  //     return;
  //   }
  //   //type does not exist
  //   if(sentBegleittierTypeFile == null) {
  //     sentBegleittierTypeFile = await Huhnwarts2023Helper.getBonustierTypeByName(sentBegleittier.typ);
  //     //ERROR
  //     if(sentBegleittierTypeFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!schnüffeln: ERROR! sentBegleittierTypeFile [${user}]`);
  //       return;
  //     }
  //     //type does not exist | impossible
  //     if(sentBegleittierTypeFile == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!schnüffeln: ERROR! sentBegleittierTypeFile [${user}]`);
  //     return;
  //     }
  //   }
  //   const artikel1: "dein" | "deine" | "deinen" = sentBegleittierTypeFile.Gender == "M" ? "deinen" : sentBegleittierTypeFile.Gender == "F" ? "deine" : "dein";
  //   const artikel2: "er" | "sie" | "es" = sentBegleittierTypeFile.Gender == "M" ? "er" : sentBegleittierTypeFile.Gender == "F" ? "sie" : "es";

  //   //announce in chat//
  //   chatClient.say(channel, `@${user}, du sendest ${artikel1} ${sentBegleittier.typ}${sentBegleittier.name != `` ? ` "${sentBegleittier.name}"` : ``} los zum Schnüffeln. Was ${artikel2} wohl finden wird...?`);
  //   logger(`!schnüffeln: [${user}] sends ${sentBegleittier.name} [${sentBegleittier.typ}]`);  
  // });

  // //!futter
  // commandHandler.addCommand("futter", true, 0, 0, async ({channel, user, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!futter: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //user does not exist
  //   if(userFile == null) {
  //     chatClient.say(channel, `@${user}, du musst zuerst einem Haus beitreten, bevor du das tun kannst.`);
  //     logger(`!futter: no user file [${user}]`);
  //     return;
  //   }

  //   chatClient.say(channel, `@${user}, du hast derzeit ${userFile.countFutter} Futter.`);
  //   logger(`!futter: [${user}]`);
  // });
  // //#endregion Begleittiere
 
  // //#region Duell
  // commandHandler.addCommand(["duell", "duel"], true, 0, 0, async ({channel, user, args, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!duell: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //user does not exist
  //   if(userFile == null) {
  //     chatClient.say(channel, `@${user}, du musst zuerst einem Haus beitreten.`);
  //     logger(`!duell: user does not exist [${user}]`);
  //     return;
  //   }

  //   //no arguments
  //   if(args.length == 0) {
  //     chatClient.say(channel, `@${user}, bitte gib eine andere Person an, mit welcher du dich duellieren möchtest. [!duell @user]`);
  //     logger(`!duell: no thing`);
  //     return;
  //   }
    
  //   //no recognisable target
  //   if(!args[0].startsWith("@")) {
  //     chatClient.say(channel, `@${user}, bitte gib eine andere Person an, mit welcher du dich duellieren möchtest. [!duell @user]`);
  //     logger(`!duell: no thing`);
  //     return;
  //   }

  //   //select target//
  //   const targetUser: string = args[0].slice(1);
  //   //check if target is online
  //   let chatters: string[] = [];
    
  //   let chattersSet: Set<string> | undefined = await chatterList.getChattersSet()
  //   //make list
  //   chatters = Array.from(chattersSet);

  //   //user not in chat
  //   if(!chatters.includes(targetUser.toLowerCase())) {
  //     chatClient.say(channel, `@${user}, ${targetUser} scheint nicht im Chat zu sein. (Twitch updatet die Chatterliste sehr langsam, versuche es in einer Minute nochmal.)`);
  //     logger(`!duell: [${user}] target ${targetUser} not online`);
  //     return;
  //   }

  //   //targetID
  //   const targetIDHelix: HelixUser | null = await apiClient.users.getUserByName(targetUser.toLowerCase());
  //   //ERROR ~ user does not exist | not possible
  //   if(targetIDHelix == null) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!duell: ERROR! targetIDHelix`);
  //     return;
  //   }
  //   const targetID: number = Number(targetIDHelix.id);

  //   //get target file
  //   let targetFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(targetID);
  //   if(targetFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!duell: ERROR! targetFile`);
  //     return;
  //   }

  //   //target not valid
  //   if(targetFile == null || targetFile.HausID == 0) {
  //     chatClient.say(channel, `@${user}, ${targetUser} ist noch keinem Haus beigetreten.`);
  //     logger(`!duell: target has no house`);
  //     return;
  //   }

  //   const readUserDuellFiles: HuhnwartsDuellFile[] | false | null = await Huhnwarts2023Helper.readUserDuellFiles(userId);
  //   //ERROR
  //   if(readUserDuellFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!duell: ERROR! readUserDuellFiles`);
  //     return;
  //   }

  //   //has duel files
  //   if(readUserDuellFiles != null) {
  //     //get matching duel file
  //     const duelFile: HuhnwartsDuellFile | undefined = readUserDuellFiles.find(duelFile => 
  //       duelFile.user1ID == targetID || duelFile.user2ID == targetID
  //     );

  //     //file exists
  //     if(duelFile != undefined) {
  //       //user has already initialized this duel
  //       if(duelFile.user1ID == userId) {
  //         chatClient.say(channel, `@${user}, du hast dieses Duel bereits angeboten.`);
  //         logger(`!duell: [${user}] already initialized with ${targetUser}`);
  //         return;
  //       } else {
  //         //accepting a duel
  //         //pick winner
  //         const winnerID: number = pickRandom([duelFile.user1ID, duelFile.user2ID]);
  //         const loserID: number = winnerID == userId ? targetID : userId;

  //         //track wins/losses
  //         if(winnerID == userId) {
  //           userFile.duelleGewonnen += 1;
  //           targetFile.duelleVerloren += 1;
  //         } else {
  //           userFile.duelleVerloren += 1;
  //           targetFile.duelleGewonnen += 1;
  //         }

  //         //save win/loss
  //         const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //         //ERROR
  //         if(writeUserFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!duell: ERROR! writeUserFile`);
  //           return;
  //         }

  //         const writeTargetFile: boolean = await Huhnwarts2023Helper.writeUserFile(targetFile);
  //         //ERROR
  //         if(writeTargetFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!duell: ERROR! writeTargetFile`);
  //           return;
  //         }

  //         //select thing to transfer//
  //         //get loser object files
  //         const loserObjectFiles: HuhnwartsObjectInventoryFile[] | false | null = await Huhnwarts2023Helper.readObjectInventoryFilesByUserID(loserID);
  //         //ERROR
  //         if(loserObjectFiles == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!duell: ERROR! loserObjectFiles`);
  //           return;
  //         }
  //         //get loser Sfk files
  //         const loserSfkFiles: HuhnwartsSfkInventoryFile[] | false | null = await Huhnwarts2023Helper.readSfkInventoryFilesByUserID(loserID);
  //         //ERROR
  //         if(loserSfkFiles == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!duell: ERROR! loserSfkFiles`);
  //           return;
  //         }

  //         //loser has things
  //         if(loserObjectFiles != null || loserSfkFiles != null) {
  //           let allLoserThings: Array<HuhnwartsObjectInventoryFile | HuhnwartsSfkInventoryFile> = [];
  //           if(loserObjectFiles != null) allLoserThings = allLoserThings.concat(loserObjectFiles);
  //           if(loserSfkFiles != null) allLoserThings = allLoserThings.concat(loserSfkFiles);

  //           //pick thing
  //           let loserLostThing: HuhnwartsObjectInventoryFile | HuhnwartsSfkInventoryFile = pickRandom(allLoserThings);

  //           //transfer thing
  //           function isHuhnwartsObjectInventoryFile(thing : HuhnwartsObjectInventoryFile | HuhnwartsSfkInventoryFile): thing is HuhnwartsObjectInventoryFile{
  //             return (thing as HuhnwartsObjectInventoryFile).GegenstandID !== undefined;
  //           }

  //           if(isHuhnwartsObjectInventoryFile(loserLostThing)) {
  //             //thing is an object
  //             //pick one of the owned objects, if multiple owned
  //             let ownedObjects: Array<"gefunden" | "getauscht"> = [];
  //             for(let i = 1; i <= loserLostThing.GefundeneAnzahl; i++) {
  //               ownedObjects.push("gefunden");
  //             }
  //             for(let i = 1; i <= loserLostThing.Anzahl - loserLostThing.GefundeneAnzahl; i++) {
  //               ownedObjects.push("getauscht");
  //             }
  //             const loserLostThingOwnership: "gefunden" | "getauscht" = pickRandom(ownedObjects);

  //             //transfer object//
  //             const winnerObjectInventoryFile: HuhnwartsObjectInventoryFile | false = await Huhnwarts2023Helper.readObjectInventoryFile(winnerID, loserLostThing.GegenstandID);
  //             //ERROR
  //             if(winnerObjectInventoryFile == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`!duell: ERROR! winnerObjectInventoryFile`);
  //               return;
  //             }
              
  //             //take from loser | delete file if necessary
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Objekt Nr. ${loserLostThing.GegenstandID}] Anzahl BEFORE: ${loserLostThing.Anzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Objekt Nr. ${loserLostThing.GegenstandID}] gefundene Anzahl BEFORE: ${loserLostThing.GefundeneAnzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Objekt Nr. ${loserLostThing.GegenstandID}] tauschbare Anzahl BEFORE: ${loserLostThing.TauschbareAnzahl}`);
  //             loserLostThing.Anzahl -= 1;
  //             if(loserLostThingOwnership == "gefunden") {
  //               loserLostThing.GefundeneAnzahl -= 1;
  //               if(loserLostThing.TauschbareAnzahl > 0) loserLostThing.TauschbareAnzahl -= 1; //wenn es tauschbare Objekte gab
  //             } else {
  //               if(loserLostThing.Anzahl == loserLostThing.GefundeneAnzahl && loserLostThing.TauschbareAnzahl != 0) loserLostThing.TauschbareAnzahl -= 1; //wenn nur noch gefundene Objekte übrig sind und es nicht das letzte war
  //             }
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Objekt Nr. ${loserLostThing.GegenstandID}] Anzahl AFTER: ${loserLostThing.Anzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Objekt Nr. ${loserLostThing.GegenstandID}] gefundene Anzahl AFTER: ${loserLostThing.GefundeneAnzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Objekt Nr. ${loserLostThing.GegenstandID}] tauschbare Anzahl AFTER: ${loserLostThing.TauschbareAnzahl}`);
  //             if(loserLostThing.Anzahl == 0) {
  //               //delete
  //               const deleteObjectInventoryFile: boolean = await Huhnwarts2023Helper.deleteObjectInventoryFile(loserLostThing);
  //               //ERROR
  //               if(deleteObjectInventoryFile == false) {
  //                 chatClient.say(channel, `something went wrong...`);
  //                 logger(`!duell: ERROR! deleteObjectInventoryFile`);
  //                 return;
  //               }
  //               ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //               logger(`BUG-LOGGING: duell: deleted loser ${loserID} objectFile`);
  //             }

  //             //give winner
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Objekt Nr. ${winnerObjectInventoryFile.GegenstandID}] Anzahl BEFORE: ${winnerObjectInventoryFile.Anzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Objekt Nr. ${loserLostThing.GegenstandID}] gefundene Anzahl BEFORE: ${loserLostThing.GefundeneAnzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Objekt Nr. ${loserLostThing.GegenstandID}] tauschbare Anzahl BEFORE: ${loserLostThing.TauschbareAnzahl}`);
  //             winnerObjectInventoryFile.Anzahl += 1;
  //             winnerObjectInventoryFile.TauschbareAnzahl = winnerObjectInventoryFile.GefundeneAnzahl; //da keine von den gefundenen mehr behalten werden muss
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Objekt Nr. ${winnerObjectInventoryFile.GegenstandID}] Anzahl AFTER: ${winnerObjectInventoryFile.Anzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Objekt Nr. ${loserLostThing.GegenstandID}] gefundene Anzahl AFTER: ${loserLostThing.GefundeneAnzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Objekt Nr. ${loserLostThing.GegenstandID}] tauschbare Anzahl AFTER: ${loserLostThing.TauschbareAnzahl}`);

  //             //write loser inventory file
  //             if(loserLostThing.Anzahl != 0) {
  //               const writeLoserObjectInventoryFile: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(loserLostThing);
  //               //ERROR
  //               if(writeLoserObjectInventoryFile == false) {
  //                 chatClient.say(channel, `something went wrong...`);
  //                 logger(`!duell: ERROR! writeLoserObjectInventoryFile`);
  //                 return;
  //               }
  //             } else {
  //               //loser lost last object
  //               //delete inventory file
  //               const deleteObjectInventoryFile: boolean = await Huhnwarts2023Helper.deleteObjectInventoryFile(loserLostThing);
  //               //ERROR
  //               if(deleteObjectInventoryFile == false) {
  //                 chatClient.say(channel, `something went wrong...`);
  //                 logger(`!duell: ERROR! deleteObjectInventoryFile`);
  //                 return;
  //               }
  //             }

  //             //write winner inventory file
  //             const writeWinnerObjectInventoryFile: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(winnerObjectInventoryFile);
  //             //ERROR
  //             if(writeWinnerObjectInventoryFile == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`!duell: ERROR! writeWinnerObjectInventoryFile`);
  //               return;
  //             }

  //             //get object name
  //             const readObjectFileByID: HuhnwartsObjectFile | false = await Huhnwarts2023Helper.readObjectFileByID(loserLostThing.GegenstandID);
  //             //ERROR
  //             if(readObjectFileByID == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`rndPeeves: ERROR! readObjectFileByID`);
  //               return;
  //             }

  //             //delete duel file
  //             const deleteDuellFile: [boolean, number] = await Huhnwarts2023Helper.deleteDuellFile(duelFile.user1ID, duelFile.user2ID);
  //             //ERROR
  //             if(deleteDuellFile[0] == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`!duell: ERROR! deleteDuellFile`);
  //               return;
  //             }
  
  //             //say in chat
  //             chatClient.action(channel, `@${user} nimmt das Duell mit @${targetUser} an. Und es gewinnt... @${winnerID == userId ? user : targetUser}! xicanmHyped ${winnerID == userId ? user : targetUser} erhält diesen Gegenstand: ${readObjectFileByID.Name}`);
  //             logger(`!duell: [${winnerID == userId ? user : targetUser}] gewinnt das Duell mit [${loserID == userId ? user : targetUser}] (object)`);

  //             //check object achievements
  //             await huhnwarts2023checkObjectAchievements(winnerID, winnerID == userId ? userFile.name : targetFile.name);
  //           } else {
  //             //thing is a card
  //             //pick one of the ownedcards, if multiple owned
  //             let ownedCards: Array<"gefunden" | "getauscht"> = [];
  //             for(let i = 1; i <= loserLostThing.TauschbareAnzahl; i++) {
  //               ownedCards.push("gefunden");
  //             }
  //             for(let i = 1; i <= loserLostThing.Anzahl - loserLostThing.TauschbareAnzahl; i++) {
  //               ownedCards.push("getauscht");
  //             }

  //             const loserLostThingOwnership: "gefunden" | "getauscht" = pickRandom(ownedCards);

  //             //transfer card//
  //             const winnerSfkInventoryFile: HuhnwartsSfkInventoryFile | false = await Huhnwarts2023Helper.readSfkInventoryFile(winnerID, loserLostThing.SchokofroschID);
  //             //ERROR
  //             if(winnerSfkInventoryFile == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`!duell: ERROR! winnerSfkInventoryFile`);
  //               return;
  //             }
              
  //             //take from loser | delete file if necessary
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Karte Nr. ${loserLostThing.SchokofroschID}] Anzahl BEFORE: ${loserLostThing.Anzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Karte Nr. ${loserLostThing.SchokofroschID}] gefundene Anzahl BEFORE: ${loserLostThing.GefundeneAnzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Karte Nr. ${loserLostThing.SchokofroschID}] tauschbare Anzahl BEFORE: ${loserLostThing.TauschbareAnzahl}`);
  //             loserLostThing.Anzahl -= 1;
  //             if(loserLostThingOwnership == "gefunden") {
  //               loserLostThing.GefundeneAnzahl -= 1;
  //               if(loserLostThing.TauschbareAnzahl > 0) loserLostThing.TauschbareAnzahl -= 1; //wenn es tauschbare Karten gab
  //             } else {
  //               if(loserLostThing.Anzahl == loserLostThing.GefundeneAnzahl && loserLostThing.TauschbareAnzahl != 0) loserLostThing.TauschbareAnzahl -= 1; //wenn nur noch gefundene Karten übrig sind und es nicht die letzte war
  //             }
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Karte Nr. ${loserLostThing.SchokofroschID}] Anzahl AFTER: ${loserLostThing.Anzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Karte Nr. ${loserLostThing.SchokofroschID}] gefundene Anzahl AFTER: ${loserLostThing.GefundeneAnzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: loser ${loserID} [Karte Nr. ${loserLostThing.SchokofroschID}] tauschbare Anzahl AFTER: ${loserLostThing.TauschbareAnzahl}`);
  //             if(loserLostThing.Anzahl == 0) {
  //               //delete
  //               const deleteSfkInventoryFile: boolean = await Huhnwarts2023Helper.deleteSfkInventoryFile(loserLostThing);
  //               //ERROR
  //               if(deleteSfkInventoryFile == false) {
  //                 chatClient.say(channel, `something went wrong...`);
  //                 logger(`!duell: ERROR! deleteSfkInventoryFile`);
  //                 return;
  //               }
  //               ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //               logger(`BUG-LOGGING: duell: deleted loser ${loserID} kartenFile`);
  //             }

  //             //give winner
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] Anzahl BEFORE: ${winnerSfkInventoryFile.Anzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] gefundene Anzahl BEFORE: ${winnerSfkInventoryFile.GefundeneAnzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] tauschbare Anzahl BEFORE: ${winnerSfkInventoryFile.TauschbareAnzahl}`);
  //             winnerSfkInventoryFile.Anzahl += 1;
  //             winnerSfkInventoryFile.TauschbareAnzahl = winnerSfkInventoryFile.GefundeneAnzahl; //da keine von den gefundenen mehr behalten werden muss
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] Anzahl AFTER: ${winnerSfkInventoryFile.Anzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] gefundene Anzahl AFTER: ${winnerSfkInventoryFile.GefundeneAnzahl}`);
  //             ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //             logger(`BUG-LOGGING: duell: winner ${winnerID} [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] tauschbare Anzahl AFTER: ${winnerSfkInventoryFile.TauschbareAnzahl}`);

  //             //write loser inventory file
  //             if(loserLostThing.Anzahl != 0) {
  //               const writeLoserSfkInventoryFile: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(loserLostThing);
  //               //ERROR
  //               if(writeLoserSfkInventoryFile == false) {
  //                 chatClient.say(channel, `something went wrong...`);
  //                 logger(`!duell: ERROR! writeLoserSfkInventoryFile`);
  //                 return;
  //               }
  //             }

  //             //write winner inventory file
  //             const writeWinnerSfkInventoryFile: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(winnerSfkInventoryFile);
  //             //ERROR
  //             if(writeWinnerSfkInventoryFile == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`!duell: ERROR! writeWinnerSfkInventoryFile`);
  //               return;
  //             }

  //             //card points//
  //             //get card file
  //             const readSfkFileByID: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(loserLostThing.SchokofroschID);
  //             //ERROR
  //             if(readSfkFileByID == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`rndPeeves: ERROR! readSfkFileByID`);
  //               return;
  //             }

  //             //winner won new card
  //             if(winnerSfkInventoryFile.Anzahl == 1) {
  //               if(winnerID == userId) {
  //                 //user won
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${userId} hat die erste [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] gewonnen. SFK Punkte BEFORE: ${userFile.punkteSFK}`);
  //                 userFile.punkteSFK += huhnwarts2023rarityPoints[readSfkFileByID.seltenheit];
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${userId} hat die erste [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] gewonnen. SFK Punkte AFTER: ${userFile.punkteSFK}`);
  //                 const writeWinnerFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //                 //ERROR
  //                 if(writeWinnerFile == false) {
  //                   chatClient.say(channel, `something went wrong...`);
  //                   logger(`!duell: ERROR! writeWinnerFile`);
  //                   return;
  //                 }
  //               } else {
  //                 //target won
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${targetID} hat die erste [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] gewonnen. SFK Punkte BEFORE: ${targetFile.punkteSFK}`);
  //                 targetFile.punkteSFK += huhnwarts2023rarityPoints[readSfkFileByID.seltenheit];
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${targetID} hat die erste [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] gewonnen. SFK Punkte AFTER: ${targetFile.punkteSFK}`);
  //                 const writeWinnerFile: boolean = await Huhnwarts2023Helper.writeUserFile(targetFile);
  //                 //ERROR
  //                 if(writeWinnerFile == false) {
  //                   chatClient.say(channel, `something went wrong...`);
  //                   logger(`!duell: ERROR! writeWinnerFile`);
  //                   return;
  //                 }
  //               }
  //             } else {
  //               if(winnerID == userId) {
  //                 //user won
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${userId} hat erneut die [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] gewonnen. SFK Punkte: ${userFile.punkteSFK}`);
  //               } else {
  //                 //target won
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${targetID} hat erneut die [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] gewonnen. SFK Punkte: ${userFile.punkteSFK}`);
  //               }
  //             }

  //             //loser lost last card
  //             if(loserLostThing.Anzahl == 0) {
  //               if(loserID == userId) {
  //                 //user lost
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${userId} hat die letzte [Karte Nr. ${loserLostThing.SchokofroschID}] verloren. SFK Punkte BEFORE: ${userFile.punkteSFK}`);
  //                 userFile.punkteSFK -= huhnwarts2023rarityPoints[readSfkFileByID.seltenheit];
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${userId} hat die letzte [Karte Nr. ${loserLostThing.SchokofroschID}] verloren. SFK Punkte AFTER: ${userFile.punkteSFK}`);
  //                 const writeLoserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //                 //ERROR
  //                 if(writeLoserFile == false) {
  //                   chatClient.say(channel, `something went wrong...`);
  //                   logger(`!duell: ERROR! writeLoserFile`);
  //                   return;
  //                 }

  //                 //delete inventory file
  //                 const deleteSfkInventoryFile: boolean = await Huhnwarts2023Helper.deleteSfkInventoryFile(loserLostThing);
  //                 //ERROR
  //                 if(deleteSfkInventoryFile == false) {
  //                   chatClient.say(channel, `something went wrong...`);
  //                   logger(`!duell: ERROR! deleteSfkInventoryFile`);
  //                   return;
  //                 }
  //               } else {
  //                 //target lost
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${targetID} hat die letzte [Karte Nr. ${loserLostThing.SchokofroschID}] verloren. SFK Punkte BEFORE: ${targetFile.punkteSFK}`);
  //                 targetFile.punkteSFK -= huhnwarts2023rarityPoints[readSfkFileByID.seltenheit];
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${targetID} hat die letzte [Karte Nr. ${loserLostThing.SchokofroschID}] verloren. SFK Punkte AFTER: ${targetFile.punkteSFK}`);
  //                 const writeLoserFile: boolean = await Huhnwarts2023Helper.writeUserFile(targetFile);
  //                 //ERROR
  //                 if(writeLoserFile == false) {
  //                   chatClient.say(channel, `something went wrong...`);
  //                   logger(`!duell: ERROR! writeLoserFile`);
  //                   return;
  //                 }

  //                 //delete inventory file
  //                 const deleteSfkInventoryFile: boolean = await Huhnwarts2023Helper.deleteSfkInventoryFile(loserLostThing);
  //                 //ERROR
  //                 if(deleteSfkInventoryFile == false) {
  //                   chatClient.say(channel, `something went wrong...`);
  //                   logger(`!duell: ERROR! deleteSfkInventoryFile`);
  //                   return;
  //                 }
  //               }
  //             } else {
  //               if(loserID == userId) {
  //                 //user lost
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${userId} hat eine von mehreren [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] verloren. SFK Punkte: ${userFile.punkteSFK}`);
  //               } else {
  //                 //target lost
  //                 ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //                 logger(`BUG-LOGGING: duell: user ${targetID} hat eine von mehreren [Karte Nr. ${winnerSfkInventoryFile.SchokofroschID}] verloren. SFK Punkte: ${userFile.punkteSFK}`);
  //               }
  //             }

  //             //delete duel file
  //             const deleteDuellFile: [boolean, number] = await Huhnwarts2023Helper.deleteDuellFile(duelFile.user1ID, duelFile.user2ID);
  //             //ERROR
  //             if(deleteDuellFile[0] == false) {
  //               chatClient.say(channel, `something went wrong...`);
  //               logger(`!duell: ERROR! deleteDuellFile`);
  //               return;
  //             }
  
  //             //say in chat
  //             chatClient.action(channel, `@${user} nimmt das Duell mit @${targetUser} an. Und es gewinnt... @${winnerID == userId ? user : targetUser}! xicanmHyped ${winnerID == userId ? user : targetUser} erhält diese Karte: ${readSfkFileByID.Name}`);
  //             logger(`!duell: [${winnerID == userId ? user : targetUser}] gewinnt das Duell mit [${loserID == userId ? user : targetUser}] (card)`);

  //             //check card achievements
  //             await huhnwarts2023checkSfkAchievements(winnerID, winnerID == userId ? userFile.name : targetFile.name);
  //           }
  //         } else {
  //           //loser has nothing
  //           //delete duel file
  //           const deleteDuellFile: [boolean, number] = await Huhnwarts2023Helper.deleteDuellFile(duelFile.user1ID, duelFile.user2ID);
  //           //ERROR
  //           if(deleteDuellFile[0] == false) {
  //             chatClient.say(channel, `something went wrong...`);
  //             logger(`!duell: ERROR! deleteDuellFile`);
  //             return;
  //           }

  //           //say in chat
  //           chatClient.action(channel, `@${user} nimmt das Duell mit @${targetUser} an. Und es gewinnt... @${winnerID == userId ? user : targetUser}! xicanmHyped Leider hat ${loserID == userId ? user : targetUser} keine Dinge im Inventar...`);
  //           logger(`!duell: [${winnerID == userId ? user : targetUser}] gewinnt das Duell mit [${loserID == userId ? user : targetUser}] (no winnings)`);
  //         }
  //         //check duell achievements
  //         await huhnwarts2023checkDuellAchievements(userId, user);
  //         await huhnwarts2023checkDuellAchievements(targetID, targetUser);
  //         return;
  //       }
  //     } else {
  //       //new duel | further down
  //     }
  //   }

  //   //new duel
  //   const writeDuelFile: boolean = await Huhnwarts2023Helper.writeDuellFile(userId, targetID);
  //   //ERROR
  //   if(writeDuelFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!duell: ERROR! writeDuelFile`);
  //     return;
  //   }

  //   //say in chat
  //   chatClient.action(channel, `@${user} fordert @${targetUser} zu einem Duell heraus. ${targetUser}, du hast 30 Sekunden zeit um das Duell mit "!duell @${user}" anzunehmen. Wenn du dich nicht duellieren willst, musst du nichts machen.`);
  //   logger(`!duell: new duel [${user}] with [${targetUser}]`);

  //   setTimeout(async (userId: number, targetID: number) => {
  //     //delete duel file
  //     const deleteDuellFile: [boolean, number] = await Huhnwarts2023Helper.deleteDuellFile(userId, targetID);
  //     //ERROR
  //     if(deleteDuellFile[0] == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!duell: ERROR! deleteDuellFile`);
  //       return;
  //     }
  //     if(deleteDuellFile[1] > 0) logger(`!duell: duel between [${userId}] and [${targetID}] has expired`);
  //     return;
  //   }, 30*1000, userId, targetID); //30 sec
  // });
  // //#endregion Duell

  // //#region Kristallkugel
  // commandHandler.addCommand("kristallkugel", true, 0, 0, async ({channel, user, args, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //check last kristallkugel use
  //   const userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!kristallkugel: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //new User
  //   if(userFile == null) {
  //     chatClient.say(channel, `@${user}, du musst zuerst einem Haus beitereten, bevor du das tun kannst.`);
  //     logger(`!kristallkugel: [${user}] no house`);
  //     return;
  //   }

  //   //user has already used today//
  //   const date: Date = new Date();
  //   const today: number = Number(date.getFullYear().toString().concat((date.getMonth()+1).toString(), date.getDate().toString()));
  //   if(userFile.lastTimestampKristallkugel == today) {
  //     chatClient.say(channel, `@${user}, du hast heute schon in die Kristallkugel geschaut. Versuche es morgen wieder.`);
  //     logger(`!kristallkugel: already searched [${user}]`);
  //     return;
  //   }

  //   //no args
  //   if(args.length == 0) {
  //     chatClient.say(channel, `@${user}, bitte gib einen Ort oder eine Karte an, welche:n du nachschlagen möchtest.`);
  //     logger(`!kristallkugel: [${user}] no args`);
  //     return;
  //   }

  //   //user can look up//
  //   const query: string = args.join(" ");

  //   //check if it's a place
  //   const placeFile: HuhnwartsOrteFile | false | null = await Huhnwarts2023Helper.readPlaceInfoByName(query);
  //   //ERROR
  //   if(placeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!kristallkugel: ERROR! placeFile [${user}]`);
  //     return;
  //   }

  //   if(placeFile != null) {
  //     //it's a valid place
  //     const placeCards: number[] | false | null = await Huhnwarts2023Helper.getSfkIDsByPlace(placeFile.OrtID);
  //     //ERROR
  //     if(placeCards == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!kristallkugel: ERROR! placeCards [${user}]`);
  //       return;
  //     }

  //     //no special cards here
  //     if(placeCards == null) {
  //       //write user file
  //       userFile.lastTimestampKristallkugel = today;
  //       const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //       //ERROR
  //       if(writeUserFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!kristallkugel: ERROR! writeUserFile [${user}]`);
  //         return;
  //       }

  //       //say in chat
  //       chatClient.say(channel, `@${user}, an diesem Ort kannst du keine Karten öfter finden.`);
  //       logger(`!kristallkugel: [${user}] (${placeFile.Name}) - no cards`);
  //       return;
  //     }
      
  //     //cards found
  //     let cards: string[] = [];
  //     for(const cardID of placeCards) {
  //       const cardFile: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(cardID);
  //       //ERROR
  //       if(cardFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!kristallkugel: ERROR! cardFile [${user}]`);
  //         return;
  //       }
  //       cards.push(`${cardFile.Name}: [ID: ${cardFile.KartenID}]`);
  //     }

  //     //write user file
  //     userFile.lastTimestampKristallkugel = today;
  //     const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //     //ERROR
  //     if(writeUserFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!kristallkugel: ERROR! writeUserFile [${user}]`);
  //       return;
  //     }

  //     //say in chat
  //     chatClient.say(channel, `@${user}, an diesem Ort gibt es diese ${cards.length == 1 ? "Karte" : "Karten"} zu finden: ${listMaker(cards, ", ", "")}`);
  //     logger(`!kristallkugel: [${user}] (${placeFile.Name}) - ${cards.length} cards`);
  //     return;
  //   } else {
  //     //check if it's a card
  //     const cardFile: HuhnwartsSchokofroschkartenFile | false | null = await Huhnwarts2023Helper.readSchokofroschkartenFileByName(query);
  //     //ERROR
  //     if(cardFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!kristallkugel: ERROR! cardFile [${user}]`);
  //       return;
  //     }

  //     if(cardFile != null) {
  //       //it's a valid card
  //       let cardPlaces: number[] = [];
  //       if(cardFile.bOrt1 != 0) cardPlaces.push(cardFile.bOrt1);
  //       if(cardFile.bOrt2 != 0) cardPlaces.push(cardFile.bOrt2);
  //       if(cardFile.bOrt3 != 0) cardPlaces.push(cardFile.bOrt3);
  //       if(cardFile.bOrt4 != 0) cardPlaces.push(cardFile.bOrt4);
  //       if(cardFile.bOrt5 != 0) cardPlaces.push(cardFile.bOrt5);
        
  //       //no special places
  //       if(cardPlaces.length == 0) {
  //         //write user file
  //         userFile.lastTimestampKristallkugel = today;
  //         const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //         //ERROR
  //         if(writeUserFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!kristallkugel: ERROR! writeUserFile [${user}]`);
  //           return;
  //         }
  
  //         //say in chat
  //         chatClient.say(channel, `@${user}, diese Karte kann an keinem Ort speziell gefunden werden.`);
  //         logger(`!kristallkugel: [${user}] (${cardFile.Name}) - no places`);
  //         return;
  //       }
      
  //       //locations found
  //       let locations: string[] = [];
  //       for(const ortID of cardPlaces) {
  //         const ortFile: HuhnwartsOrteFile | false | null = await Huhnwarts2023Helper.readPlaceInfoByID(ortID);
  //         //ERROR
  //         if(ortFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!kristallkugel: ERROR! ortFile [${user}]`);
  //           return;
  //         }
  //         //ortFile == null
  //         if(ortFile == null) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`!kristallkugel: ERROR! ortFile [${user}]`);
  //           return;
  //         }
  //         locations.push(`${ortFile.Name}: [ID: ${ortFile.OrtID}]`);
  //       }
  
  //       //write user file
  //       userFile.lastTimestampKristallkugel = today;
  //       const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //       //ERROR
  //       if(writeUserFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!kristallkugel: ERROR! writeUserFile [${user}]`);
  //         return;
  //       }
  
  //       //say in chat
  //       chatClient.say(channel, `@${user}, diese Karte kann an ${locations.length == 1 ? "folgendem Ort" : "folgenden Orten"} gefunden werden: ${listMaker(locations, ", ", "")}`);
  //       logger(`!kristallkugel: [${user}] (${cardFile.Name}) - ${locations.length} locations`);
  //       return;
  //     } else {
  //       //not a valid query
  //       chatClient.say(channel, `@${user}, "${query}" scheint keinem Ort oder Karte zu entsprechen. Bitte überprüfe deine Schreibweise.`);
  //       logger(`!kristallkugel: [${user}] "${query}" - not a thing`);
  //       return;
  //     }
  //   }




  // });

  // //#endregion Kristallkugel

  // //#region Bohnen
  // const bohnenPeevesEvent = async (user: string, userID: number, userFile: HuhnwartsUserFile): Promise<"Geisterschutz" | [string, number, string] | false | null> => {
  //   const now: number = Date.now();
    
  //   ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //   logger(`BUG-LOGGING: bohnenPeeves: ${userFile.name}.geisterschutz = ${userFile.geisterschutz}`);

  //   //check for Geisterschutz//
  //   if(userFile.geisterschutz == true) {
  //     userFile.geisterschutz = false;

  //     const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //     //ERROR
  //     if(writeUserFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`bohnenPeeves: ERROR! writeUserFile`);
  //       return false;
  //     }
  //     ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //     logger(`BUG-LOGGING: bohnenPeeves: ${userFile.name}.geisterschutz CONSUMED: ${userFile.name}.geisterschutz = ${userFile.geisterschutz}`);
  //     logger(`bohnenPeeves: Geisterschutz [${userFile.name}]`);
  //     return "Geisterschutz";
  //   }
  //   ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //   logger(`BUG-LOGGING: bohnenPeeves: ${userFile.name}.geisterschutz NOT CONSUMED: ${userFile.name}.geisterschutz = ${userFile.geisterschutz}`);
    
  //   //get user inventory files//
  //   //get user object files
  //   const userObjectFiles: HuhnwartsObjectInventoryFile[] | false | null = await Huhnwarts2023Helper.readObjectInventoryFilesByUserID(userID);
  //   //ERROR
  //   if(userObjectFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`bohnenPeeves: ERROR! userObjectFiles`);
  //     return false;
  //   }

  //   //get user Sfk files
  //   const userSfkFiles: HuhnwartsSfkInventoryFile[] | false | null = await Huhnwarts2023Helper.readSfkInventoryFilesByUserID(userID);
  //   //ERROR
  //   if(userSfkFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`bohnenPeeves: ERROR! userSfkFiles`);
  //     return false;
  //   }

  //   //user has things
  //   if(userObjectFiles != null || userSfkFiles != null) {
  //     let allThings: Array<HuhnwartsObjectInventoryFile | HuhnwartsSfkInventoryFile> = [];
  //     if(userObjectFiles != null) allThings = allThings.concat(userObjectFiles);
  //     if(userSfkFiles != null) allThings = allThings.concat(userSfkFiles);

  //     //pick thing
  //     const stolenThing: HuhnwartsObjectInventoryFile | HuhnwartsSfkInventoryFile = pickRandom(allThings);

  //     //transfer thing
  //     function isHuhnwartsObjectInventoryFile(thing : HuhnwartsObjectInventoryFile | HuhnwartsSfkInventoryFile): thing is HuhnwartsObjectInventoryFile{
  //       return (thing as HuhnwartsObjectInventoryFile).GegenstandID !== undefined;
  //     }

  //     if(isHuhnwartsObjectInventoryFile(stolenThing)) {
  //       //thing is an object
  //       //pick one of the owned objects, if multiple owned
  //       let ownedObjects: Array<"tauschbar" | "getauscht"> = [];
  //       for(let i = 1; i <= stolenThing.TauschbareAnzahl; i++) {
  //         ownedObjects.push("tauschbar");
  //       }
  //       for(let i = 1; i <= stolenThing.Anzahl - stolenThing.TauschbareAnzahl; i++) {
  //         ownedObjects.push("getauscht");
  //       }

  //       const stolenThingGefunden: boolean = pickRandom([true, false]);

  //       //transfer object
  //       let peevesFile: HuhnwartsPeevesInventoryFile = {
  //         UserID: userID,
  //         ThingID: stolenThing.GegenstandID,
  //         ThingType: "Gegenstand",
  //         timestampFound: now,
  //         canFilch: false,
  //         wasTraded: false
  //       }
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] Anzahl BEFORE: ${stolenThing.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] gefundene Anzahl BEFORE: ${stolenThing.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] tauschbare Anzahl BEFORE: ${stolenThing.TauschbareAnzahl}`);
  //       if(stolenThingGefunden == true) {
  //         stolenThing.Anzahl -= 1;
  //         stolenThing.GefundeneAnzahl -= 1;
  //         if(stolenThing.TauschbareAnzahl > 0) stolenThing.TauschbareAnzahl -= 1; //wenn es tauschbare Objekte gab            
  //       } else {
  //         stolenThing.Anzahl -= 1;
  //         if((stolenThing.Anzahl == stolenThing.GefundeneAnzahl) && stolenThing.TauschbareAnzahl != 0) stolenThing.TauschbareAnzahl -= 1; //wenn nur noch gefundene Objekte übrig sind und es nicht das letzte war
  //         peevesFile.wasTraded = true;
  //       }
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] Anzahl AFTER: ${stolenThing.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] gefundene AFTER BEFORE: ${stolenThing.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Objekt Nr. ${stolenThing.GegenstandID}] tauschbare AFTER BEFORE: ${stolenThing.TauschbareAnzahl}`);

  //       //write/delte userObjectInventoryFile
  //       if(stolenThing.Anzahl == 0) {
  //         //delete
  //         const deleteObjectInventoryFile: boolean = await Huhnwarts2023Helper.deleteObjectInventoryFile(stolenThing);
  //         //ERROR
  //         if(deleteObjectInventoryFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`bohnenPeeves: ERROR! deleteObjectInventoryFile`);
  //           return false;
  //         }
  //       } else {
  //         const writeObjectInventoryFile: boolean = await Huhnwarts2023Helper.writeObjectInventoryFile(stolenThing);
  //         //ERROR
  //         if(writeObjectInventoryFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`bohnenPeeves: ERROR! writeObjectInventoryFile`);
  //           return false;
  //         }
  //       }

  //       //write peevesInventoryFile
  //       const writePeevesInventoryFile: boolean = await Huhnwarts2023Helper.writePeevesInventoryFile(peevesFile);
  //       //ERROR
  //       if(writePeevesInventoryFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`bohnenPeeves: ERROR! writePeevesInventoryFile`);
  //         return false;
  //       }

  //       //get object name
  //       const readObjectFileByID: HuhnwartsObjectFile | false = await Huhnwarts2023Helper.readObjectFileByID(stolenThing.GegenstandID);
  //       //ERROR
  //       if(readObjectFileByID == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`bohnenPeeves: ERROR! readObjectFileByID`);
  //         return false;
  //       }
  //       return ["Objekt", stolenThing.GegenstandID, readObjectFileByID.Name];
  //     } else {
  //       //thing is a card
  //       //pick one of the ownedcards, if multiple owned
  //       let ownedCards: Array<"tauschbar" | "getauscht"> = [];
  //       for(let i = 1; i <= stolenThing.TauschbareAnzahl; i++) {
  //         ownedCards.push("tauschbar");
  //       }
  //       for(let i = 1; i <= stolenThing.Anzahl - stolenThing.TauschbareAnzahl; i++) {
  //         ownedCards.push("getauscht");
  //       }

  //       const stolenThingGefunden: boolean = pickRandom([true, false]);

  //       //transfer card
  //       let peevesFile: HuhnwartsPeevesInventoryFile = {
  //         UserID: userID,
  //         ThingID: stolenThing.SchokofroschID,
  //         ThingType: "Karte",
  //         timestampFound: now,
  //         canFilch: false,
  //         wasTraded: false
  //       }
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] Anzahl BEFORE: ${stolenThing.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] gefundene Anzahl BEFORE: ${stolenThing.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] tauschbare Anzahl BEFORE: ${stolenThing.TauschbareAnzahl}`);
  //       if(stolenThingGefunden == true) {
  //         stolenThing.Anzahl -= 1;
  //         stolenThing.GefundeneAnzahl -= 1;
  //         if(stolenThing.TauschbareAnzahl > 0) stolenThing.TauschbareAnzahl -= 1; //wenn es tauschbare Karten gab              
  //       } else {
  //         stolenThing.Anzahl -= 1;
  //         if((stolenThing.Anzahl == stolenThing.GefundeneAnzahl) && stolenThing.TauschbareAnzahl != 0) stolenThing.TauschbareAnzahl -= 1; //wenn nur noch gefundene Karten übrig sind und es nicht die letzte war
  //         peevesFile.wasTraded = true;
  //       }
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] Anzahl AFTER: ${stolenThing.Anzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] gefundene AFTER BEFORE: ${stolenThing.GefundeneAnzahl}`);
  //       ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //       logger(`BUG-LOGGING: bohnenPeeves: user ${user} [Karten Nr. ${stolenThing.SchokofroschID}] tauschbare AFTER BEFORE: ${stolenThing.TauschbareAnzahl}`);

  //       //SFK Punkte
  //         if(stolenThing.Anzahl == 0) {
  //           const schokofroschFile: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(stolenThing.SchokofroschID);
  //           //ERROR
  //           if(schokofroschFile == false) {
  //             chatClient.say(channel, `something went wrong...`);
  //             logger(`bohnenPeeves: ERROR! schokofroschFile`);
  //             return false;
  //           }
  //           const cardPoints: number = huhnwarts2023rarityPoints[schokofroschFile.seltenheit];
  //           userFile.punkteSFK -= cardPoints;

  //           //write user file
  //           const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //           //ERROR
  //           if(writeUserFile == false) {
  //             chatClient.say(channel, `something went wrong...`);
  //             logger(`bohnenPeeves: ERROR! writeUserFile`);
  //             return false;
  //           }
  //         }

  //       //write/delte userObjectInventoryFile
  //       if(stolenThing.Anzahl == 0) {
  //         //delete
  //         const deleteSfkInventoryFile: boolean = await Huhnwarts2023Helper.deleteSfkInventoryFile(stolenThing);
  //         //ERROR
  //         if(deleteSfkInventoryFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`bohnenPeeves: ERROR! deleteSfkInventoryFile`);
  //           return false;
  //         }
  //       } else {
  //         const writeSfkInventoryFile: boolean = await Huhnwarts2023Helper.writeSfkInventoryFile(stolenThing);
  //         //ERROR
  //         if(writeSfkInventoryFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`bohnenPeeves: ERROR! writeSfkInventoryFile`);
  //           return false;
  //         }
  //       }

  //       const writePeevesInventoryFile: boolean = await Huhnwarts2023Helper.writePeevesInventoryFile(peevesFile);
  //       //ERROR
  //       if(writePeevesInventoryFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`bohnenPeeves: ERROR! writePeevesInventoryFile`);
  //         return false;
  //       }

  //       //get object name
  //       const readSfkFileByID: HuhnwartsSchokofroschkartenFile | false = await Huhnwarts2023Helper.readSchokofroschkartenFileByID(stolenThing.SchokofroschID);
  //       //ERROR
  //       if(readSfkFileByID == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`bohnenPeeves: ERROR! readSfkFileByID`);
  //         return false;
  //       }
  //       return ["Karte", stolenThing.SchokofroschID, readSfkFileByID.Name];
  //     }
  //   } else {
  //     //user has no things
  //     return null;
  //   }
  // }
  
  // commandHandler.addCommand("essen", true, 0, 0, async ({channel, user, args, msg}) => {
  //   if(!botControl.streamerOnline) return;
    
  //   const userId: number = Number(msg.userInfo.userId);

  //   //get user file
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!essen: ERROR! readUserFile`);
  //     return;
  //   }
  //   //user does not exist
  //   if(userFile == null || userFile.HausID == 0) {
  //     chatClient.say(channel, `@${user}, du musst zuerst einem Haus beitreten, bevor du das tun kannst.`);
  //     logger(`!essen: no UserFile [${user}]`);
  //     return;
  //   }
    
  //   //get user bean files
  //   let userBohnenFiles: HuhnwartsBohnenInventoryFile[] | false | null = await Huhnwarts2023Helper.readBohnenInventoryFiles(userId);
  //   //ERROR
  //   if(userBohnenFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!essen: ERROR! userBohnenFiles`);
  //     return;
  //   }
  //   //user has no beans
  //   if(userBohnenFiles == null) {
  //     chatClient.say(channel, `@${user}, du scheinst keine Bohnen zu besitzen...`);
  //     logger(`!essen: [${user}] has no BEANS`);
  //     return;
  //   }

  //   let eatenBeanFile: HuhnwartsBohnenInventoryFile = pickRandom(userBohnenFiles);

  //   const bohnenFile: HuhnwartsBohnenFile | false = await Huhnwarts2023Helper.readBohnenFileByID(eatenBeanFile.BohnenID);
  //   //ERROR
  //   if(bohnenFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!essen: ERROR! bohnenFile`);
  //     return;
  //   }

  //   //set up chat message
  //   let specialText: string = ``;

  //   if(bohnenFile.effekt == ' 3 Futter dazu') {
  //     //Futterbohne +3
  //     userFile.countFutter += 3;

  //     //save user file
  //     const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //     //ERROR
  //     if(writeUserFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!essen: ERROR! writeUserFile`);
  //       return;
  //     }

  //     specialText = ` Du erhältst 3 Futter.`;

  //     //check for Futter achievements//
  //     await huhnwarts2023checkFutterAchievements(userId, user);
  //   } else if(bohnenFile.effekt == ' 5 Futter dazu') {
  //     //Futterbohne +5
  //     userFile.countFutter += 5;

  //     //save user file
  //     const writeUserFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //     //ERROR
  //     if(writeUserFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!essen: ERROR! writeUserFile`);
  //       return;
  //     }

  //     specialText = ` Du erhältst 5 Futter.`;

  //     //check for Futter achievements//
  //     await huhnwarts2023checkFutterAchievements(userId, user);
  //   } else if(bohnenFile.effekt == ' Peeves erscheint!') {
  //     //Peevesbohne
  //     const bohnenPeeves: "Geisterschutz" | [string, number, string] | false | null = await bohnenPeevesEvent(user, userId, userFile);
  //     //ERROR
  //     if(bohnenPeeves == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!essen: ERROR! bohnenPeeves`);
  //       return;
  //     } else if(bohnenPeeves == null) {
  //       //no things
  //       specialText = `Peeves erscheint, aber du hast nichts, was er dir stehlen könnte...`;
  //     } else if(bohnenPeeves == "Geisterschutz") {
  //       //Geisterschutz
  //       specialText = `Peeves erscheint, aber du bist vor ihm geschützt.`
  //     } else {
  //       //Success
  //       specialText = ` xicanmAaaaaah Peeves erscheint und klaut dir ${bohnenPeeves[0] == "Karte" ? `diese Karte:` : `diesen Gegenstand:`} "${bohnenPeeves[2]}" [ID: ${bohnenPeeves[1]}]. xicanmAaaaaah Schicke dein Tier mit !peevesjagen nach ihm!`; 
  //     }
  //   } else if(bohnenFile.effekt == ' Du erhälst ein Bonustier, ein Huhn') {
  //     //Hühnerbohne
  //     //check if user already ownes this animal//
  //     const userBegleittierFiles: HuhnwartsBegleittierFile[] | false | null = await Huhnwarts2023Helper.readBegleittierFilesByBesitzer(userId);
  //     //ERROR
  //     if(userBegleittierFiles == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!essen: ERROR! userBegleittierFiles [${user}]`);
  //       return;
  //     }

  //     let alreadOwns: boolean = false;
  //     if(userBegleittierFiles != null) {
  //       for(const begleittierFile of userBegleittierFiles) {
  //         if(begleittierFile.typ == "Huhn") alreadOwns = true;
  //       }
  //     }

  //     if(alreadOwns == true) {
  //       //user already owns a Huhn
  //       specialText = ' Lecker, nichts passiert';
  //     } else {
  //       //user owns no Huhn
  //       const bonustierTypeFile: HuhnwartsBegleittierTypeFile | false  | null = await Huhnwarts2023Helper.getBonustierTypeByName("Huhn");
  //       //ERROR
  //       if(bonustierTypeFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!essen: ERROR! bonustierTypeFile`);
  //         return;
  //       }
  //       //invalid animal | should never happen
  //       if(bonustierTypeFile == null) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!essen: invalid animal "Huhn"`);
  //         return;
  //       }

  //       let begleittierEigenschaften: string[] = [bonustierTypeFile.Satzteil1, " ", pickRandom(bonustierTypeFile.Fellfarbe), " "];
  //       begleittierEigenschaften = begleittierEigenschaften.concat(getRandomInt(0, 101) <= bonustierTypeFile.FellfarbeWar ? [bonustierTypeFile.SatzteilOpt1, " ", pickRandom(bonustierTypeFile.FellfarbeOpt1), " "] : []);
  //       begleittierEigenschaften.push(bonustierTypeFile.Satzteil2, " ", pickRandom(bonustierTypeFile.Fellstruktur), " ", bonustierTypeFile.Satzteil2Suf, ". ",bonustierTypeFile.Satzteil3Pre, " ", pickRandom(bonustierTypeFile.Augenfarbe), ". ");
  //       begleittierEigenschaften = begleittierEigenschaften.concat(getRandomInt(0, 101) <= bonustierTypeFile.Satzteil4War ? [bonustierTypeFile.Satzteil4Opt, " ", pickRandom(bonustierTypeFile.Eigenschaft), "."] : []);

  //       const newBegleittier: HuhnwartsBegleittierFile = {
  //         id: bonustierTypeFile.BegleittiertypID,
  //         name: '',
  //         eigenschaften: begleittierEigenschaften,
  //         besitzer: userId,
  //         typ: bonustierTypeFile.Begleittiertyp,
  //         awayUntil: 0,
  //         activity: null
  //       }

  //       //write Begleittier file
  //       const writeBegleittierFile: boolean = await Huhnwarts2023Helper.writeBegleittierFile(newBegleittier);
  //       //ERROR
  //       if(writeBegleittierFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!kaufen: ERROR! writeBegleittierFile [${user}]`);
  //         return;
  //       }
        
  //       specialText = ` Du findest ein Bonustier! HYPEE ${newBegleittier.eigenschaften.join("")}`; 
  //     }

  //     //user can buy animal//

  //   } else {
  //     specialText = bohnenFile.effekt;
  //   }

  //   //eat bean
  //   eatenBeanFile.Anzahl -= 1;
  //   if(eatenBeanFile.Anzahl == 0) {
  //     //delete File
  //     const deleteBohnenInventoryFile: boolean = await Huhnwarts2023Helper.deleteBohnenInventoryFile(eatenBeanFile);
  //     //ERROR
  //     if(deleteBohnenInventoryFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!essen: ERROR! deleteBohnenInventoryFile`);
  //       return;
  //     }
  //   } else {
  //     //save file
  //     const writeBohnenInvenotyFile: boolean = await Huhnwarts2023Helper.writeBohnenInventoryFile(eatenBeanFile);
  //     //ERROR
  //     if(writeBohnenInvenotyFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!essen: ERROR! writeBohnenInvenotyFile`);
  //       return;
  //     }
  //   }

  //   //say in chat
  //   chatClient.say(channel, `@${user}, Du isst eine deiner Bohnen. Die Bohne ist ${bohnenFile.farbe.toLowerCase()} mit ${bohnenFile.eigenschaft1} ${bohnenFile.eigenschaft2}. ${bohnenFile.geschmack}!${specialText}`);
  // });

  // //#endregion Bohnen

  // //#region Achievements
  // const huhnwarts2023checkBegleittierAchievements = async (userId: number, userName: string) => {
  //   const readUserAchievementsFiles: HuhnwartsUserAchievementsFile[] | false | null = await Huhnwarts2023Helper.readUserAchievementsFiles(userId);
  //   //ERROR
  //   if(readUserAchievementsFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`huhnwarts2023checkBegleittierAchievements: ERROR! readUserAchievementsFiles [${userName}]`);
  //     return;
  //   }

  //   //Tiersammler [1]
  //   if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 1).length == 0) {
  //     //does not have achievement yet
  //     let userBegleittierFiles: HuhnwartsBegleittierFile[] | false | null = await Huhnwarts2023Helper.readUserBegleittierFiles(userId);
  //     //ERROR
  //     if(userBegleittierFiles == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkBegleittierAchievements: ERROR! userBegleittierFiles [${userName}]`);
  //       return;
  //     }
  //     //user has no animals
  //     if(userBegleittierFiles == null) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkBegleittierAchievements: ERROR! userBegleittierFiles [${userName}]`);
  //       return;
  //     }

  //     //remove Huhn
  //     for(const begleittier of userBegleittierFiles) {
  //       if(begleittier.typ == "Huhn") userBegleittierFiles.splice(userBegleittierFiles.indexOf(begleittier), 1);
  //     }

  //     //get total animal number
  //     const allBegleittierTypeFiles: HuhnwartsBegleittierTypeFile[] | false = await Huhnwarts2023Helper.readBegleittierTypeFiles();
  //     //ERROR
  //     if(allBegleittierTypeFiles == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkBegleittierAchievements: ERROR! allBegleittierTypeFiles [${userName}]`);
  //       return;
  //     }

  //     if(userBegleittierFiles != null && userBegleittierFiles.length == allBegleittierTypeFiles.length) {
  //       const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 1});
  //       //ERROR
  //       if(writeUserAchievementsFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkBegleittierAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //         return;
  //       }
  //       //say in chat
  //       chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Tiersammler" erhalten! xicanmHyped`);
  //       logger(`huhnwarts2023checkBegleittierAchievements: [${userName}] got achievement "Tiersammler"`);
  //     }
  //   }

  //   //check all achievements [13]
  //   await huhnwarts2023checkAllAchievements(userId, userName);
  // }

  // const huhnwarts2023checkSuchenAchievements = async (userId: number, userName: string, placeID: number) => {
  //   ////////////////////////////////////////BUG-LOGGING////////////////////////////////////////
  //   logger(`BUG-LOGGING: huhnwarts2023checkSuchenAchievements: triggered`);
  //   const readUserAchievementsFiles: HuhnwartsUserAchievementsFile[] | false | null = await Huhnwarts2023Helper.readUserAchievementsFiles(userId);
  //   //ERROR
  //   if(readUserAchievementsFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`huhnwarts2023checkSuchenAchievements: ERROR! readUserAchievementsFiles [${userName}]`);
  //     return;
  //   }

  //   //Spitzensucher [2]
  //   if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 2).length == 0) {
  //     let readUserSearchedPlacesFile: HuhnwartsUserSearchedPlacesFile | false | null = await Huhnwarts2023Helper.readUserSearchedPlaces(userId);
  //     //ERROR
  //     if(readUserSearchedPlacesFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkSuchenAchievements: ERROR! readUserSearchedPlacesFile [${userName}]`);
  //       return;
  //     }
  //     //first search
  //     if(readUserSearchedPlacesFile == null) {
  //       readUserSearchedPlacesFile = {UserID: userId, OrtIDs: [placeID]};
  //       const writeUserSearchedPlacesFile: boolean = await Huhnwarts2023Helper.writeUserSearchedPlaces(readUserSearchedPlacesFile);
  //       //ERROR
  //       if(writeUserSearchedPlacesFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSuchenAchievements: ERROR! writeUserSearchedPlacesFile [${userName}]`);
  //         return;
  //       }
  //     }
  //     if(!readUserSearchedPlacesFile?.OrtIDs.includes(placeID)) {
  //       readUserSearchedPlacesFile?.OrtIDs.push(placeID);
  //       const writeUserSearchedPlacesFile: boolean = await Huhnwarts2023Helper.writeUserSearchedPlaces(readUserSearchedPlacesFile);
  //       //ERROR
  //       if(writeUserSearchedPlacesFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSuchenAchievements: ERROR! writeUserSearchedPlacesFile [${userName}]`);
  //         return;
  //       }

  //       //read all Orte Files
  //       const allPlaceFiles: HuhnwartsOrteFile[] | false = await Huhnwarts2023Helper.getAllPlaces();
  //       //ERROR
  //       if(allPlaceFiles == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSuchenAchievements: ERROR! allPlaceFiles [${userName}]`);
  //         return;
  //       }

  //       if(readUserSearchedPlacesFile?.OrtIDs.length == allPlaceFiles.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 2});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSuchenAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Spitzensucher" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSuchenAchievements: [${userName}] got achievement "Spitzensucher"`);
  //       }
  //     }
  //   }

  //   //check all achievements [13]
  //   await huhnwarts2023checkAllAchievements(userId, userName);
  // }

  // const huhnwarts2023checkObjectAchievements = async (userId: number, userName: string) => {
  //   //check for Object Achievements
  //   const userObjectFiles: HuhnwartsObjectInventoryFile[] | false | null = await Huhnwarts2023Helper.readObjectInventoryFilesByUserID(userId);
  //   //ERROR
  //   if(userObjectFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`huhnwarts2023checkObjectAchievements: ERROR! userObjectFiles [${userName}]`);
  //     return;
  //   }
  //   //ERROR

  //   //Achievements//
  //   if(userObjectFiles != null) {
  //     const readUserAchievementsFiles: HuhnwartsUserAchievementsFile[] | false | null = await Huhnwarts2023Helper.readUserAchievementsFiles(userId);
  //     //ERROR
  //     if(readUserAchievementsFiles == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkObjectAchievements: ERROR! readUserAchievementsFiles [${userName}]`);
  //       return;
  //     }

  //     //Schrottplatz [10]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 10).length == 0) {
  //       //does not have achievement yet
  //       const readObjectIDs: number[] | false = await Huhnwarts2023Helper.getObjectIDs();
  //       //ERROR
  //       if(readObjectIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkObjectAchievements: ERROR! readGryffindorIDs ["Gryffindor"]`);
  //         return;
  //       }

  //       if(userObjectFiles.filter(objectFile => readObjectIDs.includes(objectFile.GegenstandID)).length == readObjectIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 10});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkObjectAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Schrottplatz" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkObjectAchievements: [${userName}] got achievement "Schrottplatz"`);
  //       } 
  //     }

  //     //check all achievements [13]
  //     await huhnwarts2023checkAllAchievements(userId, userName);
  //   }
  // }

  // const huhnwarts2023checkSfkAchievements = async (userId: number, userName: string) => {
  //   //check for Card Achievements
  //   const userSfkFiles: HuhnwartsSfkInventoryFile[] | false | null = await Huhnwarts2023Helper.readSfkInventoryFilesByUserID(userId);
  //   //ERROR
  //   if(userSfkFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`huhnwarts2023checkSfkAchievements: ERROR! userSfkFiles [${userName}]`);
  //     return;
  //   }
  //   //ERROR

  //   //Achievements//
  //   if(userSfkFiles != null) {
  //     const readUserAchievementsFiles: HuhnwartsUserAchievementsFile[] | false | null = await Huhnwarts2023Helper.readUserAchievementsFiles(userId);
  //     //ERROR
  //     if(readUserAchievementsFiles == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkSfkAchievements: ERROR! readUserAchievementsFiles [${userName}]`);
  //       return;
  //     }

  //     //Wahrer Löwe [3]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 3).length == 0) {
  //       //does not have achievement yet
  //       const readGryffindorIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByCategory("Gryffindor");
  //       //ERROR
  //       if(readGryffindorIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readGryffindorIDs ["Gryffindor"]`);
  //         return;
  //       }

  //       if(userSfkFiles.filter(sfkFile => readGryffindorIDs.includes(sfkFile.SchokofroschID)).length == readGryffindorIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 3});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSfkAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Wahrer Löwe" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSfkAchievements: [${userName}] got achievement "Wahrer Löwe"`);
  //       } 
  //     }
      
  //     //Wahre Schlange [4]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 4).length == 0) {
  //       //does not have achievement yet
  //       const readSlytherinIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByCategory("Slytherin");
  //       //ERROR
  //       if(readSlytherinIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readSlytherinIDs ["Slytherin"]`);
  //         return;
  //       }

  //       if(userSfkFiles.filter(sfkFile => readSlytherinIDs.includes(sfkFile.SchokofroschID)).length == readSlytherinIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 4});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSfkAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Wahre Schlange" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSfkAchievements: [${userName}] got achievement "Wahre Schlange"`);
  //       } 
  //     }
      
  //     //Wahrer Adler [5]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 5).length == 0) {
  //       //does not have achievement yet
  //       const readRavenclawIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByCategory("Ravenclaw");
  //       //ERROR
  //       if(readRavenclawIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readRavenclawIDs ["Ravenclaw"]`);
  //         return;
  //       }

  //       if(userSfkFiles.filter(sfkFile => readRavenclawIDs.includes(sfkFile.SchokofroschID)).length == readRavenclawIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 5});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSfkAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Wahrer Adler" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSfkAchievements: [${userName}] got achievement "Wahrer Adler"`);
  //       } 
  //     }
      
  //     //Wahrer Dachs [6]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 6).length == 0) {
  //       //does not have achievement yet
  //       const readHufflepuffIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByCategory("Hufflepuff");
  //       //ERROR
  //       if(readHufflepuffIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readHufflepuffIDs ["Hufflepuff"]`);
  //         return;
  //       }

  //       if(userSfkFiles.filter(sfkFile => readHufflepuffIDs.includes(sfkFile.SchokofroschID)).length == readHufflepuffIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 6});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSfkAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Wahrer Dachs" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSfkAchievements: [${userName}] got achievement "Wahrer Dachs"`);
  //       } 
  //     }
      
  //     //Geisterjäger [7]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 7).length == 0) {
  //       //does not have achievement yet
  //       const readGeisterIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByCategory("Geister");
  //       //ERROR
  //       if(readGeisterIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readGeisterIDs ["Geister"]`);
  //         return;
  //       }

  //       if(userSfkFiles.filter(sfkFile => readGeisterIDs.includes(sfkFile.SchokofroschID)).length == readGeisterIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 7});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSfkAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Geisterjäger" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSfkAchievements: [${userName}] got achievement "Geisterjäger"`);
  //       } 
  //     }
      
  //     //Lehrers Liebling [8]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 8).length == 0) {
  //       //does not have achievement yet
  //       const readLehrerIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByCategory("Lehrer");
  //       //ERROR
  //       if(readLehrerIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readLehrerIDs ["Lehrer"]`);
  //         return;
  //       }

  //       if(userSfkFiles.filter(sfkFile => readLehrerIDs.includes(sfkFile.SchokofroschID)).length == readLehrerIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 8});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSfkAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Lehrers Liebling" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSfkAchievements: [${userName}] got achievement "Lehrers Liebling"`);
  //       } 
  //     }
      
  //     //Charakterstärke [9]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 9).length == 0) {
  //       //does not have achievement yet
  //       const readWeitereCharaktereIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByCategory("Weitere Charaktere");
  //       //ERROR
  //       if(readWeitereCharaktereIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readWeitereCharaktereIDs ["Weitere Charaktere"]`);
  //         return;
  //       }

  //       if(userSfkFiles.filter(sfkFile => readWeitereCharaktereIDs.includes(sfkFile.SchokofroschID)).length == readWeitereCharaktereIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 9});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSfkAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Charakterstärke" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSfkAchievements: [${userName}] got achievement "Charakterstärke"`);
  //       } 
  //     }
      
  //     //Phoenix [16]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 16).length == 0) {
  //       //does not have achievement yet
  //       const readPhoenixIDs: number[] | false | null = await Huhnwarts2023Helper.getSfkIDsByPlace(46); //Grimmauldplatz 
  //       //ERROR
  //       if(readPhoenixIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readPhoenixIDs ["Grimmauldplatz"]`);
  //         return;
  //       }
  //       //null | impossible
  //       if(readPhoenixIDs == null) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readPhoenixIDs ["Grimmauldplatz"] (null)`);
  //         return;
  //       }

  //       if(userSfkFiles.filter(sfkFile => readPhoenixIDs.includes(sfkFile.SchokofroschID)).length == readPhoenixIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 16});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSfkAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Phoenix" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSfkAchievements: [${userName}] got achievement "Phoenix"`);
  //       } 
  //     }
      
  //     //Die dunkle Seite [17]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 17).length == 0) {
  //       //does not have achievement yet
  //       const readAzkabanIDs: number[] | false | null = await Huhnwarts2023Helper.getSfkIDsByPlace(16); //Azkaban
  //       if(readAzkabanIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readAzkabanIDs ["Azkaban"]`);
  //         return;
  //       }
  //       //null | impossible
  //       if(readAzkabanIDs == null) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readAzkabanIDs ["Azkaban"] (null)`);
  //         return;
  //       }

  //       if(userSfkFiles.filter(sfkFile => readAzkabanIDs.includes(sfkFile.SchokofroschID)).length == readAzkabanIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 17});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSfkAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Die dunkle Seite" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSfkAchievements: [${userName}] got achievement "Die dunkle Seite"`);
  //       } 
  //     }
      
  //     //Wahres Huhn [14]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 14).length == 0) {
  //       //does not have achievement yet
  //       const readModsIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByCategory("Mods");
  //       //ERROR
  //       if(readModsIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readModsIDs ["Mods"]`);
  //         return;
  //       }

  //       if(userSfkFiles.filter(sfkFile => readModsIDs.includes(sfkFile.SchokofroschID)).length == readModsIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 14});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSfkAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Wahres Huhn" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSfkAchievements: [${userName}] got achievement "Wahres Huhn"`);
  //       } 
  //     }
      
  //     //Spielesammlung [18]
  //     if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 18).length == 0) {
  //       //does not have achievement yet
  //       const readHogwartsLegacyIDs: number[] | false = await Huhnwarts2023Helper.getSfkIDsByCategory("Hogwarts Legacy");
  //       //ERROR
  //       if(readHogwartsLegacyIDs == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkSfkAchievements: ERROR! readHogwartsLegacyIDs ["Hogwarts Legacy"]`);
  //         return;
  //       }

  //       if(userSfkFiles.filter(sfkFile => readHogwartsLegacyIDs.includes(sfkFile.SchokofroschID)).length == readHogwartsLegacyIDs.length) {
  //         const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 18});
  //         //ERROR
  //         if(writeUserAchievementsFile == false) {
  //           chatClient.say(channel, `something went wrong...`);
  //           logger(`huhnwarts2023checkSfkAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //           return;
  //         }
  //         //say in chat
  //         chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Spielesammlung" erhalten! xicanmHyped`);
  //         logger(`huhnwarts2023checkSfkAchievements: [${userName}] got achievement "Spielesammlung"`);
  //       } 
  //     }

  //     //check all achievements [13]
  //     await huhnwarts2023checkAllAchievements(userId, userName);
  //   }
  // }

  // const huhnwarts2023checkFutterAchievements = async (userId: number, userName: string) => {
  //   //check for Futter Achievements//
  //   const readUserAchievementsFiles: HuhnwartsUserAchievementsFile[] | false | null = await Huhnwarts2023Helper.readUserAchievementsFiles(userId);
  //   //ERROR
  //   if(readUserAchievementsFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`huhnwarts2023checkFutterAchievements: ERROR! readUserAchievementsFiles [${userName}]`);
  //     return;
  //   }

  //   //Tiershop [15]
  //   if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 15).length == 0) {
  //     //does not have achievement yet
  //     const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userId);
  //     //ERROR
  //     if(userFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkFutterAchievements: ERROR! readUserFile [${userName}]`);
  //       return;
  //     }
  //     //user does not exist | should never happen
  //     if(userFile == null) {
  //       logger(`huhnwarts2023checkFutterAchievements: ERROR! no userFile [${userName}]`);
  //       return;
  //     }

  //     if(userFile?.countFutter >= 30) {
  //       const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 15});
  //       //ERROR
  //       if(writeUserAchievementsFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkFutterAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //         return;
  //       }
  //       //say in chat
  //       chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Tiershop" erhalten! xicanmHyped`);
  //       logger(`huhnwarts2023checkFutterAchievements: [${userName}] got achievement "Tiershop"`);
  //     } 
  //   }

  //   //check all achievements [13]
  //   await huhnwarts2023checkAllAchievements(userId, userName);
  // }

  // const huhnwarts2023checkTauschenAchievements = async (userId: number, userName: string) => {
  //   //check for tauschen Achievements//
  //   const readUserAchievementsFiles: HuhnwartsUserAchievementsFile[] | false | null = await Huhnwarts2023Helper.readUserAchievementsFiles(userId);
  //   //ERROR
  //   if(readUserAchievementsFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`huhnwarts2023checkTauschenAchievements: ERROR! readUserAchievementsFiles [${userName}]`);
  //     return;
  //   }

  //   //Dealer [11]
  //   if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 11).length == 0) {
  //     //does not have achievement yet
  //     const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userId);
  //     //ERROR
  //     if(userFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkTauschenAchievements: ERROR! readUserFile [${userName}]`);
  //       return;
  //     }
  //     //user does not exist | should never happen
  //     if(userFile == null) {
  //       logger(`huhnwarts2023checkTauschenAchievements: ERROR! no userFile [${userName}]`);
  //       return;
  //     }

  //     if(userFile?.countTauschen >= 50) {
  //       const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 11});
  //       //ERROR
  //       if(writeUserAchievementsFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkTauschenAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //         return;
  //       }
  //       //say in chat
  //       chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Dealer" erhalten! xicanmHyped`);
  //       logger(`huhnwarts2023checkTauschenAchievements: [${userName}] got achievement "Dealer"`);
  //     } 
  //   }

  //   //Boss [12]
  //   if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 12).length == 0) {
  //     //does not have achievement yet
  //     const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userId);
  //     //ERROR
  //     if(userFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkTauschenAchievements: ERROR! readUserFile [${userName}]`);
  //       return;
  //     }
  //     //user does not exist | should never happen
  //     if(userFile == null) {
  //       logger(`huhnwarts2023checkTauschenAchievements: ERROR! no userFile [${userName}]`);
  //       return;
  //     }

  //     if(userFile?.countTauschen >= 100) {
  //       const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 12});
  //       //ERROR
  //       if(writeUserAchievementsFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkTauschenAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //         return;
  //       }
  //       //say in chat
  //       chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Boss" erhalten! xicanmHyped`);
  //       logger(`huhnwarts2023checkTauschenAchievements: [${userName}] got achievement "Boss"`);
  //     } 
  //   }

  //   //Schwarzmarkt [13]
  //   if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 13).length == 0) {
  //     //does not have achievement yet
  //     const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userId);
  //     //ERROR
  //     if(userFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkTauschenAchievements: ERROR! readUserFile [${userName}]`);
  //       return;
  //     }
  //     //user does not exist | should never happen
  //     if(userFile == null) {
  //       logger(`huhnwarts2023checkTauschenAchievements: ERROR! no userFile [${userName}]`);
  //       return;
  //     }

  //     if(userFile?.countTauschen >= 500) {
  //       const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 13});
  //       //ERROR
  //       if(writeUserAchievementsFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkTauschenAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //         return;
  //       }
  //       //say in chat
  //       chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Schwarzmarkt" erhalten! xicanmHyped`);
  //       logger(`huhnwarts2023checkTauschenAchievements: [${userName}] got achievement "Schwarzmarkt"`);
  //     } 
  //   }

  //   //check all achievements [13]
  //   await huhnwarts2023checkAllAchievements(userId, userName);
  // }

  // const huhnwarts2023checkDuellAchievements = async (userId: number, userName: string) => {
  //   //check for tauschen Achievements//
  //   const readUserAchievementsFiles: HuhnwartsUserAchievementsFile[] | false | null = await Huhnwarts2023Helper.readUserAchievementsFiles(userId);
  //   //ERROR
  //   if(readUserAchievementsFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`huhnwarts2023checkDuellAchievements: ERROR! readUserAchievementsFiles [${userName}]`);
  //     return;
  //   }

  //   //Gummistab [19]
  //   if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 19).length == 0) {
  //     //does not have achievement yet
  //     const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userId);
  //     //ERROR
  //     if(userFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkDuellAchievements: ERROR! readUserFile [${userName}]`);
  //       return;
  //     }
  //     //user does not exist | should never happen
  //     if(userFile == null) {
  //       logger(`huhnwarts2023checkDuellAchievements: ERROR! no userFile [${userName}]`);
  //       return;
  //     }

  //     if(userFile?.duelleVerloren >= 25) {
  //       const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 19});
  //       //ERROR
  //       if(writeUserAchievementsFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkDuellAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //         return;
  //       }
  //       //say in chat
  //       chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Gummistab" erhalten! xicanmHyped`);
  //       logger(`huhnwarts2023checkDuellAchievements: [${userName}] got achievement "Gummistab"`);
  //     } 
  //   }

  //   //Duellmeister [20]
  //   if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 20).length == 0) {
  //     //does not have achievement yet
  //     const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userId);
  //     //ERROR
  //     if(userFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`huhnwarts2023checkDuellAchievements: ERROR! readUserFile [${userName}]`);
  //       return;
  //     }
  //     //user does not exist | should never happen
  //     if(userFile == null) {
  //       logger(`huhnwarts2023checkDuellAchievements: ERROR! no userFile [${userName}]`);
  //       return;
  //     }

  //     if(userFile?.duelleGewonnen >= 25) {
  //       const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 20});
  //       //ERROR
  //       if(writeUserAchievementsFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkDuellAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //         return;
  //       }
  //       //say in chat
  //       chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Duellmeister" erhalten! xicanmHyped`);
  //       logger(`huhnwarts2023checkDuellAchievements: [${userName}] got achievement "Duellmeister"`);
  //     } 
  //   }

  //   //check all achievements [21]
  //   await huhnwarts2023checkAllAchievements(userId, userName);
  // }

  // const huhnwarts2023checkAllAchievements = async (userId: number, userName: string) => {
  //   //check for all Achievements//
  //   const readUserAchievementsFiles: HuhnwartsUserAchievementsFile[] | false | null = await Huhnwarts2023Helper.readUserAchievementsFiles(userId);
  //   //ERROR
  //   if(readUserAchievementsFiles == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`huhnwarts2023checkAllAchievements: ERROR! readUserAchievementsFiles [${userName}]`);
  //     return;
  //   }

  //   const totalAchievementsAmount: number | false = await Huhnwarts2023Helper.getAchievementsAmount();
  //   //ERROR
  //   if(totalAchievementsAmount == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`huhnwarts2023checkAllAchievements: ERROR! totalAchievementsAmount [${userName}]`);
  //     return;
  //   }

  //   //Chatspiel Durchgespielt [19]
  //   if(readUserAchievementsFiles == null || readUserAchievementsFiles.filter(achievement => achievement.ErfolgID == 21).length == 0) {
  //     //does not have achievement yet

  //     if(readUserAchievementsFiles != null && readUserAchievementsFiles.length == totalAchievementsAmount-1) {
  //       const writeUserAchievementsFile: boolean = await Huhnwarts2023Helper.writeUserAchievementsFile({UserID: userId, ErfolgID: 21});
  //       //ERROR
  //       if(writeUserAchievementsFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`huhnwarts2023checkAllAchievements: ERROR! writeUserAchievementsFile [${userName}]`);
  //         return;
  //       }
  //       //say in chat
  //       chatClient.action(channel, `xicanmHyped @${userName}, Gratulation! Du hast das Achievement "Chatspiel Durchgespielt" erhalten! xicanmHyped`);
  //       logger(`huhnwarts2023checkAllAchievements: [${userName}] got achievement "Chatspiel Durchgespielt"`);
  //     } 
  //   }
  // }
  // //#endregion Achievements
  
  // //#region Verlosungen
  // commandHandler.addCommand("huhnwartslostopf", true, 3, 0, async ({channel, args, user}) => {
  //   if(args.length == 0) return;

  //   if(args[0].toLowerCase() == "tauschen") {
  //     //read all user files
  //     const allUserFiles: HuhnwartsUserFile[] | false = await Huhnwarts2023Helper.readAllUserFiles();
  //     //ERROR
  //     if(allUserFiles == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! allUserFiles`);
  //       return;
  //     }

  //     //read lostopf file
  //     const lostopfFile: Huhnwarts2023LostopfFile | false = await Huhnwarts2023Helper.readWinnerFile("tauschen");
  //     //ERROR
  //     if(lostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! lostopfFile`);
  //       return;
  //     }

  //     let lostopf: [string, number][] = [];
  //     for(const user of allUserFiles) {
  //       if(user.punkteTauschen >= 20 && !lostopfFile.winners.includes(user.name)) lostopf.push([user.name, user.punkteTauschen]);
  //     }

  //     //no one qualified
  //     if(lostopf.length == 0) {
  //       chatClient.say(channel, `@${user}, es hat sich leider niemand für diesen Lostopf qualifiziert...`);
  //       logger(`!huhwartslostopf ${args[0]}: no one qualified`);
  //       return;
  //     }

  //     let lostopfMessage: string[] = [];
  //     lostopf.forEach(user => {
  //       lostopfMessage.push(`${user[0]}: ${user[1]}`);
  //     });

  //     //announce in chat
  //     //apiClient.chat.sendAnnouncement(channelID, 143972045, {message: `Peeves erscheint! xicanmAaaaaah`});
  //     chatClient.announce(channel, `${lostopf.length == 1 ? "Dieser User hat" : "Diese User haben"} sich für den Tauschen-Lostopf qualifiziert:`);
  //     multiAction(channel, chatClient, " ", `${listMaker(lostopfMessage)}`);
  //     logger(`!huhwartslostopf ${args[0]}: ${lostopf.length} users qualified`);
  //   } else if(args[0].toLowerCase() == "karten") {
  //     //read all user files
  //     const allUserFiles: HuhnwartsUserFile[] | false = await Huhnwarts2023Helper.readAllUserFiles();
  //     //ERROR
  //     if(allUserFiles == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! allUserFiles`);
  //       return;
  //     }

  //     //read lostopf file
  //     const lostopfFile: Huhnwarts2023LostopfFile | false = await Huhnwarts2023Helper.readWinnerFile("karten");
  //     //ERROR
  //     if(lostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! lostopfFile`);
  //       return;
  //     }

  //     let lostopf: [string, number][] = [];
  //     for(const user of allUserFiles) {
  //       if(user.punkteSFK >= 50 && !lostopfFile.winners.includes(user.name)) lostopf.push([user.name, user.punkteSFK]);
  //     }

  //     //no one qualified
  //     if(lostopf.length == 0) {
  //       chatClient.say(channel, `@${user}, es hat sich leider niemand für diesen Lostopf qualifiziert...`);
  //       logger(`!huhwartslostopf ${args[0]}: no one qualified`);
  //       return;
  //     }

  //     let lostopfMessage: string[] = [];
  //     lostopf.forEach(user => {
  //       lostopfMessage.push(`${user[0]}: ${user[1]}`);
  //     });

  //     //announce in chat
  //     //apiClient.chat.sendAnnouncement(channelID, 143972045, {message: `Peeves erscheint! xicanmAaaaaah`});
  //     chatClient.announce(channel, `${lostopf.length == 1 ? "Dieser User hat" : "Diese User haben"} sich für den Schokofroschkarten-Lostopf qualifiziert:`);
  //     multiAction(channel, chatClient, " ", `${listMaker(lostopfMessage)}`);
  //     logger(`!huhwartslostopf ${args[0]}: ${lostopf.length} users qualified`);
  //   } else if(args[0].toLowerCase() == "gegenstände") {
  //     //read all user IDs
  //     const allUserIDs: number[] | false = await Huhnwarts2023Helper.getAllUserIDs();
  //     //ERROR
  //     if(allUserIDs == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! allUserIDs`);
  //       return;
  //     }

  //     //read lostopf file
  //     const lostopfFile: Huhnwarts2023LostopfFile | false = await Huhnwarts2023Helper.readWinnerFile("gegenstaende");
  //     //ERROR
  //     if(lostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! lostopfFile`);
  //       return;
  //     }

  //     let lostopf: [string, number][] = [];
  //     for(const userID of allUserIDs) {
  //       //read all user object files
  //       const allUserObjectFiles: HuhnwartsObjectInventoryFile[] | false | null = await Huhnwarts2023Helper.readObjectInventoryFilesByUserID(userID);
  //       //ERROR
  //       if(allUserObjectFiles == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!huhnwartslostopf: ERROR! allUserObjectFiles`);
  //         return;
  //       }
  //       //user has no objects
  //       if(allUserObjectFiles == null) {
  //         continue;
  //       }
        
  //       const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userID);
  //       //ERROR
  //       if(userFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!huhnwartslostopf: ERROR! readUserFile [${userID}]`);
  //         return;
  //       }
  //       //user does not exist | should never happen
  //       if(userFile == null) {
  //         logger(`!huhnwartslostopf: ERROR! no userFile [${userID}]`);
  //         return;
  //       }

  //       if(allUserObjectFiles.length >= 10 && !lostopfFile.winners.includes(userFile.name)) lostopf.push([userFile.name, allUserObjectFiles.length]);
  //     }

  //     //no one qualified
  //     if(lostopf.length == 0) {
  //       chatClient.say(channel, `@${user}, es hat sich leider niemand für diesen Lostopf qualifiziert...`);
  //       logger(`!huhwartslostopf ${args[0]}: no one qualified`);
  //       return;
  //     }

  //     let lostopfMessage: string[] = [];
  //     lostopf.forEach(user => {
  //       lostopfMessage.push(`${user[0]}: ${user[1]}`);
  //     });

  //     //announce in chat
  //     //apiClient.chat.sendAnnouncement(channelID, 143972045, {message: `Peeves erscheint! xicanmAaaaaah`});
  //     chatClient.announce(channel, `${lostopf.length == 1 ? "Dieser User hat" : "Diese User haben"} sich für den Gegenstands-Lostopf qualifiziert:`);
  //     multiAction(channel, chatClient, " ", `${listMaker(lostopfMessage)}`);
  //     logger(`!huhwartslostopf ${args[0]}: ${lostopf.length} users qualified`);          
  //   } else if(args[0].toLowerCase() == "achievements") {
  //     //read all user IDs
  //     const allUserIDs: number[] | false = await Huhnwarts2023Helper.getAllUserIDs();
  //     //ERROR
  //     if(allUserIDs == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! allUserIDs`);
  //       return;
  //     }

  //     //get achievemts amount
  //     const achievementAmount: number | false = await Huhnwarts2023Helper.getAchievementsAmount();
  //     //ERROR
  //     if(achievementAmount == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! achievementAmount`);
  //       return;
  //     }

  //     //read lostopf file
  //     const lostopfFile: Huhnwarts2023LostopfFile | false = await Huhnwarts2023Helper.readWinnerFile("achievements");
  //     //ERROR
  //     if(lostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! lostopfFile`);
  //       return;
  //     }

  //     let lostopf: [string, number][] = [];
  //     for(const userID of allUserIDs) {
  //       //read all user object files
  //       const userAchievementFiles: HuhnwartsUserAchievementsFile[] | false | null = await Huhnwarts2023Helper.readUserAchievementsFiles(userID);
  //       //ERROR
  //       if(userAchievementFiles == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!huhnwartslostopf: ERROR! userAchievementFiles`);
  //         return;
  //       }
  //       //user has no achievements
  //       if(userAchievementFiles == null) {
  //         continue;
  //       }
        
  //       const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userID);
  //       //ERROR
  //       if(userFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!huhnwartslostopf: ERROR! readUserFile [${userID}]`);
  //         return;
  //       }
  //       //user does not exist | should never happen
  //       if(userFile == null) {
  //         logger(`!huhnwartslostopf: ERROR! no userFile [${userID}]`);
  //         return;
  //       }

  //       if(userAchievementFiles.length == achievementAmount && !lostopfFile.winners.includes(userFile.name)) lostopf.push([userFile.name, userAchievementFiles.length]);
  //     }

  //     //no one qualified
  //     if(lostopf.length == 0) {
  //       chatClient.say(channel, `@${user}, es hat sich leider niemand für diesen Lostopf qualifiziert...`);
  //       logger(`!huhwartslostopf ${args[0]}: no one qualified`);
  //       return;
  //     }

  //     let lostopfMessage: string[] = [];
  //     lostopf.forEach(user => {
  //       lostopfMessage.push(`${user[0]}: ${user[1]}`);
  //     });

  //     //announce in chat
  //     //apiClient.chat.sendAnnouncement(channelID, 143972045, {message: `Peeves erscheint! xicanmAaaaaah`});
  //     chatClient.announce(channel, `${lostopf.length == 1 ? "Dieser User hat" : "Diese User haben"} sich für den Achievements-Lostopf qualifiziert:`);
  //     multiAction(channel, chatClient, " ", `${listMaker(lostopfMessage)}`);
  //     logger(`!huhwartslostopf ${args[0]}: ${lostopf.length} users qualified`);   
      
  //   } else {
  //     chatClient.say(channel, `@${user}, bitte gib einen gültigen Lostopf an. ["tauschen", "karten", "gegenstände", "achievements"]`);
  //     logger(`!huhnwartslostopf: invalid Lostopf [${user}]`);
  //   }    
  // });

  // commandHandler.addCommand("huhnwartsverlosung", true, 3, 0, async ({channel, args, user}) => {
  //   if(args.length == 0) return;

  //   if(args[0].toLowerCase() == "tauschen") {
  //     //read all user files
  //     const allUserFiles: HuhnwartsUserFile[] | false = await Huhnwarts2023Helper.readAllUserFiles();
  //     //ERROR
  //     if(allUserFiles == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartsverlosung: ERROR! allUserFiles`);
  //       return;
  //     }

  //     //read lostopf file
  //     const lostopfFile: Huhnwarts2023LostopfFile | false = await Huhnwarts2023Helper.readWinnerFile("tauschen");
  //     //ERROR
  //     if(lostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! lostopfFile`);
  //       return;
  //     }

  //     let lostopf: [string, number][] = [];
  //     for(const user of allUserFiles) {
  //       if(user.punkteTauschen >= 20 && !lostopfFile.winners.includes(user.name)) lostopf.push([user.name, user.punkteTauschen]);
  //     }

  //     //no one qualified
  //     if(lostopf.length == 0) {
  //       chatClient.say(channel, `@${user}, es hat sich leider niemand für diesen Lostopf qualifiziert...`);
  //       logger(`!huhnwartsverlosung ${args[0]}: no one qualified`);
  //       return;
  //     }

  //     //pick winner//
  //     const winner: [string, number] = pickRandom(lostopf);
  //     lostopfFile.winners.push(winner[0]);

  //     //write lostopf file
  //     const writeLostopfFile: boolean = await Huhnwarts2023Helper.writeWinnerFile(lostopfFile);
  //     //ERROR
  //     if(writeLostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! writeLostopfFile`);
  //       return;
  //     }

  //     //announce in chat
  //     //apiClient.chat.sendAnnouncement(channelID, 143972045, {message: `Peeves erscheint! xicanmAaaaaah`});
  //     chatClient.announce(channel, `Und den Tauschen-Lostopf gewonnen hat:`);
  //     mythicAnnouncement(chatClient, channel, mysticWords, "", `@${winner[0]}! xicanmHyped Gratulation!`);
  //     logger(`!huhnwartsverlosung tauschen: ${winner[0]} [${winner[1]}]`);
  //   } else if(args[0].toLowerCase() == "karten") {
  //     //read all user files
  //     const allUserFiles: HuhnwartsUserFile[] | false = await Huhnwarts2023Helper.readAllUserFiles();
  //     //ERROR
  //     if(allUserFiles == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartsverlosung: ERROR! allUserFiles`);
  //       return;
  //     }

  //     //read lostopf file
  //     const lostopfFile: Huhnwarts2023LostopfFile | false = await Huhnwarts2023Helper.readWinnerFile("karten");
  //     //ERROR
  //     if(lostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! lostopfFile`);
  //       return;
  //     }

  //     let lostopf: [string, number][] = [];
  //     for(const user of allUserFiles) {
  //       if(user.punkteSFK >= 50 && !lostopfFile.winners.includes(user.name)) lostopf.push([user.name, user.punkteSFK]);
  //     }

  //     //no one qualified
  //     if(lostopf.length == 0) {
  //       chatClient.say(channel, `@${user}, es hat sich leider niemand für diesen Lostopf qualifiziert...`);
  //       logger(`!huhwartslostopf ${args[0]}: no one qualified`);
  //       return;
  //     }

  //     //pick winner//
  //     const winner: [string, number] = pickRandom(lostopf);
  //     lostopfFile.winners.push(winner[0]);

  //     //write lostopf file
  //     const writeLostopfFile: boolean = await Huhnwarts2023Helper.writeWinnerFile(lostopfFile);
  //     //ERROR
  //     if(writeLostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! writeLostopfFile`);
  //       return;
  //     }

  //     //announce in chat
  //     //apiClient.chat.sendAnnouncement(channelID, 143972045, {message: `Peeves erscheint! xicanmAaaaaah`});
  //     chatClient.announce(channel, `Und den Karten-Lostopf gewonnen hat:`);
  //     mythicAnnouncement(chatClient, channel, mysticWords, "", `@${winner[0]}! xicanmHyped Gratulation!`);
  //     logger(`!huhnwartsverlosung karten: ${winner[0]} [${winner[1]}]`);
  //   } else if(args[0].toLowerCase() == "gegenstände") {
  //     //read all user IDs
  //     const allUserIDs: number[] | false = await Huhnwarts2023Helper.getAllUserIDs();
  //     //ERROR
  //     if(allUserIDs == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartsverlosung: ERROR! allUserIDs`);
  //       return;
  //     }

  //     //read lostopf file
  //     const lostopfFile: Huhnwarts2023LostopfFile | false = await Huhnwarts2023Helper.readWinnerFile("gegenstaende");
  //     //ERROR
  //     if(lostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! lostopfFile`);
  //       return;
  //     }

  //     let lostopf: [string, number][] = [];
  //     for(const userID of allUserIDs) {
  //       //read all user object files
  //       const allUserObjectFiles: HuhnwartsObjectInventoryFile[] | false | null = await Huhnwarts2023Helper.readObjectInventoryFilesByUserID(userID);
  //       //ERROR
  //       if(allUserObjectFiles == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!huhnwartslostopf: ERROR! allUserObjectFiles`);
  //         return;
  //       }
  //       //user has no objects
  //       if(allUserObjectFiles == null) {
  //         continue;
  //       }
        
  //       const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userID);
  //       //ERROR
  //       if(userFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!huhnwartslostopf: ERROR! readUserFile [${userID}]`);
  //         return;
  //       }
  //       //user does not exist | should never happen
  //       if(userFile == null) {
  //         logger(`!huhnwartslostopf: ERROR! no userFile [${userID}]`);
  //         return;
  //       }

  //       if(allUserObjectFiles.length >= 10 && !lostopfFile.winners.includes(userFile.name)) lostopf.push([userFile.name, allUserObjectFiles.length]);
  //     }

  //     //no one qualified
  //     if(lostopf.length == 0) {
  //       chatClient.say(channel, `@${user}, es hat sich leider niemand für diesen Lostopf qualifiziert...`);
  //       logger(`!huhwartslostopf ${args[0]}: no one qualified`);
  //       return;
  //     }

  //     //pick winner//
  //     const winner: [string, number] = pickRandom(lostopf);
  //     lostopfFile.winners.push(winner[0]);

  //     //write lostopf file
  //     const writeLostopfFile: boolean = await Huhnwarts2023Helper.writeWinnerFile(lostopfFile);
  //     //ERROR
  //     if(writeLostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! writeLostopfFile`);
  //       return;
  //     }

  //     //announce in chat
  //     //apiClient.chat.sendAnnouncement(channelID, 143972045, {message: `Peeves erscheint! xicanmAaaaaah`});
  //     chatClient.announce(channel, `Und den Gegenstände-Lostopf gewonnen hat:`);
  //     mythicAnnouncement(chatClient, channel, mysticWords, "", `@${winner[0]}! xicanmHyped Gratulation!`);
  //     logger(`!huhnwartsverlosung gegenstände: ${winner[0]} [${winner[1]}]`);        
  //   } else if(args[0].toLowerCase() == "achievements") {
  //     //read all user IDs
  //     const allUserIDs: number[] | false = await Huhnwarts2023Helper.getAllUserIDs();
  //     //ERROR
  //     if(allUserIDs == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartsverlosung: ERROR! allUserIDs`);
  //       return;
  //     }

  //     //get achievemts amount
  //     const achievementAmount: number | false = await Huhnwarts2023Helper.getAchievementsAmount();
  //     //ERROR
  //     if(achievementAmount == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartsverlosung: ERROR! achievementAmount`);
  //       return;
  //     }

  //     //read lostopf file
  //     const lostopfFile: Huhnwarts2023LostopfFile | false = await Huhnwarts2023Helper.readWinnerFile("achievements");
  //     //ERROR
  //     if(lostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! lostopfFile`);
  //       return;
  //     }

  //     let lostopf: [string, number][] = [];
  //     for(const userID of allUserIDs) {
  //       //read all user object files
  //       const userAchievementFiles: HuhnwartsUserAchievementsFile[] | false | null = await Huhnwarts2023Helper.readUserAchievementsFiles(userID);
  //       //ERROR
  //       if(userAchievementFiles == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!huhnwartslostopf: ERROR! userAchievementFiles`);
  //         return;
  //       }
  //       //user has no achievements
  //       if(userAchievementFiles == null) {
  //         continue;
  //       }
        
  //       const userFile: HuhnwartsUserFile | false | null = await Huhnwarts2023Helper.readUserFile(userID);
  //       //ERROR
  //       if(userFile == false) {
  //         chatClient.say(channel, `something went wrong...`);
  //         logger(`!huhnwartslostopf: ERROR! readUserFile [${userID}]`);
  //         return;
  //       }
  //       //user does not exist | should never happen
  //       if(userFile == null) {
  //         logger(`!huhnwartslostopf: ERROR! no userFile [${userID}]`);
  //         return;
  //       }

  //       if(userAchievementFiles.length == achievementAmount && !lostopfFile.winners.includes(userFile.name)) lostopf.push([userFile.name, userAchievementFiles.length]);
  //     }

  //     //no one qualified
  //     if(lostopf.length == 0) {
  //       chatClient.say(channel, `@${user}, es hat sich leider niemand für diesen Lostopf qualifiziert...`);
  //       logger(`!huhwartslostopf ${args[0]}: no one qualified`);
  //       return;
  //     }

  //     //pick winner//
  //     const winner: [string, number] = pickRandom(lostopf);
  //     lostopfFile.winners.push(winner[0]);

  //     //write lostopf file
  //     const writeLostopfFile: boolean = await Huhnwarts2023Helper.writeWinnerFile(lostopfFile);
  //     //ERROR
  //     if(writeLostopfFile == false) {
  //       chatClient.say(channel, `something went wrong...`);
  //       logger(`!huhnwartslostopf: ERROR! writeLostopfFile`);
  //       return;
  //     }

  //     //announce in chat
  //     //apiClient.chat.sendAnnouncement(channelID, 143972045, {message: `Peeves erscheint! xicanmAaaaaah`});
  //     chatClient.announce(channel, `Und den Achievements-Lostopf gewonnen hat:`);
  //     mythicAnnouncement(chatClient, channel, mysticWords, "", `@${winner[0]}! xicanmHyped Gratulation!`);
  //     logger(`!huhnwartsverlosung achievements: ${winner[0]} [${winner[1]}]`);      
  //   } else {
  //     chatClient.say(channel, `@${user}, bitte gib einen gültigen Lostopf an. ["tauschen", "karten", "gegenstände", "achievements"]`);
  //     logger(`!huhnwartsverlosung: invalid Lostopf [${user}]`);
  //   } 
    
  // });
  // //#endregion Verlosungen

  // //#region Homepage
  // commandHandler.addCommand("spielstand", true, 0, 0, async ({channel, user, msg}) => {
  //   const userId: number = Number(msg.userInfo.userId);

  //   //read user file//
  //   let userFile: userFileReadout = await Huhnwarts2023Helper.readUserFile(userId);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!spielstand: ERROR! readUserFile [${user}]`);
  //     return;
  //   }
  //   //new User
  //   if(userFile == null) userFile = await Huhnwarts2023Helper.newUser(userId, apiClient);
  //   //ERROR
  //   if(userFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!spielstand: ERROR! newUser [${user}]`);
  //     return;
  //   }

  //   //user already has a house//
  //   if(userFile.HausID != 0) {
  //     chatClient.say(channel, 'Deinen Spielstand findest du unter https://chatspiel.xicanmeow.de/user/' + userFile.name + " | Tipp: Am besten speicherst du dir deine Seite als Lesezeichen." )
  //   } else {
  //     chatClient.say(channel, 'Du musst zuerst ein Haus auswählen, bevor du deinen Spielstand anschauen kannst.');
  //   }

  //   //write user file//
  //   const writeFile: boolean = await Huhnwarts2023Helper.writeUserFile(userFile);
  //   //ERROR
  //   if(writeFile == false) {
  //     chatClient.say(channel, `something went wrong...`);
  //     logger(`!spielstand: ERROR! writeUserFile`);
  //     return;
  //   }
  // });

  // //#endregion Homepage
  
  // //#endregion Hogwarts Legacy

  //!whoopsie
  let whoopsieCooldown: boolean = false;
  chatClient.onMessage(async (channel, user, message, msg) => {
    if ((msg.userInfo.isBroadcaster || msg.userInfo.isMod) && message.split(' ')[0] == '!whoopsie') {
      if (whoopsieCooldown) return;
      logger('readFile ./JSON/whoopsie.json');
      const whoopsieTime: number = JSON.parse(await fs.promises.readFile('./JSON/whoopsie.json', 'utf8'));

      const now: number = Date.now();
      const timeDifference: number[] = msToTime(now - whoopsieTime);
      const days: number = Math.floor(timeDifference[0] / 24);
      const tageText: string = days == 1 ? 'Tag' : 'Tage';
      const stundenText: string = timeDifference[0] % 24 == 1 ? 'Stunde' : 'Stunden';
      const minuteneText: string = timeDifference[1] == 1 ? 'Minute' : 'Minuten';
      const sekundenText: string = timeDifference[2] == 1 ? 'Sekunde' : 'Sekunden';
      const message: string = pickRandom([
        `Iken hat es ${days} ${tageText}, ${timeDifference[0] % 24} ${stundenText}, ${
          timeDifference[1]
        } ${minuteneText} und ${timeDifference[2]} ${sekundenText} ohne ein Whoopsie geschaft. Kappa`,
        `Dieser Chat war Whoopsie frei für ${days} ${tageText}, ${timeDifference[0] % 24} ${stundenText}, ${
          timeDifference[1]
        } ${minuteneText} und ${timeDifference[2]} ${sekundenText}. Kappa`,
        `Schon wieder Iken?! Das waren grade mal ${days} ${tageText}, ${timeDifference[0] % 24} ${stundenText}, ${
          timeDifference[1]
        } ${minuteneText} und ${timeDifference[2]} ${sekundenText} ohne ein Whoopsie. Kappa`,
      ]);
      chatClient.say(channel, message);

      logger('writeFile ./JSON/whoopsie.json');
      await fs.promises.writeFile('./JSON/whoopsie.json', JSON.stringify(now, null, 4), 'utf8');
      whoopsieCooldown = true;
      setTimeout(() => {
        whoopsieCooldown = false;
      }, 3000);
    }
  });

  // commandHandler.addCommand(["test"], true, 3, 0, async({}) => {

  // });

  //whisper response | DOES NOT WORK DUE TO TWITCH
  chatClient.onWhisper(async (user) => {
    await chatClient.whisper(user, 'Bleep bloop ich bin ein Bot. Bitte schreibe einen der menschlichen !mods an. <3');
  });

  // connection
  await chatClient.connect();
  if (chatClient.isConnected) {
    setTimeout(function () {
      chatClient.action(channel, 'EiRohBot online.');
      console.log(`chat greeted`);
    }, 3000);
  }

  // const onlineSubscription = await listener.subscribeToStreamOnlineEvents(
  //   channelID,
  //   async (e) => {
  //     logger(`xicanmeow just went online`);
  //     try {
  //       await chatClient.disableEmoteOnly(channel);
  //     } catch (error) {
  //       logger(`INFO: emoteOnly allready off`);
  //     }
  //     try {
  //       await chatClient.disableSubsOnly(channel);
  //     } catch (error) {
  //       logger(`INFO: subOnly allready off`);
  //     }
  //     // const today: Date = new Date();
  //     // subtember21.time.startingTime = today.getTime();
  //   }
  // );
  // const offlineSubscription = await listener.subscribeToStreamOfflineEvents(
  //   channelID,
  //   async (e) => {
  //     logger(`xicanmeow just went offline`);
  //     try {
  //       await chatClient.enableEmoteOnly(channel);
  //     } catch (error) {
  //       logger(`INFO: emoteOnly allready on`);
  //     }
  //     try {
  //       await chatClient.enableSubsOnly(channel);
  //     } catch (error) {
  //       logger(`INFO: subOnly allready on`);
  //     }
  //     reset();
  //   }
  // );

  // appApiClient.eventSub.deleteAllSubscriptions();
  // await listener.listen();
  // setTimeout(async function () {
  //   logger(`ngrok needs restart in 30min`);
  // }, 5400000); //1:30h: 5400000
  // setTimeout(async function () {
  //   logger(`ngrok needs restart`);
  // }, 7200000);

  // const banList: string[] = [];
  // const banEvent = banList.map(async (ban) => {
  //   try {
  //     await chatClient.ban(channel, ban, "Suspected Bot Account");
  //   } catch {
  //     logger(`${ban} allready banned.`);
  //   }
  // });
}

main();
