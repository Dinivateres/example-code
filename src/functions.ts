import { HelixChatChatter } from '@twurple/api/lib/api/helix/chat/HelixChatChatter';
import { HelixPaginatedResultWithTotal } from '@twurple/api/lib/api/helix/HelixPaginatedResult';
import { ApiClient } from '@twurple/api/lib/ApiClient';
import { ChatClient } from '@twurple/chat';
import { UserIdResolvable } from '@twurple/common/lib';
import { format } from 'date-fns';
import fs from 'fs';
import { ELogLevel } from './types/ELogLevel';

/**
 * Logs text in terminal with timestamp
 * @param text The text to be logged
 */
export function logger(text: string, logLevel?: ELogLevel) {
  // INFO is one character shorter than ERROR or DEBUG therefor add a space at the beginning for INFO
  const level = logLevel ?? ' ' + ELogLevel.INFO;
  console.log(`[${format(new Date(), 'dd.MM.yyyy HH:mm:ss')} ${level}] ${text}`);
}

/**
 * The maximum is exclusive and the minimum is inclusive
 * @param min number, inclusive
 * @param max number, exclusive
 */
export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

/**
 * pauses code execution
 * @param milliseconds
 * @deprecate Do not use. Use setTimeout() instead for non blocking wait
 */
export function sleep(milliseconds: number) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

export class Timer {
  chatClient: ChatClient;
  channel: string;
  timerStatus: boolean;
  timers: NodeJS.Timeout[] = [];
  start: number = 0;
  length: number = 0;

  constructor(chatClient: ChatClient, channel: string) {
    this.chatClient = chatClient;
    this.channel = channel;
    this.timerStatus = false;
  }

  /**
   *
   * @param duration duration in milliseconds
   * @param text timer text
   */
  an(duration: number, text: string[] = ['TIME']) {
    this.start = Date.now();
    this.length = duration;
    var interval: number = this.length / 4;

    var minutes: number = Math.floor(this.length / 60000);
    var seconds: number = Math.floor((this.length - minutes * 60000) / 1000);
    var minText: string = 'Minuten';
    if (minutes == 1) minText = 'Minute';
    var secText: string = 'Sekunden';
    if (seconds == 1) secText = 'Sekunde';

    var text1: string = text.slice(0, text.indexOf('TIME')).join(' ');
    var text2: string = text.slice(text.indexOf('TIME') + 1).join(' ');

    this.chatClient.action(
      this.channel,
      `Timer gesetzt. ${text1} ${minutes} ${minText} und ${seconds} ${secText} ${text2}`
    );
    this.timerStatus = true;
    logger(`timer set`);

    const timerFunction = (timerNumber: number) => {
      var timeLeft: number = (this.length - timerNumber * interval) / 60000;
      var minutes: number = Math.floor(timeLeft);
      var minText: string = 'Minuten';
      if (minutes == 1) minText = 'Minute';
      var seconds: number = Math.floor((timeLeft % 1) * 60);
      var secText: string = 'Sekunden';
      if (seconds == 1) secText = 'Sekunde';

      if (timerNumber == 4) {
        this.chatClient.action(this.channel, `HALT, STOP! Die Zeit ist um!`);
        this.timerStatus = false;
      } else {
        if (minutes > 0) {
          this.chatClient.action(this.channel, `${text1} ${minutes} ${minText} und ${seconds} ${secText} ${text2}`);
        } else {
          this.chatClient.action(this.channel, `${text1} ${seconds} ${secText} ${text2}`);
        }
      }
    };
    const timer1 = setTimeout(function () {
      timerFunction(1);
    }, interval * 1);
    const timer2 = setTimeout(function () {
      timerFunction(2);
    }, interval * 2);
    const timer3 = setTimeout(function () {
      timerFunction(3);
    }, interval * 3);
    const timer4 = setTimeout(function () {
      timerFunction(4);
    }, interval * 4);
    this.timers = [timer1, timer2, timer3, timer4];
    if (interval >= 1000 * 15) {
      const timer10sec = setTimeout(() => {
        timerFunction((this.length - 10000) / interval);
      }, this.length - 10000);
      this.timers.push(timer10sec);
    }
    if (interval >= 1000 * 45) {
      const timer30sec = setTimeout(() => {
        timerFunction((this.length - 30000) / interval);
      }, this.length - 30000);
      this.timers.push(timer30sec);
    }
    if (interval >= 1000 * 60 * 1.5) {
      const timer1min = setTimeout(() => {
        timerFunction((this.length - 60000) / interval);
      }, this.length - 60000);
      this.timers.push(timer1min);
    }
    if (interval >= 1000 * 60 * 7.5) {
      const timer5min = setTimeout(() => {
        timerFunction((this.length - 300000) / interval);
      }, this.length - 300000);
      this.timers.push(timer5min);
    }
    if (interval >= 1000 * 60 * 15) {
      const timer10min = setTimeout(() => {
        timerFunction((this.length - 600000) / interval);
      }, this.length - 600000);
      this.timers.push(timer10min);
    }
  }

