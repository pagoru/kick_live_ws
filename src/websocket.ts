import WebSocket from "ws";
import { EventEmitter } from "events";
import { CHANNEL } from "./api-routes/kick";
import { scrapeWebsite } from "./fetch/userAPI";
import { TWebsocketMessage } from "./types/websocketTypes";

export const enum MessageEvents {
    CHAT = 'chat',
    FOLLOWERUPDATE = 'followerupdate',
    BAN = 'ban',
    UNBAN = 'unban',
    MESSEAGEDELETE = 'messagedelete',
    STOPSTREAM = 'stopstream',
    CHANNELSUBSCRIPTION = 'channelsubscription',
    GIFTEDSUBSCRIPTION = 'giftedsubscription',
    LUCKYUSERSWHOGOTGIFTSUBSCRIPTIONS = 'luckyuserswhogotgiftsubscriptions',
    GIFTSLEADERBOARDUPDATED = 'giftsleaderboardupdated',
    CHATROOMUPDATED = 'chatroomupdated',
    STREAMHOST = 'streamhost',
    PINNEDMESSAGECREATED = 'pinnedmessagecreated',
    ERROR = 'error',
    CONNECTED = 'connected',
    DISCONNECT = 'disconnect'
};

function generateSubscribeEventChatrooms(chatroomName: string | number) {
    const subscribeEvent = {
        "event": "pusher:subscribe",
        "data": {
            "auth": "",
            "channel": `chatrooms.${chatroomName}.v2`
        }
    };

    return subscribeEvent;
}

function generateSubscribeEventChannel(channelName: string | number) {
    const subscribeEvent = { "event": "pusher:subscribe", "data": { "auth": "", "channel": `channel.${channelName}` } };

    return subscribeEvent;
}

interface WebSocketConnectionOptions {
    name: string;
    chatroom_id?: string | number; // Das Fragezeichen macht das Feld optional
    channel_id?: string | number;  // Das Fragezeichen macht das Feld optional
}

