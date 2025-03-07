<template>
    <div class="mt-2">
        <div class="youtube-preview pr-2">

            <!-- preview container -->
            <div class="preview-image-container"
                :style="{
                    'background-image': playerState.current ? `url(${playerState.current.video.thumb})` : 'none'
                }">

                <!-- progress bars -->
                <div class="progress-bar progress-bar-top" :class="'custom-color-' + progressBarColor" :style="{'width': (100 * cursorPercent) + '%'}"></div>
                <div class="progress-bar progress-bar-bottom" :class="'custom-color-' + progressBarColor" :style="{'width': (100 * cursorPercent) + '%'}"></div>
                <div class="progress-bar progress-bar-left" :class="'custom-color-' + progressBarColor" :style="{'height': (100 * cursorPercent) + '%'}"></div>
                <div class="progress-bar progress-bar-right" :class="'custom-color-' + progressBarColor" :style="{'height': (100 * cursorPercent) + '%'}"></div>
    
                <!-- title -->
                <div class="preview-title" v-if="playerState.current">{{playerState.current.video.title}}</div>

                <!-- sliding window that closes over the image -->
                <div class="sliding-window top" :class="{['custom-color-' + progressBarColor]: true, 'closed': cursorPercent >= 1}"></div>
                <div class="sliding-window bottom" :class="{['custom-color-' + progressBarColor]: true, 'closed': cursorPercent >= 1}"></div>
            </div>

            <!-- yt preview right col -->
            <div class="preview-right-col">

                <!-- youtube queue -->
                <div class="queue scrollbar">
                    <div v-for="video, videoIndex in nextQueuedEntries"
                        class="video-in-queue"
                        :key="video.video.id"
                        :title="video.video.title + ': added by ' + video.user.username">

                        <!-- video preview image -->
                        <div class="image avatar">
                            <div class="image-bubble" :style="'box-shadow: #' + progressBarColor +' 0 0 4px 0;'">
                                <img :src="video.video.thumb">
                            </div>
                        </div>

                        <!-- the svg has -5px left and top to avoid the circles being truncated -->
                        <svg height="50" width="50">
                            <circle cx="25" cy="25" r="20" fill="none" stroke="black"></circle>
                            <circle cx="25" cy="25" r="20" :class="'custom-color-' + progressBarColor" :stroke-dashoffset="- (queueWaitDurations[videoIndex]) * 2 * Math.PI * 25"></circle>
                        </svg>
                    </div>
                </div>
                    
                <!-- bottom actions -->
                <div v-if="nextEvent" class="preview-actions next-event">
                    <b>{{ new Date(nextEvent.start).toLocaleTimeString() }}</b>
                    <div class="video-in-queue">
                        <div class="image avatar">
                            <div class="image-bubble" :style="'box-shadow: #' + progressBarColor +' 0 0 4px 0;'">
                                <img :src="nextEvent.media.thumb">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="preview-actions">
                    <div v-show="canHandlePlayer() && playerState.current && playerState.current.video.duration !== 0"
                        @click="ytReplay30"
                        title="Replay 30 seconds"
                        class="preview-action">
                        <i class="material-icons md-14">replay_30</i>
                    </div>
                    <div v-show="canHandlePlayer() && playerState.current && playerState.current.video.duration !== 0"
                        @click="ytSkip30"
                        title="Skip 30 seconds"
                        class="preview-action">
                        <i class="material-icons md-14">forward_30</i>
                    </div>
                    <div v-show="playerState.current"
                        @click="ytSkip"
                        title="Skip video"
                        class="preview-action">
                        <i class="material-icons md-14">skip_next</i>
                    </div>
                </div>
                <div class="preview-actions">
                    <div @click="ytAdd"
                        title="Play a video"
                        class="preview-action">
                        <i class="material-icons md-14">add</i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import Vue from "vue";
    import { mapState } from "vuex";
    import YoutubeVideoSearcher from "../modal/YoutubeVideoSearcher.vue";

    export default Vue.extend({
        data: function() {
            return {
                cursorPercent: 1.,
                progressBarColor: '000000',
                queueWaitDurations: []
            }
        },
        mounted: function() {
            this.updateCurrentDuration();
            this.updateQueueWaitDurations();
            this.updateProgressBarColor();
            setInterval(this.updateCurrentDuration.bind(this), 2000);
            setInterval(this.updateQueueWaitDurations.bind(this), 2000);
            setInterval(this.updateProgressBarColor.bind(this), 6 * 1000);
        },
        watch: {
            'nextQueuedEntries': {
                deep: true,
                handler: function() {
                    this.updateQueueWaitDurations();
                }
            }
        },
        methods: {
            updateQueueWaitDurations: function() {
                let waitDuration = 0;
                if (this.playerState.current) {
                    waitDuration += this.playerState.current.video.duration - (new Date().getTime() - this.playerState.current.video.startTime);
                }
                let waitDurations = [];
                for (const entry of this.nextQueuedEntries) {
                    waitDurations.push(waitDuration);
                    waitDuration += entry.video.duration - entry.video.startCursor;
                }
                waitDurations = waitDurations.map(duration => Math.max(0, duration / waitDuration));
                this.queueWaitDurations = waitDurations;
            },
            updateCurrentDuration: function() {
                if (! this.playerState.current) {
                    this.cursorPercent = 1.;
                    return;
                }
                if (this.playerState.current.video.duration === 0) {
                    this.cursorPercent = 0;
                    return;
                }
                let pct = (new Date().getTime() - this.playerState.current.video.startTime + this.playerState.current.video.startCursor) / this.playerState.current.video.duration;
                pct = Math.max(0, pct);
                pct = Math.min(1, pct);
                this.cursorPercent = pct;
            },
            updateProgressBarColor: function() {
                if (! this.playerState.current) {
                    this.progressBarColor = '000000';
                    return;
                }
                const colors = ['ffffff', 'ff8f8f', '8ecfff', '6ee067', 'e0a067', '9b71b9'];
                const indexOf = colors.indexOf(this.progressBarColor);
                const newIndex = (indexOf + 1) % colors.length;
                this.progressBarColor = colors[newIndex];
            },
            ytReplay30: function() {
                this.$client.sendMessage('/player replay30');
            },
            ytSkip30: function() {
                this.$client.sendMessage('/player skip30');
            },
            ytSkip: function() {
                this.$client.sendMessage('/player skip');
            },
            ytAdd: function() {
                this.$modal.show(YoutubeVideoSearcher);
            },
            canHandlePlayer: function() {
                return this.playerState.current && this.user && this.user.id === this.playerState.current.user.id;
            },
        },
        computed: {
            ...mapState('Main', [
                'user',
                'playerState',
                'playerChannels',
                'playerChannel',
            ]),
            nextEvent: function() {
                if (! this.playerChannel) {
                    return null;
                }
                const nextEvents = this.playerChannel.schedule.events.filter(event => event.start + event.duration > new Date().getTime());
                return nextEvents.length > 0 ? nextEvents[0] : null;
            },
            nextQueuedEntries: function() {
                return this.playerState.queue.slice(0, 30);
            }
        }
    });
