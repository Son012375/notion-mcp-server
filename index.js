import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

// Notion supported languages
const SUPPORTED_LANGUAGES = new Set([
  "abap", "arduino", "bash", "basic", "c", "clojure", "coffeescript", "cpp",
  "csharp", "css", "dart", "diff", "docker", "elixir", "elm", "erlang",
  "flow", "fortran", "fsharp", "gherkin", "glsl", "go", "graphql", "groovy",
  "haskell", "html", "java", "javascript", "json", "julia", "kotlin", "latex",
  "less", "lisp", "livescript", "lua", "makefile", "markdown", "markup",
  "matlab", "mermaid", "nix", "objective-c", "ocaml", "pascal", "perl", "php",
  "plain text", "powershell", "prolog", "protobuf", "python", "r", "reason",
  "ruby", "rust", "sass", "scala", "scheme", "scss", "shell", "sql", "swift",
  "typescript", "vb.net", "verilog", "vhdl", "visual basic", "webassembly",
  "xml", "yaml"
]);

const LANGUAGE_MAP = {
  "js": "javascript",
  "ts": "typescript",
  "py": "python",
  "rb": "ruby",
  "sh": "bash",
  "yml": "yaml",
  "md": "markdown",
  "": "plain text"
};

function mapLanguage(lang) {
  const lower = (lang || "").toLowerCase();
  const mapped = LANGUAGE_MAP[lower] || lower;
  return SUPPORTED_LANGUAGES.has(mapped) ? mapped : "plain text";
}

// Parse rich text with markdown formatting
function parseRichText(text) {
  const richText = [];
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|~~(.+?)~~)/g;

  let lastEnd = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastEnd) {
      const plainText = text.slice(lastEnd, match.index);
      if (plainText) {
        richText.push({ type: "text", text: { content: plainText } });
      }
    }

    const fullMatch = match[0];

    if (fullMatch.startsWith("**") && fullMatch.endsWith("**")) {
      richText.push({
        type: "text",
        text: { content: match[2] },
        annotations: { bold: true }
      });
    } else if (fullMatch.startsWith("~~") && fullMatch.endsWith("~~")) {
      richText.push({
        type: "text",
        text: { content: match[5] },
        annotations: { strikethrough: true }
      });
    } else if (fullMatch.startsWith("`") && fullMatch.endsWith("`")) {
      richText.push({
        type: "text",
        text: { content: match[4] },
        annotations: { code: true }
      });
    } else if (fullMatch.startsWith("*") && fullMatch.endsWith("*")) {
      richText.push({
        type: "text",
        text: { content: match[3] },
        annotations: { italic: true }
      });
    }

    lastEnd = match.index + fullMatch.length;
  }

  if (lastEnd < text.length) {
    richText.push({ type: "text", text: { content: text.slice(lastEnd) } });
  }

  if (richText.length === 0) {
    richText.push({ type: "text", text: { content: text } });
  }

  return richText;
}

// Check if line is table separator
function isTableSeparator(line) {
  const cells = line.split("|").slice(1, -1);
  return cells.every(cell => /^[\s\-:]+$/.test(cell));
}

// Create table block
function createTableBlock(rows) {
  if (!rows.length) return null;

  const tableWidth = Math.max(...rows.map(row => row.length));

  const tableRows = rows.map(row => {
    while (row.length < tableWidth) row.push("");
    return {
      object: "block",
      type: "table_row",
      table_row: {
        cells: row.map(cell => parseRichText(cell))
      }
    };
  });

  return {
    object: "block",
    type: "table",
    table: {
      table_width: tableWidth,
      has_column_header: true,
      has_row_header: false,
      children: tableRows
    }
  };
}

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

// Parse a toggle block with its children
function parseToggleBlock(lines, startIndex, baseIndent, titleText) {
  const { children, nextIndex } = parseToggleContent(lines, startIndex + 1, baseIndent);

  const block = {
    object: "block",
    type: "toggle",
    toggle: {
      rich_text: parseRichText(titleText),
      children: children.length > 0 ? children : [{
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content: "" } }] }
      }]
    }
  };

  return { block, nextIndex };
}

