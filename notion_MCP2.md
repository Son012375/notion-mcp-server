# Notion MCP 서버 개발 기록 (2)

## 업데이트 내용 - 토글 블록 지원

### 문제점
- 노션 API 기본 조회로는 **토글(toggle) 블록 내부 내용**을 읽을 수 없음
- 토글은 `has_children: true` 속성을 가진 블록으로, 별도로 children을 조회해야 함

### 해결 방법

#### 1. `getAllBlocksWithChildren` 함수 추가
토글 등 children이 있는 블록을 **재귀적으로 조회**하는 함수

```javascript
async function getAllBlocksWithChildren(blockId) {
  const blocks = await notion.blocks.children.list({
    block_id: blockId,
    page_size: 100
  });

  const results = [];
  for (const block of blocks.results) {
    // If block has children, fetch them recursively
    if (block.has_children) {
      const children = await getAllBlocksWithChildren(block.id);
      block.children = children;
    }
    results.push(block);
  }

  return results;
}
```

#### 2. `getPageContent` 함수 수정
기존 단순 조회 → 재귀 조회 함수 사용

```javascript
// 변경 전
const blocks = await notion.blocks.children.list({
  block_id: pageId,
  page_size: 100
});

// 변경 후
const blocks = await getAllBlocksWithChildren(pageId);
```

#### 3. `blocksToMarkdown` 함수 확장
- **들여쓰기(indent) 지원** - 토글 내부 내용 구분
- **새로운 블록 타입 추가**:
  - `toggle` - 토글 (▶ 마커로 표시)
  - `divider` - 구분선
  - `quote` - 인용문
  - `callout` - 콜아웃
  - `to_do` - 체크박스

```javascript
function blocksToMarkdown(blocks, indent = 0) {
  const indentStr = "  ".repeat(indent);

  return blocks.map(block => {
    // ... 블록 타입별 처리

    // children이 있으면 재귀적으로 처리
    if (block.children && block.children.length > 0) {
      const childContent = blocksToMarkdown(block.children, indent + 1);
      if (childContent) {
        content += "\n" + childContent;
      }
    }

    return content;
  }).filter(line => line !== "").join("\n\n");
}
```

## 지원 블록 타입

| 블록 타입 | 마크다운 변환 | 비고 |
|----------|--------------|------|
| paragraph | 텍스트 | 기본 |
| heading_1 | `# 제목` | 기본 |
| heading_2 | `## 제목` | 기본 |
| heading_3 | `### 제목` | 기본 |
| bulleted_list_item | `- 항목` | 기본 |
| numbered_list_item | `1. 항목` | 기본 |
| code | ````언어 코드```` | 기본 |
| table | `[테이블]` | 기본 |
| **toggle** | `▶ 제목` + 들여쓰기된 내용 | **신규** |
| **divider** | `---` | **신규** |
| **quote** | `> 인용` | **신규** |
| **callout** | `emoji 내용` | **신규** |
| **to_do** | `- [x] 항목` / `- [ ] 항목` | **신규** |

## 출력 예시

노션에서 토글로 정리된 내용:
```
▶ Node 정의
  - iNO: 노드 번호
  - X: X 좌표
  - Y: Y 좌표
  - Z: Z 좌표
```

## 적용 방법

**MCP 서버 재시작 필요**
- Claude Code 재시작 또는
- 터미널에서 MCP 서버 프로세스 재시작

## 변경 이력

- 2026-01-19: 토글 블록 및 추가 블록 타입 지원 (notion_MCP2.md)
