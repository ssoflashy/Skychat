import {Plugin} from "../../Plugin";
import {Room} from "../../../Room";
import {User} from "../../../User";
import {Session} from "../../../Session";
import {Connection} from "../../../Connection";
import {CommandEntryPointRule} from "../../Command";
import {google, youtube_v3} from "googleapis";
import {Config} from "../../../Config";
import {Message} from "../../../Message";
import {UserController} from "../../../UserController";
import {PendingYoutubeVideo} from "./PendingYoutubeVideo";
import {YoutubeVideoMeta} from "./YoutubeVideoMeta";
import {CurrentYoutubeVideo, SanitizedCurrentYoutubeVideo} from "./CurrentYoutubeVideo";
import {YoutubeHelper} from "./YoutubeHelper";
import {PollPlugin} from "../poll/PollPlugin";



type YoutubePluginStorage = {
    queue: PendingYoutubeVideo[],
    currentVideo: CurrentYoutubeVideo | null
}


/**
 * Youtube plugin for the skychat
 */
export class YoutubePlugin extends Plugin {

    readonly defaultDataStorageValue = true;

    readonly name = 'yt';

    readonly aliases = ['play', 'playpl', 'ytapi', 'ytapi:search', '~'];

    readonly rules: {[alias: string]: CommandEntryPointRule} = {
        yt: {
            minCount: 1,
            maxCount: 1,
            maxCallsPer10Seconds: 10,
            params: [{name: 'action', pattern: /^(sync|off|on|list|skip|shuffle|flush)$/}]
        },
        play: {
            minCount: 1,
            maxCount: 1,
            maxCallsPer10Seconds: 5,
            params: [{name: 'video id', pattern: /./}]
        },
        playpl: {
            minCount: 1,
            maxCount: 1,
            coolDown: 1000,
            params: [{name: 'video id', pattern: /./}]
        },
        ytapisearch: {
            minCount: 1,
            coolDown: 1000,
            params: [{name: 'search', pattern: /./}]
        }
    };

    private skipVoteInProgress: boolean = false;

    protected storage: YoutubePluginStorage = {
        queue: [],
        currentVideo: null
    };

    private readonly youtube: youtube_v3.Youtube;

    constructor(room: Room) {
        super(room);

        this.youtube = google.youtube({version: 'v3', auth: Config.YOUTUBE_API_KEY});

        if (this.room) {
            setInterval(this.tick.bind(this), 1000);
        }
    }

    async run(alias: string, param: string, connection: Connection, session: Session, user: User, room: Room | null): Promise<void> {
        if (alias === 'yt') {
            await this.handleYt(param, connection);
        } else if (alias === 'play') {
            await this.handlePlay(param, connection);
        } else if (alias === '~') {
            await this.handleSearchAndPlay(param, connection);
        } else if (alias === 'playpl') {
            await this.handlePlayPlaylist(param, connection);
        } else if (alias === 'ytapi:search') {
            await this.handleApiSearch(param, connection);
        }
    }

    /**
     * Handle generic actions on the yt plugin (eg sync)
     * @param param
     * @param connection
     */
    private async handleYt(param: string, connection: Connection): Promise<void> {

        switch (param) {

            case 'sync':
                this.sync(connection);
                break;

            case 'on':
            case 'off':
                const newState = param === 'on';
                await UserController.savePluginData(connection.session.user, this.name, newState);
                this.sync(connection);
                connection.session.syncUserData();
                break;

            case 'list':
                await this.handleYtList(connection);
                break;

            case 'skip':
                await this.handleYtSkip(connection);
                break;

            case 'shuffle':
                this.shuffleQueue();
                break;

            case 'flush':
                if (! Config.isOP(connection.session.identifier)) {
                    throw new Error('You need to be OP to flush the youtube queue');
                }
                this.storage.queue.splice(0);
                break;
        }
    }

    /**
     * Play a video
     * @param param
     * @param connection
     */
    private async handlePlay(param: string, connection: Connection): Promise<void> {
        let id;
        let match;
        if (match = param.match(/v=([a-zA-Z0-9-_]+)/)) {
            id = match[1];
        } else {
            id = param;
        }
        const video = await YoutubeHelper.getYoutubeVideoMeta(this.youtube, id);
        this.storage.queue.push({user: connection.session.user, video});
        this.shuffleQueue();
    }

    /**
     * Play a whole playlist
     * @param param
     * @param connection
     */
    private async handlePlayPlaylist(param: string, connection: Connection): Promise<void> {
        let id;
        let match;
        if (match = param.match(/list=([a-zA-Z0-9-_]+)/)) {
            id = match[1];
        } else {
            id = param;
        }
        const result = await this.youtube.playlistItems.list({part: 'contentDetails', playlistId: id, maxResults: 50});
        if (! result || ! result.data || ! result.data.items || result.data.items.length === 0) {
            throw new Error('No result found for ' + param);
        }
        const videoIds: string[] = result.data.items
            .filter(item => item.contentDetails && item.contentDetails.videoId)
            .map(item => item.contentDetails!.videoId as string);
        for (const videoId of videoIds) {
            const video = await YoutubeHelper.getYoutubeVideoMeta(this.youtube, videoId);
            this.storage.queue.push({user: connection.session.user, video});
        }
        this.shuffleQueue();
    }

    /**
     * Play a whole playlist
     * @param param
     * @param connection
     */
    private async handleApiSearch(param: string, connection: Connection): Promise<void> {
        const result = await this.youtube.search.list({
            'part': 'snippet',
            'q': param,
            'type': 'video',
            'maxResults': 20
        });
        const items = result?.data?.items;
        if (! items) {
            throw new Error('No result found');
        }
        connection.send('ytapi:search', items);
    }