export class WebSocketConnection extends EventEmitter {
    private name: string;
    private connected: boolean = false;
    public channelName: string | number = '';
    public chatroomName: string | number = '';
    public chatroom_id: string | number = '';
    public channel_id: string | number = '';
    private wsConnection: WebSocket;
    constructor({ name, chatroom_id, channel_id }:WebSocketConnectionOptions) {
        super();
        this.name = name;
        this.chatroom_id = chatroom_id  !== undefined ? chatroom_id : '';
        this.channel_id = channel_id  !== undefined ? channel_id : '';
        this.wsConnection = new WebSocket('wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.6.0&flash=false');

        this.wsConnection.onopen = (event) => {
            this.connected = false
            console.log('connected to websocket')
        }

        this.wsConnection.onclose = () => {
            this.connected = false
            this.emit(MessageEvents.DISCONNECT,'disconnected')
            console.log('disconnected from websocket')
        }

        this.wsConnection.onerror = () => {
            this.connected = false
            this.emit(MessageEvents.ERROR,'error')
            console.log('disconnected from websocket due to error')
        }

        this.wsConnection.onmessage = (event) => {
            const websocket_message: TWebsocketMessage = JSON.parse(String(event.data));
            switch (websocket_message.event) {
                case 'App\\Events\\ChatMessageEvent':
                    this.emit(MessageEvents.CHAT, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\FollowersUpdated':
                    this.emit(MessageEvents.FOLLOWERUPDATE, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\UserBannedEvent':
                    this.emit(MessageEvents.BAN, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\UserUnbannedEvent':
                    this.emit(MessageEvents.UNBAN, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\SubscriptionEvent':
                    this.emit(MessageEvents.UNBAN, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\ChannelSubscriptionEvent':
                    this.emit(MessageEvents.CHANNELSUBSCRIPTION, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\GiftedSubscriptionsEvent':
                    this.emit(MessageEvents.GIFTEDSUBSCRIPTION, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\LuckyUsersWhoGotGiftSubscriptionsEvent':
                    this.emit(MessageEvents.LUCKYUSERSWHOGOTGIFTSUBSCRIPTIONS, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\GiftsLeaderboardUpdated':
                    this.emit(MessageEvents.GIFTSLEADERBOARDUPDATED, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\MessageDeletedEvent':
                    this.emit(MessageEvents.MESSEAGEDELETE, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\StopStreamBroadcast':
                    this.emit(MessageEvents.STOPSTREAM, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\ChatroomUpdatedEvent':
                    this.emit(MessageEvents.CHATROOMUPDATED, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\StreamHostEvent':
                    this.emit(MessageEvents.STREAMHOST, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\PinnedMessageCreatedEvent':
                    this.emit(MessageEvents.PINNEDMESSAGECREATED, JSON.parse(websocket_message.data))
                    break;
                case 'App\\Events\\PinnedMessageDeletedEvent':
                    this.emit(MessageEvents.PINNEDMESSAGECREATED, JSON.parse(websocket_message.data))
                    break;
                case 'pusher:error':
                    this.emit(MessageEvents.ERROR, event)
                    break;
                case 'pusher_internal:subscription_succeeded':
                    this.emit(MessageEvents.CONNECTED, event)
                    break;
                default:
                    console.log(websocket_message.event)
                    console.log(JSON.parse(websocket_message.data))
                    break;
            }
            // const message = event.data;
            // console.log(`Received message: ${message}`);
        };
    }

    private async connectWebSocket() {
        return new Promise((resolve, reject) => {
            this.wsConnection = new WebSocket('wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.6.0&flash=false');

            this.wsConnection.onopen = () => {
                console.log('WebSocket connection established');
                this.connected = false
                resolve(this.wsConnection); // Resolves the promise with the WebSocket object
            };

            this.wsConnection.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error); // Rejects the promise with the error
            };
        });
    }

    private async getIds() {
        return new Promise(async (resolve, reject) => {
            try {
                const websiteUrl = CHANNEL + this.name;
                console.log('pre scrap');
                const htmlContent = await scrapeWebsite(websiteUrl);
                console.log('past scrap');
                const rainerwinklerdl_data: any = htmlContent;
                this.channelName = rainerwinklerdl_data.chatroom.channel_id;
                this.chatroomName = rainerwinklerdl_data.chatroom.id;
                console.log(rainerwinklerdl_data.chatroom.id);
                resolve(rainerwinklerdl_data); // Resolves the Promise when the asynchronous operation is completed
            } catch (error) {
                console.log('error get ids',error)
                reject(error); // Rejects the Promise if an error occurs during the asynchronous operation
            }
        });
    }

    public async connect() {
        try {
            console.log('trying to connect')
            if (this.connected === true) {
                console.log('"Already connected"')
                throw new Error("Already connected")
            }
            console.log('getting ids')
            if(this.channel_id ==='' && this.chatroom_id===''){
            await this.getIds()
            }
            console.log('got ids')
            if (this.wsConnection.readyState === WebSocket.OPEN && this.connected === false) {
                console.log('sending subscribtions')
                try {
                    if(this.channel_id ==='' && this.chatroom_id===''){
                        this.wsConnection.send(JSON.stringify(generateSubscribeEventChannel(this.channelName)))
                        this.wsConnection.send(JSON.stringify(generateSubscribeEventChatrooms(this.chatroomName)))
                    }else{
                        this.wsConnection.send(JSON.stringify(generateSubscribeEventChannel(this.channel_id)))
                        this.wsConnection.send(JSON.stringify(generateSubscribeEventChatrooms(this.chatroom_id))) 
                    }
                    this.connected = true
                    console.log('listening to chat')
                } catch (err: any) {
                    throw new Error("Error while sending subscription events")
                }
            }
            if (this.wsConnection.readyState === WebSocket.CONNECTING || this.wsConnection.readyState === WebSocket.CLOSING) {
                throw new Error("Connecting, try later");
            }
            if (this.wsConnection.readyState === WebSocket.CLOSED) {
                try {
                    await this.connectWebSocket()
                    this.wsConnection.send(JSON.stringify(generateSubscribeEventChannel(this.channelName)))
                    this.wsConnection.send(JSON.stringify(generateSubscribeEventChatrooms(this.chatroomName)))

                } catch (error) {
                    console.error('Failed to connect to WebSocket:', error);
                    // Handle den Fehler entsprechend
                }
            }
        } catch (error) {
            console.log('in error event')
            this.emit('errorEvent', error)
        }
    }
}