  aus() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timerStatus = false;
    this.chatClient.say(this.channel, `Der Timer wurde ausgestellt.`);
  }
}

export class Verlosung {
  chatClient: ChatClient;
  channel: string;
  timerStatus: boolean;
  timers: NodeJS.Timeout[] = [];
  start: number = 0;
  length: number = 0;
  participants: string[] = [];
  winnerAmount: number = 1;
  text: string = 'etwas, das die Mods nicht weiter spezifiziert haben. Kappa ';
  mysticWords: string[];

  constructor(chatClient: ChatClient, channel: string, mysticWords: string[]) {
    this.chatClient = chatClient;
    this.channel = channel;
    this.mysticWords = mysticWords;
    this.timerStatus = false;
  }

  /**
   *
   * @param duration duration in milliseconds
   * @param text verlosungs text
   * @param winners max number of winners
   */
  an(duration: number, text: string, winnerAmount: number) {
    if (text == '') text = 'etwas, das die Mods nicht weiter spezifiziert haben. Kappa ';
    this.text = text;
    this.start = Date.now();
    this.length = duration;
    var interval: number = this.length / 4;

    var minutes: number = Math.floor(this.length / 60000);
    var minText: string = 'Minuten';
    if (minutes == 1) minText = 'Minute';

    this.chatClient.action(
      this.channel,
      `Eine neue Verlosung hat begonnen! Zu gewinnen gibt es ${text}! Du hast ${minutes} ${minText} um mit !join bei der Verlosung teilzunehmen. Viel Glück!`
    );
    this.timerStatus = true;

    const timerFunction = (timerNumber: number) => {
      var timeLeft: number = (this.length - timerNumber * interval) / 60000;
      var minutes: string = Math.floor(timeLeft) < 10 ? `0${Math.floor(timeLeft)}` : `${Math.floor(timeLeft)}`;
      var seconds: string =
        Math.floor((timeLeft % 1) * 60) < 10
          ? `0${Math.floor((timeLeft % 1) * 60)}`
          : `${Math.floor((timeLeft % 1) * 60)}`;

      if (timerNumber == 4) {
        winnerAmount > this.participants.length ? (winnerAmount = this.participants.length) : true;
        if (winnerAmount == 0) {
          this.chatClient.say(this.channel, `Leider hat niemand teilgenommen... :(`);
          logger(`Verlosung beendet [keine Teilnehmer:innen]`);
          this.timerStatus = false;
          this.participants = [];
          return;
        }
        var winners: string[] = [];
        for (var i: number = 0; i < winnerAmount; i++) {
          var winner: string = this.participants[Math.floor(Math.random() * this.participants.length)];
          while (winners.includes(winner)) {
            winner = this.participants[Math.floor(Math.random() * this.participants.length)];
          }
          winners.push(winner);
        }

        if (winnerAmount == 1) {
          this.chatClient.action(this.channel, `Die Verlosung für ${text} ist vorbei. Und gewonnen hat...`);
        } else {
          this.chatClient.action(this.channel, `Die Verlosung für ${text} ist vorbei. Und gewonnen haben...`);
        }

        const mysticWords_1: string = this.mysticWords[Math.floor(Math.random() * this.mysticWords.length)];
        var mysticWords_2: string = this.mysticWords[Math.floor(Math.random() * this.mysticWords.length)];
        while (mysticWords_1 == mysticWords_2) {
          mysticWords_2 = this.mysticWords[Math.floor(Math.random() * this.mysticWords.length)];
        }
        setTimeout(() => {
          this.chatClient.action(this.channel, mysticWords_1);
        }, 1000);
        setTimeout(() => {
          this.chatClient.action(this.channel, mysticWords_2);
        }, 4000);
        setTimeout(() => {
          if (winnerAmount == 1) {
            this.chatClient.action(this.channel, `${winners[0]}! Gratulation!`);
          } else {
            var output: string = winners.slice(0, -1).join(', ');
            output = output + ' und ' + winners[winners.length - 1];
            this.chatClient.action(this.channel, `${output}! Gratulation!`);
          }
          this.timerStatus = false;
          logger(`Verlosung beendet [${winners}]`);
        }, 10000);
        this.timerStatus = false;
        this.participants = [];
      } else {
        this.chatClient.action(
          this.channel,
          `Die Verlosung für ${text} läuft. Du hast noch ${minutes}:${seconds} Minuten Zeit um !join in den Chat zu hämmern!`
        );
      }
    };
    const timer1 = setTimeout(function () {
      timerFunction(1);
    }, interval * 1);
    const timer2 = setTimeout(function () {
      timerFunction(2);
    }, interval * 2);
    const timer3 = setTimeout(function () {
      timerFunction(3);
    }, interval * 3);
    const timer4 = setTimeout(function () {
      timerFunction(4);
    }, interval * 4);
    this.timers = [timer1, timer2, timer3, timer4];
    if (interval >= 1000 * 15) {
      const timer10sec = setTimeout(() => {
        timerFunction((this.length - 10000) / interval);
      }, this.length - 10000);
      this.timers.push(timer10sec);
    }
    if (interval >= 1000 * 45) {
      const timer30sec = setTimeout(() => {
        timerFunction((this.length - 30000) / interval);
      }, this.length - 30000);
      this.timers.push(timer30sec);
    }
    if (interval >= 1000 * 60 * 1.5) {
      const timer1min = setTimeout(() => {
        timerFunction((this.length - 60000) / interval);
      }, this.length - 60000);
      this.timers.push(timer1min);
    }
    if (interval >= 1000 * 60 * 7.5) {
      const timer5min = setTimeout(() => {
        timerFunction((this.length - 300000) / interval);
      }, this.length - 300000);
      this.timers.push(timer5min);
    }
    if (interval >= 1000 * 60 * 15) {
      const timer10min = setTimeout(() => {
        timerFunction((this.length - 600000) / interval);
      }, this.length - 600000);
      this.timers.push(timer10min);
    }
  }

