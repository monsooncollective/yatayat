# Python script to download data from overpass
# 
# It is designed to run unsupervised as a cron job, and to send
# e-mails when changes to the data cause dataquality warnings.
# 

import argparse
import json
import os
import subprocess
import shutil
import sys
import urllib2

def email(address, errors, subject="QC Errors found in today's Overpass data"):
    msg = """To: %s
From: Yatayat Sanity Bot <yatayat@numm.org>
Subject: %s

%s
""" % (address, subject, errors)
    p = subprocess.Popen(["/usr/lib/sendmail", '--', address],
                     stdin=subprocess.PIPE)
    p.stdin.write(msg)
    p.stdin.close()
    p.wait()

def pull():
    subprocess.call(["git", "stash"])
    subprocess.call(["git", "pull"])

def push(files):
    ret = subprocess.call(["git", "commit", "-m", "datasync: overpass files updated"] + files)
    if ret == 0:
        subprocess.call(["git", "push"])

def parse_args():
    parser = argparse.ArgumentParser(description="synchronize osm data through the overpass API")
    parser.add_argument("--address",
                        default="yatayat@numm.org",
                        help="address to email with errors")
    parser.add_argument("--config",
                        default="config.overpass.json",
                        type=argparse.FileType('r'),
                        help="JSON config file")
    parser.add_argument("--experimental",
                        default="transit.experimental.xml",
                        help="Where to download latest overpass data")
    parser.add_argument("--stable",
                        default="transit.stable.xml",
                        help="Where to put overpass data, if stable")
    parser.add_argument("--gtfs",
                        default="gtfs",
                        help="Where to serialize GTFS export")
    parser.add_argument("--yyjson",
                        default="yy.json",
                        help="Where to serialize Yatayat JSON export")
    parser.add_argument("--no-overpass",
                        default=False,
                        action="store_true",
                        help="Don't download from overpass")
    parser.add_argument("--force",
                        default=False,
                        action="store_true",
                        help="overwrite 'stable' even if tests fail")
    parser.add_argument("--silent",
                        default=False,
                        action="store_true",
                        help="suppresses git or e-mail outputs")
    parser.add_argument("--no-pull",
                        default=False,
                        action="store_true",
                        help="don't pull code from remote before running rest of script")
    return parser.parse_args()

def run():
    # Change CWD to location of this script
    os.chdir(os.path.abspath(os.path.dirname(__file__)))

    opts = parse_args()

    conf = json.load(opts.config)

    # update code & data
    if not opts.no_pull:
        pull()

    # Download latest data from overpass
    if not opts.no_overpass:
        open(opts.experimental, 'w').write(
            urllib2.urlopen(conf["API_URL"], data=conf["QUERY_STRING"]).read())

    NODE = 'nodejs'              # debian
    if sys.platform == 'darwin': # osx
        NODE = 'node'

    # Check data for quality errors
    ep = subprocess.Popen([NODE, "cli_dataquality.js", opts.experimental],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    e_out = ep.stdout.read()
    e_err = ep.stderr.read()
    wp = subprocess.Popen([NODE, "cli_dataquality.js", opts.experimental, '--include-warnings'],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    w_out = wp.stdout.read()
    w_err = wp.stderr.read()
    ## EMAIL
    if (len(e_err.strip()) > 0 or len(w_err.strip()) > 0) and not opts.force:
        # code-wise errors (!)
        if not opts.silent:
            email(opts.address, e_err + w_err, subject="URGENT JS ERRORS IN YATAYAT")
    if len(w_out.strip()) > 0 and not opts.silent:
        # warnings present -- email
        subject = "(warnings in yatayat overpass data)" if len(e_out.strip()) == 0 else "ERRORS detected in yatayat overpass data"
        email(opts.address, w_out, subject=subject)
    ## DATA
    if len(e_out.strip()) > 0 and not opts.force:
        # There were errors
        if not opts.silent:
            # only push experimental
            push([opts.experimental])
    else:
        # Copy "experimental" to "stable"
        shutil.copy(opts.experimental, opts.stable)

        # Render gtfs derivatives
        if not os.path.exists(opts.gtfs):
            os.makedirs(opts.gtfs)
        subprocess.call([NODE, "dump_gtfs.js", opts.stable, opts.gtfs])

        subprocess.call([NODE, "dump_yyjson.js", opts.stable, opts.yyjson])

        if not opts.silent:
            push([opts.experimental, opts.stable, opts.gtfs, opts.yyjson])

if __name__=='__main__':
    run()
