# 🌐 PolyVoice Live (플리토 스타일 실시간 음성 번역 & 영어 학습 AI)

> **플리토(Flitto Live)**의 핵심 강점인 **"초저지연 실시간 타이핑 번역"**, **"말버릇/비문 자동 정제(Disfluency Removal)"**, **"전문 용어집(TM)"** 및 **"5대 맞춤 번역 모드"**를 탑재하고, **영어 학습(섀도잉, 어휘 분석, 플래시카드)**에 특화된 실시간 음성 번역 웹 애플리케이션입니다.

---

## ✨ 핵심 주요 기능

### 1. ⚡ 플리토 스타일 실시간 스트리밍 음성 번역
* **실시간 타이핑 렌더링:** 말하는 도중 단어 단위로 즉시 번역 텍스트가 타이핑 스트리밍되어 거의 실시간(지연 100~300ms 체감)으로 확인 가능합니다.
* **오디오 스펙트럼 비주얼라이저:** 마이크 음성 입력 크기와 주파수에 반응하는 실시간 오디오 파형 렌더링.
* **대화면 컨퍼런스 모드:** 발표자 및 회의용 듀얼 자막(원문 STT + 번역 MT) 풀스크린 뷰 제공.

### 2. 🎭 5대 전문 번역 모드 (Translation Modes)
* ☕ **일상생활 (Casual & Colloquial):** 현지 원어민 일상 대화, 생생한 구어체 및 슬랭 반영.
* 📖 **문학 & 소설 (Literature & Creative):** 서정적 표현, 은유와 감정선이 살아있는 유려하고 아름다운 문체.
* 🎓 **논문 & 학술 (Academic & Research):** 학술 전문 용어, 객관적 서술, 명확한 논리 구조 및 학술지 규격 문체.
* 📰 **기자 & 뉴스 (Journalism & Broadcasting):** 군더더기 없는 두괄식 보도체, 사실 중심의 신뢰감 있는 톤.
* 💼 **비즈니스 (Business & Corporate):** 격식 있는 비즈니스 미팅, 이메일 및 공식 프레젠테이션용 정중한 어조.
* 💡 **영어 튜터 모드 (AI English Tutor):** 번역 + 원어민 추천 표현 + 핵심 어휘 분석 + 문법/뉘앙스 팁 동시 제공.

### 3. 🎓 영어 학습 특화 기능 (English Learning Toolkit)
* 🎙️ **원어민 발음 섀도잉(Shadowing) 연습 모드:**
  * 0.75x(슬로우), 1.0x(기본), 1.25x(빠르게) 속도로 원어민 TTS 청취.
  * 마이크로 직접 따라 말하고 **발음 일치율(Similarity Score %)** 및 축하 애니메이션 피드백.
* 📚 **스마트 핵심 어휘(Key Vocabulary) 추출:**
  * 번역된 문장에서 핵심 숙어, 단어, 발음기호(IPA), 한국어 뜻을 자동 추출.
* 🃏 **인터랙티브 플래시카드 & 퀴즈 덱:**
  * 원클릭으로 나만의 단어장에 저장하고 앞/뒤 뒤집기 카드 퀴즈로 복습.
  * CSV 파일 단어장 내보내기 지원.

### 4. 🛡️ 플리토 특화 엔지니어링 기능
* ✨ **말버릇 자동 정제 (Disfluency Removal):**
  * '음...', '어...', '그...', '저기...', 'like, you know, um, uh' 등 불필요한 군더더기를 실시간으로 필터링하여 매끄러운 완성형 문장 생성.
* 📖 **전문 용어집 및 번역 메모리 (Custom Glossary & TM):**
  * 인명, 회사명, IT/의료/금융 전문 고유명사를 사전 등록하여 번역 시 강제 매핑 및 오역 차단.
* 📱 **청중 실시간 자막 화면 (Audience Broadcast QR):**
  * 청중이 스마트폰으로 QR 코드를 스캔하여 원하는 언어(영어, 일본어, 중국어 등)로 실시간 자막을 시청하는 컨퍼런스 룸 기능.
* 💾 **히스토리 내보내기:** Markdown(.md), Text(.txt), CSV 포맷 지원.

---

## 🛠️ 기술 스택 (Tech Stack)

* **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4
* **Icons & Animation:** Lucide React, Canvas Confetti
* **Audio & STT:** Web Speech API (`webkitSpeechRecognition`), Web Audio API (`AudioContext`, `AnalyserNode`)
* **AI Engine:**
  * **Gemini 2.0 Flash / Gemini 1.5 Flash** (SSE 스트리밍)
  * **OpenAI GPT-4o-mini**
  * **Smart Local Engine** (API 키 없이 브라우저에서 즉시 0비용 사용 가능)
* **Speech Synthesis:** Web SpeechSynthesis API with variable rates (0.75x ~ 1.25x)

---

## 🚀 빠른 시작 방법 (Getting Started)

### 1. 패키지 설치
```bash
npm install
```

### 2. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:5173` 접속

### 3. 프로덕션 빌드
```bash
npm run build
```

---

## 🔑 AI 엔진 설정 안내 (선택 사항)

1. 앱 우측 상단 **[설정(⚙️)]** 아이콘 클릭
2. **Gemini 2.0 Flash** 선택 후 [Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급받은 무료 API Key 입력 (입력하지 않아도 내장 스마트 엔진으로 즉시 작동합니다).
