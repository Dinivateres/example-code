import fs from 'fs';
import { getRandomInt, logger, pickRandom } from '../functions';
import { connectionString } from '../database/mongoClient';
import { Huhnwarts2023LostopfFile, HuhnwartsAchievementsFile, HuhnwartsBegleittierFile, HuhnwartsBegleittierTypeFile, HuhnwartsBohnenFile, HuhnwartsBohnenInventoryFile, HuhnwartsBonustierTypeFile, HuhnwartsDuellFile, HuhnwartsHausFile, HuhnwartsObjectFile, HuhnwartsObjectInventoryFile, HuhnwartsOrteFile, HuhnwartsPeevesInventoryFile, HuhnwartsSchokofroschkartenFile, HuhnwartsSfkInventoryFile, HuhnwartsUserAchievementsFile, HuhnwartsUserFile, HuhnwartsUserSearchedPlacesFile, userFileReadout } from '../types/GameTypesHuhnwarts2023';
import { Collection, Db, Document } from 'mongodb';
import { ApiClient, HelixUser } from '@twurple/api/lib';
import { MongoClient } from "mongodb";

export class Huhnwarts2023Helper {

    //#region Users
    static async readUserFile(userId: number): Promise<userFileReadout> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("User");
        const userDocument = await collection.find({ userId: userId }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        //user does not exist
        if(userDocument.length == 0) {
            return null;
        } else {
            const userFile: HuhnwartsUserFile = JSON.parse(JSON.stringify(userDocument[0]));
            return userFile;
        }
    }

