# Notion MCP 서버 개발 기록 (6)

## 현재 상황 - 토글 내부 콘텐츠가 토글 밖으로 빠지는 버그 수정

### 발생한 문제
*SECTION 페이지 생성 시 토글 내부에 있어야 할 테이블과 목록이 토글 밖에 생성됨

### 원인 분석
`parseToggleContent` 함수의 들여쓰기 판단 로직 문제:

1. **테이블 파싱 시**: `rowIndent <= baseIndent` 조건으로 중단하는데, 토글 헤더의 들여쓰기(baseIndent)와 비교하면 토글 내부 콘텐츠도 중단됨
2. **while 루프 조건**: `currentIndent <= baseIndent`에서 토글 내부 콘텐츠가 들여쓰기 없이 바로 다음 줄에 있으면 토글 밖으로 판단

마크다운 입력 형식 문제:
```
▶ 파라미터 상세        <- baseIndent = 0
| 테이블 |             <- currentIndent = 0 (토글 밖으로 잘못 판단!)
```

### 수정된 코드

#### parseToggleContent 함수 (index.js:143-253)

```javascript
// Parse toggle content - handles nested toggles with indentation
// Uses indentation-based parsing: content indented more than toggle header belongs to toggle
function parseToggleContent(lines, startIndex, baseIndent) {
  const children = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trim();
    const currentIndent = line.search(/\S|$/);

    // Empty line - skip but continue
    if (!stripped) {
      i++;
      continue;
    }

    // Stop conditions:
    // 1. Same-level or higher-level toggle (▶ at baseIndent or less)
    if (stripped.startsWith("▶ ") && currentIndent <= baseIndent) {
      break;
    }

    // 2. Content at same or less indent than toggle header (not a toggle continuation)
    //    But allow content that's part of this toggle (indented more than baseIndent)
    if (currentIndent <= baseIndent && !stripped.startsWith("▶ ")) {
      // Check if this looks like a new top-level element
      // Tables, code blocks starting at base indent = end of toggle content
      if (stripped.startsWith("|") || stripped.startsWith("```") ||
          stripped.startsWith("# ") || stripped.startsWith("## ") ||
          stripped.startsWith("### ") || stripped.startsWith("---")) {
        break;
      }
      // For other content at baseIndent, also stop (new paragraph outside toggle)
      break;
    }

    // Nested toggle (indented toggle)
    if (stripped.startsWith("▶ ") || stripped.startsWith("> ▶ ")) {
      const toggleText = stripped.replace(/^>\s*/, "").slice(2);
      const { block, nextIndex } = parseToggleBlock(lines, i, currentIndent, toggleText);
      if (block) children.push(block);
      i = nextIndex;
      continue;
    }

    // Code block inside toggle
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

    // Table inside toggle
    if (stripped.startsWith("|") && stripped.endsWith("|")) {
      const tableRows = [];

      while (i < lines.length) {
        const rowLine = lines[i].trim();
        if (!(rowLine.startsWith("|") && rowLine.endsWith("|"))) break;

        // Table row indent check: must be more than baseIndent to be inside toggle
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

      if (tableRows.length > 0) {
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

### 핵심 변경점

1. **토글 종료 조건 명확화**:
   - 같은 레벨의 새 토글(`▶`)을 만나면 현재 토글 파싱 종료
   - `currentIndent <= baseIndent`인 콘텐츠는 토글 외부로 판단

2. **패턴 기반 종료 판단**:
   - 테이블(`|`), 코드 블록(` ``` `), 헤딩(`#`), 구분선(`---`) 등이 baseIndent에서 시작하면 토글 종료

---

## 다음 단계

1. **Claude 재시작** - MCP 서버 코드 변경 적용
2. ***SECTION 페이지 재생성** - 토글 내부 테이블/목록 정상 포함 확인
3. **마크다운 입력 형식 검토** - 토글 내부 콘텐츠는 들여쓰기 필요 여부 확인

---

## 마크다운 입력 형식 가이드

토글 내부 콘텐츠는 **2칸 들여쓰기** 필요:

```markdown
▶ 토글 제목
  | 컬럼1 | 컬럼2 |
  |-------|-------|
  | 값1   | 값2   |

  - 목록 항목 1
  - 목록 항목 2

  ▶ 중첩 토글
    내용...
```

---

## 변경 이력

- 2026-01-19 (1): 기본 MCP 서버 구현 (notion_MCP.md)
- 2026-01-19 (2): 토글 블록 읽기 지원 (notion_MCP2.md)
- 2026-01-19 (3): 전체 블록 타입 생성 지원 (notion_MCP3.md)
- 2026-01-19 (4): 토글 내부 테이블/코드 블록 지원 (notion_MCP4.md)
- 2026-01-19 (5): 중첩 토글 null 체크 버그 수정 (notion_MCP5.md)
- 2026-01-19 (6): **토글 내부 콘텐츠 파싱 로직 개선** (notion_MCP6.md)
  - `parseToggleContent` 함수 토글 종료 조건 명확화
  - 들여쓰기 기반 토글 내부/외부 콘텐츠 구분 개선
