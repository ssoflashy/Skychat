<template>
    <hover-card
        :border-color="message.user.data.plugins.color"
        class="message-card"
    >
        <div class="message"
            @contextmenu.prevent="$emit('select')">
            <div class="avatar image-bubble" :style="{'box-shadow': message.user.data.plugins.halo ? '0 0 4px 4px ' + message.user.data.plugins.color : 'unset'}">
                <img :src="message.user.data.plugins.avatar">
            </div>
            <div class="content selectable" ref="formatted">
                <div class="user" :style="{'color': message.user.data.plugins.color}">
                    <i v-show="message.user.data.plugins.pinnedicon" class="material-icons md-14">{{message.user.data.plugins.pinnedicon}}</i>
                    {{message.user.username}}
                    <i v-show="message.meta.device === 'mobile'" class="material-icons user-device md-14">smartphone</i>
                </div>

                <!-- first quote -->
                <div class="quote" v-if="message.quoted">
                    <div class="quote-user">{{message.quoted.user.username}}:</div>
                    <!-- second quote -->
                    <div class="quote" v-if="message.quoted.quoted">
                        <div class="quote-user">{{message.quoted.quoted.user.username}}:</div>
                        <div class="quote-content" v-html="message.quoted.quoted.formatted"></div>
                    </div>
                    <div class="quote-content" v-html="message.quoted.formatted"></div>
                </div>
                <div class="formatted" v-html="message.formatted"></div>
            </div>
            <div class="meta selectable">
                <div class="date">
                    {{formattedDate}}
                </div>
                <div class="seen-users">
                    <div v-for="seenUser of seenUsers"
                        :key="seenUser.username"
                        class="avatar image-bubble"
                        :title="'Seen by ' + seenUser.username"
                        :style="{'border': '1px solid ' + seenUser.data.plugins.color}">
                        <img :src="seenUser.data.plugins.avatar">
                    </div>
                </div>
            </div>
        </div>
    </hover-card>
</template>

<script>
    import Vue from "vue";
    import HoverCard from "../util/HoverCard.vue";
    
    export default Vue.extend({
        components: { HoverCard },
        props: {
            message: {
                type: Object,
                required: true,
            },
            seenUsers: {
                type: Array,
                required: true
            }
        },
        watch: {
            'message.formatted': function() {
                Vue.nextTick(() => {
                    this.bindContentLoaded();
                });
            }
        },
        mounted: function() {
            this.bindContentLoaded();
        },
        methods: {
            bindContentLoaded: function() {
                // Get images
                const images = Array.from(this.$refs.formatted.getElementsByTagName('img'));
                for (const image of images) {
                    image.addEventListener('load', () => {
                        this.$emit('content-loaded');
                    });
                }
                // Get buttons
                const buttons = Array.from(this.$refs.formatted.getElementsByClassName('skychat-button'));
                for (const button of buttons) {
                    button.addEventListener('click', () => {
                        if (button.dataset.action[0] === '/' && button.dataset.trusted === 'false' && ! confirm('Send "' + button.dataset.action + '"?')) {
                            return;
                        }
                        this.$client.sendMessage(button.dataset.action);
                    });
                }
            }
        },
        computed: {
            formattedDate: function() {
                const date = new Date(this.message.createdTimestamp * 1000);
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const seconds = date.getSeconds().toString().padStart(2, '0');
                return `${hours}:${minutes}:${seconds}`;
            }
        }
    });
</script>

<style lang="scss" scoped>

    .message-card {
        margin-top: 2px;

        &:hover .message {
            background: #313235;
        }
        
        .message {
            background: #242427;
            display: flex;
            flex: 0 0 auto;
            color: white;
            padding: 6px 10px 6px 12px;
            transition: .1s all;
            min-height: 60px;

            >.avatar {
                width: 40px;
                height: 40px;
                margin-top: 4px;
                box-shadow: 1px 1px 10px 0px #ffffff78;
            }

            >.content {
                flex-grow: 1;
                margin-left: 16px;
                width: 0;
                word-break: break-word;
                display: flex;
                flex-direction: column;

                >.user {
                    display: inline;
                    color: #a3a5b4;
                    font-weight: 800;
                    font-size: 110%;
                    margin-bottom: 4px;
                }

                .quote {
                    margin: 10px;
                    padding: 4px 10px;
                    border-left: 5px solid grey;

                    >.quote-user {
                        font-size: 80%;
                    }
                    >.quote-content {
                        margin-top: 5px;
                        margin-left: 4px;
                    }
                }
            }
            >.meta {
                font-size: 70%;
                display: flex;
                flex-direction: column;
                width: 66px;
                text-align: center;

                >.seen-users {
                    display: flex;
                    flex-wrap: wrap;
                    margin-top: 6px;
                    justify-content: center;
                    max-height: 32px;
                    overflow: hidden;

                    >.avatar {
                        width: 14px;
                        height: 14px;
                        margin: 1px;
                    }
                }
            }
        }
    }
</style>