    /**
     * Search + play a video
     * @param param
     * @param connection
     */
    private async handleSearchAndPlay(param: string, connection: Connection): Promise<void> {
        const result = await this.youtube.search.list({
            'part': 'snippet',
            'q': param,
            'type': 'video',
            'maxResults': 1
        });
        const videoId = (result?.data?.items || [])[0]?.id?.videoId;
        if (! videoId) {
            throw new Error('No result found for ' + param);
        }
        const video = await YoutubeHelper.getYoutubeVideoMeta(this.youtube, videoId);
        this.storage.queue.push({user: connection.session.user, video});
        this.shuffleQueue();
    }

    /**
     *
     * @param connection
     */
    private async handleYtList(connection: Connection): Promise<void> {
        const message = new Message('Videos in the queue:', null, UserController.getNeutralUser());
        for (const pending of this.storage.queue) {
            message.append(' - ' + pending.video.title + ', added by ' +pending.user.username);
        }
        connection.send('message', message.sanitized());
    }

    /**
     * @param connection
     */
    private async handleYtSkip(connection: Connection): Promise<void> {
        if (! this.storage.currentVideo) {
            return;
        }
        if (Config.isOP(connection.session.identifier)) {
            this.skip();
            return;
        }
        if (this.storage.currentVideo.user.id === connection.session.user.id) {
            this.skip();
            return;
        }
        if (! this.room.containsUser(this.storage.currentVideo.user.id)) {
            this.skip();
            return;
        }
        const timeLeftMs = this.storage.currentVideo.video.duration * 1000 - (new Date().getTime() - this.storage.currentVideo.startedDate.getTime());
        if (timeLeftMs < 30 * 1000) {
            throw new Error(`You can't skip this video. It will end soon anyway.`);
        }
        if (this.skipVoteInProgress) {
            throw new Error('A vote to skip the current video is already in progress');
        }
        this.skipVoteInProgress = true;
        const pollPlugin = this.room.getPlugin('poll') as PollPlugin;
        const poll = await pollPlugin.poll('Skip song: ' + this.storage.currentVideo.video.title, 'Do you want to skip the current video?', {
            timeout: 15 * 1000,
            defaultValue: false
        });
        if (poll.getResult()) {
            this.skip();
        }
        this.skipVoteInProgress = false;
    }

    /**
     * Skip the current song
     */
    private skip(): void {
        if (! this.storage.currentVideo) {
            return;
        }
        this.storage.currentVideo.startedDate = new Date(0);
    }

    /**
     * Shuffle the queue fairly
     */
    private shuffleQueue(): void {
        // store pending videos by owner
        const entries: {[username: string]: PendingYoutubeVideo[]} = {};
        this.storage.queue.forEach((entry: PendingYoutubeVideo) => {
            if (typeof entries[entry.user.username.toLowerCase()] === 'undefined') {
                entries[entry.user.username.toLowerCase()] = [];
            }
            entries[entry.user.username.toLowerCase()].push(entry);
        });
        // re organise queue
        let remainingCount = this.storage.queue.length;
        this.storage.queue = [];
        while (remainingCount > 0) {
            // for each username
            for (const username of Object.keys(entries)) {
                if (entries[username].length === 0) {
                    continue;
                }
                // add one of his video to the list
                this.storage.queue.push(entries[username].splice(0, 1)[0]);
                remainingCount --;
            }
        }
    }

    /**
     * When client join the room, sync their yt player
     * @param connection
     */
    async onConnectionJoinedRoom(connection: Connection): Promise<void> {
        this.sync(connection);
    }

    /**
     *
     */
    private async tick(): Promise<void> {

        // If a video is playing currently
        if (this.storage.currentVideo) {

            // If video has finished
            if (new Date() > new Date(this.storage.currentVideo.startedDate.getTime() + this.storage.currentVideo.video.duration * 1000 + 2000)) {
                this.storage.currentVideo = null;

                // If there is no more video to play, sync clients (this will deactive the player)
                if (this.storage.queue.length === 0) {
                    this.sync(this.room);
                }
            }
            return; // Wait until next tick
        }
        // Else, if no video is playing currently

        // Get the next video to play
        const nextVideo = this.storage.queue.shift();
        // If there is none
        if (! nextVideo) {
            // Nothing to do. Wait until next tick.
            return;
        }
        // Else, play this video
        this.storage.currentVideo = {...nextVideo, startedDate: new Date()};
        await this.room.sendMessage('Now playing: ' + nextVideo.video.title + ', added by ' + nextVideo.user.username, null, UserController.getNeutralUser(), null);
        this.sync(this.room);
    }

    /**
     * Sync clients
     */
    public sync(broadcaster: Connection | Room) {
        if (broadcaster instanceof Room) {
            for (const connection of broadcaster.connections) {
                this.sync(connection);
            }
            return;
        }
        // If no video is playing
        if (! this.storage.currentVideo) {
            // Abort
            broadcaster.send('yt-sync', null);
            return;
        }
        const syncObject: SanitizedCurrentYoutubeVideo = {
            enabled: UserController.getPluginData(broadcaster.session.user, this.name),
            user: this.storage.currentVideo.user.sanitized(),
            video: this.storage.currentVideo.video,
            startedDate: this.storage.currentVideo.startedDate.getTime() * 0.001,
            cursor: Date.now() * 0.001 - this.storage.currentVideo.startedDate.getTime() * 0.001
        };
        broadcaster.send('yt-sync', syncObject);
    }
}
