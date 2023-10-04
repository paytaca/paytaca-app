import { reactive } from 'vue'
import { connectWebsocket } from "./websocket-utils"
import { isValidRoomName } from "./utils"

const RTC_PEER_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun5.l.google.com:19302' },
    { urls: 'stun:stun6.l.google.com:19302' },
    { urls: 'stun:stun7.l.google.com:19302' },
    { urls: 'stun:stun8.l.google.com:19302' },
  ]
}

export class RoomMember {
  /**
   * @param {Number} peerId 
   * @param {'offerer' | 'answerer'} peerType
   * @returns 
   */
  static new(peerId=Date.now(), peerType='') {
    return new RoomMember({ peerId, peerType, rtcConfig: RTC_PEER_CONFIG })
  }

  /**
   * @param {Object} opts
   * @param {Number} opts.peerId
   * @param {any} opts.identity
   * @param {String} opts.channelName
   * @param {'offerer' | 'answerer'} opts.peerType
   * @param {RTCPeerConnection} opts.rtcConfig
   */
  constructor(opts) {
    this.id = opts?.peerId || Date.now()
    this.identity = opts?.identity
    this.channelName = opts?.channelName
    this.peerType = opts?.peerType
    this.peer = new RTCPeerConnection(opts?.rtcConfig)
    this.mediaStream = new MediaStream()
    this.dataChannel = [].map(() => new RTCDataChannel())[0]
  }

  get name() {
    if (this.identity?.name) return this.identity?.name
    return [
      this.identity?.firstName || this.identity?.first_name,
      this.identity?.lastName || this.identity?.last_name,
    ].filter(Boolean).join(' ')
  }

  get audioEnabled() {
    return this.mediaStream.getTracks().some(track => track.enabled)
  }

  get state() {
    return {
      connectionState: this.peer.connectionState,
      iceConnectionState: this.peer.iceConnectionState,
      iceGatheringState: this.peer.iceGatheringState,
      signalingState: this.peer.signalingState,
    }
  }

  get handle() {
    return [this.peerType, this.id || 'no-id' ].filter(Boolean).join(':')
  }

  toString() {
    return `RoomMember(${this.handle})`
  }

  /**
   * @param {MediaStream} mediaStream 
   */
  addTracksToPeer(mediaStream) {
    const response =  {
      addedTracks: [],
      existingTracks: [],
    }

    mediaStream.getTracks().forEach(track => {
      if (this.peer.getSenders().map(sender => sender.track).includes(track)) {
        return response.existingTracks.push(track)
      }

      this.peer.addTrack(track, mediaStream)
      response.addedTracks.push(track)
    });

    console.log(this.handle, 'Added tracks to peer', response)
    return response
  }

  setOnTrack() {
    this.peer.addEventListener('track', async (event) => {
      this.newTrackCtr = this.newTrackCtr || 0;
      if (this.mediaStream.getTracks().includes(event.track)) {
        return console.log(this.handle, 'New peer track exists', event.track);
      }

      console.log(this.handle, 'New track', event.track);
      this.mediaStream.addTrack(event.track, this.mediaStream)
      this.newTrackCtr += 1;
    })
  }

  async createOfferLocalDescription() {
    const offer = await this.peer.createOffer()
    await this.peer.setLocalDescription(offer)
  }

  async createAnswerLocalDescription() {
    const answer = await this.peer.createAnswer()
    await this.peer.setLocalDescription(answer)
  }

  async waitGatheringComplete() {
    const iceGatheringState = this.peer.iceGatheringState
    if (iceGatheringState == 'complete') return Promise.resolve()

    if (iceGatheringState == 'gathering' || iceGatheringState == 'new') {
      return new Promise(resolve => {
        this.peer.addEventListener('icegatheringstatechange', () => {
          if (this.peer.iceGatheringState === 'complete') resolve()
        })
      })
    }
    return Promise.reject(new Error(`Unknown gathering state: ${iceGatheringState}`))
  }