// Parse a single line into a block (non-toggle, non-code, non-table)
function parseSingleLine(stripped) {
  // Divider
  if (stripped === "---" || stripped === "***" || stripped === "___") {
    return {
      object: "block",
      type: "divider",
      divider: {}
    };
  }

  // Checkbox / To-do
  if (stripped.startsWith("- [x] ") || stripped.startsWith("- [X] ")) {
    return {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: parseRichText(stripped.slice(6)),
        checked: true
      }
    };
  }
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

  // Callout (emoji at start followed by space)
  const calloutMatch = stripped.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|💡|📌|⚠️|❗|✅|❌|📝|🔥|💪|🎯|📚|🔗|💻|🛠️|📋|🚀|💬|📢|🔔|⭐|❓|❔|🤔|💭)\s+(.+)$/u);
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

  // Quote (blockquote) - but not toggle inside quote
  if (stripped.startsWith("> ") && !stripped.startsWith("> ▶")) {
    return {
      object: "block",
      type: "quote",
      quote: {
        rich_text: parseRichText(stripped.slice(2))
      }
    };
  }

  // Headings
  if (stripped.startsWith("# ")) {
    return {
      object: "block",
      type: "heading_1",
      heading_1: { rich_text: parseRichText(stripped.slice(2)) }
    };
  }
  if (stripped.startsWith("## ")) {
    return {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: parseRichText(stripped.slice(3)) }
    };
  }
  if (stripped.startsWith("### ")) {
    return {
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: parseRichText(stripped.slice(4)) }
    };
  }

  // Bullet list
  if (stripped.startsWith("- ") || stripped.startsWith("* ")) {
    return {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: parseRichText(stripped.slice(2)) }
    };
  }

  // Numbered list
  if (/^\d+\.\s/.test(stripped)) {
    const text = stripped.replace(/^\d+\.\s/, "");
    return {
      object: "block",
      type: "numbered_list_item",
      numbered_list_item: { rich_text: parseRichText(text) }
    };
  }

  // Bookmark / Link (standalone URL or [text](url) on its own line)
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

  // Standalone URL as bookmark
  const urlMatch = stripped.match(/^(https?:\/\/[^\s]+)$/);
  if (urlMatch) {
    return {
      object: "block",
      type: "bookmark",
      bookmark: {
        url: urlMatch[1],
        caption: []
      }
    };
  }

  // Paragraph (default)
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: parseRichText(stripped) }
  };
}

