// src/features/bravman/hooks/useBravmanSound.js

import {
    useCallback,
    useEffect,
    useRef,
} from "react";

import tapSound
    from "../assets/sounds/tap.mp3";

import crowdStartSound
    from "../assets/sounds/crowd-start.mp3";

import crowdFinishSound
    from "../assets/sounds/crowd-finish.mp3";


const useBravmanSound = ({
    status,
    lastTapAccepted,
}) => {

    const tapAudio =
        useRef(null);

    const crowdStartAudio =
        useRef(null);

    const crowdFinishAudio =
        useRef(null);


    useEffect(() => {

        tapAudio.current =
            new Audio(tapSound);

        crowdStartAudio.current =
            new Audio(crowdStartSound);

        crowdFinishAudio.current =
            new Audio(crowdFinishSound);


        return () => {

            tapAudio.current?.pause();

            crowdStartAudio.current?.pause();

            crowdFinishAudio.current?.pause();

        };

    }, []);


    const playTap =
        useCallback(() => {

            if (!tapAudio.current) {
                return;
            }

            tapAudio.current.currentTime =
                0;

            tapAudio.current.play()
                .catch(() => {});

        }, []);


    const playStart =
        useCallback(() => {

            if (!crowdStartAudio.current) {
                return;
            }

            crowdStartAudio.current.currentTime =
                0;

            crowdStartAudio.current.play()
                .catch(() => {});

        }, []);


    const playFinish =
        useCallback(() => {

            if (!crowdFinishAudio.current) {
                return;
            }

            crowdFinishAudio.current.currentTime =
                0;

            crowdFinishAudio.current.play()
                .catch(() => {});

        }, []);


    useEffect(() => {

        if (lastTapAccepted) {
            playTap();
        }

    }, [
        lastTapAccepted,
        playTap,
    ]);


    useEffect(() => {

        if (status === "playing") {
            playStart();
        }


        if (status === "finished") {
            playFinish();
        }

    }, [
        status,
        playStart,
        playFinish,
    ]);


    return {

        playTap,

        playStart,

        playFinish,

    };

};


export default useBravmanSound;