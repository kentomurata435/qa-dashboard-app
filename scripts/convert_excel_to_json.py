import pandas as pd
import json
import os

"""
添付のExcelファイル(500件超)から cases.json を自動生成するスクリプトです。
使い方:
  pip install pandas openpyxl
  python scripts/convert_excel_to_json.py <Excelファイルのパス>
"""

def convert_excel_to_json(excel_path, output_json_path):
    if not os.path.exists(excel_path):
        print(f"Error: {excel_path} が見つかりません。")
        return

    # Excelファイルの読み込み
    df = pd.read_excel(excel_path)

    # 想定カラム: 'ID', 'Category', 'Title', 'Description' (Excelの列名に合わせて調整)
    cases = []
    for idx, row in df.iterrows():
        case = {
            "id": str(row.get("ID", f"TC-{idx+1:03d}")),
            "category": str(row.get("Category", "General")),
            "title": str(row.get("Title", "")),
            "description": str(row.get("Description", ""))
        }
        cases.append(case)

    # JSON出力
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(cases, f, ensure_ascii=False, indent=2)

    print(f"成功: {len(cases)} 件のテストマスターデータを {output_json_path} に変換・出力しました。")

if __name__ == "__main__":
    import sys
    excel_file = sys.argv[1] if len(sys.argv) > 1 else "test_cases.xlsx"
    target_json = os.path.join(os.path.dirname(__file__), "../data/cases.json")
    convert_excel_to_json(excel_file, target_json)
