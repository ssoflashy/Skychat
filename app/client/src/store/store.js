import Vue from "vue";
import Vuex from "vuex";
Vue.use(Vuex);


const DEFAULT_DOCUMENT_TITLE = "~ SkyChat";

const store = {
    state: {
        focused: true,
        documentTitle: DEFAULT_DOCUMENT_TITLE,
        documentTitleBlinking: false,
        page: 'welcome',
        mobileCurrentPage: 'tchat',
        channel: null,
        connectionState: WebSocket.CLOSED,
        user: {
            id: 0,
            username: '*Hamster0',
            money: 0,
            xp: 0,
            right: -1,
            data: {
                plugins: {
                    avatar: "https://risibank.fr/cache/stickers/d666/66604-thumb.png",
                    cursor: true,
                    moto: "",
                }
            }
        },
        currentRoom: null,
        connectedList: [],

        /**
         * Mapping from message ids to users whose last seen message id is this message.
         * Generated from the list of connected users.
         */
        lastMessageSeenIds: {},

        cursors: {},
        messages: [],
        privateMessages: {},
        playerState: null,
        typingList: [],
        polls: [],
        pollResult: null,
        ytApiSearchResult: {}
    },
    mutations: {
        FOCUS(state) {
            state.focused = true;
            state.documentTitle = DEFAULT_DOCUMENT_TITLE;
            state.documentTitleBlinking = false;
        },
        BLUR(state) {
            state.focused = false;
        },
        SET_PAGE(state, page) {
            state.page = page;
        },
        SET_MOBILE_PAGE(state, mobilePage) {
            state.mobileCurrentPage = mobilePage;
        },
        SET_CHANNEL(state, channelName) {
            channelName = channelName.toLowerCase();
            if (typeof state.privateMessages[channelName] === 'undefined') {
                Vue.set(state.privateMessages, channelName, {unreadCount: 0, messages: []});
            }
            state.channel = channelName;
            state.privateMessages[channelName].unreadCount = 0;
        },
        GOTO_MAIN_CHANNEL(state) {
            state.channel = null;
        },
        SET_CONNECTION_STATE(state, connectionState) {
            state.connectionState = connectionState;
        },
        SET_CURRENT_ROOM(state, currentRoom) {
            state.currentRoom = currentRoom;
        },
        SET_USER(state, user) {
            state.user = user;
        },
        SET_CONNECTED_LIST(state, entries) {
            state.connectedList = entries;
            // Update last seen message ids
            const lastSeen = {};
            for (const entry of entries) {
                const id = entry.user.data.plugins.lastseen;
                if (! id) {
                    continue;
                }
                if (typeof lastSeen[id]) {
                    lastSeen[id] = [];
                }
                lastSeen[id].push(entry.user);
            }
            state.lastMessageSeenIds = lastSeen;
        },
        NEW_MESSAGE(state, message) {
            state.messages.push(message);
            if (! state.focused) {
                state.documentTitle = `New message by ${message.user.username}`;
                state.documentTitleBlinking = true;
            }
            if (message.content.match(new RegExp('@' + state.user.username.toLowerCase(), 'i'))) {
                new Audio('/assets/sound/notification.mp3').play();
            }
        },
        NEW_PRIVATE_MESSAGE(state, privateMessage) {
            const fromUserName = privateMessage.user.username.toLowerCase();
            const toUserName = privateMessage.to.username.toLowerCase();
            const otherUserName = (fromUserName === state.user.username.toLowerCase() ? toUserName : fromUserName).toLowerCase();

            if (typeof state.privateMessages[otherUserName] === 'undefined') {
                Vue.set(state.privateMessages, otherUserName, {unreadCount: 0, messages: []});
            }
            state.privateMessages[otherUserName].messages.push(privateMessage);
            if (state.channel !== otherUserName) {
                state.privateMessages[otherUserName].unreadCount ++;
            }
            if (! state.focused) {
                state.documentTitle = `New message by ${privateMessage.user.username}`;
                state.documentTitleBlinking = true;
            }
        },
        MESSAGE_EDIT(state, message) {
            const oldMessageIndex = state.messages.findIndex(m => m.id === message.id);
            if (oldMessageIndex === -1) {
                return;
            }
            Vue.set(state.messages, oldMessageIndex, message);
        },
        SET_PLAYER_STATE(state, playerState) {
            state.playerState = playerState;
        },
        SET_POLLS(state, polls) {
            if (polls.length > state.polls.length) {
                new Audio('/assets/sound/new-poll.ogg').play();
            }
            state.polls = polls;
        },
        SET_POLL_RESULT(state, pollResult) {
            state.pollResult = pollResult;
        },
        CLEAR_POLL_RESULT(state) {
            state.pollResult = null;
        },
        SET_TYPING_LIST(state, users) {
            state.typingList = users;
        },
        NEW_CURSOR(state, cursor) {
            if (cursor.user.id === state.user.id) {
                return;
            }
            Vue.set(state.cursors, cursor.user.id, {date: new Date(), cursor});
            // Clean up the cursors
            if (Math.random() < 0.1) {
                for (const userId in state.cursors) {
                    const entry = state.cursors[userId];
                    if (new Date().getTime() - entry.date.getTime() > 5 * 1000) {
                        delete state.cursors[userId];
                    }
                }
            }
        },
        SET_ROLL_STATE(state, rollState) {
            if (state.rollState === rollState) {
                return;
            }
            state.rollState = rollState;

            if (rollState) {
                const rollSound = new Audio('/assets/sound/roll.ogg');
                rollSound.load();
                setTimeout(() => rollSound.play(), 100);
            } else {

                const rollEndSound = new Audio('/assets/sound/roll-end.ogg');
                rollEndSound.play();
            }
        },
        SET_YT_API_SEARCH_RESULTS(state, result) {
            state.ytApiSearchResult = result;
        }
    }
};

export default new Vuex.Store(store);
