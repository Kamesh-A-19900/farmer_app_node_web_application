import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import styles from './Call.module.css';

export default function Call() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Outgoing call state from navigation
  const { receiver_id, call_type, receiver_name } = location.state || {};

  const [callState, setCallState] = useState('idle'); // idle | calling | incoming | active
  const [incomingCall, setIncomingCall] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callLogId, setCallLogId] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  useEffect(() => {
    if (!socket) return;

    socket.on('receive_call', ({ caller_id, call_type: ct, call_log_id }) => {
      setIncomingCall({ caller_id, call_type: ct, call_log_id });
      setCallState('incoming');
    });

    socket.on('call_accepted', async ({ receiver_id: rid }) => {
      setCallState('active');
      await startLocalStream();
      await createOffer(rid);
    });

    socket.on('call_rejected', () => {
      setCallState('idle');
      alert('Call was rejected or user is offline.');
    });

    socket.on('call_ended', () => {
      endCall();
    });

    socket.on('webrtc_offer', async ({ caller_id, offer }) => {
      await startLocalStream();
      const pc = createPeerConnection(caller_id);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { caller_id, answer });
    });

    socket.on('webrtc_answer', async ({ answer }) => {
      await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice_candidate', async ({ candidate }) => {
      try { await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch {}
    });

    // Auto-initiate if navigated with receiver info
    if (receiver_id && call_type) {
      initiateCall();
    }

    return () => {
      socket.off('receive_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_ended');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('ice_candidate');
    };
  }, [socket]);

  const startLocalStream = async () => {
    try {
      const constraints = call_type === 'video' || incomingCall?.call_type === 'video'
        ? { video: true, audio: true }
        : { audio: true, video: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('Media error:', err);
    }
  };

  const createPeerConnection = (otherUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current);
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { other_user_id: otherUserId, candidate: event.candidate });
      }
    };

    return pc;
  };

  const createOffer = async (otherUserId) => {
    const pc = createPeerConnection(otherUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc_offer', { receiver_id: otherUserId, offer });
  };

  const initiateCall = () => {
    if (!socket || !receiver_id) return;
    setCallState('calling');
    socket.emit('call_user', { receiver_id, call_type });
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    setCallLogId(incomingCall.call_log_id);
    socket.emit('accept_call', { caller_id: incomingCall.caller_id, call_log_id: incomingCall.call_log_id });
    setCallState('active');
    await startLocalStream();
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    socket.emit('reject_call', { caller_id: incomingCall.caller_id, call_log_id: incomingCall.call_log_id });
    setCallState('idle');
    setIncomingCall(null);
  };

  const endCall = () => {
    const otherId = incomingCall?.caller_id || receiver_id;
    if (otherId) socket.emit('end_call', { other_user_id: otherId, call_log_id: callLogId });
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState('idle');
    setIncomingCall(null);
    navigate('/chat');
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };

  const isVideo = call_type === 'video' || incomingCall?.call_type === 'video';

  return (
    <div className={styles.page}>
      {/* Incoming call popup */}
      {callState === 'incoming' && incomingCall && (
        <div className={styles.incomingPopup}>
          <div className={styles.popupCard}>
            <p className={styles.popupIcon}>{incomingCall.call_type === 'video' ? '🎥' : '📞'}</p>
            <h3>Incoming {incomingCall.call_type} call</h3>
            <p style={{ color: 'var(--color-secondary)' }}>from User #{incomingCall.caller_id}</p>
            <div className={styles.popupActions}>
              <button className="btn btn-primary" onClick={acceptCall}>✅ Accept</button>
              <button className="btn btn-danger" onClick={rejectCall}>❌ Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Calling state */}
      {callState === 'calling' && (
        <div className={styles.callingScreen}>
          <div className={styles.callingCard}>
            <p className={styles.popupIcon}>{call_type === 'video' ? '🎥' : '📞'}</p>
            <h3>Calling {receiver_name || `User #${receiver_id}`}...</h3>
            <p style={{ color: 'var(--color-secondary)', marginTop: 8 }}>Waiting for answer</p>
            <button className="btn btn-danger" style={{ marginTop: 24 }} onClick={endCall}>Cancel</button>
          </div>
        </div>
      )}

      {/* Active call screen */}
      {callState === 'active' && (
        <div className={styles.activeCall}>
          {isVideo && (
            <div className={styles.videoContainer}>
              <video ref={remoteVideoRef} autoPlay playsInline className={styles.remoteVideo} />
              <video ref={localVideoRef} autoPlay playsInline muted className={styles.localVideo} />
            </div>
          )}
          {!isVideo && (
            <div className={styles.audioCall}>
              <p className={styles.popupIcon}>📞</p>
              <h3>Call in progress...</h3>
            </div>
          )}
          <div className={styles.callControls}>
            <button className={`btn ${isMuted ? 'btn-warning' : 'btn-outline'}`} onClick={toggleMute}>
              {isMuted ? '🔇 Unmute' : '🎤 Mute'}
            </button>
            <button className="btn btn-danger" onClick={endCall}>📵 End Call</button>
          </div>
        </div>
      )}

      {/* Idle state */}
      {callState === 'idle' && (
        <div className={styles.idleScreen}>
          <p className={styles.popupIcon}>📞</p>
          <h3>No active call</h3>
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/chat')}>
            Back to Chat
          </button>
        </div>
      )}
    </div>
  );
}
