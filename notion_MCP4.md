# Notion MCP 서버 개발 기록 (4)

## 업데이트 내용 - 토글 내부 테이블/코드 블록 지원

### 이전 문제점
- 토글 내부에 테이블을 넣으면 노션 테이블 블록으로 변환되지 않음
- 마크다운 테이블 문법(`| |`)이 그대로 텍스트로 표시됨
- 토글 내부 코드 블록도 동일한 문제 발생

### 원인
`parseToggleContent` 함수에서 토글 내부 콘텐츠를 파싱할 때 `parseSingleLine`만 호출
- 테이블과 코드 블록은 여러 줄에 걸쳐 있어서 `parseSingleLine`으로 처리 불가

### 해결 방법
`parseToggleContent` 함수에 테이블과 코드 블록 파싱 로직 추가

---

## 수정된 코드

### parseToggleContent 함수 (index.js:143-238)

```javascript
// Parse toggle content - handles nested toggles with indentation
function parseToggleContent(lines, startIndex, baseIndent) {
  const children = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    const currentIndent = line.search(/\S|$/);

    // If we hit a line with same or less indent (and it's not empty), stop
    if (line.trim() && currentIndent <= baseIndent) {
      break;
    }

    // Empty line - skip but continue
    if (!line.trim()) {
      i++;
      continue;
    }

    const stripped = line.trim();

    // Nested toggle
    if (stripped.startsWith("▶ ") || stripped.startsWith("> ▶ ")) {
      const toggleText = stripped.replace(/^>\s*/, "").slice(2);
      const { block, nextIndex } = parseToggleBlock(lines, i, currentIndent, toggleText);
      children.push(block);
      i = nextIndex;
      continue;
    }

    // Code block inside toggle (신규 추가)
    if (stripped.startsWith("```")) {
      const language = stripped.slice(3).trim() || "plain text";
      const codeLines = [];
      i++;

      while (i < lines.length && lines[i].trim() !== "```") {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```

      const codeContent = codeLines.join("\n");
      if (codeContent) {
        children.push({
          object: "block",
          type: "code",
          code: {
            rich_text: [{ type: "text", text: { content: codeContent } }],
            language: mapLanguage(language)
          }
        });
      }
      continue;
    }

    // Table inside toggle (신규 추가)
    if (stripped.startsWith("|") && stripped.endsWith("|")) {
      const tableRows = [];

      while (i < lines.length) {
        const rowLine = lines[i].trim();
        if (!(rowLine.startsWith("|") && rowLine.endsWith("|"))) break;

        // Check indent - if less than or equal to baseIndent, stop
        const rowIndent = lines[i].search(/\S|$/);
        if (rowIndent <= baseIndent) break;

        if (isTableSeparator(rowLine)) {
          i++;
          continue;
        }

        const cells = rowLine.split("|").slice(1, -1).map(c => c.trim());
        tableRows.push(cells);
        i++;
      }

      if (tableRows.length) {
        const tableBlock = createTableBlock(tableRows);
        if (tableBlock) children.push(tableBlock);
      }
      continue;
    }

    // Other block types inside toggle
    const block = parseSingleLine(stripped);
    if (block) {
      children.push(block);
    }
    i++;
  }

  return { children, nextIndex: i };
}
```

---

## 토글 내부 지원 블록 타입

| 블록 타입 | 지원 | 비고 |
|----------|------|------|
| 중첩 토글 | ✅ | `▶ ` 마커로 시작 |
| 테이블 | ✅ | **신규** - 마크다운 테이블 → 노션 테이블 |
| 코드 블록 | ✅ | **신규** - ``` 으로 감싸진 코드 |
| 글머리 기호 | ✅ | `- ` 또는 `* ` |
| 번호 매기기 | ✅ | `1. ` 형식 |
| 체크박스 | ✅ | `- [ ]` / `- [x]` |
| 인용문 | ✅ | `> ` |
| 콜아웃 | ✅ | 이모지로 시작 |
| 구분선 | ✅ | `---` |
| 문단 | ✅ | 일반 텍스트 |

---

## 사용 예시

### 입력 (마크다운)

```
▶ 파라미터 상세
  | 파라미터 | 타입 | 설명 |
  |---------|------|------|
  | iSEC | 정수 | 단면 번호 |
  | TYPE | 문자열 | 단면 형상 코드 |

  ▶ 코드 예시
    ```plain text
*SECTION
1, RECT, 0.3, 0.5
    ```
```

### 출력 (노션)

```
▶ 파라미터 상세        ← 클릭하면 펼쳐짐
  ┌─────────┬────────┬─────────────┐
  │ 파라미터 │ 타입   │ 설명        │  ← 실제 노션 테이블
  ├─────────┼────────┼─────────────┤
  │ iSEC    │ 정수   │ 단면 번호    │
  │ TYPE    │ 문자열 │ 단면 형상 코드│
  └─────────┴────────┴─────────────┘

  ▶ 코드 예시          ← 중첩 토글
    ┌────────────────┐
    │ *SECTION       │  ← 실제 노션 코드 블록
    │ 1, RECT, 0.3...│
    └────────────────┘
```

---

## 전체 지원 현황 요약

### 최상위 레벨
| 블록 타입 | 지원 | 마크다운 문법 |
|----------|------|--------------|
| heading_1~3 | ✅ | `#`, `##`, `###` |
| paragraph | ✅ | 일반 텍스트 |
| bulleted_list | ✅ | `- ` 또는 `* ` |
| numbered_list | ✅ | `1. ` |
| code | ✅ | ``` |
| table | ✅ | `\|a\|b\|` |
| toggle | ✅ | `▶ ` + 들여쓰기 |
| quote | ✅ | `> ` |
| callout | ✅ | 이모지 + 텍스트 |
| divider | ✅ | `---` |
| to_do | ✅ | `- [ ]` / `- [x]` |
| bookmark | ✅ | URL 또는 `[제목](url)` |

### 토글 내부 (children)
| 블록 타입 | 지원 | 비고 |
|----------|------|------|
| 중첩 토글 | ✅ | 무한 중첩 가능 |
| 테이블 | ✅ | **v4에서 추가** |
| 코드 블록 | ✅ | **v4에서 추가** |
| 기타 모든 블록 | ✅ | parseSingleLine으로 처리 |

---

## 적용 방법

**MCP 서버 재시작 필요**
- Claude Code 재시작 또는
- VSCode 재시작

---

## 변경 이력

- 2026-01-19 (1): 기본 MCP 서버 구현 (notion_MCP.md)
- 2026-01-19 (2): 토글 블록 읽기 지원 (notion_MCP2.md)
- 2026-01-19 (3): 전체 블록 타입 생성 지원 (notion_MCP3.md)
- 2026-01-19 (4): **토글 내부 테이블/코드 블록 지원** (notion_MCP4.md)
  - `parseToggleContent` 함수 확장
  - 토글 children에서 테이블 파싱 추가
  - 토글 children에서 코드 블록 파싱 추가
