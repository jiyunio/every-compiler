class EditorHistory {
    constructor(initial, limit = 300) { this.states=[initial]; this.index=0; this.limit=limit; }
    rememberSelection(state) { if(this.states[this.index].value===state.value)this.states[this.index]=state; }
    record(state) {
        if(this.states[this.index].value===state.value)return;
        this.states.splice(this.index+1);this.states.push(state);
        if(this.states.length>this.limit)this.states.shift();
        this.index=this.states.length-1;
    }
    move(direction) {
        const next=this.index+direction;
        if(next<0||next>=this.states.length)return null;
        this.index=next;return this.states[next];
    }
}
(() => {
    const input=document.getElementById('editor');
    const snapshot=()=>({value:input.value,start:input.selectionStart,end:input.selectionEnd,direction:input.selectionDirection,top:input.scrollTop,left:input.scrollLeft});
    const history=new EditorHistory(snapshot());
    let restoring=false,composing=false,pending=0;
    const remember=()=>{if(!restoring&&!composing)history.rememberSelection(snapshot());};
    function restore(direction){
        clearTimeout(pending);
        if(composing)return;
        remember();const state=history.move(direction);if(!state)return;
        restoring=true;
        try{
            input.value=state.value;
            input.setSelectionRange(state.start,state.end,state.direction);
            input.scrollTop=state.top;input.scrollLeft=state.left;
            input.dispatchEvent(new Event('input',{bubbles:true}));
            // Close suggestions produced by restoring an old document.
            input.dispatchEvent(new Event('scroll'));
        }finally{restoring=false;}
    }
    document.addEventListener('keydown',event=>{
        if(event.target!==input)return;
        remember();
        if(event.isComposing||composing||event.altKey||!(event.ctrlKey||event.metaKey))return;
        const key=event.key.toLowerCase();
        if(key!=='z'&&key!=='y')return;
        event.preventDefault();event.stopImmediatePropagation();
        restore(key==='y'||event.shiftKey?1:-1);
    },true);
    input.addEventListener('beforeinput',event=>{
        if(event.inputType==='historyUndo'||event.inputType==='historyRedo'){
            event.preventDefault();restore(event.inputType==='historyUndo'?-1:1);
        }else remember();
    });
    input.addEventListener('input',()=>{if(!restoring&&!composing)history.record(snapshot());});
    input.addEventListener('compositionstart',()=>{remember();composing=true;});
    input.addEventListener('compositionend',()=>{composing=false;pending=setTimeout(()=>history.record(snapshot()),0);});
    document.addEventListener('selectionchange',()=>{if(document.activeElement===input)remember();});
})();
