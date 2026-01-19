# Notion MCP Server

Claude Desktop/Code에서 Notion 데이터베이스를 직접 조작할 수 있는 MCP(Model Context Protocol) 서버입니다.

## 기능

- **페이지 생성** (`add_to_notion`): 마크다운 → Notion 페이지 자동 변환
- **페이지 조회** (`get_page`): Notion 페이지 내용을 마크다운으로 읽기
- **데이터베이스 조회** (`get_database`): 전체 페이지 목록 조회
- **페이지 수정** (`update_page`): 기존 페이지 내용/속성 수정

### 지원하는 마크다운 문법

| 문법 | 예시 |
|------|------|
| 제목 | `# H1`, `## H2`, `### H3` |
| 토글 | `▶ 토글 제목` (2칸 들여쓰기로 내용 추가) |
| 중첩 토글 | 들여쓰기로 토글 안에 토글 |
| 테이블 | `\| 컬럼1 \| 컬럼2 \|` |
| 코드 블록 | ` ```python ` |
| 목록 | `- 항목` 또는 `1. 항목` |
| 체크박스 | `- [ ] 할일` 또는 `- [x] 완료` |
| 인용 | `> 인용문` |
| 구분선 | `---` |
| 굵게/기울임 | `**굵게**`, `*기울임*` |
| 인라인 코드 | `` `코드` `` |

## 설치 방법

### 1. 저장소 클론

```bash
git clone https://github.com/YOUR_USERNAME/notion-mcp-server.git
cd notion-mcp-server/mcp-server
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

```bash
# .env.example을 복사해서 .env 생성
cp ../.env.example ../.env
```

`.env` 파일을 열어 아래 값들을 입력:

```env
NOTION_API_KEY=your_notion_api_key_here
NOTION_DATABASE_ID=your_database_id_here
```

### 4. Notion Integration 설정

1. https://www.notion.so/my-integrations 접속
2. "새 API 통합" 클릭
3. 이름 입력 후 생성
4. "내부 통합 토큰" 복사 → `.env`의 `NOTION_API_KEY`에 입력
5. Notion에서 연결할 데이터베이스 페이지 열기
6. 우측 상단 `...` → "연결" → 생성한 Integration 선택
7. 데이터베이스 URL에서 ID 복사 → `.env`의 `NOTION_DATABASE_ID`에 입력

```
https://www.notion.so/workspace/DATABASE_ID_HERE?v=...
                          ^^^^^^^^^^^^^^^^^^^^^^^^
                          이 부분이 Database ID
```

### 5. Claude Desktop 설정

`%APPDATA%\Claude\claude_desktop_config.json` 파일 수정:

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["C:/절대경로/notion-mcp-server/mcp-server/index.js"]
    }
  }
}
```

**중요**: `args`의 경로를 본인 PC의 실제 경로로 변경하세요.

### 6. Claude Desktop 재시작

설정 후 Claude Desktop을 완전히 종료했다가 다시 실행하세요.

## 사용 예시

Claude에게 다음과 같이 요청하면 됩니다:

```
"노션에 오늘 회의록 추가해줘"
"노션 데이터베이스 목록 보여줘"
"노션 페이지 ID xxx의 내용 읽어줘"
```

### 토글 작성 예시

토글 내부 콘텐츠는 **2칸 들여쓰기** 필요:

```markdown
▶ 토글 제목
  토글 내부 텍스트

  | 컬럼1 | 컬럼2 |
  |-------|-------|
  | 값1   | 값2   |

  ▶ 중첩 토글
    중첩 내용
```

## 데이터베이스 속성

이 MCP 서버는 다음 Notion 데이터베이스 속성을 사용합니다:

| 속성명 | 타입 | 용도 |
|--------|------|------|
| 이름 | Title | 페이지 제목 |
| 상태 | Status | 진행 상태 |
| 선택 | Select | 카테고리 |
| 다중 선택 | Multi-select | 태그 |
| 날짜 | Date | 생성 날짜 |

데이터베이스에 이 속성들이 없으면 생성하거나, `index.js`에서 속성명을 수정하세요.

## 문제 해결

### MCP 서버가 인식되지 않음
- `claude_desktop_config.json` 경로 확인 (Windows: `%APPDATA%\Claude\`)
- 경로에 역슬래시(`\`) 대신 슬래시(`/`) 사용
- Claude Desktop 완전히 재시작

### Notion API 오류
- Integration이 데이터베이스에 연결되었는지 확인
- API 키가 올바른지 확인
- 데이터베이스 ID가 정확한지 확인

### 토글 내부 콘텐츠가 밖으로 나옴
- 토글 내부 콘텐츠는 반드시 2칸 이상 들여쓰기

## 라이선스

MIT License
