// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import parseUrl from 'url-parse';

import ProgressiveImage from '@components/progressive_image';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import EphemeralStore from '@store/ephemeral_store';
import {calculateDimensions, isGifTooLarge, openGalleryAtIndex} from '@utils/images';
import {generateId} from '@utils/file';

import type {PostImage} from '@mm-redux/types/posts';

type MarkdownTableImageProps = {
    disable: boolean;
    imagesMetadata: Record<string, PostImage>;
    postId: string;
    serverURL?: string;
    source: string;
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        flex: 1,
    },
    brokenImageIcon: {
        width: 24,
        height: 24,
    },
});

const MarkTableImage = ({disable, imagesMetadata, postId, serverURL, source}: MarkdownTableImageProps) => {
    const metadata = imagesMetadata[source];
    const fileId = useRef(generateId()).current;
    const [failed, setFailed] = useState(isGifTooLarge(metadata));

    const getImageSource = () => {
        let uri = source;
        let server = serverURL;

        if (!serverURL) {
            server = EphemeralStore.currentServerUrl;
        }

        if (uri.startsWith('/')) {
            uri = server + uri;
        }

        return uri;
    };

    const getFileInfo = () => {
        const {height, width} = metadata;
        const link = decodeURIComponent(getImageSource());
        let filename = parseUrl(link.substr(link.lastIndexOf('/'))).pathname.replace('/', '');
        let extension = filename.split('.').pop();

        if (extension === filename) {
            const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
            filename = `${filename}${ext}`;
            extension = ext;
        }

        return {
            id: fileId,
            name: filename,
            extension,
            has_preview_image: true,
            post_id: postId,
            uri: link,
            width,
            height,
        };
    };

    const handlePreviewImage = useCallback(() => {
        if (disable) {
            return;
        }

        const files = [getFileInfo()];
        openGalleryAtIndex(0, files);
    }, []);

    const onLoadFailed = useCallback(() => {
        setFailed(true);
    }, []);

    let image;
    if (failed) {
        image = (
            <FastImage
                source={require('@assets/images/icons/brokenimage.png')}
                style={styles.brokenImageIcon}
            />
        );
    } else {
        const {height, width} = calculateDimensions(metadata.height, metadata.width, 100, 100);
        image = (
            <TouchableWithFeedback
                onPress={handlePreviewImage}
                style={{width, height}}
            >
                <ProgressiveImage
                    id={fileId}
                    defaultSource={{uri: source}}
                    onError={onLoadFailed}
                    resizeMode='contain'
                    style={{width, height}}
                />
            </TouchableWithFeedback>
        );
    }

    return (
        <View style={styles.container}>
            {image}
        </View>
    );
};

export default MarkTableImage;