  async sendSignalToDataChannel(action, message) {
    console.log(this.handle, 'Sending datachannel signal', action, message)
    const data = JSON.stringify({ action, message })
    this.dataChannel?.send?.(data)
  }

  async close() {
    this.mediaStream?.getTracks()?.forEach(track => track.stop())
    this.dataChannel?.close()
    this.peer.close()
  }
}

export class WebRtcCallManager {
  /**
   * @param {Object} opts
   * @param {String} opts.callId
   * @param {Number} opts.peerId
   * @param {Object} opts.identity
   * @param {Number} opts.identity.id
   * @param {String} opts.identity.type
   * @param {String} opts.identity.name 
   * @param {{ video:Boolean, audio:Boolean }} opts.constraints
   * @param {Object} opts.signaller
   * @param {String | function} opts.signaller.url
   */
  constructor(opts) {
    this.localPeerId = opts?.peerId || Date.now()
    this.localIdentity = opts?.identity
    this.setCallId(opts?.callId)
    this.updateConstraints(opts?.constraints)

    this.members = [].map(RoomMember.new)

    const defaultSignallerUrl = (callId) => {
      return `wss://commercehub.paytaca.com/ws/webrtc/${callId}/`
      // return `ws://localhost:8000/ws/webrtc/${callId}/`
    }
    this.signaller = new WebRtcSignallerManager({
      peerId: this.localPeerId,
      callId: this.callId,
      signallerUrl: opts?.signaller?.url || defaultSignallerUrl,
      webRtcManager: this,
    })
  }

  get localPeerId() {
    return this._localPeerId
  }

  set localPeerId(value) {
    this._localPeerId = value
    if (this.signaller) this.signaller.localPeerId = this._localPeerId
  }

  setCallId(callId) {
    if (!isValidRoomName(callId)) throw new Error('Invalid roomname');
    this.callId = callId;
  }

  updateConstraints(constraints={video: true, audio: true}) {
    this.constraints = {
      video: constraints?.video === undefined ? true : Boolean(constraints?.video),
      audio: constraints?.audio === undefined ? true : Boolean(constraints?.audio),
    };
  }

  async getLocalStream() {
    const prevLocalStream = this.localStream
    this.localStream = await navigator.mediaDevices.getUserMedia(this.constraints);
    prevLocalStream?.getTracks().forEach(track => {
      track.stop();
    })

    const videoTrack = this.localStream.getVideoTracks()[0]
    const audioTrack = this.localStream.getAudioTracks()[0]
    this.members.forEach(async member => {
      const peerAudioSender = member.peer.getSenders().find(sender => sender?.track?.kind === 'audio');
      const peerVideoSender = member.peer.getSenders().find(sender => sender?.track?.kind === 'video');

      console.log({peerAudioSender, peerVideoSender});
      if (peerAudioSender) peerAudioSender.replaceTrack(audioTrack);
      else if(audioTrack) {
        const emptyAudioSenderTrack = member.peer.getSenders().find(sender => !sender?.track?.kind);
        console.log('Audio empty track', emptyAudioSenderTrack)
        if (emptyAudioSenderTrack) member.peer.removeTrack(emptyAudioSenderTrack);
        member.peer.addTrack(audioTrack, member.mediaStream);
      }

      if (peerVideoSender) peerVideoSender.replaceTrack(videoTrack);
      else if(videoTrack) {
        const emptyVideoSenderTrack = member.peer.getSenders().find(sender => !sender?.track?.kind);
        console.log('Video empty track', emptyVideoSenderTrack)
        if (emptyVideoSenderTrack) member.peer.removeTrack(emptyVideoSenderTrack);
        member.peer.addTrack(videoTrack, member.mediaStream);
      }
    });
  }

