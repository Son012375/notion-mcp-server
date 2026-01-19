# 노션 자동화 프로젝트 요약

**생성일**: 2026-01-19
**목적**: Claude Code CLI를 활용한 프로젝트 문서 자동 정리 시스템

---

## 📁 프로젝트 구조

```
notion-automation/
├── 📖 문서
│   ├── README.md              # 전체 프로젝트 설명
│   ├── QUICKSTART.md          # 5분 빠른 시작 가이드
│   ├── setup_guide.md         # 상세 설정 가이드
│   ├── example_usage.md       # 실전 사용 예시
│   └── PROJECT_SUMMARY.md     # 이 파일
│
├── 🐍 Python 코드
│   ├── add_to_notion.py       # 메인 스크립트 (문서 추가)
│   ├── notion_client.py       # 노션 API 클라이언트
│   └── test_connection.py     # 연결 테스트 스크립트
│
├── ⚙️ 설정
│   ├── requirements.txt       # Python 의존성
│   ├── .env.example          # 환경 변수 예시
│   ├── .env                  # 환경 변수 (gitignore)
│   └── .gitignore            # Git 제외 파일
│
└── 🔧 유틸리티
    └── notion-add.bat        # Windows 배치 스크립트
```

---

## 🎯 핵심 기능

### 1. 세 가지 입력 방식
- **대화형**: `python add_to_notion.py` - 프롬프트에 따라 입력
- **인라인**: `python add_to_notion.py "제목" "내용"` - 빠른 추가
- **파일**: `python add_to_notion.py --file today.txt` - 상세한 내용

### 2. 자동 구조화
- 마크다운 형식 자동 파싱 (헤더, 리스트 등)
- 노션 블록으로 자동 변환
- 메타데이터 추가 (날짜, 카테고리, 상태, 태그)

### 3. 노션 통합
- 노션 API를 통한 직접 페이지 생성
- 데이터베이스 속성 자동 설정
- 기존 스타일 참고 가능 (선택사항)

---

## 🔧 기술 스택

| 구분 | 기술 |
|------|------|
| 언어 | Python 3.8+ |
| API | Notion API (notion-client) |
| 설정 | python-dotenv |
| AI | Claude Code CLI (사용자가 직접 활용) |

---

## 📊 워크플로우

```
┌─────────────────┐
│  사용자 입력    │  → CLI / 파일 / 대화
└────────┬────────┘
         ↓
┌─────────────────┐
│ add_to_notion.py│  → 입력 파싱
└────────┬────────┘
         ↓
┌─────────────────┐
│ notion_client.py│  → API 호출
└────────┬────────┘
         ↓
┌─────────────────┐
│  노션 API       │  → 페이지 생성
└────────┬────────┘
         ↓
┌─────────────────┐
│  노션 페이지    │  ✅ 완료!
└─────────────────┘
```

---

## 🚀 빠른 시작

```bash
# 1. 설치
cd d:\son\notion-automation
pip install -r requirements.txt

# 2. 설정
copy .env.example .env
# .env 파일 편집 (API 키, 데이터베이스 ID)

# 3. 테스트
python test_connection.py

# 4. 사용
python add_to_notion.py "첫 테스트" "성공!"
```

**상세한 설정**: [QUICKSTART.md](QUICKSTART.md) 참고

---

## 💡 사용 사례

### 1. 일일 작업 기록
```bash
python add_to_notion.py "2026-01-19 작업" "JWT 구현 완료, 테스트 작성 중"
```

### 2. 프로젝트 진행 상황
```bash
python add_to_notion.py --file weekly_report.txt
```

### 3. 학습 내용 정리
```bash
python add_to_notion.py "Playwright 학습" "evaluate() 메서드 사용법..."
```

---

## 🔑 필수 설정

### 환경 변수 (.env)

```env
# 노션 API 키 (필수)
NOTION_API_KEY=secret_...

# 노션 데이터베이스 ID (필수)
NOTION_DATABASE_ID=...

# 기존 페이지 참고 (선택)
REFERENCE_PAGE_IDS=...
```

### 노션 데이터베이스 속성

| 속성명 | 타입 | 설명 |
|--------|------|------|
| 제목 | Title | 프로젝트명 (자동) |
| 날짜 | Date | 작성일 (자동) |
| 카테고리 | Select | 백엔드/프론트엔드/인프라 |
| 상태 | Select | 진행중/완료/보류 |
| 태그 | Multi-select | 기술 스택 |

---

## 🎓 Claude Code 연동

이 시스템은 Claude Code CLI와 함께 사용하도록 설계되었습니다:

### 기본 사용법
```bash
claude "오늘 한 일 노션에 정리해줘: FastAPI JWT 구현..."
```

Claude가 자동으로:
1. 내용을 구조화
2. `add_to_notion.py` 실행
3. 노션에 페이지 생성

### 고급 사용법
```bash
# 1. Claude에게 구조화 요청
claude "memo.txt의 내용을 노션 형식으로 today.txt에 정리해줘"

# 2. 노션에 추가
python add_to_notion.py --file today.txt
```

---

## 📈 개선 가능 사항

### 현재 버전 (v1.0)
- ✅ 기본 페이지 생성
- ✅ 마크다운 파싱
- ✅ 메타데이터 설정

### 향후 계획
- [ ] 코드 블록 구문 강조
- [ ] 이미지 업로드
- [ ] 기존 페이지 업데이트
- [ ] 템플릿 시스템
- [ ] 벌크 가져오기

---

## 🐛 문제 해결

### 자주 발생하는 오류

1. **"NOTION_API_KEY가 설정되지 않았습니다"**
   - `.env` 파일 존재 확인
   - 파일명 정확성 확인 (`.env.txt` 아님)

2. **"Could not find database"**
   - 데이터베이스 ID 재확인
   - 통합 연결 상태 확인

3. **"API token is invalid"**
   - API 키 재복사
   - 공백 포함 여부 확인

**상세한 문제 해결**: [setup_guide.md](setup_guide.md) 참고

---

## 📞 지원

- **문서**: 이 폴더의 모든 `.md` 파일
- **테스트**: `python test_connection.py`
- **노션 API 문서**: https://developers.notion.com/

---

## 📄 라이센스

MIT License

---

## ✅ 체크리스트

프로젝트 시작 전 확인:

- [ ] Python 3.8+ 설치됨
- [ ] `pip install -r requirements.txt` 실행
- [ ] 노션 통합 생성 완료
- [ ] 노션 데이터베이스 생성 완료
- [ ] 통합이 데이터베이스에 연결됨
- [ ] `.env` 파일 설정 완료
- [ ] `python test_connection.py` 성공
- [ ] 첫 테스트 페이지 생성 확인

**모두 체크되었나요?** 🎉 이제 사용할 준비가 되었습니다!

시작하려면: [QUICKSTART.md](QUICKSTART.md)
