#!/usr/bin/env python3
"""
노션 프로젝트 문서 추가 스크립트

사용법:
    python add_to_notion.py                          # 대화형
    python add_to_notion.py "제목" "내용"            # 인라인
    python add_to_notion.py --file today.txt        # 파일
"""
import sys
import os
from typing import Optional, List
from notion_helper import NotionHelper


def print_banner():
    """배너 출력"""
    print("=" * 60)
    print("📝 노션 프로젝트 문서 자동화")
    print("=" * 60)
    print()


def interactive_mode():
    """대화형 모드"""
    print("📌 프로젝트 정보를 입력하세요 (Enter만 누르면 건너뛰기)")
    print()

    # 필수 입력
    title = input("제목 (필수): ").strip()
    if not title:
        print("❌ 제목은 필수입니다.")
        return

    print("\n내용을 입력하세요 (여러 줄 가능, Ctrl+Z(Windows) 또는 Ctrl+D(Unix) 후 Enter로 종료):")
    content_lines = []
    try:
        while True:
            line = input()
            content_lines.append(line)
    except EOFError:
        pass

    content = "\n".join(content_lines).strip()
    if not content:
        print("❌ 내용은 필수입니다.")
        return

    # 선택 입력
    category = input("\n카테고리 (선택, 예: 백엔드/프론트엔드/인프라): ").strip() or None
    tags_input = input("태그 (선택, 콤마로 구분, 예: FastAPI,Python): ").strip()
    tags = [t.strip() for t in tags_input.split(",")] if tags_input else None
    status = input("상태 (선택, 기본값: 진행중): ").strip() or "진행중"

    # 노션에 추가
    add_to_notion(title, content, category, tags, status)


def inline_mode(title: str, content: str):
    """인라인 모드"""
    add_to_notion(title, content)


def file_mode(filepath: str):
    """파일 모드"""
    if not os.path.exists(filepath):
        print(f"❌ 파일을 찾을 수 없습니다: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read().strip()

    # 첫 줄을 제목으로 사용
    lines = content.split('\n', 1)
    title = lines[0].strip()
    content = lines[1].strip() if len(lines) > 1 else ""

    if not title or not content:
        print("❌ 파일 형식 오류: 첫 줄은 제목, 이후는 내용이어야 합니다.")
        return

    add_to_notion(title, content)


def add_to_notion(
    title: str,
    content: str,
    category: Optional[str] = None,
    tags: Optional[List[str]] = None,
    status: Optional[str] = None
):
    """노션에 페이지 추가"""
    try:
        print("\n🔄 노션에 추가 중...")

        client = NotionHelper()
        url = client.create_page(
            title=title,
            content=content,
            category=category,
            tags=tags,
            status=status
        )

        print("\n✅ 노션 페이지 생성 완료!")
        print(f"📍 URL: {url}")
        print()

    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")
        print("\n💡 문제 해결:")
        print("  1. .env 파일의 NOTION_API_KEY 확인")
        print("  2. .env 파일의 NOTION_DATABASE_ID 확인")
        print("  3. 노션 페이지에 통합 연결 여부 확인")
        print()


def main():
    """메인 함수"""
    print_banner()

    # 인자 파싱
    args = sys.argv[1:]

    if not args:
        # 대화형 모드
        interactive_mode()
    elif args[0] == "--file":
        # 파일 모드
        if len(args) < 2:
            print("❌ 파일 경로를 지정해주세요: python add_to_notion.py --file <filepath>")
            return
        file_mode(args[1])
    elif len(args) >= 2:
        # 인라인 모드
        title = args[0]
        content = " ".join(args[1:])
        inline_mode(title, content)
    else:
        print("❌ 사용법:")
        print("  python add_to_notion.py                    # 대화형")
        print("  python add_to_notion.py '제목' '내용'      # 인라인")
        print("  python add_to_notion.py --file today.txt   # 파일")


if __name__ == "__main__":
    main()
