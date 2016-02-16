__author__ = 'sdpatro'

from tornado import gen
import datetime
from pymongo import MongoClient
import json
import operator

from tornado.iostream import StreamClosedError
from tornado.web import RequestHandler, Application
import tornado.web
import tornado.ioloop
from tornado.tcpserver import TCPServer
from tornado.httpserver import HTTPServer


class EchoServer(TCPServer):
    # A new remote machine connects here.
    @gen.coroutine
    def handle_stream(self, stream, address):
        ip, fileno = address
        db = get_db('127.0.0.1', 27017)
        print "New IP connected: " + ip
        while True:
            try:
                while True:
                    yield self.insert_data(stream, db)
            except StreamClosedError:
                return
            break

    # Inserting a single data JSON.
    @gen.coroutine
    def insert_data(self, stream, db):
        data = yield stream.read_until('\n'.encode('utf-8'))
        data = clean_data(data)
        dataJSON = json.loads(data)
        live_coll = db["[" + dataJSON['name'] + "]-live"]
        stat_coll = db["[" + dataJSON['name'] + "]-stat"]
        live_coll.insert(dataJSON)
        condense(stat_coll, live_coll)


# JSON received from remote server has some quirks.
def clean_data(data):
    data = data[:-1]
    data = data.replace("\'", "\"")
    data = data.replace('L', '')
    return data


# Live 60 secs monitoring data is converted to statistical 1-minute gradient limitless data.
def condense(stat_coll, live_coll):
    while live_coll.count() > 120:
        live_data = live_coll.find().limit(60)
        stat = {'date': str(datetime.datetime.now().isoformat()), 'name': 'sample-name', 'cpu': [0, 0], 'ram': 0,
                'disk_io_read': 0, 'disk_io_write': 0, 'packets_sent': [0, 0], 'packets_recv': [0, 0], 'bytes_recv': 0,
                'bytes_sent': 0, 'ul_rate': 0, 'dl_rate': 0, 'disk_read_rate': 0, 'disk_write_rate': 0,
                'disk_usage': [0, 0, 0]}

        for record in live_data:
            stat['name'] = record['name']
            stat['cpu'] = tuple(map(operator.add, stat['cpu'], record['cpu']))
            stat['ram'] += record['ram']
            stat['disk_io_read'] += record['disk_io_read']
            stat['disk_io_write'] += record['disk_io_write']
            stat['disk_read_rate'] += record['disk_read_rate']
            stat['disk_write_rate'] += record['disk_write_rate']
            stat['packets_sent'] = tuple(map(operator.add, stat['packets_sent'], record['packets_sent']))
            stat['packets_recv'] = tuple(map(operator.add, stat['packets_recv'], record['packets_recv']))
            stat['bytes_recv'] += record['bytes_recv']
            stat['bytes_sent'] += record['bytes_sent']
            stat['ul_rate'] += record['ul_rate']
            stat['dl_rate'] += record['dl_rate']
            stat['disk_usage'] = tuple(map(operator.add, stat['disk_usage'], record['disk_usage']))
            live_coll.remove({"_id": record['_id']})

        stat['cpu'] = tuple(float(x / 60.0) for x in stat['cpu'])
        stat['ram'] = float(stat['ram'] / 60.0)
        stat['disk_io_read'] = float(stat['disk_io_read'] / 60.0)
        stat['disk_io_write'] = float(stat['disk_io_write'] / 60.0)
        stat['disk_read_rate'] = float(stat['disk_read_rate'] / 60.0)
        stat['disk_write_rate'] = float(stat['disk_write_rate'] / 60.0)
        stat['packets_sent'] = tuple(float(x / 60.0) for x in stat['packets_sent'])
        stat['packets_recv'] = tuple(float(x / 60.0) for x in stat['packets_recv'])
        stat['bytes_sent'] = float(stat['bytes_sent'] / 60.0)
        stat['bytes_recv'] = float(stat['bytes_recv'] / 60.0)
        stat['ul_rate'] = float(stat['ul_rate'] / 60.0)
        stat['dl_rate'] = float(stat['dl_rate'] / 60.0)
        stat['disk_usage'] = tuple(float(x / 60.0) for x in stat['disk_usage'])
        print "Condensing..."
        stat_coll.insert(stat)
        print str(stat)


# Get MongoDB client.
def get_db(ip, port):
    try:
        client = MongoClient(ip, port)
        db = client.observerdb
        return db
    except Exception as e:
        print "ERROR: " + str(e)


# Fire up the TCP server.
def start_tcp_server(port):
    server = EchoServer()
    server.listen(port)
    print "Observer TCP running at port " + port

    tornado.ioloop.IOLoop.current().start()

########################################################################

dbConnection = get_db('127.0.0.1', 27017)


class APIhandler(RequestHandler):
    def post(self):
        if self.get_argument("action", None) is not None:
            action = self.get_argument("action")
            if action == "GET_LIVE_DATA":
                client_name = self.get_argument("client-name")
                live_data_query = dbConnection["[" + client_name + "]-live"].find().sort("_id", -1).limit(1)
                for record in live_data_query:
                    record['_id'] = str(record['_id'])
                    self.finish(record)
            if action == "GET_STAT_DATA":
                client_name = self.get_argument("client-name")
                stat_data_query = dbConnection["[" + client_name + "]-stat"].find()
                stat_data = []
                for record in stat_data_query:
                    record['_id'] = str(record['_id'])
                    stat_data.append(record)
                self.finish(dict(stat_data=stat_data))
        pass

def start_http_server(port):
    app = Application([(r"/api", APIhandler),
                       (
                       r"/(.*)", tornado.web.StaticFileHandler, {"path": "../observer-monitoring/bootstrap-template"})],
                      autoreload=True)
    server = HTTPServer(app)
    server.listen(port)
    print "Observer HTTP running at port " + port
    tornado.ioloop.IOLoop.current().start()
