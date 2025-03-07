import { GlobalPlugin } from "../GlobalPlugin";
import { Connection } from "../../skychat/Connection";
import { User } from "../../skychat/User";
import { MessageFormatter } from "../../skychat/MessageFormatter";
import { Config } from "../../skychat/Config";


export class AudioRecorderPlugin extends GlobalPlugin {

    // Maximum number of recordings to keep in memory
    public static MAX_RECORDING_CACHED: number = 32;

    // Max recording length
    public static MAX_BUFFER_LENGTH: number = 1048576;

    static readonly commandName = 'audio';

    readonly minRight = Config.PREFERENCES.minRightForAudioRecording;

    readonly rules = {
        audio: {
            minCount: 1,
            maxCount: 1,
            params: [{name: 'audio id', pattern: /^[0-9]+$/, info: 'Id of the audio to play'}]
        },
    };

    private currentEntryId: number = 0;

    public entries: {[id: number]: {buffer: Buffer, user: User}} = {};

    /**
     * Send an audio recording to the client
     * @param alias
     * @param param 
     * @param connection 
     */
    async run(alias: string, param: string, connection: Connection): Promise<void> {
        const entry = this.entries[parseInt(param)];
        if (! entry) {
            throw new Error('Audio entry not found');
        }
        connection.webSocket.send(entry.buffer);
    }

    /**
     * Register an audio recording
     * @param buffer
     * @param connection 
     */
    async registerAudioBuffer(buffer: Buffer, connection: Connection): Promise<void> {

        if (connection.session.user.right < Config.PREFERENCES.minRightForAudioRecording) {
            throw new Error('You do not have the permission to save audio files');
        }

        if (buffer.length > AudioRecorderPlugin.MAX_BUFFER_LENGTH) {
            throw new Error('Audio recording too long');
        }

        // Get current connection room
        const roomId = connection.roomId;
        if (roomId === null) {
            throw new Error('You need to be in a room to send audio files');
        }
        const room = this.manager.getRoomById(roomId);
        if (! room) {
            throw new Error('Room does not exist');
        }

        // Register audio buffer
        this.entries[++ this.currentEntryId] = {
            buffer,
            user: connection.session.user,
        };
        
        // Send the message to the room
        const content = `[[play audio//audio ${this.currentEntryId}]]`;
        await room.sendMessage({
            formatted: MessageFormatter.getInstance().replaceButtons(content, false, true),
            content: content,
            user: connection.session.user,
            connection,
            meta: {
                audio: this.currentEntryId
            }
        });

        // Update the date of the last sent message
        connection.session.lastMessageDate = new Date();

        // Delete old entry
        delete this.entries[this.currentEntryId - AudioRecorderPlugin.MAX_RECORDING_CACHED];
    }
}
