import { useRef, useState, useCallback } from 'react';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export const useWebRTC = (socket) => {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  const getMedia = async (callType) => {
    const stream = await navigator.mediaDevices.getUserMedia(
      callType === 'video' ? { video: true, audio: true } : { audio: true, video: false }
    );
    localStreamRef.current = stream;
    return stream;
  };

  const createPC = useCallback((otherUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));

    pc.ontrack = (e) => setRemoteStream(e.streams[0]);

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('ice_candidate', { other_user_id: otherUserId, candidate: e.candidate });
      }
    };

    return pc;
  }, [socket]);

  const makeOffer = async (otherUserId) => {
    const pc = createPC(otherUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket?.emit('webrtc_offer', { receiver_id: otherUserId, offer });
  };

  const handleOffer = async (callerId, offer) => {
    const pc = createPC(callerId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket?.emit('webrtc_answer', { caller_id: callerId, answer });
  };

  const handleAnswer = async (answer) => {
    await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const addIceCandidate = async (candidate) => {
    try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };

  const cleanup = () => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setRemoteStream(null);
  };

  return {
    localStreamRef, remoteStream, isMuted,
    getMedia, makeOffer, handleOffer, handleAnswer, addIceCandidate, toggleMute, cleanup,
  };
};
