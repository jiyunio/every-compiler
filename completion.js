// Local document-word completion; no source is sent to a service.
function completionContext(source, start, end = start) {
    if (start !== end) return null;
    const masked = source.replace(/\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|"""[\s\S]*?(?:"""|$)|"(?:\\.|[^"\\])*(?:"|$)|'(?:\\.|[^'\\])*(?:'|$)/g,
        text => text.replace(/[^\n]/g, ' '));
    const prefix = source.slice(0, start).match(/[\p{L}\p{N}_$]+$/u)?.[0];
    if (!prefix || !/^[\p{L}_$]/u.test(prefix) || masked.slice(start-prefix.length, start) !== prefix) return null;
    const from = start - prefix.length;
    const tail = source.slice(start).match(/^[\p{L}\p{N}_$]*/u)[0];
    const words = new Set();
    for (const match of masked.matchAll(/[\p{L}_$][\p{L}\p{N}_$]*/gu)) {
        if (match.index === from) continue;
        if (match[0].startsWith(prefix) && match[0] !== prefix && match[0] !== prefix + tail) words.add(match[0]);
    }
    const items = [...words].sort((a,b)=>a.length-b.length || a.localeCompare(b)).slice(0,8);
    return items.length ? {from, to:start+tail.length, items} : null;
}
(() => {
    const input = document.getElementById('editor');
    const popup = document.createElement('div');
    popup.className = 'completion-popup'; popup.id = 'completion-list';
    popup.setAttribute('role','listbox'); popup.setAttribute('aria-label','코드 자동완성'); popup.hidden=true;
    document.body.append(popup);
    input.setAttribute('aria-autocomplete','list'); input.setAttribute('aria-controls',popup.id);
    let context=null, selected=0, composing=false;
    function close(){context=null;popup.hidden=true;input.removeAttribute('aria-activedescendant');}
    function position(){
        const rect=input.getBoundingClientRect(),style=getComputedStyle(input);
        const line=input.value.slice(0,input.selectionStart).split('\n');
        const column=line.at(-1).split('').reduce((n,c)=>c==='\t'?n+4-n%4:n+1,0);
        const height=parseFloat(style.lineHeight);
        const y=rect.top+parseFloat(style.paddingTop)+(line.length-1)*height-input.scrollTop;
        const x=rect.left+parseFloat(style.paddingLeft)+column*parseFloat(style.fontSize)*.61-input.scrollLeft;
        if(y<rect.top-height||y>rect.bottom){close();return;}
        popup.style.left=Math.max(8,Math.min(x,innerWidth-popup.offsetWidth-8))+'px';
        popup.style.top=Math.max(8,Math.min(y+height+4,innerHeight-popup.offsetHeight-8))+'px';
    }
    function render(){
        popup.replaceChildren();
        context.items.forEach((word,i)=>{
            const row=document.createElement('div');row.textContent=word;row.id='completion-option-'+i;
            row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===selected));
            row.addEventListener('pointerdown',event=>{event.preventDefault();selected=i;accept();});popup.append(row);
        });
        const help=document.createElement('small');help.textContent='↑↓ 선택 · Tab 완성 · Esc 닫기';popup.append(help);
        popup.hidden=false;input.setAttribute('aria-activedescendant','completion-option-'+selected);position();
    }
    function update(){if(composing)return;context=completionContext(input.value,input.selectionStart,input.selectionEnd);selected=0;if(context)render();else close();}
    function accept(){
        if(!context)return;
        const {from,to,items}=context;
        input.setRangeText(items[selected],from,to,'end');
        input.dispatchEvent(new Event('input',{bubbles:true}));close();input.focus();
    }
    input.addEventListener('input',update);
    input.addEventListener('compositionstart',()=>{composing=true;close();});
    input.addEventListener('compositionend',()=>{composing=false;update();});
    input.addEventListener('keydown',event=>{
        if(event.isComposing||composing)return;
        if((event.ctrlKey||event.metaKey)&&event.code==='Space'){event.preventDefault();event.stopImmediatePropagation();update();return;}
        if(event.ctrlKey||event.metaKey||event.altKey){close();return;}
        if(!context)return;
        if(event.key==='Tab'&&!event.shiftKey){event.preventDefault();event.stopImmediatePropagation();accept();}
        else if(event.key==='ArrowDown'||event.key==='ArrowUp'){
            event.preventDefault();event.stopImmediatePropagation();selected=(selected+(event.key==='ArrowDown'?1:-1)+context.items.length)%context.items.length;render();
        }else if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();close();}
        else if(['Enter','ArrowLeft','ArrowRight','Home','End','Tab'].includes(event.key))close();
    },true);
    input.addEventListener('blur',close);input.addEventListener('click',close);input.addEventListener('scroll',close);
    window.addEventListener('resize',close);window.addEventListener('scroll',close,true);
})();
