import contextlib
import sys
import StringIO

__author__ = 'sdpatro'

from tornado import gen
import datetime
from pymongo import MongoClient
import json
import operator
import time
import uimodules

from tornado.iostream import StreamClosedError
from tornado.web import RequestHandler, Application
import tornado.web
import tornado.ioloop
from tornado.tcpserver import TCPServer
from tornado.httpserver import HTTPServer
from selenium import webdriver

password = "PASSWORD"


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
                    yield self.insert_data(stream, db, ip)
            except StreamClosedError:
                return
            break

    # Inserting a single data JSON.
    @gen.coroutine
    def insert_data(self, stream, db, ip):
        data = yield stream.read_until('\n'.encode('utf-8'))
        data = clean_data(data)
        dataJSON = json.loads(data)

        addMachines(dataJSON['name'], ip, db)

        live_coll = db["[" + dataJSON['name'] + "]-live"]
        stat_coll = db["[" + dataJSON['name'] + "]-stat"]
        live_coll.insert(dataJSON)
        condense(stat_coll, live_coll)


# JSON received from remote sender has some quirks.
def clean_data(data):
    data = data[:-1]
    data = data.replace("\'", "\"")
    data = data.replace('L', '')
    return data


# Add a new remote sender when it first connects:
def addMachines(name, ip, db):
    if not (db["machines"].find_one(dict(name=name, ip=ip))):
        db["machines"].insert(dict(name=name, ip=ip))


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


class observerDriver:
    steps = []
    webDriver = None

    def setWebDriver(self, driver):
        self.webDriver = driver

    def goTo(self, url):
        start_time = datetime.datetime.now()
        self.webDriver.get(url)
        while self.webDriver.execute_script('return document.readyState;') != 'complete':
            pass
        end_time = datetime.datetime.now()
        self.steps.append(
            dict(action="goTo", url=url, startTime=start_time.isoformat(), endTime=end_time.isoformat()))

    def buttonClick(self, id):
        start_time = datetime.datetime.now()
        self.webDriver.findElement(str(id)).click()
        while self.webDriver.execute_script('return document.readyState;') != 'complete':
            pass
        end_time = datetime.datetime.now()
        self.steps.append(
            dict(action="buttonClick", id=id, startTime=start_time.isoformat(), endTime=end_time.isoformat()))

    def submitForm(self, formElementId):
        start_time = datetime.datetime.now()
        el = self.webDriver.findElement(formElementId)
        el.submit()
        while self.webDriver.execute_script('return document.readyState;') != 'complete':
            pass
        end_time = datetime.datetime.now()
        self.steps.append(dict(action="formSubmit", startTime=start_time.isoformat(), endTime=end_time.isoformat()))

    def fillFormElement(self, formElementId, inputText):
        start_time = datetime.datetime.now()
        el = self.webDriver.findElement(formElementId)
        el.send_keys(inputText)
        while self.webDriver.execute_script('return document.readyState;') != 'complete':
            pass
        end_time = datetime.datetime.now()
        self.steps.append(
            dict(action="fillFormElement", startTime=start_time.isoformat(), endTime=end_time.isoformat()))

    def closeDriver(self):
        while self.webDriver.execute_script('return document.readyState;') != 'complete':
            pass
        self.webDriver.close()
        self.webDriver.quit()

    def checkElement(self, elementId):
        while self.webDriver.execute_script('return document.readyState;') != 'complete':
            pass
        el = self.webDriver.findElement(elementId)
        if el is None:
            return False
        else:
            return True

    def getSteps(self):
        return self.steps

    def __init__(self, driver):
        self.webDriver = driver
        del self.steps[:]
        self.steps = []


def runTest(test_id, driver):
    output = []
    if test_id == 'test_1':
        start_time = time.time()
        driver.get("http://aspiringapps.com/web/home/log-in.html")
        end_time = time.time()
        output.append("Login page load time: " + str(end_time - start_time))
        driver.find_element_by_id("email").send_keys("a@gmail.com")
        el = driver.find_element_by_id("password")
        el.send_keys("a")
        start_time = time.time()
        el.submit()
        end_time = time.time()
        driver.close()
        output.append("Portal page load time: " + str(end_time - start_time))
    elif test_id == 'test_2':
        start_time = time.time()
        driver.get("http://www.facebook.com")
        end_time = time.time()
        output.append("Facebook home page load time: " + str(end_time - start_time))
        driver.find_element_by_id("email").send_keys("sidharth.patro@outlook.com")
        el = driver.find_element_by_id("pass")
        el.send_keys(password)
        start_time = time.time()
        el.submit()
        end_time = time.time()
        output.append("Facebook news feed load time: " + str(end_time - start_time))
        start_time = time.time()
        driver.get("http://www.linkedin.com")
        end_time = time.time()
        output.append("LinkedIn login page load time: " + str(end_time - start_time))
        driver.find_element_by_id("login-email").send_keys("sidharth.patro@outlook.com")
        el = driver.find_element_by_id("login-password")
        el.send_keys(password)
        start_time = time.time()
        el.submit()
        end_time = time.time()
        output.append("LinkedIn news feed load time: " + str(end_time - start_time))
    driver.quit()
    return output


