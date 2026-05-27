from pathlib import Path
from PyPDF2 import PdfReader
import difflib, sys, re

base = Path('.')
paths = [Path('Documents Folder/Copy of AI Project Documention.docx.pdf'), Path('Documents Folder/AI Project Documention.docx.pdf')]
for p in paths:
    if not p.exists():
        print(f"MISSING: {p}")
        sys.exit(2)

def extract_text(p):
    reader = PdfReader(str(p))
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or '')
        except Exception as e:
            pages.append('')
    text = '\n\n'.join(pages)
    # normalize whitespace
    text = re.sub(r'\r\n?', '\n', text)
    text = re.sub(r"\n{3,}", '\n\n', text)
    return text

texts = [extract_text(p) for p in paths]
out_paths = [paths[0].with_suffix('.txt'), paths[1].with_suffix('.txt')]
for out, txt in zip(out_paths, texts):
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(txt, encoding='utf-8')
    print(f"WROTE: {out} ({len(txt)} chars)")

# produce unified diff
left = texts[0].splitlines()
right = texts[1].splitlines()
diff = list(difflib.unified_diff(left, right, fromfile=str(paths[0]), tofile=str(paths[1]), lineterm=''))
if not diff:
    print('\nNO DIFF: files are identical after text extraction')
else:
    print('\n--- BEGIN DIFF (first 2000 chars) ---')
    diff_text = '\n'.join(diff)
    print(diff_text[:2000])
    print('\n--- END DIFF PREVIEW ---')

# extract headings heuristically (lines that look like headings)
heading_re = re.compile(r'^(?:\d+\.|\d+\.\d+\.|[A-Z][A-Z ]{3,}|Abstract|Introduction|Conclusion|References)')
headings = [ [l.strip() for l in t.splitlines() if heading_re.match(l.strip())] for t in texts ]
for i,h in enumerate(headings):
    print(f"\nHEADINGS IN {paths[i]}: {len(h)} found")
    for hh in h[:30]:
        print('-', hh)

# headings unique
set0 = set(headings[0])
set1 = set(headings[1])
only0 = sorted(set0 - set1)
only1 = sorted(set1 - set0)
print(f"\nHEADINGS ONLY IN {paths[0]}: {len(only0)}")
for hh in only0[:50]: print('-', hh)
print(f"\nHEADINGS ONLY IN {paths[1]}: {len(only1)}")
for hh in only1[:50]: print('-', hh)

# write full diff to file
diff_file = base / 'documents_diff_unified.diff'
diff_file.write_text('\n'.join(diff), encoding='utf-8')
print(f"WROTE: {diff_file}")
