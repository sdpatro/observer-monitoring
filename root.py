__author__ = 'sdpatro'

import sys
import StringIO
from tornado import gen
import datetime
import base64
import json
import operator
import subprocess
import shlex

from pymongo import MongoClient
from tornado.iostream import StreamClosedError
from tornado.web import RequestHandler, Application
import tornado.web
import tornado.httpclient
import tornado.escape
import tornado.ioloop
from tornado.tcpserver import TCPServer
from tornado.httpserver import HTTPServer
from selenium import webdriver

import uimodules

# The MongoDB server specifications, recommended to be deployed on the same drive as root server for faster access.
DB_IP = '127.0.0.1'
DB_PORT = 27017


# Get MongoDB client.
def get_db(ip, port):
    try:
        client = MongoClient(ip, port)
        db = client.observerdb
        return db
    except Exception as e:
        print "ERROR: " + str(e)


db_connection = get_db(DB_IP, DB_PORT)


# To check the ping of the remote sender
def run_ping(ip):
    process = subprocess.Popen(shlex.split("ping " + ip), stdout=subprocess.PIPE)
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            break
        if output:
            print "Output: " + output.strip()
            # os.killpg(os.getpgid(process.pid), signal.SIGTERM)
    return process


# The TCP listener endpoint for all remote senders.
class TCPListener(TCPServer):
    # A new remote machine connects here.
    @gen.coroutine
    def handle_stream(self, stream, address):
        ip, file_no = address
        db = get_db('127.0.0.1', 27017)
        print "New IP connected: " + ip
        while True:
            try:
                while True:
                    yield self.insert_data(stream, db, ip)
            except StreamClosedError:
                return
            break

    @gen.coroutine
    def insert_data(self, stream, db, ip):
        data = yield stream.read_until('\n'.encode('utf-8'))
        data = clean_data(data)
        data_json = json.loads(data)

        update_machine(data_json["name"], ip)

        live_coll = db["[" + data_json['name'] + "]-live"]
        stat_coll = db["[" + data_json['name'] + "]-stat"]
        live_coll.insert(data_json)
        condense(stat_coll, live_coll)


# JSON received from remote sender has some quirks.
def clean_data(data):
    data = data[:-1]
    data = data.replace("\'", "\"")
    data = data.replace('L', '')
    return data


def update_machine(machine_name, machine_ip):
    machine = db_connection["machines"].find_one({'name': machine_name, 'ip': machine_ip})
    if machine is None:
        db_connection["machines"].insert(
                {'name': machine_name, 'ip': machine_ip, 'last_online': str(datetime.datetime.now().isoformat())})
    else:
        db_connection["machines"].update_one({'name': machine_name},
                                             {'$set': {'last_online': str(datetime.datetime.now().isoformat())}})


# Live 60 secs monitoring data is converted to statistical 1-minute gradient limitless data.
def condense(stat_coll, live_coll):
    while live_coll.count() > 120:
        live_data = live_coll.find().limit(60)

        cpu_core_count = len(((live_data[0])['cpu']));
        cpu_clear = []

        for i in range(0, cpu_core_count):
            cpu_clear.append(0)

        stat = {'date': str(datetime.datetime.now().isoformat()), 'name': 'sample-name', 'cpu': cpu_clear, 'ram': 0,
                'disk_io_read': 0, 'disk_io_write': 0, 'packets_sent': [0, 0], 'packets_recv': [0, 0], 'bytes_recv': 0,
                'bytes_sent': 0, 'ul_rate': 0, 'dl_rate': 0, 'disk_read_rate': 0, 'disk_write_rate': 0, 'disk_total': 0,
                'disk_used': 0}

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
            stat['disk_total'] += record['disk_total']
            stat['disk_used'] += record['disk_used']

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
        stat['disk_total'] = float(stat['disk_total'] / 60.0)
        stat['disk_used'] = float(stat['disk_used'] / 60.0)

        print "Condensing..."
        stat_coll.insert(stat)
        print str(stat)


# Fire up the TCP server.
def start_tcp_server(port):
    server = TCPListener()
    server.listen(port)
    print "Observer TCP running at port " + port

    tornado.ioloop.IOLoop.current().start()


########################################################################