  aus() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timerStatus = false;
    this.participants = [];
    this.chatClient.say(this.channel, `Die Verlosung wurde abgebrochen.`);
  }

  join(user: string) {
    if (!this.participants.includes(`@` + user)) {
      this.participants.push(`@` + user);
      logger(`!join @${user}`);
    }
  }
}

/**
 * returns the size of an object
 * @param obj
 */
export function size(obj: Object) {
  var size = 0,
    key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
}

/**
 * capitalizes the first letter of a string
 * @param string
 */
export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * updates the highscore for !schubsen
 * @param highscoresID ID:s of the user:s getting their highscore updated
 * @param chatClient
 * @param schubsListe
 */
export async function highscore(
  highscoreIDs: string[],
  chatClient: ChatClient,
  schubsListe: {
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
  }
) {
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
  } = JSON.parse(await fs.promises.readFile('./highscores.json', 'utf8'));

  if (highscoreIDs.length == 0) return;

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
  const day: string = String(today.getDate());
  const monthNumber: string = String(today.getMonth() + 1);
  const monthName: string = monthNames[today.getMonth()];
  const year: string = String(today.getFullYear());
  const monthNameCurrent: string = monthName.concat('_', year, '_current').toLowerCase();
  const monthNameMax: string = monthName.concat('_', year, '_max').toLowerCase();
  const dateFull: string = day.concat('.', monthNumber, '.', year);

  for (var i: number = 0; i < highscoreIDs.length; i++) {
    const userScore: number =
      schubsListe.index[highscoreIDs[i]].inventar.length + schubsListe.index[highscoreIDs[i]].safe.length;
    const userName: string = schubsListe.index[highscoreIDs[i]].userName;

    //#region Global Highscore
    // ------------------------------- Global Highscore -------------------------------
    if (
      (userScore == highscores.globalScores.maxOwned[1].score &&
        userName == highscores.globalScores.maxOwned[1].name) ||
      (userScore < highscores.globalScores.maxOwned[1].score &&
        userScore >= highscores.globalScores.maxOwned[2].score &&
        userName == highscores.globalScores.maxOwned[1].name)
    ) {
      //User ist bereits Platz 1 mit diesem Wert oder immer noch besser als Platz 2-> Do nothing
    } else if (userScore > highscores.globalScores.maxOwned[1].score) {
      //User ist neuer Platz 1
      if (userName == highscores.globalScores.maxOwned[1].name) {
        //User ist bereits Platz 1
        highscores.globalScores.maxOwned[1].score = userScore;
        highscores.globalScores.maxOwned[1].date = dateFull;
      } else if (userName == highscores.globalScores.maxOwned[2].name) {
        //User ist derzeit Platz 2
        highscores.globalScores.maxOwned[2] = highscores.globalScores.maxOwned[1];
        highscores.globalScores.maxOwned[1] = {
          name: userName,
          score: userScore,
          date: dateFull,
        };
      } else {
        //User ist derzeit Platz 3 oder neu
        highscores.globalScores.maxOwned[2] = highscores.globalScores.maxOwned[1];
        highscores.globalScores.maxOwned[3] = highscores.globalScores.maxOwned[2];
        highscores.globalScores.maxOwned[1] = {
          name: userName,
          score: userScore,
          date: dateFull,
        };
      }
    } else if (
      (userScore == highscores.globalScores.maxOwned[2].score &&
        userName == highscores.globalScores.maxOwned[2].name) ||
      (userScore < highscores.globalScores.maxOwned[2].score &&
        userScore >= highscores.globalScores.maxOwned[3].score &&
        userName == highscores.globalScores.maxOwned[2].name)
    ) {
      //User ist bereits Platz 2 mit diesem Wert oder immer noch besser als Platz 3 -> Do nothing
    } else if (userScore > highscores.globalScores.maxOwned[2].score) {
      //User ist neuer Platz 2
      if (userName == highscores.globalScores.maxOwned[2].name) {
        //User ist bereits Platz 2
        if (userScore > highscores.globalScores.maxOwned[2].score) {
          highscores.globalScores.maxOwned[2].score = userScore;
          highscores.globalScores.maxOwned[2].date = dateFull;
        }
      } else {
        //User ist derzeit Platz 3 oder neu
        highscores.globalScores.maxOwned[3] = highscores.globalScores.maxOwned[2];
        highscores.globalScores.maxOwned[2] = {
          name: userName,
          score: userScore,
          date: dateFull,
        };
      }
    } else if (
      userScore == highscores.globalScores.maxOwned[3].score &&
      userName == highscores.globalScores.maxOwned[3].name
    ) {
      //User ist bereits Platz 3 mit diesem Wert -> Do nothing
    } else if (userScore > highscores.globalScores.maxOwned[3].score) {
      //User ist neuer Platz 3
      if (userName == highscores.globalScores.maxOwned[3].name) {
        //User ist bereits Platz 3
        if (userScore > highscores.globalScores.maxOwned[3].score) {
          highscores.globalScores.maxOwned[3].score = userScore;
          highscores.globalScores.maxOwned[3].date = dateFull;
        }
      } else {
        //User ist neu
        highscores.globalScores.maxOwned[3] = {
          name: userName,
          score: userScore,
          date: dateFull,
        };
      }
    }
    //#endregion Global Highscore
    //#region Monthly Highscore max
    // ------------------------------- Monthly Highscore max -------------------------------
    if (highscores.monthlyScores[monthNameMax] == null) {
      highscores.monthlyScores[monthNameMax] = {
        1: {
          name: '',
          score: 0,
        },
        2: {
          name: '',
          score: 0,
        },
        3: {
          name: '',
          score: 0,
        },
      };
    }
    if (
      (userScore == highscores.monthlyScores[monthNameMax][1].score &&
        userName == highscores.monthlyScores[monthNameMax][1].name) ||
      (userScore < highscores.monthlyScores[monthNameMax][1].score &&
        userScore >= highscores.monthlyScores[monthNameMax][2].score &&
        userName == highscores.monthlyScores[monthNameMax][1].name)
    ) {
      //User ist bereits Platz 1 mit diesem Wert oder immer noch besser als Platz 2 -> Do nothing
    } else if (userScore > highscores.monthlyScores[monthNameMax][1].score) {
      //User ist neuer Platz 1
      if (userName == highscores.monthlyScores[monthNameMax][1].name) {
        //User ist bereits Platz 1
        if (userScore > highscores.monthlyScores[monthNameMax][1].score) {
          highscores.monthlyScores[monthNameMax][1].score = userScore;
        }
      } else if (userName == highscores.monthlyScores[monthNameMax][2].name) {
        //User ist derzeit Platz 2
        highscores.monthlyScores[monthNameMax][2] = highscores.monthlyScores[monthNameMax][1];
        highscores.monthlyScores[monthNameMax][1] = {
          name: userName,
          score: userScore,
        };
      } else {
        //User ist derzeit Platz 3 oder neu
        highscores.monthlyScores[monthNameMax][2] = highscores.monthlyScores[monthNameMax][1];
        highscores.monthlyScores[monthNameMax][3] = highscores.monthlyScores[monthNameMax][2];
        highscores.monthlyScores[monthNameMax][1] = {
          name: userName,
          score: userScore,
        };
      }
    } else if (
      (userScore == highscores.monthlyScores[monthNameMax][2].score &&
        userName == highscores.monthlyScores[monthNameMax][2].name) ||
      (userScore < highscores.monthlyScores[monthNameMax][2].score &&
        userScore >= highscores.monthlyScores[monthNameMax][3].score &&
        userName == highscores.monthlyScores[monthNameMax][2].name)
    ) {
      //User ist bereits Platz 2 mit diesem Wert oder immer noch besser als Platz 3 -> Do nothing
    } else if (userScore > highscores.monthlyScores[monthNameMax][2].score) {
      //User ist neuer Platz 2
      if (userName == highscores.monthlyScores[monthNameMax][2].name) {
        //User ist bereits Platz 2
        if (userScore > highscores.monthlyScores[monthNameMax][2].score) {
          highscores.monthlyScores[monthNameMax][2].score = userScore;
        }
      } else {
        //User ist derzeit Platz 3 oder neu
        highscores.monthlyScores[monthNameMax][3] = highscores.monthlyScores[monthNameMax][2];
        highscores.monthlyScores[monthNameMax][2] = {
          name: userName,
          score: userScore,
        };
      }
    } else if (
      userScore == highscores.monthlyScores[monthNameMax][3].score &&
      userName == highscores.monthlyScores[monthNameMax][3].name
    ) {
      //User ist bereits Platz 3 mit diesem Wert -> Do nothing
    } else if (userScore > highscores.monthlyScores[monthNameMax][3].score) {
      //User ist neuer Platz 3
      if (userName == highscores.monthlyScores[monthNameMax][3].name) {
        //User ist bereits Platz 3
        if (userScore > highscores.monthlyScores[monthNameMax][3].score) {
          highscores.monthlyScores[monthNameMax][3].score = userScore;
        }
      } else {
        //User ist neu
        highscores.monthlyScores[monthNameMax][3] = {
          name: userName,
          score: userScore,
        };
      }
    }
    //#endregion Monthly Highscore max
    //#region Monthly Highscore current
    // ------------------------------- Monthly Highscore current -------------------------------
    if (highscores.monthlyScores[monthNameCurrent] == null) {
      //Fügt neuen Monat ein
      highscores.monthlyScores[monthNameCurrent] = {
        1: {
          name: '',
          score: 0,
        },
        2: {
          name: '',
          score: 0,
        },
        3: {
          name: '',
          score: 0,
        },
      };
    }

    const namePlace1: string = highscores.monthlyScores[monthNameCurrent][1].name;
    const scorePlace1: number = highscores.monthlyScores[monthNameCurrent][1].score;
    const namePlace2: string = highscores.monthlyScores[monthNameCurrent][2].name;
    const scorePlace2: number = highscores.monthlyScores[monthNameCurrent][2].score;
    const namePlace3: string = highscores.monthlyScores[monthNameCurrent][3].name;
    const scorePlace3: number = highscores.monthlyScores[monthNameCurrent][3].score;

    if (userScore > scorePlace3 || userName == namePlace3 || userName == namePlace2 || userName == namePlace1) {
      //User plaziert Top 3 oder ist 3.
      if (userScore > scorePlace1) {
        //User hat neue Platz 1 Score
        if (userName == namePlace1) {
          //User ist bereits Platz 1
          highscores.monthlyScores[monthNameCurrent][1].score = userScore;
        } else if (userName == namePlace2) {
          //User war Platz 2
          highscores.monthlyScores[monthNameCurrent][2].name = namePlace1;
          highscores.monthlyScores[monthNameCurrent][2].score = scorePlace1;
          highscores.monthlyScores[monthNameCurrent][1] = {
            name: userName,
            score: userScore,
          };
          chatClient.action('xicanmeow', `@${userName} ist unser:e neue:r Rucksackbaron:ess! [${userScore} Rucksäcke]`);
        } else {
          //User war Platz 3 oder ist neu
          highscores.monthlyScores[monthNameCurrent][3].name = namePlace2;
          highscores.monthlyScores[monthNameCurrent][3].score = scorePlace2;
          highscores.monthlyScores[monthNameCurrent][2].name = namePlace1;
          highscores.monthlyScores[monthNameCurrent][2].score = scorePlace1;
          highscores.monthlyScores[monthNameCurrent][1] = {
            name: userName,
            score: userScore,
          };
          chatClient.action('xicanmeow', `@${userName} ist unser:e neue:r Rucksackbaron:ess! [${userScore} Rucksäcke]`);
        }
      } else if (userScore >= scorePlace2 && userName == namePlace1) {
        //User ist Platz 1, hat aber Rucksäcke verloren
        highscores.monthlyScores[monthNameCurrent][1].score = userScore;
      } else if (userScore > scorePlace2) {
        //User ist neu Platz 2
        if (userName == namePlace1) {
          //User war Platz 1
          highscores.monthlyScores[monthNameCurrent][1].name = namePlace2;
          highscores.monthlyScores[monthNameCurrent][1].score = scorePlace2;
          highscores.monthlyScores[monthNameCurrent][3] = {
            name: userName,
            score: userScore,
          };
        } else if (userName == namePlace2) {
          //User war bereits Platz 2
          highscores.monthlyScores[monthNameCurrent][2].score = userScore;
        } else {
          //User war Platz 3 oder ist neu
          highscores.monthlyScores[monthNameCurrent][3].name = namePlace2;
          highscores.monthlyScores[monthNameCurrent][3].score = scorePlace2;
          highscores.monthlyScores[monthNameCurrent][2] = {
            name: userName,
            score: userScore,
          };
        }
      } else if (userScore >= scorePlace3 && userName == namePlace2) {
        //User ist Platz 2, hat aber Rucksäcke verloren
        highscores.monthlyScores[monthNameCurrent][2].score = userScore;
      } else if (userScore > scorePlace3) {
        //User ist neu Platz 3
        if (userName == namePlace1) {
          //User war Platz 1
          highscores.monthlyScores[monthNameCurrent][1].name = namePlace2;
          highscores.monthlyScores[monthNameCurrent][1].score = scorePlace2;
          highscores.monthlyScores[monthNameCurrent][2].name = namePlace3;
          highscores.monthlyScores[monthNameCurrent][2].score = scorePlace3;
          highscores.monthlyScores[monthNameCurrent][3] = {
            name: userName,
            score: userScore,
          };
        } else if (userName == namePlace2) {
          //User war Platz 2
          highscores.monthlyScores[monthNameCurrent][2].name = namePlace3;
          highscores.monthlyScores[monthNameCurrent][2].score = scorePlace3;
          highscores.monthlyScores[monthNameCurrent][3] = {
            name: userName,
            score: userScore,
          };
        } else if (userName == namePlace3) {
          //User war bereits Platz 3
          highscores.monthlyScores[monthNameCurrent][3].score = userScore;
        } else {
          //User ist neu
          highscores.monthlyScores[monthNameCurrent][3] = {
            name: userName,
            score: userScore,
          };
        }
      } else {
        //User war bereits Platz 1,2, oder 3, aber jetzt weniger als 3
        if (userName == namePlace1) {
          //User war Platz 1
          highscores.monthlyScores[monthNameCurrent][1].name = namePlace2;
          highscores.monthlyScores[monthNameCurrent][1].score = scorePlace2;
          highscores.monthlyScores[monthNameCurrent][2].name = namePlace3;
          highscores.monthlyScores[monthNameCurrent][2].score = scorePlace3;
          highscores.monthlyScores[monthNameCurrent][3] = {
            name: userName,
            score: userScore,
          };
        } else if (userName == namePlace2) {
          //User war Platz 2
          highscores.monthlyScores[monthNameCurrent][2].name = namePlace3;
          highscores.monthlyScores[monthNameCurrent][2].score = scorePlace3;
          highscores.monthlyScores[monthNameCurrent][3] = {
            name: userName,
            score: userScore,
          };
        } else {
          //User war Platz 3
          highscores.monthlyScores[monthNameCurrent][3].score = userScore;
        }
      }
    }
    //#endregion Monthly Highscore current
  }

  await fs.promises.writeFile('./highscores.json', JSON.stringify(highscores, null, 4), 'utf8');
  logger('highscores upgedatet');
}

