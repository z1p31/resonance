export type PlayMode='sequence'|'repeat'|'shuffle';
export function nextIndex(length:number,index:number,mode:PlayMode,step:number,automatic=false,random=Math.random){
 if(!length)return -1;
 if(automatic&&mode==='repeat')return Math.max(0,index);
 if(mode==='shuffle'){if(length===1)return 0;if(index<0)return Math.floor(random()*length);const pick=Math.floor(random()*(length-1));return pick>=index?pick+1:pick}
 const next=index+step;if(automatic&&next>=length)return -1;
 return (next+length)%length;
}