  updateStreamConstraints() {
    if (!this.localStream) return

    const videoTracks = this.localStream.getVideoTracks()
    videoTracks.forEach(track => {
      track.enabled = this.constraints.video
    })

    if (this.constraints.video && !videoTracks.length) {
      this.getLocalStream()
      return
    }

    const audioTracks = this.localStream.getAudioTracks()
    audioTracks.forEach(track => {
      track.enabled = this.constraints.audio
    })

    if (this.constraints.audio && !audioTracks.length) {
      this.getLocalStream()
      return
    }
  }

  joinRoom() {
    return this.signaller.sendSignal('new-peer', { peerId: this.localPeerId });
  }

  getMember(peerId=0) {
    return this.members.find(member => member.id == peerId);
  }

  /**
   * @param {RoomMember} member 
   */
  removeMember(member) {
    member.close()
    this.members = this.members.filter(_member => _member.id !== member.id)
  }

  /**
   * @param {RoomMember} member
   */
  addPeerDisconnectionHandler(member) {
    member.peer.addEventListener('iceconnectionstatechange', () => {
      console.log('iceconnectionstatechange', member.id, member.state);
      const iceConnectionState = member.peer.iceConnectionState
      if (['failed', 'disconnected', 'closed'].includes(iceConnectionState)) {
        console.log(member.handle, 'iceConnectionState', iceConnectionState)
        this.members = this.members.filter(_member => _member.id !== member.id);
        if (iceConnectionState != 'closed') member.peer.close();

        if (member.peerType == 'offerer') {
          this.createNewOfferer(member.id, member.channelName);
        } else if (member.peerType == 'answerer') {
          this.createNewAnswerer(null, member.id, member.channelName)
        }
      }
    })
  }

  /**
   * @param {RoomMember} member 
   */
  addDataChannelHandlers(member) {
    member.dataChannel.addEventListener('open', () => {
      console.log(member.handle, 'Data channel opened')
      member.sendSignalToDataChannel('request-identity')
    })

    member.dataChannel.addEventListener('close', () => {
      console.log(member.handle, 'Data channel closed')
    })

    member.dataChannel.addEventListener('message', evt => {
      console.log(member.handle, 'Data channel message', evt)
      try {
        const parsedData = JSON.parse(evt.data)
        this.handleDataChannelSignal(member, parsedData?.action, parsedData?.message)
      } catch (error) {
        console.error(error)
      }
    })
  }

  /**
   * @param {RoomMember} member 
   * @param {String} action 
   * @param {any} message 
   */
  async handleDataChannelSignal(member, action, message) {
    console.log(member.handle, action, message);
    if (action == 'set-identity') {
      member.identity = message;
    } else if (action == 'request-identity') {
      member.sendSignalToDataChannel('set-identity', this.localIdentity);
    } else if (action == 'close') {
      member.peer.close()
      this.removeMember(member)
    }
  }

