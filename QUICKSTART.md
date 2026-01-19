# 빠른 시작 가이드

5분 안에 노션 자동화를 시작하세요!

## 준비물

- ✅ 노션 계정
- ✅ Python 3.8 이상
- ✅ 인터넷 연결

## 1단계: 노션 통합 만들기 (2분)

1. 브라우저에서 https://www.notion.so/my-integrations 열기
2. **"+ 새 통합 만들기"** 클릭
3. 이름 입력: `프로젝트 문서화 봇`
4. **"제출"** 클릭
5. **"Internal Integration Token"** → **"표시"** 클릭
6. `secret_...` 시작하는 키 전체 복사 📋

## 2단계: 노션 데이터베이스 만들기 (1분)

1. 노션에서 새 페이지 생성
2. `/database` 입력 → **"데이터베이스 - 전체 페이지"** 선택
3. 이름: `프로젝트 문서`
4. 다음 속성 추가:
   - **날짜** (Date)
   - **카테고리** (Select) - 옵션: 백엔드, 프론트엔드, 인프라
   - **상태** (Select) - 옵션: 진행중, 완료, 보류
   - **태그** (Multi-select)

5. 페이지 URL에서 데이터베이스 ID 복사:
   ```
   https://www.notion.so/abc123def456?v=...
                         ^^^^^^^^ 이 부분
   ```

6. 페이지 우측 상단 **"..."** → **"연결"** → **"프로젝트 문서화 봇"** 선택

## 3단계: 프로젝트 설정 (1분)

```bash
# 폴더로 이동
cd d:\son\notion-automation

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 파일 복사
copy .env.example .env
```

`.env` 파일 편집:
```env
NOTION_API_KEY=secret_abc123...    # 1단계에서 복사한 키
NOTION_DATABASE_ID=abc123def456    # 2단계에서 복사한 ID
```

## 4단계: 테스트 (30초)

```bash
python test_connection.py
```

성공 메시지 확인:
```
🎉 모든 테스트 통과!
✅ 노션 자동화 시스템이 정상 작동합니다.
```

## 5단계: 첫 문서 추가! (30초)

```bash
python add_to_notion.py "첫 테스트" "노션 자동화 성공!"
```

노션에서 확인 → 새 페이지 생성됨! 🎉

## 다음 단계

### 일상적으로 사용하기

```bash
# 대화형 모드
python add_to_notion.py

# 빠른 추가
python add_to_notion.py "제목" "내용"

# 파일로 추가
python add_to_notion.py --file today.txt
```

### 더 알아보기

- 📖 [README.md](README.md) - 전체 문서
- 🔧 [setup_guide.md](setup_guide.md) - 상세 설정 가이드
- 💡 [example_usage.md](example_usage.md) - 사용 예시

## 문제 해결

### "NOTION_API_KEY가 설정되지 않았습니다"
→ `.env` 파일 확인 (`.env.txt`가 아님!)

### "Could not find database"
→ 2단계에서 통합 연결 확인

### "API token is invalid"
→ 1단계에서 키 다시 복사

---

**도움이 필요하신가요?**
- 📧 setup_guide.md 참고
- 🐛 문제 발견 시 GitHub Issues
