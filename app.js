let isRunning = false;
let timerIntervalId = null;
let systemVoices = [];

// DOM 객체 바인딩
const dom = {
    inputSets: document.getElementById('inputSets'),
    inputReps: document.getElementById('inputReps'),
    inputInterval: document.getElementById('inputInterval'),
    inputRest: document.getElementById('inputRest'),
    circleProgress: document.getElementById('circleProgress'),
    mainStatus: document.getElementById('mainStatus'),
    subInfo: document.getElementById('subInfo'),
    btnStart: document.getElementById('btnStart'),
    btnStop: document.getElementById('btnStop')
};

const CIRCUMFERENCE = 2 * Math.PI * 90; // 565.48

// [핵심 변경] 브라우저 내장 음성 자료 로딩 체크 함수
function fetchSystemVoices() {
    if (!('speechSynthesis' in window)) {
        dom.btnStart.innerText = "TTS 미지원 브라우저";
        return;
    }

    systemVoices = window.speechSynthesis.getVoices();

    // 음성 데이터 배열이 정상적으로 채워졌는지 확인
    if (systemVoices && systemVoices.length > 0) {
        console.log("PC 음성 자료 로드 완료. 총 개수:", systemVoices.length);
        
        // 타이머가 실행 중이 아닐 때만 버튼을 활성화 상태로 전환
        if (!isRunning) {
            dom.btnStart.disabled = false;
            dom.btnStart.innerText = "루틴 시작";
            dom.mainStatus.innerText = "대기";
            dom.subInfo.innerText = "READY";
        }
    } else {
        // 아직 음성 데이터를 가져오지 못했다면 버튼을 잠그고 대기 상태 표시
        dom.btnStart.disabled = true;
        dom.btnStart.innerText = "음성 로딩 중...";
        dom.mainStatus.innerText = "로딩";
        dom.subInfo.innerText = "LOADING VOICES";
    }
}

// 1. 최초 로드 시 시도
fetchSystemVoices();

// 2. PC 브라우저가 음성 자료 준비를 마쳤을 때 발생하는 이벤트 리스너 등록 (매우 중요)
if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = fetchSystemVoices;
}

// 다국어 즉시 발음 엔진
function speakMultilingual(text, targetLangCode, isQuiet = false) {
    if (!('speechSynthesis' in window)) return;
    try {
        if (!isQuiet) window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLangCode;
        utterance.volume = isQuiet ? 0.25 : 1.0;

        if (systemVoices && systemVoices.length > 0) {
            const matchedVoice = systemVoices.find(v => 
                v.lang.toLowerCase() === targetLangCode.toLowerCase() ||
                v.lang.toLowerCase().replace('_', '-').startsWith(targetLangCode.toLowerCase().substring(0, 2))
            );
            if (matchedVoice) utterance.voice = matchedVoice;
        }
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.error("TTS 재생 에러:", e);
    }
}

function setVisualProgress(ratio) {
    if (!dom.circleProgress) return;
    const offset = CIRCUMFERENCE * (1 - ratio);
    dom.circleProgress.style.strokeDashoffset = offset;
}

// 정밀 타임 루프 제어 컨트롤러 (0.1초 순환 구조)
function startDelayCountdown(seconds, nextLangCode, onTick) {
    return new Promise((resolve, reject) => {
        let remainingMs = seconds * 1000;
        let lastLoggedSec = Math.ceil(seconds);

        if (timerIntervalId) clearInterval(timerIntervalId);

        timerIntervalId = setInterval(() => {
            if (!isRunning) {
                clearInterval(timerIntervalId);
                return reject(new Error("ABORTED"));
            }

            remainingMs -= 100;
            const currentSec = Math.ceil(remainingMs / 1000);
            
            setVisualProgress(Math.max(0, remainingMs / (seconds * 1000)));
            if (onTick) onTick(currentSec);

            if (currentSec !== lastLoggedSec && currentSec > 0 && currentSec <= 3) {
                speakMultilingual(`${currentSec}`, nextLangCode, true);
                lastLoggedSec = currentSec;
            }

            if (remainingMs <= 0) {
                clearInterval(timerIntervalId);
                resolve();
            }
        }, 100);
    });
}