  async createNewOfferer(peerId=0, channelName='') {
    if (!this.localStream) throw new Error('Unable to create offer, no media stream');

    let existingMember = this.getMember(peerId);
    console.log('Creating offerer', peerId, channelName)
    if (existingMember) {
      console.log(existingMember.id, 'Found existing member')
      if (existingMember.peer.iceConnectionState == 'closed') existingMember = null
    }
    const member = reactive(existingMember || RoomMember.new(peerId, 'offerer'));
    const existingIndex = this.members.findIndex(_member => _member.id == member.id)
    if (existingIndex >= 0) this.members[existingIndex] = member;
    else this.members.push(member);

    member.channelName = channelName;

    member.dataChannel = member.peer.createDataChannel('mydatachannel')
    this.addDataChannelHandlers(member);

    member.addTracksToPeer(this.localStream);
    console.log(member.handle, 'Added local tracks');

    member.setOnTrack();
    console.log(member.handle, 'Set on track');

    this.addPeerDisconnectionHandler(member);
    console.log(member.handle, 'Added ice connection state handler')

    member.peer.addEventListener('negotiationneeded', evt => {
      console.log(member.handle, 'Negotiation needed', evt)
      member.createOfferLocalDescription()
        .then(() => {
          this.signaller.sendSignal('new-offer', {
            sdp: member.peer.localDescription,
            receiver_channel_name: channelName,
          });
        })
    })

    await member.createOfferLocalDescription();
    console.log(member.handle, 'Local description set successfully')

    member.waitGatheringComplete()
      .then(() => console.log(member.handle, 'Gathering complete'));

    member.peer.addEventListener('icecandidate', evt => {
      console.log('icecandidate', evt)
      if (!evt.candidate) return
      this.signaller.sendSignal('ice-candidate', {
        receiver_channel_name: channelName,
        candidate: evt.candidate,
      })
    })

    this.signaller.sendSignal('new-offer', {
      sdp: member.peer.localDescription,
      receiver_channel_name: channelName,
    });

    setTimeout(() => {
      console.log(member.handle, 'Checking remote description')
      if (!member.peer.remoteDescription) {
        console.log(member.handle, 'Removing member')
        this.removeMember(member)
      }
    }, 10 * 1000)

    return member
  }

  /**
   * @param {RTCSessionDescriptionInit} offer 
   * @param {Number} peerId
   * @param {String} channelName
   */
  async createNewAnswerer(offer, peerId, channelName) {
    if (!this.localStream) throw new Error('Unable to create offer, no media stream');

    let existingMember = this.getMember(peerId);
    if (existingMember) {
      console.log(existingMember.id, 'Found existing member')
      if (existingMember.peer.iceConnectionState == 'closed') existingMember = null
    }

    console.log('Creating answerer', peerId, channelName)
    const member = reactive(existingMember || RoomMember.new(peerId, 'answerer'));
    const existingIndex = this.members.findIndex(_member => _member.id == member.id)
    if (existingIndex >= 0) this.members[existingIndex] = member;
    else this.members.push(member);
    
    member.channelName = channelName;

    member.peer.addEventListener('datachannel', evt => {
      member.dataChannel = evt.channel;
      this.addDataChannelHandlers(member);
    });

    member.addTracksToPeer(this.localStream);
    console.log(member.handle, 'Added local tracks');

    member.setOnTrack();
    console.log(member.handle, 'Set on track');

    this.addPeerDisconnectionHandler(member);
    console.log(member.handle, 'Added ice connection state handler')

    member.peer.addEventListener('negotiationneeded', evt => {
      console.log(member.handle, 'Negotiation needed', evt)
      member.createAnswerLocalDescription()
        .then(() => {      
          this.signaller.sendSignal('new-answer', {
            sdp: member.peer.localDescription,
            receiver_channel_name: channelName,
          });
        })
    })

    if (offer) {
      await member.peer.setRemoteDescription(offer)
      console.log(member.handle, 'Remote description set successfully')

      await member.createAnswerLocalDescription()
      console.log(member.handle, 'Local description set successfully')

      this.signaller.sendSignal('new-answer', {
        sdp: member.peer.localDescription,
        receiver_channel_name: channelName,
      })
    }

    setTimeout(() => {
      console.log(member.handle, 'Checking remote description')
      if (!member.peer.remoteDescription) {
        console.log(member.handle, 'Removing member')
        this.removeMember(member)
      }
    }, 10 * 1000)

    return member
  }

  /**
   * @param {RTCSessionDescriptionInit} answer 
   * @param {Number} peerId 
   */
  async receivedAnswer(answer, peerId) {
    const member = this.getMember(peerId)
    if (!member) return

    console.log(member.handle, 'Setting answer', answer)
    await member.peer.setRemoteDescription(answer)
    // member.mediaStream = member.mediaStream.clone()
  }

