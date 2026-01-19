# Notion MCP 서버 개발 기록 (3)

## 업데이트 내용 - 노션 블록 타입 전체 지원

### 이전 문제점
- 마크다운 텍스트만 전송 → 실제 노션 블록으로 변환되지 않음
- 토글은 `▶` 문자로 흉내만 냄 (실제 토글 기능 없음)
- 콜아웃, 인용문, 체크박스 등 미지원

### 해결 방법
`parseContentToBlocks` 함수를 대폭 확장하여 마크다운 → 노션 블록 API 객체로 변환

---

## 지원 블록 타입 및 마크다운 문법

### 기본 블록

| 마크다운 문법 | 노션 블록 | 설명 |
|-------------|----------|------|
| `# 제목` | heading_1 | 제목 1 |
| `## 제목` | heading_2 | 제목 2 |
| `### 제목` | heading_3 | 제목 3 |
| `일반 텍스트` | paragraph | 문단 |
| `- 항목` 또는 `* 항목` | bulleted_list_item | 글머리 기호 목록 |
| `1. 항목` | numbered_list_item | 번호 매기기 목록 |
| ``` ```언어 ``` | code | 코드 블록 |
| `\|a\|b\|` (테이블) | table | 테이블 |

### 신규 추가 블록

| 마크다운 문법 | 노션 블록 | 설명 |
|-------------|----------|------|
| `▶ 제목` + 들여쓰기 내용 | **toggle** | 토글 (접기/펼치기) |
| `> 텍스트` | **quote** | 인용문 |
| `💡 텍스트` (이모지+공백) | **callout** | 콜아웃 박스 |
| `---` | **divider** | 구분선 |
| `- [ ] 할일` | **to_do** (미완료) | 체크박스 |
| `- [x] 완료` | **to_do** (완료) | 체크된 체크박스 |
| `https://url.com` | **bookmark** | 북마크/링크 미리보기 |
| `[제목](url)` (단독 줄) | **bookmark** | 북마크 (캡션 포함) |

---

## 핵심 구현 코드

### 1. 토글 블록 파싱 (중첩 지원)

```javascript
// 토글 내용 파싱 - 들여쓰기 기반으로 children 결정
function parseToggleContent(lines, startIndex, baseIndent) {
  const children = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    const currentIndent = line.search(/\S|$/);

    // 같거나 작은 들여쓰기면 토글 종료
    if (line.trim() && currentIndent <= baseIndent) {
      break;
    }

    // 중첩 토글 처리
    if (stripped.startsWith("▶ ")) {
      const { block, nextIndex } = parseToggleBlock(lines, i, currentIndent, toggleText);
      children.push(block);
      i = nextIndex;
      continue;
    }

    // 기타 블록 타입
    const block = parseSingleLine(stripped);
    if (block) children.push(block);
    i++;
  }

  return { children, nextIndex: i };
}

// 토글 블록 생성
function parseToggleBlock(lines, startIndex, baseIndent, titleText) {
  const { children, nextIndex } = parseToggleContent(lines, startIndex + 1, baseIndent);

  return {
    block: {
      object: "block",
      type: "toggle",
      toggle: {
        rich_text: parseRichText(titleText),
        children: children.length > 0 ? children : [/* 빈 paragraph */]
      }
    },
    nextIndex
  };
}
```

### 2. 콜아웃 블록 (이모지 감지)

```javascript
// 이모지로 시작하면 콜아웃으로 변환
const calloutMatch = stripped.match(/^(이모지패턴)\s+(.+)$/u);
if (calloutMatch) {
  return {
    object: "block",
    type: "callout",
    callout: {
      rich_text: parseRichText(calloutMatch[2]),
      icon: { type: "emoji", emoji: calloutMatch[1] }
    }
  };
}
```

### 3. 체크박스 (to_do)

