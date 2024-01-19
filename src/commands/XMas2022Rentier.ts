import { ChatClient } from '@twurple/chat/lib';
import fs from 'fs';
import { XMas2022Helper } from '../commandsHelper/XMas2022Helper';
import { getRandomInt, logger, msToTimeString, pickRandom } from '../functions';
import { channel } from '../system/Constants';
import { ELogLevel } from '../types/ELogLevel';
import { Rentier, RentierAttribute, WeihnachtsGegenstaende, WeihnachtsUser } from '../types/GameTypesXMas2022';

export class XMas2022Rentier {
  private chatClient: ChatClient;

  constructor(chatClient: ChatClient) {
    this.chatClient = chatClient;
  }

  sendOutRentier(userFile: WeihnachtsUser, user: string): void {
    const rentier: Rentier = userFile.rentier;
    //user hat kein Rentier
    if (!this.checkForRentier(rentier, user, 'das du los schicken kannst')) {
      return;
    }

    //Überprüfe letzte Nutzung
    const now: number = Date.now();
    const timeLeft: number = rentier.awayTime - (now - rentier.lastUsed);
    if (now - rentier.lastUsed < rentier.awayTime) {
      this.chatClient.say(
        channel,
        `@${user} ${
          rentier.name === '-' ? 'dein Rentier' : rentier.name
        } braucht noch etwas, bis es wieder bereit ist. [${msToTimeString(timeLeft)}] [hh:mm:ss]`
      );
      logger(`!rentier [${user}] noch unterwegs`);
      return;
    }

    //Überprüfe Futter
    if (rentier.futter < 1) {
      // Zu wenig Futter.
      this.chatClient.say(
        channel,
        `@${user} du hast leider nicht genug Futter um ${
          rentier.name != '-' ? rentier.name : 'dein Rentier'
        } los zu schicken. [${rentier.futter}/1]`
      );
      logger(`!rentier [${user}] nicht genug Futter`);
      return;
    }

    //schicke Rentier los
    rentier.futter -= 1;
    rentier.lastUsed = now;

    const rnd: number = getRandomInt(0, 101) / 100;
    const mishap: boolean = rnd < 0.1 ? true : false;
    rentier.awayTime = 2 * 60 * 60 * 1000; // = 2h

    this.chatClient.say(
      channel,
      `@${user} du schickst dein Rentier ${rentier.name == '-' ? '' : rentier.name} los. Was es wohl finden wird...`
    );
    logger(`!rentier ${user} sent out (mishap: ${mishap})`);

    //speicher userFile
    if (!XMas2022Helper.saveUserFile(userFile, user)) {
      // TODO: sollte hier bei einem Fehler abgebrochen werden oder absichtlich nicht?
      //return;
    }

    //15 min später
    setTimeout(() => this.rentierReturns(user, mishap), 15 * 60 * 1000);
  }

  async rentierReturns(user: string, mishap: boolean) {
    let userFile: WeihnachtsUser | false = await XMas2022Helper.getUserFile(user);
    if (userFile === false) return;

    let weihnachtsGegenstaende: WeihnachtsGegenstaende;
    try {
      weihnachtsGegenstaende = JSON.parse(
        await fs.promises.readFile('./JSON/Weihnachten 2022/weihnachtsGegenstaende.json', 'utf8')
      );
    } catch {
      logger('Could not read file: ./JSON/Weihnachten 2022/weihnachtsGegenstaende.json', ELogLevel.ERROR);
      return;
    }

    const objekte = userFile.objekte;
    const rentier = userFile.rentier;

    const rentierObjekt: string = pickRandom(weihnachtsGegenstaende.stufe2.concat(weihnachtsGegenstaende.stufe3));

    //Füge Objekte zu User hinzu
    if (!objekte.gefunden[rentierObjekt]) {
      objekte.gefunden[rentierObjekt] = 2;
    } else {
      objekte.gefunden[rentierObjekt] += 2;
    }

    if (mishap) {
      try {
        const mishapList: string[] = JSON.parse(
          await fs.promises.readFile(`./JSON/Weihnachten 2022/mishapList.json`, 'utf8')
        );

        const mishapType: string = pickRandom(mishapList);

        this.chatClient.say(
          channel,
          `@${user} dein Rentier ${
            rentier.name == '-' ? '' : rentier.name
          } hat etwas phantstisches gefunden: 2x ${rentierObjekt} xicanmHyped . ${
            rentier.name == '-' ? 'Dein Rentier' : rentier.name
          } ${mishapType} und braucht daher etwas länger um zu dir zurück zu kehren... [+2 Stunden]`
        );
        rentier.awayTime += 2 * 60 * 60 * 1000;
      } catch {
        logger('Could not read file: ./JSON/Weihnachten 2022/mishapList.json', ELogLevel.ERROR);
        return;
      }
    } else {
      this.chatClient.say(
        channel,
        `@${user} dein Rentier ${
          rentier.name == '-' ? '' : rentier.name
        } hat etwas phantstisches gefunden: 2x ${rentierObjekt} xicanmHyped . ${
          rentier.name == '-' ? 'Dein Rentier' : rentier.name
        } braucht jetzt erstmal eine kleine Pause...`
      );
    }

    //speicher userFile
    if (!XMas2022Helper.saveUserFile(userFile, user)) {
      return;
    }
    return;
  }