/**
 * sets achievements for !schubsen
 * @param achievementsID ID of the user who gets the achievement
 * @param achievementsName name of the user who gets the achievement
 * @param action name of the achievement to update
 * @param chatClient
 * @param schubsListe
 */
export async function achievementsFunction(
  achievementsID: string,
  achievementsName: string,
  action: string,
  chatClient: ChatClient,
  schubsListe: {
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
  },
  item?: string
) {
  var achievements: {
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
  } = JSON.parse(await fs.promises.readFile('./achievements.json', 'utf8'));

  if (achievements.index[achievementsID] == null) {
    //user noch nicht vorhanden
    achievements.index[achievementsID] = {
      userName: achievementsName,
      achievements: [],
      legendaryItemsOwned: [],
      bananaSuccess: 0,
      oilcannsUsed: 0,
      giftedBackpacks: 0,
    };
  }

  switch (action) {
    case 'Klohocker:in':
      if (achievements.index[achievementsID].achievements.includes(action)) break;
      achievements.index[achievementsID].achievements.push(action); //fügt Achievement hinzu
      chatClient.say('xicanmeow', `Oh oh. Der war wohl nicht mehr ganz frisch...`);
      chatClient.action(
        'xicanmeow',
        `Gratulation @${achievementsName}! Du hast folgendes Achievement erhalten: ${action}`
      );
      logger(`Achievement ${action} by user ${achievementsName}`);
      break;
    case 'Affenkönig:in':
      achievements.index[achievementsID].bananaSuccess += 1;
      if (achievements.index[achievementsID].achievements.includes(action)) break;
      if (achievements.index[achievementsID].bananaSuccess >= 10) {
        achievements.index[achievementsID].achievements.push(action); //fügt Achievement hinzu
        chatClient.action(
          'xicanmeow',
          `Gratulation @${achievementsName}! Du hast folgendes Achievement erhalten: ${action}`
        );
        logger(`Achievement ${action} by user ${achievementsName}`);
      }
      break;
    case 'Ölbaron:ess':
      achievements.index[achievementsID].oilcannsUsed += 1;
      if (achievements.index[achievementsID].achievements.includes(action)) break;
      if (achievements.index[achievementsID].oilcannsUsed >= 5) {
        achievements.index[achievementsID].achievements.push(action); //fügt Achievement hinzu
        chatClient.action(
          'xicanmeow',
          `Gratulation @${achievementsName}! Du hast folgendes Achievement erhalten: ${action}`
        );
        logger(`Achievement ${action} by user ${achievementsName}`);
      }
      break;
    case 'Bananen Slider':
      if (achievements.index[achievementsID].achievements.includes(action)) break;
      achievements.index[achievementsID].achievements.push(action); //fügt Achievement hinzu
      chatClient.action(
        'xicanmeow',
        `Gratulation @${achievementsName}! Du hast folgendes Achievement erhalten: ${action}`
      );
      logger(`Achievement ${action} by user ${achievementsName}`);
      break;
    case 'Grosshändler:in':
      if (achievements.index[achievementsID].achievements.includes(action)) break;
      const backpackCount: number =
        schubsListe.index[achievementsID].inventar.length + schubsListe.index[achievementsID].safe.length;
      if (backpackCount >= 20) {
        achievements.index[achievementsID].achievements.push(action); //fügt Achievement hinzu
        chatClient.action(
          'xicanmeow',
          `Gratulation @${achievementsName}! Du hast folgendes Achievement erhalten: ${action}`
        );
        logger(`Achievement ${action} by user ${achievementsName}`);
      }
      break;
    case 'Masterlooter:in':
      if (achievements.index[achievementsID].achievements.includes(action)) break;
      if (achievements.index[achievementsID].legendaryItemsOwned.includes(item!)) {
        // hatte das Item schon einmal
        break;
      } else {
        achievements.index[achievementsID].legendaryItemsOwned.push(item!);
        if (achievements.index[achievementsID].legendaryItemsOwned.length == 6) {
          // derzeit 6 legendäre Items
          achievements.index[achievementsID].achievements.push(action); //fügt Achievement hinzu
          chatClient.action(
            'xicanmeow',
            `Gratulation @${achievementsName}! Du hast folgendes Achievement erhalten: ${action}`
          );
          logger(`Achievement ${action} by user ${achievementsName}`);
        }
      }
      break;
    case 'Gönner:in':
      if (achievements.index[achievementsID].achievements.includes(action)) break;
      const giftNumber: number = (achievements.index[achievementsID].giftedBackpacks += 1);
      if (giftNumber == 20) {
        achievements.index[achievementsID].achievements.push(action); //fügt Achievement hinzu
        chatClient.action(
          'xicanmeow',
          `Gratulation @${achievementsName}! Du hast folgendes Achievement erhalten: ${action}`
        );
        logger(`Achievement ${action} by user ${achievementsName}`);
      }
      break;
    default:
      logger(`Wrong action: ${action}.`, ELogLevel.ERROR);
  }

  await fs.promises.writeFile('./achievements.json', JSON.stringify(achievements, null, 4), 'utf8');
  logger('achievements upgedatet');
}

