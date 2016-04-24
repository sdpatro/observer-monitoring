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

elif arg_list[1] == "listener":
    import root
    root.start_listener(port)

elif arg_list[1] == "dash":
    import root
    root.start_dash_server(port)

elif arg_list[1] == "sim":
    import root
    root.start_sim_server(port)

elif arg_list[1] == "live":
    import root
    root.start_live_server(port)

elif arg_list[1] == "compute":
    import root
    root.start_compute_server(port)

else:
    print "Invalid args"
