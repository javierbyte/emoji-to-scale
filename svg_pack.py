#!/usr/bin/python3

import csv
import glob
import json
import os
import re
import subprocess
import sys
import unicodedata


def munge_svg(path, e=None, verbose=False):
    svg_data = open(path).read()
    svg_data = svg_data.replace('\n', ' ').strip()
    if re.search(r'<svg[^>]*width', svg_data):
        if 'ENTITY' in svg_data and False:
            svg_data = subprocess.check_output(
                ['npx', 'svgo', '-o', '-', path]).decode('utf8')
        svg_data_before = svg_data
        # explicit width/height screws up automatic scaling
        dim_re = re.compile(r' (width|height)="[^"]*"')

        def fix_header(m):
            attrib = dict(re.findall(r'(\S+)="([^"]*)"', m.group(0)))
            if 'viewBox' not in attrib:
                attrib['viewBox'] = '0 0 %s %s' % (attrib['width'],
                                                   attrib['height'])
            attrib.pop('width')
            attrib.pop('height')
            return '<svg %s>' % ' '.join('%s="%s"' % i for i in attrib.items())

        svg_data = re.sub(r'<svg[^>]*>', fix_header, svg_data)
        if e and verbose:
            print('stripping header dimensions from', e['char'], e['name'],
                  svg_data == svg_data_before)
    return svg_data


def pack_svg(verbose=False):
    ems = []
    for fname in glob.glob('src/data/*.csv'):
        ems.extend(csv.reader(open(fname)))

    print(ems)

    char_ems = {e[0]: e for e in ems}
    svgs = {}

    ems.sort(key=lambda e: float(e[1]) if e[1].isdigit() else 0)

    aliases = {}
    for line in open('noto-emoji/emoji_aliases.txt'):
        m = re.match(r'(.*);(\S*)', line)
        if m:
            aliases[m.group(1)] = m.group(2)

    c = 0
    for e in ems:
        em, size, name = e
        em = unicodedata.normalize('NFKD', em)
        if em == 'EMOJI' or size == '?':
            continue
        svg_path = ''
        em_code = '_'.join('%04x' % ord(c) for c in em)
        svg_path = 'noto-emoji/svg/emoji_u%s.svg' % em_code
        print(svg_path)
        if not os.path.exists(svg_path) and em_code in aliases:
            svg_path = svg_path.replace(em_code, aliases[em_code])
        if not os.path.exists(svg_path) and '_fe0f.' in svg_path:
            svg_path = svg_path.replace('_fe0f.', '.')
        assert os.path.exists(svg_path), (em, svg_path)
        svg_data = munge_svg(svg_path, e, verbose)
        if verbose:
            print(em, e['name'], json.dumps(em), svg_path, len(svg_data))
        svgs[em] = svg_data

    with open('src/emoji.css', 'w') as f:
        for char, svg in sorted(svgs.items()):
            # based on https://yoksel.github.io/url-encoder/
            # and https://mathiasbynens.be/notes/css-escapes
            svg = svg.strip().replace("'", "\\'")
            svg = svg.replace('\n', '\\A').replace('#', '%23')
            f.write(
                ".emoji-%s{background-image:url('data:image/svg+xml,%s')}\n" %
                (''.join('%02X'%c for c in char_ems[char][0].encode('utf8')), svg))
        size = f.tell()
        print('wrote %.1dK (%d emoji, %dB each) to %s' %
              (size / 1024, len(svgs), size / len(svgs), f.name))


if __name__ == '__main__':
    if sys.argv[1:]:
        for fname in sys.argv[1:]:
            print(fname, munge_svg(fname))
    else:
        pack_svg()
