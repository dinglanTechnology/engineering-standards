#!/usr/bin/env bash
# 一次性把版本号同步到全部 4 个清单文件（Claude 两份 + Cursor 两份）。
# 用法: scripts/bump-version.sh 1.2.0
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "用法: $0 <new-version>   例: $0 1.2.0" >&2
  exit 1
fi

NEW="$1"
# 校验语义化版本格式 X.Y.Z
if ! [[ "$NEW" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "错误: 版本号须是 X.Y.Z 格式（拿到的是 '$NEW'）" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

FILES=(
  ".claude-plugin/plugin.json"
  ".claude-plugin/marketplace.json"
  ".cursor-plugin/plugin.json"
  ".cursor-plugin/marketplace.json"
)

for rel in "${FILES[@]}"; do
  f="$ROOT/$rel"
  NEW="$NEW" python3 - "$f" <<'PY'
import json, os, sys
path = sys.argv[1]
new = os.environ["NEW"]
with open(path, encoding="utf-8") as fh:
    data = json.load(fh)
# plugin.json: 顶层 version；marketplace.json: 每个 plugins[].version
if "version" in data:
    data["version"] = new
for p in data.get("plugins", []):
    p["version"] = new
with open(path, "w", encoding="utf-8") as fh:
    json.dump(data, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
PY
  echo "  ✓ $rel -> $NEW"
done

echo "全部 4 个清单已更新到 v$NEW。记得提交并推送，用户侧再 /plugin update。"
