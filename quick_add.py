#!/usr/bin/env python3
"""
빠른 노션 추가 스크립트 - Claude Code 연동용
첫 번째 인자: 제목
두 번째 인자: 내용 (마크다운)
"""
import sys
import os

# 프로젝트 경로 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from notion_helper import NotionHelper


def quick_add(title: str, content: str):
    """노션에 빠르게 추가"""
    try:
        client = NotionHelper()
        url = client.create_page(title=title, content=content)
        print(f"✅ 노션 페이지 생성 완료: {url}")
        return url
    except Exception as e:
        print(f"❌ 오류: {e}")
        return None


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        title = sys.argv[1]
        content = sys.argv[2]
        quick_add(title, content)
    elif len(sys.argv) == 2 and sys.argv[1] == "--file":
        print("❌ 파일 경로를 지정하세요")
    elif len(sys.argv) == 3 and sys.argv[1] == "--file":
        filepath = sys.argv[2]
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            lines = content.split('\n', 1)
            title = lines[0].strip().lstrip('#').strip()
            body = lines[1] if len(lines) > 1 else ""
            quick_add(title, body)
        else:
            print(f"❌ 파일 없음: {filepath}")
    else:
        print("사용법: python quick_add.py '제목' '내용'")
        print("      python quick_add.py --file 파일.md")
