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

// 시스템 목소리 로드 안전벨트
function fetchSystemVoices() {
    if ('speechSynthesis' in window) {
        systemVoices = window.speechSynthesis.getVoices();
    }
}
fetchSystemVoices();
if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = fetchSystemVoices;
}

// [핵심 기능] 언어 설정이 없어도 특정 국가 코드를 주입하면 기기에서 즉시 해당 목소리를 매칭해 내는 로직
function speakMultilingual(text, targetLangCode, isQuiet = false) {
    if (!('speechSynthesis' in window)) return;
    try {
        if (!isQuiet) window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLangCode;
        utterance.volume = isQuiet ? 0.25 : 1.0;

        // 시스템 목소리 배열 내에서 매칭되는 언어 가로채기 적용
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

            // 다음 운동 시작 3초 전 카운트다운은 다음 운동을 진행할 국가의 언어로 자동 나지막하게 알림
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
    const intervalSec = parseInt(dom.inputInterval.value) || 3;
    const restSec = parseInt(dom.inputRest.value) || 5;

    try {
        // 1. 준비 단계 (한국어로 실행)
        dom.mainStatus.innerText = "준비";
        dom.subInfo.innerText = "READY";
        speakMultilingual("준비", "ko-KR");
        await startDelayCountdown(2, "ko-KR");

        // 메인 운동 루틴 가동
        for (let set = 1; set <= totalSets; set++) {
            
            // 세트 시작 브리핑 ("1세트", "2세트" 안내)
            dom.mainStatus.innerText = `${set}세트`;
            dom.subInfo.innerText = `SET ${set} / ${totalSets}`;
            speakMultilingual(`${set}세트`, "ko-KR");
            await startDelayCountdown(1.5, "ko-KR");

            for (let rep = 1; rep <= repsPerSet; rep++) {
                
                // [원하시는 대로 다국어 자동 배치 영역]
                // 기본 한국어 발음 "1번", "2번" 처리
                let textToSpeak = `${rep}번`;
                let langCodeToUse = "ko-KR";

                // 예시 커스텀 배치: 만약 운동 도중 기분 전환이나 테스트를 위해 
                // 짝수 번호는 일본어로, 5의 배수는 중국어로 나오게 원하신다면 아래처럼 마음껏 분기가 가능합니다.
                // 현재는 기본적으로 안전하게 한국어로 또박또박 단위를 붙여서 Two 오인을 완벽 제거했습니다.
                /*
                if (rep % 2 === 0) {
                    textToSpeak = `${rep}回`; // 일본어 "이 카이", "욘 카이"
                    langCodeToUse = "ja-JP";
                } else if (rep % 5 === 0) {
                    textToSpeak = `${rep}次`; // 중국어 보통화 "우 츠"
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

            // 세트 종료 후 휴식 시간 전환
            if (set < totalSets) {
                dom.mainStatus.innerText = "휴식";
                speakMultilingual("휴식", "ko-KR");
                await startDelayCountdown(restSec, "ko-KR", (sec) => {
                    dom.mainStatus.innerText = `휴식\n${sec}`;
                });
            }
        }

        // 전체 완료 성공
        dom.mainStatus.innerText = "✓";
        dom.subInfo.innerText = "치료 완료";
        speakMultilingual("치료가 완료되었습니다. 수고하셨습니다.", "ko-KR");
        setVisualProgress(1);
        shutdownRoutineUI();

    } catch (e) {
        console.log("타이머가 사용자에 의해 강제 정지되었습니다.");
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
}

function toggleInputsLock(isLock) {
    dom.inputSets.disabled = isLock;
    dom.inputReps.disabled = isLock;
    dom.inputInterval.disabled = isLock;
    dom.inputRest.disabled = isLock;
}

// 초기화
dom.circleProgress.style.strokeDasharray = CIRCUMFERENCE;
setVisualProgress(1);
dom.btnStart.addEventListener('click', runWorkoutRoutine);
dom.btnStop.addEventListener('click', stopWorkoutRoutine);