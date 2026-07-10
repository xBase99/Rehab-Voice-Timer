const languages = {
    ko: { 
        title: "재활 보이스 타이머", start: "시작", stop: "정지", ready: "준비", set: "세트", count: "번", rest: "휴식", done: "치료 완료", langCode: "ko-KR", icon: "🇰🇷",
        lblSets: "목표 세트 수", lblReps: "세트당 횟수", lblInterval: "카운트 간격 (초)", lblRest: "세트 간 휴식 (초)"
    },
    ja: { 
        title: "リハビリ音声タイマー", start: "スタート", stop: "ストップ", ready: "準備", set: "セット", count: "回", rest: "休憩", done: "お疲れ様でした", langCode: "ja-JP", icon: "🇯🇵",
        lblSets: "目標セット数", lblReps: "1セットの回数", lblInterval: "カウント間隔 (秒)", lblRest: "セット間の休憩 (秒)"
    },
    en: { 
        title: "Rehab Voice Timer", start: "Start", stop: "Stop", ready: "Ready", set: "Set", count: "Times", rest: "Rest", done: "Workout Done", langCode: "en-US", icon: "🇺🇸",
        lblSets: "Total Sets", lblReps: "Reps per Set", lblInterval: "Interval (sec)", lblRest: "Rest between Sets (sec)"
    },
    "zh-CN": { 
        title: "康复语音计时器", start: "开始", stop: "停止", ready: "准备", set: "组", count: "次", rest: "休息", done: "恢复 结束", langCode: "zh-CN", icon: "🇨🇳",
        lblSets: "总组数", lblReps: "每组次数", lblInterval: "计数间隔 (秒)", lblRest: "组间休息 (秒)"
    },
    "zh-HK": { 
        title: "康復語音計時器", start: "開始", stop: "停止", ready: "準備", set: "組", count: "次", rest: "休息", done: "康復 結束", langCode: "zh-HK", icon: "🇭🇰",
        lblSets: "總組數", lblReps: "每組次數", lblInterval: "計數間隔 (秒)", lblRest: "組間休息 (秒)"
    }
};

// 기본 기기 언어 감지 및 세팅
const systemLang = navigator.language.substring(0, 2);
let currentLangCode = 'en';
if (systemLang === 'ko') currentLangCode = 'ko';
else if (systemLang === 'ja') currentLangCode = 'ja';
else if (navigator.language === 'zh-HK' || navigator.language === 'zh-TW') currentLangCode = 'zh-HK';
else if (systemLang === 'zh') currentLangCode = 'zh-CN';

let isRunning = false;
let globalAbortController = null;
let systemVoices = []; 

// DOM 요소 바인딩
const langSelect = document.getElementById('langSelect');
const langIcon = document.getElementById('langIcon');
const titleEl = document.getElementById('title');
const lblSetsEl = document.getElementById('lblSets');
const lblRepsEl = document.getElementById('lblReps');
const lblIntervalEl = document.getElementById('lblInterval');
const lblRestEl = document.getElementById('lblRest');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');
const infoDiv = document.getElementById('info');
const progressCircle = document.getElementById('progressCircle');

const inputSets = document.getElementById('inputSets');
const inputReps = document.getElementById('inputReps');
const inputInterval = document.getElementById('inputInterval');
const inputRest = document.getElementById('inputRest');

const CIRCUMFERENCE = 2 * Math.PI * 70;
progressCircle.style.strokeDasharray = CIRCUMFERENCE;

// 목소리 목록 로드 함수 보완
function loadVoices() {
    if ('speechSynthesis' in window) {
        systemVoices = window.speechSynthesis.getVoices();
    }
}

// 최초 로드 및 크롬/파이어폭스 비동기 이벤트 리스너 등록
loadVoices();
if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function updateLanguageUI() {
    const t = languages[currentLangCode];
    langSelect.value = currentLangCode;
    langIcon.innerText = t.icon;
    titleEl.innerText = t.title;
    lblSetsEl.innerText = t.lblSets;
    lblRepsEl.innerText = t.lblReps;
    lblIntervalEl.innerText = t.lblInterval;
    lblRestEl.innerText = t.lblRest;
    
    if (!isRunning) {
        startBtn.innerText = t.start;
        stopBtn.innerText = t.stop;
    }
}

langSelect.addEventListener('change', (e) => {
    currentLangCode = e.target.value;
    updateLanguageUI();
});

