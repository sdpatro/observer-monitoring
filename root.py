import calendar

__author__ = 'sdpatro'
import Image
import sys
import StringIO
from tornado import gen
import datetime
import base64
import json
import operator
import time

import xlsxwriter
import dateutil.parser
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


def init_instance_pricing():  # Initializing stuff
    ec2_pricing = db_connection['cloud-pricing'].find_one({'name': 'amazon-ec2'})
    if ec2_pricing is None:
        ec2_pricing_json = {'instances': [], 'name': 'amazon-ec2'}
        ec2_pricing_json['instances'].append(
                {'name': 't1.micro', 'vCpu': 1, 'memory': 0.6, 'io': 1, 'hourly-cost': 0.02})
        ec2_pricing_json['instances'].append(
                {'name': 't2.nano', 'vCpu': 1, 'memory': 0.5, 'io': 2, 'hourly-cost': 0.007})
        ec2_pricing_json['instances'].append(
                {'name': 't2.micro', 'vCpu': 1, 'memory': 1.0, 'io': 2.5, 'hourly-cost': 0.013})
        ec2_pricing_json['instances'].append(
                {'name': 't2.small', 'vCpu': 1, 'memory': 2.0, 'io': 2.5, 'hourly-cost': 0.026})
        ec2_pricing_json['instances'].append(
                {'name': 't2.medium', 'vCpu': 2, 'memory': 4.0, 'io': 2.5, 'hourly-cost': 0.052})
        ec2_pricing_json['instances'].append(
                {'name': 't2.large', 'vCpu': 2, 'memory': 8.0, 'io': 2.5, 'hourly-cost': 0.104})
        ec2_pricing_json['instances'].append(
                {'name': 'm4.large', 'vCpu': 2, 'memory': 8.0, 'io': 3, 'hourly-cost': 0.120})
        ec2_pricing_json['instances'].append(
                {'name': 'm4.xlarge', 'vCpu': 4, 'memory': 16.0, 'io': 4, 'hourly-cost': 0.239})
        ec2_pricing_json['instances'].append(
                {'name': 'm4.2xlarge', 'vCpu': 8, 'memory': 32.0, 'io': 4, 'hourly-cost': 0.479})
        db_connection['cloud-pricing'].insert(ec2_pricing_json)


init_instance_pricing()


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
        data_json = json.loads(data)

        if data_json.has_key('node'):
            update_machine(data_json, ip)

        else:
            live_coll = db["[" + data_json['name'] + "]-live"]
            stat_coll = db["[" + data_json['name'] + "]-stat"]

            update_machine_time(data_json["name"])

            live_coll.insert(data_json)
            condense(stat_coll, live_coll)


def update_machine(json_data, machine_ip):
    machine_name = json_data["name"]
    machine = db_connection["machines"].find_one({'name': machine_name, 'ip': machine_ip})
    if machine is None:
        db_connection["machines"].insert(
                {'name': machine_name, 'ip': machine_ip, 'last_online': str(datetime.datetime.now().isoformat()),
                 'machine': json_data['machine'], 'node': json_data['node'], 'architecture': json_data['architecture'],
                 'system': json_data['system'], 'release': json_data['release'], 'version': json_data['release'],
                 'memory': json_data['memory']})
    else:
        db_connection["machines"].update_one({'name': machine_name},
                                             {'$set': {'ip': machine_ip}})


def update_machine_time(machine_name):
    db_connection["machines"].update_one({'name': machine_name},
                                         {'$set': {'last_online': str(calendar.timegm(time.gmtime()))}})


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
def start_listener(port):
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
        snap_name = "files_buffer/" + self.machine_name + "_" + self.test_name + "_" + snap_date + ".jpg"
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


def get_excel_column(number):
    char_list = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
                 'U', 'V', 'W', 'X', 'Y', 'Z']
    rem = number
    result = ""
    while rem > 0:
        result = char_list[(rem % 26) - 1] + result
        rem = int(rem / 26)
    return result


