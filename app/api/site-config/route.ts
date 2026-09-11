import {database,result,settings,type DB} from '../admin/core';
export const dynamic='force-dynamic';
export async function GET(){let db:DB|undefined;try{db=await database();const s=await settings(db);return result({announcement:s.announcement,sso:['linuxdo','github','google'].filter(id=>s.sso[id]?.enabled&&s.sso[id]?.clientId&&s.sso[id]?.clientSecret)})}catch{return result({announcement:{enabled:false,text:''},sso:[]})}finally{db?.destroy()}}
