# 사용 예시

## 기본 사용법

### 1. 대화형 모드 (가장 간단)

```bash
python add_to_notion.py
```

실행 후 프롬프트에 따라 입력:
```
📝 노션 프로젝트 문서 자동화
============================================================

📌 프로젝트 정보를 입력하세요 (Enter만 누르면 건너뛰기)

제목 (필수): FastAPI JWT 인증 구현

내용을 입력하세요 (여러 줄 가능, Ctrl+Z 후 Enter로 종료):
오늘 FastAPI에 JWT 인증을 구현했다.

## 주요 내용
- bcrypt로 비밀번호 해싱
- Access Token과 Refresh Token 구조
- Redis에 Refresh Token 저장

## 다음 할 일
- 토큰 갱신 로직 테스트
- 프론트엔드 연동
^Z

카테고리 (선택, 예: 백엔드/프론트엔드/인프라): 백엔드
태그 (선택, 콤마로 구분, 예: FastAPI,Python): FastAPI,Python,JWT,Redis
상태 (선택, 기본값: 진행중): 진행중

🔄 노션에 추가 중...

✅ 노션 페이지 생성 완료!
📍 URL: https://www.notion.so/...
```

### 2. 인라인 모드 (빠른 입력)

```bash
python add_to_notion.py "Playwright URL 감지 수정" "page.url 대신 JavaScript evaluation 사용. 0.5초마다 체크하도록 변경"
```

### 3. 파일 모드 (상세한 내용)

먼저 파일 생성:
```bash
cat > today.txt << EOF
네이버 블로그 자동화 완료

## 오늘 한 일
- URL 감지 로직 수정
- JavaScript evaluation으로 변경
- 체크 간격 0.5초로 단축

## 성과
- 발행 완료 감지 정확도 100%
- 응답 속도 50% 개선

## 배운 점
- Playwright의 page.url은 캐싱됨
- evaluate()로 실시간 확인 필요
EOF
```

실행:
```bash
python add_to_notion.py --file today.txt
```

## Claude Code와 함께 사용

### 방법 1: Claude에게 직접 요청

```bash
claude
```

대화:
```
사용자: 오늘 한 일 노션에 정리해줘
       - Playwright URL 감지 로직 수정
       - JavaScript evaluation 사용
       - 0.5초마다 체크

Claude: [파일 생성 및 노션 추가 자동 실행]
        ✅ 노션에 추가했습니다!
```

### 방법 2: 파이프라인 활용

```bash
# 1. 메모 작성
echo "오늘 FastAPI JWT 구현함. bcrypt, Redis 사용" > memo.txt

# 2. Claude에게 구조화 요청
claude "memo.txt의 내용을 노션에 추가하기 좋게 구조화해서 today.txt로 저장해줘"

# 3. 노션에 추가
python add_to_notion.py --file today.txt
```

## 실전 워크플로우

### 시나리오 1: 일일 작업 기록

**아침:**
```bash
# 오늘 할 일 노션에 추가
python add_to_notion.py "2026-01-19 TODO" "- JWT 구현
- 테스트 작성
- 문서 업데이트"
```

**저녁:**
```bash
# 완료 항목 업데이트
python add_to_notion.py "2026-01-19 완료" "JWT 구현 완료
테스트 작성 완료
문서 업데이트 진행중"
```

### 시나리오 2: 프로젝트 진행 상황

```bash
# 주간 보고
python add_to_notion.py "네이버 블로그 자동화 Week 1" \
"## 완료
- Playwright 자동화 구현
- URL 감지 로직 완성
- 엄마용 ngrok 설정

## 다음 주
- 미리보기 기능 추가
- 에러 처리 개선"
```

### 시나리오 3: 학습 내용 정리

```bash
# 학습한 내용을 파일로 작성
cat > learning.txt << EOF
Playwright JavaScript Evaluation

## 배운 내용
- page.url 속성은 캐싱됨
- evaluate()로 실시간 URL 확인 가능
- 0.5초 간격으로 폴링 최적

## 코드 예시
current_url = page.evaluate("() => window.location.href")

## 참고 자료
- Playwright 공식 문서
EOF

python add_to_notion.py --file learning.txt
```

## 고급 사용

### Bash 별칭 설정

`~/.bashrc` 또는 `~/.zshrc`에 추가:

```bash
# 노션 빠른 추가
alias notion-add='cd d:/son/notion-automation && python add_to_notion.py'

# 오늘 한 일 기록
alias notion-today='cd d:/son/notion-automation && python add_to_notion.py --file today.txt'
```

사용:
```bash
notion-add "제목" "내용"
notion-today
```

### Windows 배치 파일

`notion-add.bat` 생성:
```batch
@echo off
cd /d d:\son\notion-automation
python add_to_notion.py %*
```

사용:
```cmd
notion-add "제목" "내용"
```

## 팁과 트릭

### 1. 템플릿 활용

자주 사용하는 형식을 템플릿으로 저장:

```bash
# template.txt
[프로젝트명]

## 오늘 한 일
-

## 다음 할 일
-

## 메모
-
```

사용:
```bash
cp template.txt today.txt
# today.txt 편집
python add_to_notion.py --file today.txt
```

### 2. Git과 연동

```bash
# 커밋 후 자동으로 노션에 기록
git commit -m "feat: JWT 인증 구현"
python add_to_notion.py "JWT 인증 구현" "$(git log -1 --pretty=%B)"
```

### 3. 스크립트 자동화

```python
# auto_log.py
import subprocess
import datetime

title = f"{datetime.date.today()} 작업 로그"
# 자동으로 내용 수집
content = "오늘의 git 커밋:\n"
content += subprocess.check_output(["git", "log", "--oneline", "-5"]).decode()

subprocess.run(["python", "add_to_notion.py", title, content])
```

## 문제 해결

### 입력이 너무 길어서 잘림
→ 파일 모드 사용

### 카테고리가 자동 생성 안 됨
→ 노션 데이터베이스에서 먼저 카테고리 옵션 생성 필요

### 한글 깨짐
→ 파일 저장 시 UTF-8 인코딩 사용
