/* eslint-disable header/header */

// Copyright (c) 2016-2017 Charles.
// Modified work: Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ActivityIndicator,
    Animated,
    AppState,
    TouchableOpacity,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Slider from 'react-native-slider';

import CompassIcon from '@components/compass_icon';

export const PLAYER_STATE = {
    PLAYING: 0,
    PAUSED: 1,
    ENDED: 2,
};

export default class VideoControls extends PureComponent {
    static propTypes = {
        duration: PropTypes.number,
        isLoading: PropTypes.bool,
        isFullScreen: PropTypes.bool,
        mainColor: PropTypes.string,
        controlButtonBg: PropTypes.string,
        onFullScreen: PropTypes.func,
        onPaused: PropTypes.func,
        onReplay: PropTypes.func,
        onSeek: PropTypes.func,
        onSeeking: PropTypes.func,
        playerState: PropTypes.number,
        progress: PropTypes.number,
    };

    static defaultProps = {
        duration: 0,
        mainColor: 'rgba(12, 83, 175, 0.9)',
    };

    constructor(props) {
        super(props);
        this.state = {
            opacity: new Animated.Value(1),
            isVisible: true,
            isSeeking: false,
        };
    }

    componentDidMount() {
        AppState.addEventListener('change', this.handleAppStateChange);
    }

    componentDidUpdate(prevProps) {
        if (this.props.playerState === PLAYER_STATE.ENDED || this.props.isLoading ||
            (this.props.playerState === PLAYER_STATE.PAUSED && prevProps.playerState === PLAYER_STATE.PLAYING)) {
            this.fadeInControls(false);
        }
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this.handleAppStateChange);
    }

    cancelAnimation = () => {
        this.state.opacity.stopAnimation(() => {
            this.setState({isVisible: true});
        });
    };

    fadeInControls = (loop = true) => {
        this.setState({isVisible: true});
        Animated.timing(this.state.opacity, {
            toValue: 1,
            duration: 250,
            delay: 0,
            useNativeDriver: true,
        }).start(() => {
            if (loop) {
                this.fadeOutControls(2000);
            }
        });
    };

    fadeOutControls = (delay = 0) => {
        Animated.timing(this.state.opacity, {
            toValue: 0,
            duration: 250,
            delay,
            useNativeDriver: true,
        }).start((result) => {
            if (result.finished) {
                this.setState({isVisible: false});
            }
        });
    };

    getControlIconName = (playerState) => {
        switch (playerState) {
        case PLAYER_STATE.PLAYING:
            return 'pause';
        case PLAYER_STATE.ENDED:
            return 'refresh';
        }

        return 'play';
    }

    handleAppStateChange = (nextAppState) => {
        if (nextAppState !== 'active' && this.props.playerState === PLAYER_STATE.PLAYING) {
            this.onPause();
        }
    };

    humanizeVideoDuration = (seconds) => {
        const [begin, end] = seconds >= 3600 ? [11, 8] : [14, 5];
        const date = new Date(null);
        date.setSeconds(seconds);
        return date.toISOString().substr(begin, end);
    };

    onPause = () => {
        if (this.props.playerState === PLAYER_STATE.PLAYING) {
            this.cancelAnimation();
        }
        if (this.props.playerState === PLAYER_STATE.PAUSED) {
            this.fadeOutControls(250);
        }
        this.props.onPaused();
    };

    onReplay = () => {
        this.fadeOutControls(500);
        this.props.onReplay();
    };

    renderControls() {
        return (
            <View style={styles.container}>
                <View style={[styles.controlsRow, StyleSheet.absoluteFill]}>
                    {
                        this.props.isLoading ? this.setLoadingView() : this.setPlayerControls(this.props.playerState)
                    }
                </View>
                <View style={[styles.controlsRow, styles.progressContainer]}>
                    <View style={styles.progressColumnContainer}>
                        <View style={[styles.timerLabelsContainer]}>
                            <Text style={styles.timerLabel}>
                                {this.humanizeVideoDuration(this.props.progress)}
                            </Text>
                            <Text style={styles.timerLabel}>
                                {this.humanizeVideoDuration(this.props.duration)}
                            </Text>
                        </View>
                        <Slider
                            style={styles.progressSlider}
                            onSlidingComplete={this.seekVideoEnd}
                            onValueChange={this.seekVideo}
                            onSlidingStart={this.seekVideoStart}
                            maximumValue={Math.floor(this.props.duration)}
                            value={Math.floor(this.props.progress)}
                            trackStyle={styles.track}
                            thumbStyle={[styles.thumb, {borderColor: this.props.mainColor}]}
                            minimumTrackTintColor={this.props.mainColor}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.fullScreenContainer}
                        onPress={this.props.onFullScreen}
                    >
                        <CompassIcon
                            name='arrow-expand'
                            size={20}
                            color='#fff'
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    seekVideo = (value) => {
        this.setState({isSeeking: true});
        this.props.onSeek(value);
    };

    seekVideoEnd = (value) => {
        this.setState({isSeeking: false});
        if (this.props.playerState === PLAYER_STATE.PLAYING) {
            this.toggleControls();
        }
        this.props.onSeek(value);
        if (this.props.onSeeking) {
            this.props.onSeeking(true);
        }
    };

    seekVideoStart = () => {
        this.setState({isSeeking: true});
        this.cancelAnimation();
        if (this.props.onSeeking) {
            this.props.onSeeking(false);
        }
    };

    setPlayerControls = (playerState) => {
        const iconName = this.getControlIconName(playerState);
        const pressAction = playerState === PLAYER_STATE.ENDED ? this.onReplay : this.onPause;
        return (
            <TouchableOpacity
                onPress={pressAction}
                style={[styles.controlButton, {backgroundColor: this.props.controlButtonBg}]}
            >
                <CompassIcon
                    name={iconName}
                    size={72}
                    color='#fff'
                />
            </TouchableOpacity>
        );
    };

    setLoadingView = () => {
        return (
            <ActivityIndicator
                size='large'
                color='#FFF'
            />
        );
    };

    toggleControls = () => {
        this.state.opacity.stopAnimation(
            (value) => {
                this.setState({isVisible: Boolean(value)});
                if (value) {
                    this.fadeOutControls();
                } else {
                    this.fadeInControls(this.props.playerState === PLAYER_STATE.PLAYING);
                }
            });
    };

    render() {
        if (!this.state.isVisible) {
            return null;
        }

        return (
            <Animated.View style={[styles.container, {opacity: this.state.opacity}]}>
                {this.renderControls()}
            </Animated.View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 13,
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'transparent',
        justifyContent: 'space-between',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
    controlsRow: {
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
    },
    timeRow: {
        alignSelf: 'stretch',
    },
    progressContainer: {
        position: 'absolute',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        bottom: 25,
        marginLeft: 16,
    },
    progressColumnContainer: {
        flex: 1,
    },
    controlButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenContainer: {
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 10,
        paddingTop: 8,
    },
    progressSlider: {
        alignSelf: 'stretch',
    },
    timerLabelsContainer: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: -7,
    },
    timerLabel: {
        fontSize: 12,
        color: 'white',
    },
    track: {
        height: 5,
        borderRadius: 1,
    },
    thumb: {
        width: 20,
        height: 20,
        borderRadius: 50,
        backgroundColor: 'white',
        borderWidth: 3,
    },
});
