"""Build a reproducible file manifest and a standard-library ZIP from dist/."""
import hashlib
import json
import re
import shutil
import subprocess
import zipfile
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
version = json.loads((repo / "package.json").read_text())["version"]
if not re.fullmatch(r"\d+\.\d+\.\d+", version):
    raise SystemExit("Use a numeric release version before packaging.")
if not (repo / "dist/index.html").is_file():
    raise SystemExit("Run npm run build first.")
source = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
name = f"plush-siege-{version}"
stage = repo / "artifacts" / f"{name}-package"
if stage.exists():
    shutil.rmtree(stage)
game = stage / name
shutil.copytree(repo / "dist", game)
for path in (repo / "distribution").iterdir():
    text = path.read_text().replace("$VERSION", version).replace("$SOURCE_COMMIT", source)
    if path.suffix == ".cmd":
        (game / path.name).write_bytes(text.replace("\r\n", "\n").replace("\n", "\r\n").encode())
    else:
        (game / path.name).write_text(text)
manifest = "".join(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(game).as_posix()}\n"
                   for p in sorted(game.rglob("*")) if p.is_file())
(game / "SHA256SUMS.txt").write_text(manifest)
output = repo / "downloads" / f"{name}-browser.zip"
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(game.rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(stage))
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise SystemExit("ZIP integrity verification failed.")
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix(".sha256").write_text(f"{digest}  {output.name}\n")
print(f"{output.relative_to(repo)}: {output.stat().st_size:,} bytes\nSHA-256 {digest}")
