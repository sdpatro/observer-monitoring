__author__ = 'sdpatro'

import sys
import remote
import root

arg_list = sys.argv

if(len(arg_list) < 3):
    print "ERROR: Arguments missing"
    exit()

type = arg_list[1]
port = arg_list[2]

if arg_list[1] == "remote":
    remote.start_remote_server(port)

elif arg_list[1] == "tcp":
    root.start_tcp_server(port)

elif arg_list[1] == "http":
    root.start_http_server(port)

else:
    print "Invalid args"


