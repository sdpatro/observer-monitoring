__author__ = 'sdpatro'

import sys
arg_list = sys.argv

if len(arg_list) < 3:
    print "ERROR: Arguments missing"
    exit()

type = arg_list[1]
port = arg_list[2]

if arg_list[1] == "remote":
    import remote
    remote.start_remote_server(port)

elif arg_list[1] == "tcp":
    import root
    root.start_tcp_server(port)

elif arg_list[1] == "http":
    import root
    root.start_http_server(port)

elif arg_list[1] == "http_sim":
    import root

    root.start_sim_server(port)

else:
    print "Invalid args"


