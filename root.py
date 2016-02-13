__author__ = 'sdpatro'

from tornado import gen
from tornado.iostream import StreamClosedError
from tornado.web import RequestHandler,Application,url
import tornado.web
import tornado.ioloop
from tornado.tcpserver import TCPServer
from tornado.httpserver import HTTPServer
import os
import datetime
from pymongo import MongoClient
import json

class EchoServer(TCPServer):
    @gen.coroutine
    def handle_stream(self, stream, address):
        ip, fileno = address
        sample_coll = get_coll()
        print "New IP connected: "+ip
        while True:
            try:
                while True:
                    yield self.echo(stream,sample_coll)
            except StreamClosedError:
                return
            break

    @gen.coroutine
    def echo(self, stream,collection):
        data = yield stream.read_until('\n')
        data = data[:-1]
        data = data.replace("\'","\"")
        data = data.replace('L','')
        dataJSON = json.loads(data)
        print('Inserting data: ' + (data))
        collection.insert(dataJSON)


def get_coll():
    try:
        client = MongoClient('127.0.0.1',27017)
        db = client.observerdb
        sample_coll = db['sample']
        return sample_coll
    except Exception as e:
        print "ERROR: "+str(e)

def start_tcp_server(port):
    server = EchoServer()
    server.listen(port)
    print "Observer TCP running at port "+port

    tornado.ioloop.IOLoop.current().start()

########################################################################3

class MainHandler(RequestHandler):
    def get(self):
        self.write("Welcome to Observer HTTP!")

def start_http_server(port):
    settings = {
        "static_path": os.path.join(os.path.dirname(__file__), "static"),
        "cookie_secret": "823719983274",
        "login_url": "/login",
        "xsrf_cookies": False,
    }
    app = Application([url(r"/", MainHandler)]
                       **settings)
    server = HTTPServer(app)
    server.listen(port)
    print "Observer HTTP running at port "+port
    tornado.ioloop.IOLoop.current().start()


