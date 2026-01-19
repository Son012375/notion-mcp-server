# Notion MCP 서버 개발 기록 (5)

## 현재 상황 - *SECTION 페이지 생성 시도 중

### 작업 내용
*NODE 파일 형식을 참고하여 *SECTION 페이지 생성 시도

### 발생한 문제
중첩 토글 내부 테이블 파싱 시 Notion API 오류 발생

```
오류 발생: body failed validation. Fix one:
body.children[0].toggle.children[1].toggle.children[0].embed should be defined...
body.children[0].toggle.children[1].toggle.children[0].table should be defined...
```

### 원인 분석
- 2단계 이상 중첩된 토글 내부에서 테이블 파싱 시 빈 블록이 생성되는 문제
- `parseToggleBlock`에서 반환된 block이 null일 수 있는데 검증 없이 push

### 수정된 코드

#### parseToggleContent 함수 (index.js:143-238)

변경 전:
```javascript
// Nested toggle
if (stripped.startsWith("▶ ") || stripped.startsWith("> ▶ ")) {
  const toggleText = stripped.replace(/^>\s*/, "").slice(2);
  const { block, nextIndex } = parseToggleBlock(lines, i, currentIndent, toggleText);
  children.push(block);  // block이 null일 수 있음
  i = nextIndex;
  continue;
}
```

변경 후:
```javascript
// Nested toggle
if (stripped.startsWith("▶ ") || stripped.startsWith("> ▶ ")) {
  const toggleText = stripped.replace(/^>\s*/, "").slice(2);
  const { block, nextIndex } = parseToggleBlock(lines, i, currentIndent, toggleText);
  if (block) children.push(block);  // null 체크 추가
  i = nextIndex;
  continue;
}
```

변경 전:
```javascript
if (tableRows.length) {
  const tableBlock = createTableBlock(tableRows);
  if (tableBlock) children.push(tableBlock);
}
```

변경 후:
```javascript
if (tableRows.length > 0) {  // 더 명시적인 조건
  const tableBlock = createTableBlock(tableRows);
  if (tableBlock) children.push(tableBlock);
}
```

---

## 다음 단계

1. **Claude 재시작** - MCP 서버 코드 변경 적용
2. ***SECTION 페이지 생성** - *NODE 형식과 동일하게:
   - 파라미터 상세 (테이블)
   - 단면 형상 코드 (중첩 토글 + 테이블)
   - 사용자 자연어 입력 패턴 (중첩 토글 + 코드 블록)
   - MGT 코드 예시 (중첩 토글 + 코드 블록)
   - 자연어 → 파라미터 매핑 규칙 (테이블)
   - 관련 명령어 (테이블)
   - 주의사항
   - 검색 키워드

---

## *SECTION 페이지 생성 예정 내용

```markdown
▶ 파라미터 상세
  | 파라미터 | 타입 | 필수 | 설명 |
  |---------|------|------|------|
  | iSEC | 정수 | ✅ | 단면 번호 |
  | TYPE | 문자열 | ✅ | 단면 형상 코드 |
  | 치수 파라미터 | 실수 | ✅ | 단면 형상에 따른 치수값 |

  ▶ 단면 형상 코드 (TYPE)
    | TYPE | 형상 | 필요 파라미터 |
    |------|------|--------------|
    | RECT | 직사각형 | B, H |
    | CIRC | 원형 | D |
    | H | H형강 | H, B, tw, tf |
    ...

▶ 사용자 자연어 입력 패턴
  ▶ 패턴 1 : 직접 치수 지정
    ```plain text
"300x500 직사각형 단면 만들어줘"
    ```
  ...

▶ MGT 코드 예시
  ▶ 예시 1 : 직사각형 단면
    ```plain text
*SECTION
1, RECT, 0.3, 0.5
    ```
  ...
```

---

## 변경 이력

- 2026-01-19 (1): 기본 MCP 서버 구현 (notion_MCP.md)
- 2026-01-19 (2): 토글 블록 읽기 지원 (notion_MCP2.md)
- 2026-01-19 (3): 전체 블록 타입 생성 지원 (notion_MCP3.md)
- 2026-01-19 (4): 토글 내부 테이블/코드 블록 지원 (notion_MCP4.md)
- 2026-01-19 (5): **중첩 토글 null 체크 버그 수정** (notion_MCP5.md)
  - `parseToggleContent`에서 중첩 토글 block null 체크 추가
  - 테이블 행 검사 조건 명시화 (`length > 0`)
