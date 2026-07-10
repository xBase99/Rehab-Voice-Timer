// 1. 다국어 번역 데이터 및 설정
const languages = {
    ko: { title: "재활 보이스 타이머", start: "시작", ready: "준비", set: "세트", count: "번", rest: "휴식", done: "치료 완료", langCode: "ko-KR" },
    ja: { title: "リハビリ音声タイマー", start: "スタート", ready: "準備", set: "セット", count: "回", rest: "休憩", done: "お疲れ様でした", langCode: "ja-JP" },
    en: { title: "Rehab Voice Timer", start: "Start", ready: "Ready", set: "Set", count: "Times", rest: "Rest", done: "Workout Done", langCode: "en-US" },
    zh: { title: "康复语音计时器", start: "开始", ready: "准备", set: "组", count: "次", rest: "休息", done: "恢复 结束", langCode: "zh-CN" }
};

// 시스템 언어 감지 (지원 안 하면 영어 'en' 기본값)
const userLang = navigator.language.substring(0, 2);
const currentLang = languages[userLang] ? userLang : 'en';
const t = languages[currentLang];

// 운동 루틴 설정 (3세트, 10회, 3초 간격)
const TOTAL_SETS = 3;
const REPS_PER_SET = 10;
const INTERVAL_SEC = 3; 

// DOM 요소 바인딩
document.getElementById('title').innerText = t.title;
const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const infoDiv = document.getElementById('info');
startBtn.innerText = t.start;

// 음성(TTS) 출력 함수
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // 현재 재생 중인 음성 중지
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = t.langCode;
        window.speechSynthesis.speak(utterance);
    }
}

// 타이머 핵심 로직
async function startRoutine() {
    startBtn.disabled = true;
    
    // 시작 준비 단계
    statusDiv.innerText = t.ready;
    speak(t.ready);
    await new Promise(resolve => setTimeout(resolve, 2000));

    for (let set = 1; set <= TOTAL_SETS; set++) {
        for (let rep = 1; rep <= REPS_PER_SET; rep++) {
            // 화면 업데이트
            statusDiv.innerText = `${rep}`;
            infoDiv.innerText = `${t.set} ${set} / ${TOTAL_SETS}`;
            
            // 숫자 카운트 음성 출력
            speak(`${rep}`);
            
            // 3초 대기 (마지막 세트의 마지막 횟수면 대기 생략)
            if (!(set === TOTAL_SETS && rep === REPS_PER_SET)) {
                await new Promise(resolve => setTimeout(resolve, INTERVAL_SEC * 1000));
            }
        }
        
        // 세트 사이 휴식 (마지막 세트가 아닐 때만)
        if (set < TOTAL_SETS) {
            statusDiv.innerText = t.rest;
            speak(t.rest);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 휴식 시간 5초 설정
        }
    }
    
    // 완료
    statusDiv.innerText = "✓";
    infoDiv.innerText = t.done;
    speak(t.done);
    startBtn.disabled = false;
}

startBtn.addEventListener('click', startRoutine);