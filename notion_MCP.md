# Notion MCP 서버 개발 기록

## 개요
Claude Code에서 MCP(Model Context Protocol)를 통해 노션 데이터베이스를 직접 조작하는 시스템

## 구현된 기능

### 1. add_to_notion (기존)
마크다운 내용을 노션 데이터베이스에 새 페이지로 추가

**파라미터:**
- `title` (필수): 페이지 제목
- `content` (필수): 마크다운 형식의 본문
- `category`: 카테고리 (선택)
- `tags`: 태그 목록 (선택)
- `status`: 상태 (선택)

### 2. get_database (신규)
노션 데이터베이스의 모든 페이지 목록 조회

**반환 정보:**
- 페이지 ID
- 제목
- 상태
- 카테고리
- 태그
- 날짜
- 생성/수정 시간

### 3. get_page (신규)
특정 노션 페이지의 내용 읽기

**파라미터:**
- `page_id` (필수): 노션 페이지 ID

**반환 정보:**
- 제목, 상태, 카테고리, 태그
- 본문 내용 (마크다운으로 변환)
- 페이지 URL

### 4. update_page (신규)
기존 노션 페이지 수정

**파라미터:**
- `page_id` (필수): 수정할 페이지 ID
- `content`: 새로운 본문 내용 (선택)
- `title`: 새로운 제목 (선택)
- `category`: 새로운 카테고리 (선택)
- `tags`: 새로운 태그 목록 (선택)
- `status`: 새로운 상태 (선택)

## 파일 구조

```
d:\son\notion-automation\
├── .env                      # API 키 및 데이터베이스 ID
├── mcp-server/
│   ├── index.js              # MCP 서버 메인 코드
│   └── package.json
└── notion_MCP.md             # 이 문서
```

## 주요 함수 (index.js)

| 함수 | 설명 |
|------|------|
| `getDatabasePages()` | DB의 모든 페이지 목록 조회 |
| `getPageContent(pageId)` | 특정 페이지 내용 읽기 |
| `updatePageContent(pageId, content)` | 페이지 본문 수정 |
| `updatePageProperties(pageId, ...)` | 페이지 속성 수정 |
| `createNotionPage(...)` | 새 페이지 생성 |
| `blocksToMarkdown(blocks)` | 노션 블록 → 마크다운 변환 |
| `parseContentToBlocks(content)` | 마크다운 → 노션 블록 변환 |

## 사용 예시

### 데이터베이스 조회
```
"노션 데이터베이스 목록 보여줘"
```

### 페이지 읽기
```
"이 페이지 내용 읽어줘" (page_id 필요)
```

### 페이지 수정
```
"이 페이지 내용을 ~로 수정해줘" (page_id 필요)
```

### 새 페이지 추가
```
"~에 대해 노션에 정리해줘"
```

## 환경 설정 (.env)

```
NOTION_API_KEY=secret_xxxxx...
NOTION_DATABASE_ID=xxxxx...
```

## 노션 데이터베이스 속성 구조

| 속성명 | 타입 | 비고 |
|--------|------|------|
| 이름 | title | 필수 |
| 날짜 | date | 자동 설정 |
| 상태 | status | 선택 |
| 선택 | select | 카테고리 |
| 다중 선택 | multi_select | 태그 |

## 다음 단계

1. **MCP 서버 재시작** - 새 기능 적용을 위해 Claude Code 재시작 필요
2. **테스트** - get_database, get_page, update_page 기능 테스트
3. **교수님 노션 연결** - 교수님 노션 API 키와 데이터베이스 ID 받아서 연결

## 변경 이력

- 2026-01-19: MCP 서버 초기 구축 (add_to_notion)
- 2026-01-19: 읽기/수정 기능 추가 (get_database, get_page, update_page)
