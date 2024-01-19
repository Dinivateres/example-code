import fs from 'fs';
import { getRandomInt, logger, pickRandom } from '../functions';
import { ELogLevel } from '../types/ELogLevel';
import { RentierAttribute, RentierAttributeListe, WeihnachtsUser } from './../types/GameTypesXMas2022';

export class XMas2022Helper {
  static async saveUserFile(userFile: WeihnachtsUser, user: string): Promise<boolean> {
    try {
      await fs.promises.writeFile(
        `./JSON/Weihnachten 2022/users/${user}.json`,
        JSON.stringify(userFile, null, 4),
        'utf8'
      );
      logger(`userFile [${user}] saved`);
    } catch {
      logger(`Could not write file: ./JSON/Weihnachten 2022/users/${user}.json`, ELogLevel.ERROR);
      return false;
    }

    return true;
  }

  static async getUserFile(user: string): Promise<WeihnachtsUser | false> {
    let userFile: WeihnachtsUser | false = false;

    const pathFolder = './JSON/Weihnachten 2022/users';
    // create folder first if it does not exist
    if (!fs.existsSync(pathFolder)) {
      fs.mkdirSync(pathFolder, { recursive: true });
    }

    const pathFile = `${pathFolder}/${user}.json`;
    // The file for the user exists. Read and return data.
    if (fs.existsSync(pathFile)) {
      try {
        userFile = JSON.parse(await fs.promises.readFile(pathFile, 'utf8'));
      } catch (e) {
        logger('Could not read file: ' + pathFile, ELogLevel.ERROR);
      }
    } else {
      // No file for this user was found. Create a new one an return it.
      userFile = {
        tuerchen: [],
        elfenhefen: {
          lastUsed: 0,
        },
        rentier: {
          lastUsed: 0,
          alreadyHas: false,
          name: '-',
          attribute: {
            fellFarbe: '-',
            fellZeichnung: '-',
            fellStruktur: '-',
            geweihFarbe: '-',
            persoenlichkeit: '-',
          },
          awayTime: 0,
          futter: 0,
        },
        objekte: {
          gefunden: {},
          gewichtelt: {},
        },
        deko: {},
        wichtelpunkte: 0,
        postkarten: 0,
      };

      try {
        await fs.promises.writeFile(pathFile, JSON.stringify(userFile, null, 4), 'utf8');
        logger(`new userFile [${user}] created`);
      } catch {
        logger('Could not read file: ' + pathFile, ELogLevel.ERROR);
      }
    }

    return userFile;
  }

  /**
   * creates a new Rentier
   * @returns [fellFarbe, fellZeichnung, fellStruktur, geweihFarbe, persönlichkeit]
   */
  static async rentierMaker(): Promise<RentierAttribute | false> {
    try {
      const rentierAttribute: RentierAttributeListe = JSON.parse(
        await fs.promises.readFile(`./JSON/Weihnachten 2022/rentierAttributeListe.json`, 'utf8')
      );
      const fellFarbe: string = pickRandom(rentierAttribute.fellFarbe);
      let fellZeichnung: string = pickRandom(rentierAttribute.fellZeichnung);
      const fellStruktur: string = pickRandom(rentierAttribute.fellStruktur);
      const geweihFarbe: string = pickRandom(rentierAttribute.geweihFarbe);
      let persoenlichkeit: string = pickRandom(rentierAttribute.persoenlichkeit);

      const fellZeichnungWahrscheinlichkeit: number = 0.33;
      let rnd: number = getRandomInt(0, 101) / 100;
      if (rnd > fellZeichnungWahrscheinlichkeit) fellZeichnung = '-';
      const persoenlichkeitWahrscheinlichkeit: number = 0.15;
      rnd = getRandomInt(0, 101) / 100;
      if (rnd > persoenlichkeitWahrscheinlichkeit) persoenlichkeit = '-';

      logger(`neues Rentier erstellt`);
      return {
        fellFarbe: fellFarbe,
        fellZeichnung: fellZeichnung,
        fellStruktur: fellStruktur,
        geweihFarbe: geweihFarbe,
        persoenlichkeit: persoenlichkeit,
      };
    } catch {
      logger('rentierMaker failed to read file', ELogLevel.ERROR);
      return false;
    }
  }

  static rentierBeschreiber(attribute: RentierAttribute, name: string = '-') {
    const rentierBeschreibung: string = `${name === '-' ? `Das Rentier` : name} ist ${attribute.fellFarbe}${
      attribute.fellZeichnung !== '-' ? ` mit ${attribute.fellZeichnung}` : ''
    } und hat ein ${attribute.fellStruktur} Fell. Das Geweih ist ${attribute.geweihFarbe}. ${
      attribute.persoenlichkeit != '-'
        ? `${name === '-' ? `Dieses Rentier` : name}  ist ${attribute.persoenlichkeit}.`
        : ''
    }`;
    return rentierBeschreibung;
  }
}
