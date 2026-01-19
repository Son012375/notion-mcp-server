# 노션 프로젝트 문서 자동화

Claude Code CLI를 활용한 프로젝트 문서 자동 정리 시스템

## 특징

- **완전 무료**: Claude Pro 구독만 있으면 사용 가능
- **간편한 사용**: 터미널에서 대화하듯이 문서 작성
- **자동 구조화**: AI가 내용을 분석하여 노션 형식으로 정리
- **기존 스타일 학습**: 기존 노션 문서 스타일을 참고하여 일관성 유지

## 시스템 구조

```
[CLI 입력] → [Claude Code] → [노션 API] → [노션 데이터베이스]
```

## 설치

### 1. 의존성 설치

```bash
pip install -r requirements.txt
```

### 2. 노션 통합 설정

1. https://www.notion.so/my-integrations 접속
2. "새 통합 만들기" 클릭
3. 이름: "프로젝트 문서화 봇"
4. API 키 복사

### 3. 노션 데이터베이스 ID 확인

1. 노션에서 문서화할 데이터베이스 열기
2. URL 확인: `https://www.notion.so/workspace/{database_id}?v=...`
3. `database_id` 부분 복사

### 4. 환경 변수 설정

`.env` 파일 생성:

```env
NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=...
```

### 5. 노션 페이지에 권한 부여

1. 노션 데이터베이스 페이지 열기
2. 우측 상단 "..." → "연결" → "프로젝트 문서화 봇" 선택

## 사용법

### 방법 1: 직접 대화

```bash
python add_to_notion.py

# 프롬프트에 따라 입력
# 프로젝트명: FastAPI JWT 인증
# 내용: bcrypt로 비밀번호 해싱, Redis에 토큰 저장
```

### 방법 2: 인라인 입력

```bash
python add_to_notion.py "FastAPI JWT 인증" "bcrypt, Redis 사용"
```

### 방법 3: 파일에서 읽기

```bash
echo "오늘 한 일..." > today.txt
python add_to_notion.py --file today.txt
```

## 프로젝트 구조

```
notion-automation/
├── README.md                 # 문서
├── requirements.txt          # 의존성
├── .env.example             # 환경변수 예시
├── add_to_notion.py         # 메인 스크립트
├── notion_client.py         # 노션 API 클라이언트
└── utils/
    └── formatter.py         # 텍스트 포매터
```

## 노션 데이터베이스 구조

기본 속성:
- **제목** (Title): 프로젝트명
- **날짜** (Date): 작성일
- **카테고리** (Select): 백엔드/프론트엔드/인프라 등
- **상태** (Select): 진행중/완료/보류
- **태그** (Multi-select): 관련 기술 스택

## 문제 해결

### API 키 오류
- 노션 통합 페이지에서 API 키 재확인
- 페이지 권한 설정 확인

### 데이터베이스 ID 오류
- URL에서 정확한 ID 복사
- v= 이후 부분 제외

## 라이센스

MIT
