import {Connection} from "../../skychat/Connection";
import {RoomPlugin} from "../RoomPlugin";
import { UserController } from "../../skychat/UserController";
import { Config } from "../../skychat/Config";
import { Room } from "../../skychat/Room";
import { Session } from "../../skychat/Session";


export class RoomManagerPlugin extends RoomPlugin {

    static readonly commandName = 'room';

    static readonly commandAliases = ['roomset', 'roomcreate', 'roomleave', 'roomdelete', 'roomplugin'];

    readonly rules = {
        room: { },
        roomcreate: {
            minCount: 0,
            params: [
                {name: 'name', pattern: /.+/},
            ]
        },
        roomset: {
            minCount: 2,
            params: [
                {name: 'property', pattern: /^(name)$/},
                {name: 'value', pattern: /.?/},
            ]
        },
        roomleave: { minCount: 0, },
        roomdelete: { maxCount: 0, },
        roomplugin: {
            minCount: 1,
            maxCount: 1,
            params: [
                {name: 'plugin', pattern: /^(\+|\-)([A-Za-z0-9]+)$/},
            ]
        },
    };

    async run(alias: string, param: string, connection: Connection): Promise<void> {

        switch (alias) {

            case 'roomset':
                await this.handleRoomSet(param, connection);
                break;

            case 'roomcreate':
                await this.handleRoomCreate(param, connection);
                break;

            case 'roomleave':
                await this.handleRoomLeave(param, connection);
                break;

            case 'roomdelete':
                await this.handleRoomDelete(param, connection);
                break;

            case 'roomplugin':
                await this.handleRoomPlugin(param, connection);
                break;
        }
    }

    async handleRoomCreate(param: string, connection: Connection): Promise<void> {
        if (! connection.session.isOP()) {
            throw new Error('Only OP can create public rooms');
        }
        const roomName = param.trim();
        const room = this.room.manager.createRoom(roomName);
        const message = UserController.createNeutralMessage({ id: 0, content: `Room ${room.id} has been created` });
        connection.send('message', message.sanitized());
    }

    canManageRoom(session: Session, room: Room): boolean {
        if (room.isPrivate) {
            return room.whitelist.indexOf(session.identifier) !== -1;
        } else {
            return session.isOP();
        }
    }

    async handleRoomSet(param: string, connection: Connection): Promise<void> {
        if (! this.canManageRoom(connection.session, this.room)) {
            throw new Error('You do not have the permission to modify this room');
        }
        const property = param.substr(0, param.indexOf(' '));
        const value = param.substr(param.indexOf(' ') + 1).trim();
        
        switch (property) {

            case 'name':
                this.room.name = value;
                break;
            
            default:
                throw new Error(`Invalid property ${property}`);
        }
        Object.values(Session.sessions).forEach(session => this.room.manager.sendRoomList(session));
        const message = UserController.createNeutralMessage({ id: 0, content: `Room property ${property} set to ${value}` });
        connection.send('message', message.sanitized());
    }

    async handleRoomLeave(param: string, connection: Connection): Promise<void> {
        if (! this.room.isPrivate) {
            throw new Error('You can not leave a public room');
        }
        if (this.room.whitelist.length === 1) {
            throw new Error('You can not leave this room, you are the last user in it');
        }
        this.room.unallow(connection.session.identifier);
        this.room.manager.sendRoomList(connection);
        this.room.whitelist
            .map(ident => Session.getSessionByIdentifier(ident))
            .filter(session => !! session)
            .forEach(session => this.room.manager.sendRoomList(session as Session));
    }

    async handleRoomDelete(param: string, connection: Connection): Promise<void> {
        if (this.room.isPrivate && this.room.whitelist.length > 1) {
            throw new Error('You can not delete this room, others are still in it');
        }
        if (! this.canManageRoom(connection.session, this.room)) {
            throw new Error('You do not have the permission to delete this room');
        }
        await this.room.manager.deleteRoom(this.room.id);
        const message = UserController.createNeutralMessage({ id: 0, content: `Room ${this.room.id} has been deleted` });
        connection.send('message', message.sanitized());
    }

    async handleRoomPlugin(param: string, connection: Connection): Promise<void> {
        if (this.room.isPrivate) {
            throw new Error('Unable to customize plugins in private rooms');
        }
        if (! connection.session.isOP()) {
            throw new Error('Only OP can manage public room plugins');
        }
        const add = param[0] === '+';
        const pluginName = param.substr(1);
        
        // Add a plugin
        if (add) {
            if (Config.PLUGINS.indexOf(pluginName) === -1) {
                throw new Error(`Plugin ${pluginName} does not exist. Is it in the preferences.json file?`);
            }
            if (this.room.enabledPlugins.indexOf(pluginName) !== -1) {
                throw new Error(`Plugin ${pluginName} is already enabled`);
            }
            this.room.enabledPlugins.push(pluginName);
            const message = UserController.createNeutralMessage({ id: 0, content: `Plugin ${pluginName} has been enabled` });
            connection.send('message', message.sanitized());
            return;
        }

        // Remove a plugin
        if (this.room.enabledPlugins.indexOf(pluginName) === -1) {
            throw new Error(`Unable to disable plugin ${pluginName} because it is not currently enabled in this room`);
        }
        this.room.enabledPlugins = this.room.enabledPlugins.filter(name => name !== pluginName);
        const message = UserController.createNeutralMessage({ id: 0, content: `Plugin ${pluginName} has been disabled` });
        connection.send('message', message.sanitized());
        return;
    }
}