class ApiHandler(RequestHandler):
    def data_received(self, chunk):
        pass

    def error_respond(self, code, msg):
        self.set_status(code)
        self.write(json.dumps({
            'status': code,
            'message': msg
        }))
        self.finish()

    # Utility function for excel columns

    @gen.coroutine
    def post(self):
        if self.get_argument("action", None) is not None:
            action = self.get_argument("action")
            if action == "FETCH_INSTANCE_PRICING":
                provider_name = self.get_argument("provider_name", None)
                if provider_name is None:
                    self.error_respond(400, "Provider name not provided.")
                else:
                    instance_pricing = db_connection["cloud-pricing"].find_one({'name': provider_name})
                    instance_pricing['_id'] = str(instance_pricing['_id'])
                    self.finish(dict(response_data=json.dumps(instance_pricing)))

            elif action == "GET_SPECS":
                machine_name = self.get_argument("machine_name", None)
                if machine_name is None:
                    self.error_respond(400, "Machine name not provided.")
                else:
                    machine = db_connection["machines"].find_one({'name': machine_name})
                    self.finish({'machine': machine['machine'], 'node': machine['node'], 'version': machine['version'],
                                 'release': machine['release'], 'system': machine['system'],
                                 'architecture': machine['architecture'], 'memory': machine['memory']})

            elif action == "GET_STAT_DATA":
                client_name = self.get_argument("client-name")
                stat_data_query = db_connection["[" + client_name + "]-stat"].find()
                stat_data = []
                for record in stat_data_query:
                    record['_id'] = str(record['_id'])
                    stat_data.append(record)
                self.finish(dict(stat_data=stat_data))
            elif action == "GET_REMOTE_MACHINES":
                remote_machines_cursor = db_connection["machines"].find()
                remote_machines_list = []
                for remote_machine in remote_machines_cursor:
                    remote_machines_list.append({'name': remote_machine['name'], 'ip': remote_machine['ip'],
                                                 'last_online': remote_machine['last_online']})
                self.finish((dict(remoteMachines=json.dumps({'machines': remote_machines_list}))))

            elif action == "SAVE_TEST":
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

            elif action == "FETCH_TESTS_LIST":
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

            elif action == "FETCH_TEST":
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

            elif action == "SAVE_TEST_RESULT_AS":
                json_data = json.loads(self.get_argument("jsonData"))
                test_name = self.get_argument("test_name")
                file_type = self.get_argument("file_type")

                if file_type == "XLSX":

                    live_data = json_data["live_data"]
                    snaps = json_data["snaps_id"]

                    workbook_name = test_name + "_" + datetime.datetime.now().isoformat()

                    workbook = xlsxwriter.Workbook('files_buffer/' + workbook_name + ".xlsx")
                    worksheet = workbook.add_worksheet()
                    bold_header = workbook.add_format({'bold': True, 'font_color': '#0b9f51'})
                    large_bold_green = workbook.add_format({'bold': True, 'font_size': 18, 'font_color': '#009245'})
                    large_bold_blue = workbook.add_format({'bold': True, 'font_size': 18, 'font_color': '#005392'})

                    worksheet.set_row(0, 30)
                    worksheet.write("A1", "Stats", large_bold_green)

                    record_offset = 3
                    property_header_offset = 2
                    col = 0

                    for property, value in live_data[0].iteritems():
                        worksheet.write(get_excel_column(col + 1) + str(property_header_offset + 1), str(property),
                                        bold_header)
                        worksheet.set_column(get_excel_column(col + 1) + ":" + get_excel_column(col + 1), 20)
                        col += 1
                    for j, record in enumerate(live_data):
                        k = 0
                        for property, value in record.iteritems():
                            worksheet.write(get_excel_column(k + 1) + str(j + 1 + record_offset), str(value))
                            k += 1

                    worksheet.set_row(len(live_data) + 4, 30)
                    worksheet.write("A" + str(len(live_data) + 5), "Snaps", large_bold_blue)

                    images_offset = len(live_data) + 5
                    last_cell_height = 0
                    for snap in snaps:
                        worksheet.insert_image("A" + str(images_offset + last_cell_height + 2), snap,
                                               {'x_scale': 0.5, 'y_scale': 0.5})
                        im = Image.open(snap)
                        width, height = im.size
                        last_cell_height += int(height / 30)

                    workbook.close()
                    self.finish(dict(file_name=workbook_name))

                elif file_type == "CSV":
                    live_data = json_data["live_data"]
                    csv_file_name = test_name + "_" + datetime.datetime.now().isoformat() + ".csv"
                    csv_fp = open("files_buffer/" + csv_file_name, 'w')

                    property_string = ""
                    for property, value in live_data[0].iteritems():
                        property_string += property + ","
                    property_string = property_string[:-1]
                    property_string += "\n"
                    csv_fp.write(property_string)
                    for i, record in enumerate(live_data):
                        record_string = ""
                        for property, value in record.iteritems():
                            record_string += str(value) + ","
                        record_string = record_string[:-1]
                        record_string += "\n"
                        csv_fp.write(record_string)
                    self.finish(dict(file_name=csv_file_name))
            else:
                self.error_respond(400, "Not a valid action")


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


