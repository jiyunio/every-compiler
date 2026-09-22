const $ = id => document.getElementById(id);
const DEFAULT_CODE = `import java.util.*;
import java.lang.*;
import java.io.*;

class Main {
    public static void main(String[] args) {
        System.out.println("Hello world!");
    }
}
`;
const files = new Map([['Main.java', DEFAULT_CODE]]);
let active = 'Main.java', busy = false;
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
function renderFiles(){
    $('files').replaceChildren();
    for(const name of files.keys()){
        const b=document.createElement('button'); b.className='file-button'+(name===active?' active':'');b.setAttribute('aria-pressed',String(name===active));
        const icon=document.createElement('span');icon.className='java-icon';icon.textContent='J';
        const label=document.createElement('span');label.textContent=name;b.append(icon,label);
        b.onclick=()=>{files.set(active,editor.value);active=name;editor.value=files.get(name);$('active-name').textContent=name;editor.scrollTop=editor.scrollLeft=0;renderFiles();paint();editor.focus();};
        $('files').append(b);
    }
    $('file-count').textContent=files.size;
}
editor.addEventListener('input',()=>{files.set(active,editor.value);paint();});
editor.addEventListener('scroll',syncScroll);editor.addEventListener('click',cursor);editor.addEventListener('keyup',cursor);
editor.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const p=editor.selectionStart;editor.setRangeText('    ',p,editor.selectionEnd,'end');editor.dispatchEvent(new Event('input'));}});
let theme='light';try{theme=localStorage.getItem('java-studio-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}catch{}
function setTheme(){document.documentElement.dataset.theme=theme;$('theme').textContent=theme==='dark'?'☀':'☾';$('theme').setAttribute('aria-label',theme==='dark'?'라이트 모드로 전환':'다크 모드로 전환');}
$('theme').onclick=()=>{theme=theme==='dark'?'light':'dark';setTheme();try{localStorage.setItem('java-studio-theme',theme);}catch{}};setTheme();
$('focus').onclick=()=>{const on=workspace.classList.toggle('focused');$('focus').setAttribute('aria-pressed',String(on));$('focus').querySelector('span').textContent=on?'집중 모드 종료':'집중 모드';};
function togglePanel(which){
    if(which==='files'&&innerWidth<=900){workspace.classList.toggle('files-mobile-open');return;}
    const closed=workspace.classList.toggle(which+'-collapsed');const b=$(which+'-toggle');b.setAttribute('aria-expanded',String(!closed));b.textContent=which==='files'?(closed?'›':'‹'):(closed?'‹':'›');b.setAttribute('aria-label',(which==='files'?'파일':'입출력')+' 창 '+(closed?'펼치기':'접기'));
}
$('files-toggle').onclick=()=>togglePanel('files');$('io-toggle').onclick=()=>togglePanel('io');
$('input-toggle').onclick=()=>{const hidden=!$('input-body').hidden;$('input-body').hidden=hidden;$('input-toggle').textContent=hidden?'＋':'−';$('input-toggle').setAttribute('aria-expanded',String(!hidden));$('input-toggle').setAttribute('aria-label',hidden?'입력 창 펼치기':'입력 창 접기');};
function openDialog(){$('filename').value='';$('file-error').textContent='';$('file-dialog').showModal();$('filename').focus();}
$('add').onclick=$('add-secondary').onclick=openDialog;$('cancel').onclick=()=>$('file-dialog').close();
$('file-form').onsubmit=e=>{e.preventDefault();let name=$('filename').value.trim();if(!name.endsWith('.java'))name+='.java';if(!/^[A-Za-z_$][\w$]*\.java$/.test(name)){$('file-error').textContent='영문으로 시작하는 Java 파일 이름을 입력하세요.';return;}if(files.has(name)){$('file-error').textContent='같은 이름의 파일이 이미 있습니다.';return;}files.set(active,editor.value);files.set(name,`class ${name.slice(0,-5)} {\n    \n}\n`);active=name;editor.value=files.get(name);$('active-name').textContent=name;renderFiles();paint();$('file-dialog').close();editor.focus();};
function width(value){const max=Math.max(240,Math.min(600,workspace.clientWidth-420));value=Math.max(240,Math.min(max,value));document.documentElement.style.setProperty('--io-width',value+'px');$('splitter').setAttribute('aria-valuenow',Math.round(value));$('splitter').setAttribute('aria-valuemax',max);}
$('splitter').addEventListener('pointerdown',e=>{e.preventDefault();$('splitter').setPointerCapture(e.pointerId);});
$('splitter').addEventListener('pointermove',e=>{if($('splitter').hasPointerCapture(e.pointerId))width(workspace.getBoundingClientRect().right-e.clientX);});
$('splitter').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();width(e.key==='Home'?240:e.key==='End'?600:Number($('splitter').getAttribute('aria-valuenow'))+(e.key==='ArrowLeft'?20:-20));}});
$('clear').onclick=()=>{if(busy)return;$('output').textContent='';$('output').hidden=true;$('output-empty').hidden=false;$('run-status').textContent='준비됨';$('run-status').className='run-status';};
async function run(){
    if(busy)return;busy=true;files.set(active,editor.value);const snapshot=new Map(files),stdin=$('stdin').value;
    $('run').disabled=true;$('clear').disabled=true;$('run').querySelector('span').textContent='실행 중';
    if(workspace.classList.contains('io-collapsed'))togglePanel('io');if(workspace.classList.contains('focused'))$('focus').click();
    $('output-empty').hidden=true;$('output').hidden=false;$('output').textContent='Java 컴파일러에 연결하고 있습니다…';$('run-status').textContent='컴파일 및 실행 중';$('run-status').className='run-status';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000),start=performance.now();
    try{
        const response=await fetch('https://wandbox.org/api/list.json',{signal:controller.signal});if(!response.ok)throw Error(`컴파일러 목록 요청 실패 (HTTP ${response.status})`);
        const compilers=await response.json();const java=compilers.filter(c=>c.language==='Java');
        java.sort((a,b)=>(parseInt(b.version)||0)-(parseInt(a.version)||0));const compiler=java.find(c=>!c.name.includes('head'))||java[0];if(!compiler)throw Error('현재 Java 컴파일러를 사용할 수 없습니다.');
        const body={compiler:compiler.name,code:snapshot.get('Main.java'),codes:[...snapshot].filter(([name])=>name!=='Main.java').map(([file,code])=>({file,code})),stdin,save:false};
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
editor.value=DEFAULT_CODE;renderFiles();paint();