/**
 * replaces a character in a string at a given index
 * @param str
 * @param index
 * @param chr
 */
export function replaceAt(str: string, index: number, chr: string) {
  if (index > str.length - 1) return str;
  return str.substring(0, index) + chr + str.substring(index + 1);
}

/**
 * returns all possible ordered combinations of a set
 * @param chars the set of characters to check
 */
export function getCombinations(chars: string[]) {
  var result: string[] = [];
  var f = function (prefix: string, chars: string[]) {
    for (var i = 0; i < chars.length; i++) {
      result.push(prefix + chars[i]);
      f(prefix + chars[i], chars.slice(i + 1));
    }
  };
  f('', chars);
  return result;
}

/**
 * Sends a multi-message to a channel.
 *
 * @param channel The channel to send the message to.
 * @param splitPoint The symbol upon which to split
 * @param message The message to send.
 */
export function multiSay(channel: string, chatClient: ChatClient, splitPoint: string, message: string) {
  var spaceIndexes: number[] = [];
  for (var i = 0; i < message.length; i++) {
    if (message[i] == splitPoint) spaceIndexes.push(i);
  }
  // console.log(`spaceIndexes: ${spaceIndexes}`);

  var splitPoints: number[] = [0];
  var messages: number = 1;
  for (var i = 0; i < spaceIndexes.length; i++) {
    if (spaceIndexes[i] >= splitPoints[messages - 1] + 450) {
      // console.log(`spaceIndexes[i]: ${spaceIndexes[i]}`);
      // console.log(`splitpoints[messages-1]: ${splitPoints[messages - 1]}`);
      splitPoints.push(spaceIndexes[i - 1] + 1);
      messages++;
    }
  }

  // console.log(`messages: ${messages}`);
  // console.log(`splitPoints: ${splitPoints}`);
  for (var i = 1; i <= messages; i++) {
    // console.log(`splitPoints: ${splitPoints[i - 1]}`);
    // console.log(`splitPoints: ${splitPoints[i]}`);
    chatClient.say(channel, message.slice(splitPoints[i - 1], splitPoints[i]));
  }
}