// 음성 출력 로직 보완 (내장 데이터가 없더라도 시스템 기본음으로 나오게끔 예외처리 추가)
function speak(text, isQuiet = false) {
    if ('speechSynthesis' in window) {
        // 모바일 브라우저 뻗음 방지를 위해 기존 음성 취소 처리를 상단으로 이동
        if (!isQuiet) window.speechSynthesis.cancel(); 

        const t = languages[currentLangCode];
        const utterance = new SpeechSynthesisUtterance(text);
        
        // 내장 목소리가 로드되었는지 확인 후 매칭
        if (systemVoices && systemVoices.length > 0) {
            const matchingVoice = systemVoices.find(voice => 
                voice.lang.toLowerCase() === t.langCode.toLowerCase() || 
                voice.lang.toLowerCase().replace('_', '-').startsWith(t.langCode.toLowerCase().substring(0, 2))
            );
            if (matchingVoice) {
                utterance.voice = matchingVoice;
            }
        }
        
        utterance.lang = t.langCode;
        utterance.volume = isQuiet ? 0.3 : 1.0; 
        
        window.speechSynthesis.speak(utterance);
    }
}

function setCircleProgress(ratio) {
    const offset = CIRCUMFERENCE * (1 - ratio);
    progressCircle.style.strokeDashoffset = offset;
}

function waitSeconds(seconds, signal, updateUIFn) {
    return new Promise((resolve, reject) => {
        let remainingMs = seconds * 1000;
        const intervalMs = 100; 
        let lastLoggedSecond = Math.ceil(seconds);

        if (signal.aborted) return reject(new Error("aborted"));

        const timer = setInterval(() => {
            if (signal.aborted) {
                clearInterval(timer);
                return reject(new Error("aborted"));
            }

            remainingMs -= intervalMs;
            const currentSecond = Math.ceil(remainingMs / 1000);
            const ratio = Math.max(0, remainingMs / (seconds * 1000));
            setCircleProgress(ratio);

            if (updateUIFn) updateUIFn(currentSecond);

            if (currentSecond !== lastLoggedSecond && currentSecond > 0 && currentSecond <= 3) {
                speak(`${currentSecond}`, true);
                lastLoggedSecond = currentSecond;
            }

            if (remainingMs <= 0) {
                clearInterval(timer);
                resolve();
            }
        }, intervalMs);

        signal.addEventListener('abort', () => {
            clearInterval(timer);
            reject(new Error("aborted"));
        });
    });
}

function setInputsDisabled(disabled) {
    inputSets.disabled = disabled;
    inputReps.disabled = disabled;
    inputInterval.disabled = disabled;
    inputRest.disabled = disabled;
    langSelect.disabled = disabled;
}

async function startRoutine() {
    isRunning = true;
    globalAbortController = new AbortController();
    const signal = globalAbortController.signal;

    // 혹시 처음에 목소리 로드가 덜 되었을 경우를 대비해 시작 시 한 번 더 로드 시도
    if (systemVoices.length === 0) loadVoices();

    const t = languages[currentLangCode];
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    setInputsDisabled(true);
    
    const totalSets = parseInt(inputSets.value) || 3;
    const repsPerSet = parseInt(inputReps.value) || 10;
    const intervalSec = parseInt(inputInterval.value) || 3;
    const restSec = parseInt(inputRest.value) || 5;

    try {
        statusDiv.innerText = t.ready;
        speak(t.ready);
        await waitSeconds(2, signal);

        for (let set = 1; set <= totalSets; set++) {
            if (signal.aborted) return;

            statusDiv.innerText = `${set} ${t.set}`;
            infoDiv.innerText = `${t.set} ${set} / ${totalSets}`;
            speak(`${set}${t.set}`); 
            await waitSeconds(1.5, signal);

            for (let rep = 1; rep <= repsPerSet; rep++) {
                if (!isRunning || signal.aborted) return;

                statusDiv.innerText = `${rep}`;
                infoDiv.innerText = `${t.set} ${set} / ${totalSets}`;
                speak(`${rep}${t.count}`);
                
                if (!(set === totalSets && rep === repsPerSet)) {
                    await waitSeconds(intervalSec, signal);
                }
            }
            
            if (set < totalSets) {
                if (!isRunning || signal.aborted) return;
                statusDiv.innerText = t.rest;
                speak(t.rest);
                await waitSeconds(restSec, signal, (sec) => {
                    statusDiv.innerText = `${t.rest}\n(${sec})`;
                });
            }
        }
        
        statusDiv.innerText = "✓";
        infoDiv.innerText = t.done;
        speak(t.done);
        setCircleProgress(1);
        resetUI();

    } catch (error) {
        console.log("Timer stopped or aborted.");
    }
}

function stopRoutine() {
    isRunning = false;
    if (globalAbortController) globalAbortController.abort();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    resetUI();
    statusDiv.innerText = "-";
    infoDiv.innerText = "";
    setCircleProgress(1);
}

function resetUI() {
    isRunning = false;
    const t = languages[currentLangCode];
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    startBtn.innerText = t.start;
    stopBtn.innerText = t.stop;
    setInputsDisabled(false);
}

// 초기 UI 로드 및 예외 처리
updateLanguageUI();
setCircleProgress(1);