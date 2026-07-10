// 1. 다국어 번역 데이터 및 설정 (광고 제거 및 입력 라벨 추가)
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

// 시스템 언어 감지 (지원 안 하면 영어 'en' 기본값)
const userLang = navigator.language.substring(0, 2);
const currentLang = languages[userLang] ? userLang : 'en';
const t = languages[currentLang];

// 타이머 상태 제어 변수
let isRunning = false;
let timeoutId = null;

// DOM 요소 바인딩 및 다국어 적용
document.getElementById('title').innerText = t.title;
document.getElementById('lblSets').innerText = t.lblSets;
document.getElementById('lblReps').innerText = t.lblReps;
document.getElementById('lblInterval').innerText = t.lblInterval;
document.getElementById('lblRest').innerText = t.lblRest;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');
const infoDiv = document.getElementById('info');

const inputSets = document.getElementById('inputSets');
const inputReps = document.getElementById('inputReps');
const inputInterval = document.getElementById('inputInterval');
const inputRest = document.getElementById('inputRest');

startBtn.innerText = t.start;
stopBtn.innerText = t.stop;

// 음성(TTS) 출력 함수
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = t.langCode;
        window.speechSynthesis.speak(utterance);
    }
}

// 비동기 지연 함수 (정지 버튼 클릭 시 타이머가 즉시 깨어나도록 수정)
function delay(ms) {
    return new Promise((resolve, reject) => {
        if (!isRunning) {
            reject(new Error("Stopped"));
            return;
        }
        timeoutId = setTimeout(() => {
            timeoutId = null;
            resolve();
        }, ms);
    });
}

// 타이머 작동 중 입력 칸 잠금 함수
function setInputsDisabled(disabled) {
    inputSets.disabled = disabled;
    inputReps.disabled = disabled;
    inputInterval.disabled = disabled;
    inputRest.disabled = disabled;
}

// 타이머 핵심 로직
async function startRoutine() {
    isRunning = true;
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    setInputsDisabled(true);
    
    // 사용자가 화면에 입력한 값을 실시간으로 읽어옴
    const totalSets = parseInt(inputSets.value) || 3;
    const repsPerSet = parseInt(inputReps.value) || 10;
    const intervalSec = parseInt(inputInterval.value) || 3;
    const restSec = parseInt(inputRest.value) || 5;

    try {
        // 준비 단계
        statusDiv.innerText = t.ready;
        speak(t.ready);
        await delay(2000);

        for (let set = 1; set <= totalSets; set++) {
            for (let rep = 1; rep <= repsPerSet; rep++) {
                if (!isRunning) return;

                // 화면 업데이트
                statusDiv.innerText = `${rep}`;
                infoDiv.innerText = `${t.set} ${set} / ${totalSets}`;
                
                // 숫자 음성 출력
                speak(`${rep}`);
                
                // 간격만큼 대기 (마지막 세트의 마지막 횟수가 아니면 설정된 초만큼 대기)
                if (!(set === totalSets && rep === repsPerSet)) {
                    await delay(intervalSec * 1000);
                }
            }
            
            // 세트 사이 휴식 시간
            if (set < totalSets) {
                if (!isRunning) return;
                statusDiv.innerText = t.rest;
                speak(t.rest);
                await delay(restSec * 1000);
            }
        }
        
        // 완료
        statusDiv.innerText = "✓";
        infoDiv.innerText = t.done;
        speak(t.done);
        resetUI();

    } catch (error) {
        console.log("Timer stopped by user.");
    }
}

// 타이머 강제 정지 로직
function stopRoutine() {
    isRunning = false;
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    resetUI();
    statusDiv.innerText = "-";
    infoDiv.innerText = "";
}

function resetUI() {
    isRunning = false;
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    setInputsDisabled(false);
}

startBtn.addEventListener('click', startRoutine);
stopBtn.addEventListener('click', stopRoutine);