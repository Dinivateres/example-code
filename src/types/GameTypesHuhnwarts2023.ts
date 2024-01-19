export type HuhnwartsUserFile = {
    "userId": number,
    "name": string,
    "HausID": number,
    "lastTimestampRDW": number[],
    "lastTimestampSuchen": number,
    "lastTimestampKristallkugel": number,
    "geisterschutz": boolean,
    "countTrank": number,
    "countFutter": number,
    "punkteTauschen": number,
    "countTauschen": number,
    "punkteSFK": number,
    "duelleGewonnen": number,
    "duelleVerloren": number
}

export type HuhnwartsObjectFile = {
    "GegenstandID": number,
    "Name": string
}

export type HuhnwartsSchokofroschkartenFile = {
    "KartenID": number,
    "Name": string,
    "seltenheit": number,
    "kategorie": string,
    "bOrt1": number,
    "bOrt2": number,
    "bOrt3": number,
    "bOrt4": number,
    "bOrt5": number
}

export type HuhnwartsBegleittierFile = {
    "id": number,
    "name": string,
    "eigenschaften": string[],
    "besitzer": number,
    "typ": string,
    "awayUntil": number,
    "activity": null | "tiersuche" | "schnueffeln" | "peevsjagen"
}

export type HuhnwartsAchievementsFile = {
    "id": number,
    "Name": string,
    "Beschreibung": string
}

export type HuhnwartsOrteFile = {
    "OrtID": number,
    "Name": string
}

export type HuhnwartsHausFile = {
    "HausID": number,
    "Name": string
}

export type HuhnwartsObjectInventoryFile = {
    "UserID": number,
    "GegenstandID": number,
    "Anzahl": number,
    "TauschbareAnzahl": number,
    "GefundeneAnzahl": number
}

export type HuhnwartsSfkInventoryFile = {
    "UserID": number,
    "SchokofroschID": number,
    "Anzahl": number,
    "TauschbareAnzahl": number,
    "GefundeneAnzahl": number
}

export type HuhnwartsUserAchievementsFile = {
    "UserID": number,
    "ErfolgID": number
}

export type HuhnwartsBegleittierTypeFile = {
    "BegleittiertypID": number,
    "Begleittiertyp": string,
    "Satzteil1": string,
    "Fellfarbe": string[],
    "SatzteilOpt1": string,
    "FellfarbeOpt1": string[],
    "FellfarbeWar": number,
    "Satzteil2": string,
    "Fellstruktur": string[],
    "Satzteil2Suf": string,
    "Satzteil3Pre": string,
    "Augenfarbe": string[],
    "Satzteil4Opt": string,
    "Satzteil4War": number,
    "Eigenschaft": string[],
    Gender: "M" | "F" | "N"
}

export type HuhnwartsBonustierTypeFile = {
    "BegleittiertypID": number,
    "Begleittiertyp": string,
    "Satzteil1": string,
    "Fellfarbe": string[],
    "SatzteilOpt1": string,
    "FellfarbeOpt1": string[],
    "FellfarbeWar": number,
    "Satzteil2": string,
    "Fellstruktur": string[],
    "Satzteil2Suf": string,
    "Satzteil3Pre": string,
    "Augenfarbe": string[],
    "Satzteil4Opt": string,
    "Satzteil4War": number,
    "Eigenschaft": string[],
    Gender: "M" | "F" | "N"
}

export type HuhnwartsPeevesInventoryFile = {
    "UserID": number,
    "ThingID": number,
    "ThingType": "Gegenstand" | "Karte",
    "timestampFound": number,
    "canFilch": boolean,
    "wasTraded": boolean
}

export type HuhnwartsUserSearchedPlacesFile = {
    UserID: number,
    OrtIDs: number[]
}

export type HuhnwartsDuellFile = {
    user1ID: number,
    user2ID: number
}

export type Huhnwarts2023LostopfFile = {
    "Lostopf": string,
    winners: string[]
}

export type HuhnwartsBohnenFile = {
    "BohnenId": number,
    "farbe": string,
    "eigenschaft1": string,
    "eigenschaft2": string,
    "geschmack": string,
    "effekt": string
}

export type HuhnwartsBohnenInventoryFile = {
    "UserID": number,
    "BohnenID": number,
    "Anzahl": number
}

export type userFileReadout = HuhnwartsUserFile | false | null;

export type foundThing = {"type": "Gegenstand" | "Karte" | "-", "id": number, "name": string, "punkte": number};

export const huhnwarts2023Rarities: {
    [key: string]: number
} = {
    "1": 30,
    "2": 25,
    "3": 20,
    "4": 15,
    "5": 10
}

export const huhnwarts2023rarityPoints: {
    [key: string]: number
} = {
    "1": 5,
    "2": 10,
    "3": 15,
    "4": 25,
    "5": 50
}

export const huhnwarts2023PeevesProtectionTime: number = 30; //sec

export const huhnwarts2023PeevesAttackInterval: {
    "cooldown": number,
    "randomIntervalMax": number
} = {
    cooldown: 120, //min
    randomIntervalMax: 180 //min
}

export const huhnwarts2023PeevesSearchChance: number = 5; //%