@contextlib.contextmanager
def stdoutIO(stdout=None):
    old = sys.stdout
    if stdout is None:
        stdout = StringIO.StringIO()
    sys.stdout = stdout
    yield stdout
    sys.stdout = old


class APIhandler(RequestHandler):
    def errorRespond(self, code, msg):
        self.set_status(code)
        self.write(json.dumps({
            'status': code,
            'message': msg
        }))
        self.finish()

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
            if action == "RUN_TEST":
                test_id = self.get_argument('test-id')
                if self.get_argument('driver') == 'FIREFOX':
                    web_driver = webdriver.Firefox()
                elif self.get_argument('driver') == 'PHANTOMJS':
                    web_driver = webdriver.PhantomJS()
                output = ""
                output = runTest(test_id, web_driver)
                self.finish(dict(test_output=output))
            if action == "GET_REMOTE_MACHINES":
                responseObject = {'machines': []}
                for machine in dbConnection["machines"].find():
                    responseObject['machines'].append({'name': str(machine['name']), 'ip': str(machine['ip'])})
                print responseObject
                print json.dumps(responseObject)
                self.finish((dict(remoteMachines=json.dumps(responseObject))))

            if action == "RUN_CUSTOM_TEST":
                codeText = self.get_argument("testCode", None)
                status = "success"
                if codeText is None:
                    self.finish((dict(status="failure", output="Missing argument in request")))
                buffer = StringIO.StringIO()
                try:
                    sys.stdout = buffer
                    obDriver = observerDriver(webdriver.Firefox())
                    exec (codeText)
                    sys.stdout = sys.__stdout__
                    obDriver.closeDriver()
                    outputString = str(obDriver.getSteps())

                except Exception as e:
                    outputString = e.message + buffer.getvalue()
                    status = "failure"
                self.finish((dict(status=status, output=outputString)))

            if action == "SAVE_TEST":
                codeText = self.get_argument("testCode", None)
                testName = self.get_argument("testName", None)
                machineName = self.get_argument("machine", None)

                if codeText is None or testName is None or machineName is None:
                    self.finish((dict(status="failure", output="Missing argument in request")))

                try:
                    testObject = {'machine': machineName, 'script': codeText, 'name': testName}
                    dbConnection["[" + machineName + "]-tests"].insert(testObject)
                    status = "success"
                    output = testName + " for " + machineName + " successfully saved."
                except Exception as e:
                    output = e.message
                    status = "failure"
                self.finish((dict(status=status, output=output)))

            if action == "FETCH_TESTS":
                machineName = self.get_argument("machine", None)
                if machineName is None:
                    self.errorRespond(400, "Arguments missing")
                    return
                tests = dbConnection["[" + machineName + "]-tests"].find()
                try:
                    responseObject = []
                    for test in tests:
                        responseObject.append(
                            {'name': test['name'], 'machine': test['machine'], 'script': test['script']})
                    self.finish(dict(response_data=json.dumps({'tests':
                                                                   responseObject})))
                except Exception as e:
                    self.errorRespond(500, "Something went wrong: " + str(e))
        pass


class liveHandler(RequestHandler):
    def get(self):
        self.render("templates/live.html")


class statHandler(RequestHandler):
    def get(self):
        self.render("templates/stat.html")


class perfHandler(RequestHandler):
    def get(self):
        self.render("templates/perf.html")


class testHandler(RequestHandler):
    def get(self):
        self.render("templates/test.html")

    pass


def start_http_server(port):
    settings = {
        "ui_modules": uimodules
    }
    app = Application([(r"/api", APIhandler),
                       (r"/live", liveHandler),
                       (r"/stat", statHandler),
                       (r"/perf", perfHandler),
                       (r"/test", testHandler),
                       (r"/(.*)", tornado.web.StaticFileHandler, {"path": "../observer-monitoring/static"})],
                      autoreload=True, **settings)
    server = HTTPServer(app)
    server.listen(port)
    print "Observer HTTP running at port " + port
    tornado.ioloop.IOLoop.current().start()
