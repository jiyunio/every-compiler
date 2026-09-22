// Pure edit operations keep pairing consistent with selections and Java comments.
function javaContext(source, end = source.length) {
    let state='code', masked='';
    for(let i=0;i<end;i++){
        const c=source[i],n=source[i+1];
        if(state==='line'){masked+=c==='\n'?'\n':' ';if(c==='\n')state='code';}
        else if(state==='block'){if(c==='*'&&n==='/'&&i+1<end){masked+='  ';i++;state='code';}else masked+=c==='\n'?'\n':' ';}
        else if(state==='"'||state==="'"){
            if(c==='\\'&&i+1<end){masked+='  ';i++;}else{masked+=c==='\n'?'\n':' ';if(c===state||c==='\n')state='code';}
        }else if(c==='/'&&n==='/'&&i+1<end){masked+='  ';i++;state='line';}
        else if(c==='/'&&n==='*'&&i+1<end){masked+='  ';i++;state='block';}
        else if(c==='"'||c==="'"){state=c;masked+=' ';}
        else masked+=c;
    }
    return {state,masked};
}
function smartEdit(source,start,end,key,shift=false){
    const pairs={'{':'}','(':')','[':']','"':'"',"'":"'"};
    const before=javaContext(source,start), all=javaContext(source).masked;
    const edit=(text,from=start,to=end,caret=from+text.length,selectionEnd=caret)=>({text,from,to,caret,selectionEnd});
    if(key==='Tab'&&shift){
        const from=source.slice(0,start).lastIndexOf('\n')+1;
        const to=end>start&&source[end-1]==='\n'?end-1:end;
        const segment=source.slice(from,to),trimmed=segment.replace(/^(?: {1,4}|\t)/gm,'');
        const first=segment.match(/^(?: {1,4}|\t)/)?.[0].length||0;
        return edit(trimmed,from,to,Math.max(from,start-first),Math.max(from,end-(segment.length-trimmed.length)));
    }
    if(key==='Tab'&&start!==end){
        const from=source.slice(0,start).lastIndexOf('\n')+1;
        const to=source[end-1]==='\n'?end-1:end;
        const text=source.slice(from,to).replace(/^/gm,'    ');
        return edit(text,from,to,start+4,end+text.length-(to-from));
    }
    if(key==='Backspace'&&start===end&&start>0){
        if(pairs[source[start-1]] && pairs[source[start-1]]===source[start]&&(before.state==='code'||before.state===source[start-1]))return edit('',start-1,start+1,start-1);
        const prefix=source.slice(source.slice(0,start).lastIndexOf('\n')+1,start);
        if(/^ +$/.test(prefix)){const count=(prefix.length%4)||4;return edit('',start-count,start,start-count);}
    }
    if(start===end&&source[start]===key&&')]}'.includes(key)&&before.state==='code')return edit('',start,start,start+1);
    if(pairs[key]){
        const quote=key==='"'||key==="'";
        if(quote&&before.state===key&&source[start]===key&&start===end&&source[start-1]!=='\\')return edit('',start,start,start+1);
        if(before.state!=='code')return null;
        if(start!==end)return edit(key+source.slice(start,end)+pairs[key],start,end,start+1,end+1);
        if(quote){
            // A following quote can close this opening quote instead of being duplicated.
            if(source[start]===key)return edit(key);
            if(/[\p{L}\p{N}_$]/u.test(source[start]||''))return null;
            return edit(key+pairs[key],start,end,start+1);
        }
        let balance=0;
        for(const c of all){if(c===key)balance++;else if(c===pairs[key])balance--;}
        let depth=0,closingAhead=false;
        for(const c of all.slice(start)){if(c===key)depth++;else if(c===pairs[key]){if(depth===0){closingAhead=true;break;}depth--;}}
        const reuse=balance<0&&closingAhead;
        return edit(key+(reuse?'':pairs[key]),start,end,start+1);
    }
    if(key==='Enter'&&before.state==='code'){
        const line=source.slice(source.slice(0,start).lastIndexOf('\n')+1,start);
        if(!line.trimEnd().endsWith('{'))return null;
        let depth=1,hasClose=false;
        for(const c of all.slice(end)){if(c==='{')depth++;if(c==='}'&&--depth===0){hasClose=true;break;}}
        if(!hasClose){const indent=line.match(/^[\t ]*/)[0];return edit('\n'+indent+'    '+'\n'+indent+'}',start,end,start+1+indent.length+4);}
    }
    return null;
}
