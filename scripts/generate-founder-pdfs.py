#!/usr/bin/env python3
"""
NetworkPeer Rev 5 - Automated Founder & Engineering PDF Generator
Renders Markdown documentation into high-fidelity, beautifully styled PDFs using pandoc and headless Chrome.
"""

import os
import subprocess
import sys

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs"))
CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS_STYLES = """
@page {
    margin: 20mm 15mm 20mm 15mm;
    size: A4;
}
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.6;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
}
h1 {
    color: #0f172a;
    font-size: 22pt;
    font-weight: 800;
    border-bottom: 3px solid #F9C933;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 12px;
}
h2 {
    color: #0f172a;
    font-size: 15pt;
    font-weight: 700;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 5px;
    margin-top: 24px;
    margin-bottom: 10px;
}
h3 {
    color: #1e293b;
    font-size: 12pt;
    font-weight: 600;
    margin-top: 18px;
    margin-bottom: 8px;
}
p, ul, ol {
    margin-top: 0;
    margin-bottom: 10px;
}
code {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    background-color: #f1f5f9;
    color: #0f172a;
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 9pt;
}
pre {
    background-color: #0f172a;
    color: #f8fafc;
    padding: 12px 16px;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 8.5pt;
    line-height: 1.45;
    margin: 12px 0;
}
pre code {
    background-color: transparent;
    color: inherit;
    padding: 0;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9.5pt;
}
th, td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    text-align: left;
}
th {
    background-color: #f8fafc;
    font-weight: 600;
    color: #0f172a;
}
tr:nth-child(even) {
    background-color: #f8fafc;
}
blockquote {
    border-left: 4px solid #F9C933;
    background-color: #fffbeb;
    margin: 12px 0;
    padding: 8px 14px;
    color: #92400e;
    font-size: 9.5pt;
}
.header-badge {
    display: inline-block;
    background-color: #F9C933;
    color: #111827;
    font-weight: bold;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 9pt;
    margin-bottom: 12px;
}
"""

def generate_pdf_from_md(md_path, pdf_path):
    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found")
        return False
        
    tmp_html = f"/tmp/{os.path.basename(md_path)}.html"
    
    # Use pandoc to convert MD to HTML body
    cmd_pandoc = ["pandoc", md_path, "-f", "markdown", "-t", "html", "--no-highlight"]
    res_pandoc = subprocess.run(cmd_pandoc, capture_output=True, text=True)
    if res_pandoc.returncode != 0:
        print(f"Pandoc error on {md_path}: {res_pandoc.stderr}")
        return False
        
    full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>NetworkPeer Documentation</title>
    <style>{CSS_STYLES}</style>
</head>
<body>
    <div class="header-badge">NetworkPeer Revision 5 Certified</div>
    {res_pandoc.stdout}
</body>
</html>
"""
    with open(tmp_html, "w", encoding="utf-8") as f:
        f.write(full_html)
        
    # Render HTML to PDF via headless Chrome
    cmd_chrome = [
        CHROME_BIN,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        tmp_html
    ]
    res_chrome = subprocess.run(cmd_chrome, capture_output=True, text=True)
    if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
        print(f"✅ Generated {pdf_path} ({os.path.getsize(pdf_path)} bytes)")
        return True
    else:
        print(f"❌ Chrome failed to generate {pdf_path}: {res_chrome.stderr}")
        return False

def main():
    targets = [
        ("OFFICE_LINUX_DATABASE_ACCESS_GUIDE.md", "OFFICE_LINUX_DATABASE_ACCESS_GUIDE.pdf"),
        ("SECURITY_AUDIT_REV5_REMEDIATION.md", "SECURITY_AUDIT_REV5_REMEDIATION.pdf"),
        ("NETWORKPEER_PRODUCT_AND_ENGINEERING_SPEC_REV4.md", "NETWORKPEER_REV5_FOUNDER_GUIDE.pdf"),
    ]
    
    success = True
    for md_file, pdf_file in targets:
        md_p = os.path.join(DOCS_DIR, md_file)
        pdf_p = os.path.join(DOCS_DIR, pdf_file)
        if not generate_pdf_from_md(md_p, pdf_p):
            success = False
            
    if not success:
        sys.exit(1)
    print("All PDFs successfully created.")

if __name__ == "__main__":
    main()
