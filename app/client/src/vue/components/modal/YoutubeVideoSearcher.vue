<template>
    <div class="youtube-video-searcher">
        <div class="search-form">
            <input v-model="searchInput" ref="searchInput" type="text" placeholder="Search" class="form-control" @keyup.enter.stop="search(searchInput)">
        </div>
        <div class="search-form">
            <button v-for="type in searchTypes"
                :key="type.id"
                @click="searchType = type.id"
                class="button"
                :class="type.id === searchType ? 'active' : ''">
                {{type.name}}
            </button>
        </div>
        <div class="search-results">

            <!-- 1 item -->
            <div v-for="item in playerApiSearchResult.items"
                 :key="item.id"
                 @click="play(item)"
                 class="search-item">

                <!-- thumb -->
                <div class="thumb">
                    <img :src="item.thumb">
                </div>

                <!-- informations -->
                <div class="info">
                    <div class="title">{{item.title}}</div>
                    <div class="description"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import Vue from "vue";
    import { mapState } from 'vuex';

    export default Vue.extend({
        data: function() {
            return {
                searchInput: '',
                searchType: 'video',
                searchTypes: [
                    {id: 'video', name: 'Video'},
                    {id: 'playlist', name: 'Playlist'}
                ]
            }
        },
        mounted: function() {
            this.$refs.searchInput.focus();
        },
        watch: {
            'searchType': function() {
                if (this.searchInput.length > 0) {
                    this.search(this.searchInput);
                }
            }
        },
        methods: {
            search: function(search) {
                this.$client.sendMessage(`/playersearch yt ${this.searchType} ${search}`);
            },
            play: function(item) {
                if (this.playerApiSearchResult.type === 'video') {
                    this.$client.sendMessage(`/yt ${item.id} video`);
                } else {
                    this.$client.sendMessage(`/yt ${item.id} playlist`);
                }
                this.$emit('close');
            }
        },
        computed: {
            ...mapState('Main', [
                'playerApiSearchResult',
            ]),
        }
    });
</script>

<style lang="scss" scoped>
    .youtube-video-searcher {
        display: flex;
        flex-direction: column;
        height: 100%;

        .search-form {
            display: flex;

            input {
                margin: 5px;
            }

            .button {
                flex-grow: 1;
                padding: 4px;
                background-color: #18191c;
                border: 1px solid white;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                margin: 5px;
                outline: none;
                font-size: 100%;

                &:hover {
                    background-color: #32373a;
                }
                &.active {
                    background-color: #3e4448;
                }
            }
        }
        .search-results {
            flex-grow: 1;
            overflow-y: auto;
        }
    }

    .search-item {
        display: flex;
        margin: 10px;
        background-color: #242427;
        border-left: 4px solid white;
        padding: 4px 4px 4px 8px;
        -webkit-transition: all 0.2s;
        -moz-transition: all 0.2s;
        -ms-transition: all 0.2s;
        -o-transition: all 0.2s;
        transition: all 0.2s;
        transition-property: border-width, margin-left;
        cursor: pointer;

        &:hover {
            background-color: #313235;
            border-width: 0;
            margin-left: 14px;
        }

        .thumb {
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .info {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            padding: 10px;

            .title {
                font-weight: 800;
            }
            .description {
                margin-top: 10px;
                font-size: 80%;
            }
        }
    }
</style>
