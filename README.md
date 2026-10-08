# ARROW BEAT

ARROW BEAT는 방향키와 WASD를 사용하는 4키 리듬게임입니다.

## 실행 방법

1. 저장소를 로컬에 클론합니다.
2. `index.html` 파일을 브라우저에서 직접 엽니다.
3. START 버튼을 눌러 게임을 시작합니다.
4. 브라우저에서 오디오가 허용되면 게임 음악이 재생됩니다.

## 포함 기능

- 방향키 / WASD 동시 입력 지원
- EASY / NORMAL / HARD / EXTREME 난이도
- PERFECT / GREAT / GOOD / MISS 판정
- 콤보, 점수, 정확도 계산
- 실시간 점수/정확도 그래프
- 최고 점수 로컬 저장 (localStorage)
- 픽셀아트 UI와 네온 다크 테마
- Web Audio 기반 리듬 사운드
- 시작/결과 애니메이션 및 판정 팝업
- 단일 파일 버전 (`single-file.html`)

## 구조

- `index.html` : 메인 페이지
- `style.css` : 게임 UI 및 픽셀 스타일
- `script.js` : 게임 로직, 오디오, 패턴, 저장 기능
- `single-file.html` : CSS/JS를 모두 포함한 단일 파일 버전
- `assets/images/` : 배경/로고/패널 이미지
- `assets/music/` : 음악 생성 가이드 및 사운드 정보