class XLSXHandler(RequestHandler):
    def post(self):
        pass

    def get(self):
        request_url = self.request.uri
        self.write(request_url)
        pass


class CostHandler(RequestHandler):
    def post(self):
        pass

    def get(self):
        self.render("templates/cost.html")


def start_dash_server(port):
    settings = {
        "ui_modules": uimodules
    }
    app = Application([(r"/api", ApiHandler),
                       (r"/live", LiveHandler),
                       (r"/stat", StatHandler),
                       (r"/perf", PerfHandler),
                       (r"/cost", CostHandler),
                       (r"/test", TestHandler),
                       (r"/files/(.*)", tornado.web.StaticFileHandler,
                        {"path": "../observer-monitoring/files_buffer/"}),
                       (r"/fonts/(.*)", tornado.web.StaticFileHandler,
                        {"path": "../observer-monitoring/fonts/"}),
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
                    driver = ObserverDriver(webdriver.PhantomJS(), test_name, machine_name)
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


#####################################################

def get_delta_time_days(stat_records):
    start_time = dateutil.parser.parse(stat_records[0]['date'])
    end_time = dateutil.parser.parse(stat_records[len(stat_records) - 1]['date'])
    delta_time_days = (end_time - start_time).days
    return delta_time_days


def get_delta_time_seconds(stat_records):
    start_time = dateutil.parser.parse(stat_records[0]['date'])
    end_time = dateutil.parser.parse(stat_records[len(stat_records) - 1]['date'])
    delta_time_seconds = (end_time - start_time).seconds
    return delta_time_seconds


def get_uptime_percentage(machine):
    stat_count = db_connection["[" + machine + "]-stat"].count()

    newest_stat_record = db_connection["[" + machine + "]-stat"].find().sort("date", -1).limit(1)
    oldest_stat_record = db_connection["[" + machine + "]-stat"].find().sort("date", 1).limit(1)

    old_timestamp = dateutil.parser.parse(oldest_stat_record[0]["date"])
    new_timestamp = dateutil.parser.parse(newest_stat_record[0]["date"])
    minutes_count = (new_timestamp - old_timestamp).seconds / 60
    minutes_count += (new_timestamp - old_timestamp).days * (24 * 60)
    return stat_count, minutes_count


def get_bandwidth_usage(records):
    dl_bytes = 0
    ul_bytes = 0
    for i in range(0, len(records)):
        if records[i - 1]['bytes_recv'] > records[i]['bytes_recv'] and i > 0:
            dl_bytes += records[i - 1]['bytes_recv']
        if records[i - 1]['bytes_sent'] > records[i]['bytes_sent'] and i > 0:
            ul_bytes += records[i - 1]['bytes_sent']

    dl_bytes += records[len(records) - 1]['bytes_recv']
    ul_bytes += records[len(records) - 1]['bytes_sent']
    return dl_bytes, ul_bytes


def condense_data_estimation(stat_records, minute_gradient):
    new_stat_records = []
    while len(stat_records) > minute_gradient:
        temp_record = stat_records[0]
        for i in range(1, minute_gradient):
            record = stat_records[i]
            temp_record['name'] = record['name']
            temp_record['cpu'] = tuple(map(operator.add, temp_record['cpu'], record['cpu']))
            temp_record['ram'] += record['ram']
            temp_record['disk_io_read'] += record['disk_io_read']
            temp_record['disk_io_write'] += record['disk_io_write']
            temp_record['disk_read_rate'] += record['disk_read_rate']
            temp_record['disk_write_rate'] += record['disk_write_rate']
            temp_record['packets_sent'] = tuple(map(operator.add, temp_record['packets_sent'], record['packets_sent']))
            temp_record['packets_recv'] = tuple(map(operator.add, temp_record['packets_recv'], record['packets_recv']))
            temp_record['bytes_recv'] += record['bytes_recv']
            temp_record['bytes_sent'] += record['bytes_sent']
            temp_record['ul_rate'] += record['ul_rate']
            temp_record['dl_rate'] += record['dl_rate']
            temp_record['disk_total'] += record['disk_total']
            temp_record['disk_used'] += record['disk_used']

        temp_record['cpu'] = tuple(float(x / minute_gradient) for x in temp_record['cpu'])
        temp_record['ram'] = float(temp_record['ram'] / minute_gradient)
        temp_record['disk_io_read'] = float(temp_record['disk_io_read'] / minute_gradient)
        temp_record['disk_io_write'] = float(temp_record['disk_io_write'] / minute_gradient)
        temp_record['disk_read_rate'] = float(temp_record['disk_read_rate'] / minute_gradient)
        temp_record['disk_write_rate'] = float(temp_record['disk_write_rate'] / minute_gradient)
        temp_record['packets_sent'] = tuple(float(x / minute_gradient) for x in temp_record['packets_sent'])
        temp_record['packets_recv'] = tuple(float(x / minute_gradient) for x in temp_record['packets_recv'])
        temp_record['bytes_sent'] = float(temp_record['bytes_sent'] / minute_gradient)
        temp_record['bytes_recv'] = float(temp_record['bytes_recv'] / minute_gradient)
        temp_record['ul_rate'] = float(temp_record['ul_rate'] / minute_gradient)
        temp_record['dl_rate'] = float(temp_record['dl_rate'] / minute_gradient)
        temp_record['disk_total'] = float(temp_record['disk_total'] / minute_gradient)
        temp_record['disk_used'] = float(temp_record['disk_used'] / minute_gradient)

        stat_records = stat_records[minute_gradient:]
        new_stat_records.append(temp_record)
    return new_stat_records


class ComputeHandler(RequestHandler):
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
    def post(self):
        action = self.get_argument("action", None)
        machine = self.get_argument("machine", None)
        days_duration = self.get_argument("days_duration", None)
        if action is not None:
            if action == "GET_COST_STATS":
                if machine is not None:
                    stat_count, minutes_count = get_uptime_percentage(machine)
                    self.finish({'duration': minutes_count, 'count': stat_count})
                else:
                    self.error_respond(400, "No machine name specified.")
            if action == "FETCH_ESTIMATED_CHARTS":
                if machine is None:
                    self.error_respond(400, "No machine name specified.")
                elif days_duration is None:
                    self.error_respond(400, "Days duration not specified.")
                else:
                    stat_records_cursor = db_connection["[" + machine + "]-stat"].find()
                    stat_records = []

                    for stat_record in stat_records_cursor:
                        stat_records.append(stat_record)

                    if len(stat_records) < 5:
                        self.finish(dict(status="failure", message="Not enough data"))
                    else:
                        i = 0
                        initial_delta_time = dateutil.parser.parse(
                                stat_records[len(stat_records) - 1]['date']) - dateutil.parser.parse(
                                stat_records[0]['date'])

                        print "initial_delta_time " + str(initial_delta_time.days) + " " + str(
                                initial_delta_time.seconds)
                        if int(get_delta_time_days(stat_records)) < int(days_duration):
                            while int(get_delta_time_days(stat_records)) < int(days_duration):
                                stat_records.append(stat_records[i].copy())
                                cur_date = stat_records[len(stat_records) - 1]['date']
                                cur_date = dateutil.parser.parse(cur_date)
                                cur_date += initial_delta_time + datetime.timedelta(1, 60)
                                stat_records[len(stat_records) - 1]['date'] = cur_date.isoformat()
                                i += 1
                        else:
                            while int(get_delta_time_days(stat_records)) > int(days_duration):
                                stat_records = stat_records[:-1]
                            while int(get_delta_time_seconds(stat_records)) > 60:
                                stat_records = stat_records[:-1]

                        if int(len(stat_records) / 250) > 0:
                            minute_gradient = int(len(stat_records) / 250)
                        else:
                            minute_gradient = 1

                        dl_bandwidth, ul_bandwidth = get_bandwidth_usage(stat_records)
                        stat_records = condense_data_estimation(stat_records, minute_gradient)
                        for record in stat_records:
                            record['_id'] = str(record['_id'])
                        self.finish(
                                dict(status="success", stat_data=stat_records,
                                     misc_data={'dl_bandwidth': dl_bandwidth, 'ul_bandwidth': ul_bandwidth}))

        else:
            self.error_respond(400, "No action specified")


def start_compute_server(port):
    sim_app = Application([(r"/compute", ComputeHandler)],
                          autoreload=True)
    server = HTTPServer(sim_app)
    server.listen(port)
    print "Observer Compute running at port " + port
    tornado.ioloop.IOLoop.current().start()
