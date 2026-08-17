# scripts/convert_excel_to_json.py
import pandas as pd
import json
import sys
import os


def find_default_excel(base_dir):
    candidates = []
    for entry in os.listdir(base_dir):
        if entry.lower().endswith('.xlsx'):
            candidates.append(os.path.join(base_dir, entry))

    if not candidates:
        return os.path.join(base_dir, 'test_cases.xlsx')

    # できるだけスルーテスト関連のファイルを優先し、それ以外は最初の xlsx を採用
    preferred = [p for p in candidates if 'スルーテスト' in os.path.basename(p) or 'test' in os.path.basename(p).lower()]
    return preferred[0] if preferred else candidates[0]


def convert_excel_to_json(excel_path, output_json_path):
    if not os.path.exists(excel_path):
        print(f"エラー: {excel_path} が見つかりません。")
        return

    try:
        xl = pd.ExcelFile(excel_path)
        sheet_name = "機能一覧" if "機能一覧" in xl.sheet_names else xl.sheet_names[0]

        raw_df = pd.read_excel(excel_path, sheet_name=sheet_name, header=None)

        header_row_idx = None
        for idx, row in raw_df.iterrows():
            row_str = " ".join([str(val) for val in row.values if not pd.isna(val)])
            if "ID" in row_str and ("確認手順" in row_str or "確認内容" in row_str or "重要度" in row_str):
                header_row_idx = idx
                break

        if header_row_idx is None:
            header_row_idx = 1

        df = pd.read_excel(excel_path, sheet_name=sheet_name, header=header_row_idx)

        # テキスト整形関数（改行コードの統一）
        def get_cell_value(row, keywords):
            for col in row.index:
                col_str = str(col).strip()
                for kw in keywords:
                    if kw in col_str:
                        val = row[col]
                        if not pd.isna(val) and str(val).strip() != "" and str(val).strip().lower() != "nan":
                            # \r\n や \r を \n に統一してトリム
                            return str(val).replace('\r\n', '\n').replace('\r', '\n').strip()
            return ""

        cases = []
        for idx, row in df.iterrows():
            case_id_val = get_cell_value(row, ["ID", "ＩＤ"])
            if not case_id_val:
                continue

            try:
                case_id = f"TC-{int(float(case_id_val)):03d}"
            except (ValueError, TypeError):
                case_id = case_id_val

            case = {
                "id": case_id,
                "screen": get_cell_value(row, ["画面"]),
                "feature": get_cell_value(row, ["機能"]),
                "priority": get_cell_value(row, ["重要度", "優先度", "Priority"]),
                "precondition": get_cell_value(row, ["前提条件", "前提"]),
                "steps": get_cell_value(row, ["確認手順", "手順", "操作手順"]),
                "expected": get_cell_value(row, ["確認内容", "期待結果", "期待値"]),
                "defaultTester": get_cell_value(row, ["実施者", "担当者"]),
                "remark": get_cell_value(row, ["備考", "バグ情報", "メモ"])
            }
            cases.append(case)

        os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(cases, f, ensure_ascii=False, indent=2)

        print(f"成功: シート [{sheet_name}] から {len(cases)} 件のテストケースを出力しました。")

    except Exception as e:
        print(f"変換エラーが発生しました: {e}")

if __name__ == "__main__":
    project_root = os.path.dirname(os.path.dirname(__file__))
    excel_file = sys.argv[1] if len(sys.argv) > 1 else find_default_excel(project_root)
    target_json = os.path.join(project_root, "data", "cases.json")
    convert_excel_to_json(excel_file, target_json)