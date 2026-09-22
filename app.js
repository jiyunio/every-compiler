const $ = id => document.getElementById(id);
const DEFAULT_CODE = `import java.util.*;
import java.lang.*;
import java.io.*;

class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());
        StringBuilder sb = new StringBuilder();
        
        System.out.println("Hello world!");
    }
}
`;

let busy = false;
const editor = $('editor'), workspace = $('workspace');
const escapeHTML = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function paint() {
    const source = editor.value;
    const token = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:import|class|public|private|protected|static|void|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|extends|implements|interface|enum|final|abstract|int|long|double|float|boolean|char|byte|short|true|false|null|package|this|super|var)\b|\b\d+(?:\.\d+)?\b)/g;
    let html = '', last = 0;
    for (const match of source.matchAll(token)) {
        html += escapeHTML(source.slice(last, match.index));
        const t=match[0], cls=t.startsWith('/')?'comment':/^["']/.test(t)?'str':/^\d/.test(t)?'num':'kw';
        html += `<span class="${cls}">${escapeHTML(t)}</span>`; last=match.index+t.length;
    }
    $('highlight').innerHTML = html + escapeHTML(source.slice(last)) + '\n';
    $('lines').textContent = Array.from({length:source.split('\n').length},(_,i)=>i+1).join('\n');
    syncScroll(); cursor();
}
function syncScroll(){ $('highlight').scrollTop=editor.scrollTop; $('highlight').scrollLeft=editor.scrollLeft; $('lines').scrollTop=editor.scrollTop; }
function cursor(){const before=editor.value.slice(0,editor.selectionStart).split('\n');$('cursor').textContent=`Ln ${before.length}, Col ${before.at(-1).length+1}`;}
editor.addEventListener('input',paint);
editor.addEventListener('scroll',syncScroll);editor.addEventListener('click',cursor);editor.addEventListener('keyup',cursor);
function newlineEdit(source, start, end) {
    const lineStart = source.slice(0, start).lastIndexOf('\n') + 1;
    const before = source.slice(lineStart, start);
    const indent = before.match(/^[\t ]*/)[0];
    // Ignore braces inside Java strings and comments when opening a block.
    const codeBefore = source.slice(0, start).replace(/\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '');
    const opensBlock = before.trim().length > 0 && codeBefore.trimEnd().endsWith('{');
    const nextIndent = indent + (opensBlock ? '    ' : '');
    const after = source.slice(end);
    const closing = opensBlock ? after.match(/^[\t ]*\}/) : null;
    const text = '\n' + nextIndent + (closing ? '\n' + indent : '');
    return {text, end: end + (closing ? closing[0].length - 1 : 0), caret: start + 1 + nextIndent.length};
}
editor.addEventListener('keydown', e => {
    if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    const smart = smartEdit(editor.value, editor.selectionStart, editor.selectionEnd, e.key, e.shiftKey);
    if (smart) {
        e.preventDefault();
        editor.setRangeText(smart.text, smart.from, smart.to, 'end');
        editor.setSelectionRange(smart.caret, smart.selectionEnd);
        editor.dispatchEvent(new Event('input'));
        return;
    }
    if (e.key === 'Tab') {
        e.preventDefault();
        editor.setRangeText('    ', editor.selectionStart, editor.selectionEnd, 'end');
        editor.dispatchEvent(new Event('input'));
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const edit = newlineEdit(editor.value, editor.selectionStart, editor.selectionEnd);
        editor.setRangeText(edit.text, editor.selectionStart, edit.end, 'end');
        editor.setSelectionRange(edit.caret, edit.caret);
        editor.dispatchEvent(new Event('input'));
        const caretLine = editor.value.slice(0, edit.caret).split('\n').length - 1;
        const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
        const top = caretLine * lineHeight;
        if (top + lineHeight > editor.scrollTop + editor.clientHeight) editor.scrollTop = top + lineHeight - editor.clientHeight;
        else if (top < editor.scrollTop) editor.scrollTop = top;
        syncScroll();
    }
});
let theme='light';try{theme=localStorage.getItem('java-studio-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}catch{}
function setTheme(){document.documentElement.dataset.theme=theme;$('theme').textContent=theme==='dark'?'☀':'☾';$('theme').setAttribute('aria-label',theme==='dark'?'라이트 모드로 전환':'다크 모드로 전환');}
$('theme').onclick=()=>{theme=theme==='dark'?'light':'dark';setTheme();try{localStorage.setItem('java-studio-theme',theme);}catch{}};setTheme();
$('focus').onclick=()=>{const on=workspace.classList.toggle('focused');$('focus').setAttribute('aria-pressed',String(on));$('focus').querySelector('span').textContent=on?'집중 모드 종료':'집중 모드';};
function togglePanel(){
    const closed=workspace.classList.toggle('io-collapsed');
    const button=$('io-toggle');
    button.setAttribute('aria-expanded',String(!closed));
    button.textContent=closed?'‹':'›';
    button.title=closed?'입출력 창 펼치기':'입출력 창 접기';
    button.setAttribute('aria-label',button.title);
}
$('io-toggle').onclick=togglePanel;$('input-toggle').onclick=()=>{const hidden=!$('input-body').hidden;$('input-body').hidden=hidden;$('input-toggle').textContent=hidden?'＋':'−';$('input-toggle').setAttribute('aria-expanded',String(!hidden));$('input-toggle').setAttribute('aria-label',hidden?'입력 창 펼치기':'입력 창 접기');};
function width(value){const max=Math.max(240,Math.min(600,workspace.clientWidth-420));value=Math.max(240,Math.min(max,value));document.documentElement.style.setProperty('--io-width',value+'px');$('splitter').setAttribute('aria-valuenow',Math.round(value));$('splitter').setAttribute('aria-valuemax',max);}
$('splitter').addEventListener('pointerdown',e=>{e.preventDefault();$('splitter').setPointerCapture(e.pointerId);});
$('splitter').addEventListener('pointermove',e=>{if($('splitter').hasPointerCapture(e.pointerId))width(workspace.getBoundingClientRect().right-e.clientX);});
$('splitter').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();width(e.key==='Home'?240:e.key==='End'?600:Number($('splitter').getAttribute('aria-valuenow'))+(e.key==='ArrowLeft'?20:-20));}});
$('clear').onclick=()=>{if(busy)return;$('output').textContent='';$('output').hidden=true;$('output-empty').hidden=false;$('run-status').textContent='준비됨';$('run-status').className='run-status';};
async function run(){
    if(busy)return;
    const source=editor.value,stdin=$('stdin').value;
    busy=true;
    $('run').disabled=true;$('clear').disabled=true;$('run').querySelector('span').textContent='실행 중';
    if(workspace.classList.contains('io-collapsed'))togglePanel('io');if(workspace.classList.contains('focused'))$('focus').click();
    $('output-empty').hidden=true;$('output').hidden=false;$('output').textContent='Java 컴파일러에 연결하고 있습니다…';$('run-status').textContent='컴파일 및 실행 중';$('run-status').className='run-status';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000),start=performance.now();
    try{
        const response=await fetch('https://wandbox.org/api/list.json',{signal:controller.signal});if(!response.ok)throw Error(`컴파일러 목록 요청 실패 (HTTP ${response.status})`);
        const compilers=await response.json();const java=compilers.filter(c=>c.language==='Java');
        java.sort((a,b)=>(parseInt(b.version)||0)-(parseInt(a.version)||0));const compiler=java.find(c=>!c.name.includes('head'))||java[0];if(!compiler)throw Error('현재 Java 컴파일러를 사용할 수 없습니다.');
        const body={compiler:compiler.name,code:source,codes:[],stdin,save:false};
        const result=await fetch('https://wandbox.org/api/compile.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
        if(!result.ok)throw Error(`실행 요청 실패 (HTTP ${result.status})`);const data=await result.json();
        if(data.error)throw Error(String(data.error));
        const compilerText=data.compiler_message||[data.compiler_output,data.compiler_error].filter(Boolean).join('\n');
        const programText=data.program_message||[data.program_output,data.program_error].filter(Boolean).join('\n');
        if(data.status===undefined&&!compilerText&&!programText)throw Error('실행 서비스가 올바른 결과를 반환하지 않았습니다.');
        $('output').textContent=[compilerText,programText].filter(Boolean).join('\n')||'(출력 없음)';
        const success=String(data.status)==='0'&&!data.signal;
        $('run-status').textContent=`${success?'실행 완료':'실행 오류'} · ${((performance.now()-start)/1000).toFixed(1)}초 · ${data.signal||'종료 코드 '+data.status}`;
        $('run-status').classList.toggle('error',!success);
    }catch(error){$('output').textContent=error.name==='AbortError'?'실행 요청 시간이 초과되었습니다. 잠시 후 다시 실행해 주세요.':`${error.message}\n\n실행 서비스에 연결하지 못했거나 요청이 실패했습니다. 인터넷 연결과 Wandbox 서비스 상태를 확인해 주세요.\n작성한 코드는 그대로 유지됩니다.`;$('run-status').textContent='실행 실패';$('run-status').classList.add('error');}
    finally{clearTimeout(timer);busy=false;$('run').disabled=false;$('clear').disabled=false;$('run').querySelector('span').textContent='실행';}
}
$('run').onclick=run;document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run();}if(e.key==='Escape'&&workspace.classList.contains('focused'))$('focus').click();});
editor.value=DEFAULT_CODE;paint();
