__author__ = 'sdpatro'

import tornado.web


class headModuleTemplate(tornado.web.UIModule):
    def render(self, headerTitle, customScripts):
        return self.render_string("templates/headTemplate.html", headerTitle=headerTitle, customScripts=customScripts)


class sideBarModuleTemplate(tornado.web.UIModule):
    def render(self):
        return self.render_string("templates/sideBarTemplate.html")