/**
 * Sends a multi-message to a channel.
 *
 * @param channel The channel to send the message to.
 * @param splitPoint The symbol upon which to split
 * @param message The message to send.
 */
export function multiAction(channel: string, chatClient: ChatClient, splitPoint: string, message: string) {
  var spaceIndexes: number[] = [];
  for (var i = 0; i < message.length; i++) {
    if (message[i] == splitPoint) spaceIndexes.push(i);
  }
  // console.log(`spaceIndexes: ${spaceIndexes}`);

  var splitPoints: number[] = [0];
  var messages: number = 1;
  for (var i = 0; i < spaceIndexes.length; i++) {
    if (spaceIndexes[i] >= splitPoints[messages - 1] + 450) {
      // console.log(`spaceIndexes[i]: ${spaceIndexes[i]}`);
      // console.log(`splitpoints[messages-1]: ${splitPoints[messages - 1]}`);
      splitPoints.push(spaceIndexes[i - 1] + 1);
      messages++;
    }
  }

  // console.log(`messages: ${messages}`);
  // console.log(`splitPoints: ${splitPoints}`);
  for (var i = 1; i <= messages; i++) {
    // console.log(`splitPoints: ${splitPoints[i - 1]}`);
    // console.log(`splitPoints: ${splitPoints[i]}`);
    chatClient.action(channel, message.slice(splitPoints[i - 1], splitPoints[i]));
  }
}

