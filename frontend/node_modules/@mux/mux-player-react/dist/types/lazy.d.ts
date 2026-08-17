import React from 'react';
import type { ValueOf } from '@mux/playback-core';
import type { MuxPlayerProps } from './index';
import type MuxPlayerElement from '@mux/mux-player';
interface MuxPlayerElementReact extends Partial<Omit<MuxPlayerElement, 'style' | 'children' | 'autoplay' | 'capRenditionToPlayerSize'>> {
    ref: React.MutableRefObject<MuxPlayerElement | null> | null | undefined;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    autoplay?: MuxPlayerProps['autoPlay'];
    'cap-rendition-to-player-size'?: boolean;
}
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'mux-player': MuxPlayerElementReact;
        }
    }
}
type LoadingType = {
    PAGE: 'page';
    VIEWPORT: 'viewport';
};
declare const LoadingType: LoadingType;
interface MuxPlayerLazyProps extends MuxPlayerProps {
    loading?: ValueOf<LoadingType>;
}
declare const MuxPlayer: React.ForwardRefExoticComponent<MuxPlayerLazyProps & React.RefAttributes<MuxPlayerElement>>;
export default MuxPlayer;
