# Notion MCP Server

**토글 블록을 지원하는** Notion MCP 서버입니다.

기존 Notion MCP 서버들은 마크다운을 Notion으로 변환할 때 **토글 블록을 지원하지 않습니다**. 이 서버는 토글, 중첩 토글, 토글 내부 테이블까지 모두 지원합니다.

## 기존 MCP vs 이 서버

| 기능 | 기존 Notion MCP | 이 서버 |
|------|----------------|---------|
| 기본 마크다운 (제목, 목록, 코드) | O | O |
| 테이블 | O | O |
| **토글 블록** | X | **O** |
| **중첩 토글** | X | **O** |
| **토글 내부 테이블** | X | **O** |
| 체크박스 (To-do) | △ | O |
| 콜아웃 | X | O |
| 인용문 | O | O |

## 지원하는 마크다운 문법

### 토글 (핵심 기능)

```markdown
▶ 토글 제목
  토글 내부 내용 (2칸 들여쓰기)

  ▶ 중첩 토글
    중첩 내용 (4칸 들여쓰기)

  | 컬럼1 | 컬럼2 |
  |-------|-------|
  | 값1   | 값2   |
```

**중요**: 토글 내부 콘텐츠는 반드시 **2칸 이상 들여쓰기** 필요

### 기타 문법

| 문법 | 예시 |
|------|------|
| 제목 | `# H1`, `## H2`, `### H3` |
| 글머리 기호 | `- 항목` 또는 `* 항목` |
| 번호 목록 | `1. 항목` |
| 체크박스 | `- [ ] 할일`, `- [x] 완료` |
| 인용문 | `> 인용 내용` |
| 콜아웃 | `💡 콜아웃 내용` (이모지로 시작) |
| 코드 블록 | ` ```python ` ... ` ``` ` |
| 테이블 | `\| 컬럼1 \| 컬럼2 \|` |
| 구분선 | `---` |
| 굵게/기울임 | `**굵게**`, `*기울임*` |
| 인라인 코드 | `` `코드` `` |
| 취소선 | `~~취소선~~` |

## 설치

### 1. 저장소 클론

```bash
git clone https://github.com/Son012375/notion-mcp-server.git
cd notion-mcp-server/mcp-server
npm install
```

### 2. Notion Integration 설정

1. https://www.notion.so/my-integrations 접속
2. "새 API 통합" 클릭 → 이름 입력 후 생성
3. "내부 통합 토큰" 복사

### 3. Notion 데이터베이스 연결

1. Notion에서 사용할 데이터베이스 페이지 열기
2. 우측 상단 `...` → "연결" → 생성한 Integration 선택
3. URL에서 Database ID 복사:
   ```
   https://www.notion.so/workspace/DATABASE_ID_HERE?v=...
                             ^^^^^^^^^^^^^^^^^^^^^^^^
   ```

### 4. 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5. Claude Desktop/Code 설정

**Claude Desktop** (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["C:/your/path/notion-mcp-server/mcp-server/index.js"]
    }
  }
}
```

**Claude Code** (`.mcp.json`):

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["C:/your/path/notion-mcp-server/mcp-server/index.js"]
    }
  }
}
```

설정 후 Claude를 재시작하세요.

## 사용법

### 제공되는 도구 (Tools)

| 도구 | 설명 |
|------|------|
| `add_to_notion` | 마크다운 → Notion 페이지 생성 |
| `get_database` | 데이터베이스 페이지 목록 조회 |
| `get_page` | 특정 페이지 내용 읽기 (마크다운 반환) |
| `update_page` | 페이지 내용/속성 수정 |

### 예시

Claude에게 자연스럽게 요청하면 됩니다:

```
"노션에 오늘 회의록 추가해줘"
"노션 데이터베이스 목록 보여줘"
"노션 페이지 xxx 내용 읽어줘"
"노션 페이지 xxx의 상태를 완료로 변경해줘"
```

### 토글 작성 예시

```
"노션에 다음 내용으로 페이지 만들어줘:

▶ API 엔드포인트
  - GET /users
  - POST /users

  ▶ 응답 형식
    | 필드 | 타입 |
    |------|------|
    | id | number |
    | name | string |
"
```

## 데이터베이스 속성

이 서버는 다음 Notion 데이터베이스 속성을 사용합니다:

| 속성명 | 타입 | 필수 |
|--------|------|------|
| 이름 | Title | O |
| 날짜 | Date | O |
| 상태 | Status | 선택 |
| 선택 | Select | 선택 |
| 다중 선택 | Multi-select | 선택 |

데이터베이스에 속성이 없으면 생성하거나, `mcp-server/index.js`에서 속성명을 수정하세요.

## 문제 해결

### MCP 서버가 인식되지 않음
- 설정 파일 경로 확인 (Windows: `%APPDATA%\Claude\`)
- 경로에 역슬래시(`\`) 대신 슬래시(`/`) 사용
- Claude 완전히 재시작

### Notion API 오류
- Integration이 데이터베이스에 연결되었는지 확인
- API 키가 올바른지 확인
- Database ID가 정확한지 확인

### 토글 내부 콘텐츠가 밖으로 나옴
- 토글 내부는 반드시 **2칸 이상 들여쓰기**
- 중첩 토글은 추가로 2칸씩 더 들여쓰기

## 라이선스

MIT License