/**
 * converts ms to [hours, minutes, seconds]
 * @param ms milliseconds [number]
 */
export function msToTime(ms: number) {
  const hours: number = Math.floor(ms / (1000 * 60 * 60));
  const minutes: number = Math.floor((ms - hours * (60 * 60 * 1000)) / (1000 * 60));
  const seconds: number = Math.floor((ms - hours * (60 * 60 * 1000) - minutes * (60 * 1000)) / 1000);
  return [hours, minutes, seconds];
}

/**
 *
 * @param ms converts ms to string with format hh:mm:ss
 * @returns string hh:mm:ss
 */
export function msToTimeString(ms: number): string {
  const time = msToTime(ms);
  return (
    time[0].toString().padStart(2, '0') +
    ':' +
    time[1].toString().padStart(2, '0') +
    ':' +
    time[2].toString().padStart(2, '0')
  );
}

/**
 * concats a string array into a single string
 * @param list The array to concat
 * @param connector The connector between entries (e.g. ", ")
 * @param preSign Optional sign before each entry (e.g. "@")
 * @param endSign Optional sing at the end (e.g. ".")
 * @param lastConnector The last connector (e.g. " und ")
 */
export function listMaker(list: string[], connector = ', ', preSign = '', endSign = '.', lastConnector = ' und ') {
  let message: string = '';
  for (let i = 0; i < list.length; i++) {
    if (i == 0) {
      message = message.concat(preSign, list[i]);
    } else if (i == list.length - 1) {
      message = message.concat(lastConnector, preSign, list[i], endSign);
    } else {
      message = message.concat(connector, preSign, list[i]);
    }
  }

  return message;
}

