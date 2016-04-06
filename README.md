# observer-monitoring
A monitoring tool for checking the status of local/remote servers, based on <a href="https://github.com/giampaolo/psutil">psutil</a>, <a href="https://github.com/tornadoweb/tornado">Tornado</a> and <a href="https://github.com/mongodb/mongo">MongoDB</a>.

## Architecture:
**Remote sender** is supposed to run on the remote system which sends the monitoring data on a per-second basis.
**Root/central server** has two components:
* **TCP listener** is the receving endpoint of the TCP connection between the root server and multiple remote senders.
* **HTTP server** is the website hosting server.
  
*Addresses associated with the servers:*
+ **Remote sender** : [REMOTE_IP_ADDRESS]:8888
+ **TCP listener** : [ROOT_IP_ADDRESS]:8889
+ **HTTP web server** : [ROOT_IP_ADDRESS]:9000
 
## How-to-run:
### Root server 
 Setup root server on a machine of your choice:
 ```bash
 $ bash run-root.sh
 ```
 This will run your **TCP listener** and **HTTP web server** on the machine.
 
### Remote senders
 Run the remote sender(s) on whichever machine(s) you want to monitor (could be on your root as well):
 ```bash
 $ bash run-remote.sh
Observer remote running at port 8888
Enter destination IP: 
54.179.143.69 
Enter destination port: 
8889
Enter remote name: 
foobar-production
Enter preferred NIC: 
eth0
 ```
### Dashboard navigation
++ **Live monitoring** : [ROOT_IP_ADDRESS]:9000/live.html
++ **Statistical data** : [ROOT_IP_ADDRESS]:9000/stats.html
++ **Performance testing** : [ROOT_IP_ADDRESS]:9000/perf.html

  
<a href="http://imgur.com/Ii0TuNt"><img src="http://i.imgur.com/Ii0TuNt.png" title="source: imgur.com" /></a>
<a href="http://imgur.com/HDGx5VC"><img src="http://i.imgur.com/HDGx5VC.png" title="source: imgur.com" /></a>
<a href="http://imgur.com/IcCxRBf"><img src="http://i.imgur.com/IcCxRBf.png" title="source: imgur.com" /></a>
