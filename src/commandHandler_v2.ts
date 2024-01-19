import { PrivateMessage, ChatClient } from "@twurple/chat";

export interface CommandHandlerOptions {
    args: string[];
    channel: string;
    user: string;
    message: string; 
    msg: PrivateMessage;
}

export type CommandHandlerFunction = (config: CommandHandlerOptions) => void | Promise<void>;

export class CommandHandler {
    prefix;
    chatClient: ChatClient;
    #commands: {[key: string]: {activator: boolean, userLevel: number, cooldown: {length: number, status: boolean}, modCooldown: {length: number, status: boolean}, answer?: string, handler?: CommandHandlerFunction, aliases: string[]}} = {};

    constructor(chatClient: ChatClient, prefix = "!"){
        this.chatClient = chatClient;
        this.prefix = prefix.trim();
    }

    onMessage(channel: string, user: string, message: string, msg: PrivateMessage) {
        if(!message.trim().startsWith(this.prefix)) return;
        message = message.slice(this.prefix.length);
        const args = message.split(" "); 
        var userLevel: number = 0;
        switch(true) {
            case msg.userInfo.isBroadcaster:
                userLevel = 4;
                break;
            case msg.userInfo.isMod:
                userLevel = 3;
                break;
            case msg.userInfo.isVip:
                userLevel = 2;
                break;
            case msg.userInfo.isSubscriber:
                userLevel = 1;
                break;
            default:
                userLevel = 0;
                break;
        }
        Object.entries(this.#commands).find(([name, options]) =>  {

            if(args[0].toLowerCase() !== name && !this.#commands[name].aliases.includes(args[0].toLowerCase())) return false;
            else if(options.activator == false) return false;
            else if(userLevel < this.#commands[name].userLevel) return false;
            else if(this.#commands[name].cooldown.status && userLevel < 3) return false;
            else if(this.#commands[name].modCooldown.status && userLevel >= 3) return false;
            else if(options.handler != null) options.handler({args: args.slice(1), channel, user, message, msg});
            else if(options.answer != null) this.chatClient.say(channel, options.answer);
            if(this.#commands[name].cooldown.length != 0) {
                this.#commands[name].cooldown.status = true;
                setTimeout(() => {
                    this.#commands[name].cooldown.status = false;
                }, this.#commands[name].cooldown.length*1000);
            }
            if(this.#commands[name].modCooldown.length != 0 && userLevel >= 3) {
                this.#commands[name].modCooldown.status = true;
                setTimeout(() => {
                    this.#commands[name].modCooldown.status = false;
                }, this.#commands[name].modCooldown.length*1000);
            }
            
            return true;
            
        });
    }
    /**
     * Adds a new command.
     *
     * @param name Name/s of the command. e.g. ["name_1", "name_2"]
     * @param activated Whether the command is turned on or off, true/false
     * @param userLevel Minimum Level required to trigger the command.
     *
     * Everyone: 0 | Subscriber: 1 | VIP: 2 | Mod: 3 | Broadcaster: 4
     * @param cooldown Cooldown in seconds (does not count for mods or broadcaster). 0 for no cooldown
     * @param handler The needed chat parameters. ({args, channel, user, message, msg}) =>{./ code here /.} or a simple string that gets posted in the chat, e.g. "hello world". 
     * @param modCooldown Optional cooldown for mods.
     */
    addCommand(name: string[] | string, activated: boolean, userLevel: 0|1|2|3|4, cooldown: number, handler: CommandHandlerFunction | string, modCooldown: number = 0) {
        if(typeof handler == "string") {
            if(typeof name == "string") {
                this.#commands[name.toLocaleLowerCase()] = {activator: activated, userLevel: userLevel, cooldown: {length: cooldown, status: false}, modCooldown: {length: modCooldown, status: false}, answer: handler, aliases: []};
            } else {
                this.#commands[name[0].toLocaleLowerCase()] = {activator: activated, userLevel: userLevel, cooldown: {length: cooldown, status: false}, modCooldown: {length: modCooldown, status: false}, answer: handler, aliases: name.slice(1).map(name => name.toLowerCase())};
            }
        }
        else {
            if(typeof name == "string") {
                this.#commands[name.toLocaleLowerCase()] = {activator: activated, userLevel: userLevel, cooldown: {length: cooldown, status: false}, modCooldown: {length: modCooldown, status: false}, handler, aliases: []};
            } else {
                this.#commands[name[0].toLocaleLowerCase()] = {activator: activated, userLevel: userLevel, cooldown: {length: cooldown, status: false}, modCooldown: {length: modCooldown, status: false}, handler, aliases: name.slice(1).map(name => name.toLowerCase())};
            }
        }
        // console.log(`command ${name} added.`);
        
                
    }
    deleteCommand(deleteName: string) {
        if(deleteName.startsWith(this.prefix)) deleteName = deleteName.slice(this.prefix.length);
        var names: string = "";
        Object.entries(this.#commands).find(([name, options]) =>  {
            if(deleteName == name || this.#commands[name].aliases.includes(deleteName)){
            delete this.#commands[name];
            names = [name].concat(options.aliases).join(" | ");
            return true;
            }
        });
        return names;
    }
    deactivateCommand(deactivateName: string) {
        if(deactivateName.startsWith(this.prefix)) deactivateName = deactivateName.slice(this.prefix.length);
        var names: string = "";
        Object.entries(this.#commands).find(([name, options]) =>  {
            if(deactivateName == name || this.#commands[name].aliases.includes(deactivateName)){
                this.#commands[name].activator = false;
                names = [name].concat(options.aliases).join(" | ");
                return true;
            }
        });
        return names;
    }
    activateCommand(activateName: string) {
        if(activateName.startsWith(this.prefix)) activateName = activateName.slice(this.prefix.length);
        var names: string = "";
        Object.entries(this.#commands).find(([name, options]) =>  {
            if(activateName == name || this.#commands[name].aliases.includes(activateName)){
            this.#commands[name].activator = true;
            names = [name].concat(options.aliases).join(" | ");
            return true;
        }
        });
        return names;
    }
}