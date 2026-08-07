# scripts/convert_excel_to_json.py
import pandas as pd
import json
import sys
import os

def convert_excel_to_json(excel_path, output_json_path):
    if not os.path.exists(excel_path):
        print(f"エラー: {excel_path} が見つかりません。")
        return

    try:
        xl = pd.ExcelFile(excel_path)
        sheet_name = "機能一覧" if "機能一覧" in xl.sheet_names else xl.sheet_names[0]
        df = pd.read_excel(excel_path, sheet_name=sheet_name, header=1)

        cases = []
        for idx, row in df.iterrows():
            raw_id = row.get("ID")
            if pd.isna(raw_id):
                continue

            try:
                case_id = f"TC-{int(raw_id):03d}"
            except (ValueError, TypeError):
                case_id = str(raw_id).strip()

            case = {
                "id": case_id,
                "screen": "" if pd.isna(row.get("画面")) else str(row.get("画面")).strip(),
                "feature": "" if pd.isna(row.get("機能")) else str(row.get("機能")).strip(),
                "priority": "" if pd.isna(row.get("重要度")) else str(row.get("重要度")).strip(),
                "precondition": "" if pd.isna(row.get("前提条件")) else str(row.get("前提条件")).strip(),
                "steps": "" if pd.isna(row.get("確認手順")) else str(row.get("確認手順")).strip(),
                "expected": "" if pd.isna(row.get("確認内容")) else str(row.get("確認内容")).strip(),
                "defaultTester": "" if pd.isna(row.get("実施者")) else str(row.get("実施者")).strip(),
                "remark": "" if pd.isna(row.get("備考")) else str(row.get("備考")).strip()
            }
            cases.append(case)

        os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(cases, f, ensure_ascii=False, indent=2)

        print(f"成功: {len(cases)} 件のテストケースを出力しました。")

    except Exception as e:
        print(f"変換エラー: {e}")

if __name__ == "__main__":
    excel_file = sys.argv[1] if len(sys.argv) > 1 else "test_cases.xlsx"
    target_json = os.path.join(os.path.dirname(__file__), "../data/cases.json")
    convert_excel_to_json(excel_file, target_json)