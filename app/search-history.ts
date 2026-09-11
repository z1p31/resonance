export function cleanSearch(value:unknown){return typeof value==='string'?value.normalize('NFKC').trim().replace(/\s+/g,' ').slice(0,100):''}
export function updateSearches(previous:unknown,action:'search-save'|'search-remove'|'search-clear',value?:unknown):string[]{
 if(action==='search-clear')return [];
 const list=Array.isArray(previous)?previous.map(cleanSearch).filter(Boolean):[];const query=cleanSearch(value);if(!query)return list.slice(0,20);
 const remaining=list.filter(q=>q.toLocaleLowerCase()!==query.toLocaleLowerCase());return (action==='search-save'?[query,...remaining]:remaining).slice(0,20);
}