// Parse markdown content to Notion blocks
function parseContentToBlocks(content) {
  const blocks = [];
  const lines = content.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trim();
    const currentIndent = line.search(/\S|$/);

    if (!stripped) {
      i++;
      continue;
    }

    // Code block
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
        blocks.push({
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

    // Table
    if (stripped.startsWith("|") && stripped.endsWith("|")) {
      const tableRows = [];

      while (i < lines.length) {
        const rowLine = lines[i].trim();
        if (!(rowLine.startsWith("|") && rowLine.endsWith("|"))) break;

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
        if (tableBlock) blocks.push(tableBlock);
      }
      continue;
    }

    // Toggle block (▶ marker)
    if (stripped.startsWith("▶ ")) {
      const toggleText = stripped.slice(2);
      const { block, nextIndex } = parseToggleBlock(lines, i, currentIndent, toggleText);
      blocks.push(block);
      i = nextIndex;
      continue;
    }

    // All other single-line blocks
    const block = parseSingleLine(stripped);
    if (block) {
      blocks.push(block);
    }

    i++;
  }

  return blocks;
}

// Get database pages
async function getDatabasePages() {
  const response = await notion.databases.query({
    database_id: databaseId,
    page_size: 100
  });

  return response.results.map(page => {
    const props = page.properties;
    return {
      id: page.id,
      url: page.url,
      title: props["이름"]?.title?.[0]?.plain_text || "제목 없음",
      status: props["상태"]?.status?.name || null,
      category: props["선택"]?.select?.name || null,
      tags: props["다중 선택"]?.multi_select?.map(t => t.name) || [],
      date: props["날짜"]?.date?.start || null,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time
    };
  });
}

// Recursively get all blocks including children (for toggle, etc.)
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

// Get page content (blocks)
async function getPageContent(pageId) {
  // Get page properties
  const page = await notion.pages.retrieve({ page_id: pageId });

  // Get page blocks (content) with children
  const blocks = await getAllBlocksWithChildren(pageId);

  return {
    id: page.id,
    url: page.url,
    title: page.properties["이름"]?.title?.[0]?.plain_text || "제목 없음",
    status: page.properties["상태"]?.status?.name || null,
    category: page.properties["선택"]?.select?.name || null,
    tags: page.properties["다중 선택"]?.multi_select?.map(t => t.name) || [],
    content: blocksToMarkdown(blocks)
  };
}

// Convert Notion blocks to Markdown
function blocksToMarkdown(blocks, indent = 0) {
  const indentStr = "  ".repeat(indent);

  return blocks.map(block => {
    const type = block.type;
    let content = "";

    switch (type) {
      case "paragraph":
        content = indentStr + richTextToMarkdown(block.paragraph.rich_text);
        break;
      case "heading_1":
        content = indentStr + "# " + richTextToMarkdown(block.heading_1.rich_text);
        break;
      case "heading_2":
        content = indentStr + "## " + richTextToMarkdown(block.heading_2.rich_text);
        break;
      case "heading_3":
        content = indentStr + "### " + richTextToMarkdown(block.heading_3.rich_text);
        break;
      case "bulleted_list_item":
        content = indentStr + "- " + richTextToMarkdown(block.bulleted_list_item.rich_text);
        break;
      case "numbered_list_item":
        content = indentStr + "1. " + richTextToMarkdown(block.numbered_list_item.rich_text);
        break;
      case "code":
        const lang = block.code.language || "plain text";
        const code = richTextToMarkdown(block.code.rich_text);
        content = indentStr + "```" + lang + "\n" + code + "\n" + indentStr + "```";
        break;
      case "table":
        content = indentStr + "[테이블]";
        break;
      case "toggle":
        // Toggle header with ▶ marker
        content = indentStr + "▶ " + richTextToMarkdown(block.toggle.rich_text);
        break;
      case "divider":
        content = indentStr + "---";
        break;
      case "quote":
        content = indentStr + "> " + richTextToMarkdown(block.quote.rich_text);
        break;
      case "callout":
        const icon = block.callout.icon?.emoji || "💡";
        content = indentStr + icon + " " + richTextToMarkdown(block.callout.rich_text);
        break;
      case "to_do":
        const checked = block.to_do.checked ? "[x]" : "[ ]";
        content = indentStr + "- " + checked + " " + richTextToMarkdown(block.to_do.rich_text);
        break;
      default:
        content = "";
    }

    // Process children if exist (for toggle, etc.)
    if (block.children && block.children.length > 0) {
      const childContent = blocksToMarkdown(block.children, indent + 1);
      if (childContent) {
        content += "\n" + childContent;
      }
    }

    return content;
  }).filter(line => line !== "").join("\n\n");
}

// Convert rich text to Markdown
function richTextToMarkdown(richText) {
  if (!richText || !richText.length) return "";

  return richText.map(rt => {
    let text = rt.plain_text || "";
    const ann = rt.annotations || {};

    if (ann.code) text = "`" + text + "`";
    if (ann.bold) text = "**" + text + "**";
    if (ann.italic) text = "*" + text + "*";
    if (ann.strikethrough) text = "~~" + text + "~~";

    return text;
  }).join("");
}

// Update page content
async function updatePageContent(pageId, newContent) {
  // Delete existing blocks
  const existingBlocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100
  });

  for (const block of existingBlocks.results) {
    await notion.blocks.delete({ block_id: block.id });
  }

  // Add new blocks
  const newBlocks = parseContentToBlocks(newContent);

  if (newBlocks.length > 0) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: newBlocks
    });
  }

  const page = await notion.pages.retrieve({ page_id: pageId });
  return page.url;
}

// Update page properties
async function updatePageProperties(pageId, title = null, category = null, tags = null, status = null) {
  const properties = {};

  if (title) {
    properties["이름"] = { title: [{ text: { content: title } }] };
  }
  if (status) {
    properties["상태"] = { status: { name: status } };
  }
  if (category) {
    properties["선택"] = { select: { name: category } };
  }
  if (tags && tags.length) {
    properties["다중 선택"] = { multi_select: tags.map(tag => ({ name: tag })) };
  }

  const page = await notion.pages.update({
    page_id: pageId,
    properties
  });

  return page.url;
}