  /**
   * @param {RTCIceCandidateInit} iceCandidate 
   * @param {Number} peerId 
   */
  async addIceCandidate(iceCandidate, peerId) {
    const member = this.getMember(peerId)
    if (!member) return console.log('Member', peerId, 'not found for new ice candidate')
    member.peer.addIceCandidate(iceCandidate)
    console.log('Added ice candidate for', peerId)
  }

  async cleanUp() {
    console.log('Cleaning up')

    console.log('Closing websocket')
    this.signaller._websocket?.close?.()

    console.log('Closing member peers')
    this.members.forEach(member => {
      member.sendSignalToDataChannel('close')
      member.peer.close()
    })
    this.members = []

    console.log('Closing local stream tracks')
    this.localStream?.getTracks?.()?.forEach(track => track.stop())
  }
}

export class WebRtcSignallerManager {
  /**
   * @param {Object} opts
   * @param {String | function} opts.signallerUrl
   * @param {WebRtcCallManager} opts.webRtcManager
   */
  constructor(opts) {
    this.signallerUrl = opts?.signallerUrl;
    this._websocket = [].map(() => new WebSocket())[0];
    this.webRtcManager = opts?.webRtcManager;
  }

  get localPeerId() {
    return this.webRtcManager.localPeerId
  }

  get isWebsocketOpen() {
    return this._websocket?.readyState == WebSocket.OPEN;
  }

  async constructWsUrl() {
    if (typeof this.signallerUrl === 'function') return await this.signallerUrl(this.webRtcManager.callId)
    return this.signallerUrl
  }

  async connectWs() {
    if (this.isWebsocketOpen) return Promise.resolve(this._websocket)

    this._websocket?.close?.();
    const url = await this.constructWsUrl()
    return connectWebsocket(url)
      .then(websocket => {
        this._websocket = websocket;
        const ws = this._websocket;
        const onMessageHandler = (...args) => this.websocketMessageHandler(...args);

        ws.addEventListener('error', error => console.error('Signaller websocket', error));
        ws.addEventListener('close', () => {
          console.log('Websocket closed')
          ws.removeEventListener('message', onMessageHandler)
          this._websocket = undefined
        });
        ws.addEventListener('message', onMessageHandler);
        console.log('Websocket connected');
        return websocket;
      })
  }

  /**
   * @param {MessageEvent<any>} message 
   */
  websocketMessageHandler(message) {
    const msgData = JSON.parse(message.data);

    const peerId = msgData?.peer;
    const action = msgData?.action;
    const channelName = msgData?. message?.receiver_channel_name;

    if (peerId == this.localPeerId) return;
    console.log(peerId, action, channelName);

    // To prevent a p2p pair from creating 2 offerers;
    // The smaller peerId will always be the one creating the offerer
    // This also assumes peerIds are unique within the callId
    if (action == 'new-peer' && peerId < this.localPeerId) {
      this.webRtcManager.createNewAnswerer(null, peerId, channelName)
      return this.sendSignal('request-offer', {
        receiver_channel_name: channelName,
      })
    } else if ((action == 'new-peer' || action == 'request-offer') && peerId >= this.localPeerId) {
      return this.webRtcManager.createNewOfferer(peerId, channelName)
    } else if (action == 'new-offer') {
      const offer = msgData?.message?.sdp
      return this.webRtcManager.createNewAnswerer(offer, peerId, channelName)
    } else if (action == 'new-answer') {
      const answer = msgData?.message?.sdp
      return this.webRtcManager.receivedAnswer(answer, peerId)
    } else if (action == 'ice-candidate') {
      const candidate = msgData?.message?.candidate
      return this.webRtcManager.addIceCandidate(candidate, peerId)
    }
  }

  sendSignal(action, message) {
    if (!this.isWebsocketOpen) return console.log('Websocket closed, unable to send signal')
    console.log('Sending signal', action, message)
    const data = {
      peer: this.localPeerId,
      action: action,
      message: message,
    }
    const dataStr = JSON.stringify(data)
    this._websocket.send(dataStr)
    return true
  }
}
