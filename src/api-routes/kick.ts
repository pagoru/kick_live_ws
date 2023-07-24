export const CURRENT_VIEWER =  'https://kick.com/current-viewers?ids[]='

export const CHANNEL_V1 = `https://kick.com/api/v1/channels/`
export const CHANNEL = `https://kick.com/api/v2/channels/`
export const LIVESTREAM = (name:string) => `https://kick.com/api/v2/channels/${name}/`;