class ObserverDriver:
    steps = []
    snaps = []
    web_driver = None
    test_name = None
    machine_name = None

    def set_web_driver(self, driver):
        self.web_driver = driver

    def snap(self, height=None, width=None):
        snap_date = str(datetime.datetime.now().isoformat())
        self.web_driver.set_window_position(0, 0)
        if height is not None and width is not None:
            self.web_driver.set_window_size(height, width)
        snap_name = "photos_buffer/" + self.machine_name + "_" + self.test_name + "_" + snap_date + ".jpg"
        self.web_driver.save_screenshot(
                snap_name)

        with open(snap_name,
                  "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read())
            self.snaps.append({'snap_name': snap_name, 'snap_content': encoded_string})
            print encoded_string

    def go_to(self, url, record=False):
        start_time = datetime.datetime.now()
        self.web_driver.get(url)
        while self.web_driver.execute_script('return document.readyState;') != 'complete':
            pass
        end_time = datetime.datetime.now()
        self.steps.append(
                dict(action="go_to", target=url, startTime=start_time.isoformat(), endTime=end_time.isoformat(),
                     record=record))

    def button_click(self, button_id, record=False):
        start_time = datetime.datetime.now()
        self.web_driver.findElement(str(button_id)).click()
        while self.web_driver.execute_script('return document.readyState;') != 'complete':
            pass
        end_time = datetime.datetime.now()
        self.steps.append(
                dict(action="button_click", target=button_id, startTime=start_time.isoformat(),
                     endTime=end_time.isoformat(),
                     record=record))

    def submit_form(self, form_element_id, record=False):
        start_time = datetime.datetime.now()
        el = self.web_driver.findElement(form_element_id)
        el.submit()
        while self.web_driver.execute_script('return document.readyState;') != 'complete':
            pass
        end_time = datetime.datetime.now()
        self.steps.append(
                dict(action="formSubmit", startTime=start_time.isoformat(), endTime=end_time.isoformat(),
                     record=record))

    def fill_form_element(self, form_element_id, input_text, record=False):
        start_time = datetime.datetime.now()
        el = self.web_driver.findElement(form_element_id)
        el.send_keys(input_text)
        while self.web_driver.execute_script('return document.readyState;') != 'complete':
            pass
        end_time = datetime.datetime.now()
        self.steps.append(
                dict(action="fill_form_element", startTime=start_time.isoformat(), endTime=end_time.isoformat(),
                     record=record))

    def close_driver(self):
        while self.web_driver.execute_script('return document.readyState;') != 'complete':
            pass
        self.web_driver.close()
        self.web_driver.quit()

    def check_element(self, element_id):
        while self.web_driver.execute_script('return document.readyState;') != 'complete':
            pass
        el = self.web_driver.findElement(element_id)
        if el is None:
            return False
        else:
            return True

    def get_steps(self):
        return self.steps

    def get_snaps(self):
        return self.snaps

    def __init__(self, driver, test_name, machine_name):
        self.web_driver = driver
        self.test_name = test_name
        self.machine_name = machine_name
        del self.steps[:]
        self.steps = []
        del self.snaps[:]
        self.snaps = []


class ApiHandler(RequestHandler):
    def data_received(self, chunk):
        pass

    @gen.coroutine
    def error_respond(self, code, msg):
        self.set_status(code)
        self.write(json.dumps({
            'status': code,
            'message': msg
        }))
        self.finish()

    @gen.coroutine
    def post(self):
        if self.get_argument("action", None) is not None:
            action = self.get_argument("action")

            if action == "GET_STAT_DATA":
                client_name = self.get_argument("client-name")
                stat_data_query = db_connection["[" + client_name + "]-stat"].find()
                stat_data = []
                for record in stat_data_query:
                    record['_id'] = str(record['_id'])
                    stat_data.append(record)
                self.finish(dict(stat_data=stat_data))
            if action == "GET_REMOTE_MACHINES":
                remote_machines_cursor = db_connection["machines"].find()
                remote_machines_list = []
                for remote_machine in remote_machines_cursor:
                    remote_machines_list.append({'name': remote_machine['name'], 'ip': remote_machine['ip'],
                                                 'last_online': remote_machine['last_online']})
                self.finish((dict(remoteMachines=json.dumps({'machines': remote_machines_list}))))

            if action == "SAVE_TEST":
                test_code = self.get_argument("testCode", None)
                test_name = self.get_argument("testName", None)
                machine_name = self.get_argument("machine", None)

                if test_code is None or test_name is None or machine_name is None:
                    self.finish((dict(status="failure", output="Missing argument in request")))

                try:
                    test_object = {'machine': machine_name, 'script': test_code, 'name': test_name}
                    db_connection["[" + machine_name + "]-tests"].insert(test_object)
                    status = "success"
                    output = test_name + " for " + machine_name + " successfully saved."
                except Exception as e:
                    output = e.message
                    status = "failure"
                self.finish((dict(status=status, output=output)))

            if action == "FETCH_TESTS_LIST":
                machine_name = self.get_argument("machine", None)
                if machine_name is None:
                    self.error_respond(400, "Arguments missing")
                    return
                tests = db_connection["[" + machine_name + "]-tests"].find()
                try:
                    response_object = []
                    for test in tests:
                        response_object.append(
                                {'name': test['name'], 'machine': test['machine']})
                    self.finish(dict(response_data=json.dumps({'tests':
                                                                   response_object})))
                except Exception as e:
                    self.error_respond(500, "Something went wrong: " + str(e))

            if action == "FETCH_TEST":
                machine_name = self.get_argument("machine", None)
                test_name = self.get_argument("test_name", None)
                if machine_name is None or test_name is None:
                    self.error_respond(400, "Arguments missing")
                    return
                test = db_connection["[" + machine_name + "]-tests"].find_one({"name": test_name})
                try:
                    self.finish(dict(response_data=json.dumps({'script': test['script']})))
                except Exception as e:
                    self.error_respond(500, "Something went wrong: " + str(e))

            if action == "SAVE_TEST_RESULT_AS":
                json_data = json.loads(self.get_argument("jsonData"))
                for record in json_data["live_data"]:
                    print record["disk_used"]

        else:
            self.error_respond(400, "No action specified")
        pass


class LiveHandler(RequestHandler):
    def data_received(self, chunk):
        pass

    def get(self):
        self.render("templates/live.html")


class StatHandler(RequestHandler):
    def data_received(self, chunk):
        pass

    def get(self):
        self.render("templates/stat.html")


class PerfHandler(RequestHandler):
    def data_received(self, chunk):
        pass

    def get(self):
        self.render("templates/perf.html")


class TestHandler(RequestHandler):
    def data_received(self, chunk):
        pass

    def post(self):
        pass


def start_dash_server(port):
    settings = {
        "ui_modules": uimodules
    }
    app = Application([(r"/api", ApiHandler),
                       (r"/live", LiveHandler),
                       (r"/stat", StatHandler),
                       (r"/perf", PerfHandler),
                       (r"/test", TestHandler),
                       (r"/(.*)", tornado.web.StaticFileHandler, {"path": "../observer-monitoring/static"})],
                      autoreload=True, **settings)
    server = HTTPServer(app)
    server.listen(port)
    print "Observer Dashboard running at port " + port
    tornado.ioloop.IOLoop.current().start()


##############################################################

class SimHandler(RequestHandler):
    def data_received(self, chunk):
        pass

    def error_respond(self, code, msg):
        self.set_status(code)
        self.write(json.dumps({
            'status': code,
            'message': msg
        }))
        self.finish()

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:9000")

    def post(self):
        action = self.get_argument("action", None)
        if action is not None:
            if action == "RUN_TEST":
                test_name = self.get_argument("testName", None)
                machine_name = self.get_argument("machineName", None)
                test_code = self.get_argument("testCode", None)
                status = "success"
                if test_code is None:
                    self.finish((dict(status="failure", output="Missing argument in request")))
                buffer = StringIO.StringIO()
                try:
                    sys.stdout = buffer
                    driver = ObserverDriver(webdriver.Firefox(), test_name, machine_name)
                    exec test_code
                    sys.stdout = sys.__stdout__
                    driver.close_driver()
                    output = json.dumps({'steps': driver.get_steps(), 'snaps': driver.get_snaps()})
                except Exception as e:
                    output = e.message + buffer.getvalue()
                    status = "failure"
                self.finish((dict(status=status, output=output)))
            pass

        else:
            self.error_respond(400, "No action specified")


def start_sim_server(port):
    sim_app = Application([(r"/sim", SimHandler)],
                          autoreload=True)
    server = HTTPServer(sim_app)
    server.listen(port)
    print "Observer Simulator running at port " + port
    tornado.ioloop.IOLoop.current().start()


#####################################################

class LiveMonitorHandler(RequestHandler):
    def data_received(self, chunk):
        pass

    def error_respond(self, code, msg):
        self.set_status(code)
        self.write(json.dumps({
            'status': code,
            'message': msg
        }))
        self.finish()

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:9000")


    @gen.coroutine
    def get_live_data(self, client_name):
        live_data_query = db_connection["[" + client_name + "]-live"].find().sort("_id", -1).limit(1)
        for record in live_data_query:
            record['_id'] = str(record['_id'])
            self.finish(record)

    @gen.coroutine
    def post(self):
        action = self.get_argument("action", None)
        if action is not None:
            if action == "GET_LIVE_DATA":
                client_name = self.get_argument("client-name")
                yield self.get_live_data(client_name)

        else:
            self.error_respond(400, "No action specified")


def start_live_server(port):
    sim_app = Application([(r"/live", LiveMonitorHandler)],
                          autoreload=True)
    server = HTTPServer(sim_app)
    server.listen(port)
    print "Observer Live running at port " + port
    tornado.ioloop.IOLoop.current().start()
