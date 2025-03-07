<template>
    <div class="room-list" v-show="rooms.length > 1 || op">
        <div class="subtitle">
            <h3>
                text
                <span v-show="op" @click="createRoom()" class="room-create material-icons md-12">add</span>
            </h3>
        </div>
        <hover-card v-for="room in rooms"
            :key="room.id"
            :clickable="true"
            :selected="currentRoom === room.id"
            :highlighted="user.id > 0 && (user.data.plugins.lastseen[room.id] || 0) < room.lastReceivedMessageId && currentRoom !== room.id"
            :border-color="'#afafaf'"
            class="room"
            @click.native="joinRoom(room.id)"
        >
            <div class="room-content">
                <div v-show="room.isPrivate" class="room-icon material-icons md-14">mail</div>
                <div class="room-name" :title="room.name">
                    <b>{{ getRoomName(room) }}</b>
                </div>
                <div class="room-meta">

                    <!-- delete room (op or private with one person) -->
                    <div v-show="canDeleteRoom(room)"
                        @click="deleteRoom()"
                        class="room-delete mr-1"
                        title="Delete this room">
                        <i class="material-icons md-14">close</i>
                    </div>

                    <!-- leave room (private rooms) -->
                    <div v-show="canLeaveRoom(room)"
                        @click="leaveRoom()"
                        class="room-leave mr-1"
                        title="Leave this room">
                        <i class="material-icons md-14">logout</i>
                    </div>

                    <!-- user count -->
                    <div v-if="roomConnectedUsers[room.id] && roomConnectedUsers[room.id].length > 0"
                        class="room-users mr-1"
                        title="Users in this room">
                        <i class="material-icons md-14">{{roomConnectedUsers[room.id].length > 1 ? 'group' : 'person'}}</i>
                        <span>{{ roomConnectedUsers[room.id].length }}</span>
                    </div>
                </div>
            </div>
        </hover-card>
    </div>
</template>

<script>
    import Vue from "vue";
    import { mapState } from 'vuex';
    import HoverCard from "../util/HoverCard.vue";

    export default Vue.extend({
        components: { HoverCard },
        methods: {
            getRoomName: function(room) {
                if (room.isPrivate) {
                    if (room.whitelist.length > 1) {
                        return room.whitelist.filter(ident => ident !== this.user.username.toLowerCase()).join(', ');
                    } else {
                        return room.name + ' (closed)';
                    }
                } else {
                    return room.name;
                }
            },
            canDeleteRoom: function(room) {
                if (room.isPrivate) {
                    return this.currentRoom === room.id && room.whitelist.length === 1;
                } else {
                    return this.currentRoom === room.id && this.op;
                }
            },
            canLeaveRoom: function(room) {
                return this.currentRoom === room.id && room.isPrivate && room.whitelist.length > 1;
            },
            joinRoom: function(id) {
                this.$client.joinRoom(id);
            },
            createRoom: function() {
                this.$client.createRoom();
            },
            deleteRoom: function() {
                this.$client.deleteCurrentRoom();
            },
            leaveRoom: function() {
                this.$client.leaveCurrentRoom();
            }
        },
        computed: {
            ...mapState('Main', [
                'rooms',
                'currentRoom',
                'roomConnectedUsers',
                'user',
                'op',
            ]),
        },
    });
</script>

<style lang="scss" scoped>

.room-list {
    color: white;
    padding-left: 4px;

    .subtitle {
        width: 100%;
        background: #242427;
        margin-top: 2px;
        text-align: center;

        h3 {
            color: #b4b4b4;
            font-size: 10px;
            text-transform: uppercase;
            padding-top: 2px;
        }

        .room-create {
            cursor: pointer;
            vertical-align: bottom;
        }
    }

    .room {
        
        height: 35px;
        margin-top: 2px;
        
        .room-content {
            display: flex;

            .room-icon {
                flex-basis: 14px;
                margin-top: 8px;
                margin-left: 10px;
            }

            .room-name {
                flex-grow: 1;
                margin-top: 8px;
                margin-left: 10px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }

            .room-meta {
                flex-basis: 65px;
                margin-top: 10px;
                display: flex;
                flex-direction: row-reverse;

                .room-users {
                    color: #8ecfff;
                    span { vertical-align: top; }
                }

                .room-delete,
                .room-leave {
                    color: #ff8e8e;
                }
            }
        }
    }
}

</style>
