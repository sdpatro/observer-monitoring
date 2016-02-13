from tornado import gen

__author__ = 'sdpatro'

import tornado.web
import tornado.ioloop
import psutil
import time
import datetime
from tornado.tcpclient import TCPClient

def get_stats():
    stats = {}
    stats['date'] = datetime.datetime.now().isoformat()
    stats['cpu'] = psutil.cpu_percent(interval=1,percpu=True)
    stats['ram'] = psutil.virtual_memory().percent
    stats['disk_io_read'] = psutil.disk_io_counters().read_bytes
    stats['disk_io_write'] = psutil.disk_io_counters().write_bytes
    stats['packets_sent'] = [psutil.net_io_counters().packets_sent,psutil.net_io_counters().errout]
    stats['packets_recv'] = [psutil.net_io_counters().packets_recv,psutil.net_io_counters().errin]
    stats['bytes_recv'] = psutil.net_io_counters().bytes_recv
    stats['bytes_sent'] = psutil.net_io_counters().bytes_sent
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
            params = psutil.net_connections(kind='inet')
            print get_stats()
            text = str(get_stats()) + '\n'
            yield stream.write(text)
            time.sleep(1)
        yield stream.write(text.encode('utf-8'))
    except KeyboardInterrupt:
        print "Keyboard interrupt"
        return


def start_remote_server(port):
    print "Observer remote running at port " + port
    tornado.ioloop.IOLoop.instance().run_sync(run_remote)