  async buyRentier(userFile: WeihnachtsUser, user: string): Promise<void> {
    const rentier: Rentier = userFile.rentier;
    //user hat schon ein Rentier
    if (rentier.alreadyHas) {
      this.chatClient.say(channel, `@${user} du besitzt schon ein Rentier.`);
      logger(`!rentier kaufen [${user}] besitzt bereits ein Rentier`);
      return;
    }

    //Überprüfe Futter
    if (rentier.futter < 10) {
      this.chatClient.say(
        channel,
        `@${user} du hast leider nicht genug Futter, um dir ein Rentier zu kaufen. [${rentier.futter}/10]`
      );
      logger(`!rentier kaufen [${user}] nicht genug Futter`);
      return;
    } else {
      rentier.futter -= 10;
    }
    let rentierAttribute: RentierAttribute | false = await XMas2022Helper.rentierMaker();

    //Fehler bei der Erstellung
    if (rentierAttribute === false) {
      this.chatClient.say(
        channel,
        `@${user} ERROR: Fehler bei der Erstellung deines Rentiers. Bitte informiere einen Mod.`
      );
      return;
    }

    const rentierBeschreibung: string = XMas2022Helper.rentierBeschreiber(rentierAttribute);
    rentier.alreadyHas = true;
    rentier.attribute = {
      fellFarbe: rentierAttribute.fellFarbe,
      fellZeichnung: rentierAttribute.fellZeichnung,
      fellStruktur: rentierAttribute.fellStruktur,
      geweihFarbe: rentierAttribute.geweihFarbe,
      persoenlichkeit: rentierAttribute.persoenlichkeit,
    };

    //speicher Rentier
    if (!XMas2022Helper.saveUserFile(userFile, user)) {
      return;
    }

    this.chatClient.say(channel, `@${user} du hast erfolgreich ein Rentier gekauft! ${rentierBeschreibung}`);
    logger(`!rentier kaufen [${user}] success`);
  }

  async nameRentier(userFile: WeihnachtsUser, user: string, args: string[]): Promise<void> {
    const rentier: Rentier = userFile.rentier;

    //user hat kein Rentier
    if (!this.checkForRentier(rentier, user, 'das du benennen kannst')) {
      return;
    }

    //Rentier bereits benannt
    if (rentier.name !== '-' && args.length > 1) {
      this.chatClient.say(channel, `@${user} dein Rentier hat bereits einen Namen. Es heisst ${rentier.name}.`);
      logger(`!rentier name [${user}] bereits benannt`);
      return;
    } else if (rentier.name !== '-' && args.length === 1) {
      this.chatClient.say(channel, `@${user} dein Rentier heisst ${rentier.name}.`);
      logger(`!rentier name [${user}]`);
      return;
    }

    //neuer Rentiername
    if (rentier.name === '-' && args.length > 1) {
      const rentierName: string = args.slice(1).join(' ');
      rentier.name = rentierName;

      //speicher Rentier
      if (!XMas2022Helper.saveUserFile(userFile, user)) {
        return;
      }

      this.chatClient.say(channel, `Gratulation @${user}! Dein Rentier heisst jetzt ${rentierName}.`);
      logger(`!rentier name [${user}] neuer Rentiername [${rentierName}]`);
      return;
    } else if (rentier.name === '-' && args.length === 1) {
      this.chatClient.say(
        channel,
        `@${user} dein Rentier hat noch keinen Namen. Gib ihm doch einen mit "!rentier name [name]".`
      );
      logger(`!rentier name [${user}] noch kein Name`);
      return;
    }
  }

  renameRentier(userFile: WeihnachtsUser, user: string, args: string[]): void {
    const rentier: Rentier = userFile.rentier;

    //user hat kein Rentier
    if (!this.checkForRentier(rentier, user, 'das du umbenennen kannst')) {
      return;
    }

    //neuer Rentiername
    if (args.length > 1) {
      const rentierName: string = args.slice(1).join(' ');
      rentier.name = rentierName;

      //speicher Rentier
      if (!XMas2022Helper.saveUserFile(userFile, user)) {
        return;
      }

      this.chatClient.say(channel, `Gratulation @${user}! Dein Rentier heißt jetzt ${rentierName}.`);
      logger(`!rentier rename [${user}] neuer Rentiername [${rentierName}]`);
      return;
    } else {
      this.chatClient.say(channel, `@${user} bitte gib einen neuen Namen an. ("!rentier rename [name]")`);
      logger(`!rentier rename [${user}] kein Name angegeben`);
      return;
    }
  }

  describeRentier(userFile: WeihnachtsUser, user: string): void {
    const rentier: Rentier = userFile.rentier;
    //user hat kein Rentier
    if (!this.checkForRentier(rentier, user, 'das beschrieben werden kann.')) {
      return;
    }

    const rentierBeschreibung: string = XMas2022Helper.rentierBeschreiber(
      userFile.rentier.attribute,
      userFile.rentier.name
    );
    this.chatClient.say(channel, `@${user}: ${rentierBeschreibung}`);
    logger(`!rentier beschreibung [${user}]`);
    return;
  }

  checkForRentier(rentier: Rentier, user: string, rentierAction: string): boolean {
    if (!rentier.alreadyHas) {
      this.chatClient.say(
        channel,
        `@${user} du hast leider noch kein Rentier, ${rentierAction}. Kaufe dir doch ein Rentier mit "!rentier kaufen" (Kosten: 10 Futter).`
      );
      logger(`!rentier [${user}] besitzt kein Rentier`);
      return false;
    }
    return true;
  }
}