async function runWorkoutRoutine() {
    isRunning = true;
    dom.btnStart.style.display = 'none';
    dom.btnStop.style.display = 'block';
    toggleInputsLock(true);

    const totalSets = parseInt(dom.inputSets.value) || 3;
    const repsPerSet = parseInt(dom.inputReps.value) || 10;
    const intervalSec = parseInt(inputInterval.value) || 3;
    const restSec = parseInt(dom.inputRest.value) || 5;

    try {
        dom.mainStatus.innerText = "준비";
        dom.subInfo.innerText = "READY";
        speakMultilingual("준비", "ko-KR");
        await startDelayCountdown(2, "ko-KR");

        for (let set = 1; set <= totalSets; set++) {
            dom.mainStatus.innerText = `${set}세트`;
            dom.subInfo.innerText = `SET ${set} / ${totalSets}`;
            speakMultilingual(`${set}세트`, "ko-KR");
            await startDelayCountdown(1.5, "ko-KR");

            for (let rep = 1; rep <= repsPerSet; rep++) {
                
                // [기본 설정] 한국어로 "1번", "2번" 명확하게 단위 처리
                let textToSpeak = `${rep}번`;
                let langCodeToUse = "ko-KR";

                // 주석(/* */)을 제거하시면 다국어 분기 테스트가 가능합니다.
                /*
                if (rep % 2 === 0) {
                    textToSpeak = `${rep}回`; // 일본어
                    langCodeToUse = "ja-JP";
                } else if (rep % 5 === 0) {
                    textToSpeak = `${rep}次`; // 중국어
                    langCodeToUse = "zh-CN";
                }
                */

                dom.mainStatus.innerText = `${rep}`;
                dom.subInfo.innerText = `SET ${set} • COUNTER ${rep}/${repsPerSet}`;
                speakMultilingual(textToSpeak, langCodeToUse);

                if (!(set === totalSets && rep === repsPerSet)) {
                    await startDelayCountdown(intervalSec, langCodeToUse);
                }
            }

            if (set < totalSets) {
                dom.mainStatus.innerText = "휴식";
                speakMultilingual("휴식", "ko-KR");
                await startDelayCountdown(restSec, "ko-KR", (sec) => {
                    dom.mainStatus.innerText = `휴식\n${sec}`;
                });
            }
        }

        dom.mainStatus.innerText = "✓";
        dom.subInfo.innerText = "치료 완료";
        speakMultilingual("치료가 완료되었습니다. 수고하셨습니다.", "ko-KR");
        setVisualProgress(1);
        shutdownRoutineUI();

    } catch (e) {
        console.log("타이머 정지");
    }
}

function stopWorkoutRoutine() {
    isRunning = false;
    if (timerIntervalId) clearInterval(timerIntervalId);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    
    dom.mainStatus.innerText = "대기";
    dom.subInfo.innerText = "READY";
    setVisualProgress(1);
    shutdownRoutineUI();
}

function shutdownRoutineUI() {
    isRunning = false;
    dom.btnStart.style.display = 'block';
    dom.btnStop.style.display = 'none';
    toggleInputsLock(false);
    fetchSystemVoices(); // 원래 준비 상태 버튼으로 즉시 복구
}

function toggleInputsLock(isLock) {
    dom.inputSets.disabled = isLock;
    dom.inputReps.disabled = isLock;
    dom.inputInterval.disabled = isLock;
    dom.inputRest.disabled = isLock;
}

// 초기 UI 바인딩 및 버튼 잠금 (음성이 들어오기 전까지 대기)
dom.circleProgress.style.strokeDasharray = CIRCUMFERENCE;
setVisualProgress(1);
dom.btnStart.disabled = true;
dom.btnStart.innerText = "음성 로딩 중...";

dom.btnStart.addEventListener('click', runWorkoutRoutine);
dom.btnStop.addEventListener('click', stopWorkoutRoutine);