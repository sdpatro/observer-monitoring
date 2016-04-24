from tornado import gen

__author__ = 'sdpatro'

import tornado.web
import tornado.ioloop
import psutil
import time
import datetime
from tornado.tcpclient import TCPClient
import platform
import json

prev_recv = -1
prev_sent = -1
prev_read = -1
prev_write = -1


def get_stats(name, nic):
    global prev_recv
    global prev_sent
    global prev_read
    global prev_write

    with open('/proc/uptime', 'r') as f:
        uptime_seconds = float(f.readline().split()[0])

    stats = {'date': datetime.datetime.now().isoformat(), 'name': name,
             'cpu': psutil.cpu_percent(interval=None, percpu=True), 'cpu_count': psutil.cpu_count(),
             'cpu_ctx_switches': psutil.cpu_stats().ctx_switches, 'cpu_interrupts': psutil.cpu_stats().interrupts,
             'ram': psutil.virtual_memory().percent,
             'ram-available': psutil.virtual_memory().available, 'ram-used': psutil.virtual_memory().used,
             'swap': psutil.swap_memory().percent, 'swap-total': psutil.swap_memory().total,
             'swap-used': psutil.swap_memory().used, 'disk_io_read': psutil.disk_io_counters().read_bytes,
             'disk_io_write': psutil.disk_io_counters().write_bytes, 'disk_total': psutil.disk_usage('/').total,
             'disk_used': psutil.disk_usage('/').used,
             'uptime': uptime_seconds}

    nic_list = psutil.net_io_counters(pernic=True)
    nic = nic_list[nic]

    stats['packets_sent'] = [nic.packets_sent, nic.errout]
    stats['packets_recv'] = [nic.packets_recv, nic.errin]
    stats['bytes_recv'] = nic.bytes_recv
    stats['bytes_sent'] = nic.bytes_sent

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

    if prev_read != -1:
        stats['disk_read_rate'] = stats['disk_io_read'] - prev_read
    else:
        stats['disk_read_rate'] = 0
    prev_read = stats['disk_io_read']

    if prev_read != -1:
        stats['disk_write_rate'] = stats['disk_io_write'] - prev_write
    else:
        stats['disk_write_rate'] = 0
    prev_write = stats['disk_io_write']
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
    print "Enter preferred NIC: "
    nic = raw_input()

    stream = yield TCPClient().connect(str(dest_IP), dest_port)
    try:
        specs = {"machine": platform.platform(), "node": platform.node(), "architecture": [platform.architecture()[0],platform.architecture()[1]],
                 "system": platform.system(), "release": platform.release(), "version": platform.version(),
                 "name": remote_name}
        specs = json.dumps(specs)
        text = str(specs) + '\n'
        yield stream.write(text.encode('utf-8'))
        time.sleep(1)
        while True:
            stats = get_stats(remote_name, nic)
            stats = json.dumps(stats)
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
