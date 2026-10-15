"""Compatibility shim: Cloudflare Pages is set to run `python3 build.py`.

The site is now built with Astro, so this just runs `npm run build` (output goes to dist/).
If you change the Cloudflare build command to `npm run build`, this file can be deleted.
"""
import subprocess
import sys

sys.exit(subprocess.call("npm run build", shell=True))
