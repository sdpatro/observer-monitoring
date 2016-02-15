from tornado import gen

__author__ = 'sdpatro'

import tornado.web
import tornado.ioloop
import psutil
import time
import datetime
from tornado.tcpclient import TCPClient

prev_recv = -1
prev_sent = -1


def get_stats(name):
    global prev_recv
    global prev_sent

    stats = {}
    stats['date'] = datetime.datetime.now().isoformat()
    stats['name'] = name
    stats['cpu'] = psutil.cpu_percent(interval=None, percpu=True)
    stats['ram'] = psutil.virtual_memory().percent
    stats['disk_io_read'] = psutil.disk_io_counters().read_bytes
    stats['disk_io_write'] = psutil.disk_io_counters().write_bytes
    stats['packets_sent'] = [psutil.net_io_counters().packets_sent,psutil.net_io_counters().errout]
    stats['packets_recv'] = [psutil.net_io_counters().packets_recv,psutil.net_io_counters().errin]
    stats['bytes_recv'] = psutil.net_io_counters().bytes_recv
    stats['bytes_sent'] = psutil.net_io_counters().bytes_sent

    if prev_recv != -1:
        stats['dl_rate'] = stats['bytes_recv'] - prev_recv
    else:
        stats['dl_rate'] = 0
    prev_recv = stats['bytes_recv']

    if prev_sent != -1:
        stats['ul_rate'] = stats['bytes_sent'] - prev_sent
    else:
        stats['ul_rate'] = 0
    prev_sent = stats['bytes_sent']

    stats['disk_usage'] = [psutil.disk_usage('/').used,psutil.disk_usage('/').total,psutil.disk_usage('/').free]
    return stats

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
            stats = get_stats(remote_name)
            text = str(stats) + '\n'
            yield stream.write(text.encode('utf-8'))
            print text
            time.sleep(1)
    except KeyboardInterrupt:
        print "Keyboard interrupt"
        return


def start_remote_server(port):
    print "Observer remote running at port " + port
    tornado.ioloop.IOLoop.instance().run_sync(run_remote)
