export const preview=(value:string,limit=115)=>value.length>limit?`${value.slice(0,limit).trim()}…`:value;
export const listFromLines=(text:string)=>text.split('\n').map(x=>x.trim()).filter(Boolean);
export const linesFromList=(list?:string[])=>list?.join('\n')||'';
