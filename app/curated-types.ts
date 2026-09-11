export type CuratedPlaylist={id:string;title:string;cover:string;count:number;plays:number;category:string;updated:number};
export const sceneCategories=['地铁','夜晚','咖啡馆','运动','学习','旅行','工作'];
export const moodCategories=['快乐','伤感','放松','治愈','孤独','浪漫'];
export const genreCategories=['华语','摇滚','电子','爵士','民谣','说唱','怀旧','影视原声','轻音乐'];
export type CuratedFeed={groups:Record<string,CuratedPlaylist[]>;newest:CuratedPlaylist[];updated:number;stale?:boolean};

