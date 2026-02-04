import React, { useState, useEffect } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { Box, IconButton, Typography, CircularProgress } from '@mui/material';
import {
    Mic as MicIcon,
    Stop as StopIcon,
    Delete as DeleteIcon,
    Send as SendIcon,
    Close as CloseIcon
} from '@mui/icons-material';

interface AudioRecorderProps {
    onSend: (blob: Blob) => void;
    onCancel: () => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSend, onCancel }) => {
    const { status, startRecording, stopRecording, mediaBlobUrl, clearBlobUrl } =
        useReactMediaRecorder({ audio: true });

    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (status === 'recording') {
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [status]);

    useEffect(() => {
        startRecording();
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStopAndSend = async () => {
        stopRecording();
        // Wait for blob to be available (handled by mediaBlobUrl change or fetch)
        // But react-media-recorder doesn't give blob directly in stopRecording
        // We need to fetch it from mediaBlobUrl
    };

    // We need to watch mediaBlobUrl to send
    useEffect(() => {
        if (status === 'stopped' && mediaBlobUrl) {
            // This effect might trigger on initial render if stopped? No, initially idle.
            // But we want to send ONLY when user clicked send.
            // So we need a state "isSending".
        }
    }, [mediaBlobUrl, status]);

    const [isSending, setIsSending] = useState(false);

    const handleSendClick = () => {
        setIsSending(true);
        stopRecording();
    };

    useEffect(() => {
        const sendAudio = async () => {
            if (isSending && mediaBlobUrl && status === 'stopped') {
                try {
                    const response = await fetch(mediaBlobUrl);
                    const blob = await response.blob();
                    onSend(blob);
                    clearBlobUrl();
                } catch (error) {
                    console.error('Error fetching audio blob:', error);
                } finally {
                    setIsSending(false);
                }
            }
        };
        sendAudio();
    }, [mediaBlobUrl, status, isSending, onSend, clearBlobUrl]);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <IconButton onClick={onCancel} color="error">
                <DeleteIcon />
            </IconButton>

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MicIcon color="error" sx={{ animation: 'pulse 1s infinite' }} />
                <Typography variant="body1">{formatTime(recordingTime)}</Typography>
                {status === 'recording' ? (
                    <Typography variant="caption" color="text.secondary">Recording...</Typography>
                ) : (
                    <Typography variant="caption" color="text.secondary">Processing...</Typography>
                )}
            </Box>

            <IconButton onClick={handleSendClick} color="primary" disabled={status !== 'recording'}>
                <SendIcon />
            </IconButton>

            <style>
                {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
            </style>
        </Box>
    );
};

export default AudioRecorder;
