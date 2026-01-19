"""
노션 API 클라이언트
"""
import os
import re
from datetime import datetime
from typing import List, Dict, Optional
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()


class NotionHelper:
    """노션 API 클라이언트"""

    def __init__(self):
        self.api_key = os.getenv("NOTION_API_KEY")
        self.database_id = os.getenv("NOTION_DATABASE_ID")

        if not self.api_key:
            raise ValueError("NOTION_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")
        if not self.database_id:
            raise ValueError("NOTION_DATABASE_ID가 설정되지 않았습니다. .env 파일을 확인하세요.")

        self.client = Client(auth=self.api_key)

    def get_reference_pages(self, page_ids: List[str]) -> List[Dict]:
        """기존 페이지 내용 가져오기 (스타일 참고용)"""
        pages = []
        for page_id in page_ids:
            try:
                page = self.client.pages.retrieve(page_id=page_id)
                blocks = self.client.blocks.children.list(block_id=page_id)
                pages.append({
                    "properties": page["properties"],
                    "blocks": blocks["results"]
                })
            except Exception as e:
                print(f"⚠️  페이지 {page_id} 읽기 실패: {str(e)}")
        return pages

    def create_page(
        self,
        title: str,
        content: str,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        status: Optional[str] = None
    ) -> str:
        """노션 데이터베이스에 새 페이지 생성"""

        # 속성 구성 (실제 DB 속성명에 맞춤)
        properties = {
            "이름": {
                "title": [
                    {
                        "text": {
                            "content": title
                        }
                    }
                ]
            },
            "날짜": {
                "date": {
                    "start": datetime.now().isoformat()
                }
            }
        }

        # 선택사항: 상태
        if status:
            properties["상태"] = {
                "status": {
                    "name": status
                }
            }

        # 선택사항: 카테고리 → 선택
        if category:
            properties["선택"] = {
                "select": {
                    "name": category
                }
            }

        # 선택사항: 태그 → 다중 선택
        if tags:
            properties["다중 선택"] = {
                "multi_select": [{"name": tag} for tag in tags]
            }

        # 본문 블록 구성
        children = self._parse_content_to_blocks(content)

        # 페이지 생성
        try:
            page = self.client.pages.create(
                parent={"database_id": self.database_id},
                properties=properties,
                children=children
            )
            return page["url"]
        except Exception as e:
            raise Exception(f"노션 페이지 생성 실패: {str(e)}")

    def _parse_content_to_blocks(self, content: str) -> List[Dict]:
        """텍스트를 노션 블록으로 변환"""
        blocks = []
        lines = content.strip().split('\n')

        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            # 빈 줄 건너뛰기
            if not stripped:
                i += 1
                continue

            # 코드 블록 감지 (```로 시작)
            if stripped.startswith('```'):
                # 언어 추출 (```python, ```js 등)
                language = stripped[3:].strip() or "plain text"
                code_lines = []
                i += 1

                # 닫는 ``` 찾기
                while i < len(lines):
                    if lines[i].strip() == '```':
                        i += 1
                        break
                    code_lines.append(lines[i])
                    i += 1

                code_content = '\n'.join(code_lines)
                if code_content:
                    blocks.append({
                        "object": "block",
                        "type": "code",
                        "code": {
                            "rich_text": [{"type": "text", "text": {"content": code_content}}],
                            "language": self._map_language(language)
                        }
                    })
                continue

            # 테이블 감지 (|로 시작하고 |로 끝남)
            if stripped.startswith('|') and stripped.endswith('|'):
                table_rows = []

                # 테이블 행 수집
                while i < len(lines):
                    row_line = lines[i].strip()
                    if not (row_line.startswith('|') and row_line.endswith('|')):
                        break

                    # 구분선(|---|---|) 건너뛰기
                    if self._is_table_separator(row_line):
                        i += 1
                        continue

                    # 셀 파싱
                    cells = [cell.strip() for cell in row_line.split('|')[1:-1]]
                    table_rows.append(cells)
                    i += 1

                # 테이블 블록 생성
                if table_rows:
                    table_block = self._create_table_block(table_rows)
                    blocks.append(table_block)
                continue

            # 헤더 감지
            if stripped.startswith('# '):
                blocks.append({
                    "object": "block",
                    "type": "heading_1",
                    "heading_1": {
                        "rich_text": self._parse_rich_text(stripped[2:])
                    }
                })
            elif stripped.startswith('## '):
                blocks.append({
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": self._parse_rich_text(stripped[3:])
                    }
                })
            elif stripped.startswith('### '):
                blocks.append({
                    "object": "block",
                    "type": "heading_3",
                    "heading_3": {
                        "rich_text": self._parse_rich_text(stripped[4:])
                    }
                })
            elif stripped.startswith('- ') or stripped.startswith('* '):
                # 리스트
                blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": self._parse_rich_text(stripped[2:])
                    }
                })
            elif stripped.startswith('1. ') or (len(stripped) > 2 and stripped[0].isdigit() and stripped[1] == '.'):
                # 숫자 리스트
                text = stripped.split('. ', 1)[1] if '. ' in stripped else stripped
                blocks.append({
                    "object": "block",
                    "type": "numbered_list_item",
                    "numbered_list_item": {
                        "rich_text": self._parse_rich_text(text)
                    }
                })
            else:
                # 일반 텍스트
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": self._parse_rich_text(stripped)
                    }
                })

            i += 1

        return blocks

    def _parse_rich_text(self, text: str) -> List[Dict]:
        """마크다운 인라인 서식을 노션 rich_text로 변환"""
        rich_text = []

        # 패턴: **굵게**, *기울임*, `코드`, ~~취소선~~
        pattern = r'(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|~~(.+?)~~)'

        last_end = 0
        for match in re.finditer(pattern, text):
            # 매치 이전 일반 텍스트
            if match.start() > last_end:
                plain_text = text[last_end:match.start()]
                if plain_text:
                    rich_text.append({
                        "type": "text",
                        "text": {"content": plain_text}
                    })

            full_match = match.group(0)

            if full_match.startswith('**') and full_match.endswith('**'):
                # 굵게
                content = match.group(2)
                rich_text.append({
                    "type": "text",
                    "text": {"content": content},
                    "annotations": {"bold": True}
                })
            elif full_match.startswith('~~') and full_match.endswith('~~'):
                # 취소선
                content = match.group(5)
                rich_text.append({
                    "type": "text",
                    "text": {"content": content},
                    "annotations": {"strikethrough": True}
                })
            elif full_match.startswith('`') and full_match.endswith('`'):
                # 인라인 코드
                content = match.group(4)
                rich_text.append({
                    "type": "text",
                    "text": {"content": content},
                    "annotations": {"code": True}
                })
            elif full_match.startswith('*') and full_match.endswith('*'):
                # 기울임
                content = match.group(3)
                rich_text.append({
                    "type": "text",
                    "text": {"content": content},
                    "annotations": {"italic": True}
                })

            last_end = match.end()

        # 마지막 남은 텍스트
        if last_end < len(text):
            remaining = text[last_end:]
            if remaining:
                rich_text.append({
                    "type": "text",
                    "text": {"content": remaining}
                })

        # 매치가 없으면 원본 텍스트 반환
        if not rich_text:
            rich_text.append({
                "type": "text",
                "text": {"content": text}
            })

        return rich_text

    def _is_table_separator(self, line: str) -> bool:
        """테이블 구분선인지 확인 (|---|---|)"""
        cells = line.split('|')[1:-1]
        for cell in cells:
            cell = cell.strip()
            # :---:, :---, ---:, --- 형태 허용
            cleaned = cell.replace('-', '').replace(':', '')
            if cleaned != '':
                return False
        return True

    def _create_table_block(self, rows: List[List[str]]) -> Dict:
        """테이블 블록 생성"""
        if not rows:
            return {}

        table_width = max(len(row) for row in rows)

        # 테이블 행 생성
        table_rows = []
        for row in rows:
            # 열 개수 맞추기
            while len(row) < table_width:
                row.append('')

            # 각 셀에 서식 적용
            cells = [self._parse_rich_text(cell_text) for cell_text in row]

            table_rows.append({
                "object": "block",
                "type": "table_row",
                "table_row": {
                    "cells": cells
                }
            })

        return {
            "object": "block",
            "type": "table",
            "table": {
                "table_width": table_width,
                "has_column_header": True,
                "has_row_header": False,
                "children": table_rows
            }
        }

    def _map_language(self, lang: str) -> str:
        """마크다운 언어를 노션 언어로 매핑"""
        # 노션에서 지원하는 언어 목록
        supported_languages = {
            "abap", "abc", "agda", "arduino", "ascii art", "assembly", "bash", "basic",
            "bnf", "c", "c#", "c++", "clojure", "coffeescript", "coq", "css", "dart",
            "dhall", "diff", "docker", "ebnf", "elixir", "elm", "erlang", "f#", "flow",
            "fortran", "gherkin", "glsl", "go", "graphql", "groovy", "haskell", "hcl",
            "html", "idris", "java", "javascript", "json", "julia", "kotlin", "latex",
            "less", "lisp", "livescript", "llvm ir", "lua", "makefile", "markdown",
            "markup", "matlab", "mathematica", "mermaid", "nix", "notion formula",
            "objective-c", "ocaml", "pascal", "perl", "php", "plain text", "powershell",
            "prolog", "protobuf", "purescript", "python", "r", "racket", "reason", "ruby",
            "rust", "sass", "scala", "scheme", "scss", "shell", "smalltalk", "solidity",
            "sql", "swift", "toml", "typescript", "vb.net", "verilog", "vhdl",
            "visual basic", "webassembly", "xml", "yaml", "java/c/c++/c#"
        }

        # 별칭 매핑
        language_map = {
            "js": "javascript",
            "ts": "typescript",
            "py": "python",
            "rb": "ruby",
            "sh": "bash",
            "yml": "yaml",
            "md": "markdown",
            "mgt": "plain text",  # MIDAS MGT 형식
            "txt": "plain text",
            "text": "plain text",
            "": "plain text",
        }

        lang_lower = lang.lower()
        mapped = language_map.get(lang_lower, lang_lower)

        # 지원하지 않는 언어는 plain text로 변환
        if mapped not in supported_languages:
            return "plain text"
        return mapped

    def get_database_info(self) -> Dict:
        """데이터베이스 정보 조회"""
        try:
            return self.client.databases.retrieve(database_id=self.database_id)
        except Exception as e:
            raise Exception(f"데이터베이스 정보 조회 실패: {str(e)}")
