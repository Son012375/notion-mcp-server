# Notion MCP 서버 개발 기록 (7)

## 현재 상황 - 토글 내부 테이블 파싱 버그 수정

### 문제 현상
- 토글 블록 내부에 테이블이 있어야 하는데, 테이블이 토글 밖으로 빠져나오는 문제 발생
- 노션에서 페이지 확인 시 테이블이 `[테이블]`로만 표시되거나 토글 외부에 생성됨

### 원인 분석
`parseToggleContent` 함수 (index.js:215-242)에서 테이블 파싱 시 인덴트 체크 로직 오류

**변경 전 코드:**
```javascript
// Table inside toggle
if (stripped.startsWith("|") && stripped.endsWith("|")) {
  const tableRows = [];

  while (i < lines.length) {
    const rowLine = lines[i].trim();
    if (!(rowLine.startsWith("|") && rowLine.endsWith("|"))) break;

    // Table row indent check: must be more than baseIndent to be inside toggle
    const rowIndent = lines[i].search(/\S|$/);
    if (rowIndent <= baseIndent) break;  // ❌ 문제: baseIndent 기준으로 체크

    if (isTableSeparator(rowLine)) {
      i++;
      continue;
    }

    const cells = rowLine.split("|").slice(1, -1).map(c => c.trim());
    tableRows.push(cells);
    i++;
  }
  ...
}
```

**문제점:**
- 중첩 토글 내부의 테이블에서 `baseIndent`는 부모 토글의 인덴트를 참조
- 테이블 행의 인덴트가 `baseIndent`보다 작거나 같으면 테이블이 건너뛰어짐
- 예: 중첩 토글(인덴트 2) 내 테이블(인덴트 4)에서 `baseIndent=0`이면 조건 통과하지만, `baseIndent=2`면 실패

### 수정된 코드 (index.js:215-243)

```javascript
// Table inside toggle
if (stripped.startsWith("|") && stripped.endsWith("|")) {
  const tableRows = [];
  const tableStartIndent = currentIndent; // ✅ 수정: 현재 라인의 인덴트를 기준으로 사용

  while (i < lines.length) {
    const rowLine = lines[i].trim();
    if (!(rowLine.startsWith("|") && rowLine.endsWith("|"))) break;

    // Table row indent check: must be at same or greater indent than first table row
    const rowIndent = lines[i].search(/\S|$/);
    if (rowIndent < tableStartIndent) break;  // ✅ 수정: 테이블 시작 인덴트 기준으로 체크

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
```

### 수정 내용 요약
1. `baseIndent` 대신 `currentIndent`(테이블 첫 행의 인덴트)를 `tableStartIndent`로 저장
2. 테이블 행 인덴트 체크 시 `tableStartIndent` 기준으로 비교
3. 이제 테이블이 어떤 깊이의 토글 안에 있든 올바르게 파싱됨

---

## 마크다운 작성 시 주의사항

토글 내부에 테이블을 넣으려면 **반드시 들여쓰기**가 필요합니다:

```markdown
▶ **파라미터 상세**
  | 파라미터 | 설명 | 필수 |
  |---------|------|------|
  | iEL | 요소 번호 | 필수 |
  | TYPE | 요소 타입 | 필수 |

  ▶ **중첩 토글**
    | 열1 | 열2 |
    |-----|-----|
    | A | B |
```

- 토글 헤더(`▶`)보다 테이블 행이 **더 들여쓰기** 되어야 함
- 중첩 토글 내 테이블도 해당 토글보다 더 들여쓰기 필요

---

## 다음 단계

1. **MCP 서버 재시작** - 코드 변경사항 적용
2. **ELEMENT 페이지 재생성** - 수정된 파서로 테스트
3. **기존 페이지들 확인** - NODE, SECTION 페이지도 테이블 위치 확인

---

## 변경 이력

- 2026-01-19 (1): 기본 MCP 서버 구현 (notion_MCP.md)
- 2026-01-19 (2): 토글 블록 읽기 지원 (notion_MCP2.md)
- 2026-01-19 (3): 전체 블록 타입 생성 지원 (notion_MCP3.md)
- 2026-01-19 (4): 토글 내부 테이블/코드 블록 지원 (notion_MCP4.md)
- 2026-01-19 (5): 중첩 토글 null 체크 버그 수정 (notion_MCP5.md)
- 2026-01-19 (7): **토글 내부 테이블 인덴트 체크 버그 수정** (notion_MCP7.md)
  - `parseToggleContent`에서 테이블 인덴트 체크 로직 수정
  - `baseIndent` → `tableStartIndent` (현재 라인 인덴트) 기준으로 변경
