<template>
    <div class="messages-feed scrollbar"
            ref="scroller"
            @scroll="onScroll"
            :style="smoothScroll ? 'scroll-behavior: smooth' : ''">
        
        <single-message v-for="item in messages"
            @select="$emit('select-message', item)"
            @content-loaded="onContentLoaded"
            :key="item.id"
            :message="item"
            :seen-users="lastMessageSeenIds[item.id] || []"></single-message>
    </div>
</template>

<script>
    import Vue from "vue";
    import { mapState } from 'vuex';
    import SingleMessage from "./SingleMessage.vue";
    import VideoPlayer from "../video-player/VideoPlayer.vue";

    export default Vue.extend({
        components: { VideoPlayer, SingleMessage },
        data: function() {
            return {
                autoScroll: true,
                smoothScroll: true,
                autoScrolling: false,
            };
        },
        props: {
            messages: {
                required: true,
                type: Array,
            },
            hidePlayer: {
                required: false,
                default: false,
                type: Boolean
            }
        },
        watch: {
            messages: function() {
                this.scrollToBottomIfAutoScroll();
            }
        },
        methods: {
            scrollToBottomIfAutoScroll: function() {
                if (! this.autoScroll) {
                    return;
                }
                // We need to wait 1 tick for the message to be rendered
                Vue.nextTick(() => {
                    this.scrollToBottom(this.distanceToBottom() > 200);
                });
            },
            onContentLoaded: function() {
                if (this.autoScroll) {
                    this.scrollToBottom();
                }
            },
            distanceToBottom: function() {
                return this.$refs.scroller.scrollHeight - this.$refs.scroller.offsetHeight - this.$refs.scroller.scrollTop;
            },
            onScroll: function() {
                if (this.autoScrolling) {
                    return;
                }
                const distanceToBottom = this.distanceToBottom();
                if (distanceToBottom > 60) {
                    // Stop auto scroll
                    this.autoScroll = false;
                } else if (distanceToBottom < 30) {
                    this.autoScroll = true;
                }
            },
            scrollToBottom: function(immediate) {
                // If already auto scrolling, abort
                if (this.autoScrolling) {
                    return;
                }
                // Set scrolling state to true
                this.autoScrolling = true;
                // If in immediate mode
                if (immediate) {
                    // Disable smooth scroll
                    this.smoothScroll = false;
                    // Wait for smooth scroll to be disabled
                    Vue.nextTick(() => {
                        // Scroll directly to bottom
                        this.$refs.scroller.scrollTop = this.$refs.scroller.scrollHeight;
                        // Re-enable smooth scroll
                        this.smoothScroll = true;
                        // Update scrolling state
                        this.autoScrolling = false;
                    });
                } else {
                    // Smoothly scroll to bottom
                    this.$refs.scroller.scrollTop = this.$refs.scroller.scrollHeight;
                    // In a few ms, check if still need to scroll
                    setTimeout(() => {
                        // Update state
                        this.autoScrolling = false;
                        // If still need to scroll
                        const distance = this.distanceToBottom();
                        if (distance > 1) {
                            this.scrollToBottom(distance > 200);
                        }
                    }, 100);
                }
            },
        },
        computed: {
            ...mapState('Main', [
                'lastMessageSeenIds',
            ]),
        }
    });
</script>

<style lang="scss" scoped>
    .messages-feed {
        flex-grow: 1;
        margin-left: 10px;
        margin-right: 10px;
        height: 0;
        overflow-y: scroll;
        display: flex;
        flex-direction: column;
    }
</style>