```javascript
// 미완료: - [ ] 텍스트
if (stripped.startsWith("- [ ] ")) {
  return {
    object: "block",
    type: "to_do",
    to_do: {
      rich_text: parseRichText(stripped.slice(6)),
      checked: false
    }
  };
}

// 완료: - [x] 텍스트
if (stripped.startsWith("- [x] ")) {
  return {
    object: "block",
    type: "to_do",
    to_do: {
      rich_text: parseRichText(stripped.slice(6)),
      checked: true
    }
  };
}
```

### 4. 북마크 (URL 자동 감지)

```javascript
// 단독 URL → 북마크
const urlMatch = stripped.match(/^(https?:\/\/[^\s]+)$/);
if (urlMatch) {
  return {
    object: "block",
    type: "bookmark",
    bookmark: { url: urlMatch[1], caption: [] }
  };
}

// [제목](URL) → 캡션 있는 북마크
const bookmarkMatch = stripped.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
if (bookmarkMatch) {
  return {
    object: "block",
    type: "bookmark",
    bookmark: {
      url: bookmarkMatch[2],
      caption: parseRichText(bookmarkMatch[1])
    }
  };
}
```

---

## 토글 작성 예시

### 입력 (마크다운)
```
▶ 파라미터 상세
  - iNO: 노드 번호
  - X, Y, Z: 좌표값
  ▶ 세부 규칙
    1. 양의 정수만 허용
    2. 중복 불가
```

### 출력 (노션)
실제 토글 블록으로 변환되어 접기/펼치기 가능

```
▶ 파라미터 상세        ← 클릭하면 펼쳐짐
  • iNO: 노드 번호
  • X, Y, Z: 좌표값
  ▶ 세부 규칙          ← 중첩 토글
    1. 양의 정수만 허용
    2. 중복 불가
```

---

## 콜아웃 지원 이모지

다음 이모지로 시작하면 자동으로 콜아웃 블록으로 변환:

💡 📌 ⚠️ ❗ ✅ ❌ 📝 🔥 💪 🎯 📚 🔗 💻 🛠️ 📋 🚀 💬 📢 🔔 ⭐ ❓ ❔ 🤔 💭

### 예시
```
💡 이것은 팁입니다
⚠️ 주의사항입니다
✅ 완료된 항목입니다
```

---

## 텍스트 서식 (Rich Text)

| 마크다운 | 결과 | 노션 표시 |
|---------|------|----------|
| `**굵게**` | 굵게 | **굵게** |
| `*기울임*` | 기울임 | *기울임* |
| `` `코드` `` | 코드 | `인라인 코드` |
| `~~취소선~~` | 취소선 | ~~취소선~~ |

---

## 현재 지원 현황

### 읽기 (get_page)
| 블록 타입 | 지원 | 비고 |
|----------|------|------|
| toggle | ✅ | 재귀적으로 children 조회 |
| quote | ✅ | |
| callout | ✅ | 이모지 포함 |
| divider | ✅ | |
| to_do | ✅ | 체크 상태 포함 |
| table | ✅ | [테이블]로 표시 |

### 쓰기 (add_to_notion, update_page)
| 블록 타입 | 지원 | 마크다운 문법 |
|----------|------|--------------|
| toggle | ✅ | `▶ 제목` + 들여쓰기 |
| quote | ✅ | `> 텍스트` |
| callout | ✅ | `이모지 텍스트` |
| divider | ✅ | `---` |
| to_do | ✅ | `- [ ]` / `- [x]` |
| bookmark | ✅ | URL 또는 `[제목](url)` |
| table | ✅ | 마크다운 테이블 |

---

## 적용 방법

**MCP 서버 재시작 필요**
- Claude Code 재시작 또는
- VSCode 재시작

---

## 변경 이력

- 2026-01-19 (1): 기본 MCP 서버 구현 (notion_MCP.md)
- 2026-01-19 (2): 토글 블록 읽기 지원 (notion_MCP2.md)
- 2026-01-19 (3): **전체 블록 타입 생성 지원** (notion_MCP3.md)
  - 토글 블록 생성 (중첩 지원)
  - 인용문, 콜아웃, 구분선, 체크박스, 북마크 추가
