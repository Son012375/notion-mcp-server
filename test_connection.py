#!/usr/bin/env python3
"""
노션 연결 테스트 스크립트
설정이 올바른지 확인
"""
import os
from dotenv import load_dotenv
from notion_helper import NotionHelper

load_dotenv()


def test_connection():
    """노션 연결 테스트"""
    print("=" * 60)
    print("🔍 노션 연결 테스트")
    print("=" * 60)
    print()

    # 1. 환경 변수 확인
    print("1️⃣  환경 변수 확인...")
    api_key = os.getenv("NOTION_API_KEY")
    database_id = os.getenv("NOTION_DATABASE_ID")

    if not api_key:
        print("❌ NOTION_API_KEY가 설정되지 않았습니다.")
        print("💡 .env 파일을 확인하세요.")
        return False

    if not database_id:
        print("❌ NOTION_DATABASE_ID가 설정되지 않았습니다.")
        print("💡 .env 파일을 확인하세요.")
        return False

    print(f"✅ API Key: {api_key[:10]}...")
    print(f"✅ Database ID: {database_id}")
    print()

    # 2. 노션 클라이언트 생성
    print("2️⃣  노션 클라이언트 초기화...")
    try:
        client = NotionHelper()
        print("✅ 클라이언트 생성 성공")
        print()
    except Exception as e:
        print(f"❌ 클라이언트 생성 실패: {str(e)}")
        return False

    # 3. 데이터베이스 정보 조회
    print("3️⃣  데이터베이스 정보 조회...")
    try:
        db_info = client.get_database_info()
        print("✅ 데이터베이스 접근 성공")
        print(f"   이름: {db_info.get('title', [{}])[0].get('text', {}).get('content', 'N/A')}")
        print()

        # 속성 확인
        print("📋 데이터베이스 속성:")
        for prop_name, prop_info in db_info.get('properties', {}).items():
            prop_type = prop_info.get('type')
            print(f"   - {prop_name}: {prop_type}")
        print()

    except Exception as e:
        print(f"❌ 데이터베이스 접근 실패: {str(e)}")
        print()
        print("💡 가능한 원인:")
        print("   1. 데이터베이스 ID가 잘못됨")
        print("   2. 통합이 페이지에 연결되지 않음")
        print("   3. 권한 부족")
        return False

    # 4. 테스트 페이지 생성
    print("4️⃣  테스트 페이지 생성...")
    try:
        from datetime import datetime
        test_title = f"연결 테스트 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        test_content = "이 페이지는 연결 테스트를 위해 자동 생성되었습니다.\n\n삭제하셔도 됩니다."

        url = client.create_page(
            title=test_title,
            content=test_content
        )

        print("✅ 테스트 페이지 생성 성공")
        print(f"📍 URL: {url}")
        print()

    except Exception as e:
        print(f"❌ 페이지 생성 실패: {str(e)}")
        return False

    # 성공
    print("=" * 60)
    print("🎉 모든 테스트 통과!")
    print("=" * 60)
    print()
    print("✅ 노션 자동화 시스템이 정상 작동합니다.")
    print("💡 이제 add_to_notion.py를 사용하여 문서를 추가할 수 있습니다.")
    print()

    return True


if __name__ == "__main__":
    success = test_connection()
    exit(0 if success else 1)
