import { Button } from "@material-ui/core";
import React, { useRef, useEffect, useState } from "react";

const LS_NAME = 'audioMessageRate';

const AudioModal = ({url}) => {
    const audioRef = useRef(null);
    const [audioRate, setAudioRate] = useState(parseFloat(localStorage.getItem(LS_NAME) || "1"));
    const [showButtonRate, setShowButtonRate] = useState(false);

    // Verifica se o dispositivo é iOS ou Android
    const isMobile = /iPad|iPhone|iPod|Android/.test(navigator.userAgent) && !window.MSStream;

    useEffect(() => {
      audioRef.current.playbackRate = audioRate;
      localStorage.setItem(LS_NAME, audioRate);
    }, [audioRate]);
  
    useEffect(() => {
      audioRef.current.onplaying = () => {
        setShowButtonRate(true);
      };
      audioRef.current.onpause = () => {
        setShowButtonRate(false);
      };
      audioRef.current.onended = () => {
        setShowButtonRate(false);
      };
    }, []);
  
    const toggleRate = () => {
      let newRate = null;
  
      switch (audioRate) {
        case 0.5:
          newRate = 1;
          break;
        case 1:
          newRate = 1.5;
          break;
        case 1.5:
          newRate = 2;
          break;
        case 2:
          newRate = 0.5;
          break;
        default:
          newRate = 1;
          break;
      }
  
      setAudioRate(newRate);
    };
  
    const getAudioSource = () => {
      let sourceUrl = url;
  
      // Substitui .ogg por .mp3 em dispositivos iOS ou Android
      if (isMobile) {
        sourceUrl = sourceUrl.replace(".ogg", ".mp3");
      }
  
      return (
        <source src={sourceUrl} type={isMobile ? "audio/mp3" : "audio/ogg"} />
      );
    };
  
    return (
      <>
        <audio ref={audioRef} controls>
          {getAudioSource()}
        </audio>
        {showButtonRate && (
          <Button
            style={{ marginLeft: "5px", marginTop: "-45px" }}
            onClick={toggleRate}
          >
            {audioRate}x
          </Button>
        )}
      </>
    );
}

export default AudioModal;
