from tornado import gen

__author__ = 'sdpatro'

import tornado.web
import tornado.ioloop
import psutil
import time
from tornado.tcpclient import TCPClient

@gen.coroutine
def run_remote():
    print "Enter destination IP: "
    dest_IP = raw_input()
    print "Enter destination port: "
    dest_port = raw_input()
    dest_port = int(dest_port)
    print "Enter remote name: "
    remote_name = raw_input()

    stream = yield TCPClient().connect(str(dest_IP),dest_port)
    try:
        while True:
            params = psutil.net_connections(kind='inet')
            # print params[6]
            # text = str(params[6])+'\n'
            text = str(remote_name) + '\n'
            yield stream.write(text.encode('utf-8'))
            time.sleep(1)
        yield stream.write(text.encode('utf-8'))
    except KeyboardInterrupt:
        print "Keyboard interrupt"
        return


def start_remote_server(port):
    print "Observer remote running at port " + port
    tornado.ioloop.IOLoop.instance().run_sync(run_remote)