</script>

<style lang="scss" scoped>

    .youtube-preview {

        width: 100%;
        height: 230px;
        display: flex;
        padding-left: 6px;
        color: white;

        >.preview-image-container {
            position: relative;
            flex-basis: 284.444444444px;
            background-color: black;
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center;
            
            > .progress-bar {
                position: absolute;
                transition: all 1s ease-in-out;

                &.progress-bar-top {
                    height: 2px;
                    top: 0;
                    right: 0;
                }
                &.progress-bar-bottom {
                    height: 2px;
                    bottom: 0;
                    left: 0;
                }
                &.progress-bar-left {
                    width: 2px;
                    left: 0;
                    bottom: 0;
                }
                &.progress-bar-right {
                    width: 2px;
                    right: 0;
                    top: 0;
                }
            }

            > .preview-title {
                position: absolute;
                left: 8px;
                top: 5px;
                white-space: nowrap;
                overflow: hidden;
                -ms-text-overflow: ellipsis;
                text-overflow: ellipsis;
                margin-bottom: 2px;
                max-width: calc(100% - 16px);
                font-size: 120%;
                font-weight: 600;
                padding: 4px;
                background-color: #0000004d;
                border-radius: 4px;
            }

            > .sliding-window {
                width: 100%;
                position: absolute;
                left: 0;
                height: 0;
                -webkit-transition: all 1s ease-in-out;
                -moz-transition: all 1s ease-in-out;
                -ms-transition: all 1s ease-in-out;
                -o-transition: all 1s ease-in-out;
                transition: all 1s ease-in-out;

                &.top {
                    top: 0;
                }
                &.bottom {
                    bottom: 0;
                }
                &.closed {
                    height: 50%;
                }
            }
        }

        .image-container {
            display: flex;
            height: 176px;
            width: 100%;
            position: relative;
            overflow: hidden;
            z-index: 1;

        }

        .progress {
            height: 2px;
            width: 100%;

            >.progress-bar {
                height: 100%;
                transition: all 1s ease-in-out;

                &.progress-bar-top {
                    float: right;
                }
                &.progress-bar-bottom {
                    float: left;
                }
            }
        }

        .custom-color-000000 {
            background-color: #000000;
            stroke: #000000;
        }
        .custom-color-ffffff {
            background-color: white;
            stroke: white;
        }
        .custom-color-ff8f8f {
            background-color: #ff8f8f;
            stroke: #ff8f8f;
        }
        .custom-color-8ecfff {
            background-color: #8ecfff;
            stroke: #8ecfff;
        }
        .custom-color-6ee067 {
            background-color: #6ee067;
            stroke: #6ee067;
        }
        .custom-color-e0a067 {
            background-color: #e0a067;
            stroke: #e0a067;
        }
        .custom-color-9b71b9 {
            background-color: #9b71b9;
            stroke: #9b71b9;
        }

        .preview-right-col {

            flex-grow: 1;
            flex-basis: 0px;
            display: flex;
            flex-direction: column;
            background: #242427;

            .queue {
                flex-grow: 1;
                overflow-y: auto;
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                position: relative;
                padding: 4px;
            }

            .video-in-queue {
                display: flex;
                justify-content: center;
                margin: 5px;
                position: relative;

                .image {
                    width: 40px;
                    height: 40px;
                    display: flex;

                    .image-bubble {
                        transition: all 1s ease-in-out;
                        width: 100%;
                        height: 100%;
                    }
                }
                svg {
                    position: absolute;
                    top: -5px;
                    left: -5px;

                    circle {
                        fill: none;
                        transition: all 1s ease-in-out;
                        stroke-width: 2px;
                        stroke-dasharray: 1000;
                        transform-origin: center center;
                        transform: rotate(-85deg);
                        animation: rotate 60s linear infinite;
                    }
                }
            }

            .preview-actions {
                flex-basis: 20px;
                display: flex;
                justify-content: center;
                padding-top: 4px;
                width: inherit;

                &.next-event {
                    flex-basis: 60px;
                    text-align: center;
                    flex-direction: column;
                    background: #424248;
                    font-size: 80%;
                }

                .preview-action {
                    flex-grow: 1;
                    padding: 4px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;

                    &:hover {
                        background: #313235;
                    }
                }
            }
        }
    }
</style>
