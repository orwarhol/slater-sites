#!/usr/bin/env python3
"""
Extract text from .wps (Microsoft Works) files.
Preserves blank lines which indicate stanza breaks.
"""

import sys
import re

def extract_text_from_wps(filepath):
    """Extract text from a .wps file, preserving structure."""
    with open(filepath, 'rb') as f:
        data = f.read()
    
    # Extract text sections
    lines = []
    current = []
    
    for byte in data:
        if byte == 0x0a:  # newline
            if current:
                try:
                    line = bytes(current).decode('latin-1', errors='ignore').strip()
                    lines.append(line)
                except (UnicodeDecodeError, ValueError):
                    pass
            else:
                # Empty line - preserve it
                lines.append('')
            current = []
        elif byte >= 0x20 and byte < 0x7f or byte == 0x09:  # printable or tab
            current.append(byte)
    
    # Filter out binary junk - look for start of real content
    # Real content typically starts after file metadata
    start_index = 0
    for i, line in enumerate(lines):
        # Look for a line that looks like a title (has letters and reasonable length)
        if line and len(line) > 2 and len(line) < 100:
            # Check if it's mostly alphanumeric (not binary junk)
            if re.match(r'^[A-Za-z0-9\s,.\-!?\'\"]+$', line):
                start_index = i
                break
    
    # Filter out metadata at the end
    end_index = len(lines)
    for i in range(len(lines) - 1, -1, -1):
        if re.search(r'Microsoft Works|MSWorks|Arial|Modern', lines[i]):
            end_index = i
        elif lines[i] and len(lines[i]) > 5:
            break
    
    return lines[start_index:end_index]

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: extract-wps-text.py <file.wps>", file=sys.stderr)
        sys.exit(1)
    
    lines = extract_text_from_wps(sys.argv[1])
    for line in lines:
        print(line)
