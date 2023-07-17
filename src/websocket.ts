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
    ERROR = 'error',
    CONNECTED = 'connected',
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

export class WebSocketConnection extends EventEmitter {
    private name: string;
    private connected: boolean = false;
    public channelName: string | number = '';
    public chatroomName: string | number = '';
    private wsConnection: WebSocket;
    constructor(name: string) {
        super();
        this.name = name;
        this.wsConnection = new WebSocket('wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.6.0&flash=false');

        this.wsConnection.onopen = (event) => {
            this.connected = false
            console.log('connected to websocket')
        }

        this.wsConnection.onclose = () => {
            this.connected = false
            console.log('disconnected from websocket')
        }

        this.wsConnection.onmessage = (event) => {
            const websocket_message: TWebsocketMessage = JSON.parse(String(event.data));
            switch (websocket_message.event) {
                case 'App\\\\Events\\\\ChatMessageEvent':
                    this.emit(MessageEvents.CHAT, JSON.parse(websocket_message.data))
                    break;
                case 'App\\\\Events\\\\FollowersUpdated':
                    this.emit(MessageEvents.FOLLOWERUPDATE, JSON.parse(websocket_message.data))
                    break;
                case 'App\\\\Events\\\\UserBannedEvent':
                    this.emit(MessageEvents.BAN, JSON.parse(websocket_message.data))
                    break;
                case 'App\\\\Events\\\\UserUnbannedEvent':
                    this.emit(MessageEvents.UNBAN, JSON.parse(websocket_message.data))
                    break;
                case 'App\\\\Events\\\\ChannelSubscriptionEvent':
                    this.emit(MessageEvents.CHANNELSUBSCRIPTION, JSON.parse(websocket_message.data))
                    break;
                case 'App\\\\Events\\\\GiftedSubscriptionsEvent':
                    this.emit(MessageEvents.GIFTEDSUBSCRIPTION, JSON.parse(websocket_message.data))
                    break;
                case 'App\\\\Events\\\\LuckyUsersWhoGotGiftSubscriptionsEvent':
                    this.emit(MessageEvents.LUCKYUSERSWHOGOTGIFTSUBSCRIPTIONS, JSON.parse(websocket_message.data))
                    break;
                case 'App\\\\Events\\\\GiftsLeaderboardUpdated':
                    this.emit(MessageEvents.GIFTSLEADERBOARDUPDATED, JSON.parse(websocket_message.data))
                    break;
                case 'App\\\\Events\\\\MessageDeletedEvent':
                    this.emit(MessageEvents.MESSEAGEDELETE, JSON.parse(websocket_message.data))
                    break;
                case 'App\\\\Events\\\\StopStreamBroadcast':
                    this.emit(MessageEvents.STOPSTREAM, JSON.parse(websocket_message.data))
                    break;
                case 'App\\\\Events\\\\ChatroomUpdatedEvent':
                    this.emit(MessageEvents.CHATROOMUPDATED, JSON.parse(websocket_message.data))
                    break;
                case 'App\\\\Events\\\\StreamHostEvent':
                    this.emit(MessageEvents.STREAMHOST, JSON.parse(websocket_message.data))
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
                this.connected = true
                resolve(this.wsConnection); // Resolves the promise with the WebSocket object
            };

            this.wsConnection.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error); // Rejects the promise with the error
            };
        });
    }

    private async getIds() {
        const websiteUrl = CHANNEL + this.name
        const htmlContent = await scrapeWebsite(websiteUrl);
        const rainerwinklerdl_data: any = htmlContent
        this.channelName = rainerwinklerdl_data.chatroom.channel_id
        this.chatroomName = rainerwinklerdl_data.chatroom.id
        console.log(rainerwinklerdl_data.chatroom.id)
    }

    public async connect() {
        try {
            if (this.connected === true) {
                throw new Error("Already connected")
            }
            await this.getIds()
            if (this.wsConnection.readyState === WebSocket.OPEN && this.connected === false) {
                try {
                    this.wsConnection.send(JSON.stringify(generateSubscribeEventChannel(this.channelName)))
                    this.wsConnection.send(JSON.stringify(generateSubscribeEventChatrooms(this.chatroomName)))
                    this.connected = true
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
            this.emit('errorEvent', error)
        }
    }
}