// Create Notion page
async function createNotionPage(title, content, category = null, tags = null, status = null) {
  const properties = {
    "이름": {
      title: [{ text: { content: title } }]
    },
    "날짜": {
      date: { start: new Date().toISOString() }
    }
  };

  if (status) {
    properties["상태"] = { status: { name: status } };
  }

  if (category) {
    properties["선택"] = { select: { name: category } };
  }

  if (tags && tags.length) {
    properties["다중 선택"] = {
      multi_select: tags.map(tag => ({ name: tag }))
    };
  }

  const children = parseContentToBlocks(content);

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
    children
  });

  return page.url;
}

// Setup MCP server
const server = new Server(
  { name: "notion-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "add_to_notion",
      description: "마크다운 내용을 노션 데이터베이스에 새 페이지로 추가합니다. 제목과 내용을 받아 노션 페이지를 생성하고 URL을 반환합니다.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "페이지 제목" },
          content: { type: "string", description: "마크다운 형식의 본문 내용" },
          category: { type: "string", description: "카테고리 (선택사항)" },
          tags: { type: "array", items: { type: "string" }, description: "태그 목록 (선택사항)" },
          status: { type: "string", description: "상태 (선택사항)" }
        },
        required: ["title", "content"]
      }
    },
    {
      name: "get_database",
      description: "노션 데이터베이스의 모든 페이지 목록을 조회합니다. 각 페이지의 제목, 상태, 카테고리, 태그 등 메타정보를 반환합니다.",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_page",
      description: "특정 노션 페이지의 내용을 읽어옵니다. 페이지 ID를 받아 제목, 속성, 본문 내용(마크다운)을 반환합니다.",
      inputSchema: {
        type: "object",
        properties: {
          page_id: { type: "string", description: "노션 페이지 ID (32자리 또는 하이픈 포함 형식)" }
        },
        required: ["page_id"]
      }
    },
    {
      name: "update_page",
      description: "기존 노션 페이지의 내용을 수정합니다. 본문 내용, 제목, 카테고리, 태그, 상태를 변경할 수 있습니다.",
      inputSchema: {
        type: "object",
        properties: {
          page_id: { type: "string", description: "수정할 노션 페이지 ID" },
          content: { type: "string", description: "새로운 마크다운 본문 내용 (선택사항)" },
          title: { type: "string", description: "새로운 제목 (선택사항)" },
          category: { type: "string", description: "새로운 카테고리 (선택사항)" },
          tags: { type: "array", items: { type: "string" }, description: "새로운 태그 목록 (선택사항)" },
          status: { type: "string", description: "새로운 상태 (선택사항)" }
        },
        required: ["page_id"]
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "add_to_notion") {
      const { title, content, category, tags, status } = args;
      const url = await createNotionPage(title, content, category, tags, status);
      return {
        content: [{ type: "text", text: `노션 페이지가 생성되었습니다!\nURL: ${url}` }]
      };
    }

    if (name === "get_database") {
      const pages = await getDatabasePages();
      const summary = pages.map((p, i) =>
        `${i + 1}. **${p.title}**\n   - ID: ${p.id}\n   - 상태: ${p.status || "없음"}\n   - 카테고리: ${p.category || "없음"}\n   - 태그: ${p.tags.length ? p.tags.join(", ") : "없음"}`
      ).join("\n\n");

      return {
        content: [{
          type: "text",
          text: `데이터베이스에 ${pages.length}개의 페이지가 있습니다.\n\n${summary}`
        }]
      };
    }

    if (name === "get_page") {
      const { page_id } = args;
      const page = await getPageContent(page_id);

      return {
        content: [{
          type: "text",
          text: `## ${page.title}\n\n**상태:** ${page.status || "없음"}\n**카테고리:** ${page.category || "없음"}\n**태그:** ${page.tags.length ? page.tags.join(", ") : "없음"}\n\n---\n\n${page.content || "(내용 없음)"}\n\n---\nURL: ${page.url}`
        }]
      };
    }

    if (name === "update_page") {
      const { page_id, content, title, category, tags, status } = args;
      let url;

      // Update content if provided
      if (content) {
        url = await updatePageContent(page_id, content);
      }

      // Update properties if any provided
      if (title || category || tags || status) {
        url = await updatePageProperties(page_id, title, category, tags, status);
      }

      if (!url) {
        // If nothing to update, just get the page URL
        const page = await notion.pages.retrieve({ page_id });
        url = page.url;
      }

      return {
        content: [{ type: "text", text: `페이지가 수정되었습니다!\nURL: ${url}` }]
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `오류 발생: ${error.message}` }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Notion MCP server running...");
}

main().catch(console.error);
