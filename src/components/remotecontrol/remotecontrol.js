define(['browser', 'datetime', 'backdrop', 'libraryBrowser', 'listView', 'imageLoader', 'playbackManager', 'nowPlayingHelper', 'events', 'connectionManager', 'apphost', 'globalize', 'layoutManager', 'userSettings', 'cardBuilder', 'cardStyle', 'emby-itemscontainer', 'css!./remotecontrol.css', 'emby-ratingbutton'], function (browser, datetime, backdrop, libraryBrowser, listView, imageLoader, playbackManager, nowPlayingHelper, events, connectionManager, appHost, globalize, layoutManager, userSettings, cardBuilder) {
    'use strict';

    function showAudioMenu(context, player, button, item) {
        var currentIndex = playbackManager.getAudioStreamIndex(player);
        var streams = playbackManager.audioTracks(player);
        var menuItems = streams.map(function (s) {
            var menuItem = {
                name: s.DisplayTitle,
                id: s.Index
            };

            if (s.Index == currentIndex) {
                menuItem.selected = true;
            }

            return menuItem;
        });

        require(['actionsheet'], function (actionsheet) {
            actionsheet.show({
                items: menuItems,
                positionTo: button,
                callback: function (id) {
                    playbackManager.setAudioStreamIndex(parseInt(id), player);
                }
            });
        });
    }

    function showSubtitleMenu(context, player, button, item) {
        var currentIndex = playbackManager.getSubtitleStreamIndex(player);
        var streams = playbackManager.subtitleTracks(player);
        var menuItems = streams.map(function (s) {
            var menuItem = {
                name: s.DisplayTitle,
                id: s.Index
            };

            if (s.Index == currentIndex) {
                menuItem.selected = true;
            }

            return menuItem;
        });
        menuItems.unshift({
            id: -1,
            name: globalize.translate('ButtonOff'),
            selected: null == currentIndex
        });

        require(['actionsheet'], function (actionsheet) {
            actionsheet.show({
                items: menuItems,
                positionTo: button,
                callback: function (id) {
                    playbackManager.setSubtitleStreamIndex(parseInt(id), player);
                }
            });
        });
    }

    function getNowPlayingNameHtml(nowPlayingItem, includeNonNameInfo) {
        return nowPlayingHelper.getNowPlayingNames(nowPlayingItem, includeNonNameInfo).map(function (i) {
            return i.text;
        }).join('<br/>');
    }

    function seriesImageUrl(item, options) {
        if ('Episode' !== item.Type) {
            return null;
        }

        options = options || {};
        options.type = options.type || 'Primary';
        if ('Primary' === options.type && item.SeriesPrimaryImageTag) {
            options.tag = item.SeriesPrimaryImageTag;
            return connectionManager.getApiClient(item.ServerId).getScaledImageUrl(item.SeriesId, options);
        }

        if ('Thumb' === options.type) {
            if (item.SeriesThumbImageTag) {
                options.tag = item.SeriesThumbImageTag;
                return connectionManager.getApiClient(item.ServerId).getScaledImageUrl(item.SeriesId, options);
            }

            if (item.ParentThumbImageTag) {
                options.tag = item.ParentThumbImageTag;
                return connectionManager.getApiClient(item.ServerId).getScaledImageUrl(item.ParentThumbItemId, options);
            }
        }

        return null;
    }

    function imageUrl(item, options) {
        options = options || {};
        options.type = options.type || 'Primary';

        if (item.ImageTags && item.ImageTags[options.type]) {
            options.tag = item.ImageTags[options.type];
            return connectionManager.getApiClient(item.ServerId).getScaledImageUrl(item.PrimaryImageItemId || item.Id, options);
        }

        if (item.AlbumId && item.AlbumPrimaryImageTag) {
            options.tag = item.AlbumPrimaryImageTag;
            return connectionManager.getApiClient(item.ServerId).getScaledImageUrl(item.AlbumId, options);
        }

        return null;
    }

    function updateNowPlayingInfo(context, state, serverId) {
        var item = state.NowPlayingItem;
        var displayName = item ? getNowPlayingNameHtml(item).replace('<br/>', ' - ') : '';
        if (typeof item !== 'undefined') {
            var nowPlayingServerId = (item.ServerId || serverId);
            if (item.Type == 'Audio' || item.MediaStreams[0].Type == 'Audio') {
                var songName = item.Name;
                if (item.Album != null && item.Artists != null) {
                    var albumName = item.Album;
                    var artistName;
                    if (item.ArtistItems != null) {
                        artistName = item.ArtistItems[0].Name;
                        context.querySelector('.nowPlayingAlbum').innerHTML = '<a class="button-link emby-button" is="emby-linkbutton" href="itemdetails.html?id=' + item.AlbumId + `&amp;serverId=${nowPlayingServerId}">${albumName}</a>`;
                        context.querySelector('.nowPlayingArtist').innerHTML = '<a class="button-link emby-button" is="emby-linkbutton" href="itemdetails.html?id=' + item.ArtistItems[0].Id + `&amp;serverId=${nowPlayingServerId}">${artistName}</a>`;
                        context.querySelector('.contextMenuAlbum').innerHTML = '<a class="button-link emby-button" is="emby-linkbutton" href="itemdetails.html?id=' + item.AlbumId + `&amp;serverId=${nowPlayingServerId}"><span class="actionsheetMenuItemIcon listItemIcon listItemIcon-transparent material-icons album"></span> ` + globalize.translate('ViewAlbum') + '</a>';
                        context.querySelector('.contextMenuArtist').innerHTML = '<a class="button-link emby-button" is="emby-linkbutton" href="itemdetails.html?id=' + item.ArtistItems[0].Id + `&amp;serverId=${nowPlayingServerId}"><span class="actionsheetMenuItemIcon listItemIcon listItemIcon-transparent material-icons person"></span> ` + globalize.translate('ViewArtist') + '</a>';
                    } else {
                        artistName = item.Artists;
                        context.querySelector('.nowPlayingAlbum').innerHTML = albumName;
                        context.querySelector('.nowPlayingArtist').innerHTML = artistName;
                    }
                }
                context.querySelector('.nowPlayingSongName').innerHTML = songName;
            } else if (item.Type == 'Episode') {
                if (item.SeasonName != null) {
                    var seasonName = item.SeasonName;
                    context.querySelector('.nowPlayingSeason').innerHTML = '<a class="button-link emby-button" is="emby-linkbutton" href="itemdetails.html?id=' + item.SeasonId + `&amp;serverId=${nowPlayingServerId}">${seasonName}</a>`;
                }
                if (item.SeriesName != null) {
                    var seriesName = item.SeriesName;
                    if (item.SeriesId != null) {
                        context.querySelector('.nowPlayingSerie').innerHTML = '<a class="button-link emby-button" is="emby-linkbutton" href="itemdetails.html?id=' + item.SeriesId + `&amp;serverId=${nowPlayingServerId}">${seriesName}</a>`;
                    } else {
                        context.querySelector('.nowPlayingSerie').innerHTML = seriesName;
                    }
                }
                context.querySelector('.nowPlayingEpisode').innerHTML = item.Name;
            } else {
                context.querySelector('.nowPlayingPageTitle').innerHTML = displayName;
            }

            if (displayName.length > 0 && item.Type != 'Audio' && item.Type != 'Episode') {
                context.querySelector('.nowPlayingPageTitle').classList.remove('hide');
            } else {
                context.querySelector('.nowPlayingPageTitle').classList.add('hide');
            }

            var url = item ? seriesImageUrl(item, {
                maxHeight: 300 * 2
            }) || imageUrl(item, {
                maxHeight: 300 * 2
            }) : null;

            console.debug('updateNowPlayingInfo');
            setImageUrl(context, state, url);
            if (item) {
                backdrop.setBackdrops([item]);
                var apiClient = connectionManager.getApiClient(item.ServerId);
                apiClient.getItem(apiClient.getCurrentUserId(), item.Id).then(function (fullItem) {
                    var userData = fullItem.UserData || {};
                    var likes = null == userData.Likes ? '' : userData.Likes;
                    context.querySelector('.nowPlayingPageUserDataButtonsTitle').innerHTML = '<button is="emby-ratingbutton" type="button" class="listItemButton paper-icon-button-light" data-id="' + fullItem.Id + '" data-serverid="' + fullItem.ServerId + '" data-itemtype="' + fullItem.Type + '" data-likes="' + likes + '" data-isfavorite="' + userData.IsFavorite + '"><span class="material-icons favorite"></span></button>';
                    context.querySelector('.nowPlayingPageUserDataButtons').innerHTML = '<button is="emby-ratingbutton" type="button" class="listItemButton paper-icon-button-light" data-id="' + fullItem.Id + '" data-serverid="' + fullItem.ServerId + '" data-itemtype="' + fullItem.Type + '" data-likes="' + likes + '" data-isfavorite="' + userData.IsFavorite + '"><span class="material-icons favorite"></span></button>';
                });
            } else {
                backdrop.clear();
                context.querySelector('.nowPlayingPageUserDataButtons').innerHTML = '';
            }
        }
    }

    function setImageUrl(context, state, url) {
        currentImgUrl = url;
        var item = state.NowPlayingItem;
        var imgContainer = context.querySelector('.nowPlayingPageImageContainer');

        if (url) {
            imgContainer.innerHTML = '<img class="nowPlayingPageImage" src="' + url + '" />';
            if (item.Type == 'Audio') {
                context.querySelector('.nowPlayingPageImage').classList.add('nowPlayingPageImageAudio');
                context.querySelector('.nowPlayingPageImageContainer').classList.remove('nowPlayingPageImageAudio');
            } else {
                context.querySelector('.nowPlayingPageImageContainer').classList.add('nowPlayingPageImagePoster');
                context.querySelector('.nowPlayingPageImage').classList.remove('nowPlayingPageImageAudio');
            }
        } else {
            imgContainer.innerHTML = '<div class="nowPlayingPageImageContainerNoAlbum"><button data-action="link" class="cardContent-button cardImageContainer coveredImage ' + cardBuilder.getDefaultBackgroundClass(item.Name) + ' cardContent cardContent-shadow itemAction"><span class="cardImageIcon material-icons album"></span></button></div>';
        }
    }

    function buttonVisible(btn, enabled) {
        if (enabled) {
            btn.classList.remove('hide');
        } else {
            btn.classList.add('hide');
        }
    }

    function updateSupportedCommands(context, commands) {
        var all = context.querySelectorAll('.btnCommand');

        for (var i = 0, length = all.length; i < length; i++) {
            var enableButton = -1 !== commands.indexOf(all[i].getAttribute('data-command'));
            all[i].disabled = !enableButton;
        }
    }

    var currentImgUrl;
    return function () {
        function toggleRepeat(player) {
            if (player) {
                switch (playbackManager.getRepeatMode(player)) {
                    case 'RepeatNone':
                        playbackManager.setRepeatMode('RepeatAll', player);
                        break;

                    case 'RepeatAll':
                        playbackManager.setRepeatMode('RepeatOne', player);
                        break;

                    case 'RepeatOne':
                        playbackManager.setRepeatMode('RepeatNone', player);
                }
            }
        }

        function updatePlayerState(player, context, state) {
            lastPlayerState = state;
            var item = state.NowPlayingItem;
            var playerInfo = playbackManager.getPlayerInfo();
            var supportedCommands = playerInfo.supportedCommands;
            currentPlayerSupportedCommands = supportedCommands;
            var playState = state.PlayState || {};
            var isSupportedCommands = supportedCommands.includes('DisplayMessage') || supportedCommands.includes('SendString') || supportedCommands.includes('Select');
            buttonVisible(context.querySelector('.btnToggleFullscreen'), item && 'Video' == item.MediaType && supportedCommands.includes('ToggleFullscreen'));
            updateAudioTracksDisplay(player, context);
            updateSubtitleTracksDisplay(player, context);

            if (supportedCommands.includes('DisplayMessage') && !currentPlayer.isLocalPlayer) {
                context.querySelector('.sendMessageSection').classList.remove('hide');
            } else {
                context.querySelector('.sendMessageSection').classList.add('hide');
            }

            if (supportedCommands.includes('SendString') && !currentPlayer.isLocalPlayer) {
                context.querySelector('.sendTextSection').classList.remove('hide');
            } else {
                context.querySelector('.sendTextSection').classList.add('hide');
            }

            if (supportedCommands.includes('Select') && !currentPlayer.isLocalPlayer) {
                context.querySelector('.navigationSection').classList.remove('hide');
            } else {
                context.querySelector('.navigationSection').classList.add('hide');
            }

            if (isSupportedCommands && !currentPlayer.isLocalPlayer) {
                context.querySelector('.remoteControlSection').classList.remove('hide');
            } else {
                context.querySelector('.remoteControlSection').classList.add('hide');
            }

            buttonVisible(context.querySelector('.btnStop'), null != item);
            buttonVisible(context.querySelector('.btnNextTrack'), null != item);
            buttonVisible(context.querySelector('.btnPreviousTrack'), null != item);
            buttonVisible(context.querySelector('.btnRewind'), null != item);
            buttonVisible(context.querySelector('.btnFastForward'), null != item);
            var positionSlider = context.querySelector('.nowPlayingPositionSlider');

            if (positionSlider && item && item.RunTimeTicks) {
                positionSlider.setKeyboardSteps(userSettings.skipBackLength() * 1000000 / item.RunTimeTicks,
                    userSettings.skipForwardLength() * 1000000 / item.RunTimeTicks);
            }

            if (positionSlider && !positionSlider.dragging) {
                positionSlider.disabled = !playState.CanSeek;
                var isProgressClear = state.MediaSource && null == state.MediaSource.RunTimeTicks;
                positionSlider.setIsClear(isProgressClear);
            }

            updatePlayPauseState(playState.IsPaused, null != item);
            updateTimeDisplay(playState.PositionTicks, item ? item.RunTimeTicks : null);
            updatePlayerVolumeState(context, playState.IsMuted, playState.VolumeLevel);

            if (item && 'Video' == item.MediaType) {
                context.classList.remove('hideVideoButtons');
            } else {
                context.classList.add('hideVideoButtons');
            }

            updateRepeatModeDisplay(playState.RepeatMode);
            updateNowPlayingInfo(context, state);
        }

        function updateAudioTracksDisplay(player, context) {
            var supportedCommands = currentPlayerSupportedCommands;
            buttonVisible(context.querySelector('.btnAudioTracks'), playbackManager.audioTracks(player).length > 1 && -1 != supportedCommands.indexOf('SetAudioStreamIndex'));
        }

        function updateSubtitleTracksDisplay(player, context) {
            var supportedCommands = currentPlayerSupportedCommands;
            buttonVisible(context.querySelector('.btnSubtitles'), playbackManager.subtitleTracks(player).length && -1 != supportedCommands.indexOf('SetSubtitleStreamIndex'));
        }

        function updateRepeatModeDisplay(repeatMode) {
            var context = dlg;
            var toggleRepeatButton = context.querySelector('.repeatToggleButton');

            if ('RepeatAll' == repeatMode) {
                toggleRepeatButton.innerHTML = "<span class='material-icons repeat'></span>";
                toggleRepeatButton.classList.add('repeatButton-active');
            } else if ('RepeatOne' == repeatMode) {
                toggleRepeatButton.innerHTML = "<span class='material-icons repeat_one'></span>";
                toggleRepeatButton.classList.add('repeatButton-active');
            } else {
                toggleRepeatButton.innerHTML = "<span class='material-icons repeat'></span>";
                toggleRepeatButton.classList.remove('repeatButton-active');
            }
        }

        function updatePlayerVolumeState(context, isMuted, volumeLevel) {
            var view = context;
            var supportedCommands = currentPlayerSupportedCommands;
            var showMuteButton = true;
            var showVolumeSlider = true;

            if (-1 === supportedCommands.indexOf('Mute')) {
                showMuteButton = false;
            }

            if (-1 === supportedCommands.indexOf('SetVolume')) {
                showVolumeSlider = false;
            }

            if (currentPlayer.isLocalPlayer && appHost.supports('physicalvolumecontrol')) {
                showMuteButton = false;
                showVolumeSlider = false;
            }

            const buttonMute = view.querySelector('.buttonMute');
            const buttonMuteIcon = buttonMute.querySelector('.material-icons');

            buttonMuteIcon.classList.remove('volume_off', 'volume_up');

            if (isMuted) {
                buttonMute.setAttribute('title', globalize.translate('Unmute'));
                buttonMuteIcon.classList.add('volume_off');
            } else {
                buttonMute.setAttribute('title', globalize.translate('Mute'));
                buttonMuteIcon.classList.add('volume_up');
            }

            if (showMuteButton) {
                buttonMute.classList.remove('hide');
            } else {
                buttonMute.classList.add('hide');
            }

            var nowPlayingVolumeSlider = context.querySelector('.nowPlayingVolumeSlider');
            var nowPlayingVolumeSliderContainer = context.querySelector('.nowPlayingVolumeSliderContainer');

            if (nowPlayingVolumeSlider) {
                if (showVolumeSlider) {
                    nowPlayingVolumeSliderContainer.classList.remove('hide');
                } else {
                    nowPlayingVolumeSliderContainer.classList.add('hide');
                }

                if (!nowPlayingVolumeSlider.dragging) {
                    nowPlayingVolumeSlider.value = volumeLevel || 0;
                }
            }
        }

        function updatePlayPauseState(isPaused, isActive) {
            var context = dlg;
            var btnPlayPause = context.querySelector('.btnPlayPause');
            const btnPlayPauseIcon = btnPlayPause.querySelector('.material-icons');

            btnPlayPauseIcon.classList.remove('play_circle_filled', 'pause_circle_filled');
            btnPlayPauseIcon.classList.add(isPaused ? 'play_circle_filled' : 'pause_circle_filled');

            buttonVisible(btnPlayPause, isActive);
        }

        function updateTimeDisplay(positionTicks, runtimeTicks) {
            var context = dlg;
            var positionSlider = context.querySelector('.nowPlayingPositionSlider');

            if (positionSlider && !positionSlider.dragging) {
                if (runtimeTicks) {
                    var pct = positionTicks / runtimeTicks;
                    pct *= 100;
                    positionSlider.value = pct;
                } else {
                    positionSlider.value = 0;
                }
            }

            context.querySelector('.positionTime').innerHTML = null == positionTicks ? '--:--' : datetime.getDisplayRunningTime(positionTicks);
            context.querySelector('.runtime').innerHTML = null != runtimeTicks ? datetime.getDisplayRunningTime(runtimeTicks) : '--:--';
        }

        function getPlaylistItems(player) {
            return playbackManager.getPlaylist(player);
        }

        function loadPlaylist(context, player) {
            getPlaylistItems(player).then(function (items) {
                var html = '';
                html += listView.getListViewHtml({
                    items: items,
                    smallIcon: true,
                    action: 'setplaylistindex',
                    enableUserDataButtons: false,
                    rightButtons: [{
                        icon: 'remove_circle_outline',
                        title: globalize.translate('ButtonRemove'),
                        id: 'remove'
                    }],
                    dragHandle: true
                });

                if (items.length) {
                    context.querySelector('.btnTogglePlaylist').classList.remove('hide');
                } else {
                    context.querySelector('.btnTogglePlaylist').classList.add('hide');
                }

                var itemsContainer = context.querySelector('.playlist');
                itemsContainer.innerHTML = html;
                var playlistItemId = playbackManager.getCurrentPlaylistItemId(player);

                if (playlistItemId) {
                    var img = itemsContainer.querySelector('.listItem[data-playlistItemId="' + playlistItemId + '"] .listItemImage');

                    if (img) {
                        img.classList.remove('lazy');
                        img.classList.add('playlistIndexIndicatorImage');
                    }
                }

                imageLoader.lazyChildren(itemsContainer);
                context.querySelector('.playlist').classList.add('hide');
                context.querySelector('.contextMenu').classList.add('hide');
                context.querySelector('.btnSavePlaylist').classList.add('hide');
            });
        }

        function onPlaybackStart(e, state) {
            console.debug('remotecontrol event: ' + e.type);
            var player = this;
            onStateChanged.call(player, e, state);
        }

        function onRepeatModeChange(e) {
            var player = this;
            updateRepeatModeDisplay(playbackManager.getRepeatMode(player));
        }

        function onPlaylistUpdate(e) {
            loadPlaylist(dlg, this);
        }

        function onPlaylistItemRemoved(e, info) {
            var context = dlg;
            var playlistItemIds = info.playlistItemIds;

            for (var i = 0, length = playlistItemIds.length; i < length; i++) {
                var listItem = context.querySelector('.listItem[data-playlistItemId="' + playlistItemIds[i] + '"]');

                if (listItem) {
                    listItem.parentNode.removeChild(listItem);
                }
            }
        }

        function onPlaybackStopped(e, state) {
            console.debug('remotecontrol event: ' + e.type);
            var player = this;

            if (!state.NextMediaType) {
                updatePlayerState(player, dlg, {});
                loadPlaylist(dlg);
                Emby.Page.back();
            }
        }

        function onPlayPauseStateChanged(e) {
            updatePlayPauseState(this.paused(), true);
        }

        function onStateChanged(event, state) {
            var player = this;
            updatePlayerState(player, dlg, state);
            loadPlaylist(dlg, player);
        }

        function onTimeUpdate(e) {
            var now = new Date().getTime();

            if (!(now - lastUpdateTime < 700)) {
                lastUpdateTime = now;
                var player = this;
                currentRuntimeTicks = playbackManager.duration(player);
                updateTimeDisplay(playbackManager.currentTime(player), currentRuntimeTicks);
            }
        }

        function onVolumeChanged(e) {
            var player = this;
            updatePlayerVolumeState(dlg, player.isMuted(), player.getVolume());
        }

        function releaseCurrentPlayer() {
            var player = currentPlayer;

            if (player) {
                events.off(player, 'playbackstart', onPlaybackStart);
                events.off(player, 'statechange', onStateChanged);
                events.off(player, 'repeatmodechange', onRepeatModeChange);
                events.off(player, 'playlistitemremove', onPlaylistUpdate);
                events.off(player, 'playlistitemmove', onPlaylistUpdate);
                events.off(player, 'playbackstop', onPlaybackStopped);
                events.off(player, 'volumechange', onVolumeChanged);
                events.off(player, 'pause', onPlayPauseStateChanged);
                events.off(player, 'unpause', onPlayPauseStateChanged);
                events.off(player, 'timeupdate', onTimeUpdate);
                currentPlayer = null;
            }
        }

        function bindToPlayer(context, player) {
            if (releaseCurrentPlayer(), currentPlayer = player, player) {
                var state = playbackManager.getPlayerState(player);
                onStateChanged.call(player, {
                    type: 'init'
                }, state);
                events.on(player, 'playbackstart', onPlaybackStart);
                events.on(player, 'statechange', onStateChanged);
                events.on(player, 'repeatmodechange', onRepeatModeChange);
                events.on(player, 'playlistitemremove', onPlaylistItemRemoved);
                events.on(player, 'playlistitemmove', onPlaylistUpdate);
                events.on(player, 'playbackstop', onPlaybackStopped);
                events.on(player, 'volumechange', onVolumeChanged);
                events.on(player, 'pause', onPlayPauseStateChanged);
                events.on(player, 'unpause', onPlayPauseStateChanged);
                events.on(player, 'timeupdate', onTimeUpdate);
                var playerInfo = playbackManager.getPlayerInfo();
                var supportedCommands = playerInfo.supportedCommands;
                currentPlayerSupportedCommands = supportedCommands;
                updateSupportedCommands(context, supportedCommands);
            }
        }

        function onBtnCommandClick() {
            if (currentPlayer) {
                if (this.classList.contains('repeatToggleButton')) {
                    toggleRepeat(currentPlayer);
                } else {
                    playbackManager.sendCommand({
                        Name: this.getAttribute('data-command')
                    }, currentPlayer);
                }
            }
        }

        function getSaveablePlaylistItems() {
            return getPlaylistItems(currentPlayer).then(function (items) {
                return items.filter(function (i) {
                    return i.Id && i.ServerId;
                });
            });
        }

        function savePlaylist() {
            require(['playlistEditor'], function (playlistEditor) {
                getSaveablePlaylistItems().then(function (items) {
                    var serverId = items.length ? items[0].ServerId : ApiClient.serverId();
                    new playlistEditor().show({
                        items: items.map(function (i) {
                            return i.Id;
                        }),
                        serverId: serverId,
                        enableAddToPlayQueue: false,
                        defaultValue: 'new'
                    });
                });
            });
        }

        function bindEvents(context) {
            var btnCommand = context.querySelectorAll('.btnCommand');

            for (var i = 0, length = btnCommand.length; i < length; i++) {
                btnCommand[i].addEventListener('click', onBtnCommandClick);
            }

            context.querySelector('.btnToggleFullscreen').addEventListener('click', function (e) {
                if (currentPlayer) {
                    playbackManager.sendCommand({
                        Name: e.target.getAttribute('data-command')
                    }, currentPlayer);
                }
            });
            context.querySelector('.btnAudioTracks').addEventListener('click', function (e) {
                if (currentPlayer && lastPlayerState && lastPlayerState.NowPlayingItem) {
                    showAudioMenu(context, currentPlayer, e.target, lastPlayerState.NowPlayingItem);
                }
            });
            context.querySelector('.btnSubtitles').addEventListener('click', function (e) {
                if (currentPlayer && lastPlayerState && lastPlayerState.NowPlayingItem) {
                    showSubtitleMenu(context, currentPlayer, e.target, lastPlayerState.NowPlayingItem);
                }
            });
            context.querySelector('.btnStop').addEventListener('click', function () {
                if (currentPlayer) {
                    playbackManager.stop(currentPlayer);
                }
            });
            context.querySelector('.btnPlayPause').addEventListener('click', function () {
                if (currentPlayer) {
                    playbackManager.playPause(currentPlayer);
                }
            });
            context.querySelector('.btnNextTrack').addEventListener('click', function () {
                if (currentPlayer) {
                    playbackManager.nextTrack(currentPlayer);
                }
            });
            context.querySelector('.btnRewind').addEventListener('click', function () {
                if (currentPlayer) {
                    playbackManager.rewind(currentPlayer);
                }
            });
            context.querySelector('.btnFastForward').addEventListener('click', function () {
                if (currentPlayer) {
                    playbackManager.fastForward(currentPlayer);
                }
            });
            context.querySelector('.btnPreviousTrack').addEventListener('click', function () {
                if (currentPlayer) {
                    playbackManager.previousTrack(currentPlayer);
                }
            });
            context.querySelector('.nowPlayingPositionSlider').addEventListener('change', function () {
                var value = this.value;

                if (currentPlayer) {
                    var newPercent = parseFloat(value);
                    playbackManager.seekPercent(newPercent, currentPlayer);
                }
            });

            context.querySelector('.nowPlayingPositionSlider').getBubbleText = function (value) {
                var state = lastPlayerState;

                if (!state || !state.NowPlayingItem || !currentRuntimeTicks) {
                    return '--:--';
                }

                var ticks = currentRuntimeTicks;
                ticks /= 100;
                ticks *= value;
                return datetime.getDisplayRunningTime(ticks);
            };

            function setVolume() {
                playbackManager.setVolume(this.value, currentPlayer);
            }

            context.querySelector('.nowPlayingVolumeSlider').addEventListener('change', setVolume);
            context.querySelector('.nowPlayingVolumeSlider').addEventListener('mousemove', setVolume);
            context.querySelector('.nowPlayingVolumeSlider').addEventListener('touchmove', setVolume);
            context.querySelector('.buttonMute').addEventListener('click', function () {
                playbackManager.toggleMute(currentPlayer);
            });
            var playlistContainer = context.querySelector('.playlist');
            playlistContainer.addEventListener('action-remove', function (e) {
                playbackManager.removeFromPlaylist([e.detail.playlistItemId], currentPlayer);
            });
            playlistContainer.addEventListener('itemdrop', function (e) {
                var newIndex = e.detail.newIndex;
                var playlistItemId = e.detail.playlistItemId;
                playbackManager.movePlaylistItem(playlistItemId, newIndex, currentPlayer);
            });
            context.querySelector('.btnSavePlaylist').addEventListener('click', savePlaylist);
            context.querySelector('.btnTogglePlaylist').addEventListener('click', function () {
                if (context.querySelector('.playlist').classList.contains('hide')) {
                    context.querySelector('.playlist').classList.remove('hide');
                    context.querySelector('.btnSavePlaylist').classList.remove('hide');
                    context.querySelector('.contextMenu').classList.add('hide');
                    context.querySelector('.volumecontrol').classList.add('hide');
                } else {
                    context.querySelector('.playlist').classList.add('hide');
                    context.querySelector('.btnSavePlaylist').classList.add('hide');
                    context.querySelector('.volumecontrol').classList.remove('hide');
                }
            });
            context.querySelector('.btnToggleContextMenu').addEventListener('click', function () {
                if (context.querySelector('.contextMenu').classList.contains('hide')) {
                    context.querySelector('.contextMenu').classList.remove('hide');
                    context.querySelector('.btnSavePlaylist').classList.add('hide');
                    context.querySelector('.playlist').classList.add('hide');
                } else {
                    context.querySelector('.contextMenu').classList.add('hide');
                }
            });
        }

        function onPlayerChange() {
            bindToPlayer(dlg, playbackManager.getCurrentPlayer());
        }

        function onMessageSubmit(e) {
            var form = e.target;
            playbackManager.sendCommand({
                Name: 'DisplayMessage',
                Arguments: {
                    Header: form.querySelector('#txtMessageTitle').value,
                    Text: form.querySelector('#txtMessageText', form).value
                }
            }, currentPlayer);
            form.querySelector('input').value = '';

            require(['toast'], function (toast) {
                toast('Message sent.');
            });

            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        function onSendStringSubmit(e) {
            var form = e.target;
            playbackManager.sendCommand({
                Name: 'SendString',
                Arguments: {
                    String: form.querySelector('#txtTypeText', form).value
                }
            }, currentPlayer);
            form.querySelector('input').value = '';

            require(['toast'], function (toast) {
                toast('Text sent.');
            });

            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        function init(ownerView, context) {
            let contextmenuHtml = `<button id="toggleContextMenu" is="paper-icon-button-light" class="btnToggleContextMenu" title=${globalize.translate('ButtonToggleContextMenu')}><span class="material-icons more_vert"></span></button>`;
            let volumecontrolHtml = '<div class="volumecontrol flex align-items-center flex-wrap-wrap justify-content-center">';
            volumecontrolHtml += `<button is="paper-icon-button-light" class="buttonMute autoSize" title=${globalize.translate('Mute')}><span class="xlargePaperIconButton material-icons volume_up"></span></button>`;
            volumecontrolHtml += '<div class="sliderContainer nowPlayingVolumeSliderContainer"><input is="emby-slider" type="range" step="1" min="0" max="100" value="0" class="nowPlayingVolumeSlider"/></div>';
            volumecontrolHtml += '</div>';
            if (!layoutManager.mobile) {
                context.querySelector('.nowPlayingSecondaryButtons').innerHTML += volumecontrolHtml;
                context.querySelector('.playlistSectionButton').innerHTML += contextmenuHtml;
            } else {
                context.querySelector('.playlistSectionButton').innerHTML += volumecontrolHtml + contextmenuHtml;
            }

            bindEvents(context);
            context.querySelector('.sendMessageForm').addEventListener('submit', onMessageSubmit);
            context.querySelector('.typeTextForm').addEventListener('submit', onSendStringSubmit);
            events.on(playbackManager, 'playerchange', onPlayerChange);

            if (layoutManager.tv) {
                var positionSlider = context.querySelector('.nowPlayingPositionSlider');
                positionSlider.classList.add('focusable');
                positionSlider.enableKeyboardDragging();
            }
        }

        function onDialogClosed(e) {
            releaseCurrentPlayer();
            events.off(playbackManager, 'playerchange', onPlayerChange);
            lastPlayerState = null;
        }

        function onShow(context, tab) {
            currentImgUrl = null;
            bindToPlayer(context, playbackManager.getCurrentPlayer());
        }

        var dlg;
        var currentPlayer;
        var lastPlayerState;
        var currentPlayerSupportedCommands = [];
        var lastUpdateTime = 0;
        var currentRuntimeTicks = 0;
        var self = this;

        self.init = function (ownerView, context) {
            dlg = context;
            init(ownerView, dlg);
        };

        self.onShow = function () {
            onShow(dlg, window.location.hash);
        };

        self.destroy = function () {
            onDialogClosed();
        };
    };
});