    static async readAllUserFiles(): Promise<HuhnwartsUserFile[] | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("User");
        const userDocument = await collection.find().project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        const userFile: HuhnwartsUserFile[] = userDocument.map((document) => { return JSON.parse(JSON.stringify(document)) });
        return userFile;
    }

    static async writeUserFile(data: HuhnwartsUserFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("User");
        const userDocument = await collection.find({ userId: data.userId }).toArray();
        if (userDocument.length == 0) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ userId: data.userId }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }
    
    static async newUser(userId: number, apiClient: ApiClient): Promise<HuhnwartsUserFile | false> {
        const userNameHelix: HelixUser | null = await apiClient.users.getUserById(userId);
        if(userNameHelix == null) return false;
        const userName: string = userNameHelix.name;
        const newUser: HuhnwartsUserFile = {
            userId: userId,
            name: userName,
            HausID: 0,
            lastTimestampRDW: [],
            lastTimestampSuchen: 0,
            lastTimestampKristallkugel: 0,
            geisterschutz: false,
            countTrank: 0,
            countFutter: 0,
            punkteTauschen: 0,
            countTauschen: 0,
            punkteSFK: 0,
            duelleGewonnen: 0,
            duelleVerloren: 0
        }

        return newUser;
    }

    static async getAllUserIDs(): Promise<number[] | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("User");
        const userDocument = await collection.find().project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        const userIDFile: number[] = userDocument.map((document) => { return JSON.parse(JSON.stringify(document)).userId });
        return userIDFile;
    }
    //#endregion Users
    
    //#region Gegenstände
    static async readObjectFileByID(gegenstandID: number): Promise<HuhnwartsObjectFile | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Gegenstand");
        const objectDocument = await collection.find({ GegenstandID: gegenstandID }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        const objectFile: HuhnwartsObjectFile = JSON.parse(JSON.stringify(objectDocument[0]));
        return objectFile;
    }

    static async readObjectFileByName(gegenstandName: string): Promise<HuhnwartsObjectFile | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Gegenstand");
        const objectDocument = await collection.find({ Name: gegenstandName }).collation({locale: `de`, strength: 1}).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        if(objectDocument.length == 0) {
            return null;
        } else {
            const objectFile: HuhnwartsObjectFile = JSON.parse(JSON.stringify(objectDocument[0]));
            return objectFile;            
        }
    }

    static async writeObjectFile(data: HuhnwartsObjectFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Gegenstand");
        const objectDocument = await collection.find({ GegenstandID: data.GegenstandID }).toArray();
        if (JSON.stringify(objectDocument[0]) == null) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ GegenstandID: data.GegenstandID }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }

    static async readObjectInventoryFile(userID: number, gegenstandID: number): Promise<HuhnwartsObjectInventoryFile | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("ObjectInventory");
        const objectInventoryDocument = await collection.find({ UserID: userID, GegenstandID: gegenstandID }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });
        
        const objectInventoryFile: HuhnwartsObjectInventoryFile = objectInventoryDocument.length == 0 ? {
            UserID: userID,
            GegenstandID: gegenstandID,
            Anzahl: 0,
            TauschbareAnzahl: 0,
            GefundeneAnzahl: 0
        } : JSON.parse(JSON.stringify(objectInventoryDocument[0]));
        
        return objectInventoryFile;
    }

    static async readObjectInventoryFilesByUserID(userID: number): Promise<HuhnwartsObjectInventoryFile[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("ObjectInventory");
        const objectInventoryDocument = await collection.find({ UserID: userID }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });
        
        if(objectInventoryDocument.length == 0) {
            return null;
        } else {
            const objectInventoryFiles: HuhnwartsObjectInventoryFile[] = objectInventoryDocument.map((document) => { return JSON.parse(JSON.stringify(document)) });
            return objectInventoryFiles;
        }
        
    }

    static async writeObjectInventoryFile(data: HuhnwartsObjectInventoryFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("ObjectInventory");
        const objectInventoryDocument = await collection.find({ UserID: data.UserID, GegenstandID: data.GegenstandID }).toArray();
        if (JSON.stringify(objectInventoryDocument[0]) == null) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ UserID: data.UserID, GegenstandID: data.GegenstandID }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }

    static async deleteObjectInventoryFile(data: HuhnwartsObjectInventoryFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("ObjectInventory");
        const deleteObjectInventoryDocument = await collection.deleteOne({ UserID: data.UserID, GegenstandID: data.GegenstandID });
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        return deleteObjectInventoryDocument.acknowledged;
    }

    static async getObjectIDs(): Promise<number[] | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Gegenstand");
        const gegenstandDocument = await collection.find().project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        const gegenstandFile: number[] = gegenstandDocument.map((document) => { return JSON.parse(JSON.stringify(document)).GegenstandID });
        return gegenstandFile;
    }
    //#endregion Gegenstände

    //#region Schokofroschkarte
    static async readSchokofroschkartenFileByID(kartenID: number): Promise<HuhnwartsSchokofroschkartenFile | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Schokofroschkarten");
        const schokofroschkartenDocument = await collection.find({ KartenID: kartenID }).project({_id: 0}).toArray();
        await client.close();

        const schokofroschkartenFile: HuhnwartsSchokofroschkartenFile = JSON.parse(JSON.stringify(schokofroschkartenDocument[0]));
        return schokofroschkartenFile;
    }

    static async readSchokofroschkartenFileByName(kartenName: string): Promise<HuhnwartsSchokofroschkartenFile | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Schokofroschkarten");
        const schokofroschkartenDocument = await collection.find({ Name: kartenName }).collation({locale: `de`, strength: 1}).project({_id: 0}).toArray();
        await client.close();

        if(schokofroschkartenDocument.length == 0) {
            return null;
        } else {
            const schokofroschkartenFile: HuhnwartsSchokofroschkartenFile = JSON.parse(JSON.stringify(schokofroschkartenDocument[0]));
            return schokofroschkartenFile;            
        }
    }

    static async writeSchokofroschkartenFile(data: HuhnwartsSchokofroschkartenFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Schokofroschkarten");
        const schokofroschkartenDocument = await collection.find({ KartenID: data.KartenID }).toArray();
        if (JSON.stringify(schokofroschkartenDocument[0]) == null) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close();
            return true;
        } else {
            await collection.replaceOne({ KartenID: data.KartenID }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }

    static async readSfkInventoryFile(userID: number, schokofroschID: number): Promise<HuhnwartsSfkInventoryFile | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("SfkInventory");
        const sfkInventoryDocument = await collection.find({ UserID: userID, SchokofroschID: schokofroschID }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });
        
        const sfkInventoryFile: HuhnwartsSfkInventoryFile = sfkInventoryDocument.length == 0 ? {
            UserID: userID,
            SchokofroschID: schokofroschID,
            Anzahl: 0,
            TauschbareAnzahl: 0,
            GefundeneAnzahl: 0
        } : JSON.parse(JSON.stringify(sfkInventoryDocument[0]));

        return sfkInventoryFile;
    }

    static async readSfkInventoryFilesByUserID(userID: number): Promise<HuhnwartsSfkInventoryFile[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("SfkInventory");
        const sfkInventoryDocument = await collection.find({ UserID: userID }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });
        
        if(sfkInventoryDocument.length == 0) {
            return null;
        } else {
            const sfkInventoryFiles: HuhnwartsSfkInventoryFile[] = sfkInventoryDocument.map((document) => { return JSON.parse(JSON.stringify(document)) });
            return sfkInventoryFiles;
        }
        
    }

    static async writeSfkInventoryFile(data: HuhnwartsSfkInventoryFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("SfkInventory");
        const sfkInventoryDocument = await collection.find({ UserID: data.UserID, SchokofroschID: data.SchokofroschID }).toArray();
        if (JSON.stringify(sfkInventoryDocument[0]) == null) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ UserID: data.UserID, SchokofroschID: data.SchokofroschID }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }

    static async deleteSfkInventoryFile(data: HuhnwartsSfkInventoryFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("SfkInventory");
        const deleteSfkInventoryDocument = await collection.deleteOne({ UserID: data.UserID, SchokofroschID: data.SchokofroschID });
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        return deleteSfkInventoryDocument.acknowledged;
    }

    static async getSfkIDs(locationID: number, rarity: number): Promise<number[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Schokofroschkarten");
        let sfkDocument: Document[] = [];
        //search specific location
        if(locationID != 0) {
            sfkDocument = await collection.find({$or:[
                {"bOrt1": locationID},
                {"bOrt2": locationID},
                {"bOrt3": locationID},
                {"bOrt4": locationID},
                {"bOrt5": locationID}
            ], seltenheit: rarity}).project({_id: 0}).toArray();
        } else {
            sfkDocument = await collection.find({seltenheit: rarity}).project({_id: 0}).toArray();
        }
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        if(sfkDocument.length == 0) {
            return null;
        }
        const sfkFile: number[] = sfkDocument.map((document) => { return JSON.parse(JSON.stringify(document)).KartenID });
        return sfkFile;
    }

    static async getSfkIDsByCategory(category: string): Promise<number[] | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Schokofroschkarten");
        const sfkCategoryDocument = await collection.find({ Kategorie: category }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        if(sfkCategoryDocument.length == 0) {
            logger(`getSfkCategoryIDs: ERROR! no matches found [category: ${category}]`);
            return false;
        }
        const sfkIDs: number[] = sfkCategoryDocument.map((document) => { return JSON.parse(JSON.stringify(document)).KartenID });
        return sfkIDs;
    }

    static async getSfkIDsByPlace(locationID: number): Promise<number[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Schokofroschkarten");
        const sfkDocuments = await collection.find({$or:[
            {"bOrt1": locationID},
            {"bOrt2": locationID},
            {"bOrt3": locationID},
            {"bOrt4": locationID},
            {"bOrt5": locationID}
        ]}).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        if(sfkDocuments.length == 0) {
            logger(`getSfkIDsByPlace: ERROR! no matches found [locaton: ${locationID}]`);
            return null;
        }
        const sfkIDs: number[] = sfkDocuments.map((document) => { return JSON.parse(JSON.stringify(document)).KartenID });
        return sfkIDs;
    }

    static async getSfkIDsByRarity(rarity: number): Promise<number[] | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Schokofroschkarten");
        const sfkDocuments = await collection.find({seltenheit: rarity}).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        if(sfkDocuments.length == 0) {
            logger(`getSfkIDsByPlace: ERROR! no cards of this rarity exist anywhere [${rarity}]`);
            return false;
        }
        const sfkIDs: number[] = sfkDocuments.map((document) => { return JSON.parse(JSON.stringify(document)).KartenID });
        return sfkIDs;
    }

    //#endregion Schokofroschkarte

    //#region Häuser
    static async getHaus(HausID: number): Promise<string | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Haus");
        const hausDocument = await collection.find({ HausID: HausID }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        //Haus does not exist
        if(hausDocument.length == 0) {
            return null;
        } else {
            const hausFile: HuhnwartsHausFile = JSON.parse(JSON.stringify(hausDocument[0]));
            return hausFile.Name;
        }
    }

    static async getHausMembers(HausID: number): Promise<string[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("User");
        const hausMembersDocument = await collection.find({ HausID: HausID }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        //Haus has no members
        if(hausMembersDocument.length == 0) {
            return null;
        } else {
            const hausMembersFile: string[] = hausMembersDocument.map((document) => { return JSON.parse(JSON.stringify(document)).name });
            return hausMembersFile;
        }
    }

    static async getUserNamesWithHouse(): Promise<string[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("User");
        const hausMembersDocument = await collection.find({ HausID: {$ne: 0} }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        //Haus has no members
        if(hausMembersDocument.length == 0) {
            return null;
        } else {
            const hausMembersFile: string[] = hausMembersDocument.map((document) => { return JSON.parse(JSON.stringify(document)).name });
            return hausMembersFile;
        }
    }

    //#endregion Häuser

    //#region Orte
    static async readPlaceInfoByName(queryName: string): Promise<HuhnwartsOrteFile | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Ort");
        const placeDocument = await collection.find( {Name: queryName} ).collation({locale: `de`, strength: 1}).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        //user does not exist
        if(placeDocument.length == 0) {
            return null;
        } else {
            const placeFile: HuhnwartsOrteFile = JSON.parse(JSON.stringify(placeDocument[0]));
            return placeFile;
        }
    }

    static async readPlaceInfoByID(queryID: number): Promise<HuhnwartsOrteFile | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Ort");
        const placeDocument = await collection.find( {OrtID: queryID} ).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        //user does not exist
        if(placeDocument.length == 0) {
            return null;
        } else {
            const placeFile: HuhnwartsOrteFile = JSON.parse(JSON.stringify(placeDocument[0]));
            return placeFile;
        }
    }

    static async getAllPlaces(): Promise<HuhnwartsOrteFile[] | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Ort");
        const placeDocuments = await collection.find().project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });
        
        const placeFiles: HuhnwartsOrteFile[] = placeDocuments.map((document) => { return JSON.parse(JSON.stringify(document)) });
        return placeFiles;
    }

    static async readUserSearchedPlaces(UserID: number): Promise<HuhnwartsUserSearchedPlacesFile | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("User_SearchedPlaces");
        const userSearchedPlacesDocument = await collection.find({ UserID: UserID }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });
        
        if(userSearchedPlacesDocument.length == 0) {
            return null;
        } else {
            const userSearchedPlacesFile: HuhnwartsUserSearchedPlacesFile = JSON.parse(JSON.stringify(userSearchedPlacesDocument[0]));
            return userSearchedPlacesFile;
        }
    }

    static async writeUserSearchedPlaces(data: HuhnwartsUserSearchedPlacesFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("User_SearchedPlaces");
        const UserSearchedPlacesDocument = await collection.find({ UserID: data.UserID }).toArray();
        if (JSON.stringify(UserSearchedPlacesDocument[0]) == null) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ UserID: data.UserID }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }
    //#endregion Orte

    //#region Punkte
    static async calculatePointsByUserIDs(user1ID: number, user2ID: number): Promise<number | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("User");
        const user1Document = await collection.find({ userId: user1ID }).project({_id: 0}).toArray();
        const user2Document = await collection.find({ userId: user2ID }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        //user does not exist
        if(user1Document.length == 0 || user2Document.length == 0) {
            return null;
        } else {
            const user1File: HuhnwartsUserFile = JSON.parse(JSON.stringify(user1Document[0]));
            const user2File: HuhnwartsUserFile = JSON.parse(JSON.stringify(user2Document[0]));
            if(user1File.HausID == 0 || user2File.HausID == 0) {
                return null;
            }
            let points: number = 0;

            if(user1File.HausID == user2File.HausID) {
                //T <-> T
                points = 1;
            } else if(user1File.HausID != 5 && user2File.HausID != 5) {
                //Z <-> Z
                points = 3;
            } else if(user1File.HausID == 5 || user2File.HausID == 5) {
                //H <-> Z
                points = 5;
            }
            return points;
        }
    }

    static calculatePointsByHouseIDs(house1ID: number, house2ID: number): number {
        let points: number = 0;

        if(house1ID == house2ID) {
            //T <-> T
            points = 1;
        } else if(house1ID != 5 && house2ID != 5) {
            //Z <-> Z
            points = 3;
        } else if(house1ID == 5 || house2ID == 5) {
            //H <-> Z
            points = 5;
        }
        return points;
    }
    //#endregion Punkte
    
    //#region Peeves
    static async readPeevesInventoryFilesByID(userId: number): Promise<HuhnwartsPeevesInventoryFile[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("PeevesInventory");
        const peevesInventoryDocument = await collection.find({ UserID: userId }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        if(peevesInventoryDocument.length == 0){
            return null;
        } else {
            const peevesInventoryFile: HuhnwartsPeevesInventoryFile[] = peevesInventoryDocument.map((document) => { return JSON.parse(JSON.stringify(document)) });
            return peevesInventoryFile;
        }
    }

    static async readPeevesInventoryFilesByTimestamp(timestamp: number): Promise<HuhnwartsPeevesInventoryFile[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("PeevesInventory");
        const peevesInventoryDocument = await collection.find({ timestampFound: timestamp }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        if(peevesInventoryDocument.length == 0){
            return null;
        } else {
            const peevesInventoryFile: HuhnwartsPeevesInventoryFile[] = peevesInventoryDocument.map((document) => { return JSON.parse(JSON.stringify(document)) });
            return peevesInventoryFile;
        }
    }

    static async writePeevesInventoryFile(data: HuhnwartsPeevesInventoryFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("PeevesInventory");
        const peevesInventoryDocument = await collection.find({ UserID: data.UserID, ThingID: data.ThingID }).toArray();
        if (JSON.stringify(peevesInventoryDocument[0]) == null) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ UserID: data.UserID, ThingID: data.ThingID }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }

    static async deletePeevesInventoryFile(userID: number, timestamp: number): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("PeevesInventory");
        const deletePeevesInventoryDocument = await collection.deleteOne({ UserID: userID, timestampFound: timestamp });
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        return deletePeevesInventoryDocument.acknowledged;
    }
    //#endregion Peeves

    //#region Begleittiere
    static async readBegleittierFilesByBesitzer(userID: number): Promise<HuhnwartsBegleittierFile[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Begleittier");
        const begleittierDocument = await collection.find({ besitzer: userID }).project({_id: 0}).toArray();
        await client.close();

        if(begleittierDocument.length == 0) {
            return null;
        } else {
            const begleittierFiles: HuhnwartsBegleittierFile[] = begleittierDocument.map((document) => { return JSON.parse(JSON.stringify(document))});
            return begleittierFiles;
        }
    }

    static async readUserBegleittierFiles(userId: number): Promise<HuhnwartsBegleittierFile[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Begleittier");
        const userBegleittierDocument = await collection.find({ besitzer: userId }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        if(userBegleittierDocument.length == 0) {
            return null;
        } else {
            const userBegleittierFile: HuhnwartsBegleittierFile[] = userBegleittierDocument.map((document) => { return JSON.parse(JSON.stringify(document))});
            return userBegleittierFile;
        }
    }

    static async readUserBegleittierFileWithType(userId: number, typ: string): Promise<HuhnwartsBegleittierFile | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Begleittier");
        const userBegleittierDocument = await collection.find({ besitzer: userId, typ: typ }).collation({locale: `de`, strength: 1}).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        if(userBegleittierDocument.length == 0) {
            return null;
        } else {
            const userBegleittierFile: HuhnwartsBegleittierFile = JSON.parse(JSON.stringify(userBegleittierDocument[0]));
            return userBegleittierFile;
        }
    }

    static async readUserBegleittierFileWithName(userID: number, name: string): Promise<HuhnwartsBegleittierFile | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Begleittier");
        const userBegleittierDocument = await collection.find({ besitzer: userID, name: name }).collation({locale: `de`, strength: 1}).project({_id: 0}).toArray();
        await client.close();

        if(userBegleittierDocument.length == 0) {
            return null;
        } else {
            const userBegleittierFile: HuhnwartsBegleittierFile = JSON.parse(JSON.stringify(userBegleittierDocument[0]));
            return userBegleittierFile;
        }
    }

    static async readBegleittierTypeFiles(): Promise<HuhnwartsBegleittierTypeFile[] | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Begleittiertypen");
        const begleittierDocument = await collection.find().project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });
        
        const begleittierFiles: HuhnwartsBegleittierTypeFile[] = begleittierDocument.map((document) => { return JSON.parse(JSON.stringify(document)) });
        return begleittierFiles;
    }
    
    static async getBegleittierTypeNames(): Promise<string[] | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Begleittiertypen");
        const begleittierDocument = await collection.find().project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });
        
        const begleittierNames: string[] = begleittierDocument.map((document) => { return JSON.parse(JSON.stringify(document)).Begleittiertyp });
        return begleittierNames;
    }

    static async getBegleittierTypeByName(queryAnimal: string): Promise<HuhnwartsBegleittierTypeFile | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Begleittiertypen");
        const begleittierDocument = await collection.find( {Begleittiertyp: queryAnimal} ).collation({locale: `de`, strength: 1}).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        //Begleittier does not exist
        if(begleittierDocument.length == 0) {
            return null;
        } else {
            const begleittierFile: HuhnwartsBegleittierTypeFile = JSON.parse(JSON.stringify(begleittierDocument[0]));
            return begleittierFile;
        }
    }

    static async writeBegleittierFile(data: HuhnwartsBegleittierFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Begleittier");
        const begleittierDocument = await collection.find({ id: data.id, besitzer: data.besitzer }).toArray();
        if (JSON.stringify(begleittierDocument[0]) == null) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ id: data.id, besitzer: data.besitzer }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }
    
    //#endregion Begleittiere

    //#region Bonustier

    static async getBonustierTypeByName(queryAnimal: string): Promise<HuhnwartsBonustierTypeFile | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Bonustiertypen");
        const bonustierDocument = await collection.find( {Begleittiertyp: queryAnimal} ).collation({locale: `de`, strength: 1}).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        //Bonustier does not exist
        if(bonustierDocument.length == 0) {
            return null;
        } else {
            const bonustierFile: HuhnwartsBonustierTypeFile = JSON.parse(JSON.stringify(bonustierDocument[0]));
            return bonustierFile;
        }
    }

    //#endregion Bonustier

    //#region Duell
    static async readUserDuellFiles(userID: number): Promise<HuhnwartsDuellFile[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Duelle");
        const duellDocument = await collection.find({$or:[
            {"user1ID": userID},
            {"user2ID": userID}
        ]}).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        //user has no duel
        if(duellDocument.length == 0) {
            return null;
        } else {
            const duellFiles: HuhnwartsDuellFile[] = duellDocument.map((document) => { return JSON.parse(JSON.stringify(document))});
            return duellFiles;
        }
    }

    static async readUserDuellFileDouble(user1ID: number, user2ID: number): Promise<HuhnwartsDuellFile | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Duelle");
        const duellDocument = await collection.find({ user1ID: user1ID, user2ID: user2ID }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        //users have no duel
        if(duellDocument.length == 0) {
            return null;
        } else {
            const duellFile: HuhnwartsDuellFile = JSON.parse(JSON.stringify(duellDocument[0]));
            return duellFile;
        }
    }

    static async deleteDuellFile(user1ID: number, user2ID: number): Promise<[boolean, number]> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Duelle");
        const deleteDuellDocument = await collection.deleteOne({ user1ID: user1ID, user2ID: user2ID });
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        return [deleteDuellDocument.acknowledged, deleteDuellDocument.deletedCount];
    }

    static async writeDuellFile(user1ID: number, user2ID: number): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Duelle");
        const userDocument = await collection.find({ user1ID: user1ID, user2ID: user2ID }).toArray();
        if (userDocument.length == 0) {
            await collection.insertOne({ user1ID: user1ID, user2ID: user2ID }).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ user1ID: user1ID, user2ID: user2ID }, { user1ID: user1ID, user2ID: user2ID }).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }

    //#endregion Duell

    //#region Bohnen
    static async readBohnenFileByID(bohnenID: number): Promise<HuhnwartsBohnenFile | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Bohnen");
        const bohnenDocument = await collection.find({ BohnenId: bohnenID }).project({_id: 0}).toArray();
        await client.close();

        const schokofroschkartenFile: HuhnwartsBohnenFile = JSON.parse(JSON.stringify(bohnenDocument[0]));
        return schokofroschkartenFile;
    }

    static async readBohnenInventoryFile(userID: number, bohnenID: number): Promise<HuhnwartsBohnenInventoryFile | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("BohnenInventory");
        const bohnenInventoryDocument = await collection.find({ UserID: userID, BohnenID: bohnenID }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });
        
        const bohnenInventoryFile: HuhnwartsBohnenInventoryFile = bohnenInventoryDocument.length == 0 ? {
            UserID: userID,
            BohnenID: bohnenID,
            Anzahl: 0
        } : JSON.parse(JSON.stringify(bohnenInventoryDocument[0]));
        
        return bohnenInventoryFile;
    }

    static async readBohnenInventoryFiles(userID: number): Promise<HuhnwartsBohnenInventoryFile[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("BohnenInventory");
        const bohnenInventoryDocument = await collection.find({ UserID: userID }).project({_id: 0}).toArray();
        await client.close();

        if(bohnenInventoryDocument.length == 0) {
            return null;
        } else {
            const bohnenInventoryFiles: HuhnwartsBohnenInventoryFile[] = bohnenInventoryDocument.map((document) => { return JSON.parse(JSON.stringify(document))});
            return bohnenInventoryFiles;
        }
    }

    static async writeBohnenInventoryFile(data: HuhnwartsBohnenInventoryFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("BohnenInventory");
        const bohnenInventoryDocument = await collection.find({ UserID: data.UserID, BohnenID: data.BohnenID }).toArray();
        if (JSON.stringify(bohnenInventoryDocument[0]) == null) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ UserID: data.UserID, BohnenID: data.BohnenID }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }

    static async deleteBohnenInventoryFile(data: HuhnwartsBohnenInventoryFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("BohnenInventory");
        const deleteBohnenInventoryDocument = await collection.deleteOne({ UserID: data.UserID, BohnenID: data.BohnenID });
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        return deleteBohnenInventoryDocument.acknowledged;
    }

    static async getAllBohnenIDs(): Promise<number[] | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Bohnen");
        const bohnenDocument = await collection.find().project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        const bohnenIDFile: number[] = bohnenDocument.map((document) => { return JSON.parse(JSON.stringify(document)).BohnenId });
        return bohnenIDFile;
    }

    //#endregion Bohnen

    //#region Achievements
    static async readAchievementsFile(id: number): Promise<HuhnwartsAchievementsFile | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Achievements");
        const achievementDocument = await collection.find({ id: id }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        const achievementsFile: HuhnwartsAchievementsFile = JSON.parse(JSON.stringify(achievementDocument[0]));
        return achievementsFile;
    }

    static async writeAchievementsFile(data: HuhnwartsAchievementsFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Achievements");
        const achievementDocument = await collection.find({ id: data.id }).toArray();
        if (JSON.stringify(achievementDocument[0]) == null) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ id: data.id }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }

    static async readUserAchievementsFiles(userId: number): Promise<HuhnwartsUserAchievementsFile[] | false | null> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("UserAchievements");
        const userAchievementsDocument = await collection.find({ UserID: userId }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        if(userAchievementsDocument.length == 0) {
            return null;
        } else {
            const userAchievementsFile: HuhnwartsUserAchievementsFile[] = userAchievementsDocument.map((document) => { return JSON.parse(JSON.stringify(document)) });
            return userAchievementsFile;
        }
    }

    static async writeUserAchievementsFile(data: HuhnwartsUserAchievementsFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("UserAchievements");
        const userAchievementsDocument = await collection.find({ UserID: data.UserID, ErfolgID: data.ErfolgID }).toArray();
        if (JSON.stringify(userAchievementsDocument[0]) == null) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ UserID: data.UserID, ErfolgID: data.ErfolgID }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }

    static async getAchievementsAmount(): Promise<number | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Achievements");
        const achievementDocument = await collection.find().project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        return achievementDocument.length;
    }
    //#endregion Achievements

    //#region Winners
    static async readWinnerFile(lostopf: string): Promise<Huhnwarts2023LostopfFile | false> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Winners");
        const winnersDocument = await collection.find({ Lostopf: lostopf }).project({_id: 0}).toArray();
        await client.close().catch((err) => {
            logger(err);
            return false;
        });

        if(winnersDocument.length == 0) {
            return {
                Lostopf: lostopf,
                winners: []
            }
        } else {
            const winnersFile: Huhnwarts2023LostopfFile = JSON.parse(JSON.stringify(winnersDocument[0]));
            return winnersFile;
        }
    }

    static async writeWinnerFile(data: Huhnwarts2023LostopfFile): Promise<boolean> {
        const client: MongoClient = new MongoClient(connectionString);
        await client.connect().catch((err) => {
            logger(err);
            return false;
        });
        const db: Db = client.db("Huhnwarts");
        const collection: Collection = db.collection("Winners");
        const achievementDocument = await collection.find({ Lostopf: data.Lostopf }).toArray();
        if (JSON.stringify(achievementDocument[0]) == null) {
            await collection.insertOne(data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        } else {
            await collection.replaceOne({ Lostopf: data.Lostopf }, data).catch(async (err) => {
                await client.close().catch((err) => {
                    logger(err);
                    return false;
                });
                logger(err);
                return false;
            });
            await client.close().catch((err) => {
                logger(err);
                return false;
            });
            return true;
        }
    }
    //#endregion Winners
}