/**
 * returns true if an array has duplicate entries
 * @param array The array to check
 */
export function hasDuplicates(array: Array<any>) {
  return new Set(array).size !== array.length;
}

/**
 * picks a random entry from an array
 * @param array
 */
export function pickRandom(array: Array<any>) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * picks x random entries from an array (no repeats)
 * @param array
 * @param amount The amount of random picks
 */
export function pickRandoms(array: Array<any>, amount: number) {
  let input: number[] = Array(array.length)
    .fill(1)
    .map((_, i) => i + 1);
  let output: Array<any> = [];
  while (output.length < amount) {
    let randomPick: any = input[Math.floor(Math.random() * input.length)];
    output.push(array[randomPick - 1]);
    input.splice(input.indexOf(randomPick), 1);
  }
  return output;
}

/**
 * make a mythic announcement
 * @param message1 initial message
 * @param message2 end message
 * @param delay1 delay for first mythic word
 * @param delay1 delay for second mythic word
 * @param delay1 delay for end message
 */
export function mythicAnnouncement(
  chatClient: ChatClient,
  channel: string,
  mysticWords: string[],
  message1: string,
  message2: string,
  delay1: number = 1500,
  delay2: number = 7500,
  delay3: number = 14000
) {
  const mysticWords_1: string = pickRandom(mysticWords);
  let mysticWords_2: string = pickRandom(mysticWords);
  while (mysticWords_1 == mysticWords_2) {
    mysticWords_2 = pickRandom(mysticWords);
  }
  chatClient.say(channel, message1);

  setTimeout(() => {
    chatClient.action(channel, mysticWords_1);
  }, delay1);

  setTimeout(() => {
    chatClient.action(channel, mysticWords_2);
  }, delay2);

  setTimeout(() => {
    chatClient.say(channel, message2);
  }, delay3);
}

/**
 *
 * @param dirname name of the folder you want to read (ends with /)
 * @returns data: {[filename]: any} | false
 */
export async function readFiles(dirname: string) {
  let data: {
    [key: string]: any;
  } = {};
  try {
    const filenames: string[] = await fs.promises.readdir(dirname);
    for (const filename of filenames) {
      if (filename.split('.')[1] == 'json') {
        try {
          const content: any = JSON.parse(await fs.promises.readFile(dirname + filename, 'utf8'));
          data[filename] = content;
        } catch {
          logger(`fileReader(): failed to read file ${filename}`);
        }
      } else {
        logger(`fileReader(): skipped ${filename} (not a .json)`);
      }
    }
    return data;
  } catch {
    logger(`fileReader(): could not read directory ${dirname}`);
    return {};
  }
}

export function ObjectOrCard() {
  var notRandomNumbers: number[] = [1, 1, 1, 2];
  var idx: number = Math.floor(Math.random() * notRandomNumbers.length);
  var erg: number = notRandomNumbers[idx]
  var ergString: "Karte" | "Gegenstand" | "-" 
  if (erg == 1) {
    ergString = "Karte"
  } else {
    ergString = "Gegenstand"
  }
  return ergString
}