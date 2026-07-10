const languages = {
    ko: { 
        title: "재활 보이스 타이머", start: "시작", stop: "정지", ready: "준비", set: "세트", count: "번", rest: "휴식", done: "치료 완료", langCode: "ko-KR",
        lblSets: "목표 세트 수", lblReps: "세트당 횟수", lblInterval: "카운트 간격 (초)", lblRest: "세트 간 휴식 (초)"
    },
    ja: { 
        title: "リハビリ音声タイマー", start: "スタート", stop: "ストップ", ready: "準備", set: "セット", count: "回", rest: "休憩", done: "お疲れ様でした", langCode: "ja-JP",
        lblSets: "目標セット数", lblReps: "1セットの回数", lblInterval: "カウント間隔 (秒)", lblRest: "セット間の休憩 (秒)"
    },
    en: { 
        title: "Rehab Voice Timer", start: "Start", stop: "Stop", ready: "Ready", set: "Set", count: "Times", rest: "Rest", done: "Workout Done", langCode: "en-US",
        lblSets: "Total Sets", lblReps: "Reps per Set", lblInterval: "Interval (sec)", lblRest: "Rest between Sets (sec)"
    },
    zh: { 
        title: "康复语音计时器", start: "开始", stop: "停止", ready: "准备", set: "组", count: "次", rest: "休息", done: "恢复 结束", langCode: "zh-CN",
        lblSets: "总组数", lblReps: "每组次数", lblInterval: "计数间隔 (秒)", lblRest: "组间休息 (秒)"
    }
};

const userLang = navigator.language.substring(0, 2);
const currentLang = languages[userLang] ? userLang : 'en';
const t = languages[currentLang];

let isRunning = false;
let globalAbortController = null;

// DOM 바인딩
document.getElementById('title').innerText = t.title;
document.getElementById('lblSets').innerText = t.lblSets;
document.getElementById('lblReps').innerText = t.lblReps;
document.getElementById('lblInterval').innerText = t.lblInterval;
document.getElementById('lblRest').innerText = t.lblRest;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');
const infoDiv = document.getElementById('info');
const progressCircle = document.getElementById('progressCircle');

const inputSets = document.getElementById('inputSets');
const inputReps = document.getElementById('inputReps');
const inputInterval = document.getElementById('inputInterval');
const inputRest = document.getElementById('inputRest');

startBtn.innerText = t.start;
stopBtn.innerText = t.stop;

const CIRCUMFERENCE = 2 * Math.PI * 70;
progressCircle.style.strokeDasharray = CIRCUMFERENCE;
setCircleProgress(1);

// 음성 출력 함수
function speak(text, isQuiet = false) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = t.langCode;
        utterance.volume = isQuiet ? 0.3 : 1.0; 
        if (!isQuiet) window.speechSynthesis.cancel(); 
        window.speechSynthesis.speak(utterance);
    }
}

// 원형 게이지 업데이트
function setCircleProgress(ratio) {
    const offset = CIRCUMFERENCE * (1 - ratio);
    progressCircle.style.strokeDashoffset = offset;
}

// 초 단위 실시간 카운트다운 및 시각 시계 업데이트
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
}

async function startRoutine() {
    isRunning = true;
    globalAbortController = new AbortController();
    const signal = globalAbortController.signal;

    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    setInputsDisabled(true);
    
    const totalSets = parseInt(inputSets.value) || 3;
    const repsPerSet = parseInt(inputReps.value) || 10;
    const intervalSec = parseInt(inputInterval.value) || 3;
    const restSec = parseInt(inputRest.value) || 5;

    try {
        // 준비 단계
        statusDiv.innerText = t.ready;
        speak(t.ready);
        await waitSeconds(2, signal);

        for (let set = 1; set <= totalSets; set++) {
            if (!isRunning) return;

            // [추가] 새로운 세트가 시작될 때 화면 안내 및 "1 세트", "2 세트" 음성 출력
            statusDiv.innerText = `${set} ${t.set}`;
            infoDiv.innerText = `${t.set} ${set} / ${totalSets}`;
            speak(`${set}${t.set}`); 
            
            // 세트 이름을 말한 후 운동을 시작하기 전 잠깐의 여유(1.5초)를 줍니다.
            await waitSeconds(1.5, signal);

            for (let rep = 1; rep <= repsPerSet; rep++) {
                if (!isRunning) return;

                // 횟수 화면 업데이트 및 음성 출력 ("1 번", "2 번" ...)
                statusDiv.innerText = `${rep}`;
                infoDiv.innerText = `${t.set} ${set} / ${totalSets}`;
                speak(`${rep}${t.count}`);
                
                // 설정된 초(Interval) 만큼 대기 (마지막 세트의 마지막 횟수가 아니면 대기)
                if (!(set === totalSets && rep === repsPerSet)) {
                    await waitSeconds(intervalSec, signal);
                }
            }
            
            // 세트 사이 휴식
            if (set < totalSets) {
                if (!isRunning) return;
                statusDiv.innerText = t.rest;
                speak(t.rest);
                await waitSeconds(restSec, signal, (sec) => {
                    statusDiv.innerText = `${t.rest}\n(${sec})`;
                });
            }
        }
        
        // 완료
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
    if (globalAbortController) {
        globalAbortController.abort();
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    resetUI();
    statusDiv.innerText = "-";
    infoDiv.innerText = "";
    setCircleProgress(1);
}

function resetUI() {
    isRunning = false;
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    setInputsDisabled(false);
}

startBtn.addEventListener('click', startRoutine);
stopBtn.addEventListener('click', stopRoutine);