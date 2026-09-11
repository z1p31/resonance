export type Song={id:string;provider:string;title:string;artist:string;album:string;cover:string;duration:string;durationMs?:number;importStatus?:'matched'|'unmatched';keyword?:string};
export type Quality={id:string;label:string;detail:string;url:string;mime?:string};
export type Mix={cover?:string;id:string;title:string;description:string;songs:Song[];tone:string;updated:number};
export type Feed={mixes:Mix[];updated:number;stale?:boolean};

